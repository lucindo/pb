import {
  BPM_OPTIONS,
  DURATION_OPTIONS,
  RATIO_OPTIONS,
  type DurationOption,
  type RatioLabel,
  type SessionSettings,
} from '../domain/settings'
import { SettingsStepper } from './SettingsStepper'

export interface SettingsFormProps {
  settings: SessionSettings
  isRunning: boolean
  onChange(settings: SessionSettings): void
  onExtendDuration(durationMinutes: number): void
}

function formatBpm(value: number): string {
  return `${value} BPM`
}

function formatDuration(value: DurationOption): string {
  return value === 'open-ended' ? 'Open-ended' : `${value} min`
}

export function SettingsForm({
  settings,
  isRunning,
  onChange,
  onExtendDuration,
}: SettingsFormProps) {
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
    <div className="grid w-full gap-4" aria-label="Session settings">
      <SettingsStepper
        label="BPM"
        value={settings.bpm}
        options={BPM_OPTIONS}
        formatValue={formatBpm}
        onChange={(bpm) => updateSettings({ bpm })}
        disabled={isRunning}
      />
      <SettingsStepper<RatioLabel>
        label="Ratio"
        value={settings.ratio}
        options={RATIO_OPTIONS}
        onChange={(ratio) => updateSettings({ ratio })}
        disabled={isRunning}
      />
      <SettingsStepper<DurationOption>
        label="Duration"
        value={settings.durationMinutes}
        options={durationOptions}
        formatValue={formatDuration}
        onChange={updateDuration}
        disableDecrease={isRunning}
        disableIncrease={isRunning && typeof nextDuration !== 'number'}
      />
    </div>
  )
}
