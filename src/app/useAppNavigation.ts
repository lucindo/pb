import { useCallback, useEffect, useState } from 'react'

export type AppScreen = 'practice' | 'learn' | 'appSettings' | 'advanced' | 'stats'

// Which sub-page the user backed out of, so AppSettings can restore focus to the
// originating row. null = fresh entry (focus the back button). A single
// discriminator — the back-from-advanced and back-from-stats states are
// mutually exclusive by construction.
export type ReturningFrom = 'advanced' | 'stats' | null

export interface AppNavigation {
  appScreen: AppScreen
  returningFrom: ReturningFrom
  onLearnOpen(this: void): void
  onSettingsOpen(this: void): void
  onAdvancedOpen(this: void): void
  onStatsOpen(this: void): void
  onBackToPractice(this: void): void
  onBackFromAdvanced(this: void): void
  onBackFromStats(this: void): void
}

export interface UseAppNavigationArgs {
  controlsDisabled: boolean
  closeOnSessionView: boolean
}

/** Surface-routing state. Replaces the old open/closed dialog booleans with
 *  a single `appScreen` discriminator routed by `ScreenRouter`. Navigation
 *  away from practice is gated by `controlsDisabled` (no leaving mid-session)
 *  and forcibly reset when `closeOnSessionView` becomes true (session start
 *  yanks the user back to the practice surface). */
export function useAppNavigation({
  controlsDisabled,
  closeOnSessionView,
}: UseAppNavigationArgs): AppNavigation {
  const [appScreen, setAppScreen] = useState<AppScreen>('practice')
  const [returningFrom, setReturningFrom] = useState<ReturningFrom>(null)

  const goTo = useCallback((screen: AppScreen, from: ReturningFrom = null): void => {
    setAppScreen(screen)
    setReturningFrom(from)
  }, [])

  useEffect(() => {
    if (!closeOnSessionView) return
    // Reason: force navigation back to the practice surface when a session starts;
    // setState inside effect is intentional — the session-start signal owns this transition.
    /* eslint-disable react-hooks/set-state-in-effect */
    setAppScreen('practice')
    setReturningFrom(null)
    /* eslint-enable react-hooks/set-state-in-effect */
  }, [closeOnSessionView])

  const onLearnOpen = useCallback((): void => {
    if (controlsDisabled) return
    goTo('learn')
  }, [controlsDisabled, goTo])

  const onSettingsOpen = useCallback((): void => {
    if (controlsDisabled) return
    goTo('appSettings')
  }, [controlsDisabled, goTo])

  const onAdvancedOpen = useCallback((): void => {
    if (controlsDisabled) return
    goTo('advanced')
  }, [controlsDisabled, goTo])

  const onStatsOpen = useCallback((): void => {
    if (controlsDisabled) return
    goTo('stats')
  }, [controlsDisabled, goTo])

  const onBackToPractice = useCallback((): void => {
    goTo('practice')
  }, [goTo])

  const onBackFromAdvanced = useCallback((): void => {
    goTo('appSettings', 'advanced')
  }, [goTo])

  // Mirrors onBackFromAdvanced: Stats is a sibling sub-page of App Settings, so
  // backing out returns there with the sentinel set to restore the Stats row.
  const onBackFromStats = useCallback((): void => {
    goTo('appSettings', 'stats')
  }, [goTo])

  return {
    appScreen,
    returningFrom,
    onLearnOpen,
    onSettingsOpen,
    onAdvancedOpen,
    onStatsOpen,
    onBackToPractice,
    onBackFromAdvanced,
    onBackFromStats,
  }
}
