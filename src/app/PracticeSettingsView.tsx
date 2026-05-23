import type { ReactElement } from 'react'

import { NaviKriyaSettingsForm } from '../components/NaviKriyaSettingsForm'
import { ResonantSettingsForm } from '../components/ResonantSettingsForm'
import { StretchSettingsForm } from '../components/StretchSettingsForm'
import { useUiStrings } from '../hooks/useUiStringsContext'
import type { AppViewModel } from './appViewModel'

type PracticeSettingsViewModel = AppViewModel['practiceSettings']

interface PracticeSettingsViewProps {
  settings: PracticeSettingsViewModel
}

export function PracticeSettingsView({
  settings,
}: PracticeSettingsViewProps): ReactElement | null {
  const practice = useUiStrings().practice

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
