---
phase: 28-phone-install-banner
plan: "01"
subsystem: storage, content
tags: [storage, i18n, tdd, localStorage, install-banner]
dependency_graph:
  requires: []
  provides: [loadInstallDismissed, saveInstallDismissed, UiStrings.install]
  affects: [src/storage/index.ts, src/content/strings.ts]
tech_stack:
  added: []
  patterns: [silent-fallback-localStorage, strings-catalog]
key_files:
  created:
    - src/storage/installDismissed.ts
    - src/storage/installDismissed.test.ts
  modified:
    - src/storage/index.ts
    - src/content/strings.ts
decisions:
  - "Raw boolean localStorage key (no Envelope wrapper) for installDismissed — no FOUC dependency, no cross-tab sync, no per-field coercion required (RESEARCH.md Pattern 4)"
  - "INSTALL_DISMISSED_KEY not exported — internal constant, callers use the load/save functions"
  - "PT-BR install copy marked DRAFT with Phase 29 handoff comment per D-09"
metrics:
  duration_seconds: 137
  completed_date: "2026-05-16"
  tasks_completed: 2
  files_changed: 4
---

# Phase 28 Plan 01: Install Banner Foundation Summary

**One-liner:** localStorage dismissal helper (`loadInstallDismissed`/`saveInstallDismissed`) and `UiStrings.install` strings block for the phone install banner.

## Tasks Completed

| Task | Name | Commit | Files |
|------|------|--------|-------|
| 1 (RED) | Add failing tests for installDismissed | 66b1b8a | src/storage/installDismissed.test.ts |
| 1 (GREEN) | Implement installDismissed storage helper | 8399c87 | src/storage/installDismissed.ts, src/storage/index.ts |
| 2 | Add UiStrings.install block for EN and PT-BR | d3b48b1 | src/content/strings.ts |

## What Was Built

### Task 1: installDismissed storage helper

`src/storage/installDismissed.ts` exports two functions:

- `loadInstallDismissed(): boolean` — reads `hrv:install-dismissed` from localStorage, returns `true` only when the value strictly equals the string `'true'` (T-28-01 tamper guard: any injected JSON, scripts, or other strings read as `false`). Returns `false` from the `catch` branch (D-17 silent fallback).
- `saveInstallDismissed(): void` — writes `'true'` to `hrv:install-dismissed`. Empty `catch` body (D-16 silent fallback).

Both functions are re-exported from `src/storage/index.ts` via `export * from './installDismissed'`.

`INSTALL_DISMISSED_KEY` is module-private (not exported). No `Envelope` wrapper, no `StorageDeps` — raw boolean key per RESEARCH.md Pattern 4 rationale.

5 unit tests pass: round-trip, no-key false, getItem-throws false, setItem-throws no-throw, non-true-string false.

### Task 2: UiStrings.install block

`src/content/strings.ts` updated:

- `UiStrings` interface: `readonly install` sub-object added immediately after `learn`. Phase 28-01 contributed 7 `readonly string` fields: `bannerText`, `installButton`, `iosStepsButton`, `dismiss`, `iosStep1`, `iosStep2`, `iosStep3`. The canonical block in `src/content/strings.ts` carries 9 fields today — `regionLabel` (added later in Phase 28 for the `aria-label` extraction) and `settingsLabel` (added by Phase 29 D-03 for the Settings install entry) round it out.
- EN locale: final copy from 28-UI-SPEC.md Copywriting Contract.
- PT-BR locale: draft translations preceded by `// DRAFT: Phase 29 will finalize PT-BR install copy`.
- `as const satisfies Readonly<Record<LocaleId, UiStrings>>` constraint holds; `tsc -b` clean.

## Verification

- `npm test -- --run src/storage/installDismissed.test.ts`: 5/5 pass
- `npm run build`: clean (0 type errors)
- `npm test -- --run`: 964/964 pass (959 existing + 5 new; no regressions)
- Lint: 0 new violations in plan files (3 pre-existing errors in `useFavicon.ts`/`useWakeLock.ts` — out of scope)

## Deviations from Plan

None — plan executed exactly as written.

## Threat Flags

None — no new network endpoints, auth paths, file access patterns, or schema changes at trust boundaries. The `hrv:install-dismissed` localStorage key is a single non-sensitive boolean per T-28-03 (accept).

## Known Stubs

None — both artifacts are complete implementations. The PT-BR values are explicitly marked as DRAFT (per-plan design decision D-09), not stubs that prevent plan goals: the EN strings are final, and the PT-BR draft enables Phase 28 locale wiring without a component refactor (D-10).

## Self-Check: PASSED

- [x] `src/storage/installDismissed.ts` exists
- [x] `src/storage/installDismissed.test.ts` exists
- [x] `src/storage/index.ts` contains installDismissed re-export
- [x] `src/content/strings.ts` contains `readonly install:` in interface and both locales
- [x] Commits 66b1b8a, 8399c87, d3b48b1 exist in git log
