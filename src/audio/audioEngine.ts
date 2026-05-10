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
import { scheduleInCue, scheduleOutCue, scheduleTick, type CueHandle } from './cueSynth'

export type AudioStatus = 'idle' | 'starting' | 'lead-in' | 'failed'

export interface AudioEngine {
  /** Schedule the 3-2-1 lead-in: ticks at startAudioTime + 0/+1/+2 s, first In cue at startAudioTime + 3 s.
   *  Returns the audioTime of the first In cue (= startAudioTime + 3). */
  scheduleLeadIn(startAudioTime: number, plan: BreathingPlan): number
  /** Notify of a phase boundary mid-session. Schedules the corresponding In or Out cue at the given audioTime if not muted. */
  scheduleNextCue(args: { newPhase: 'in' | 'out'; audioTime: number }): void
  /** Toggle mute. Mid-cue: applies a soft fade-out to the active cue's envelope.
   *  Mid-phase unmute: does NOT fire a make-up cue (D-08). */
  setMuted(muted: boolean): void
  /** Current mute state (mirrors what was last passed to setMuted). */
  readonly muted: boolean
  /** Capture the audioCtx.currentTime at this instant — App.tsx uses this as the t=0 anchor co-anchored with session.start(). */
  now(): number
  /** Close the AudioContext. Idempotent. D-11 anchor. */
  close(): Promise<void>
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

function applyMuteFadeOut(activeCue: CueHandle, audioCtx: AudioContext): void {
  const now = audioCtx.currentTime
  const gainParam = activeCue.envelope.gain
  // Modern browsers: cancelAndHoldAtTime is the right primitive — it preserves the
  // current automation curve up to `now` and discards everything after.
  // Safari < 16.4 (Pitfall 9 in 03-RESEARCH.md) lacks cancelAndHoldAtTime; fall back
  // to (cancelScheduledValues + setValueAtTime) which is the equivalent freeze-then-ramp pair.
  if (typeof gainParam.cancelAndHoldAtTime === 'function') {
    gainParam.cancelAndHoldAtTime(now)
  } else {
    const currentValue = gainParam.value
    gainParam.cancelScheduledValues(now)
    gainParam.setValueAtTime(currentValue, now)
  }
  gainParam.setTargetAtTime(MIN_GAIN_VALUE, now, MUTE_FADE_TIME_CONSTANT)
}

/** Create a new AudioContext + engine. MUST be called from a user-gesture path (D-09).
 *  Throws (rejects) if AudioContext construction fails (D-10 caller branch). */
export async function createAudioEngine(): Promise<AudioEngine> {
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

  // WR-08: track ALL in-flight cues (lead-in ticks + In/Out bowls), not just the
  // most recent one. Mute mid-lead-in must silence the remaining ticks too —
  // previously only the bowl cue stored as `activeCue` was faded, leaving ticks
  // 2 and 3 audible after the user clicked Mute.
  const activeCues = new Set<CueHandle>()
  let muted = false // D-07: default false (audio ON on first visit)
  let closed = false

  // Drop cues whose tails have already finished (cleanupAt < now). Keeps the Set
  // bounded over a long session and avoids re-fading already-silent envelopes.
  function pruneExpiredCues(): void {
    const now = audioCtx.currentTime
    for (const cue of activeCues) {
      if (cue.cleanupAt < now) activeCues.delete(cue)
    }
  }

  const engine: AudioEngine = {
    scheduleLeadIn(startAudioTime: number, _plan: BreathingPlan): number {
      // _plan reserved for future per-plan lead-in adaptation (D-14 currently fixes 3 s).
      void _plan
      const firstInCueTime = startAudioTime + LEAD_IN_DURATION_SEC
      if (closed) return firstInCueTime
      if (muted) return firstInCueTime

      // 3 ticks at +0/+1/+2 (D-14 lead-in). Track each so mid-lead-in mute can
      // fade them out (WR-08).
      activeCues.add(scheduleTick(audioCtx, startAudioTime + 0 * LEAD_IN_TICK_INTERVAL_SEC, audioCtx.destination))
      activeCues.add(scheduleTick(audioCtx, startAudioTime + 1 * LEAD_IN_TICK_INTERVAL_SEC, audioCtx.destination))
      activeCues.add(scheduleTick(audioCtx, startAudioTime + 2 * LEAD_IN_TICK_INTERVAL_SEC, audioCtx.destination))
      // First In cue at +3 (numerals replaced by the In phase label at t=0; bowl strikes).
      activeCues.add(scheduleInCue(audioCtx, firstInCueTime, audioCtx.destination))

      return firstInCueTime
    },

    scheduleNextCue({ newPhase, audioTime }: { newPhase: 'in' | 'out'; audioTime: number }): void {
      if (closed) return
      if (muted) return // D-08 unmute-waits-for-boundary; if currently muted, skip this cue.
      pruneExpiredCues()
      const cue =
        newPhase === 'in'
          ? scheduleInCue(audioCtx, audioTime, audioCtx.destination)
          : scheduleOutCue(audioCtx, audioTime, audioCtx.destination)
      activeCues.add(cue)
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
      // Pitfall 8: in-flight cue tails (up to ~5× decayTimeConstant) ring out via the audio
      // thread's already-scheduled gain ramps. We close immediately and trust those ramps
      // to drain naturally. D-11: closing AudioContext releases the system audio resources.
      await audioCtx.close()
    },
  }

  return engine
}
