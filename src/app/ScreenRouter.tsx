import type { ReactElement } from 'react'

import type { AppViewModel } from './appViewModel'
import { AppSettingsPage } from './pages/AppSettingsPage'
import { LearnPage } from './pages/LearnPage'
import { PracticeScreen } from './PracticeScreen'

export interface ScreenRouterProps {
  vm: AppViewModel
}

/** Top-level surface router. Dispatches on `vm.navigation.appScreen`.
 *  End-session modals are rendered from PracticeScreen only; they never
 *  appear over Learn/AppSettings because the closeOnSessionView effect in
 *  useAppNavigation forces appScreen back to 'practice' whenever a session
 *  starts. */
export function ScreenRouter({ vm }: ScreenRouterProps): ReactElement {
  switch (vm.navigation.appScreen) {
    case 'learn':
      return (
        <LearnPage
          learnContent={vm.learnContent}
          lockedCopy={vm.lockedCopy}
          onBack={vm.navigation.onBackToPractice}
        />
      )
    case 'appSettings':
      return (
        <AppSettingsPage
          isIOS={vm.install.isIOS}
          isStandalone={vm.install.isStandalone}
          installable={vm.install.installable}
          onInstall={vm.install.onInstall}
          onBack={vm.navigation.onBackToPractice}
          stat={vm.stats}
          practiceName={vm.uiStrings.practice.name}
          locale={vm.locale}
          onResetStats={vm.onResetStats}
        />
      )
    case 'practice':
    default:
      return <PracticeScreen vm={vm} />
  }
}
