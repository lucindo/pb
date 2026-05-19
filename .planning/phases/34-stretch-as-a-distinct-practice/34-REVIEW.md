---
phase: 34-stretch-as-a-distinct-practice
reviewed: 2026-05-19T00:00:00Z
depth: standard
files_reviewed: 4
files_reviewed_list:
  - src/components/PracticeToggle.tsx
  - src/components/PracticeToggle.test.tsx
  - src/domain/stretchRamp.ts
  - src/domain/stretchRamp.test.ts
findings:
  critical: 0
  warning: 3
  info: 3
  total: 6
status: issues_found
---

# Phase 34: Code Review Report

**Reviewed:** 2026-05-19T00:00:00Z
**Depth:** standard
**Files Reviewed:** 4
**Status:** issues_found

## Summary

Reviewed the phase 34 gap-closure changes against diff_base `dd1693b`:

- **34-09** — `getStretchFrame` DS-WR-03 clamp narrowed from `cycleMs/2` to a 1 ms `CLAMP_EPSILON_MS`.
- **34-10** — `buildStretchSegments` bounded cool-down now absorbs cycle-snapping residual so the realized total equals the requested whole-minute total exactly.
- **34-11** — `PracticeToggle` Treatment B inline flex layout + S-curve glyph swap (`polyline` → `path`).

The changes are well-documented and well-tested. No security vulnerabilities and no Critical correctness defects were found. However, the 34-10 residual-absorption rework introduces an **unguarded invariant**: the cool-down segment span (`requestedTotalMs - cursorMs`) is no longer guaranteed to be positive or even one full cycle long, and the surrounding code (clamp epsilon, contiguity, the `Math.max(1, ...)` floor used elsewhere) silently assumes it is. The three Warnings below cover that gap and two robustness concerns. No Critical issues — the degenerate inputs are blocked by `coerceStretchSettings` for persisted data, but `buildStretchSegments` is an exported pure function whose own docstring (DS-WR-02 / CR-01 guards) commits to defending against poisoned tables, and this new path does not.

## Warnings

### WR-01: Cool-down span can become zero or negative — no defensive guard on the residual-absorption result

**File:** `src/domain/stretchRamp.ts:174-189`

**Issue:** The bounded cool-down segment span is set directly to `requestedTotalMs - cursorMs` with no lower-bound check:

```ts
const requestedTotalMs = (warmUpMinutes + rampDurationMinutes + coolDownMinutes) * 60_000
const startMs = cursorMs
const endMs = requestedTotalMs
```

`cursorMs` is the sum of *snapped* warm-up + ramp segment durations. Each snap is `Math.round(requestedMs / cycleMs) * cycleMs`, which can round **up**. The accumulated upward rounding residual across warm-up + N ramp steps is bounded by roughly `(N+1) * cycleMs/2`. For large slow-BPM ramps (`cycleMs` up to ~40 s near 1.5 BPM, and `numSteps = ceil(bpmSpan/0.4999)` up to ~25+ for a wide span), the residual can plausibly exceed the minimum 5-minute cool-down request (300 000 ms). When that happens:

- `endMs < cursorMs` → the cool-down segment has a **negative span**.
- `getStretchFrame` then computes `activeSeg.endMs - activeSeg.startMs - CLAMP_EPSILON_MS` as a negative ceiling, `Math.min` pins `elapsedInSegment` negative, `cycleInSegment` goes negative, and `absoluteCycleIndex` can move **backwards** — violating the Pitfall-1 monotonic-cycleIndex invariant the file explicitly protects.
- `computeStretchTotalMs` returns an `endMs` smaller than the preceding ramp segment's `endMs`, breaking the segment-table contiguity invariant asserted by the `segments are contiguous` test.

The file's own docstrings (DS-WR-02, CR-01) commit `buildStretchSegments` to defending against degenerate tables ("the engine never silently produces a poisoned table"). This new path drops that guarantee. Persisted data is clamped by `coerceStretchSettings`, but `buildStretchSegments` is exported and called directly in `App.tsx` and `sessionController.ts`, and the existing tests only exercise narrow BPM ranges (5.5/4.5, 6/4).

**Fix:** Guard the absorbed span; clamp to at least one cool-down cycle (or fail loud, consistent with the existing `RangeError` guards):

```ts
const requestedTotalMs = (warmUpMinutes + rampDurationMinutes + coolDownMinutes) * 60_000
const cycleMs = 60_000 / targetBpm
// Residual absorption must never produce a zero/negative cool-down span.
const minEndMs = cursorMs + cycleMs
const endMs = Math.max(requestedTotalMs, minEndMs)
```

Add a regression test with a wide, slow ramp (e.g. `initialBpm: 14, targetBpm: 1.5`, `warmUpMinutes: 15`, `rampDurationMinutes: 5`, `coolDownMinutes: 5`) asserting `endMs > cursorMs` and `cycleIndex` stays monotonic across the full sweep.

### WR-02: Comment claims phaseProgress "reaches near 1.0" but the partial final cycle can make the last out-phase span far longer than `exhaleMs`

**File:** `src/domain/stretchRamp.ts:244-258` (and the GAP-3 test at `stretchRamp.test.ts:310-354`)

**Issue:** After the 34-10 rework the cool-down span is no longer a whole-cycle multiple, so the final cycle in the segment is a *partial* cycle. `getStretchFrame` still computes `cycleElapsedMs = elapsedInSegment - cycleInSegment * cycleMs` and `phaseDurationMs = exhaleMs` for the out-phase. If the partial final cycle ends mid-out-phase, `cycleElapsedMs - inhaleMs` can exceed `exhaleMs`, so `phaseProgress = phaseElapsedMs / phaseDurationMs` can exceed `1.0` for elapsed values just below `endMs`.

The `phaseProgress is in [0, 1] range` test (`stretchRamp.test.ts:290-297`) only samples `t ∈ {0, 5000, 100000}` — none near the final partial cycle — so this is not caught. The GAP-3 test deliberately weakened its assertion to `> 0.8` and notes "may not reach near 1.0", which acknowledges the partial cycle but does not assert the *upper* bound. A `phaseProgress > 1` leaks into the orb-animation interpolation in `App.tsx`.

**Fix:** Clamp `phaseProgress` to `[0, 1]` in `getStretchFrame`:

```ts
const rawProgress = phaseDurationMs === 0 ? 0 : phaseElapsedMs / phaseDurationMs
const phaseProgress = Math.min(1, Math.max(0, rawProgress))
```

Then strengthen the `[0,1]` test to sample the final partial cycle (e.g. `sessionEndMs - 1`, `sessionEndMs - cycleMs/4`) and assert `<= 1`.

### WR-03: Cool-down segment construction duplicates `makeSegment` logic instead of reusing it

**File:** `src/domain/stretchRamp.ts:174-192`

**Issue:** The bounded cool-down branch re-derives `cycleMs`, `inhaleMs`, `exhaleMs`, `startMs`, `endMs`, and the full `StretchSegment` literal by hand, duplicating the formulas already centralized in `makeSegment` (`stretchRamp.ts:110-136`). This is the exact code the closure was written to own. The duplication is a maintenance hazard: a future change to the ratio math or the segment shape (e.g. adding a field) must be made in two places, and `makeSegment`'s own `inhaleMs`/`exhaleMs` formulas could silently diverge from the inlined copy. The inline copy also does not advance `cumulativeCycles`/`cursorMs`, which is correct only because it is the last segment — a fragile assumption if a Step 4 is ever added.

**Fix:** Extend `makeSegment` to accept an explicit (un-snapped) span, e.g. add an optional `snap` flag or an `exactDurationMs` parameter, so the cool-down segment is produced through the same path:

```ts
function makeSegment(bpm, requestedMs, stage, opts?: { snap?: boolean }) {
  // ...
  const snap = opts?.snap ?? true
  const durationMs = isOpenEnded
    ? Infinity
    : snap
      ? Math.max(1, Math.round(requestedMs / cycleMs)) * cycleMs
      : requestedMs
  // ...
}
// cool-down:
segments.push(makeSegment(targetBpm, requestedTotalMs - cursorMs, 'hold-target', { snap: false }))
```

This keeps `cumulativeCycles`/`cursorMs` bookkeeping and the segment shape in one place.

## Info

### IN-01: `CLAMP_EPSILON_MS` declared inside `getStretchFrame` on every call

**File:** `src/domain/stretchRamp.ts:243`

**Issue:** `const CLAMP_EPSILON_MS = 1` is a fixed constant declared in the function body, so it is re-created on every frame computation (this runs per animation frame). It is also conceptually a module-level tuning constant, alongside `RATIO_PARTS`.

**Fix:** Hoist to module scope: `const CLAMP_EPSILON_MS = 1` near the top of the file, with the rationale comment attached there.

### IN-02: GAP-3 test recomputes the last-cycle boundary with logic that mirrors production — risk of co-drift

**File:** `src/domain/stretchRamp.test.ts:326-329, 435-437`

**Issue:** Two tests recompute `startOfLastCycle` from `Math.floor((segSpan - 1) / cycleMs)` — re-deriving the same boundary math `getStretchFrame` performs internally. If a future change alters the clamp/floor logic, the test will recompute in lockstep and still pass, masking a real regression. The `- 1` magic number silently encodes `CLAMP_EPSILON_MS`.

**Fix:** Where possible, assert against observable frame outputs (`phase`, `cycleIndex`, `isComplete` transitions) rather than re-deriving internal boundaries, or import a shared constant so the `- 1` is not a duplicated magic number.

### IN-03: S-curve glyph path data is a magic string duplicated between component and test

**File:** `src/components/PracticeToggle.tsx:42` and `src/components/PracticeToggle.test.tsx:180`

**Issue:** The path string `M2 13 Q5.5 2 9 9 T16 5.5` and `viewBox 0 0 18 18` appear verbatim in both the component and the test. The test asserting exact equality on the `d` attribute makes the test a pure change-detector rather than a behavior check, and any intentional glyph tweak requires editing the literal in two files.

**Fix:** Acceptable for an inline decorative SVG, but if the glyph is expected to evolve, consider exporting the path constant from the component and importing it in the test, or relax the test to assert the element is a `<path>` with `stroke="currentColor"` (which it already does) and drop the exact-`d` match.

---

_Reviewed: 2026-05-19T00:00:00Z_
_Reviewer: Claude (gsd-code-reviewer)_
_Depth: standard_
