import type { ReactElement } from 'react'

import { EndSessionDialog } from '../components/EndSessionDialog'
import { LearnDialog } from '../components/LearnDialog'
import { SettingsDialog } from '../components/SettingsDialog'
import type { PracticeId } from '../storage/practices'
import type { AppDialogsViewModel, AppInstallViewModel, AppViewModel } from './appViewModel'

type UiStrings = AppViewModel['uiStrings']

interface AppDialogsViewProps {
  activePractice: PracticeId
  dialogs: AppDialogsViewModel
  install: AppInstallViewModel
  learnContent: AppViewModel['learnContent']
  lockedCopy: AppViewModel['lockedCopy']
  uiStrings: UiStrings
}

export function AppDialogsView({
  activePractice,
  dialogs,
  install,
  learnContent,
  lockedCopy,
  uiStrings,
}: AppDialogsViewProps): ReactElement {
  return (
    <>
      {dialogs.endSessionDialogs.map((dialog) => (
        <EndSessionDialog
          key={dialog.id}
          open={dialog.open}
          onConfirm={dialog.onConfirm}
          onCancel={dialog.onCancel}
          strings={uiStrings.endSessionDialog}
        />
      ))}
      <LearnDialog
        open={dialogs.learnOpen}
        onClose={dialogs.onLearnClose}
        learnContent={learnContent}
        lockedCopy={lockedCopy}
        strings={uiStrings.learn}
        activePractice={activePractice}
      />
      <SettingsDialog
        open={dialogs.settingsOpen}
        onClose={dialogs.onSettingsClose}
        inSessionView={dialogs.settingsInSessionView}
        strings={uiStrings}
        isIOS={install.isIOS}
        isStandalone={install.isStandalone}
        installable={install.installable}
        onInstall={install.onInstall}
      />
    </>
  )
}
