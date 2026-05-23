import { useCallback, useEffect, useState } from 'react'

export interface AppModalDialogs {
  learnOpen: boolean
  settingsOpen: boolean
  onLearnOpen(this: void): void
  onLearnClose(this: void): void
  onSettingsOpen(this: void): void
  onSettingsClose(this: void): void
}

export interface UseAppDialogsArgs {
  controlsDisabled: boolean
  closeOnSessionView: boolean
}

export function useAppDialogs({
  controlsDisabled,
  closeOnSessionView,
}: UseAppDialogsArgs): AppModalDialogs {
  const [learnOpen, setLearnOpen] = useState<boolean>(false)
  const [settingsOpen, setSettingsOpen] = useState<boolean>(false)

  useEffect(() => {
    if (!closeOnSessionView) return
    // Dialog visibility mirrors the session view state.
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setLearnOpen(false)
    setSettingsOpen(false)
  }, [closeOnSessionView])

  const onLearnOpen = useCallback((): void => {
    if (controlsDisabled) return
    setLearnOpen(true)
  }, [controlsDisabled])

  const onLearnClose = useCallback((): void => {
    setLearnOpen(false)
  }, [])

  const onSettingsOpen = useCallback((): void => {
    if (controlsDisabled) return
    setSettingsOpen(true)
  }, [controlsDisabled])

  const onSettingsClose = useCallback((): void => {
    setSettingsOpen(false)
  }, [])

  return {
    learnOpen,
    settingsOpen,
    onLearnOpen,
    onLearnClose,
    onSettingsOpen,
    onSettingsClose,
  }
}
