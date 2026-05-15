---
phase: 16-themes
plan: 01
subsystem: ui
tags: [css, tailwind-v4, theming, wcag, contrast, vitest, jsdom]

# Dependency graph
requires:
  - phase: 14-prefs-foundation
    provides: ThemeId union, THEME_OPTIONS array, DEFAULT_THEME constant in domain/settings.ts
  - phase: 15-settingsdialog-shell
    provides: ThemePicker.tsx stub that this CSS cascade backs
provides:
  - "5-palette CSS cascade: @theme Light baseline + 4 [data-theme='X']:root override blocks (Dark, Moss, Slate, Dusk)"
  - "Automated THEME-05 contrast guard: src/styles/theme.contrast.test.ts (5 themes × WCAG luminance ≥ 1.5)"
affects:
  - phase: 16-themes (plans 02-04 depend on this CSS cascade being live)
  - future palette-tweak contributions (test file is the regression guard)

# Tech tracking
tech-stack:
  added: []
  patterns:
    - "jsdom CSS cascade probe: readFileSync + @theme{->:root{ rewrite + <style> injection to test [data-theme] cascade"
    - "WCAG luminance contrast ratio: inline srgbToLinear + relativeLuminance helpers in test (D-18 no-new-deps)"
    - "[data-theme='X']:root flat override blocks (D-01 — same --color-* names, no semantic indirection)"

key-files:
  created:
    - src/styles/theme.contrast.test.ts
  modified:
    - src/styles/theme.css

key-decisions:
  - "Light palette: cool/neutral near-white (sky-in, orange-out; ratio 1.78) — distinct from Moss per D-03"
  - "Moss orb-out adjusted: original v1.0.1 out (#bfdbfe/#eef2ff) gave ratio 1.087 < 1.5 floor; adjusted to blue-500/blue-200 (ratio 1.94). All 15 non-orb-out tokens remain byte-identical to v1.0.1."
  - "Triple-slash /// <reference types='node' /> added to test file: tsconfig.app.json types:[vite/client] excluded @types/node; this avoids modifying tsconfig while providing correct typings for readFileSync/resolve."

patterns-established:
  - "TDD RED→GREEN: test file committed first (5 fails), then CSS rewrite committed (5 passes)"
  - "Contrast floor enforcement: all palette orb-in vs orb-out midpoints verified via automated THEME-05 test at commit"

requirements-completed:
  - THEME-03
  - THEME-05

# Metrics
duration: 15min
completed: 2026-05-12
---

# Phase 16 Plan 01: CSS Theme Token System Summary

**5-palette CSS cascade (Light/Dark/Moss/Slate/Dusk via @theme + [data-theme]:root overrides) with automated WCAG luminance contrast guard (≥ 1.5 on orb-in vs orb-out midpoints across all 5 themes)**

## Performance

- **Duration:** ~15 min
- **Started:** 2026-05-12T23:44:00Z
- **Completed:** 2026-05-12T23:56:00Z
- **Tasks:** 2 (both TDD)
- **Files modified:** 2

## Accomplishments

- Rewrote `src/styles/theme.css` @theme block to Light palette (cool/neutral near-white, distinct from Moss)
- Appended four `[data-theme='X']:root` override blocks in source order: Dark → Moss → Slate → Dusk
- Created `src/styles/theme.contrast.test.ts` with 5-iteration THEME-05 contrast guard (WCAG ≥ 1.5)
- All 5 palettes pass the automated luminance contrast floor; per-commit green-gate satisfied

## Palette Token Summary

### Tokens receiving NEW hex values (not in v1.0.1):

| Token | Light | Dark | Slate | Dusk |
|-------|-------|------|-------|------|
| --color-breathing-bg | #f8fafc | #0f172a | #f1f5f9 | #2e1065 |
| --color-breathing-bg-soft | #f1f5f9 | #1e293b | #e2e8f0 | #4c1d95 |
| --color-breathing-bg-edge | #ffffff | #0a0f1a | #f8fafc | #1e0550 |
| --color-breathing-surface | #ffffff | #1e293b | #ffffff | #3b0f8c |
| --color-breathing-accent | #64748b | #2dd4bf | #4f46e5 | #fbbf24 |
| --color-breathing-accent-strong | #475569 | #5eead4 | #3730a3 | #f59e0b |
| --color-breathing-muted | #94a3b8 | #64748b | #94a3b8 | #a78bfa |
| --color-orb-in-from | #e0f2fe | #bae6fd | #eff6ff | #ede9fe |
| --color-orb-in-to | #f0f9ff | #7dd3fc | #dbeafe | #faf5ff |
| --color-orb-out-from | #f97316 | #0f766e | #6366f1 | #d97706 |
| --color-orb-out-to | #fed7aa | #134e4a | #a5b4fc | #fcd34d |
| --color-orb-in-text | #0c4a6e | #0c4a6e | #1e3a8a | #4c1d95 |
| --color-orb-out-text | #7c2d12 | #ecfdf5 | #1e1b4b | #78350f |
| --color-ring-outer | rgb(224 242 254 / 0.6) | rgb(186 230 253 / 0.5) | rgb(239 246 255 / 0.7) | rgb(237 233 254 / 0.5) |
| --color-ring-inner | rgb(100 116 139 / 0.35) | rgb(45 212 191 / 0.40) | rgb(99 102 241 / 0.40) | rgb(251 191 36 / 0.45) |
| --color-modal-backdrop | rgb(15 23 42 / 0.30) | rgb(0 0 0 / 0.50) | rgb(15 23 42 / 0.30) | rgb(0 0 0 / 0.50) |

### Moss palette — v1.0.1 byte-identical tokens (15 of 17):

All Moss tokens except orb-out are byte-identical to the prior v1.0.1 @theme palette per D-03:
- `--color-breathing-bg: #f2fbf7` ✓ identical
- `--color-breathing-bg-soft: #e4f6ef` ✓ identical
- `--color-breathing-bg-edge: #f8fffc` ✓ identical
- `--color-breathing-surface: #ffffff` ✓ identical
- `--color-breathing-accent: #0f766e` ✓ identical
- `--color-breathing-accent-strong: #115e59` ✓ identical
- `--color-breathing-muted: #64748b` ✓ identical
- `--color-orb-in-from: #99f6e4` ✓ identical
- `--color-orb-in-to: #ecfdf5` ✓ identical
- `--color-orb-in-text: #134e4a` ✓ identical
- `--color-orb-out-text: #1e3a8a` ✓ identical
- `--color-ring-outer: rgb(153 246 228 / 0.6)` ✓ identical
- `--color-ring-inner: rgb(59 130 246 / 0.35)` ✓ identical
- `--color-modal-backdrop: rgb(15 23 42 / 0.30)` ✓ identical

Note: `--color-orb-out-from` and `--color-orb-out-to` were adjusted (see Deviations).

## Actual Contrast Ratios (baseline for future palette-tweak retrospectives)

| Theme | orb-in midpoint | orb-out midpoint | WCAG ratio | Status |
|-------|-----------------|------------------|------------|--------|
| light | rgb(232,246,255) lum=0.9029 | rgb(252,165,96) lum=0.4845 | **1.78** | PASS ≥ 1.5 |
| dark  | rgb(156,221,253) lum=0.6587 | rgb(17,98,92) lum=0.0963   | **4.85** | PASS ≥ 1.5 |
| moss  | rgb(195,250,237) lum=0.8609 | rgb(125,175,250) lum=0.4192 | **1.94** | PASS ≥ 1.5 |
| slate | rgb(229,240,255) lum=0.8620 | rgb(132,141,247) lum=0.3067 | **2.56** | PASS ≥ 1.5 |
| dusk  | rgb(244,239,255) lum=0.8819 | rgb(235,165,42) lum=0.4474  | **1.87** | PASS ≥ 1.5 |

Path to locked-hex source of truth: `src/styles/theme.css`

## Reduced-Motion @media Block

The `@media (prefers-reduced-motion: reduce)` block at the end of theme.css is **unchanged**:
- `dialog.modal-fade { transition: none !important }` — preserved
- `.orb-ring--inner { display: none }` — preserved
Theme-independent contract per Phase 2 D-07 / Phase 13 D-03.

## Task Commits

1. **Task 2 RED — Failing contrast test** - `43c9a5e` (test)
2. **Task 1+2 GREEN — theme.css rewrite + test finalized** - `a14d60d` (feat)

_Note: TDD tasks committed in RED→GREEN order per plan. Test and CSS were finalized in the same GREEN commit._

## Files Created/Modified

- `src/styles/theme.css` — @theme block (Light palette) + 4 [data-theme='X']:root override blocks (Dark, Moss, Slate, Dusk); 17 themable tokens per palette; reduced-motion block unchanged
- `src/styles/theme.contrast.test.ts` — 5-iteration WCAG luminance contrast guard; readFileSync + @theme→:root rewrite + describe.each over THEME_OPTIONS.filter(t => t !== 'system')

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 1 - Bug] Moss orb-out adjusted from byte-identical due to THEME-05 contrast floor conflict**
- **Found during:** Task 1 (CSS rewrite) + Task 2 (test execution)
- **Issue:** The plan requires (a) Moss byte-identical to v1.0.1 AND (b) every theme passes ≥ 1.5 WCAG contrast floor. These are contradictory: the v1.0.1 Moss orb-in vs orb-out midpoint ratio = 1.087 (empirically computed), which fails the automated floor. The research document incorrectly estimated "≈ 1.8" for this value.
- **Fix:** All 15 non-orb-out tokens are preserved byte-identical. Only `--color-orb-out-from` (was `#bfdbfe` blue-200 → now `#3b82f6` blue-500) and `--color-orb-out-to` (was `#eef2ff` indigo-50 → now `#bfdbfe` blue-200) were adjusted. The orb-out family remains in the blue family (matching the v1.0.1 blue-gradient feel) but with a deeper 'from' stop. Moss contrast ratio is now 1.94.
- **Files modified:** src/styles/theme.css
- **Verification:** `npx vitest run src/styles/theme.contrast.test.ts` — 5/5 PASS
- **Committed in:** a14d60d (Task 1+2 GREEN)

**2. [Rule 2 - Missing Critical] Added /// <reference types="node" /> to test file**
- **Found during:** Task 2 (lint verification)
- **Issue:** `tsconfig.app.json` uses `types: ["vite/client"]` which excludes `@types/node`. Without Node.js type coverage, `readFileSync` and `resolve` were untyped (`any`), triggering `@typescript-eslint/no-unsafe-*` lint errors.
- **Fix:** Added `/// <reference types="node" />` triple-slash directive at the top of `theme.contrast.test.ts`. This provides correct typings for `node:fs`/`node:path` imports without modifying `tsconfig.app.json` or `eslint.config.js`.
- **Files modified:** src/styles/theme.contrast.test.ts
- **Committed in:** a14d60d (Task 1+2 GREEN)

---

**Total deviations:** 2 auto-fixed (1 bug/conflict, 1 missing critical typing)
**Impact on plan:** Both fixes required for correctness (contrast test passing) and code quality (lint clean). No scope creep.

## Issues Encountered

- Pre-commit hooks run and passed — `tsc`, `eslint`, `build`, and `test` all exit 0 at commit boundary (D-17 green-gate satisfied)
- The `noUncheckedIndexedAccess` tsconfig option required `?? ''` fallbacks on regex capture groups in `parseColorToRgb`

## Known Stubs

None — this plan does not introduce any stub values. The CSS cascade is fully populated with concrete hex values for all 5 palettes.

## Threat Flags

No new threat surface introduced. The CSS file contains only author-controlled color literals. The test file reads an author-controlled build-time path with no user input. T-16-01-01 through T-16-01-04 from the plan threat register were reviewed; all dispositions remain `accept` or `mitigate` as planned.

## Next Phase Readiness

- CSS cascade is live: `[data-theme='dark|moss|slate|dusk']:root` override blocks ready for use by the FOUC script (plan 03) and `useTheme` hook (plan 02)
- The THEME-05 automated guard is in place as a regression shield for all future palette tweaks
- Plans 02 (useTheme hook), 03 (FOUC script), and 04 (ThemePicker UI) can proceed

---
*Phase: 16-themes*
*Completed: 2026-05-12*

## Self-Check: PASSED

- [x] `src/styles/theme.css` exists with @theme block + 4 override blocks
- [x] `src/styles/theme.contrast.test.ts` exists with 5-iteration test
- [x] Commit `43c9a5e` (RED test) exists
- [x] Commit `a14d60d` (GREEN implementation) exists
- [x] 5 tests pass, all above 1.5 contrast floor
- [x] Files not touched: src/domain/settings.ts, src/storage/prefs.ts (D-21 invariant)
