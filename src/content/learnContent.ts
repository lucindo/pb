// About-page copy. One block per locale — a base to fill in as Pattern
// Breathing's content is written. The locked affiliation line lives in
// src/content/lockedCopy.ts and is composed at render time by the LearnPanel.

import type { LocaleId } from '../domain'

export interface ExplainerSection {
  readonly title: string
  readonly body: string
}

export interface LearnContent {
  readonly section1: ExplainerSection
}

const LOREM =
  'Lorem ipsum dolor sit amet, consectetur adipiscing elit, sed do eiusmod tempor incididunt ut labore et dolore magna aliqua. Ut enim ad minim veniam, quis nostrud exercitation ullamco laboris nisi ut aliquip ex ea commodo consequat.'

export const LEARN_CONTENT: Readonly<Record<LocaleId, LearnContent>> = {
  en: {
    section1: {
      title: 'What is Pattern Breathing',
      body: LOREM,
    },
  },
  'pt-BR': {
    section1: {
      title: 'O que é Pattern Breathing',
      body: LOREM,
    },
  },
} as const satisfies Readonly<Record<LocaleId, LearnContent>>
