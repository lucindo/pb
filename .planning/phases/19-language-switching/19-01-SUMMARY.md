---
phase: 19-language-switching
plan: "01"
subsystem: content
tags: [i18n, strings, catalog, pt-br, tdd]
dependency_graph:
  requires: []
  provides:
    - src/content/strings.ts (UiStrings interface + UI_STRINGS catalog + LOCALE_DISPLAY_NAMES)
    - src/content/strings.test.ts (exhaustiveness + template-fn + endonym tests)
  affects: []
tech_stack:
  added: []
  patterns:
    - "as const satisfies Readonly<Record<LocaleId, UiStrings>> — exhaustiveness typing from learnContent.ts pattern"
    - "Template-fn entries (D-15): function-typed strings for interpolated UI labels"
    - "TDD: test file written before implementation; RED verified (import error), GREEN verified (13/13 pass)"
key_files:
  created:
    - src/content/strings.ts
    - src/content/strings.test.ts
  modified: []
decisions:
  - "LOCALE_DISPLAY_NAMES exported from strings.ts (not domain/settings.ts per Phase 14 D-09 file-split invariant)"
  - "stepper.fieldAriaLabel(l) => l for both locales (identity function — field label is already the accessible label)"
  - "stats.totalMinutes uses Math.round(seconds/60) for minute conversion matching format.ts patterns"
metrics:
  duration: "~3 minutes"
  completed: "2026-05-14"
  tasks_completed: 3
  files_created: 2
  files_modified: 0
---

# Phase 19 Plan 01: Strings Catalog with EN+PT-BR Summary

**One-liner:** Typed UiStrings catalog with 14 sub-objects, full EN+PT-BR entries, LOCALE_DISPLAY_NAMES native endonyms, and 13-test exhaustiveness suite.

## What Was Built

Created `src/content/strings.ts` exporting:
- `UiStrings` interface: 14 readonly sub-objects (controls, endSessionDialog, resetStatsDialog, settings, themes, variants, timbres, settingsForm, mute, readout, anchors, stats, breathing, learn) covering every user-visible string surface downstream component edits will consume.
- `UI_STRINGS: Readonly<Record<LocaleId, UiStrings>>`: EN locale with current shipped literals + PT-BR locale with machine-translated values; 63 PT-BR entries flagged `// TODO: native-speaker review` per I18N-07.
- `LOCALE_DISPLAY_NAMES: Readonly<Record<LocaleId, string>>`: `{ en: 'English', 'pt-BR': 'Português (Brasil)' }` native endonyms per D-14.

Created `src/content/strings.test.ts` with 13 tests across 3 `describe` blocks:
- `UI_STRINGS exhaustiveness` (8 tests): LocaleId entries defined, controls/settings non-empty, themes/variants/timbres iterate over option arrays, endSessionDialog/resetStatsDialog non-empty.
- `UI_STRINGS template-fn entries (D-15)` (3 tests): decreaseLabel/increaseLabel interpolate correctly, sessionsCount singular/plural returns distinct strings.
- `LOCALE_DISPLAY_NAMES (D-14 native endonyms)` (2 tests): byte-equality for 'English' and 'Português (Brasil)'.

## Files Created

| File | Lines | Purpose |
|------|-------|---------|
| `src/content/strings.ts` | 312 | UiStrings interface + UI_STRINGS catalog + LOCALE_DISPLAY_NAMES |
| `src/content/strings.test.ts` | 113 | Exhaustiveness + template-fn + endonym assertions |

## PT-BR Entry Count

- **Total PT-BR translatable entries:** 63 `// TODO: native-speaker review` markers
- **Function-typed PT-BR entries:** stepper.decreaseLabel, stepper.increaseLabel, stats.sessionsCount, stats.totalMinutes, stats.lastSessionPrefix, breathing.leadInAriaLabel (6 functions)
- **All candidates from 19-CONTEXT.md `<specifics>` applied:** Tigela, Sino, Senoidal, Carrilhão, Esfera, Quadrado, Losango, Claro, Escuro, Sistema, Musgo, Ardósia, Crepúsculo, Iniciar sessão, Encerrar sessão, Encerrar esta sessão?, Encerrar, Continuar, Reiniciar estatísticas?, Reiniciar, Manter, Configurações, Fechar, Tema, Variante, Timbre, Idioma, BPM, Proporção, Duração, Aberta, min, Diminuir ${l}, Aumentar ${l}, and all others per plan spec.

## Deviations from Plan

None — plan executed exactly as written.

## Green-Gate Results

| Check | Result |
|-------|--------|
| `npx tsc --noEmit` | exit 0 |
| `npm run lint` | exit 0 |
| `npm run build` | exit 0 (250 KB bundle) |
| `npm test -- --run` | exit 0 (657/657 tests pass; 13 new) |

## Commit

| Hash | Subject | Files |
|------|---------|-------|
| fc2ee7f | feat(19-01): strings catalog with EN+PT-BR + exhaustiveness tests | src/content/strings.ts, src/content/strings.test.ts |

Only `src/content/strings.ts` and `src/content/strings.test.ts` in the commit (D-16 per-commit green-gate requirement met).

## Self-Check: PASSED

- [x] `src/content/strings.ts` exists and exports `UiStrings`, `UI_STRINGS`, `LOCALE_DISPLAY_NAMES`
- [x] `src/content/strings.test.ts` exists with 13 passing tests
- [x] Commit fc2ee7f exists with only the 2 expected files
- [x] `npx tsc --noEmit` exits 0
- [x] 63 `// TODO: native-speaker review` markers present
- [x] 2 `as const satisfies` usages (one per exported constant)
- [x] `LOCALE_DISPLAY_NAMES.en === 'English'` and `LOCALE_DISPLAY_NAMES['pt-BR'] === 'Português (Brasil)'`
- [x] No `src/domain/settings.ts` or `src/storage/prefs.ts` edits (D-18 file-split invariant)
- [x] No new `// eslint-disable` lines (D-24)
- [x] No hardcoded Tailwind color utilities in new files (D-22)
