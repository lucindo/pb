import type { CSSProperties } from 'react'

import type { SessionFrame } from '../domain/sessionMath'
import { usePrefersReducedMotion } from '../hooks/usePrefersReducedMotion'

export interface BreathingShapeProps {
  frame: SessionFrame | null
}

// IN-01: keep these in sync with the matching tokens in `src/styles/theme.css`
// (`--orb-scale-min`, `--orb-scale-max`, `--orb-scale-mid`). The TS constants
// drive the breathing math here; the CSS tokens are exposed for stylesheet
// consumers (e.g. the inline `transform: scale(var(--orb-scale-mid))` fallback
// path under reduced-motion). If you edit one side, edit the other.
const MIN_SCALE = 0.58 // keep in sync with --orb-scale-min
const MAX_SCALE = 1.0 // keep in sync with --orb-scale-max
const MID_SCALE = (MIN_SCALE + MAX_SCALE) / 2 // 0.79 — D-06 reduced-motion fixed size; keep in sync with --orb-scale-mid

export function BreathingShape({ frame }: BreathingShapeProps) {
  const reducedMotion = usePrefersReducedMotion()
  if (frame === null) {
    return null
  }

  const progress = Math.min(1, Math.max(0, frame.phaseProgress))
  const liveScale =
    frame.phase === 'in'
      ? MIN_SCALE + progress * (MAX_SCALE - MIN_SCALE)
      : MAX_SCALE - progress * (MAX_SCALE - MIN_SCALE)
  const orbScale = reducedMotion ? MID_SCALE : liveScale

  return (
    <div
      role="img"
      aria-label={`Breathing shape: ${frame.phaseLabel}`}
      data-phase={frame.phase}
      data-progress={progress.toFixed(3)}
      className="relative mx-auto my-12 grid place-items-center"
      style={{
        width: 'var(--orb-size)',
        height: 'var(--orb-size)',
      } as CSSProperties}
    >
      {/* D-04: outer reference ring at MAX_SCALE boundary */}
      <span
        aria-hidden="true"
        className="orb-ring--outer absolute inset-0 rounded-full border-solid"
      />
      {/* D-04: inner reference ring at MIN_SCALE boundary.
          WR-03: position explicitly with left/top + translate centering rather
          than relying on implicit grid auto-positioning of an absolutely-positioned
          child, which is genuinely ambiguous in the spec for absolutely-positioned
          grid items and is rendered inconsistently by older Safari. */}
      <span
        aria-hidden="true"
        className="orb-ring--inner absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 rounded-full border-solid"
        style={{
          width: `${MIN_SCALE * 100}%`,
          height: `${MIN_SCALE * 100}%`,
        }}
      />
      {/* The orb itself: scaled host with two stacked gradient layers (D-01, D-02, D-07) */}
      <div
        className="orb absolute inset-0 rounded-full motion-reduce:transition-none"
        style={{ transform: `scale(${orbScale})` }}
      >
        <span
          aria-hidden="true"
          className="orb-layer--in absolute inset-0 rounded-full"
        />
        <span
          aria-hidden="true"
          className="orb-layer--out absolute inset-0 rounded-full"
        />
      </div>
      {/* D-03: phase label centered inside the orb at large display size */}
      <span
        className="relative z-10 text-5xl font-semibold tracking-tight text-slate-900 sm:text-6xl"
        style={{
          color:
            frame.phase === 'in'
              ? 'var(--color-orb-in-text)'
              : 'var(--color-orb-out-text)',
        }}
      >
        {frame.phaseLabel}
      </span>
    </div>
  )
}
