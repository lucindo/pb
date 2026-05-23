import type { ReactElement } from 'react'

import { SettingsForm } from '../components/SettingsForm'
import type { AppViewModel } from './appViewModel'

type UiStrings = AppViewModel['uiStrings']
type PracticeSettingsViewModel = AppViewModel['practiceSettings']

interface PracticeSettingsViewProps {
  settings: PracticeSettingsViewModel
  uiStrings: UiStrings
}

export function PracticeSettingsView({
  settings,
  uiStrings,
}: PracticeSettingsViewProps): ReactElement | null {
  if (settings.kind === 'hidden') return null

  if (settings.kind === 'resonant') {
    return (
      <SettingsForm
        activePractice="resonant"
        settings={settings.settings}
        isRunning={settings.isRunning}
        onChange={settings.onChange}
        onExtendDuration={settings.onExtendDuration}
        strings={uiStrings.settingsForm}
      />
    )
  }

  if (settings.kind === 'stretch') {
    return (
      <SettingsForm
        activePractice="stretch"
        isRunning={settings.isRunning}
        strings={uiStrings.settingsForm}
        stretchSettings={settings.settings}
        onStretchSettingsChange={settings.onChange}
      />
    )
  }

  return (
    <SettingsForm
      activePractice="naviKriya"
      strings={uiStrings.settingsForm}
      nkSettings={settings.settings}
      onNKSettingsChange={settings.onChange}
      nkControlsStrings={uiStrings.nkControls}
    />
  )
}
