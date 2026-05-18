---
phase: 32-learn-localization
plan: 03
subsystem: content
tags: [i18n, pt-BR, native-speaker-review, drift-guard, finalization]
dependency_graph:
  requires: [32-01-learnContent-practices-partition, 32-02-practice-aware-LearnDialog]
  provides: [finalized-pt-BR-v1.5, zero-review-markers, drift-guard-passing]
  affects: [src/content/strings.ts, src/content/learnContent.ts]
tech_stack:
  added: []
  patterns: [operator-review-flow, drift-guard-marker-removal]
key_files:
  created: []
  modified:
    - src/content/strings.ts
    - src/content/learnContent.ts
decisions:
  - "Operator approved all 38 pt-BR strings as-is except 3 corrections: resonantHeading, roundsCompletedLabel, controls.resume"
  - "stats.roundsCompletedLabel pt-BR set to 'OMs na frente' — operator-confirmed deliberate divergence from EN 'Rounds'"
  - "All 7 review markers removed after operator sign-off per D-11 protocol"
metrics:
  duration: ~10min
  completed: 2026-05-17
  tasks_completed: 3
  tasks_total: 3
  files_changed: 2
---

# Phase 32 Plan 03: pt-BR Finalization + Review Marker Removal Summary

Operator-reviewed all 38 v1.5 pt-BR strings (Groups A/B/C) and approved them with 3 corrections applied; removed all 7 `// TODO: native-speaker review` drift-guard markers from `strings.ts` and `learnContent.ts`; full 78-file test suite now fully green (1158/1158) including the previously-intentionally-failing `content.no-review-markers` drift-guard.

## What Was Built

### Operator pt-BR Corrections Applied (Task 1 → Task 2)

Three corrections from the operator's native-speaker review:

| Item | Key | Old value | New value |
|------|-----|-----------|-----------|
| A4 | `practice.resonantHeading` (pt-BR) | `Resonant Breathing` | `Respiração Ressonante` |
| A29 | `stats.roundsCompletedLabel` (pt-BR) | `Rodadas` | `OMs na frente` |
| A31 | `controls.resume` (pt-BR) | `Retomar` | `Continuar` |

All other 35 pt-BR strings across Groups A/B/C were operator-approved as-is.

**Note on A29 (`OMs na frente`):** The operator deliberately chose a semantically richer translation that diverges from the EN source `Rounds`. This is an intentional D-10 operator decision — the EN source string `Rounds` was not changed.

### Review Markers Removed (Task 2)

7 markers removed in total:
- 3 from `src/content/strings.ts` (pt-BR `learn.naviKriyaVideosHeading`, `learn.naviKriyaDescriptionSection1Title`, `learn.naviKriyaDescriptionSection2Title`)
- 4 from `src/content/learnContent.ts` (pt-BR `practices.naviKriya.description.section1.title`, `section1.body`, `section2.title`, `section2.body`)

Video-title "kept in English" comments preserved in `learnContent.ts` — these are not review markers.

### Full Suite Verification (Task 3)

- `npx vitest run`: 78 files / 1158 tests — all passed (previously 1157 with 1 intentional drift-guard failure)
- `npm run build`: 85 modules transformed, tsc + vite both succeed
- `grep -rl "TODO: native-speaker review" src/content/ --include='*.ts' | grep -v '.test.ts'`: returns nothing

## Commits

| Hash | Type | Description |
|------|------|-------------|
| 2182dbc | feat | Apply operator pt-BR corrections and remove all review markers |

## Deviations from Plan

None — plan executed exactly as written. Task 1 was pre-resolved by the operator per the spawn-time checkpoint resolution; Task 2 applied corrections and removed markers; Task 3 confirmed full green suite.

## Known Stubs

None. All pt-BR strings are now operator-reviewed to native quality. No hardcoded empty values, placeholder text, or review markers remain in `src/content/`.

## Threat Flags

No new threat surface. T-32-06 (repudiation — marker removal without operator sign-off) is now fully mitigated: the operator checkpoint was completed before markers were removed, and the `content.no-review-markers` drift-guard test passes.

## Self-Check: PASSED

- [x] `src/content/strings.ts` — A4 `practice.resonantHeading` pt-BR = `Respiração Ressonante`
- [x] `src/content/strings.ts` — A29 `stats.roundsCompletedLabel` pt-BR = `OMs na frente`
- [x] `src/content/strings.ts` — A31 `controls.resume` pt-BR = `Continuar`
- [x] `grep -rl "TODO: native-speaker review" src/content/ --include='*.ts' | grep -v '.test.ts'` → empty
- [x] Plan commit exists: 2182dbc
- [x] `npx vitest run` → 1158/1158 passed (fully green — drift-guard now passes)
- [x] `npm run build` → succeeds (85 modules)
- [x] `npx tsc --noEmit` → exits 0
