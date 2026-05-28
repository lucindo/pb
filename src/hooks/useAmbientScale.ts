import { useEffect, useState } from 'react'

import type { SessionClock } from '../audio/sessionClock'
import { MIN_SCALE, MAX_SCALE, MID_SCALE } from '../components/shapeConstants'
import { usePrefersReducedMotion } from './usePrefersReducedMotion'

// 11-second cycle (≈ 5.5 BPM) split 40:60 inhale:exhale — same total breath
// length as the spike's PHASE_MS = 5500 each-way (index.html L569) but biased
// toward the longer exhale, so the idle ambient breath mirrors the HRV
// resonant default rather than feeling like a metronome.
//
// Phase 50 D-02: seconds-shaped (was ms-shaped 4400 / 6600 pre-refactor). The
// rAF body math is in seconds end-to-end, matching the SessionClock contract
// (D-01 audio-natural seconds).
const INHALE_SEC = 4.4 // 11.0 × 0.40
const EXHALE_SEC = 6.6 // 11.0 × 0.60

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
 *  stale state value is never observed.
 *
 *  Phase 50 D-07: `wallClock` is the seconds-shaped time source for the INITIAL
 *  `start` capture. Per-tick time inside the rAF callback uses the rAF
 *  DOMHighResTimeStamp directly (preserved per revision 1 Warning #8 for
 *  byte-identicality — the rAF timestamp is the canonical per-frame time and
 *  reading the clock at the top of each tick would introduce sub-frame
 *  divergence). Callers (OrbShape) construct a stable wall clock via
 *  `createWallSessionClock()` and thread it through a `useMemo` so the
 *  effect's dep array sees a stable identity. D-09: this hook MUST NOT make
 *  direct calls into `performance` time APIs — the only seconds-shaped time
 *  source for the initial start is the injected clock. */
export function useAmbientScale(active: boolean, wallClock: SessionClock): number {
  const reducedMotion = usePrefersReducedMotion()
  const animated = active && !reducedMotion
  const [scale, setScale] = useState(MID_SCALE)

  useEffect(() => {
    if (!animated) return
    let phase: 'in' | 'out' = 'in'
    let start = wallClock.now()
    let raf = 0
    let cancelled = false
    const tick = (now: number) => {
      if (cancelled) return
      // Revision 1 Warning #8: rAF DOMHighResTimeStamp arrives in ms; convert
      // at the boundary to seconds so the per-tick math is unit-consistent
      // with `start` (seeded from the injected clock in seconds). The rAF
      // timestamp is the canonical per-frame time source — preserving it
      // keeps the oscillation curve byte-identical to the pre-refactor
      // version (which used `now` directly in ms-shaped arithmetic).
      const nowSec = now / 1000
      const phaseSec = phase === 'in' ? INHALE_SEC : EXHALE_SEC
      const elapsed = nowSec - start
      if (elapsed >= phaseSec) {
        start = nowSec - (elapsed - phaseSec)
        phase = phase === 'in' ? 'out' : 'in'
      }
      const currentPhaseSec = phase === 'in' ? INHALE_SEC : EXHALE_SEC
      const t = easeInOutSine((nowSec - start) / currentPhaseSec)
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
  }, [animated, wallClock])

  return animated ? scale : MID_SCALE
}
