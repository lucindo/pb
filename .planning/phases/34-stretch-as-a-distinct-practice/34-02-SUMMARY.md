---
phase: 34-stretch-as-a-distinct-practice
plan: "02"
subsystem: storage
tags: [storage, stretch, migration, tdd, practices]
dependency_graph:
  requires:
    - StretchSettings type (src/domain/settings.ts) — from Plan 01
    - DEFAULT_STRETCH_SETTINGS (src/domain/settings.ts) — from Plan 01
    - isValidRatio/isValidBpm/isValidWarmUp/isValidCoolDown/isValidRampDuration (src/domain/settings.ts) — from Plan 01
  provides:
    - STATE_VERSION=3 (src/storage/storage.ts)
    - v2→v3 migrateEnvelope step seeding practices.stretch (src/storage/storage.ts)
    - coerceSettings trimmed to 3 standard fields (src/storage/settings.ts)
    - PracticeId expanded to include 'stretch' (src/storage/practices.ts)
    - PracticeMap.stretch: PracticeSlice<StretchSettings> slot (src/storage/practices.ts)
    - coerceStretchSettings (src/storage/practices.ts)
    - saveStretchSettings (src/storage/practices.ts)
    - recordStretchSession (src/storage/practices.ts)
    - coerceActivePractice('stretch') returns 'stretch' (src/storage/practices.ts)
  affects:
    - src/storage/storage.ts
    - src/storage/settings.ts
    - src/storage/practices.ts
    - src/storage/storage.test.ts
    - src/storage/settings.test.ts
    - src/storage/practices.test.ts
tech_stack:
  added: []
  patterns:
    - migration-ladder (idempotent/lossless/orphan-tolerant — STATE_VERSION ladder extended to v3)
    - per-field-coercer (coerceStretchSettings mirrors coerceNaviKriyaSettings exactly)
    - prototype-pollution-safe (asRecord guard applied to coerceStretchSettings)
    - practice-slice-isolation (saveStretchSettings/recordStretchSession write only the stretch slice)
key_files:
  created: []
  modified:
    - src/storage/storage.ts
    - src/storage/settings.ts
    - src/storage/practices.ts
    - src/storage/storage.test.ts
    - src/storage/settings.test.ts
    - src/storage/practices.test.ts
decisions:
  - D-03 implemented: STATE_VERSION bumped 2→3; v2→v3 ladder seeds practices.stretch from resonant blob
  - D-04 implemented: coerceSettings trimmed to 3 standard fields; stretch fields moved to coerceStretchSettings
  - D-05 implemented: stretch practice is a fully-typed first-class slice with save/record/reset
  - No ZERO_STATS import in storage.ts — inline literal used to avoid circular dependency (stats.ts → storage.ts)
  - Future-schema guard tests updated from v3 to v4 (STATE_VERSION is now 3)
metrics:
  duration_minutes: 6
  completed_date: "2026-05-18"
  tasks_completed: 2
  tasks_total: 2
  files_changed: 6
---

# Phase 34 Plan 02: Storage Layer — STATE_VERSION 3 + Stretch Practice Slice

**One-liner:** Bump storage envelope to v3 with lossless v2→v3 migration seeding practices.stretch, trim coerceSettings to 3 standard fields, add coerceStretchSettings/saveStretchSettings/recordStretchSession with full asRecord prototype-pollution safety.

## What Was Built

This plan implements D-03, D-04, D-05 from the 34-CONTEXT.md: the storage layer grows a
first-class stretch slice, a v2→v3 migration that preserves existing resonant/naviKriya data,
and trimmed coercers that reflect the domain type split from Plan 01.

### Task 1: STATE_VERSION 2→3 + trim coerceSettings (TDD)

**`src/storage/storage.ts` changes:**
- `STATE_VERSION` bumped from `2 as const` to `3 as const`
- New `if (fromVersion < 3)` block appended to `migrateEnvelope` after the existing `fromVersion < 2` block
- v2→v3 step reads `out.practices.resonant.settings` (unknown — coercers validate downstream) and spreads a new `stretch` key into `out.practices`: `settings` = that raw resonant settings blob, `stats` = inline ZERO literal (no import to avoid `stats.ts → storage.ts` circular dep)
- Resonant and naviKriya slices untouched — orphan fields survive as harmless forward-compat blobs
- Tests updated: future-schema guard tests updated from seed version 3 → 4 (now STATE_VERSION is 3); idempotency test updated to use v3 envelope (fromVersion=3 skips both ladder steps)

**`src/storage/settings.ts` changes:**
- `coerceSettings` trimmed from 9 fields to 3 (`bpm`, `ratio`, `durationMinutes`)
- Removed imports: `DEFAULT_STRETCH_SETTINGS`, `isValidMode`, `isValidWarmUp`, `isValidCoolDown`, `isValidRampDuration`
- All stretch/mode coercion moved to `coerceStretchSettings` in practices.ts

### Task 2: Stretch practice slice — PracticeId, coercer, save/record functions (TDD)

**`src/storage/practices.ts` changes:**
- `PracticeId` widened to `'resonant' | 'stretch' | 'naviKriya'`
- `PracticeMap` gains `stretch: PracticeSlice<StretchSettings>` slot
- New imports: `StretchSettings`, `DEFAULT_STRETCH_SETTINGS`, `isValidRatio`, `isValidBpm`, `isValidWarmUp`, `isValidCoolDown`, `isValidRampDuration` from `../domain/settings`
- `coerceStretchSettings(raw: unknown): StretchSettings` — modeled exactly on `coerceNaviKriyaSettings`: `asRecord` guard then per-field `isValidX ? value : DEFAULT.field` for all 6 StretchSettings fields
- `coercePractices` updated to add `stretch: coercePracticeSlice(r.stretch, coerceStretchSettings)` slot
- `coerceActivePractice` updated: strict allow-list gains `raw === 'stretch'` (T-34-04)
- `saveStretchSettings(settings, deps)` — modeled exactly on `saveResonantSettings`; spreads `...practices` and overrides only the `stretch` key
- `recordStretchSession(elapsedMs, isComplete, deps)` — modeled exactly on `recordResonantSession`; no `roundsCompleted` arg (stretch does not count rounds); reads/writes only `practices.stretch.stats`
- `resetPracticeStats` needs no code change — `PracticeId` widening makes `resetPracticeStats('stretch', ...)` work automatically

## Verification Results

- `npx vitest run src/storage/` — 146 tests pass (7 test files)
- `grep -c "STATE_VERSION = 3" src/storage/storage.ts` → 1
- `grep -c "fromVersion < 3" src/storage/storage.ts` → 1
- `grep -n "ZERO_STATS" src/storage/storage.ts` → 0 code matches (comment only)
- `grep -n "isValidMode\|mode:" src/storage/settings.ts` → 0 matches
- `grep -c "'resonant' | 'stretch' | 'naviKriya'" src/storage/practices.ts` → 1
- `grep -n "roundsCompleted" src/storage/practices.ts | grep recordStretchSession` → 0 matches
- `coercePractices` and `coerceActivePractice` both handle the `stretch` key/id

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 1 - Bug] Updated future-schema guard tests after STATE_VERSION bump**
- **Found during:** Task 1 GREEN phase
- **Issue:** Existing tests in `storage.test.ts` seeded `version: 3` as a "future schema" to test the STORAGE-02 guard. After bumping `STATE_VERSION` to 3, version 3 is no longer "future" — the guard was not triggered.
- **Fix:** Updated seed values from version 3 to version 4 in the two future-schema tests; updated the idempotency test from v2 (fromVersion=2 now triggers v2→v3) to v3 envelope.
- **Files modified:** `src/storage/storage.test.ts`
- **Commit:** f6d5c49

## Known Stubs

None. All storage functions are fully implemented with real coercers, real validators, and real localStorage read/write paths.

## Threat Flags

No new threat surface introduced. All three threats from the plan's STRIDE register are mitigated:

| Threat | Mitigation Status |
|--------|-------------------|
| T-34-02 Tampering: coerceStretchSettings | MITIGATED — `asRecord` guard + per-field non-throwing coercion |
| T-34-03 Tampering: v2→v3 migration | MITIGATED — defensive `?? {}` casts; purely constructive (adds keys only) |
| T-34-04 Tampering: coerceActivePractice | MITIGATED — strict allow-list `raw === 'resonant' \|\| 'stretch' \|\| 'naviKriya'` |

## Self-Check: PASSED

- src/storage/storage.ts — FOUND
- src/storage/settings.ts — FOUND
- src/storage/practices.ts — FOUND
- 34-02-SUMMARY.md — FOUND
- Commit 0a9acd4 (task 1 RED) — FOUND
- Commit f6d5c49 (task 1 GREEN) — FOUND
- Commit 01a20aa (task 2 RED) — FOUND
- Commit 8f14e61 (task 2 GREEN) — FOUND
