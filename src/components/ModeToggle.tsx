export interface ModeToggleProps {
  isStretch: boolean
  modeLabel: string
  standardLabel: string
  stretchLabel: string
  onChange(this: void, isStretch: boolean): void
}

// Compact iOS-style switch replacing the bulky +/- stepper for the
// Standard/Stretch mode choice. Both labels stay visible; the active one
// is emphasized. `role="switch"` + `aria-checked` for assistive tech.
export function ModeToggle({
  isStretch,
  modeLabel,
  standardLabel,
  stretchLabel,
  onChange,
}: ModeToggleProps) {
  const sideLabel = (active: boolean) =>
    `text-sm font-semibold uppercase tracking-[0.18em] ${
      active
        ? 'text-[var(--color-breathing-accent-strong)]'
        : 'text-[var(--color-breathing-muted)]'
    }`

  return (
    <fieldset
      aria-label={modeLabel}
      className="rounded-3xl border border-[var(--color-breathing-muted)] bg-[var(--color-breathing-surface)]/80 p-4 shadow-sm shadow-teal-900/5"
    >
      <legend className="px-1 text-sm font-semibold uppercase tracking-[0.18em] text-[var(--color-breathing-muted)]">
        {modeLabel}
      </legend>
      <div className="mt-3 flex items-center justify-center gap-4">
        <span className={sideLabel(!isStretch)}>{standardLabel}</span>
        <button
          type="button"
          role="switch"
          aria-checked={isStretch}
          aria-label={modeLabel}
          onClick={() => { onChange(!isStretch) }}
          className="relative inline-flex h-8 w-14 shrink-0 items-center rounded-full border border-[var(--color-breathing-accent)] bg-[var(--color-breathing-bg-soft)] transition motion-reduce:transition-none focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-breathing-accent focus-visible:ring-offset-2"
        >
          <span
            className={`inline-block size-6 rounded-full bg-[var(--color-breathing-accent-strong)] shadow transition motion-reduce:transition-none ${
              isStretch ? 'translate-x-7' : 'translate-x-1'
            }`}
          />
        </button>
        <span className={sideLabel(isStretch)}>{stretchLabel}</span>
      </div>
    </fieldset>
  )
}
