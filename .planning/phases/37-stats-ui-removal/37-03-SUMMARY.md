---
phase: 37-stats-ui-removal
plan: 03
subsystem: content/test
tags: [stats-removal, anti-gamification, drift-guard, test]
requirements-completed: [STATS-05]
depends-on: [37-01, 37-02]
dependency-graph:
  requires:
    - 37-01 (StatsFooter + ResetStatsDialog deleted; scanned roots clean)
    - 37-02 (resetPracticeStats + format.ts deleted; STATS-04 regression added)
  provides:
    - src/content/content.no-stats-ui.test.ts (STATS-05 drift-guard)
    - Phase 37 closing green gate (tsc + vitest + all invariant greps)
  affects:
    - src/content/content.no-stats-ui.test.ts (new)
tech-stack:
  added: []
  patterns:
    - fs-scan drift-guard (Phase 26 D-12 analog): recursive readdirSync + statSync, forbidden-token list, aggregated failure message
    - two-root scan: src/components/ and src/app/ (extends single-root analog pattern)
    - tsx-filter: filters both .test.ts and .test.tsx (extends analog's .test.ts-only filter)
key-files:
  created:
    - src/content/content.no-stats-ui.test.ts
  modified: []
decisions:
  - "STATS-05 drift-guard colocated at src/content/ with content.no-review-markers.test.ts analog — future readers find both guards via the same src/content/content.* glob"
  - "Six forbidden tokens cover all four forbidden-token classes from CONTEXT D-10: two plain-substring component names + three case-insensitive visual-stat regexes + one word-boundary uppercase SESSIONS regex (no i flag)"
  - "File filter accepts .ts and .tsx, rejects .test.ts and .test.tsx — extends analog's .ts-only filter to cover TSX components (deleted components and App consumers were TSX)"
  - "Future re-introduction of a stats display requires explicitly deleting this file with rationale in that phase SUMMARY (CONTEXT D-11 / REQUIREMENTS STATSDISPLAY-01)"
metrics:
  duration: ~2m
  completed: 2026-05-21
  tasks-completed: 2
  files-modified: 1
  lines-added: 113
---

# Phase 37 Plan 03: STATS-05 Drift-Guard + Phase Close Summary

One-liner: Created the STATS-05 fs-scan drift-guard (113 lines, mirrors content.no-review-markers.test.ts) locking six forbidden stats-UI tokens out of src/components/ and src/app/ permanently, then closed the Phase 37 green gate with all invariants confirmed.

## What Was Done

### Task 1: Create src/content/content.no-stats-ui.test.ts (STATS-05 drift-guard)

**File:** `src/content/content.no-stats-ui.test.ts` — 113 lines — commit `07292fb`

**Structure (mirroring the analog `content.no-review-markers.test.ts` exactly):**
- Triple-slash node types reference (`/// <reference types="node" />`)
- Imports: vitest `describe/it/expect` + `node:fs` `readFileSync/readdirSync/statSync` + `node:path` `resolve/join`
- Recursive `collectFiles(dir, acc=[])` helper
- Single `describe` with one `it` case
- Aggregated `hits: string[]` with `expect(hits, ...).toEqual([])`

**Three adaptations from the analog (per plan `<interfaces>`):**

1. **Two scanned roots:** `COMPONENTS_DIR = resolve(__dirname, '..', 'components')` and `APP_DIR = resolve(__dirname, '..', 'app')`. Flat `SCAN_FILES` = `collectFiles(COMPONENTS_DIR)` + `collectFiles(APP_DIR)`. Covers all five app surfaces: Idle, Running, Complete, Learn, App Settings (CONTEXT D-12).

2. **TSX file filter:** `collectFiles` accepts `entry.endsWith('.ts') || entry.endsWith('.tsx')` and rejects `entry.endsWith('.test.ts') || entry.endsWith('.test.tsx')`. The analog only handles `.ts` / `.test.ts`; Phase 37 must scan `.tsx` because the deleted components and their App consumers were TSX.

3. **Six-token forbidden list (CONTEXT D-10):**

| Token | Type | Label |
|-------|------|-------|
| `StatsFooter` | Plain substring (case-sensitive) | `StatsFooter (component name)` |
| `ResetStatsDialog` | Plain substring (case-sensitive) | `ResetStatsDialog (component name)` |
| `/MIN TODAY/i` | Regex case-insensitive | `MIN TODAY (visual stats marker)` |
| `/STREAK/i` | Regex case-insensitive | `STREAK (visual stats marker)` |
| `/TOTAL TIME/i` | Regex case-insensitive | `TOTAL TIME (visual stats marker)` |
| `/\bSESSIONS\b/` | Word-boundary, no `i` flag | `SESSIONS (uppercase visual stats marker)` |

The `SESSIONS` regex uses `\b...\b` without the `/i` flag per CONTEXT D-10: only the uppercase form is forbidden (the lowercase word "sessions" appears legitimately in code comments and variable names). The visual stat readout used the uppercase form exclusively.

**Per-hit aggregation:** `${file}: ${token.label}` — names both the file and the token so a future contributor sees exactly what tripped the guard (PATTERNS guidance).

### Task 2: Phase 37 Closing Green Gate (verification only — no commit)

All gate steps passed against the cumulative post-Plan-01/02/03 state:

| Step | Command | Result |
|------|---------|--------|
| 1 | `npx tsc --noEmit` | EXIT 0 |
| 2 | `npx vitest run` (full suite) | 1203/1203 passed |
| 3 | `npx vitest run src/content/content.no-stats-ui.test.ts -t "STATS-05"` | 1/1 passed |
| 4 | `npx vitest run src/storage/practices.test.ts -t "STATS-04"` | 3/3 passed |
| 5 | `grep -rE "StatsFooter\|ResetStatsDialog" src/ \| grep -v drift-guard` | 0 matches |
| 6 | `grep -rE "resetPracticeStats\|formatLastSession\b" src/` | 0 matches |
| 7 | `git diff main -- src/storage/storage.ts \| grep STATE_VERSION` | 0 matches (D-05 locked) |

Full build: `npm run build` (tsc -b && vite build) exits 0.

## Phase 37 Success Criteria — Observably Closed

- **SC1 (STATS-01..03):** StatsFooter + ResetStatsDialog gone (deleted in Plan 01); Reset stats affordance gone (Plan 01 + Plan 02 `resetPracticeStats`). `grep` returns 0 matches in production code.
- **SC2 (STATS-04):** Record-and-persist regression block passes — 3/3 it cases (resonant / stretch / naviKriya) confirm envelope round-trip is lossless. `recordResonantSession/recordStretchSession/recordNaviKriyaSession` signatures unchanged; STATE_VERSION locked at 3.
- **SC3 (STATS-05):** Drift-guard test passes — 1/1 it case; scans both `src/components/` and `src/app/`; checks six forbidden tokens; CI fails if any forbidden token reappears in production code.

## STATS-05 Exit Clause (CONTEXT D-11)

When/if a future phase intentionally re-introduces a stats display:

1. That phase explicitly deletes `src/content/content.no-stats-ui.test.ts`
2. The deletion rationale is recorded in that phase's SUMMARY
3. The requirement `STATSDISPLAY-01` documents the deliberate anti-gamification-compatible design decision

The drift-guard is the lock. Deleting it is the intentional unlock.

## Requirements Closed

- **STATS-05:** STATS-05 drift-guard test exists in CI; will fail if any forbidden token reappears in `src/components/` or `src/app/`. Observable: `npx vitest run src/content/content.no-stats-ui.test.ts` exits 0 with 1 passing test.

## Phase 37 Complete — All Requirements Closed

| Requirement | Closed By | Evidence |
|-------------|-----------|---------|
| STATS-01 | Plan 01 | StatsFooter deleted; grep returns 0 matches |
| STATS-02 | Plan 01 | ResetStatsDialog deleted; grep returns 0 matches |
| STATS-03 | Plan 01 + 02 | Reset affordance gone (UI) + resetPracticeStats deleted (data) |
| STATS-04 | Plan 02 | 3/3 record-and-persist regression tests pass |
| STATS-05 | Plan 03 | Drift-guard test passes; CI enforced |

All CONTEXT decisions D-01 through D-12 are referenced across Plans 01, 02, and 03.

## Deviations from Plan

None — plan executed exactly as written. The test file was created, passes, and all acceptance criteria confirmed.

## Known Stubs

None. The new file is a self-contained test with no stubs.

## Threat Flags

None. This plan adds a test file only. No new network endpoints, auth paths, file access patterns, or schema changes.

## Self-Check

- [x] `src/content/content.no-stats-ui.test.ts` exists
- [x] File starts with `/// <reference types="node" />` (line 24)
- [x] `grep -n "import.*vitest"` returns match (line 26)
- [x] `grep -n "import.*node:fs"` returns match (line 27)
- [x] `grep -n "STATS-05"` returns matches (lines 3, 95)
- [x] `StatsFooter` and `ResetStatsDialog` both appear in forbidden-token list
- [x] `/MIN TODAY/i`, `/STREAK/i`, `/TOTAL TIME/i` all appear in file
- [x] `/\bSESSIONS\b/` appears in file (word-boundary uppercase, no i flag)
- [x] `.tsx` filter mentions appear in file (lines 30, 31, 34, 43, 45, 56)
- [x] `endsWith('.test.tsx')` appears (line 45)
- [x] `npx vitest run src/content/content.no-stats-ui.test.ts` exits 0 — 1 passing test
- [x] `npx tsc --noEmit` exits 0
- [x] `npm run build` exits 0
- [x] `npx vitest run` exits 0 — 1203/1203 tests pass
- [x] File line count: 113 (within 40–120 range)
- [x] Commit `07292fb` exists in git log

## Self-Check: PASSED
