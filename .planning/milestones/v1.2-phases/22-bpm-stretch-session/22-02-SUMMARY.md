---
phase: 22-bpm-stretch-session
plan: 02
subsystem: domain
tags: [stretch, bpm, storage, session-controller, forward-compat]
dependency_graph:
  requires:
    - phase: 22-01
      provides: [stretchRamp engine, SessionMode schema, DEFAULT_STRETCH_SETTINGS, isValid* predicates]
  provides:
    - coerceSettings per-field stretch fallback (forward-compat read)
    - RunningSessionState.stretchSegments field
    - stretch-aware startSession + completeIfNeeded dispatch
    - extendTimedSession rejection of stretch sessions
  affects: [src/components/SettingsForm.tsx, src/components/SessionReadout.tsx, src/app/App.tsx]
tech_stack:
  added: []
  patterns: [piecewise segment-table dispatch in completeIfNeeded, per-field forward-compat coercer]
key_files:
  created: []
  modified:
    - src/storage/settings.test.ts
    - src/domain/sessionController.ts
    - src/domain/sessionController.test.ts
decisions:
  - "Task 1 coerceSettings was already extended by Plan 22-01's deviation fix (total SessionSettings type); Plan 22-02 Task 1 contributes the stretch test coverage only"
  - "Stretch lead-in plan built at initialBpm via a settings clone so cue duration matches the warm-up rate"
  - "completeIfNeeded branches on stretchSegments !== null; standard sessions byte-unchanged"
requirements-completed: [STRETCH-04, STRETCH-05, STRETCH-07]
metrics:
  duration: "~18 min"
  completed: "2026-05-15"
  tasks_completed: 2
  files_modified: 3
---

# Phase 22 Plan 02: Stretch Stateful Wiring Summary

**Stretch settings persist via the existing forward-compat localStorage envelope (no STATE_VERSION bump) and sessionController dispatches frame computation to the stretchRamp segment table for stretch sessions.**

## Performance

- **Duration:** ~18 min
- **Completed:** 2026-05-15
- **Tasks:** 2
- **Files modified:** 3

## Accomplishments
- `coerceSettings` stretch test coverage: full round-trip, old-envelope forward-compat, per-field drift fallback, null input
- `RunningSessionState` / `CompleteSessionState` carry a `stretchSegments: StretchSegment[] | null` field
- `startSession` builds the segment table for stretch mode (lead-in plan at `initialBpm`), sets `null` for standard
- `completeIfNeeded` dispatches to `getStretchFrame` when `stretchSegments` is non-null, `getSessionFrame` otherwise
- `extendTimedSession` throws `RangeError` for stretch sessions (CONTEXT D-02)

## Task Commits

1. **Task 1: stretch coverage for coerceSettings** - `6cd2ff2` (test)
2. **Task 2: stretch-aware sessionController** - `4b622b0` (test/RED) → `67b14ce` (feat/GREEN)

## Files Created/Modified
- `src/storage/settings.test.ts` - 6 stretch coerce tests + full stretch round-trip test
- `src/domain/sessionController.ts` - stretchSegments field, stretch-aware startSession/completeIfNeeded, extendTimedSession guard
- `src/domain/sessionController.test.ts` - 6 stretch-mode lifecycle tests

## Decisions Made
- **Task 1 implementation pre-delivered:** `coerceSettings` in `src/storage/settings.ts` already carried all 6 stretch fields — Plan 22-01's deviation #1 (total `SessionSettings` type) extended the coercer to keep `tsc` green. Plan 22-02 Task 1 therefore contributes only the missing stretch test coverage. No production change to `settings.ts` was needed; no `STATE_KEY`/`STATE_VERSION` bump.
- Stretch lead-in `plan` built from a settings clone with `bpm: initialBpm` so the lead-in cue duration matches the warm-up rate.
- `completeIfNeeded` branches on `state.stretchSegments !== null`; standard-session behavior is byte-unchanged.

## Deviations from Plan

**1. [Rule 1 - Pre-existing] Task 1 production code already shipped**
- **Found during:** Task 1 (`coerceSettings` extension)
- **Issue:** The plan's Task 1 action (extend `coerceSettings` with 6 stretch fields) was already satisfied — Plan 22-01's deviation fix extended the coercer when the total `SessionSettings` type broke `tsc`.
- **Fix:** Verified the existing coercer matches the plan's specified per-field `isValidX(r.x) ? r.x : DEFAULT` pattern exactly; added the prescribed test coverage only.
- **Files modified:** `src/storage/settings.test.ts` (tests only)
- **Verification:** `npx vitest run src/storage/settings.test.ts` 37/37 pass; `tsc --noEmit` exits 0; no `STATE_VERSION` bump.
- **Committed in:** `6cd2ff2`

---

**Total deviations:** 1 (pre-existing production code from upstream plan)
**Impact on plan:** No scope change. Task 1 collapsed to test-only work because Plan 22-01 pre-delivered the production change. All Task 1 acceptance criteria still verified.

## Issues Encountered
None.

## Verification Results
- `npx vitest run` — 827/827 tests pass (58 files)
- `npx tsc --noEmit` — exits 0
- `npm run lint` — exits 0
- `npm run build` — exits 0
- `grep -c STATE_VERSION src/storage/storage.ts` — unchanged (no version bump)

## User Setup Required
None.

## Next Phase Readiness
- Domain + storage + controller layers are stretch-aware. Plan 22-04 can build the SettingsForm mode picker and SessionReadout against the persisted stretch settings and the stretch frame fields.

## Self-Check: PASSED
- FOUND: src/domain/sessionController.ts
- FOUND: src/storage/settings.test.ts
- FOUND: src/domain/sessionController.test.ts
- FOUND: commits 6cd2ff2, 4b622b0, 67b14ce

---
*Phase: 22-bpm-stretch-session*
*Completed: 2026-05-15*
