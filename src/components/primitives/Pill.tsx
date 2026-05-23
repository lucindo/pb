import type { MouseEventHandler, ReactNode } from 'react'

export type PillVariant = 'filled' | 'outlined'

export interface PillProps {
  children: ReactNode
  variant?: PillVariant
  active?: boolean
  onClick?: MouseEventHandler<HTMLButtonElement>
  disabled?: boolean
  type?: 'button' | 'submit'
  className?: string
}

const FILLED =
  'bg-[var(--color-breathing-accent-strong)] text-[var(--color-breathing-on-accent)] hover:bg-[var(--color-breathing-accent)] active:bg-[var(--color-breathing-accent)]'

const OUTLINED =
  'border border-[var(--color-breathing-accent)] bg-[var(--color-breathing-surface)] text-[var(--color-breathing-accent-strong)] hover:bg-[var(--color-breathing-bg-soft)] active:bg-[var(--color-breathing-bg-soft)]'

/** Single pill button. `filled` is the primary action treatment (dark
 *  background, light text). `outlined` is the secondary treatment.
 *  `active={true}` forces the filled appearance regardless of variant — used
 *  when a pill is part of a selection group and one is the current value. */
export function Pill({
  children,
  variant = 'filled',
  active = false,
  onClick,
  disabled = false,
  type = 'button',
  className = '',
}: PillProps) {
  const treatment = variant === 'filled' || active ? FILLED : OUTLINED
  return (
    <button
      type={type}
      aria-pressed={active || undefined}
      onClick={onClick}
      disabled={disabled}
      className={`inline-flex min-h-10 items-center justify-center rounded-full px-5 py-2 text-sm font-semibold transition disabled:cursor-not-allowed disabled:opacity-45 motion-reduce:transition-none focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-breathing-accent focus-visible:ring-offset-2 ${treatment} ${className}`.trim()}
    >
      {children}
    </button>
  )
}
