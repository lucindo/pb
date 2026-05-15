---
phase: 25-labels-vs-icons-cue-toggle
plan: "02"
subsystem: hooks
tags: [hooks, prefs-sync, cue-dimension, tdd]
dependency_graph:
  requires: ["25-01"]
  provides: ["25-03", "25-04", "25-05"]
  affects: []
tech_stack:
  added: []
  patterns:
    - "useCueChoice: picker-side hook — useState + useCallback empty-deps + savePrefs merged write + hrv:prefs-changed dispatch"
    - "useVisualCue: App-side hook — useState + dual useEffect (cross-tab storage + same-tab CustomEvent key-filtered)"
key_files:
  created:
    - src/hooks/useCueChoice.ts
    - src/hooks/useCueChoice.test.ts
    - src/hooks/useVisualCue.ts
    - src/hooks/useVisualCue.test.ts
  modified: []
decisions:
  - "D-14: useCueChoice (picker-side) + useVisualCue (App-side) hook pair mirrors useVariantChoice / useVisualVariant exactly; shared hrv:prefs-changed CustomEvent with detail.key === 'cue'"
metrics:
  duration: "~5 minutes"
  completed_date: "2026-05-15"
  tasks_completed: 2
  tasks_total: 2
  files_created: 4
  files_modified: 0
  tests_added: 14
  tests_passing: 14
---

# Phase 25 Plan 02: Create useCueChoice + useVisualCue Hook Pair Summary

**One-liner:** `useCueChoice` (picker-side) and `useVisualCue` (App-side) cue-dimension hook pair cloned verbatim from the variant analogs, dispatching and consuming `hrv:prefs-changed` with `detail.key === 'cue'`.

## Tasks Completed

| Task | Name | Commit | Files |
|------|------|--------|-------|
| 1 (RED) | useCueChoice test (failing) | d0bcd60 | src/hooks/useCueChoice.test.ts |
| 1 (GREEN) | useCueChoice implementation | e309ee0 | src/hooks/useCueChoice.ts |
| 2 (RED) | useVisualCue test (failing) | 13ceb28 | src/hooks/useVisualCue.test.ts |
| 2 (GREEN) | useVisualCue implementation | 55001d0 | src/hooks/useVisualCue.ts |

## What Was Built

### useCueChoice (src/hooks/useCueChoice.ts)

Picker-side hook providing `{ cue, setCue }`:

- State seeded from `loadPrefs().cue` at mount
- `setCue(next)` performs: fresh envelope read → `savePrefs({ ...current, cue: next })` → optimistic `setCueState(next)` → dispatches `hrv:prefs-changed` with `{ key: 'cue', value: next }`
- `useCallback` with empty deps ensures stable setter identity across re-renders
- 6 tests covering: initial seed, optimistic update, disk write, envelope merge (other fields preserved), CustomEvent shape, setter stability

### useVisualCue (src/hooks/useVisualCue.ts)

App-side orchestrator hook providing `{ cue, setCue }`:

- State seeded from `loadPrefs().cue` at mount
- Cross-tab `storage` listener: re-reads `loadPrefs().cue` on `e.key === STATE_KEY`
- Same-tab `hrv:prefs-changed` listener: re-reads on `detail.key === 'cue' || detail.key === undefined` (D-22 forward-compat broadcast-all branch)
- Ignores other dimension events (`detail.key === 'variant'`, etc.) — dimension isolation
- Render-local only — no `documentElement` attribute writes
- 8 tests covering: initial seed, cross-tab update, cross-tab ignore (unrelated key), same-tab cue event, same-tab variant event ignored (negative case), broadcast-all, render-local assertion, no matchMedia subscription

## Verification Results

- `npx tsc -b` exits 0
- `npx eslint src/hooks/useCueChoice.ts src/hooks/useVisualCue.ts src/hooks/useCueChoice.test.ts src/hooks/useVisualCue.test.ts` exits 0
- `npx vitest run src/hooks/useCueChoice.test.ts src/hooks/useVisualCue.test.ts` — 14/14 tests pass
- `grep -rn "variant" src/hooks/useCueChoice.ts src/hooks/useVisualCue.ts` — only in comment documentation listing all dimensions; no leftover code identifiers

## TDD Gate Compliance

| Gate | Commit | Status |
|------|--------|--------|
| RED (useCueChoice) | d0bcd60 | PASSED — import error, tests failed as expected |
| GREEN (useCueChoice) | e309ee0 | PASSED — 6/6 tests pass |
| RED (useVisualCue) | 13ceb28 | PASSED — import error, tests failed as expected |
| GREEN (useVisualCue) | 55001d0 | PASSED — 8/8 tests pass |

## Deviations from Plan

None — plan executed exactly as written. Both hooks are verbatim clones of the variant analogs with `variant` → `cue` rename throughout.

## Known Stubs

None — both hooks are fully wired to `loadPrefs()`/`savePrefs()` and the `hrv:prefs-changed` event.

## Threat Flags

None — no new network endpoints, auth paths, or file access patterns introduced. The hooks are pure client-side prefs sync. T-25-04 mitigation is satisfied: event payloads are never used as data sources; events only trigger `loadPrefs()` re-reads whose output is coerced by `coerceCue()` (Plan 01).

## Self-Check: PASSED

Files created:
- FOUND: src/hooks/useCueChoice.ts
- FOUND: src/hooks/useCueChoice.test.ts
- FOUND: src/hooks/useVisualCue.ts
- FOUND: src/hooks/useVisualCue.test.ts

Commits verified:
- FOUND: d0bcd60 (test RED useCueChoice)
- FOUND: e309ee0 (feat GREEN useCueChoice)
- FOUND: 13ceb28 (test RED useVisualCue)
- FOUND: 55001d0 (feat GREEN useVisualCue)
