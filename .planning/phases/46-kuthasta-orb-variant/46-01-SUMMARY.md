---
phase: 46-kuthasta-orb-variant
plan: "01"
subsystem: feature-flags
tags:
  - feature-flag
  - parser
  - alias-list
  - tdd
dependency_graph:
  requires: []
  provides:
    - BreathingShapeVariant union member 'spiritual-eye'
    - BREATHING_SHAPE_FLAG.parse recognises spiritual-eye / kuthasta / star aliases
  affects:
    - src/featureFlags.ts (BreathingShapeVariant union extended to 3 members)
    - src/featureFlags.test.ts (2 new alias-matrix vitest cases)
tech_stack:
  added: []
  patterns:
    - alias-list parser clause (canonical first, aliases after, return null fallback)
    - TDD RED/GREEN cycle
key_files:
  created: []
  modified:
    - src/featureFlags.ts
    - src/featureFlags.test.ts
decisions:
  - "New union literal 'spiritual-eye' added as third BreathingShapeVariant member (D-08)"
  - "Aliases kuthasta and star mapped to canonical 'spiritual-eye' per D-08"
  - "Parser clause placed between minimal-rings clause and return null (verbatim plan spec)"
  - "No separate test for unrecognized fallback added (existing 'falls back to default for invalid breathingShape values' covers this generically per feedback_no_design_locking)"
metrics:
  duration: "~3 minutes"
  completed: "2026-05-26"
  tasks_completed: 1
  tasks_total: 1
  files_changed: 2
requirements:
  - KUTH-01
---

# Phase 46 Plan 01: BreathingShapeVariant Union + spiritual-eye Parser Summary

**One-liner:** Extended BreathingShapeVariant union to three members and added an allow-list alias clause mapping `spiritual-eye` / `kuthasta` / `star` → `'spiritual-eye'` in BREATHING_SHAPE_FLAG.parse, with 2 new vitest cases covering the alias matrix + case-insensitivity + whitespace trimming.

## Tasks Completed

| Task | Name | RED Commit | GREEN Commit | Files |
|------|------|-----------|-------------|-------|
| 1 | Extend BreathingShapeVariant union and add spiritual-eye alias clause | 262be87 | c5c15cb | src/featureFlags.ts, src/featureFlags.test.ts |

## Implementation Summary

### src/featureFlags.ts changes

**Line 7** — union extended from two to three members:
```
- export type BreathingShapeVariant = 'orb-halo' | 'minimal-rings'
+ export type BreathingShapeVariant = 'orb-halo' | 'minimal-rings' | 'spiritual-eye'
```

**Line 71** — new clause inserted before `return null` inside `BREATHING_SHAPE_FLAG.parse`:
```
+ if (v === 'spiritual-eye' || v === 'kuthasta' || v === 'star') return 'spiritual-eye'
```

Total: exactly 2 line changes. All other clauses (orb-halo, minimal-rings, readFeatureFlags, readQueryFeatureFlag) are byte-identical to pre-plan content.

### src/featureFlags.test.ts changes

Two new `it(...)` blocks added after the existing `'falls back to default for invalid breathingShape values'` test:

- `'parses spiritual-eye and its aliases'` — asserts `?breathingShape=spiritual-eye`, `?breathingShape=kuthasta`, and `?breathingShape=star` all resolve to `'spiritual-eye'`.
- `'spiritual-eye is case-insensitive and trims whitespace'` — asserts `?breathingShape=KUTHASTA`, `?breathingShape=Spiritual-Eye`, and `?breathingShape=%20Star%20` all resolve to `'spiritual-eye'`.

Test count increased from 38 to 40 (exactly +2 new `it(...)` blocks).

## Verification Results

- `npx vitest run src/featureFlags.test.ts` — 40/40 tests pass
- `npx tsc --noEmit` — clean, no type errors
- Existing alias matrix (orb-halo / minimal-rings + case/whitespace tests) — unchanged, all passing
- Empty search default test (L36-43) — unchanged and passing

## TDD Gate Compliance

- RED commit (`262be87`): 2 failing tests added; confirmed failure before implementation
- GREEN commit (`c5c15cb`): implementation; all 40 tests pass
- REFACTOR: skipped — implementation is 2 lines, no cleanup needed

## Deviations from Plan

### Plan acceptance criterion grep count mismatch

- **Found during:** Task 1 verification
- **Issue:** The acceptance criterion states `grep -n "spiritual-eye" src/featureFlags.ts | wc -l` should return "at least 4". The plan's reasoning was "one in the union, three in the parser clause — canonical + two `return` literals", which describes occurrence-count within line text, not grep line count. `grep | wc -l` counts lines, not per-line string occurrences. With the verbatim implementation (one union line, one parser `if` clause on one line), grep returns 2 lines — both occurrences of `'spiritual-eye'` on line 71 (in the condition and the return) count as one grep line.
- **Fix:** Implementation follows the verbatim `<action>` spec from the plan (single `if` clause). The grep count criterion was computed incorrectly in the plan document. All behavioral tests pass; the contract is correct.
- **Files modified:** none (no fix needed — the implementation is correct)
- **Commit:** documented only; no change required

## Known Stubs

None. This plan adds a typed parser clause and test coverage only. No data flows to UI rendering. Plan 03 will wire the visual OrbShape component using the new `'spiritual-eye'` literal.

## Threat Flags

None. The `spiritual-eye` alias clause follows the identical allow-list shape as the existing clauses (T-46-01 mitigate disposition confirmed — new clause is `if (v === '...' || v === '...') return '...'` with `return null` fallback; no eval, no dynamic dispatch, no new attack surface).

## Self-Check: PASSED

- [x] `src/featureFlags.ts` exists and contains `'spiritual-eye'` in both union and parser clause
- [x] `src/featureFlags.test.ts` contains 2 new test cases for spiritual-eye aliases
- [x] RED commit `262be87` exists in git log
- [x] GREEN commit `c5c15cb` exists in git log
- [x] 40/40 vitest tests pass
- [x] `tsc --noEmit` clean
