import type { ReactNode } from 'react'

import { MinusIcon } from '../icons/MinusIcon'
import { PlusIcon } from '../icons/PlusIcon'

export interface StepperProps {
  value: number
  onDecrement(this: void): void
  onIncrement(this: void): void
  /** Optional formatter for the displayed value (e.g. "5.5 bpm", "5 min").
   *  When omitted the raw numeric value is rendered with tabular-nums. */
  formatValue?: (value: number) => ReactNode
  decrementLabel: string
  incrementLabel: string
  decrementDisabled?: boolean
  incrementDisabled?: boolean
  className?: string
}

/** Minimal `[−] value [+]` row. No surrounding container or filled value
 *  background — just three inline elements with comfortable spacing. The
 *  buttons are circular icon buttons; the value is centered between them.
 *  Consumer is responsible for clamping the value to its bounds — this
 *  component only emits decrement / increment callbacks. */
export function Stepper({
  value,
  onDecrement,
  onIncrement,
  formatValue,
  decrementLabel,
  incrementLabel,
  decrementDisabled = false,
  incrementDisabled = false,
  className = '',
}: StepperProps) {
  const buttonClass =
    'grid size-8 place-items-center rounded-full text-[var(--color-breathing-accent-strong)] transition hover:bg-[var(--color-breathing-bg-soft)] active:bg-[var(--color-breathing-bg-soft)] disabled:cursor-not-allowed disabled:opacity-45 motion-reduce:transition-none focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-breathing-accent focus-visible:ring-offset-2'
  return (
    <div className={`inline-flex items-center gap-3 ${className}`.trim()}>
      <button
        type="button"
        aria-label={decrementLabel}
        onClick={onDecrement}
        disabled={decrementDisabled}
        className={buttonClass}
      >
        <MinusIcon width={16} height={16} />
      </button>
      <span className="min-w-12 text-center text-base font-medium tabular-nums text-[var(--color-breathing-accent-strong)]">
        {formatValue ? formatValue(value) : value}
      </span>
      <button
        type="button"
        aria-label={incrementLabel}
        onClick={onIncrement}
        disabled={incrementDisabled}
        className={buttonClass}
      >
        <PlusIcon width={16} height={16} />
      </button>
    </div>
  )
}
