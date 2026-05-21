import type { UiStrings } from '../content/strings'
import { usePrefersReducedMotion } from '../hooks/usePrefersReducedMotion'
import { MID_SCALE } from './shapeConstants'
import { OrbShape } from './OrbShape'

// D-01 (RESEARCH OQ-2): NKShape renders OrbShape in NK mode — count number
// centered, shape locked at MID_SCALE (no scale crossfade), Front/Back drives
// the In/Out gradient via OrbShape's nkPhase prop.
// Phase 38 VAR-01/VAR-02: single-shape collapse — SquareShape / DiamondShape
// removed; NKShape always renders OrbShape.
//
// CALLER RESPONSIBILITY: supply key={`nk-${String(count)}`} on the NKShape
// element to restart the CSS pulse animation on each OM (D-01 pulse once per OM).
// Do NOT set key inside this component (it would only remount the inner element).

export interface NKShapeProps {
  count: number                 // live OM count (0 during settle)
  phase: 'front' | 'back'       // WR-01: real NK phase, drives the aria-label
  isPaused?: boolean            // dims count to opacity-50 when true
  strings: UiStrings['breathing']
  // WR-01: NK phase copy ('Front' / 'Back') for the screen-reader label.
  nkReadoutStrings: UiStrings['nkReadout']
}

export function NKShape({
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
  // Phase 31: count === 0 is the post-marker lead-in window — the user performs
  // the neck-lock head movement before OM 1. "0" is shown (not blank) so that
  // pause reads as a deliberate beat of the practice.
  // text-7xl sm:text-8xl font-semibold tracking-tight per UI-SPEC "NK Shape count-in-shape".
  // Color tracks the phase the same way HRV's CueGlyph does — in-text on the
  // Front (In) gradient, out-text on the Back (Out) gradient — so the digit
  // stays legible after the orb crossfades to the Back color.
  const countContent = (
    <span
      className={`relative z-10 text-7xl font-semibold tracking-tight sm:text-8xl${isPaused ? ' opacity-50' : ''}`}
      style={{ color: phase === 'back' ? 'var(--color-orb-out-text)' : 'var(--color-orb-in-text)' }}
    >
      {String(count)}
    </span>
  )

  // D-02: aria-label announces the current OM count and phase for screen readers.
  // WR-01: the phase label is the REAL NK phase (Front/Back) sourced from
  // nkReadoutStrings, not strings.inhale — a blind user must hear the practice
  // move from Front to Back.
  // The aria-label format is locked: "Navi Kriya session: OM ${count}, phase ${phaseLabel}"
  const phaseLabel = phase === 'back' ? nkReadoutStrings.back : nkReadoutStrings.front
  const ariaLabel = `Navi Kriya session: OM ${String(count)}, phase ${phaseLabel}`

  // The NKShape renders OrbShape locked at MID_SCALE.
  //
  // ARCHITECTURE: OrbShape exposes an `nkPhase` prop that renders its LeadIn
  // structure (MID_SCALE host + both gradient layers + the outer reference ring)
  // WITHOUT a countdown numeral. The inner ring is dropped — it is HRV's
  // exhale-end cue and has no meaning here. The nkPhase value sets data-phase
  // so theme.css crossfades to the Out gradient on Back — the same In/Out
  // treatment as the live breathing body. We then overlay our own live OM count
  // via a wrapper div.
  //
  // This reuses the exact CSS/DOM structure from OrbShape's LeadIn (already
  // tested and known good) while supplying our own count content.
  //
  // Phase 31 fix: the earlier approach passed leadInDigit={1} and relied on
  // z-index layering to hide the shape's own "1". That "1" leaked from behind
  // any count other than 1 (e.g. a "2" left the "1" stroke visible). nkPhase
  // suppresses the numeral at the source, so nothing is left behind.

  return (
    <div
      data-variant="orb"
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
      {/* Render OrbShape locked at MID_SCALE via nkPhase — no numeral,
          In/Out gradient driven by the Front/Back phase. The shape renders a
          decorative subtree (no role/aria-label) and the wrapper is aria-hidden,
          since the parent div carries the NK-specific aria-label. */}
      <div aria-hidden="true" className="absolute inset-0">
        <OrbShape
          frame={null}
          nkPhase={phase}
          strings={strings}
        />
      </div>
      {/* D-02: count number overlaid on top of the shape */}
      {countContent}
    </div>
  )
}

// Export MID_SCALE for tests that need to verify the resting scale
export { MID_SCALE }
