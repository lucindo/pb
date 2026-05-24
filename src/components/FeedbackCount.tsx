import type { ReactElement } from 'react'

// Spike 010 FeedbackCount (index.html lines 1087-1121) — count-based readout
// shared by Stretch + Navi. Big current-count number baseline-aligned with a
// smaller "of N" / "/ N" suffix, above an uppercase context line. Pure
// presentation primitive: caller supplies pre-formatted localized strings
// (no formatting logic here). Wiring lands in a follow-up item.
//
// Values transcribed verbatim from the spike:
// - container: flex flex-col items-center, marginTop 22
// - row: flex items-baseline gap-2, tabular-nums (so big + mid digits align)
// - big: fontSize 36, weight 600, letterSpacing -0.01em, color text
// - mid: fontSize 16, weight 500, color text-soft (note: spike uses
//   text-soft here, not muted — slightly stronger than the small caption)
// - small: marginTop 4, fontSize 12, weight 500, letterSpacing 0.14em,
//   uppercase, color muted

export interface FeedbackCountProps {
  // Big primary number, e.g. "47" (Navi current OM) or "2" (Stretch round).
  big: string
  // Smaller baseline-aligned suffix, e.g. "/ 100" or "of 5".
  mid: string
  // Uppercase context line below, e.g. "Round 1 of 3 · Front".
  small: string
  // Accessible label for the live readout region.
  ariaLabel: string
}

export function FeedbackCount({
  big,
  mid,
  small,
  ariaLabel,
}: FeedbackCountProps): ReactElement {
  return (
    <div
      role="status"
      aria-live="polite"
      aria-label={ariaLabel}
      className="flex flex-col items-center"
      style={{ marginTop: 22 }}
    >
      <div
        className="flex items-baseline gap-2"
        style={{ fontVariantNumeric: 'tabular-nums' }}
      >
        <span
          style={{
            fontSize: 36,
            fontWeight: 600,
            letterSpacing: '-0.01em',
            color: 'var(--color-breathing-text)',
          }}
        >
          {big}
        </span>
        <span
          style={{
            fontSize: 16,
            fontWeight: 500,
            color: 'var(--color-breathing-text-soft)',
          }}
        >
          {mid}
        </span>
      </div>
      <span
        className="uppercase"
        style={{
          marginTop: 4,
          fontSize: 12,
          fontWeight: 500,
          letterSpacing: '0.14em',
          color: 'var(--color-breathing-muted)',
        }}
      >
        {small}
      </span>
    </div>
  )
}
