import { useEffect, useRef, type ReactElement } from 'react'

import { ChevronBackIcon } from '../../components/icons'
import { SettingsPanelBody } from '../../components/SettingsPanelBody'
import { Card } from '../../components/primitives/Card'
import { IconButton } from '../../components/primitives/IconButton'
import { PageShell } from '../../components/primitives/PageShell'
import { TopAppBar } from '../../components/primitives/TopAppBar'
import type { UiStrings } from '../../content/strings'

export interface AppSettingsPageProps {
  strings: Pick<UiStrings, 'settings' | 'themes' | 'cue' | 'timbres' | 'install'>
  isIOS: boolean
  isStandalone: boolean
  installable: boolean
  onInstall(this: void): Promise<void>
  onBack(this: void): void
}

/** Full-page Settings surface. Replaces the legacy SettingsDialog modal
 *  route. Composes PageShell + TopAppBar (back chevron in the leading slot)
 *  + Card-wrapped SettingsPanelBody. `inSessionView` is hard-coded false:
 *  navigation to this page is gated by `controlsDisabled` in useAppNavigation,
 *  so the user can only be here when no session is active. Focuses the back
 *  button on mount. */
export function AppSettingsPage({
  strings,
  isIOS,
  isStandalone,
  installable,
  onInstall,
  onBack,
}: AppSettingsPageProps): ReactElement {
  const backButtonRef = useRef<HTMLButtonElement>(null)

  useEffect(() => {
    backButtonRef.current?.focus({ preventScroll: true })
  }, [])

  return (
    <PageShell>
      <TopAppBar
        title={strings.settings.title}
        leading={
          <div className="absolute left-0 top-0">
            <IconButton
              icon={<ChevronBackIcon />}
              label={strings.settings.close}
              onClick={onBack}
              buttonRef={backButtonRef}
            />
          </div>
        }
      />
      <div className="mt-6 w-full text-left">
        <Card padding="lg">
          <SettingsPanelBody
            inSessionView={false}
            strings={strings}
            isIOS={isIOS}
            isStandalone={isStandalone}
            installable={installable}
            onInstall={onInstall}
          />
        </Card>
      </div>
    </PageShell>
  )
}
