import { describe, expect, it } from 'vitest'

import type { SessionSettings } from './settings'
import { DEFAULT_SETTINGS, DEFAULT_STRETCH_SETTINGS } from './settings'
import type { StretchSettings } from './settings'
import {
  completeIfNeeded,
  endSession,
  extendTimedSession,
  startSession,
  startStretchSession,
} from './sessionController'

const baseSettings: SessionSettings = {
  ...DEFAULT_SETTINGS,
  bpm: 5.5,
  ratio: '40:60',
  durationMinutes: 10,
}

describe('session lifecycle controller', () => {
  it('locks BPM and ratio when starting so later selected settings cannot mutate the running plan', () => {
    const selectedSettings = { ...baseSettings }
    const running = startSession(selectedSettings, 1_000)

    selectedSettings.bpm = 7
    selectedSettings.ratio = '20:80'
    selectedSettings.durationMinutes = 60

    expect(running.lockedSettings).toEqual(baseSettings)
    expect(running.plan.bpm).toBe(5.5)
    expect(running.plan.ratio).toBe('40:60')
    expect(running.startedAtMs).toBe(1_000)
    expect(running.lastFrame.phaseLabel).toBe('In')
  })

  it('ends running sessions by clearing active state while preserving selected settings', () => {
    const running = startSession(baseSettings, 1_000)
    const extended = extendTimedSession(running, 15, 1_000)

    expect(endSession(extended)).toEqual({
      status: 'idle',
      selectedSettings: { ...baseSettings, durationMinutes: 15 },
    })
  })

  it('completes timed sessions with the required message when total duration is reached', () => {
    const running = startSession({ ...baseSettings, durationMinutes: 5 }, 2_000)
    // Phase 3 fix: completion holds to the next cycle boundary so cues never
    // get cut mid-In/mid-Out. At bpm 5.5 the 5-min boundary lands mid-cycle;
    // assert that completion does NOT fire at the raw duration mark, then fires
    // once the surrounding cycle finishes.
    const cycleMs = running.plan.cycleMs
    const completionMs = Math.ceil((5 * 60_000) / cycleMs) * cycleMs

    const atDuration = completeIfNeeded(running, 2_000 + 5 * 60_000)
    expect(atDuration.status).toBe('running')

    const complete = completeIfNeeded(running, 2_000 + completionMs)

    expect(complete.status).toBe('complete')
    if (complete.status !== 'complete') {
      throw new Error('Expected complete state')
    }
    expect(complete.message).toBe('Session complete')
    expect(complete.completedAtMs).toBe(2_000 + completionMs)
    expect(complete.lockedSettings).toEqual({ ...baseSettings, durationMinutes: 5 })
  })

  it('keeps open-ended sessions running past 60 minutes until manually ended', () => {
    const running = startSession({ ...baseSettings, durationMinutes: 'open-ended' }, 0)

    const later = completeIfNeeded(running, 61 * 60_000)

    expect(later.status).toBe('running')
    if (later.status !== 'running') {
      throw new Error('Expected running state')
    }
    expect(later.lastFrame.remainingMs).toBeNull()
    expect(endSession(later).status).toBe('idle')
  })

  it('extends only timed running sessions to greater finite durations', () => {
    const running = startSession({ ...baseSettings, durationMinutes: 10 }, 0)

    const extended = extendTimedSession(running, 15, 0)

    expect(extended.selectedSettings.durationMinutes).toBe(15)
    expect(extended.lockedSettings.durationMinutes).toBe(15)
    expect(extended.plan.totalMs).toBe(15 * 60_000)

    expect(() => extendTimedSession(extended, 15, 0)).toThrow(RangeError)
    expect(() => extendTimedSession(extended, 10, 0)).toThrow(RangeError)
    expect(() => extendTimedSession(extended, Number.POSITIVE_INFINITY, 0)).toThrow(RangeError)

    const openEnded = startSession({ ...baseSettings, durationMinutes: 'open-ended' }, 0)
    expect(() => extendTimedSession(openEnded, 60, 0)).toThrow(RangeError)
  })

  it('throws RangeError for a finite durationMinutes not in DURATION_OPTIONS (D-01 allowlist boundary)', () => {
    const running = startSession({ ...baseSettings, durationMinutes: 10 }, 0)
    // 7 is finite but not in DURATION_OPTIONS (which contains 5,10,15,...,60,'open-ended')
    expect(() => extendTimedSession(running, 7, 0)).toThrow(RangeError)
  })
})

describe('startSession standard-only (D-01)', () => {
  it('sets stretchSegments to null for standard sessions (regression guard)', () => {
    const running = startSession(baseSettings, 1_000)
    expect(running.stretchSegments).toBeNull()
    expect(running.lastFrame.phaseLabel).toBe('In')
    expect(running.lastFrame.currentBpm).toBeUndefined()
  })

  it('returns status running with a standard frame', () => {
    const running = startSession(baseSettings, 0)
    expect(running.status).toBe('running')
    expect(running.stretchSegments).toBeNull()
  })
})

describe('startStretchSession (D-01, D-02)', () => {
  const stretchSettings: StretchSettings = {
    ratio: '40:60',
    initialBpm: 6,
    targetBpm: 4,
    warmUpMinutes: 10,
    coolDownMinutes: 15,
    rampDurationMinutes: 20,
  }

  it('returns status running with a non-null stretchSegments table', () => {
    const running = startStretchSession(stretchSettings, 1_000)
    expect(running.status).toBe('running')
    expect(running.stretchSegments).not.toBeNull()
    expect(running.stretchSegments?.length).toBeGreaterThan(0)
  })

  it('lastFrame is a stretch frame (has currentBpm and stage)', () => {
    const running = startStretchSession(stretchSettings, 1_000)
    expect(running.lastFrame.currentBpm).toBe(6)
    expect(running.lastFrame.stage).toBe('hold-initial')
  })

  it('startedAtMs matches the provided nowMs', () => {
    const running = startStretchSession(stretchSettings, 5_000)
    expect(running.startedAtMs).toBe(5_000)
  })

  it('DEFAULT_STRETCH_SETTINGS produces a valid stretch session', () => {
    const running = startStretchSession(DEFAULT_STRETCH_SETTINGS, 0)
    expect(running.status).toBe('running')
    expect(running.stretchSegments).not.toBeNull()
    expect(running.lastFrame.currentBpm).toBe(DEFAULT_STRETCH_SETTINGS.initialBpm)
  })

  it('completeIfNeeded on a stretch session dispatches to the stretch frame', () => {
    const running = startStretchSession(stretchSettings, 0)
    // 15 minutes in — mid-ramp (warm-up 10 min, ramp 10:00–30:00)
    const next = completeIfNeeded(running, 15 * 60_000)
    expect(next.status).toBe('running')
    if (next.status !== 'running') throw new Error('Expected running state')
    expect(next.lastFrame.stage).toBe('ramp')
    expect(typeof next.lastFrame.currentBpm).toBe('number')
  })

  it('an open-ended stretch session never returns a complete state', () => {
    const running = startStretchSession({ ...stretchSettings, coolDownMinutes: 'open-ended' }, 0)
    const later = completeIfNeeded(running, 5 * 60 * 60_000)
    expect(later.status).toBe('running')
    if (later.status !== 'running') throw new Error('Expected running state')
    expect(later.lastFrame.remainingMs).toBeNull()
  })

  it('a finite stretch session completes once its computed total is reached', () => {
    const running = startStretchSession(stretchSettings, 0)
    // total = (warm-up 10 + ramp 20 + cool-down 15) min = 45 min
    const totalMs = (10 + 20 + 15) * 60_000
    const atTotal = completeIfNeeded(running, totalMs + 60_000)
    expect(atTotal.status).toBe('complete')
    if (atTotal.status !== 'complete') throw new Error('Expected complete state')
    expect(atTotal.message).toBe('Session complete')
  })
})

describe('extendTimedSession — no mode check (D-01)', () => {
  it('throws RangeError for a stretch session (stretchSegments !== null gate)', () => {
    const stretchSettings: StretchSettings = {
      ratio: '40:60',
      initialBpm: 6,
      targetBpm: 4,
      warmUpMinutes: 10,
      coolDownMinutes: 15,
      rampDurationMinutes: 20,
    }
    const running = startStretchSession(stretchSettings, 0)
    expect(() => extendTimedSession(running, 30, 0)).toThrow(RangeError)
  })
})
