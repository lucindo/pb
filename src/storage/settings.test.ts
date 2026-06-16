import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

import {
  coerceSettings,
  coerceMute,
  loadMute,
  saveMute,
  savePatternBreathingSettings,
} from './settings'
import { STATE_KEY } from './storage'
import { DEFAULT_PATTERN_SETTINGS, type PatternSettings } from '../domain/settings'

const valid: PatternSettings = { inhale: 4, holdIn: 7, exhale: 8, holdOut: 0, multiplier: 1, rounds: 5 }

beforeEach(() => {
  window.localStorage.clear()
})

afterEach(() => {
  window.localStorage.clear()
  vi.restoreAllMocks()
})

// coerceSettings delegates to validatePatternSettings (covered in depth by
// patternSettings.test.ts); here we pin the storage-boundary behavior.
describe('coerceSettings', () => {
  it('returns defaults for null / non-object / legacy resonance envelopes', () => {
    expect(coerceSettings(null)).toEqual(DEFAULT_PATTERN_SETTINGS)
    expect(coerceSettings(42)).toEqual(DEFAULT_PATTERN_SETTINGS)
    expect(coerceSettings({})).toEqual(DEFAULT_PATTERN_SETTINGS)
    expect(coerceSettings({ bpm: 5.5, ratio: '40:60', durationMinutes: 10 })).toEqual(DEFAULT_PATTERN_SETTINGS)
  })

  it('preserves a valid pattern verbatim', () => {
    expect(coerceSettings(valid)).toEqual(valid)
  })

  it('returns exactly the six pattern keys — extra fields dropped', () => {
    const result = coerceSettings({ ...valid, mode: 'stretch', initialBpm: 6 })
    expect(Object.keys(result).sort()).toEqual(['exhale', 'holdIn', 'holdOut', 'inhale', 'multiplier', 'rounds'])
  })
})

describe('coerceMute', () => {
  it('returns the boolean verbatim, else false', () => {
    expect(coerceMute(true)).toBe(true)
    expect(coerceMute(false)).toBe(false)
    expect(coerceMute(null)).toBe(false)
    expect(coerceMute('true')).toBe(false)
    expect(coerceMute(1)).toBe(false)
  })
})

describe('loadMute / saveMute round-trip', () => {
  it('returns false when nothing is stored', () => {
    expect(loadMute()).toBe(false)
  })

  it('round-trips true / false', () => {
    saveMute(true)
    expect(loadMute()).toBe(true)
    saveMute(false)
    expect(loadMute()).toBe(false)
  })

  it('preserves settings + mute when saving mute (envelope merge)', () => {
    savePatternBreathingSettings(valid)
    saveMute(true)
    // eslint-disable-next-line @typescript-eslint/no-non-null-assertion
    const raw = JSON.parse(window.localStorage.getItem(STATE_KEY)!) as Record<string, unknown>
    expect(raw['settings']).toMatchObject(valid)
    expect(raw).toMatchObject({ mute: true })
  })
})
