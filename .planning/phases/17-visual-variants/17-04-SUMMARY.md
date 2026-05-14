---
phase: 17-visual-variants
plan: "04"
subsystem: hooks
tags:
  - hook
  - prefs-sync
  - variant
  - phase-17
  - tdd
dependency_graph:
  requires:
    - 17-01  # .shape-marker-- CSS rename (Wave 1 foundation)
    - phase-14  # prefs storage envelope + VisualVariantId type
    - phase-16  # useTheme/useThemeChoice pattern templates
  provides:
    - useVisualVariant  # App-side orchestrator hook
    - useVariantChoice  # Picker-side setter hook
  affects:
    - 17-05-PLAN.md  # BreathingShape dispatcher + VariantPicker body consume both hooks
tech_stack:
  added: []
  patterns:
    - "TDD RED/GREEN: failing tests committed before implementation"
    - "useTheme/useThemeChoice analog: variant substitution of Phase 16 hook pair"
    - "D-22 CustomEvent contract: detail.key filter per dimension on single event name"
    - "D-16: render-local variant (no global attribute write, no matchMedia)"
key_files:
  created:
    - src/hooks/useVariantChoice.ts
    - src/hooks/useVariantChoice.test.ts
    - src/hooks/useVisualVariant.ts
    - src/hooks/useVisualVariant.test.ts
  modified: []
decisions:
  - "D-16 applied: useVisualVariant has no apply effect and no global attribute write — variant is render-local only, BreathingShape switches component based on variant value"
  - "D-22 forward-compat: detail.key === undefined broadcast-all branch preserved in useVisualVariant listener — future callers without key still re-seed all dimensions"
  - "useCallback empty deps for setVariant identity stability in useVariantChoice — mirrors useThemeChoice contract"
metrics:
  duration: "~8 minutes"
  completed: "2026-05-14"
  tasks_completed: 2
  files_created: 4
  tests_added: 14
---

# Phase 17 Plan 04: useVariantChoice + useVisualVariant Hooks Summary

**One-liner:** Two-hook variant orchestration (useVisualVariant orchestrator + useVariantChoice setter) mirroring Phase 16 useTheme/useThemeChoice with D-16 render-local deviation and D-22 CustomEvent key filter.

## What Was Built

### useVariantChoice.ts (~47 LOC)

Picker-side setter hook — verbatim mirror of `useThemeChoice` with `theme → variant` type and key substitutions. Exposes `{ variant, setVariant }` where `setVariant` performs the 4-step write pipeline:

1. Fresh `loadPrefs()` read (avoids stale closure)
2. `savePrefs({ ...current, variant: next })` — envelope-merge preserves theme/timbre/locale per Phase 14 D-17
3. `setVariantState(next)` — optimistic UI for the picker
4. `window.dispatchEvent(new CustomEvent('hrv:prefs-changed', { detail: { key: 'variant', value: next } }))` — D-22 same-tab sync

`setVariant` identity is stable across re-renders via `useCallback` with empty deps.

### useVisualVariant.ts (49 LOC)

App-side orchestrator hook — mirror of `useTheme` with Effects 1+2 dropped per D-16:

- **Seeds** state from `loadPrefs().variant` at mount
- **Cross-tab sync** (Effect 3): `window.addEventListener('storage', ...)` filtered on `e.key === STATE_KEY`
- **Same-tab sync** (Effect 4): `window.addEventListener('hrv:prefs-changed', ...)` filtered on `detail.key === 'variant' || detail.key === undefined`
- **No** `document.documentElement.dataset.variant` write (D-16 — variant is render-local)
- **No** matchMedia subscription (variant is not OS-driven)

Returns `{ variant, setVariant }` — identical surface shape to useThemeChoice's `{ theme, setTheme }`.

### Test Coverage

**useVariantChoice.test.ts (6 cases):** Initial state from loadPrefs, optimistic UI update, savePrefs round-trip to localStorage, envelope-merge preserves other fields, CustomEvent dispatch shape (`detail.key='variant'`), identity stability across re-renders.

**useVisualVariant.test.ts (8 cases):** Mount-seed from loadPrefs, cross-tab storage event (positive + negative key), same-tab CustomEvent variant key (positive), theme key (negative — D-22 filter rejects), broadcast-all undefined key (positive — D-22 forward-compat), D-16 negative assertion (no global attribute write), no-matchMedia negative assertion.

## D-22 Contract Integrity Confirmed

Three-hook event-name contract is preserved:
- `useTheme` listens for `'hrv:prefs-changed'` filtered on `detail.key === 'theme' || undefined`
- `useVisualVariant` listens for `'hrv:prefs-changed'` filtered on `detail.key === 'variant' || undefined`
- A `setVariant` call dispatches `detail.key === 'variant'` — does NOT trigger `useTheme`'s re-seed
- A `setTheme` call dispatches `detail.key === 'theme'` — does NOT trigger `useVisualVariant`'s re-seed

Cross-key non-interference verified by useVisualVariant.test.ts Test 5 ("ignores same-tab hrv:prefs-changed CustomEvent with detail.key === theme").

## TDD Gate Compliance

- RED commit: `test(17-04): add failing tests for useVariantChoice` (082b914)
- GREEN commit: `feat(17-04): implement useVariantChoice` (c89ce40)
- RED commit: `test(17-04): add failing tests for useVisualVariant` (23516aa)
- GREEN commit: `feat(17-04): implement useVisualVariant` (bf9c312)

Both RED commits failed as expected (import resolution error — implementation did not exist). Both GREEN commits brought all tests to passing.

## Green-Gate at Commit Boundary

`tsc && lint && build && test` exits 0 after each implementation commit. Full suite: 43 test files, 523 tests all pass. Zero hardcoded color classes added; zero new tokens; no new runtime dependencies.

## Downstream

Plan 05 (BreathingShape dispatcher + VariantPicker body) consumes both hooks:
- `useVisualVariant()` in `App.tsx` alongside `useTheme()` — provides `variant` for `sessionVariantRef` snapshot at session start
- `useVariantChoice()` in `VariantPicker.tsx` — provides `{ variant, setVariant }` for picker option buttons

## Deviations from Plan

None - plan executed exactly as written. The comment cleanup (removing `dataset.variant` and `matchMedia` text from header comments to pass acceptance criteria grep checks) was a minor inline adjustment within Task 2 implementation, not a deviation.

## Known Stubs

None — both hooks are fully wired to real `loadPrefs`/`savePrefs` storage and the real `CustomEvent` dispatch primitive.

## Self-Check: PASSED

Files created:
- src/hooks/useVariantChoice.ts — FOUND
- src/hooks/useVariantChoice.test.ts — FOUND
- src/hooks/useVisualVariant.ts — FOUND
- src/hooks/useVisualVariant.test.ts — FOUND

Commits:
- 082b914 (test RED useVariantChoice) — FOUND
- c89ce40 (feat GREEN useVariantChoice) — FOUND
- 23516aa (test RED useVisualVariant) — FOUND
- bf9c312 (feat GREEN useVisualVariant) — FOUND
