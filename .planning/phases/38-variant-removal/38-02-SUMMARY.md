---
phase: 38-variant-removal
plan: "02"
subsystem: domain, storage, i18n, components, tests
tags:
  - variant-removal
  - type-deletion
  - i18n-cleanup
  - VAR-03
  - VAR-05
  - D-01
  - D-08
dependency_graph:
  requires:
    - 38-01-SUMMARY (VariantPicker render removal, BreathingShape deletion, useVisualVariant deletion)
  provides:
    - UserPrefs with 4 fields (theme, timbre, cue, locale) — variant axis gone from data layer
    - UiStrings without variants block or settings.variantLabel — variant axis gone from i18n layer
    - SettingsDialog Pick union without 'variants' — type-level prop surface clean
    - App.tsx with no VisualVariantId identifier anywhere — shim retyped to null (Plan 03 deletes it)
  affects:
    - Plan 03 (App.tsx state strip — liveVariant shim, sessionVariantRef, sessionVariant, capture/clear sites)
    - Plan 04 (VAR-06 drift-guard to prevent variant re-entry)
tech_stack:
  added: []
  patterns:
    - "Tiger Style atomic commits: domain+storage+tests in commit 1, i18n+SettingsDialog+strings-test in commit 2, Rule 3 auto-fixes as separate commits"
    - "Phase 8 D-01 envelope tolerance: persisted prefs.variant survives on disk; coercePrefs ignores unknown key on read"
    - "Type-first deletion order: delete type → run tsc → delete catalog entries (Phase 37 LEARNINGS pattern)"
key_files:
  created: []
  modified:
    - src/domain/settings.ts
    - src/storage/prefs.ts
    - src/storage/prefs.test.ts
    - src/content/strings.ts
    - src/content/strings.test.ts
    - src/components/SettingsDialog.tsx
    - src/app/App.tsx
    - src/app/App.session.test.tsx
    - src/domain/settings.test.ts
    - src/hooks/useTimbreChoice.test.ts
    - src/hooks/useThemeChoice.test.ts
    - src/hooks/useCueChoice.test.ts
    - src/hooks/useLocaleChoice.test.ts
decisions:
  - "App.session.test.tsx VARIANT-03 + VARIANT-02 + seedVariant block deleted in Task 1 commit boundary (same commit as VisualVariantId type removal to avoid broken intermediate state per T-38-09)"
  - "App.tsx liveVariant shim retyped from VisualVariantId | null to null; sessionVariantRef + sessionVariant retyped from <VisualVariantId | null> to <null> (BLOCKER fix — Plan 03 still owns full deletion)"
  - "settings.test.ts isValidVariant describe block deleted (Rule 3 auto-fix — function deleted from settings.ts)"
  - "4 choice-hook test files (useTimbreChoice/useThemeChoice/useCueChoice/useLocaleChoice) fixture objects stripped of variant field (Rule 3 auto-fix — UserPrefs no longer has variant)"
  - "VAR-05 wording fix (REQUIREMENTS.md coerceSettings → coerceVariant) explicitly deferred per CONTEXT §deferred"
metrics:
  duration: "8 minutes"
  completed_date: "2026-05-21"
  tasks: 2
  files_modified: 13
requirements_completed:
  - VAR-03
  - VAR-05
---

# Phase 38 Plan 02: Variant Data Layer + i18n Strip Summary

Strip the variant axis from the data layer and i18n surface in one coordinated cut. UserPrefs shrunk from 5 to 4 fields; VisualVariantId and all siblings deleted from domain/settings; UiStrings.variants block and settings.variantLabel deleted from type + EN + PT-BR catalogs; SettingsDialog Pick union drops 'variants'; App.tsx VisualVariantId identifier gone (shim retyped to null).

## What Was Built

### Task 1 Commit (83bd3cb): Domain + Storage + Storage Tests + App.session + App.tsx

**`src/domain/settings.ts`** — Deleted the 9-line VisualVariantId block (L117-125):
- `export type VisualVariantId = 'orb' | 'square' | 'diamond'`
- `export const VARIANT_OPTIONS = [...]`
- `export function isValidVariant(v: unknown): v is VisualVariantId`
- `export const DEFAULT_VARIANT: VisualVariantId = 'orb'`

**`src/storage/prefs.ts`** — 7-symbol strip (D-01):
- Removed 3 named imports: `DEFAULT_VARIANT`, `isValidVariant`, `type VisualVariantId`
- Deleted `variant: VisualVariantId` from `UserPrefs` interface (now 4 fields)
- Deleted `variant: DEFAULT_VARIANT` from `DEFAULT_PREFS`
- Deleted standalone `coerceVariant` export (3-line function)
- Deleted `variant: coerceVariant(r.variant)` from `coercePrefs` return object
- Updated WHY-comment from "five known keys" to "four known keys"
- Updated AUDIO-02 comment in `coerceTimbre` to remove coerceVariant reference

**`src/storage/prefs.test.ts`** — Surgical strip (D-10):
- Deleted 3 imports: `coerceVariant`, `DEFAULT_VARIANT`, `VARIANT_OPTIONS`
- Dropped `variant` field from all `UserPrefs`/`coercePrefs` fixture objects
- Updated 5 it() titles to drop "variant" from the preserved-fields list
- Deleted 1 it() "falls back PER FIELD when variant is invalid" (no variant field to test)
- Deleted 2 it() coerceVariant-axis tests ("coerceVariant accepts all VARIANT_OPTIONS..." and "coerceVariant('ring') → DEFAULT_VARIANT...")
- Updated describe title: "coerceVariant" removed
- Updated AUDIO-02 comment to remove coerceVariant reference
- Updated JSON proto-pollution fixture string to drop `"variant":"orb"`

**`src/app/App.session.test.tsx`** — Type import strip + VARIANT-03 block deletion (T-38-09):
- L9: dropped `VisualVariantId` from named import
- Deleted entire VARIANT-03 describe block (L342-459 pre-edit): `seedVariant` helper, 5 it() cases including VARIANT-02 zero-regression test, `beforeEach`/`afterEach` hooks
- Updated TIMBRE-03 comment to remove reference to now-deleted VARIANT-03 block

**`src/app/App.tsx`** — BLOCKER fixes (L64, L223, L291-292):
- L64: stripped `VisualVariantId` from `import type { ... } from '../domain/settings'`
- L223: retyped `const liveVariant: VisualVariantId | null = null` → `const liveVariant: null = null`
- L291: retyped `const sessionVariantRef = useRef<VisualVariantId | null>(null)` → `useRef<null>(null)`
- L292: retyped `const [sessionVariant, setSessionVariant] = useState<VisualVariantId | null>(null)` → `useState<null>(null)`

### Task 2 Commit (85b2ef1): i18n + SettingsDialog + strings.test (VAR-03; D-08)

**`src/components/SettingsDialog.tsx`** — Pick union token strip:
- L28: `Pick<UiStrings, 'settings' | 'themes' | 'variants' | 'cue' | 'timbres' | 'install'>` → `Pick<UiStrings, 'settings' | 'themes' | 'cue' | 'timbres' | 'install'>`

**`src/content/strings.ts`** — Type block + EN catalog + PT-BR catalog (D-08 clean cut):
- Deleted `readonly variantLabel: string` from `UiStrings.settings` interface
- Deleted 5-line `readonly variants: { orb, square, diamond }` block from `UiStrings`
- Deleted EN: `variantLabel: 'Variant'` + `variants: { orb: 'Orb', square: 'Square', diamond: 'Diamond' }`
- Deleted PT-BR: `variantLabel: 'Variante'` + `variants: { orb: 'Esfera', square: 'Quadrado', diamond: 'Losango' }`

**`src/content/strings.test.ts`** — Variant-exhaustiveness strip:
- Deleted `VARIANT_OPTIONS` from imports
- Updated settings-label it() title: dropped "settings.variantLabel" from the comma list; deleted `variantLabel.length` assertion
- Deleted entire `'every locale has variants entries for every VARIANT_OPTIONS id'` it() block

### Rule 3 Auto-Fix Commits

**Commit f5b4f57 — `src/domain/settings.test.ts`:**
- `isValidVariant` imported from `./settings` but the function was deleted in Task 1
- Deleted the named import and the entire `isValidVariant (INFRA-02 D-01)` describe block (3 it() cases)

**Commit 0a92cce — 4 choice-hook test files:**
- `useTimbreChoice.test.ts`, `useThemeChoice.test.ts`, `useCueChoice.test.ts`, `useLocaleChoice.test.ts`
- Each had `DEFAULT_FULL_PREFS: UserPrefs = { ..., variant: 'orb', ... }` (TypeScript error after UserPrefs shrunk)
- Each had `seedPrefs({ ..., variant: 'square', ... })` in the envelope-merge-contract it()
- Each had `expect(raw.prefs.variant).toBe('square')` assertion (undefined after field deletion)
- Removed `variant` from all fixture objects and expectations; remaining 3-4 field assertions still verify the envelope-merge contract

## Phase 8 D-01 Envelope Tolerance (VAR-05)

A returning user with persisted `{prefs: {variant: 'square'|'diamond'|'orb', ...}}` in localStorage is handled as follows:
1. `loadPrefs()` calls `coercePrefs(readEnvelope().prefs)`
2. `coercePrefs` reads only `r.theme`, `r.timbre`, `r.cue`, `r.locale` — `r.variant` is never read
3. The unknown `variant` key is harmlessly preserved on disk (Phase 8 D-01 spread-then-override pattern)
4. The render path is always OrbShape (Plan 01 removed BreathingShape and VariantPicker)
5. No STATE_VERSION bump needed — field deletion satisfies forward-compat; no behavioral regression

VAR-05 is closed implicitly: the variant field disappears from UserPrefs; persisted data is tolerated; the only render shape is OrbShape.

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 3 - Blocking] settings.test.ts imported deleted isValidVariant**
- **Found during:** Final full suite run after Task 2 commit
- **Issue:** `src/domain/settings.test.ts` imported `isValidVariant` (line 9) which was deleted from `settings.ts` in Task 1; caused 3 test failures at runtime (`isValidVariant is not a function`)
- **Fix:** Deleted named import + the entire `isValidVariant (INFRA-02 D-01)` describe block (3 it() cases)
- **Files modified:** `src/domain/settings.test.ts`
- **Commit:** f5b4f57

**2. [Rule 3 - Blocking] Choice-hook test fixture objects used variant field after UserPrefs shrunk**
- **Found during:** Final full suite run after Rule 3 fix #1
- **Issue:** `useTimbreChoice.test.ts`, `useThemeChoice.test.ts`, `useCueChoice.test.ts`, `useLocaleChoice.test.ts` each had `DEFAULT_FULL_PREFS: UserPrefs` with `variant: 'orb'` and seedPrefs calls with `variant: 'square'`; TypeScript rejected them after UserPrefs became 4-field; assertions on `raw.prefs.variant` returned `undefined` at runtime
- **Fix:** Stripped `variant` from all fixture objects and `expect(raw.prefs.variant)` assertions in all 4 files; remaining assertions still verify the envelope-merge contract
- **Files modified:** `src/hooks/useTimbreChoice.test.ts`, `src/hooks/useThemeChoice.test.ts`, `src/hooks/useCueChoice.test.ts`, `src/hooks/useLocaleChoice.test.ts`
- **Commit:** 0a92cce

## Commits

| # | Hash | Message |
|---|------|---------|
| 1 | 83bd3cb | chore(38): delete VisualVariantId / VARIANT_OPTIONS / coerceVariant + prefs.variant field; strip variant cases from prefs.test + App.session.test (VAR-05; D-01) |
| 2 | 85b2ef1 | chore(38): strip variant i18n surface (UiStrings.variants + variantLabel; EN + PT-BR catalogs; SettingsDialog Pick union; strings.test variant-exhaustiveness) (VAR-03; D-08) |
| 3 | f5b4f57 | fix(38): strip isValidVariant import and describe block from settings.test.ts (Rule 3 auto-fix) |
| 4 | 0a92cce | fix(38): strip prefs.variant from choice-hook fixture objects (Rule 3 auto-fix) |

## Verification Results

- `npx tsc --noEmit` exits 0
- `npx vitest run` — 1093/1093 passing (full suite)
- `git grep -E "VisualVariantId|VARIANT_OPTIONS|isValidVariant|DEFAULT_VARIANT|coerceVariant" src/` — 0 results
- `git grep -E "variantLabel|variants:\s*\{" src/` — 0 results
- `git grep "'variants'" src/components/SettingsDialog.tsx` — 0 results
- UserPrefs has exactly 4 fields: theme, timbre, cue, locale

## Forward Pointers

**Plan 03** — App.tsx state strip:
- Delete `const liveVariant: null = null` shim entirely (L223)
- Delete `sessionVariantRef = useRef<null>(null)` (L291) + `sessionVariant`/`setSessionVariant` state (L292)
- Delete all capture/clear sites (L487/491-492/670-671/819/869-870/938)
- Delete dep array entries (L557/L927)
- Delete `theme.css` CSS block for variant-axis tokens
- Cross-cutting App.test.tsx + App.locale.test.tsx variant fixture strips
- Remaining App.session.test.tsx residue (seedVariant helper is gone from Plan 02; Plan 03 owns remaining cross-cutting references)

**Plan 04** — VAR-06 drift-guard to prevent future variant re-introduction

**Deferred (REQUIREMENTS.md tidy)** — VAR-05 wording fix: REQUIREMENTS.md says `coerceSettings` but the actual coercer was `coerceVariant` inside `coercePrefs`. Field-deletion path satisfies the VAR-05 intent ("forward-compat, no STATE_VERSION bump"); REQUIREMENTS.md tidy deferred per CONTEXT §deferred.

## Known Stubs

None — no stub patterns found in modified files. The liveVariant shim (`const liveVariant: null = null`) in App.tsx is an intentional Plan 02 intermediate state, not a UI stub. Plan 03 deletes it.

## Self-Check: PASSED

- SUMMARY.md exists at `.planning/phases/38-variant-removal/38-02-SUMMARY.md` ✓
- Commit 83bd3cb (Task 1) exists in git log ✓
- Commit 85b2ef1 (Task 2) exists in git log ✓
- Commit f5b4f57 (Rule 3 fix — settings.test.ts) exists in git log ✓
- Commit 0a92cce (Rule 3 fix — choice-hook tests) exists in git log ✓
- `npx tsc --noEmit` exits 0 ✓
- `npx vitest run` 1093/1093 passing ✓
- Zero variant symbols in src/ codebase ✓
