export interface SettingsStepperProps<T extends string | number> {
  label: string
  value: T
  options: readonly T[]
  formatValue?: (value: T) => string
  onChange(value: T): void
  disabled?: boolean
}

export function SettingsStepper<T extends string | number>({
  label,
  value,
  options,
  formatValue = String,
  onChange,
  disabled = false,
}: SettingsStepperProps<T>) {
  const selectedIndex = options.indexOf(value)
  const canDecrease = selectedIndex > 0
  const canIncrease = selectedIndex >= 0 && selectedIndex < options.length - 1

  const changeBy = (offset: -1 | 1) => {
    const nextValue = options[selectedIndex + offset]
    if (nextValue !== undefined) {
      onChange(nextValue)
    }
  }

  return (
    <fieldset
      aria-label={label}
      className="rounded-3xl border border-teal-100 bg-white/80 p-4 shadow-sm shadow-teal-900/5"
    >
      <legend className="px-1 text-sm font-semibold uppercase tracking-[0.18em] text-slate-600">
        {label}
      </legend>
      <div className="mt-3 flex items-center justify-between gap-3">
        <button
          type="button"
          aria-label={`Decrease ${label}`}
          className="grid size-12 place-items-center rounded-full border border-teal-200 bg-white text-2xl leading-none text-teal-800 shadow-sm transition hover:bg-teal-50 focus:outline-none focus:ring-4 focus:ring-teal-200 disabled:cursor-not-allowed disabled:opacity-45"
          disabled={disabled || !canDecrease}
          onClick={() => changeBy(-1)}
        >
          −
        </button>
        <output
          aria-live="polite"
          className="min-w-32 rounded-2xl bg-teal-50 px-4 py-3 text-center text-2xl font-semibold text-slate-950"
        >
          {formatValue(value)}
        </output>
        <button
          type="button"
          aria-label={`Increase ${label}`}
          className="grid size-12 place-items-center rounded-full border border-teal-200 bg-white text-2xl leading-none text-teal-800 shadow-sm transition hover:bg-teal-50 focus:outline-none focus:ring-4 focus:ring-teal-200 disabled:cursor-not-allowed disabled:opacity-45"
          disabled={disabled || !canIncrease}
          onClick={() => changeBy(1)}
        >
          +
        </button>
      </div>
    </fieldset>
  )
}
