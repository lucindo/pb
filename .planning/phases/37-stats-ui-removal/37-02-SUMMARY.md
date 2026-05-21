---
phase: 37-stats-ui-removal
plan: 02
subsystem: storage
tags: [stats-removal, anti-gamification, cleanup, deletion, regression-test]
requirements-completed: [STATS-03, STATS-04]
depends-on: [37-01]
dependency-graph:
  requires:
    - 37-01 (StatsFooter + ResetStatsDialog deleted; resetPracticeStats UI consumer gone)
  provides:
    - src/storage/practices.ts free of resetPracticeStats
    - src/storage/format.ts deleted (all exports orphaned)
    - STATS-04 regression block in practices.test.ts (three it cases)
  affects:
    - src/storage/practices.ts
    - src/storage/practices.test.ts
    - src/storage/format.ts (deleted)
    - src/storage/format.test.ts (deleted)
    - src/storage/index.ts (barrel updated)
tech-stack:
  added: []
  patterns:
    - grep-before-delete: all orphan verifications run via grep before any deletion
    - delete-with-test: format.ts and format.test.ts deleted together
    - tdd-regression: STATS-04 describe added as last block in practices.test.ts
key-files:
  deleted:
    - src/storage/format.ts
    - src/storage/format.test.ts
  modified:
    - src/storage/practices.ts (resetPracticeStats removed; ZERO_STATS import removed)
    - src/storage/practices.test.ts (resetPracticeStats tests deleted; STATS-04 block added)
    - src/storage/index.ts (export * from './format' removed)
decisions:
  - "D-02 closed: resetPracticeStats deleted from practices.ts + tests; no remaining UI consumers after Plan 01"
  - "D-03 closed: formatLastSession deleted along with all orphaned helpers (formatLastSessionDate, formatLastSessionDuration, formatTotalMinutes, formatSessionCount); entire format.ts + format.test.ts deleted"
  - "D-05 locked: STATE_VERSION unchanged at 3; recordResonantSession/recordStretchSession/recordNaviKriyaSession signatures identical"
  - "D-08 satisfied: STATS-04 regression block uses unit-level call+reload, no React render, no integration smoke"
metrics:
  duration: ~10m
  completed: 2026-05-20
  tasks-completed: 3
  files-modified: 3
  files-deleted: 2
---

# Phase 37 Plan 02: Delete Dead Storage Code + STATS-04 Regression Summary

One-liner: Deleted resetPracticeStats and all five orphaned format.ts helpers (confirmed via grep), then added a three-case STATS-04 record-and-persist regression block locking the D-05 invariant.

## What Was Done

### Task 1: Delete resetPracticeStats from storage layer and its tests

- **`src/storage/practices.ts`:** Removed the `resetPracticeStats` function block (lines 333–349) including its `// Pitfall 4: practice-scoped reset.` WHY-comment. The `ZERO_STATS` import was also removed in a follow-up fix commit (see Deviations) — it had no remaining consumer after the deletion.
- **`src/storage/practices.test.ts`:** Three deletions:
  1. `resetPracticeStats,` removed from the import block.
  2. `describe('resetPracticeStats (Pitfall 4)', ...)` deleted (lines 320–348 plus `seedBothPractices` helper).
  3. `describe("resetPracticeStats('stretch') (Phase 34)", ...)` deleted (lines 515–532).

### Task 2: Verify and delete orphaned format.ts helpers

**Grep results (all confirmed orphaned — only in format.ts + format.test.ts):**

```
formatLastSession:
  src/storage/format.test.ts (3 uses in tests)
  src/storage/format.ts (definition at L68)

formatLastSessionDate:
  src/storage/format.test.ts (2 uses in tests)
  src/storage/format.ts (definition at L55 + consumed inside formatLastSession at L70)

formatLastSessionDuration:
  src/storage/format.test.ts (4 uses in tests)
  src/storage/format.ts (definition at L63 + consumed inside formatLastSession at L70)

formatTotalMinutes:
  src/storage/format.test.ts (7 uses in tests)
  src/storage/format.ts (definition at L40)

formatSessionCount:
  src/storage/format.test.ts (4 uses in tests)
  src/storage/format.ts (definition at L48)
```

**Decision:** All five functions confirmed orphaned (StatsFooter.tsx deleted in Plan 01 removed the only external consumers). Since all five are orphaned, the entire `format.ts` and `format.test.ts` files were deleted via `git rm`. The `export * from './format'` line was removed from `src/storage/index.ts`.

### Task 3: Add STATS-04 record-and-persist regression block

Appended `describe('STATS-04 record-and-persist regression (CONTEXT D-05 / D-08)', () => { ... })` as the last describe block in `src/storage/practices.test.ts`. Three it cases:

1. **recordResonantSession:** calls `recordResonantSession(40_000, false, { now: () => 1_700_000_000_000 })`, re-reads via `loadPractices()`, asserts `resonant.stats.totalSessions === 1`, `totalElapsedSeconds === 40`, `lastSessionAtMs === 1_700_000_000_000`, `lastSessionDurationSeconds === 40`, and `stretch.stats === ZERO_STATS` + `naviKriya.stats === ZERO_STATS`.

2. **recordStretchSession:** same shape on the stretch slice, asserts resonant and naviKriya remain ZERO_STATS.

3. **recordNaviKriyaSession:** calls `recordNaviKriyaSession(60_000, 3, true, { now: () => 1_700_000_000_000 })`, asserts `totalSessions === 1`, `totalElapsedSeconds === 60`, `lastSessionAtMs === 1_700_000_000_000`, `lastSessionDurationSeconds === 60`, `roundsCompleted === 3`, and resonant + stretch remain ZERO_STATS.

All three use existing imports only (`recordResonantSession`, `recordStretchSession`, `recordNaviKriyaSession`, `loadPractices`, `ZERO_STATS`). Uses the existing `beforeEach`/`afterEach` `localStorage.clear()` seam. No React render, no integration smoke.

## D-05 STATE_VERSION Lock Verification

`git show main:src/storage/storage.ts | grep "STATE_VERSION ="` and local file both return:

```
export const STATE_VERSION = 3 as const
```

STATE_VERSION is unchanged across Plans 01 + 02. ✓

## Grep Orphan-Verification Summary (Auditable)

| Function | Non-self consumers after Plan 01 | Decision |
|---|---|---|
| `formatLastSession` | None (StatsFooter deleted Plan 01) | Deleted |
| `formatLastSessionDate` | None (only inside formatLastSession) | Deleted |
| `formatLastSessionDuration` | None (only inside formatLastSession) | Deleted |
| `formatTotalMinutes` | None (StatsFooter deleted Plan 01) | Deleted |
| `formatSessionCount` | None (StatsFooter deleted Plan 01) | Deleted |

Since all five are deleted, entire `format.ts` and `format.test.ts` removed; barrel re-export removed.

## Requirements Closed

- **STATS-03:** Data-layer half closed — `resetPracticeStats` removed from `src/storage/practices.ts` (Plan 01 closed the UI half by deleting `ResetStatsDialog`). No reset affordance anywhere in the codebase.
- **STATS-04:** Record-and-persist regression in `src/storage/practices.test.ts` — three it cases (resonant / stretch / naviKriya) confirm envelope round-trip is lossless across the v3 `practices.{resonant,stretch,naviKriya}.stats` slices.

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 1 - Bug] Unused ZERO_STATS import in practices.ts (tsc -b TS6133)**

- **Found during:** Full build verification (`npm run build` = `tsc -b && vite build`) after Task 1 commit
- **Issue:** `ZERO_STATS` was imported from `./stats` alongside `coerceStats` and `COUNT_THRESHOLD_MS` but was only consumed by `resetPracticeStats` (now deleted). `tsc --noEmit` masked this because it runs without project references; `tsc -b` surfaced TS6133: 'ZERO_STATS' is declared but its value is never read.
- **Fix:** Removed `ZERO_STATS` from the import line in `src/storage/practices.ts`.
- **Files modified:** `src/storage/practices.ts`
- **Commit:** `0491cf1`

## Pre-handoff for Plan 03

Forbidden-token scan of `src/components/` + `src/app/` (non-test files):

```
grep -rn "StatsFooter|ResetStatsDialog|resetPracticeStats|formatLastSession" \
  src/components/ src/app/ --include="*.ts" --include="*.tsx" | grep -v "\.test\."
```

**Result: zero hits.** All five app surfaces (Idle, Running, Complete, Learn, App Settings) are free of stats UI tokens. The STATS-05 drift-guard test (Plan 03) will lock this state permanently.

## Known Stubs

None. All changes are deletions or a new unit regression test.

## Threat Flags

None. This plan deletes dead code and adds a unit test. No new network endpoints, auth paths, file access patterns, or schema changes.

## Self-Check

- [x] `src/storage/format.ts` does not exist
- [x] `src/storage/format.test.ts` does not exist
- [x] `src/storage/practices.ts` exists and does not export `resetPracticeStats`
- [x] `src/storage/practices.test.ts` contains exactly one STATS-04 describe block
- [x] `grep -rE "resetPracticeStats|formatLastSession" src/` returns no matches
- [x] `grep "export * from './format'" src/storage/index.ts` returns no match
- [x] Commits `3031ea5`, `f914e65`, `0bab60c`, `0491cf1` all exist in git log
- [x] `npm run build` (tsc -b && vite build) exits 0
- [x] `npx vitest run` exits 0 — 1202/1202 tests pass

## Self-Check: PASSED
