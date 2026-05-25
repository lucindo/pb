import { describe, expect, it } from 'vitest'

import { UI_STRINGS } from '../content/strings'
import { getPracticeTitle, getPracticeToggleStrings } from './practiceCopy'

describe('practice copy helpers', () => {
  it('maps each practice to its title copy', () => {
    expect(getPracticeTitle('resonant', UI_STRINGS.en)).toBe('HRV Breathing')
    expect(getPracticeTitle('stretch', UI_STRINGS.en)).toBe('HRV Stretch')
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
