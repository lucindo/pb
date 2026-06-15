import {
  type BreathingSessionPhase,
  type CueStyleId,
  type LeadInDigit,
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
  // Resonant pace context — drives the "X BPM · ratio" secondary line.
  bpm: number
  ratio: string
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
    bpm: number
    ratio: string
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
      bpm: input.bpm,
      ratio: input.ratio,
    },
  }
}

export type BreathingPrimaryAction = 'cancel' | 'end' | 'start' | 'done'

export function getBreathingPrimaryAction(input: {
  status: SessionStatus
  inLeadIn: boolean
}): BreathingPrimaryAction {
  if (input.status === 'running') return 'end'
  if (input.status === 'complete') return 'done'
  return input.inLeadIn ? 'cancel' : 'start'
}

export type SessionPrimaryAction = BreathingPrimaryAction

export function getSessionPrimaryActionLabel(
  action: SessionPrimaryAction,
  strings: UiStrings['practice']['controls'],
): string {
  switch (action) {
    case 'cancel':
      return strings.cancel
    case 'end':
      return strings.endSession
    case 'start':
      return strings.startSession
    case 'done':
      return strings.done
  }
}
