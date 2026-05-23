import type { ReactElement } from 'react'

import { NaviKriyaSettingsForm } from '../components/NaviKriyaSettingsForm'
import { ResonantSettingsForm } from '../components/ResonantSettingsForm'
import { StretchSettingsForm } from '../components/StretchSettingsForm'
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
      <ResonantSettingsForm
        settings={settings.settings}
        isRunning={settings.isRunning}
        onChange={settings.onChange}
        onExtendDuration={settings.onExtendDuration}
        strings={uiStrings.practice.settingsForm}
      />
    )
  }

  if (settings.kind === 'stretch') {
    return (
      <StretchSettingsForm
        isRunning={settings.isRunning}
        strings={uiStrings.practice.settingsForm}
        settings={settings.settings}
        onChange={settings.onChange}
      />
    )
  }

  return (
    <NaviKriyaSettingsForm
      strings={uiStrings.practice.settingsForm}
      settings={settings.settings}
      onChange={settings.onChange}
      nkControlsStrings={uiStrings.practice.nkControls}
    />
  )
}
