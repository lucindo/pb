import { useEffect, useState } from 'react'

import { MIN_SCALE, MAX_SCALE, MID_SCALE } from '../components/shapeConstants'
import { usePrefersReducedMotion } from './usePrefersReducedMotion'

// 5.5 s per phase → 11 s per full breath cycle (≈ 5.5 BPM). Matches spike
// 010/index.html line 569 (PHASE_MS = 5500). Idle ambient is intentionally a
// fixed generic pace, not coupled to the user's session BPM — it's a resting
// pulse for the unstarted state, not a personalized practice.
const PHASE_MS = 5500

function easeInOutSine(t: number): number {
  return 0.5 - 0.5 * Math.cos(Math.PI * Math.max(0, Math.min(1, t)))
}

/** Drives an idle ambient breath: returns a scale value oscillating between
 *  MIN_SCALE and MAX_SCALE on a 5.5-s phase clock.
 *  - inactive (`active=false`): MID_SCALE static (no rAF subscription)
 *  - reduced motion: MID_SCALE static (no rAF subscription)
 *  - otherwise: rAF-ticked scale, ~60 Hz setState (matches sessionEngine's
 *    live-frame rerender cadence).
 *  The inactive/reduced-motion branches return MID_SCALE directly without
 *  resetting state — when transitioning out of an active run the rAF cleanup
 *  stops the ticker and the return-side short-circuit takes over, so the
 *  stale state value is never observed. */
export function useAmbientScale(active: boolean): number {
  const reducedMotion = usePrefersReducedMotion()
  const animated = active && !reducedMotion
  const [scale, setScale] = useState(MID_SCALE)

  useEffect(() => {
    if (!animated) return
    let phase: 'in' | 'out' = 'in'
    let start = performance.now()
    let raf = 0
    const tick = (now: number) => {
      const elapsed = now - start
      if (elapsed >= PHASE_MS) {
        start = now - (elapsed - PHASE_MS)
        phase = phase === 'in' ? 'out' : 'in'
      }
      const t = easeInOutSine((now - start) / PHASE_MS)
      const next =
        phase === 'in'
          ? MIN_SCALE + (MAX_SCALE - MIN_SCALE) * t
          : MAX_SCALE - (MAX_SCALE - MIN_SCALE) * t
      setScale(next)
      raf = requestAnimationFrame(tick)
    }
    raf = requestAnimationFrame(tick)
    return () => {
      cancelAnimationFrame(raf)
    }
  }, [animated])

  return animated ? scale : MID_SCALE
}
