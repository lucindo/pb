---
phase: 45-ring-progress-cue-toggle
plan: 2
subsystem: ui
tags: [ring-cue, progress-arc, svg, orb, spike-011, tdd]

# Dependency graph
requires:
  - phase: 45-ring-progress-cue-toggle
    plan: 1
    provides: RingCueStyle type + FeatureFlags.ringCue field exposed via vm.featureFlags
  - spike: 011-ring-progress-cue
    provides: RingsB verbatim transcription target (spike index.html lines 179-229) + spike-locked values (r=49.7, viewBox 0 0 100 100, sweep flags 0/1, dynamic-endpoint arcs with .toFixed(4))
provides:
  - OrbShape ringCue?: RingCueStyle prop with default 'outer-inner' (byte-identical fallback)
  - ProgressArcLayer internal renderer (verbatim TSX transcription of spike-011 RingsB with documented conversions)
  - Branch site inside OrbContainer that swaps the inner-ring <span> for the SVG arc when ringCue === 'progress-arc'
  - Four invariant-locking assertions in OrbShape.test.tsx (default unchanged, 2 paths + spike-locked stroke, reduced-motion suppression, t=0 boundary)
affects: [45-03-PLAN, BreathingSessionSurface.tsx, PracticeSessionView.tsx, PracticeScreen.tsx, NaviKriyaSessionSurface.tsx]

# Tech tracking
tech-stack:
  added: []
  patterns:
    - "SVG-arc-via-dynamic-endpoint pattern (Math.cos/sin + .toFixed(4) per-frame) — replaces the stroke-dasharray + pathLength approach that Chrome renders as broken segments (spike 011 Surprise #2)"
    - "Reduced-motion mirror — inner ring's `!reducedMotion` gate now also gates ProgressArcLayer via `showArc = !reducedMotion && t > 0`"
    - "TDD RED -> GREEN split applied: RED commit failed on the unimplemented branch, GREEN commit brought it green; per-commit green-gate held except the deliberate red-by-design test commit"

key-files:
  created: []
  modified:
    - src/components/OrbShape.tsx
    - src/components/OrbShape.test.tsx

key-decisions:
  - "Verbatim TSX transcription of spike-011 RingsB — class -> className, progressStrokeWidth runtime prop dropped (literal 2.5 inlined per ROADMAP lock), outer <span> dropped from layer (parent OrbContainer renders it). Spike-locked values intact: r = 49.7, viewBox 0 0 100 100, sweep-flag 0/1, .toFixed(4) endpoints, no stroke-dasharray, no pathLength, vectorEffect non-scaling-stroke, stroke 2.5px var(--color-breathing-accent)."
  - "Branch site: inner-ring `{!reducedMotion && (<span ...>)}` becomes a ternary `ringCue === 'progress-arc' ? <ProgressArcLayer .../> : (!reducedMotion && <span .../>)`. Outer faint track stays outside the ternary — byte-identical for both ring cues and both reduced-motion states."
  - "Default-byte-identity verified: ringCue defaults to 'outer-inner' in the OrbShape destructure (same shape as variant = 'orb-halo' / cue = 'labels'); the else branch of the new ternary preserves the original inner-ring <span> bytes (innerVisible / innerSizePct / ringOpacity / RING_TRANSITION) — no rename, no reformat."
  - "ringCue threaded through all OrbContainer call sites (OrbBody, OrbIdle, OrbLeadIn, showCompletion branch) for type consistency even though the branch only triggers under showRings=true (OrbBody). Idle / LeadIn / Complete pass showRings=false, so ringCue has zero render effect on them — matches the must_have truth."
  - "Empty-string init dead under !showArc short-circuit — spike's `let rightD = ''` + `let leftD = ''` had a fall-through-empty case for `t === 0`. The TSX version moves that case to `if (!showArc) return null` above the let declarations, so both branches always assign. Declared `let rightD: string` / `let leftD: string` without seed to satisfy ESLint no-useless-assignment without changing branch structure or output."

patterns-established:
  - "Spike-locked-value mirror — when a spike already locked hex/path geometry/stroke, transcribe verbatim and quietly relax downstream lint friction at the transcription seam (per [[spike-locked-values]] and [[spike-implementation-fidelity]])"
  - "Per-commit green-gate held across the 3-commit sequence (RED + GREEN + Task 2): tsc/lint/test/build clean on GREEN + Task 2 commits; the RED test commit was a deliberate red-by-design as per the TDD discipline"

requirements-completed: []  # Plan frontmatter requirements field is empty — see plan's must_haves block instead

# Metrics
duration: 12min
completed: 2026-05-25
---

# Phase 45 Plan 02: Ring progress-cue toggle — renderer layer Summary

**Branched `OrbShape`'s inner-ring slot on a new `ringCue` prop and added a verbatim TSX transcription of spike-011's `RingsB` (the bidirectional progress arc) — `'outer-inner'` is the default and preserves production rendering byte-identically; `'progress-arc'` swaps in an SVG layer with two south-anchored arc paths driven by the live `phaseProgress`.**

## Performance

- **Duration:** 12 min
- **Started:** 2026-05-25T14:55:04Z
- **Completed:** 2026-05-25T15:07:16Z
- **Tasks:** 2 (Task 1 split RED → GREEN per `tdd="true"`)
- **Files modified:** 2

## Accomplishments

- `OrbShape.tsx`: `ringCue?: RingCueStyle` prop added to `OrbShapeProps`, default `'outer-inner'` destructured at the boundary. Threaded through `OrbBody` / `OrbIdle` / `OrbLeadIn` / `OrbContainerProps` for type consistency.
- `OrbContainerProps`: new `ringCue: RingCueStyle` field and optional `arcProgress?: number` (default 0) — only `OrbBody` ever passes a non-zero `arcProgress` because all other call sites (`OrbLeadIn` / `OrbIdle` / `showCompletion`) pass `showRings={false}`.
- Branch site inside `OrbContainer`'s `{showRings && (<>...</>)}` block: the outer `<span>` (faint accent track) stays exactly as today, and the inner-ring `{!reducedMotion && (<span .../>)}` block becomes a ternary on `ringCue === 'progress-arc'`. The `'outer-inner'` else branch holds the original inner-ring `<span>` bytes (no rename, no reformat).
- New `ProgressArcLayer` internal component (after `OrbContainer`): the TSX transcription of spike-011 `RingsB` (index.html lines 179–229). Spike-locked values reproduced verbatim — `r = 49.7`, `viewBox="0 0 100 100"`, sweep-flag `0` on right path and `1` on left path, dynamic-endpoint arcs via `Math.cos/sin` with `.toFixed(4)`, no `stroke-dasharray`, no `pathLength`. `stroke="var(--color-breathing-accent)"`, `strokeWidth={2.5}`, `vectorEffect="non-scaling-stroke"`, `strokeLinecap="round"`, `fill="none"`.
- `showArc = !reducedMotion && t > 0` early-return gate suppresses the SVG when `reducedMotion === true` or at the phase boundary `t === 0`.
- `OrbShape.test.tsx`: four new `it(...)` cases in a dedicated `describe('OrbShape — ringCue prop (Phase 45)', ...)` block locking the must-have invariants: default unchanged (no arc SVG), `progress-arc` renders exactly 2 `<path>` children with `stroke="var(--color-breathing-accent)"` + `stroke-width="2.5"`, reduced-motion suppresses the arc layer (outer track still present), and `t === 0` (phase boundary) suppresses the arc layer.
- 1162 → 1165 tests pass; tsc + lint + build all green; PWA precache 515.62 KiB.

## Task Commits

Each task was committed atomically. Task 1 followed the TDD RED → GREEN cycle (two commits) per its `tdd="true"` marker; Task 2 is test-only (no source change) and committed as a single test addition.

1. **Task 1 RED: failing test for `ringCue="progress-arc"` SVG layer** — `e877271` (test)
2. **Task 1 GREEN: `ringCue` prop + `ProgressArcLayer` + branch site in `OrbContainer`** — `c0be6d2` (feat)
3. **Task 2: comprehensive `ringCue` invariant block (default / 2 paths / reduced-motion / t === 0)** — `bb41c30` (test)

## Files Created/Modified

- `src/components/OrbShape.tsx` — modified. Type import extended (`RingCueStyle` added alongside `BreathingShapeVariant, OrbIdleBehavior` on line 5). `OrbShapeProps` gained `ringCue?: RingCueStyle` with a sibling comment to the existing query-string-flag prop comments. `OrbShape` destructure gained `ringCue = 'outer-inner'`. `OrbBodyProps` + `OrbBody` + `OrbIdle` + `OrbLeadIn` props gained `ringCue: RingCueStyle` and forward to `OrbContainer`. `OrbContainerProps` gained `ringCue: RingCueStyle` + `arcProgress?: number`. Branch site at the inner-ring slot (lines ~315–331 pre-edit) became a ternary on `ringCue === 'progress-arc'` with the existing `<span>` block preserved byte-for-byte in the else branch. New `ProgressArcLayer` component appended after `OrbContainer` (~line 435+).
- `src/components/OrbShape.test.tsx` — modified. Extended top-line import (`afterEach`, `vi` added from `vitest`). New `describe('OrbShape — ringCue prop (Phase 45)', ...)` block appended after the existing `describe('OrbShape — cue prop (Phase 25 Plan 03)', ...)` block, scoped `afterEach(() => vi.restoreAllMocks())` for the `matchMedia` mock cleanup, and four `it(...)` cases locking the invariants.

## Decisions Made

- **Task 1 split into RED + GREEN commits.** The plan marked Task 1 as `tdd="true"`. The RED commit added a single failing assertion targeting the `viewBox="0 0 100 100"` SVG that didn't yet exist, and the GREEN commit implemented the branch + `ProgressArcLayer` to bring it to green. The RED-by-design commit broke the per-commit green-gate for vitest only at the RED step, which is the canonical TDD pattern (the GSD TDD reference explicitly calls this out). The GREEN and Task 2 commits were green for tsc + lint + test + build.
- **Verbatim spike transcription with documented mechanical conversions, no design changes.** Per the `[[spike-implementation-fidelity]]` and `[[spike-is-design-not-features]]` memory rules: the spike-011 `RingsB` body was transcribed line-for-line into TSX with only the conversions listed in `45-PATTERNS.md` §3 (class → className, drop `progressStrokeWidth` prop → inline literal `2.5`, drop the outer `<span>` (rendered by parent), keep all spike-locked values intact). No "improvement" to the geometry, the sweep flags, or the rendering strategy was attempted.
- **Inner-ring slot only — outer span stays byte-identical.** Per the plan's must_have truth #1 ("the existing outer + inner ring DOM is preserved exactly as today") and the analog at `45-PATTERNS.md` §3: only the inner-ring `{!reducedMotion && (<span .../>)}` slot was wrapped in a ternary. The outer `<span>` (the faint accent track) stays outside the ternary and outside any `ringCue` check, so it renders identically in both ring cues and both reduced-motion states. This is the shared back layer per spike-011 README line 47 + line 104.
- **`arcProgress` defaulted to 0 in `OrbContainerProps`.** Only `OrbBody` ever drives a non-zero `arcProgress` (it passes the same clamped `phaseProgress` that drives the orb scale at line 152). The `showRings={false}` call sites (`OrbLeadIn` / `OrbIdle` / `showCompletion`) never reach the arc branch, so the default value is moot at runtime but keeps the type ergonomic for those call sites.
- **`let rightD: string` / `let leftD: string` declared without empty-string seed.** The spike's verbatim `let rightD = ''` + `let leftD = ''` were dead initializers in the TSX version because the `showArc` guard moved the `t === 0` case to an early return, leaving both `if (t >= 1) { ... } else { ... }` branches as always-assigning. ESLint's `no-useless-assignment` flags the empty init. Removing the seed (declaring without initializer + relying on definite-assignment via the if/else) preserves the spike's branch structure verbatim while satisfying lint — a minimal mechanical adjustment at the transcription seam, documented in the `ProgressArcLayer` body.

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 3 – Blocking] Installed missing `node_modules`**

- **Found during:** Task 1 RED verification (running `npm test`)
- **Issue:** Fresh worktree had no `node_modules` directory; `npm test` failed.
- **Fix:** Ran `npm install` (517 packages, 0 vulnerabilities). No `package.json` / `package-lock.json` edits — install used the existing lockfile.
- **Files modified:** none (lockfile-driven install only)
- **Commit:** N/A (no committed file changes — `node_modules` is gitignored)

**2. [Rule 1 – Bug / fidelity-preserving] Adjusted spike's `let rightD = ''` dead-init to declare-without-seed**

- **Found during:** Task 1 GREEN lint run
- **Issue:** ESLint flagged the spike's verbatim `let rightD = ''` + `let leftD = ''` as `no-useless-assignment` errors because both downstream branches always reassign (the `showArc` early-return collapsed the spike's tri-branch into a binary `if/else`).
- **Fix:** Declared as `let rightD: string` / `let leftD: string` without an initial value — preserves the spike's overall branch structure exactly while satisfying the lint rule. Reasoning embedded as a WHY comment inside `ProgressArcLayer` per the Tiger Style WHY-only comment policy.
- **Files modified:** `src/components/OrbShape.tsx` (within the Task 1 GREEN commit `c0be6d2`)
- **Verification:** `npm run lint` exit 0; `npm test` continues green.

### Plan Discrepancies (documented, not auto-fixed)

**3. [Acceptance-criteria stale baseline] Task 2 AC #6 references 10 pre-existing `it(...)` cases; actual baseline is 14.**

- **Found during:** Task 2 verification
- **Issue:** Plan's Task 2 AC reads "The pre-existing test count (10 `it(...)` cases in 2 describe blocks) is unchanged — only new cases are added." Actual `OrbShape.test.tsx` baseline (before this plan) was 14 `it(...)` cases. Number is stale; the *spirit* (don't break existing cases, only add new ones) is preserved — all 14 baseline cases plus the 4 new `ringCue` cases pass for a final 18.
- **Action:** Honored the spirit of the AC. No fix to the plan source; documented here so the verifier doesn't flag the literal count miss.

---

**Total deviations:** 1 auto-fixed (Rule 3 — node_modules install, same as Plan 01), 1 transcription-seam lint adjustment (Rule 1, fidelity-preserving), 1 documented plan-AC count-baseline discrepancy.
**Impact on plan:** None on output behavior. Plan executed structurally exactly as specified — prop, branch site, transcription, and 4-case test block all match the must_have truths verbatim.

## Issues Encountered

- None beyond the `node_modules` bootstrap (same as Plan 01) and the lint adjustment at the transcription seam (above).

## User Setup Required

None — no external service configuration required.

## Next Phase Readiness

- **Plan 45-03 ready.** Plan 03 plumbs `featureFlags.ringCue` through the surface call sites (`BreathingSessionSurface`, `NaviKriyaSessionSurface`, `PracticeSessionView`, `PracticeScreen`) and reads `vm.featureFlags.ringCue`. The `OrbShape` end of the chain is in place — it accepts `ringCue` with a safe default of `'outer-inner'`, so any caller that does not yet pass it will continue to render the existing rings byte-identically.
- **No blockers.** Production rendering byte-identity is preserved (default `outer-inner` branch unchanged). The progress-arc branch is reachable only via `?ringCue=progress-arc` on the URL today; Plan 45-03 will wire it through the surface chain.

## Self-Check: PASSED

- FOUND: src/components/OrbShape.tsx (modified)
- FOUND: src/components/OrbShape.test.tsx (modified)
- FOUND commit e877271 (test RED)
- FOUND commit c0be6d2 (feat GREEN — adds ringCue + ProgressArcLayer)
- FOUND commit bb41c30 (test Task 2 — comprehensive ringCue block)
- Verification ran: `npm test` 1165/1165 pass; `npx tsc --noEmit` clean; `npm run lint` clean; `npm run build` succeeds (PWA precache 515.62 KiB, 19 entries).

## TDD Gate Compliance

Plan type is `execute` (not `type: tdd`), but Task 1 was marked `tdd="true"`. The RED → GREEN sequence is satisfied:

- **RED gate:** `test(45-02): add failing test for ringCue progress-arc renderer` — commit `e877271`. Confirmed RED: 1 failing assertion (`querySelector` returned null because OrbShape did not yet branch on `ringCue`).
- **GREEN gate:** `feat(45-02): add ringCue prop + ProgressArcLayer to OrbShape` — commit `c0be6d2`. Confirmed GREEN: the previously-failing assertion now passes; the full file holds 15 green; the full suite remains green (1162/1162 at GREEN, growing to 1165/1165 after Task 2).
- **REFACTOR gate:** not needed (the spike-locked transcription was clean on first pass; the only adjustment was the lint-driven dead-init removal documented under deviation #2 and folded into the GREEN commit).

Task 2 was also `tdd="true"` per the plan, but it is purely test-additive against the production code already in place from Task 1 GREEN — RED/GREEN distinction collapses for pure test additions. Committed as a `test(...)` per conventional-commits.

---
*Phase: 45-ring-progress-cue-toggle*
*Completed: 2026-05-25*
