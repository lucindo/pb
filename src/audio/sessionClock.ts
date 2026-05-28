// SessionClock — typed interface around the two time sources used by Phase 50's
// callers (the engine's AudioContext clock and the wall clock). Zero React imports.
//
// Owns:
//   - The single clock source closure for now() (D-01 / D-03 — audio-natural seconds).
//   - FOUR subscriber Sets in createAudioSessionClock: suspendSubscribers,
//     resumeSubscribers, closeSubscribers (revision 1 Blocker #1), and the reserved
//     conceptual slot for masterGainSubscribers that Phase 53 may add (NOT declared
//     here — kept out at Phase 50 per scope discipline).
//   - The master-gain setter signature (D-12 — stubbed no-op at Phase 50; Phase 53
//     lands the GainNode insertion AND the mute call-site swap together).
//
// Invariants:
//   - D-08 wrap-don't-construct: createAudioSessionClock ACCEPTS an AudioContext;
//     it NEVER constructs one. The two production call sites pass their own AC
//     (the engine's HRV AC; useNaviKriyaAudio's NK AC).
//   - D-11 wired-real subscribers: onSuspend / onResume / onClose fan out real
//     AudioContext statechange transitions in the audio factory.
//     createWallSessionClock exposes them as no-op subscribers (wall clock
//     never suspends/resumes/closes).
//   - D-12 stubbed no-op: setMasterGain has an empty body at Phase 50 — no
//     GainNode is inserted into the audio graph here. The signature exists for
//     ABSTR-01 completeness; Phase 53 swaps the body and the call site together.
//   - Revision 1 Blocker #1 — onClose preserves the byte-identical
//     setAudioStatus('unavailable') setter at useAudioCues.ts:164-165 through
//     the SessionClock seam (Phase 50 success criterion #3).
//   - Revision 1 Blocker #2 — scheduleImpl is plumbed at construction
//     (NOT reassigned post-hoc — that would violate the readonly contract on
//     the interface). The engine passes its internal dispatch fn at Plan 50-06;
//     useNaviKriyaAudio passes undefined and schedule() is a no-op for that AC.
//   - Revision 2 Blocker #1 — notifySuspended is the engine-only synthetic-suspend
//     escape hatch on the augmented factory return type
//     (SessionClock & { notifySuspended(): void }). It is NOT a public
//     SessionClock interface member. Only the engine's internal augmented-type
//     reference inside createAudioEngine can call it. External consumers
//     (useAudioCues, useSessionEngine, useNaviKriyaAudio, useAmbientScale, and
//     the engine's own engine.clock: SessionClock member) see only the 6-member
//     read-only interface and cannot reach notifySuspended.
//
// Zero React imports.
//
// Phase-level invariant (revision 1 Warning #12):
//   Phase 50 has exactly TWO createAudioSessionClock invocations: one inside
//   createAudioEngine (HRV AC), one inside useNaviKriyaAudio.begin() (NK AC).
//   They wrap DIFFERENT AudioContexts and MUST NOT be conflated. The engine's
//   `clock` member exposes only the HRV-AC clock; NK-AC's clock is local to
//   NK's lifecycle.

import type { TimbreId } from '../domain/settings'

/**
 * Closed catalog of cue kinds the engine and any future lookahead scheduler
 * (Phase 52) can dispatch.
 *
 * D-04: catalog is CLOSED at Phase 50 — adding a new kind in a later phase
 * is an interface change visible to every scheduler. The `'in'` and `'out'`
 * variants carry `timbre` + `phaseDurationSec` because the per-cue builders
 * (`scheduleInCueForTimbre`/`scheduleOutCueForTimbre`) need them; all other
 * kinds omit both fields because the engine resolves timbre from its
 * closed-over `sessionTimbre` at dispatch time (Phase 18 D-08 capture-at-start).
 */
export type Cue =
  | { kind: 'in'; phaseDurationSec: number; timbre: TimbreId }
  | { kind: 'out'; phaseDurationSec: number; timbre: TimbreId }
  | { kind: 'lead-in-tick' }
  | { kind: 'end-chord' }
  | { kind: 'nk-front' }
  | { kind: 'nk-back' }
  | { kind: 'nk-tick' }
  | { kind: 'countdown-tick' }

/**
 * SessionClock — typed read-only interface with EXACTLY 6 members.
 *
 * Revision 2 Blocker #1: this surface is the PUBLIC contract that every
 * external consumer sees. The engine-only `notifySuspended()` escape hatch
 * is NOT a member here — it is surfaced on the augmented factory return type
 * of `createAudioSessionClock` and is inaccessible to anything typed as
 * `SessionClock`.
 */
export interface SessionClock {
  /**
   * Current clock value in seconds (float, audio-natural — matches
   * `audioCtx.currentTime` convention).
   *
   * D-01 + D-03 (Option A, resolved 2026-05-27):
   *   - `createAudioSessionClock.now()` returns `audioCtx.currentTime`.
   *   - `createWallSessionClock.now()` returns `performance.now() / 1000`.
   *
   * The audio-factory shape makes Plan 50-03's substitution at
   * `useNaviKriyaAudio.ts:75` (`audioCtx.currentTime + SAFE_LEAD_SEC` →
   * `clock.now() + SAFE_LEAD_SEC`) byte-identical at runtime. Phase 51's
   * work is caller-level rebase of `useSessionEngine` (capture
   * `sessionStartCtxTime` and use `clock.now() − sessionStartCtxTime`),
   * NOT a swap of these factory bodies.
   */
  now(): number

  /**
   * Dispatch entry. `when` is seconds-shaped on the same time-base as `now()`;
   * `cue` is the closed discriminated union catalog above.
   *
   * D-04: catalog is closed at Phase 50.
   *
   * Revision 1 Blocker #2 (constructor plumbing, not post-hoc reassignment):
   * the audio factory accepts a `scheduleImpl` constructor arg. When supplied
   * (the engine's internal dispatch, plumbed in Plan 50-06), schedule()
   * forwards to it. When absent (useNaviKriyaAudio's call site at Phase 50;
   * Plan 52 may wire NK lookahead through schedule() later), schedule() is a
   * typed no-op. The wall factory's schedule() is always a no-op
   * (useAmbientScale only calls now()).
   */
  schedule(when: number, cue: Cue): void

  /**
   * Linear-ramp the master gain to `value` over `rampSec` seconds.
   *
   * D-12: STUBBED NO-OP at Phase 50. No master GainNode is inserted into the
   * audio graph here — the existing per-cue mute fade (`applyMuteFadeOut` in
   * audioEngine.ts) remains the active mute mechanism (D-13). Phase 53 lands
   * the GainNode insertion AND the mute call-site swap together — paired with
   * the actual mute behavior change so the swap is verifiable as one unit.
   */
  setMasterGain(value: number, rampSec: number): void

  /**
   * Subscribe to suspend transitions. Returns an unsubscribe function.
   *
   * D-11: wired real in `createAudioSessionClock` via the audioCtx
   * `'statechange'` listener. Fires when the AC enters `'suspended'` OR
   * `'interrupted'` (the WebKit superset per Plan 06 D-37 / Phase 5.1).
   * `createWallSessionClock` returns a no-op unsubscribe (wall clock never
   * suspends).
   */
  onSuspend(cb: () => void): () => void

  /**
   * Subscribe to resume transitions. Returns an unsubscribe function.
   *
   * D-11: wired real in `createAudioSessionClock` via the audioCtx
   * `'statechange'` listener. Fires when the AC enters `'running'`.
   * `createWallSessionClock` returns a no-op unsubscribe (wall clock never
   * resumes — it never suspended).
   */
  onResume(cb: () => void): () => void

  /**
   * Subscribe to close transitions. Returns an unsubscribe function.
   *
   * Revision 1 Blocker #1: wired real in `createAudioSessionClock` via the
   * audioCtx `'statechange'` listener. Fires when the AC enters `'closed'`.
   * Preserves the byte-identical `setAudioStatus('unavailable')` setter at
   * `useAudioCues.ts:164-165` through the SessionClock seam (Phase 50 success
   * criterion #3 — Plan 50-04 wires `clock.onClose(() => setAudioStatus('unavailable'))`).
   * `createWallSessionClock` returns a no-op unsubscribe (wall clock never closes).
   */
  onClose(cb: () => void): () => void
}

/**
 * Wrap an existing AudioContext as a SessionClock.
 *
 * D-08: this factory WRAPS an AC, it never constructs one. The two production
 * call sites pass their own AC (HRV: inside `createAudioEngine`; NK: inside
 * `useNaviKriyaAudio.begin()`). User-gesture-chain semantics live at the AC
 * construction site (Phase 3 D-09), NOT here.
 *
 * Revision 1 Blocker #2: the optional `scheduleImpl` parameter is plumbed at
 * construction — when supplied (the engine's internal dispatch in Plan 50-06),
 * `schedule()` forwards to it; when absent, `schedule()` is a typed no-op.
 * This avoids the post-hoc readonly reassignment that the original plan called
 * for and that would violate the `readonly` semantics on the SessionClock
 * interface.
 *
 * Revision 2 Blocker #1: returns `SessionClock & { notifySuspended(): void }`.
 * The `notifySuspended` method is an ENGINE-ONLY escape hatch — it is NOT a
 * member of the public `SessionClock` interface. External consumers that import
 * `SessionClock` cannot see `notifySuspended`. Only the engine's internal
 * augmented-type reference inside `createAudioEngine` can call it.
 *
 * `notifySuspended()` fans the `'suspended'` event to `suspendSubscribers`
 * synchronously, as if the AC had fired a real statechange event. This is
 * required for the iOS Safari InvalidStateError recovery path
 * (audioEngine.ts L429-449 / Plan 06 D-38) where the AC was already
 * `'suspended'` before `resume()` was called, stays `'suspended'` after the
 * rejection, and no natural statechange event fires — without this escape
 * hatch the clock's listener cannot cover the case and Phase 50 success
 * criterion #3 (byte-identical end-user behavior) fails.
 */
export function createAudioSessionClock(
  audioCtx: AudioContext,
  scheduleImpl?: (when: number, cue: Cue) => void,
): SessionClock & { notifySuspended(): void } {
  // D-08: AC is wrapped, never constructed here. The user-gesture-chain
  // invariant (Phase 3 D-09) holds at the AC construction site (engine's
  // `createAudioEngine` / NK's `useNaviKriyaAudio.begin()`), not here.

  // FOUR subscriber Sets. Each fan-out path iterates its own Set in registration
  // order, mirroring the audioEngine.ts L249-256 ordering invariant.
  const suspendSubscribers = new Set<() => void>()
  const resumeSubscribers = new Set<() => void>()
  const closeSubscribers = new Set<() => void>()

  // Revision 2 Blocker #1: fanSuspend() is the single fan-out path. Called by
  // the statechange listener (natural AC transition) AND by notifySuspended()
  // (engine-only synthetic suspend for the iOS Safari InvalidStateError
  // recovery path). Both paths produce identical observable behavior — same
  // subscribers invoked synchronously in registration order. Factoring keeps
  // the fan-out logic in ONE place so there is no behavior drift between the
  // natural and synthetic suspend paths.
  function fanSuspend(): void {
    for (const cb of suspendSubscribers) cb()
  }

  function fanResume(): void {
    for (const cb of resumeSubscribers) cb()
  }

  function fanClose(): void {
    for (const cb of closeSubscribers) cb()
  }

  // D-11: single statechange listener fans transitions to the four Sets.
  // Mirrors audioEngine.ts L243-257 (the canonical statechange-listener
  // pattern in this repo). The widened type covers WebKit's 'interrupted'
  // superset (Plan 06 D-37 / Phase 5.1).
  audioCtx.addEventListener('statechange', () => {
    // eslint-disable-next-line @typescript-eslint/no-unnecessary-type-assertion
    const s = audioCtx.state as AudioContextState | 'interrupted'
    // Switch over the 4-variant union (AudioContextState 'suspended' | 'running' |
    // 'closed' plus WebKit's 'interrupted' superset per Plan 06 D-37 / Phase 5.1).
    // Each case fans to ONE Set; the default branch is intentionally empty.
    switch (s) {
      case 'suspended':
      case 'interrupted':
        fanSuspend()
        break
      case 'running':
        fanResume()
        break
      case 'closed':
        // Revision 1 Blocker #1: 'closed' fans to closeSubscribers. Preserves
        // the byte-identical setAudioStatus('unavailable') setter at
        // useAudioCues.ts:164-165 through the SessionClock seam.
        fanClose()
        break
    }
  })

  const clock: SessionClock & { notifySuspended(): void } = {
    now(): number {
      // D-01 + D-03 Option A (resolved 2026-05-27): the audio-backed clock reads
      // the AC's natural time. This makes useNaviKriyaAudio's
      // `clock.now() + SAFE_LEAD_SEC` byte-identical to its pre-refactor
      // `audioCtx.currentTime + SAFE_LEAD_SEC`. Phase 51's work is caller-level
      // rebase (useSessionEngine captures sessionStartCtxTime and computes
      // clock.now() − sessionStartCtxTime), NOT a swap of this body.
      //
      // Per D-09 / revision 1 Warning #5: this is the EXACTLY ONE
      // `audioCtx.currentTime` read inside createAudioSessionClock. The
      // drift-guard test (Plan 50-05) bans `audioCtx.currentTime` reads in the
      // 5 caller files, not inside the factory.
      return audioCtx.currentTime
    },

    schedule(when: number, cue: Cue): void {
      // Revision 1 Blocker #2: scheduleImpl is plumbed at construction (NOT
      // reassigned post-hoc — that would violate readonly on the interface).
      // The engine passes its internal dispatch fn at Plan 50-06; NK passes
      // undefined and schedule() is a no-op for that AC (NK uses per-cue
      // scheduler primitives directly at Phase 50; Phase 52 lookahead may
      // wire NK through schedule() later).
      if (scheduleImpl !== undefined) {
        scheduleImpl(when, cue)
      } else {
        // Typed no-op: explicit void to silence unused-parameter lints without
        // adding eslint disables here.
        void when
        void cue
      }
    },

    setMasterGain(value: number, rampSec: number): void {
      // D-12: stubbed no-op at Phase 50. Phase 53 lands the GainNode insertion
      // AND the mute call-site swap together. Body intentionally empty.
      void value
      void rampSec
    },

    onSuspend(cb: () => void): () => void {
      suspendSubscribers.add(cb)
      return (): void => {
        suspendSubscribers.delete(cb)
      }
    },

    onResume(cb: () => void): () => void {
      resumeSubscribers.add(cb)
      return (): void => {
        resumeSubscribers.delete(cb)
      }
    },

    onClose(cb: () => void): () => void {
      // Revision 1 Blocker #1 — preserves the byte-identical
      // setAudioStatus('unavailable') setter at useAudioCues.ts:164-165
      // through the SessionClock seam.
      closeSubscribers.add(cb)
      return (): void => {
        closeSubscribers.delete(cb)
      }
    },

    notifySuspended(): void {
      // Revision 2 Blocker #1 — Engine-only escape hatch. NOT a public
      // SessionClock member. Synchronously invokes all suspendSubscribers as
      // if the AC had fired a 'suspended' statechange event. Used by
      // audioEngine.ts L429-449 (Plan 06 D-38 iOS Safari InvalidStateError
      // recovery): when resume() rejects with InvalidStateError, the AC was
      // already 'suspended' before the call and stays 'suspended' after — no
      // natural statechange fires. The engine calls clock.notifySuspended()
      // (via its internal augmented-type reference) so external subscribers
      // see the 'suspended' transition synchronously.
      fanSuspend()
    },
  }

  return clock
}

/**
 * Synthesize a SessionClock backed by `performance.now() / 1000`.
 *
 * Used by `useAmbientScale` (the idle-state ambient rAF driver — has no
 * AudioContext to wrap; D-08 still holds because the factory doesn't construct
 * one either).
 *
 * D-11: onSuspend / onResume / onClose are no-op subscribers — the wall clock
 * has no suspend/resume/close signals.
 *
 * Revision 2 Blocker #1: the wall clock does NOT expose `notifySuspended`.
 * The only synthetic-suspend caller is the engine for the iOS Safari
 * InvalidStateError path; the wall clock has no equivalent failure mode. Return
 * type is plain `SessionClock`, not the augmented type.
 */
export function createWallSessionClock(): SessionClock {
  const clock: SessionClock = {
    now(): number {
      // Per D-09 / revision 1 Warning #5: this is the EXACTLY ONE
      // `performance.now` read inside createWallSessionClock. The drift-guard
      // test (Plan 50-05) bans `performance.now()` reads in the 5 caller files,
      // not inside the factory.
      return performance.now() / 1000
    },

    schedule(when: number, cue: Cue): void {
      // useAmbientScale only calls now(); schedule is on the surface for D-04
      // closed-catalog symmetry. The wall clock has no audio graph to write
      // into, so this is a typed no-op by design.
      void when
      void cue
    },

    setMasterGain(value: number, rampSec: number): void {
      // D-12: no audio graph here either — stays no-op.
      void value
      void rampSec
    },

    onSuspend(cb: () => void): () => void {
      // D-11: wall clock never suspends. Accept the callback per the interface
      // contract; return a no-op unsubscribe.
      void cb
      return (): void => undefined
    },

    onResume(cb: () => void): () => void {
      void cb
      return (): void => undefined
    },

    onClose(cb: () => void): () => void {
      void cb
      return (): void => undefined
    },
  }

  return clock
}
