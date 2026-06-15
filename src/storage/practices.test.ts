import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

import {
  coercePractices,
  coerceActivePractice,
  loadPractices,
  loadActivePractice,
  saveActivePractice,
  saveResonantSettings,
  recordResonantSession,
  resetPracticeStats,
} from './practices'
import { coerceSettings } from './settings'
import { ZERO_STATS, type PersistedStats } from './stats'
import { STATE_KEY } from './storage'
import { DEFAULT_SETTINGS } from '../domain/settings'

beforeEach(() => {
  window.localStorage.clear()
})

afterEach(() => {
  window.localStorage.clear()
  vi.restoreAllMocks()
})

// A non-zero stats fixture so "subtree untouched" assertions are concrete.
function statsOf(totalSessions: number): PersistedStats {
  return {
    totalSessions,
    totalElapsedSeconds: totalSessions * 60,
    lastSessionAtMs: 1_700_000_000_000,
    lastSessionDurationSeconds: 60,
  }
}

describe('coerceActivePractice (T-30-05)', () => {
  it('returns "resonant" for the known id', () => {
    expect(coerceActivePractice('resonant')).toBe('resonant')
  })

  it('falls back to "resonant" for garbage / null / number input', () => {
    expect(coerceActivePractice('garbage')).toBe('resonant')
    expect(coerceActivePractice(null)).toBe('resonant')
    expect(coerceActivePractice(undefined)).toBe('resonant')
    expect(coerceActivePractice(5)).toBe('resonant')
  })
})

describe('coercePractices (PRACTICE-02 / T-30-05)', () => {
  const defaultMap = {
    resonant: { settings: coerceSettings(undefined), stats: ZERO_STATS },
  }

  it('returns the default practice map for null / undefined / non-object / array', () => {
    expect(coercePractices(null)).toEqual(defaultMap)
    expect(coercePractices(undefined)).toEqual(defaultMap)
    expect(coercePractices(99)).toEqual(defaultMap)
    expect(coercePractices(['x'])).toEqual(defaultMap)
  })

  it('preserves a valid resonant slice', () => {
    const map = coercePractices({
      resonant: { settings: { ...DEFAULT_SETTINGS, bpm: 4 }, stats: statsOf(3) },
    })
    expect(map.resonant.settings.bpm).toBe(4)
    expect(map.resonant.stats).toEqual(statsOf(3))
  })

  it('falls back per-field for a drifted slice', () => {
    const map = coercePractices({
      resonant: { settings: { bpm: 4 }, stats: statsOf(2) },
    })
    expect(map.resonant.settings.bpm).toBe(4)
    expect(map.resonant.stats).toEqual(statsOf(2))
  })
})

describe('loadPractices / loadActivePractice defaults', () => {
  it('returns the default practice map when nothing is stored', () => {
    expect(loadPractices()).toEqual({
      resonant: { settings: coerceSettings(undefined), stats: ZERO_STATS },
    })
  })

  it('returns "resonant" as the default active practice when nothing is stored', () => {
    expect(loadActivePractice()).toBe('resonant')
  })
})

describe('per-practice round-trips (PRACTICE-02)', () => {
  it('saveActivePractice → loadActivePractice round-trips the id', () => {
    saveActivePractice('resonant')
    expect(loadActivePractice()).toBe('resonant')
  })

  it('saveResonantSettings → loadPractices().resonant.settings round-trips', () => {
    const settings = { ...DEFAULT_SETTINGS, bpm: 4 }
    saveResonantSettings(settings)
    expect(loadPractices().resonant.settings.bpm).toBe(4)
  })

  it('saveResonantSettings does not throw when underlying setItem throws (D-16)', () => {
    // Coverage migrated from the deleted settings.test.ts saveSettings block:
    // the resonant settings write path must swallow a quota failure silently.
    vi.spyOn(Storage.prototype, 'setItem').mockImplementation(() => {
      throw new Error('quota')
    })
    expect(() => { saveResonantSettings({ ...DEFAULT_SETTINGS, bpm: 4 }) }).not.toThrow()
  })

  it('loadPractices falls back to defaults when stored JSON is corrupt (D-17)', () => {
    // Corrupt-JSON fallback for the settings read path — previously asserted
    // via loadSettings in settings.test.ts, now exercised through loadPractices.
    window.localStorage.setItem(STATE_KEY, '{not-json')
    expect(loadPractices().resonant.settings).toEqual(DEFAULT_SETTINGS)
  })
})

describe('recordResonantSession (Pitfall 3 / T-30-08)', () => {
  it('increments practices.resonant.stats', () => {
    const next = recordResonantSession(40_000, false, { now: () => 1_700_000_000_000 })
    expect(next.totalSessions).toBe(1)
    const map = loadPractices()
    expect(map.resonant.stats.totalSessions).toBe(1)
    expect(map.resonant.stats.totalElapsedSeconds).toBe(40)
  })

  it('does not count a sub-threshold incomplete session', () => {
    const next = recordResonantSession(5_000, false)
    expect(next.totalSessions).toBe(0)
    expect(loadPractices().resonant.stats.totalSessions).toBe(0)
  })

  it('does NOT count 29.999s but counts exactly 30.000s (boundary inclusive — D-01)', () => {
    expect(recordResonantSession(29_999, false, { now: () => 1 }).totalSessions).toBe(0)
    expect(recordResonantSession(30_000, false, { now: () => 1 }).totalSessions).toBe(1)
  })

  it('counts a sub-threshold session when isComplete is true', () => {
    const next = recordResonantSession(5_000, true, { now: () => 1_700_000_000_000 })
    expect(next.totalSessions).toBe(1)
  })

  it('rejects a NaN / negative elapsedMs without poisoning stats', () => {
    expect(recordResonantSession(Number.NaN, true).totalSessions).toBe(0)
    expect(recordResonantSession(-100, true).totalSessions).toBe(0)
  })
})

describe('v1→v2→v3 migration through loadPractices (PRACTICE-04 / Phase-34)', () => {
  it('populates loadPractices().resonant from a seeded flat v1 envelope', () => {
    // A returning user's pre-Phase-30 flat envelope.
    window.localStorage.setItem(STATE_KEY, JSON.stringify({
      version: 1,
      settings: { ...DEFAULT_SETTINGS, bpm: 4 },
      stats: statsOf(8),
    }))
    const map = loadPractices()
    // The flat resonant data survived the readEnvelope→migrateEnvelope→
    // coercePractices path with nothing lost.
    expect(map.resonant.settings.bpm).toBe(4)
    expect(map.resonant.stats).toEqual(statsOf(8))
  })
})

describe('STATS-04 record-and-persist regression (CONTEXT D-05 / D-08)', () => {
  it('recordResonantSession increments resonant slice losslessly across loadPractices', () => {
    recordResonantSession(40_000, false, { now: () => 1_700_000_000_000 })
    const map = loadPractices()
    expect(map.resonant.stats.totalSessions).toBe(1)
    expect(map.resonant.stats.totalElapsedSeconds).toBe(40)
    expect(map.resonant.stats.lastSessionAtMs).toBe(1_700_000_000_000)
    expect(map.resonant.stats.lastSessionDurationSeconds).toBe(40)
  })
})

describe('resetPracticeStats — per-practice isolation', () => {
  it('zeroes the target slice; settings survive', () => {
    saveResonantSettings({ ...DEFAULT_SETTINGS, bpm: 4 })
    recordResonantSession(40_000, true, { now: () => 1_700_000_000_000 })

    resetPracticeStats('resonant')

    const map = loadPractices()
    expect(map.resonant.stats).toEqual(ZERO_STATS)
    // Target slice keeps its settings — reset wipes stats only.
    expect(map.resonant.settings.bpm).toBe(4)
  })
})
