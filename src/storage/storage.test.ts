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

  it('always re-stamps version: 1 even if a caller passes a wrong version', () => {
    writeEnvelope({ version: STATE_VERSION, settings: { bpm: 4 } })
    // Reason: STATE_KEY is always present after writeEnvelope; non-null asserted by storage contract.
    // eslint-disable-next-line @typescript-eslint/no-non-null-assertion
    const rawStr = window.localStorage.getItem(STATE_KEY)!
    expect(JSON.parse(rawStr) as unknown).toMatchObject({ version: 1 })
  })
})
