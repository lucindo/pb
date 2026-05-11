import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

import { readEnvelope, writeEnvelope, STATE_KEY, STATE_VERSION } from './storage'

beforeEach(() => {
  window.localStorage.clear()
})

afterEach(() => {
  window.localStorage.clear()
  vi.restoreAllMocks()
})

describe('readEnvelope', () => {
  it('returns empty envelope when nothing is stored', () => {
    expect(readEnvelope()).toEqual({ version: STATE_VERSION })
  })

  it('returns the parsed envelope when valid JSON is stored', () => {
    window.localStorage.setItem(STATE_KEY, JSON.stringify({
      version: 1, settings: { bpm: 4 }, mute: true, stats: null,
    }))
    const env = readEnvelope()
    expect(env.version).toBe(STATE_VERSION)
    expect(env.settings).toEqual({ bpm: 4 })
    expect(env.mute).toBe(true)
  })

  it('falls back to empty envelope when stored JSON is corrupt (D-17)', () => {
    window.localStorage.setItem(STATE_KEY, '{not-json')
    expect(readEnvelope()).toEqual({ version: STATE_VERSION })
  })

  it('falls back to empty envelope when getItem throws (D-17 — Safari ITP)', () => {
    vi.spyOn(Storage.prototype, 'getItem').mockImplementation(() => {
      throw new Error('SecurityError')
    })
    expect(readEnvelope()).toEqual({ version: STATE_VERSION })
  })

  it('falls back to empty envelope when stored value is a non-object (array / number / string)', () => {
    window.localStorage.setItem(STATE_KEY, JSON.stringify([1, 2, 3]))
    expect(readEnvelope()).toEqual({ version: STATE_VERSION })
    window.localStorage.setItem(STATE_KEY, JSON.stringify(42))
    expect(readEnvelope()).toEqual({ version: STATE_VERSION })
    window.localStorage.setItem(STATE_KEY, JSON.stringify('str'))
    expect(readEnvelope()).toEqual({ version: STATE_VERSION })
  })
})

describe('writeEnvelope', () => {
  it('persists the envelope with version stamped', () => {
    writeEnvelope({ version: STATE_VERSION, settings: { bpm: 4 } })
    const raw = window.localStorage.getItem(STATE_KEY)
    expect(raw).not.toBeNull()
    // Reason: raw non-null asserted by expect().not.toBeNull() immediately above.
    // eslint-disable-next-line @typescript-eslint/no-non-null-assertion
    expect(JSON.parse(raw!) as unknown).toMatchObject({ version: 1, settings: { bpm: 4 } })
  })

  it('silently absorbs QuotaExceededError on setItem (D-16)', () => {
    vi.spyOn(Storage.prototype, 'setItem').mockImplementation(() => {
      const e = new Error('quota')
      e.name = 'QuotaExceededError'
      throw e
    })
    expect(() => { writeEnvelope({ version: STATE_VERSION }) }).not.toThrow()
  })

  it('silently absorbs SecurityError on setItem (D-16 — Safari ITP / private mode)', () => {
    vi.spyOn(Storage.prototype, 'setItem').mockImplementation(() => {
      throw new Error('SecurityError')
    })
    expect(() => { writeEnvelope({ version: STATE_VERSION, mute: true }) }).not.toThrow()
  })

  it('preserves on-disk version when reading; stamps STATE_VERSION on write', () => {
    // Seed a v2 envelope (simulates a future schema written by a newer build
    // in another tab). `prefs` is the forward-compat probe — STORAGE-01's
    // D-01 spread must let it survive the readEnvelope round-trip.
    window.localStorage.setItem(STATE_KEY, JSON.stringify({
      version: 2, settings: { bpm: 4 }, prefs: { theme: 'dark' },
    }))
    // STORAGE-01: readEnvelope returns the on-disk numeric version (2),
    // NOT STATE_VERSION (1). The known settings subtree round-trips.
    const env = readEnvelope()
    expect(env.version).toBe(2)
    expect(env.settings).toEqual({ bpm: 4 })
    // STORAGE-02 / D-04a: disk version 2 > STATE_VERSION 1 → write refused.
    // The caller's `version: 1` does NOT require an `as any` cast because
    // Envelope.version is widened to `number` (Task 1).
    writeEnvelope({ version: 1, settings: { bpm: 5 } })
    // Disk unchanged: the refused write left the v2 envelope intact.
    const rawAfter = window.localStorage.getItem(STATE_KEY)
    expect(rawAfter).not.toBeNull()
    // Reason: rawAfter non-null asserted by expect().not.toBeNull() above.
    // eslint-disable-next-line @typescript-eslint/no-non-null-assertion
    expect(JSON.parse(rawAfter!) as unknown).toMatchObject({ version: 2, settings: { bpm: 4 } })
  })

  it('writeEnvelope refuses to overwrite a future-version on-disk envelope (STORAGE-02)', () => {
    // Seed a v2-only envelope (no known subtrees) to isolate the version guard.
    window.localStorage.setItem(STATE_KEY, JSON.stringify({ version: 2 }))
    // Caller attempts to land 99-session stats on top of the v2 envelope.
    // The 99-session probe gives the negative assertion something concrete
    // to test — if the guard fails, the stats subtree appears on disk.
    writeEnvelope({
      version: 1,
      stats: {
        totalSessions: 99,
        totalElapsedSeconds: 0,
        lastSessionAtMs: null,
        lastSessionDurationSeconds: null,
      },
    })
    // D-03 silent refusal: disk envelope unchanged at version: 2.
    const rawAfter = window.localStorage.getItem(STATE_KEY)
    expect(rawAfter).not.toBeNull()
    // Reason: rawAfter non-null asserted by expect().not.toBeNull() above.
    // eslint-disable-next-line @typescript-eslint/no-non-null-assertion
    expect(JSON.parse(rawAfter!) as unknown).toMatchObject({ version: 2 })
    // Negative: 99-session probe was NOT written.
    // eslint-disable-next-line @typescript-eslint/no-non-null-assertion
    expect(JSON.parse(rawAfter!) as unknown).not.toMatchObject({ stats: { totalSessions: 99 } })
  })
})
