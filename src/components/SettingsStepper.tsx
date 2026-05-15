import type { UiStrings } from '../content/strings'

export interface SettingsStepperProps<T extends string | number> {
  label: string
  value: T
  options: readonly T[]
  formatValue?: (value: T) => string
  onChange(this: void, value: T): void
  disabled?: boolean
  disableDecrease?: boolean
  disableIncrease?: boolean
  /** When true, render only the value (no +/- buttons) — a read-only display field. */
  readOnly?: boolean
  strings: UiStrings['settingsForm']['stepper']
}

export function SettingsStepper<T extends string | number>({
  label,
  value,
  options,
  formatValue = String,
  onChange,
  disabled = false,
  disableDecrease = false,
  disableIncrease = false,
  readOnly = false,
  strings,
}: SettingsStepperProps<T>) {
  const selectedIndex = options.indexOf(value)
  const canDecrease = selectedIndex > 0
  const canIncrease = selectedIndex >= 0 && selectedIndex < options.length - 1

  const changeBy = (offset: -1 | 1) => {
    const nextValue = options.at(selectedIndex + offset)
    if (nextValue !== undefined) {
      onChange(nextValue)
    }
  }

  if (readOnly) {
    return (
      <fieldset
        aria-label={strings.fieldAriaLabel(label)}
        className="rounded-3xl border border-[var(--color-breathing-muted)] bg-[var(--color-breathing-surface)]/80 p-4 shadow-sm shadow-teal-900/5"
      >
        <legend className="px-1 text-sm font-semibold uppercase tracking-[0.18em] text-[var(--color-breathing-muted)]">
          {label}
        </legend>
        <div className="mt-3 flex items-center justify-center">
          <output
            aria-live="polite"
            className="min-w-32 rounded-2xl bg-[var(--color-breathing-bg-soft)] px-4 py-3 text-center text-2xl font-semibold text-[var(--color-breathing-accent-strong)]"
          >
            {formatValue(value)}
          </output>
        </div>
      </fieldset>
    )
  }

  return (
    <fieldset
      aria-label={strings.fieldAriaLabel(label)}
      className="rounded-3xl border border-[var(--color-breathing-muted)] bg-[var(--color-breathing-surface)]/80 p-4 shadow-sm shadow-teal-900/5"
    >
      <legend className="px-1 text-sm font-semibold uppercase tracking-[0.18em] text-[var(--color-breathing-muted)]">
        {label}
      </legend>
      <div className="mt-3 flex items-center justify-between gap-3">
        <button
          type="button"
          aria-label={strings.decreaseLabel(label)}
          className="grid size-12 min-h-11 min-w-11 place-items-center rounded-full border border-[var(--color-breathing-accent)] bg-[var(--color-breathing-surface)] text-2xl leading-none text-[var(--color-breathing-accent-strong)] shadow-sm transition hover:bg-[var(--color-breathing-bg-soft)] active:bg-[var(--color-breathing-bg-soft)] motion-reduce:transition-none focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-breathing-accent focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-45"
          disabled={disabled || disableDecrease || !canDecrease}
          onClick={() => { changeBy(-1) }}
        >
          −
        </button>
        <output
          aria-live="polite"
          className="min-w-32 rounded-2xl bg-[var(--color-breathing-bg-soft)] px-4 py-3 text-center text-2xl font-semibold text-[var(--color-breathing-accent-strong)]"
        >
          {formatValue(value)}
        </output>
        <button
          type="button"
          aria-label={strings.increaseLabel(label)}
          className="grid size-12 min-h-11 min-w-11 place-items-center rounded-full border border-[var(--color-breathing-accent)] bg-[var(--color-breathing-surface)] text-2xl leading-none text-[var(--color-breathing-accent-strong)] shadow-sm transition hover:bg-[var(--color-breathing-bg-soft)] active:bg-[var(--color-breathing-bg-soft)] motion-reduce:transition-none focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-breathing-accent focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-45"
          disabled={disabled || disableIncrease || !canIncrease}
          onClick={() => { changeBy(1) }}
        >
          +
        </button>
      </div>
    </fieldset>
  )
}
