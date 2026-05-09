import { describe, expect, it } from 'vitest'
import { createBreathingPlan } from './breathingPlan'
import { getSessionFrame, formatDuration } from './sessionMath'

const timedPlan = createBreathingPlan({ bpm: 5, ratio: '40:60', durationMinutes: 10 })
const openEndedPlan = createBreathingPlan({ bpm: 5, ratio: '40:60', durationMinutes: 'open-ended' })

describe('session frame derivation', () => {
  it('starts in the In phase with zero progress and cycle index zero', () => {
    expect(getSessionFrame(timedPlan, 0)).toMatchObject({
      phase: 'in',
      phaseLabel: 'In',
      elapsedMs: 0,
      phaseProgress: 0,
      cycleIndex: 0,
      isComplete: false,
    })
  })

  it('switches to Out exactly at the inhale boundary with no gap', () => {
    expect(getSessionFrame(timedPlan, timedPlan.inhaleMs)).toMatchObject({
      phase: 'out',
      phaseLabel: 'Out',
      phaseProgress: 0,
      cycleIndex: 0,
    })
  })

  it('returns to In at the next cycle boundary with the cycle index incremented', () => {
    expect(getSessionFrame(timedPlan, timedPlan.cycleMs)).toMatchObject({
      phase: 'in',
      phaseLabel: 'In',
      phaseProgress: 0,
      cycleIndex: 1,
    })
  })

  it('reports decreasing remaining time and completes timed sessions at total duration', () => {
    expect(getSessionFrame(timedPlan, 125_000)).toMatchObject({
      remainingMs: 475_000,
      isComplete: false,
    })
    expect(getSessionFrame(timedPlan, 600_000)).toMatchObject({
      elapsedMs: 600_000,
      remainingMs: 0,
      isComplete: true,
    })
    expect(getSessionFrame(timedPlan, 650_000)).toMatchObject({
      elapsedMs: 650_000,
      remainingMs: 0,
      isComplete: true,
    })
  })

  it('keeps open-ended sessions running without remaining time', () => {
    expect(getSessionFrame(openEndedPlan, 3_600_000)).toMatchObject({
      remainingMs: null,
      isComplete: false,
    })
  })

  it('clamps negative elapsed time to zero', () => {
    expect(getSessionFrame(timedPlan, -100)).toMatchObject({
      elapsedMs: 0,
      phase: 'in',
      phaseProgress: 0,
    })
  })
})

describe('formatDuration', () => {
  it('formats milliseconds as clock time', () => {
    expect(formatDuration(0)).toBe('0:00')
    expect(formatDuration(65_000)).toBe('1:05')
    expect(formatDuration(3_665_000)).toBe('61:05')
  })
})
