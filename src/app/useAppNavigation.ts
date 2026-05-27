import { useCallback, useEffect, useState } from 'react'

export type AppScreen = 'practice' | 'learn' | 'appSettings' | 'advanced'

export interface AppNavigation {
  appScreen: AppScreen
  returningFromAdvanced: boolean
  onLearnOpen(this: void): void
  onSettingsOpen(this: void): void
  onAdvancedOpen(this: void): void
  onBackToPractice(this: void): void
  onBackFromAdvanced(this: void): void
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
  const [returningFromAdvanced, setReturningFromAdvanced] = useState<boolean>(false)

  useEffect(() => {
    if (!closeOnSessionView) return
    // Reason: force navigation back to the practice surface when a session starts;
    // setState inside effect is intentional — the session-start signal owns this transition.
    /* eslint-disable react-hooks/set-state-in-effect */
    setAppScreen('practice')
    setReturningFromAdvanced(false)
    /* eslint-enable react-hooks/set-state-in-effect */
  }, [closeOnSessionView])

  const onLearnOpen = useCallback((): void => {
    if (controlsDisabled) return
    setAppScreen('learn')
    setReturningFromAdvanced(false)
  }, [controlsDisabled])

  const onSettingsOpen = useCallback((): void => {
    if (controlsDisabled) return
    setAppScreen('appSettings')
    setReturningFromAdvanced(false)
  }, [controlsDisabled])

  const onAdvancedOpen = useCallback((): void => {
    if (controlsDisabled) return
    setAppScreen('advanced')
    setReturningFromAdvanced(false)
  }, [controlsDisabled])

  const onBackToPractice = useCallback((): void => {
    setAppScreen('practice')
    setReturningFromAdvanced(false)
  }, [])

  const onBackFromAdvanced = useCallback((): void => {
    setAppScreen('appSettings')
    setReturningFromAdvanced(true)
  }, [])

  return {
    appScreen,
    returningFromAdvanced,
    onLearnOpen,
    onSettingsOpen,
    onAdvancedOpen,
    onBackToPractice,
    onBackFromAdvanced,
  }
}
