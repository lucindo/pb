// Stateful audio service that composes the pure cueSynth module from Plan 01
// into a lifecycle-aware engine. Zero React imports.
//
// Owns:
//   - The single AudioContext (D-09: created from a user-gesture chain only).
//   - The active cue's GainNode envelope (D-08: mute applies a soft fade-out).
//   - The lead-in scheduling primitive (3 ticks at +0/+1/+2 s + first In cue at +3 s).
//   - The boundary-driven scheduleNextCue dispatch (in → scheduleInCue, out → scheduleOutCue).
//   - close(): idempotent teardown that releases the system audio resources (D-11).
//
// Mute semantics (D-08):
//   - setMuted(true) mid-cue: applies cancelAndHoldAtTime + setTargetAtTime fade-out
//     (Pitfall 9 fallback: cancelScheduledValues + setValueAtTime when cancelAndHoldAtTime
//     is unavailable on Safari < 16.4).
//   - setMuted(false) mid-phase: does NOT fire any make-up cue. The next cue plays at
//     the next phase boundary. This is the "unmute waits for boundary" rule.
//
// AC failure (D-10):
//   - createAudioEngine throws (rejects) when `new AudioContext()` throws. The caller
//     (useAudioCues) catches and falls back to visuals-only mode.

import type { BreathingPlan } from '../domain/breathingPlan'
import { scheduleInCueForTimbre, scheduleOutCueForTimbre, type CueHandle } from './cueSynth'
import { scheduleCountdownTick, scheduleEndChord } from './nkCueSynth'
import type { TimbreId } from '../domain/settings'

export type AudioStatus = 'idle' | 'lead-in' | 'failed'

export interface AudioEngine {
  /** Schedule the 3-2-1 lead-in: ticks at startAudioTime + 0/+1/+2 s, first In cue at startAudioTime + 3 s.
   *  Returns the audioTime of the first In cue (= startAudioTime + 3), or null when the engine
   *  is closed — AUDIO-03. */
  scheduleLeadIn(startAudioTime: number, plan: BreathingPlan): number | null
  /** Notify of a phase boundary mid-session. Schedules the corresponding In or Out cue
   *  at the given audioTime if not muted. `phaseDurationSec` is the length of the
   *  UPCOMING phase (in / out) in seconds; cueSynth uses it to stretch the bowl
   *  decay envelope so the cue stays audible through the entire phase at low BPM
   *  (260510-tc9 Bug 2). The boundary scheduler in App.tsx derives this from
   *  plan.inhaleMs / plan.exhaleMs. */
  scheduleNextCue(args: { newPhase: 'in' | 'out'; audioTime: number; phaseDurationSec: number }): void
  /** Schedule the shared session-ending chord on this engine's AudioContext —
   *  the same sound the Navi Kriya completion plays. No-op when closed or
   *  muted. close() defers AudioContext teardown until the chord rings out. */
  playEndChord(): void
  /** Toggle mute. Mid-cue: applies a soft fade-out to the active cue's envelope.
   *  Mid-phase unmute: does NOT fire a make-up cue (D-08). */
  setMuted(muted: boolean): void
  /** Current mute state (mirrors what was last passed to setMuted). */
  readonly muted: boolean
  /** Capture the audioCtx.currentTime at this instant — App.tsx uses this as the t=0 anchor co-anchored with session.start(). */
  now(): number
  /** Close the AudioContext. Idempotent. D-11 anchor. */
  close(): Promise<void>
  /** Resume the AudioContext if it is currently suspended (e.g., after iOS lock-screen auto-suspend).
   *  Idempotent: calling on an already-running AC resolves silently. Short-circuits on closed.
   *  Silently absorbs rejection (D-09). Used by useAudioCues' visibilitychange listener (Phase 5.1 D-01..D-09). */
  resume(): Promise<void>
  /** Plan 06 polish: live read of audioCtx.state. The hook's public resume() reads this AFTER
   *  `await engine.resume()` to decide whether reconstruction is required — React's audioStatus
   *  is closed-over by useCallback and may be stale within the same invocation. Reading
   *  audioCtx.state directly is the live truth. */
  readonly state: AudioContextState | 'interrupted'
}

export interface AudioEngineOptions {
  /** Plan 06 D-36: receives every audioCtx.state transition. The hook listens
   *  and pushes the value into React state. Engine stays React-free per D-02.
   *  Cast accepts WebKit's 'interrupted' superset (D-37). Fires from:
   *  (a) the wired addEventListener('statechange') — every transition;
   *  (b) the resume() catch when err.name === 'InvalidStateError' (D-38). */
  onStateChange?: (state: AudioContextState | 'interrupted') => void
  /** Phase 18 D-08: timbre captured at session start; engine never re-reads prefs.
   *  Caller passes the snapshot from useAudioCues.start(plan, timbre). No setter
   *  is exposed — capture-at-construction is the only mutation path. */
  timbre: TimbreId
}

// D-08: soft fade-out tail when muting mid-cue.
// timeConstant 0.05 → ~150 ms perceptual decay (3× constant — see 03-RESEARCH.md Pattern 5).
const MUTE_FADE_TIME_CONSTANT = 0.05
// Never ramp gain to 0.0 — exponentialRampToValueAtTime would throw, and even
// setTargetAtTime is more numerically stable with a nonzero target.
const MIN_GAIN_VALUE = 0.0001

// Lead-in: 3 ticks one second apart, then the first In cue at the start of the breath cycle.
// WR-04: exported as the single source of truth — App.tsx and useAudioCues.ts import these
// instead of redefining the same numbers locally (which silently drifted before).
export const LEAD_IN_TICK_INTERVAL_SEC = 1.0
export const LEAD_IN_DURATION_SEC = 3.0
export const LEAD_IN_TICK_INTERVAL_MS = LEAD_IN_TICK_INTERVAL_SEC * 1000
export const LEAD_IN_DURATION_MS = LEAD_IN_DURATION_SEC * 1000
/** Minimum scheduling lead ahead of audioCtx.currentTime for any cue dispatch.
 *  AUDIO-02 D-03: exported as single source of truth — App.tsx imports this symbol for the
 *  caller-side clamp (Plan 02); audioEngine.scheduleNextCue uses it for the callee-side clamp.
 *  No duplicated literals; both clamp sites derive from this constant. */
export const SAFE_LEAD_SEC = 0.005

function applyMuteFadeOut(activeCue: CueHandle, audioCtx: AudioContext): void {
  const now = audioCtx.currentTime
  const gainParam = activeCue.envelope.gain
  // Modern browsers: cancelAndHoldAtTime is the right primitive — it preserves the
  // current automation curve up to `now` and discards everything after.
  // Safari < 16.4 (Pitfall 9 in 03-RESEARCH.md) lacks cancelAndHoldAtTime; fall back
  // to cancelScheduledValues alone.
  //
  // AH-WR-06: the fallback does NOT re-assert the current value via
  // setValueAtTime(gainParam.value, now). On the Safari <16.4 fallback path,
  // gainParam.value returns the last value set explicitly via an automation
  // call (peakGain), NOT the live ramped value mid-decay — Safari does not
  // reflect setTargetAtTime progress back into .value. Re-asserting it would
  // freeze the envelope back UP to peakGain before fading, producing an audible
  // click/swell when muting mid-decay. cancelScheduledValues(now) discards the
  // pending automation; the subsequent setTargetAtTime then ramps from whatever
  // value the param actually holds at `now` toward silence.
  if (typeof gainParam.cancelAndHoldAtTime === 'function') {
    gainParam.cancelAndHoldAtTime(now)
  } else {
    gainParam.cancelScheduledValues(now)
  }
  gainParam.setTargetAtTime(MIN_GAIN_VALUE, now, MUTE_FADE_TIME_CONSTANT)
}

/** Create a new AudioContext + engine. MUST be called from a user-gesture path (D-09).
 *  Throws (rejects) if AudioContext construction fails (D-10 caller branch). */
export async function createAudioEngine(opts: AudioEngineOptions): Promise<AudioEngine> {
  // D-09: AudioContext is constructed here, which is invoked synchronously from the
  // Start session click handler in App.tsx (Plan 04). The browser autoplay policy MUST
  // see a fresh user-gesture chain or AC will start in 'suspended'.
  const audioCtx = new AudioContext()

  // Chrome can occasionally hand back an AC in 'suspended' even from a gesture chain
  // (race conditions during page bootstrap); resume immediately so currentTime advances.
  // WR-06: if resume() rejects (e.g., the user agent vetoed autoplay between
  // construction and the resume attempt), close the AC before re-throwing — otherwise
  // the AC leaks (browsers cap concurrent ACs ~6 in Chrome).
  if (audioCtx.state === 'suspended') {
    try {
      await audioCtx.resume()
    } catch (err) {
      await audioCtx.close().catch(() => undefined)
      throw err
    }
  }

  // Plan 06 D-36: single statechange listener — drives the hook's state machine.
  // Cast accepts WebKit's 'interrupted' superset (D-37). The listener is REMOVED inside
  // close() BEFORE audioCtx.close() to prevent a 'closed' event firing after unmount.
  const onStateChange = (): void => {
    // Reason: AudioContextState widened to include WebKit 'interrupted' extension (D-37 / Phase 5.1); cast documents intent even if TS DOM lib does not require it.
    // eslint-disable-next-line @typescript-eslint/no-unnecessary-type-assertion
    opts.onStateChange?.(audioCtx.state as AudioContextState | 'interrupted')
  }
  audioCtx.addEventListener('statechange', onStateChange)

  // WR-08: track ALL in-flight cues (lead-in ticks + In/Out bowls), not just the
  // most recent one. Mute mid-lead-in must silence the remaining ticks too —
  // previously only the bowl cue stored as `activeCue` was faded, leaving ticks
  // 2 and 3 audible after the user clicked Mute.
  const activeCues = new Set<CueHandle>()
  let muted = false // D-07: default false (audio ON on first visit)
  // Phase 18 D-08: capture timbre once at construction. Immutable for this
  // engine's lifetime — no setter exposed. scheduleLeadIn + scheduleNextCue
  // forward this value to scheduleInCueForTimbre / scheduleOutCueForTimbre.
  const sessionTimbre: TimbreId = opts.timbre
  let closed = false
  // Audio-clock time at which the end-chord tail finishes. close() defers the
  // AudioContext teardown until this instant so the session-ending chord
  // (playEndChord) is never cut off. 0 = no end chord scheduled.
  let endChordTailUntil = 0

  // Drop cues whose tails have already finished (cleanupAt < now). Keeps the Set
  // bounded over a long session and avoids re-fading already-silent envelopes.
  function pruneExpiredCues(): void {
    const now = audioCtx.currentTime
    // AH-WR-07: iterate a snapshot, not the live Set. Deleting from a Set during
    // a for...of over that same Set is defined for the current element but
    // fragile, and outright unsafe if this loop body is ever extended to add().
    // The spread copy decouples iteration from mutation.
    for (const cue of [...activeCues]) {
      if (cue.cleanupAt < now) activeCues.delete(cue)
    }
  }

  const engine: AudioEngine = {
    scheduleLeadIn(startAudioTime: number, plan: BreathingPlan): number | null {
      const firstInCueTime = startAudioTime + LEAD_IN_DURATION_SEC
      if (closed) return null // AUDIO-03: closed engine has no meaningful projection.
      if (muted) return firstInCueTime

      // 3 ticks at +0/+1/+2 (D-14 lead-in). Track each so mid-lead-in mute can
      // fade them out (WR-08). Consistency: the countdown beep is the shared
      // scheduleCountdownTick — the same beep the Navi Kriya countdown uses —
      // and honours the session timbre.
      activeCues.add(scheduleCountdownTick(audioCtx, startAudioTime + 0 * LEAD_IN_TICK_INTERVAL_SEC, audioCtx.destination, sessionTimbre))
      activeCues.add(scheduleCountdownTick(audioCtx, startAudioTime + 1 * LEAD_IN_TICK_INTERVAL_SEC, audioCtx.destination, sessionTimbre))
      activeCues.add(scheduleCountdownTick(audioCtx, startAudioTime + 2 * LEAD_IN_TICK_INTERVAL_SEC, audioCtx.destination, sessionTimbre))
      // First In cue at +3 (numerals replaced by the In phase label at t=0; bowl strikes).
      // 260510-tc9 Bug 2: pass the upcoming In-phase duration so the decay envelope
      // stretches with the phase length at low BPM (App.tsx boundary scheduler does
      // the same for every subsequent cue).
      const firstInPhaseDurationSec = plan.inhaleMs / 1000
      activeCues.add(scheduleInCueForTimbre(audioCtx, firstInCueTime, audioCtx.destination, sessionTimbre, firstInPhaseDurationSec))

      return firstInCueTime
    },

    scheduleNextCue({ newPhase, audioTime, phaseDurationSec }: { newPhase: 'in' | 'out'; audioTime: number; phaseDurationSec: number }): void {
      if (closed) return
      if (muted) return // D-08 unmute-waits-for-boundary; if currently muted, skip this cue.
      pruneExpiredCues()
      // AUDIO-02 D-01/D-02 callee-side clamp.
      const clampedAudioTime = Math.max(audioTime, audioCtx.currentTime + SAFE_LEAD_SEC)
      // 260510-tc9 Bug 2: forward phaseDurationSec as the 4th arg so cueSynth
      // can stretch the decay envelope to the phase length.
      const cue =
        newPhase === 'in'
          ? scheduleInCueForTimbre(audioCtx, clampedAudioTime, audioCtx.destination, sessionTimbre, phaseDurationSec)
          : scheduleOutCueForTimbre(audioCtx, clampedAudioTime, audioCtx.destination, sessionTimbre, phaseDurationSec)
      activeCues.add(cue)
    },

    playEndChord(): void {
      if (closed) return
      if (muted) return // consistent with the Navi end cue — muted = silent.
      const when = audioCtx.currentTime + SAFE_LEAD_SEC
      const cue = scheduleEndChord(audioCtx, when, audioCtx.destination, sessionTimbre)
      activeCues.add(cue)
      // Record the tail end so close() can defer teardown until it rings out.
      endChordTailUntil = cue.cleanupAt
    },

    setMuted(next: boolean): void {
      if (closed) {
        muted = next
        return
      }
      if (next && activeCues.size > 0) {
        // D-08 + WR-08: muting mid-cue applies a soft fade-out tail to EVERY in-flight
        // cue's envelope (lead-in ticks AND bowl cues). Prune already-finished cues
        // first so we don't ramp dead envelopes.
        pruneExpiredCues()
        for (const cue of activeCues) {
          applyMuteFadeOut(cue, audioCtx)
        }
      }
      // D-08: unmuting mid-phase is silent — the next cue plays at the next phase boundary,
      //       NOT a make-up cue here. Boundary scheduling is owned by App.tsx (Plan 04).
      muted = next
    },

    get muted(): boolean {
      return muted
    },

    now(): number {
      return audioCtx.currentTime
    },

    async close(): Promise<void> {
      if (closed) return
      closed = true
      // Plan 06 D-36: remove the statechange listener BEFORE close() so a final
      // 'closed' transition does not fire after the hook has nulled engineRef.
      audioCtx.removeEventListener('statechange', onStateChange)
      // If playEndChord scheduled a session-ending chord, defer teardown until
      // its tail rings out — otherwise the disconnect loop below would sever
      // the chord mid-ring. Skipped entirely when no end chord was scheduled
      // (endChordTailUntil = 0), so the manual-end / open-ended paths close
      // immediately as before.
      const tailRemainingSec = endChordTailUntil - audioCtx.currentTime
      if (tailRemainingSec > 0) {
        await new Promise<void>((resolve) => {
          setTimeout(resolve, tailRemainingSec * 1000)
        })
      }
      // AH-WR-03: node cleanup is otherwise driven entirely by the oscillator
      // 'ended' event (AUDIO-04 explicit-disconnect contract in cueSynth). The
      // Web Audio spec does NOT guarantee 'ended' fires for an oscillator whose
      // stopAt is still in the future when audioCtx.close() runs — so a cue
      // scheduled close to the close() call could leak its node chain. Before
      // closing the context, explicitly disconnect every in-flight cue's
      // envelope (the GainNode wired to destination — the only node the
      // CueHandle exposes; tearing this edge severs the chain from the graph
      // output) and clear the Set so the handles become GC-able.
      for (const cue of [...activeCues]) {
        try { cue.envelope.disconnect() } catch { /* silent — node may already be disconnected */ }
      }
      activeCues.clear()
      // Pitfall 8: in-flight cue tails (up to ~5× decayTimeConstant) ring out via the audio
      // thread's already-scheduled gain ramps. We close immediately and trust those ramps
      // to drain naturally. D-11: closing AudioContext releases the system audio resources.
      await audioCtx.close()
    },

    async resume(): Promise<void> {
      if (closed) return
      try {
        await audioCtx.resume()
      } catch (err) {
        // Plan 06 D-38: narrow the Plan 01 D-09 silent-absorb posture. The specific
        // iOS-Safari failure mode is `DOMException { name: 'InvalidStateError' }`
        // raised when resume() is invoked from a non-gesture context (the
        // visibilitychange listener qualifies as non-gesture on iOS Safari per device
        // diagnostic 05.1-UAT.md Task 2). Surface THIS error class via the state-change
        // callback so the hook can transition to 'needs-resume' and surface the
        // user-tappable affordance (D-29). All other errors continue silent-absorb
        // (Plan 01 D-09 preserved for unknown failure modes).
        // Reason: defensive optional chain — onStateChange is typed optional in CreateAudioEngineOptions; the chain documents that intent even where the call site happens to always supply it.
        // eslint-disable-next-line @typescript-eslint/no-unnecessary-condition
        if ((err as DOMException)?.name === 'InvalidStateError') {
          // Reason: AudioContextState widened to include WebKit 'interrupted' extension (D-37 / Phase 5.1); cast documents intent even if TS DOM lib does not require it.
          // eslint-disable-next-line @typescript-eslint/no-unnecessary-type-assertion
          opts.onStateChange?.(audioCtx.state as AudioContextState | 'interrupted')
        }
        // Else: silent. No console.debug (discretion #4). The session continues on visuals
        // only — same posture as Phase 3 D-10 and Phase 5 D-09.
      }
    },

    get state(): AudioContextState | 'interrupted' {
      // Reason: AudioContextState widened to include WebKit 'interrupted' extension (D-37 / Phase 5.1); cast documents intent even if TS DOM lib does not require it.
      // eslint-disable-next-line @typescript-eslint/no-unnecessary-type-assertion
      return audioCtx.state as AudioContextState | 'interrupted'
    },
  }

  return engine
}
