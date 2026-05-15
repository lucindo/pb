import type { SessionFrame } from '../domain/sessionMath'
import type { UiStrings } from '../content/strings'
import { usePrefersReducedMotion } from '../hooks/usePrefersReducedMotion'
import { MIN_SCALE, MAX_SCALE, MID_SCALE } from './shapeConstants'

export interface DiamondShapeProps {
  frame: SessionFrame | null
  leadInDigit?: 3 | 2 | 1 | null
  strings: UiStrings['breathing']
}

// D-04: DiamondShape does NOT own the idle null-return — the BreathingShape
// dispatcher (Plan 05) guards that and never invokes DiamondShape with both
// frame=null AND leadInDigit=null.
export function DiamondShape({ frame, leadInDigit, strings }: DiamondShapeProps) {
  if (leadInDigit != null) {
    return <DiamondLeadIn digit={leadInDigit} strings={strings} />
  }
  // DiamondShape's caller (BreathingShape dispatcher) guarantees frame !== null
  // when leadInDigit is null (D-04 — dispatcher owns the idle null-return guard).
  // Reason: BreathingShape dispatcher asserts frame !== null before delegating to DiamondShape when leadInDigit is null.
  // eslint-disable-next-line @typescript-eslint/no-non-null-assertion
  return <DiamondBody frame={frame!} strings={strings} />
}

// Diamond geometry approach: clip-path on the .orb host and gradient layers (Option A).
// CSS [data-variant='diamond'] .orb { clip-path: polygon(50% 0%, 100% 50%, 50% 100%, 0% 50%) }
// in theme.css clips the host to a 4-pointed diamond. The inline transform stack
// (translate3d + scale) is unchanged — avoids polluting the Safari scale-interpolation
// that Phase 5.1 Plan 04 fixed (D-20 / post-UAT hotfix).
//
// Markers use inscribed rotated-square geometry (iteration 2 fix):
// clip-path CANNOT be used on markers — the polygon interior clips away most of the
// 1.5px rectangular border, leaving only four tiny vertex specks. Instead, theme.css
// renders markers as normal squares rotated 45°, sized so their corners land at the
// host diamond's vertex positions (outer: orb-size boundary; inner: MIN_SCALE boundary).
// Marker inline styles are NOT emitted here — CSS [data-variant='diamond'] owns all
// marker positioning (Option Y). D-13 zero new color tokens.
function DiamondBody({ frame, strings }: { frame: SessionFrame; strings: UiStrings['breathing'] }) {
  const reducedMotion = usePrefersReducedMotion()

  const progress = Math.min(1, Math.max(0, frame.phaseProgress))
  const liveScale =
    frame.phase === 'in'
      ? MIN_SCALE + progress * (MAX_SCALE - MIN_SCALE)
      : MAX_SCALE - progress * (MAX_SCALE - MIN_SCALE)
  const orbScale = reducedMotion ? MID_SCALE : liveScale

  // Phase 19 Path A wedge: translate at JSX layer (D-18 file-split invariant).
  const phaseLabel = frame.phase === 'in' ? strings.inhale : strings.exhale

  return (
    <div
      role="img"
      aria-label={`${strings.breathingShapeAriaLabel}: ${phaseLabel}`}
      data-phase={frame.phase}
      data-progress={progress.toFixed(3)}
      data-variant="diamond"
      className="relative mx-auto my-12 grid place-items-center"
      style={{
        width: 'var(--orb-size)',
        height: 'var(--orb-size)',
      }}
    >
      {/* D-04 + Phase 5.1 D-10/D-12: outer reference marker at MAX_SCALE boundary.
          Phase 17 iteration 2: diamond markers use inscribed rotated-square geometry
          (not clip-path). CSS [data-variant='diamond'] .shape-marker--outer owns all
          positioning: center-anchored (left:50% top:50%), sized at (orb-size+3px)/√2,
          rotated 45° so corners land at the host diamond's edge midpoints + 1.5px outward.
          No inline style — CSS rule takes full control (Option Y).
          Mirror in DiamondLeadIn below — both render sites must match (D-12). */}
      <span
        aria-hidden="true"
        className="shape-marker--outer absolute border-solid"
      />
      {/* The orb itself: scaled host with two stacked gradient layers (D-01, D-02, D-07).
          Phase 5.1 Plan 04 D-20 + post-UAT hotfix: drop `inset-0` and use explicit
          four-edge anchoring (left/right/top/bottom) so Safari Desktop sizes the
          abs-pos `.orb` against the container's padding-box rather than collapsing
          to the inner-ring's implicit grid auto-track. Four-edge anchoring matches
          the working outer-ring pattern and preserves the Safari transition.
          Mirrored in DiamondLeadIn below (D-22).
          Phase 17 deviation Option A: clip-path applied via CSS [data-variant='diamond'] .orb
          selector — NO inline transform modification, so Safari's scale-interpolation is safe.
          The .orb host uses no border-radius (clip-path overrides visible shape entirely). */}
      <div
        className="orb absolute motion-reduce:transition-none"
        style={{
          left: 0,
          right: 0,
          top: 0,
          bottom: 0,
          // `translate3d(0,0,0)` forces GPU compositor promotion (Firefox
          // Desktop flickers without this; Safari/Chromium auto-promote).
          // Order matters: translate3d first so it establishes the 3D
          // context, scale applies inside it.
          transform: `translate3d(0,0,0) scale(${String(orbScale)})`,
        }}
      >
        <span
          aria-hidden="true"
          className="orb-layer--in absolute inset-0"
        />
        <span
          aria-hidden="true"
          className="orb-layer--out absolute inset-0"
        />
      </div>
      {/* D-04 + 260510-tc9 Bug 1: inner reference marker at MIN_SCALE boundary.
          Rendered AFTER the orb so it sits on top of the opaque gradient fill.
          Phase 17 iteration 2: CSS [data-variant='diamond'] .shape-marker--inner owns
          all positioning: center-anchored, sized at (orb-size×0.58+3px)/√2, rotated 45°
          so corners land at MIN_SCALE diamond vertices + 1.5px outward. No inline style
          — CSS rule takes full control (Option Y). */}
      <span
        aria-hidden="true"
        className="shape-marker--inner absolute border-solid"
      />
      {/* D-03: phase label centered inside the orb at large display size */}
      <span
        className="relative z-10 text-5xl font-semibold tracking-tight text-[var(--color-breathing-accent-strong)] sm:text-6xl"
        style={{
          color:
            frame.phase === 'in'
              ? 'var(--color-orb-in-text)'
              : 'var(--color-orb-out-text)',
        }}
      >
        {phaseLabel}
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
function DiamondLeadIn({ digit, strings }: { digit: 1 | 2 | 3; strings: UiStrings['breathing'] }) {
  return (
    <div
      role="img"
      aria-label={strings.leadInAriaLabel(digit)}
      data-variant="diamond"
      className="relative mx-auto my-12 grid place-items-center"
      style={{
        width: 'var(--orb-size)',
        height: 'var(--orb-size)',
      }}
    >
      {/* Outer reference marker (Phase 2 D-04 + Phase 5.1 D-10/D-12).
          Mirrors DiamondBody above — both render sites must match (D-12).
          Phase 17 iteration 2: no inline style — CSS [data-variant='diamond']
          .shape-marker--outer owns all positioning (inscribed rotated-square). */}
      <span
        aria-hidden="true"
        className="shape-marker--outer absolute border-solid"
      />
      {/* Orb host locked at MID_SCALE — neutral pre-state. Only the In gradient
          is rendered (no Out crossfade). Phase 5.1 Plan 04 D-20 + D-22 +
          post-UAT hotfix: same four-edge anchoring as DiamondBody.
          Phase 17 deviation Option A: clip-path applied via CSS — no border-radius class needed. */}
      <div
        className="orb absolute motion-reduce:transition-none"
        style={{
          left: 0,
          right: 0,
          top: 0,
          bottom: 0,
          // GPU promotion (see DiamondBody comment above).
          transform: `translate3d(0,0,0) scale(${String(MID_SCALE)})`,
        }}
      >
        <span
          aria-hidden="true"
          className="orb-layer--in absolute inset-0"
        />
      </div>
      {/* Inner reference marker (Phase 2 D-04 + 260510-tc9 Bug 1) — rendered AFTER
          the orb so it sits on top of the opaque gradient fill. D-22 mirror of
          DiamondBody. Phase 17 iteration 2: no inline style — CSS owns positioning. */}
      <span
        aria-hidden="true"
        className="shape-marker--inner absolute border-solid"
      />
      {/* D-14: digit in the same large-display position as the In/Out label,
          one step larger (text-7xl/text-8xl vs the body's text-5xl/text-6xl)
          so the countdown reads as dominant. */}
      <span
        className="relative z-10 text-7xl font-semibold tracking-tight text-[var(--color-breathing-accent-strong)] sm:text-8xl"
        style={{ color: 'var(--color-orb-in-text)' }}
      >
        {digit}
      </span>
    </div>
  )
}
