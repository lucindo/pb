import { describe, expect, it } from 'vitest'
import {
  BPM_OPTIONS,
  DEFAULT_SETTINGS,
  DURATION_OPTIONS,
  RATIO_OPTIONS,
  validateSettings,
} from './settings'
import { createBreathingPlan } from './breathingPlan'

describe('supported breathing settings', () => {
  it('uses the locked default settings', () => {
    expect(DEFAULT_SETTINGS).toMatchObject({
      bpm: 5.5,
      ratio: '40:60',
      durationMinutes: 10,
    })
  })

  it('supports BPM values from 1 through 7 in 0.5 increments', () => {
    expect(BPM_OPTIONS).toEqual([
      1, 1.5, 2, 2.5, 3, 3.5, 4, 4.5, 5, 5.5, 6, 6.5, 7,
    ])
  })

  it('supports only the compact required ratio labels', () => {
    expect(RATIO_OPTIONS).toEqual(['50:50', '40:60', '30:70', '20:80'])
  })

  it('supports 5 through 60 minute durations plus open-ended', () => {
    expect(DURATION_OPTIONS).toEqual([
      5,
      10,
      15,
      20,
      25,
      30,
      35,
      40,
      45,
      50,
      55,
      60,
      'open-ended',
    ])
  })

  it('rejects unsupported settings instead of clamping silently', () => {
    expect(() => validateSettings({ ...DEFAULT_SETTINGS, bpm: 7.5 })).toThrow(
      /Unsupported BPM/,
    )
    expect(() => validateSettings({ ...DEFAULT_SETTINGS, ratio: '60:40' as never })).toThrow(
      /Unsupported ratio/,
    )
    expect(() => validateSettings({ ...DEFAULT_SETTINGS, durationMinutes: 65 })).toThrow(
      /Unsupported duration/,
    )
  })
})

describe('breathing plan math', () => {
  it('converts BPM, ratio, and duration into continuous inhale/exhale timing', () => {
    // BreathingPlan fields are seconds-shaped. The construction `12 * (40/100)` produces
    // 4.800000000000001 due to IEEE-754 representation of 0.4 — this FP residue is
    // benign (downstream consumers use toBeCloseTo or Math.floor). Per-field toBeCloseTo
    // asserts structural equivalence without anchoring on exact arithmetic byte representation.
    const plan = createBreathingPlan({ ...DEFAULT_SETTINGS, bpm: 5, ratio: '40:60', durationMinutes: 10 })
    expect(plan.bpm).toBe(5)
    expect(plan.ratio).toBe('40:60')
    expect(plan.cycleSec).toBeCloseTo(12, 9)
    expect(plan.inhaleSec).toBeCloseTo(4.8, 9)
    expect(plan.exhaleSec).toBeCloseTo(7.2, 9)
    expect(plan.totalSec).toBe(600)
  })

  it('uses null total duration for open-ended sessions', () => {
    expect(createBreathingPlan({ ...DEFAULT_SETTINGS, bpm: 5.5, ratio: '50:50', durationMinutes: 'open-ended' }).totalSec).toBeNull()
  })
})
