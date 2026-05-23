/**
 * Shared scale constants for OrbShape breathing math.
 * MIN/MAX/MID values are kept in sync with --orb-scale-{min,max,mid} in src/styles/theme.css.
 * The drift guard at shapeConstants.test.ts fails CI if either side diverges —
 * change both files together (or delete both sides together, if the scale
 * concept goes away in a future orb redesign).
 * Phase 38 (VAR-01 / VAR-02): shape variants removed; OrbShape is the only shape.
 */

// The TS constants drive the breathing math here; the CSS tokens are exposed
// for stylesheet consumers (e.g. the inline `transform: scale(var(--orb-scale-mid))`
// fallback path under reduced-motion, and the `breath-loop-animation` keyframes
// in index.css). Sync enforced by src/components/shapeConstants.test.ts.
export const MIN_SCALE = 0.58
export const MAX_SCALE = 1.0
export const MID_SCALE = (MIN_SCALE + MAX_SCALE) / 2 // 0.79 — D-06 reduced-motion fixed size
