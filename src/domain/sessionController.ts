import type { BreathingPlan } from './breathingPlan'
import { createBreathingPlan } from './breathingPlan'
import type { SessionFrame } from './sessionMath'
import { getSessionFrame } from './sessionMath'
import type { DurationOption, SessionSettings } from './settings'
import { DURATION_OPTIONS } from './settings'

export type SessionStatus = 'idle' | 'running' | 'complete'

export interface IdleSessionState {
  status: 'idle'
  selectedSettings: SessionSettings
}

export interface RunningSessionState {
  status: 'running'
  selectedSettings: SessionSettings
  lockedSettings: SessionSettings
  plan: BreathingPlan
  startedAtMs: number
  lastFrame: SessionFrame
}

export interface CompleteSessionState {
  status: 'complete'
  selectedSettings: SessionSettings
  lockedSettings: SessionSettings
  plan: BreathingPlan
  completedAtMs: number
  message: 'Session complete'
}

export type SessionState = IdleSessionState | RunningSessionState | CompleteSessionState

function cloneSettings(settings: SessionSettings): SessionSettings {
  return { ...settings }
}

export function startSession(selectedSettings: SessionSettings, nowMs: number): RunningSessionState {
  const lockedSettings = cloneSettings(selectedSettings)
  const plan = createBreathingPlan(lockedSettings)

  return {
    status: 'running',
    selectedSettings: cloneSettings(selectedSettings),
    lockedSettings,
    plan,
    startedAtMs: nowMs,
    lastFrame: getSessionFrame(plan, 0),
  }
}

export function endSession(state: RunningSessionState | CompleteSessionState): IdleSessionState {
  return {
    status: 'idle',
    selectedSettings: cloneSettings(state.selectedSettings),
  }
}

export function extendTimedSession(
  state: RunningSessionState,
  durationMinutes: number,
): RunningSessionState {
  if (state.lockedSettings.durationMinutes === 'open-ended') {
    throw new RangeError('Open-ended sessions cannot be converted while running')
  }

  if (!(DURATION_OPTIONS as readonly DurationOption[]).includes(durationMinutes)) {
    throw new RangeError('durationMinutes must be one of DURATION_OPTIONS')
  }

  if (!Number.isFinite(durationMinutes) || durationMinutes <= state.lockedSettings.durationMinutes) {
    throw new RangeError('Timed sessions can only be extended to a greater finite duration')
  }

  const selectedSettings = {
    ...state.selectedSettings,
    durationMinutes,
  }
  const lockedSettings = {
    ...state.lockedSettings,
    durationMinutes,
  }
  const plan = createBreathingPlan(lockedSettings)

  return {
    ...state,
    selectedSettings,
    lockedSettings,
    plan,
    lastFrame: getSessionFrame(plan, state.lastFrame.elapsedMs),
  }
}

export function completeIfNeeded(
  state: RunningSessionState,
  nowMs: number,
): RunningSessionState | CompleteSessionState {
  const elapsedMs = nowMs - state.startedAtMs
  const lastFrame = getSessionFrame(state.plan, elapsedMs)

  if (!lastFrame.isComplete) {
    return {
      ...state,
      lastFrame,
    }
  }

  return {
    status: 'complete',
    selectedSettings: cloneSettings(state.selectedSettings),
    lockedSettings: cloneSettings(state.lockedSettings),
    plan: state.plan,
    completedAtMs: nowMs,
    message: 'Session complete',
  }
}
