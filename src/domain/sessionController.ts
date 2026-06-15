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
  // startedAtSec is the seconds-shaped session-start timestamp from the
  // injected SessionClock (audioCtx.currentTime via the SessionClock seam).
  startedAtSec: number
  lastFrame: SessionFrame
}

export interface CompleteSessionState {
  status: 'complete'
  selectedSettings: SessionSettings
  lockedSettings: SessionSettings
  plan: BreathingPlan
  completedAtSec: number
  message: 'Session complete'
}

export type SessionState = IdleSessionState | RunningSessionState | CompleteSessionState

// SessionSettings contains only primitives — a shallow copy is intentionally sufficient.
// If any field becomes an object/array, change this to a deep clone so callers cannot
// reach into the locked/idle state through a shared reference.
function cloneSettings(settings: SessionSettings): SessionSettings {
  return { ...settings }
}

export function startSession(selectedSettings: SessionSettings, nowSec: number): RunningSessionState {
  const lockedSettings = cloneSettings(selectedSettings)
  const plan = createBreathingPlan(lockedSettings)
  const lastFrame = getSessionFrame(plan, 0)

  return {
    status: 'running',
    selectedSettings: cloneSettings(selectedSettings),
    lockedSettings,
    plan,
    startedAtSec: nowSec,
    lastFrame,
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
  nowSec: number,
): RunningSessionState {
  if (state.lockedSettings.durationMinutes === 'open-ended') {
    throw new RangeError('Open-ended sessions cannot be converted while running')
  }

  if (!(DURATION_OPTIONS as readonly DurationOption[]).includes(durationMinutes)) {
    throw new RangeError('durationMinutes must be one of DURATION_OPTIONS')
  }

  // The DURATION_OPTIONS membership check above already excludes Infinity and NaN
  // (DURATION_OPTIONS is a finite-number-only allowlist plus the 'open-ended' string,
  // and the open-ended case is rejected earlier when state.lockedSettings.durationMinutes
  // is 'open-ended'). Only the monotonic-increase invariant remains to enforce here.
  if (durationMinutes <= state.lockedSettings.durationMinutes) {
    throw new RangeError(
      `Cannot extend to ${String(durationMinutes)} (current is ${String(state.lockedSettings.durationMinutes)}); new duration must be strictly greater`,
    )
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

  // Recompute `lastFrame` from the live clock (`nowSec - startedAtSec`) rather
  // than the stale `state.lastFrame.elapsedSec`. `lastFrame` is only refreshed
  // on rAF ticks; an extend invoked between ticks would otherwise make the next
  // `completeIfNeeded` jump elapsed time discontinuously.
  const elapsedSec = nowSec - state.startedAtSec

  return {
    ...state,
    selectedSettings,
    lockedSettings,
    plan,
    lastFrame: getSessionFrame(plan, elapsedSec),
  }
}

export function completeIfNeeded(
  state: RunningSessionState,
  nowSec: number,
): RunningSessionState | CompleteSessionState {
  const elapsedSec = nowSec - state.startedAtSec
  const lastFrame = getSessionFrame(state.plan, elapsedSec)

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
    completedAtSec: nowSec,
    message: 'Session complete',
  }
}
