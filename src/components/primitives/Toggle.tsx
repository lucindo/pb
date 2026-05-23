export interface ToggleProps {
  checked: boolean
  onChange(this: void, next: boolean): void
  label: string
  disabled?: boolean
  className?: string
}

/** iOS-style toggle: pill-shaped track with a circular knob that slides.
 *  Track is filled with the accent color when on; muted when off. The knob
 *  is a white circle with a subtle shadow. Renders as `role="switch"` so
 *  assistive tech announces it correctly. */
export function Toggle({
  checked,
  onChange,
  label,
  disabled = false,
  className = '',
}: ToggleProps) {
  return (
    <button
      type="button"
      role="switch"
      aria-checked={checked}
      aria-label={label}
      disabled={disabled}
      onClick={() => {
        onChange(!checked)
      }}
      className={`relative inline-flex h-6 w-11 items-center rounded-full transition disabled:cursor-not-allowed disabled:opacity-45 motion-reduce:transition-none focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-breathing-accent focus-visible:ring-offset-2 ${
        checked
          ? 'bg-[var(--color-breathing-accent-strong)]'
          : 'bg-[var(--color-breathing-muted)]'
      } ${className}`.trim()}
    >
      <span
        aria-hidden="true"
        className={`inline-block size-5 transform rounded-full bg-[var(--color-breathing-surface)] shadow-sm transition motion-reduce:transition-none ${
          checked ? 'translate-x-[1.375rem]' : 'translate-x-0.5'
        }`}
      />
    </button>
  )
}
