import { describe, expect, it } from 'vitest'

import type { SessionSettings } from './settings'
import { DEFAULT_SETTINGS } from './settings'
import {
  completeIfNeeded,
  endSession,
  extendTimedSession,
  startSession,
} from './sessionController'

const baseSettings: SessionSettings = {
  ...DEFAULT_SETTINGS,
  bpm: 5.5,
  ratio: '40:60',
  durationMinutes: 10,
}

// Numeric time values are seconds-shaped.

describe('session lifecycle controller', () => {
  it('locks BPM and ratio when starting so later selected settings cannot mutate the running plan', () => {
    const selectedSettings = { ...baseSettings }
    const running = startSession(selectedSettings, 1)

    selectedSettings.bpm = 7
    selectedSettings.ratio = '20:80'
    selectedSettings.durationMinutes = 60

    expect(running.lockedSettings).toEqual(baseSettings)
    expect(running.plan.bpm).toBe(5.5)
    expect(running.plan.ratio).toBe('40:60')
    expect(running.startedAtSec).toBe(1)
    expect(running.lastFrame.phaseLabel).toBe('In')
  })

  it('ends running sessions by clearing active state while preserving selected settings', () => {
    const running = startSession(baseSettings, 1)
    const extended = extendTimedSession(running, 15, 1)

    expect(endSession(extended)).toEqual({
      status: 'idle',
      selectedSettings: { ...baseSettings, durationMinutes: 15 },
    })
  })

  it('completes timed sessions with the required message when total duration is reached', () => {
    const running = startSession({ ...baseSettings, durationMinutes: 5 }, 2)
    // Completion holds to the next cycle boundary so cues are never cut mid-In/mid-Out.
    // At bpm 5.5 the 5-min boundary lands mid-cycle; completion fires once the
    // surrounding cycle finishes, not at the raw duration mark.
    const cycleSec = running.plan.cycleSec
    const completionSec = Math.ceil((5 * 60) / cycleSec) * cycleSec

    const atDuration = completeIfNeeded(running, 2 + 5 * 60)
    expect(atDuration.status).toBe('running')

    const complete = completeIfNeeded(running, 2 + completionSec)

    expect(complete.status).toBe('complete')
    if (complete.status !== 'complete') {
      throw new Error('Expected complete state')
    }
    expect(complete.message).toBe('Session complete')
    expect(complete.completedAtSec).toBe(2 + completionSec)
    expect(complete.lockedSettings).toEqual({ ...baseSettings, durationMinutes: 5 })
  })

  it('keeps open-ended sessions running past 60 minutes until manually ended', () => {
    const running = startSession({ ...baseSettings, durationMinutes: 'open-ended' }, 0)

    const later = completeIfNeeded(running, 61 * 60)

    expect(later.status).toBe('running')
    if (later.status !== 'running') {
      throw new Error('Expected running state')
    }
    expect(later.lastFrame.remainingSec).toBeNull()
    expect(endSession(later).status).toBe('idle')
  })

  it('extends only timed running sessions to greater finite durations', () => {
    const running = startSession({ ...baseSettings, durationMinutes: 10 }, 0)

    const extended = extendTimedSession(running, 15, 0)

    expect(extended.selectedSettings.durationMinutes).toBe(15)
    expect(extended.lockedSettings.durationMinutes).toBe(15)
    expect(extended.plan.totalSec).toBe(15 * 60)

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

describe('startSession (D-01)', () => {
  it('returns status running with a standard In frame', () => {
    const running = startSession(baseSettings, 0)
    expect(running.status).toBe('running')
    expect(running.lastFrame.phaseLabel).toBe('In')
  })
})
