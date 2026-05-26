import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

import {
  coercePrefs,
  coerceTheme,
  coerceTimbre,
  coerceCue,
  coerceLocale,
  coerceBreathingShape,
  coerceRingCue,
  coerceOrbIdle,
  coerceSwitcherIcon,
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
    // A stored pre-Phase-25 envelope has no cue key — this IS the migration, no STATE_VERSION bump.
    expect(coercePrefs({ theme: 'dark', timbre: 'bell', locale: 'pt-BR' }))
      .toEqual({ ...DEFAULT_PREFS, theme: 'dark', timbre: 'bell', cue: DEFAULT_CUE, locale: 'pt-BR' })
  })

  it('tolerates legacy variant key on persisted envelope — VAR-05 forward-compat (Phase 38 D-01)', () => {
    // VAR-05 / CONTEXT D-01: a returning user with a pre-Phase-38 persisted envelope carrying
    // `variant: 'square' | 'diamond' | 'orb'` must read through coercePrefs as a clean 8-field
    // UserPrefs (Phase 47 extends from 4 to 8) with NO `variant` property surviving — the unknown
    // key is silently dropped on read (Phase 8 D-01 envelope tolerance). No STATE_VERSION bump
    // needed; the render path is always OrbShape (Plan 01), so the dropped key is harmless. This
    // is the literal-envelope adversarial test the structural per-field + proto-pollution coverage
    // does not assert.
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

  // AUDIO-02: legacy-value migration — 'chime' was the fourth timbre slot before Phase 35
  // renamed it to 'flute'. A returning user's persisted 'chime' must land on 'flute', not
  // the bowl default. A stale value like 'ring' (removed from valid list) coerces to the
  // default rather than preserving the old preference; 'chime' users DID choose the fourth
  // slot and should seamlessly continue with 'flute'.
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

describe('loadPrefs / savePrefs round-trip', () => {
  it('returns DEFAULT_PREFS when nothing is stored (LOCL-01)', () => {
    expect(loadPrefs()).toEqual(DEFAULT_PREFS)
  })

  it('round-trips a valid UserPrefs object (including cue field)', () => {
    const next: UserPrefs = { ...DEFAULT_PREFS, theme: 'dark', timbre: 'bell', cue: 'nose', locale: 'pt-BR' }
    savePrefs(next)
    expect(loadPrefs()).toEqual(next)
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

describe('Phase 47 RED — new coercers exist and behave (Task 1)', () => {
  // RED gate for Task 1: this block exists before src/storage/prefs.ts is extended.
  // It will fail compile (missing exports) and assertion (UserPrefs is still 4-field)
  // until Task 1's GREEN edit lands.
  it('exports the 4 new coercers and they have the contracted defaults', () => {
    expect(coerceBreathingShape('junk')).toBe('orb-halo')
    expect(coerceRingCue('junk')).toBe('progress-arc')
    expect(coerceOrbIdle('junk')).toBe('ambient')
    expect(coerceSwitcherIcon('junk')).toBe(false)
  })

  it('DEFAULT_PREFS includes the 4 new flag defaults sourced from featureFlags.ts', () => {
    expect(DEFAULT_PREFS.breathingShape).toBe('orb-halo')
    expect(DEFAULT_PREFS.ringCue).toBe('progress-arc')
    expect(DEFAULT_PREFS.orbIdle).toBe('ambient')
    expect(DEFAULT_PREFS.switcherIcon).toBe(false)
  })

  it('coercePrefs returns 8-field UserPrefs and uses the alias table (D-03)', () => {
    const out = coercePrefs({ breathingShape: 'kuthasta' })
    expect(out.breathingShape).toBe('spiritual-eye')
    expect(out.ringCue).toBe('progress-arc')
    expect(out.orbIdle).toBe('ambient')
    expect(out.switcherIcon).toBe(false)
  })
})

describe('THM-05 forward-compat (CONTEXT D-02)', () => {
  // THM-05 / CONTEXT D-02: a returning user with a pre-Phase-39 persisted envelope carrying
  // `theme: 'moss' | 'slate' | 'dusk'` must read through coercePrefs as `theme: 'system'`
  // (read-coerce half), and the next savePrefs must overwrite the on-disk value with 'system'
  // (round-trip half). No STATE_VERSION bump — Phase 8 D-01 envelope tolerance + per-field
  // coercer carries the on-disk value until the next savePrefs call overwrites it.
  // Mirrors the Phase 38 VAR-05 forward-compat pattern (commit `4bd5e78`); captured up-front
  // per CONTEXT §specifics to avoid a retroactive validation cycle.

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
