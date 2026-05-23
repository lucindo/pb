import type { LearnContent, PracticeLearnContent } from '../content/learnContent'
import type { UiStrings } from '../content/strings'
import type { PracticeId } from '../storage/practices'

export type LearnPracticeContentKey = keyof LearnContent['practices']

export interface LearnDialogModel {
  practiceContentKey: LearnPracticeContentKey
  practiceContent: PracticeLearnContent
  videosHeading: string
  showNativeApps: boolean
}

function getPracticeContentKey(activePractice: PracticeId): LearnPracticeContentKey {
  return activePractice === 'naviKriya' ? 'naviKriya' : 'resonant'
}

export function getLearnDialogModel(input: {
  activePractice: PracticeId
  learnContent: LearnContent
  strings: UiStrings['learn']
}): LearnDialogModel {
  const practiceContentKey = getPracticeContentKey(input.activePractice)

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
