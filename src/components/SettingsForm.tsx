import {
  BPM_OPTIONS,
  COOLDOWN_OPTIONS,
  DURATION_OPTIONS,
  RAMP_DURATION_OPTIONS,
  RATIO_OPTIONS,
  STRETCH_INITIAL_BPM_OPTIONS,
  WARMUP_MINUTES_OPTIONS,
  type CoolDownMinutes,
  type DurationOption,
  type RatioLabel,
  type SessionSettings,
  type WarmUpMinutes,
} from '../domain/settings'
import { computeStretchTotalMs } from '../domain/stretchRamp'
import type { UiStrings } from '../content/strings'
import { ModeToggle } from './ModeToggle'
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
  const formatMinutes = (value: number): string => `${String(value)} ${strings.minutesUnit}`
  const formatDuration = (value: DurationOption): string =>
    value === 'open-ended' ? strings.openEndedLabel : `${String(value)} ${strings.minutesUnit}`
  const formatCoolDown = (value: CoolDownMinutes): string =>
    value === 'open-ended' ? strings.holdOpenEndedLabel : `${String(value)} ${strings.minutesUnit}`

  const durationOptions = DURATION_OPTIONS as readonly DurationOption[]
  const durationIndex = durationOptions.indexOf(settings.durationMinutes)
  const nextDuration = durationOptions[durationIndex + 1]

  const isStretch = settings.mode === 'stretch'
  // D-01: targetBpm is a strictly-down ramp — only BPM values below initialBpm.
  const targetBpmOptions = (BPM_OPTIONS as readonly number[]).filter((v) => v < settings.initialBpm)
  // The stretch Duration box is read-only: warm-up + ramp + cool-down summed.
  const stretchTotalMs = computeStretchTotalMs(settings)
  const stretchDurationText = stretchTotalMs === null
    ? strings.openEndedLabel
    : `${String(stretchTotalMs / 60_000)} ${strings.minutesUnit}`

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

  // Lowering initialBpm can leave targetBpm at or above it; correct it down to
  // the highest valid option below the new initialBpm (Interaction Contract).
  const updateInitialBpm = (initialBpm: number) => {
    if (settings.targetBpm >= initialBpm) {
      const validTargets = (BPM_OPTIONS as readonly number[]).filter((v) => v < initialBpm)
      updateSettings({ initialBpm, targetBpm: validTargets[validTargets.length - 1] })
      return
    }
    updateSettings({ initialBpm })
  }

  return (
    <div className="grid w-full gap-4" aria-label={strings.ariaLabel}>
      {/* D-05: Standard/Stretch switch — next-session-only, hidden while running. */}
      {!isRunning && (
        <ModeToggle
          isStretch={isStretch}
          modeLabel={strings.sessionModeLabel}
          standardLabel={strings.modeStandard}
          stretchLabel={strings.modeStretch}
          onChange={(toStretch) => { updateSettings({ mode: toStretch ? 'stretch' : 'standard' }) }}
        />
      )}
      {!isRunning && (isStretch ? (
        <>
          <SettingsStepper
            label={strings.initialBpmLabel}
            value={settings.initialBpm}
            options={STRETCH_INITIAL_BPM_OPTIONS}
            formatValue={formatBpm}
            onChange={updateInitialBpm}
            strings={strings.stepper}
          />
          <SettingsStepper
            label={strings.targetBpmLabel}
            value={settings.targetBpm}
            options={targetBpmOptions}
            formatValue={formatBpm}
            onChange={(targetBpm) => { updateSettings({ targetBpm }) }}
            strings={strings.stepper}
          />
          <SettingsStepper<RatioLabel>
            label={strings.ratioLabel}
            value={settings.ratio}
            options={RATIO_OPTIONS}
            onChange={(ratio) => { updateSettings({ ratio }) }}
            strings={strings.stepper}
          />
          <SettingsStepper<WarmUpMinutes>
            label={strings.holdInitialLabel}
            value={settings.warmUpMinutes}
            options={WARMUP_MINUTES_OPTIONS}
            formatValue={formatMinutes}
            onChange={(warmUpMinutes) => { updateSettings({ warmUpMinutes }) }}
            strings={strings.stepper}
          />
          <SettingsStepper
            label={strings.rampDurationLabel}
            value={settings.rampDurationMinutes}
            options={RAMP_DURATION_OPTIONS}
            formatValue={formatMinutes}
            onChange={(rampDurationMinutes) => { updateSettings({ rampDurationMinutes }) }}
            strings={strings.stepper}
          />
          <SettingsStepper<CoolDownMinutes>
            label={strings.holdTargetLabel}
            value={settings.coolDownMinutes}
            options={COOLDOWN_OPTIONS}
            formatValue={formatCoolDown}
            onChange={(coolDownMinutes) => { updateSettings({ coolDownMinutes }) }}
            strings={strings.stepper}
          />
        </>
      ) : (
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
      ))}
      {/* Duration: read-only computed total in stretch mode (warm-up + ramp +
          cool-down); the extendable stepper in standard mode. */}
      {isStretch ? (
        <SettingsStepper<string>
          label={strings.durationLabel}
          value={stretchDurationText}
          options={[stretchDurationText]}
          readOnly
          onChange={() => undefined}
          strings={strings.stepper}
        />
      ) : (
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
      )}
    </div>
  )
}
