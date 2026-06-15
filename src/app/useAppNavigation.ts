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

/** Owns `appScreen`. Leaving practice is gated by `controlsDisabled` (no
 *  navigating mid-session); `closeOnSessionView` forces back to 'practice' on
 *  session start. */
export function useAppNavigation({
  controlsDisabled,
  closeOnSessionView,
}: UseAppNavigationArgs): AppNavigation {
  const [appScreen, setAppScreen] = useState<AppScreen>('practice')

  useEffect(() => {
    if (!closeOnSessionView) return
    // setState-in-effect is intentional: the session-start signal owns this reset.
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
