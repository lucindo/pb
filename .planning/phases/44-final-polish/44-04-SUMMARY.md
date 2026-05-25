---
phase: 44-final-polish
plan: "04"
subsystem: refactor-pass
tags:
  - primitive-extraction
  - reconciliation
  - POLISH-05
  - design-logic-separation
dependency_graph:
  requires:
    - 44-01 (code-review sweep) — baseline established; POLISH-01/02 closed
    - 44-02 (test cleanup) — post-44-02 test count baseline 1153
    - 44-03 (comment audit) — post-44-03 baseline 1153
  provides:
    - 44-04-SUMMARY.md — POLISH-05 closed; reconciliation + primitive extraction evidence
    - src/components/SettingsRow.tsx — shared row chrome primitive
    - src/components/SettingsRow.test.tsx — behavioral unit tests (3 tests)
  affects:
    - 44-05 through 44-07 — downstream clusters inherit the post-44-04 state
    - AppSettingsPage / SetupCard / SettingsSheet — adapter consumers; prop-API unchanged
tech_stack:
  added: []
  patterns:
    - SettingsRow primitive extraction (Item E bd22ca5 PickerCardGrid<T> analog)
    - D-13 mandatory propose-step checklist (Downstream Constraints + Applicable Memory Rules before Goal/Scope/Risk)
    - D-05 obsolete-by-redesign disposition (STATE.md Pending Todos)
    - behavioral-only tests (ZERO toHaveClass — per D-14 / [[no-design-locking]])
key_files:
  created:
    - src/components/SettingsRow.tsx
    - src/components/SettingsRow.test.tsx
    - .planning/phases/44-final-polish/44-04-SUMMARY.md
  modified:
    - src/styles/theme.contrast.test.ts (comment at line 121 rewritten)
    - src/components/SettingsSegmentedRow.tsx (thin adapter wrapping SettingsRow)
    - src/components/SettingsToggleRow.tsx (thin adapter wrapping SettingsRow)
    - src/components/SettingsStepper.tsx (thin adapter wrapping SettingsRow)
    - .planning/STATE.md (Pending Todos .orb-layer entry dispositioned + commit SHA added)
decisions:
  - D-13 propose-step checklist honored — Downstream Constraints + Applicable Memory Rules documented before execution
  - labelContainerClassName prop added to SettingsRow for SegmentedRow column-layout label wrapper (div.mb-2)
  - noBorder prop added to SettingsRow for SettingsStepper hideTopBorder conditional
  - SettingsStepper LOC slightly increased (+3) due to noBorder prop threading — deviation documented
  - orb-layer comment rewritten to remove literal class name token (grep returns 0 hits post-edit)
metrics:
  duration_minutes: 35
  completed: "2026-05-25"
  tasks_completed: 2
  files_changed: 7
  files_created: 3
requirements:
  - POLISH-05
---

# Phase 44 Plan 04: SettingsRow Primitive Extraction + .orb-layer Reconciliation Summary

**One-liner:** SettingsRow primitive extracted from 3 adapter components (shared fieldset + label-span chrome); `.orb-layer` rename entry dispositioned obsolete-by-redesign with commit citation in STATE.md; 1156 tests pass (+3 from SettingsRow.test.tsx).

## What Was Built

A two-part POLISH-05 close per the 44-04 plan:

### Part A — Reconciliation: `.orb-layer` rename is OBSOLETE

**PATTERNS.md IMPORTANT FINDING summary:**

Live-code grep before execution:
```
grep -rn '\.orb-layer\|\.shape-layer' src/ --include="*.css" --include="*.tsx" --include="*.ts"
→ 1 hit: src/styles/theme.contrast.test.ts:121 (a comment)
```

The CSS classes `.orb-layer--in` / `.orb-layer--out` were deleted in Phase 41 J4 (commit `a742c0b`) as part of the orb rewrite (orb body is now halos + centre disc; gradient crossfade no longer exists). There is NO class to rename. The CONTEXT D-06/D-07 rename target was stale.

**Comment edit at theme.contrast.test.ts:121 (diff):**

```diff
-// J4: the reduced-motion in/out gradient midpoint-contrast test was removed.
-// It asserted the perceptual distance of an `.orb-layer--in` / `.orb-layer--out`
-// gradient crossfade that no longer exists post-J4 (orb body is now halos +
-// centre disc, phase distinction comes from the inner-ring opacity fade gated
-// by `showRings`). The accent-strong / on-accent and destructive-contrast
-// tests below remain meaningful and unchanged.
+// J4: the reduced-motion in/out gradient midpoint-contrast test was removed.
+// The orb body is now halos + centre disc (Phase 41 J4, commit a742c0b); the
+// gradient crossfade it asserted no longer exists in the codebase. Phase
+// distinction comes from the inner-ring opacity fade gated by `showRings`.
+// The accent-strong / on-accent and destructive-contrast tests below remain
+// meaningful and unchanged.
```

Post-edit grep: `grep -rn '\.orb-layer\|\.shape-layer' src/ --include="*.css" --include="*.tsx" --include="*.ts"` → **0 hits** (literal token removed from comment).

**STATE.md disposition (before/after):**

Before:
```
- v1.x deferred: `.orb-layer--in/--out` → `.shape-layer--in/--out` rename for naming consistency; per-variant token sets; live idle preview; additional shape variants. (Many of these were obviated by Phase 41's orb rewrite — re-audit at v2.0 close.)
```

After:
```
- v1.x deferred (partially dispositioned): `.orb-layer--in/--out` → `.shape-layer--in/--out` rename — **obsolete-by-redesign** per D-05: CSS classes deleted in Phase 41 J4 commit `a742c0b`; only an archived comment at `src/styles/theme.contrast.test.ts:121` remained, updated in Phase 44 Plan 04 refactor commit `b84f936` (POLISH-05). The remaining items from this entry — per-variant token sets; live idle preview; additional shape variants — remain deferred (not yet obviated).
```

Disposition cites Phase 41 J4 commit `a742c0b` AND the 44-04 close commit `b84f936` per T-44-04-04 (repudiation mitigation).

### Part B — SettingsRow Primitive Extraction

**Dedup candidate confirmation:**

Live-code grep at execution start:
```
grep -l 'border-t border-\[var(--color-border-soft)\]' src/components/
→ SettingsToggleRow.tsx, SettingsStepper.tsx, SettingsSegmentedRow.tsx (3 files)

grep -l 'fieldset' src/components/ --include="*.tsx" | grep -v test
→ SettingsSegmentedRow.tsx, SettingsToggleRow.tsx, SettingsStepper.tsx (3 files)
```

**SettingsRow primitive shape:**

```typescript
export interface SettingsRowProps {
  label: string
  ariaLabel: string
  /** Additional className applied to the fieldset (e.g. 'flex items-center justify-between') */
  className?: string
  /**
   * When true, omits the border-t divider. Corresponds to SettingsStepper's
   * hideTopBorder prop.
   */
  noBorder?: boolean
  /**
   * When provided, the label span is wrapped in a <div> with this className.
   * Used by SettingsSegmentedRow column-layout (label above full-width segmented pill).
   */
  labelContainerClassName?: string
  children: ReactNode
}

export function SettingsRow({ label, ariaLabel, className, noBorder, labelContainerClassName, children }: SettingsRowProps): ReactElement
```

**Adapter LOC reduction (before → after):**

| Adapter | Before LOC | After LOC | Delta |
|---------|-----------|----------|-------|
| SettingsSegmentedRow.tsx | 43 | 38 | -5 |
| SettingsToggleRow.tsx | 32 | 29 | -3 |
| SettingsStepper.tsx | 103 | 106 | +3 |
| SettingsRow.tsx (new) | — | 62 | +62 |
| SettingsRow.test.tsx (new) | — | 33 | +33 |

**Note:** SettingsStepper increased by 3 LOC because `hideTopBorder` required threading a `noBorder` prop through to SettingsRow, and the computed `strings.fieldAriaLabel(label)` call was already present in the original (no change there). The net across all 3 adapters is -5 LOC (excluding the new primitive files).

**Behavioral byte-equivalence proof:**

All 3 adapter tests pass UNCHANGED (no edits to any test file):
- `src/components/SettingsForm.nk.test.tsx`: 13/13 tests pass
- `src/components/SettingsForm.stretch.test.tsx`: 12/12 tests pass
- `src/components/SettingsPanelBody.test.tsx`: passes (uses SettingsStepper/Toggle/Segmented)
- `src/components/SettingsSheet.test.tsx`: passes
- `src/app/App.persistence.test.tsx`: passes (uses SettingsStepper)

None of these test files were edited. The prop API at the adapter level is unchanged.

**SettingsRow.test.tsx — behavioral tests (ZERO toHaveClass):**

```
✓ renders a fieldset with the provided aria-label
✓ renders the label text inside the row
✓ renders children inside the row
```

All tests use `getByRole('group', { name: '...' })` and `getByText()` / `getByRole('button', { name: '...' })` — behavioral assertions only. Per D-14 / [[no-design-locking]].

**[[design-logic-separation]] confirmation:**

Files modified in this plan:
- `src/components/SettingsRow.tsx` — NEW, layout primitive only
- `src/components/SettingsRow.test.tsx` — NEW, unit tests
- `src/components/SettingsSegmentedRow.tsx` — layout-only refactor
- `src/components/SettingsToggleRow.tsx` — layout-only refactor
- `src/components/SettingsStepper.tsx` — layout-only refactor
- `src/styles/theme.contrast.test.ts` — comment edit only
- `.planning/STATE.md` — bookkeeping disposition

NO logic / state / audio / persistence files were modified. Zero domain boundary crossings.

## Per-Cluster Commit

| Commit | Scope | Diff-stat |
|--------|-------|-----------|
| `b84f936` | `refactor(44): extract SettingsRow primitive + reconcile obsolete .orb-layer rename (POLISH-05)` | 7 files changed, 115 insertions(+), 25 deletions(-) |

`git show b84f936 --stat` confirms ONLY layout component files + comment edit + STATE.md — no logic/audio/persistence files.

## Test-Pass-Count Delta

```
Post-44-03 baseline:  107 files / 1153 tests pass
Post-44-04:           108 files / 1156 tests pass (commit b84f936)
Delta:                +1 file / +3 tests from SettingsRow.test.tsx
```

## Bundle Size Delta

```
Pre-44-04 (post-44-03, comment-only changes):  PWA 514.18 KiB (from 44-03 SUMMARY green-gate evidence)
Post-44-04:                                     PWA 514.10 KiB / JS 302.05 kB
Delta:                                          -0.08 KiB PWA (negligible — extraction redistributes existing code)
```

The JS bundle size increase vs the Item E analog (-2.4 KB from PickerCardGrid) is expected: PickerCardGrid extracted identical template code from 4 large pickers (~60 LOC each). SettingsRow extracts a smaller shared subset (fieldset + label span) from 3 smaller components, and the SettingsStepper only partially benefits. The primary value is maintenance-surface reduction, not byte reduction.

## Per-Commit Green-Gate Evidence

Run on commit `b84f936`:

```
npx tsc --noEmit -p tsconfig.app.json   # exit 0 — clean
npm run lint                            # exit 0 — 0 errors, 0 warnings
npm test -- --run                       # exit 0 — 108 files / 1156 tests pass (+1 file, +3 tests)
npm run build                           # exit 0 — PWA 514.10 KiB / JS 302.05 kB (clean)
```

## Deviations from Plan

**1. [Rule 2 - Design Decision] SettingsRow primitive extended with labelContainerClassName and noBorder props**

- **Found during:** Task 2, Step 2 (reading SettingsSegmentedRow source)
- **Issue:** SettingsSegmentedRow wraps its label span in `<div className="mb-2 flex items-center justify-between">`, which is structurally different from ToggleRow/Stepper (inline label). A plain `label: string → <span>` extraction would not preserve this.
- **Fix:** Added `labelContainerClassName?: string` prop to SettingsRow. When provided, the label span is wrapped in `<div className={labelContainerClassName}>`. SegmentedRow passes `"mb-2 flex items-center justify-between"`. ToggleRow/Stepper omit it.
- **Also:** `SettingsStepper` has a `hideTopBorder` prop that conditionally removes `border-t`. Added `noBorder?: boolean` to SettingsRow; Stepper passes `noBorder={hideTopBorder}`.
- **Impact:** SettingsStepper LOC increased by 3 (not decreased) due to the prop threading. Recorded in the LOC table above.
- **Files modified:** `src/components/SettingsRow.tsx` (extra props), `src/components/SettingsStepper.tsx` (noBorder forwarding)
- **Commit:** `b84f936`

**2. [Rule 2 - Design Decision] orb-layer comment rewritten to remove literal token (grep returns 0 hits)**

- **Found during:** Task 1, Step 2
- **Issue:** The plan said to update the comment to drop the "now-mysterious" reference. The rewrite removed the literal `.orb-layer--in` / `.orb-layer--out` tokens entirely, so the post-edit grep returns 0 hits (not 1). The plan's acceptance criteria accepted 0 OR 1 hit.
- **Fix:** Already covered — the comment was rewritten with the full WHY explanation without the stale class name tokens.
- **Commit:** `b84f936`

## Known Stubs

None — this plan extracts existing code into a primitive and reconciles bookkeeping. No stubs introduced.

## Threat Flags

None — layout-only refactor + comment edit + STATE.md bookkeeping. No new network endpoints, auth paths, file access patterns, or schema changes.

## Self-Check

### Created files exist

- [x] `src/components/SettingsRow.tsx` — 62 LOC, exports `SettingsRow` and `SettingsRowProps`
- [x] `src/components/SettingsRow.test.tsx` — 33 LOC, 3 behavioral tests, 0 `toHaveClass` assertions
- [x] `.planning/phases/44-final-polish/44-04-SUMMARY.md` — this file

### Modified files exist

- [x] `src/styles/theme.contrast.test.ts` — comment rewritten, literal `.orb-layer` token removed
- [x] `src/components/SettingsSegmentedRow.tsx` — thin adapter wrapping SettingsRow
- [x] `src/components/SettingsToggleRow.tsx` — thin adapter wrapping SettingsRow
- [x] `src/components/SettingsStepper.tsx` — thin adapter wrapping SettingsRow
- [x] `.planning/STATE.md` — Pending Todos `.orb-layer` entry dispositioned + commit `b84f936` cited

### Commits exist

- [x] Commit `b84f936` — `refactor(44): extract SettingsRow primitive + reconcile obsolete .orb-layer rename (POLISH-05)`

### Success criteria verification

- [x] Both tasks executed (Task 1: reconciliation; Task 2: extraction + commit)
- [x] ONE `refactor(44):` commit `b84f936` with body naming BOTH Part A and Part B (D-02)
- [x] `grep -rn '\.orb-layer' src/` returns 0 hits (comment rewritten to remove literal token)
- [x] STATE.md Pending Todos entry dispositioned `obsolete-by-redesign` citing commit `a742c0b` (J4) and `b84f936` (44-04)
- [x] `src/components/SettingsRow.tsx` exists with exported `SettingsRow` primitive
- [x] `src/components/SettingsRow.test.tsx` exists with 3 behavioral tests, ZERO `toHaveClass` assertions
- [x] All 3 adapter files import from `./SettingsRow`
- [x] All 3 existing adapter tests pass UNCHANGED (behavioral byte-equivalence)
- [x] Test count = 1156 (1153 + 3 new SettingsRow tests)
- [x] tsc + lint + test + build all exit 0
- [x] Bundle size delta recorded: PWA 514.18 → 514.10 KiB / JS 302.05 kB
- [x] No logic/state/audio/persistence files modified ([[design-logic-separation]] confirmed)

## Self-Check: PASSED
