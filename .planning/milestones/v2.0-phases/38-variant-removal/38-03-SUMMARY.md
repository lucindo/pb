---
phase: 38-variant-removal
plan: "03"
subsystem: variant-removal
tags:
  - variant
  - cleanup
  - app-tsx
  - theme-css
  - test-fixtures
dependency_graph:
  requires:
    - 38-01
    - 38-02
  provides:
    - VAR-04-closed
    - no-sessionVariant-thread
    - no-liveVariant-identifier
    - no-square-diamond-css
    - 4-field-userprefs-fixtures
  affects:
    - src/app/App.tsx
    - src/styles/theme.css
    - src/app/App.test.tsx
    - src/app/App.locale.test.tsx
    - src/hooks/useLocale.test.ts
tech_stack:
  patterns:
    - surgical-deletion (top-down to avoid line-number drift)
    - rule-3-auto-fix (useLocale.test.ts not in plan files_modified; blocked tsc -b)
key_files:
  modified:
    - src/app/App.tsx
    - src/styles/theme.css
    - src/app/App.test.tsx
    - src/app/App.locale.test.tsx
    - src/hooks/useLocale.test.ts
decisions:
  - "Comment references to deleted symbols (VariantPicker, SquareShape, useVisualVariant, etc.) in other files left intact — they are historical documentation, not live code"
  - "useLocale.test.ts added to Task 3 scope (Rule 3 auto-fix) — it had a UserPrefs-typed variable with variant field, blocking tsc -b"
metrics:
  duration: "~10 minutes"
  completed: "2026-05-21"
  tasks_completed: 3
  files_modified: 5
---

# Phase 38 Plan 03: App.tsx + theme.css + fixture cleanup Summary

One-liner: Surgically deleted the sessionVariant/liveVariant state thread from App.tsx, stripped the Phase 17 CSS variant section (84 lines) from theme.css, and aligned 4 test fixture objects to the 4-field UserPrefs shape.

## Tasks Completed

### Task 1: Strip the sessionVariantRef + sessionVariant + liveVariant thread from App.tsx

**Commit:** `36628f0` — `chore(38): strip sessionVariantRef + sessionVariant + liveVariant thread from App.tsx (VAR-04; D-03)`

**Files:** `src/app/App.tsx` (net −27 lines)

12-thread App.tsx surgical strip (top-down to avoid line-number drift from earlier deletions shifting later sites):

1. **L223 (liveVariant shim):** Deleted `const liveVariant: null = null` (Plan 02 retype shim — Plan 03 removes entirely)
2. **L285-292 (8-line block):** Deleted Phase 17 D-09 WHY-comment block + `sessionVariantRef = useRef<null>(null)` + `sessionVariant, setSessionVariant = useState<null>(null)`
3. **L471-472 (onEndClick tidy clear):** Deleted `sessionVariantRef.current = null` + `setSessionVariant(null)`; updated neighboring L473 comment to remove orphan "mirrors sessionVariantRef clear"
4. **L486-491 (6-line capture-at-Start):** Deleted Phase 17 D-10 comment block + `sessionVariantRef.current = liveVariant` + `setSessionVariant(liveVariant)`; updated Phase 25 D-09 comment to remove "mirrors variant capture above"
5. **L507-508 (comment update):** Dropped parenthetical referencing `sessionVariantRef.current = liveVariant site above at line ~338` — that site is now gone
6. **L556 dep array:** Stripped `liveVariant,` from `useCallback` dep array (onStartClick)
7. **L669-670 (leave-running cleanup clears):** Deleted `sessionVariantRef.current = null` + `setSessionVariant(null)`
8. **L818-819 (NK-complete clears):** Deleted `sessionVariantRef.current = null` + `setSessionVariant(null)`
9. **L868-869 (NK-start captures):** Deleted `sessionVariantRef.current = liveVariant` + `setSessionVariant(liveVariant)`
10. **L926 NK dep array:** Stripped `liveVariant,` from NK `useCallback` dep array
11. **L937-938 (NK-cancel clears):** Deleted `sessionVariantRef.current = null` + `setSessionVariant(null)`
12. **Comment debt sweep:** Updated orphan BreathingShape reference in Phase 25 D-09 cue comment → OrbShape; removed VariantPicker from SettingsDialog JSX comment

**Verification:** `npx tsc --noEmit` exits 0; `npx vitest run src/app` — 119/119 tests pass.

### Task 2: Delete the L391-474 variant section from src/styles/theme.css

**Commit:** `f3b0196` — `chore(38): strip [data-variant='square'|'diamond'] CSS blocks from theme.css (VAR-06; D-04 surface coverage)`

**Files:** `src/styles/theme.css` (−84 lines)

Deleted the entire Phase 17 — Visual Variants section (L392-474):
- Section-header comment (Phase 17 — Visual Variants, L392-401, 10 lines)
- Square variant block (L403-410, 8 lines): `[data-variant='square'] .shape-marker--outer/inner { border-radius: 18% }`
- Diamond clip-path block (L412-426, 15 lines): `[data-variant='diamond'] .orb/.orb-layer--in/.orb-layer--out { clip-path: polygon(...) }`
- Diamond inscribed-rotated-square comment + base rules (L428-457, 30 lines): `[data-variant='diamond'] .shape-marker--outer/inner { inset: auto; left/top: 50%; border-radius: 0 }`
- Diamond outer marker rule (L459-466, 8 lines): width/height/transform calc
- Diamond inner marker rule (L468-474, 7 lines): width/height/transform calc (MIN_SCALE 0.58)

The preceding `[data-phase='out'] .shape-marker--inner` rule and the subsequent F3 `@starting-style` dialog fade block are preserved untouched.

**Verification:**
- `grep -nE "\[data-variant=['\"]?(square|diamond)['\"]?\]" src/styles/theme.css` → 0 results
- `grep -n "data-variant" src/styles/theme.css` → 0 results (all selectors gone)
- `npx vite build` exits 0 (CSS parses cleanly)
- `npx vitest run src/components/OrbShape.test.tsx src/components/NKShape.test.tsx` → 49/49 pass (DOM `[data-variant="orb"]` attribute assertions pass — attribute still emitted by OrbShape/NKShape, only the CSS *selectors* are gone)

### Task 3: Strip `variant: 'orb'` fixture fields from test files

**Commit:** `7ee2b70` — `chore(38): strip variant: 'orb' fixture fields from App.test.tsx + App.locale.test.tsx (VAR-04; D-10)`

**Files:** `src/app/App.test.tsx`, `src/app/App.locale.test.tsx`, `src/hooks/useLocale.test.ts`

- **App.test.tsx:** Dropped `variant: 'orb'` from 3 prefs fixtures (L98 seedCue helper; L155 + L176 cross-tab cue tests)
- **App.locale.test.tsx:** Dropped `variant: 'orb'` from `DEFAULT_FULL_PREFS` (L23)
- **useLocale.test.ts** (Rule 3 auto-fix — not in plan files_modified): Dropped `variant: 'orb'` from `DEFAULT_FULL_PREFS: UserPrefs` (L18) — this was typed directly as `UserPrefs` and blocked `tsc -b` / `npm run build`

**Defensive audit:** `App.audio.test.tsx`, `App.wakeLock.test.tsx`, `App.dialog.test.tsx`, `App.persistence.test.tsx` — all clean (no typed `variant` fields). Other files with `variant: 'orb'` in JSON.stringify or untyped objects are harmless (excess property checking not triggered).

**Verification:** `npx tsc -p tsconfig.app.json --noEmit` exits 0; `npx vitest run src/app` — 119/119 pass.

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 3 - Blocking] useLocale.test.ts blocked tsc -b / npm run build**
- **Found during:** Task 3 defensive audit scan
- **Issue:** `useLocale.test.ts:18` declared `DEFAULT_FULL_PREFS: UserPrefs = { ..., variant: 'orb', ... }`. The `UserPrefs` type (Plan 02) no longer has a `variant` field, so TypeScript's excess property checking on the directly-typed assignment threw TS2353. This is not in the plan's `files_modified` list.
- **Fix:** Dropped `variant: 'orb'` from that fixture line.
- **Files modified:** `src/hooks/useLocale.test.ts`
- **Commit:** `7ee2b70` (bundled with Task 3)

## Final Verification Results

### Success Criteria Checks

- `grep -E "sessionVariantRef|sessionVariant|liveVariant|VisualVariantId" src/app/App.tsx` → **0 results** (exit 1)
- `grep -E "\[data-variant=['\"]?(square|diamond)['\"]?\]" src/styles/theme.css` → **0 results** (exit 1)
- `npx tsc --noEmit` → **exits 0**
- `npx vitest run` → **1093/1093 tests pass** (70 test files)
- `npm run build` → **exits 0** (Vite + PWA)

### Belt-and-Suspenders Audit

`git grep -E "SquareShape|DiamondShape|VariantPicker|VisualVariantId|useVisualVariant|useVariantChoice|coerceVariant|sessionVariantRef|sessionVariant|liveVariant" src/` returns **15 hits — all in comments** (historical WHY-comments referencing deleted files, Phase 38 audit notes, or structural comparison documentation). Zero live code references.

`git grep -E "\[data-variant=['\"]?(square|diamond)['\"]?\]" src/` → **0 results**.

### Phase 38 ROADMAP Success Criteria

1. **Orb-only render path** — TRUE. OrbShape is the sole shape component rendered in all App paths. BreathingShape / SquareShape / DiamondShape / VariantPicker are gone (Plan 01).
2. **No VisualVariantId in domain types** — TRUE. Plan 02 deleted the type from settings.ts; Plan 03 removed the final shim in App.tsx.
3. **Returning user with persisted variant lands on orb** — TRUE (implicit). Plan 02 deleted `prefs.variant` from UserPrefs; Phase 8 D-01 envelope tolerance harmlessly ignores the legacy field; the only render path is OrbShape.
4. **No variant scaffolding in src/** — TRUE. No live code references to sessionVariant, liveVariant, VisualVariantId, or [data-variant='square'|'diamond'] survive.

## Known Stubs

None. All variant-axis surface has been removed or confirmed absent.

## Threat Flags

None. The CSS deletion removes selectors that no longer match any DOM (no element writes `data-variant='square'` or `data-variant='diamond'` after Plan 01). The deletion is a documentation and lint concern that is now fully resolved.

## Forward Pointer

**Plan 04** (VAR-06 drift-guard): Adds a static drift-guard test that scans `src/` for all 9 forbidden variant tokens (SquareShape, DiamondShape, VariantPicker, VisualVariantId, useVisualVariant, useVariantChoice, coerceVariant, sessionVariant, liveVariant) and the `[data-variant='square'|'diamond']` CSS regex. Future accidental re-introduction fails CI.

## Tiger Style Commit Hygiene

3 atomic commits this plan, all scoped `(38)`:
1. `36628f0` — App.tsx 12-thread state strip (VAR-04)
2. `f3b0196` — theme.css 84-line variant section deletion (VAR-06 surface coverage)
3. `7ee2b70` — 4-fixture UserPrefs alignment (VAR-04 D-10)

## Self-Check: PASSED

- FOUND: src/app/App.tsx
- FOUND: src/styles/theme.css
- FOUND: src/app/App.test.tsx
- FOUND: src/app/App.locale.test.tsx
- FOUND: src/hooks/useLocale.test.ts
- FOUND: .planning/phases/38-variant-removal/38-03-SUMMARY.md
- FOUND commit: 36628f0 (Task 1 - App.tsx)
- FOUND commit: f3b0196 (Task 2 - theme.css)
- FOUND commit: 7ee2b70 (Task 3 - test fixtures)
