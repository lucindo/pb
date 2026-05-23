import type { ReactElement, ReactNode } from 'react'

import { InstallBanner } from '../components/InstallBanner'
import { LearnAnchor } from '../components/LearnAnchor'
import { PageShell } from '../components/primitives/PageShell'
import { TopAppBar } from '../components/primitives/TopAppBar'
import { PracticeToggle } from '../components/PracticeToggle'
import { SettingsAnchor } from '../components/SettingsAnchor'
import type { PracticeId } from '../storage'
import type { AppViewModel } from './appViewModel'
import { EndSessionDialogsView } from './EndSessionDialogsView'
import { PracticeControlsView } from './PracticeControlsView'
import { PracticeSessionView } from './PracticeSessionView'
import { PracticeSettingsView } from './PracticeSettingsView'

interface PracticeWorkspaceProps {
  compact: boolean
  activePractice: PracticeId
  controlsDisabled: boolean
  showSwitcherIcons: boolean
  onSwitchPractice(this: void, next: PracticeId): void
  practiceToggleStrings: AppViewModel['practiceToggleStrings']
  medicalAdviceLine: string
  children: ReactNode
}

function PracticeWorkspace({
  compact,
  activePractice,
  controlsDisabled,
  showSwitcherIcons,
  onSwitchPractice,
  practiceToggleStrings,
  medicalAdviceLine,
  children,
}: PracticeWorkspaceProps): ReactElement {
  return (
    <div className={`${compact ? 'mt-6' : 'mt-10'} w-full rounded-[2rem] border border-[var(--color-breathing-surface)]/80 bg-[var(--color-breathing-surface)]/70 p-5 shadow-[var(--shadow-breathing-card)] backdrop-blur sm:p-6`}>
      <div className="mb-5">
        <PracticeToggle
          active={activePractice}
          disabled={controlsDisabled}
          showIcons={showSwitcherIcons}
          onSwitch={onSwitchPractice}
          strings={practiceToggleStrings}
        />
      </div>

      {children}

      <p className="mt-4 text-sm leading-6 text-[var(--color-breathing-muted)]">
        {medicalAdviceLine}
      </p>
    </div>
  )
}

interface PracticeScreenProps {
  vm: AppViewModel
}

/** The practice surface — the appScreen='practice' route. Renders the
 *  practice workspace, the install banner (this surface only), and the
 *  end-session confirmation modals. Learn/Settings are no longer rendered
 *  here as modals — they're sibling pages routed by ScreenRouter. */
export function PracticeScreen({ vm }: PracticeScreenProps): ReactElement {
  return (
    <PageShell
      overlays={
        <>
          {vm.install.showBanner && (
            <InstallBanner
              isIOS={vm.install.isIOS}
              onInstall={vm.install.onInstall}
              onDismiss={vm.install.onDismiss}
              strings={vm.uiStrings.install}
            />
          )}
          <EndSessionDialogsView
            dialogs={vm.dialogs}
            uiStrings={vm.uiStrings}
          />
        </>
      }
    >
      <TopAppBar
        eyebrow={vm.appHeader}
        title={vm.appTitle}
        leading={
          <SettingsAnchor
            disabled={vm.controlsDisabled}
            onClick={vm.dialogs.onSettingsOpen}
            strings={vm.uiStrings.practice.topBar}
          />
        }
        trailing={
          <LearnAnchor
            disabled={vm.controlsDisabled}
            onClick={vm.dialogs.onLearnOpen}
            strings={vm.uiStrings.practice.topBar}
          />
        }
      />
      <PracticeWorkspace
        compact={vm.workspaceCompact}
        activePractice={vm.activePractice}
        controlsDisabled={vm.controlsDisabled}
        showSwitcherIcons={vm.featureFlags.switcherIcon}
        onSwitchPractice={vm.onSwitchPractice}
        practiceToggleStrings={vm.practiceToggleStrings}
        medicalAdviceLine={vm.lockedCopy.medicalAdviceLine}
      >
        <PracticeSessionView
          session={vm.practiceSession}
          uiStrings={vm.uiStrings}
        />
        <PracticeSettingsView
          settings={vm.practiceSettings}
          uiStrings={vm.uiStrings}
        />
        <PracticeControlsView
          controls={vm.practiceControls}
          audio={vm.audio}
          uiStrings={vm.uiStrings}
        />
      </PracticeWorkspace>
    </PageShell>
  )
}
