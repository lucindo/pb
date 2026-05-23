import type { ReactNode } from 'react'

export interface EyebrowProps {
  children: ReactNode
  className?: string
}

/** Small uppercase tracked muted label used as a section divider above a card
 *  group. Tracking + size matches the typographic convention from the v2.0
 *  spike (small, letter-spaced, low-contrast muted color). */
export function Eyebrow({ children, className = '' }: EyebrowProps) {
  return (
    <p
      className={`text-xs font-semibold uppercase tracking-[0.16em] text-[var(--color-breathing-muted)] ${className}`.trim()}
    >
      {children}
    </p>
  )
}
