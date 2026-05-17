---
phase: 31-navi-kriya-engine-session
plan: "03"
subsystem: storage + UI
tags: [nk-stats, practices, persistence, stats-footer, nk-08]
dependency_graph:
  requires: [30-multi-practice-architecture-switcher]
  provides: [recordNaviKriyaSession, roundsCompleted, StatsFooter-rounds-display]
  affects: [src/storage/stats.ts, src/storage/practices.ts, src/components/StatsFooter.tsx, src/content/strings.ts]
tech_stack:
  added: []
  patterns: [per-field non-throwing coercion (ASVS V5), writeEnvelope slice isolation, conditional prop render]
key_files:
  created: []
  modified:
    - src/storage/stats.ts
    - src/storage/stats.test.ts
    - src/storage/practices.ts
    - src/storage/practices.test.ts
    - src/components/StatsFooter.tsx
    - src/components/StatsFooter.test.tsx
    - src/content/strings.ts
decisions:
  - "roundsCompleted added as optional field on PersistedStats (not a separate NK stats type) — backward-compatible, resonant records stay byte-shaped as before"
  - "coerceStats returns undefined (not 0) for absent/invalid roundsCompleted — preserves byte-shape of existing resonant records"
  - "StatsFooter uses showRounds?: boolean prop rather than activePractice prop — minimal surface, pure boolean gate"
  - "PT-BR roundsCompletedLabel stub mirrors EN value; Phase 32 provides real translation"
metrics:
  duration: 9m
  completed: "2026-05-17"
  tasks_completed: 2
  tasks_total: 2
  files_changed: 7
  tests_added: 14
---

# Phase 31 Plan 03: Navi Kriya Stats Storage + StatsFooter Rounds Display Summary

Navi Kriya session stats persistence (NK-08): optional `roundsCompleted` on `PersistedStats`, isolated `recordNaviKriyaSession()` writing only to the naviKriya slice, and conditional rounds figure in `StatsFooter` for Navi Kriya practice.

## Tasks

### Task 1: Extend PersistedStats with roundsCompleted and add recordNaviKriyaSession

**Commit:** f008f1f

Added `roundsCompleted?: number` to `PersistedStats` in `stats.ts` — optional, backward-compatible, resonant records never write it so they stay byte-shaped as before. `coerceStats` validates with `isFiniteNonNegativeInt`; an invalid or absent value coerces to `undefined` (not 0), preserving the field's absence for resonant records (T-31-06).

Added `recordNaviKriyaSession(elapsedMs, roundsCompleted, isComplete, deps)` to `practices.ts` mirroring `recordResonantSession` exactly for the threshold/guard logic, but writing only to `practices.naviKriya.stats` and accumulating `roundsCompleted` (T-31-07 isolation). D-13: early-ended sessions above `COUNT_THRESHOLD_MS` record their completed rounds and elapsed minutes the same way as a natural completion.

Tests added (14 total):
- `coerceStats`: 4 cases — valid integer preserved, absent → undefined, invalid string/negative/float/Infinity → undefined, 0 valid
- `recordNaviKriyaSession`: increments totalSessions + roundsCompleted; accumulates across sessions; NK-08 isolation (resonant stats unchanged); sub-threshold early end not recorded; D-13 above-threshold early end records rounds + minutes; NaN/negative elapsedMs rejected

### Task 2: Show Navi Kriya rounds-completed figure in StatsFooter

**Commit:** 7426c83

Added `showRounds?: boolean` to `StatsFooterProps`. When true (Navi Kriya), renders `{stats.roundsCompleted ?? 0} Rounds` between Line 1 and Line 2. When absent or false (Resonant), component renders exactly as before — no rounds row, no layout change (Pitfall 8 guard).

Added `roundsCompletedLabel` string to `UiStrings.stats` interface, EN value `'Rounds'`, PT-BR stub `'Rounds'` with Phase 32 TODO comment (real translation deferred per plan scope).

Existing tests: all 5 Reset button tests and 4 D-08 layout tests pass unchanged — no resonant regressions.

## Verification

- `npx vitest run src/storage/stats.test.ts src/storage/practices.test.ts src/components/StatsFooter.test.tsx` — 60/60 passed
- `npx vitest run` — 1071/1071 passed (no regressions; prior baseline was 1057, this plan adds 14)
- `npx tsc --noEmit` — no errors

## Deviations from Plan

None — plan executed exactly as written.

**Worktree path safety note:** Initial edits were inadvertently made to the main repo path (`/Users/lucindo/Code/hrv/src/...`) rather than the worktree path. Corrected by copying the modified files to the worktree and reverting the main repo changes before any commit. No functional impact; all commits are on the correct worktree branch.

## Known Stubs

| Stub | File | Line | Reason |
|------|------|------|--------|
| `roundsCompletedLabel: 'Rounds'` (PT-BR) | src/content/strings.ts | ~420 | EN value used as PT-BR stub; real PT-BR translation deferred to Phase 32 per plan scope |

The stub does not prevent the plan's goal: the EN path renders correctly and the PT-BR locale also works (showing "Rounds" is comprehensible). Phase 32 will provide the native translation.

## Self-Check: PASSED

- [x] `src/storage/stats.ts` — `roundsCompleted?` on PersistedStats and in coerceStats: verified
- [x] `src/storage/practices.ts` — `recordNaviKriyaSession` exported: verified
- [x] `src/components/StatsFooter.tsx` — `roundsCompleted` rendered conditionally: verified
- [x] Commit f008f1f exists in git log
- [x] Commit 7426c83 exists in git log
- [x] 1071/1071 tests pass, no TypeScript errors
