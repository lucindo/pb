import type { UiStrings } from '../content/strings'
import type { StretchSettings } from '../domain/settings'
import type { BreathingSessionController } from '../hooks/useBreathingSessionController'
import type { NaviKriyaSessionController } from '../hooks/useNaviKriyaSessionController'
import type { PracticeId } from '../storage'
import {
  createAudioViewModel,
  createNaviAudioToggleViewModel,
  createPracticeControlsViewModel,
  createPracticeSessionViewModel,
  createPracticeSettingsViewModel,
  type AppAudioToggleViewModel,
  type AppAudioViewModel,
  type AppDialogsViewModel,
  type AppEndSessionDialogViewModel,
  type AppPracticeControlsViewModel,
  type AppPracticeSessionViewModel,
  type AppPracticeSettingsViewModel,
} from './appViewModel'
import type { AppNavigation } from './useAppNavigation'
import {
  getBreathingPrimaryAction,
  getNaviKriyaPrimaryAction,
  type SessionPrimaryAction,
} from './sessionPresentation'

export interface AppAudioViewModels {
  audio: AppAudioViewModel
  naviAudio: AppAudioToggleViewModel
}

export function createAudioViewModelsFromBreathingController({
  breathing,
  onMuteToggle,
}: {
  breathing: BreathingSessionController
  onMuteToggle(this: void): void
}): AppAudioViewModels {
  const {
    muted,
    audioAvailable,
    audioStatus,
  } = breathing.audio

  return {
    audio: createAudioViewModel({
      muted,
      audioAvailable,
      audioStatus,
      onMuteToggle,
    }),
    naviAudio: createNaviAudioToggleViewModel({
      muted,
      audioAvailable,
      onMuteToggle,
    }),
  }
}

export interface PracticePrimaryActions {
  breathing: SessionPrimaryAction
  naviKriya: SessionPrimaryAction
}

export function getPracticePrimaryActionsFromControllers({
  breathing,
  navi,
}: {
  breathing: BreathingSessionController
  navi: NaviKriyaSessionController
}): PracticePrimaryActions {
  return {
    breathing: getBreathingPrimaryAction({
      status: breathing.session.state.status,
      inLeadIn: breathing.phase === 'lead-in',
    }),
    naviKriya: getNaviKriyaPrimaryAction({
      starting: navi.starting,
      sessionActive: navi.sessionActive,
    }),
  }
}

export function createPracticeSessionViewModelFromControllers({
  activePractice,
  breathing,
  navi,
  liveCue,
}: {
  activePractice: PracticeId
  breathing: BreathingSessionController
  navi: NaviKriyaSessionController
  liveCue: Parameters<typeof createPracticeSessionViewModel>[0]['liveCue']
}): AppPracticeSessionViewModel {
  return createPracticeSessionViewModel({
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
}

export function createPracticeSettingsViewModelFromControllers({
  activePractice,
  breathing,
  navi,
  stretchSettings,
  onStretchSettingsChange,
}: {
  activePractice: PracticeId
  breathing: BreathingSessionController
  navi: NaviKriyaSessionController
  stretchSettings: StretchSettings
  onStretchSettingsChange(this: void, settings: StretchSettings): void
}): AppPracticeSettingsViewModel {
  return createPracticeSettingsViewModel({
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
}

export function createPracticeControlsViewModelFromControllers({
  activePractice,
  actions,
  strings,
  audio,
  naviAudio,
  onBreathingPrimaryClick,
  onNaviPrimaryClick,
}: {
  activePractice: PracticeId
  actions: PracticePrimaryActions
  strings: UiStrings['controls']
  audio: AppAudioViewModel
  naviAudio: AppAudioToggleViewModel
  onBreathingPrimaryClick(this: void): void
  onNaviPrimaryClick(this: void): void
}): AppPracticeControlsViewModel {
  return createPracticeControlsViewModel({
    activePractice,
    breathingAction: actions.breathing,
    naviAction: actions.naviKriya,
    strings,
    breathingAudio: audio,
    naviAudio,
    onBreathingPrimaryClick,
    onNaviPrimaryClick,
  })
}

export function createEndSessionDialogViewModelsFromControllers({
  breathing,
  navi,
}: {
  breathing: BreathingSessionController
  navi: NaviKriyaSessionController
}): readonly AppEndSessionDialogViewModel[] {
  return [
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
}

export function createAppDialogsViewModel({
  navigation,
  endSessionDialogs,
}: {
  navigation: AppNavigation
  endSessionDialogs: readonly AppEndSessionDialogViewModel[]
}): AppDialogsViewModel {
  return {
    appScreen: navigation.appScreen,
    endSessionDialogs,
    onLearnOpen: navigation.onLearnOpen,
    onSettingsOpen: navigation.onSettingsOpen,
    onBackToPractice: navigation.onBackToPractice,
  }
}
