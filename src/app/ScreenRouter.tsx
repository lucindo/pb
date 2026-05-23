import type { ReactElement } from 'react'

import type { AppViewModel } from './appViewModel'
import { AppSettingsPage } from './pages/AppSettingsPage'
import { LearnPage } from './pages/LearnPage'
import { PracticeScreen } from './PracticeScreen'

export interface ScreenRouterProps {
  vm: AppViewModel
}

/** Top-level surface router. Dispatches on `vm.dialogs.appScreen` (named
 *  `dialogs` for backwards compatibility — see AppDialogsViewModel — but
 *  it carries navigation state too). End-session modals are rendered from
 *  PracticeScreen only; they never appear over Learn/AppSettings because
 *  the closeOnSessionView effect in useAppNavigation forces appScreen back
 *  to 'practice' whenever a session starts. */
export function ScreenRouter({ vm }: ScreenRouterProps): ReactElement {
  switch (vm.dialogs.appScreen) {
    case 'learn':
      return (
        <LearnPage
          learnContent={vm.learnContent}
          lockedCopy={vm.lockedCopy}
          strings={vm.uiStrings.learn}
          activePractice={vm.activePractice}
          onBack={vm.dialogs.onBackToPractice}
        />
      )
    case 'appSettings':
      return (
        <AppSettingsPage
          strings={vm.uiStrings}
          isIOS={vm.install.isIOS}
          isStandalone={vm.install.isStandalone}
          installable={vm.install.installable}
          onInstall={vm.install.onInstall}
          onBack={vm.dialogs.onBackToPractice}
        />
      )
    case 'practice':
    default:
      return <PracticeScreen vm={vm} />
  }
}
