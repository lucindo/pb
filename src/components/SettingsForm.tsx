import {
  BPM_OPTIONS,
  DURATION_OPTIONS,
  RATIO_OPTIONS,
  type DurationOption,
  type RatioLabel,
  type SessionSettings,
} from '../domain/settings'
import type { UiStrings } from '../content/strings'
import { SettingsStepper } from './SettingsStepper'

export interface SettingsFormProps {
  settings: SessionSettings
  isRunning: boolean
  onChange(this: void, settings: SessionSettings): void
  onExtendDuration(this: void, durationMinutes: number): void
  strings: UiStrings['settingsForm']
}

export function SettingsForm({
  settings,
  isRunning,
  onChange,
  onExtendDuration,
  strings,
}: SettingsFormProps) {
  const formatBpm = (value: number): string => `${String(value)} ${strings.bpmUnit}`
  const formatDuration = (value: DurationOption): string =>
    value === 'open-ended' ? strings.openEndedLabel : `${String(value)} ${strings.minutesUnit}`

  const durationOptions = DURATION_OPTIONS as readonly DurationOption[]
  const durationIndex = durationOptions.indexOf(settings.durationMinutes)
  const nextDuration = durationOptions[durationIndex + 1]

  const updateSettings = (nextSettings: Partial<SessionSettings>) => {
    onChange({ ...settings, ...nextSettings })
  }

  const updateDuration = (durationMinutes: DurationOption) => {
    if (isRunning) {
      if (typeof durationMinutes === 'number') {
        onExtendDuration(durationMinutes)
      }
      return
    }

    updateSettings({ durationMinutes })
  }

  return (
    <div className="grid w-full gap-4" aria-label={strings.ariaLabel}>
      {!isRunning && (
        <>
          <SettingsStepper
            label={strings.bpmLabel}
            value={settings.bpm}
            options={BPM_OPTIONS}
            formatValue={formatBpm}
            onChange={(bpm) => { updateSettings({ bpm }) }}
            strings={strings.stepper}
          />
          <SettingsStepper<RatioLabel>
            label={strings.ratioLabel}
            value={settings.ratio}
            options={RATIO_OPTIONS}
            onChange={(ratio) => { updateSettings({ ratio }) }}
            strings={strings.stepper}
          />
        </>
      )}
      <SettingsStepper<DurationOption>
        label={strings.durationLabel}
        value={settings.durationMinutes}
        options={durationOptions}
        formatValue={formatDuration}
        onChange={updateDuration}
        disableDecrease={isRunning}
        disableIncrease={isRunning && typeof nextDuration !== 'number'}
        strings={strings.stepper}
      />
    </div>
  )
}
