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
    expect(DEFAULT_SETTINGS).toEqual({
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
    expect(() => validateSettings({ bpm: 7.5, ratio: '40:60', durationMinutes: 10 })).toThrow(
      /Unsupported BPM/,
    )
    expect(() => validateSettings({ bpm: 5.5, ratio: '60:40', durationMinutes: 10 })).toThrow(
      /Unsupported ratio/,
    )
    expect(() => validateSettings({ bpm: 5.5, ratio: '40:60', durationMinutes: 65 })).toThrow(
      /Unsupported duration/,
    )
  })
})

describe('breathing plan math', () => {
  it('converts BPM, ratio, and duration into continuous inhale/exhale timing', () => {
    expect(createBreathingPlan({ bpm: 5, ratio: '40:60', durationMinutes: 10 })).toEqual({
      bpm: 5,
      ratio: '40:60',
      cycleMs: 12_000,
      inhaleMs: 4_800,
      exhaleMs: 7_200,
      totalMs: 600_000,
    })
  })

  it('uses null total duration for open-ended sessions', () => {
    expect(createBreathingPlan({ bpm: 5.5, ratio: '50:50', durationMinutes: 'open-ended' }).totalMs).toBeNull()
  })
})
