---
phase: 34-stretch-as-a-distinct-practice
plan: "06"
subsystem: domain/components/hooks
tags: [gap-closure, stretch, cr-01, wr-01, wr-03, tdd, regression]
dependency_graph:
  requires: [34-01, 34-02, 34-03, 34-04, 34-05]
  provides: [CR-01-closed, WR-01-closed, WR-03-closed]
  affects: [stretchRamp.ts, LearnDialog.tsx, sessionController.ts, useSessionEngine.ts]
tech_stack:
  added: []
  patterns: [TDD RED-GREEN cycle, deviation rule 1 (bug ripple fix)]
key_files:
  created: []
  modified:
    - src/domain/stretchRamp.ts
    - src/domain/stretchRamp.test.ts
    - src/components/LearnDialog.tsx
    - src/components/LearnDialog.test.tsx
    - src/domain/sessionController.ts
    - src/domain/sessionController.test.ts
    - src/hooks/useSessionEngine.ts
    - src/hooks/useSessionEngine.test.tsx
    - src/components/SettingsForm.stretch.test.tsx
decisions:
  - "computeStretchTotalMs derives from snapped segment table (buildStretchSegments) not raw minute sum — same source of truth as getStretchFrame isComplete"
  - "startStretchSession takes 3 args: stretchSettings, selectedSettings (resonant), nowMs — selectedSettings passes through, lockedSettings carries synthetic lead-in"
  - "LearnDialog videosHeading follows practiceContentKey (resolved key) not raw activePractice"
metrics:
  duration_seconds: 321
  completed_date: "2026-05-18"
  tasks_completed: 4
  files_changed: 9
---

# Phase 34 Plan 06: Gap Closure (CR-01, WR-01, WR-03) Summary

Three verification/review gaps from Phase 34 closed with TDD regression tests: CR-01 (displayed stretch Duration disagrees with real session end), WR-01 (LearnDialog shows wrong videos heading for Stretch practice), and WR-03 (stretch session clobbers resonant selectedSettings).

## What Was Built

### CR-01: computeStretchTotalMs now derives from the snapped segment table

`computeStretchTotalMs` in `src/domain/stretchRamp.ts` previously returned `(warmUpMinutes + rampDurationMinutes + coolDownMinutes) * 60_000` — a raw minute sum. The actual session completion is governed by `buildStretchSegments`, which snaps every segment to a whole number of cycles. For default settings (5.5→4.5 BPM, 5+5+5 min) the discrepancy was 3,220 ms. The fix derives the total from `segments[segments.length - 1]!.endMs` — the same value `getStretchFrame` uses for `isComplete`. The displayed Duration in `SettingsForm` now agrees with the elapsed time at which the session reports complete.

### WR-01: LearnDialog videos heading tracks practiceContentKey

`videosHeading` in `LearnDialog.tsx` was derived from `activePractice === 'resonant' ? ...` — so Stretch (not 'resonant') showed the Navi Kriya heading above resonant content. Fixed to use `practiceContentKey === 'resonant' ? ...` (the already-resolved key that maps stretch→resonant). The heading now always matches the content actually rendered.

### WR-03: startStretchSession preserves caller's resonant selectedSettings

`startStretchSession` in `sessionController.ts` previously assigned the synthetic lead-in settings to both `selectedSettings` and `lockedSettings`. After a stretch session ends, `endSession` returns `selectedSettings: cloneSettings(state.selectedSettings)`, clobbering the engine's resonant config. Fix: add `selectedSettings: SessionSettings` as the new second parameter; pass the caller's resonant config to `selectedSettings`, keep the synthetic lead-in in `lockedSettings` only. Updated `useSessionEngine.ts` to pass `currentState.selectedSettings` as the new middle argument to `startStretchSession`.

## Tests Added

- `stretchRamp.test.ts`: 2 CR-01 regression tests — one for cycle-aligned baseSettings and one for non-cycle-aligned BPM drift fixture (proves `computeStretchTotalMs !== rawMinuteSum` and equals segment table)
- `LearnDialog.test.tsx`: 3 WR-01 regression tests covering all three `activePractice` values (stretch / resonant / naviKriya)
- `sessionController.test.ts`: 3 WR-03 regression tests — `selectedSettings` equals resonant config, `lockedSettings` is synthetic lead-in, `endSession` returns resonant settings; all existing tests updated to new 3-arg signature
- `useSessionEngine.test.tsx`: 1 engine-level round-trip test — idle `state.selectedSettings` equals resonant initialSettings after stretch start→end cycle

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 1 - Bug] Pre-existing computeStretchTotalMs tests asserted wrong values**
- **Found during:** Task 1 GREEN phase
- **Issue:** Two tests in `stretchRamp.test.ts` (`'returns (warmUp + ramp + coolDown) minutes'` and `'the minimum stretch total is 15 minutes'`) asserted raw minute-sum values that are now wrong after the CR-01 fix. The code review identified these as a "coverage gap" — the fixture BPMs happened to appear cycle-aligned in some tests while silently hiding the drift in others.
- **Fix:** Updated test assertions to derive expected value from `buildStretchSegments(...).at(-1)!.endMs` dynamically, matching the corrected behavior.
- **Files modified:** `src/domain/stretchRamp.test.ts`
- **Commit:** fce4f24

**2. [Rule 1 - Bug] SettingsForm.stretch.test asserted hardcoded '15 min' (raw sum)**
- **Found during:** Task 4 full-suite run
- **Issue:** `SettingsForm.stretch.test.tsx` asserted `'15 min'` for the Duration display. After the CR-01 fix, `computeStretchTotalMs(DEFAULT_STRETCH_SETTINGS)` returns the snapped value (~15.054 min for 5.5→4.5 BPM), not `15 * 60_000`. The test was asserting the old (wrong) behavior.
- **Fix:** Updated the test to derive expected text dynamically from `computeStretchTotalMs(DEFAULT_STRETCH_SETTINGS)`.
- **Files modified:** `src/components/SettingsForm.stretch.test.tsx`
- **Commit:** 3fe5e04

**3. [Rule 1 - Bug] tsc error in drift-fixture rawMinuteSum computation**
- **Found during:** Task 4 tsc gate
- **Issue:** `coolDownMinutes` is typed `number | 'open-ended'`; TypeScript rejected the arithmetic `driftSettings.warmUpMinutes + ... + driftSettings.coolDownMinutes`. The fixture value is a literal `5`, so used the literal directly.
- **Fix:** Replaced field access with literal `(5 + 5 + 5) * 60_000`.
- **Files modified:** `src/domain/stretchRamp.test.ts`
- **Commit:** 9960a45

## Verification Results

- `npx vitest run src/domain/stretchRamp.test.ts src/components/LearnDialog.test.tsx src/domain/sessionController.test.ts src/hooks/useSessionEngine.test.tsx` — 101/101 tests pass
- `npx vitest run` — 1211/1211 tests pass (78 files)
- `npx tsc -b` — exits 0, no type errors

## Self-Check: PASSED

| Check | Result |
|-------|--------|
| src/domain/stretchRamp.ts | FOUND |
| src/components/LearnDialog.tsx | FOUND |
| src/domain/sessionController.ts | FOUND |
| src/hooks/useSessionEngine.ts | FOUND |
| 34-06-SUMMARY.md | FOUND |
| commit 4f6f08c (test RED CR-01) | FOUND |
| commit fce4f24 (feat CR-01 fix) | FOUND |
| commit 1c4cf07 (test RED WR-01) | FOUND |
| commit 2d537d6 (feat WR-01 fix) | FOUND |
| commit 88779f3 (test RED WR-03) | FOUND |
| commit 89140f5 (feat WR-03 fix) | FOUND |
| commit 9960a45 (fix tsc drift test) | FOUND |
| commit 3fe5e04 (fix SettingsForm test) | FOUND |
| 1211/1211 vitest tests pass | PASS |
| npx tsc -b exits 0 | PASS |
