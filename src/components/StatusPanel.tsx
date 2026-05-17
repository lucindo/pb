import type { ReactNode } from 'react'

// Shared bordered panel for the session status area below the shape — used by
// the resonant SessionReadout (countdown + running + completion) and the Navi
// Kriya NKSessionReadout. Carries a "Status" legend styled like the settings
// steppers' field legends (DURATION, BPM, …) so the box is visually consistent
// with the rest of the card.

export interface StatusPanelProps {
  /** Visible legend text (e.g. "Status"), rendered on the top border. */
  legend: string
  /** Accessible name for the panel region. */
  ariaLabel: string
  /** Optional aria-live politeness for the whole panel (NK readout uses it). */
  ariaLive?: 'polite' | 'off'
  children: ReactNode
}

export function StatusPanel({ legend, ariaLabel, ariaLive, children }: StatusPanelProps) {
  return (
    <section
      aria-label={ariaLabel}
      aria-live={ariaLive}
      className="relative mb-6 rounded-[1.75rem] border border-[var(--color-breathing-muted)] bg-[var(--color-breathing-bg-soft)]/80 p-5 text-center shadow-inner shadow-teal-900/5"
    >
      {/* Legend on the top border — mirrors SettingsStepper's <legend>. The
          panel region is already named via aria-label, so this visual header
          is aria-hidden to avoid a redundant screen-reader announcement. The
          surface background masks the border line behind the text. */}
      <p
        aria-hidden="true"
        className="absolute -top-2.5 left-1/2 -translate-x-1/2 bg-[var(--color-breathing-surface)] px-2 text-sm font-semibold uppercase tracking-[0.18em] text-[var(--color-breathing-muted)]"
      >
        {legend}
      </p>
      {children}
    </section>
  )
}
