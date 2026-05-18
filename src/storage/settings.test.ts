import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

import {
  coerceSettings,
  coerceMute,
  loadMute,
  saveMute,
} from './settings'
import { saveResonantSettings } from './practices'
import { STATE_KEY } from './storage'
import { DEFAULT_SETTINGS, type SessionSettings } from '../domain/settings'

beforeEach(() => {
  window.localStorage.clear()
})

afterEach(() => {
  window.localStorage.clear()
  vi.restoreAllMocks()
})

describe('coerceSettings (D-15)', () => {
  it('returns DEFAULT_SETTINGS when raw is null / undefined / non-object', () => {
    expect(coerceSettings(null)).toEqual(DEFAULT_SETTINGS)
    expect(coerceSettings(undefined)).toEqual(DEFAULT_SETTINGS)
    expect(coerceSettings(42)).toEqual(DEFAULT_SETTINGS)
    expect(coerceSettings('str')).toEqual(DEFAULT_SETTINGS)
    expect(coerceSettings([1, 2, 3])).toEqual(DEFAULT_SETTINGS)
  })

  it('returns DEFAULT_SETTINGS when raw is empty object', () => {
    expect(coerceSettings({})).toEqual(DEFAULT_SETTINGS)
  })

  it('preserves all valid fields verbatim', () => {
    const valid: SessionSettings = { ...DEFAULT_SETTINGS, bpm: 4, ratio: '50:50', durationMinutes: 5 }
    expect(coerceSettings(valid)).toEqual(valid)
  })

  it('accepts open-ended duration', () => {
    expect(coerceSettings({ bpm: 5.5, ratio: '40:60', durationMinutes: 'open-ended' }))
      .toMatchObject({ bpm: 5.5, ratio: '40:60', durationMinutes: 'open-ended' })
  })

  it('falls back PER FIELD when bpm is invalid (D-15) — keeps ratio + duration', () => {
    expect(coerceSettings({ bpm: 99, ratio: '50:50', durationMinutes: 5 }))
      .toMatchObject({ bpm: DEFAULT_SETTINGS.bpm, ratio: '50:50', durationMinutes: 5 })
  })

  it('falls back PER FIELD when ratio is invalid (D-15) — keeps bpm + duration', () => {
    expect(coerceSettings({ bpm: 4, ratio: '11:22', durationMinutes: 5 }))
      .toMatchObject({ bpm: 4, ratio: DEFAULT_SETTINGS.ratio, durationMinutes: 5 })
  })

  it('falls back PER FIELD when duration is invalid (D-15) — keeps bpm + ratio', () => {
    expect(coerceSettings({ bpm: 4, ratio: '50:50', durationMinutes: 7 }))
      .toMatchObject({ bpm: 4, ratio: '50:50', durationMinutes: DEFAULT_SETTINGS.durationMinutes })
  })

  it('rejects bpm of wrong type (string) and falls back', () => {
    expect(coerceSettings({ bpm: '5.5', ratio: '40:60', durationMinutes: 10 }))
      .toMatchObject({ bpm: DEFAULT_SETTINGS.bpm, ratio: '40:60', durationMinutes: 10 })
  })

  it('rejects bpm = NaN / Infinity', () => {
    expect(coerceSettings({ bpm: NaN, ratio: '40:60', durationMinutes: 10 }).bpm).toBe(DEFAULT_SETTINGS.bpm)
    expect(coerceSettings({ bpm: Infinity, ratio: '40:60', durationMinutes: 10 }).bpm).toBe(DEFAULT_SETTINGS.bpm)
  })

  it('does not throw when raw has prototype-polluting keys (T-04-02 mitigation)', () => {
    // Prototype-pollution mitigation: we only read three known keys, never spread `raw`
    // into an object we use as a prototype. Test that a __proto__ key in the raw doesn't
    // propagate to the returned object.
    const polluted: unknown = JSON.parse('{"bpm":4,"ratio":"40:60","durationMinutes":10,"__proto__":{"polluted":true}}')
    const out = coerceSettings(polluted) as unknown as Record<string, unknown>
    expect(out.polluted).toBeUndefined()
    expect((Object.prototype as Record<string, unknown>).polluted).toBeUndefined()
  })

  // Phase 34 D-01/D-02: coerceSettings is now standard-only (3 fields).
  // Stretch ramp fields (mode, initialBpm, targetBpm, warmUpMinutes, coolDownMinutes,
  // rampDurationMinutes) have moved to coerceStretchSettings in practices.ts.
  it('returns exactly { bpm, ratio, durationMinutes } — no mode or ramp fields present', () => {
    // A raw blob carrying old stretch fields should produce only the 3 standard fields.
    const rawWithRampFields = {
      bpm: 5.5,
      ratio: '40:60',
      durationMinutes: 10,
      mode: 'stretch',
      initialBpm: 6,
      targetBpm: 4,
      warmUpMinutes: 5,
      coolDownMinutes: 5,
      rampDurationMinutes: 5,
    }
    const result = coerceSettings(rawWithRampFields)
    // Only the 3 standard keys must be present.
    expect(Object.keys(result).sort()).toEqual(['bpm', 'durationMinutes', 'ratio'])
    expect(result.bpm).toBe(5.5)
    expect(result.ratio).toBe('40:60')
    expect(result.durationMinutes).toBe(10)
    // Drifted/extra fields must NOT appear on the result.
    const asAny = result as unknown as Record<string, unknown>
    expect(asAny['mode']).toBeUndefined()
    expect(asAny['initialBpm']).toBeUndefined()
  })
})

describe('coerceMute (D-14 / D-07)', () => {
  it('returns true when raw is true', () => { expect(coerceMute(true)).toBe(true) })
  it('returns false when raw is false', () => { expect(coerceMute(false)).toBe(false) })
  it('returns false when raw is null / undefined / "true" / 1 (D-15 type check)', () => {
    expect(coerceMute(null)).toBe(false)
    expect(coerceMute(undefined)).toBe(false)
    expect(coerceMute('true')).toBe(false)
    expect(coerceMute(1)).toBe(false)
  })
})

describe('loadMute / saveMute round-trip', () => {
  it('returns false when nothing is stored (D-07 seed)', () => {
    expect(loadMute()).toBe(false)
  })

  it('round-trips true / false', () => {
    saveMute(true)
    expect(loadMute()).toBe(true)
    saveMute(false)
    expect(loadMute()).toBe(false)
  })

  it('preserves resonant settings + mute when saving mute (envelope merge)', () => {
    saveResonantSettings({ ...DEFAULT_SETTINGS, bpm: 4, ratio: '40:60', durationMinutes: 5 })
    saveMute(true)
    // Reason: STATE_KEY is always present after saveMute; non-null asserted by storage contract.
    // eslint-disable-next-line @typescript-eslint/no-non-null-assertion
    const raw = JSON.parse(window.localStorage.getItem(STATE_KEY)!) as Record<string, unknown>
    const practices = raw['practices'] as Record<string, unknown> | undefined
    const resonant = practices?.['resonant'] as Record<string, unknown> | undefined
    expect(resonant?.['settings']).toMatchObject({ bpm: 4, ratio: '40:60', durationMinutes: 5 })
    expect(raw).toMatchObject({ mute: true })
  })
})
