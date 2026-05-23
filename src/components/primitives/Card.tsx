import type { ReactNode } from 'react'

export type CardPadding = 'none' | 'sm' | 'md' | 'lg'
export type CardElevation = 'none' | 'card' | 'modal'

const PADDING_CLASS: Record<CardPadding, string> = {
  none: '',
  sm: 'p-4',
  md: 'p-6',
  lg: 'p-8',
}

const ELEVATION_CLASS: Record<CardElevation, string> = {
  none: '',
  card: 'shadow-[var(--shadow-card)]',
  modal: 'shadow-[var(--shadow-modal)]',
}

export interface CardProps {
  children: ReactNode
  padding?: CardPadding
  elevation?: CardElevation
  className?: string
}

/** Rounded surface card backed by `--color-breathing-surface` and a theme
 *  shadow token. Sensible defaults: `md` padding, `card` elevation. */
export function Card({
  children,
  padding = 'md',
  elevation = 'card',
  className = '',
}: CardProps) {
  return (
    <div
      className={`rounded-3xl bg-[var(--color-breathing-surface)] ${PADDING_CLASS[padding]} ${ELEVATION_CLASS[elevation]} ${className}`.trim()}
    >
      {children}
    </div>
  )
}
