import { useCallback, useMemo, useState } from 'react'

import { LEARN_CONTENT } from '../content/learnContent'
import { LOCKED_COPY } from '../content/lockedCopy'
import type { StretchSettings } from '../domain'
import { useBeforeInstallPrompt } from '../hooks/useBeforeInstallPrompt'
import { useBreathingSessionController } from '../hooks/useBreathingSessionController'
import { useFeatureFlags } from '../hooks/useFeatureFlags'
import { useFavicon } from '../hooks/useFavicon'
import { useIsStandaloneOrPhone } from '../hooks/useIsStandaloneOrPhone'
import { useLocale } from '../hooks/useLocale'
import { useNaviKriyaSessionController } from '../hooks/useNaviKriyaSessionController'
import { useTheme } from '../hooks/useTheme'
import { useVisualCue } from '../hooks/useVisualCue'
import { useWakeLock } from '../hooks/useWakeLock'
import {
  loadActivePractice,
  loadPractices,
  saveActivePractice,
  saveStretchSettings,
  type PracticeId,
  type PracticeMap,
} from '../storage'
import {
  createAudioViewModel,
  createInstallViewModel,
  createNaviAudioToggleViewModel,
  createPracticeControlsViewModel,
  createPracticeSessionViewModel,
  createPracticeSettingsViewModel,
  type AppEndSessionDialogViewModel,
  type AppViewModel,
} from './appViewModel'
import {
  getBreathingPrimaryAction,
  getNaviKriyaPrimaryAction,
} from './sessionPresentation'
import { useAppNavigation } from './useAppNavigation'
import { getPracticeTitle, getPracticeToggleStrings } from './practiceCopy'

export function useAppViewModel(): AppViewModel {
  const initialPractices = useMemo<PracticeMap>(() => loadPractices(), [])
  const [activePractice, setActivePractice] = useState<PracticeId>(() => loadActivePractice())
  const [stretchSettings, setStretchSettings] = useState<StretchSettings>(
    () => initialPractices.stretch.settings,
  )
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
    activePractice,
    stretchSettings,
    liveCue,
    wakeLock,
    bypassSilentMode: featureFlags.bypassSilentMode,
  })

  const navi = useNaviKriyaSessionController({
    activePractice,
    initialSettings: initialPractices.naviKriya.settings,
    muted: breathing.audio.muted,
    wakeLock,
    bypassSilentMode: featureFlags.bypassSilentMode,
  })

  const controlsDisabled = breathing.inSessionView || navi.sessionActive
  const appNavigation = useAppNavigation({
    controlsDisabled,
    closeOnSessionView: controlsDisabled,
  })
  const breathingResetSession = breathing.resetSession
  const naviClearCompletion = navi.clearCompletion
  const breathingStartOrCancel = breathing.startOrCancel
  const breathingRequestEnd = breathing.requestEnd
  const naviStart = navi.start
  const naviCancelStart = navi.cancelStart
  const naviRequestEnd = navi.requestEnd
  const { onMuteOrResumeClick } = breathing.audio
  const onStretchSettingsChange = useCallback((next: StretchSettings): void => {
    setStretchSettings(next)
    saveStretchSettings(next)
  }, [])

  const onMuteToggle = useCallback((): void => {
    void onMuteOrResumeClick()
  }, [onMuteOrResumeClick])

  const audio = createAudioViewModel({
    muted: breathing.audio.muted,
    audioAvailable: breathing.audio.audioAvailable,
    audioStatus: breathing.audio.audioStatus,
    onMuteToggle,
  })
  const naviAudio = createNaviAudioToggleViewModel({
    muted: breathing.audio.muted,
    audioAvailable: breathing.audio.audioAvailable,
    onMuteToggle,
  })

  const breathingAction = getBreathingPrimaryAction({
    status: breathing.session.state.status,
    inLeadIn: breathing.phase === 'lead-in',
  })
  const naviAction = getNaviKriyaPrimaryAction({
    starting: navi.starting,
    sessionActive: navi.sessionActive,
    justCompleted: navi.justCompleted,
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

  const onNaviPrimaryClick = useCallback((): void => {
    if (naviAction === 'cancel') {
      naviCancelStart()
      return
    }
    if (naviAction === 'end') {
      naviRequestEnd()
      return
    }
    if (naviAction === 'done') {
      // Dismiss the completion state back to idle. clearCompletion resets
      // justCompleted → false, causing the primary action to return to 'start'.
      naviClearCompletion()
      return
    }
    naviStart()
  }, [naviAction, naviCancelStart, naviRequestEnd, naviClearCompletion, naviStart])

  const practiceControls = createPracticeControlsViewModel({
    activePractice,
    breathingAction,
    naviAction,
    strings: uiStrings.practice.controls,
    breathingAudio: audio,
    naviAudio,
    onBreathingPrimaryClick,
    onNaviPrimaryClick,
  })
  const practiceSession = createPracticeSessionViewModel({
    activePractice,
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
    navi: {
      sessionActive: navi.sessionActive,
      starting: navi.starting,
      leadInDigit: navi.leadInDigit,
      phase: navi.phase,
      round: navi.round,
      count: navi.count,
      running: navi.running,
      settings: navi.settings,
      justCompleted: navi.justCompleted,
    },
    liveCue,
  })
  const isComplete = breathing.session.state.status === 'complete' && !breathing.inSessionView
  const practiceSettings = createPracticeSettingsViewModel({
    activePractice,
    naviSessionActive: navi.sessionActive,
    resonant: {
      settings: breathing.session.state.selectedSettings,
      isRunning: breathing.inSessionView,
      isComplete,
      onChange: breathing.setSelectedSettings,
      onExtendDuration: breathing.session.extendDuration,
    },
    stretch: {
      settings: stretchSettings,
      isRunning: breathing.inSessionView,
      isComplete,
      onChange: onStretchSettingsChange,
    },
    naviKriya: {
      settings: navi.settings,
      isComplete: navi.justCompleted,
      onChange: navi.setSettings,
    },
  })
  const endSessionDialogs: readonly AppEndSessionDialogViewModel[] = [
    {
      id: 'breathing',
      open: breathing.endDialogOpen,
      onConfirm: breathing.confirmEnd,
      onCancel: breathing.cancelEnd,
    },
    {
      id: 'naviKriya',
      open: navi.endDialogOpen,
      onConfirm: navi.confirmEnd,
      onCancel: navi.cancelEnd,
    },
  ]

  const onSwitchPractice = useCallback((next: PracticeId): void => {
    if (controlsDisabled) return
    naviClearCompletion()
    breathingResetSession()
    setActivePractice(next)
    saveActivePractice(next)
  }, [controlsDisabled, breathingResetSession, naviClearCompletion])

  const install = createInstallViewModel({
    isStandalone,
    isIOS,
    canPromptInstall: deferredPrompt !== null,
    onInstall: triggerInstall,
  })

  return {
    activePractice,
    appTitle: getPracticeTitle(activePractice, uiStrings),
    workspaceCompact: breathing.inSessionView,
    controlsDisabled,
    practiceSession,
    practiceSettings,
    audio,
    practiceControls,
    uiStrings,
    learnContent: LEARN_CONTENT[locale],
    lockedCopy: LOCKED_COPY[locale],
    practiceToggleStrings: getPracticeToggleStrings(uiStrings),
    featureFlags,
    install,
    navigation: appNavigation,
    dialogs: { endSessionDialogs },
    onSwitchPractice,
  }
}
