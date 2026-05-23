import type { ReactElement } from 'react'

import {
  BPM_OPTIONS,
  COOLDOWN_OPTIONS,
  DURATION_OPTIONS,
  RAMP_DURATION_OPTIONS,
  RATIO_OPTIONS,
  STRETCH_INITIAL_BPM_OPTIONS,
  WARMUP_MINUTES_OPTIONS,
  getNextDurationOption,
  getStretchSettingsWithInitialBpm,
  getStretchTargetBpmOptions,
  type CoolDownMinutes,
  type DurationOption,
  type RatioLabel,
  type SessionSettings,
  type StretchSettings,
  type WarmUpMinutes,
} from '../domain/settings'
import { estimateNaviKriyaDurationMinutes } from '../domain/naviKriyaSession'
import { computeStretchTotalMs } from '../domain/stretchRamp'
import {
  NK_FRONT_COUNT_OPTIONS,
  NK_ROUNDS_OPTIONS,
  OM_LENGTH_OPTIONS,
  type NaviKriyaSettings,
  type OmLength,
} from '../domain/naviKriyaSettings'
import type { UiStrings } from '../content/strings'
import { BooleanToggle } from './BooleanToggle'
import { SettingsStepper } from './SettingsStepper'

interface BaseSettingsFormProps {
  strings: UiStrings['settingsForm']
}

export interface ResonantSettingsFormProps extends BaseSettingsFormProps {
  activePractice: 'resonant'
  settings: SessionSettings
  isRunning: boolean
  onChange(this: void, settings: SessionSettings): void
  onExtendDuration(this: void, durationMinutes: number): void
}

export interface StretchSettingsFormProps extends BaseSettingsFormProps {
  activePractice: 'stretch'
  isRunning: boolean
  stretchSettings: StretchSettings
  onStretchSettingsChange(this: void, settings: StretchSettings): void
}

export interface NaviKriyaSettingsFormProps extends BaseSettingsFormProps {
  activePractice: 'naviKriya'
  nkSettings: NaviKriyaSettings
  onNKSettingsChange(this: void, settings: NaviKriyaSettings): void
  nkControlsStrings: UiStrings['nkControls']
}

export type SettingsFormProps =
  | ResonantSettingsFormProps
  | StretchSettingsFormProps
  | NaviKriyaSettingsFormProps

interface ResonantSettingsControlsProps {
  settings: SessionSettings
  isRunning: boolean
  onChange(this: void, settings: SessionSettings): void
  onExtendDuration(this: void, durationMinutes: number): void
  strings: UiStrings['settingsForm']
}

function ResonantSettingsControls({
  settings,
  isRunning,
  onChange,
  onExtendDuration,
  strings,
}: ResonantSettingsControlsProps): ReactElement {
  const formatBpm = (value: number): string => `${String(value)} ${strings.bpmUnit}`
  const formatDuration = (value: DurationOption): string =>
    value === 'open-ended' ? strings.openEndedLabel : `${String(value)} ${strings.minutesUnit}`

  const updateSettings = (nextSettings: Partial<SessionSettings>): void => {
    onChange({ ...settings, ...nextSettings })
  }

  const updateDuration = (durationMinutes: DurationOption): void => {
    if (isRunning) {
      if (typeof durationMinutes === 'number') {
        onExtendDuration(durationMinutes)
      }
      return
    }

    updateSettings({ durationMinutes })
  }

  const nextDuration = getNextDurationOption(settings.durationMinutes)

  return (
    <>
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
        options={DURATION_OPTIONS}
        formatValue={formatDuration}
        onChange={updateDuration}
        disableDecrease={isRunning}
        disableIncrease={isRunning && typeof nextDuration !== 'number'}
        strings={strings.stepper}
      />
    </>
  )
}

interface StretchSettingsControlsProps {
  settings: StretchSettings
  onChange(this: void, settings: StretchSettings): void
  strings: UiStrings['settingsForm']
}

function StretchSettingsControls({
  settings,
  onChange,
  strings,
}: StretchSettingsControlsProps): ReactElement {
  const formatBpm = (value: number): string => `${String(value)} ${strings.bpmUnit}`
  const formatMinutes = (value: number): string => `${String(value)} ${strings.minutesUnit}`
  const formatCoolDown = (value: CoolDownMinutes): string =>
    value === 'open-ended' ? strings.holdOpenEndedLabel : `${String(value)} ${strings.minutesUnit}`

  const updateStretchSettings = (next: Partial<StretchSettings>): void => {
    onChange({ ...settings, ...next })
  }

  const updateInitialBpm = (initialBpm: number): void => {
    onChange(getStretchSettingsWithInitialBpm(settings, initialBpm))
  }

  const stretchTotalMs = computeStretchTotalMs(settings)
  const stretchDurationText = stretchTotalMs === null
    ? strings.openEndedLabel
    : `${String(Math.round(stretchTotalMs / 60_000))} ${strings.minutesUnit}`

  return (
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
        options={getStretchTargetBpmOptions(settings.initialBpm)}
        formatValue={formatBpm}
        onChange={(targetBpm) => { updateStretchSettings({ targetBpm }) }}
        strings={strings.stepper}
      />
      <SettingsStepper<RatioLabel>
        label={strings.ratioLabel}
        value={settings.ratio}
        options={RATIO_OPTIONS}
        onChange={(ratio) => { updateStretchSettings({ ratio }) }}
        strings={strings.stepper}
      />
      <SettingsStepper<WarmUpMinutes>
        label={strings.holdInitialLabel}
        value={settings.warmUpMinutes}
        options={WARMUP_MINUTES_OPTIONS}
        formatValue={formatMinutes}
        onChange={(warmUpMinutes) => { updateStretchSettings({ warmUpMinutes }) }}
        strings={strings.stepper}
      />
      <SettingsStepper
        label={strings.rampDurationLabel}
        value={settings.rampDurationMinutes}
        options={RAMP_DURATION_OPTIONS}
        formatValue={formatMinutes}
        onChange={(rampDurationMinutes) => { updateStretchSettings({ rampDurationMinutes }) }}
        strings={strings.stepper}
      />
      <SettingsStepper<CoolDownMinutes>
        label={strings.holdTargetLabel}
        value={settings.coolDownMinutes}
        options={COOLDOWN_OPTIONS}
        formatValue={formatCoolDown}
        onChange={(coolDownMinutes) => { updateStretchSettings({ coolDownMinutes }) }}
        strings={strings.stepper}
      />
      <SettingsStepper<string>
        label={strings.durationLabel}
        value={stretchDurationText}
        options={[stretchDurationText]}
        readOnly
        onChange={() => undefined}
        strings={strings.stepper}
      />
    </>
  )
}

interface NaviKriyaSettingsControlsProps {
  settings: NaviKriyaSettings
  onChange(this: void, settings: NaviKriyaSettings): void
  strings: UiStrings['settingsForm']
  nkControlsStrings: UiStrings['nkControls']
}

function NaviKriyaSettingsControls({
  settings,
  onChange,
  strings,
  nkControlsStrings,
}: NaviKriyaSettingsControlsProps): ReactElement {
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
    <>
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
        className="text-sm text-center text-[var(--color-breathing-muted)]"
      >
        {nkControlsStrings.estimatedDuration(estimatedMinutes)}
      </p>
    </>
  )
}

export function SettingsForm({
  ...props
}: SettingsFormProps): ReactElement {
  return (
    <div className="grid w-full gap-4" aria-label={props.strings.ariaLabel}>
      {props.activePractice === 'resonant' ? (
        <ResonantSettingsControls
          settings={props.settings}
          isRunning={props.isRunning}
          onChange={props.onChange}
          onExtendDuration={props.onExtendDuration}
          strings={props.strings}
        />
      ) : props.activePractice === 'stretch' ? (
        !props.isRunning ? (
          <StretchSettingsControls
            settings={props.stretchSettings}
            onChange={props.onStretchSettingsChange}
            strings={props.strings}
          />
        ) : null
      ) : (
        <NaviKriyaSettingsControls
          settings={props.nkSettings}
          onChange={props.onNKSettingsChange}
          strings={props.strings}
          nkControlsStrings={props.nkControlsStrings}
        />
      )}
    </div>
  )
}
