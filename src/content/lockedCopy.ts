// Phase 19 I18N-06 — D-01 physical separation of locked claim-safe copy from
// translatable catalog (src/content/learnContent.ts + src/content/strings.ts).
// D-02: Frozen-EN snapshot test in lockedCopy.test.ts asserts byte-equality of all
// 3 EN values via .toBe() — never .toMatchInlineSnapshot() (auto-update defeats the lock).
// D-03: Lock scope = 3 D-12 minimum entries: inspiredByForrest + medicalAdviceLine +
// affiliationLine. Matches Phase 6 D-12 literally. Smallest blast radius.
// D-04: Composition — LearnDialog.tsx renders LOCKED_COPY[locale].inspiredByForrest as a
// separate paragraph after forrest.body; App.tsx renders LOCKED_COPY[locale].medicalAdviceLine
// and LearnDialog.tsx renders LOCKED_COPY[locale].affiliationLine (Phase 19).

import type { LocaleId } from '../domain/settings'

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
