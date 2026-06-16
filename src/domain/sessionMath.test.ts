import { describe, expect, it } from 'vitest'

import { createBreathingPlan } from './breathingPlan'
import { getCompletionSec, getSessionFrame, formatDuration } from './sessionMath'
import type { PatternSettings } from './settings'

// 4·7·8·0 ×1, 3 rounds → phases [inhale 4, hold-in 7, exhale 8], cycle 19, total 57.
const base: PatternSettings = { inhale: 4, holdIn: 7, exhale: 8, holdOut: 0, multiplier: 1, rounds: 3 }
const timedPlan = createBreathingPlan(base)
const openEndedPlan = createBreathingPlan({ ...base, rounds: 'open-ended' })

describe('getSessionFrame', () => {
  it('starts in the inhale phase, round 1, zero progress', () => {
    expect(getSessionFrame(timedPlan, 0)).toMatchObject({
      phase: 'inhale',
      phaseIndex: 0,
      phaseProgress: 0,
      round: 1,
      isComplete: false,
    })
  })

  it('advances through the non-zero phases at their boundaries', () => {
    expect(getSessionFrame(timedPlan, 4)).toMatchObject({ phase: 'hold-in', phaseIndex: 1, phaseProgress: 0 })
    expect(getSessionFrame(timedPlan, 11)).toMatchObject({ phase: 'exhale', phaseIndex: 2, phaseProgress: 0 })
  })

  // AC-3: hold-out (base 0) never appears in the cycle.
  it('never surfaces an omitted zero hold', () => {
    const phases = new Set<string>()
    for (let t = 0; t < timedPlan.cycleSec; t += 0.5) phases.add(getSessionFrame(timedPlan, t).phase)
    expect(phases.has('hold-out')).toBe(false)
  })

  it('increments the round at each cycle boundary', () => {
    expect(getSessionFrame(timedPlan, timedPlan.cycleSec).round).toBe(2)
    expect(getSessionFrame(timedPlan, 2 * timedPlan.cycleSec).round).toBe(3)
  })

  // AC-4: completes exactly at rounds × cycleSec; not one second before.
  it('completes at rounds × cycleSec and reports decreasing remaining', () => {
    expect(getSessionFrame(timedPlan, 38)).toMatchObject({ remainingSec: 19, isComplete: false })
    expect(getSessionFrame(timedPlan, 56).isComplete).toBe(false)
    expect(getSessionFrame(timedPlan, 57)).toMatchObject({ remainingSec: 0, isComplete: true })
  })

  // AC-5: open-ended never auto-completes.
  it('keeps open-ended sessions running with no remaining time', () => {
    expect(getSessionFrame(openEndedPlan, 3_600)).toMatchObject({ remainingSec: null, isComplete: false })
  })

  it('clamps negative elapsed to zero', () => {
    expect(getSessionFrame(timedPlan, -0.1)).toMatchObject({ elapsedSec: 0, phase: 'inhale', phaseProgress: 0 })
  })
})

describe('getCompletionSec', () => {
  it('returns totalSec for timed plans and agrees with isComplete', () => {
    expect(getCompletionSec(timedPlan)).toBe(57)
    expect(getSessionFrame(timedPlan, 56.999).isComplete).toBe(false)
    expect(getSessionFrame(timedPlan, 57).isComplete).toBe(true)
  })

  it('returns null for open-ended plans', () => {
    expect(getCompletionSec(openEndedPlan)).toBeNull()
  })

  it('returns null for degenerate plans (cycleSec <= 0)', () => {
    expect(getCompletionSec({ phases: [], cycleSec: 0, rounds: 1, totalSec: 0 })).toBeNull()
  })
})

describe('formatDuration', () => {
  it('formats seconds as clock time', () => {
    expect(formatDuration(0)).toBe('0:00')
    expect(formatDuration(65)).toBe('1:05')
    expect(formatDuration(3_665)).toBe('61:05')
  })
})
