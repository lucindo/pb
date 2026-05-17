import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

import { coerceStats, loadStats, recordSession, resetStats, COUNT_THRESHOLD_MS } from './stats'
import { saveSettings, saveMute, loadSettings, loadMute } from './settings'
import { STATE_KEY } from './storage'
import { DEFAULT_SETTINGS } from '../domain/settings'

beforeEach(() => {
  window.localStorage.clear()
})

afterEach(() => {
  window.localStorage.clear()
  vi.restoreAllMocks()
})

const ZERO = {
  totalSessions: 0,
  totalElapsedSeconds: 0,
  lastSessionAtMs: null,
  lastSessionDurationSeconds: null,
}

describe('loadStats', () => {
  it('returns the zero state when nothing is stored', () => {
    expect(loadStats()).toEqual(ZERO)
  })

  it('coerces invalid stats subtree to zero state per field (D-15 spirit / D-17)', () => {
    window.localStorage.setItem(STATE_KEY, JSON.stringify({
      version: 1,
      stats: { totalSessions: -1, totalElapsedSeconds: 'bad', lastSessionAtMs: 'x', lastSessionDurationSeconds: -5 },
    }))
    expect(loadStats()).toEqual(ZERO)
  })

  it('returns zero state when stored JSON is corrupt (D-17)', () => {
    window.localStorage.setItem(STATE_KEY, '{not-json')
    expect(loadStats()).toEqual(ZERO)
  })
})

describe('recordSession threshold (D-01)', () => {
  it('does NOT count a 29.999s session when isComplete=false', () => {
    const out = recordSession(29_999, false, { now: () => 1_700_000_000_000 })
    expect(out).toEqual(ZERO)
    expect(loadStats()).toEqual(ZERO)
  })

  it('counts a 30.000s session when isComplete=false (boundary inclusive — D-01)', () => {
    const out = recordSession(30_000, false, { now: () => 1_700_000_000_000 })
    expect(out.totalSessions).toBe(1)
    expect(out.totalElapsedSeconds).toBe(30)
    expect(out.lastSessionAtMs).toBe(1_700_000_000_000)
    expect(out.lastSessionDurationSeconds).toBe(30)
  })

  it('counts a sub-30s session when isComplete=true (completion bypass — D-01 second clause)', () => {
    const out = recordSession(10_000, true, { now: () => 1_700_000_000_000 })
    expect(out.totalSessions).toBe(1)
    expect(out.totalElapsedSeconds).toBe(10)
  })

  it('counts a 60s timed completion (1-min session example from CONTEXT.md)', () => {
    const out = recordSession(60_000, true, { now: () => 1_700_000_000_000 })
    expect(out.totalSessions).toBe(1)
    expect(out.totalElapsedSeconds).toBe(60)
    expect(out.lastSessionDurationSeconds).toBe(60)
  })

  it('exports COUNT_THRESHOLD_MS = 30_000 (D-01)', () => {
    expect(COUNT_THRESHOLD_MS).toBe(30_000)
  })
})

describe('recordSession aggregation (D-02)', () => {
  it('aggregates totalElapsedSeconds across multiple sessions via floor(ms/1000)', () => {
    recordSession(60_500, false, { now: () => 1 })   // 60s
    recordSession(45_999, false, { now: () => 2 })   // 45s
    recordSession(30_000, false, { now: () => 3 })   // 30s
    expect(loadStats().totalSessions).toBe(3)
    expect(loadStats().totalElapsedSeconds).toBe(60 + 45 + 30)  // 135
  })

  it('uses injected now() for lastSessionAtMs (D-18)', () => {
    recordSession(60_000, false, { now: () => 1_700_000_000_000 })
    expect(loadStats().lastSessionAtMs).toBe(1_700_000_000_000)
  })

  it('a 4:30 session contributes 4 minutes 30 seconds (270s) — CONTEXT.md D-02 example', () => {
    recordSession(4 * 60_000 + 30_000, false, { now: () => 1 })
    expect(loadStats().totalElapsedSeconds).toBe(270)
  })
})

describe('resetStats (D-11)', () => {
  it('wipes stats subtree only — settings and mute survive', () => {
    const savedSettings = { ...DEFAULT_SETTINGS, bpm: 4, ratio: '50:50' as const, durationMinutes: 5 as const }
    saveSettings(savedSettings)
    saveMute(true)
    recordSession(60_000, true, { now: () => 1_700_000_000_000 })
    expect(loadStats().totalSessions).toBe(1)

    resetStats()

    expect(loadStats()).toEqual(ZERO)
    expect(loadSettings()).toEqual(savedSettings)
    expect(loadMute()).toBe(true)
  })

  it('does not throw when storage write fails (D-16)', () => {
    saveSettings(DEFAULT_SETTINGS)
    vi.spyOn(Storage.prototype, 'setItem').mockImplementation(() => {
      throw new Error('quota')
    })
    expect(() => { resetStats() }).not.toThrow()
  })
})

describe('coerceStats roundsCompleted (NK-08 / T-31-06)', () => {
  it('preserves a valid integer roundsCompleted', () => {
    const result = coerceStats({ totalSessions: 0, totalElapsedSeconds: 0, lastSessionAtMs: null, lastSessionDurationSeconds: null, roundsCompleted: 5 })
    expect(result.roundsCompleted).toBe(5)
  })

  it('returns undefined for roundsCompleted when the field is absent', () => {
    const result = coerceStats({ totalSessions: 0, totalElapsedSeconds: 0, lastSessionAtMs: null, lastSessionDurationSeconds: null })
    expect(result.roundsCompleted).toBeUndefined()
  })

  it('returns undefined for roundsCompleted when the value is invalid (string / negative / float / NaN)', () => {
    expect(coerceStats({ roundsCompleted: 'bad' }).roundsCompleted).toBeUndefined()
    expect(coerceStats({ roundsCompleted: -3 }).roundsCompleted).toBeUndefined()
    expect(coerceStats({ roundsCompleted: 1.5 }).roundsCompleted).toBeUndefined()
    expect(coerceStats({ roundsCompleted: Number.NaN }).roundsCompleted).toBeUndefined()
    expect(coerceStats({ roundsCompleted: Number.POSITIVE_INFINITY }).roundsCompleted).toBeUndefined()
  })

  it('preserves 0 as a valid roundsCompleted value', () => {
    const result = coerceStats({ roundsCompleted: 0 })
    expect(result.roundsCompleted).toBe(0)
  })
})

describe('recordSession silent failure (D-16)', () => {
  it('does not throw when storage write fails', () => {
    vi.spyOn(Storage.prototype, 'setItem').mockImplementation(() => {
      throw new Error('quota')
    })
    expect(() => recordSession(60_000, false, { now: () => 1 })).not.toThrow()
  })
})
