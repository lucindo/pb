---
phase: 37-stats-ui-removal
plan: 01
subsystem: ui/storage/i18n
tags: [stats-removal, anti-gamification, cleanup, deletion]
requirements-completed: [STATS-01, STATS-02, STATS-03]
depends-on: []
dependency-graph:
  requires: []
  provides:
    - Stats-UI-free App shell (no StatsFooter, no ResetStatsDialog, no activeStats subscription)
    - Cleaned UiStrings type (no stats / resetStatsDialog / resetStatsTitle keys)
    - Surgical App test prune (no footer-gating / reset-stats / cross-tab-stats branches)
  affects:
    - src/app/App.tsx
    - src/content/strings.ts
    - src/components/SettingsDialog.tsx
tech-stack:
  added: []
  patterns:
    - delete-with-component (D-06): component + test deleted in same commit
    - Tiger Style WHY-only comments: dangling references removed after sibling deletion
    - tsc-as-linter: TypeScript compiler used to surface any missed consumers after type deletion
key-files:
  deleted:
    - src/components/StatsFooter.tsx
    - src/components/StatsFooter.test.tsx
    - src/components/ResetStatsDialog.tsx
    - src/components/ResetStatsDialog.test.tsx
  modified:
    - src/app/App.tsx
    - src/app/App.dialog.test.tsx
    - src/app/App.persistence.test.tsx
    - src/content/strings.ts
    - src/content/strings.test.ts
    - src/components/SettingsDialog.tsx
    - src/storage/format.ts
decisions:
  - "D-04: App.tsx activeStats subscription pruned (no UI consumer after StatsFooter deletion); per-practice stats useState removed; recordXSession calls preserved with D-04 disk-persistence semantics"
  - "D-05: STATE_VERSION unchanged at 3; recordResonantSession/recordStretchSession/recordNaviKriyaSession keep identical signatures"
  - "D-06: delete-with-component policy applied: StatsFooter.test.tsx and ResetStatsDialog.test.tsx deleted in the same commit as their components"
  - "D-07: surgical test strip — LOCL-02 footer-gating, LOCL-03 reset, STORAGE-03 cross-tab-stats, WR-09 auto-close ResetStatsDialog all removed; LOCL-02 stats-accumulation and PRACTICE-02 settings blocks retained"
  - "STORAGE-03 listener confirmed no non-stats consumer: all three writes (setResonantStats, setStretchStats, setNaviKriyaStats) belonged to the now-deleted per-practice stats useState declarations; listener deleted wholesale"
metrics:
  duration: ~15m
  completed: 2026-05-20
  tasks-completed: 3
  files-modified: 11
  lines-deleted: ~896
---

# Phase 37 Plan 01: Delete Stats UI Surface Summary

One-liner: Deleted StatsFooter + ResetStatsDialog components with all App.tsx wiring, the STORAGE-03 cross-tab listener, and the EN/PT-BR stats i18n catalog in a single coordinated clean cut, leaving recordSession persistence and tsc/vitest green.

## What Was Done

### Files Deleted (4 components + tests)

- `src/components/StatsFooter.tsx` — UI component for displaying session stats (D-06 delete-with-component)
- `src/components/StatsFooter.test.tsx` — StatsFooter test suite (deleted with component)
- `src/components/ResetStatsDialog.tsx` — Native dialog for resetting practice stats (D-06)
- `src/components/ResetStatsDialog.test.tsx` — ResetStatsDialog test suite (deleted with component)

### Files Edited (7 files, ~896 lines deleted)

- `src/app/App.tsx` — Removed: component imports (L13-14), `resetPracticeStats` import (L68), per-practice stats useState (resonantStats/naviKriyaStats/stretchStats/resetDialogOpen), STORAGE-03 storage-event listener, activeStats selector, WR-09 setResetDialogOpen(false) call, onResetClick/confirmReset/cancelReset callbacks, per-session setState writes for stats, StatsFooter render gate (L1270-1278), ResetStatsDialog element (L1304-1310)
- `src/content/strings.ts` — Removed: UiStrings.resetStatsDialog type block, UiStrings.stats type block, UiStrings.practice.resetStatsTitle type; EN + PT-BR catalog entries for all three
- `src/content/strings.test.ts` — Removed: resetStatsDialog test block, stats.sessionsCount test, practice.resetStatsTitle test cases
- `src/app/App.dialog.test.tsx` — Removed: WR-09 auto-closes ResetStatsDialog it block; removed unused STATE_KEY import
- `src/app/App.persistence.test.tsx` — Removed: LOCL-02 footer-gating describe (3 it cases), LOCL-03 reset describe (3 it cases), STORAGE-03 cross-tab-stats describe (2 it cases); updated L45 comment to remove `/ resetPracticeStats` clause
- `src/components/SettingsDialog.tsx` — Removed: D-13 comment trailing `; differs from ResetStatsDialog` clause; deleted "Three structural deltas from ResetStatsDialog" block (D-07 Tiger Style)
- `src/storage/format.ts` — Updated file-level comment: removed StatsFooter reference (comment drift)

## STORAGE-03 Listener Verification

**Confirmed: listener had no non-stats consumer.** The sole writes inside the `onStorage` handler were:
- `setResonantStats(practices.resonant.stats)` — from the deleted `resonantStats` useState
- `setStretchStats(practices.stretch.stats)` — from the deleted `stretchStats` useState
- `setNaviKriyaStats(practices.naviKriya.stats)` — from the deleted `naviKriyaStats` useState

After deleting the three per-practice stats useState declarations (D-04), the listener had no live React state to write to. Per PATTERNS.md §"STORAGE-03 planner-decision branch: if the listener is being deleted, drop the entire describe block", the listener and its STORAGE-03 test block were deleted together.

**WHY deleted:** The cross-tab stats listener existed solely to refresh the StatsFooter render gate (`activeStats.totalSessions > 0`). With StatsFooter gone, the listener has no purpose. Disk persistence continues via the WR-07 single-read pattern inside `recordXSession` functions in `src/storage/stats.ts` — those functions are unchanged.

## Decisions Implemented

- **D-01:** Clean cut — all three UiStrings keys (stats, resetStatsDialog, practice.resetStatsTitle) deleted from type AND both EN and PT-BR catalogs. No orphan keys, no rot.
- **D-04:** App.tsx activeStats subscription and per-practice stats useState removed. loadStats stays exported (test surface + internal use). recordXSession functions unchanged.
- **D-05:** STATE_VERSION confirmed unchanged at 3 (verified via `git show main:src/storage/storage.ts`). recordResonantSession/recordStretchSession/recordNaviKriyaSession keep identical signatures.
- **D-06:** delete-with-component policy applied (Phase 36-08 precedent).
- **D-07:** Surgical test strip — LOCL-02 footer-gating + LOCL-03 reset + STORAGE-03 cross-tab + WR-09 auto-close ResetStatsDialog all deleted. LOCL-02 stats-accumulation and PRACTICE-02 settings tests kept intact.
- **D-12:** All five app surfaces (Idle, Running, Complete, Learn, App Settings) are now free of stats components.

## Requirements Closed

- **STATS-01:** StatsFooter removed — no "N sessions · N min total" display anywhere.
- **STATS-02:** ResetStatsDialog removed — no reset dialog, no `confirmReset`/`cancelReset` in App.
- **STATS-03:** Reset stats affordance gone — the Practice Settings "Reset stats" button is removed along with StatsFooter.

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 1 - Bug] strings.test.ts tests for deleted keys**

- **Found during:** Task 2 (vitest run after strings.ts edits)
- **Issue:** `src/content/strings.test.ts` had three test cases directly testing `resetStatsDialog` entries, `stats.sessionsCount`, and `practice.resetStatsTitle` — these surfaced as `TypeError: ... is not a function` once the type/catalog entries were deleted.
- **Fix:** Removed the three failing test cases from strings.test.ts (part of the D-07 surgical strip scope).
- **Files modified:** `src/content/strings.test.ts`
- **Commit:** `4e0ac6a`

**2. [Rule 1 - Bug] format.ts comment drift**

- **Found during:** Task 3 acceptance criteria check (grep for StatsFooter in non-test non-content files)
- **Issue:** `src/storage/format.ts` file-level comment read "pure display formatters for the StatsFooter" — a dangling reference after StatsFooter deletion.
- **Fix:** Updated comment to "pure display formatters for session stats".
- **Files modified:** `src/storage/format.ts`
- **Commit:** `c9c42ba`

### Acceptance Criteria Variance

The plan's acceptance criterion `grep -nE "LOCL-02|LOCL-03|STORAGE-03" src/app/App.persistence.test.tsx` returns no matches — however, there is a pre-existing `describe('LOCL-02 — stats record on each end path', ...)` block that tests `recordResonantSession` persistence (the stats-accumulation contract, not footer-gating). Per D-07 ("surgical strip, keep the rest of the file intact") and D-05 ("recordXSession keep their signatures"), this block must remain. The `LOCL-02` name overlap was not anticipated in the plan criteria text; the spirit of the criterion (remove footer-gating and reset-dialog test branches) is fully satisfied.

## Pre-handoff for Plan 02

After Task 1, a scan of potentially orphaned exports:

- `resetPracticeStats` in `src/storage/practices.ts` — no longer imported from `src/app/App.tsx`. Still referenced in `src/storage/practices.test.ts`. Plan 02 deletes this function and its tests.
- `formatLastSession`, `formatLastSessionDate`, `formatLastSessionDuration` in `src/storage/format.ts` — `formatLastSessionDate` and `formatLastSessionDuration` were used by `StatsFooter.tsx` (now deleted) and by `formatLastSession` in `format.ts`. `formatLastSession` is now dead code. Plan 02 deletes these functions and their tests.
- `ZERO_STATS` in `src/storage` — survives `confirmReset` deletion because it's still used in storage migration paths (`coercePractices` in `src/storage/practices.ts`). Not an orphan.
- `PersistedStats` type — still imported in `App.tsx` (line 71 via `'../storage'`). Used by `initialPractices` type inference. Not an orphan.

## Known Stubs

None. All deleted code was production-ready; no stubs introduced.

## Threat Flags

None. This plan deletes surface-only code (components, i18n strings, test branches). No new network endpoints, auth paths, file access patterns, or schema changes introduced.

## Self-Check

- [x] `src/components/StatsFooter.tsx` does not exist
- [x] `src/components/StatsFooter.test.tsx` does not exist
- [x] `src/components/ResetStatsDialog.tsx` does not exist
- [x] `src/components/ResetStatsDialog.test.tsx` does not exist
- [x] `grep -nE "StatsFooter|ResetStatsDialog" src/app/App.tsx` returns no matches
- [x] `grep -n "STORAGE-03|addEventListener.'storage'" src/app/App.tsx` returns no matches
- [x] `grep -nE "readonly stats:|readonly resetStatsDialog:|resetStatsTitle:" src/content/strings.ts` returns no matches
- [x] `grep -n "auto-closes ResetStatsDialog" src/app/App.dialog.test.tsx` returns no matches
- [x] `grep -n "/ resetPracticeStats" src/app/App.persistence.test.tsx` returns no matches
- [x] `grep -n "Three structural deltas" src/components/SettingsDialog.tsx` returns no matches
- [x] `grep -n "D-13: NO explicit focus call" src/components/SettingsDialog.tsx` still returns a match
- [x] `npx tsc --noEmit` exits 0
- [x] `npx vitest run` exits 0 — 1222/1222 tests pass

## Self-Check: PASSED
