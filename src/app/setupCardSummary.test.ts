import { describe, expect, it } from 'vitest'

import { DEFAULT_NK_SETTINGS, DEFAULT_SETTINGS, DEFAULT_STRETCH_SETTINGS } from '../domain'
import { UI_STRINGS } from '../content/strings'
import { buildSetupCardSummary } from './setupCardSummary'

const practice = UI_STRINGS.en.practice

describe('buildSetupCardSummary — resonant', () => {
  it('returns null when resonant session is complete (existing behaviour)', () => {
    const result = buildSetupCardSummary({
      settings: {
        kind: 'resonant',
        settings: DEFAULT_SETTINGS,
        isRunning: false,
        isComplete: true,
        onChange: () => undefined,
        onExtendDuration: () => undefined,
      },
      practice,
    })

    expect(result).toBeNull()
  })

  it('returns summary items when resonant session is idle (existing behaviour)', () => {
    const result = buildSetupCardSummary({
      settings: {
        kind: 'resonant',
        settings: DEFAULT_SETTINGS,
        isRunning: false,
        isComplete: false,
        onChange: () => undefined,
        onExtendDuration: () => undefined,
      },
      practice,
    })

    expect(result).not.toBeNull()
    expect(result?.length).toBe(3)
  })
})

describe('buildSetupCardSummary — stretch', () => {
  it('returns null when stretch session is complete (NEW — the fix)', () => {
    const result = buildSetupCardSummary({
      settings: {
        kind: 'stretch',
        settings: DEFAULT_STRETCH_SETTINGS,
        isRunning: false,
        isComplete: true,
        onChange: () => undefined,
      },
      practice,
    })

    expect(result).toBeNull()
  })

  it('returns null when stretch session is running (existing behaviour)', () => {
    const result = buildSetupCardSummary({
      settings: {
        kind: 'stretch',
        settings: DEFAULT_STRETCH_SETTINGS,
        isRunning: true,
        isComplete: false,
        onChange: () => undefined,
      },
      practice,
    })

    expect(result).toBeNull()
  })

  it('returns summary items when stretch session is idle (existing behaviour)', () => {
    const result = buildSetupCardSummary({
      settings: {
        kind: 'stretch',
        settings: DEFAULT_STRETCH_SETTINGS,
        isRunning: false,
        isComplete: false,
        onChange: () => undefined,
      },
      practice,
    })

    expect(result).not.toBeNull()
    expect(result?.length).toBe(3)
  })
})

describe('buildSetupCardSummary — naviKriya', () => {
  it('returns null when naviKriya session is complete (NEW — the fix)', () => {
    const result = buildSetupCardSummary({
      settings: {
        kind: 'naviKriya',
        settings: DEFAULT_NK_SETTINGS,
        isComplete: true,
        onChange: () => undefined,
      },
      practice,
    })

    expect(result).toBeNull()
  })

  it('returns summary items when naviKriya session is idle and not complete (negative control)', () => {
    const result = buildSetupCardSummary({
      settings: {
        kind: 'naviKriya',
        settings: DEFAULT_NK_SETTINGS,
        isComplete: false,
        onChange: () => undefined,
      },
      practice,
    })

    // Proves the completion gate, not a blanket return-null.
    expect(result).not.toBeNull()
    expect(result?.length).toBe(3)
    // Should include the rounds/oms/pace items (not locked to exact labels).
    expect(result).not.toHaveLength(0)
  })
})
