import { useEffect, useRef, type ReactElement } from 'react'

import { ChevronBackIcon, ChevronRightIcon } from '../../components/icons'
import { SettingsPanelBody } from '../../components/SettingsPanelBody'
import { IconButton } from '../../components/primitives/IconButton'
import { PageShell } from '../../components/primitives/PageShell'
import { TopAppBar } from '../../components/primitives/TopAppBar'
import { useUiStrings } from '../../hooks/useUiStringsContext'

export interface AppSettingsPageProps {
  isIOS: boolean
  isStandalone: boolean
  installable: boolean
  onInstall(this: void): Promise<void>
  onBack(this: void): void
  onAppearanceOpen(this: void): void
  returningFromAppearance: boolean
}

/** Full-page Settings surface. Composes PageShell + TopAppBar (back chevron
 *  in the leading slot, right-chevron in the trailing slot) + Card-wrapped
 *  SettingsPanelBody. `inSessionView` is hard-coded false: navigation to this
 *  page is gated by `controlsDisabled` in useAppNavigation, so the user can
 *  only be here when no session is active. Focuses the back button on mount
 *  (fresh entry) or the right-chevron (returningFromAppearance=true, D-13). */
export function AppSettingsPage({
  isIOS,
  isStandalone,
  installable,
  onInstall,
  onBack,
  onAppearanceOpen,
  returningFromAppearance,
}: AppSettingsPageProps): ReactElement {
  const allStrings = useUiStrings()
  const strings = {
    appSettings: allStrings.appSettings,
    install: allStrings.install,
    appearance: allStrings.appearance,
  }
  const backButtonRef = useRef<HTMLButtonElement>(null)
  const chevronButtonRef = useRef<HTMLButtonElement>(null)

  // Assumption: ScreenRouter unmounts/remounts this page on every navigation, so
  // this effect only fires on fresh mount with a stable `returningFromAppearance`
  // value — it does not steal focus mid-session. If the router is ever changed to
  // keep this page mounted across the appearance ↔ appSettings transition, this
  // effect needs a one-shot ref guard (track whether the focus call has already
  // fired this mount, and skip subsequent re-runs).
  useEffect(() => {
    if (returningFromAppearance) {
      chevronButtonRef.current?.focus({ preventScroll: true })
    } else {
      backButtonRef.current?.focus({ preventScroll: true })
    }
  }, [returningFromAppearance])

  return (
    <PageShell>
      <TopAppBar
        title={strings.appSettings.title}
        leading={
          <IconButton
            icon={<ChevronBackIcon />}
            label={strings.appSettings.close}
            onClick={onBack}
            buttonRef={backButtonRef}
          />
        }
        trailing={
          <IconButton
            icon={<ChevronRightIcon />}
            label={strings.appearance.rightChevronAriaOnSettings}
            onClick={onAppearanceOpen}
            buttonRef={chevronButtonRef}
          />
        }
      />
      <div className="w-full text-left">
        <SettingsPanelBody
          inSessionView={false}
          strings={strings}
          isIOS={isIOS}
          isStandalone={isStandalone}
          installable={installable}
          onInstall={onInstall}
        />
      </div>
    </PageShell>
  )
}
