/**
 * Shared scale constants for OrbShape breathing math.
 * MIN/MAX/MID values are kept in sync with --orb-scale-{min,max,mid} in src/styles/theme.css.
 * If you edit one side, edit the other (IN-01).
 * Phase 38 (VAR-01 / VAR-02): shape variants removed; OrbShape is the only shape.
 */

// IN-01: keep these in sync with the matching tokens in `src/styles/theme.css`
// (`--orb-scale-min`, `--orb-scale-max`, `--orb-scale-mid`). The TS constants
// drive the breathing math here; the CSS tokens are exposed for stylesheet
// consumers (e.g. the inline `transform: scale(var(--orb-scale-mid))` fallback
// path under reduced-motion). If you edit one side, edit the other.
export const MIN_SCALE = 0.58 // keep in sync with --orb-scale-min
export const MAX_SCALE = 1.0 // keep in sync with --orb-scale-max
export const MID_SCALE = (MIN_SCALE + MAX_SCALE) / 2 // 0.79 — D-06 reduced-motion fixed size; keep in sync with --orb-scale-mid
