---
phase: 17-visual-variants
plan: "01"
subsystem: ui
tags: [css-rename, shape-marker, orb-ring, phase-17, react, tailwind]

# Dependency graph
requires:
  - phase: 13-inner-ring-ux-symmetry
    provides: inner reference ring CSS rules (.orb-ring--inner) and Phase 13 reduced-motion D-03 suppression contract
  - phase: 16-3-thorough-theme-revision
    provides: stable 5-palette token surface (--color-ring-outer/inner unchanged by this plan)
provides:
  - Renamed boundary-marker class hierarchy .shape-marker--{outer,inner} in theme.css
  - BreathingShape.tsx emitting .shape-marker--{outer,inner} on all 4 reference-marker spans
  - Test selectors updated to .shape-marker--{outer,inner} in BreathingShape.test.tsx and App.session.test.tsx
affects:
  - 17-02 (OrbShape extraction — bakes in renamed classes from this plan)
  - 17-03 (per-variant CSS overrides via [data-variant='X'] — extends .shape-marker--* hierarchy)

# Tech tracking
tech-stack:
  added: []
  patterns:
    - "CSS class rename: .orb-ring--{outer,inner} → .shape-marker--{outer,inner} (D-15 atlas)"
    - "Single class hierarchy per boundary marker that per-variant [data-variant] attribute selectors extend"

key-files:
  created: []
  modified:
    - src/styles/theme.css
    - src/components/BreathingShape.tsx
    - src/components/BreathingShape.test.tsx
    - src/app/App.session.test.tsx

key-decisions:
  - "D-15 (carry-forward): CSS variable names --color-ring-{outer,inner} are UNCHANGED — only rule selectors renamed"
  - "D-14 (carry-forward): Phase 13 @media (prefers-reduced-motion: reduce) .shape-marker--inner {display:none} preserved via class reuse — no per-variant @media blocks introduced"
  - "Atomic commit: Tasks 1+2 land as a single commit per D-17 per-commit green-gate — partial rename would break the test suite"

patterns-established:
  - "shape-marker--outer: the MAX_SCALE boundary ring; shape-marker--inner: the MIN_SCALE arrival cue; [data-variant] overrides extend these in Plan 03"

requirements-completed:
  - VARIANT-02
  - VARIANT-04

# Metrics
duration: 4min
completed: 2026-05-14
---

# Phase 17 Plan 01: CSS Rename `.orb-ring--*` → `.shape-marker--*` Summary

**Mechanical CSS class rename unblocking Plan 03 per-variant overrides: 4 rule selectors in theme.css + 4 className sites in BreathingShape.tsx + 6 querySelector sites in tests renamed atomically with zero behavioral change and full green gate**

## Performance

- **Duration:** ~4 min
- **Started:** 2026-05-14T11:53:27Z
- **Completed:** 2026-05-14T11:56:53Z
- **Tasks:** 2 (committed atomically as one)
- **Files modified:** 4

## Accomplishments

- Renamed 4 CSS rule selectors in `src/styles/theme.css`: `.orb-ring--outer` → `.shape-marker--outer`, `.orb-ring--inner` → `.shape-marker--inner`, `[data-phase='out'] .orb-ring--inner` → `[data-phase='out'] .shape-marker--inner`, and `@media (prefers-reduced-motion: reduce) .orb-ring--inner` → `.shape-marker--inner` — plus 1 comment reference updated
- Rewrote 4 `className` attributes in `src/components/BreathingShape.tsx` (Body outer, Body inner, LeadIn outer, LeadIn inner) + 1 prose comment at line 66
- Updated 6 `querySelector` + test-description sites in `src/components/BreathingShape.test.tsx` (WR-03 structural contract block, Body + LeadIn sections)
- Updated 2 `querySelector` references in `src/app/App.session.test.tsx` (lines 104-105)
- CSS variable names `--color-ring-outer` and `--color-ring-inner` are byte-identical before and after (12 occurrences unchanged)
- Phase 13 D-03 reduced-motion `display: none` rule preserved targeting `.shape-marker--inner` (VARIANT-04 satisfied via class reuse, no per-variant @media blocks introduced)
- `tsc && lint && build && test` exit 0 at commit boundary (D-17 per-commit green-gate; 509/509 tests pass)

## Task Commits

Tasks 1 and 2 landed as a single atomic commit per D-17 per-commit green-gate (partial rename would break the test suite between the two tasks):

1. **Task 1 + Task 2 (atomic): rename .orb-ring--* → .shape-marker--* across all 4 files** - `76a4067` (feat)

**Plan metadata:** `[pending docs commit]`

## Files Created/Modified

- `src/styles/theme.css` — 4 CSS rule-selector renames (lines 364, 381, 388, 435) + 1 comment at line 427; CSS variable names `--color-ring-{outer,inner}` unchanged
- `src/components/BreathingShape.tsx` — 4 className rewrites (lines 75, 127, 176, 207) + 1 prose comment at line 66
- `src/components/BreathingShape.test.tsx` — 6 querySelector + test-description renames (lines 144, 146, 160, 162, 169, 171, 232, 234, 246, 248, 255, 257)
- `src/app/App.session.test.tsx` — 2 querySelector renames (lines 104-105)

## Decisions Made

- Atomic commit for Tasks 1+2: the plan specifies `npm test` will fail between Task 1 and Task 2 (tests still query `.orb-ring--*` against the renamed DOM). Per D-17, both tasks land in a single commit so the rendered DOM and the test queries stay in sync at the commit boundary.

## Deviations from Plan

None - plan executed exactly as written. Pure mechanical rename with no behavioral change.

## Issues Encountered

Minor: Initial edits were accidentally applied to the main repo (`/Users/lucindo/Code/hrv/src/...`) instead of the worktree (`/Users/lucindo/Code/hrv/.claude/worktrees/agent-a55a70366bf428e33/src/...`). The main repo files were restored via `git checkout --` immediately after detection, and all edits were reapplied to the correct worktree paths. No committed state was affected.

## User Setup Required

None - no external service configuration required.

## Next Phase Readiness

- Plan 02 (OrbShape extraction) can proceed — `.shape-marker--{outer,inner}` class names are baked in as the canonical boundary-marker class hierarchy
- Plan 03 (per-variant CSS overrides via `[data-variant='X']`) can extend `.shape-marker--*` selectors without three parallel class sets
- VARIANT-02 (zero-regression) and VARIANT-04 (reduced-motion Phase 13 contract preserved) are satisfied

---
*Phase: 17-visual-variants*
*Completed: 2026-05-14*
