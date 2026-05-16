---
phase: 29-settings-install-entry-localization
plan: 01
subsystem: ui
tags: [react, typescript, i18n, pwa, install-banner, component-extraction]

# Dependency graph
requires:
  - phase: 28-phone-install-banner
    provides: InstallBanner component with iOS steps block and IOsShareIcon helper; UiStrings.install interface (8 keys, EN final, PT-BR draft)

provides:
  - IosInstallSteps shared component (id + strings props) extracted from InstallBanner; IOsShareIcon co-located
  - IosInstallSteps.test.tsx with 3 unit tests
  - InstallBanner refactored to delegate iOS steps to IosInstallSteps (no behavior change)
  - UiStrings.install.settingsLabel key added to interface and both EN and PT-BR locale entries

affects:
  - 29-02 (Settings install row — imports IosInstallSteps and uses settingsLabel)

# Tech tracking
tech-stack:
  added: []
  patterns:
    - "Shared presentational component with id prop — caller supplies unique DOM id (Pitfall 3 mitigation)"
    - "IOsShareIcon co-located in consuming component to avoid circular-dependency risk"
    - "UiStrings interface + both locale entries extended atomically (as const satisfies exhaustiveness check)"

key-files:
  created:
    - src/components/IosInstallSteps.tsx
    - src/components/IosInstallSteps.test.tsx
  modified:
    - src/components/InstallBanner.tsx
    - src/content/strings.ts

key-decisions:
  - "IOsShareIcon helper moved into IosInstallSteps.tsx (not a separate file) to avoid circular-dependency risk per RESEARCH.md Pattern 2"
  - "settingsLabel PT-BR value is draft ('Instalar para uso offline') — review markers and finalization deferred to Plan 02 per plan spec"

patterns-established:
  - "Shared iOS steps component: accepts id prop (no hardcoded DOM id) so each consumer (banner, settings) sets a unique id matching its aria-controls target"

requirements-completed: [INSTALL-06, INSTALL-07]

# Metrics
duration: 3min
completed: 2026-05-16
---

# Phase 29 Plan 01: IosInstallSteps Component Extraction & settingsLabel String Key

**Shared IosInstallSteps component extracted from InstallBanner (single source of truth for iOS steps), InstallBanner refactored with no behavior change, and UiStrings.install.settingsLabel added to interface plus both locales**

## Performance

- **Duration:** ~3 min
- **Started:** 2026-05-16T18:55:05Z
- **Completed:** 2026-05-16T18:57:58Z
- **Tasks:** 3
- **Files modified:** 4 (2 new, 2 edited)

## Accomplishments

- Created `IosInstallSteps.tsx`: named component + props interface accepting `id` and `strings`; IOsShareIcon moved here; no hardcoded DOM id
- Written 3 unit tests covering step text rendering, id prop propagation, and Share SVG presence (990/990 tests pass; +3 from baseline)
- Refactored `InstallBanner.tsx` to delegate `{isIOS && iosExpanded && ...}` to `<IosInstallSteps id="install-ios-steps" strings={strings} />`; IOsShareIcon removed; all 7 existing InstallBanner tests pass unchanged
- Extended `UiStrings.install` interface and both locale entries with `settingsLabel`: EN `'Install for offline use'` (final), PT-BR `'Instalar para uso offline'` (draft for Plan 02 review)

## Task Commits

1. **Task 1: Create the shared IosInstallSteps component** - `eccfeef` (feat)
2. **Task 2: Write IosInstallSteps unit tests and refactor InstallBanner** - `324beca` (feat)
3. **Task 3: Add settingsLabel key to UiStrings.install in both locales** - `34d8939` (feat)

## Files Created/Modified

- `src/components/IosInstallSteps.tsx` (NEW) — Shared iOS step list component; exports `IosInstallSteps` function and `IosInstallStepsProps` interface; IOsShareIcon co-located
- `src/components/IosInstallSteps.test.tsx` (NEW) — 3 unit tests: all step texts rendered, id prop propagated, Share SVG aria-hidden present
- `src/components/InstallBanner.tsx` (MODIFIED) — Import + render `<IosInstallSteps>` replacing inline steps block; IOsShareIcon removed
- `src/content/strings.ts` (MODIFIED) — `UiStrings.install` interface + EN + PT-BR entries extended with `settingsLabel`

## Decisions Made

- IOsShareIcon co-located in `IosInstallSteps.tsx` (not a separate shared icon file) — avoids circular-dependency risk noted in RESEARCH.md Pattern 2; no other component references this SVG
- PT-BR `settingsLabel` value drafted inline without a review marker in this plan — per plan spec, the review-marker workflow and operator sign-off are handled in Plan 02

## Deviations from Plan

**1. Minor: Removed `install-ios-steps` string from JSDoc comment in IosInstallStepsProps**
- **Found during:** Task 1 (acceptance criteria verification)
- **Issue:** Initial JSDoc comment `// unique per surface — "install-ios-steps" / "settings-ios-steps"` caused `grep -c 'install-ios-steps'` to return 1, failing the acceptance criterion of 0 occurrences
- **Fix:** Changed to a JSDoc `/** ... */` comment without the hardcoded id strings
- **Files modified:** `src/components/IosInstallSteps.tsx`
- **Committed in:** `eccfeef` (Task 1 commit)

---

**Total deviations:** 1 minor auto-fix (comment text adjustment to satisfy acceptance criteria)
**Impact on plan:** No scope change; fix is strictly cosmetic/documentation.

## Issues Encountered

None — all tasks completed in first attempt.

## Known Stubs

None — no stubs introduced. `settingsLabel` strings are real EN/PT-BR values (PT-BR is draft, not empty/placeholder).

## Next Phase Readiness

- `IosInstallSteps` component ready for import by the Settings install row (Plan 02)
- `UiStrings.install.settingsLabel` available in interface and both locales — Plan 02 can read it immediately
- 990/990 tests green; `npx tsc --noEmit -p tsconfig.app.json` exits 0
- Plan 02 owns: SettingsDialog props extension, install row UI, App.tsx prop-drill, PT-BR review-marker workflow

---
*Phase: 29-settings-install-entry-localization*
*Completed: 2026-05-16*
