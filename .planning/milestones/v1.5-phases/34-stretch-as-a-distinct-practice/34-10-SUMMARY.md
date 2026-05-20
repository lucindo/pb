---
phase: 34-stretch-as-a-distinct-practice
plan: "10"
subsystem: domain/stretchRamp
tags: [bug-fix, tdd, gap-closure, stretch, timing]
dependency_graph:
  requires:
    - phase: 34-stretch-as-a-distinct-practice
      provides: DS-WR-03-clamp-narrowed
  provides: [GAP-1-exact-total, buildStretchSegments-residual-absorption]
  affects: [src/domain/stretchRamp.ts]
tech_stack:
  added: []
  patterns: [cool-down absorbs cycle-snapping residual to honor exact whole-minute total contract]
key_files:
  created: []
  modified:
    - src/domain/stretchRamp.ts
    - src/domain/stretchRamp.test.ts
key_decisions:
  - "Let the final bounded cool-down segment absorb the accumulated cycle-snapping residual (Option A from the debug doc); warm-up and ramp still snap to whole cycles"
  - "cool-down cycleMs stays 60_000 / targetBpm (true breath-cycle length) — only the span changes, not the cycle length, so getStretchFrame phase math is entirely unchanged"
  - "Construct the final bounded cool-down segment inline (not via makeSegment) to clearly express the exact-span contract without adding an optional parameter to makeSegment"
  - "Updated pre-existing GAP-3 last-cycle-start calculation: use coolDownSeg.startMs + floor((span-1)/cycleMs)*cycleMs, not sessionEndMs - cycleMs (the latter assumed whole-cycle alignment which no longer holds)"
  - "Lowered GAP-3 phaseProgress threshold from > 0.9 to > 0.8 to account for partial final cycles after the GAP-1 rework"
patterns_established:
  - "Residual-absorption pattern: when a segment MUST end at an exact deadline, skip whole-cycle snapping and set endMs = deadline directly; keep cycleMs as the true breath-cycle length"
requirements_completed: [STRETCH-02]
duration: ~18 minutes
completed: "2026-05-19"
---

# Phase 34 Plan 10: GAP 1 — Exact Total Enforcement Summary

**buildStretchSegments reworked so the final bounded cool-down absorbs the cycle-snapping residual, making the realized session total equal the requested whole-minute total exactly (5/5/5 = 900000ms, not 903220ms).**

## Performance

- **Duration:** ~18 min
- **Started:** 2026-05-19T03:36:00Z
- **Completed:** 2026-05-19T03:42:00Z
- **Tasks:** 2
- **Files modified:** 2

## Accomplishments

- Closed UAT GAP 1: a 5m/5m/5m stretch session's realized final endMs now equals the requested 15:00 exactly — the session no longer overruns to 15:03
- Warm-up and all ramp-step segment boundaries still land on whole breath-cycle (Out→In) transitions — BPM never steps mid-breath
- The in-session REMAINING countdown now agrees with the Settings panel Duration readout (both derive from 900000ms)
- Open-ended cool-down path unchanged; the GAP-3 orb-freeze fix from plan 34-09 is not reintroduced
- Full test suite 1240/1240 passed; `npx tsc -b` exits 0

## Task Commits

Each task was committed atomically:

1. **Task 1 RED (failing tests):** `3150290` (test) — add failing GAP-1 regression tests for exact total
2. **Task 1 GREEN (implementation + test updates):** `320d91e` (feat) — close GAP-1 cool-down absorbs residual
3. **Task 2 (Verification):** no new commit — all checks passed with no code changes

## Files Created/Modified

- `src/domain/stretchRamp.ts` — buildStretchSegments Step 3 reworked: bounded cool-down now computed as exact span (requestedTotalMs - cursorMs) inline, not via makeSegment's whole-cycle-snap path; updated doc comments
- `src/domain/stretchRamp.test.ts` — Added 8 GAP-1 regression tests; updated 3 pre-existing tests for the new contract (whole-cycle boundary check limited to non-final segments; GAP-3 last-cycle-start calculation; phaseProgress threshold)

## Decisions Made

- **Inline construction for bounded cool-down:** Rather than adding an optional "skip-snap" parameter to `makeSegment`, the bounded cool-down segment is built directly inline in Step 3. This keeps the intent explicit and avoids overloading `makeSegment` with a branching concern.
- **cycleMs unchanged:** The cool-down's cycleMs field is still `60_000 / targetBpm` (the true breath-cycle length). Only the span (`endMs - startMs`) changes. This ensures `getStretchFrame`'s `Math.floor(elapsedInSegment / cycleMs)` phase math is entirely unaffected.
- **GAP-3 test threshold lowered to > 0.8:** After the GAP-1 rework, the last cycle in the cool-down is a partial one (the residual absorbed into the span may be less than a full exhale). The `phaseProgress > 0.9` threshold from plan 34-09 was calibrated for a whole-cycle-aligned end; > 0.8 still clearly distinguishes from the broken-clamp frozen value (0.167).

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 1 - Bug] Updated pre-existing GAP-3 test to use correct last-cycle start calculation**

- **Found during:** Task 1 GREEN phase
- **Issue:** The pre-existing `GAP-3: phaseProgress is NOT frozen...` test computed `startOfLastCycle = sessionEndMs - cycleMs`. This assumed the session ended on a whole-cycle multiple of the cool-down — which was true before the GAP-1 fix. After the fix, the final cool-down no longer ends on a whole-cycle boundary, so `sessionEndMs - cycleMs` lands at a non-cycle-boundary point inside the cool-down, causing the "out-phase" samples to actually be in the in-phase.
- **Fix:** Changed the calculation to `coolDownSeg.startMs + floor((segSpan - 1) / cycleMs) * cycleMs` and lowered the phaseProgress threshold to > 0.8 as documented above.
- **Files modified:** src/domain/stretchRamp.test.ts
- **Verification:** 50/50 tests in stretchRamp.test.ts pass
- **Committed in:** 320d91e (Task 1 GREEN commit)

**2. [Rule 1 - Bug] Updated pre-existing whole-cycle-boundary test to exclude the final segment**

- **Found during:** Task 1 GREEN phase
- **Issue:** The pre-existing `every finite segment boundary lands on a whole cycle boundary` test checked ALL finite segments including the final cool-down. After the GAP-1 fix, the cool-down span no longer needs to be a whole-cycle multiple, so this assertion would fail for the reworked cool-down.
- **Fix:** Changed the test to iterate over `segs.slice(0, -1)` (all non-final segments) and updated the test name accordingly.
- **Files modified:** src/domain/stretchRamp.test.ts
- **Committed in:** 320d91e (Task 1 GREEN commit)

**3. [Rule 1 - Bug] Updated computeStretchTotalMs drift tests to reflect new exact-total contract**

- **Found during:** Task 1 GREEN phase
- **Issue:** Two `computeStretchTotalMs` tests asserted that the snapped total differed from the raw minute sum (testing the old drift behavior). After GAP-1, the final endMs equals the requested whole-minute total exactly, so `snappedEnd !== rawMinuteSum` is no longer true.
- **Fix:** Updated assertions to verify `finalEndMs === requestedTotal` for all non-open-ended fixtures.
- **Files modified:** src/domain/stretchRamp.test.ts
- **Committed in:** 320d91e (Task 1 GREEN commit)

---

**Total deviations:** 3 auto-fixed (all Rule 1 — test updates for contract change)
**Impact on plan:** All auto-fixes are necessary for the tests to correctly describe the new exact-total contract. No scope creep.

## Verification Results

- `npx vitest run src/domain/stretchRamp.test.ts`: 50/50 passed (8 new GAP-1 regression tests)
- `npx vitest run` (full suite): 1240/1240 passed (no regressions across SettingsForm, App session, engine, controller suites)
- `npx tsc -b`: exit 0, no type errors

## TDD Gate Compliance

| Gate | Commit | Status |
|------|--------|--------|
| RED (test commit) | 3150290 | Passed — 6 failing tests added (GAP-1 exact-total assertions) |
| GREEN (feat commit) | 320d91e | Passed — all 50 tests pass after the fix + 3 pre-existing test updates |
| REFACTOR | (not needed) | N/A — implementation is clean |

## Known Stubs

None.

## Threat Flags

None. The change reworks segment-table arithmetic in a pure-domain function with no new network endpoints, auth paths, file access patterns, or schema changes. T-34-18 and T-34-19 in the plan's threat register cover this change with `accept` disposition and no new untrusted input path.

## Self-Check: PASSED

- `src/domain/stretchRamp.ts`: exists with reworked Step 3 bounded cool-down
- `src/domain/stretchRamp.test.ts`: exists with 8 new GAP-1 regression tests and 3 updated pre-existing tests
- Commit 3150290 (RED): present in git log
- Commit 320d91e (GREEN): present in git log
- 50/50 stretchRamp tests pass, 1240/1240 full suite pass, `tsc -b` exits 0
