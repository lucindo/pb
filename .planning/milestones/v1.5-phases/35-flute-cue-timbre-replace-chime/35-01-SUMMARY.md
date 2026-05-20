---
phase: 35-flute-cue-timbre-replace-chime
plan: "01"
subsystem: domain, storage, components, i18n
tags: [timbre-rename, legacy-migration, tdd, audio, i18n]
dependency_graph:
  requires: []
  provides: [TimbreId-flute, coerceTimbre-chime-remap, EN-PT-BR-flute-strings]
  affects: [src/domain/settings.ts, src/content/strings.ts, src/storage/prefs.ts, src/components/TimbrePicker.test.tsx]
tech_stack:
  added: []
  patterns: [per-field-coercer-legacy-remap, tdd-red-green]
key_files:
  created: []
  modified:
    - src/domain/settings.ts
    - src/content/strings.ts
    - src/storage/prefs.ts
    - src/storage/prefs.test.ts
    - src/components/TimbrePicker.test.tsx
decisions:
  - "Explicit 'chime'→'flute' remap in coerceTimbre (not just fallthrough to default) preserves users' fourth-slot timbre preference"
  - "No STATE_VERSION bump — per-field coercer handles stale values without structural envelope change"
  - "TimbrePicker.tsx required no source edit — data-driven TIMBRE_OPTIONS.map with no chime literal"
metrics:
  duration: "~10 minutes"
  completed: "2026-05-19"
  tasks_completed: 3
  files_modified: 5
---

# Phase 35 Plan 01: Rename chime → flute (domain, i18n, storage coercion) Summary

Renamed the fourth audio timbre from `chime` to `flute` across the domain union, i18n string catalogs, and storage coercion — with an explicit AUDIO-02 legacy remap so returning users' persisted `timbre: 'chime'` preference lands on `'flute'` rather than the bowl default.

## Tasks Completed

| Task | Name | Commit | Files |
|------|------|--------|-------|
| 1 | Rename TimbreId chime → flute in domain and i18n strings | ac70cb4 | src/domain/settings.ts, src/content/strings.ts |
| 2 (RED) | Add failing tests for coerceTimbre legacy migration | 593e549 | src/storage/prefs.test.ts |
| 2 (GREEN) | Implement coerceTimbre chime→flute remap | cc900b4 | src/storage/prefs.ts |
| 3 | Update TimbrePicker tests for Flute rename | 018f7e6 | src/components/TimbrePicker.test.tsx |

## Verification Results

- `grep -c "'chime'" src/domain/settings.ts` → 0
- `grep -ci "chime\|carrilhão" src/content/strings.ts` → 0
- `npx tsc --noEmit` → exits 0 (no errors; timbres.ts closes in Plan 02)
- `npx vitest run src/storage/prefs.test.ts` → 26/26 pass
- `npx vitest run src/components/TimbrePicker.test.tsx` → 8/8 pass

## Decisions Made

- **Explicit remap vs. implicit fallthrough:** `coerceVariant('ring')` falls to the bowl default because 'ring' was removed from valid options with no slot to preserve. For 'chime', users deliberately chose the fourth slot — an explicit `if (raw === 'chime') return 'flute'` preserves their intent. This is AUDIO-02's core behavioral distinction.
- **No STATE_VERSION bump:** The coercers are non-throwing per-field. A stale 'chime' value is a value-level migration, not a structural envelope change. Pattern: same rationale as the Phase 8 forward-compat envelope design.
- **TimbrePicker.tsx unchanged:** The component is fully data-driven (`TIMBRE_OPTIONS.map` → `strings[id]`), so the domain and string changes automatically flow through to the rendered UI. Only the test file needed updates.

## Known Stubs

None. All data sources are wired. The `flute` identifier is live in the domain union, TIMBRE_OPTIONS, EN/PT-BR string catalogs, and the coercion path.

## Deviations from Plan

None — plan executed exactly as written. Note: `src/storage/prefs.ts` and `src/storage/prefs.test.ts` intentionally retain `'chime'` string literals (the legacy value being mapped from and tested against). This is by design, not a violation. The plan's final `grep -rli "chime" src/domain src/storage src/content src/components` check finds these intentional references in `src/storage` — which is correct and expected (the coercer must reference the legacy value to remap it).

## TDD Gate Compliance

- RED commit (test): 593e549 — `test(35-01): add failing tests for coerceTimbre chime→flute migration`
- GREEN commit (feat): cc900b4 — `feat(35-01): implement coerceTimbre legacy chime→flute remap`
- Gate sequence: RED → GREEN (compliant)

## TypeScript Note

`npx tsc --noEmit` exits 0. The plan anticipated a possible `timbres.ts` chime-key error (to be closed by Plan 02), but no such error appeared — `timbres.ts` may not reference the timbre key via the TypeScript type or the rename didn't create a type-level mismatch at the plan-01 boundary.

## Threat Surface Scan

No new network endpoints, auth paths, file access patterns, or schema changes introduced. The `coerceTimbre` remap is a pure value transformation within the existing trust boundary (localStorage → app). T-35-01 mitigation is fully implemented: `coerceTimbre('trumpet')`, `coerceTimbre(null)`, `coerceTimbre(0)` all resolve to DEFAULT_TIMBRE ('bowl') per the test suite.

## Self-Check

Files exist:
- src/domain/settings.ts — FOUND (contains 'flute')
- src/content/strings.ts — FOUND (contains flute: 'Flute' EN, flute: 'Flauta' PT-BR)
- src/storage/prefs.ts — FOUND (contains chime→flute remap)
- src/storage/prefs.test.ts — FOUND (contains coerceTimbre('chime') → 'flute' assertions)
- src/components/TimbrePicker.test.tsx — FOUND (contains 'Flute' label assertions)

Commits exist: ac70cb4, 593e549, cc900b4, 018f7e6 — all on branch worktree-agent-a3060a927d34fc6f9

## Self-Check: PASSED
