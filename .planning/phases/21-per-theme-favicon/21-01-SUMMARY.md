---
phase: 21-per-theme-favicon
plan: "01"
subsystem: styles/favicon
tags: [favicon, palette, sync-guard, tdd]
dependency_graph:
  requires: []
  provides: [faviconPalette-module, favicon-sync-guard]
  affects: [src/styles/faviconPalette.ts, src/styles/favicon.sync.test.ts]
tech_stack:
  added: []
  patterns: [Record-over-Exclude-ThemeId, plain-regex-parse-sync-guard, tdd-red-green]
key_files:
  created:
    - src/styles/faviconPalette.ts
    - src/styles/favicon.sync.test.ts
    - src/styles/faviconPalette.test.ts
  modified: []
decisions:
  - "URL-encode # to %23 in buildFaviconDataUri for well-formed data: URIs in <link href>"
  - "Plain regex parse for theme.css token extraction in sync guard (PATTERNS.md Approach 2 — no jsdom cascade)"
  - "index.html assertion uses it.skip with PLAN 02 marker (inline map lands in Plan 02)"
metrics:
  duration: "~5 minutes"
  completed: "2026-05-15"
  tasks: 2
  files_changed: 3
---

# Phase 21 Plan 01: Shared faviconPalette Module + Sync Guard Summary

**One-liner:** Frozen 5-entry FAVICON_COLORS record (accent-strong hex per palette) + recolor-only SVG template + data-URI builder + D-07 theme.css sync guard test, establishing the FAVI-01 color contract before Plan 02 wiring.

## Tasks Completed

| Task | Name | Commit | Files |
|------|------|--------|-------|
| 1 | Create shared faviconPalette module | aa872a6 | src/styles/faviconPalette.ts |
| 1-RED | Failing tests for faviconPalette | 4d82731 | src/styles/faviconPalette.test.ts |
| 2 | Add favicon sync-guard test (D-07) | eb3ac8f | src/styles/favicon.sync.test.ts |

## What Was Built

### `src/styles/faviconPalette.ts`
- `FAVICON_COLORS`: frozen `Record<Exclude<ThemeId,'system'>, string>` with the 5 `accent-strong` hex values: light `#5e81ac`, dark `#81a1c1`, moss `#35a77c`, slate `#3760bf`, dusk `#f6c177` (D-02)
- `FAVICON_SVG_TEMPLATE`: recolor-only flat SVG circle with `__FILL__` placeholder (D-01)
- `buildFaviconDataUri(theme)`: URL-encodes `#` → `%23`, substitutes fill in template, returns `data:image/svg+xml,...` URI (D-03)
- SYNC WITH comment above `FAVICON_COLORS` per D-07 bidirectional convention

### `src/styles/favicon.sync.test.ts`
- `describe.each` over 5 concrete themes (`Exclude<ThemeId,'system'>`)
- Assertion (1) LIVE: `FAVICON_COLORS[theme]` === `--color-breathing-accent-strong` parsed from `theme.css` via plain regex
- Assertion (2) SKIPPED: `index.html` inline map guard with `it.skip('... PLAN 02: un-skip there')` and `// PLAN 02: un-skip` comment — lands in Plan 02 Task 2
- Node triple-slash reference (`/// <reference types="node" />`)

## Verification Results

- `npx tsc -b --noEmit` exits 0
- `npx eslint src/styles/faviconPalette.ts src/styles/favicon.sync.test.ts` exits 0
- `npx vitest run src/styles/favicon.sync.test.ts` — 5 passed, 5 skipped (index.html guard deferred to Plan 02)
- Full test suite: 1454 passed, 5 skipped, 110 test files — per-commit green gate holds

## Deviations from Plan

None — plan executed exactly as written.

## TDD Gate Compliance

- RED commit `4d82731`: `test(21-01): add failing tests for faviconPalette module` — 17 tests fail (module absent)
- GREEN commit `aa872a6`: `feat(21-01): create shared faviconPalette module` — 17 tests pass
- Task 2 sync guard written and passes immediately (live assertions are correct by construction since FAVICON_COLORS already matches theme.css)

## Known Stubs

None — all FAVICON_COLORS values are wired to the real theme.css `--color-breathing-accent-strong` tokens, verified by the sync guard. The index.html inline map guard is intentionally skipped (not a stub — the map doesn't exist until Plan 02).

## Threat Surface Scan

No new network endpoints, auth paths, or file access patterns introduced. The `buildFaviconDataUri` SVG interpolation uses a closed set of 5 hardcoded hex literals (type-enforced via `Exclude<ThemeId,'system'>`) — T-21-01 mitigated per threat model. No new trust boundaries opened.

## Self-Check

- [x] `src/styles/faviconPalette.ts` exists
- [x] `src/styles/favicon.sync.test.ts` exists
- [x] `src/styles/faviconPalette.test.ts` exists
- [x] Commit `4d82731` (RED test) exists
- [x] Commit `aa872a6` (GREEN implementation) exists
- [x] Commit `eb3ac8f` (sync guard) exists
- [x] Full test suite green (1454 passed)

## Self-Check: PASSED
