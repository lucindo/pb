import { describe, expect, it } from 'vitest'

import { LEARN_CONTENT } from '../content/learnContent'
import { UI_STRINGS } from '../content/strings'
import { getLearnDialogModel } from './learnDialogModel'

const EN_CONTENT = LEARN_CONTENT.en
const EN_STRINGS = UI_STRINGS.en.learn

describe('getLearnDialogModel', () => {
  it('uses resonant content, heading, and native app links for the resonant practice', () => {
    const model = getLearnDialogModel({
      activePractice: 'resonant',
      learnContent: EN_CONTENT,
      strings: EN_STRINGS,
    })

    expect(model.practiceContentKey).toBe('resonant')
    expect(model.practiceContent).toBe(EN_CONTENT.practices.resonant)
    expect(model.videosHeading).toBe(EN_STRINGS.videosHeading)
    expect(model.showNativeApps).toBe(true)
  })

  it('uses Navi Kriya content and hides native app links for Navi Kriya', () => {
    const model = getLearnDialogModel({
      activePractice: 'naviKriya',
      learnContent: EN_CONTENT,
      strings: EN_STRINGS,
    })

    expect(model.practiceContentKey).toBe('naviKriya')
    expect(model.practiceContent).toBe(EN_CONTENT.practices.naviKriya)
    expect(model.videosHeading).toBe(EN_STRINGS.naviKriyaVideosHeading)
    expect(model.showNativeApps).toBe(false)
  })

  it('falls stretch back to resonant content without showing native app links', () => {
    const model = getLearnDialogModel({
      activePractice: 'stretch',
      learnContent: EN_CONTENT,
      strings: EN_STRINGS,
    })

    expect(model.practiceContentKey).toBe('resonant')
    expect(model.practiceContent).toBe(EN_CONTENT.practices.resonant)
    expect(model.videosHeading).toBe(EN_STRINGS.videosHeading)
    expect(model.showNativeApps).toBe(false)
  })
})
