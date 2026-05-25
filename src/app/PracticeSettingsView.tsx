import type { ReactElement } from 'react'

import { NaviKriyaSettingsForm } from '../components/NaviKriyaSettingsForm'
import { ResonantSettingsForm } from '../components/ResonantSettingsForm'
import { SettingsSheet } from '../components/SettingsSheet'
import { SettingsStepper } from '../components/SettingsStepper'
import { SetupCard } from '../components/SetupCard'
import { StretchSettingsForm } from '../components/StretchSettingsForm'
import { DURATION_OPTIONS, getNextDurationOption, type DurationOption } from '../domain'
import type { UiStrings } from '../content/strings'
import { useUiStrings } from '../hooks/useUiStringsContext'
import type { AppViewModel } from './appViewModel'
import { buildSetupCardSummary, resolveSheetPracticeName } from './setupCardSummary'

type PracticeSettingsViewModel = AppViewModel['practiceSettings']

interface PracticeSettingsViewProps {
  settings: PracticeSettingsViewModel
  isSheetOpen: boolean
  onOpenSheet(this: void): void
  onCloseSheet(this: void): void
}

export function PracticeSettingsView({
  settings,
  isSheetOpen,
  onOpenSheet,
  onCloseSheet,
}: PracticeSettingsViewProps): ReactElement | null {
  const practice = useUiStrings().practice

  // HRV running: replace the SetupCard + sheet wiring with just an inline
  // Duration stepper. The card's only purpose during running was the
  // extend-duration affordance — surfacing the stepper directly removes
  // the 2-tap sheet detour (per operator on running HRV).
  if (settings.kind === 'resonant' && settings.isRunning) {
    return <RunningDurationCard settings={settings} strings={practice.settingsForm} />
  }

  const items = buildSetupCardSummary({ settings, practice })
  if (items === null) return null

  const practiceName = resolveSheetPracticeName(settings, practice.switcher)
  if (practiceName === null) return null

  const sheet = practice.settingsSheet

  return (
    <div className="w-full">
      <SetupCard
        items={items}
        onTap={onOpenSheet}
        ariaLabel={sheet.editCardAriaLabel(practiceName)}
      />
      <SettingsSheet
        open={isSheetOpen}
        onClose={onCloseSheet}
        title={sheet.title}
        subtitle={practiceName}
        closeLabel={sheet.close}
      >
        {isSheetOpen ? renderForm(settings, practice) : null}
      </SettingsSheet>
    </div>
  )
}

interface RunningDurationCardProps {
  settings: Extract<PracticeSettingsViewModel, { kind: 'resonant' }>
  strings: UiStrings['practice']['settingsForm']
}

function RunningDurationCard({
  settings,
  strings,
}: RunningDurationCardProps): ReactElement {
  const formatDuration = (value: DurationOption): string =>
    value === 'open-ended' ? strings.openEndedLabel : `${String(value)} ${strings.minutesUnit}`

  const onChange = (next: DurationOption): void => {
    if (typeof next === 'number') {
      settings.onExtendDuration(next)
    }
  }

  const nextDuration = getNextDurationOption(settings.settings.durationMinutes)

  return (
    <div
      className="w-full"
      style={{
        background: 'var(--color-breathing-surface)',
        border: '1px solid var(--color-border-soft)',
        borderRadius: 24,
        padding: '4px 18px',
      }}
    >
      <SettingsStepper<DurationOption>
        label={strings.durationLabel}
        value={settings.settings.durationMinutes}
        options={DURATION_OPTIONS}
        formatValue={formatDuration}
        onChange={onChange}
        disableDecrease={true}
        disableIncrease={typeof nextDuration !== 'number'}
        hideTopBorder={true}
        strings={strings.stepper}
      />
    </div>
  )
}

function renderForm(
  settings: PracticeSettingsViewModel,
  practice: UiStrings['practice'],
): ReactElement | null {
  if (settings.kind === 'hidden') return null

  if (settings.kind === 'resonant') {
    return (
      <ResonantSettingsForm
        settings={settings.settings}
        isRunning={settings.isRunning}
        onChange={settings.onChange}
        onExtendDuration={settings.onExtendDuration}
        strings={practice.settingsForm}
      />
    )
  }

  if (settings.kind === 'stretch') {
    return (
      <StretchSettingsForm
        isRunning={settings.isRunning}
        strings={practice.settingsForm}
        settings={settings.settings}
        onChange={settings.onChange}
      />
    )
  }

  return (
    <NaviKriyaSettingsForm
      strings={practice.settingsForm}
      settings={settings.settings}
      onChange={settings.onChange}
      nkControlsStrings={practice.nkControls}
    />
  )
}
