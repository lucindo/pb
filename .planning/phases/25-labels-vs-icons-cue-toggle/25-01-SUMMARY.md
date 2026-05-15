---
phase: 25-labels-vs-icons-cue-toggle
plan: "01"
subsystem: domain/storage/i18n
tags: [cue-dimension, settings, prefs, i18n, tdd]
dependency_graph:
  requires: []
  provides:
    - CueStyleId type exported from src/domain/settings.ts
    - CUE_OPTIONS const exported from src/domain/settings.ts
    - isValidCue predicate exported from src/domain/settings.ts
    - DEFAULT_CUE constant exported from src/domain/settings.ts
    - coerceCue function exported from src/storage/prefs.ts
    - UserPrefs.cue field in src/storage/prefs.ts
    - DEFAULT_PREFS.cue in src/storage/prefs.ts
    - UiStrings.settings.cueLabel in src/content/strings.ts
    - UiStrings.cue group in src/content/strings.ts
    - EN + PT-BR cue strings in src/content/strings.ts
  affects:
    - Any consumer of UserPrefs (downstream hooks, App.tsx)
    - Downstream plans (25-02 through 25-05) that use these exports
tech_stack:
  added: []
  patterns:
    - Clone-variant-dimension pattern (CueStyleId mirrors VisualVariantId exactly)
    - Per-field non-throwing coerce pattern (coerceCue mirrors coerceVariant)
    - TDD RED/GREEN cycle with per-task commits
key_files:
  created: []
  modified:
    - src/domain/settings.ts
    - src/domain/settings.test.ts
    - src/storage/prefs.ts
    - src/storage/prefs.test.ts
    - src/content/strings.ts
    - src/content/strings.test.ts
    - src/hooks/useVariantChoice.test.ts
    - src/hooks/useThemeChoice.test.ts
    - src/hooks/useTimbreChoice.test.ts
    - src/hooks/useLocaleChoice.test.ts
    - src/hooks/useLocale.test.ts
    - src/app/App.locale.test.tsx
decisions:
  - "DEFAULT_CUE = 'labels' is FIXED (D-01); never change to a different default"
  - "No STATE_VERSION bump — missing cue key coerces to DEFAULT_CUE = migration (D-13)"
  - "CueStyleId union uses 'labels'|'arrow'|'nose' exactly as specified by plan"
  - "PT-BR cue strings carry 4 new TODO: native-speaker review markers for Phase 26 sweep"
metrics:
  duration_seconds: 330
  completed: "2026-05-15"
  tasks_completed: 3
  files_modified: 12
---

# Phase 25 Plan 01: Cue Prefs Dimension Foundation Summary

**One-liner:** CueStyleId domain enum + coerceCue storage field + EN/PT-BR cue strings catalog, mirroring the variant dimension verbatim.

## Tasks Completed

| # | Name | Commit (RED) | Commit (GREEN) | Tests |
|---|------|-------------|----------------|-------|
| 1 | Add cue dimension to domain enum | d8380da | 267ae93 | 52/52 pass |
| 2 | Add cue field + coerceCue to prefs envelope | b41bdaf | 9a1fd97 | 22/22 pass |
| 3 | Add cue strings to i18n catalog (EN + PT-BR) | 37dc36d | 958ea47 | 92/92 pass |

**Total new tests:** 23 (839 base → 862 total, all passing)

## What Was Built

### Task 1 — Domain enum (src/domain/settings.ts)

Added the cue block directly after the variant block (dimension order: theme → timbre → variant → **cue** → locale):

- `export type CueStyleId = 'labels' | 'arrow' | 'nose'`
- `export const CUE_OPTIONS = ['labels', 'arrow', 'nose'] as const satisfies readonly CueStyleId[]`
- `export function isValidCue(v: unknown): v is CueStyleId` — same whitelist predicate as isValidVariant
- `export const DEFAULT_CUE: CueStyleId = 'labels'` — FIXED per D-01, comment explains constraint

### Task 2 — Prefs envelope (src/storage/prefs.ts)

Three edit sites following the variant analog exactly:

1. Domain imports extended: `DEFAULT_CUE`, `isValidCue`, `type CueStyleId`
2. `UserPrefs.cue: CueStyleId` field added (between variant and locale); `DEFAULT_PREFS.cue = DEFAULT_CUE`
3. `coerceCue()` function added; `cue: coerceCue(r.cue)` in `coercePrefs` return; comment updated "four → five known keys"

No STATE_VERSION bump — a missing `cue` key in pre-Phase-25 envelopes coerces to `'labels'` transparently (D-13).

### Task 3 — i18n catalog (src/content/strings.ts)

Four edit sites:

1. `UiStrings.settings.cueLabel: string` (after variantLabel)
2. `UiStrings.cue: { labels, arrow, nose }` group (after variants)
3. EN literals: `cueLabel: 'Cue style'`, `cue: { labels: 'Text', arrow: 'Arrow', nose: 'Nose' }` (D-12)
4. PT-BR literals with 4 new `// TODO: native-speaker review` markers

### Deviation: Updated UserPrefs fixtures in existing tests (Rule 2 — missing required field)

Adding `cue: CueStyleId` to `UserPrefs` as a required field caused TypeScript errors in 6 existing test files that constructed `UserPrefs` objects without the field. These were fixed by adding `cue: 'labels'` to each fixture object:

- `src/hooks/useVariantChoice.test.ts` — DEFAULT_FULL_PREFS + 1 inline seedPrefs call
- `src/hooks/useThemeChoice.test.ts` — DEFAULT_FULL_PREFS + 1 inline seedPrefs call
- `src/hooks/useTimbreChoice.test.ts` — DEFAULT_FULL_PREFS + 1 inline seedPrefs call
- `src/hooks/useLocaleChoice.test.ts` — DEFAULT_FULL_PREFS + 1 inline seedPrefs call
- `src/hooks/useLocale.test.ts` — DEFAULT_FULL_PREFS (inline constant)
- `src/app/App.locale.test.tsx` — DEFAULT_FULL_PREFS

These fixes were required for `tsc -b` to pass (green gate invariant D-09/D-15). Included in Task 3 commit (958ea47).

## Verification

| Gate | Result |
|------|--------|
| `npx tsc -b` | PASS (0 errors) |
| `npx eslint src/domain/settings.ts src/storage/prefs.ts src/content/strings.ts` | PASS |
| `npx vitest run src/domain/settings.test.ts src/storage/prefs.test.ts src/content/strings.test.ts` | PASS (92/92) |
| Full `npx vitest run` | PASS (862/862) |
| No STATE_VERSION in prefs.ts | PASS (grep -c returns 0) |
| PT-BR review markers | +4 (cueLabel + labels + arrow + nose) |

## Success Criteria Status

- [x] CueStyleId / CUE_OPTIONS / isValidCue / DEFAULT_CUE exported from settings.ts; DEFAULT_CUE === 'labels'
- [x] UserPrefs carries a `cue` field; coerceCue isolates it per-field; DEFAULT_PREFS.cue === 'labels'
- [x] A pre-Phase-25 envelope (no cue key) loads cleanly as cue='labels' with the other 4 fields intact
- [x] settings.cueLabel + cue group present in EN and PT-BR; PT-BR carries 4 new review markers
- [x] Green gate (`tsc -b && lint && test`) passes

## Known Stubs

None. This plan is pure data/types with no UI rendering — no stubs applicable.

## Threat Flags

No new threat surface introduced. The `coerceCue` whitelist coerce (T-25-01 mitigation) is implemented: any value not in CUE_OPTIONS falls back to DEFAULT_CUE with no eval or dynamic key lookup.

## Self-Check: PASSED

Files verified:
- [x] `src/domain/settings.ts` — CueStyleId, CUE_OPTIONS, isValidCue, DEFAULT_CUE present
- [x] `src/storage/prefs.ts` — coerceCue, UserPrefs.cue, DEFAULT_PREFS.cue present
- [x] `src/content/strings.ts` — cueLabel and cue group in both EN and PT-BR
- [x] Commits d8380da, 267ae93, b41bdaf, 9a1fd97, 37dc36d, 958ea47 all exist in git log
