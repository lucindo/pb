---
phase: 30-multi-practice-architecture-switcher
plan: "01"
subsystem: domain
tags: [domain, types, validators, navi-kriya, tdd]
dependency_graph:
  requires: []
  provides:
    - src/domain/naviKriyaSettings.ts (NaviKriyaSettings type, DEFAULT_NK_SETTINGS, OM_LENGTH_OPTIONS, isValid* predicates)
    - src/domain/naviKriyaSettings.test.ts (validator + defaults unit coverage for PRACTICE-02)
  affects: []
tech_stack:
  added: []
  patterns:
    - Self-contained domain module with no imports (mirrors settings.ts)
    - isValid* type-predicate pattern (typeof + Number.isFinite + Number.isInteger + range)
    - v % 4 === 0 guard for multiple-of-4 enforcement (Pitfall 5)
key_files:
  created:
    - src/domain/naviKriyaSettings.ts
    - src/domain/naviKriyaSettings.test.ts
  modified: []
decisions:
  - "NaviKriyaSettings coercer intentionally excluded from this domain module — belongs in src/storage/practices.ts (plan 30-03), matching the domain-vs-storage split of settings.ts vs storage/settings.ts"
  - "isValidOmLength uses OM_LENGTH_OPTIONS array membership check via (OM_LENGTH_OPTIONS as readonly string[]).includes(v) for consistency with settings.ts isValid* pattern"
metrics:
  duration: 83s
  completed: "2026-05-17T06:28:41Z"
  tasks_completed: 2
  files_created: 2
  files_modified: 0
---

# Phase 30 Plan 01: NaviKriyaSettings Domain Model Summary

**One-liner:** NaviKriyaSettings type with DEFAULT_NK_SETTINGS, OM_LENGTH_OPTIONS, and three isValid* predicates — Pitfall 5 multiple-of-4 frontCount guard enforced and unit-tested.

## Tasks Completed

| Task | Name | Commit | Files |
|------|------|--------|-------|
| 1 | Create the NaviKriyaSettings domain model | 81f9292 | src/domain/naviKriyaSettings.ts (created) |
| 2 | Add the NaviKriyaSettings validator test suite | 7cf907d | src/domain/naviKriyaSettings.test.ts (created) |

## What Was Built

### src/domain/naviKriyaSettings.ts

A self-contained domain module (no imports, mirrors `src/domain/settings.ts` structure) exporting:

- `OmLength` union type: `'fast' | 'medium' | 'slow'`
- `OM_LENGTH_OPTIONS` const array typed `as const satisfies readonly OmLength[]`
- `NaviKriyaSettings` interface: `frontCount: number`, `omLength: OmLength`, `rounds: number`, `perOmCue: boolean`
- `DEFAULT_NK_SETTINGS`: `{ frontCount: 100, omLength: 'medium', rounds: 3, perOmCue: true }` (D-02 values)
- `isValidFrontCount`: enforces `typeof === 'number' && Number.isFinite && Number.isInteger && v > 0 && v % 4 === 0`
- `isValidOmLength`: checks membership in `OM_LENGTH_OPTIONS`
- `isValidRounds`: enforces `typeof === 'number' && Number.isFinite && Number.isInteger && v >= 1`

The `v % 4 === 0` check in `isValidFrontCount` is the Pitfall 5 guard ensuring `backCount = frontCount / 4` is never fractional.

### src/domain/naviKriyaSettings.test.ts

16 tests across 4 `describe` blocks:
- `isValidFrontCount`: 6 `it` cases including the explicit Pitfall 5 regression guard (`isValidFrontCount(102)` → false)
- `isValidOmLength`: 4 `it` cases
- `isValidRounds`: 5 `it` cases
- `DEFAULT_NK_SETTINGS`: 1 `it` case asserting exact D-02 equality

## Verification Results

- `npx tsc --noEmit`: PASS
- `npm run test:run -- src/domain/naviKriyaSettings.test.ts`: 16/16 tests pass
- `src/domain/naviKriyaSettings.ts` has 0 import statements and 0 coerce functions
- `v % 4 === 0` substring present in non-comment code (grep confirms 1 occurrence)

## Deviations from Plan

None — plan executed exactly as written.

## Known Stubs

None. The domain module is complete. The `coerceNaviKriyaSettings` function is intentionally deferred to plan 30-03 (not a stub — by design per the domain-vs-storage split).

## Threat Flags

None. This plan adds pure domain types and predicates with no network endpoints, auth paths, file access patterns, or schema changes at trust boundaries. The T-30-01 threat (Tampering via malformed `frontCount`) is mitigated by the `isValidFrontCount` predicate and unit-tested as required.

## Self-Check: PASSED

- `src/domain/naviKriyaSettings.ts` exists: FOUND
- `src/domain/naviKriyaSettings.test.ts` exists: FOUND
- Commit 81f9292 exists: FOUND
- Commit 7cf907d exists: FOUND
