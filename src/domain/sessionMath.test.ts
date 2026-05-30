import { describe, expect, it } from 'vitest'
import { createBreathingPlan } from './breathingPlan'
import { getSessionFrame, formatDuration } from './sessionMath'
import { DEFAULT_SETTINGS } from './settings'

const timedPlan = createBreathingPlan({ ...DEFAULT_SETTINGS, bpm: 5, ratio: '40:60', durationMinutes: 10 })
const openEndedPlan = createBreathingPlan({ ...DEFAULT_SETTINGS, bpm: 5, ratio: '40:60', durationMinutes: 'open-ended' })

describe('session frame derivation', () => {
  it('starts in the In phase with zero progress and cycle index zero', () => {
    expect(getSessionFrame(timedPlan, 0)).toMatchObject({
      phase: 'in',
      phaseLabel: 'In',
      elapsedSec: 0,
      phaseProgress: 0,
      cycleIndex: 0,
      isComplete: false,
    })
  })

  it('switches to Out exactly at the inhale boundary with no gap', () => {
    expect(getSessionFrame(timedPlan, timedPlan.inhaleSec)).toMatchObject({
      phase: 'out',
      phaseLabel: 'Out',
      phaseProgress: 0,
      cycleIndex: 0,
    })
  })

  it('returns to In at the next cycle boundary with the cycle index incremented', () => {
    expect(getSessionFrame(timedPlan, timedPlan.cycleSec)).toMatchObject({
      phase: 'in',
      phaseLabel: 'In',
      phaseProgress: 0,
      cycleIndex: 1,
    })
  })

  it('reports decreasing remaining time and completes timed sessions at total duration', () => {
    // 125 sec elapsed of a 600 sec total → 475 sec remaining.
    expect(getSessionFrame(timedPlan, 125)).toMatchObject({
      remainingSec: 475,
      isComplete: false,
    })
    expect(getSessionFrame(timedPlan, 600)).toMatchObject({
      elapsedSec: 600,
      remainingSec: 0,
      isComplete: true,
    })
    expect(getSessionFrame(timedPlan, 650)).toMatchObject({
      elapsedSec: 650,
      remainingSec: 0,
      isComplete: true,
    })
  })

  // Timed completion holds until the current cycle ends so cues
  // and the orb finish their In/Out before transitioning to 'complete'.
  it('holds completion until the current cycle finishes when total duration falls mid-cycle', () => {
    // bpm 5.5 → cycle ≈ 10.909 sec; 5 min total → 27.5 cycles (mid-cycle).
    const offsetPlan = createBreathingPlan({ ...DEFAULT_SETTINGS, bpm: 5.5, ratio: '40:60', durationMinutes: 5 })
    const cycleSec = offsetPlan.cycleSec
    const cycleEnd = Math.ceil(300 / cycleSec) * cycleSec

    expect(getSessionFrame(offsetPlan, 300).isComplete).toBe(false)
    expect(getSessionFrame(offsetPlan, cycleEnd - 0.001).isComplete).toBe(false)
    expect(getSessionFrame(offsetPlan, cycleEnd).isComplete).toBe(true)
  })

  it('keeps open-ended sessions running without remaining time', () => {
    expect(getSessionFrame(openEndedPlan, 3_600)).toMatchObject({
      remainingSec: null,
      isComplete: false,
    })
  })

  it('clamps negative elapsed time to zero', () => {
    expect(getSessionFrame(timedPlan, -0.1)).toMatchObject({
      elapsedSec: 0,
      phase: 'in',
      phaseProgress: 0,
    })
  })
})

describe('formatDuration', () => {
  it('formats seconds as clock time', () => {
    // formatDuration accepts seconds.
    expect(formatDuration(0)).toBe('0:00')
    expect(formatDuration(65)).toBe('1:05')
    expect(formatDuration(3_665)).toBe('61:05')
  })
})
