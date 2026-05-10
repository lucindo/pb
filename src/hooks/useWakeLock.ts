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
//                    re-acquire path (D-03/D-05) can retry.
//
// Cleanup posture (Pitfall 6): the useEffect cleanup synchronously nulls
// sentinelRef BEFORE awaiting sentinel.release(), preventing a fast new
// request() arriving during the unmount window from seeing a half-released
// sentinel. Mirrors the synchronous-null-then-async-close pattern from
// useAudioCues.ts:123-135.

import { useCallback, useEffect, useRef } from 'react'

export interface UseWakeLock {
  /** Request a screen wake lock. Fire-and-forget per D-02 (App.tsx uses void). Silently absorbs
   *  absent API (D-09) and any rejection. Idempotent if already held (D-08). */
  request(): Promise<void>
  /** Release the held wake lock. Idempotent — no-op when no sentinel is held (D-08). Clears
   *  wasAcquiredRef so visibility re-acquires stop firing (D-04 inverse). */
  release(): Promise<void>
}

export function useWakeLock(): UseWakeLock {
  const sentinelRef = useRef<WakeLockSentinel | null>(null)
  const wasAcquiredRef = useRef<boolean>(false)

  const request = useCallback(async (): Promise<void> => {
    // D-09: silent fallback when API absent (RESEARCH Pitfall 4 — non-optional in types
    // but actually undefined on iOS <16.4 / Firefox <126 / insecure contexts)
    if (!('wakeLock' in navigator)) return
    // D-08: idempotent — skip if already holding a fresh sentinel
    if (sentinelRef.current !== null) return
    try {
      const sentinel = await navigator.wakeLock.request('screen')
      sentinelRef.current = sentinel
      wasAcquiredRef.current = true
      // Sentinel's own 'release' event is the canonical "lock is gone" signal.
      // Fires on OS-initiated release (tab hidden) AND manual release.
      // Match-pair guard (RESEARCH Anti-pattern 4 / Pitfall 1 / A2): only clear
      // sentinelRef if it still points to THIS sentinel. Belt-and-braces against
      // a stale listener from a prior cycle clobbering a freshly-acquired ref.
      sentinel.addEventListener('release', () => {
        if (sentinelRef.current === sentinel) {
          sentinelRef.current = null
          // Do NOT clear wasAcquiredRef — D-04 keeps it true for visibilitychange re-acquire.
        }
      })
    } catch {
      // D-09: silently absorb NotAllowedError, SecurityError (insecure context),
      // synchronous throws from older stubs. Bare catch — no err.name branching
      // (RESEARCH Pitfall 3 / Anti-pattern "Re-implementing rejection codes").
    }
  }, [])

  const release = useCallback(async (): Promise<void> => {
    // Synchronous-null-then-async-close mirrors useAudioCues.stop() (useAudioCues.ts:123-135).
    // wasAcquiredRef cleared synchronously to halt visibility re-acquires (D-04 inverse).
    wasAcquiredRef.current = false
    const sentinel = sentinelRef.current
    sentinelRef.current = null
    if (sentinel !== null) {
      try {
        await sentinel.release()
      } catch {
        // D-09
      }
    }
  }, [])

  useEffect(() => {
    const onVisibility = () => {
      // Order-independent guards (RESEARCH Pitfall 2 — release listener and visibilitychange
      // listener fire in browser-dependent order on tab-hide; the three-clause guard works
      // regardless):
      if (document.visibilityState !== 'visible') return
      if (!wasAcquiredRef.current) return // D-04 gate
      if (sentinelRef.current !== null) return // already re-acquired
      void request() // D-05: failure inside is silently absorbed by request()'s catch
    }
    document.addEventListener('visibilitychange', onVisibility)
    return () => {
      document.removeEventListener('visibilitychange', onVisibility)
      // Pitfall 6: unmount-cleanup race against in-flight request(). Synchronously
      // null the sentinel ref BEFORE the await on release() so a fast new request()
      // arriving during the unmount window doesn't see a half-released sentinel.
      const sentinel = sentinelRef.current
      sentinelRef.current = null
      wasAcquiredRef.current = false
      if (sentinel !== null) {
        void sentinel.release().catch(() => {}) // D-09
      }
    }
  }, [request])

  return { request, release }
}
