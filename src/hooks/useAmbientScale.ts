import { useEffect, useState } from 'react'

import { MIN_SCALE, MAX_SCALE, MID_SCALE } from '../components/shapeConstants'
import { usePrefersReducedMotion } from './usePrefersReducedMotion'

// 11-second cycle (≈ 5.5 BPM) split 40:60 inhale:exhale — same total breath
// length as the spike's PHASE_MS = 5500 each-way (index.html L569) but biased
// toward the longer exhale, so the idle ambient breath mirrors the HRV
// resonant default rather than feeling like a metronome.
const INHALE_MS = 4400 // 11_000 × 0.40
const EXHALE_MS = 6600 // 11_000 × 0.60

function easeInOutSine(t: number): number {
  return 0.5 - 0.5 * Math.cos(Math.PI * Math.max(0, Math.min(1, t)))
}

/** Drives an idle ambient breath: returns a scale value oscillating between
 *  MIN_SCALE and MAX_SCALE on an 11-s cycle split 40:60 inhale:exhale.
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
    let cancelled = false
    const tick = (now: number) => {
      if (cancelled) return
      const phaseMs = phase === 'in' ? INHALE_MS : EXHALE_MS
      const elapsed = now - start
      if (elapsed >= phaseMs) {
        start = now - (elapsed - phaseMs)
        phase = phase === 'in' ? 'out' : 'in'
      }
      const currentPhaseMs = phase === 'in' ? INHALE_MS : EXHALE_MS
      const t = easeInOutSine((now - start) / currentPhaseMs)
      const next =
        phase === 'in'
          ? MIN_SCALE + (MAX_SCALE - MIN_SCALE) * t
          : MAX_SCALE - (MAX_SCALE - MIN_SCALE) * t
      setScale(next)
      raf = requestAnimationFrame(tick)
    }
    raf = requestAnimationFrame(tick)
    return () => {
      cancelled = true
      cancelAnimationFrame(raf)
    }
  }, [animated])

  return animated ? scale : MID_SCALE
}
