// Physical separation of locked claim-safe copy from the translatable catalog
// (src/content/learnContent.ts + src/content/strings.ts).
// Frozen-snapshot test in lockedCopy.test.ts asserts byte-equality of all EN and
// PT-BR values via .toBe() — never .toMatchInlineSnapshot() (auto-update defeats
// the lock).
// Lock scope: medicalAdviceLine + affiliationLine. Smallest blast radius for
// claim-safe copy.
// These locked strings are composed at render time by the surfaces that need them
// (LearnPanel for affiliationLine; PracticeScreen for medicalAdviceLine).

import type { LocaleId } from '../domain'

export interface LockedCopy {
  readonly medicalAdviceLine: string
  readonly affiliationLine: string
}

export const LOCKED_COPY: Readonly<Record<LocaleId, LockedCopy>> = {
  en: {
    medicalAdviceLine: "Guided breathing practice — not medical advice.",
    affiliationLine: "Independent project.",
  },
  'pt-BR': {
    // LOCKED: back-translation = "Guided breathing practice — not medical advice."
    medicalAdviceLine: "Prática de respiração guiada — não é conselho médico.",
    // LOCKED: back-translation = "Independent project."
    affiliationLine: "Projeto independente.",
  },
} as const satisfies Readonly<Record<LocaleId, LockedCopy>>
