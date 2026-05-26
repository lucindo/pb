import type { UiStrings } from '../content/strings'
import type { BreathingShapeVariant } from '../featureFlags'
import { usePrefersReducedMotion } from '../hooks/usePrefersReducedMotion'
import { MID_SCALE } from './shapeConstants'
import { OrbShape } from './OrbShape'

// D-01 (RESEARCH OQ-2): NKShape renders OrbShape in NK mode — count number
// centered, shape locked at MID_SCALE (no scale crossfade), Front/Back drives
// the In/Out gradient via OrbShape's nkPhase prop.
// Phase 38 (VAR-01/VAR-02): shape variants removed; NKShape always renders OrbShape.
//
// CALLER RESPONSIBILITY: supply key={`nk-${String(count)}`} on the NKShape
// element to restart the CSS pulse animation on each OM (D-01 pulse once per OM).
// Do NOT set key inside this component (it would only remount the inner element).

export interface NKShapeProps {
  count: number                 // live OM count (0 during settle)
  phase: 'front' | 'back'       // WR-01: real NK phase, drives the aria-label
  isPaused?: boolean            // dims count to opacity-50 when true
  strings: UiStrings['practice']['breathing']
  // WR-01: NK phase copy ('Front' / 'Back') for the screen-reader label.
  nkReadoutStrings: UiStrings['practice']['nkReadout']
  // J5: forwarded to the inner OrbShape so the NK shell uses the same orb
  // variant the rest of the surface uses (?breathingShape=orb-halo|minimal-rings).
  variant: BreathingShapeVariant
}

export function NKShape({
  count,
  phase,
  isPaused = false,
  strings,
  nkReadoutStrings,
  variant,
}: NKShapeProps) {
  const reducedMotion = usePrefersReducedMotion()

  // D-04: apply .nk-om-pulse only when reduced-motion is off.
  // When reducedMotion is true the class is absent — shape holds MID_SCALE static
  // via the shape component's own locked scale, but the count still updates.
  const pulseClass = reducedMotion ? '' : 'nk-om-pulse'

  // D-02: live count number rendered inside the orb's centre disc.
  // Phase 31: count === 0 is the post-marker lead-in window — the user performs
  // the neck-lock head movement before OM 1. "0" is shown (not blank) so that
  // pause reads as a deliberate beat of the practice.
  // text-7xl sm:text-8xl font-semibold tracking-tight per UI-SPEC "NK Shape count-in-shape".
  // Color: inherits currentColor from OrbContainer's centre disc, which sets
  // color: var(--color-breathing-on-accent). The disc bg crossfades between
  // accent (front) and accent-strong (back); on-accent reads legibly against both.
  const countContent = (
    <span
      className={`text-7xl font-semibold tracking-tight sm:text-8xl${isPaused ? ' opacity-50' : ''}`}
    >
      {String(count)}
    </span>
  )

  // D-02: aria-label announces the current OM count and phase for screen readers.
  // WR-01: the phase label is the REAL NK phase (Front/Back) sourced from
  // nkReadoutStrings — a blind user must hear the practice move Front → Back.
  const phaseLabel = phase === 'back' ? nkReadoutStrings.back : nkReadoutStrings.front
  const ariaLabel = nkReadoutStrings.orbAriaLabel(count, phaseLabel)

  // Architecture: OrbShape's nkPhase branch renders the OrbLeadIn structure
  // (MID_SCALE host + halos + centre disc + outer ring, no inner ring) and
  // accepts children that render INSIDE the centre disc. The count slots in
  // there so it inherits the disc's on-accent text color (pre-fix it was
  // overlaid as a sibling and inherited the body text color → washed grey).
  //
  // The outer wrapper carries the NK-specific aria-label/role and the per-OM
  // pulse animation class. OrbContainer provides the size + my-12 margin, so
  // this wrapper stays unsized.
  return (
    <div
      className={pulseClass}
      aria-label={ariaLabel}
      role="img"
    >
      <OrbShape
        frame={null}
        nkPhase={phase}
        strings={strings}
        variant={variant}
      >
        {countContent}
      </OrbShape>
    </div>
  )
}

// Export MID_SCALE for tests that need to verify the resting scale
export { MID_SCALE }
