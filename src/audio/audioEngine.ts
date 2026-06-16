// Stateful audio service composing the pure cueSynth module into a
// lifecycle-aware engine. Zero React imports.
//
// Owns:
//   - The single AudioContext (created from a user-gesture chain only).
//   - A single master GainNode all cues route through; mute ramps it.
//   - The lead-in scheduling primitive (3 ticks at +0/+1/+2 s + first In cue at +3 s).
//   - The boundary-driven scheduleNextCue dispatch (in → scheduleInCueForTimbre, out → scheduleOutCueForTimbre).
//   - close(): idempotent teardown that releases the system audio resources.
//
// The in-flight cue Set + end-chord tail bookkeeping live in cueStore (createCueStore);
// the engine methods are thin facades over it plus the AC lifecycle.
//
// Mute semantics (master gain):
//   - All cues route through a single master GainNode (masterGain → destination).
//   - setMuted(true): linear-ramps masterGain to 0 over 0.05 s (Safari-safe anchor
//     via cancelAndHoldAtTime, else cancelScheduledValues + setValueAtTime).
//   - setMuted(false): linear-ramps masterGain back to 1 over 0.05 s — INSTANT, with
//     no boundary wait. Unmute lands on whatever cue is currently playing.
//   - Cues KEEP being scheduled while muted (they play silently through gain=0), which
//     is what makes unmute instant.
//
// AC failure:
//   - createAudioEngine throws (rejects) when `new AudioContext()` throws. The caller
//     (useAudioCues) catches and falls back to visuals-only mode.

import type { BreathingPlan } from '../domain/breathingPlan'
import { createAudioSessionClock, type SessionClock } from './sessionClock'
import { createSilentLoopBypass, type SilentLoopBypass } from './silentLoopBypass'
import { createCueStore } from './cueStore'
import type { TimbreId } from '../domain/settings'

export type AudioStatus = 'idle' | 'lead-in' | 'failed'

// Re-export SessionClock so consumers import it from audioEngine (the public engine boundary).
// The augmented factory return type `SessionClock & { notifySuspended(): void }` is NOT re-exported — notifySuspended is an engine-only escape hatch scoped to createAudioEngine's internal closure.
export type { SessionClock } from './sessionClock'

export interface AudioEngine {
  /** Schedule the 3-2-1 lead-in: ticks at startAudioTime + 0/+1/+2 s, first In cue at startAudioTime + 3 s.
   *  Returns the audioTime of the first In cue (= startAudioTime + 3), or null when the engine
   *  is closed — AUDIO-03. */
  scheduleLeadIn(startAudioTime: number, plan: BreathingPlan): number | null
  /** Notify of a phase boundary mid-session. Schedules the corresponding In or Out cue
   *  at the given audioTime (always — muted cues route silently through masterGain).
   *  `phaseDurationSec` is the length of the UPCOMING phase (in / out) in seconds;
   *  cueSynth uses it to stretch the bowl decay envelope so the cue stays audible
   *  through the entire phase at low BPM. The boundary scheduler in App.tsx derives
   *  this from plan.inhaleSec / plan.exhaleSec. */
  scheduleNextCue(args: { newPhase: 'in' | 'out'; audioTime: number; phaseDurationSec: number }): void
  /** Schedule the session-ending chord on this engine's AudioContext. No-op when
   *  closed (muted cues route silently through masterGain). close() defers teardown
   *  until the chord rings. */
  playEndChord(): void
  /** Toggle mute. Linear-ramps the master gain to 0 (mute) or 1 (unmute)
   *  over 0.05 s. Instant; unmute lands on whatever cue is currently playing. */
  setMuted(muted: boolean): void
  /** Current mute state (mirrors what was last passed to setMuted). */
  readonly muted: boolean
  /** Capture the audioCtx.currentTime at this instant — App.tsx uses this as the t=0 anchor co-anchored with session.start(). */
  now(): number
  /** Close the AudioContext. Idempotent. Releases system audio resources. */
  close(): Promise<void>
  /** Resume the AudioContext if it is currently suspended (e.g., after iOS lock-screen auto-suspend).
   *  Idempotent: calling on an already-running AC resolves silently. Short-circuits on closed.
   *  Silently absorbs rejection. Used by useAudioCues' visibilitychange listener. */
  resume(): Promise<void>
  /** Live read of audioCtx.state. The hook's public resume() reads this AFTER
   *  `await engine.resume()` to decide whether reconstruction is required — React's audioStatus
   *  is closed-over by useCallback and may be stale within the same invocation. Reading
   *  audioCtx.state directly is the live truth. */
  readonly state: AudioContextState | 'interrupted'
  /** Dispatch a caller-supplied list of cues into the WebAudio scheduler.
   *  The caller pre-computes the cue list; the engine dispatches via the internal schedule()
   *  switch. Respects the closed guard and applies the callee-side SAFE_LEAD_SEC clamp
   *  on each cue's audioTime. Calls pruneExpiredCues() before dispatching to keep
   *  activeCues bounded. */
  topUpLookahead(args: { cues: Array<{ audioTime: number; phaseDurationSec: number; kind: 'in' | 'out' }> }): void
  /** Iterate activeCues snapshot, call cancel() on every cue with scheduledAt >
   *  audioCtx.currentTime, and remove those cues from activeCues. In-flight cues
   *  (scheduledAt <= now) are left to ring out naturally. Snapshot-iterate-then-mutate
   *  so Set mutation during iteration is safe. No-op when closed. */
  cancelFutureCues(): void
  /** SessionClock surface for external subscribers (onSuspend / onResume / onClose)
   *  and time reads (now / schedule). Constructed once at engine construction time.
   *
   *  The engine's internal reference is typed as the AUGMENTED factory return type
   *  `SessionClock & { notifySuspended(): void }` so the engine can invoke the
   *  synthetic-suspend escape hatch from the resume() InvalidStateError catch block —
   *  preserving the iOS Safari recovery path. The public `engine.clock` member is widened
   *  to `SessionClock` so external consumers cannot see `notifySuspended`. */
  readonly clock: SessionClock
}

export interface AudioEngineOptions {
  // External subscribers consume `engine.clock.onSuspend(cb)` /
  // `engine.clock.onResume(cb)` / `engine.clock.onClose(cb)`. The clock owns the single AC
  // statechange listener and fans suspend/resume/close to subscribers. The iOS Safari
  // InvalidStateError synthetic-suspend path is preserved via the engine-only escape hatch
  // on the augmented factory return type — see resume()'s catch block.
  /** Timbre captured at session start; engine never re-reads prefs.
   *  Caller passes the snapshot from useAudioCues.start(plan, timbre). No setter
   *  is exposed — capture-at-construction is the only mutation path. */
  timbre: TimbreId
  /** When false, skip silent-loop <audio> element construction entirely — no
   *  `new Audio(...)`, no `.play()` call, no teardown branch needed (null-guards in
   *  close() and the resume-reject catch already short-circuit when skipped).
   *  When true or undefined, the silent-loop element is constructed.
   *  Undefined coerces to true — omitting the field behaves identically to true
   *  (gate predicate is `!== false`, NOT `=== true`). */
  bypassSilentMode?: boolean | undefined
}

// Master-gain mute ramp duration (seconds).
const MUTE_RAMP_SEC = 0.05

// Lead-in: 3 ticks one second apart, then the first In cue at the start of the breath cycle.
// Exported as the single source of truth — App.tsx and useAudioCues.ts import these
// instead of redefining the same numbers locally.
export const LEAD_IN_TICK_INTERVAL_SEC = 1.0
export const LEAD_IN_DURATION_SEC = 3.0
export const LEAD_IN_TICK_INTERVAL_MS = LEAD_IN_TICK_INTERVAL_SEC * 1000
export const LEAD_IN_DURATION_MS = LEAD_IN_DURATION_SEC * 1000
/** Minimum scheduling lead ahead of audioCtx.currentTime for any cue dispatch.
 *  Exported as single source of truth — App.tsx imports this symbol for the caller-side
 *  clamp; audioEngine.scheduleNextCue uses it for the callee-side clamp.
 *  No duplicated literals; both clamp sites derive from this constant. */
export const SAFE_LEAD_SEC = 0.005

/** Lookahead window in seconds. Locked at 6 s — the middle of the 5–10 s recommended
 *  band. At any BPM ≥ 3 the seconds budget alone keeps ≥ 1 cue queued through a brief
 *  tab switch; the LOOKAHEAD_MIN_CUES floor handles the low-BPM (≤ 3 BPM) tail. */
export const LOOKAHEAD_WINDOW_SEC = 6 as const

/** Minimum cue queue depth regardless of BPM. Always keeps the next cue + cue-after
 *  queued (next + one-ahead). At 1 BPM (60 s/breath) the floor pre-schedules ~120 s
 *  of audio; cancel cost on a settings change = at most 2 oscillator stops + node
 *  disconnects. */
export const LOOKAHEAD_MIN_CUES = 2 as const

/** Create a new AudioContext + engine. MUST be called from a user-gesture path.
 *  Throws (rejects) if AudioContext construction fails — caller handles the fallback.
 *
 *  Construction is kept inline (not an awaited helper): in the common already-running
 *  case the body must run with NO await before returning, since an extra async hop
 *  shifts the start-path microtask timing the lead-in scheduler depends on. */
export async function createAudioEngine(opts: AudioEngineOptions): Promise<AudioEngine> {
  // AudioContext is constructed here, invoked synchronously from the Start session click
  // handler. The browser autoplay policy MUST see a fresh user-gesture chain or the AC
  // will start in 'suspended'.
  const audioCtx = new AudioContext()

  // Single master GainNode all cues route through. mute ramps it to 0,
  // unmute ramps it to 1 (over MUTE_RAMP_SEC). Cues schedule silently while muted.
  const masterGain = audioCtx.createGain()
  masterGain.gain.value = 1
  masterGain.connect(audioCtx.destination)

  // Silent looping <audio> element constructed SYNCHRONOUSLY on the gesture head,
  // BEFORE any await (the createSilentLoopBypass gesture-token constraint). Gate
  // predicate is `!== false` (NOT `=== true`) so undefined coerces to "construct".
  // When bypassSilentMode === false, silentBypass stays null and the `?.teardown()`
  // null-guards in close() and the resume-reject catch short-circuit cleanly.
  const silentBypass: SilentLoopBypass | null =
    opts.bypassSilentMode !== false ? createSilentLoopBypass() : null

  // Chrome can occasionally hand back an AC in 'suspended' even from a gesture chain
  // (race conditions during page bootstrap); resume immediately so currentTime advances.
  // If resume() rejects (e.g., the user agent vetoed autoplay), tear down the silent-loop
  // element (unreachable through engine.close() when we never return a handle) and close
  // the AC before re-throwing — otherwise the AC leaks (browsers cap concurrent ACs at ~6).
  if (audioCtx.state === 'suspended') {
    try {
      await audioCtx.resume()
    } catch (err) {
      silentBypass?.teardown()
      await audioCtx.close().catch(() => undefined)
      throw err
    }
  }

  // AudioContextState widened to include WebKit's 'interrupted' extension (iOS Safari).
  // The cast documents intent; centralising it here keeps the eslint-disable in one
  // place instead of repeated at every read site.
  type ExtendedAudioContextState = AudioContextState | 'interrupted'
  // eslint-disable-next-line @typescript-eslint/no-unnecessary-type-assertion
  const readState = (): ExtendedAudioContextState => audioCtx.state as ExtendedAudioContextState

  let muted = false // default false (audio ON on first visit)
  let closed = false

  // In-flight cue Set + end-chord tail bookkeeping. Timbre is captured once here and
  // immutable for this engine's lifetime — no setter exposed.
  const cueStore = createCueStore(audioCtx, masterGain, opts.timbre)

  // The clock wraps the AC's 'statechange' listener and fans suspend/resume/close to
  // external subscribers (useAudioCues consumes them via engine.clock.on*). cueStore.schedule
  // is plumbed at construction (NOT post-hoc reassignment). The local reference is typed as
  // the AUGMENTED factory return type `SessionClock & { notifySuspended(): void }` so the
  // InvalidStateError catch in resume() can call clock.notifySuspended(); the engine.clock
  // public member widens to SessionClock so external consumers cannot call it.
  const clock: SessionClock & { notifySuspended(): void } = createAudioSessionClock(audioCtx, cueStore.schedule)

  const engine: AudioEngine = {
    scheduleLeadIn(startAudioTime: number, plan: BreathingPlan): number | null {
      const firstInCueTime = startAudioTime + LEAD_IN_DURATION_SEC
      if (closed) return null // closed engine has no meaningful projection.
      // Cues schedule even while muted (they play silently through masterGain=0).
      // 3 ticks at +0/+1/+2 + first In cue at +3. plan.inhaleSec is seconds-shaped at
      // the source — no /1000 conversion — so the decay envelope stretches with the
      // upcoming In-phase length at low BPM.
      cueStore.schedule(startAudioTime + 0 * LEAD_IN_TICK_INTERVAL_SEC, { kind: 'lead-in-tick' })
      cueStore.schedule(startAudioTime + 1 * LEAD_IN_TICK_INTERVAL_SEC, { kind: 'lead-in-tick' })
      cueStore.schedule(startAudioTime + 2 * LEAD_IN_TICK_INTERVAL_SEC, { kind: 'lead-in-tick' })
      cueStore.schedule(firstInCueTime, { kind: 'in', phaseDurationSec: plan.inhaleSec })

      return firstInCueTime
    },

    scheduleNextCue({ newPhase, audioTime, phaseDurationSec }: { newPhase: 'in' | 'out'; audioTime: number; phaseDurationSec: number }): void {
      if (closed) return
      // Schedule even while muted (silent through masterGain=0).
      cueStore.prune()
      // Callee-side clamp: any audioTime in the past is clamped to currentTime + SAFE_LEAD_SEC.
      const clampedAudioTime = Math.max(audioTime, audioCtx.currentTime + SAFE_LEAD_SEC)
      cueStore.schedule(clampedAudioTime, { kind: newPhase, phaseDurationSec })
    },

    // Lookahead dispatch facade. Same posture as scheduleNextCue: closed guard at top,
    // prune() before dispatch, callee-side SAFE_LEAD_SEC clamp per cue. The cue list is
    // pre-computed by the caller; in-flight duplicates are skipped (cueStore.hasInFlightNear).
    topUpLookahead(args: { cues: Array<{ audioTime: number; phaseDurationSec: number; kind: 'in' | 'out' }> }): void {
      if (closed) return
      // Schedule even while muted (silent through masterGain=0).
      cueStore.prune()
      for (const cue of args.cues) {
        // Skip any requested cue whose unclamped audioTime is within SAFE_LEAD_SEC of an
        // already-in-flight cue — re-scheduling the boundary's surviving in-flight cue
        // would land an audible double-tick.
        if (cueStore.hasInFlightNear(cue.audioTime, SAFE_LEAD_SEC)) continue
        // Callee-side clamp — identical posture to scheduleNextCue.
        const clampedAudioTime = Math.max(cue.audioTime, audioCtx.currentTime + SAFE_LEAD_SEC)
        cueStore.schedule(clampedAudioTime, { kind: cue.kind, phaseDurationSec: cue.phaseDurationSec })
      }
    },

    cancelFutureCues(): void {
      if (closed) return
      cueStore.cancelFuture()
    },

    playEndChord(): void {
      if (closed) return
      // Schedule even while muted (silent through masterGain=0). The end-chord tail
      // bookkeeping is inside cueStore — close() defers teardown until the tail rings out.
      const when = audioCtx.currentTime + SAFE_LEAD_SEC
      cueStore.schedule(when, { kind: 'end-chord' })
    },

    setMuted(next: boolean): void {
      muted = next
      if (closed) return
      // Ramp the single master gain — instant, no boundary wait. Cues keep scheduling
      // through masterGain (silent at gain=0), so unmute lands on whatever cue is
      // currently playing. Anchor the current value first (Safari-safe), then
      // linear-ramp to the target over MUTE_RAMP_SEC.
      const gainParam = masterGain.gain
      const now = audioCtx.currentTime
      if (typeof gainParam.cancelAndHoldAtTime === 'function') {
        gainParam.cancelAndHoldAtTime(now)
      } else {
        gainParam.cancelScheduledValues(now)
        gainParam.setValueAtTime(gainParam.value, now)
      }
      gainParam.linearRampToValueAtTime(next ? 0 : 1, now + MUTE_RAMP_SEC)
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
      // No engine-side statechange listener to remove. The clock's listener is owned by
      // the clock; its lifecycle is independent (the AC's close fires 'closed' on the
      // clock's listener which fans to closeSubscribers, then handleClose in useAudioCues
      // sets audioStatus to 'unavailable').
      // If playEndChord scheduled a session-ending chord, defer teardown until
      // its tail rings out — otherwise the disconnect below would sever the chord
      // mid-ring. Skipped entirely when no end chord was scheduled
      // (endChordTailUntilSec = 0), so the manual-end / open-ended paths close
      // immediately as before.
      //
      // setTimeout(wallclock) is used here even though endChordTailUntilSec is on
      // the audio clock: when the tab is foregrounded the two clocks advance in
      // lockstep within human-perceptual tolerance, and when the tab is
      // backgrounded both throttle together (Chrome throttles setTimeout AND
      // auto-suspends the AC, Safari pauses both). The wait drifting longer in
      // a hidden tab is acceptable because the user is not listening; the wait
      // ending early is what we cannot tolerate, and that mode requires
      // setTimeout to fire while currentTime is paused, which no current
      // browser does.
      const tailRemainingSec = cueStore.endChordTailUntilSec - audioCtx.currentTime
      if (tailRemainingSec > 0) {
        await new Promise<void>((resolve) => {
          setTimeout(resolve, tailRemainingSec * 1000)
        })
      }
      // Silent-loop element teardown. Idempotent; no-op when bypass was skipped.
      // Second close() short-circuits at the top of close() before this runs.
      silentBypass?.teardown()
      // Explicitly disconnect every in-flight cue's envelope before closing the context —
      // the spec does not guarantee 'ended' fires for cues whose stopAt is still future.
      cueStore.teardown()
      // Disconnect the master gain from destination as part of teardown.
      try { masterGain.disconnect() } catch { /* silent — node may already be disconnected */ }
      // In-flight cue tails (up to ~5× decayTimeConstant) ring out via the audio thread's
      // already-scheduled gain ramps. We close immediately and trust those ramps to drain
      // naturally. Closing AudioContext releases the system audio resources.
      await audioCtx.close()
    },

    async resume(): Promise<void> {
      if (closed) return
      try {
        await audioCtx.resume()
      } catch (err) {
        // iOS Safari raises `DOMException { name: 'InvalidStateError' }` when resume()
        // is invoked from a non-gesture context (the visibilitychange listener qualifies
        // as non-gesture on iOS Safari). Surface THIS error class via the state-change
        // path so the hook can transition to 'needs-resume' and show the user-tappable
        // affordance. All other errors are silently absorbed — the session continues on
        // visuals only.
        //
        // When resume() rejects with InvalidStateError the AC was ALREADY 'suspended'
        // before the call and stays 'suspended' after — no natural statechange event fires.
        // We use the engine-only synthetic-suspend escape hatch on the augmented factory
        // return type; it synchronously fans the suspended event to suspendSubscribers via
        // the same path as a natural statechange. This lets useAudioCues' handleSuspend
        // subscriber set audioStatus to 'needs-resume' as it would on a real suspend.
        //
        // Duck-typed on `.name` rather than `instanceof DOMException`: the error is read
        // off `unknown` and the only contract is the name string — a real DOMException
        // (prod) and a name-tagged Error (tests) both satisfy it.
        if (typeof err === 'object' && err !== null && 'name' in err && err.name === 'InvalidStateError') {
          clock.notifySuspended()
        }
        // Else: silent. The session continues on visuals only.
      }
    },

    get state(): AudioContextState | 'interrupted' {
      return readState()
    },

    // Expose the SessionClock surface. The assignment widens the augmented factory
    // return type to `SessionClock` — external consumers cannot call `notifySuspended`.
    clock,
  }

  return engine
}
