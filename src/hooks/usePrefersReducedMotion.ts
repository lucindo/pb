import { useEffect, useState } from 'react'

const QUERY = '(prefers-reduced-motion: reduce)'

export function usePrefersReducedMotion(): boolean {
  const [reduced, setReduced] = useState<boolean>(() => {
    if (typeof window === 'undefined' || !window.matchMedia) {
      return false
    }
    return window.matchMedia(QUERY).matches
  })

  useEffect(() => {
    if (typeof window === 'undefined' || !window.matchMedia) {
      return
    }
    const mql = window.matchMedia(QUERY)
    // IN-02: re-seed from the live MediaQueryList in case the OS preference
    // changed between the initial render commit and this mount-effect (rare,
    // but the canonical pattern from MDN and the only way to defeat the stale
    // initial-state window for hooks that do not subscribe synchronously).
    setReduced(mql.matches)
    const onChange = (event: MediaQueryListEvent) => {
      setReduced(event.matches)
    }
    mql.addEventListener('change', onChange)
    return () => {
      mql.removeEventListener('change', onChange)
    }
  }, [])

  return reduced
}
