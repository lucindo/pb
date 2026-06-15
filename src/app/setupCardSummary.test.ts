import { describe, expect, it } from 'vitest'

import { DEFAULT_SETTINGS } from '../domain'
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
