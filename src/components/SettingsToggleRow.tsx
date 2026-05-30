import type { ReactElement } from 'react'

import { Toggle } from './primitives/Toggle'
import { SettingsRow } from './SettingsRow'

export interface SettingsToggleRowProps {
  label: string
  ariaLabel: string
  checked: boolean
  onChange(this: void, next: boolean): void
  disabled?: boolean
}

// Toggle row: label left / iOS-style switch right, py-3 / 1 px border-soft
// top — same row chrome as Stepper. The fieldset wrapper exposes role="group"
// for settingGroup() queries.
export function SettingsToggleRow({
  label,
  ariaLabel,
  checked,
  onChange,
  disabled = false,
}: SettingsToggleRowProps): ReactElement {
  return (
    <SettingsRow label={label} ariaLabel={ariaLabel} className="flex items-center justify-between">
      <Toggle checked={checked} onChange={onChange} label={ariaLabel} disabled={disabled} />
    </SettingsRow>
  )
}
