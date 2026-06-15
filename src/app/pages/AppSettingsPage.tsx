import { useEffect, useMemo, useRef, type ReactElement } from 'react'

import { ChevronBackIcon } from '../../components/icons'
import { SettingsPanelBody } from '../../components/SettingsPanelBody'
import { IconButton } from '../../components/primitives/IconButton'
import { PageShell } from '../../components/primitives/PageShell'
import { TopAppBar } from '../../components/primitives/TopAppBar'
import { useUiStrings } from '../../hooks/useUiStringsContext'
import type { LocaleId } from '../../domain'
import type { PersistedStats } from '../../storage'

export interface AppSettingsPageProps {
  isIOS: boolean
  isStandalone: boolean
  installable: boolean
  onInstall(this: void): Promise<void>
  onBack(this: void): void
  stat: PersistedStats
  practiceName: string
  locale: LocaleId
  onResetStats(this: void): void
}

/** Full-page Settings surface. Composes PageShell + TopAppBar (back chevron in
 *  the leading slot) + SettingsPanelBody. `inSessionView` is hard-coded false:
 *  navigation here is gated by `controlsDisabled` in useAppNavigation, so the
 *  user can only be here when no session is active. Focuses the back button on
 *  mount. */
export function AppSettingsPage({
  isIOS,
  isStandalone,
  installable,
  onInstall,
  onBack,
  stat,
  practiceName,
  locale,
  onResetStats,
}: AppSettingsPageProps): ReactElement {
  const allStrings = useUiStrings()
  // Memoize the subset wrapper so SettingsPanelBody and any future React.memo
  // wrappers see a stable reference until the locale changes.
  const strings = useMemo(
    () => ({
      appSettings: allStrings.appSettings,
      install: allStrings.install,
      stats: allStrings.stats,
    }),
    [allStrings],
  )
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
          stat={stat}
          practiceName={practiceName}
          locale={locale}
          onResetStats={onResetStats}
        />
      </div>
    </PageShell>
  )
}
