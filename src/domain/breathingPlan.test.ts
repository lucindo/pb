import { describe, expect, it } from 'vitest'

import { createBreathingPlan } from './breathingPlan'
import type { PatternSettings } from './settings'

const settings = (over: Partial<PatternSettings>): PatternSettings => ({
  inhale: 4,
  holdIn: 7,
  exhale: 8,
  holdOut: 0,
  multiplier: 1,
  rounds: 3,
  ...over,
})

describe('createBreathingPlan', () => {
  // AC-1: a zero-base hold is omitted; cycleSec is the sum of effective phases.
  it('omits zero-base holds and sums the surviving phases', () => {
    const plan = createBreathingPlan(settings({ inhale: 4, holdIn: 7, exhale: 8, holdOut: 0, multiplier: 1 }))
    expect(plan.phases).toEqual([
      { phase: 'inhale', durationSec: 4 },
      { phase: 'hold-in', durationSec: 7 },
      { phase: 'exhale', durationSec: 8 },
    ])
    expect(plan.cycleSec).toBe(19)
  })

  // AC-2: the multiplier scales every phase; Box-4 = 1·1·1·1 ×4.
  it('scales every phase by the multiplier', () => {
    const plan = createBreathingPlan(settings({ inhale: 1, holdIn: 1, exhale: 1, holdOut: 1, multiplier: 4 }))
    expect(plan.phases.map((p) => p.durationSec)).toEqual([4, 4, 4, 4])
    expect(plan.cycleSec).toBe(16)
  })

  it('computes totalSec as rounds × cycleSec for timed sessions', () => {
    const plan = createBreathingPlan(settings({ rounds: 3 }))
    expect(plan.totalSec).toBe(3 * plan.cycleSec)
  })

  it('uses null total for open-ended sessions', () => {
    expect(createBreathingPlan(settings({ rounds: 'open-ended' })).totalSec).toBeNull()
  })
})
