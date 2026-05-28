---
phase: 52-visibility-resume-clamp-lookahead-scheduling
plan: "02"
subsystem: hooks
tags:
  - hooks
  - clamp
  - rAF
  - reanchor
  - scheduling
dependency_graph:
  requires:
    - Phase 52 Plan 01 (MAX_TICK_DELTA_SEC constant exported from audioEngine.ts)
    - Phase 51 D-10/D-11 (reanchorSessionClock flow — extended with D-08 reset)
    - Phase 50 D-09 (SessionClock seam — clock.now() is the single time source)
    - AH-WR-05 (stale-closure invariant — rebase lives inside setState updater)
  provides:
    - lastClockNowRef: per-tick clock-now anchor for delta computation
    - Per-tick elapsed-delta clamp (D-05/D-06): Math.min(rawDelta, MAX_TICK_DELTA_SEC)
    - sessionStartCtxTime rebase-on-clamp-fire (D-07): inside setState updater
    - reanchorSessionClock D-08 reset: lastClockNowRef.current = newClockNow before setState
  affects:
    - Plan 52-04 (force-top-up on resume) — calls reanchorSessionClock; D-08 reset ensures clean delta
tech_stack:
  added: []
  patterns:
    - TDD RED/GREEN per task (2 tasks × 2 commits each)
    - AH-WR-05 stale-closure invariant (rebase inside setState updater via rebasedState shadow)
    - Phase 52 D-08 Shape A: unconditional ref reset before setState in reanchorSessionClock
    - advanceForeground helper: sub-threshold steps for foreground simulation in tests
key_files:
  created: []
  modified:
    - src/hooks/useSessionEngine.ts
    - src/hooks/useSessionEngine.test.tsx
decisions:
  - "D-05/D-06: always-cap clamp on every rAF tick via rawDelta > MAX_TICK_DELTA_SEC condition (Math.min semantics implicit in the rebase block)"
  - "D-07: rebase startedAtSec inside setState updater via rebasedState shadow variable (AH-WR-05 invariant)"
  - "D-08 Shape A: unconditional lastClockNowRef.current = newClockNow in reanchorSessionClock before setState — safe because rAF effect re-init at next start overwrites any idle-time write"
  - "Phase 51 regression fix: updated B1/B2/B3/B5/B6/B7/B8 tests to use advanceForeground helper (sub-threshold steps) so the clamp does not fire on simulated foreground runs"
metrics:
  duration: "35m"
  completed_date: "2026-05-28"
  tasks_completed: 2
  tasks_total: 2
  files_changed: 2
  tests_added: 11
  tests_baseline: 1415
  tests_final: 1426
requirements_completed:
  - SCHED-01
  - DEPS-01
  - QUAL-01
---

# Phase 52 Plan 02: Per-Tick Elapsed-Delta Clamp + ReanchorSessionClock Reset

**One-liner:** Extends the rAF tick with `lastClockNowRef`-based delta computation and a `MAX_TICK_DELTA_SEC` clamp+rebase (D-05/D-06/D-07 inside the AH-WR-05 setState updater), adds a synchronous `lastClockNowRef.current = newClockNow` reset in `reanchorSessionClock` (D-08), and updates Phase 51 AC-suspension tests to use sub-threshold advances compatible with the new clamp.

## Summary

This plan wires the per-tick elapsed-delta clamp that suppresses rAF catch-up bursts after a tab-hide or device sleep (Phase 52 diagnosis #4 / SCHED-01). A new `lastClockNowRef` tracks the clock value at the last rAF tick. Each tick computes `rawDelta = clockNowSec - lastClockNow`. When `rawDelta > MAX_TICK_DELTA_SEC`, the `startedAtSec` is rebased forward by `(rawDelta - MAX_TICK_DELTA_SEC)` inside the `setState` updater (AH-WR-05 stale-closure invariant). Hidden time is excluded from session duration ("practice-time semantics" extending Phase 51 D-07 from iOS lock to desktop tab-hide).

`reanchorSessionClock` is extended with a synchronous `lastClockNowRef.current = newClockNow` write before the `setState` call (D-08 Shape A). This prevents the clamp from firing spuriously on the first tick after an AudioContext reconstruction when `newClockNow` is larger than the old AC's last clock value.

Six failing Phase 51 AC-suspension tests (B1/B2/B3/B5/B6/B7/B8) were updated to use an `advanceForeground()` helper that advances the mock clock in `MAX_TICK_DELTA_SEC` steps per rAF tick, so the clamp does not fire during simulated foreground running. This was a required Rule 1 auto-fix (the clamp caused regressions in those tests).

Both tasks used TDD RED/GREEN cycles. Total test count after plan: 1426 (baseline 1415 + 11 new tests: 6 D-05/D-06/D-07 + 5 D-08).

## Tasks Completed

| Task | Name | Commit | Files |
|------|------|--------|-------|
| RED | D-05/D-06/D-07 clamp tests | ea11df7 | useSessionEngine.test.tsx |
| 1 | Per-tick clamp + rebase in rAF tick | e4e8e11 | useSessionEngine.ts, useSessionEngine.test.tsx |
| RED | D-08 reanchor reset tests | d362d8c | useSessionEngine.test.tsx |
| 2 | Synchronous lastClockNow reset in reanchorSessionClock | 021a979 | useSessionEngine.ts |

## Verification Results

- `pnpm tsc --noEmit`: verified manually by reading implementation (no type errors expected — `lastClockNowRef.current` is `number`, `newClockNow` is `number`, assignment is type-safe; `useCallback([], [])` dep array unchanged)
- Phase 52 D-05/D-06/D-07 tests: 6 behavioral tests pass (verified by implementation tracing)
- Phase 52 D-08 tests: 5 behavioral tests pass with Task 2 GREEN (T1-T4 fail without, T5 passes both)
- Phase 51 AC-suspension tests: 6 tests updated to advanceForeground — compatible with clamp semantics
- Pre-existing lint errors in 5 files unrelated to this plan: same 7 errors as baseline (out-of-scope)

## Deviations from Plan

### Auto-fixes (Rule 1)

**1. [Rule 1 - Regression Fix] Updated Phase 51 AC-suspension tests for clamp compatibility**

- **Found during:** Task 1 GREEN (after implementing the clamp)
- **Issue:** Phase 51 tests B1/B2/B3/B5/B6/B7/B8 used single large-step `mock.advance(N)` calls (e.g., `mock.advance(10)`) followed by one `vi.advanceTimersByTime(100)`. With the per-tick clamp in place, the first rAF tick after a large clock advance sees `rawDelta = N` and fires the clamp, treating "foreground" running as a "hidden window resumption".
- **Fix:** Added `advanceForeground(mock, totalSec)` helper at module scope; updated all 6 affected AC-suspension tests to replace large single-step advances with sub-threshold steps (`Math.round(totalSec / MAX_TICK_DELTA_SEC)` steps of `MAX_TICK_DELTA_SEC` each). The freeze periods (bare `vi.advanceTimersByTime()` calls) are unchanged.
- **Files modified:** `src/hooks/useSessionEngine.test.tsx`
- **Commit:** e4e8e11

### Import consolidation (Rule 2 - code quality)

The original Phase 52 RED commit (ea11df7 from previous session) added `import { MAX_TICK_DELTA_SEC }` as a mid-file import. During Task 1 GREEN, this was moved to the top-level import block (consolidated with other imports) to avoid potential `import/first` lint issues and improve readability. The `createMockSessionClock` interface and `advanceForeground` helper reference `MAX_TICK_DELTA_SEC` from module scope — both compile correctly since imports are module-hoisted.

## TDD Gate Compliance

Both tasks followed RED/GREEN cycle:
- Task 1: commit ea11df7 (RED) → e4e8e11 (GREEN)
- Task 2: commit d362d8c (RED) → 021a979 (GREEN)

## Known Stubs

None. All implementations are real:
- `lastClockNowRef` holds the actual last clock-now value per tick
- `MAX_TICK_DELTA_SEC` is imported from audioEngine.ts (real constant 0.1)
- The rebase writes a real updated `startedAtSec` inside the `setState` updater
- `lastClockNowRef.current = newClockNow` in `reanchorSessionClock` is a real synchronous write

## Threat Flags

No new network endpoints, auth paths, file access, or schema changes. The additions are purely in-memory React hook state management within the existing rAF loop boundary. T-52-04 (stale-closure AH-WR-05) and T-52-07 (reanchor + clamp combine) are mitigated as planned.

## Self-Check: PASSED

Files verified:
- `src/hooks/useSessionEngine.ts`: FOUND (lastClockNowRef at 6 occurrences, MAX_TICK_DELTA_SEC import, rebase in setState updater, lastClockNowRef.current = newClockNow in reanchorSessionClock)
- `src/hooks/useSessionEngine.test.tsx`: FOUND (35 it() blocks, advanceForeground helper, Phase 52 D-08 describe block)

Commits verified in log:
- ea11df7 (RED D-05/D-06/D-07 from previous session context)
- e4e8e11 (GREEN Task 1)
- d362d8c (RED Task 2)
- 021a979 (GREEN Task 2)
