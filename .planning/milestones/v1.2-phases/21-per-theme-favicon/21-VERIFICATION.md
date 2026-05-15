---
phase: 21-per-theme-favicon
verified: 2026-05-15T05:07:46Z
status: passed
score: 3/3 must-haves verified
overrides_applied: 0
re_verification: false
---

# Phase 21: Per-Theme Favicon Verification Report

**Phase Goal:** Users see a favicon that matches their active palette in the browser tab and OS task switcher
**Verified:** 2026-05-15T05:07:46Z
**Status:** PASSED
**Re-verification:** No — initial verification

## Goal Achievement

### Observable Truths

| # | Truth | Status | Evidence |
|---|-------|--------|----------|
| 1 | User sees a distinct favicon variant for each of the 5 palettes (Light, Dark, Moss, Slate, Dusk) that differs visually in the browser tab | VERIFIED | `FAVICON_COLORS` in `faviconPalette.ts` holds 5 distinct hex values. `buildFaviconDataUri` substitutes each into the SVG template. `favicon.sync.test.ts` runs 10 passing assertions (5 vs theme.css, 5 vs index.html inline map) with 0 skipped. Human verification approved all 5 palette variants. |
| 2 | User's favicon swaps immediately when they change theme via SettingsDialog, including across tabs (same-tab `hrv:prefs-changed` + cross-tab `storage` event) | VERIFIED | `useFavicon.ts` registers `window.addEventListener('storage', ...)` (Effect C) filtered on `STATE_KEY` and `window.addEventListener('hrv:prefs-changed', ...)` (Effect D) filtered on `detail.key === 'theme'`. `replaceFaviconLink` removes the old `<link rel="icon">` and appends a new one (Chrome href-mutation workaround). All 10 useFavicon.test.ts tests pass, including cross-tab and same-tab swap cases. Human verification confirmed same-tab and cross-tab swap. |
| 3 | User's persisted-theme favicon is applied on initial page load with no flash of the default favicon before the correct one appears | VERIFIED | `index.html` pre-paint inline script (single `<script>`) resolves the persisted theme from `localStorage` before React mounts, then calls `setFav(u)` which removes the old `<link rel="icon">` and appends a new one with the per-theme data-URI. The `catch` branch also calls `setFav` with the light-palette URI (no flash on parse failure). 5 distinct hex values confirmed present in `index.html`. Human verification confirmed no-flash hard reload. |

**Score:** 3/3 truths verified

### Required Artifacts

| Artifact | Expected | Status | Details |
|----------|----------|--------|---------|
| `src/styles/faviconPalette.ts` | FAVICON_COLORS + FAVICON_SVG_TEMPLATE + buildFaviconDataUri | VERIFIED | Exists, 35 lines, exports all 3. All 5 hex values present (`#5e81ac`, `#81a1c1`, `#35a77c`, `#3760bf`, `#f6c177`). SYNC WITH comment present. Typed `Record<Exclude<ThemeId, 'system'>, string>`. |
| `src/styles/favicon.sync.test.ts` | D-07 sync guard — 10 live assertions (5 theme.css + 5 index.html) | VERIFIED | Exists, 99 lines. `grep -c 'it.skip\|it.todo'` = 0 (no skips). `/// <reference types="node" />` present. `describe.each` over `CONCRETE_THEMES`. 10 passing tests confirmed by `npx vitest run`. |
| `src/hooks/useFavicon.ts` | App-side orchestrator hook with dual-event listeners + system resolution | VERIFIED | Exists, 145 lines. Exports `useFavicon`. Storage + hrv:prefs-changed + mql change listeners present. Imports from `faviconPalette`. `replaceFaviconLink` helper uses element-replacement pattern. |
| `src/hooks/useFavicon.test.ts` | Hook test — 9 cases covering all behaviors | VERIFIED | Exists, 221 lines. 10 tests, all passing. Covers mount-seed, system light/dark, mql change, cross-tab swap, unrelated-key ignore, same-tab swap, variant-key ignore, no-link no-throw. |
| `index.html` | Pre-paint inline script setting favicon href before first paint | VERIFIED | Single `<script>` in head. Contains `setAttribute('href'` call. 5 hex values present. SYNC WITH comment present. catch branch also calls setFav. |
| `src/app/App.tsx` | useFavicon() mounted bare after useTheme() | VERIFIED | Line 146: `useFavicon() // Phase 21 FAVI-01..03` immediately after `useTheme()` at line 145. Import at line 16. |

### Key Link Verification

| From | To | Via | Status | Details |
|------|----|-----|--------|---------|
| `src/hooks/useFavicon.ts` | `src/styles/faviconPalette.ts` | `import buildFaviconDataUri + FAVICON_COLORS` | WIRED | Line 25: `import { buildFaviconDataUri, FAVICON_COLORS } from '../styles/faviconPalette'` |
| `src/hooks/useFavicon.ts` | `document <link rel=icon>` | `querySelector + replaceFaviconLink` | WIRED | `replaceFaviconLink` removes old link and appends new one with `setAttribute('href', dataUri)` |
| `src/app/App.tsx` | `useFavicon` | bare hook call alongside useTheme | WIRED | Line 146: `useFavicon()` — imported at line 16 |
| `index.html` inline script | `<link rel=icon> href` | `setFav` helper calling `setAttribute('href'` then element-replacement | WIRED | `setFav` function in the pre-paint IIFE removes old link and appends new one; called in both try and catch branches |
| `src/styles/favicon.sync.test.ts` | `src/styles/theme.css` | `readFileSync + regex parse of --color-breathing-accent-strong` | WIRED | Lines 29-31: reads theme.css, `parseAccentStrongFromCss` extracts per-theme hex |
| `src/styles/favicon.sync.test.ts` | `src/styles/faviconPalette.ts` | `import FAVICON_COLORS` | WIRED | Line 18: `import { FAVICON_COLORS } from './faviconPalette'` |

### Data-Flow Trace (Level 4)

| Artifact | Data Variable | Source | Produces Real Data | Status |
|----------|--------------|--------|--------------------|--------|
| `src/hooks/useFavicon.ts` | `theme` state | `loadPrefs().theme` from `localStorage` + storage/hrv:prefs-changed events | Yes — reads live localStorage key; updated on cross-tab and same-tab events | FLOWING |
| `index.html` inline script | `t` (theme id), `h` (hex), `u` (data-URI) | `localStorage.getItem('hrv:state:v1')` then resolved through 5-entry hex map `c` | Yes — reads live localStorage before first paint; falls back to OS preference for 'system' | FLOWING |

### Behavioral Spot-Checks

| Behavior | Command | Result | Status |
|----------|---------|--------|--------|
| faviconPalette exports all 5 distinct hex values | `grep -oE '#...' faviconPalette.ts \| sort -u \| wc -l` | 5 | PASS |
| useFavicon test suite passes | `npx vitest run src/hooks/useFavicon.test.ts` | 10 passed, 0 failed | PASS |
| favicon.sync.test.ts passes with 0 skips | `npx vitest run src/styles/favicon.sync.test.ts` | 10 passed, 0 skipped | PASS |
| index.html has exactly 1 inline script | `grep -c '<script>' index.html` | 1 | PASS |
| index.html sets favicon href pre-paint | `grep -c "setAttribute('href'" index.html` | 1 | PASS |
| App.tsx mounts useFavicon bare | `grep -c 'useFavicon()' App.tsx` | 1 | PASS |
| No skipped tests in sync guard | `grep -c 'it.skip\|it.todo' favicon.sync.test.ts` | 0 | PASS |
| TypeScript compilation clean | `npx tsc -b --noEmit` | exit 0, no output | PASS |
| No 'favicon' event name introduced | `grep -c "'favicon'" useFavicon.ts` | 0 (uses existing 'theme' event) | PASS |

### Probe Execution

Step 7c: SKIPPED (no probe scripts exist for this phase; phase does not declare any `scripts/*/tests/probe-*.sh` probes).

### Requirements Coverage

| Requirement | Source Plan | Description | Status | Evidence |
|-------------|------------|-------------|--------|----------|
| FAVI-01 | 21-01-PLAN, 21-02-PLAN | User has a per-palette favicon variant for each of the 5 themes | SATISFIED | `FAVICON_COLORS` in `faviconPalette.ts` holds 5 distinct hex values. `buildFaviconDataUri` produces a distinct SVG data-URI per theme. Human verification confirmed 5 visually distinct favicons. |
| FAVI-02 | 21-02-PLAN | User's favicon swaps when active theme changes (same-tab + cross-tab) | SATISFIED | `useFavicon.ts` Effects C + D listen on `storage` (cross-tab) and `hrv:prefs-changed` (same-tab). `replaceFaviconLink` performs element-replacement swap. Human verification confirmed both same-tab and cross-tab swap. |
| FAVI-03 | 21-02-PLAN | User's persisted-theme favicon applied on initial page load (no flash) | SATISFIED | `index.html` pre-paint IIFE reads localStorage before React mounts and calls `setFav` with the per-theme data-URI in both try and catch branches. Human verification confirmed no-flash on hard reload. |

### Anti-Patterns Found

| File | Line | Pattern | Severity | Impact |
|------|------|---------|----------|--------|
| None | — | — | — | — |

No TBD, FIXME, XXX, TODO, HACK, or PLACEHOLDER markers found in phase-modified files. No stub returns (return null, return [], return {}) in implementation paths. No hardcoded empty data passed to rendering. The `replaceFaviconLink` approach (element replacement vs. in-place href mutation) is a documented Chrome workaround, not a stub.

### Human Verification Required

Human verification was already completed during execution (Plan 02 Task 3 checkpoint). User confirmed:

1. All 5 palette favicons visually distinct in browser tab — approved
2. Same-tab theme swap via SettingsDialog — approved
3. System mode following OS preference live — approved
4. Cross-tab favicon update without reload — approved
5. No-flash hard reload with non-default theme — approved

No further human verification required.

### Gaps Summary

No gaps. All 3 observable truths are fully verified by code-level evidence and corroborated by human verification performed during execution.

---

_Verified: 2026-05-15T05:07:46Z_
_Verifier: Claude (gsd-verifier)_
