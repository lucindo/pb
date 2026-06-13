import { useEffect, useMemo, useRef, type ReactElement } from 'react'

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
  onAdvancedOpen(this: void): void
  onStatsOpen(this: void): void
  returningFromAdvanced: boolean
  returningFromStats: boolean
}

/** Full-page Settings surface. Composes PageShell + TopAppBar (back chevron
 *  in the leading slot, right-chevron in the trailing slot) + Card-wrapped
 *  SettingsPanelBody. `inSessionView` is hard-coded false: navigation to this
 *  page is gated by `controlsDisabled` in useAppNavigation, so the user can
 *  only be here when no session is active. Focuses the back button on mount
 *  (fresh entry) or the right-chevron (returningFromAdvanced=true). */
export function AppSettingsPage({
  isIOS,
  isStandalone,
  installable,
  onInstall,
  onBack,
  onAdvancedOpen,
  onStatsOpen,
  returningFromAdvanced,
  returningFromStats,
}: AppSettingsPageProps): ReactElement {
  const allStrings = useUiStrings()
  // Memoize the subset wrapper so SettingsPanelBody and any future React.memo
  // wrappers see a stable reference until the locale changes.
  const strings = useMemo(
    () => ({
      appSettings: allStrings.appSettings,
      install: allStrings.install,
      advanced: allStrings.advanced,
    }),
    [allStrings],
  )
  const backButtonRef = useRef<HTMLButtonElement>(null)
  const chevronButtonRef = useRef<HTMLButtonElement>(null)
  const statsRowRef = useRef<HTMLButtonElement>(null)

  // Assumption: ScreenRouter unmounts/remounts this page on every navigation, so
  // this effect only fires on fresh mount with a stable `returningFromAdvanced`
  // value — it does not steal focus mid-session. If the router is ever changed to
  // keep this page mounted across the appearance ↔ appSettings transition, this
  // effect needs a one-shot ref guard (track whether the focus call has already
  // fired this mount, and skip subsequent re-runs).
  useEffect(() => {
    if (returningFromStats) {
      statsRowRef.current?.focus({ preventScroll: true })
    } else if (returningFromAdvanced) {
      chevronButtonRef.current?.focus({ preventScroll: true })
    } else {
      backButtonRef.current?.focus({ preventScroll: true })
    }
  }, [returningFromAdvanced, returningFromStats])

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
            label={strings.advanced.rightChevronAriaOnSettings}
            onClick={onAdvancedOpen}
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
          onStatsOpen={onStatsOpen}
          statsRowRef={statsRowRef}
        />
      </div>
    </PageShell>
  )
}
