import type { ReactElement } from 'react'

import type { UiStrings } from '../content/strings'
import {
  NK_FRONT_COUNT_OPTIONS,
  NK_ROUNDS_OPTIONS,
  OM_LENGTH_OPTIONS,
  type NaviKriyaSettings,
  type OmLength,
} from '../domain/naviKriyaSettings'
import { estimateNaviKriyaDurationMinutes } from '../domain/naviKriyaSession'
import { BooleanToggle } from './BooleanToggle'
import { SettingsFormShell } from './SettingsFormShell'
import { SettingsStepper } from './SettingsStepper'

export interface NaviKriyaSettingsFormProps {
  settings: NaviKriyaSettings
  onChange(this: void, settings: NaviKriyaSettings): void
  strings: UiStrings['settingsForm']
  nkControlsStrings: UiStrings['nkControls']
}

export function NaviKriyaSettingsForm({
  settings,
  onChange,
  strings,
  nkControlsStrings,
}: NaviKriyaSettingsFormProps): ReactElement {
  const formatOmLength = (value: OmLength): string =>
    value === 'fast'
      ? nkControlsStrings.omLengthFast
      : value === 'slow'
        ? nkControlsStrings.omLengthSlow
        : nkControlsStrings.omLengthMedium

  const updateNkSettings = (next: Partial<NaviKriyaSettings>): void => {
    onChange({ ...settings, ...next })
  }

  const estimatedMinutes = estimateNaviKriyaDurationMinutes(settings)

  return (
    <SettingsFormShell ariaLabel={strings.ariaLabel}>
      <SettingsStepper<number>
        label={nkControlsStrings.roundsLabel}
        value={settings.rounds}
        options={NK_ROUNDS_OPTIONS}
        onChange={(rounds) => { updateNkSettings({ rounds }) }}
        strings={strings.stepper}
      />
      <SettingsStepper<number>
        label={nkControlsStrings.frontCountLabel}
        value={settings.frontCount}
        options={NK_FRONT_COUNT_OPTIONS}
        onChange={(frontCount) => { updateNkSettings({ frontCount }) }}
        strings={strings.stepper}
      />
      <SettingsStepper<OmLength>
        label={nkControlsStrings.omLengthLabel}
        value={settings.omLength}
        options={OM_LENGTH_OPTIONS}
        formatValue={formatOmLength}
        onChange={(omLength) => { updateNkSettings({ omLength }) }}
        strings={strings.stepper}
      />
      <BooleanToggle
        isStretch={settings.perOmCue}
        modeLabel={nkControlsStrings.perOmCueLabel}
        standardLabel={nkControlsStrings.perOmCueOff}
        stretchLabel={nkControlsStrings.perOmCueOn}
        onChange={(perOmCue) => { updateNkSettings({ perOmCue }) }}
      />
      <p
        aria-live="polite"
        className="text-center text-sm text-[var(--color-breathing-muted)]"
      >
        {nkControlsStrings.estimatedDuration(estimatedMinutes)}
      </p>
    </SettingsFormShell>
  )
}
