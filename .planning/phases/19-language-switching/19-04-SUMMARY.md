---
phase: 19-language-switching
plan: "04"
subsystem: hooks
tags: [i18n, react-hook, locale, useLocale, uiStrings, lang-attribute]
dependency_graph:
  requires: ["19-01"]
  provides: ["useLocale hook", "documentElement.lang apply effect", "locale state orchestration"]
  affects: ["App.tsx (Plan 07)", "locale picker (Plan 05)"]
tech_stack:
  added: []
  patterns:
    - "3-effect hook pattern: apply + cross-tab storage + same-tab prefs-changed"
    - "Lazy useState seed from loadPrefs()"
    - "UI_STRINGS[locale] return shape"
key_files:
  created:
    - src/hooks/useLocale.ts
    - src/hooks/useLocale.test.ts
  modified: []
decisions:
  - "3 effects: apply lang (dep [locale]) + cross-tab storage (empty deps) + same-tab prefs-changed (empty deps)"
  - "No savePrefs call — D-05 separation from useLocaleChoice (Plan 05)"
  - "No mql effect — locale has no system-mode counterpart (D-07)"
  - "Empty deps correct per D-25: setLocale (useState) is stable; loadPrefs/STATE_KEY/UI_STRINGS are module-level"
metrics:
  duration: "~10 minutes"
  completed: "2026-05-14T23:50:00Z"
  tasks_completed: 3
  files_created: 2
  files_modified: 0
  tests_added: 8
---

# Phase 19 Plan 04: useLocale Orchestrator Hook Summary

**One-liner:** `useLocale` hook with 3-effect pattern returning `{ locale, uiStrings: UI_STRINGS[locale] }`, writing `document.documentElement.lang` on locale change.

## What Was Built

Created `src/hooks/useLocale.ts` — the App-side orchestrator hook for the locale dimension.
Mirrors `useVisualVariant.ts` structurally (cross-tab storage + same-tab prefs-changed listeners)
plus Effect 1 that writes `document.documentElement.lang` on every locale change (D-07 pattern).

Created `src/hooks/useLocale.test.ts` with 8 tests covering seed, apply effect on mount, apply effect
on change, cross-tab storage listener (match + mismatch), same-tab prefs-changed listener
(match + mismatch + forward-compat undefined-key branch).

## Task Results

| Task | Name | Commit | Files |
|------|------|--------|-------|
| 1 | Create useLocale.ts | 44f6606 | src/hooks/useLocale.ts |
| 2 | Create useLocale.test.ts | 5cfcc58 | src/hooks/useLocale.test.ts |
| 3 | Per-commit green-gate (D-16) | — (verification) | — |

## Implementation Details

**useLocale.ts (71 lines):**
- Lazy seed: `useState<LocaleId>(() => loadPrefs().locale)`
- Effect 1 (dep `[locale]`): `document.documentElement.lang = locale`
- Effect 2 (empty deps): cross-tab `'storage'` listener — `e.key === STATE_KEY` filter
- Effect 3 (empty deps): same-tab `'hrv:prefs-changed'` listener — `detail.key === 'locale' || detail.key === undefined` filter
- Return: `{ locale, uiStrings: UI_STRINGS[locale] }`
- 0 `savePrefs` calls (D-05)
- 0 `eslint-disable` lines (D-24)

**useLocale.test.ts (140 lines, 8 tests):**
- Test 1: seed + uiStrings.controls.startSession non-empty
- Test 2: `documentElement.lang === 'en'` after mount
- Test 3: `documentElement.lang === 'pt-BR'` after storage event (apply effect fires on change)
- Test 4: `locale === 'pt-BR'` after cross-tab storage event with `STATE_KEY`
- Test 5: `locale === 'en'` unchanged after storage event with non-STATE_KEY
- Test 6: `locale === 'pt-BR'` after same-tab event with `detail.key === 'locale'`
- Test 7: `locale === 'en'` unchanged after same-tab event with `detail.key === 'theme'`
- Test 8: `locale === 'pt-BR'` after same-tab event with `detail: {}` (undefined key forward-compat)

## Green-Gate Results

| Step | Status |
|------|--------|
| `npx tsc --noEmit` | PASS |
| `npm run lint` | PASS |
| `npm run build` | PASS |
| `npm test -- --run` (691 tests) | PASS |

## Effect Count Verification

- Total `useEffect(` calls in `useLocale.ts`: 3 (apply lang, cross-tab storage, same-tab prefs-changed)
- No mql effect (D-07 — locale has no system-mode counterpart)
- `savePrefs` calls: 0 (D-05 separation)
- `eslint-disable` lines: 0 (D-24)
- `document.documentElement.lang =` assignments: 1 (apply effect only)

## Threat Model Compliance

| Threat ID | Mitigation | Status |
|-----------|------------|--------|
| T-19-10 | `instanceof CustomEvent` check + `detail.key === 'locale' \|\| undefined` filter; loadPrefs coercer narrows to LocaleId | Implemented |
| T-19-11 | `setLocale` is typed `setState<LocaleId>` — TypeScript enum-narrowed to `'en' \| 'pt-BR'`; no user-controlled string reaches DOM | Implemented |
| T-19-12 | Accept — cross-tab locale change mid-session is desirable behavior | Accepted |

## Deviations from Plan

None — plan executed exactly as written. TDD sequence honored: feat commit (Task 1) followed by test commit (Task 2), then green-gate verification (Task 3).

## Known Stubs

None — `useLocale` returns live `UI_STRINGS[locale]` seeded from `loadPrefs()`. No hardcoded empty values or placeholder text.

## Threat Flags

None — no new network endpoints, auth paths, file access patterns, or schema changes introduced.

## Self-Check: PASSED

- `src/hooks/useLocale.ts` exists: FOUND
- `src/hooks/useLocale.test.ts` exists: FOUND
- Commit 44f6606 exists: FOUND
- Commit 5cfcc58 exists: FOUND
- 8 tests pass: VERIFIED
- TSC, lint, build, test all exit 0: VERIFIED
