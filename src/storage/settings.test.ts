import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

import {
  coerceSettings,
  coerceMute,
  loadSettings,
  saveSettings,
  loadMute,
  saveMute,
} from './settings'
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
    const valid: SessionSettings = { bpm: 4, ratio: '50:50', durationMinutes: 5 }
    expect(coerceSettings(valid)).toEqual(valid)
  })

  it('accepts open-ended duration', () => {
    expect(coerceSettings({ bpm: 5.5, ratio: '40:60', durationMinutes: 'open-ended' }))
      .toEqual({ bpm: 5.5, ratio: '40:60', durationMinutes: 'open-ended' })
  })

  it('falls back PER FIELD when bpm is invalid (D-15) — keeps ratio + duration', () => {
    expect(coerceSettings({ bpm: 99, ratio: '50:50', durationMinutes: 5 }))
      .toEqual({ bpm: DEFAULT_SETTINGS.bpm, ratio: '50:50', durationMinutes: 5 })
  })

  it('falls back PER FIELD when ratio is invalid (D-15) — keeps bpm + duration', () => {
    expect(coerceSettings({ bpm: 4, ratio: '11:22', durationMinutes: 5 }))
      .toEqual({ bpm: 4, ratio: DEFAULT_SETTINGS.ratio, durationMinutes: 5 })
  })

  it('falls back PER FIELD when duration is invalid (D-15) — keeps bpm + ratio', () => {
    expect(coerceSettings({ bpm: 4, ratio: '50:50', durationMinutes: 7 }))
      .toEqual({ bpm: 4, ratio: '50:50', durationMinutes: DEFAULT_SETTINGS.durationMinutes })
  })

  it('rejects bpm of wrong type (string) and falls back', () => {
    expect(coerceSettings({ bpm: '5.5', ratio: '40:60', durationMinutes: 10 }))
      .toEqual({ bpm: DEFAULT_SETTINGS.bpm, ratio: '40:60', durationMinutes: 10 })
  })

  it('rejects bpm = NaN / Infinity', () => {
    expect(coerceSettings({ bpm: NaN, ratio: '40:60', durationMinutes: 10 }).bpm).toBe(DEFAULT_SETTINGS.bpm)
    expect(coerceSettings({ bpm: Infinity, ratio: '40:60', durationMinutes: 10 }).bpm).toBe(DEFAULT_SETTINGS.bpm)
  })

  it('does not throw when raw has prototype-polluting keys (T-04-02 mitigation)', () => {
    // Prototype-pollution mitigation: we only read three known keys, never spread `raw`
    // into an object we use as a prototype. Test that a __proto__ key in the raw doesn't
    // propagate to the returned object.
    const polluted = JSON.parse('{"bpm":4,"ratio":"40:60","durationMinutes":10,"__proto__":{"polluted":true}}')
    const out = coerceSettings(polluted) as Record<string, unknown>
    expect(out.polluted).toBeUndefined()
    expect((Object.prototype as Record<string, unknown>).polluted).toBeUndefined()
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

describe('loadSettings / saveSettings round-trip', () => {
  it('returns DEFAULT_SETTINGS when nothing is stored (LOCL-01)', () => {
    expect(loadSettings()).toEqual(DEFAULT_SETTINGS)
  })

  it('round-trips a valid settings object', () => {
    const next: SessionSettings = { bpm: 4, ratio: '50:50', durationMinutes: 5 }
    saveSettings(next)
    expect(loadSettings()).toEqual(next)
  })

  it('preserves mute and stats fields when saving settings (envelope merge)', () => {
    window.localStorage.setItem(STATE_KEY, JSON.stringify({
      version: 1,
      mute: true,
      stats: { totalSessions: 3, totalElapsedSeconds: 120, lastSessionAtMs: 1000, lastSessionDurationSeconds: 60 },
    }))
    saveSettings({ bpm: 4, ratio: '40:60', durationMinutes: 5 })
    const raw = JSON.parse(window.localStorage.getItem(STATE_KEY)!)
    expect(raw.mute).toBe(true)
    expect(raw.stats.totalSessions).toBe(3)
  })

  it('does not throw when underlying setItem throws (D-16)', () => {
    vi.spyOn(Storage.prototype, 'setItem').mockImplementation(() => {
      throw new Error('quota')
    })
    expect(() => saveSettings({ bpm: 4, ratio: '40:60', durationMinutes: 5 })).not.toThrow()
  })

  it('falls back to defaults when stored JSON is corrupt (D-17)', () => {
    window.localStorage.setItem(STATE_KEY, '{not-json')
    expect(loadSettings()).toEqual(DEFAULT_SETTINGS)
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

  it('preserves settings + stats fields when saving mute (envelope merge)', () => {
    saveSettings({ bpm: 4, ratio: '40:60', durationMinutes: 5 })
    saveMute(true)
    const raw = JSON.parse(window.localStorage.getItem(STATE_KEY)!)
    expect(raw.settings).toEqual({ bpm: 4, ratio: '40:60', durationMinutes: 5 })
    expect(raw.mute).toBe(true)
  })
})
