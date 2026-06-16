import {
  type BreathingSessionPhase,
  type LeadInDigit,
  type SessionFrame,
  type SessionStatus,
} from '../domain'
import type { UiStrings } from '../content/strings'

export interface BreathingPresentationInput {
  phase: BreathingSessionPhase
  leadInDigit: LeadInDigit | null
  leadInPlaceholderFrame: SessionFrame | null
  liveFrame: SessionFrame | null
  status: SessionStatus
  inSessionView: boolean
}

export interface BreathingPresentation {
  shape: {
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

export type BreathingPrimaryAction = 'cancel' | 'end' | 'start' | 'done'

export function getBreathingPrimaryAction(input: {
  status: SessionStatus
  inLeadIn: boolean
}): BreathingPrimaryAction {
  if (input.status === 'running') return 'end'
  if (input.status === 'complete') return 'done'
  return input.inLeadIn ? 'cancel' : 'start'
}

export function getSessionPrimaryActionLabel(
  action: BreathingPrimaryAction,
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
