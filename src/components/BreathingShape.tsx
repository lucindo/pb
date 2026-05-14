// D-04 + Phase 17 Plan 02: BreathingShape is a thin dispatcher.
// It owns the idle null-return guard (frame === null && leadInDigit == null → null).
// All rendering is delegated to the appropriate shape component:
//   - In Plan 02 (this plan): unconditionally delegates to OrbShape.
//   - In Plan 05: replaces this body with a 3-way variant switch
//     (OrbShape | SquareShape | RingShape) based on the `variant` prop.
//
// The MIN/MAX/MID scale constants have moved to src/components/shapeConstants.ts
// (IN-01 — single source of truth for all three variants).
import type { SessionFrame } from '../domain/sessionMath'
import { OrbShape } from './OrbShape'

export interface BreathingShapeProps {
  frame: SessionFrame | null
  // Phase 3 D-14: when set, renders the digit in the orb area in place of the
  // In/Out phase label. Lead-in always wins when both leadInDigit and frame are
  // present (the lead-in is a pre-session visual; the frame may already be
  // advancing in App.tsx but the user shouldn't see it yet).
  leadInDigit?: 3 | 2 | 1 | null
}

export function BreathingShape({ frame, leadInDigit }: BreathingShapeProps) {
  if (frame === null && leadInDigit == null) {
    return null
  }
  return <OrbShape frame={frame} leadInDigit={leadInDigit} />
}
