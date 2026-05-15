---
phase: 17-visual-variants
plan: "05"
subsystem: components
tags:
  - dispatcher
  - picker
  - phase-17
  - tdd
dependency_graph:
  requires:
    - 17-02  # OrbShape extracted component
    - 17-03  # SquareShape + RingShape extracted components
    - 17-04  # useVariantChoice + useVisualVariant hooks
  provides:
    - BreathingShape-dispatcher  # 3-way variant switch, OPTIONAL variant? prop
    - VariantPicker-radiogroup   # Full ThemePicker-mirror radiogroup with inline swatches
  affects:
    - 17-06-PLAN.md  # App.tsx wire-up consumes new BreathingShape variant? prop + useVisualVariant
tech_stack:
  added: []
  patterns:
    - "TDD RED/GREEN: failing tests committed before implementation per plan"
    - "Thin dispatcher pattern: BreathingShape owns idle guard, delegates to siblings"
    - "OPTIONAL prop with default — transitional bridge for Plan 05→06 commit boundary"
    - "ThemePicker-mirror: VariantPicker copies structure verbatim with variant substitutions"
    - "Inline shape swatches: Option A (span+borderRadius) for Orb/Square, Option B (SVG) for Ring"
key_files:
  created: []
  modified:
    - src/components/BreathingShape.tsx
    - src/components/BreathingShape.test.tsx
    - src/components/VariantPicker.tsx
    - src/components/VariantPicker.test.tsx
    - src/components/SettingsDialog.test.tsx
decisions:
  - "OPTIONAL variant? prop with default 'orb' preserves App.tsx compilation at Plan 05 commit boundary without requiring App.tsx edits — Plan 06 owns the explicit prop pass"
  - "SettingsDialog.test.tsx updated to use getAllByRole('radiogroup') since VariantPicker adds a second radiogroup alongside ThemePicker"
  - "Fixed optional chain lint errors in VariantPicker.test.tsx by using textContent equality comparisons matching ThemePicker.test.tsx pattern"
metrics:
  duration: "6 minutes"
  completed: "2026-05-14"
  tasks_completed: 2
  files_modified: 5
---

# Phase 17 Plan 05: Dispatcher + VariantPicker Summary

One-liner: BreathingShape became the 3-way variant dispatcher (OPTIONAL `variant?` prop, `switch(variant)`) and VariantPicker became the full ThemePicker-mirror radiogroup with inline shape swatches.

## What Was Built

### Task 1: BreathingShape 3-way Dispatcher

`src/components/BreathingShape.tsx` evolved from a Phase 02 pass-through (unconditionally delegates to OrbShape) into the full Plan 05 dispatcher:

- **OPTIONAL `variant?: VisualVariantId` prop** with destructuring-site default `= 'orb'` (VARIANT-02 zero-regression — App.tsx callers without the variant prop compile and render orb behavior unchanged)
- **Single idle null-return guard** `if (frame === null && leadInDigit == null) return null` (D-04 dispatcher contract)
- **`switch (variant)` with orb as default branch** (defense in depth for cross-tab pollution / forward-compat unknown values)
- **Imports OrbShape + SquareShape + RingShape** and delegates frame + leadInDigit props identically to each sibling
- **39 LOC** (well under the 55 LOC target) with leading comment block explaining D-04 + VARIANT-02 transitional bridge

`src/components/BreathingShape.test.tsx` replaced with 8-behavior dispatcher test suite:
1. Idle null-return: `frame={null}` with no variant prop
2. Idle null-return: `variant="orb" frame={null} leadInDigit={null}`
3. Idle null-return: `variant="square" frame={null}` (variant-agnostic guard)
4. Default-to-orb: no variant prop → `data-variant="orb"`
5. `it.each<VisualVariantId>` body dispatch: 3 variants render correct `data-variant`
6. `it.each<VisualVariantId>` lead-in dispatch: 3 variants + `data-variant` + no `data-phase` + digit visible
7. Lead-in priority (D-14): `leadInDigit=2` wins over frame
8. Unknown-variant fallback: `'unknown' as VisualVariantId` → `data-variant="orb"`

### Task 2: VariantPicker Full Radiogroup

`src/components/VariantPicker.tsx` replaced wholesale (Phase 15 stub — 26 LOC read-only label → 71 LOC full radiogroup):

- **ThemePicker-mirror structure**: verbatim `baseClasses / selectedClasses / unselectedClasses` with ` flex flex-col items-center gap-1` appended to baseClasses for swatch+label stacking
- **3 buttons** over `VARIANT_OPTIONS` with `role="radio"`, `aria-checked`, `disabled`, `onClick→setVariant`
- **Inline shape swatches** per UI-SPEC:
  - Orb: `<span className="orb-layer--in" style={{ borderRadius: '50%' }} />`
  - Square: `<span className="orb-layer--in" style={{ borderRadius: '18%' }} />`
  - Ring: `<svg viewBox="0 0 24 24"><circle ... stroke="var(--color-orb-in-from)" /></svg>` (Pitfall 8 mitigation)
- **44×44 hit area** via `min-h-12`; **focus-visible ring** via `focus-visible:ring-breathing-accent`; **disabled gating** via native `disabled`
- **`useVariantChoice()` write path** — same-tab optimistic-UI + `hrv:prefs-changed` CustomEvent dispatch
- **D-23 zero hardcoded colors**: all colors via `var(--color-*)` tokens or token-bound Tailwind utilities
- **`id="variant-picker-label"`** section header + `aria-labelledby` on radiogroup

`src/components/VariantPicker.test.tsx` replaced wholesale with 10-case coverage (Phase 15 3 stub tests removed):
1. `aria-checked` reflects seeded variant
2. Section header `id="variant-picker-label"` renders "Variant"
3. `aria-disabled` + `disabled` attribute threading
4. Click → `savePrefs` round-trip (localStorage write)
5. Click → `hrv:prefs-changed` CustomEvent dispatch
6. Disabled click → no disk write + no CustomEvent
7. Selection preserved (aria-checked) when disabled
8. `min-h-12` + `px-3` hit area class presence
9. `focus-visible:ring-2 focus-visible:ring-breathing-accent focus-visible:ring-offset-2` class presence
10. Swatch primitives per variant (Orb `borderRadius:50%`, Square `borderRadius:18%`, Ring `<svg><circle>`)

### Deviation: SettingsDialog.test.tsx Updated (Rule 1 — Bug)

`src/components/SettingsDialog.test.tsx` was updated because the existing test used `getByRole('radiogroup')` (which finds exactly ONE) and asserted `'Variant: orb'` stub text. After VariantPicker became a real radiogroup:

- `getByRole('radiogroup')` throws "Found multiple elements" — fixed to `getAllByRole('radiogroup')` with iteration
- `expect(screen.getByText('Variant: orb'))` → `expect(screen.getByText('Variant'))` (section header)

This is a forward-spec update consistent with the plan's `must_haves` ("Plan 05 does NOT touch SettingsDialog.tsx" — the fix is in the test, not the component).

## Handoff to Plan 06

`App.tsx` is UNCHANGED in this plan. The OPTIONAL `variant?` prop with default `'orb'` ensures App.tsx's existing `<BreathingShape frame=... leadInDigit=... />` call site continues to compile and render orb behavior unchanged (VARIANT-02 zero-regression).

Plan 06 owns:
1. `useVisualVariant()` hook invocation near `useTheme()`
2. `sessionVariantRef = useRef<VisualVariantId | null>(null)` declaration
3. Snapshot at `startSession` + clear on session end
4. `variant={sessionVariantRef.current ?? liveVariant}` prop pass to BreathingShape

## Verification

- `tsc && lint && build && test` exits 0 at every commit boundary
- 46 test files, 582 tests pass at final commit
- `src/styles/theme.contrast.test.ts` — green (no token edits)
- `src/styles/theme.no-hardcoded-classes.test.ts` — green (D-23 honored — zero hardcoded color classes)
- `src/app/App.tsx` unchanged (grep confirms no `variant=` prop addition)
- `SettingsDialog.tsx` unchanged (D-20 honored)
- `src/domain/settings.ts` + `src/storage/prefs.ts` unchanged (D-19 honored)

## Commits

| Hash | Type | Description |
|------|------|-------------|
| `bf43a0d` | test | RED: failing dispatcher tests for BreathingShape |
| `a8e50b7` | feat | GREEN: BreathingShape 3-way dispatcher with optional variant prop |
| `0cfa0ab` | test | RED: replaced VariantPicker stub tests with 10-case contract coverage |
| `04f15f5` | feat | GREEN: VariantPicker full radiogroup + inline shape swatches + SettingsDialog.test fix |

## Known Stubs

None — all file deliverables are fully implemented. TimbrePicker + LanguagePicker remain as Phase 15 stubs (Phases 18/19 scope; SettingsDialog.test.tsx correctly asserts their stub text formats).

## Self-Check: PASSED
