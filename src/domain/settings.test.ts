import { describe, expect, it } from 'vitest'

import { isValidBpm, isValidRatio, isValidDuration } from './settings'

describe('isValidBpm (HYGIENE-02 D-08)', () => {
  it('returns true for valid BPM_OPTIONS members (e.g. 5.5)', () => {
    expect(isValidBpm(5.5)).toBe(true)
  })

  it('returns false for out-of-range numbers (0, 7.5)', () => {
    expect(isValidBpm(0)).toBe(false)
    expect(isValidBpm(7.5)).toBe(false)
  })

  it('returns false for wrong type (string "5", null) and NaN / Infinity', () => {
    expect(isValidBpm('5')).toBe(false)
    expect(isValidBpm(null)).toBe(false)
    expect(isValidBpm(NaN)).toBe(false)
    expect(isValidBpm(Infinity)).toBe(false)
  })
})

describe('isValidRatio (HYGIENE-02 D-08)', () => {
  it('returns true for RATIO_OPTIONS members (e.g. "40:60")', () => {
    expect(isValidRatio('40:60')).toBe(true)
  })

  it('returns false for malformed strings ("40-60", "")', () => {
    expect(isValidRatio('40-60')).toBe(false)
    expect(isValidRatio('')).toBe(false)
  })

  it('returns false for wrong type (number 60)', () => {
    expect(isValidRatio(60)).toBe(false)
  })
})

describe('isValidDuration (HYGIENE-02 D-08)', () => {
  it('returns true for DURATION_OPTIONS numeric members (e.g. 10)', () => {
    expect(isValidDuration(10)).toBe(true)
  })

  it('returns true for "open-ended" sentinel', () => {
    expect(isValidDuration('open-ended')).toBe(true)
  })

  it('returns false for out-of-range numbers (7), arbitrary strings ("forever"), null', () => {
    expect(isValidDuration(7)).toBe(false)
    expect(isValidDuration('forever')).toBe(false)
    expect(isValidDuration(null)).toBe(false)
  })
})
