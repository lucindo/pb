import { describe, expect, it } from 'vitest'

import { DEFAULT_PATTERN_SETTINGS } from '../domain'
import { UI_STRINGS } from '../content/strings'
import { buildSetupCardSummary } from './setupCardSummary'

const practice = UI_STRINGS.en.practice

describe('buildSetupCardSummary — patternBreathing', () => {
  it('returns null when patternBreathing session is complete (existing behaviour)', () => {
    const result = buildSetupCardSummary({
      settings: {
        settings: DEFAULT_PATTERN_SETTINGS,
        isRunning: false,
        isComplete: true,
        onChange: () => undefined,
      },
      practice,
    })

    expect(result).toBeNull()
  })

  it('returns summary items when patternBreathing session is idle (existing behaviour)', () => {
    const result = buildSetupCardSummary({
      settings: {
        settings: DEFAULT_PATTERN_SETTINGS,
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
