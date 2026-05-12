import { describe, expect, it } from 'vitest'

import { isValidBpm, isValidRatio, isValidDuration, isValidTheme, isValidTimbre, isValidVariant, isValidLocale } from './settings'

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

describe('isValidVariant (INFRA-02 D-01)', () => {
  it('returns true for VARIANT_OPTIONS members (e.g. "orb")', () => {
    expect(isValidVariant('orb')).toBe(true)
  })

  it('returns false for malformed strings ("Orb", "circle", "")', () => {
    expect(isValidVariant('Orb')).toBe(false)
    expect(isValidVariant('circle')).toBe(false)
    expect(isValidVariant('')).toBe(false)
  })

  it('returns false for wrong type (null, undefined, 0, array)', () => {
    expect(isValidVariant(null)).toBe(false)
    expect(isValidVariant(undefined)).toBe(false)
    expect(isValidVariant(0)).toBe(false)
    expect(isValidVariant(['orb'])).toBe(false)
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
