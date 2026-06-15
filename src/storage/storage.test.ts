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
    // readEnvelope preserves the on-disk numeric version and round-trips the
    // known subtrees unchanged.
    expect(env.version).toBe(1)
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
    expect(JSON.parse(raw!) as unknown).toMatchObject({ version: STATE_VERSION, settings: { bpm: 4 } })
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

  it('fails OPEN and still writes when the inner version re-read throws (Safari ITP)', () => {
    // The version guard must distinguish "disk holds a newer schema" from "cannot read
    // the disk version". When the inner getItem throws, it must assume STATE_VERSION and
    // proceed — NOT let the throw skip the write. Asserted via the setItem spy because a
    // throwing getItem makes reading the value back impossible.
    vi.spyOn(Storage.prototype, 'getItem').mockImplementation(() => {
      throw new Error('SecurityError')
    })
    const setItemSpy = vi.spyOn(Storage.prototype, 'setItem')

    writeEnvelope({ version: STATE_VERSION, settings: { bpm: 6 } })

    expect(setItemSpy).toHaveBeenCalledTimes(1)
    const [key, payload] = setItemSpy.mock.calls[0] ?? []
    expect(key).toBe(STATE_KEY)
    expect(JSON.parse(payload ?? '{}') as unknown)
      .toMatchObject({ version: STATE_VERSION, settings: { bpm: 6 } })
  })

  it('preserves on-disk version when reading; stamps STATE_VERSION on write', () => {
    // Seed a v4 envelope (simulates a future schema written by a newer build in
    // another tab). v4 > STATE_VERSION exercises the future-version guard. `prefs`
    // is the forward-compat probe — the spread must let it survive the read.
    window.localStorage.setItem(STATE_KEY, JSON.stringify({
      version: 4, settings: { bpm: 4 }, prefs: { theme: 'dark' },
    }))
    // readEnvelope returns the on-disk numeric version (4), NOT STATE_VERSION.
    const env = readEnvelope()
    expect(env.version).toBe(4)
    expect(env.settings).toEqual({ bpm: 4 })
    // Unknown top-level fields survive the read (forward-compat coverage).
    expect((env as unknown as Record<string, unknown>).prefs)
      .toEqual({ theme: 'dark' })
    // Disk version 4 > STATE_VERSION → write refused.
    writeEnvelope({ version: 1, settings: { bpm: 5 } })
    // Disk unchanged: the refused write left the v4 envelope intact.
    const rawAfter = window.localStorage.getItem(STATE_KEY)
    expect(rawAfter).not.toBeNull()
    // Reason: rawAfter non-null asserted by expect().not.toBeNull() above.
    // eslint-disable-next-line @typescript-eslint/no-non-null-assertion
    expect(JSON.parse(rawAfter!) as unknown).toMatchObject({ version: 4, settings: { bpm: 4 } })
  })

  it('refuses to overwrite a future-version on-disk envelope (STORAGE-02)', () => {
    // Seed a v4-only envelope (no known subtrees) to isolate the version guard.
    window.localStorage.setItem(STATE_KEY, JSON.stringify({ version: 4 }))
    writeEnvelope({
      version: 1,
      stats: {
        totalSessions: 99,
        totalElapsedSeconds: 0,
        lastSessionAtMs: null,
        lastSessionDurationSeconds: null,
      },
    })
    // Silent refusal: disk envelope unchanged at version: 4.
    const rawAfter = window.localStorage.getItem(STATE_KEY)
    expect(rawAfter).not.toBeNull()
    // eslint-disable-next-line @typescript-eslint/no-non-null-assertion
    expect(JSON.parse(rawAfter!) as unknown).toMatchObject({ version: 4 })
    // Negative: 99-session probe was NOT written.
    // eslint-disable-next-line @typescript-eslint/no-non-null-assertion
    expect(JSON.parse(rawAfter!) as unknown).not.toMatchObject({ stats: { totalSessions: 99 } })
  })

  it('STATE_KEY stays exactly "pattern-breathing:state:v1" (FOUC script depends on it)', () => {
    // The :v1 suffix is the key NAME, not the version field. Bumping STATE_VERSION
    // must never touch STATE_KEY — the index.html FOUC script hardcodes it.
    expect(STATE_KEY).toBe('pattern-breathing:state:v1')
    writeEnvelope({ version: STATE_VERSION, settings: { bpm: 4 } })
    expect(window.localStorage.getItem('pattern-breathing:state:v1')).not.toBeNull()
  })
})
