---
phase: 33-close-gap-practice-02-resonant-settings-read-write-split-brain
plan: "01"
subsystem: storage/persistence
tags: [persistence, read-path, practice, settings, regression]
dependency_graph:
  requires: [Phase 31 CR-01 write path, src/storage/practices.ts saveResonantSettings/loadPractices]
  provides: [PRACTICE-02 restored, resonant settings survive reload, dead symbol removal]
  affects: [src/app/App.tsx, src/storage/settings.ts, src/storage/settings.test.ts, src/storage/stats.test.ts, src/app/App.persistence.test.tsx]
tech_stack:
  added: []
  patterns: [useMemo read from per-practice envelope, saveResonantSettings/loadPractices replacing flat loadSettings/saveSettings]
key_files:
  created: [src/app/App.persistence.test.tsx (new PRACTICE-02 describe block)]
  modified: [src/app/App.tsx, src/storage/settings.ts, src/storage/settings.test.ts, src/storage/stats.test.ts]
decisions:
  - "Used loadPractices().resonant.settings directly in useMemo([]) to avoid ordering issue with initialPractices (declared after line 110)"
  - "Kept stale flat env.settings in localStorage as harmless orphan (D-04 — no pruning)"
  - "seedV2Envelope helper uses version: 2 so migrateEnvelope skips v1→v2 ladder, testing post-fix path directly"
requirements-completed:
  - PRACTICE-02
metrics:
  duration: "~5 minutes"
  completed: "2026-05-18"
  tasks_completed: 3
  files_changed: 5
---

# Phase 33 Plan 01: Close Gap PRACTICE-02 Resonant Settings Read/Write Split-Brain Summary

**One-liner:** Fixed PRACTICE-02 regression by retargeting `App.tsx:110` read path from abandoned flat `env.settings` to `loadPractices().resonant.settings`, removed dead `loadSettings`/`saveSettings` symbols, and added two regression tests covering fresh-v2 and v1-migrated reload scenarios.

## Tasks Completed

| Task | Name | Commit | Files |
|------|------|--------|-------|
| 1 | Retarget resonant-settings read path to per-practice envelope | 4e74a38 | src/app/App.tsx |
| 2 | Remove dead loadSettings/saveSettings and rework dependent tests | 8fa80b0 | src/storage/settings.ts, settings.test.ts, stats.test.ts |
| 3 | Add D-05 regression tests — resonant settings survive remount | 82b0ae0 | src/app/App.persistence.test.tsx |

## What Was Built

**Task 1:** Changed `App.tsx:110` from `useMemo<SessionSettings>(() => loadSettings(), [])` to `useMemo<SessionSettings>(() => loadPractices().resonant.settings, [])`. The write path (`persistedSetSettings` → `saveResonantSettings`) was already correct from Phase 31 CR-01; only the read path was mismatched. Removed `loadSettings` from the storage import block. This restores PRACTICE-02: a user's resonant BPM/ratio/duration/mode now survive a page reload.

**Task 2:** Deleted `loadSettings` and `saveSettings` from `src/storage/settings.ts` (was lines 44–51). Pruned their imports from `settings.test.ts` and deleted the 6-test `loadSettings / saveSettings round-trip` describe block. Fixed the remaining `preserves settings + stats fields` test in `loadMute / saveMute round-trip` to seed via `saveResonantSettings` and assert via the `practices.resonant.settings` subtree. Updated `stats.test.ts` to import `saveResonantSettings`/`loadPractices` from `./practices` and replaced the `resetStats` block's `saveSettings`/`loadSettings` calls with their per-practice equivalents. The `src/storage/index.ts` barrel needed no edit (wildcard re-export).

**Task 3:** Added a `seedV2Envelope(resonantSettings)` helper and a `describe('PRACTICE-02 — resonant settings survive remount', ...)` block with two regression tests:
- Fresh-v2 user: v2 envelope with `practices.resonant.settings` only (no flat `settings` field) — asserts the seeded BPM/ratio/duration render after `render(<App />)`.
- v1-migrated user: v2 envelope with both a stale flat `settings: { bpm: 6 }` and a newer `practices.resonant.settings: { bpm: 4 }` — asserts the practices value (4 BPM) renders and the stale flat value (6 BPM) does not.

## Verification Results

- `npx tsc --noEmit` — clean (zero type errors)
- `grep -rn "loadSettings|saveSettings" src/` — zero matches
- `npx vitest run` — 1154/1154 tests pass (1158 baseline − 6 deleted + 2 new = 1154)
- `npm run build` — production build succeeds (dist/ built in 458ms, 17 precache entries)

## Deviations from Plan

None — plan executed exactly as written.

The one ordering note from the plan (potential use-before-declaration of `initialPractices` at line 110) was resolved cleanly: `loadPractices().resonant.settings` avoids referencing `initialPractices` entirely, so there is no ordering issue. This matched the plan's "prefer reusing the existing initialPractices memo" option #2.

## Known Stubs

None — no stubs or placeholders introduced.

## Threat Flags

No new trust boundaries or security surface introduced. The `practices.resonant.settings` read path is guarded by the pre-existing `loadPractices` → `coercePractices` → `coercePracticeSlice` → `coerceSettings` chain (T-33-01 mitigation — unchanged). No new network endpoints, auth paths, or schema changes at trust boundaries.

## Self-Check: PASSED

Checking created/modified files and commits:
- src/app/App.tsx: modified (line 110 changed + loadSettings import removed)
- src/storage/settings.ts: modified (loadSettings/saveSettings deleted)
- src/storage/settings.test.ts: modified (block deleted, test reworked)
- src/storage/stats.test.ts: modified (imports and resetStats block reworked)
- src/app/App.persistence.test.tsx: modified (PRACTICE-02 describe added)
- Commits: 4e74a38, 8fa80b0, 82b0ae0 — all verified in git log
