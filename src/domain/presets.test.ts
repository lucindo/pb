import { describe, expect, it } from 'vitest'

import { PRESETS, applyPreset, resolvePreset } from './presets'
import type { PatternSettings } from './settings'

const boxFour = PRESETS.find((p) => p.id === 'box-4')
if (!boxFour) throw new Error('box-4 preset must exist')

describe('resolvePreset', () => {
  it('reports the named preset when the five fields match (rounds ignored)', () => {
    const settings: PatternSettings = { ...boxFour.shape, rounds: 99 }
    expect(resolvePreset(settings)).toBe('box-4')
  })

  // AC-8: editing any one pattern field drops the selection to Custom.
  it('reports custom when any field diverges from every preset', () => {
    const settings: PatternSettings = { ...boxFour.shape, inhale: 2, rounds: 10 }
    expect(resolvePreset(settings)).toBe('custom')
  })

  it('treats equal effective seconds with different fields as custom', () => {
    // 4·4·4·4 ×1 has the same effective seconds as Box-4 (1·1·1·1 ×4) but is not it.
    const settings: PatternSettings = { inhale: 4, holdIn: 4, exhale: 4, holdOut: 4, multiplier: 1, rounds: 10 }
    expect(resolvePreset(settings)).toBe('custom')
  })
})

describe('applyPreset', () => {
  // AC-7: applying a preset sets the five fields and leaves rounds untouched.
  it('sets the pattern fields and preserves rounds', () => {
    const current: PatternSettings = { inhale: 4, holdIn: 7, exhale: 8, holdOut: 0, multiplier: 1, rounds: 10 }
    expect(applyPreset(current, boxFour)).toEqual({ ...boxFour.shape, rounds: 10 })
  })
})
