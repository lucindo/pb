import type { BreathingPlan } from './breathingPlan'
import { createBreathingPlan } from './breathingPlan'
import type { SessionFrame } from './sessionMath'
import { getSessionFrame } from './sessionMath'
import type { PatternSettings } from './settings'

export type SessionStatus = 'idle' | 'running' | 'complete'

export interface IdleSessionState {
  status: 'idle'
  selectedSettings: PatternSettings
}

export interface RunningSessionState {
  status: 'running'
  selectedSettings: PatternSettings
  lockedSettings: PatternSettings
  plan: BreathingPlan
  // startedAtSec is the seconds-shaped session-start timestamp from the
  // injected SessionClock (audioCtx.currentTime via the SessionClock seam).
  startedAtSec: number
  lastFrame: SessionFrame
}

export interface CompleteSessionState {
  status: 'complete'
  selectedSettings: PatternSettings
  lockedSettings: PatternSettings
  plan: BreathingPlan
  completedAtSec: number
  message: 'Session complete'
}

export type SessionState = IdleSessionState | RunningSessionState | CompleteSessionState

// PatternSettings contains only primitives — a shallow copy is intentionally sufficient.
function cloneSettings(settings: PatternSettings): PatternSettings {
  return { ...settings }
}

export function startSession(selectedSettings: PatternSettings, nowSec: number): RunningSessionState {
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
