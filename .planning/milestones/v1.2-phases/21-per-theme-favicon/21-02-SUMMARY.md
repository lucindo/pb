---
phase: 21-per-theme-favicon
plan: "02"
subsystem: hooks/favicon
tags: [favicon, hook, pre-paint, cross-tab, theme-sync]
dependency_graph:
  requires: [faviconPalette-module, favicon-sync-guard]
  provides: [useFavicon-hook, favicon-pre-paint-script]
  affects: [src/hooks/useFavicon.ts, index.html, src/app/App.tsx, src/styles/favicon.sync.test.ts]
tech_stack:
  added: []
  patterns: [gated-matchMedia-system-resolve, dual-event-cross-tab-sync, pre-paint-inline-script, replace-link-element]
key_files:
  created:
    - src/hooks/useFavicon.ts
    - src/hooks/useFavicon.test.ts
  modified:
    - index.html
    - src/app/App.tsx
    - src/styles/favicon.sync.test.ts
decisions:
  - "Replace the <link rel=icon> element on every favicon swap — Chrome ignores in-place href mutation"
  - "Pre-paint inline script replaces the link element in both try and catch branches (D-06 no-flash)"
  - "Gated matchMedia listener attached only in system mode (D-05), mirrors useTheme S-04 gate"
  - "Favicon rides the existing 'theme' prefs key — no new 'favicon' event introduced (FAVI-02)"
metrics:
  completed: "2026-05-15"
  tasks: 3
  files_changed: 5
---

# Phase 21 Plan 02: useFavicon Hook + Pre-Paint Wiring Summary

**One-liner:** Wires the per-palette favicon swap end-to-end — `useFavicon` orchestrator hook (live theme/system/cross-tab/same-tab updates), an `index.html` pre-paint inline script for no-flash first paint, and a browser-reliable link-element-replacement swap that fixes Chrome ignoring in-place `href` mutation.

## Tasks Completed

| Task | Name | Commit | Files |
|------|------|--------|-------|
| 1-RED | Failing tests for useFavicon hook | 355a142 | src/hooks/useFavicon.test.ts |
| 1-GREEN | Create useFavicon orchestrator hook | aac0519 | src/hooks/useFavicon.ts |
| 2 | Extend pre-paint script, mount hook, enable sync assertion | 50c01d1 | index.html, src/app/App.tsx, src/styles/favicon.sync.test.ts |
| 3-fix | Replace favicon link element so theme swap renders | 55a6133 | src/hooks/useFavicon.ts, index.html |

## What Was Built

### `src/hooks/useFavicon.ts`
- `useFavicon()` orchestrator hook — returns `void`, called bare in `App.tsx` next to `useTheme()`
- Effect A (dep `[theme]`): applies favicon on mount + theme change
- Effect B (dep `[theme]`, gated): D-05 system resolution via `matchMedia` — listener attached only when `theme === 'system'`, re-seeds on mount (IN-02)
- Effects C+D (empty deps): cross-tab `storage` + same-tab `hrv:prefs-changed` listeners for live swap (D-04/FAVI-02)
- `replaceFaviconLink(dataUri)` shared helper: creates a new `<link rel="icon" type="image/svg+xml">`, removes the old, appends the new — Chrome does not re-render the favicon on in-place `href` mutation

### `index.html`
- Pre-paint inline script extended (D-06): builds the per-theme SVG data URI before first paint and replaces the `<link rel="icon">` element (try + catch branches) — no flash of the old teal `#0f766e` circle on hard reload
- Single inline `<script>` preserved; SYNC WITH comments retained

### `src/app/App.tsx`
- `useFavicon()` mounted bare on the line after `useTheme()`

### `src/styles/favicon.sync.test.ts`
- index.html inline-map assertion un-skipped — all 10 sync assertions live (5 vs `theme.css`, 5 vs index.html inline map)

## Verification Results

- `npm run build` exits 0
- `npm run test:run` — 753 passed, 0 skipped, 57 test files
- Human verification (Task 3): user confirmed favicon swaps correctly on theme change, system mode, cross-tab, and no-flash hard reload — **approved**

## Deviations from Plan

Task 3 human verification surfaced a bug: themes switched but the tab favicon did not change, and the old `favicon.svg` persisted. Root cause — both the hook and the inline script mutated `href` on the existing `<link rel="icon">` in place, which Chrome ignores. Fixed in commit `55a6133` by replacing the link element instead. Re-verified and approved.

## TDD Gate Compliance

- RED commit `355a142`: `test(21-02): add failing tests for useFavicon hook`
- GREEN commit `aac0519`: `feat(21-02): create useFavicon orchestrator hook`

## Known Stubs

None.

## Threat Surface Scan

No new network endpoints, auth paths, or file access. The favicon SVG data URI interpolates only the 5 type-enforced hex literals from `FAVICON_COLORS`. Event listeners (`storage`, `hrv:prefs-changed`, `matchMedia change`) read prefs from existing trusted local storage — no new trust boundary.

## Self-Check

- [x] `src/hooks/useFavicon.ts` exists
- [x] `src/hooks/useFavicon.test.ts` exists
- [x] `index.html` pre-paint script extended + element-replacement swap
- [x] `src/app/App.tsx` mounts `useFavicon()`
- [x] Commit `355a142` (RED) exists
- [x] Commit `aac0519` (GREEN) exists
- [x] Commit `50c01d1` (wiring) exists
- [x] Commit `55a6133` (link-replace fix) exists
- [x] Full test suite green (753 passed)
- [x] Human verification approved

## Self-Check: PASSED
