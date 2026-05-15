---
phase: 25-labels-vs-icons-cue-toggle
plan: "03"
subsystem: components
tags: [cue-glyph, svg, accessibility, tdd, phase-label]
dependency_graph:
  requires: [25-01]
  provides: [CueGlyph, cue-prop-threading]
  affects: [OrbShape, SquareShape, DiamondShape, BreathingShape]
tech_stack:
  added: []
  patterns:
    - aria-hidden SVG + sr-only visually-hidden text (CUE-03)
    - CueStyleId prop threading through dispatcher → shapes → CueGlyph
    - Token-only SVG colors via currentColor
key_files:
  created:
    - src/components/CueGlyph.tsx
    - src/components/CueGlyph.test.tsx
  modified:
    - src/components/BreathingShape.tsx
    - src/components/BreathingShape.test.tsx
    - src/components/OrbShape.tsx
    - src/components/OrbShape.test.tsx
    - src/components/SquareShape.tsx
    - src/components/SquareShape.test.tsx
    - src/components/DiamondShape.tsx
    - src/components/DiamondShape.test.tsx
decisions:
  - Arrow SVG uses candidate F soft-solid filled chevron path data from 25-cue-icon-mockup.html
  - Nose SVG uses candidate D2 nose outline + straight up/down arrows from 25-cue-icon-mockup.html
  - ESLint fix: String() coercion applied to numeric SVG line coordinate key templates
metrics:
  duration: ~25 minutes
  completed: "2026-05-15"
  tasks_completed: 2
  files_changed: 9
---

# Phase 25 Plan 03: CueGlyph Component and Prop Threading Summary

One-liner: CueGlyph renders labels/arrow/nose cue modes with aria-hidden SVG + sr-only screen-reader text (CUE-03); threaded through BreathingShape to all 3 shape variants.

## Tasks Completed

| # | Name | Commit | Files |
|---|------|--------|-------|
| 1 | Create the CueGlyph component (labels/arrow/nose) | 2535175 | CueGlyph.tsx, CueGlyph.test.tsx |
| 2 | Thread the cue prop through BreathingShape and the three shapes | b3e7ba9 | BreathingShape.tsx, OrbShape.tsx, SquareShape.tsx, DiamondShape.tsx + tests |

## What Was Built

**CueGlyph** (`src/components/CueGlyph.tsx`): Single component owning all 3 cue modes:
- `labels`: returns the byte-identical phase-label `<span>` from the original shape files — zero regression.
- `arrow`: renders candidate-F soft-solid chevron SVG (`aria-hidden="true"`) sized to `h-12 w-12 sm:h-16 sm:w-16` (text-5xl/sm:text-6xl footprint, D-08), plus a `sr-only` span carrying `phaseLabel` (CUE-03). Up chevron = In, down = Out (D-03).
- `nose`: renders candidate-D2 nose outline (3 bezier path segments, identical for In/Out) plus straight arrows (up for In, down for Out), same `aria-hidden` + `sr-only` pattern (CUE-03).
- All modes: token-only colors via `currentColor` from `var(--color-orb-in-text)` / `var(--color-orb-out-text)`, never hardcoded hex (D-23). Static — no animation elements (D-08).

**Prop threading**: `BreathingShape` receives optional `cue?: CueStyleId` (default `'labels'`), forwards it to all 3 shapes in the switch. Each shape's `*Body` calls `<CueGlyph cue={cue} phase={frame.phase} phaseLabel={phaseLabel} />` in place of the original span. `*LeadIn` functions untouched — countdown digit unchanged in all cue modes (D-07).

## TDD Gate Compliance

- RED commit (`0d35bfc`): failing tests for CueGlyph (import resolution error).
- GREEN commit (`2535175`): implementation — 28 tests pass.
- RED commit (`84283b2`): failing tests for prop threading (17 failures).
- GREEN commit (`b3e7ba9`): threading implementation — 134 tests pass total.

Both RED → GREEN gates satisfied.

## Verification Results

- `npx tsc -b` exits 0
- `npx eslint src/components/CueGlyph.tsx src/components/BreathingShape.tsx src/components/OrbShape.tsx src/components/SquareShape.tsx src/components/DiamondShape.tsx` exits 0
- `npx vitest run` across all 5 test files: 134/134 pass
- No hardcoded hex colors in CueGlyph.tsx
- `aria-hidden="true"` present on both SVG branches (arrow + nose)
- `sr-only` present in both SVG branches (CUE-03)
- `OrbLeadIn` / `SquareLeadIn` / `DiamondLeadIn` signatures carry no `cue` param (D-07)
- Exactly 1 `<CueGlyph` per shape file
- 3 `cue=` props in BreathingShape switch (one per shape)

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 1 - Bug] ESLint template literal type error on numeric SVG line coordinates**
- **Found during:** Task 2 (ESLint verification pass after GREEN implementation)
- **Issue:** `@typescript-eslint/restrict-template-expressions` rejects `${l.x1}` where `l.x1: number` — strict ESLint rule disallows numeric interpolation in template literals.
- **Fix:** Applied `String(l.x1)` coercion to all 4 coordinate values in the `key` template literal on line 114.
- **Files modified:** `src/components/CueGlyph.tsx`
- **Commit:** b3e7ba9 (included in same GREEN commit)

**2. [Rule 1 - Bug] Test assertion used wrong selector for SVG fill attribute**
- **Found during:** Task 1 GREEN run (1 of 28 tests failed)
- **Issue:** Test used `svg!.querySelector('[fill="none"]')` which searches *children* of SVG, but `fill="none"` is on the SVG root element itself — querySelector returns null.
- **Fix:** Updated test to `svg!.getAttribute('fill')` and `svg!.getAttribute('stroke')` to check the SVG element's own attributes.
- **Files modified:** `src/components/CueGlyph.test.tsx`
- **Commit:** 2535175 (included in same GREEN commit)

## Known Stubs

None — all data is wired from props. phaseLabel derives from the shape's locale-aware `strings.inhale`/`strings.exhale`. SVG path data is sourced from 25-cue-icon-mockup.html candidates F and D2.

## Threat Flags

None beyond the threat model already in the plan (T-25-05, T-25-06). T-25-06 mitigation (sr-only + aria-hidden pattern) is implemented and tested. No new network endpoints, auth paths, or storage writes introduced.

## Self-Check: PASSED

Files created:
- src/components/CueGlyph.tsx — FOUND
- src/components/CueGlyph.test.tsx — FOUND

Files modified:
- src/components/BreathingShape.tsx — FOUND (cue prop added)
- src/components/OrbShape.tsx — FOUND (CueGlyph swapped in)
- src/components/SquareShape.tsx — FOUND (CueGlyph swapped in)
- src/components/DiamondShape.tsx — FOUND (CueGlyph swapped in)

Commits verified:
- 0d35bfc: test(25-03) RED CueGlyph tests
- 2535175: feat(25-03) CueGlyph implementation
- 84283b2: test(25-03) RED shape prop-threading tests
- b3e7ba9: feat(25-03) shape prop-threading implementation
