// React hook wrapping the Screen Wake Lock API (navigator.wakeLock).
// Structural shape mirrors useAudioCues.ts: imperative methods + refs + a
// single useEffect([]) that installs the visibilitychange listener and owns
// unmount cleanup.
//
// Internal state — exactly two refs:
//   sentinelRef    — the live WakeLockSentinel (null when not held)
//   wasAcquiredRef — true if the consumer has called request() and has NOT
//                    yet called release(). Stays true through OS-initiated
//                    releases (sentinel 'release' event) so the visibility
//                    re-acquire path can retry.
//
// Cleanup posture: the useEffect cleanup synchronously nulls sentinelRef BEFORE
// awaiting sentinel.release(), preventing a fast new request() arriving during
// the unmount window from seeing a half-released sentinel. Mirrors the
// synchronous-null-then-async-close pattern from useAudioCues.ts.

import { useCallback, useEffect, useRef } from 'react'

export interface UseWakeLock {
  /** Request a screen wake lock. Fire-and-forget (App.tsx uses void). Silently absorbs
   *  absent API and any rejection. Idempotent if already held. */
  request(this: void): Promise<void>
  /** Release the held wake lock. Idempotent — no-op when no sentinel is held. Clears
   *  wasAcquiredRef so visibility re-acquires stop firing. */
  release(this: void): Promise<void>
}

export function useWakeLock(): UseWakeLock {
  const sentinelRef = useRef<WakeLockSentinel | null>(null)
  const wasAcquiredRef = useRef<boolean>(false)
  const requestInFlightRef = useRef<boolean>(false)              // Concurrent-request gate.
  // Monotonic generation counter (mirror of reconstructGenerationRef in
  // useAudioCues). A request() → release() → request() sequence within a single
  // await window cannot be expressed by a single discard boolean — the boolean
  // could be cleared by the wrong request, leaving wasAcquiredRef leaked `true`
  // with no live sentinel. The counter is stamped at the top of request(),
  // re-checked post-await, and bumped in release() and unmount cleanup; a stamp
  // mismatch means a release()/unmount/newer-request ran during the await, so the
  // freshly-acquired sentinel is discarded and no state is mutated.
  const requestGenerationRef = useRef<number>(0)

  const request = useCallback(async (): Promise<void> => {
    // Silent fallback when API absent (non-optional in types but actually undefined
    // on iOS <16.4 / Firefox <126 / insecure contexts)
    if (!('wakeLock' in navigator)) return
    // Idempotent — skip if already holding a fresh sentinel
    if (sentinelRef.current !== null) return
    // Second concurrent caller no-ops while first await is pending.
    if (requestInFlightRef.current) return
    // Stamp this request's generation token before the await.
    const gen = requestGenerationRef.current
    try {
      requestInFlightRef.current = true
      const sentinel = await navigator.wakeLock.request('screen')
      // release()/unmount/a newer request ran during the await; discard the
      // freshly-acquired sentinel and leave all state untouched.
      if (gen !== requestGenerationRef.current) {
        void sentinel.release().catch(() => undefined)
        return
      }
      sentinelRef.current = sentinel
      wasAcquiredRef.current = true
      // Sentinel's own 'release' event is the canonical "lock is gone" signal.
      // Fires on OS-initiated release (tab hidden) AND manual release.
      // Match-pair guard: only clear sentinelRef if it still points to THIS
      // sentinel. Belt-and-braces against a stale listener from a prior cycle
      // clobbering a freshly-acquired ref.
      sentinel.addEventListener('release', () => {
        if (sentinelRef.current === sentinel) {
          sentinelRef.current = null
          // Do NOT clear wasAcquiredRef — keep it true so visibilitychange re-acquires fire.
        }
      }, { once: true })
    } catch {
      // Silently absorb NotAllowedError, SecurityError (insecure context),
      // and synchronous throws from older stubs. Bare catch — no err.name branching.
    } finally {
      requestInFlightRef.current = false
    }
  }, [])

  const release = useCallback(async (): Promise<void> => {
    // Bump the generation counter so any in-flight request() discards its sentinel
    // post-await. Always bumped (not gated on requestInFlightRef) so a request()
    // that starts and resolves entirely between two release() calls still observes
    // a stamp mismatch.
    requestGenerationRef.current += 1
    // Synchronous-null-then-async-close mirrors useAudioCues.stop().
    // wasAcquiredRef cleared synchronously to halt visibility re-acquires.
    wasAcquiredRef.current = false
    const sentinel = sentinelRef.current
    sentinelRef.current = null
    if (sentinel !== null) {
      try {
        await sentinel.release()
      } catch {
        // Best-effort release — silently absorb rejection.
      }
    }
  }, [])

  useEffect(() => {
    const onVisibility = () => {
      // Order-independent guards (release listener and visibilitychange listener fire
      // in browser-dependent order on tab-hide; the three-clause guard works regardless):
      if (document.visibilityState !== 'visible') return
      if (!wasAcquiredRef.current) return // Re-acquire gate — cleared by release()
      if (sentinelRef.current !== null) return // already re-acquired
      void request() // Failure inside is silently absorbed by request()'s catch
    }
    document.addEventListener('visibilitychange', onVisibility)
    return () => {
      document.removeEventListener('visibilitychange', onVisibility)
      // Unmount-during-await orphans the in-flight sentinel; bump the generation
      // counter so request() discards it post-await. The ref is a monotonic
      // counter that is only ever mutated, never captured for later reads — the
      // stale-ref warning does not apply here.
      requestGenerationRef.current += 1
      // Unmount-cleanup race against in-flight request(): synchronously null the
      // sentinel ref BEFORE the await on release() so a fast new request() arriving
      // during the unmount window doesn't see a half-released sentinel.
      const sentinel = sentinelRef.current
      sentinelRef.current = null
      wasAcquiredRef.current = false
      if (sentinel !== null) {
        void sentinel.release().catch(() => {}) // Best-effort teardown.
      }
    }
  }, [request])

  return { request, release }
}
