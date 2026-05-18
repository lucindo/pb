import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

import {
  coercePractices,
  coerceActivePractice,
  coerceNaviKriyaSettings,
  loadPractices,
  loadActivePractice,
  saveActivePractice,
  saveResonantSettings,
  saveNaviKriyaSettings,
  recordResonantSession,
  recordNaviKriyaSession,
  resetPracticeStats,
} from './practices'
import { coerceSettings } from './settings'
import { ZERO_STATS, type PersistedStats } from './stats'
import { STATE_KEY } from './storage'
import { DEFAULT_NK_SETTINGS, type NaviKriyaSettings } from '../domain/naviKriyaSettings'
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
  it('preserves the two known practice ids', () => {
    expect(coerceActivePractice('resonant')).toBe('resonant')
    expect(coerceActivePractice('naviKriya')).toBe('naviKriya')
  })

  it('falls back to "resonant" for garbage / null / number input', () => {
    expect(coerceActivePractice('garbage')).toBe('resonant')
    expect(coerceActivePractice(null)).toBe('resonant')
    expect(coerceActivePractice(undefined)).toBe('resonant')
    expect(coerceActivePractice(5)).toBe('resonant')
  })
})

describe('coerceNaviKriyaSettings (D-02 / Pitfall 5 / T-30-06)', () => {
  it('returns DEFAULT_NK_SETTINGS field-by-field for null / non-object / array', () => {
    expect(coerceNaviKriyaSettings(null)).toEqual(DEFAULT_NK_SETTINGS)
    expect(coerceNaviKriyaSettings(undefined)).toEqual(DEFAULT_NK_SETTINGS)
    expect(coerceNaviKriyaSettings(42)).toEqual(DEFAULT_NK_SETTINGS)
    expect(coerceNaviKriyaSettings([1, 2, 3])).toEqual(DEFAULT_NK_SETTINGS)
  })

  it('preserves a fully valid NaviKriyaSettings object', () => {
    const valid: NaviKriyaSettings = {
      frontCount: 120,
      omLength: 'slow',
      rounds: 5,
      perOmCue: false,
    }
    expect(coerceNaviKriyaSettings(valid)).toEqual(valid)
  })

  it('rounds a non-multiple-of-4 frontCount DOWN to the nearest multiple of 4', () => {
    // Pitfall 5: a fractional backCount would break Phase 31 arithmetic. The
    // coercer rounds down rather than discarding to the default.
    expect(coerceNaviKriyaSettings({ frontCount: 102 }).frontCount).toBe(100)
    expect(coerceNaviKriyaSettings({ frontCount: 90 }).frontCount).toBe(88)
    expect(coerceNaviKriyaSettings({ frontCount: 88 }).frontCount).toBe(88)
  })

  it('falls back to the default frontCount for non-positive / non-finite values', () => {
    expect(coerceNaviKriyaSettings({ frontCount: 0 }).frontCount).toBe(DEFAULT_NK_SETTINGS.frontCount)
    expect(coerceNaviKriyaSettings({ frontCount: -8 }).frontCount).toBe(DEFAULT_NK_SETTINGS.frontCount)
    expect(coerceNaviKriyaSettings({ frontCount: 2 }).frontCount).toBe(DEFAULT_NK_SETTINGS.frontCount)
    expect(coerceNaviKriyaSettings({ frontCount: Number.NaN }).frontCount).toBe(DEFAULT_NK_SETTINGS.frontCount)
    expect(coerceNaviKriyaSettings({ frontCount: 'big' }).frontCount).toBe(DEFAULT_NK_SETTINGS.frontCount)
  })

  it('falls back per-field for a drifted omLength / rounds / perOmCue', () => {
    const drifted = coerceNaviKriyaSettings({
      frontCount: 80,
      omLength: 'turbo',
      rounds: 0,
      perOmCue: 'yes',
    })
    expect(drifted.frontCount).toBe(80)
    expect(drifted.omLength).toBe(DEFAULT_NK_SETTINGS.omLength)
    expect(drifted.rounds).toBe(DEFAULT_NK_SETTINGS.rounds)
    expect(drifted.perOmCue).toBe(DEFAULT_NK_SETTINGS.perOmCue)
  })
})

describe('coercePractices (PRACTICE-02 / T-30-05)', () => {
  const defaultMap = {
    resonant: { settings: coerceSettings(undefined), stats: ZERO_STATS },
    naviKriya: { settings: DEFAULT_NK_SETTINGS, stats: ZERO_STATS },
  }

  it('returns the default practice map for null / undefined / non-object / array', () => {
    expect(coercePractices(null)).toEqual(defaultMap)
    expect(coercePractices(undefined)).toEqual(defaultMap)
    expect(coercePractices(99)).toEqual(defaultMap)
    expect(coercePractices(['x'])).toEqual(defaultMap)
  })

  it('preserves valid resonant and naviKriya slices', () => {
    const map = coercePractices({
      resonant: { settings: { ...DEFAULT_SETTINGS, bpm: 4 }, stats: statsOf(3) },
      naviKriya: { settings: { frontCount: 120, omLength: 'slow', rounds: 5, perOmCue: false }, stats: statsOf(7) },
    })
    expect(map.resonant.settings.bpm).toBe(4)
    expect(map.resonant.stats).toEqual(statsOf(3))
    expect(map.naviKriya.settings).toEqual({ frontCount: 120, omLength: 'slow', rounds: 5, perOmCue: false })
    expect(map.naviKriya.stats).toEqual(statsOf(7))
  })

  it('falls back per-field for a drifted slice without discarding the other practice', () => {
    const map = coercePractices({
      resonant: { settings: { bpm: 4 }, stats: statsOf(2) },
      naviKriya: { settings: { frontCount: 90, omLength: 'turbo' }, stats: 'corrupt' },
    })
    expect(map.resonant.stats).toEqual(statsOf(2))
    // naviKriya slice drifted: frontCount rounds 90→88, omLength falls back,
    // corrupt stats coerce to ZERO_STATS — resonant is untouched.
    expect(map.naviKriya.settings.frontCount).toBe(88)
    expect(map.naviKriya.settings.omLength).toBe(DEFAULT_NK_SETTINGS.omLength)
    expect(map.naviKriya.stats).toEqual(ZERO_STATS)
  })
})

describe('loadPractices / loadActivePractice defaults', () => {
  it('returns the default practice map when nothing is stored', () => {
    expect(loadPractices()).toEqual({
      resonant: { settings: coerceSettings(undefined), stats: ZERO_STATS },
      naviKriya: { settings: DEFAULT_NK_SETTINGS, stats: ZERO_STATS },
    })
  })

  it('returns "resonant" as the default active practice when nothing is stored', () => {
    expect(loadActivePractice()).toBe('resonant')
  })
})

describe('per-practice round-trips (PRACTICE-02)', () => {
  it('saveActivePractice → loadActivePractice round-trips the id', () => {
    saveActivePractice('naviKriya')
    expect(loadActivePractice()).toBe('naviKriya')
    saveActivePractice('resonant')
    expect(loadActivePractice()).toBe('resonant')
  })

  it('saveNaviKriyaSettings → loadPractices().naviKriya.settings round-trips', () => {
    const settings: NaviKriyaSettings = {
      frontCount: 120,
      omLength: 'fast',
      rounds: 4,
      perOmCue: false,
    }
    saveNaviKriyaSettings(settings)
    expect(loadPractices().naviKriya.settings).toEqual(settings)
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

  it('saveNaviKriyaSettings leaves the resonant slice untouched', () => {
    saveResonantSettings({ ...DEFAULT_SETTINGS, bpm: 4 })
    saveNaviKriyaSettings({ frontCount: 80, omLength: 'slow', rounds: 2, perOmCue: true })
    expect(loadPractices().resonant.settings.bpm).toBe(4)
  })
})

describe('recordResonantSession (Pitfall 3 / T-30-08)', () => {
  it('increments only practices.resonant.stats and leaves naviKriya untouched', () => {
    const next = recordResonantSession(40_000, false, { now: () => 1_700_000_000_000 })
    expect(next.totalSessions).toBe(1)
    const map = loadPractices()
    expect(map.resonant.stats.totalSessions).toBe(1)
    expect(map.resonant.stats.totalElapsedSeconds).toBe(40)
    expect(map.naviKriya.stats).toEqual(ZERO_STATS)
  })

  it('does not count a sub-threshold incomplete session', () => {
    const next = recordResonantSession(5_000, false)
    expect(next.totalSessions).toBe(0)
    expect(loadPractices().resonant.stats.totalSessions).toBe(0)
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

describe('recordNaviKriyaSession (NK-08 / D-13 / T-31-07 / T-31-08)', () => {
  it('increments practices.naviKriya.stats totalSessions and roundsCompleted', () => {
    const next = recordNaviKriyaSession(60_000, 3, true, { now: () => 1_700_000_000_000 })
    expect(next.totalSessions).toBe(1)
    expect(next.totalElapsedSeconds).toBe(60)
    expect(next.roundsCompleted).toBe(3)
    expect(next.lastSessionAtMs).toBe(1_700_000_000_000)
    expect(next.lastSessionDurationSeconds).toBe(60)
  })

  it('accumulates roundsCompleted across multiple NK sessions', () => {
    recordNaviKriyaSession(60_000, 2, true, { now: () => 1 })
    const next = recordNaviKriyaSession(90_000, 3, true, { now: () => 2 })
    expect(next.totalSessions).toBe(2)
    expect(next.roundsCompleted).toBe(5)
  })

  it('NK-08 isolation: practices.resonant.stats is unchanged after recordNaviKriyaSession', () => {
    // Seed resonant with some stats first.
    recordResonantSession(40_000, false, { now: () => 1_700_000_000_000 })
    // Then record an NK session.
    recordNaviKriyaSession(50_000, 2, true, { now: () => 2_000_000_000_000 })
    const map = loadPractices()
    // Resonant stats must be exactly what recordResonantSession wrote.
    expect(map.resonant.stats.totalSessions).toBe(1)
    expect(map.resonant.stats.totalElapsedSeconds).toBe(40)
    // naviKriya received the NK session.
    expect(map.naviKriya.stats.totalSessions).toBe(1)
    expect(map.naviKriya.stats.roundsCompleted).toBe(2)
  })

  it('does not count a sub-threshold incomplete session (early end below COUNT_THRESHOLD_MS)', () => {
    // D-13: below-threshold early end is NOT recorded.
    const next = recordNaviKriyaSession(5_000, 2, false)
    expect(next.totalSessions).toBe(0)
    expect(next.roundsCompleted).toBeUndefined()
    expect(loadPractices().naviKriya.stats.totalSessions).toBe(0)
  })

  it('D-13: above-threshold early end records completed rounds and elapsed minutes', () => {
    // Early end but above COUNT_THRESHOLD_MS — should record.
    const next = recordNaviKriyaSession(35_000, 1, false, { now: () => 1_700_000_000_000 })
    expect(next.totalSessions).toBe(1)
    expect(next.totalElapsedSeconds).toBe(35)
    expect(next.roundsCompleted).toBe(1)
  })

  it('rejects NaN / negative elapsedMs without poisoning stats (T-31-08)', () => {
    expect(recordNaviKriyaSession(Number.NaN, 3, true).totalSessions).toBe(0)
    expect(recordNaviKriyaSession(-100, 3, true).totalSessions).toBe(0)
  })
})

describe('resetPracticeStats (Pitfall 4)', () => {
  function seedBothPractices() {
    window.localStorage.setItem(STATE_KEY, JSON.stringify({
      version: 2,
      practices: {
        resonant: { settings: { ...DEFAULT_SETTINGS, bpm: 4 }, stats: statsOf(5) },
        naviKriya: { settings: DEFAULT_NK_SETTINGS, stats: statsOf(9) },
      },
      activePractice: 'resonant',
    }))
  }

  it("resetPracticeStats('resonant') zeroes resonant.stats and leaves naviKriya.stats", () => {
    seedBothPractices()
    resetPracticeStats('resonant')
    const map = loadPractices()
    expect(map.resonant.stats).toEqual(ZERO_STATS)
    expect(map.naviKriya.stats).toEqual(statsOf(9))
  })

  it("resetPracticeStats('naviKriya') zeroes naviKriya.stats and leaves resonant.stats", () => {
    seedBothPractices()
    resetPracticeStats('naviKriya')
    const map = loadPractices()
    expect(map.naviKriya.stats).toEqual(ZERO_STATS)
    expect(map.resonant.stats).toEqual(statsOf(5))
  })
})

describe('v1→v2 migration through loadPractices (PRACTICE-04)', () => {
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
    // naviKriya had no v1 data — the coercer supplies defaults.
    expect(map.naviKriya.settings).toEqual(DEFAULT_NK_SETTINGS)
    expect(map.naviKriya.stats).toEqual(ZERO_STATS)
  })
})
