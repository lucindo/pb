import type { ReactElement } from 'react'

import { Toggle } from './primitives/Toggle'

export interface SettingsToggleRowProps {
  label: string
  ariaLabel: string
  checked: boolean
  onChange(this: void, next: boolean): void
  disabled?: boolean
}

// Spike 010 toggle row (index.html L1870-1873): label left / iOS-style
// switch right, py-3 / 1 px border-soft top — same row chrome as Stepper.
// The fieldset wrapper exposes role="group" for settingGroup() queries.
export function SettingsToggleRow({
  label,
  ariaLabel,
  checked,
  onChange,
  disabled = false,
}: SettingsToggleRowProps): ReactElement {
  return (
    <fieldset
      aria-label={ariaLabel}
      className="flex items-center justify-between border-t border-[var(--color-border-soft)] py-3"
    >
      <span className="text-[15px] font-normal text-[var(--color-breathing-text)]">{label}</span>
      <Toggle checked={checked} onChange={onChange} label={ariaLabel} disabled={disabled} />
    </fieldset>
  )
}
