// Physical separation of locked claim-safe copy from the translatable catalog
// (src/content/learnContent.ts + src/content/strings.ts).
// Frozen-snapshot test in lockedCopy.test.ts asserts byte-equality of all 3 EN and
// 3 PT-BR values via .toBe() — never .toMatchInlineSnapshot() (auto-update defeats
// the lock).
// Lock scope: inspiredByForrest + medicalAdviceLine + affiliationLine. Smallest
// blast radius for claim-safe copy.
// These locked strings are composed at render time by the surfaces that need them
// (LearnPanel for inspiredByForrest + affiliationLine; PracticeScreen for medicalAdviceLine).

import type { LocaleId } from '../domain'

export interface LockedCopy {
  readonly inspiredByForrest: string
  readonly medicalAdviceLine: string
  readonly affiliationLine: string
}

export const LOCKED_COPY: Readonly<Record<LocaleId, LockedCopy>> = {
  en: {
    inspiredByForrest: "inspired by Forrest's teachings",
    medicalAdviceLine: "Guided breathing practice — not medical advice.",
    affiliationLine: "Independent project. Not affiliated with Forrest Knutson.",
  },
  'pt-BR': {
    // LOCKED: back-translation = EN inspiredByForrest baseline (see en.inspiredByForrest above)
    inspiredByForrest: "inspirado nos ensinamentos do Forrest",
    // LOCKED: back-translation = "Guided breathing practice — not medical advice."
    medicalAdviceLine: "Prática de respiração guiada — não é conselho médico.",
    // LOCKED: back-translation = "Independent project. Not affiliated with Forrest Knutson."
    affiliationLine: "Projeto independente. Não afiliado ao Forrest Knutson.",
  },
} as const satisfies Readonly<Record<LocaleId, LockedCopy>>
