import { useEffect, useState } from 'react'

const QUERY = '(prefers-reduced-motion: reduce)'

export function usePrefersReducedMotion(): boolean {
  const [reduced, setReduced] = useState<boolean>(() => {
    // Reason: defensive guard for environments where matchMedia may be absent (e.g., jsdom without polyfill); typed as always-defined by DOM lib but absent in some test hosts.
    // eslint-disable-next-line @typescript-eslint/no-unnecessary-condition
    if (!window.matchMedia) {
      return false
    }
    return window.matchMedia(QUERY).matches
  })

  useEffect(() => {
    // Reason: defensive guard for environments where matchMedia may be absent (e.g., jsdom without polyfill); typed as always-defined by DOM lib but absent in some test hosts.
    // eslint-disable-next-line @typescript-eslint/no-unnecessary-condition
    if (!window.matchMedia) {
      return
    }
    const mql = window.matchMedia(QUERY)
    // IN-02: re-seed from the live MediaQueryList in case the OS preference
    // changed between the initial render commit and this mount-effect (rare,
    // but the canonical pattern from MDN and the only way to defeat the stale
    // initial-state window for hooks that do not subscribe synchronously).
    // Reason: re-seed from live MediaQueryList on mount to close the stale-initial-state window; subsequent updates come from the change listener (MDN canonical pattern).
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setReduced(mql.matches)
    const onChange = (event: MediaQueryListEvent): void => {
      setReduced(event.matches)
    }
    mql.addEventListener('change', onChange)
    return () => {
      mql.removeEventListener('change', onChange)
    }
  }, [])

  return reduced
}
