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
  // We pass frame=null and leadInDigit=undefined so neither path fires;
  // the shape renders a neutral lead-in-like locked state.
  // Then we overlay the count number absolutely inside the shape.
  //
  // ARCHITECTURE: Since the shape components (OrbShape/SquareShape/DiamondShape)
  // don't have an NK mode, we use the OrbLeadIn pattern from each shape as the
  // structural model — the shape locked at MID_SCALE with only the `in` gradient.
  // We render the shape with leadInDigit=1 to get the MID_SCALE locked state,
  // then overlay our own count number via a wrapper div.
  //
  // This approach reuses the exact CSS/DOM structure from each shape's LeadIn
  // (which is already tested and known good) while supplying our own count content.
  //
  // IMPORTANT: We render using leadInDigit=1 as a MID_SCALE locked trigger; the
  // digit "1" is rendered by the shape but our wrapper hides it via z-index layering
  // — the count span sits at z-10 above the shape's own content.

  return (
    <div
      data-variant={variant}
      className={`relative mx-auto grid place-items-center${pulseClass ? ` ${pulseClass}` : ''}`}
      style={{
        width: 'var(--orb-size)',
        height: 'var(--orb-size)',
        // Ensure the wrapper doesn't add extra margin beyond what the shape provides
      }}
      aria-label={ariaLabel}
      role="img"
    >
      {/* Render the variant shape locked at MID_SCALE using the LeadIn branch.
          The shape's own aria-label/role are suppressed via aria-hidden since
          the parent div carries the NK-specific aria-label. */}
      <div aria-hidden="true" className="absolute inset-0">
        {variant === 'orb' ? (
          <OrbShape
            frame={null}
            leadInDigit={1}
            strings={strings}
          />
        ) : variant === 'square' ? (
          <SquareShape
            frame={null}
            leadInDigit={1}
            strings={strings}
          />
        ) : (
          <DiamondShape
            frame={null}
            leadInDigit={1}
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
