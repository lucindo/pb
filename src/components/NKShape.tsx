import type { VisualVariantId } from '../domain/settings'
import type { UiStrings } from '../content/strings'
import { usePrefersReducedMotion } from '../hooks/usePrefersReducedMotion'
import { MID_SCALE } from './shapeConstants'
import { OrbShape } from './OrbShape'
import { SquareShape } from './SquareShape'
import { DiamondShape } from './DiamondShape'

// D-01 (RESEARCH OQ-2): NKShape is a thin wrapper that renders the user's
// chosen variant shape (OrbShape / SquareShape / DiamondShape) in NK mode.
// It does NOT add NK props to the existing shape components — the wrapper
// handles the NK-specific rendering contract:
//   - Count number centered inside (replaces CueGlyph slot, D-02)
//   - Shape locked at MID_SCALE, no crossfade (no data-phase flipping)
//   - Gentle scale pulse via .nk-om-pulse CSS class (D-04, no expanding ring)
//   - Static fallback under reduced-motion (D-04)
//
// CALLER RESPONSIBILITY: supply key={`nk-${String(count)}`} on the NKShape
// element to restart the CSS pulse animation on each OM (D-01 pulse once per OM).
// Do NOT set key inside this component (it would only remount the inner element).

export interface NKShapeProps {
  variant: VisualVariantId      // 'orb' | 'square' | 'diamond'
  count: number                 // live OM count (0 during settle)
  phase: 'front' | 'back'       // WR-01: real NK phase, drives the aria-label
  isPaused?: boolean            // dims count to opacity-50 when true
  strings: UiStrings['breathing']
  // WR-01: NK phase copy ('Front' / 'Back') for the screen-reader label.
  nkReadoutStrings: UiStrings['nkReadout']
}

export function NKShape({
  variant,
  count,
  phase,
  isPaused = false,
  strings,
  nkReadoutStrings,
}: NKShapeProps) {
  const reducedMotion = usePrefersReducedMotion()

  // D-04: apply .nk-om-pulse only when reduced-motion is off.
  // When reducedMotion is true the class is absent — shape holds MID_SCALE static
  // via the shape component's own locked scale, but the count still updates.
  const pulseClass = reducedMotion ? '' : 'nk-om-pulse'

  // D-02: live count number centered inside the shape — replaces the CueGlyph slot.
  // count=0 during the settle period: render no digit (blank settle).
  // text-7xl sm:text-8xl font-semibold tracking-tight per UI-SPEC "NK Shape count-in-shape".
  // Color: var(--color-orb-in-text) — same token used by OrbLeadIn digit.
  const countContent = count > 0 ? (
    <span
      className={`relative z-10 text-7xl font-semibold tracking-tight sm:text-8xl${isPaused ? ' opacity-50' : ''}`}
      style={{ color: 'var(--color-orb-in-text)' }}
    >
      {String(count)}
    </span>
  ) : null

  // D-02: aria-label announces the current OM count and phase for screen readers.
  // WR-01: the phase label is the REAL NK phase (Front/Back) sourced from
  // nkReadoutStrings, not strings.inhale — a blind user must hear the practice
  // move from Front to Back.
  // The aria-label format is locked: "Navi Kriya session: OM ${count}, phase ${phaseLabel}"
  const phaseLabel = phase === 'back' ? nkReadoutStrings.back : nkReadoutStrings.front
  const ariaLabel = `Navi Kriya session: OM ${String(count)}, phase ${phaseLabel}`

  // The NKShape renders the underlying shape component locked at MID_SCALE.
  //
  // ARCHITECTURE: Since the shape components (OrbShape/SquareShape/DiamondShape)
  // don't have a full NK mode, each exposes an `nkLocked` prop that renders its
  // LeadIn structure (MID_SCALE host + `in` gradient + reference rings) WITHOUT
  // a countdown numeral. We then overlay our own live OM count via a wrapper div.
  //
  // This reuses the exact CSS/DOM structure from each shape's LeadIn (already
  // tested and known good) while supplying our own count content.
  //
  // Phase 31 fix: the earlier approach passed leadInDigit={1} and relied on
  // z-index layering to hide the shape's own "1". That "1" leaked from behind
  // any count other than 1 (e.g. a "2" left the "1" stroke visible). `nkLocked`
  // suppresses the numeral at the source, so nothing is left behind.

  return (
    <div
      data-variant={variant}
      // my-12 mirrors the vertical margin OrbShape/OrbLeadIn carry — without it
      // the shape box collapses and the StatusPanel rides up over the shape
      // (visible as a jump when the countdown hands off to the running session).
      className={`relative mx-auto my-12 grid place-items-center${pulseClass ? ` ${pulseClass}` : ''}`}
      style={{
        width: 'var(--orb-size)',
        height: 'var(--orb-size)',
      }}
      aria-label={ariaLabel}
      role="img"
    >
      {/* Render the variant shape locked at MID_SCALE via nkLocked — no numeral.
          The shape's role/aria-label are suppressed (nkLocked renders a
          decorative subtree) and the wrapper is aria-hidden, since the parent
          div carries the NK-specific aria-label. */}
      <div aria-hidden="true" className="absolute inset-0">
        {variant === 'orb' ? (
          <OrbShape
            frame={null}
            nkLocked
            strings={strings}
          />
        ) : variant === 'square' ? (
          <SquareShape
            frame={null}
            nkLocked
            strings={strings}
          />
        ) : (
          <DiamondShape
            frame={null}
            nkLocked
            strings={strings}
          />
        )}
      </div>
      {/* D-02: count number overlaid on top of the shape */}
      {countContent}
    </div>
  )
}

// Export MID_SCALE for tests that need to verify the resting scale
export { MID_SCALE }
