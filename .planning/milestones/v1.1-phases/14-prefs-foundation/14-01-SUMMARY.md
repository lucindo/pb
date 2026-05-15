---
phase: 14-prefs-foundation
plan: "01"
subsystem: domain+storage
tags: [prefs, domain, storage, typescript, vitest, enums]
dependency_graph:
  requires: []
  provides:
    - src/domain/settings.ts (ThemeId, TimbreId, VisualVariantId, LocaleId, THEME_OPTIONS, TIMBRE_OPTIONS, VARIANT_OPTIONS, LOCALE_OPTIONS, isValidTheme, isValidTimbre, isValidVariant, isValidLocale, DEFAULT_THEME, DEFAULT_TIMBRE, DEFAULT_VARIANT, DEFAULT_LOCALE)
    - src/storage/prefs.ts (UserPrefs, DEFAULT_PREFS, coerceTheme, coerceTimbre, coerceVariant, coerceLocale, coercePrefs, loadPrefs, savePrefs)
  affects:
    - src/storage/storage.ts (Envelope interface widened with prefs?: unknown)
    - src/storage/index.ts (barrel re-exports prefs API)
tech_stack:
  added: []
  patterns:
    - as-const-satisfies-readonly-T[]-OPTIONS-array
    - per-field-coerce-and-fallback (Phase 4 D-15/D-17 carry-forward)
    - envelope-merge (Phase 8 D-01 carry-forward)
    - prototype-pollution mitigation (T-14-01/D-12)
key_files:
  created:
    - src/storage/prefs.ts
    - src/storage/prefs.test.ts
  modified:
    - src/domain/settings.ts
    - src/domain/settings.test.ts
    - src/storage/storage.ts
    - src/storage/index.ts
    - .planning/REQUIREMENTS.md
decisions:
  - "ThemeId locked as 'light'|'dark'|'system'|'moss'|'slate'|'dusk' (D-01)"
  - "DEFAULT_THEME='system' (D-03) — OS prefers-color-scheme awareness without opening dialog"
  - "DEFAULT_TIMBRE='bowl' (D-04) — zero regression for users who never open SettingsDialog"
  - "DEFAULT_VARIANT='orb' (D-05) — zero regression for users who never open SettingsDialog"
  - "LocaleId='pt-BR' BCP-47 hyphen form (D-08); pt_BR underscore rejected"
  - "Envelope.prefs typed as unknown (D-11) — avoids storage→domain typed circular import"
  - "Three atomic commits: domain layer → storage layer → docs traceability (D-13)"
metrics:
  duration: "~10 minutes"
  completed: "2026-05-12"
---

# Phase 14 Plan 01: Prefs Foundation Summary

**One-liner:** Four v1.1 enum surfaces (ThemeId/TimbreId/VisualVariantId/LocaleId) landed in domain + storage with per-field coerce-and-fallback, prototype-pollution mitigation, and full Vitest coverage.

## Commits

| # | SHA | Message |
|---|-----|---------|
| 1 | b4563aa | feat(14): extend domain/settings with prefs enum surfaces |
| 2 | b156d03 | feat(14): add prefs storage layer (UserPrefs, coercePrefs, loadPrefs/savePrefs) |
| 3 | 784c215 | docs(14): mark INFRA-01/02/03 done in REQUIREMENTS traceability |

## Files Modified

| File | Action | Description |
|------|--------|-------------|
| src/domain/settings.ts | modified | Added 4 type unions, 4 OPTIONS arrays, 4 isValid* predicates, 4 DEFAULT_* constants |
| src/domain/settings.test.ts | modified | Added 4 × 3-block predicate test coverage (12 it() blocks) |
| src/storage/storage.ts | modified | Added prefs?: unknown to Envelope interface (D-11) |
| src/storage/prefs.ts | created | UserPrefs, DEFAULT_PREFS, coerceTheme/Timbre/Variant/Locale, coercePrefs, loadPrefs, savePrefs |
| src/storage/prefs.test.ts | created | coercePrefs block (8 it()s), per-field coercer block (4 it()s), load/save round-trip block (5 it()s) |
| src/storage/index.ts | modified | Added export * from './prefs' barrel re-export |
| .planning/REQUIREMENTS.md | modified | INFRA-01/02/03 flipped to Done; last-updated stamp updated |

**Total: 4 source files + 2 test files = 6 files modified/created**

## New Test Cases

- **src/domain/settings.test.ts:** 12 new it() blocks
  - isValidTheme: accept valid / reject malformed strings / reject wrong type
  - isValidTimbre: accept valid / reject malformed strings / reject wrong type
  - isValidVariant: accept valid / reject malformed strings / reject wrong type
  - isValidLocale: accept valid / reject malformed strings (incl. pt_BR underscore) / reject wrong type

- **src/storage/prefs.test.ts:** 17 new it() blocks
  - coercePrefs block: null/undefined/non-object/array/empty → DEFAULT_PREFS; valid verbatim; 4 per-field fallback; prototype-pollution mitigation
  - Per-field coercer block: 4 it()s (one per dim, smoke loop over OPTIONS + invalid + wrong-type)
  - loadPrefs/savePrefs round-trip: DEFAULT on empty; round-trip valid; envelope merge (settings+mute+stats survive); setItem-throws no-throw; corrupt JSON returns DEFAULT_PREFS

**Total new tests: 29 it() blocks (830 baseline → 847 passing)**

## Per-Commit Green-Gate Records

| Commit | tsc | lint | build | test | Count |
|--------|-----|------|-------|------|-------|
| b4563aa (domain layer) | exit 0 | exit 0 | exit 0 | exit 0 | 830 |
| b156d03 (storage layer) | exit 0 | exit 0 | exit 0 | exit 0 | 847 |
| 784c215 (docs) | exit 0 | exit 0 | exit 0 | exit 0 | 847 |

## REQUIREMENTS.md Traceability Deltas

| Requirement | Before | After |
|-------------|--------|-------|
| INFRA-01 | [ ] Pending | [x] Done |
| INFRA-02 | [ ] Pending | [x] Done |
| INFRA-03 | [ ] Pending | [x] Done |
| INFRA-04 | [ ] Pending | [ ] Pending (Phase 15 scope — untouched) |

## Carry-Forward Note

Phase 15 (SettingsDialog Shell) consumes this API via:
```typescript
import { loadPrefs, savePrefs, UserPrefs, DEFAULT_PREFS } from '../storage'
```
No further edits to predicates or OPTIONS arrays required in Phase 15+. Domain predicates are FINAL per D-01.

## Phase 19 Reconciliation Flag

`LocaleId = 'pt-BR'` (BCP-47 hyphen) is locked here. REQ I18N-05 example uses `pt_BR` (underscore). Phase 19 plan MUST reconcile — either rename map keys to `'pt-BR'` (preferred) or document the runtime-id-to-map-key translation explicitly. See 14-CONTEXT.md D-08 and `<deferred>`.

## Deviations from Plan

None — plan executed exactly as written. The unused eslint-disable directive in the initial prefs.ts draft was cleaned before commit (the `as Record<string, unknown>` cast did not trigger `@typescript-eslint/no-unsafe-assignment` in this codebase configuration). This is a minor pre-commit self-correction, not a plan deviation.

## Self-Check: PASSED

- [x] src/domain/settings.ts exists and contains all 4 enum surfaces
- [x] src/domain/settings.test.ts extended with 12 new predicate tests
- [x] src/storage/storage.ts Envelope has prefs?: unknown
- [x] src/storage/prefs.ts exists (76 lines, all required exports present)
- [x] src/storage/prefs.test.ts exists (17 new test cases)
- [x] src/storage/index.ts has export * from './prefs'
- [x] .planning/REQUIREMENTS.md INFRA-01/02/03 marked Done
- [x] Commit b4563aa exists (domain layer)
- [x] Commit b156d03 exists (storage layer)
- [x] Commit 784c215 exists (docs)
- [x] All 3 green-gate boundaries passed (847 tests)
