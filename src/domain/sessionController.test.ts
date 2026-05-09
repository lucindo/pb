import { describe, expect, it } from 'vitest'

import type { SessionSettings } from './settings'
import {
  completeIfNeeded,
  endSession,
  extendTimedSession,
  startSession,
} from './sessionController'

const baseSettings: SessionSettings = {
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
    const extended = extendTimedSession(running, 15)

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

    const extended = extendTimedSession(running, 15)

    expect(extended.selectedSettings.durationMinutes).toBe(15)
    expect(extended.lockedSettings.durationMinutes).toBe(15)
    expect(extended.plan.totalMs).toBe(15 * 60_000)

    expect(() => extendTimedSession(extended, 15)).toThrow(RangeError)
    expect(() => extendTimedSession(extended, 10)).toThrow(RangeError)
    expect(() => extendTimedSession(extended, Number.POSITIVE_INFINITY)).toThrow(RangeError)

    const openEnded = startSession({ ...baseSettings, durationMinutes: 'open-ended' }, 0)
    expect(() => extendTimedSession(openEnded, 60)).toThrow(RangeError)
  })
})
