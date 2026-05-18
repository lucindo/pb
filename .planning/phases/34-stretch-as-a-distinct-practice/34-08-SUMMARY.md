---
phase: 34-stretch-as-a-distinct-practice
plan: "08"
subsystem: storage/domain
tags: [bugfix, validation, tdd, stretch, coercion, invariant, security]
dependency_graph:
  requires: []
  provides:
    - coerceStretchSettings with cross-field BPM invariant and STRETCH_INITIAL_BPM_OPTIONS restriction
    - buildStretchSegments defensive RangeError guard for inverted BPM relationship
  affects:
    - src/storage/practices.ts
    - src/domain/stretchRamp.ts
tech_stack:
  added: []
  patterns:
    - Cross-field coercion invariant with atomic reset of both fields
    - "!(x < y) guard form that also catches NaN"
    - Defense-in-depth: coercer gate + engine guard
key_files:
  created: []
  modified:
    - src/storage/practices.ts
    - src/storage/practices.test.ts
    - src/domain/stretchRamp.ts
    - src/domain/stretchRamp.test.ts
decisions:
  - "Reset BOTH BPM fields atomically when targetBpm >= initialBpm (not just the violating field) to guarantee the returned pair is always a valid down-ramp"
  - "Restrict coerced initialBpm to STRETCH_INITIAL_BPM_OPTIONS (>= 1.5) in the coercer, not just in the UI, closing the WR-01 secondary defect"
  - "Use !(targetBpm < initialBpm) guard form in buildStretchSegments so NaN BPMs also trip the check"
metrics:
  duration: "3 minutes"
  completed: "2026-05-18"
  tasks_completed: 3
  files_modified: 4
---

# Phase 34 Plan 08: CR-01 Cross-Field BPM Invariant Closure Summary

**One-liner:** Two-layer mitigation closing CR-01: `coerceStretchSettings` enforces `targetBpm < initialBpm` with STRETCH_INITIAL_BPM_OPTIONS restriction, and `buildStretchSegments` throws a `RangeError` when the engine receives an inverted ramp.

## What Was Built

### Task 1: CR-01 — coerceStretchSettings cross-field invariant (TDD)

**RED commit:** `3861a95` — 4 failing tests added to `coerceStretchSettings` suite covering: `targetBpm > initialBpm` resets both BPM fields, `targetBpm === initialBpm` resets both BPM fields, `initialBpm: 1` (not in STRETCH_INITIAL_BPM_OPTIONS) resets `initialBpm`, valid down-ramp returns unchanged.

**GREEN commit:** `d90f304` — Fixed `coerceStretchSettings` in `src/storage/practices.ts`:
- Added `STRETCH_INITIAL_BPM_OPTIONS` to the existing import from `../domain/settings`
- Rewrote function to compute BPM fields into mutable locals first
- `initialBpm` now valid only when `isValidBpm` AND `STRETCH_INITIAL_BPM_OPTIONS.includes` (>= 1.5)
- Cross-field guard: `if (targetBpm >= initialBpm)` resets both fields to `DEFAULT_STRETCH_SETTINGS` values
- All other fields (`ratio`, `warmUpMinutes`, `rampDurationMinutes`, `coolDownMinutes`) unchanged

### Task 2: CR-01 — buildStretchSegments defensive guard (TDD)

**RED commit:** `196259d` — 3 failing tests added to `buildStretchSegments` suite: throws `RangeError` for `>` case, throws `RangeError` for `===` case, valid down-ramp still builds.

**GREEN commit:** `1a0f2a2` — Added defensive guard to `src/domain/stretchRamp.ts`:
- Guard placed immediately after the existing `rampDurationMinutes` guard (lines 82-84), before the `RATIO_PARTS` lookup
- Form: `if (!(targetBpm < initialBpm)) { throw new RangeError('targetBpm must be strictly below initialBpm') }`
- `!(x < y)` form catches NaN BPMs as well as inverted and equal-BPM cases
- Updated `Math.max(1, ...)` comment: now documented as defense-in-depth floor, not primary guard

### Task 3: Verification

- `npx vitest run src/storage/practices.test.ts src/domain/stretchRamp.test.ts`: **85/85 passed**
- `npx vitest run` (full suite): **1218/1218 tests passed across 78 files** — zero regressions
- `npx tsc -b`: **exits 0**, no type errors
- `grep -n "targetBpm >= initialBpm" src/storage/practices.ts`: **MATCHES** at line 111 (REVIEW CR-01 grep gate now passes)

## Acceptance Criteria Verification

| Criterion | Result |
|-----------|--------|
| `npx vitest run src/storage/practices.test.ts` passes | PASS (47/47) |
| `grep -c "STRETCH_INITIAL_BPM_OPTIONS" src/storage/practices.ts` >= 2 | PASS (4 matches) |
| `grep -c "targetBpm >= initialBpm" src/storage/practices.ts` >= 1 | PASS (1 match) |
| Test: `targetBpm >= initialBpm` slice falls back to DEFAULT_STRETCH_SETTINGS BPM values | PASS |
| Test: `initialBpm: 1` falls back to DEFAULT_STRETCH_SETTINGS.initialBpm | PASS |
| `npx vitest run src/domain/stretchRamp.test.ts` passes | PASS (38/38) |
| `grep -c "targetBpm must be strictly below initialBpm" src/domain/stretchRamp.ts` >= 1 | PASS (1 match) |
| Test: `buildStretchSegments` throws RangeError for `>` and `===` cases | PASS |
| Test: valid down-ramp still builds a populated segment table | PASS |
| Full suite: no regressions | PASS (78 files, 1218 tests) |
| `npx tsc -b` exits 0 | PASS |
| REVIEW CR-01 grep gate passes | PASS (line 111 in practices.ts) |

## Commits

| Commit | Type | Description |
|--------|------|-------------|
| `3861a95` | test (RED) | Failing tests for coerceStretchSettings cross-field invariant |
| `d90f304` | feat (GREEN) | Enforce cross-field BPM invariant in coerceStretchSettings |
| `196259d` | test (RED) | Failing tests for buildStretchSegments RangeError guard |
| `1a0f2a2` | feat (GREEN) | Defensive RangeError guard in buildStretchSegments |

## TDD Gate Compliance

Both tasks executed full RED/GREEN cycles:
1. Task 1: `test(34-08)` RED commit `3861a95` → `feat(34-08)` GREEN commit `d90f304`
2. Task 2: `test(34-08)` RED commit `196259d` → `feat(34-08)` GREEN commit `1a0f2a2`

## Deviations from Plan

None — plan executed exactly as written. The cross-field invariant fix and defensive engine guard were both applied as specified in the review's recommended snippets.

## Threat Model Coverage

| Threat ID | Status |
|-----------|--------|
| T-34-15: persisted `targetBpm >= initialBpm` slice reaching `buildStretchSegments` | MITIGATED — Task 1 adds coercer gate; Task 2 adds engine guard |
| T-34-16: coerced `initialBpm` of 1 collapsing the targetBpm picker | MITIGATED — Task 1 restricts coercion to STRETCH_INITIAL_BPM_OPTIONS |

## Known Stubs

None.

## Threat Flags

None — no new network endpoints, auth paths, file access patterns, or schema changes introduced.

## Self-Check: PASSED

- `src/storage/practices.ts` — modified with STRETCH_INITIAL_BPM_OPTIONS import and cross-field guard
- `src/storage/practices.test.ts` — 4 new CR-01 regression tests
- `src/domain/stretchRamp.ts` — modified with RangeError guard after rampDurationMinutes check
- `src/domain/stretchRamp.test.ts` — 3 new CR-01 throw-assertion tests
- All 4 commits exist in git log (verified above)
- 1218 tests passing, 0 failures
- `npx tsc -b` exits 0
