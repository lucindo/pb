import { describe, expect, it } from 'vitest'

import { isValidTheme, isValidTimbre, isValidLocale } from './settings'

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
