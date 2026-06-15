import { useCallback, useMemo, useState } from 'react'

import { LEARN_CONTENT } from '../content/learnContent'
import { LOCKED_COPY } from '../content/lockedCopy'
import { useBeforeInstallPrompt } from '../hooks/useBeforeInstallPrompt'
import { useBreathingSessionController } from '../hooks/useBreathingSessionController'
import { useFeatureFlags } from '../hooks/useFeatureFlags'
import { useFavicon } from '../hooks/useFavicon'
import { useIsStandaloneOrPhone } from '../hooks/useIsStandaloneOrPhone'
import { useLocale } from '../hooks/useLocale'
import { useTheme } from '../hooks/useTheme'
import { useVisualCue } from '../hooks/useVisualCue'
import { useWakeLock } from '../hooks/useWakeLock'
import {
  loadPractices,
  resetPracticeStats,
  ZERO_STATS,
  type PracticeId,
  type PracticeMap,
} from '../storage'
import {
  createAudioViewModel,
  createInstallViewModel,
  createPracticeControlsViewModel,
  createPracticeSessionViewModel,
  createPracticeSettingsViewModel,
  type AppEndSessionDialogViewModel,
  type AppViewModel,
  type PracticeStatsMap,
} from './appViewModel'
import { getBreathingPrimaryAction } from './sessionPresentation'
import { useAppNavigation } from './useAppNavigation'

function snapshotStats(practices: PracticeMap): PracticeStatsMap {
  return {
    resonant: practices.resonant.stats,
  }
}

export function useAppViewModel(): AppViewModel {
  const initialPractices = useMemo<PracticeMap>(() => loadPractices(), [])
  const wakeLock = useWakeLock()
  useTheme()
  useFavicon()

  const { isStandalone, isIOS } = useIsStandaloneOrPhone()
  const { deferredPrompt, triggerInstall } = useBeforeInstallPrompt()
  const { cue: liveCue } = useVisualCue()
  const { locale, uiStrings } = useLocale()
  const featureFlags = useFeatureFlags()

  const breathing = useBreathingSessionController({
    initialSettings: initialPractices.resonant.settings,
    liveCue,
    wakeLock,
    bypassSilentMode: featureFlags.bypassSilentMode,
  })

  const controlsDisabled = breathing.inSessionView
  const appNavigation = useAppNavigation({
    controlsDisabled,
    closeOnSessionView: controlsDisabled,
  })

  // Stats are written to disk by the session controller but not mirrored into
  // this state, so re-read on Stats-page entry to reflect the latest session.
  // The page is unreachable mid-session, so a read-on-open is sufficient.
  const [stats, setStats] = useState<PracticeStatsMap>(() => snapshotStats(initialPractices))
  const navOnStatsOpen = appNavigation.onStatsOpen
  const onStatsOpen = useCallback((): void => {
    setStats(snapshotStats(loadPractices()))
    navOnStatsOpen()
  }, [navOnStatsOpen])
  const onResetPracticeStats = useCallback((practice: PracticeId): void => {
    resetPracticeStats(practice)
    // Optimistic RAM update — the disk write is fire-and-forget (quota / ITP).
    setStats((prev) => ({ ...prev, [practice]: { ...ZERO_STATS } }))
  }, [])

  const breathingResetSession = breathing.resetSession
  const breathingStartOrCancel = breathing.startOrCancel
  const breathingRequestEnd = breathing.requestEnd
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

  const onBreathingPrimaryClick = useCallback((): void => {
    if (breathingAction === 'end') {
      breathingRequestEnd()
      return
    }
    if (breathingAction === 'done') {
      // Dismiss the completion state back to idle. resetSession invokes the
      // domain endSession on CompleteSessionState which yields IdleSessionState.
      breathingResetSession()
      return
    }
    if (breathingAction === 'cancel') {
      // startOrCancel handles the cancel path internally when phase === 'lead-in'.
      void breathingStartOrCancel()
      return
    }
    // 'start': startOrCancel transitions idle → lead-in → running.
    void breathingStartOrCancel()
  }, [breathingAction, breathingRequestEnd, breathingResetSession, breathingStartOrCancel])

  const practiceControls = createPracticeControlsViewModel({
    breathingAction,
    strings: uiStrings.practice.controls,
    breathingAudio: audio,
    onBreathingPrimaryClick,
  })
  const practiceSession = createPracticeSessionViewModel({
    breathing: {
      phase: breathing.phase,
      sessionCue: breathing.sessionCue,
      leadInDigit: breathing.leadInDigit,
      leadInPlaceholderFrame: breathing.leadInPlaceholderFrame,
      liveFrame: breathing.session.liveFrame,
      status: breathing.session.state.status,
      inSessionView: breathing.inSessionView,
      selectedSettings: breathing.session.state.selectedSettings,
    },
    liveCue,
  })
  const isComplete = breathing.session.state.status === 'complete' && !breathing.inSessionView
  const practiceSettings = createPracticeSettingsViewModel({
    settings: breathing.session.state.selectedSettings,
    isRunning: breathing.inSessionView,
    isComplete,
    onChange: breathing.setSelectedSettings,
    onExtendDuration: breathing.session.extendDuration,
  })
  const endSessionDialogs: readonly AppEndSessionDialogViewModel[] = [
    {
      id: 'breathing',
      open: breathing.endDialogOpen,
      onConfirm: breathing.confirmEnd,
      onCancel: breathing.cancelEnd,
    },
  ]

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
    audio,
    practiceControls,
    uiStrings,
    learnContent: LEARN_CONTENT[locale],
    lockedCopy: LOCKED_COPY[locale],
    featureFlags,
    install,
    navigation: { ...appNavigation, onStatsOpen },
    dialogs: { endSessionDialogs },
    stats,
    onResetPracticeStats,
  }
}
