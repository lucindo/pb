import type { ReactElement } from 'react'

import { InstallBanner } from '../components/InstallBanner'
import { LearnAnchor } from '../components/LearnAnchor'
import { PageShell } from '../components/primitives/PageShell'
import { TopAppBar } from '../components/primitives/TopAppBar'
import { PracticeToggle } from '../components/PracticeToggle'
import { SettingsAnchor } from '../components/SettingsAnchor'
import type { AppViewModel } from './appViewModel'
import { EndSessionDialogsView } from './EndSessionDialogsView'
import { PracticeControlsView } from './PracticeControlsView'
import { PracticeSessionView } from './PracticeSessionView'
import { PracticeSettingsView } from './PracticeSettingsView'

interface PracticeScreenProps {
  vm: AppViewModel
}

/** The practice surface — the appScreen='practice' route. Anchoring per
 *  spike 010 PracticeChrome: top group (top bar → switcher → orb → variable
 *  region) anchors to viewport top; flex-1 spacer absorbs remaining vertical
 *  space; bottom group (controls → disclaimer) anchors to viewport bottom
 *  with a 16 px min-gap above Start. The orb's y-position is constant
 *  across practice × phase combinations. */
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
          <EndSessionDialogsView dialogs={vm.dialogs} />
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
      <div className="w-full px-5 pb-4 sm:px-8">
        <PracticeToggle
          active={vm.activePractice}
          disabled={vm.controlsDisabled}
          showIcons={vm.featureFlags.switcherIcon}
          onSwitch={vm.onSwitchPractice}
          strings={vm.practiceToggleStrings}
        />
      </div>
      <div className="flex w-full flex-col items-center px-5 pt-[18px] sm:px-8 sm:pt-7">
        <PracticeSessionView
          session={vm.practiceSession}
          variant={vm.featureFlags.breathingShape}
          idleMode={vm.featureFlags.orbIdle}
        />
        <PracticeSettingsView settings={vm.practiceSettings} />
      </div>
      <div className="flex-1" />
      <div className="w-full px-5 pt-4 sm:px-8">
        <PracticeControlsView controls={vm.practiceControls} audio={vm.audio} />
      </div>
      <p
        className="w-full whitespace-nowrap px-5 pt-3 text-center text-[11px] font-normal leading-[1.4] tracking-[0.02em] text-[var(--color-breathing-muted)] sm:px-8"
        style={{ paddingBottom: 'max(1.25rem, env(safe-area-inset-bottom))' }}
      >
        {vm.lockedCopy.medicalAdviceLine}
      </p>
    </PageShell>
  )
}
