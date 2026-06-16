import type { ReactElement } from 'react'

import type { UiStrings } from '../content/strings'
import {
  PATTERN_BOUNDS,
  PRESETS,
  applyPreset,
  resolvePreset,
  type PatternSettings,
  type PresetSelection,
  type RoundsOption,
} from '../domain'
import { SettingsFormShell } from './SettingsFormShell'
import { SettingsSegmentedRow } from './SettingsSegmentedRow'
import { SettingsStepper } from './SettingsStepper'

const range = (min: number, max: number): number[] =>
  Array.from({ length: max - min + 1 }, (_, i) => min + i)

// inhale/exhale share [1,60]; both holds share [0,300]; rounds adds the
// open-ended sentinel above its max so stepping past 99 lands on ∞ (FR-18a).
const SECONDS_OPTIONS = range(PATTERN_BOUNDS.inhale.min, PATTERN_BOUNDS.inhale.max)
const HOLD_OPTIONS = range(PATTERN_BOUNDS.holdIn.min, PATTERN_BOUNDS.holdIn.max)
const SCALE_OPTIONS = range(PATTERN_BOUNDS.multiplier.min, PATTERN_BOUNDS.multiplier.max)
const ROUNDS_OPTIONS: readonly RoundsOption[] = [
  ...range(PATTERN_BOUNDS.rounds.min, PATTERN_BOUNDS.rounds.max),
  'open-ended',
]

export interface PatternBreathingSettingsFormProps {
  settings: PatternSettings
  onChange(this: void, settings: PatternSettings): void
  strings: UiStrings['practice']['settingsForm']
}

export function PatternBreathingSettingsForm({
  settings,
  onChange,
  strings,
}: PatternBreathingSettingsFormProps): ReactElement {
  const update = (next: Partial<PatternSettings>): void => {
    onChange({ ...settings, ...next })
  }

  // Selecting a named preset applies its five fields and keeps rounds; 'custom'
  // is display-only (it is the derived state when nothing matches).
  const onPresetChange = (selection: PresetSelection): void => {
    const preset = PRESETS.find((p) => p.id === selection)
    if (preset) onChange(applyPreset(settings, preset))
  }

  const presetOptions = [
    ...PRESETS.map((p) => ({ id: p.id, label: strings.presets[p.id] })),
    { id: 'custom' as const, label: strings.presets.custom },
  ]

  const formatSeconds = (v: number): string => `${String(v)} ${strings.secondsUnit}`
  const formatScale = (v: number): string => `×${String(v)}`
  const formatRounds = (v: RoundsOption): string =>
    v === 'open-ended' ? strings.openEndedLabel : String(v)

  return (
    <SettingsFormShell ariaLabel={strings.ariaLabel}>
      <SettingsSegmentedRow<PresetSelection>
        label={strings.presetLabel}
        ariaLabel={strings.stepper.fieldAriaLabel(strings.presetLabel)}
        value={resolvePreset(settings)}
        options={presetOptions}
        onChange={onPresetChange}
      />
      <SettingsStepper
        label={strings.inhaleLabel}
        value={settings.inhale}
        options={SECONDS_OPTIONS}
        formatValue={formatSeconds}
        onChange={(inhale) => { update({ inhale }) }}
        strings={strings.stepper}
      />
      <SettingsStepper
        label={strings.holdInLabel}
        value={settings.holdIn}
        options={HOLD_OPTIONS}
        formatValue={formatSeconds}
        onChange={(holdIn) => { update({ holdIn }) }}
        strings={strings.stepper}
      />
      <SettingsStepper
        label={strings.exhaleLabel}
        value={settings.exhale}
        options={SECONDS_OPTIONS}
        formatValue={formatSeconds}
        onChange={(exhale) => { update({ exhale }) }}
        strings={strings.stepper}
      />
      <SettingsStepper
        label={strings.holdOutLabel}
        value={settings.holdOut}
        options={HOLD_OPTIONS}
        formatValue={formatSeconds}
        onChange={(holdOut) => { update({ holdOut }) }}
        strings={strings.stepper}
      />
      <SettingsStepper
        label={strings.scaleLabel}
        value={settings.multiplier}
        options={SCALE_OPTIONS}
        formatValue={formatScale}
        onChange={(multiplier) => { update({ multiplier }) }}
        strings={strings.stepper}
      />
      <SettingsStepper<RoundsOption>
        label={strings.roundsLabel}
        value={settings.rounds}
        options={ROUNDS_OPTIONS}
        formatValue={formatRounds}
        onChange={(rounds) => { update({ rounds }) }}
        strings={strings.stepper}
      />
    </SettingsFormShell>
  )
}
