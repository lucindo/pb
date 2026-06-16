import type { ReactElement } from 'react'

import { PatternBreathingSettingsForm } from '../components/PatternBreathingSettingsForm'
import { SettingsSheet } from '../components/SettingsSheet'
import { SetupCard } from '../components/SetupCard'
import type { UiStrings } from '../content/strings'
import { useUiStrings } from '../hooks/useUiStringsContext'
import type { AppViewModel } from './appViewModel'
import { buildSetupCardSummary } from './setupCardSummary'

type PracticeSettingsViewModel = AppViewModel['practiceSettings']

interface PracticeSettingsViewProps {
  settings: PracticeSettingsViewModel
  isSheetOpen: boolean
  onOpenSheet(this: void): void
  onCloseSheet(this: void): void
}

// During a running session the settings affordance is not surfaced on screen
// (buildSetupCardSummary returns null, so this view renders nothing).
export function PracticeSettingsView({
  settings,
  isSheetOpen,
  onOpenSheet,
  onCloseSheet,
}: PracticeSettingsViewProps): ReactElement | null {
  const practice = useUiStrings().practice

  const items = buildSetupCardSummary({ settings, practice })
  if (items === null) return null

  const practiceName = practice.name
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

function renderForm(
  settings: PracticeSettingsViewModel,
  practice: UiStrings['practice'],
): ReactElement {
  return (
    <PatternBreathingSettingsForm
      settings={settings.settings}
      onChange={settings.onChange}
      strings={practice.settingsForm}
    />
  )
}
