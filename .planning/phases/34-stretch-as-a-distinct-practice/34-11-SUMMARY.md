---
phase: 34-stretch-as-a-distinct-practice
plan: 11
subsystem: components/switcher
tags: [gap-closure, tdd, uat-gap-2, practice-toggle, glyph, layout]
dependency_graph:
  requires: [34-03]
  provides: [GAP-2-closed]
  affects: [src/components/PracticeToggle.tsx, src/components/PracticeToggle.test.tsx]
tech_stack:
  added: []
  patterns: [TDD red-green, inline SVG path, flex-container pill button]
key_files:
  created: []
  modified:
    - src/components/PracticeToggle.tsx
    - src/components/PracticeToggle.test.tsx
decisions:
  - "Flex layout added to pill button base class (applies to all treatments, not just B) — simpler and treatment-independent"
  - "Label wrapped in <span> makes it a first-class flex child, safe under both Treatment A and B"
  - "Stretch glyph uses the exact spike 007 S-curve path M2 13 Q5.5 2 9 9 T16 5.5 on 18x18 viewBox as locked by operator decision"
metrics:
  duration: 8m
  completed: 2026-05-19
  tasks_completed: 2
  files_modified: 2
  tests_added: 3
---

# Phase 34 Plan 11: GAP 2 — Inline Flex Layout + Spike S-Curve Stretch Glyph Summary

**One-liner:** Fixed Treatment B pill layout (flex inline glyph+label) and replaced the Stretch polyline glyph with the spike 007 S-curve path `M2 13 Q5.5 2 9 9 T16 5.5` on an 18x18 viewBox.

## What Was Built

Two bug fixes in `src/components/PracticeToggle.tsx` that closed UAT GAP 2 (minor):

**Fix 1 — Inline flex layout (DEFECT 1):**
The Treatment B pill `<button>` had no flex layout — `flex-1` was only for the pill's grid sizing within the row, not a flex container on the button itself. The SVG glyph and bare text node rendered as block-flow siblings, placing the icon at the top-left with the label dropping below. Added `flex items-center justify-center gap-1` to the pill's base class and wrapped the label in a `<span>` so glyph and label are two sibling flex children centered on one baseline.

**Fix 2 — Spike S-curve Stretch glyph (DEFECT 2):**
The `PracticeGlyph` stretch branch used a plain descending polyline `points="2,4 14,12"` on a 16x16 viewBox. Replaced with the spike 007 S-curve: `<path d="M2 13 Q5.5 2 9 9 T16 5.5" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">` on an 18x18 viewBox. The resonant (circle) and naviKriya (three circles) glyphs are untouched.

**Test updates (`PracticeToggle.test.tsx`):**
- Updated stretch glyph test from asserting `polyline` to asserting `path` with exact `d="M2 13 Q5.5 2 9 9 T16 5.5"`, `viewBox="0 0 18 18"`, and `stroke="currentColor"`
- Added layout regression test: each pill button's className must include `flex`, `items-center`, `justify-center`, and a `gap-` utility
- Added label `<span>` wrap test: each button must contain a `<span>` carrying the practice name

## Tasks

| # | Name | Commit | Files |
|---|------|--------|-------|
| 1 | RED: failing tests for S-curve path + flex layout | bc67c49 | PracticeToggle.test.tsx |
| 1 | GREEN: implement glyph + layout fixes | 24b145d | PracticeToggle.tsx |
| 2 | Verification: full suite + tsc gate | (no code change) | — |

## Verification Results

- `npx vitest run src/components/PracticeToggle.test.tsx` — 15/15 passed (was 13; 2 new describe blocks, 3 new tests)
- `npx vitest run` (full suite) — 1228/1228 passed (no regressions)
- `npx tsc -b` — exits 0, no type errors

## Acceptance Criteria Check

- [x] `grep -c "M2 13 Q5.5 2 9 9 T16 5.5" src/components/PracticeToggle.tsx` → 2
- [x] `grep -c 'viewBox="0 0 18 18"' src/components/PracticeToggle.tsx` → 1
- [x] No `polyline` in non-comment executable code → 0
- [x] `grep -c "items-center justify-center" src/components/PracticeToggle.tsx` → 1
- [x] Test asserts stretch glyph is `<path>` with `d="M2 13 Q5.5 2 9 9 T16 5.5"` on `0 0 18 18` viewBox
- [x] Tests assert each pill button has flex/items-center/justify-center/gap-* and wraps label in `<span>`

## Deviations from Plan

None — plan executed exactly as written. Both fixes applied as specified, TDD red-green cycle followed, all acceptance criteria met.

## TDD Gate Compliance

| Gate | Commit | Status |
|------|--------|--------|
| RED (test) | bc67c49 | PASSED — 3 tests fail before implementation |
| GREEN (feat) | 24b145d | PASSED — 15 tests pass after implementation |
| REFACTOR | (none needed) | N/A |

## Known Stubs

None — all changes are complete, correct implementations.

## Threat Flags

None — both fixes are corrections to static presentational code (an inline SVG path and CSS utility classes). No new untrusted input, no new network endpoints, no data flow changes.

## Self-Check

Files exist:
- [x] `src/components/PracticeToggle.tsx` — modified
- [x] `src/components/PracticeToggle.test.tsx` — modified

Commits exist:
- [x] bc67c49 — test(34-11) RED phase
- [x] 24b145d — feat(34-11) GREEN phase
