import type { ReactElement } from 'react'

// Pattern Breathing time-based readout. Big remaining-time number above a small uppercase
// pace caption. Pure presentation primitive: caller supplies pre-formatted
// localized strings (no formatting logic here).
//
// Locked layout values:
// - container: flex flex-col items-center, marginTop 28
// - primary: fontSize 28, weight 500, letterSpacing 0.04em, tabular-nums, color text
// - secondary: marginTop 6, fontSize 12, weight 500, letterSpacing 0.16em,
//   uppercase, color muted

export interface FeedbackTimeProps {
  // Big top-line value, e.g. "02:51" (remaining) or "12:34" (elapsed).
  primary: string
  // Small uppercase caption underneath, e.g. "5.5 BPM · 1:1".
  secondary: string
  // Accessible label for the live readout region.
  ariaLabel: string
}

export function FeedbackTime({
  primary,
  secondary,
  ariaLabel,
}: FeedbackTimeProps): ReactElement {
  return (
    <div
      role="status"
      aria-live="off"
      aria-label={ariaLabel}
      className="flex flex-col items-center"
      style={{ marginTop: 28 }}
    >
      <span
        style={{
          fontSize: 28,
          fontWeight: 500,
          letterSpacing: '0.04em',
          color: 'var(--color-breathing-text)',
          fontVariantNumeric: 'tabular-nums',
        }}
      >
        {primary}
      </span>
      <span
        className="uppercase"
        style={{
          marginTop: 6,
          fontSize: 12,
          fontWeight: 500,
          letterSpacing: '0.16em',
          color: 'var(--color-breathing-muted)',
        }}
      >
        {secondary}
      </span>
    </div>
  )
}
