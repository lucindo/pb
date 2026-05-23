import type { ReactElement, ReactNode } from 'react'

import { InstallBanner } from '../components/InstallBanner'
import { LearnAnchor } from '../components/LearnAnchor'
import { PracticeToggle } from '../components/PracticeToggle'
import { SettingsAnchor } from '../components/SettingsAnchor'
import type { PracticeId } from '../storage/practices'
import type { AppViewModel } from './appViewModel'
import { AppDialogsView } from './AppDialogsView'
import { PracticeControlsView } from './PracticeControlsView'
import { PracticeSessionView } from './PracticeSessionView'
import { PracticeSettingsView } from './PracticeSettingsView'

type UiStrings = AppViewModel['uiStrings']

interface AppHeaderProps {
  header: string
  title: string
  disabled: boolean
  strings: UiStrings['anchors']
  onSettingsClick(this: void): void
  onLearnClick(this: void): void
}

function AppHeader({
  header,
  title,
  disabled,
  strings,
  onSettingsClick,
  onLearnClick,
}: AppHeaderProps): ReactElement {
  return (
    <div className="relative w-full">
      <p className="mb-4 text-sm font-semibold uppercase tracking-[0.35em] text-[var(--color-breathing-accent)]">
        {header}
      </p>
      <h1 className="text-4xl font-semibold tracking-tight text-[var(--color-breathing-accent-strong)] sm:text-5xl">
        {title}
      </h1>
      <SettingsAnchor disabled={disabled} onClick={onSettingsClick} strings={strings} />
      <LearnAnchor disabled={disabled} onClick={onLearnClick} strings={strings} />
    </div>
  )
}

interface PracticeWorkspaceProps {
  compact: boolean
  activePractice: PracticeId
  controlsDisabled: boolean
  onSwitchPractice(this: void, next: PracticeId): void
  practiceToggleStrings: AppViewModel['practiceToggleStrings']
  medicalAdviceLine: string
  children: ReactNode
}

function PracticeWorkspace({
  compact,
  activePractice,
  controlsDisabled,
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

interface AppScreenProps {
  vm: AppViewModel
}

export function AppScreen({ vm }: AppScreenProps): ReactElement {
  return (
    <main className="min-h-screen bg-[radial-gradient(circle_at_top,_var(--color-breathing-bg-soft),_var(--color-breathing-bg)_48%,_var(--color-breathing-bg-edge))] px-4 py-6 text-[var(--color-breathing-accent-strong)] sm:px-6 sm:py-8">
      <section className="mx-auto flex min-h-[calc(100vh-3rem)] max-w-3xl flex-col items-center justify-start text-center sm:min-h-[calc(100vh-4rem)]">
        <AppHeader
          header={vm.appHeader}
          title={vm.appTitle}
          disabled={vm.controlsDisabled}
          onSettingsClick={vm.dialogs.onSettingsOpen}
          onLearnClick={vm.dialogs.onLearnOpen}
          strings={vm.uiStrings.anchors}
        />
        <PracticeWorkspace
          compact={vm.workspaceCompact}
          activePractice={vm.activePractice}
          controlsDisabled={vm.controlsDisabled}
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
      </section>

      {vm.install.showBanner && (
        <InstallBanner
          isIOS={vm.install.isIOS}
          onInstall={vm.install.onInstall}
          onDismiss={vm.install.onDismiss}
          strings={vm.uiStrings.install}
        />
      )}

      <AppDialogsView
        activePractice={vm.activePractice}
        dialogs={vm.dialogs}
        install={vm.install}
        learnContent={vm.learnContent}
        lockedCopy={vm.lockedCopy}
        uiStrings={vm.uiStrings}
      />
    </main>
  )
}
