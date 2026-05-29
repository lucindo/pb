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
import {
  scheduleCountdownTick,
  scheduleEndChord,
  scheduleNKFrontMarker,
  scheduleNKBackMarker,
  scheduleNKTick,
} from './nkCueSynth'
import { createAudioSessionClock, type SessionClock, type Cue } from './sessionClock'
import type { TimbreId } from '../domain/settings'

export type AudioStatus = 'idle' | 'lead-in' | 'failed'

// ABSTR-02: re-export SessionClock to satisfy the "audioEngine.ts exports the SessionClock interface" contract. Implementation lives in ./sessionClock per Plan 50-01.
// The augmented factory return type `SessionClock & { notifySuspended(): void }` is NOT re-exported. notifySuspended is an engine-only escape hatch — it stays scoped to createAudioEngine's internal closure (revision 2 Blocker #1).
export type { SessionClock } from './sessionClock'

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
   *  plan.inhaleSec / plan.exhaleSec (Phase 50-02 ms→sec cascade). */
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
  /** Phase 52 D-04: dispatch a caller-supplied list of cues into the WebAudio scheduler.
   *  The caller (Plan 03's walkFutureCues helper or Plan 04's force-top-up on onResume)
   *  pre-computes the cue list; the engine just dispatches via the internal schedule()
   *  switch. Respects closed/muted guards (matching scheduleNextCue posture) and applies
   *  the callee-side SAFE_LEAD_SEC clamp on each cue's audioTime. Calls pruneExpiredCues()
   *  before dispatching to keep activeCues bounded. */
  topUpLookahead(args: { cues: Array<{ audioTime: number; phaseDurationSec: number; kind: 'in' | 'out' }> }): void
  /** Phase 52 D-09 + D-10: iterate activeCues snapshot, call cancel() on every cue
   *  with scheduledAt > audioCtx.currentTime, and remove those cues from activeCues.
   *  In-flight cues (scheduledAt <= now) are left for applyMuteFadeOut (the D-08 path).
   *  Uses snapshot-iterate-then-mutate (AH-WR-07) so Set mutation during iteration is safe.
   *  No-op when engine is closed. */
  cancelFutureCues(): void
  /** Phase 50 D-11 + revision 1 Blocker #1 / ABSTR-01: SessionClock surface for external
   *  subscribers (onSuspend / onResume / onClose) and time reads (now / schedule). The
   *  clock is constructed once at engine construction time (see createAudioEngine).
   *
   *  Revision 2 Blocker #1: the engine's internal reference is typed as the AUGMENTED factory
   *  return type `SessionClock & { notifySuspended(): void }` so the engine can invoke the
   *  synthetic-suspend escape hatch from the resume() InvalidStateError catch block —
   *  preserving the iOS Safari recovery path (Plan 06 D-38) byte-identically. The public
   *  `engine.clock` member is widened to `SessionClock` so external consumers cannot see
   *  `notifySuspended`. The escape hatch stays scoped to createAudioEngine's internal closure. */
  readonly clock: SessionClock
}

export interface AudioEngineOptions {
  // Phase 50 D-11 + revision 1 Blocker #1: the prior state-change callback option is
  // removed. External subscribers now consume `engine.clock.onSuspend(cb)` /
  // `engine.clock.onResume(cb)` / `engine.clock.onClose(cb)`. The clock owns the single AC
  // statechange listener (added inside createAudioSessionClock per Plan 50-01) and fans
  // suspend/resume/close to subscribers. The iOS Safari InvalidStateError synthetic-suspend
  // path (Plan 06 D-38) is preserved via the engine-only escape hatch on the augmented
  // factory return type — see resume()'s catch block below and revision 2 Blocker #1.
  /** Phase 18 D-08: timbre captured at session start; engine never re-reads prefs.
   *  Caller passes the snapshot from useAudioCues.start(plan, timbre). No setter
   *  is exposed — capture-at-construction is the only mutation path. */
  timbre: TimbreId
  /** Phase 49.1 D-07: when false, skip silent-loop <audio> element construction
   *  entirely — no `new Audio(...)`, no `.play()` call, no teardown branch needed
   *  (existing null-guards in close() and the resume-reject catch already short-circuit
   *  when construction was skipped).
   *  When true or undefined, behavior is identical to Phase 49 v3 (silent-loop active).
   *  Undefined coerces to true — keeps any pre-Phase-49.1 caller working unchanged
   *  (gate predicate is `!== false`, NOT `=== true`). */
  bypassSilentMode?: boolean
}

// D-08: soft fade-out tail when muting mid-cue.
// timeConstant 0.05 → ~150 ms perceptual decay (3× constant — see 03-RESEARCH.md Pattern 5).
const MUTE_FADE_TIME_CONSTANT = 0.05
// Never ramp gain to 0.0 — exponentialRampToValueAtTime would throw, and even
// setTargetAtTime is more numerically stable with a nonzero target.
const MIN_GAIN_VALUE = 0.0001

// Phase 49 D-03: silent-loop WAV data URL used to coerce iOS Safari's audio
// session category from "ambient" to "playback" so cue audio routes through
// the device speaker even when the silent switch is ON and no headphones are
// connected. Format: 8 kHz mono 8-bit PCM, ~25 ms duration, ~200 samples
// alternating between 127 and 128 — near-zero amplitude but a REAL decodable
// track (NOT digital silence — some iOS Safari versions reject empty/silent
// tracks for session coercion). See 49-CONTEXT.md D-03 and the canonical spec
// at .planning/todos/2026-05-27-ios-speaker-route-audio-element-fix.md.
// Constant is file-local (D-03 + 49-PATTERNS.md Pattern A — Task 2 stubs
// `Audio` globally and does not need to import this).
// Device-validation revision (Phase 49 Plan 02, 2026-05-27):
//   v1 (Plan 01 initial): 8-bit / 8 kHz / 200 samples, alternating 127/128 — a
//     full-amplitude 4 kHz square wave looping every 25 ms. Audible on iOS as a
//     continuous loud buzz.
//   v2 (Plan 02 first revision): 8-bit / 8 kHz / 200 samples, single ±1 LSB sine
//     cycle centered at 128. Bundle footprint preserved. Less harsh, but still
//     audible on iOS at master volume 0.0001 — different sound, not absent.
//   v3 (this revision): the root cause is that iOS Safari ignores the
//     HTMLMediaElement.volume attribute entirely (long-standing iOS WebKit
//     behavior — volume is hardware-controlled). The v1/v2 element was playing
//     at full system volume on iPhone the whole time. Attenuation must therefore
//     be encoded into the PCM samples themselves, not via .volume. Switched to
//     16-bit signed / 22050 Hz / 200 samples (~9 ms), generated from a single
//     low-amplitude sine cycle that — once rounded to integer LSBs at ±1
//     amplitude — collapses to a near-DC stepped pulse pair (~17 leading zeros,
//     ~67 samples of +1, ~33 zero-crossing samples, ~66 samples of -1, ~17
//     trailing zeros). Peak amplitude is 1/32768 ≈ -90 dBFS — 42 dB quieter
//     than v2's -48 dBFS 8-bit floor — and inaudible on iPhone speakers at
//     full system volume. Loop-continuous (sample 0 == sample 199 == 0, no
//     boundary clicks). Not pure silence (contains 1 and -1 samples), so iOS
//     Safari still treats it as a "real" track per D-05. File is 444 bytes /
//     592 base64 chars (vs v1/v2's 244 / 480) — negligible bundle increase.
//   SILENT_LOOP_VOLUME stays at 0.0001 — it's a no-op on iOS but still attenuates
//   on Android Chrome and desktop browsers (defense in depth).
//   See .planning/phases/49-ios-speaker-route-fix/49-02-DEVICE-VALIDATION.md.
const SILENT_WAV_DATA_URL =
  'data:audio/wav;base64,UklGRrQBAABXQVZFZm10IBAAAAABAAEAIlYAAESsAAACABAAZGF0YZABAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAQABAAEAAQABAAEAAQABAAEAAQABAAEAAQABAAEAAQABAAEAAQABAAEAAQABAAEAAQABAAEAAQABAAEAAQABAAEAAQABAAEAAQABAAEAAQABAAEAAQABAAEAAQABAAEAAQABAAEAAQABAAEAAQABAAEAAQABAAEAAQABAAEAAQABAAEAAQAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAD//////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////wAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAA'
// Phase 49 D-05: near-zero non-zero. NOT coupled to MIN_GAIN_VALUE — separate invariants (49-PATTERNS.md Pattern A).
const SILENT_LOOP_VOLUME = 0.0001

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

/** Phase 52 D-02: lookahead window in seconds.
 *  Locked at 6 s — the middle of the ROADMAP 5–10 s band. At any BPM ≥ 3 the
 *  seconds budget alone keeps ≥ 1 cue queued through a brief tab switch; the
 *  LOOKAHEAD_MIN_CUES floor handles the low-BPM (≤ 3 BPM) tail. */
export const LOOKAHEAD_WINDOW_SEC = 6 as const

/** Phase 52 D-03: minimum cue queue depth regardless of BPM.
 *  Always keeps the next cue + cue-after queued (next + one-ahead). At 1 BPM
 *  (60 s/breath) the floor pre-schedules ~120 s of audio; cancel cost on a
 *  settings change = at most 2 oscillator stops + node disconnects. */
export const LOOKAHEAD_MIN_CUES = 2 as const

/** Phase 52 D-06: per-tick elapsed-delta clamp ceiling in seconds.
 *  100 ms is tight enough that a 60→6 fps frame-rate drop passes through
 *  unchanged (6×16.67 ms = 100 ms). Anything beyond this threshold is treated
 *  as a hidden-window resumption and the session anchor is rebased forward by
 *  (raw_delta − MAX_TICK_DELTA_SEC) to preserve practice-time semantics. */
export const MAX_TICK_DELTA_SEC = 0.1 as const

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

  // Phase 50 D-07: wrap the AC. D-11 + revision 1 Blocker #1: the clock owns the audioCtx
  // 'statechange' listener and fans suspend/resume/close to subscribers via the
  // SessionClock interface.
  //
  // Revision 2 Warning #6 + revision 1 Blocker #2 (Plan 50-06): the clock construction is now
  // placed AFTER the internal `schedule` function is defined (the `const clock = ...` line
  // appears below the schedule fn). This places the construction AFTER the schedule fn is in
  // scope so `scheduleImpl` can be plumbed at construction time (no post-hoc readonly
  // reassignment), and BEFORE the `engine` object literal that references `clock`. Plan 50-04
  // placed the construction here (immediately after `new AudioContext()`) as an intermediate
  // state — both positions pass the per-commit green-gate; the move is observationally
  // equivalent (listener attachment, subscriber Sets, notifySuspended() escape hatch are
  // independent of the construction-site line number).

  // Phase 49 D-01/D-04/D-06: silent looping <audio> element constructed inside the engine,
  // on the sync gesture head, BEFORE any asynchronous suspension. Coerces iOS audio session
  // from 'ambient' to 'playback'. See 49-CONTEXT.md.
  //
  // Phase 49.1 D-07: gate on opts.bypassSilentMode. The predicate is `!== false` (NOT `=== true`)
  // so undefined coerces to "construct" — any pre-49.1 caller that omits the field gets Phase 49
  // v3 behavior unchanged. When bypassSilentMode === false, silentLoopElement stays null and the
  // existing null-guards in close() and the resume-reject catch both short-circuit cleanly —
  // no new teardown branches needed per D-07 + PATTERNS.md Pattern C.
  let silentLoopElement: HTMLAudioElement | null = null
  if (opts.bypassSilentMode !== false) {
    silentLoopElement = new Audio(SILENT_WAV_DATA_URL)
    // Reason: `playsInline` is typed only on HTMLVideoElement in lib.dom.d.ts, but
    // iOS Safari honors the property on HTMLMediaElement (the trick lifted from
    // Howler.js). The runtime assignment is correct; the cast documents the
    // type-vs-runtime gap.
    ;(silentLoopElement as HTMLMediaElement & { playsInline: boolean }).playsInline = true
    silentLoopElement.loop = true
    silentLoopElement.muted = false
    silentLoopElement.volume = SILENT_LOOP_VOLUME
    // D-09 silent-absorb: a .play() rejection (autoplay policy regression, codec issue) does NOT
    // propagate. Session continues; iOS silent-switch users simply do not get speaker routing —
    // no worse than pre-Phase-49. Critically different from the AC resume() reject below at
    // L139-143, which DOES re-throw — the silent loop is sub-essential infrastructure
    // (49-PATTERNS.md "Silent-absorb on resource-acquisition failures").
    //
    // Optional chain: per HTMLMediaElement spec play() returns a Promise<void>, but very old
    // browsers (Safari < 11) and the jsdom test environment return undefined. The chain absorbs
    // that variant under the same silent-absorb posture.
    // eslint-disable-next-line @typescript-eslint/no-unnecessary-condition
    void silentLoopElement.play()?.catch(() => undefined)
  }

  // Chrome can occasionally hand back an AC in 'suspended' even from a gesture chain
  // (race conditions during page bootstrap); resume immediately so currentTime advances.
  // WR-06: if resume() rejects (e.g., the user agent vetoed autoplay between
  // construction and the resume attempt), close the AC before re-throwing — otherwise
  // the AC leaks (browsers cap concurrent ACs ~6 in Chrome).
  // CR-01 (Phase 49 REVIEW): the silent-loop element was constructed above on the
  // gesture head (D-04/D-06 invariant — cannot move it past the await), so this catch
  // is ALSO the only reachable teardown path for the element when resume() rejects —
  // engine.close() is never reached because we never return an engine handle. Tear
  // down the element symmetrically with engine.close()'s D-08 sequence (pause →
  // removeAttribute('src') → drop reference) BEFORE closing the AC.
  if (audioCtx.state === 'suspended') {
    try {
      await audioCtx.resume()
    } catch (err) {
      if (silentLoopElement !== null) {
        silentLoopElement.pause()
        silentLoopElement.removeAttribute('src')
        silentLoopElement = null
      }
      await audioCtx.close().catch(() => undefined)
      throw err
    }
  }

  // AudioContextState widened to include WebKit's 'interrupted' extension
  // (D-37 / Phase 5.1). The cast documents intent even if the TS DOM lib does
  // not require it; centralising it here keeps the eslint-disable in one place
  // instead of repeated at every read site.
  type ExtendedAudioContextState = AudioContextState | 'interrupted'
  // eslint-disable-next-line @typescript-eslint/no-unnecessary-type-assertion
  const readState = (): ExtendedAudioContextState => audioCtx.state as ExtendedAudioContextState

  // Revision 1 Blocker #3 (committed path): the prior local statechange listener was DELETED.
  // The clock owns the single AC statechange listener (added by createAudioSessionClock per
  // Plan 50-01) and fans suspend/resume/close to external subscribers (useAudioCues consumes
  // them via engine.clock.on*). Engine internals do not observe statechange events directly;
  // they act in their own synchronous lifecycle methods (close(), resume()). The
  // InvalidStateError synthetic-suspend path inside resume()'s catch uses the engine-only
  // escape hatch (revision 2 Blocker #1) — it does NOT need its own listener.

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
  //
  // The 100 ms slack between actual 'ended' fire time (stopAt = when + 5τ + 0.1s)
  // and cleanupAt (stopAt + 0.1s) is intentional. During that window the cue is
  // still in activeCues but its 'ended' listener has already disconnected the
  // envelope from upstream + destination. setMuted ramps on these phantom
  // envelopes are harmless dead work; close() disconnects are wrapped in
  // try/catch for the same reason. Pruning strictly on cleanupAt < now lets us
  // avoid threading a per-handle 'done' flag through every schedule* primitive.
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

  // Phase 50 D-04 / D-05: internal dispatch from a typed Cue value to the per-cue
  // primitives in cueSynth.ts / nkCueSynth.ts. The public methods (scheduleLeadIn,
  // scheduleNextCue, playEndChord) are thin facades over this function. The
  // closed/muted guards live in the facades (so each facade can choose its own
  // behavior, e.g., scheduleNextCue clamps the time, scheduleLeadIn returns
  // firstInCueTime). This function assumes the facade has already gated; do NOT
  // add closed/muted checks here.
  //
  // The Cue discriminated union is closed (Plan 50-01 D-04) — every kind has a
  // switch arm. TypeScript exhaustiveness enforces this at compile time. NK kinds
  // are wired but currently unused at Phase 50 (NK paths in useNaviKriyaAudio still
  // call the per-cue scheduler primitives directly per Plan 50-03; D-05's NK
  // migration through schedule() is documented as available but not exercised
  // until Phase 52 lookahead).
  function schedule(when: number, cue: Cue): void {
    switch (cue.kind) {
      case 'lead-in-tick':
        activeCues.add(scheduleCountdownTick(audioCtx, when, audioCtx.destination, sessionTimbre))
        return
      case 'countdown-tick':
        activeCues.add(scheduleCountdownTick(audioCtx, when, audioCtx.destination, sessionTimbre))
        return
      // cue.timbre is in the type union for callers that pre-schedule cues without
      // engine context (Phase 52 lookahead). At the engine layer, sessionTimbre is
      // the source of truth per Phase 18 D-08 — we ignore cue.timbre here.
      case 'in':
        activeCues.add(scheduleInCueForTimbre(audioCtx, when, audioCtx.destination, sessionTimbre, cue.phaseDurationSec))
        return
      case 'out':
        activeCues.add(scheduleOutCueForTimbre(audioCtx, when, audioCtx.destination, sessionTimbre, cue.phaseDurationSec))
        return
      case 'end-chord': {
        const c = scheduleEndChord(audioCtx, when, audioCtx.destination, sessionTimbre)
        activeCues.add(c)
        // Record the tail end so close() can defer teardown until the chord rings out.
        // Take the max in case of double-dispatch — the second call's tail must not
        // retreat below an earlier-scheduled chord still ringing.
        endChordTailUntil = Math.max(endChordTailUntil, c.cleanupAt)
        return
      }
      case 'nk-front':
        activeCues.add(scheduleNKFrontMarker(audioCtx, when, audioCtx.destination, sessionTimbre))
        return
      case 'nk-back':
        activeCues.add(scheduleNKBackMarker(audioCtx, when, audioCtx.destination, sessionTimbre))
        return
      case 'nk-tick':
        activeCues.add(scheduleNKTick(audioCtx, when, audioCtx.destination, sessionTimbre))
        return
    }
  }

  // Phase 50 D-07: wrap the AC. D-11 + revision 1 Blocker #1: the clock owns the
  // audioCtx 'statechange' listener and fans suspend/resume/close to subscribers.
  //
  // Revision 1 Blocker #2: scheduleImpl plumbed at construction (NOT post-hoc
  // reassignment). The clock's schedule() forwards to the engine's internal
  // schedule function. No readonly violation — the clock object's members are
  // set once at construction.
  //
  // Revision 2 Blocker #1: the local clock reference is typed as the AUGMENTED
  // factory return type `SessionClock & { notifySuspended(): void }` so the L445
  // InvalidStateError catch (already in place from Plan 50-04) can call
  // clock.notifySuspended(). The engine.clock public member is widened to
  // SessionClock at the assignment boundary — external consumers cannot call
  // notifySuspended.
  //
  // Revision 2 Warning #6: this construction site (post-schedule-function) is the
  // FINAL position for the clock. Plan 50-04 placed it at L177 as intermediate;
  // both positions pass the per-commit green-gate. Moving the construction line
  // does NOT change observable behavior (listener attachment, subscribers Set
  // lifecycle, notifySuspended escape hatch are independent of the construction
  // site).
  //
  // Revision 1 Warning #12: this is THE engine clock (HRV AC); useNaviKriyaAudio
  // constructs its own SEPARATE clock for the NK AC — they MUST NOT be conflated.
  const clock: SessionClock & { notifySuspended(): void } = createAudioSessionClock(audioCtx, schedule)

  const engine: AudioEngine = {
    scheduleLeadIn(startAudioTime: number, plan: BreathingPlan): number | null {
      const firstInCueTime = startAudioTime + LEAD_IN_DURATION_SEC
      if (closed) return null // AUDIO-03: closed engine has no meaningful projection.
      if (muted) return firstInCueTime

      // Plan 50-06 D-05: facade over the internal schedule(when, cue) dispatch.
      // 3 ticks at +0/+1/+2 (D-14 lead-in) + first In cue at +3. Track each so
      // mid-lead-in mute can fade them out (WR-08) — schedule()'s switch arms
      // do the activeCues.add bookkeeping. Consistency: the countdown beep is
      // the shared scheduleCountdownTick — the same beep the Navi Kriya
      // countdown uses — and honours the session timbre.
      schedule(startAudioTime + 0 * LEAD_IN_TICK_INTERVAL_SEC, { kind: 'lead-in-tick' })
      schedule(startAudioTime + 1 * LEAD_IN_TICK_INTERVAL_SEC, { kind: 'lead-in-tick' })
      schedule(startAudioTime + 2 * LEAD_IN_TICK_INTERVAL_SEC, { kind: 'lead-in-tick' })
      // First In cue at +3 (numerals replaced by the In phase label at t=0; bowl strikes).
      // 260510-tc9 Bug 2: pass the upcoming In-phase duration so the decay envelope
      // stretches with the phase length at low BPM (App.tsx boundary scheduler does
      // the same for every subsequent cue). Phase 50-02 (ms→sec cascade): plan.inhaleSec
      // is already seconds-shaped at the source — no runtime `/1000` conversion.
      // cue.timbre carries sessionTimbre for type-completeness; the engine ignores it
      // and uses its closed-over sessionTimbre per Phase 18 D-08.
      schedule(firstInCueTime, { kind: 'in', phaseDurationSec: plan.inhaleSec, timbre: sessionTimbre })

      return firstInCueTime
    },

    scheduleNextCue({ newPhase, audioTime, phaseDurationSec }: { newPhase: 'in' | 'out'; audioTime: number; phaseDurationSec: number }): void {
      if (closed) return
      if (muted) return // D-08 unmute-waits-for-boundary; if currently muted, skip this cue.
      pruneExpiredCues()
      // AUDIO-02 D-01/D-02 callee-side clamp. The audioCtx.currentTime read here
      // is INSIDE the engine and OUTSIDE the drift-guard scope (which targets the
      // 5 caller files exclusively per 50-CONTEXT.md specifics).
      const clampedAudioTime = Math.max(audioTime, audioCtx.currentTime + SAFE_LEAD_SEC)
      // Plan 50-06 D-05: facade over schedule(). 260510-tc9 Bug 2: phaseDurationSec
      // flows into the 'in' / 'out' cue payload; schedule()'s arm forwards it as the
      // 5th arg to scheduleInCueForTimbre / scheduleOutCueForTimbre.
      schedule(clampedAudioTime, { kind: newPhase, phaseDurationSec, timbre: sessionTimbre })
    },

    // Phase 52 D-04: lookahead dispatch facade.
    // Follows the same posture as scheduleNextCue: closed/muted guards at top,
    // pruneExpiredCues() before dispatch, callee-side SAFE_LEAD_SEC clamp per cue.
    // The cue list is pre-computed by Plan 03's walkFutureCues helper; this method
    // only dispatches via the internal schedule() switch (no walk logic here).
    topUpLookahead(args: { cues: Array<{ audioTime: number; phaseDurationSec: number; kind: 'in' | 'out' }> }): void {
      if (closed) return
      if (muted) return // D-08 unmute-waits-for-boundary; mirrors scheduleNextCue guard.
      pruneExpiredCues()
      const nowSec = audioCtx.currentTime
      for (const cue of args.cues) {
        // GAP-52H-2 / REVIEW WR-01 — engine-layer dedup (closes the audible ~5ms boundary flam).
        // The rAF top-up re-walks the boundary it is currently crossing; that boundary's
        // IN-FLIGHT cue survived cancelFutureCues (scheduledAt <= now), so re-scheduling it
        // here lands a second strike ~SAFE_LEAD_SEC after the first — the audible double-tick.
        // Skip any requested cue whose UNCLAMPED audioTime is within SAFE_LEAD_SEC of an
        // already-IN-FLIGHT cue's scheduledAt. Compare the unclamped time (not the SAFE_LEAD
        // clamp below) so a boundary a few ms in the past still matches its in-flight handle.
        // Scope to in-flight (scheduledAt <= now) ONLY: future queued cues are the caller's
        // cancel-then-reschedule responsibility (D-10/CR-01) — deduping them could leave a
        // stale old-settings cue in place after a BPM/timbre change. Distinct breathing cues
        // are always >> SAFE_LEAD_SEC apart, so this never drops a genuinely separate cue.
        // No-op after reconstruction — activeCues starts empty (WR-04).
        let isInFlightDuplicate = false
        for (const active of activeCues) {
          if (active.scheduledAt <= nowSec && Math.abs(active.scheduledAt - cue.audioTime) < SAFE_LEAD_SEC) {
            isInFlightDuplicate = true
            break
          }
        }
        if (isInFlightDuplicate) continue
        // AUDIO-02 D-01/D-02 callee-side clamp — identical posture to scheduleNextCue (L439).
        const clampedAudioTime = Math.max(cue.audioTime, audioCtx.currentTime + SAFE_LEAD_SEC)
        // schedule() adds the returned handle to activeCues internally (D-05).
        // Engine ignores cue.timbre — uses closed-over sessionTimbre (Phase 18 D-08).
        schedule(clampedAudioTime, { kind: cue.kind, phaseDurationSec: cue.phaseDurationSec, timbre: sessionTimbre })
      }
    },

    // Phase 52 D-09 + D-10: future-cue cancellation helper.
    // Snapshot-iterate activeCues (AH-WR-07: spread copy decouples iteration from mutation).
    // For each cue with scheduledAt > now: call cancel() + remove from activeCues.
    // In-flight cues (scheduledAt <= now) are preserved for applyMuteFadeOut (D-08/D-10).
    cancelFutureCues(): void {
      if (closed) return
      const now = audioCtx.currentTime
      // AH-WR-07 snapshot-iterate-then-mutate: same pattern as pruneExpiredCues (L322).
      // D-09 + D-10: cancel() stops oscillators + disconnects all nodes.
      for (const cue of [...activeCues]) {
        if (cue.scheduledAt > now) {
          cue.cancel()
          activeCues.delete(cue)
        }
      }
    },

    playEndChord(): void {
      if (closed) return
      if (muted) return // consistent with the Navi end cue — muted = silent.
      // Plan 50-06 D-05: facade over schedule(). The endChordTailUntil
      // Math.max bookkeeping is preserved inside schedule()'s 'end-chord' arm
      // (Task 1) — close() still defers teardown until the tail rings out.
      // The audioCtx.currentTime read for `when` stays inside the engine
      // (NOT in drift-guard scope per 50-CONTEXT.md specifics).
      const when = audioCtx.currentTime + SAFE_LEAD_SEC
      schedule(when, { kind: 'end-chord' })
    },

    setMuted(next: boolean): void {
      if (closed) {
        muted = next
        return
      }
      if (next && activeCues.size > 0) {
        // D-08 + WR-08 (PRESERVED): muting mid-cue applies fade-out to in-flight cues.
        // Phase 52 D-10: split iteration — in-flight branch fades, future branch cancels.
        pruneExpiredCues()
        const now = audioCtx.currentTime
        for (const cue of activeCues) {
          if (cue.scheduledAt <= now) {
            // In-flight cue: apply soft fade-out (D-08/WR-08 behavior preserved).
            applyMuteFadeOut(cue, audioCtx)
          }
        }
        // Phase 52 D-10: future-queued cues from the lookahead window get hard-cancelled.
        // Without this, the deeper queue (~6s) would leave audible audio after mute.
        // Called AFTER the in-flight loop so the loop sees the original Set before mutation.
        // AH-WR-07 snapshot-iterate-then-mutate pattern (same as pruneExpiredCues).
        for (const cue of [...activeCues]) {
          if (cue.scheduledAt > now) {
            cue.cancel()
            activeCues.delete(cue)
          }
        }
      }
      // D-08 (PRESERVED): unmute waits for next boundary (the next top-up tick re-queues
      // from the fresh muted=false state). No make-up cue dispatched here.
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
      // Revision 1 Blocker #3: prior removeEventListener removed — the local listener was
      // deleted at the construction site (no engine-side statechange listener exists).
      // The clock's listener is owned by the clock; its lifecycle is independent (the AC's
      // close will fire 'closed' on the clock's listener which fans to closeSubscribers per
      // Plan 50-01, then handleClose in useAudioCues sets audioStatus to 'unavailable' per
      // revision 1 Blocker #1).
      // If playEndChord scheduled a session-ending chord, defer teardown until
      // its tail rings out — otherwise the disconnect loop below would sever
      // the chord mid-ring. Skipped entirely when no end chord was scheduled
      // (endChordTailUntil = 0), so the manual-end / open-ended paths close
      // immediately as before.
      //
      // setTimeout(wallclock) is used here even though endChordTailUntil is on
      // the audio clock: when the tab is foregrounded the two clocks advance in
      // lockstep within human-perceptual tolerance, and when the tab is
      // backgrounded both throttle together (Chrome throttles setTimeout AND
      // auto-suspends the AC, Safari pauses both). The wait drifting longer in
      // a hidden tab is acceptable because the user is not listening; the wait
      // ending early is what we cannot tolerate, and that mode requires
      // setTimeout to fire while currentTime is paused, which no current
      // browser does.
      const tailRemainingSec = endChordTailUntil - audioCtx.currentTime
      if (tailRemainingSec > 0) {
        await new Promise<void>((resolve) => {
          setTimeout(resolve, tailRemainingSec * 1000)
        })
      }
      // Phase 49 D-08: silent-loop element teardown. pause() + clear src releases the
      // decoded buffer; null reference drops the closure handle for GC. Sync, no await,
      // no try/catch — the engine owns the element exclusively (Pattern D). Inside the
      // existing `if (closed) return` guard at the top of close() — second close()
      // short-circuits before this runs.
      if (silentLoopElement !== null) {
        silentLoopElement.pause()
        silentLoopElement.removeAttribute('src')
        silentLoopElement = null
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
        // path so the hook can transition to 'needs-resume' and surface the
        // user-tappable affordance (D-29). All other errors continue silent-absorb
        // (Plan 01 D-09 preserved for unknown failure modes).
        //
        // Revision 2 Blocker #1: the prior fan-out call (the removed callback option) was a
        // SYNCHRONOUS state report — the AC was already 'suspended' before resume() was called, stays
        // 'suspended' after the rejection, and no natural statechange event fires. We replace
        // the prior call with the engine-only synthetic-suspend escape hatch on the augmented
        // factory return type from Plan 50-01 revision 2; it synchronously fans the suspended
        // event to suspendSubscribers via the same fanSuspend() helper used by the natural
        // statechange listener. iOS Safari recovery flow preserved byte-identically:
        // useAudioCues' handleSuspend subscriber sets audioStatus to 'needs-resume' when
        // visibilityResumeAttemptedRef.current is true, exactly as it did pre-refactor.
        // eslint-disable-next-line @typescript-eslint/no-unnecessary-condition
        if ((err as DOMException)?.name === 'InvalidStateError') {
          clock.notifySuspended()
        }
        // Else: silent. No console.debug (discretion #4). The session continues on visuals
        // only — same posture as Phase 3 D-10 and Phase 5 D-09.
      }
    },

    get state(): AudioContextState | 'interrupted' {
      return readState()
    },

    // D-11 + revision 1 Blocker #1 / ABSTR-01: expose the SessionClock surface. The
    // assignment widens the augmented factory return type to `SessionClock` — external
    // consumers reading `engine.clock` cannot call `notifySuspended` (revision 2 Blocker #1
    // encapsulation boundary).
    clock,
  }

  return engine
}
