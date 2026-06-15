import type { ReactElement } from 'react'

import { ResonantSettingsForm } from '../components/ResonantSettingsForm'
import { SettingsSheet } from '../components/SettingsSheet'
import { SetupCard } from '../components/SetupCard'
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

// During a running session the settings affordance is not surfaced on screen.
//
// The extend-duration logic remains in the codebase (BreathingSessionController
// .extendDuration + the AppPracticeSettingsViewModel.onExtendDuration callback)
// but is intentionally not wired to any UI on the practice surface. If a future
// design wants to bring back an extend-duration affordance during running, it
// can plug directly into the existing callback without any domain changes.
export function PracticeSettingsView({
  settings,
  isSheetOpen,
  onOpenSheet,
  onCloseSheet,
}: PracticeSettingsViewProps): ReactElement | null {
  const practice = useUiStrings().practice

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

function renderForm(
  settings: PracticeSettingsViewModel,
  practice: UiStrings['practice'],
): ReactElement {
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
