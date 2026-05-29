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
  // Resonant pace context (always present — preserved across stretch sessions
  // per WR-03 in sessionController). Drives the "X BPM · ratio" secondary line
  // on HRV; the stretch path reads currentBpm + stage off the frame instead.
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
  if (phase === 'front' || phase === 'back') return phase
  // 'done' is transient: useNKEngine sets nkPhase='done' before onComplete
  // calls nkEnd() to drop back to 'idle'. The engine reaches 'done' only after
  // the final back phase, so reflect the last real phase ('back') rather than
  // silently coercing to 'front'. 'idle' should never reach here per the
  // sessionActive invariant — surface the violation explicitly.
  if (phase === 'done') return 'back'
  throw new Error(`getVisibleNaviPhase: unexpected phase ${phase}`)
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

export type NaviKriyaPrimaryAction = 'cancel' | 'end' | 'start' | 'done'

export function getNaviKriyaPrimaryAction(input: {
  starting: boolean
  sessionActive: boolean
  justCompleted: boolean
}): NaviKriyaPrimaryAction {
  if (input.starting) return 'cancel'
  if (input.sessionActive) return 'end'
  if (input.justCompleted) return 'done'
  return 'start'
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

export type SessionPrimaryAction = BreathingPrimaryAction | NaviKriyaPrimaryAction

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
