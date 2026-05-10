import type { CSSProperties } from 'react'

import type { SessionFrame } from '../domain/sessionMath'
import { usePrefersReducedMotion } from '../hooks/usePrefersReducedMotion'

export interface BreathingShapeProps {
  frame: SessionFrame | null
  // Phase 3 D-14: when set, renders the digit in the orb area in place of the
  // In/Out phase label. Lead-in always wins when both leadInDigit and frame are
  // present (the lead-in is a pre-session visual; the frame may already be
  // advancing in App.tsx but the user shouldn't see it yet).
  leadInDigit?: 3 | 2 | 1 | null
}

// IN-01: keep these in sync with the matching tokens in `src/styles/theme.css`
// (`--orb-scale-min`, `--orb-scale-max`, `--orb-scale-mid`). The TS constants
// drive the breathing math here; the CSS tokens are exposed for stylesheet
// consumers (e.g. the inline `transform: scale(var(--orb-scale-mid))` fallback
// path under reduced-motion). If you edit one side, edit the other.
const MIN_SCALE = 0.58 // keep in sync with --orb-scale-min
const MAX_SCALE = 1.0 // keep in sync with --orb-scale-max
const MID_SCALE = (MIN_SCALE + MAX_SCALE) / 2 // 0.79 — D-06 reduced-motion fixed size; keep in sync with --orb-scale-mid

// IN-04 + Phase 3 D-14: split into wrapper + body so the matchMedia
// subscription in usePrefersReducedMotion only mounts when there is an active
// frame to render. On the idle screen (frame === null AND leadInDigit == null)
// we render nothing without paying for the hook lifecycle.
//
// During lead-in we render BreathingShapeLeadIn (no usePrefersReducedMotion
// subscription — the orb is locked at MID_SCALE for everyone, mirroring Phase
// 2 D-06 reduced-motion mode regardless of OS preference).
//
// Hooks-rules-of-React are still respected because each component calls its
// hooks unconditionally.
export function BreathingShape({ frame, leadInDigit }: BreathingShapeProps) {
  if (leadInDigit != null) {
    return <BreathingShapeLeadIn digit={leadInDigit} />
  }
  if (frame === null) {
    return null
  }
  return <BreathingShapeBody frame={frame} />
}

function BreathingShapeBody({ frame }: { frame: SessionFrame }) {
  const reducedMotion = usePrefersReducedMotion()

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
      {/* D-04 + Phase 5.1 D-10/D-12: outer reference ring at MAX_SCALE boundary.
          The 1.5px border (theme.css `.orb-ring--outer { border-width: 1.5px }`) lives
          INSIDE the box under the global `border-box` sizing. With `inset-0` the border's
          outer edge sat 1.5px inside the 100% container; the orb at scale(MAX_SCALE = 1.0)
          fills the 100% container exactly, leaving a Safari-visible gap at peak inhale.
          `inset: -1.5px` shifts the border-box outward by exactly the border width so the
          border's outer edge meets the orb at scale(1.0) on Safari + Chromium + Firefox.
          Mirror in BreathingShapeLeadIn below — both render sites must match (D-12). */}
      <span
        aria-hidden="true"
        className="orb-ring--outer absolute rounded-full border-solid"
        style={{ inset: '-1.5px' }}
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

// Phase 3 D-14 + Phase 2 D-06: the lead-in is a neutral pre-state. The orb is
// locked at MID_SCALE for everyone (mirrors reduced-motion mode regardless of
// OS preference), and only the In gradient is rendered (no Out crossfade) so
// the lead-in feels like a still pool of water awaiting the first breath.
//
// No usePrefersReducedMotion subscription here — the lead-in is constant by
// design, so there is no animation to suppress.
//
// No data-phase / data-progress on the root — those attributes belong to the
// active phase loop. The lead-in is pre-state and exposes only the aria-label
// "Lead-in: N" for assistive tech.
function BreathingShapeLeadIn({ digit }: { digit: 1 | 2 | 3 }) {
  return (
    <div
      role="img"
      aria-label={`Lead-in: ${digit}`}
      className="relative mx-auto my-12 grid place-items-center"
      style={{
        width: 'var(--orb-size)',
        height: 'var(--orb-size)',
      } as CSSProperties}
    >
      {/* Outer reference ring (Phase 2 D-04 + Phase 5.1 D-10/D-12).
          Mirrors BreathingShapeBody above — both render sites must match
          or the Safari outer-ring gap reappears during the 3-2-1 countdown. */}
      <span
        aria-hidden="true"
        className="orb-ring--outer absolute rounded-full border-solid"
        style={{ inset: '-1.5px' }}
      />
      {/* Inner reference ring (Phase 2 D-04) */}
      <span
        aria-hidden="true"
        className="orb-ring--inner absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 rounded-full border-solid"
        style={{
          width: `${MIN_SCALE * 100}%`,
          height: `${MIN_SCALE * 100}%`,
        }}
      />
      {/* Orb host locked at MID_SCALE — neutral pre-state. Only the In gradient
          is rendered (no Out crossfade) so the lead-in feels like a still pool
          of water awaiting the first breath. */}
      <div
        className="orb absolute inset-0 rounded-full"
        style={{ transform: `scale(${MID_SCALE})` }}
      >
        <span
          aria-hidden="true"
          className="orb-layer--in absolute inset-0 rounded-full"
        />
      </div>
      {/* D-14: digit in the same large-display position as the In/Out label,
          one step larger (text-7xl/text-8xl vs the body's text-5xl/text-6xl)
          so the countdown reads as dominant. */}
      <span className="relative z-10 text-7xl font-semibold tracking-tight text-slate-900 sm:text-8xl">
        {digit}
      </span>
    </div>
  )
}
