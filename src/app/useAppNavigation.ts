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

/** Surface-routing state. A single `appScreen` discriminator routed by
 *  `ScreenRouter`. Navigation away from practice is gated by `controlsDisabled`
 *  (no leaving mid-session) and forcibly reset when `closeOnSessionView` becomes
 *  true (session start yanks the user back to the practice surface). */
export function useAppNavigation({
  controlsDisabled,
  closeOnSessionView,
}: UseAppNavigationArgs): AppNavigation {
  const [appScreen, setAppScreen] = useState<AppScreen>('practice')

  useEffect(() => {
    if (!closeOnSessionView) return
    // Reason: force navigation back to the practice surface when a session starts;
    // setState inside effect is intentional — the session-start signal owns this transition.
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
