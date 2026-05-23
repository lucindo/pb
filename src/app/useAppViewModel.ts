import { useCallback, useMemo, useState } from 'react'

import { LEARN_CONTENT } from '../content/learnContent'
import { LOCKED_COPY } from '../content/lockedCopy'
import type { StretchSettings } from '../domain/settings'
import { useBeforeInstallPrompt } from '../hooks/useBeforeInstallPrompt'
import { useBreathingSessionController } from '../hooks/useBreathingSessionController'
import { useFavicon } from '../hooks/useFavicon'
import { useIsStandaloneOrPhone } from '../hooks/useIsStandaloneOrPhone'
import { useLocale } from '../hooks/useLocale'
import { useNaviKriyaSessionController } from '../hooks/useNaviKriyaSessionController'
import { useTheme } from '../hooks/useTheme'
import { useVisualCue } from '../hooks/useVisualCue'
import { useWakeLock } from '../hooks/useWakeLock'
import {
  loadActivePractice,
  loadInstallDismissed,
  loadPractices,
  saveActivePractice,
  saveInstallDismissed,
  saveStretchSettings,
  type PracticeId,
  type PracticeMap,
} from '../storage'
import {
  createAudioViewModel,
  createNaviAudioToggleViewModel,
  createPracticeControlsViewModel,
  createPracticeSessionViewModel,
  createPracticeSettingsViewModel,
  type AppEndSessionDialogViewModel,
  type AppViewModel,
} from './appViewModel'
import { useAppDialogs } from './useAppDialogs'
import {
  getPracticeHeader,
  getPracticeTitle,
  getPracticeToggleStrings,
} from './practiceCopy'
import {
  getBreathingPrimaryAction,
  getNaviKriyaPrimaryAction,
} from './sessionPresentation'

export function useAppViewModel(): AppViewModel {
  const initialPractices = useMemo<PracticeMap>(() => loadPractices(), [])
  const [activePractice, setActivePractice] = useState<PracticeId>(() => loadActivePractice())
  const [stretchSettings, setStretchSettings] = useState<StretchSettings>(
    () => initialPractices.stretch.settings,
  )
  const [installDismissed, setInstallDismissed] = useState<boolean>(() => loadInstallDismissed())

  const wakeLock = useWakeLock()
  useTheme()
  useFavicon()

  const { isPhone, isStandalone, isIOS } = useIsStandaloneOrPhone()
  const { deferredPrompt, triggerInstall } = useBeforeInstallPrompt()
  const { cue: liveCue } = useVisualCue()
  const { locale, uiStrings } = useLocale()

  const breathing = useBreathingSessionController({
    initialSettings: initialPractices.resonant.settings,
    activePractice,
    stretchSettings,
    liveCue,
    wakeLock,
  })

  const navi = useNaviKriyaSessionController({
    activePractice,
    initialSettings: initialPractices.naviKriya.settings,
    muted: breathing.audio.muted,
    wakeLock,
  })

  const controlsDisabled = breathing.inSessionView || navi.sessionActive
  const appDialogs = useAppDialogs({
    controlsDisabled,
    closeOnSessionView: breathing.inSessionView,
  })
  const breathingResetSession = breathing.resetSession
  const naviClearCompletion = navi.clearCompletion
  const breathingStartOrCancel = breathing.startOrCancel
  const breathingRequestEnd = breathing.requestEnd
  const naviStart = navi.start
  const naviCancelStart = navi.cancelStart
  const naviRequestEnd = navi.requestEnd
  const {
    muted: audioMuted,
    audioAvailable,
    audioStatus,
    onMuteOrResumeClick,
  } = breathing.audio
  const installable = isIOS || deferredPrompt !== null
  const showBanner =
    isPhone &&
    !isStandalone &&
    !installDismissed &&
    !breathing.inSessionView &&
    installable

  const onStretchSettingsChange = useCallback((next: StretchSettings): void => {
    setStretchSettings(next)
    saveStretchSettings(next)
  }, [])

  const onMuteToggle = useCallback((): void => {
    void onMuteOrResumeClick()
  }, [onMuteOrResumeClick])

  const audio = createAudioViewModel({
    muted: audioMuted,
    audioAvailable,
    onMuteToggle,
    audioStatus,
  })
  const naviAudio = createNaviAudioToggleViewModel({
    muted: audioMuted,
    audioAvailable,
    onMuteToggle,
  })
  const breathingPrimaryAction = getBreathingPrimaryAction({
    status: breathing.session.state.status,
    inLeadIn: breathing.phase === 'lead-in',
  })
  const naviPrimaryAction = getNaviKriyaPrimaryAction({
    starting: navi.starting,
    sessionActive: navi.sessionActive,
  })

  const onBreathingPrimaryClick = useCallback((): void => {
    if (breathingPrimaryAction === 'end') {
      breathingRequestEnd()
      return
    }
    void breathingStartOrCancel()
  }, [breathingPrimaryAction, breathingRequestEnd, breathingStartOrCancel])

  const onNaviPrimaryClick = useCallback((): void => {
    if (naviPrimaryAction === 'cancel') {
      naviCancelStart()
      return
    }
    if (naviPrimaryAction === 'end') {
      naviRequestEnd()
      return
    }
    naviStart()
  }, [naviPrimaryAction, naviCancelStart, naviRequestEnd, naviStart])

  const practiceControls = createPracticeControlsViewModel({
    activePractice,
    breathingAction: breathingPrimaryAction,
    naviAction: naviPrimaryAction,
    strings: uiStrings.controls,
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
  const practiceSettings = createPracticeSettingsViewModel({
    activePractice,
    naviSessionActive: navi.sessionActive,
    resonant: {
      settings: breathing.session.state.selectedSettings,
      isRunning: breathing.inSessionView,
      onChange: breathing.setSelectedSettings,
      onExtendDuration: breathing.session.extendDuration,
    },
    stretch: {
      settings: stretchSettings,
      isRunning: breathing.inSessionView,
      onChange: onStretchSettingsChange,
    },
    naviKriya: {
      settings: navi.settings,
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

  const onInstallDismiss = useCallback((): void => {
    saveInstallDismissed()
    setInstallDismissed(true)
  }, [])

  return {
    activePractice,
    appHeader: getPracticeHeader(activePractice, uiStrings),
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
    install: {
      showBanner,
      isIOS,
      isStandalone,
      installable,
      onInstall: triggerInstall,
      onDismiss: onInstallDismiss,
    },
    dialogs: {
      learnOpen: appDialogs.learnOpen,
      settingsOpen: appDialogs.settingsOpen,
      settingsInSessionView: breathing.inSessionView,
      endSessionDialogs,
      onLearnOpen: appDialogs.onLearnOpen,
      onLearnClose: appDialogs.onLearnClose,
      onSettingsOpen: appDialogs.onSettingsOpen,
      onSettingsClose: appDialogs.onSettingsClose,
    },
    onSwitchPractice,
  }
}
