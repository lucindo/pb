import type { LEARN_CONTENT } from '../content/learnContent'
import type { LOCKED_COPY } from '../content/lockedCopy'
import type { UiStrings } from '../content/strings'
import type { AppScreen, ReturningFrom } from './useAppNavigation'
import type { AudioStatusFlag } from '../audio/audioStatus'
import type {
  BreathingSessionPhase,
  LeadInDigit,
  LocaleId,
  SessionFrame,
  SessionSettings,
  SessionStatus,
} from '../domain'
import type { PersistedStats, PracticeId } from '../storage'
import {
  getBreathingPresentation,
  getSessionPrimaryActionLabel,
  type BreathingPresentation,
  type SessionPrimaryAction,
} from './sessionPresentation'

type LearnContent = (typeof LEARN_CONTENT)[keyof typeof LEARN_CONTENT]
type LockedCopy = (typeof LOCKED_COPY)[keyof typeof LOCKED_COPY]

export interface AppInstallViewModel {
  isIOS: boolean
  isStandalone: boolean
  installable: boolean
  onInstall(this: void): Promise<void>
}

export interface AppEndSessionDialogViewModel {
  id: 'breathing'
  open: boolean
  onConfirm(this: void): void
  onCancel(this: void): void
}

export interface AppNavigationViewModel {
  appScreen: AppScreen
  returningFrom: ReturningFrom
  onLearnOpen(this: void): void
  onSettingsOpen(this: void): void
  onAdvancedOpen(this: void): void
  onStatsOpen(this: void): void
  onBackToPractice(this: void): void
  onBackFromAdvanced(this: void): void
  onBackFromStats(this: void): void
}

export interface AppDialogsViewModel {
  endSessionDialogs: readonly AppEndSessionDialogViewModel[]
}

export const AUDIO_RESUME_HINT_ID = 'mute-toggle-resume-hint'

export interface AppAudioToggleViewModel {
  muted: boolean
  audioAvailable: boolean
  needsResume: boolean
  /** Id of the App-level aria-live resume-hint region. */
  resumeHintId?: string
  onMuteToggle(this: void): void
}

export interface AppPracticeControlsViewModel {
  primaryLabel: string
  onPrimaryClick(this: void): void
  audio: AppAudioToggleViewModel
}

export type AppPracticeSessionViewModel = {
  kind: 'resonant'
  presentation: BreathingPresentation
}

export type AppPracticeSettingsViewModel = {
  kind: 'resonant'
  settings: SessionSettings
  isRunning: boolean
  isComplete: boolean
  onChange(this: void, settings: SessionSettings): void
  onExtendDuration(this: void, durationMinutes: number): void
}

// Per-practice stats snapshot held in app state and surfaced on the Stats page.
// Refreshed from disk when the page opens and updated optimistically on reset.
export type PracticeStatsMap = Readonly<Record<PracticeId, PersistedStats>>

export interface AppViewModel {
  locale: LocaleId
  appTitle: string
  controlsDisabled: boolean
  practiceSession: AppPracticeSessionViewModel
  practiceSettings: AppPracticeSettingsViewModel
  practiceControls: AppPracticeControlsViewModel
  uiStrings: UiStrings
  learnContent: LearnContent
  lockedCopy: LockedCopy
  install: AppInstallViewModel
  navigation: AppNavigationViewModel
  dialogs: AppDialogsViewModel
  stats: PracticeStatsMap
  onResetPracticeStats(this: void, practice: PracticeId): void
}

export interface CreateInstallViewModelArgs {
  isStandalone: boolean
  isIOS: boolean
  canPromptInstall: boolean
  onInstall(this: void): Promise<void>
}

export function createInstallViewModel({
  isStandalone,
  isIOS,
  canPromptInstall,
  onInstall,
}: CreateInstallViewModelArgs): AppInstallViewModel {
  const installable = isIOS || canPromptInstall

  return {
    isIOS,
    isStandalone,
    installable,
    onInstall,
  }
}

export interface BreathingSessionViewState {
  phase: BreathingSessionPhase
  leadInDigit: LeadInDigit | null
  leadInPlaceholderFrame: SessionFrame | null
  liveFrame: SessionFrame | null
  status: SessionStatus
  inSessionView: boolean
  // Resonant selected settings — drives the HRV pace caption (X BPM · ratio).
  selectedSettings: SessionSettings
}

export interface CreatePracticeSessionViewModelArgs {
  breathing: BreathingSessionViewState
}

export function createPracticeSessionViewModel({
  breathing,
}: CreatePracticeSessionViewModelArgs): AppPracticeSessionViewModel {
  const presentation = getBreathingPresentation({
    phase: breathing.phase,
    leadInDigit: breathing.leadInDigit,
    leadInPlaceholderFrame: breathing.leadInPlaceholderFrame,
    liveFrame: breathing.liveFrame,
    status: breathing.status,
    inSessionView: breathing.inSessionView,
    bpm: breathing.selectedSettings.bpm,
    ratio: breathing.selectedSettings.ratio,
  })

  return { kind: 'resonant', presentation }
}

export interface PracticeSettingsSources {
  settings: SessionSettings
  isRunning: boolean
  isComplete: boolean
  onChange(this: void, settings: SessionSettings): void
  onExtendDuration(this: void, durationMinutes: number): void
}

export function createPracticeSettingsViewModel(
  sources: PracticeSettingsSources,
): AppPracticeSettingsViewModel {
  return {
    kind: 'resonant',
    settings: sources.settings,
    isRunning: sources.isRunning,
    isComplete: sources.isComplete,
    onChange: sources.onChange,
    onExtendDuration: sources.onExtendDuration,
  }
}

export interface CreatePracticeControlsViewModelArgs {
  breathingAction: SessionPrimaryAction
  strings: UiStrings['practice']['controls']
  breathingAudio: AppAudioToggleViewModel
  onBreathingPrimaryClick(this: void): void
}

export function createPracticeControlsViewModel({
  breathingAction,
  strings,
  breathingAudio,
  onBreathingPrimaryClick,
}: CreatePracticeControlsViewModelArgs): AppPracticeControlsViewModel {
  return {
    primaryLabel: getSessionPrimaryActionLabel(breathingAction, strings),
    onPrimaryClick: onBreathingPrimaryClick,
    audio: breathingAudio,
  }
}

export function createAudioViewModel(input: {
  muted: boolean
  audioAvailable: boolean
  audioStatus: AudioStatusFlag
  onMuteToggle(this: void): void
}): AppAudioToggleViewModel {
  return {
    muted: input.muted,
    audioAvailable: input.audioAvailable,
    needsResume: input.audioStatus === 'needs-resume',
    resumeHintId: AUDIO_RESUME_HINT_ID,
    onMuteToggle: input.onMuteToggle,
  }
}
