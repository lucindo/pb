import { describe, expect, it } from 'vitest'

import {
  estimateNaviKriyaDurationMinutes,
  getNaviKriyaBackCount,
  getNaviKriyaPhaseTarget,
} from './naviKriyaSession'
import { DEFAULT_NK_SETTINGS } from './naviKriyaSettings'

describe('Navi Kriya session calculations', () => {
  it('derives the back count from the front count', () => {
    expect(getNaviKriyaBackCount(100)).toBe(25)
  })

  it('returns front and back phase targets from settings', () => {
    expect(getNaviKriyaPhaseTarget(DEFAULT_NK_SETTINGS, 'front')).toBe(100)
    expect(getNaviKriyaPhaseTarget(DEFAULT_NK_SETTINGS, 'back')).toBe(25)
  })

  it('estimates displayed session minutes from rounds, OM length, and phase lead-ins', () => {
    expect(estimateNaviKriyaDurationMinutes(DEFAULT_NK_SETTINGS)).toBe(14)
  })
})
