// SessionClock — typed interface around the two time sources (the engine's
// AudioContext clock and the wall clock). Zero React imports.
//
// Owns:
//   - The single clock source closure for now() (audio-natural seconds).
//   - THREE subscriber Sets in createAudioSessionClock: suspendSubscribers,
//     resumeSubscribers, closeSubscribers.
//
// Invariants:
//   - createAudioSessionClock ACCEPTS an AudioContext; it NEVER constructs one.
//     The sole production call site (createAudioEngine) passes the engine's AC.
//   - onSuspend / onResume / onClose fan out real AudioContext statechange
//     transitions. createWallSessionClock exposes them as no-op subscribers
//     (wall clock never suspends/resumes/closes).
//   - Master-gain mute lives entirely in the engine (a single GainNode it owns).
//     The clock has no setMasterGain surface.
//   - onClose preserves the `setAudioStatus('unavailable')` call in useAudioCues
//     through the SessionClock seam.
//   - scheduleImpl is plumbed at construction (NOT reassigned post-hoc — that
//     would violate the readonly contract on the interface). The engine passes
//     its internal dispatch fn.
//   - notifySuspended is the engine-only synthetic-suspend escape hatch on the
//     augmented factory return type (SessionClock & { notifySuspended(): void }).
//     It is NOT a public SessionClock interface member. Only the engine's
//     internal augmented-type reference inside createAudioEngine can call it.
//     External consumers see only the read-only interface and cannot reach
//     notifySuspended.

/**
 * Closed catalog of cue kinds the engine and any lookahead scheduler can dispatch.
 *
 * The catalog is closed — adding a new kind is an interface change visible to
 * every scheduler. The `'in'` and `'out'` variants carry `phaseDurationSec`
 * because the per-cue builders need it; timbre is NOT a cue field — the engine
 * resolves it from its closed-over `sessionTimbre` at dispatch time.
 */
export type Cue =
  | { kind: 'in'; phaseDurationSec: number }
  | { kind: 'out'; phaseDurationSec: number }
  | { kind: 'lead-in-tick' }
  | { kind: 'end-chord' }

/**
 * SessionClock — typed read-only interface with EXACTLY 5 members.
 *
 * This is the PUBLIC contract that every external consumer sees. The engine-only
 * `notifySuspended()` escape hatch is NOT a member here — it is surfaced on the
 * augmented factory return type and is inaccessible to anything typed as
 * `SessionClock`.
 */
export interface SessionClock {
  /**
   * Current clock value in seconds (float, audio-natural — matches
   * `audioCtx.currentTime` convention).
   *
   * `createAudioSessionClock.now()` returns `audioCtx.currentTime`.
   * `createWallSessionClock.now()` returns `performance.now() / 1000`.
   */
  now(): number

  /**
   * Dispatch entry. `when` is seconds-shaped on the same time-base as `now()`;
   * `cue` is the closed discriminated union catalog above.
   *
   * The catalog is closed. `createAudioSessionClock` forwards to the engine's
   * internal dispatch (`scheduleImpl`). The wall factory's schedule() is always
   * a no-op (wall-clock callers only call now()).
   */
  schedule(when: number, cue: Cue): void

  /**
   * Subscribe to suspend transitions. Returns an unsubscribe function.
   *
   * Wired real in `createAudioSessionClock` via the audioCtx `'statechange'`
   * listener. Fires when the AC enters `'suspended'` OR `'interrupted'` (the
   * WebKit-only extension for iOS lock-screen auto-suspend).
   * `createWallSessionClock` returns a no-op unsubscribe (wall clock never
   * suspends).
   */
  onSuspend(cb: () => void): () => void

  /**
   * Subscribe to resume transitions. Returns an unsubscribe function.
   *
   * Wired real in `createAudioSessionClock` via the audioCtx `'statechange'`
   * listener. Fires when the AC enters `'running'`. `createWallSessionClock`
   * returns a no-op unsubscribe (wall clock never resumes — it never suspended).
   */
  onResume(cb: () => void): () => void

  /**
   * Subscribe to close transitions. Returns an unsubscribe function.
   *
   * Wired real in `createAudioSessionClock` via the audioCtx `'statechange'`
   * listener. Fires when the AC enters `'closed'`. This is the mechanism through
   * which useAudioCues calls `setAudioStatus('unavailable')` on AC close.
   * `createWallSessionClock` returns a no-op unsubscribe (wall clock never closes).
   */
  onClose(cb: () => void): () => void
}

/**
 * Wrap an existing AudioContext as a SessionClock.
 *
 * This factory WRAPS an AC, it never constructs one. The sole production call
 * site (`createAudioEngine`) passes the engine's AC. User-gesture-chain
 * semantics live at the AC construction site, NOT here.
 *
 * `scheduleImpl` is plumbed at construction — `schedule()` forwards to it. It is
 * passed at construction (NOT reassigned post-hoc), which avoids a readonly
 * reassignment that would violate the `readonly` semantics on the interface.
 *
 * Returns `SessionClock & { notifySuspended(): void }`. The `notifySuspended`
 * method is an ENGINE-ONLY escape hatch — it is NOT a member of the public
 * `SessionClock` interface. Only the engine's internal augmented-type reference
 * inside `createAudioEngine` can call it.
 *
 * `notifySuspended()` fans the `'suspended'` event to `suspendSubscribers`
 * synchronously, as if the AC had fired a real statechange event. This is
 * required for the iOS Safari InvalidStateError recovery path where the AC was
 * already `'suspended'` before `resume()` was called, stays `'suspended'` after
 * the rejection, and no natural statechange event fires — without this escape
 * hatch the subscriber cannot see the transition.
 */
export function createAudioSessionClock(
  audioCtx: AudioContext,
  scheduleImpl: (when: number, cue: Cue) => void,
): SessionClock & { notifySuspended(): void } {
  // AC is wrapped, never constructed here. User-gesture-chain semantics hold at
  // the AC construction site, not here.

  // Three subscriber Sets. Each fan-out path iterates its own Set in registration order.
  const suspendSubscribers = new Set<() => void>()
  const resumeSubscribers = new Set<() => void>()
  const closeSubscribers = new Set<() => void>()

  // fanSuspend() is the single fan-out path. Called by the statechange listener
  // (natural AC transition) AND by notifySuspended() (engine-only synthetic
  // suspend for the iOS Safari InvalidStateError recovery path). Both paths
  // invoke subscribers synchronously in registration order — factoring keeps
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

  // Single statechange listener fans transitions to the three Sets.
  // The widened type covers WebKit's 'interrupted' extension (iOS Safari).
  audioCtx.addEventListener('statechange', () => {
    // eslint-disable-next-line @typescript-eslint/no-unnecessary-type-assertion
    const s = audioCtx.state as AudioContextState | 'interrupted'
    // Switch over the 4-variant union (AudioContextState 'suspended' | 'running' |
    // 'closed' plus WebKit's 'interrupted' extension for iOS lock-screen auto-suspend).
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
        // 'closed' fans to closeSubscribers — triggers setAudioStatus('unavailable')
        // in useAudioCues through the SessionClock seam.
        fanClose()
        break
    }
  })

  const clock: SessionClock & { notifySuspended(): void } = {
    now(): number {
      // The one audioCtx.currentTime read the drift-guard test allows (it bans
      // the read in the 5 caller files, not inside the factory).
      return audioCtx.currentTime
    },

    schedule(when: number, cue: Cue): void {
      scheduleImpl(when, cue)
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
      // Preserves the setAudioStatus('unavailable') call in useAudioCues through
      // the SessionClock seam.
      closeSubscribers.add(cb)
      return (): void => {
        closeSubscribers.delete(cb)
      }
    },

    notifySuspended(): void {
      // See the factory doc above — synthetic 'suspended' fan-out for the iOS
      // resume() InvalidStateError path, where no natural statechange fires.
      fanSuspend()
    },
  }

  return clock
}

/**
 * Synthesize a SessionClock backed by `performance.now() / 1000`.
 *
 * Used where a SessionClock is needed without an AudioContext to wrap (the
 * factory doesn't construct one either) — e.g. the audio-cue swappable clock's
 * initial source before the AudioContext exists.
 *
 * onSuspend / onResume / onClose are no-op subscribers — the wall clock has no
 * suspend/resume/close signals. Return type is plain `SessionClock` (no
 * `notifySuspended` — the wall clock has no equivalent failure mode).
 */
export function createWallSessionClock(): SessionClock {
  const clock: SessionClock = {
    now(): number {
      // The one performance.now() read the drift-guard test allows (it bans the
      // read in the 5 caller files, not inside the factory).
      return performance.now() / 1000
    },

    schedule(when: number, cue: Cue): void {
      // Wall-clock callers only call now(); schedule is on the surface for
      // closed-catalog symmetry. The wall clock has no audio graph to write
      // into, so this is a typed no-op by design.
      void when
      void cue
    },

    onSuspend(cb: () => void): () => void {
      // Wall clock never suspends. Accept the callback per the interface contract;
      // return a no-op unsubscribe.
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
