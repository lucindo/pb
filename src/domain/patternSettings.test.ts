import { describe, expect, it } from 'vitest'

import { validatePatternSettings, DEFAULT_PATTERN_SETTINGS } from './settings'

describe('validatePatternSettings', () => {
  it('passes a fully valid pattern through unchanged', () => {
    const valid = { inhale: 4, holdIn: 7, exhale: 8, holdOut: 0, multiplier: 1, rounds: 5 }
    expect(validatePatternSettings(valid)).toEqual(valid)
  })

  it('keeps the open-ended rounds sentinel', () => {
    const result = validatePatternSettings({ ...DEFAULT_PATTERN_SETTINGS, rounds: 'open-ended' })
    expect(result.rounds).toBe('open-ended')
  })

  // AC-6: each out-of-range field falls back to its default; never throws.
  it('substitutes the default for out-of-range fields', () => {
    const result = validatePatternSettings({
      inhale: 61,
      holdIn: 7,
      exhale: 8,
      holdOut: 301,
      multiplier: 0,
      rounds: 100,
    })
    expect(result).toEqual({
      inhale: DEFAULT_PATTERN_SETTINGS.inhale,
      holdIn: 7,
      exhale: 8,
      holdOut: DEFAULT_PATTERN_SETTINGS.holdOut,
      multiplier: DEFAULT_PATTERN_SETTINGS.multiplier,
      rounds: DEFAULT_PATTERN_SETTINGS.rounds,
    })
  })

  it('substitutes the default for wrong-type and non-integer fields', () => {
    const result = validatePatternSettings({ inhale: '4', holdIn: 1.5, exhale: null, holdOut: 2 })
    expect(result.inhale).toBe(DEFAULT_PATTERN_SETTINGS.inhale)
    expect(result.holdIn).toBe(DEFAULT_PATTERN_SETTINGS.holdIn)
    expect(result.exhale).toBe(DEFAULT_PATTERN_SETTINGS.exhale)
    expect(result.holdOut).toBe(2)
  })

  // AC-13: a legacy resonance envelope has none of the pattern fields → all defaults.
  it('coerces a legacy bpm/ratio envelope to all defaults', () => {
    expect(validatePatternSettings({ bpm: 5.5, ratio: '40:60', durationMinutes: 10 })).toEqual(
      DEFAULT_PATTERN_SETTINGS,
    )
  })

  it('coerces non-object input to all defaults without throwing', () => {
    expect(validatePatternSettings(null)).toEqual(DEFAULT_PATTERN_SETTINGS)
    expect(validatePatternSettings(undefined)).toEqual(DEFAULT_PATTERN_SETTINGS)
  })
})
