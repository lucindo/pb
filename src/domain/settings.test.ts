import { describe, expect, it } from 'vitest'

import {
  isValidBpm,
  isValidRatio,
  isValidDuration,
  isValidTheme,
  isValidTimbre,
  isValidCue,
  isValidLocale,
  validateSettings,
  getNextDurationOption,
  DEFAULT_SETTINGS,
  DEFAULT_CUE,
} from './settings'
import type { SessionSettings } from './settings'

describe('isValidBpm (HYGIENE-02 D-08)', () => {
  it('returns true for valid BPM_OPTIONS members (e.g. 5.5)', () => {
    expect(isValidBpm(5.5)).toBe(true)
  })

  it('returns false for out-of-range numbers (0, 7.5)', () => {
    expect(isValidBpm(0)).toBe(false)
    expect(isValidBpm(7.5)).toBe(false)
  })

  it('returns false for wrong type (string "5", null) and NaN / Infinity', () => {
    expect(isValidBpm('5')).toBe(false)
    expect(isValidBpm(null)).toBe(false)
    expect(isValidBpm(NaN)).toBe(false)
    expect(isValidBpm(Infinity)).toBe(false)
  })
})

describe('isValidRatio (HYGIENE-02 D-08)', () => {
  it('returns true for RATIO_OPTIONS members (e.g. "40:60")', () => {
    expect(isValidRatio('40:60')).toBe(true)
  })

  it('returns false for malformed strings ("40-60", "")', () => {
    expect(isValidRatio('40-60')).toBe(false)
    expect(isValidRatio('')).toBe(false)
  })

  it('returns false for wrong type (number 60)', () => {
    expect(isValidRatio(60)).toBe(false)
  })
})

describe('isValidDuration (HYGIENE-02 D-08)', () => {
  it('returns true for DURATION_OPTIONS numeric members (e.g. 10)', () => {
    expect(isValidDuration(10)).toBe(true)
  })

  it('returns true for "open-ended" sentinel', () => {
    expect(isValidDuration('open-ended')).toBe(true)
  })

  it('returns false for out-of-range numbers (7), arbitrary strings ("forever"), null', () => {
    expect(isValidDuration(7)).toBe(false)
    expect(isValidDuration('forever')).toBe(false)
    expect(isValidDuration(null)).toBe(false)
  })
})

describe('duration option helpers', () => {
  it('returns the next duration option without crossing past open-ended', () => {
    expect(getNextDurationOption(10)).toBe(15)
    expect(getNextDurationOption(60)).toBe('open-ended')
    expect(getNextDurationOption('open-ended')).toBeUndefined()
  })
})

describe('isValidTheme (INFRA-02 D-01)', () => {
  it('returns true for THEME_OPTIONS members (e.g. "system")', () => {
    expect(isValidTheme('system')).toBe(true)
  })

  it('returns false for malformed strings ("Light", "neon", "")', () => {
    expect(isValidTheme('Light')).toBe(false)
    expect(isValidTheme('neon')).toBe(false)
    expect(isValidTheme('')).toBe(false)
  })

  it('returns false for wrong type (null, undefined, 0, array)', () => {
    expect(isValidTheme(null)).toBe(false)
    expect(isValidTheme(undefined)).toBe(false)
    expect(isValidTheme(0)).toBe(false)
    expect(isValidTheme(['light'])).toBe(false)
  })
})

describe('isValidTimbre (INFRA-02 D-01)', () => {
  it('returns true for TIMBRE_OPTIONS members (e.g. "bowl")', () => {
    expect(isValidTimbre('bowl')).toBe(true)
  })

  it('returns false for malformed strings ("Bowl", "trumpet", "")', () => {
    expect(isValidTimbre('Bowl')).toBe(false)
    expect(isValidTimbre('trumpet')).toBe(false)
    expect(isValidTimbre('')).toBe(false)
  })

  it('returns false for wrong type (null, undefined, 0, array)', () => {
    expect(isValidTimbre(null)).toBe(false)
    expect(isValidTimbre(undefined)).toBe(false)
    expect(isValidTimbre(0)).toBe(false)
    expect(isValidTimbre(['bowl'])).toBe(false)
  })
})

describe('isValidCue (Phase 25 CUE-01)', () => {
  it('returns true for all CUE_OPTIONS members: labels, arrow, nose', () => {
    expect(isValidCue('labels')).toBe(true)
    expect(isValidCue('arrow')).toBe(true)
    expect(isValidCue('nose')).toBe(true)
  })

  it('returns false for variant-like strings that are not cue options ("orb", "square", "diamond")', () => {
    expect(isValidCue('orb')).toBe(false)
    expect(isValidCue('square')).toBe(false)
    expect(isValidCue('diamond')).toBe(false)
  })

  it('returns false for empty string', () => {
    expect(isValidCue('')).toBe(false)
  })

  it('returns false for wrong type (null, undefined, 42, array)', () => {
    expect(isValidCue(null)).toBe(false)
    expect(isValidCue(undefined)).toBe(false)
    expect(isValidCue(42)).toBe(false)
    expect(isValidCue(['labels'])).toBe(false)
  })
})

describe('DEFAULT_CUE (Phase 25 CUE-01)', () => {
  it('DEFAULT_CUE is "arrow" (set via quick task 260519-9mi, superseding CONTEXT D-01)', () => {
    expect(DEFAULT_CUE).toBe('arrow')
  })
})

describe('isValidLocale (INFRA-02 D-01)', () => {
  it('returns true for LOCALE_OPTIONS members (e.g. "en")', () => {
    expect(isValidLocale('en')).toBe(true)
  })

  it('returns false for malformed strings ("pt_BR" underscore, "EN", "")', () => {
    expect(isValidLocale('pt_BR')).toBe(false)
    expect(isValidLocale('EN')).toBe(false)
    expect(isValidLocale('')).toBe(false)
  })

  it('returns false for wrong type (null, undefined, 0, array)', () => {
    expect(isValidLocale(null)).toBe(false)
    expect(isValidLocale(undefined)).toBe(false)
    expect(isValidLocale(0)).toBe(false)
    expect(isValidLocale(['en'])).toBe(false)
  })
})

// SessionSettings is now standard-only (3 fields)
describe('SessionSettings and validateSettings (D-01, D-02, STRETCH-03)', () => {
  it('DEFAULT_SETTINGS has exactly bpm, ratio, durationMinutes — no mode field', () => {
    expect(DEFAULT_SETTINGS).not.toHaveProperty('mode')
    expect(DEFAULT_SETTINGS).toHaveProperty('bpm')
    expect(DEFAULT_SETTINGS).toHaveProperty('ratio')
    expect(DEFAULT_SETTINGS).toHaveProperty('durationMinutes')
  })

  it('validateSettings accepts valid standard settings (3 fields only)', () => {
    const valid: SessionSettings = { bpm: 5.5, ratio: '40:60', durationMinutes: 10 }
    expect(() => validateSettings(valid)).not.toThrow()
    const result = validateSettings(valid)
    expect(result.bpm).toBe(5.5)
    expect(result.ratio).toBe('40:60')
    expect(result.durationMinutes).toBe(10)
  })

  it('validateSettings throws RangeError for invalid bpm', () => {
    const bad: SessionSettings = { bpm: 999, ratio: '40:60', durationMinutes: 10 }
    expect(() => validateSettings(bad)).toThrow(RangeError)
  })

  it('validateSettings throws RangeError for invalid ratio', () => {
    const bad = { bpm: 5.5, ratio: '99:01' as never, durationMinutes: 10 }
    expect(() => validateSettings(bad)).toThrow(RangeError)
  })

  it('validateSettings throws RangeError for invalid durationMinutes', () => {
    const bad: SessionSettings = { bpm: 5.5, ratio: '40:60', durationMinutes: 7 }
    expect(() => validateSettings(bad)).toThrow(RangeError)
  })
})
