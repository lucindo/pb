---
phase: 26-pt-br-native-speaker-review
plan: "01"
subsystem: content
tags: [i18n, pt-BR, content, review, drift-guard]
dependency_graph:
  requires: [Phase 24 Forrest links, Phase 25 cue toggle]
  provides: [I18N-07 done-state, marker-guard drift-test]
  affects: [src/content/strings.ts, src/content/learnContent.ts]
tech_stack:
  added: []
  patterns: [fs-scan drift-guard, Vitest node:fs test]
key_files:
  created:
    - src/content/content.no-review-markers.test.ts
  modified:
    - src/content/strings.ts
    - src/content/learnContent.ts
decisions:
  - "D-07: BPM → RPM in pt-BR ONLY across all five label sites (bpmLabel, bpmUnit, currentBpmLabel, initialBpmLabel, targetBpmLabel)"
  - "D-11: all 98 markers removed regardless of CHANGED/KEPT; substring guard enabled by line-9 header rewrite"
  - "D-12: standalone marker-guard test — separate from unit tests to isolate node:fs from clean import-only test files"
  - "Operator override: breathing.inhale/exhale stay Puxa/Solta (not Inspira/Expira) due to UI width constraint"
metrics:
  duration_minutes: 53
  completed_date: "2026-05-16"
  tasks_completed: 4
  files_created: 1
  files_modified: 2
---

# Phase 26 Plan 01: PT-BR Native-Speaker Review Summary

**One-liner:** Reviewed and corrected all 98 machine-translated pt-BR strings across both catalogs; removed every marker; locked done-state with a drift-guard test.

## Tasks Completed

| Task | Name | Commit | Files |
|------|------|--------|-------|
| 1 | Produce the two pt-BR review tables (all 98 marked strings) | f4ce438 | .planning/phases/26-pt-br-native-speaker-review/26-REVIEW-TABLES.md |
| 2 | Operator native-speaker review (human-verify checkpoint) | — (operator markup) | 26-REVIEW-TABLES.md (operator approved) |
| 3 | Apply approved corrections and remove all 98 markers | e4be232 | src/content/strings.ts, src/content/learnContent.ts |
| 4 | Add the marker-guard drift-test for src/content/ | bd4ca60 | src/content/content.no-review-markers.test.ts |

## What Was Built

**Task 3 — Catalog corrections (e4be232):**

All 98 `// TODO: native-speaker review` markers removed from both catalogs. Applied 30 CHANGED corrections and removed markers from 68 KEPT rows:

Notable CHANGED values in `strings.ts`:
- `resetStatsDialog.title`: Reiniciar estatísticas? → Zerar estatísticas de prática?
- `resetStatsDialog.confirm`: Reiniciar → Zerar
- `settings.cueLabel`: Estilo de sinal → Estilo de guia
- `timbres.bowl`: Taça → Tigela (singing bowl, not wine glass)
- `settingsForm.bpmLabel` / `bpmUnit` / `currentBpmLabel`: BPM → RPM (D-07)
- `settingsForm.initialBpmLabel` / `targetBpmLabel`: BPM inicial/alvo → RPM inicial/alvo (D-07)
- `settingsForm.openEndedLabel` / `holdOpenEndedLabel`: Aberta/Aberto → Sem limite
- `settingsForm.modeStretch`: Alongamento → Progressivo
- `settingsForm.holdTargetLabel` / `readout.stageHoldTarget`: Acalmar → Estabilizar
- `settingsForm.rampDurationLabel` / `readout.stageRamp`: Alongamento → Progressão
- `readout.readoutAriaLabel`: Leitura da sessão → Informações da sessão
- `readout.stageLabel`: Estágio → Fase
- `mute.mute` / `unmute`: Silenciar/Reativar áudio → Silenciar/Reativar sons
- `anchors.settingsDisabled`: indisponíveis → indisponível (grammar fix)
- `anchors.learn` / `learnDisabled`: Aprenda → Saiba mais
- `stats.lastSessionPrefix`: Último: → Última sessão:
- `breathing.breathingShapeAriaLabel`: Forma da respiração → Forma de respiração
- `learn.resourcesHeading`: Links do Forrest Knutson → Recursos do Forrest Knutson

Operator override: `breathing.inhale` and `breathing.exhale` stay `Puxa` / `Solta` (review table changed CHANGED→KEPT). UI constraint: labels render inside the breathing shape and must stay as short as EN "In"/"Out".

Notable CHANGED values in `learnContent.ts`:
- `explainer.hrv.body`: removed "seu" possessive before "coração" (twice) for impersonal D-05 tone
- `explainer.timing.title`: cronometra → guia (guides, not measures)
- `explainer.timing.body`: improved phrasing — implied-você imperative, smoother "tigela" reference
- `explainer.forrest.body`: multiple natural-language improvements (milenares, valorizado, compreensíveis, criado, ritmo de respiração calmo)

strings.ts header (line 8) rewritten: "machine-translated; every translatable entry carries / `// TODO: native-speaker review` per I18N-07" → "reviewed by a native speaker in Phase 26 per I18N-07" (substring `native-speaker review` removed from the header).

**Task 4 — Drift-guard test (bd4ca60):**

New `src/content/content.no-review-markers.test.ts` fs-scan guard (D-12). Walks `src/content/`, collects non-test `.ts` files, scans each for `TODO: native-speaker review`, asserts zero hits with a diagnostic message. Excludes `.test.ts` files so the guard does not flag its own source. GREEN immediately (Task 3 removed all markers).

## Phase Done-Gate (D-13)

All checks pass as of plan close:

- `grep -r "native-speaker review" src/` — matches only inside `content.no-review-markers.test.ts` (the const + 3 comments); 0 hits in any catalog file.
- `npx tsc -b` — exits 0 (Record<LocaleId, UiStrings> / Record<LocaleId, LearnContent> type completeness intact).
- `npx eslint .` — 0 errors (1 pre-existing warning in App.tsx, unrelated to this phase).
- `npm run build` — exits 0, 72 modules, 276 kB JS.
- `npx vitest run` — 959 tests / 65 test files, all passed.
  - `src/content/lockedCopy.test.ts` — byte-equality guard green; lockedCopy.ts unmodified.
  - `src/content/strings.test.ts` — 66 passing (Record exhaustiveness + non-empty value checks).
  - `src/content/learnContent.test.ts` — structural contract + clinical-verbs blacklist green.
  - `src/content/content.no-review-markers.test.ts` — new guard green (1/1).

## Deviations from Plan

### Auto-fixed Issues

None — plan executed exactly as written.

### Operator Overrides Applied (Task 2 checkpoint)

**1. breathing.inhale and breathing.exhale: CHANGED → KEPT**
- **Applied during:** Task 3 (continuation from approved Task 2 markup)
- **Override:** Operator changed the CHANGED flag back to KEPT on `breathing.inhale` (Puxa) and `breathing.exhale` (Solta). Claude had proposed "Inspira" / "Expira" as more precise anatomical terms.
- **Reason:** UI width constraint — these labels render inside the breathing shape element and must stay as short as EN "In" / "Out". "Puxa" (pull) and "Solta" (release) are short colloquial alternatives that fit. "Inspira" / "Expira" are too long for the layout.
- **Applied value:** `inhale: 'Puxa'`, `exhale: 'Solta'` — unchanged from pre-review state.

## Known Stubs

None. All values are wired to real content. No placeholder or empty values introduced.

## Threat Flags

None. This phase adds no trust boundary — value-only edits to two static string catalogs plus one new fs-scan test.

## Self-Check: PASSED

Files exist:
- `src/content/strings.ts` — FOUND
- `src/content/learnContent.ts` — FOUND
- `src/content/content.no-review-markers.test.ts` — FOUND

Commits exist:
- f4ce438 — FOUND (Task 1)
- e4be232 — FOUND (Task 3)
- bd4ca60 — FOUND (Task 4)

Marker counts:
- `grep -c "native-speaker review" src/content/strings.ts` = 0
- `grep -c "native-speaker review" src/content/learnContent.ts` = 0
