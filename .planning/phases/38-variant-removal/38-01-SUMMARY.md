---
phase: 38-variant-removal
plan: "01"
subsystem: components/render
tags: [deletion, variant-removal, orb-only, nkshape-collapse, breathingshape-collapse]
dependency_graph:
  requires: []
  provides:
    - "OrbShape as sole direct render target in App.tsx (3 former BreathingShape call sites)"
    - "NKShape collapsed to always-OrbShape (no dispatcher, no variant prop)"
    - "VariantPicker removed from SettingsDialog render"
  affects:
    - "src/app/App.tsx (3 JSX call sites, 2 imports, 1 shim)"
    - "src/components/NKShape.tsx (5-symbol strip: VisualVariantId import, SquareShape/DiamondShape imports, variant prop, variant destructure, dispatcher)"
    - "src/components/NKShape.test.tsx (variant-axis test cases deleted)"
    - "src/components/SettingsDialog.tsx (VariantPicker import + render removed)"
    - "src/components/SettingsDialog.test.tsx (4-picker assertions updated)"
    - "src/components/shapeConstants.ts (docstring updated)"
tech_stack:
  added: []
  patterns:
    - "D-09 delete-with-component policy (Phase 37 precedent): git rm component + test in same commit"
    - "D-03 BreathingShape call-site collapse: direct OrbShape render replaces dispatcher"
    - "Tiger Style single combined commit for tightly-coupled deletions"
key_files:
  created: []
  modified:
    - src/app/App.tsx
    - src/components/NKShape.tsx
    - src/components/NKShape.test.tsx
    - src/components/SettingsDialog.tsx
    - src/components/SettingsDialog.test.tsx
    - src/components/shapeConstants.ts
  deleted:
    - src/components/BreathingShape.tsx
    - src/components/BreathingShape.test.tsx
    - src/components/DiamondShape.tsx
    - src/components/DiamondShape.test.tsx
    - src/components/SquareShape.tsx
    - src/components/SquareShape.test.tsx
    - src/components/VariantPicker.tsx
    - src/components/VariantPicker.test.tsx
    - src/hooks/useVisualVariant.ts
    - src/hooks/useVisualVariant.test.ts
    - src/hooks/useVariantChoice.ts
    - src/hooks/useVariantChoice.test.ts
decisions:
  - "Tasks 1 + 2 shipped in one commit (tsc boundary requirement — BreathingShape + useVisualVariant imports must vanish in same commit as deleted modules)"
  - "liveVariant shimmed as VisualVariantId|null=null const (not deleted); Plan 03 deletes the shim + sessionVariantRef + setSessionVariant + all capture/clear sites in one coherent sweep"
  - "SettingsDialog.test.tsx updated in this plan (Rule 1 auto-fix — 2 tests asserted on VariantPicker presence, both now broken by the deletion)"
  - "'variants' token in SettingsDialog L29 Pick union deferred to Plan 02 (UiStrings.variants block deletion lands with strings.ts cleanup)"
metrics:
  duration: "7m 50s"
  completed: "2026-05-21"
  tasks_completed: 2
  files_deleted: 12
  files_modified: 6
---

# Phase 38 Plan 01: Delete shape variant components + hooks; collapse BreathingShape call sites to OrbShape Summary

**One-liner:** Delete 12 variant-axis files (SquareShape, DiamondShape, VariantPicker, BreathingShape + hook pairs + their tests) and collapse 3 App.tsx BreathingShape call sites + NKShape dispatcher to direct OrbShape renders.

## Files Deleted (12 files, ~1932 lines removed)

| File | Lines Removed |
|------|--------------|
| src/components/BreathingShape.tsx | ~73 |
| src/components/BreathingShape.test.tsx | ~72 |
| src/components/DiamondShape.tsx | ~120 |
| src/components/DiamondShape.test.tsx | ~80 |
| src/components/SquareShape.tsx | ~110 |
| src/components/SquareShape.test.tsx | ~80 |
| src/components/VariantPicker.tsx | ~130 |
| src/components/VariantPicker.test.tsx | ~80 |
| src/hooks/useVisualVariant.ts | ~40 |
| src/hooks/useVisualVariant.test.ts | ~40 |
| src/hooks/useVariantChoice.ts | ~35 |
| src/hooks/useVariantChoice.test.ts | ~35 |

All 12 deleted via `git rm` in a single coordinated commit per D-09 delete-with-component policy (Phase 37 precedent). The commit simultaneously made all dependent edits below to keep `tsc --noEmit` green at the commit boundary.

## App.tsx Surgical Edit (D-03 call-site collapse)

**Imports removed:**
- L3: `import { BreathingShape } from '../components/BreathingShape'`
- L35: `import { useVisualVariant } from '../hooks/useVisualVariant'`

**Import added:**
- `import { OrbShape } from '../components/OrbShape'`

**Hook call replaced (L224):**
```typescript
// Before:
const { variant: liveVariant } = useVisualVariant()

// After (Plan 01 shim — Plan 03 deletes this + sessionVariantRef + setSessionVariant):
const liveVariant: VisualVariantId | null = null // Phase 38 Plan 01 shim: hook deleted; Plan 03 will delete this line + sessionVariantRef + setSessionVariant + the L487/491-492/670-671/819/869-870/938 capture/clear sites in one coherent sweep.
```

**3 JSX call sites collapsed:**
1. nkStarting branch: `<BreathingShape variant={sessionVariant ?? liveVariant} ... />` → `<OrbShape cue={sessionCue ?? liveCue} frame={null} leadInDigit={nkLeadInDigit} strings={...} />`
2. NKShape branch: `variant={sessionVariant ?? liveVariant}` prop dropped from `<NKShape>` (NKShapeProps no longer accepts it)
3. HRV/Stretch branch: `<BreathingShape variant={sessionVariant ?? liveVariant} ... />` → `<OrbShape cue={sessionCue ?? liveCue} frame={...} leadInDigit={...} strings={...} />`

**Comment audit:** The Phase 17 D-09 WHY comment about `sessionVariant/liveVariant` was deleted from the JSX block. Comments in the `sessionVariantRef` declaration area (L286-296) retain "BreathingShape" in their prose — these are Plan 03's WHY-comment audit scope (the ref+state declarations they document are also Plan 03's deletion scope).

## NKShape.tsx Collapse (5-symbol strip)

1. **Deleted import:** `import type { VisualVariantId } from '../domain/settings'`
2. **Deleted imports:** `import { SquareShape } from './SquareShape'` + `import { DiamondShape } from './DiamondShape'`
3. **Deleted prop:** `variant: VisualVariantId` from `NKShapeProps`
4. **Deleted destructure:** `variant,` from function params
5. **Replaced dispatcher:** `variant === 'orb' ? <OrbShape/> : variant === 'square' ? <SquareShape/> : <DiamondShape/>` → single `<OrbShape frame={null} nkPhase={phase} strings={strings} />`
6. **Fixed:** `data-variant={variant}` → `data-variant="orb"` (fixed literal; CSS theme targeting preserved)
7. **Updated:** D-01 + ARCHITECTURE comments to reflect OrbShape-only render path

## NKShape.test.tsx Strip

- Removed `variant: 'orb'` from `defaults: NKShapeProps` (prop no longer exists on type)
- Renamed `'D-01: variant="orb" produces data-variant="orb"'` → `'NK wrapper carries data-variant="orb" (single-shape collapse — Phase 38 VAR-01/02)'`; test body uses `renderShape()` without variant override; assertion passes because `data-variant="orb"` is now a fixed literal in NKShape
- Deleted `it('D-01: variant="square" produces data-variant="square"', ...)` wholesale
- Deleted `it('D-01: variant="diamond" produces data-variant="diamond"', ...)` wholesale
- All other tests (count, phase, reduced-motion, aria-label) survive untouched

## SettingsDialog.tsx Strip

- Removed `import { VariantPicker } from './VariantPicker'`
- Removed `<VariantPicker disabled={inSessionView} strings={strings.variants} sectionLabel={strings.settings.variantLabel} />` JSX
- Updated D-10 comment: "Theme → Variant → Cue → Timbre → Language order" → "Theme → Cue → Timbre → Language order"
- Updated D-10 file-header comment to note Phase 38 Variant slot removal
- **Deferred to Plan 02:** `'variants'` token in the `Pick<UiStrings, ...>` union at L29 (removing it now would require simultaneous UiStrings.variants type deletion which is Plan 02's scope)

## SettingsDialog.test.tsx Update (Rule 1 Auto-fix)

Two tests broke because they asserted VariantPicker presence and a 5-radiogroup count. Fixed inline:
- `describe` title updated: "5 pickers" → "4 pickers, Phase 38: Variant removed"
- `expect(screen.getByText('Variant'))` → `expect(screen.queryByText('Variant')).not.toBeInTheDocument()`
- Radiogroup count: `expect(radiogroups).toHaveLength(5)` → `expect(radiogroups).toHaveLength(4)`
- CuePicker index: `radiogroups[2]` → `radiogroups[1]` (Variant slot removed, Cue is now index 1)

## shapeConstants.ts Comment Update

Docstring updated from "Shared scale constants for Phase 17 visual variants (OrbShape / SquareShape / DiamondShape)" to "Shared scale constants for OrbShape breathing math" with a Phase 38 note. Constants (MIN_SCALE / MAX_SCALE / MID_SCALE) unchanged — OrbShape still consumes them.

## Verification Results

- `pnpm tsc --noEmit`: exit 0 (no type errors)
- `pnpm test src/components src/hooks --run`: 440/440 tests pass (36 test files)

## Decisions Made

1. **Single combined commit** (Tasks 1 + 2): tsc boundary requirement forces the file deletions and import/call-site edits to land together. Intermediate state (deleted files + surviving imports) would fail `tsc --noEmit`.

2. **liveVariant shim** (not deleted): `const liveVariant: VisualVariantId | null = null` replaces the `useVisualVariant()` hook call. Keeps tsc green because `sessionVariantRef.current = liveVariant` assigns `null` (valid for `useRef<VisualVariantId | null>(null)`). Plan 03 deletes the shim, the ref, the state, and all capture/clear sites in one coherent sweep.

3. **SettingsDialog test fix** (Rule 1 auto-fix): Tests asserted "Variant" text present and 5 radiogroups — both expectations broken by the deletion. Fixed inline to assert absence and 4-group count.

4. **'variants' token deferred to Plan 02**: The `Pick<UiStrings, 'settings' | 'themes' | 'variants' | ...>` union token in SettingsDialog.tsx L29 stays until Plan 02 removes the UiStrings.variants type block simultaneously.

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 1 - Bug] SettingsDialog.test.tsx variant-axis test failures**
- **Found during:** Task 1 verification (pnpm test src/components)
- **Issue:** 2 tests in SettingsDialog.test.tsx asserted VariantPicker presence ("Variant" text, 5 radiogroups, CuePicker at index 2) — all broken by VariantPicker deletion
- **Fix:** Updated both tests to assert VariantPicker absence, 4-radiogroup count, and CuePicker at index 1
- **Files modified:** src/components/SettingsDialog.test.tsx
- **Commit:** 8e81224 (same combined commit as the plan work)

## Forward Pointers

- **Plan 02:** Data-layer + i18n cleanup — `src/domain/settings.ts` (VisualVariantId / VARIANT_OPTIONS / isValidVariant / DEFAULT_VARIANT block) + `src/storage/prefs.ts` (variant field + coerceVariant) + `src/content/strings.ts` (UiStrings.variants block + EN + PT-BR catalogs + settings.variantLabel) + SettingsDialog.tsx L29 Pick union `'variants'` token + prefs.test.ts strip + SettingsDialog.test.tsx strings fixture cleanup
- **Plan 03:** App.tsx state strip — the L224 shim + L292-293 `sessionVariantRef` / `sessionVariant` declarations + L487/491-492/670-671/819/869-870/938 capture/clear sites + L557/L927 dep array entries + the `VisualVariantId` type import at L65; also CSS theme.css L391-474 variant block deletion; App test file surgical strips (App.session.test.tsx etc.)
- **Plan 04:** VAR-06 drift-guard test (`src/content/content.no-variants.test.ts`) — fs-scan that fails CI if forbidden variant symbols re-enter src/components, src/app, src/content, or src/styles

## Threat Surface Scan

No new network endpoints, auth paths, file access patterns, or schema changes introduced. This is a pure deletion+collapse plan.

## Known Stubs

None — all OrbShape renders receive live data (`cue={sessionCue ?? liveCue}`, `frame={...}`, etc.). The `liveVariant = null` shim is a documented placeholder (Plan 03 scope), not a stub that prevents the plan's goal from being achieved.

## Self-Check: PASSED

- `src/components/SquareShape.tsx`: MISSING (intentional deletion)
- `src/components/DiamondShape.tsx`: MISSING (intentional deletion)
- `src/components/VariantPicker.tsx`: MISSING (intentional deletion)
- `src/components/BreathingShape.tsx`: MISSING (intentional deletion)
- `src/hooks/useVisualVariant.ts`: MISSING (intentional deletion)
- `src/hooks/useVariantChoice.ts`: MISSING (intentional deletion)
- Commit 8e81224: FOUND
- tsc --noEmit: exit 0
- pnpm test src/components src/hooks: 440/440 pass
