import type { UiStrings } from '../content/strings'
import type { PracticeId } from '../storage'

export function getPracticeHeader(activePractice: PracticeId, strings: UiStrings): string {
  switch (activePractice) {
    case 'resonant':
      return strings.practice.header
    case 'stretch':
      return strings.practice.switcher.stretchHeader
    case 'naviKriya':
      return strings.practice.switcher.naviKriyaHeader
  }
}

export function getPracticeTitle(activePractice: PracticeId, strings: UiStrings): string {
  switch (activePractice) {
    case 'resonant':
      return strings.practice.title
    case 'stretch':
      return strings.practice.switcher.stretchHeading
    case 'naviKriya':
      return strings.practice.switcher.naviKriyaHeading
  }
}

export function getPracticeToggleStrings(strings: UiStrings): {
  toggleLabel: string
  practiceNames: Record<PracticeId, string>
} {
  return {
    toggleLabel: strings.practice.switcher.toggleLabel,
    practiceNames: {
      resonant: strings.practice.switcher.resonantName,
      stretch: strings.practice.switcher.stretchName,
      naviKriya: strings.practice.switcher.naviKriyaName,
    },
  }
}
