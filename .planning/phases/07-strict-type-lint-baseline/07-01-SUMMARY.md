---
phase: 07-strict-type-lint-baseline
plan: "01"
subsystem: build-toolchain
tags: [typescript, strict, noUncheckedIndexedAccess, noImplicitReturns, test-narrowing]
dependency_graph:
  requires: []
  provides: [strict-tsconfig-contract, noUncheckedIndexedAccess-enforced, test-files-tsc-clean]
  affects: [plan-07-02-eslint-stricttypechecked]
tech_stack:
  added: []
  patterns: [Option-A-non-null-assertion-with-Reason-annotation]
key_files:
  created: []
  modified:
    - tsconfig.app.json
    - tsconfig.node.json
    - src/app/App.audio.test.tsx
    - src/app/App.wakeLock.test.tsx
    - src/audio/cueSynth.test.ts
    - src/hooks/useAudioCues.test.tsx
decisions:
  - "D-06 enforced: noUncheckedIndexedAccess landed together with strict + noImplicitReturns in a single commit"
  - "D-10 preserved: noUnusedLocals, noUnusedParameters, erasableSyntaxOnly, noFallthroughCasesInSwitch all retained verbatim"
  - "D-07 honored: no safeAt() helper introduced; all 12 sites use inline Option A non-null assertion with // Reason: annotation"
  - "Option A chosen for all 12 sites: every site had an equivalent length assertion (toHaveBeenCalled/toHaveCalledTimes/toHaveLength) immediately above"
metrics:
  duration: "~11 minutes"
  completed: "2026-05-11T14:26:11Z"
  tasks_completed: 2
  files_modified: 6
---

# Phase 7 Plan 01: Add strict TypeScript flags + fix 12 test-file narrowing errors — Summary

Landed `strict`, `noUncheckedIndexedAccess`, and `noImplicitReturns` in both tsconfigs (surgical inserts after `noFallthroughCasesInSwitch`), then eliminated all 12 surfaced `TS2532/TS18048` errors in four test files using inline Option A non-null assertions with `// Reason:` annotations — zero behavior change, zero production-file touches.

## What Was Built

- **tsconfig.app.json**: Three new flags appended to the `/* Linting */` block after `noFallthroughCasesInSwitch` (D-10). The `include: ["src"]` is unchanged — test files remain inside the app tsconfig (D-03).
- **tsconfig.node.json**: Identical three-flag insert. No `jsx` key (not needed for `vite.config.ts`).
- **Four test files**: 12 `mock.calls[N]` / `mock.results[N]` / `array[0]` accesses narrowed using Option A (non-null assertion `!` preceded by `// Reason:` annotation per D-04 and D-07).

## Final Verification Metrics

| Gate | Result |
|------|--------|
| `npx tsc --noEmit -p tsconfig.app.json` | 0 errors ✓ |
| `npx tsc --noEmit -p tsconfig.node.json` | 0 errors ✓ |
| `npm run build` | exit 0 ✓ |
| `npm run test -- --run` | 363/363 passed ✓ |
| `npm run lint` | 9 problems (7 errors, 2 warnings) — pre-existing baseline, no new regressions ✓ |

**Note on lint count:** The 9 pre-existing problems are from the current `recommended` ESLint preset. The 226-error baseline referenced in RESEARCH.md is from the `strictTypeChecked` preset (Plan 07-02 scope, not yet active). This plan introduced zero new lint errors.

## Per-File Fix Log (Task 2)

### src/app/App.audio.test.tsx — 2 sites, Option A

| Line (pre-fix) | Pattern | Fix Applied | Reason Annotation |
|----------------|---------|-------------|-------------------|
| 148 | `firstCallArgs[1]` (firstCallArgs from `mock.calls` destructure, TS18048) | `firstCallArgs![1]` + `// Reason:` above | "length asserted by toHaveBeenCalled() immediately above" |
| 149 | `firstCallArgs[1]` (TS18048) | `firstCallArgs![1]` + `// Reason:` above | "length asserted by toHaveBeenCalled() above" |

### src/app/App.wakeLock.test.tsx — 4 sites, Option A

| Line (pre-fix) | Pattern | Fix Applied | Reason Annotation |
|----------------|---------|-------------|-------------------|
| 64 | `requestSpy.mock.results[0].value` (TS2532) | `mock.results[0]!.value` | "length asserted by toHaveBeenCalledTimes(1) immediately above" |
| 78 | `requestSpy.mock.results[0].value` (TS2532) | `mock.results[0]!.value` | "startAndAdvancePastLeadIn triggers exactly one wakeLock.request; results[0] is guaranteed populated" |
| 98 | `requestSpy.mock.results[0].value` (TS2532) | `mock.results[0]!.value` | "startAndAdvancePastLeadIn triggers exactly one wakeLock.request; results[0] is guaranteed populated" |
| 118 | `requestSpy.mock.results[0].value` (TS2532) | `mock.results[0]!.value` | "Start session click triggers exactly one wakeLock.request; results[0] is populated by this point" |

### src/audio/cueSynth.test.ts — 4 sites, Option A

| Line (pre-fix) | Pattern | Fix Applied | Reason Annotation |
|----------------|---------|-------------|-------------------|
| 117 | `oscillators[0].type` (TS2532) | `oscillators[0]!.type` | "length asserted by toHaveLength(1) immediately above" |
| 158 | `filters[0].type` (TS2532) | `filters[0]!.type` | "length asserted by toHaveLength(1) immediately above" |
| 159 | `filters[0].frequency.value` (TS2532) | `filters[0]!.frequency.value` | "length asserted by toHaveLength(1) above" |
| 160 | `filters[0].Q.value` (TS2532) | `filters[0]!.Q.value` | "length asserted by toHaveLength(1) above" |

### src/hooks/useAudioCues.test.tsx — 2 sites, Option A

| Line (pre-fix) | Pattern | Fix Applied | Reason Annotation |
|----------------|---------|-------------|-------------------|
| 647 | `reanchorSpy.mock.calls[0][0]` (TS2532) | `mock.calls[0]![0]` | "length asserted by toHaveBeenCalledTimes(1) immediately above" |
| 757 | `reanchorSpy.mock.calls[0][0]` (TS2532) | `mock.calls[0]![0]` | "length asserted by toHaveBeenCalledTimes(1) immediately above" |

## Decisions Made

1. **Option A used exclusively**: All 12 sites had a length assertion (`.toHaveBeenCalled()`, `.toHaveBeenCalledTimes(N)`, or `.toHaveLength(N)`) immediately above or earlier in the test. Per the plan's deterministic selection rule, Option A was the correct choice for all 12 sites. No Option B (`.at()` + `toBeDefined`) or Option C (`?.`) was needed (Option C is already used at `cueSynth.test.ts:70` and was not modified).

2. **`// Reason:` placement**: Each `!` non-null assertion has a `// Reason:` comment on the immediately preceding line, satisfying D-04. Verified by `grep -B1 "\!" | grep -c "Reason:"` returning 12 (one per assertion).

3. **No production source modified**: `git diff --stat HEAD~1 HEAD -- src/` confirms only the four named test files. No helper modules, no new files.

## Deviations from Plan

None — plan executed exactly as written.

- Task 1 surfaced exactly 12 errors in exactly the 4 named test files (matches RESEARCH.md prediction).
- Task 2 fixed all 12 via Option A (all sites qualified: each had an equivalent length assertion).
- tsc exits 0 on both configs; 363/363 tests pass; build clean; no new lint regressions.

## Pre- vs Post-Task-1 ESLint Error Count

| Preset | Count | Notes |
|--------|-------|-------|
| Pre-Task-1 (`recommended`) | 9 problems | Pre-existing baseline |
| Post-Task-2 (`recommended`) | 9 problems | No change — this plan does not modify production code |

The 226-error baseline from RESEARCH.md is from `strictTypeChecked` (Plan 07-02 scope). Under the current `recommended` preset, the baseline was 9 problems before and after this plan.

## Production Source Files Modified

None. `git diff --stat HEAD~2 HEAD -- src/` confirms only test files (`*.test.tsx`, `*.test.ts`) were touched.

## Self-Check: PASSED

| Item | Status |
|------|--------|
| tsconfig.app.json exists and has strict flags | FOUND |
| tsconfig.node.json exists and has strict flags | FOUND |
| src/app/App.audio.test.tsx exists | FOUND |
| src/app/App.wakeLock.test.tsx exists | FOUND |
| src/audio/cueSynth.test.ts exists | FOUND |
| src/hooks/useAudioCues.test.tsx exists | FOUND |
| 07-01-SUMMARY.md exists | FOUND |
| Task 1 commit 5f3a39e exists | FOUND |
| Task 2 commit 784c62c exists | FOUND |
