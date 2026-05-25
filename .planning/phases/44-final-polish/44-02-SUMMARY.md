---
phase: 44-final-polish
plan: "02"
subsystem: test-cleanup
tags:
  - test-quality
  - tiger-style
  - no-design-locking
  - POLISH-03
dependency_graph:
  requires:
    - 44-01 (code-review sweep) — established POLISH-01/02 baseline; D-14 no-design-locking guard was already clean from Item H
  provides:
    - 44-02-SUMMARY.md — final test count delta + flake-check evidence
    - POLISH-03 closed — tight names, no redundancy, no design-token-locking assertions, 3x flake-check zero-flake, final count documented
  affects:
    - 44-03 through 44-07 — downstream clusters inherit the 1153-test baseline
tech_stack:
  added: []
  patterns:
    - Tiger Style "describe-the-behavior-not-the-implementation" rename pattern
    - Item F2 redundancy-removal discipline (behavioral coverage preserved check before deletion)
    - Item H design-token-locking audit (already clean; zero new candidates found)
key_files:
  created:
    - .planning/phases/44-final-polish/44-02-SUMMARY.md
  modified:
    - src/components/FeedbackCount.test.tsx (deleted 1 redundant test)
    - src/components/PracticeToggle.test.tsx (deleted 1 redundant test)
    - src/components/primitives/Stepper.test.tsx (renamed 2 test names)
  deleted:
    - .planning/phases/44-final-polish/44-02-AUDIT-NOTES.md (absorbed into this SUMMARY)
decisions:
  - Bare `describe('ComponentName')` top-level blocks are NOT rename candidates — Tiger Style only targets cases where neither describe nor it describes behavior; all 30 such blocks in the codebase are appropriate top-level groupings for dedicated unit-test files
  - `toHaveClass('extra')` in Eyebrow.test.tsx and ArrowLink.test.tsx are NOT design-token-locking — they test className prop-forwarding API with a synthetic fixture class, which is a behavioral prop-API contract
  - FeedbackCount `it('renders Navi-shape data...')` deleted because it re-asserts all three of the preceding atomic tests; atomic tests provide better isolation coverage
  - PracticeToggle `it('works when stretch is the active pill')` deleted because it is a pure duplicate of the `it('active pill has aria-pressed="true"...')` test at line 64 with an inferior name
metrics:
  duration_minutes: 18
  completed: "2026-05-25"
  tasks_completed: 2
  files_changed: 3
  files_created: 1
requirements:
  - POLISH-03
---

# Phase 44 Plan 02: Test Cleanup Summary

**One-liner:** Tiger Style name tightening (2 renames) and redundancy removal (2 deletions) yield 1153 tests passing zero-flake across 3 consecutive runs; design-token-locking assertions confirmed clean from Item H.

## What Was Built

A POLISH-03 sweep of `src/**/*.test.{ts,tsx}` across all three cleanup categories:

1. **Tight-name renames** — 2 test names in `Stepper.test.tsx` tightened per Tiger Style "describe-the-behavior-not-the-implementation" rule
2. **Redundancy removal** — 2 redundant tests deleted: one in `FeedbackCount.test.tsx` (re-asserted three atomic tests above it) and one in `PracticeToggle.test.tsx` (near-identical duplicate with inferior name)
3. **Design-token-locking audit** — 0 candidates found; `toHaveClass` grep returns only 2 hits, both are className prop-forwarding API tests (behavioral, not design-token-locking); already clean from Item H (`4457259`)

Drift-guards all preserved. Final test count documented. 3× consecutive zero-flake confirmed.

## Test Count Delta

```
Pre-sweep:  107 files / 1155 tests   (CONTEXT baseline at commit 580dc53)
Post-sweep: 107 files / 1153 tests   (commit dac3dec)
Net:        ±0 files / -2 tests      (rationale: 2 pure-redundant tests deleted; behavioral coverage preserved in both cases)
```

## Per-Category Counts

| Category | Count | Details |
|----------|-------|---------|
| Tight-name renames | 2 renames | `Stepper.test.tsx` lines 8 + 21 |
| Redundancy removed | 2 deletions | `FeedbackCount.test.tsx` line 46-53; `PracticeToggle.test.tsx` lines 105-110 |
| Design-token-locking swaps | 0 | Already clean from Item H (`4457259`); 0 hits for the design-token grep |

## Rename Details

| File | Before | After |
|------|--------|-------|
| `src/components/primitives/Stepper.test.tsx:8` | `it('renders the value')` | `it('displays the numeric value as text')` |
| `src/components/primitives/Stepper.test.tsx:21` | `it('uses formatValue when provided')` | `it('formats the displayed value using the formatValue callback when provided')` |

## Redundancy Removal Details

### FeedbackCount.test.tsx — `it('renders Navi-shape data...')` deleted

**Lines deleted:** 46-53

**Why redundant:** The deleted test rendered `big="47" mid="/ 100" small="Round 1 of 3 · Front"` and asserted all three texts visible — exactly the same props and assertions as the three preceding atomic tests (lines 8-21):
- Line 8: asserts `getByText('47')` visible
- Line 13: asserts `getByText('/ 100')` visible
- Line 18: asserts `getByText('Round 1 of 3 · Front')` visible

The atomic tests actually provide *better* isolation (each tests a single concern). The Stretch-shape test at line 55 was kept — it covers genuinely distinct data.

**Behavioral coverage preserved:** Yes — the three atomic tests individually verify `big`, `mid`, and `small` prop rendering.

### PracticeToggle.test.tsx — `it('works when stretch is the active pill')` deleted

**Lines deleted:** 105-110

**Why redundant:** This test was a pure duplicate of `it('active pill has aria-pressed="true" and others have aria-pressed="false"')` at line 64:
- Both render `active: 'stretch'`
- Both assert the SAME three `aria-pressed` values on the same three buttons
- The test at line 64 has a more descriptive behavioral name

**Behavioral coverage preserved:** Yes — line 64's test covers exactly the same assertions.

## Design-Token-Locking Audit (D-14)

```
grep -rn "toHaveClass('['\"]p-[0-9]|toHaveClass('['\"]size-[0-9]|toHaveClass('['\"]bg-\[var|toHaveClass('['\"]text-\[var|toHaveClass('['\"]border-\[var" src/ --include="*.test.ts" --include="*.test.tsx"
```
→ **0 hits**

```
grep -rn 'toHaveClass(' src/ --include="*.test.ts" --include="*.test.tsx" | grep -v -E '(visually-hidden|sr-only)'
```
→ **2 hits** (both are className prop-forwarding API tests — NOT design-token-locking):
- `src/components/primitives/Eyebrow.test.tsx:15` — `toHaveClass('extra')`: tests className forwarding with a synthetic test class
- `src/components/primitives/ArrowLink.test.tsx:39` — `toHaveClass('extra')`: same pattern

**Decision:** Both hits KEPT — `'extra'` is a test fixture class, not a Tailwind utility or CSS variable. These test the `className` forwarding API (behavioral contract), not a design token value. This is consistent with Item H's guidance: only assertions locking Tailwind utilities (`p-6`, `size-10`) or CSS variable references (`bg-[var(--...)]`) are design-token-locking.

## Flake Check Evidence

3× consecutive `npm test -- --run` runs — all identical:

```
=== run 1 ===
Tests  1153 passed (1153)
Start at  01:53:10
Duration  7.31s

=== run 2 ===
Tests  1153 passed (1153)
Start at  01:53:18
Duration  7.28s

=== run 3 ===
Tests  1153 passed (1153)
Start at  01:53:25
Duration  7.43s
```

**Zero flake** — same pass count (1153) on every run.

## Drift-Guard PRESERVE LIST

All 7 drift-guard tests confirmed present at their canonical paths (ls returned success for each):

```
src/content/content.no-removed-keys.test.ts       # J18.8 — locks J13/J16/J17/J18 removed i18n keys
src/content/content.no-removed-themes.test.ts     # Phase 39 — locks Moss/Slate/Dusk deletion
src/content/content.no-variants.test.ts           # Phase 38 — locks Square/Diamond deletion
src/audio/previewContext.no-audioengine-import.test.ts  # Phase 40 PREV-03 — locks import-graph
src/content/content.no-review-markers.test.ts      # Phase 26 I18N-07 — locks review-marker done-state
src/content/content.no-stats-ui.test.ts            # Phase 37 STATS-05 — locks stats UI absence
src/styles/theme.no-hardcoded-classes.test.ts      # Phase 16.1 — locks 10 banned Tailwind palette utilities
```

**Note:** PATTERNS.md references `content.no-removed-variants.test.ts` but the actual on-disk file is `content.no-variants.test.ts` — same drift-guard, confirmed by reading the file header ("Phase 38 VAR-06 drift-guard").

None of the 7 drift-guard files were modified in this plan.

## Per-Cluster Commit

| Commit | Scope | Diff-stat |
|--------|-------|-----------|
| `dac3dec` | `test(44): tighten test names + remove redundancy + drop design-token-locking assertions (POLISH-03)` | 3 files changed, 2 insertions(+), 17 deletions(-) |

## Per-Commit Green-Gate Evidence

Run on commit HEAD (`dac3dec`):

```
npx tsc --noEmit -p tsconfig.app.json   # exit 0 — clean
npm run lint                            # exit 0 — 0 errors, 0 warnings
npm test -- --run                       # exit 0 — 107 files / 1153 tests pass
npm run build                           # exit 0 — PWA 514.18 KiB (clean)
```

## POLISH-03 Close Evidence

**POLISH-03:** Tight Vitest names (2 renames), redundancy removed (2 deletions, behavioral coverage preserved per Item F2 discipline), no design-token-locking assertions (0 hits for the D-14 grep), 3× consecutive zero-flake, final test count documented (1153 tests / 107 files). ✅

## AUDIT-NOTES.md Disposition

`.planning/phases/44-final-polish/44-02-AUDIT-NOTES.md` deleted after absorbing into this SUMMARY. The SUMMARY supersedes the audit notes in every material detail:
- Section 1 (tight-name candidates) → Rename Details table above
- Section 2 (redundancy candidates) → Redundancy Removal Details above
- Section 3 (design-token-locking) → Design-Token-Locking Audit section above
- Section 4 (preserve list) → Drift-Guard PRESERVE LIST above
- Section 5 (Tiger Style interpretation) → Decisions frontmatter + Rename Details

## Deviations from Plan

**Minor: Bare `describe('ComponentName')` blocks not renamed**

The plan's audit scope for Section 1 included "bare describe block" patterns. All 30 `describe('ComponentName', ...)` hits are top-level groupings for dedicated unit-test files — a pattern where the inner `it()` names carry the behavioral description. Tiger Style "describe-the-behavior-not-the-implementation" does NOT require adding a behavior-cluster suffix to top-level describes when the file scope is already the behavior cluster. No deviation from plan intent — this is within Claude's Discretion for per-test Tiger Style interpretation.

**Minor: content.no-variants.test.ts name discrepancy**

PATTERNS.md and the PLAN.md `<read_first>` block reference `content.no-removed-variants.test.ts` but the actual on-disk file is `content.no-variants.test.ts`. The file is the Phase 38 VAR-06 drift-guard as confirmed by its header comment. Treated as a naming discrepancy in documentation, not a missing file. Preserved verbatim.

## Known Stubs

None — this plan only modifies test files (name renames and test deletions). No stubs were introduced or wired.

## Threat Flags

None — this plan only modifies `src/**/*.test.{ts,tsx}` files. No new network endpoints, auth paths, file access patterns, or schema changes.

## Self-Check

### Created files exist

- [x] `.planning/phases/44-final-polish/44-02-SUMMARY.md` exists (this file)

### Modified files exist and have correct content

- [x] `src/components/primitives/Stepper.test.tsx` — `it('displays the numeric value as text')` and `it('formats the displayed value using the formatValue callback when provided')`
- [x] `src/components/FeedbackCount.test.tsx` — `it('renders Navi-shape data...')` removed (6 tests remain)
- [x] `src/components/PracticeToggle.test.tsx` — `it('works when stretch is the active pill')` removed (7+4 tests remain)

### Commits exist

- [x] Task 1 artifact: `44-02-AUDIT-NOTES.md` created (then deleted after absorption)
- [x] Task 2 commit `dac3dec` — `test(44): tighten test names + remove redundancy + drop design-token-locking assertions (POLISH-03)`

### Success criteria verification

- [x] Both tasks executed (audit notes → apply edits + flake check + SUMMARY)
- [x] Per-cluster commit landed with `test(44):` scope prefix per D-02
- [x] All 7 drift-guard tests still exist at canonical paths (`ls` returns success for each)
- [x] `grep "toHaveClass('p-[0-9]|...')"` returns 0 hits (D-14 close)
- [x] 3× consecutive `npm test -- --run` zero-flake (same 1153 pass count each run)
- [x] tsc + lint + test + build all exit 0 on commit HEAD
- [x] 44-02-SUMMARY.md exists with test-count delta block (Pre/Post/Net with rationale), flake evidence, per-category counts, drift-guard PRESERVE list, per-cluster commit SHA
- [x] AUDIT-NOTES.md deleted (absorbed into this SUMMARY)
- [x] No modifications to STATE.md, ROADMAP.md, or any non-test source file

## Self-Check: PASSED
