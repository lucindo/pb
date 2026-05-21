---
phase: 38-variant-removal
plan: "04"
subsystem: content/drift-guard
tags: [drift-guard, varf-06, orb-only, invariant-lock, test]
dependency_graph:
  requires:
    - "38-01: component + hook deletions (SquareShape, DiamondShape, VariantPicker, BreathingShape, useVisualVariant, useVariantChoice)"
    - "38-02: data-layer + i18n deletions (VisualVariantId, VARIANT_OPTIONS, DEFAULT_VARIANT, coerceVariant, isValidVariant, strings.variants)"
    - "38-03: App.tsx state strip + theme.css CSS deletion + fixture cleanup"
  provides:
    - "src/content/content.no-variants.test.ts: VAR-06 drift-guard (CI fails if any forbidden variant token returns)"
    - "Phase 38 Orb-only invariant locked: future re-introduction is a deliberate phase decision that deletes this file"
  affects:
    - "src/components/CueGlyph.tsx (stale VariantPicker comment refs removed — Rule 1 auto-fix)"
    - "src/components/CuePicker.tsx (stale VariantPicker comment refs removed — Rule 1 auto-fix)"
    - "src/components/NKShape.tsx (stale SquareShape/DiamondShape comment ref removed — Rule 1 auto-fix)"
    - "src/components/shapeConstants.ts (stale SquareShape/DiamondShape docstring ref removed — Rule 1 auto-fix)"
tech_stack:
  added: []
  patterns:
    - "fs-scan drift-guard (vitest + node:fs readdirSync) mirroring Phase 37 STATS-05 analog"
    - "Four-root scan: src/components/ + src/app/ + src/content/ + src/styles/"
    - ".css filter extension in collectFiles (extends STATS-05 .ts/.tsx-only filter)"
    - "14-token forbidden list: 10 plain-substring + 2 persisted-value regex + 2 CSS selector regex"
key_files:
  created:
    - src/content/content.no-variants.test.ts
  modified:
    - src/components/CueGlyph.tsx
    - src/components/CuePicker.tsx
    - src/components/NKShape.tsx
    - src/components/shapeConstants.ts
decisions:
  - "Rule 1 auto-fix: stale comment refs to deleted symbols (VariantPicker, SquareShape, DiamondShape) in CuePicker.tsx, CueGlyph.tsx, NKShape.tsx, shapeConstants.ts removed — the plain-substring drift-guard match cannot distinguish code from comments"
  - "hooks/ root intentionally excluded from drift-guard scan (per CONTEXT D-07: surface = render paths + i18n + CSS); stale analog refs in useFavicon.ts, useVisualCue.ts, useLocaleChoice.ts, useTimbreChoice.ts, useLocale.ts remain but are not in scanned roots"
  - "App.session.test.tsx sessionVariantRef comment ref (line 381) is in a test file — excluded from drift-guard scan; not cleaned up (test file comments are outside scope)"
metrics:
  duration: "~10 minutes"
  completed: "2026-05-21"
  tasks: 2
  files_changed: 5
---

# Phase 38 Plan 04: VAR-06 Drift-Guard Summary

**One-liner:** Phase 38 VAR-06 drift-guard locking the Orb-only invariant — 14-token fs-scan vitest test across 4 roots (components, app, content, styles) with .css filter extension mirroring the Phase 37 STATS-05 analog.

## What Was Built

### New File: `src/content/content.no-variants.test.ts`

- **Line count:** 133 lines (within the analog range of 80-150 lines — the STATS-05 analog is 131 lines)
- **Structure:** mirrors `content.no-stats-ui.test.ts` (Phase 37 STATS-05) exactly, with three adaptations per the plan:

  1. **Four scanned roots, not three** — adds `src/styles/` (STYLES_DIR) to catch `[data-variant='square'/'diamond']` CSS rules re-entering via theme.css (the WR-01 vector the original three-root scan would miss).
  2. **`.css` filter extension** — `collectFiles` accept clause extended from `.ts`/`.tsx` to also accept `.css`; reject clause stays `.test.ts`/`.test.tsx` (no test-file naming convention for CSS).
  3. **14 forbidden tokens (CONTEXT D-05)** vs. 6 in STATS-05.

- **Self-exclusion:** the `.test.ts` suffix of this file causes `collectFiles` to reject it from the scan — preventing self-flagging (T-38-17 mitigated).

### Exact 14-Token Forbidden List (CONTEXT D-05)

**Plain substring — component/symbol names (10 entries):**
| Token | Type |
|-------|------|
| `SquareShape` | component name |
| `DiamondShape` | component name |
| `VariantPicker` | component name |
| `VisualVariantId` | type name |
| `useVisualVariant` | hook name |
| `useVariantChoice` | hook name |
| `coerceVariant` | coercer name |
| `isValidVariant` | predicate name |
| `VARIANT_OPTIONS` | constant name |
| `DEFAULT_VARIANT` | constant name |

**Regex — persisted-value literals (2 entries):**
| Pattern | Catches |
|---------|---------|
| `/variant:\s*['"]square['"]/` | `variant: 'square'` / `variant: "square"` in source |
| `/variant:\s*['"]diamond['"]/` | `variant: 'diamond'` / `variant: "diamond"` in source |

**Regex — CSS attribute selectors (2 entries):**
| Pattern | Catches |
|---------|---------|
| `/\[data-variant=['"]?square['"]?\]/` | `[data-variant='square']` re-entry via theme.css |
| `/\[data-variant=['"]?diamond['"]?\]/` | `[data-variant='diamond']` re-entry via theme.css |

**Rationale for exclusions:** `'Square'`, `'Diamond'`, `'Quadrado'`, `'Losango'` are NOT in the forbidden list — these words appear legitimately in non-variant contexts (CSS geometry comments, shape math descriptions). Symbol-name tokens are the precise, unambiguous sentinels.

### Test Results

Both `it()` cases pass against the post-Plan-01/02/03 clean state:
- `it('scans a non-empty set of production files')` — PASS (sanity floor; T-38-16 mitigated)
- `it('no forbidden variant token appears in src/components/, src/app/, src/content/, or src/styles/')` — PASS (T-38-15 mitigated)

**Full suite: 1095 tests pass (1093 pre-existing + 2 new drift-guard cases). `npx tsc --noEmit` exits 0. `npm run build` exits 0.**

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 1 - Bug] Strip stale comment references to deleted symbols in scanned roots**

- **Found during:** Task 1 — initial drift-guard test run (exit code 1)
- **Issue:** Plans 01-03 deleted all variant-system **code** from the scanned roots but left historical comment references to the deleted symbol names. The drift-guard's plain-substring `t.includes(...)` match cannot distinguish code from comments — the 6 offending comment lines caused 6 test failures:
  - `src/components/CueGlyph.tsx:64` — "Preview swatches follow the VariantPicker swatch coloring"
  - `src/components/CuePicker.tsx:4` — "Mirrors VariantPicker.tsx posture verbatim"
  - `src/components/CuePicker.tsx:9` — "avoid collision with VariantPicker's label id"
  - `src/components/CuePicker.tsx:52` — "(matches VariantPicker swatches)"
  - `src/components/NKShape.tsx:9` — "single-shape collapse — SquareShape / DiamondShape"
  - `src/components/shapeConstants.ts:5` — "SquareShape / DiamondShape removed"
- **Fix:** Updated comments to remove references to deleted symbol names. All comments now describe behavior without naming the deleted artifacts.
- **Files modified:** `src/components/CueGlyph.tsx`, `src/components/CuePicker.tsx`, `src/components/NKShape.tsx`, `src/components/shapeConstants.ts`
- **Commit:** included in `4699fde` (same commit as the drift-guard test)

## Phase 38 Closing Gate

### VAR-01..06 Requirements — All Observable

| Requirement | Plan | Status | Evidence |
|-------------|------|--------|----------|
| VAR-01 | 38-01 | Closed | SquareShape.tsx deleted; OrbShape is sole render target |
| VAR-02 | 38-01 | Closed | DiamondShape.tsx deleted; NKShape always renders OrbShape |
| VAR-03 | 38-02 | Closed | `VisualVariantId`, `VARIANT_OPTIONS`, `DEFAULT_VARIANT`, `isValidVariant` deleted from domain/settings.ts |
| VAR-04 | 38-03 | Closed | sessionVariantRef + liveVariant thread stripped from App.tsx |
| VAR-05 | 38-02 | Closed | `strings.variants` block + `settings.variantLabel` deleted from strings.ts (EN + PT-BR) |
| VAR-06 | 38-04 | Closed | drift-guard test passes; CI will fail if any forbidden token returns |

### ROADMAP Success Criteria — All Observable TRUE

- **SC1** (BreathingShape + Variant union gone; sessionVariantRef invariant gone): BreathingShape.tsx deleted (Plan 01), sessionVariantRef removed from App.tsx (Plan 03). Belt-and-suspenders grep returns 0 matches.
- **SC2** (SettingsDialog has no visible variant picker): VariantPicker removed from SettingsDialog (Plan 01). Full test suite passes including SettingsDialog tests.
- **SC3** (persisted variant:'square'|'diamond' coerces silently — no STATE_VERSION bump, no FOUC): `coerceVariant` deleted; `coercePrefs` reads only 4 fields; Phase 8 D-01 envelope tolerance ignores unknown `variant` key. `git diff main -- src/storage/storage.ts | grep STATE_VERSION` returns 0 matches.
- **SC4** (repo-wide search returns zero leftover references in scanned roots): Belt-and-suspenders audit below confirms 0 matches for all 4 grep patterns.

### Belt-and-Suspenders Audit (Task 2 Step 5)

All 4 cumulative greps against `src/` with production files only (excluding the drift-guard test file):

| Grep | Pattern | Result |
|------|---------|--------|
| 1 | Symbol name tokens (10 names) in scanned roots | **0 matches in scanned roots** (comment refs in `src/hooks/` only — hooks not in scanned roots per D-07) |
| 2 | `[data-variant='square'/'diamond']` CSS selectors | **0 matches** |
| 3 | `sessionVariant`, `liveVariant`, `sessionVariantRef` | **0 matches in production code** (1 comment ref in `App.session.test.tsx` — test file, excluded) |
| 4 | `variant: 'square'`/`'diamond'` persisted literals | **0 matches** |

**STATE_VERSION lock:** `git diff main -- src/storage/storage.ts | grep STATE_VERSION` returns 0 matches — constant unchanged across all four plans.

### D-01..D-10 Decision Coverage

| Decision | Plan | Coverage |
|----------|------|----------|
| D-01 (no STATE_VERSION bump) | 38-02 | Confirmed — coercePrefs field-deletion approach |
| D-02 (BreathingShape → OrbShape call sites) | 38-01 | 3 App.tsx call sites collapsed to OrbShape |
| D-03 (sessionVariant capture thread) | 38-03 | Full 6-thread strip from App.tsx |
| D-04 (drift-guard test) | 38-04 | content.no-variants.test.ts created |
| D-05 (14-token forbidden list) | 38-04 | All 14 tokens enforced |
| D-06 (lock / unlock exit clause) | 38-04 | Documented in file header + this SUMMARY |
| D-07 (4-root surface coverage) | 38-04 | components + app + content + styles |
| D-08 (display strings excluded) | 38-04 | 'Square'/'Diamond'/'Quadrado'/'Losango' not forbidden |
| D-09 (delete-with-component policy) | 38-01 | 12 files git rm'd in coordinated commit |
| D-10 (fixture field deletion) | 38-03 | variant fields stripped from App.*.test.tsx fixtures |

## Lock / Unlock Exit Clause (CONTEXT D-06)

This drift-guard is the lock. **Deleting this file is the intentional unlock.**

Future re-introduction of a shape variant system is a deliberate phase decision. That future phase must:
1. Explicitly delete `src/content/content.no-variants.test.ts`
2. Record rationale in that phase's SUMMARY (mirroring Phase 37 D-11 for STATS-05)

Without this explicit deletion, any re-introduction of the 14 forbidden tokens will fail CI immediately.

## Forward Pointer

Per ROADMAP:
- **Phase 39** (Theme simplification) depends on Phase 37 only — can proceed in parallel with or after Phase 38.
- **Phase 42** (Orb redesign) depends on Phase 38 + Phase 41. This drift-guard now actively unblocks Phase 42 by guaranteeing only OrbShape exists to dispatch from — no variant-axis legacy code that Phase 42 would need to thread around or delete.

## Tiger Style Commit Hygiene

1 atomic commit for this plan:
- `4699fde` — `test(38): VAR-06 drift-guard for variant tokens (CONTEXT D-04 D-05 D-06 D-07)` — new drift-guard file + comment cleanups (Rule 1 auto-fix bundled per same-task scope)

## Self-Check: PASSED

- `src/content/content.no-variants.test.ts` exists: FOUND
- Commit `4699fde` exists: FOUND
- `npx vitest run src/content/content.no-variants.test.ts` — 2/2 tests pass
- `npx tsc --noEmit` — exits 0
- `npm run build` — exits 0
- `npx vitest run` — 1095/1095 tests pass
- Belt-and-suspenders audit — all 4 greps return 0 matches in scanned roots
- STATE_VERSION unchanged
