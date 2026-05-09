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
}

function formatBpm(value: number): string {
  return `${value} BPM`
}

function formatDuration(value: DurationOption): string {
  return value === 'open-ended' ? 'Open-ended' : `${value} min`
}

export function SettingsForm({ settings, isRunning, onChange }: SettingsFormProps) {
  const updateSettings = (nextSettings: Partial<SessionSettings>) => {
    onChange({ ...settings, ...nextSettings })
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
        options={DURATION_OPTIONS}
        formatValue={formatDuration}
        onChange={(durationMinutes) => updateSettings({ durationMinutes })}
      />
    </div>
  )
}
