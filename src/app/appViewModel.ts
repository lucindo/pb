import type { LEARN_CONTENT } from '../content/learnContent'
import type { LOCKED_COPY } from '../content/lockedCopy'
import type { UiStrings } from '../content/strings'
import type { AppScreen } from './useAppNavigation'
import type { AudioStatusFlag } from '../audio/audioStatus'
import type { NaviKriyaSettings } from '../domain/naviKriyaSettings'
import type { SessionStatus } from '../domain/sessionController'
import type { BreathingSessionPhase, LeadInDigit, NaviLeadInDigit } from '../domain/sessionLifecycle'
import type { SessionFrame } from '../domain/sessionMath'
import type { CueStyleId, SessionSettings, StretchSettings } from '../domain/settings'
import type { FeatureFlags } from '../featureFlags'
import type { PracticeId } from '../storage'
import type { getPracticeToggleStrings } from './practiceCopy'
import {
  getBreathingPresentation,
  getNaviKriyaPresentation,
  getSessionPrimaryActionLabel,
  type BreathingPresentation,
  type NaviKriyaPresentation,
  type SessionPrimaryAction,
} from './sessionPresentation'

type LearnContent = (typeof LEARN_CONTENT)[keyof typeof LEARN_CONTENT]
type LockedCopy = (typeof LOCKED_COPY)[keyof typeof LOCKED_COPY]

export interface AppInstallViewModel {
  showBanner: boolean
  isIOS: boolean
  isStandalone: boolean
  installable: boolean
  onInstall(this: void): Promise<void>
  onDismiss(this: void): void
}

export interface AppEndSessionDialogViewModel {
  id: 'breathing' | 'naviKriya'
  open: boolean
  onConfirm(this: void): void
  onCancel(this: void): void
}

export interface AppDialogsViewModel {
  appScreen: AppScreen
  endSessionDialogs: readonly AppEndSessionDialogViewModel[]
  onLearnOpen(this: void): void
  onSettingsOpen(this: void): void
  onBackToPractice(this: void): void
}

export const AUDIO_RESUME_HINT_ID = 'mute-toggle-resume-hint'

export interface AppAudioToggleViewModel {
  muted: boolean
  audioAvailable: boolean
  needsResume: boolean
  resumeHintId: string
  onMuteToggle(this: void): void
}

export interface AppAudioViewModel extends AppAudioToggleViewModel {
  audioStatus: AudioStatusFlag
}

export interface AppPracticeControlsViewModel {
  primaryLabel: string
  onPrimaryClick(this: void): void
  audio: AppAudioToggleViewModel
}

export type AppPracticeSessionViewModel =
  | {
      kind: 'breathing'
      presentation: BreathingPresentation
    }
  | {
      kind: 'naviKriya'
      presentation: NaviKriyaPresentation
    }

export type AppPracticeSettingsViewModel =
  | {
      kind: 'hidden'
    }
  | {
      kind: 'resonant'
      settings: SessionSettings
      isRunning: boolean
      onChange(this: void, settings: SessionSettings): void
      onExtendDuration(this: void, durationMinutes: number): void
    }
  | {
      kind: 'stretch'
      settings: StretchSettings
      isRunning: boolean
      onChange(this: void, settings: StretchSettings): void
    }
  | {
      kind: 'naviKriya'
      settings: NaviKriyaSettings
      onChange(this: void, settings: NaviKriyaSettings): void
    }

export interface AppViewModel {
  activePractice: PracticeId
  appHeader: string
  appTitle: string
  workspaceCompact: boolean
  controlsDisabled: boolean
  practiceSession: AppPracticeSessionViewModel
  practiceSettings: AppPracticeSettingsViewModel
  audio: AppAudioViewModel
  practiceControls: AppPracticeControlsViewModel
  uiStrings: UiStrings
  learnContent: LearnContent
  lockedCopy: LockedCopy
  practiceToggleStrings: ReturnType<typeof getPracticeToggleStrings>
  featureFlags: FeatureFlags
  install: AppInstallViewModel
  dialogs: AppDialogsViewModel
  onSwitchPractice(this: void, next: PracticeId): void
}

export interface CreateInstallViewModelArgs {
  isPhone: boolean
  isStandalone: boolean
  isIOS: boolean
  installDismissed: boolean
  inSessionView: boolean
  canPromptInstall: boolean
  onInstall(this: void): Promise<void>
  onDismiss(this: void): void
}

export function createInstallViewModel({
  isPhone,
  isStandalone,
  isIOS,
  installDismissed,
  inSessionView,
  canPromptInstall,
  onInstall,
  onDismiss,
}: CreateInstallViewModelArgs): AppInstallViewModel {
  const installable = isIOS || canPromptInstall

  return {
    showBanner: isPhone && !isStandalone && !installDismissed && !inSessionView && installable,
    isIOS,
    isStandalone,
    installable,
    onInstall,
    onDismiss,
  }
}

export interface BreathingSessionViewState {
  phase: BreathingSessionPhase
  sessionCue: CueStyleId | null
  leadInDigit: LeadInDigit | null
  leadInPlaceholderFrame: SessionFrame | null
  liveFrame: SessionFrame | null
  status: SessionStatus
  inSessionView: boolean
}

export interface NaviKriyaSessionViewState {
  sessionActive: boolean
  starting: boolean
  leadInDigit: NaviLeadInDigit | null
  phase: 'idle' | 'front' | 'back' | 'done'
  round: number
  count: number
  running: boolean
  settings: NaviKriyaSettings
  justCompleted: boolean
}

export interface CreatePracticeSessionViewModelArgs {
  activePractice: PracticeId
  breathing: BreathingSessionViewState
  navi: NaviKriyaSessionViewState
  liveCue: CueStyleId
}

export function createPracticeSessionViewModel({
  activePractice,
  breathing,
  navi,
  liveCue,
}: CreatePracticeSessionViewModelArgs): AppPracticeSessionViewModel {
  if (activePractice === 'naviKriya') {
    return {
      kind: 'naviKriya',
      presentation: getNaviKriyaPresentation({
        sessionActive: navi.sessionActive,
        starting: navi.starting,
        leadInDigit: navi.leadInDigit,
        phase: navi.phase,
        round: navi.round,
        count: navi.count,
        running: navi.running,
        settings: navi.settings,
        justCompleted: navi.justCompleted,
        liveCue,
      }),
    }
  }

  return {
    kind: 'breathing',
    presentation: getBreathingPresentation({
      phase: breathing.phase,
      sessionCue: breathing.sessionCue,
      liveCue,
      leadInDigit: breathing.leadInDigit,
      leadInPlaceholderFrame: breathing.leadInPlaceholderFrame,
      liveFrame: breathing.liveFrame,
      status: breathing.status,
      inSessionView: breathing.inSessionView,
    }),
  }
}

export interface PracticeSettingsSources {
  activePractice: PracticeId
  naviSessionActive: boolean
  resonant: {
    settings: SessionSettings
    isRunning: boolean
    onChange(this: void, settings: SessionSettings): void
    onExtendDuration(this: void, durationMinutes: number): void
  }
  stretch: {
    settings: StretchSettings
    isRunning: boolean
    onChange(this: void, settings: StretchSettings): void
  }
  naviKriya: {
    settings: NaviKriyaSettings
    onChange(this: void, settings: NaviKriyaSettings): void
  }
}

export function createPracticeSettingsViewModel(
  sources: PracticeSettingsSources,
): AppPracticeSettingsViewModel {
  if (sources.naviSessionActive) return { kind: 'hidden' }

  if (sources.activePractice === 'resonant') {
    return {
      kind: 'resonant',
      settings: sources.resonant.settings,
      isRunning: sources.resonant.isRunning,
      onChange: sources.resonant.onChange,
      onExtendDuration: sources.resonant.onExtendDuration,
    }
  }

  if (sources.activePractice === 'stretch') {
    return {
      kind: 'stretch',
      settings: sources.stretch.settings,
      isRunning: sources.stretch.isRunning,
      onChange: sources.stretch.onChange,
    }
  }

  return {
    kind: 'naviKriya',
    settings: sources.naviKriya.settings,
    onChange: sources.naviKriya.onChange,
  }
}

export interface CreatePracticeControlsViewModelArgs {
  activePractice: PracticeId
  breathingAction: SessionPrimaryAction
  naviAction: SessionPrimaryAction
  strings: UiStrings['controls']
  breathingAudio: AppAudioToggleViewModel
  naviAudio: AppAudioToggleViewModel
  onBreathingPrimaryClick(this: void): void
  onNaviPrimaryClick(this: void): void
}

export function createPracticeControlsViewModel({
  activePractice,
  breathingAction,
  naviAction,
  strings,
  breathingAudio,
  naviAudio,
  onBreathingPrimaryClick,
  onNaviPrimaryClick,
}: CreatePracticeControlsViewModelArgs): AppPracticeControlsViewModel {
  const action = activePractice === 'naviKriya' ? naviAction : breathingAction

  return {
    primaryLabel: getSessionPrimaryActionLabel(action, strings),
    onPrimaryClick: activePractice === 'naviKriya'
      ? onNaviPrimaryClick
      : onBreathingPrimaryClick,
    audio: activePractice === 'naviKriya' ? naviAudio : breathingAudio,
  }
}

export function createAudioViewModel(input: {
  muted: boolean
  audioAvailable: boolean
  audioStatus: AudioStatusFlag
  onMuteToggle(this: void): void
}): AppAudioViewModel {
  return {
    muted: input.muted,
    audioAvailable: input.audioAvailable,
    audioStatus: input.audioStatus,
    needsResume: input.audioStatus === 'needs-resume',
    resumeHintId: AUDIO_RESUME_HINT_ID,
    onMuteToggle: input.onMuteToggle,
  }
}

export function createNaviAudioToggleViewModel(input: {
  muted: boolean
  audioAvailable: boolean
  onMuteToggle(this: void): void
}): AppAudioToggleViewModel {
  return {
    muted: input.muted,
    audioAvailable: input.audioAvailable,
    needsResume: false,
    resumeHintId: '',
    onMuteToggle: input.onMuteToggle,
  }
}
