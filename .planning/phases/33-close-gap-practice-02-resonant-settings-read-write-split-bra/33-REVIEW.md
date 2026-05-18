---
phase: 33-close-gap-practice-02-resonant-settings-read-write-split-bra
reviewed: 2026-05-18T00:00:00Z
depth: standard
files_reviewed: 5
files_reviewed_list:
  - src/app/App.persistence.test.tsx
  - src/app/App.tsx
  - src/storage/settings.ts
  - src/storage/settings.test.ts
  - src/storage/stats.test.ts
findings:
  critical: 0
  warning: 0
  info: 3
  total: 3
status: issues_found
---

# Phase 33: Code Review Report

**Reviewed:** 2026-05-18T00:00:00Z
**Depth:** standard
**Files Reviewed:** 5
**Status:** issues_found

## Summary

Phase 33 closes the PRACTICE-02 read-path gap: `App.tsx` now seeds
`initialSettings` from `loadPractices().resonant.settings` (the per-practice
envelope) instead of the abandoned flat `env.settings` field. The dead
`loadSettings` / `saveSettings` pair was deleted from `settings.ts`, and the
two test files that exercised them were migrated to `saveResonantSettings` /
`loadPractices`.

The change is internally consistent. I verified:

- No remaining `loadSettings` / `saveSettings` callers exist in `src/`
  (only a prose mention in a test comment).
- All imports in `settings.ts` (`readEnvelope`, `writeEnvelope`,
  `StorageDeps`, `SessionSettings`) are still used after the deletion.
- `loadPractices` routes `resonant.settings` through `coerceSettings` via
  `coercePracticeSlice`, so the new read path applies the same per-field
  validate-and-fallback as the deleted `loadSettings`. A missing/null
  `resonant.settings` slice correctly falls back to `DEFAULT_SETTINGS`.
- The new PRACTICE-02 tests cover both the fresh-v2 and v1-migrated-with-stale-
  flat-orphan scenarios.

No correctness, security, or robustness defects found. Three minor quality
observations follow.

## Info

### IN-01: Stale line-number reference in test comment

**File:** `src/app/App.persistence.test.tsx:463`
**Issue:** The comment block reads "App.tsx:110 seeds initialSettings from
practices.resonant.settings" and line 485 repeats "App.tsx:110 must read from
practices.resonant.settings". The actual `initialSettings` assignment is at
`App.tsx:112` after this phase's edit (the comment expanded from 1 to 4 lines,
shifting the code down). Hardcoded line numbers in comments drift silently and
mislead future readers.
**Fix:** Drop the explicit line number or refer to the symbol instead, e.g.
"App.tsx seeds `initialSettings` from `loadPractices().resonant.settings`".

### IN-02: Local `readEnvelope` test helper shadows the storage module's `readEnvelope`

**File:** `src/app/App.persistence.test.tsx:35-39`
**Issue:** The helper `readEnvelope()` parses raw localStorage directly and
performs no migration, while the production `readEnvelope` (in
`src/storage/storage.ts`) runs the v1→v2 migration. The name collision invites
a future reader to assume migration semantics that the helper does not have.
This is benign today but is a latent trap.
**Fix:** Rename the helper to something migration-neutral, e.g.
`readRawEnvelope()`, to make the "raw, no migration" contract explicit.

### IN-03: Removed envelope-merge coverage for the resonant settings write path

**File:** `src/storage/settings.test.ts:147-170`
**Issue:** The deleted `loadSettings / saveSettings round-trip` block included
a "does not throw when underlying setItem throws (D-16)" assertion and a
corrupt-JSON fallback assertion for the settings write path. After deletion,
`settings.test.ts` no longer exercises a quota-failure or corrupt-JSON case for
settings persistence — that coverage now lives only in `practices.ts` tests
(not in this review's file set). If `practices.test.ts` does not assert the
D-16 silent-failure behavior for `saveResonantSettings`, a regression in the
new write path would go uncaught.
**Fix:** Confirm `practices.test.ts` covers `saveResonantSettings` under a
throwing `setItem` and corrupt stored JSON; if not, add those cases there.
No change required in the reviewed files themselves.

---

_Reviewed: 2026-05-18T00:00:00Z_
_Reviewer: Claude (gsd-code-reviewer)_
_Depth: standard_
