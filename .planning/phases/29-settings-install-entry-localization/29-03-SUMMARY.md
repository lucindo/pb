---
phase: 29-settings-install-entry-localization
plan: "03"
subsystem: ui
tags: [react, tailwind, theme, css-variables, accessibility, wcag, ios, pwa]

# Dependency graph
requires:
  - phase: 29-settings-install-entry-localization
    provides: IosInstallSteps shared component (Plan 29-01) with defective color-less step 2 & 3 <li> elements
  - phase: 16-theme
    provides: --color-breathing-muted and --color-breathing-accent-strong CSS variable tokens defined for all 5 themes

provides:
  - IosInstallSteps component with theme-aware text color on all 3 iOS install step <li> elements
  - GAP-1 regression test in IosInstallSteps.test.tsx pinning token classes
  - WCAG AA contrast restored on dark themes (dark, dusk) for iOS install step instructions

affects:
  - InstallBanner (consumer of IosInstallSteps — dark-theme readability fixed)
  - SettingsDialog install row (consumer of IosInstallSteps — dark-theme readability fixed)

# Tech tracking
tech-stack:
  added: []
  patterns:
    - "Tailwind arbitrary-value class text-[var(--color-*)] for theme-aware text color on all interactive/step list items"
    - "TDD red/green: temporary failing test in .test.tsx to gate fix, replaced by proper regression in Task 2"

key-files:
  created: []
  modified:
    - src/components/IosInstallSteps.tsx
    - src/components/IosInstallSteps.test.tsx

key-decisions:
  - "Used --color-breathing-muted for steps 2 and 3 per 29-UI-SPEC §Color contract (already recorded dark contrast = 5.36 in theme.css Phase 16.3-03 comment)"
  - "Wrote TDD-RED failing test first, then fixed component, then replaced with proper regression test in Task 2"

patterns-established:
  - "All <li> elements in iOS install step lists must carry explicit var(--color-breathing-*) className — no item may inherit the page-default near-black color"

requirements-completed: [INSTALL-06]

# Metrics
duration: 4min
completed: 2026-05-16
---

# Phase 29 Plan 03: iOS Install Steps Dark-Theme Readability Fix Summary

**GAP-1 closed: added `text-[var(--color-breathing-muted)]` to iOS install steps 2 and 3 in the shared `IosInstallSteps` component, restoring WCAG AA contrast on all 5 themes including dark (muted-vs-bg = 5.36) and dusk.**

## Performance

- **Duration:** ~4 min
- **Started:** 2026-05-16T18:02:00Z
- **Completed:** 2026-05-16T18:05:00Z
- **Tasks:** 2
- **Files modified:** 2

## Accomplishments

- Applied `text-[var(--color-breathing-muted)]` className to step 2 and step 3 `<li>` elements in `IosInstallSteps.tsx`; step 1 keeps `text-[var(--color-breathing-accent-strong)]` per 29-UI-SPEC §Color
- All three iOS install step list items now carry explicit theme-aware `var(--color-breathing-*)` text-color tokens — none inherits the page-default near-black color
- Added GAP-1 regression test asserting the readability invariant (every `<li>` has a `var(--color-breathing-` class, specific contract: step 1 = accent-strong, steps 2 & 3 = muted)
- 38/38 tests pass across IosInstallSteps, InstallBanner, SettingsDialog, and theme.no-hardcoded-classes suites

## Task Commits

Each task was committed atomically:

1. **Task 1: Apply theme-aware muted token to iOS step 2 and step 3** - `f755ff5` (feat)
2. **Task 2: Add regression test pinning the theme-aware token classes** - `4fb7063` (test)

## Files Created/Modified

- `src/components/IosInstallSteps.tsx` - Added `className="text-[var(--color-breathing-muted)]"` to step 2 and step 3 `<li>` elements; updated comment to reflect all 3 steps carry theme-aware tokens
- `src/components/IosInstallSteps.test.tsx` - Added GAP-1 regression test (4th test case) asserting all three `<li>` elements carry `var(--color-breathing-*` and specific contract for each step

## Decisions Made

- Used `--color-breathing-muted` for steps 2 and 3 per 29-UI-SPEC §Color contract. The token's WCAG AA compliance on dark themes was already confirmed (dark muted-vs-bg = 5.36, clears body floor 4.5) in the Phase 16.3-03 comment block in `theme.css`.
- TDD: wrote failing test first (RED), fixed component (GREEN), then refined to proper regression test in Task 2 — the TDD-RED stub label was replaced with the canonical GAP-1 regression label.

## Deviations from Plan

None - plan executed exactly as written.

## Issues Encountered

None.

## User Setup Required

None - no external service configuration required.

## Known Stubs

None - all three iOS install steps render localized string content from `UI_STRINGS.en.install` and `UI_STRINGS.pt.install`; the theme-aware color tokens resolve correctly at runtime via CSS custom properties.

## Threat Flags

None - this change only modifies presentational CSS-variable class strings on an existing pure-presentational component. No new network endpoints, auth paths, file access patterns, or trust boundaries introduced.

## Self-Check

- [x] `src/components/IosInstallSteps.tsx` modified and committed at f755ff5
- [x] `src/components/IosInstallSteps.test.tsx` modified and committed at 4fb7063
- [x] `grep -c 'text-[var(--color-breathing-muted)]' src/components/IosInstallSteps.tsx` = 2
- [x] `grep -c 'text-[var(--color-breathing-accent-strong)]' src/components/IosInstallSteps.tsx` = 1
- [x] 4/4 IosInstallSteps tests pass; 38/38 verification suite tests pass
- [x] tsc --noEmit exits 0

## Next Phase Readiness

- GAP-1 from 29-VERIFICATION.md is closed: iOS install step instructions are readable on all 5 themes on both InstallBanner and SettingsDialog surfaces
- INSTALL-06 acceptance restored
- Phase 29 is now complete (Plans 01, 02, and 03 all done)

---
*Phase: 29-settings-install-entry-localization*
*Completed: 2026-05-16*
