---
phase: 17-visual-variants
plan: "03"
subsystem: ui
tags: [react, tailwind, css, shape-variant, phase-17, vitest]

# Dependency graph
requires:
  - phase: 17-02
    provides: OrbShape.tsx post-Plan-02 structure with data-variant='orb', shapeConstants.ts with MIN/MAX/MID_SCALE, shape-marker--outer/--inner CSS classes in theme.css, four-edge anchoring + GPU promotion patterns

provides:
  - SquareShape.tsx + SquareShapeProps: rounded-square Body + LeadIn with data-variant='square', rounded-[18%] on .orb host, rounded-[inherit] on layers, no rounded-full on markers
  - RingShape.tsx + RingShapeProps: annulus Body + LeadIn with data-variant='ring'; single TSX delta — all geometry identical to OrbShape; hollow center from CSS radial-gradient
  - src/styles/theme.css: 6 new Phase 17 per-variant override rules (4 marker + 2 radial-gradient)
affects:
  - 17-04 (useVariantChoice hook — will reference variant IDs 'orb' | 'square' | 'ring')
  - 17-05 (BreathingShape dispatcher — will import + render SquareShape and RingShape)
  - 17-06 (SettingsDialog variant picker — references variant IDs)

# Tech tracking
tech-stack:
  added: []
  patterns:
    - "Three-sibling shape architecture: OrbShape / SquareShape / RingShape each export { frame, leadInDigit } interface + Body + LeadIn sub-renders"
    - "CSS-only hollow center: Ring's annulus effect via [data-variant='ring'] .orb-layer--in/--out radial-gradient override — no TSX background prop"
    - "data-variant HTML attribute drives CSS attribute-selector cascade for per-variant geometry (border-radius, border-width, background)"
    - "Zero-new-token CSS override pattern: existing --color-orb-in/out-* tokens reused verbatim across all 3 variants; differentiation is geometric only"

key-files:
  created:
    - src/components/SquareShape.tsx
    - src/components/SquareShape.test.tsx
    - src/components/RingShape.tsx
    - src/components/RingShape.test.tsx
  modified:
    - src/styles/theme.css

key-decisions:
  - "Ring hollow center via CSS radial-gradient override only (Option D per RESEARCH) — no TSX background prop; confirmed by negative test assertion on .orb-layer--in/--out inline style"
  - "Square marker radius dropped from TSX (no rounded-full on .shape-marker--outer/--inner) and delegated to [data-variant='square'] CSS rule — clean separation of geometry from structure"
  - "Five-delta rule for Square vs one-delta rule for Ring: Square needs 5 TSX changes (data-variant + .orb + 2 layers + 2 markers); Ring needs only 1 (data-variant) because all Round geometry is default"

patterns-established:
  - "Shape sibling pattern: new variants mirror OrbShape's { frame, leadInDigit } prop interface + Body/LeadIn module-private pattern; only data-variant + geometry-specific classes differ"
  - "TDD-first shape tests: test file written RED before implementation; 18+ assertions per variant covering smoke, attribute, geometry, anchoring, kinematics, reduced-motion, lead-in digit"

requirements-completed:
  - VARIANT-01
  - VARIANT-04
  - VARIANT-05

# Metrics
duration: 8min
completed: 2026-05-14
---

# Phase 17 Plan 03: Visual Variants — SquareShape + RingShape Shape Components Summary

**SquareShape (5-delta rounded-[18%] variant) and RingShape (single data-variant='ring' delta + CSS radial-gradient hollow center) created as wave-3 shape siblings to OrbShape, with 39 new tests and 6 per-variant CSS overrides in theme.css**

## Performance

- **Duration:** ~8 min
- **Started:** 2026-05-14T09:10:00Z
- **Completed:** 2026-05-14T09:17:37Z
- **Tasks:** 3
- **Files created/modified:** 5 (2 new .tsx, 2 new .test.tsx, 1 .css edit)

## Accomplishments

- SquareShape.tsx: Body + LeadIn with 5 geometry deltas vs OrbShape (`data-variant='square'`, `rounded-[18%]` on `.orb`, `rounded-[inherit]` on gradient layers, no `rounded-full` on markers); zero new CSS variables; all color references token-bound
- RingShape.tsx: Body + LeadIn with a single TSX delta (`data-variant='ring'`); all geometry (rounded-full, markers) verbatim; hollow annulus center delivered entirely via CSS radial-gradient override in theme.css
- theme.css: 6 new Phase 17 rules under section comment — 2 Square marker `border-radius: 18%` overrides + 2 Ring marker `border-width: 1px` overrides + 2 Ring `.orb-layer--in/--out` radial-gradient overrides
- 39 new tests (18 SquareShape + 21 RingShape) covering smoke, data-variant attribute, geometry classes, four-edge anchoring (D-20/D-21), kinematics GPU transform, reduced-motion MID_SCALE lock (VARIANT-04), lead-in digit typography (VARIANT-05), and negative no-inline-background assertion for Ring
- Full suite: 567/567 tests pass; THEME-05 + THEME-UI-01 guards both green; `tsc + lint + build` exit 0 at every commit boundary

## Task Commits

Each task was committed atomically:

1. **Task 1: SquareShape.tsx + SquareShape.test.tsx** - `c2ca951` (feat)
2. **Task 2: RingShape.tsx + RingShape.test.tsx** - `6c0e561` (feat)
3. **Task 3: theme.css 6 per-variant CSS overrides** - `a2d7e8b` (feat)

## Files Created/Modified

- `src/components/SquareShape.tsx` - SquareShape function + SquareShapeProps interface; Body + LeadIn with 5 geometric deltas (data-variant='square', rounded-[18%], rounded-[inherit] on layers, no rounded-full on markers); same kinematics + reduced-motion as OrbShape
- `src/components/SquareShape.test.tsx` - 18 tests: smoke, data-variant attribute, geometry classes, four-edge anchoring, kinematics, reduced-motion (MID_SCALE), lead-in digit (VARIANT-05)
- `src/components/RingShape.tsx` - RingShape function + RingShapeProps interface; Body + LeadIn with single TSX delta (data-variant='ring'); all other geometry verbatim from OrbShape; no inline background override (CSS owns hollow center)
- `src/components/RingShape.test.tsx` - 21 tests: smoke, data-variant attribute, rounded-full retention, four-edge anchoring, kinematics, reduced-motion (MID_SCALE), lead-in digit (VARIANT-05), negative no-inline-background assertion
- `src/styles/theme.css` - 6 new per-variant rules under Phase 17 section comment; positioned after `[data-phase='out'] .shape-marker--inner` rule, before dialog fade rules

## Decisions Made

- Ring hollow center delivered entirely via CSS `radial-gradient()` on `.orb-layer--in/--out` (RESEARCH Option D) — no TSX background prop. Verified via negative test `expect(layerIn.style.background).toBe('')`.
- Square marker geometry delegated to CSS: `rounded-full` dropped from `.shape-marker--outer/--inner` in SquareShape.tsx; `[data-variant='square'] .shape-marker--{outer,inner} { border-radius: 18% }` provides it. Ring keeps `rounded-full` on markers (CSS only thins the stroke to 1px).

## Deviations from Plan

None — plan executed exactly as written.

One minor lint fix (Rule 1): two `// eslint-disable-next-line @typescript-eslint/no-non-null-assertion` directives in `RingShape.test.tsx` were unnecessary (we used `as HTMLElement` cast, not `!` non-null assertion), triggering "unused eslint-disable directive" warnings. Removed during Task 2 implementation before commit.

## Known Stubs

None. SquareShape and RingShape are fully implemented shape components with complete kinematics, reduced-motion, and lead-in digit rendering. They are not yet UI-reachable — Plan 05 (BreathingShape dispatcher) will wire them. This is intentional per D-04 and the plan's verification note: "Square + Ring are exported but NOT yet wired into BreathingShape — they are unreachable from the UI until Plan 05."

## Threat Flags

None — SquareShape.tsx and RingShape.tsx are pure render components with no network calls, auth paths, file access, or schema changes. theme.css CSS additions are selector-only overrides with no new tokens or trust boundaries.

## Self-Check

Files created:
- src/components/SquareShape.tsx: FOUND
- src/components/SquareShape.test.tsx: FOUND
- src/components/RingShape.tsx: FOUND
- src/components/RingShape.test.tsx: FOUND
- src/styles/theme.css (modified): FOUND

Commits:
- c2ca951: FOUND (feat(17-03): create SquareShape component + tests with rounded-corner geometry)
- 6c0e561: FOUND (feat(17-03): create RingShape component + tests with single TSX delta)
- a2d7e8b: FOUND (feat(17-03): add 6 per-variant CSS overrides in theme.css)

## Self-Check: PASSED

## Issues Encountered

None — all tasks executed cleanly on first attempt.

## Next Phase Readiness

- SquareShape and RingShape are fully implemented and tested (wave 3 of 5)
- Plan 04 (useVariantChoice hook) and Plan 05 (BreathingShape dispatcher) can now complete the variant wiring
- Zero regression to OrbShape (Plan 03 does not modify OrbShape.tsx, OrbShape.test.tsx, or shapeConstants.ts)
- THEME-05 and THEME-UI-01 guards remain green — no new color tokens, no hardcoded classes

---
*Phase: 17-visual-variants*
*Completed: 2026-05-14*
