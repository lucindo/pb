import type { ReactElement } from 'react'

import { SegmentedControl, type SegmentedControlOption } from './primitives/SegmentedControl'

export interface SettingsSegmentedRowProps<T extends string> {
  label: string
  ariaLabel: string
  value: T
  onChange(this: void, next: T): void
  options: ReadonlyArray<SegmentedControlOption<T>>
  disabled?: boolean
}

// Spike 010 SegmentedControl row (index.html L1527-1554): label on its own
// line above a full-width segmented pill, with the same border-t / py-3
// row chrome as the Stepper rows so settings sheets read as a single stack.
// The fieldset wrapper preserves role="group" for settingGroup() queries.
export function SettingsSegmentedRow<T extends string>({
  label,
  ariaLabel,
  value,
  onChange,
  options,
  disabled = false,
}: SettingsSegmentedRowProps<T>): ReactElement {
  return (
    <fieldset
      aria-label={ariaLabel}
      className="flex flex-col gap-2 border-t border-[var(--color-border-soft)] py-3"
    >
      <span className="text-[15px] font-normal text-[var(--color-breathing-text)]">{label}</span>
      <SegmentedControl<T>
        options={options}
        value={value}
        onChange={onChange}
        ariaLabel={ariaLabel}
        disabled={disabled}
      />
    </fieldset>
  )
}
