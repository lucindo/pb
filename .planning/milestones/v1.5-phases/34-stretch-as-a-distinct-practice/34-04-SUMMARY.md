---
phase: 34-stretch-as-a-distinct-practice
plan: "04"
subsystem: content/i18n
tags: [i18n, strings, stretch, copy]
dependency_graph:
  requires: [34-01]
  provides: [UiStrings.practice.stretchName, UiStrings.practice.stretchHeading, UiStrings.practice.stretchHeader]
  affects: [src/content/strings.ts, src/content/strings.test.ts]
tech_stack:
  added: []
  patterns: [naviKriya triple mirror pattern (name/heading/header)]
key_files:
  created: []
  modified:
    - src/content/strings.ts
    - src/content/strings.test.ts
decisions:
  - "D-10 satisfied: EN stretchName and stretchHeading both 'Stretch' (same value, short switcher label = practice heading)"
  - "Spike 007 result honored: 'Alongar' confirmed to fit 320px 3-practice switcher"
  - "naviKriyaName/naviKriyaHeading/naviKriyaHeader triple used as exact mirror pattern"
metrics:
  duration: "94s (~2 min)"
  completed: "2026-05-18T18:00:03Z"
  tasks_completed: 1
  files_changed: 2
---

# Phase 34 Plan 04: Stretch Copy i18n Catalog Summary

**One-liner:** Added stretchName/stretchHeading/stretchHeader fields to UiStrings.practice for EN ('Stretch'/'Stretch'/'Stretch practice') and PT-BR ('Alongar'/'Alongar'/'Prática de Alongar').

## Tasks Completed

| Task | Name | Commit | Status |
|------|------|--------|--------|
| 1 (RED) | Add failing tests for stretch copy fields | 76ba185 | Committed |
| 1 (GREEN) | Add stretch copy fields to UiStrings.practice for both locales | 438dd19 | Committed |

## What Was Built

Extended `src/content/strings.ts` with three new `readonly` string fields on the `UiStrings.practice` interface:

- `stretchName` — short switcher label (mirrors `naviKriyaName`)
- `stretchHeading` — practice heading (mirrors `naviKriyaHeading`); D-10: same value as `stretchName`
- `stretchHeader` — app header line (mirrors `naviKriyaHeader`)

Both locale catalogs (`en` and `pt-BR`) received non-empty values for all three fields.

| Field | EN | PT-BR |
|-------|----|-------|
| `stretchName` | `'Stretch'` | `'Alongar'` |
| `stretchHeading` | `'Stretch'` | `'Alongar'` |
| `stretchHeader` | `'Stretch practice'` | `'Prática de Alongar'` |

Added 6 new tests in `src/content/strings.test.ts` under `describe('Phase 34 stretch practice string keys (STRETCH-06)')`:
1. EN stretchName === 'Stretch'
2. EN stretchHeading === 'Stretch'
3. PT-BR stretchName === 'Alongar'
4. PT-BR stretchHeading === 'Alongar'
5. stretchHeader is non-empty in both locales
6. Completeness: all three fields present and non-empty in every LocaleId

## Verification

- `npx vitest run src/content/strings.test.ts src/content/lockedCopy.test.ts` — **44/44 tests pass** (38 pre-existing + 6 new)
- `npx vitest run src/content/` — **97/97 tests pass** (all 4 content test files)
- `npx tsc --noEmit` — **0 errors**
- `grep -c "stretchName" src/content/strings.ts` — returns **4** (>= 3 required: interface + EN + PT-BR + comment reference)
- `grep -cE "stretchHeading|stretchHeader" src/content/strings.ts` — returns **6** (>= 4 required)
- LOCKED_COPY guard — **green** (lockedCopy.test.ts all pass; LOCKED_COPY was not touched)

## TDD Gate Compliance

- RED gate: commit `76ba185` — 6 failing tests committed before any implementation
- GREEN gate: commit `438dd19` — implementation makes all 44 tests pass

## Deviations from Plan

None — plan executed exactly as written.

## Known Stubs

None — all three fields are populated with real values in both locales.

## Threat Flags

None — static compile-time copy catalog with no untrusted input or runtime data flow.

## Self-Check

- [x] `src/content/strings.ts` exists and contains `stretchName` (4 occurrences)
- [x] `src/content/strings.test.ts` exists and contains 6 new test cases
- [x] RED commit `76ba185` exists in git log
- [x] GREEN commit `438dd19` exists in git log
- [x] 44/44 content tests pass
- [x] 97/97 full content suite passes
- [x] tsc clean (0 errors)
