---
phase: 17-visual-variants
plan: 02
subsystem: ui
tags: [react, typescript, vitest, tailwind, orb, extraction, shape-variants]

# Dependency graph
requires:
  - phase: 17-01
    provides: .shape-marker--outer/--inner CSS class rename applied (was .orb-ring--)

provides:
  - src/components/shapeConstants.ts — exported MIN_SCALE/MAX_SCALE/MID_SCALE constants with IN-01 sync-with-CSS comments
  - src/components/OrbShape.tsx — verbatim extract of BreathingShapeBody + BreathingShapeLeadIn with data-variant="orb" on both roots
  - src/components/OrbShape.test.tsx — migrated Body + LeadIn + Phase 5.1 WR-03 structural contract tests + 2 new data-variant tests
  - src/components/BreathingShape.tsx — slimmed to 27-LOC delegate (dispatcher pattern, no variant prop yet)
  - src/components/BreathingShape.test.tsx — slimmed to dispatcher smoke only

affects:
  - 17-03 (SquareShape + RingShape — imports shapeConstants.ts)
  - 17-05 (variant dispatcher — replaces BreathingShape.tsx delegate body with 3-way switch)

# Tech tracking
tech-stack:
  added: []
  patterns:
    - "Three-sibling shape files architecture: OrbShape.tsx is first sibling; dispatcher-in-BreathingShape.tsx pattern established"
    - "shapeConstants.ts single-source-of-truth for MIN/MAX/MID_SCALE — importable by all three sibling shapes without circular deps"
    - "data-variant attribute render-local only (on shape root div, never on <html>) — D-16"
    - "D-04: dispatcher owns idle null-return guard; sibling shapes never see the idle case"

key-files:
  created:
    - src/components/shapeConstants.ts
    - src/components/OrbShape.tsx
    - src/components/OrbShape.test.tsx
  modified:
    - src/components/BreathingShape.tsx
    - src/components/BreathingShape.test.tsx

key-decisions:
  - "D-04: OrbShape does NOT own the idle null-return — BreathingShape dispatcher guards that; OrbShape's caller guarantees frame !== null when leadInDigit is null"
  - "D-16: data-variant='orb' rendered locally on both Body + LeadIn roots; no global <html data-variant> write"
  - "D-23 THEME-UI-01 guard maintained: OrbShape is a verbatim extraction with all color references via var(--color-*) tokens; zero hardcoded text-{slate,teal}-* classes"
  - "No variant prop added in this plan — Plan 05 owns the 3-way variant switch in BreathingShape"

patterns-established:
  - "shapeConstants.ts extraction pattern: pure-constants module (no React import) exportable to all shape components and tests"
  - "Verbatim-extract + data-variant addition: sibling shapes copy Body+LeadIn verbatim then add data-variant on root — VARIANT-02 zero-regression provable via git diff"
  - "Test migration pattern: structural assertions follow the component they test (WR-03 block moved to OrbShape.test.tsx; BreathingShape.test.tsx retains only dispatcher smoke)"

requirements-completed:
  - VARIANT-02
  - VARIANT-05

# Metrics
duration: 4min
completed: 2026-05-14
---

# Phase 17 Plan 02: OrbShape Extraction Summary

**Verbatim OrbShape.tsx extraction from BreathingShape.tsx with shapeConstants.ts single-source-of-truth and Phase 5.1 WR-03 structural tests migrated**

## Performance

- **Duration:** 4 min
- **Started:** 2026-05-14T11:59:47Z
- **Completed:** 2026-05-14T12:04:14Z
- **Tasks:** 3
- **Files modified:** 5 (2 created new, 3 modified)

## Accomplishments
- Extracted 3 shared scale constants to `shapeConstants.ts` with IN-01 sync-with-CSS comment block preserved verbatim
- Created `OrbShape.tsx` as a verbatim extract of BreathingShape Body + LeadIn subtrees with `data-variant="orb"` on both roots (VARIANT-02 zero-regression)
- Migrated all Phase 5.1 WR-03 structural contract tests + body/lead-in rendering tests into `OrbShape.test.tsx`; added 2 new `data-variant="orb"` attribute tests
- Slimmed `BreathingShape.tsx` from ~225 LOC to 27 LOC (thin delegate to OrbShape); `BreathingShape.test.tsx` to 4 dispatcher-smoke tests
- THEME-UI-01 and THEME-05 guards stayed green; no hardcoded color classes introduced

## Task Commits

Each task was committed atomically:

1. **Task 1: Create shapeConstants.ts** - `dd7228a` (feat)
2. **Task 2: Create OrbShape.tsx** - `2d124b4` (feat)
3. **Task 3: Migrate tests + slim BreathingShape** - `acd6e06` (feat)

## Files Created/Modified
- `src/components/shapeConstants.ts` - 3 exported numeric constants (MIN_SCALE 0.58, MAX_SCALE 1.0, MID_SCALE 0.79) with IN-01 sync-with-theme.css comments
- `src/components/OrbShape.tsx` - OrbShape dispatcher + module-private OrbBody + OrbLeadIn; imports from shapeConstants; data-variant="orb" on both roots
- `src/components/OrbShape.test.tsx` - Migrated structural + render tests from BreathingShape.test.tsx + WR-03 block + 2 new data-variant assertion tests
- `src/components/BreathingShape.tsx` - 27-LOC delegate to OrbShape (idle null-return owned here per D-04; no variant prop yet)
- `src/components/BreathingShape.test.tsx` - 4 dispatcher-smoke tests only (idle null-return, body smoke, lead-in smoke, lead-in-priority)

## Decisions Made
- Preserved the `// Reason:` annotation policy (Phase 7 D-04) for the non-null assertion on `frame!` in OrbShape
- No `variant` prop added in this plan — Plan 05 owns the 3-way variant switch; BreathingShape delegates unconditionally to OrbShape in Plan 02
- shapeConstants.ts has no React import (pure-constants module) so Plan 03 (SquareShape + RingShape) can import without test-side React-environment costs

## Deviations from Plan

None — plan executed exactly as written. One auto-fix applied under Rule 2 (correctness):

### Auto-fixed Issues

**1. [Rule 2 - Missing Critical] Added eslint-disable Reason annotation for non-null assertion**
- **Found during:** Task 2 (OrbShape.tsx creation)
- **Issue:** `frame!` non-null assertion triggered `@typescript-eslint/no-non-null-assertion` lint error; project policy (Phase 7 D-04) requires `// Reason:` annotation before each `// eslint-disable-next-line` directive
- **Fix:** Added `// Reason: BreathingShape dispatcher asserts frame !== null before delegating to OrbShape when leadInDigit is null.` comment above the disable directive
- **Files modified:** src/components/OrbShape.tsx
- **Verification:** `npm run lint` exits 0
- **Committed in:** 2d124b4 (Task 2 commit)

---

**Total deviations:** 1 auto-fixed (1 Rule 2 — missing annotation required by project policy)
**Impact on plan:** Annotation required for lint compliance. No scope creep.

## Issues Encountered
None beyond the lint annotation fix above.

## Carry-Forward Guard Checks
- `src/styles/theme.contrast.test.ts` — THEME-05 ≥ 1.5 contrast guard: PASSED (no token edits in this plan)
- `src/styles/theme.no-hardcoded-classes.test.ts` — THEME-UI-01 guard: PASSED (OrbShape is verbatim extraction; same token bindings; `grep -nE "text-(white|black|slate-|teal-)" src/components/OrbShape.tsx` returned 0 matches)
- All 6 theme test files, 46 tests: PASSED

## Known Stubs
None — OrbShape renders the same orb body + lead-in as the pre-Plan-02 BreathingShape. No placeholder text or empty data sources.

## Next Phase Readiness
- `shapeConstants.ts` is ready for Plan 03 (SquareShape + RingShape) to import
- `OrbShape.tsx` interface (`OrbShapeProps: { frame, leadInDigit? }`) is the template for SquareShape + RingShape prop interfaces (D-08 identical typography/centering)
- `BreathingShape.tsx` dispatcher is ready for Plan 05 to add `variant: VisualVariantId` prop and 3-way switch
- No `variant` prop in BreathingShape yet — Plan 05 owns that change (CONTEXT.md D-03)

---
*Phase: 17-visual-variants*
*Completed: 2026-05-14*
