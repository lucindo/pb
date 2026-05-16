import type { BreathingPlan } from './breathingPlan'
import { createBreathingPlan } from './breathingPlan'
import type { SessionFrame } from './sessionMath'
import { getSessionFrame } from './sessionMath'
import type { DurationOption, SessionSettings } from './settings'
import { DURATION_OPTIONS } from './settings'
import type { StretchSegment } from './stretchRamp'
import { buildStretchSegments, getStretchFrame } from './stretchRamp'

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
  stretchSegments: StretchSegment[] | null
  startedAtMs: number
  lastFrame: SessionFrame
}

export interface CompleteSessionState {
  status: 'complete'
  selectedSettings: SessionSettings
  lockedSettings: SessionSettings
  plan: BreathingPlan
  stretchSegments: StretchSegment[] | null
  completedAtMs: number
  message: 'Session complete'
}

export type SessionState = IdleSessionState | RunningSessionState | CompleteSessionState

function cloneSettings(settings: SessionSettings): SessionSettings {
  return { ...settings }
}

export function startSession(selectedSettings: SessionSettings, nowMs: number): RunningSessionState {
  const lockedSettings = cloneSettings(selectedSettings)
  const isStretch = lockedSettings.mode === 'stretch'
  // For stretch sessions the lead-in plan runs at initialBpm so its cue duration
  // matches the warm-up rate; the plan is otherwise only the standard fallback formula.
  const plan = createBreathingPlan(
    isStretch ? { ...lockedSettings, bpm: lockedSettings.initialBpm } : lockedSettings,
  )
  const stretchSegments = isStretch
    ? buildStretchSegments(lockedSettings, lockedSettings.ratio)
    : null
  const lastFrame = stretchSegments !== null
    ? getStretchFrame(stretchSegments, 0)
    : getSessionFrame(plan, 0)

  return {
    status: 'running',
    selectedSettings: cloneSettings(selectedSettings),
    lockedSettings,
    plan,
    stretchSegments,
    startedAtMs: nowMs,
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
  nowMs: number,
): RunningSessionState {
  // CONTEXT D-02: stretch duration is governed by the rampDurationMinutes picker
  // and the computed segment-table total, never by the durationMinutes stepper.
  // DS-WR-07: assert on `mode` explicitly — `stretchSegments !== null` alone is an
  // unasserted proxy; a malformed stretch state with `stretchSegments === null`
  // would otherwise slip past this guard.
  if (state.lockedSettings.mode === 'stretch' || state.stretchSegments !== null) {
    throw new RangeError('Stretch sessions cannot be extended via durationMinutes')
  }

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

  // DS-WR-01: recompute `lastFrame` from the live clock (`nowMs - startedAtMs`)
  // rather than the stale `state.lastFrame.elapsedMs`. `lastFrame` is only
  // refreshed on rAF ticks; an extend invoked between ticks would otherwise make
  // the next `completeIfNeeded` jump elapsed time discontinuously. This mirrors
  // how `startSession` / `completeIfNeeded` derive elapsed from `startedAtMs`.
  const elapsedMs = nowMs - state.startedAtMs

  return {
    ...state,
    selectedSettings,
    lockedSettings,
    plan,
    lastFrame: getSessionFrame(plan, elapsedMs),
  }
}

export function completeIfNeeded(
  state: RunningSessionState,
  nowMs: number,
): RunningSessionState | CompleteSessionState {
  const elapsedMs = nowMs - state.startedAtMs
  const lastFrame = state.stretchSegments !== null
    ? getStretchFrame(state.stretchSegments, elapsedMs)
    : getSessionFrame(state.plan, elapsedMs)

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
    stretchSegments: state.stretchSegments,
    completedAtMs: nowMs,
    message: 'Session complete',
  }
}
