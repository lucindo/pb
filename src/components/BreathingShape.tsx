// Phase 17 Plan 05 dispatcher. Owns the single idle null-return guard (D-04).
// Switches on the `variant` prop (D-03 — App.tsx passes the captured-at-Start
// frozen value in Plan 06). The prop is OPTIONAL with default `'orb'` so callers
// that pre-date Phase 17 (e.g. App.tsx prior to Plan 06's wire-up) compile and
// render unchanged — VARIANT-02 zero-regression. Phase 14 D-05 locks
// DEFAULT_VARIANT = 'orb', consistent with this default. Each sibling owns its
// own lead-in vs Body internal dispatch. Unknown variant falls back to Orb
// (default switch branch — defense in depth against cross-tab pollution of
// Envelope.prefs.variant, though Phase 14 D-17 coerceVariant is the primary guard).
// Phase 17 deviation: 'ring' replaced with 'diamond' (rotated-square geometry via clip-path).
// Phase 25 Plan 03: `cue` prop added — OPTIONAL, default 'labels' for zero-regression.
// Threaded to all 3 shapes so CueGlyph can branch on it. Lead-in does NOT receive
// cue (D-07 — the 3-2-1 countdown digit is unchanged in all cue modes).
import type { SessionFrame } from '../domain/sessionMath'
import type { VisualVariantId, CueStyleId } from '../domain/settings'
import type { UiStrings } from '../content/strings'
import { OrbShape } from './OrbShape'
import { SquareShape } from './SquareShape'
import { DiamondShape } from './DiamondShape'

export interface BreathingShapeProps {
  variant?: VisualVariantId
  // Phase 25 Plan 03: OPTIONAL, default 'labels' — zero-regression for callers
  // that pre-date Phase 25 (App.tsx prior to Plan 04 wire-up compiles unchanged).
  cue?: CueStyleId
  frame: SessionFrame | null
  strings: UiStrings['breathing']
  // Phase 3 D-14: when set, renders the digit in the orb area in place of the
  // In/Out phase label. Lead-in always wins when both leadInDigit and frame are
  // present (the lead-in is a pre-session visual; the frame may already be
  // advancing in App.tsx but the user shouldn't see it yet).
  leadInDigit?: 3 | 2 | 1 | null
}

export function BreathingShape({ variant = 'orb', cue = 'labels', frame, strings, leadInDigit }: BreathingShapeProps) {
  if (frame === null && leadInDigit == null) {
    return null
  }
  switch (variant) {
    case 'square':
      return <SquareShape frame={frame} cue={cue} leadInDigit={leadInDigit} strings={strings} />
    case 'diamond':
      return <DiamondShape frame={frame} cue={cue} leadInDigit={leadInDigit} strings={strings} />
    case 'orb':
    default:
      return <OrbShape frame={frame} cue={cue} leadInDigit={leadInDigit} strings={strings} />
  }
}
