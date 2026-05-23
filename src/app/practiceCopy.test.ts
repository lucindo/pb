import { describe, expect, it } from 'vitest'

import { UI_STRINGS } from '../content/strings'
import {
  getPracticeHeader,
  getPracticeTitle,
  getPracticeToggleStrings,
} from './practiceCopy'

describe('practice copy helpers', () => {
  it('maps each practice to its page header and title copy', () => {
    expect(getPracticeHeader('resonant', UI_STRINGS.en)).toBe('HRV practice')
    expect(getPracticeTitle('resonant', UI_STRINGS.en)).toBe('HRV Breathing')

    expect(getPracticeHeader('stretch', UI_STRINGS.en)).toBe('Stretch practice')
    expect(getPracticeTitle('stretch', UI_STRINGS.en)).toBe('HRV Stretch')

    expect(getPracticeHeader('naviKriya', UI_STRINGS.en)).toBe('Navi practice')
    expect(getPracticeTitle('naviKriya', UI_STRINGS.en)).toBe('Navi Kriya')
  })

  it('builds the practice toggle labels from the active locale strings', () => {
    expect(getPracticeToggleStrings(UI_STRINGS.en)).toEqual({
      toggleLabel: 'Switch practice',
      practiceNames: {
        resonant: 'HRV',
        stretch: 'Stretch',
        naviKriya: 'Navi',
      },
    })
  })
})
