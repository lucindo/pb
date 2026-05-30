import { describe, expect, it } from 'vitest'

import {
  isValidFrontCount,
  isValidOmLength,
  isValidRounds,
  DEFAULT_NK_SETTINGS,
} from './naviKriyaSettings'

describe('isValidFrontCount', () => {
  it('returns true for valid multiples of 4: 4 (smallest), 100 (default)', () => {
    expect(isValidFrontCount(4)).toBe(true)
    expect(isValidFrontCount(100)).toBe(true)
  })

  it('returns false for 102 — a positive integer that is NOT a multiple of 4 (backCount regression guard)', () => {
    expect(isValidFrontCount(102)).toBe(false)
  })

  it('returns false for 0 and negative multiples of 4', () => {
    expect(isValidFrontCount(0)).toBe(false)
    expect(isValidFrontCount(-4)).toBe(false)
  })

  it('returns false for non-integer numbers (4.5)', () => {
    expect(isValidFrontCount(4.5)).toBe(false)
  })

  it('returns false for NaN and Infinity', () => {
    expect(isValidFrontCount(NaN)).toBe(false)
    expect(isValidFrontCount(Infinity)).toBe(false)
  })

  it('returns false for wrong types: string "100", null', () => {
    expect(isValidFrontCount('100')).toBe(false)
    expect(isValidFrontCount(null)).toBe(false)
  })
})

describe('isValidOmLength', () => {
  it('returns true for all valid OmLength values: "fast", "medium", "slow"', () => {
    expect(isValidOmLength('fast')).toBe(true)
    expect(isValidOmLength('medium')).toBe(true)
    expect(isValidOmLength('slow')).toBe(true)
  })

  it('returns false for case-variant "FAST"', () => {
    expect(isValidOmLength('FAST')).toBe(false)
  })

  it('returns false for empty string', () => {
    expect(isValidOmLength('')).toBe(false)
  })

  it('returns false for null and number 5', () => {
    expect(isValidOmLength(null)).toBe(false)
    expect(isValidOmLength(5)).toBe(false)
  })
})

describe('isValidRounds', () => {
  it('returns true for valid integers >= 1: 1 and 3', () => {
    expect(isValidRounds(1)).toBe(true)
    expect(isValidRounds(3)).toBe(true)
  })

  it('returns false for 0 and -1', () => {
    expect(isValidRounds(0)).toBe(false)
    expect(isValidRounds(-1)).toBe(false)
  })

  it('returns false for non-integer numbers (2.5)', () => {
    expect(isValidRounds(2.5)).toBe(false)
  })

  it('returns false for NaN and Infinity', () => {
    expect(isValidRounds(NaN)).toBe(false)
    expect(isValidRounds(Infinity)).toBe(false)
  })

  it('returns false for wrong types: string "3", null', () => {
    expect(isValidRounds('3')).toBe(false)
    expect(isValidRounds(null)).toBe(false)
  })
})

describe('DEFAULT_NK_SETTINGS', () => {
  it('equals the expected default object', () => {
    expect(DEFAULT_NK_SETTINGS).toEqual({
      frontCount: 100,
      omLength: 'medium',
      rounds: 3,
      perOmCue: true,
    })
  })
})
