import {
  getNaviKriyaPhaseTarget,
  type BreathingSessionPhase,
  type CueStyleId,
  type LeadInDigit,
  type NaviKriyaPhase,
  type NaviKriyaSettings,
  type NaviLeadInDigit,
  type SessionFrame,
  type SessionStatus,
} from '../domain'
import type { UiStrings } from '../content/strings'

export interface BreathingPresentationInput {
  phase: BreathingSessionPhase
  sessionCue: CueStyleId | null
  liveCue: CueStyleId
  leadInDigit: LeadInDigit | null
  leadInPlaceholderFrame: SessionFrame | null
  liveFrame: SessionFrame | null
  status: SessionStatus
  inSessionView: boolean
}

export interface BreathingPresentation {
  shape: {
    cue: CueStyleId
    frame: SessionFrame | null
    leadInDigit: LeadInDigit | null
  }
  readout: {
    frame: SessionFrame | null
    status: SessionStatus
    isLeadInPlaceholder: boolean
    showCompletionHeadline: boolean
  }
}

export function getBreathingPresentation(input: BreathingPresentationInput): BreathingPresentation {
  return {
    shape: {
      cue: input.sessionCue ?? input.liveCue,
      frame: input.phase === 'running' ? input.liveFrame : null,
      leadInDigit: input.phase === 'lead-in' ? input.leadInDigit : null,
    },
    readout: {
      frame: input.leadInPlaceholderFrame ?? input.liveFrame,
      status: input.status,
      isLeadInPlaceholder: input.phase === 'lead-in',
      showCompletionHeadline: input.status === 'complete' && !input.inSessionView,
    },
  }
}

export interface NaviKriyaPresentationInput {
  sessionActive: boolean
  starting: boolean
  leadInDigit: NaviLeadInDigit | null
  phase: 'idle' | 'front' | 'back' | 'done'
  round: number
  count: number
  running: boolean
  settings: NaviKriyaSettings
  justCompleted: boolean
  liveCue: CueStyleId
}

export type NaviKriyaShapePresentation =
  | {
    kind: 'orb'
    cue: CueStyleId
    leadInDigit: NaviLeadInDigit | null
  }
  | {
    kind: 'count'
    key: string
    count: number
    phase: NaviKriyaPhase
    isPaused: boolean
  }

export interface NaviKriyaReadoutPresentation {
  phase: NaviKriyaPhase
  round: number
  totalRounds: number
  count: number
  target: number
}

export interface NaviKriyaPresentation {
  shape: NaviKriyaShapePresentation
  readout: NaviKriyaReadoutPresentation | null
  showCompletionHeadline: boolean
}

function getVisibleNaviPhase(phase: NaviKriyaPresentationInput['phase']): NaviKriyaPhase {
  return phase === 'back' ? 'back' : 'front'
}

export function getNaviKriyaPresentation(
  input: NaviKriyaPresentationInput,
): NaviKriyaPresentation {
  if (!input.sessionActive) {
    return {
      shape: { kind: 'orb', cue: input.liveCue, leadInDigit: null },
      readout: null,
      showCompletionHeadline: input.justCompleted,
    }
  }

  const phase = input.starting ? 'front' : getVisibleNaviPhase(input.phase)
  const readout: NaviKriyaReadoutPresentation = {
    phase,
    round: input.starting ? 1 : input.round,
    totalRounds: input.settings.rounds,
    count: input.starting ? 0 : input.count,
    target: input.starting
      ? input.settings.frontCount
      : getNaviKriyaPhaseTarget(input.settings, phase),
  }

  if (input.starting) {
    return {
      shape: { kind: 'orb', cue: input.liveCue, leadInDigit: input.leadInDigit },
      readout,
      showCompletionHeadline: false,
    }
  }

  return {
    shape: {
      kind: 'count',
      key: `nk-${String(input.count)}`,
      count: input.count,
      phase,
      isPaused: !input.running,
    },
    readout,
    showCompletionHeadline: false,
  }
}

export type NaviKriyaPrimaryAction = 'cancel' | 'end' | 'start'

export function getNaviKriyaPrimaryAction(input: {
  starting: boolean
  sessionActive: boolean
}): NaviKriyaPrimaryAction {
  if (input.starting) return 'cancel'
  return input.sessionActive ? 'end' : 'start'
}

export type BreathingPrimaryAction = 'cancel' | 'end' | 'start'

export function getBreathingPrimaryAction(input: {
  status: SessionStatus
  inLeadIn: boolean
}): BreathingPrimaryAction {
  if (input.status === 'running') return 'end'
  return input.inLeadIn ? 'cancel' : 'start'
}

export type SessionPrimaryAction = BreathingPrimaryAction | NaviKriyaPrimaryAction

export function getSessionPrimaryActionLabel(
  action: SessionPrimaryAction,
  strings: UiStrings['controls'],
): string {
  switch (action) {
    case 'cancel':
      return strings.cancel
    case 'end':
      return strings.endSession
    case 'start':
      return strings.startSession
  }
}
