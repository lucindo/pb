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
  createInstallViewModel,
  type AppViewModel,
} from './appViewModel'
import {
  createAppDialogsViewModel,
  createAppNavigationViewModel,
  createAudioViewModelsFromBreathingController,
  createEndSessionDialogViewModelsFromControllers,
  createPracticeControlsViewModelFromControllers,
  createPracticeSessionViewModelFromControllers,
  createPracticeSettingsViewModelFromControllers,
  getPracticePrimaryActionsFromControllers,
} from './appControllerAdapters'
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
  })

  const navi = useNaviKriyaSessionController({
    activePractice,
    initialSettings: initialPractices.naviKriya.settings,
    muted: breathing.audio.muted,
    wakeLock,
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

  const {
    audio,
    naviAudio,
  } = createAudioViewModelsFromBreathingController({
    breathing,
    onMuteToggle,
  })
  const primaryActions = getPracticePrimaryActionsFromControllers({
    breathing,
    navi,
  })

  const onBreathingPrimaryClick = useCallback((): void => {
    if (primaryActions.breathing === 'end') {
      breathingRequestEnd()
      return
    }
    if (primaryActions.breathing === 'done') {
      // Dismiss the completion state back to idle. resetSession invokes the
      // domain endSession on CompleteSessionState which yields IdleSessionState.
      breathingResetSession()
      return
    }
    if (primaryActions.breathing === 'cancel') {
      // startOrCancel handles the cancel path internally when phase === 'lead-in'.
      void breathingStartOrCancel()
      return
    }
    // 'start': startOrCancel transitions idle → lead-in → running.
    void breathingStartOrCancel()
  }, [primaryActions.breathing, breathingRequestEnd, breathingResetSession, breathingStartOrCancel])

  const onNaviPrimaryClick = useCallback((): void => {
    if (primaryActions.naviKriya === 'cancel') {
      naviCancelStart()
      return
    }
    if (primaryActions.naviKriya === 'end') {
      naviRequestEnd()
      return
    }
    if (primaryActions.naviKriya === 'done') {
      // Dismiss the completion state back to idle. clearCompletion resets
      // justCompleted → false, causing the primary action to return to 'start'.
      naviClearCompletion()
      return
    }
    naviStart()
  }, [primaryActions.naviKriya, naviCancelStart, naviRequestEnd, naviClearCompletion, naviStart])

  const practiceControls = createPracticeControlsViewModelFromControllers({
    activePractice,
    actions: primaryActions,
    strings: uiStrings.practice.controls,
    audio,
    naviAudio,
    onBreathingPrimaryClick,
    onNaviPrimaryClick,
  })
  const practiceSession = createPracticeSessionViewModelFromControllers({
    activePractice,
    breathing,
    navi,
    liveCue,
  })
  const practiceSettings = createPracticeSettingsViewModelFromControllers({
    activePractice,
    breathing,
    navi,
    stretchSettings,
    onStretchSettingsChange,
  })
  const endSessionDialogs = createEndSessionDialogViewModelsFromControllers({ breathing, navi })

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
    navigation: createAppNavigationViewModel({ navigation: appNavigation }),
    dialogs: createAppDialogsViewModel({ endSessionDialogs }),
    onSwitchPractice,
  }
}
