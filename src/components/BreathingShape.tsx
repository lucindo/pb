// Phase 17 Plan 05 dispatcher. Owns the single idle null-return guard (D-04).
// Switches on the `variant` prop (D-03 — App.tsx passes the captured-at-Start
// frozen value in Plan 06). The prop is OPTIONAL with default `'orb'` so callers
// that pre-date Phase 17 (e.g. App.tsx prior to Plan 06's wire-up) compile and
// render unchanged — VARIANT-02 zero-regression. Phase 14 D-05 locks
// DEFAULT_VARIANT = 'orb', consistent with this default. Each sibling owns its
// own lead-in vs Body internal dispatch. Unknown variant falls back to Orb
// (default switch branch — defense in depth against cross-tab pollution of
// Envelope.prefs.variant, though Phase 14 D-17 coerceVariant is the primary guard).
import type { SessionFrame } from '../domain/sessionMath'
import type { VisualVariantId } from '../domain/settings'
import { OrbShape } from './OrbShape'
import { SquareShape } from './SquareShape'
import { RingShape } from './RingShape'

export interface BreathingShapeProps {
  variant?: VisualVariantId
  frame: SessionFrame | null
  // Phase 3 D-14: when set, renders the digit in the orb area in place of the
  // In/Out phase label. Lead-in always wins when both leadInDigit and frame are
  // present (the lead-in is a pre-session visual; the frame may already be
  // advancing in App.tsx but the user shouldn't see it yet).
  leadInDigit?: 3 | 2 | 1 | null
}

export function BreathingShape({ variant = 'orb', frame, leadInDigit }: BreathingShapeProps) {
  if (frame === null && leadInDigit == null) {
    return null
  }
  switch (variant) {
    case 'square':
      return <SquareShape frame={frame} leadInDigit={leadInDigit} />
    case 'ring':
      return <RingShape frame={frame} leadInDigit={leadInDigit} />
    case 'orb':
    default:
      return <OrbShape frame={frame} leadInDigit={leadInDigit} />
  }
}
