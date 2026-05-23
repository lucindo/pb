import type { UiStrings } from '../content/strings'
import type { PracticeId } from '../storage'

export function getPracticeHeader(activePractice: PracticeId, strings: UiStrings): string {
  switch (activePractice) {
    case 'resonant':
      return strings.app.header
    case 'stretch':
      return strings.practice.stretchHeader
    case 'naviKriya':
      return strings.practice.naviKriyaHeader
  }
}

export function getPracticeTitle(activePractice: PracticeId, strings: UiStrings): string {
  switch (activePractice) {
    case 'resonant':
      return strings.app.title
    case 'stretch':
      return strings.practice.stretchHeading
    case 'naviKriya':
      return strings.practice.naviKriyaHeading
  }
}

export function getPracticeToggleStrings(strings: UiStrings): {
  toggleLabel: string
  practiceNames: Record<PracticeId, string>
} {
  return {
    toggleLabel: strings.practice.toggleLabel,
    practiceNames: {
      resonant: strings.practice.resonantName,
      stretch: strings.practice.stretchName,
      naviKriya: strings.practice.naviKriyaName,
    },
  }
}
