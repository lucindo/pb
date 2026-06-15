import type { ReactElement } from 'react'

export interface SessionCompletionHeadlineProps {
  /** aria-label on the outer <section>, used by harness queries to locate
   *  the readout region. */
  ariaLabel: string
  /** Primary headline ("Session complete"). */
  headline: string
  /** Uppercase tracked subhead ("Take a moment"). */
  subhead: string
  /** Optional aria-label on the inner role=status announcement region. When
   *  omitted, the live region announces using the visible text only. */
  announcementAriaLabel?: string
}

/** Centered "Session complete" headline + uppercased subtitle, role=status
 *  aria-live region. Consumed by SessionReadout. */
export function SessionCompletionHeadline({
  ariaLabel,
  headline,
  subhead,
  announcementAriaLabel,
}: SessionCompletionHeadlineProps): ReactElement {
  return (
    <section aria-label={ariaLabel} className="w-full">
      <div
        role="status"
        aria-label={announcementAriaLabel}
        aria-live="polite"
        aria-atomic="true"
        className="mt-7 flex flex-col items-center"
      >
        <p
          style={{
            fontSize: 22,
            fontWeight: 600,
            letterSpacing: '-0.01em',
            color: 'var(--color-breathing-text)',
          }}
        >
          {headline}
        </p>
        <p
          className="uppercase"
          style={{
            marginTop: 6,
            fontSize: 12,
            fontWeight: 500,
            letterSpacing: '0.16em',
            color: 'var(--color-breathing-muted)',
          }}
        >
          {subhead}
        </p>
      </div>
    </section>
  )
}
