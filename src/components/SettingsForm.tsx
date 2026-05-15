import {
  BPM_OPTIONS,
  DURATION_OPTIONS,
  HOLD_SECONDS_OPTIONS,
  HOLD_TARGET_OPTIONS,
  MODE_OPTIONS,
  RAMP_DURATION_OPTIONS,
  RATIO_OPTIONS,
  STRETCH_INITIAL_BPM_OPTIONS,
  type DurationOption,
  type HoldSecondsOption,
  type HoldTargetOption,
  type RatioLabel,
  type SessionMode,
  type SessionSettings,
} from '../domain/settings'
import { computeStretchTotalMs, isStretchGateClear } from '../domain/stretchRamp'
import { formatDuration as formatTotalMs } from '../domain/sessionMath'
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
  const formatHoldSeconds = (value: HoldSecondsOption): string =>
    value === 0 ? strings.holdNoneLabel : `${String(value)}s`
  const formatHoldTarget = (value: HoldTargetOption): string => {
    if (value === 'open-ended') return strings.holdOpenEndedLabel
    if (value === 0) return strings.holdNoneLabel
    return `${String(value)}s`
  }
  const formatRamp = (value: number): string => `${String(value)} ${strings.minutesUnit}`
  const formatMode = (value: SessionMode): string =>
    value === 'stretch' ? strings.modeStretch : strings.modeStandard

  const durationOptions = DURATION_OPTIONS as readonly DurationOption[]
  const durationIndex = durationOptions.indexOf(settings.durationMinutes)
  const nextDuration = durationOptions[durationIndex + 1]

  const isStretch = settings.mode === 'stretch'
  const gateClear = isStretchGateClear(settings)
  // targetBpm is constrained to a strictly-down ramp (D-01): only BPM values
  // below the current initialBpm are selectable.
  const targetBpmOptions = (BPM_OPTIONS as readonly number[]).filter((v) => v < settings.initialBpm)
  const stretchTotalMs = computeStretchTotalMs(settings)

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

  // Lowering initialBpm can leave the current targetBpm at or above it; correct
  // it down to the highest valid option below the new initialBpm (Interaction Contract).
  const updateInitialBpm = (initialBpm: number) => {
    if (settings.targetBpm >= initialBpm) {
      const validTargets = (BPM_OPTIONS as readonly number[]).filter((v) => v < initialBpm)
      const corrected = validTargets[validTargets.length - 1]
      updateSettings({ initialBpm, targetBpm: corrected })
      return
    }
    updateSettings({ initialBpm })
  }

  return (
    <div className="grid w-full gap-4" aria-label={strings.ariaLabel}>
      {!isRunning && (
        <>
          {/* D-05: Standard/Stretch mode picker — a two-option stepper, not a toggle. */}
          <SettingsStepper<SessionMode>
            label={strings.sessionModeLabel}
            value={settings.mode}
            options={MODE_OPTIONS}
            formatValue={formatMode}
            onChange={(mode) => { updateSettings({ mode }) }}
            disableIncrease={!gateClear}
            strings={strings.stepper}
          />
          {/* D-12: gate the →Stretch direction with a visible hint, not a silent disable. */}
          {!gateClear && (
            <p className="mt-1 text-center text-sm font-normal text-[var(--color-breathing-muted)]">
              {strings.stretchGateHint}
            </p>
          )}
          {/* D-06: in Stretch mode the single bpm stepper is swapped for the 5 stretch fields. */}
          {isStretch ? (
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
              <SettingsStepper<HoldSecondsOption>
                label={strings.holdInitialLabel}
                value={settings.holdInitialSeconds}
                options={HOLD_SECONDS_OPTIONS}
                formatValue={formatHoldSeconds}
                onChange={(holdInitialSeconds) => { updateSettings({ holdInitialSeconds }) }}
                strings={strings.stepper}
              />
              <SettingsStepper
                label={strings.rampDurationLabel}
                value={settings.rampDurationMinutes}
                options={RAMP_DURATION_OPTIONS}
                formatValue={formatRamp}
                onChange={(rampDurationMinutes) => { updateSettings({ rampDurationMinutes }) }}
                strings={strings.stepper}
              />
              <SettingsStepper<HoldTargetOption>
                label={strings.holdTargetLabel}
                value={settings.holdTargetSeconds}
                options={HOLD_TARGET_OPTIONS}
                formatValue={formatHoldTarget}
                onChange={(holdTargetSeconds) => { updateSettings({ holdTargetSeconds }) }}
                strings={strings.stepper}
              />
            </>
          ) : (
            <SettingsStepper
              label={strings.bpmLabel}
              value={settings.bpm}
              options={BPM_OPTIONS}
              formatValue={formatBpm}
              onChange={(bpm) => { updateSettings({ bpm }) }}
              strings={strings.stepper}
            />
          )}
          {/* Ratio stepper stays visible in BOTH modes (D-06). */}
          <SettingsStepper<RatioLabel>
            label={strings.ratioLabel}
            value={settings.ratio}
            options={RATIO_OPTIONS}
            onChange={(ratio) => { updateSettings({ ratio }) }}
            strings={strings.stepper}
          />
          {/* D-08: live computed-total readout — D-02 sum of holdInitial + ramp + holdTarget. */}
          {isStretch && (
            <p
              aria-live="polite"
              className="mt-2 text-center text-sm font-semibold uppercase tracking-[0.18em] text-[var(--color-breathing-accent-strong)]"
            >
              {stretchTotalMs === null
                ? strings.totalOpenEndedLabel
                : `${strings.totalLabel} ${formatTotalMs(stretchTotalMs)}`}
            </p>
          )}
        </>
      )}
      {/* UI-SPEC "Duration stepper in stretch mode": the standard duration stepper is
          hidden in stretch mode — the computed-total readout is the duration surface
          there and durationMinutes is unused by the stretch engine. */}
      {settings.mode === 'standard' && (
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
