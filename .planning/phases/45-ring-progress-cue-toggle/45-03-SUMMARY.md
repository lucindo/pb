---
phase: 45-ring-progress-cue-toggle
plan: 3
subsystem: ui
tags: [plumbing, prop-forwarding, ring-cue, feature-flag-chain]

# Dependency graph
requires:
  - phase: 45-ring-progress-cue-toggle
    plan: 1
    provides: FeatureFlags.ringCue field exposed via vm.featureFlags
  - phase: 45-ring-progress-cue-toggle
    plan: 2
    provides: OrbShape ringCue?: RingCueStyle prop with default 'outer-inner' + ProgressArcLayer renderer
provides:
  - End-to-end ringCue chain wired — ?ringCue=progress-arc URL param reaches OrbShape's ringCue branch on the HRV Running surface
  - BreathingSessionSurfaceProps.ringCue: RingCueStyle (required, mirrors variant/idleMode shape)
  - NaviKriyaSessionSurfaceProps.ringCue: RingCueStyle (required, threaded for type-chain symmetry — moot at runtime since NK OrbShape paths use frame=null → showRings=false)
  - PracticeSessionViewProps.ringCue: RingCueStyle (chain-pass-through to both surfaces)
  - PracticeScreen reads vm.featureFlags.ringCue and forwards as chain origin
affects: [End of phase 45 chain — closes Phase 45's plumbing surface]

# Tech tracking
tech-stack:
  added: []
  patterns:
    - "Surface-level prop forwarding chain — exact mirror of the existing variant / idleMode plumbing (Phase 41 J5/J6): featureFlags.ringCue → PracticeScreen → PracticeSessionView → {Breathing,NaviKriya}SessionSurface → OrbShape branch"

key-files:
  created: []
  modified:
    - src/app/BreathingSessionSurface.tsx
    - src/app/NaviKriyaSessionSurface.tsx
    - src/app/PracticeSessionView.tsx
    - src/app/PracticeScreen.tsx

key-decisions:
  - "Two atomic per-task commits (no separate TDD RED test commit). The plan's tdd=\"true\" markers were honored by the per-task commit boundaries — Task 1 leaves tsc/build deliberately RED (PracticeSessionView's surface call sites are now missing a required prop), Task 2 brings the full chain back to green. Same per-commit boundary discipline as Plans 45-01 and 45-02 — the RED-by-design state is the TDD gate, captured in the commit body rather than a separate empty-of-source test commit."
  - "ringCue threaded as a REQUIRED field on both surface props (no `?:`), matching the variant/idleMode shape. There is no caller scenario where ringCue could be missing — the chain originates at vm.featureFlags.ringCue which is always populated by the FeatureFlags type from Plan 01."
  - "NKShape JSX intentionally unchanged. ringCue is threaded through NaviKriyaSessionSurface for type-chain symmetry only — the NK <OrbShape> branch always passes frame={null}, landing on Idle/LeadIn paths where showRings={false} (OrbShape.tsx lines 105/196), so ringCue has zero render effect there. Matches the must_have truth #4 verbatim."
  - "Mechanical drop-in pattern — each file gains the same five-line diff (import extension, props interface field, destructure, JSX forward). No structural refactors; placement of ringCue immediately after idleMode in interface + destructure + JSX matches the existing variant/idleMode block ordering."

patterns-established:
  - "Per-commit green-gate held at the plan boundary: 1165/1165 tests pass after Task 2 (the chain-closing commit); tsc + lint + build all green. The Task 1 RED-by-design boundary is consistent with the per-task TDD discipline used in Plans 45-01 / 45-02."

requirements-completed: []  # Plan frontmatter requirements field is empty — see plan's must_haves block instead

# Metrics
duration: 5min
completed: 2026-05-25
---

# Phase 45 Plan 03: Ring progress-cue toggle — surface plumbing Summary

**Threaded `featureFlags.ringCue` end-to-end through the existing prop chain — `PracticeScreen → PracticeSessionView → {Breathing,NaviKriya}SessionSurface → OrbShape` — using the exact same drop-in pattern as the existing `variant` (breathingShape) and `idleMode` (orbIdle) props. Pure plumbing, no new logic, no behavioral changes; the default `'outer-inner'` value preserves production rendering byte-identically.**

## Performance

- **Duration:** ~5 min
- **Started:** 2026-05-25T15:12:05Z
- **Completed:** 2026-05-25T15:16:55Z
- **Tasks:** 2
- **Files modified:** 4

## Accomplishments

- `BreathingSessionSurface.tsx`: extended featureFlags type import (`RingCueStyle` added alongside `BreathingShapeVariant, OrbIdleBehavior`), added required `ringCue: RingCueStyle` field to `BreathingSessionSurfaceProps`, accepted `ringCue` in the destructure, forwarded `ringCue={ringCue}` to the single `<OrbShape>` JSX inside.
- `NaviKriyaSessionSurface.tsx`: same five-line diff applied. The threaded prop is forwarded to the `<OrbShape>` JSX in the `presentation.shape.kind === 'orb'` branch (lines 30–37); the `<NKShape>` JSX is intentionally untouched per `45-PATTERNS.md §6` — NKShape has no ring-cue surface (uses its own locked MID_SCALE shell, never renders the ring layer).
- `PracticeSessionView.tsx`: chain-mid pass-through — featureFlags import extended, `ringCue: RingCueStyle` added to `PracticeSessionViewProps`, accepted in destructure, forwarded to **both** `<NaviKriyaSessionSurface>` (line 32) and `<BreathingSessionSurface>` (line 44). Forwarded both times as `ringCue={ringCue}` — confirms via `grep -c "ringCue={ringCue}"` returning 2.
- `PracticeScreen.tsx`: chain origin — added `ringCue={vm.featureFlags.ringCue}` as the fourth prop after `idleMode={vm.featureFlags.orbIdle}` on the `<PracticeSessionView>` JSX at line 71–75. Single-line addition; no other edits.
- End-to-end chain wired: `?ringCue=progress-arc` URL → `readFeatureFlags` (Plan 01) → `useFeatureFlags` → `vm.featureFlags.ringCue` → `PracticeScreen` → `PracticeSessionView` → both surfaces → `OrbShape` (Plan 02) → `ProgressArcLayer` renders on the HRV Running surface.
- No edits to `useAppViewModel.ts`, `appViewModel.ts`, `useFeatureFlags.ts`, `NKShape.tsx`, or any file outside the four listed in the plan.
- 1165/1165 tests pass; `tsc -b --noEmit` clean; `npm run lint` clean; `npm run build` succeeds (PWA precache 515.72 KiB, 19 entries).

## Task Commits

Each task was committed atomically.

1. **Task 1: thread ringCue through BreathingSessionSurface + NaviKriyaSessionSurface** — `44e45ed` (feat)
2. **Task 2: thread ringCue through PracticeSessionView + PracticeScreen (chain origin)** — `43ae304` (feat)

## Files Created/Modified

- `src/app/BreathingSessionSurface.tsx` — extended featureFlags type import; added `ringCue: RingCueStyle` to `BreathingSessionSurfaceProps`; accepted in destructure; forwarded `ringCue={ringCue}` on the `<OrbShape>` JSX inside.
- `src/app/NaviKriyaSessionSurface.tsx` — same five-line diff; forwarded `ringCue={ringCue}` on the `<OrbShape>` in the `presentation.shape.kind === 'orb'` branch; `<NKShape>` JSX unchanged.
- `src/app/PracticeSessionView.tsx` — extended featureFlags type import; added `ringCue: RingCueStyle` to `PracticeSessionViewProps`; accepted in destructure; forwarded to both `<NaviKriyaSessionSurface>` and `<BreathingSessionSurface>`.
- `src/app/PracticeScreen.tsx` — single-line addition: `ringCue={vm.featureFlags.ringCue}` on the `<PracticeSessionView>` JSX as the fourth prop after `idleMode`. No other edits.

## Decisions Made

- **Two atomic per-task commits, no synthetic RED test commit.** Both tasks are marked `tdd="true"` in the plan, but the "behavior" here is pure type-chain plumbing (no new surface unit test files exist in `src/app/` for these components, and the chain is gated entirely by the TypeScript compiler). Following the precedent established by Plan 02's SUMMARY ("RED/GREEN distinction collapses for pure test additions"), the TDD gate is enforced by the per-commit `tsc -b` build check: after Task 1, `tsc -b` is deliberately RED because `PracticeSessionView`'s `<BreathingSessionSurface>` / `<NaviKriyaSessionSurface>` JSX is missing the new required `ringCue` prop; after Task 2, `tsc -b` is GREEN end-to-end. Commit body of Task 1 documents the expected RED boundary explicitly. The plan's own `<acceptance_criteria>` for Task 1 reads: `npx tsc --noEmit` exits 0 (PracticeSessionView.tsx will be RED at this point — that's expected; Task 2 fixes it)` — the literal `exits 0` is inconsistent with the parenthetical, but the parenthetical captures the planner's intent (Task 2 closes the chain).
- **ringCue threaded as REQUIRED on every prop interface (no `?:`).** Matches the existing `variant: BreathingShapeVariant` and `idleMode: OrbIdleBehavior` shape verbatim. The chain originates at `vm.featureFlags.ringCue`, which is always populated by Plan 01's `readFeatureFlags`, so there is no caller scenario where the prop could be absent. Required-ness is what gives the TDD RED-by-design property at the Task 1 commit boundary.
- **NKShape JSX intentionally untouched.** Per `45-PATTERNS.md §6`: NKShape uses its own locked MID_SCALE shell and never renders the ring layer. The `ringCue` prop is threaded through `NaviKriyaSessionSurface` for type-chain symmetry (so `useFeatureFlags()` flows uniformly down both surfaces), but does not reach NKShape. This satisfies must_have truth #4 verbatim.

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 3 – Blocking] Installed missing `node_modules`**

- **Found during:** Plan startup (running `ls node_modules/.bin/vitest` returned "No such file or directory")
- **Issue:** Fresh worktree had no `node_modules` directory; tests/lint/build cannot run without it.
- **Fix:** Ran `npm install` (517 packages, 0 vulnerabilities). No `package.json` / `package-lock.json` edits — install used the existing lockfile.
- **Files modified:** none (lockfile-driven install only; `node_modules` is gitignored)
- **Verification:** `npm test` then runs; all 1165 tests pass.
- **Commit:** N/A (no committed file changes)

### Plan Discrepancies (documented, not auto-fixed)

**2. [Acceptance-criteria inconsistency] Task 1 AC says `tsc --noEmit` exits 0 but Task 1 leaves the chain RED.**

- **Found during:** Task 1 acceptance verification
- **Issue:** Task 1's `<acceptance_criteria>` reads: `npx tsc --noEmit exits 0 (PracticeSessionView.tsx will be RED at this point — that's expected; Task 2 fixes it)`. The literal claim "exits 0" contradicts the parenthetical "will be RED at this point". After Task 1's commit, `tsc -b --noEmit` (which is what `npm run build` invokes and is the canonical project-references invocation here) exits with code 2 and reports two TS2741 errors at `PracticeSessionView.tsx:26` and `:38` — exactly the two surface call sites that Task 2 fixes. Plain `tsc --noEmit` (without `-b`) does NOT traverse project references in this repo so it spuriously appears green; the build canonically uses `tsc -b`.
- **Action:** Honored the parenthetical (planner intent). Task 1's commit body explicitly captures the expected RED boundary. Task 2 closes the chain and `tsc -b` returns to green. No fix to the plan source.

**3. [TDD gate format] Both tasks committed as a single `feat(...)` each (no `test(...)` RED commit).**

- **Found during:** Plan startup planning
- **Issue:** Plans 45-01 and 45-02 both produced a `test(...)` RED commit followed by a `feat(...)` GREEN commit for their `tdd="true"` Task 1. Plan 45-03's tasks are pure type-chain plumbing — the surface components have no existing unit test files in `src/app/`, and the `OrbShape.ringCue?` prop is optional with a default, so a synthetic RED test would have to test type-only behavior (not vitest-expressible).
- **Action:** Followed Plan 45-02 SUMMARY's documented precedent ("RED/GREEN distinction collapses for pure test additions") — substituted "the structural TDD gate is `tsc -b` build state at the per-task commit boundary" (Task 1 RED, Task 2 GREEN). The Task 1 commit body explicitly documents the RED-by-design state. Net result: 2 per-task commits matching the plan's 2-task structure, with the TDD discipline preserved at the build-gate level.

---

**Total deviations:** 1 auto-fixed (Rule 3 — node_modules install), 2 documented plan-discrepancies (Task 1 AC self-contradiction; TDD-gate format substituted to build-gate).
**Impact on plan:** None on output behavior or output artifacts. All `must_haves.truths` satisfied, all `must_haves.artifacts.contains` patterns present, all `must_haves.key_links.pattern` regexes match. Plan executed structurally exactly as specified.

## Issues Encountered

None beyond the `node_modules` bootstrap (same as Plans 45-01 and 45-02). All grep acceptance criteria pass on the first attempt; no inline bug fixes required.

## User Setup Required

None — no external service configuration required.

## Next Phase Readiness

- **Phase 45 chain complete.** Plans 45-01 (feature flag), 45-02 (renderer), and 45-03 (plumbing) form the end-to-end chain. With `?ringCue=progress-arc` in the URL, `vm.featureFlags.ringCue === 'progress-arc'` is now uniformly forwarded through `PracticeScreen` → `PracticeSessionView` → both surfaces → `OrbShape`, where the `ProgressArcLayer` (Plan 02) renders the spike-011 bidirectional progress arc on the HRV Running surface.
- **Default behavior unchanged.** With no `?ringCue=` parameter (the default), the chain resolves to `'outer-inner'`, and `OrbShape`'s else branch (Plan 02) renders the production outer + inner ring DOM byte-identically to pre-Phase-45.
- **No upstream edits to viewmodel layer required, and none made.** `useAppViewModel.ts` / `appViewModel.ts` / `useFeatureFlags.ts` automatically expose `vm.featureFlags.ringCue` once the `FeatureFlags` type was extended in Plan 01.
- **Visual confirmation deferred to human UAT.** Per the plan's verification block, this is not a gate for this plan — the per-commit green-gate (test + tsc + lint + build) is the structural gate; visual UAT happens after Phase 45 completes.

## Self-Check: PASSED

- FOUND: src/app/BreathingSessionSurface.tsx (modified)
- FOUND: src/app/NaviKriyaSessionSurface.tsx (modified)
- FOUND: src/app/PracticeSessionView.tsx (modified)
- FOUND: src/app/PracticeScreen.tsx (modified)
- FOUND commit 44e45ed (Task 1 — feat)
- FOUND commit 43ae304 (Task 2 — feat)
- Verification ran: `npm test` 1165/1165 pass; `npx tsc -b --noEmit` exit 0; `npm run lint` exit 0; `npm run build` exit 0 (PWA precache 515.72 KiB, 19 entries)

## TDD Gate Compliance

Plan type is `execute` (not `type: tdd`), but both Task 1 and Task 2 are marked `tdd="true"`. The TDD gate is enforced at the build-state level rather than via separate `test(...)` RED commits:

- **RED gate (post-Task-1):** `tsc -b --noEmit` exits 2 with two TS2741 errors at `PracticeSessionView.tsx:26` and `:38` — the missing `ringCue` prop on the surface call sites. Confirmed empirically. This is the type-system equivalent of a failing test for this pure-plumbing task. The Task 1 commit body documents the expected RED boundary explicitly.
- **GREEN gate (post-Task-2):** `tsc -b --noEmit` exits 0; `npm test` reports 1165/1165 pass; `npm run lint` exit 0; `npm run build` exit 0. Full chain consistent end-to-end.
- **REFACTOR gate:** not needed (mechanical drop-in was clean on first pass).

The format substitution — building-gate as the TDD assertion target instead of a separate vitest test commit — is documented under Deviations §3 above. Same precedent as Plan 45-02 SUMMARY (which noted "RED/GREEN distinction collapses for pure test additions"); here the analog is "RED/GREEN distinction collapses for pure type-chain plumbing where no vitest harness exists at the relevant surface".

---
*Phase: 45-ring-progress-cue-toggle*
*Completed: 2026-05-25*
