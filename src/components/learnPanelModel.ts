import type { LearnContent, PracticeLearnContent } from '../content/learnContent'
import type { UiStrings } from '../content/strings'
import type { PracticeId } from '../storage'

export type LearnPracticeContentKey = keyof LearnContent['practices']

export interface LearnPanelModel {
  practiceContentKey: LearnPracticeContentKey
  practiceContent: PracticeLearnContent
  videosHeading: string
  showNativeApps: boolean
}

export function getLearnPanelModel(input: {
  activePractice: PracticeId
  learnContent: LearnContent
  strings: UiStrings['learn']
}): LearnPanelModel {
  // PracticeId and LearnPracticeContentKey are now the same set — each practice
  // has its own learn content (Stretch starts as an HRV copy plus its adaptation).
  const practiceContentKey: LearnPracticeContentKey = input.activePractice

  return {
    practiceContentKey,
    practiceContent: input.learnContent.practices[practiceContentKey],
    videosHeading:
      practiceContentKey === 'naviKriya'
        ? input.strings.naviKriyaVideosHeading
        : input.strings.videosHeading,
    showNativeApps: input.activePractice === 'resonant',
  }
}
