import { useEffect, useRef, type ReactElement } from 'react'

import { ChevronBackIcon } from '../../components/icons'
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
}

/** Full-page Settings surface. Composes PageShell + TopAppBar (back chevron
 *  in the leading slot) + Card-wrapped SettingsPanelBody. `inSessionView` is
 *  hard-coded false: navigation to this page is gated by `controlsDisabled`
 *  in useAppNavigation, so the user can only be here when no session is
 *  active. Focuses the back button on mount. */
export function AppSettingsPage({
  isIOS,
  isStandalone,
  installable,
  onInstall,
  onBack,
}: AppSettingsPageProps): ReactElement {
  const allStrings = useUiStrings()
  const strings = { appSettings: allStrings.appSettings, install: allStrings.install }
  const backButtonRef = useRef<HTMLButtonElement>(null)

  useEffect(() => {
    backButtonRef.current?.focus({ preventScroll: true })
  }, [])

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
