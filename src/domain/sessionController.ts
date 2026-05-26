import type { BreathingPlan } from './breathingPlan'
import { createBreathingPlan } from './breathingPlan'
import type { SessionFrame } from './sessionMath'
import { getSessionFrame } from './sessionMath'
import type { DurationOption, SessionSettings, StretchSettings } from './settings'
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

// D-01: startSession is standard-only — no mode check, stretchSegments always null.
export function startSession(selectedSettings: SessionSettings, nowMs: number): RunningSessionState {
  const lockedSettings = cloneSettings(selectedSettings)
  const plan = createBreathingPlan(lockedSettings)
  const lastFrame = getSessionFrame(plan, 0)

  return {
    status: 'running',
    selectedSettings: cloneSettings(selectedSettings),
    lockedSettings,
    plan,
    stretchSegments: null,
    startedAtMs: nowMs,
    lastFrame,
  }
}

// D-01/D-02: startStretchSession — new function for stretch sessions.
// Lead-in plan runs at initialBpm so cue duration matches the warm-up rate.
// WR-03: the caller's resonant selectedSettings are passed through unchanged so
// endSession returns the resonant config (not the synthetic lead-in). The
// synthetic lead-in lives ONLY in lockedSettings (it drives the lead-in plan);
// selectedSettings carries the resonant config through the entire session so
// endSession's `cloneSettings(state.selectedSettings)` preserves it to idle.
export function startStretchSession(
  stretchSettings: StretchSettings,
  selectedSettings: SessionSettings,
  nowMs: number,
): RunningSessionState {
  // Lead-in plan: standard SessionSettings using initialBpm and the same ratio.
  // Assigned only to lockedSettings — selectedSettings is the caller's resonant config.
  const leadInSettings: SessionSettings = {
    bpm: stretchSettings.initialBpm,
    ratio: stretchSettings.ratio,
    durationMinutes: 'open-ended',
  }
  const plan = createBreathingPlan(leadInSettings)
  // D-02: buildStretchSegments now takes a single StretchSettings arg
  const stretchSegments = buildStretchSegments(stretchSettings)
  const lastFrame = getStretchFrame(stretchSegments, 0)

  return {
    status: 'running',
    selectedSettings: cloneSettings(selectedSettings),  // resonant config passes through unchanged
    lockedSettings: leadInSettings,                      // synthetic lead-in drives the audio plan
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
  // D-01: guard on stretchSegments !== null (no mode read — mode concept retired).
  // CONTEXT D-02: stretch duration is governed by the rampDurationMinutes picker
  // and the computed segment-table total, never by the durationMinutes stepper.
  if (state.stretchSegments !== null) {
    throw new RangeError('Stretch sessions cannot be extended via durationMinutes')
  }

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
