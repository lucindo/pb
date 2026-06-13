import { describe, expect, it } from 'vitest'

import { coerceStats } from './stats'

const ZERO = {
  totalSessions: 0,
  totalElapsedSeconds: 0,
  lastSessionAtMs: null,
  lastSessionDurationSeconds: null,
}

describe('coerceStats per-field coercion (D-15 spirit / D-17)', () => {
  it('coerces an invalid stats subtree to the zero state per field', () => {
    expect(coerceStats({
      totalSessions: -1,
      totalElapsedSeconds: 'bad',
      lastSessionAtMs: 'x',
      lastSessionDurationSeconds: -5,
    })).toEqual(ZERO)
  })

  it('returns the zero state for null / undefined / non-object input', () => {
    expect(coerceStats(null)).toEqual(ZERO)
    expect(coerceStats(undefined)).toEqual(ZERO)
    expect(coerceStats(42)).toEqual(ZERO)
  })

  it('tolerates a fractional lastSessionAtMs but coerces fractional integer-only fields', () => {
    // lastSessionAtMs keeps the float-tolerant check (a Date.now()/performance.now()
    // injection may be fractional); totalElapsedSeconds + lastSessionDurationSeconds are
    // floor(ms/1000) integers, so a fractional value there is corruption and coerces.
    const out = coerceStats({
      totalSessions: 3,
      totalElapsedSeconds: 120.5,
      lastSessionAtMs: 1_700_000_000_000.25,
      lastSessionDurationSeconds: 30.5,
    })
    expect(out.totalSessions).toBe(3)
    expect(out.lastSessionAtMs).toBe(1_700_000_000_000.25)
    expect(out.totalElapsedSeconds).toBe(0)
    expect(out.lastSessionDurationSeconds).toBeNull()
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
