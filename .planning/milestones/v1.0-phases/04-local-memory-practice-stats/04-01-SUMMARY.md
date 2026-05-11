---
phase: 04-local-memory-practice-stats
plan: 01
subsystem: storage
tags:
  - storage
  - localStorage
  - persistence
  - validation
  - typescript
dependency_graph:
  requires:
    - src/domain/settings.ts
  provides:
    - src/storage/storage.ts
    - src/storage/settings.ts
    - src/storage/stats.ts
    - src/storage/format.ts
    - src/storage/index.ts
  affects:
    - Phase 04 Plan 02 (StatsFooter component imports PersistedStats)
    - Phase 04 Plan 03 (App.tsx wiring imports loadSettings/saveSettings/loadMute/saveMute/recordSession/resetStats)
tech_stack:
  added: []
  patterns:
    - silent-fallback try/catch envelope adapter (mirrors Phase 3 D-10 AudioContext posture)
    - per-field validate-and-fallback coercers (non-throwing cousin to validateSettings)
    - injectable clock via StorageDeps.now (mirrors sessionController D-18 pattern)
    - Intl.DateTimeFormat cached at module scope
    - Storage.prototype-based in-memory polyfill for Node 25 test environment
key_files:
  created:
    - src/storage/storage.ts
    - src/storage/storage.test.ts
    - src/storage/settings.ts
    - src/storage/settings.test.ts
    - src/storage/stats.ts
    - src/storage/stats.test.ts
    - src/storage/format.ts
    - src/storage/format.test.ts
    - src/storage/index.ts
  modified:
    - vitest.setup.ts
decisions:
  - "Single envelope key 'hrv:state:v1' with version:1 field; per-field coerce absorbs intra-version drift (D-15)"
  - "COUNT_THRESHOLD_MS=30_000 exported as named constant; isComplete bypass lives inside recordSession not callers (D-01)"
  - "Node 25 built-in localStorage shadow-polyfilled via Storage.prototype patching in vitest.setup.ts (Rule 3 deviation)"
metrics:
  duration: "~8 minutes"
  completed: "2026-05-10"
  tasks_completed: 4
  files_created: 9
  files_modified: 1
  tests_added: 63
  tests_total: 225
---

# Phase 4 Plan 01: Storage Core (Envelope Adapter + Settings/Mute + Stats + Formatters) Summary

**One-liner:** Silent-fallback localStorage envelope adapter with per-field settings/mute coercion, D-01 threshold stats aggregator with injected clock, and locale-aware display formatters — 9 new files, 63 passing tests, zero new dependencies.

## What Was Built

### Files Created

| File | Lines | Tests | Purpose |
|------|-------|-------|---------|
| `src/storage/storage.ts` | 52 | 9 | Silent-fallback envelope adapter: `readEnvelope`/`writeEnvelope` with D-16/D-17 try/catch swallow |
| `src/storage/storage.test.ts` | 80 | 9 | Failure-path tests: corrupt JSON, getItem throw, QuotaExceededError, SecurityError |
| `src/storage/settings.ts` | 66 | 21 | Per-field coercers (`coerceSettings`/`coerceMute`) + load/save functions |
| `src/storage/settings.test.ts` | 148 | 21 | D-15 per-field fallback, T-04-02 prototype-pollution guard, D-16/D-17 silent failure |
| `src/storage/stats.ts` | 78 | 14 | Stats aggregator: `recordSession` (D-01 threshold gate), `resetStats` (D-11 stats-only), `loadStats` |
| `src/storage/stats.test.ts` | 126 | 14 | D-01 boundary (29,999ms/30,000ms), D-02 aggregation, D-11 isolation, D-18 injected clock |
| `src/storage/format.ts` | 49 | 19 | `formatTotalMinutes`, `formatSessionCount`, `formatLastSessionDate`, `formatLastSessionDuration`, `formatLastSession` |
| `src/storage/format.test.ts` | 99 | 19 | D-05/D-06/D-07 format rules, boundary tests, null-guard tests |
| `src/storage/index.ts` | 7 | — | Barrel re-export of all 4 modules |

### Public API via `src/storage/index.ts`

Downstream plans (02, 03) import via:
```typescript
import {
  // Envelope types
  type StorageDeps, type Envelope,
  STATE_KEY, STATE_VERSION,
  readEnvelope, writeEnvelope,
  // Settings + mute
  type SessionSettings,         // re-exported from domain/settings via settings.ts
  coerceSettings, coerceMute,
  loadSettings, saveSettings,
  loadMute, saveMute,
  // Stats
  type PersistedStats,
  COUNT_THRESHOLD_MS,
  coerceStats,
  loadStats, recordSession, resetStats,
  // Formatters
  formatTotalMinutes, formatSessionCount,
  formatLastSessionDate, formatLastSessionDuration,
  formatLastSession,
} from '../storage'
```

## Decisions Made

1. **Single envelope key** `'hrv:state:v1'` with `version: 1` always re-stamped on write. Per-field coercion absorbs intra-version drift naturally without a migration framework (D-15 + CONTEXT.md planner discretion).

2. **COUNT_THRESHOLD_MS exported** as a named constant so tests and callers can reference the exact boundary without magic literals.

3. **`isComplete` bypass lives inside `recordSession`** not in callers — keeps callers simple (R-04 pattern from RESEARCH).

4. **StorageDeps injection pattern** used by all four modules: `{ now?: () => number, storage?: Storage }`. Tests pass `{ now: () => fixedTimestamp }` for deterministic clock assertions (D-18); production code defaults to `Date.now` and `window.localStorage`.

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 3 - Blocking] Node 25 built-in localStorage shadows jsdom's functional Storage**

- **Found during:** Task 1 (first test run)
- **Issue:** Node 25.9.0 ships a built-in `localStorage` on `window` that is an empty object (no `getItem`, `setItem`, `clear`) when `--localstorage-file` is not provided. This overwrites jsdom's functional Storage implementation, making all 9 storage tests fail immediately with `TypeError: window.localStorage.clear is not a function`.
- **Fix:** Added a `localStorage` polyfill block to `vitest.setup.ts` that detects when `window.localStorage.getItem` is not a function and installs concrete implementations on `Storage.prototype` (backed by a `Map<string, string>`). Since the polyfill patches `Storage.prototype` directly, `vi.spyOn(Storage.prototype, 'getItem')` and `vi.spyOn(Storage.prototype, 'setItem')` continue to intercept as designed.
- **Files modified:** `vitest.setup.ts`
- **Commit:** `096ca9e`

**Note:** `Storage` constructor throws `Illegal constructor` when subclassed, preventing the cleaner `class InMemoryStorage extends Storage` approach. The `Object.create(Storage.prototype)` + `Storage.prototype` method patching approach works correctly and is compatible with Vitest's spy mechanism.

## Test Coverage Summary

| Behavior | Tests | Decision Tag |
|----------|-------|--------------|
| D-01 (30s threshold + completion bypass) | 5 | D-01 |
| D-02 (actual-elapsed seconds aggregation) | 3 | D-02 |
| D-05 (date format same/other year) | 2 | D-05 |
| D-06 (min/hours + singular/plural) | 10 | D-06 |
| D-07 (floor minutes) | 4 | D-07 |
| D-11 (reset stats only) | 2 | D-11 |
| D-15 (per-field validate-and-fallback) | 9 | D-15 |
| D-16 (silent write failure) | 5 | D-16 |
| D-17 (silent read failure) | 6 | D-17 |
| D-18 (injected clock) | 3 | D-18 |
| T-04-01 (corrupt JSON / throwing getItem) | 2 | — |
| T-04-02 (prototype pollution) | 1 | — |
| T-04-03 (QuotaExceededError absorption) | 1 | — |
| T-04-05 (numeric injection coercion) | 1 | — |

**Total new tests:** 63 across 4 test files
**Regression:** 0 (prior 173 tests still passing; full suite 225/225 green)

## Known Stubs

None. All public API functions are fully implemented and tested. No placeholder values, hardcoded empty returns, or TODO markers in the new files.

## Threat Flags

No new threat surface beyond what was modeled in the plan's `<threat_model>`. All T-04-01 through T-04-05 mitigations are in place and verified by named tests.

## Self-Check: PASSED

Files created:
- `src/storage/storage.ts` — FOUND
- `src/storage/storage.test.ts` — FOUND
- `src/storage/settings.ts` — FOUND
- `src/storage/settings.test.ts` — FOUND
- `src/storage/stats.ts` — FOUND
- `src/storage/stats.test.ts` — FOUND
- `src/storage/format.ts` — FOUND
- `src/storage/format.test.ts` — FOUND
- `src/storage/index.ts` — FOUND
- `vitest.setup.ts` — MODIFIED

Commits:
- `096ca9e` — storage.ts + polyfill fix (Task 1)
- `8c879b2` — settings.ts (Task 2)
- `170e6f1` — stats.ts (Task 3)
- `bee2e60` — format.ts + index.ts (Task 4)
