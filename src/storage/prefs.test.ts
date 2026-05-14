import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

import {
  coercePrefs,
  coerceTheme,
  coerceTimbre,
  coerceVariant,
  coerceLocale,
  loadPrefs,
  savePrefs,
  DEFAULT_PREFS,
  type UserPrefs,
} from './prefs'
import { STATE_KEY } from './storage'
import {
  DEFAULT_THEME,
  DEFAULT_TIMBRE,
  DEFAULT_VARIANT,
  DEFAULT_LOCALE,
  THEME_OPTIONS,
  TIMBRE_OPTIONS,
  VARIANT_OPTIONS,
  LOCALE_OPTIONS,
} from '../domain/settings'

beforeEach(() => {
  window.localStorage.clear()
})

afterEach(() => {
  window.localStorage.clear()
  vi.restoreAllMocks()
})

describe('coercePrefs (D-10 / D-17)', () => {
  it('returns DEFAULT_PREFS when raw is null / undefined / non-object', () => {
    expect(coercePrefs(null)).toEqual(DEFAULT_PREFS)
    expect(coercePrefs(undefined)).toEqual(DEFAULT_PREFS)
    expect(coercePrefs(42)).toEqual(DEFAULT_PREFS)
    expect(coercePrefs('str')).toEqual(DEFAULT_PREFS)
    expect(coercePrefs([1, 2, 3])).toEqual(DEFAULT_PREFS)
  })

  it('returns DEFAULT_PREFS when raw is empty object', () => {
    expect(coercePrefs({})).toEqual(DEFAULT_PREFS)
  })

  it('preserves all valid fields verbatim', () => {
    const valid: UserPrefs = { theme: 'dark', timbre: 'bell', variant: 'square', locale: 'pt-BR' }
    expect(coercePrefs(valid)).toEqual(valid)
  })

  it('falls back PER FIELD when theme is invalid (D-17) — keeps timbre + variant + locale', () => {
    expect(coercePrefs({ theme: 'neon', timbre: 'bowl', variant: 'orb', locale: 'en' }))
      .toEqual({ theme: DEFAULT_THEME, timbre: 'bowl', variant: 'orb', locale: 'en' })
  })

  it('falls back PER FIELD when timbre is invalid (D-17) — keeps theme + variant + locale', () => {
    expect(coercePrefs({ theme: 'dark', timbre: 'trumpet', variant: 'orb', locale: 'en' }))
      .toEqual({ theme: 'dark', timbre: DEFAULT_TIMBRE, variant: 'orb', locale: 'en' })
  })

  it('falls back PER FIELD when variant is invalid (D-17) — keeps theme + timbre + locale', () => {
    expect(coercePrefs({ theme: 'dark', timbre: 'bell', variant: 'circle', locale: 'en' }))
      .toEqual({ theme: 'dark', timbre: 'bell', variant: DEFAULT_VARIANT, locale: 'en' })
  })

  it('falls back PER FIELD when locale is invalid (D-17) — keeps theme + timbre + variant', () => {
    expect(coercePrefs({ theme: 'dark', timbre: 'bell', variant: 'square', locale: 'pt_BR' }))
      .toEqual({ theme: 'dark', timbre: 'bell', variant: 'square', locale: DEFAULT_LOCALE })
  })

  it('does not throw when raw has prototype-polluting keys (T-14-01 mitigation)', () => {
    // Prototype-pollution mitigation: we only read four known keys, never spread `raw`
    // into an object we use as a prototype. Test that a __proto__ key in the raw doesn't
    // propagate to the returned object.
    const polluted: unknown = JSON.parse('{"theme":"system","timbre":"bowl","variant":"orb","locale":"en","__proto__":{"polluted":true}}')
    const out = coercePrefs(polluted) as unknown as Record<string, unknown>
    expect(out.polluted).toBeUndefined()
    expect((Object.prototype as Record<string, unknown>).polluted).toBeUndefined()
  })
})

describe('coerceTheme / coerceTimbre / coerceVariant / coerceLocale (D-10 per-field)', () => {
  it('coerceTheme accepts all THEME_OPTIONS members and rejects invalid values', () => {
    for (const opt of THEME_OPTIONS) {
      expect(coerceTheme(opt)).toBe(opt)
    }
    expect(coerceTheme('neon')).toBe(DEFAULT_THEME)
    expect(coerceTheme(null)).toBe(DEFAULT_THEME)
    expect(coerceTheme(0)).toBe(DEFAULT_THEME)
  })

  it('coerceTimbre accepts all TIMBRE_OPTIONS members and rejects invalid values', () => {
    for (const opt of TIMBRE_OPTIONS) {
      expect(coerceTimbre(opt)).toBe(opt)
    }
    expect(coerceTimbre('trumpet')).toBe(DEFAULT_TIMBRE)
    expect(coerceTimbre(null)).toBe(DEFAULT_TIMBRE)
    expect(coerceTimbre(0)).toBe(DEFAULT_TIMBRE)
  })

  it('coerceVariant accepts all VARIANT_OPTIONS members and rejects invalid values', () => {
    for (const opt of VARIANT_OPTIONS) {
      expect(coerceVariant(opt)).toBe(opt)
    }
    expect(coerceVariant('circle')).toBe(DEFAULT_VARIANT)
    expect(coerceVariant(null)).toBe(DEFAULT_VARIANT)
    expect(coerceVariant(0)).toBe(DEFAULT_VARIANT)
  })

  // Forward-compat invariant: old 'ring' localStorage values (written before the
  // Phase 17 deviation swap) coerce to DEFAULT_VARIANT ('orb') on read.
  // This ensures users with saved 'ring' prefs gracefully fall back to the default
  // rather than storing an unknown variant id in the live prefs object.
  it("coerceVariant('ring') → DEFAULT_VARIANT ('orb') — forward-compat for pre-swap localStorage values", () => {
    expect(coerceVariant('ring')).toBe(DEFAULT_VARIANT)
    expect(coerceVariant('ring')).toBe('orb')
  })

  it('coerceLocale accepts all LOCALE_OPTIONS members and rejects invalid values', () => {
    for (const opt of LOCALE_OPTIONS) {
      expect(coerceLocale(opt)).toBe(opt)
    }
    expect(coerceLocale('pt_BR')).toBe(DEFAULT_LOCALE)
    expect(coerceLocale(null)).toBe(DEFAULT_LOCALE)
    expect(coerceLocale(0)).toBe(DEFAULT_LOCALE)
  })
})

describe('loadPrefs / savePrefs round-trip', () => {
  it('returns DEFAULT_PREFS when nothing is stored (LOCL-01)', () => {
    expect(loadPrefs()).toEqual(DEFAULT_PREFS)
  })

  it('round-trips a valid UserPrefs object', () => {
    const next: UserPrefs = { theme: 'dark', timbre: 'bell', variant: 'square', locale: 'pt-BR' }
    savePrefs(next)
    expect(loadPrefs()).toEqual(next)
  })

  it('preserves settings, mute, and stats fields when saving prefs (envelope merge)', () => {
    window.localStorage.setItem(STATE_KEY, JSON.stringify({
      version: 1,
      settings: { bpm: 4, ratio: '40:60', durationMinutes: 5 },
      mute: true,
      stats: { totalSessions: 3, totalElapsedSeconds: 120, lastSessionAtMs: 1000, lastSessionDurationSeconds: 60 },
    }))
    savePrefs({ theme: 'dark', timbre: 'bell', variant: 'square', locale: 'pt-BR' })
    // Reason: STATE_KEY is always present after savePrefs; non-null asserted by storage contract.
    // eslint-disable-next-line @typescript-eslint/no-non-null-assertion
    const raw = JSON.parse(window.localStorage.getItem(STATE_KEY)!) as Record<string, unknown>
    expect(raw).toMatchObject({ settings: { bpm: 4 }, mute: true, stats: { totalSessions: 3 } })
  })

  it('does not throw when underlying setItem throws (D-16)', () => {
    vi.spyOn(Storage.prototype, 'setItem').mockImplementation(() => {
      throw new Error('quota')
    })
    expect(() => { savePrefs({ theme: 'dark', timbre: 'bell', variant: 'square', locale: 'pt-BR' }) }).not.toThrow()
  })

  it('falls back to defaults when stored JSON is corrupt (D-17)', () => {
    window.localStorage.setItem(STATE_KEY, '{not-json')
    expect(loadPrefs()).toEqual(DEFAULT_PREFS)
  })
})
