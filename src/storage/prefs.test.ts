import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

import {
  coercePrefs,
  coerceTheme,
  coerceTimbre,
  coerceCue,
  coerceLocale,
  coerceBypassSilentMode,
  loadPrefs,
  savePrefs,
  DEFAULT_PREFS,
  type UserPrefs,
} from './prefs'
import { STATE_KEY } from './storage'
import {
  DEFAULT_THEME,
  DEFAULT_TIMBRE,
  DEFAULT_CUE,
  DEFAULT_LOCALE,
  THEME_OPTIONS,
  TIMBRE_OPTIONS,
  CUE_OPTIONS,
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

  it('preserves all valid fields verbatim (including cue)', () => {
    const valid: UserPrefs = { ...DEFAULT_PREFS, theme: 'dark', timbre: 'bell', cue: 'nose', locale: 'pt-BR' }
    expect(coercePrefs(valid)).toEqual(valid)
  })

  it('falls back PER FIELD when theme is invalid (D-17) — keeps timbre + cue + locale', () => {
    expect(coercePrefs({ theme: 'neon', timbre: 'bowl', cue: 'arrow', locale: 'en' }))
      .toEqual({ ...DEFAULT_PREFS, theme: DEFAULT_THEME, timbre: 'bowl', cue: 'arrow', locale: 'en' })
  })

  it('falls back PER FIELD when timbre is invalid (D-17) — keeps theme + cue + locale', () => {
    expect(coercePrefs({ theme: 'dark', timbre: 'trumpet', cue: 'labels', locale: 'en' }))
      .toEqual({ ...DEFAULT_PREFS, theme: 'dark', timbre: DEFAULT_TIMBRE, cue: 'labels', locale: 'en' })
  })

  it('falls back PER FIELD when cue is invalid — keeps theme + timbre + locale', () => {
    expect(coercePrefs({ theme: 'dark', timbre: 'bell', cue: 'bogus', locale: 'en' }))
      .toEqual({ ...DEFAULT_PREFS, theme: 'dark', timbre: 'bell', cue: DEFAULT_CUE, locale: 'en' })
  })

  it('falls back PER FIELD when locale is invalid (D-17) — keeps theme + timbre + cue', () => {
    expect(coercePrefs({ theme: 'dark', timbre: 'bell', cue: 'arrow', locale: 'pt_BR' }))
      .toEqual({ ...DEFAULT_PREFS, theme: 'dark', timbre: 'bell', cue: 'arrow', locale: DEFAULT_LOCALE })
  })

  it('pre-Phase-25 envelope (no cue key) coerces cue to default preserving three other valid fields (D-13)', () => {
    // A stored envelope with no cue key coerces to default; no STATE_VERSION bump needed.
    expect(coercePrefs({ theme: 'dark', timbre: 'bell', locale: 'pt-BR' }))
      .toEqual({ ...DEFAULT_PREFS, theme: 'dark', timbre: 'bell', cue: DEFAULT_CUE, locale: 'pt-BR' })
  })

  it('tolerates legacy variant key on persisted envelope — VAR-05 forward-compat (Phase 38 D-01)', () => {
    // A returning user with a pre-v2.0 persisted envelope carrying `variant: 'square' | 'diamond'`
    // must read through coercePrefs as a clean 8-field UserPrefs with NO `variant` property —
    // the unknown key is silently dropped on read (envelope tolerance). No STATE_VERSION bump
    // needed; the render path is always OrbShape.
    const legacySquareEnvelope: unknown = { theme: 'system', timbre: 'bowl', cue: 'labels', locale: 'en', variant: 'square' }
    const coercedSquare = coercePrefs(legacySquareEnvelope)
    expect(coercedSquare).toEqual({ ...DEFAULT_PREFS, theme: 'system', timbre: 'bowl', cue: 'labels', locale: 'en' })
    expect(Object.prototype.hasOwnProperty.call(coercedSquare, 'variant')).toBe(false)
    expect((coercedSquare as unknown as Record<string, unknown>).variant).toBeUndefined()

    const legacyDiamondEnvelope: unknown = { theme: 'dark', timbre: 'bell', cue: 'arrow', locale: 'pt-BR', variant: 'diamond' }
    const coercedDiamond = coercePrefs(legacyDiamondEnvelope)
    expect(coercedDiamond).toEqual({ ...DEFAULT_PREFS, theme: 'dark', timbre: 'bell', cue: 'arrow', locale: 'pt-BR' })
    expect(Object.prototype.hasOwnProperty.call(coercedDiamond, 'variant')).toBe(false)
  })

  it('does not throw when raw has prototype-polluting keys (T-25-01 mitigation)', () => {
    // Prototype-pollution mitigation: we only read four known keys, never spread `raw`
    // into an object we use as a prototype. Test that a __proto__ key in the raw doesn't
    // propagate to the returned object.
    const polluted: unknown = JSON.parse('{"theme":"system","timbre":"bowl","cue":"labels","locale":"en","__proto__":{"polluted":true}}')
    const out = coercePrefs(polluted) as unknown as Record<string, unknown>
    expect(out.polluted).toBeUndefined()
    expect((Object.prototype as Record<string, unknown>).polluted).toBeUndefined()
  })
})

describe('coerceTheme / coerceTimbre / coerceCue / coerceLocale (D-10 per-field)', () => {
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

  // AUDIO-02: legacy-value migration — 'chime' was the fourth timbre slot before it was
  // renamed to 'flute'. A returning user's persisted 'chime' must land on 'flute', not
  // the bowl default. 'chime' users chose the fourth slot and continue seamlessly with 'flute'.
  it("coerceTimbre('chime') → 'flute' — AUDIO-02 legacy-value migration for returning users", () => {
    expect(coerceTimbre('chime')).toBe('flute')
  })

  it("coerceTimbre passes through all current TIMBRE_OPTIONS unchanged after chime→flute rename", () => {
    expect(coerceTimbre('flute')).toBe('flute')
    expect(coerceTimbre('bowl')).toBe('bowl')
    expect(coerceTimbre('bell')).toBe('bell')
    expect(coerceTimbre('sine')).toBe('sine')
  })

  it("coerceTimbre falls safe to DEFAULT_TIMBRE for unknown strings and non-string garbage", () => {
    expect(coerceTimbre('trumpet')).toBe(DEFAULT_TIMBRE)
    expect(coerceTimbre(null)).toBe(DEFAULT_TIMBRE)
    expect(coerceTimbre(0)).toBe(DEFAULT_TIMBRE)
  })

  it("coercePrefs preserves other fields when timbre is legacy 'chime' — AUDIO-02 integration", () => {
    const result = coercePrefs({
      theme: 'dark',
      timbre: 'chime',
      cue: 'arrow',
      locale: 'pt-BR',
    })
    expect(result.timbre).toBe('flute')
    expect(result.theme).toBe('dark')
    expect(result.cue).toBe('arrow')
    expect(result.locale).toBe('pt-BR')
  })

  it('coerceCue accepts all CUE_OPTIONS members and rejects invalid values (Phase 25 T-25-01)', () => {
    for (const opt of CUE_OPTIONS) {
      expect(coerceCue(opt)).toBe(opt)
    }
    expect(coerceCue('bogus')).toBe(DEFAULT_CUE)
    expect(coerceCue(null)).toBe(DEFAULT_CUE)
    expect(coerceCue(0)).toBe(DEFAULT_CUE)
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

describe('coerceBypassSilentMode (Phase 49.1 D-05 — boolean coercer, default true)', () => {
  // Boolean coercer has THREE paths:
  //  (1) raw boolean: persisted JSON re-hydrates true/false verbatim — fast path
  //  (2) legacy string (parseBooleanString): tolerates hand-edited '"true"' / '"off"' envelopes
  //  (3) anything else: DEFAULT_BYPASS_SILENT_MODE (true)
  it('returns raw booleans verbatim (raw-boolean fast path)', () => {
    expect(coerceBypassSilentMode(true)).toBe(true)
    expect(coerceBypassSilentMode(false)).toBe(false)
  })

  it("parses legacy true-strings ('true' / 'on' / '1' / '')", () => {
    expect(coerceBypassSilentMode('true')).toBe(true)
    expect(coerceBypassSilentMode('on')).toBe(true)
    expect(coerceBypassSilentMode('1')).toBe(true)
    expect(coerceBypassSilentMode('')).toBe(true)
  })

  it("parses legacy false-strings ('false' / 'off' / '0')", () => {
    expect(coerceBypassSilentMode('false')).toBe(false)
    expect(coerceBypassSilentMode('off')).toBe(false)
    expect(coerceBypassSilentMode('0')).toBe(false)
  })

  it("falls back to the default (true) for unparseable strings", () => {
    expect(coerceBypassSilentMode('bogus')).toBe(true) // default true
  })

  it("falls back to true for non-string, non-boolean inputs (null / undefined / numbers / objects)", () => {
    expect(coerceBypassSilentMode(null)).toBe(true)
    expect(coerceBypassSilentMode(undefined)).toBe(true)
    expect(coerceBypassSilentMode(0)).toBe(true)
    expect(coerceBypassSilentMode(1)).toBe(true)
    expect(coerceBypassSilentMode({})).toBe(true)
    expect(coerceBypassSilentMode([])).toBe(true)
  })
})

describe('coercePrefs corrupt-field tolerance (Phase 47 PREFS-04)', () => {
  // Per-field non-throwing coerce-and-fallback: a single corrupt field falls back
  // to the per-flag default; the other fields are preserved.
  it("bypassSilentMode: 'junk' → true default (D-05); other fields preserved", () => {
    const out = coercePrefs({
      theme: 'dark', timbre: 'bell', cue: 'arrow', locale: 'pt-BR',
      bypassSilentMode: 'junk',
    })
    expect(out.bypassSilentMode).toBe(true) // corrupt-field falls back to true (bypassSilentMode default)
    expect(out.theme).toBe('dark')
  })

  it("pre-flags envelope (4 keys only) coerces the new keys to per-flag defaults (PREFS-03)", () => {
    // A returning user from a pre-flags build has 4 prefs keys — the new
    // key is undefined and its coercer falls back to the per-flag default.
    // Returning users see the production defaults.
    const out = coercePrefs({ theme: 'dark', timbre: 'bell', cue: 'arrow', locale: 'pt-BR' })
    expect(out).toEqual({
      ...DEFAULT_PREFS,
      theme: 'dark', timbre: 'bell', cue: 'arrow', locale: 'pt-BR',
    })
    expect(out.bypassSilentMode).toBe(true)
  })
})

describe('loadPrefs / savePrefs round-trip', () => {
  it('returns DEFAULT_PREFS when nothing is stored (LOCL-01)', () => {
    expect(loadPrefs()).toEqual(DEFAULT_PREFS)
  })

  it('round-trips a valid UserPrefs object (including cue field)', () => {
    const next: UserPrefs = { ...DEFAULT_PREFS, theme: 'dark', timbre: 'bell', cue: 'nose', locale: 'pt-BR' }
    savePrefs(next)
    expect(loadPrefs()).toEqual(next)
  })

  it('round-trips a 5-field UserPrefs with the flag set to a non-default value (Phase 47 + 49.1)', () => {
    // Full-fidelity round-trip: every field carries a non-default value so the
    // assertion fails if any coercer, the JSON re-hydration, or the envelope-merge drops a value.
    const fullPrefs: UserPrefs = {
      theme: 'dark', timbre: 'bell', cue: 'nose', locale: 'pt-BR',
      bypassSilentMode: false, // non-default (default is true)
    }
    savePrefs(fullPrefs)
    expect(loadPrefs()).toEqual(fullPrefs)
  })

  it('DEFAULT_PREFS.cue === "arrow" (quick task 260519-9mi)', () => {
    expect(DEFAULT_PREFS.cue).toBe('arrow')
  })

  it('preserves settings, mute, and stats fields when saving prefs (envelope merge)', () => {
    window.localStorage.setItem(STATE_KEY, JSON.stringify({
      version: 1,
      settings: { bpm: 4, ratio: '40:60', durationMinutes: 5 },
      mute: true,
      stats: { totalSessions: 3, totalElapsedSeconds: 120, lastSessionAtMs: 1000, lastSessionDurationSeconds: 60 },
    }))
    savePrefs({ ...DEFAULT_PREFS, theme: 'dark', timbre: 'bell', cue: 'arrow', locale: 'pt-BR' })
    // Reason: STATE_KEY is always present after savePrefs; non-null asserted by storage contract.
    // eslint-disable-next-line @typescript-eslint/no-non-null-assertion
    const raw = JSON.parse(window.localStorage.getItem(STATE_KEY)!) as Record<string, unknown>
    expect(raw).toMatchObject({ settings: { bpm: 4 }, mute: true, stats: { totalSessions: 3 } })
  })

  it('does not throw when underlying setItem throws (D-16)', () => {
    vi.spyOn(Storage.prototype, 'setItem').mockImplementation(() => {
      throw new Error('quota')
    })
    expect(() => { savePrefs({ ...DEFAULT_PREFS, theme: 'dark', timbre: 'bell', cue: 'labels', locale: 'pt-BR' }) }).not.toThrow()
  })

  it('falls back to defaults when stored JSON is corrupt (D-17)', () => {
    window.localStorage.setItem(STATE_KEY, '{not-json')
    expect(loadPrefs()).toEqual(DEFAULT_PREFS)
  })
})

describe('DEFAULT_PREFS shape', () => {
  // The field count guards against adding a pref field without a default. The
  // individual coercer defaults are covered by their own describe blocks above.
  it('DEFAULT_PREFS has the 5 contracted fields with their defaults', () => {
    expect(DEFAULT_PREFS.bypassSilentMode).toBe(true)
    expect(Object.keys(DEFAULT_PREFS)).toHaveLength(5)
  })
})

describe('THM-05 forward-compat (CONTEXT D-02)', () => {
  // A returning user with deprecated persisted theme values ('moss' | 'slate' | 'dusk')
  // reads through coercePrefs as 'system'; the next savePrefs overwrites the on-disk value.
  // No STATE_VERSION bump needed — per-field coercion carries the value until savePrefs.

  it('coerces deprecated persisted theme values to "system" on read — THM-05 (CONTEXT D-02)', () => {
    for (const deprecated of ['moss', 'slate', 'dusk']) {
      window.localStorage.setItem(STATE_KEY, JSON.stringify({
        version: 1,
        prefs: { theme: deprecated, timbre: 'bowl', cue: 'arrow', locale: 'en' },
      }))
      expect(loadPrefs().theme).toBe('system')
    }
  })

  it('re-persists deprecated theme as "system" on the next savePrefs call — THM-05 round-trip (CONTEXT D-02)', () => {
    window.localStorage.setItem(STATE_KEY, JSON.stringify({
      version: 1,
      prefs: { theme: 'moss', timbre: 'bowl', cue: 'arrow', locale: 'en' },
    }))
    const loaded = loadPrefs()
    expect(loaded.theme).toBe('system')
    savePrefs(loaded)
    // Reason: STATE_KEY is always present after savePrefs; non-null asserted by storage contract.
    // eslint-disable-next-line @typescript-eslint/no-non-null-assertion
    const raw = JSON.parse(window.localStorage.getItem(STATE_KEY)!) as { prefs: { theme: string } }
    expect(raw.prefs.theme).toBe('system')
  })
})
