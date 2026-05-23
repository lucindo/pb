import { useCallback, useEffect, useState } from 'react'

export type AppScreen = 'practice' | 'learn' | 'appSettings'

export interface AppNavigation {
  appScreen: AppScreen
  onLearnOpen(this: void): void
  onSettingsOpen(this: void): void
  onBackToPractice(this: void): void
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

  useEffect(() => {
    if (!closeOnSessionView) return
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setAppScreen('practice')
  }, [closeOnSessionView])

  const onLearnOpen = useCallback((): void => {
    if (controlsDisabled) return
    setAppScreen('learn')
  }, [controlsDisabled])

  const onSettingsOpen = useCallback((): void => {
    if (controlsDisabled) return
    setAppScreen('appSettings')
  }, [controlsDisabled])

  const onBackToPractice = useCallback((): void => {
    setAppScreen('practice')
  }, [])

  return {
    appScreen,
    onLearnOpen,
    onSettingsOpen,
    onBackToPractice,
  }
}
