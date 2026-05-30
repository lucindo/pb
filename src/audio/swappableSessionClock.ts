// swappableSessionClock — stable-identity SessionClock proxy with a swappable
// internal source. Zero React imports.
//
// Owns:
//   - The swappable source closure (`currentSource: SessionClock`), starting
//     from `initialSource` at factory call time.
//   - Three proxy subscriber Sets (one per channel):
//       proxySuspendSubs, proxyResumeSubs, proxyCloseSubs.
//   - Three per-channel unsub trackers (Map<cb, unsub-from-current-source>):
//       suspendUnsubMap, resumeUnsubMap, closeUnsubMap.
//     Key = the proxy-registered cb; value = the `() => void` returned by the
//     CURRENT source's `on{Channel}(cb)`. Swapping the source iterates the Maps
//     and re-subscribes every existing callback on the new source.
//
// Invariants:
//   - Proxy identity: the returned `clock` object is captured ONCE at factory-call
//     time. `setSource` never rebuilds `clock` — the same `===` reference is
//     returned to every consumer for the lifetime of the proxy. Engine hooks hold
//     `clock` in dep arrays; swapping the source does NOT cause a re-render.
//   - Subscription survival: callbacks registered via `onSuspend`, `onResume`, and
//     `onClose` survive a source swap. `setSource` tears down the old source's
//     subscriptions and re-subscribes all existing callbacks against the new source
//     so no iOS-recovery subscription is silently dropped.
//   - No proxy-introduced Set growth: `setSource` tears down the OLD source's
//     subscription for each callback BEFORE re-subscribing against the new source
//     (bounded Set growth).
//   - The engine-only `notifySuspended` escape hatch is NOT exposed on the proxy.
//     The proxy's return type is plain `{ clock: SessionClock; setSource(...): void }`.
//
// Zero React imports.

import type { Cue, SessionClock } from './sessionClock'

/**
 * Factory return type. `clock` is the stable public `SessionClock` reference;
 * `setSource` is the internal hook used by the owning audio hook to swap the
 * underlying time source (wall → audio AC clock) without changing the
 * externally visible `clock` identity.
 *
 * `clock` reference NEVER changes across `setSource` calls.
 */
export type SwappableSessionClock = {
  clock: SessionClock
  setSource(next: SessionClock): void
}

/**
 * Create a stable-identity `SessionClock` proxy whose internal source can be
 * swapped via `setSource(next)` without changing the externally-visible `clock`
 * reference.
 *
 * Proxy identity: the same `clock` object (`===`) is returned to consumers for
 * the lifetime of the proxy. Engine hooks hold `clock` in dep arrays; swapping
 * the source does NOT cause a re-render or rAF loop restart.
 *
 * Subscription survival: callbacks registered via `clock.onSuspend`,
 * `clock.onResume`, and `clock.onClose` are re-forwarded to every future source
 * on `setSource`. The proxy maintains its own subscriber Sets and three
 * per-channel unsub-tracker Maps so existing subscriptions automatically follow
 * the source across swaps.
 *
 * @param initialSource - The `SessionClock` instance the proxy delegates to at
 *   construction time (typically a `createWallSessionClock()` instance used
 *   before an AudioContext is constructed).
 */
export function createSwappableSessionClock(
  initialSource: SessionClock,
): SwappableSessionClock {
  // The single mutable source pointer. All six clock members delegate through
  // this reference so delegating to a new source is a single assignment.
  let currentSource: SessionClock = initialSource

  // Three proxy subscriber Sets — one per lifecycle channel. These are the
  // PROXY-owned collections; the per-source subscription is tracked separately
  // in the Maps below. The Sets hold the callbacks that external consumers
  // registered against `clock.on{Channel}(cb)`.
  const proxySuspendSubs = new Set<() => void>()
  const proxyResumeSubs = new Set<() => void>()
  const proxyCloseSubs = new Set<() => void>()

  // Three per-channel unsub-tracker Maps.
  // Key = proxy-registered cb (the same function the external consumer holds).
  // Value = the `() => void` returned by the CURRENT source's `on{Channel}(cb)`.
  // On `setSource(next)`: iterate each Map, call the old unsub (value), then
  // call `next.on{Channel}(key)` and store the new unsub as the value.
  const suspendUnsubMap = new Map<() => void, () => void>()
  const resumeUnsubMap = new Map<() => void, () => void>()
  const closeUnsubMap = new Map<() => void, () => void>()

  // Helper: re-subscribe all callbacks in a proxy Set (and their unsub-tracker Map)
  // against `next`. Tears down the old source subscription first (bounded Set growth
  // invariant), then re-subscribes on the new source.
  function resubscribeChannel(
    proxySubs: Set<() => void>,
    unsubMap: Map<() => void, () => void>,
    subscribeOnNext: (cb: () => void) => () => void,
  ): void {
    for (const cb of proxySubs) {
      // (i) Tear down old source subscription.
      const oldUnsub = unsubMap.get(cb)
      if (oldUnsub !== undefined) oldUnsub()
      // (ii) Subscribe against the new source and store the new unsub.
      const newUnsub = subscribeOnNext(cb)
      unsubMap.set(cb, newUnsub)
    }
  }

  // The stable proxy clock object. Built ONCE at factory-call time; NEVER rebuilt
  // by setSource (proxy identity invariant).
  const clock: SessionClock = {
    /**
     * Returns the CURRENT source's `now()` value.
     *
     * Delegates to whichever source is current at call time.
     * Before `setSource` is called, this returns the initial source's `now()`.
     * After `setSource(audioBackedClock)`, it returns the audio clock's currentTime.
     */
    now(): number {
      return currentSource.now()
    },

    /**
     * Forward `schedule(when, cue)` to the CURRENT source.
     *
     * After `setSource(audioBackedClock)`, cues are scheduled against the audio
     * clock's scheduler. Before the swap, delegates to the initial source
     * (typically a no-op wall clock).
     */
    schedule(when: number, cue: Cue): void {
      currentSource.schedule(when, cue)
    },

    /**
     * Subscribe `cb` to suspend transitions.
     *
     * Registers `cb` in the proxy's `proxySuspendSubs` Set AND against the CURRENT
     * source. On future `setSource` calls, `cb` is automatically re-forwarded to the
     * new source. Returns an idempotent unsubscribe function that removes `cb` from
     * the proxy Set and tears down the latest underlying source subscription.
     */
    onSuspend(cb: () => void): () => void {
      proxySuspendSubs.add(cb)
      const unsub = currentSource.onSuspend(cb)
      suspendUnsubMap.set(cb, unsub)

      let removed = false
      return (): void => {
        if (removed) return
        removed = true
        proxySuspendSubs.delete(cb)
        const latestUnsub = suspendUnsubMap.get(cb)
        if (latestUnsub !== undefined) latestUnsub()
        suspendUnsubMap.delete(cb)
      }
    },

    /**
     * Subscribe `cb` to resume transitions.
     *
     * Same subscription-survival shape as `onSuspend`. Returns an idempotent
     * unsubscribe function.
     */
    onResume(cb: () => void): () => void {
      proxyResumeSubs.add(cb)
      const unsub = currentSource.onResume(cb)
      resumeUnsubMap.set(cb, unsub)

      let removed = false
      return (): void => {
        if (removed) return
        removed = true
        proxyResumeSubs.delete(cb)
        const latestUnsub = resumeUnsubMap.get(cb)
        if (latestUnsub !== undefined) latestUnsub()
        resumeUnsubMap.delete(cb)
      }
    },

    /**
     * Subscribe `cb` to close transitions.
     *
     * Same subscription-survival shape as `onSuspend`. Returns an idempotent
     * unsubscribe function.
     *
     * The close subscriber is the mechanism through which useAudioCues sets audio
     * status to `'unavailable'`. The proxy forwards it to the current (and future)
     * source so the `setAudioStatus('unavailable')` call survives an engine swap.
     */
    onClose(cb: () => void): () => void {
      proxyCloseSubs.add(cb)
      const unsub = currentSource.onClose(cb)
      closeUnsubMap.set(cb, unsub)

      let removed = false
      return (): void => {
        if (removed) return
        removed = true
        proxyCloseSubs.delete(cb)
        const latestUnsub = closeUnsubMap.get(cb)
        if (latestUnsub !== undefined) latestUnsub()
        closeUnsubMap.delete(cb)
      }
    },
  }

  /**
   * Swap the internal source to `next`.
   *
   * `clock` identity is UNCHANGED — only `currentSource` is updated.
   * Every existing proxy subscriber is re-forwarded to `next`. Old source
   * subscriptions are torn down before new ones are registered (bounded Set growth).
   * Tear-down-then-subscribe ordering ensures underlying Sets shrink before growing
   * (no observer-count growth across swaps).
   *
   * @param next - The new `SessionClock` instance to delegate to.
   */
  function setSource(next: SessionClock): void {
    // Update the source pointer AFTER re-subscribe so that any `now()` calls
    // inside the subscribe callbacks see the new source (edge case: unlikely,
    // but safer ordering). Note: we read `next.*` not `currentSource.*` in
    // resubscribeChannel, so the pointer update can safely happen last.
    resubscribeChannel(proxySuspendSubs, suspendUnsubMap, (cb) => next.onSuspend(cb))
    resubscribeChannel(proxyResumeSubs, resumeUnsubMap, (cb) => next.onResume(cb))
    resubscribeChannel(proxyCloseSubs, closeUnsubMap, (cb) => next.onClose(cb))
    currentSource = next
  }

  return { clock, setSource }
}
