---
phase: 22-bpm-stretch-session
plan: 01
subsystem: domain
tags: [typescript, vitest, pure-functions, settings, ramp-engine, bpm-stretch]

# Dependency graph
requires:
  - phase: 22-bpm-stretch-session-context
    provides: D-01 through D-11 decisions, stretch settings fields, gate predicate, segment table design

provides:
  - SessionMode type + MODE_OPTIONS + isValidMode predicate
  - HoldSecondsOption/HoldTargetOption types + HOLD_SECONDS_OPTIONS/HOLD_TARGET_OPTIONS/RAMP_DURATION_OPTIONS
  - STRETCH_INITIAL_BPM_OPTIONS (BPM_OPTIONS filtered to >= 1.5)
  - DEFAULT_STRETCH_SETTINGS (holdInitial:0 + ramp:20min + holdTarget:0 = 20-min total)
  - isValidHoldSeconds, isValidHoldTarget, isValidRampDuration predicates
  - SessionSettings extended with 6 required stretch fields (mode, initialBpm, targetBpm, holdInitialSeconds, holdTargetSeconds, rampDurationMinutes)
  - validateSettings extended with mode check + stretch-mode field validation (D-01 down-only)
  - stretchRamp.ts: StretchStage, StretchSegment, StretchSessionFrame, STRETCH_MIN_TOTAL_MS
  - buildStretchSegments, getStretchFrame, computeStretchTotalMs, isStretchGateClear
  - SessionFrame extended with optional stretch-only fields (cycleStartMs, currentCycleMs, currentBpm, stage, etc.)
  - coerceSettings updated with all 9 required fields (per-field fallback pattern)

affects:
  - 22-02 (sessionController wiring + storage coercer)
  - 22-03 (SettingsForm UI)
  - 22-04 (SessionReadout live BPM + stage label)
  - 22-05 (App.tsx audio boundary effect for stretch)

# Tech tracking
tech-stack:
  added: []
  patterns:
    - "Options-array + type-guard predicate pattern (isValidMode, isValidHoldSeconds, isValidHoldTarget, isValidRampDuration)"
    - "Piecewise-constant segment table for variable-BPM ramp (buildStretchSegments)"
    - "Absolute cycleIndex via cycleBaseIndex (Pitfall 1 avoidance)"
    - "Last-segment cycleMs rounding for isComplete (Pitfall 3 avoidance)"
    - "totalMs null convention for open-ended sessions (Pitfall 6 avoidance)"

key-files:
  created:
    - src/domain/stretchRamp.ts
    - src/domain/stretchRamp.test.ts
  modified:
    - src/domain/settings.ts
    - src/domain/settings.test.ts
    - src/domain/sessionMath.ts
    - src/storage/settings.ts
    - src/domain/breathingPlan.test.ts
    - src/domain/sessionController.test.ts
    - src/domain/sessionMath.test.ts
    - src/hooks/useSessionEngine.test.tsx
    - src/storage/settings.test.ts
    - src/storage/stats.test.ts

key-decisions:
  - "SessionSettings fields made required (total type) so the type is sound; coerceSettings fills all 9 fields from defaults"
  - "Ramp BPM formula: bpm_i = initialBpm - i * bpmSpan / numSteps (i=0..numSteps-1); last step is ~targetBpm but not exactly; hold-target segment carries exact targetBpm"
  - "STRETCH_INITIAL_BPM_OPTIONS starts at 1.5 (not 1.0) to prevent empty targetBpm picker (Pitfall 4)"
  - "Infinity sentinel on open-ended hold-target segment's endMs; session-level totalMs uses null convention"

patterns-established:
  - "buildStretchSegments is pure: takes settings + ratio, returns StretchSegment[]; no side effects"
  - "getStretchFrame: monotonic absolute cycleIndex via cycleBaseIndex; completionMs from last segment's cycleMs"
  - "isValidHoldTarget mirrors isValidDuration: 'open-ended' early return then numeric HOLD_SECONDS_OPTIONS membership"

requirements-completed: [STRETCH-02, STRETCH-03, STRETCH-04, STRETCH-05, STRETCH-06]

# Metrics
duration: 10min
completed: 2026-05-15
---

# Phase 22 Plan 01: Domain Foundation Summary

**Piecewise-constant BPM ramp engine with sub-0.5-BPM step invariant, 15-min gate predicate, open-ended session support, and fully-typed total SessionSettings schema**

## Performance

- **Duration:** ~10 min
- **Started:** 2026-05-15T06:09:42Z
- **Completed:** 2026-05-15T06:20:00Z
- **Tasks:** 2 (both TDD: RED+GREEN)
- **Files modified:** 10 (2 created, 8 modified)

## Accomplishments

- Built the complete stretch settings schema: `SessionMode`, `HoldSecondsOption`, `HoldTargetOption`, `RAMP_DURATION_OPTIONS`, `STRETCH_INITIAL_BPM_OPTIONS`, `DEFAULT_STRETCH_SETTINGS`, plus 4 new predicates and extended `validateSettings` with D-01 down-only invariant
- Created `stretchRamp.ts` with the piecewise-constant segment table engine: `buildStretchSegments` (numSteps = ceil(bpmSpan/0.4999)), `getStretchFrame` (absolute monotonic cycleIndex, last-segment cycle rounding), `computeStretchTotalMs`, `isStretchGateClear`
- Extended `SessionFrame` with optional stretch-only fields (`cycleStartMs`, `currentCycleMs`, `currentBpm`, `stage`, etc.) — standard sessions unchanged
- Full test coverage: 46 settings tests + 35 stretchRamp tests = 81 new tests; full suite 813/813 passing

## Task Commits

1. **Task 1 RED — stretch settings tests** - `459bd07` (test)
2. **Task 1 GREEN — settings.ts implementation** - `f1320ba` (feat)
3. **Task 1 Deviation — coerceSettings + test fixtures** - `e0230ae` (fix)
4. **Task 2 RED — stretchRamp tests** - `866b96f` (test)
5. **Task 2 GREEN — stretchRamp.ts + sessionMath.ts extension** - `bcfd8ad` (feat)

## Files Created/Modified

- `src/domain/stretchRamp.ts` — New pure-domain ramp engine (StretchSegment, buildStretchSegments, getStretchFrame, computeStretchTotalMs, isStretchGateClear, STRETCH_MIN_TOTAL_MS)
- `src/domain/stretchRamp.test.ts` — 35 tests for ramp math, step invariant, gate predicate
- `src/domain/settings.ts` — Extended with 10 new exports: SessionMode, MODE_OPTIONS, HoldSecondsOption, HOLD_SECONDS_OPTIONS, HoldTargetOption, HOLD_TARGET_OPTIONS, RAMP_DURATION_OPTIONS, STRETCH_INITIAL_BPM_OPTIONS, DEFAULT_STRETCH_SETTINGS, isValidMode, isValidHoldSeconds, isValidHoldTarget, isValidRampDuration; SessionSettings extended with 6 required fields; DEFAULT_SETTINGS extended; validateSettings extended
- `src/domain/settings.test.ts` — 23 new test cases covering all new predicates + validateSettings stretch paths
- `src/domain/sessionMath.ts` — SessionFrame extended with 6 optional stretch-only fields
- `src/storage/settings.ts` — coerceSettings updated to return all 9 required fields (per-field fallback)
- `src/domain/breathingPlan.test.ts`, `src/domain/sessionController.test.ts`, `src/domain/sessionMath.test.ts`, `src/hooks/useSessionEngine.test.tsx`, `src/storage/settings.test.ts`, `src/storage/stats.test.ts` — test fixtures updated to spread `DEFAULT_SETTINGS` (deviation fix)

## Decisions Made

- **SessionSettings as total type:** The plan specified required (not optional) stretch fields so the type is fully sound. This required updating `coerceSettings` (storage layer) and 6 test files that passed partial `SessionSettings` objects.
- **Ramp BPM formula:** `bpm_i = initialBpm - i * bpmSpan / numSteps` for i=0..numSteps-1. The last ramp step is approximately targetBpm but not exactly (it's `initialBpm - (numSteps-1)*bpmSpan/numSteps`). The hold-target segment (if any) carries exact targetBpm. This satisfies the < 0.5 BPM step invariant without special-casing.
- **STRETCH_INITIAL_BPM_OPTIONS >= 1.5:** Pitfall 4 — if initialBpm = 1.0, `targetBpm` picker would be empty. Constraining initialBpm minimum to 1.5 ensures at least one valid targetBpm (1.0).
- **Infinity sentinel vs null:** Segment's `endMs = Infinity` for open-ended hold-target; session-level `totalMs = null` (existing convention). `getStretchFrame` translates `totalMs: null` to `remainingMs: null, isComplete: false`.

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 1 - Bug] SessionSettings total type broke existing test fixtures and coerceSettings**
- **Found during:** Task 1 GREEN (running full test suite)
- **Issue:** Making SessionSettings fields required caused 97 test failures and TypeScript errors across 6 test files. `coerceSettings` returned only 3 fields (bpm, ratio, durationMinutes) — now invalid.
- **Fix:** Updated `coerceSettings` in `src/storage/settings.ts` to return all 9 required fields with per-field fallback to `DEFAULT_STRETCH_SETTINGS`. Updated 6 test files to use `{ ...DEFAULT_SETTINGS, ... }` spread pattern. Updated 4 tests using `toEqual` on partial objects to `toMatchObject`.
- **Files modified:** src/storage/settings.ts, src/domain/breathingPlan.test.ts, src/domain/sessionController.test.ts, src/domain/sessionMath.test.ts, src/hooks/useSessionEngine.test.tsx, src/storage/settings.test.ts, src/storage/stats.test.ts
- **Verification:** 813/813 tests pass, tsc passes, lint passes
- **Committed in:** e0230ae

**2. [Rule 1 - Bug] Ramp formula special-casing last step to targetBpm violated < 0.5 BPM invariant**
- **Found during:** Task 2 GREEN (first run of stretchRamp.test.ts)
- **Issue:** Initial implementation forced last ramp step to targetBpm, creating a 0.8 BPM jump (e.g., 4.4 → 4.0 for 6→4 BPM span with 5 steps).
- **Fix:** Removed special-casing; used uniform formula `bpm_i = initialBpm - i * bpmSpan / numSteps` for all i=0..numSteps-1. Updated test expectation for last ramp segment BPM to `>= targetBpm` (correct: hold-target carries exact targetBpm).
- **Files modified:** src/domain/stretchRamp.ts, src/domain/stretchRamp.test.ts
- **Verification:** All 35 stretchRamp tests pass, STRETCH-04 step invariant confirmed
- **Committed in:** bcfd8ad (test update inline)

---

**Total deviations:** 2 auto-fixed (2 Rule 1 bugs)
**Impact on plan:** Both fixes essential for correctness. No scope creep. Plan goals fully achieved.

## Issues Encountered

None beyond the two auto-fixed deviations above.

## Next Phase Readiness

- **22-02 (sessionController + storage):** `RunningSessionState` needs `stretchSegments: StretchSegment[] | null`; `startSession` needs to call `buildStretchSegments` when mode is 'stretch'; `completeIfNeeded` needs to dispatch to `getStretchFrame`; `coerceSettings` already updated
- **22-03 (SettingsForm UI):** All predicates, options arrays, and DEFAULT_STRETCH_SETTINGS are ready; gate predicate `isStretchGateClear` available
- **22-04 (SessionReadout):** `StretchSessionFrame` exports `currentBpm`, `stage`, `cycleStartMs`, `currentInhaleMs`, `currentExhaleMs`
- **22-05 (App.tsx audio boundary):** `SessionFrame` optional fields `cycleStartMs`/`currentCycleMs`/`currentInhaleMs`/`currentExhaleMs` ready for Pattern 2 boundary formula

No blockers.

---

*Phase: 22-bpm-stretch-session*
*Completed: 2026-05-15*

## Self-Check: PASSED

Files verified:
- FOUND: src/domain/stretchRamp.ts
- FOUND: src/domain/stretchRamp.test.ts
- FOUND: src/domain/settings.ts (exports verified)
- FOUND: src/domain/sessionMath.ts (SessionFrame extended)

Commits verified:
- 459bd07: test(22-01): add failing tests for stretch settings schema (RED)
- f1320ba: feat(22-01): extend settings.ts with stretch schema, options, predicates, validation
- e0230ae: fix(22-01): update coerceSettings and test fixtures for total SessionSettings type
- 866b96f: test(22-01): add failing tests for stretchRamp engine (RED)
- bcfd8ad: feat(22-01): create stretchRamp.ts ramp engine and extend SessionFrame
