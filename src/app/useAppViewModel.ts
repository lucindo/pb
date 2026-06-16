import { useCallback, useMemo, useState } from 'react'

import { LEARN_CONTENT } from '../content/learnContent'
import { LOCKED_COPY } from '../content/lockedCopy'
import type { SessionSettings } from '../domain'
import { useBeforeInstallPrompt } from '../hooks/useBeforeInstallPrompt'
import { useBreathingSessionController } from '../hooks/useBreathingSessionController'
import { useBypassSilentMode } from '../hooks/useBypassSilentMode'
import { useFavicon } from '../hooks/useFavicon'
import { useIsStandaloneOrPhone } from '../hooks/useIsStandaloneOrPhone'
import { useLocale } from '../hooks/useLocale'
import { useTheme } from '../hooks/useTheme'
import { useWakeLock } from '../hooks/useWakeLock'
import {
  loadSettings,
  loadStats,
  resetStats,
  ZERO_STATS,
  type PersistedStats,
} from '../storage'
import {
  createAudioViewModel,
  createInstallViewModel,
  createPracticeControlsViewModel,
  createPracticeSessionViewModel,
  createPracticeSettingsViewModel,
  type AppEndSessionDialogViewModel,
  type AppViewModel,
} from './appViewModel'
import { getBreathingPrimaryAction, type BreathingPrimaryAction } from './sessionPresentation'
import { useAppNavigation } from './useAppNavigation'

// Stats are written to disk by the session controller but not mirrored into this
// state; refreshStats re-reads on Settings open (stats render inline there) to
// reflect the latest session. Settings is unreachable mid-session, so read-on-open
// is sufficient.
function useStatsPanel(): { stats: PersistedStats; refreshStats: () => void; onResetStats: () => void } {
  const [stats, setStats] = useState<PersistedStats>(() => loadStats())
  const refreshStats = useCallback((): void => {
    setStats(loadStats())
  }, [])
  const onResetStats = useCallback((): void => {
    resetStats()
    // Optimistic RAM update — the disk write is fire-and-forget (quota / ITP).
    setStats({ ...ZERO_STATS })
  }, [])
  return { stats, refreshStats, onResetStats }
}

// Dispatch the single breathing primary button to the right controller action.
// 'cancel' and 'start' both route through startOrCancel (it branches internally on
// phase === 'lead-in').
function useBreathingPrimaryClick(input: {
  action: BreathingPrimaryAction
  requestEnd: () => void
  resetSession: () => void
  startOrCancel: () => Promise<void>
}): () => void {
  const { action, requestEnd, resetSession, startOrCancel } = input
  return useCallback((): void => {
    if (action === 'end') {
      requestEnd()
      return
    }
    if (action === 'done') {
      // Dismiss the completion state back to idle (domain endSession on
      // CompleteSessionState yields IdleSessionState).
      resetSession()
      return
    }
    void startOrCancel()
  }, [action, requestEnd, resetSession, startOrCancel])
}

export function useAppViewModel(): AppViewModel {
  const initialSettings = useMemo<SessionSettings>(() => loadSettings(), [])
  const wakeLock = useWakeLock()
  useTheme()
  useFavicon()

  const { isStandalone, isIOS } = useIsStandaloneOrPhone()
  const { deferredPrompt, triggerInstall } = useBeforeInstallPrompt()
  const { locale, uiStrings } = useLocale()
  const { bypassSilentMode } = useBypassSilentMode()

  const breathing = useBreathingSessionController({
    initialSettings,
    wakeLock,
    bypassSilentMode,
  })

  const controlsDisabled = breathing.inSessionView
  const appNavigation = useAppNavigation({
    controlsDisabled,
    closeOnSessionView: controlsDisabled,
  })

  const { stats, refreshStats, onResetStats } = useStatsPanel()
  const navOnSettingsOpen = appNavigation.onSettingsOpen
  const onSettingsOpen = useCallback((): void => {
    refreshStats()
    navOnSettingsOpen()
  }, [refreshStats, navOnSettingsOpen])

  const { onMuteOrResumeClick } = breathing.audio

  const onMuteToggle = useCallback((): void => {
    void onMuteOrResumeClick()
  }, [onMuteOrResumeClick])

  const audio = createAudioViewModel({
    muted: breathing.audio.muted,
    audioAvailable: breathing.audio.audioAvailable,
    audioStatus: breathing.audio.audioStatus,
    onMuteToggle,
  })

  const breathingAction = getBreathingPrimaryAction({
    status: breathing.session.state.status,
    inLeadIn: breathing.phase === 'lead-in',
  })
  const onBreathingPrimaryClick = useBreathingPrimaryClick({
    action: breathingAction,
    requestEnd: breathing.requestEnd,
    resetSession: breathing.resetSession,
    startOrCancel: breathing.startOrCancel,
  })

  const practiceControls = createPracticeControlsViewModel({
    breathingAction,
    strings: uiStrings.practice.controls,
    breathingAudio: audio,
    onBreathingPrimaryClick,
  })
  const practiceSession = createPracticeSessionViewModel({
    breathing: {
      phase: breathing.phase,
      leadInDigit: breathing.leadInDigit,
      leadInPlaceholderFrame: breathing.leadInPlaceholderFrame,
      liveFrame: breathing.session.liveFrame,
      status: breathing.session.state.status,
      inSessionView: breathing.inSessionView,
      selectedSettings: breathing.session.state.selectedSettings,
    },
  })
  const isComplete = breathing.session.state.status === 'complete' && !breathing.inSessionView
  const practiceSettings = createPracticeSettingsViewModel({
    settings: breathing.session.state.selectedSettings,
    isRunning: breathing.inSessionView,
    isComplete,
    onChange: breathing.setSelectedSettings,
    onExtendDuration: breathing.session.extendDuration,
  })
  const endSession: AppEndSessionDialogViewModel = {
    open: breathing.endDialogOpen,
    onConfirm: breathing.confirmEnd,
    onCancel: breathing.cancelEnd,
  }

  const install = createInstallViewModel({
    isStandalone,
    isIOS,
    canPromptInstall: deferredPrompt !== null,
    onInstall: triggerInstall,
  })

  return {
    locale,
    appTitle: uiStrings.practice.title,
    controlsDisabled,
    practiceSession,
    practiceSettings,
    practiceControls,
    uiStrings,
    learnContent: LEARN_CONTENT[locale],
    lockedCopy: LOCKED_COPY[locale],
    install,
    navigation: { ...appNavigation, onSettingsOpen },
    dialogs: { endSession },
    stats,
    onResetStats,
  }
}
