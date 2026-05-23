import type { ReactNode } from 'react'

export interface SegmentedControlOption<T extends string> {
  id: T
  label: string
  /** Optional glyph rendered to the left of the label. Use for icon-bearing
   *  segments (e.g. ☀️ Light / 🌙 Dark). */
  glyph?: ReactNode
}

export interface SegmentedControlProps<T extends string> {
  options: ReadonlyArray<SegmentedControlOption<T>>
  value: T
  onChange(this: void, next: T): void
  ariaLabel: string
  className?: string
}

/** Unified outer pill container with N internal segments meeting at internal
 *  dividers (no gap between segments). Active segment is filled-dark with
 *  light text; inactive segments are transparent over the outer container's
 *  muted background. Used for Theme / Language / Ratio / similar single-select
 *  controls where the option set is small and known. */
export function SegmentedControl<T extends string>({
  options,
  value,
  onChange,
  ariaLabel,
  className = '',
}: SegmentedControlProps<T>) {
  return (
    <div
      role="radiogroup"
      aria-label={ariaLabel}
      className={`inline-flex w-full items-center rounded-full bg-[var(--color-breathing-bg-soft)] p-1 ${className}`.trim()}
    >
      {options.map((option) => {
        const isActive = option.id === value
        return (
          <button
            key={option.id}
            type="button"
            role="radio"
            aria-checked={isActive}
            onClick={() => {
              onChange(option.id)
            }}
            className={`inline-flex flex-1 items-center justify-center gap-1.5 rounded-full px-4 py-2 text-sm font-semibold transition motion-reduce:transition-none focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-breathing-accent focus-visible:ring-offset-2 ${
              isActive
                ? 'bg-[var(--color-breathing-accent-strong)] text-[var(--color-breathing-on-accent)] shadow-sm'
                : 'text-[var(--color-breathing-muted)] hover:text-[var(--color-breathing-accent-strong)]'
            }`}
          >
            {option.glyph !== undefined && <span aria-hidden="true">{option.glyph}</span>}
            <span>{option.label}</span>
          </button>
        )
      })}
    </div>
  )
}
