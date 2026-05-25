---
phase: 45-ring-progress-cue-toggle
reviewed: 2026-05-25T12:25:00Z
depth: standard
files_reviewed: 8
files_reviewed_list:
  - src/app/BreathingSessionSurface.tsx
  - src/app/NaviKriyaSessionSurface.tsx
  - src/app/PracticeScreen.tsx
  - src/app/PracticeSessionView.tsx
  - src/components/OrbShape.test.tsx
  - src/components/OrbShape.tsx
  - src/featureFlags.test.ts
  - src/featureFlags.ts
findings:
  critical: 0
  warning: 2
  info: 4
  total: 6
status: issues_found
---

# Phase 45: Code Review Report

**Reviewed:** 2026-05-25T12:25:00Z
**Depth:** standard
**Files Reviewed:** 8
**Status:** issues_found

## Summary

Phase 45 ports the spike-011 bidirectional progress arc behind a query-string flag (`?ringCue=progress-arc`). The implementation is a mechanical transcription job that follows the established `breathingShape` / `orbIdle` precedent exactly. The render layer is read-only (no state mutation, no network, no storage), and the SVG path strings are built from numeric trig + a literal radius — no user-controlled string enters the DOM.

Verification baseline: `npx tsc --noEmit` clean; `npx vitest run` on the two changed test files reports 56 passing, no failures.

No security issues, no correctness bugs. The two warnings concern (a) an incorrect comment in the test file that would mislead a future reviewer about CueGlyph's viewBox, and (b) a missing edge-case test for the `t >= 1` (closed-semicircle) branch — both warnings, not blockers, because the production-render math is verbatim from a validated spike. Info-tier findings cover the alias collision (acknowledged in PATTERNS), a dead-code idle path that pre-dates this phase, an unused destructure on the reduced-motion path, and a thread-through that has zero render effect on the NK surface (by design per the plan).

## Warnings

### WR-01: Incorrect comment about CueGlyph viewBox misleads future reviewers

**File:** `src/components/OrbShape.test.tsx:122-126`
**Issue:** The block comment introducing the `ringCue` describe states:

> "SVG selector uses viewBox=\"0 0 100 100\" to disambiguate the new arc layer from CueGlyph SVGs (which use a 24-viewBox per CheckmarkGlyph at OrbShape line ~128)."

This is **factually wrong**. `CueGlyph.tsx` lines 96 and 118 both render SVGs with `viewBox="0 0 100 100"` (arrow mode and nose mode). Only the **CheckmarkGlyph** in `OrbShape.tsx` line 145 uses `viewBox="0 0 24 24"`, and CheckmarkGlyph only appears on the `showCompletion` path, not in any of these tests.

The tests in this describe block all use the default `cue='labels'`, which renders a `<span>` (no SVG), so the selector happens to work. But anyone adding a `ringCue='progress-arc'` + `cue='arrow'` (or `cue='nose'`) test will get **two** matching SVGs and the assertion will silently break — `querySelectorAll(...).length === 2` may match the CueGlyph SVG instead of the arc SVG.

**Fix:** Correct the comment and tighten the selector. Either:
```tsx
// Disambiguate from CueGlyph (arrow/nose modes also use viewBox 0 0 100 100)
// by selecting on a stable structural marker — the pointer-events-none class
// or the second-level child position.
const arcSvg = container.querySelector('svg[aria-hidden="true"].pointer-events-none')
```
Or scope to direct children of the orb container. The current selector works only because no test combines `progress-arc` with a non-labels cue — a fragile coincidence, not a contract.

### WR-02: `t >= 1` (closed-semicircle) branch of ProgressArcLayer has no test coverage

**File:** `src/components/OrbShape.test.tsx:127-202` (the new describe block)
**Issue:** `ProgressArcLayer` in `OrbShape.tsx` lines 469-481 has two distinct emission branches:
1. `t >= 1` → explicit semicircle paths to north `(50, 0.3)` (lines 469-471)
2. `0 < t < 1` → dynamic-endpoint arcs via `Math.cos/sin` + `.toFixed(4)` (lines 473-481)

The test suite covers branch 2 (`partialFrame` with `phaseProgress: 0.5`) and the `t === 0` / reduced-motion / default-unchanged invariants. The `t >= 1` branch is **untested**. This branch fires at every phase-end (`phase: 'in', phaseProgress: 1.0` → t = 1; `phase: 'out', phaseProgress: 0.0` would be t = 1 if reached — though the engine clamps before that).

The 45-02-PLAN must_haves require: *"Stroke width is the literal `2.5` (spike-locked); stroke uses `var(--color-breathing-accent)`; sweep-flag is `0` on the right path and `1` on the left path."* The current 2-path test does verify `stroke` and `stroke-width`, but does not verify the **path `d` content** — neither the dynamic-arc form nor the closed-semicircle form. A regression that swapped the sweep-flags (the spike README "Surprise #3" — these flags are inverted from intuition) would not be caught by any current test.

**Fix:** Add one assertion covering `t >= 1`:
```tsx
it('ringCue="progress-arc" at t === 1 emits explicit semicircle paths to north', () => {
  const peakFrame: SessionFrame = { ...sampleFrame, phaseProgress: 1 }
  const { container } = render(
    <OrbShape
      frame={peakFrame}
      ringCue="progress-arc"
      strings={EN_STRINGS_FIXTURE.practice.breathing}
    />,
  )
  const paths = container.querySelectorAll(
    'svg[aria-hidden="true"][viewBox="0 0 100 100"] path',
  )
  expect(paths).toHaveLength(2)
  // Spike-locked sweep flags (README "Surprise #3"): 0 on right, 1 on left.
  // Both terminate at north (50, 0.3 = 50 - 49.7).
  expect(paths[0]?.getAttribute('d')).toBe('M 50 99.7 A 49.7 49.7 0 0 0 50 0.3')
  expect(paths[1]?.getAttribute('d')).toBe('M 50 99.7 A 49.7 49.7 0 0 1 50 0.3')
})
```
This locks the inverted sweep-flag invariant that the spike README flagged as the most-likely-to-be-"corrected" detail in any future refactor.

## Info

### IN-01: `rings` alias maps to two different flags (acknowledged in PATTERNS)

**File:** `src/featureFlags.ts:68-70, 91-94`
**Issue:** The token `rings` appears in BOTH alias sets:
- `BREATHING_SHAPE_FLAG.parse`: `rings` → `'minimal-rings'` (line 70)
- `RING_CUE_FLAG.parse`: `rings` → `'outer-inner'` (line 91)

The flags live in independent query params (`?breathingShape=rings` vs `?ringCue=rings`), so they never collide at runtime. The PATTERNS doc explicitly acknowledges this trade-off. However, this is a cognitive landmine: a developer reaching for the token in copy-paste error mode could conflate them. The semantic mismatch is real — `rings` for `breathingShape` means "rings-instead-of-halo" (V2 minimal variant), while `rings` for `ringCue` means "the existing outer+inner rings" (production default). They're nearly opposites.

**Fix:** Optional. Consider removing the `rings` alias from one of the two flags, or renaming to a more specific token (e.g. `inner-outer` on the ringCue side, dropping the ambiguous `rings`). If the alias is kept, a one-liner doc comment at the top of `RING_CUE_FLAG.parse` cross-referencing the breathingShape collision would help future readers.

### IN-02: `OrbShape` line 117-118 — unreachable idle return path

**File:** `src/components/OrbShape.tsx:114-119`
**Issue:** Pre-existing code (not modified by this phase, but in scope of the review):
```tsx
if (frame === null) {
  if (idleMode != null) {
    return <OrbIdle idleMode={idleMode} variant={variant} ringCue={ringCue} />
  }
  return null
}
```
The `return null` fallback for `frame === null && idleMode == null` is dead in the production call chain — `PracticeScreen.tsx:75` always passes `idleMode={vm.featureFlags.orbIdle}`, and `orbIdle` defaults to `'ambient'` (never `null`/`undefined`). The path is reachable only from direct OrbShape callers that omit `idleMode` (e.g. tests calling `<OrbShape frame={sampleFrame} ...>` without the prop) and on the lead-in / nkPhase paths that short-circuit above.

Not a defect — defensible defensive coding. Worth flagging only because the comment at line 75-76 says "OrbShape now owns the idle null-return guard that BreathingShape's dispatcher used to own" — but the guard now also gates the `idleMode == null` case, which is no longer the actual production idle path.

**Fix:** No code change required. Consider tightening the comment at line 75 if a future refactor revisits this area.

### IN-03: `innerVisible` / `innerSizePct` computed unconditionally inside OrbContainer

**File:** `src/components/OrbShape.tsx:328-329`
**Issue:**
```tsx
const innerVisible = innerRingPhase === 'out' ? 1 : 0
const innerSizePct = `${(MIN_SCALE * 100).toFixed(2)}%`
```
These two locals are consumed only in the **else** branch of the `ringCue === 'progress-arc'` ternary at line 352 (i.e. the production `outer-inner` path). When `ringCue === 'progress-arc'`, both values are computed and discarded — including the unconditional `.toFixed(2)` template-string allocation per render. Negligible cost (one fixed-string + one ternary per OrbContainer render), but it's dead work on the progress-arc path.

**Fix:** No action required. Hoisting `innerSizePct` to module scope (the value is constant — `MIN_SCALE * 100`) would also be valid; doing so as part of an unrelated refactor is fine, but it's noise to change in this phase.

### IN-04: `ringCue` prop threaded to NaviKriya surface has zero render effect (acknowledged in plan)

**File:** `src/app/NaviKriyaSessionSurface.tsx:17, 27, 39`
**Issue:** The NK surface forwards `ringCue` into the `OrbShape` only on the lead-in / Idle path (`frame={null}` at line 34, with NK's own NKShape handling the main render at lines 42-50). All of OrbShape's `showRings={false}` branches (OrbLeadIn at line 261, OrbIdle at line 216, showCompletion at line 104) drop the `ringCue` value before reaching the inner-ring slot. So this prop has **no observable effect** on the NK surface.

The 45-03-PLAN explicitly documents this ("the threaded `ringCue` prop has zero render effect there but the type chain is consistent"). Not a bug — type symmetry is a legitimate reason to thread. Flagged for awareness only.

**Fix:** None.

---

_Reviewed: 2026-05-25T12:25:00Z_
_Reviewer: Claude (gsd-code-reviewer)_
_Depth: standard_
