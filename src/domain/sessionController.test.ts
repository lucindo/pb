import { describe, expect, it } from 'vitest'

import type { PatternSettings } from './settings'
import { completeIfNeeded, endSession, startSession } from './sessionController'

// 4·7·8·0 ×1, 3 rounds → cycle 19s, total 57s.
const baseSettings: PatternSettings = { inhale: 4, holdIn: 7, exhale: 8, holdOut: 0, multiplier: 1, rounds: 3 }

describe('session lifecycle controller', () => {
  it('locks settings at start so later edits to the selected object cannot mutate the running plan', () => {
    const selected = { ...baseSettings }
    const running = startSession(selected, 1)

    selected.inhale = 10
    selected.rounds = 99

    expect(running.lockedSettings).toEqual(baseSettings)
    expect(running.plan.cycleSec).toBe(19)
    expect(running.startedAtSec).toBe(1)
    expect(running.lastFrame.phase).toBe('inhale')
  })

  it('ends a running session by clearing active state while preserving selected settings', () => {
    const running = startSession(baseSettings, 1)
    expect(endSession(running)).toEqual({ status: 'idle', selectedSettings: baseSettings })
  })

  it('completes a timed session at rounds × cycleSec with the required message', () => {
    const running = startSession(baseSettings, 2)
    expect(completeIfNeeded(running, 2 + 56).status).toBe('running')

    const complete = completeIfNeeded(running, 2 + 57)
    expect(complete.status).toBe('complete')
    if (complete.status !== 'complete') throw new Error('Expected complete state')
    expect(complete.message).toBe('Session complete')
    expect(complete.completedAtSec).toBe(2 + 57)
    expect(complete.lockedSettings).toEqual(baseSettings)
  })

  it('keeps open-ended sessions running indefinitely until manually ended', () => {
    const running = startSession({ ...baseSettings, rounds: 'open-ended' }, 0)
    const later = completeIfNeeded(running, 61 * 60)

    expect(later.status).toBe('running')
    if (later.status !== 'running') throw new Error('Expected running state')
    expect(later.lastFrame.remainingSec).toBeNull()
    expect(endSession(later).status).toBe('idle')
  })
})
