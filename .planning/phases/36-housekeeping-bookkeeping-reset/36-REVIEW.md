---
phase: 36-housekeeping-bookkeeping-reset
reviewed: 2026-05-20T22:09:54Z
depth: standard
files_reviewed: 2
files_reviewed_list:
  - .gitignore
  - src/storage/storage.test.ts
findings:
  critical: 0
  warning: 0
  info: 1
  total: 1
status: issues_found
---

# Phase 36: Code Review Report

**Reviewed:** 2026-05-20T22:09:54Z
**Depth:** standard
**Files Reviewed:** 2
**Status:** issues_found

## Summary

Phase 36 is a procedural / bookkeeping reset. Per CONTEXT §domain the source-code surface is limited to one new `describe` block in `src/storage/storage.test.ts` (HOUSE-09 — v1→v3 chained `migrateEnvelope` regression) and a one-line `.gitignore` addition (HOUSE-13 — `.claude/`).

Both files were reviewed at standard depth and cross-referenced against the implementation in `src/storage/storage.ts`. Pre-existing lint debt on `main` (53 errors, 3 warnings) is acknowledged in `deferred-items.md` and deferred to Phase 44 POLISH-02 per scope; pre-existing issues outside the new HOUSE-09 block were not re-flagged.

- `.gitignore` — `.claude/` ignore line is correct; no `.claude` paths are currently tracked (`git ls-files | grep .claude` returns empty), so no orphaned tracked files. Trailing newline present. No issues.
- `src/storage/storage.test.ts` — the new HOUSE-09 `describe` block (lines 300-366) is consistent with the v1→v2 analog block above it and with the actual `migrateEnvelope` cascade in `src/storage/storage.ts:92-136`. The chained assertions on `practices.resonant.{settings,stats}`, `practices.stretch.{settings,stats}`, and `activePractice` correctly reflect the two-step ladder. One Info-severity quality finding on the idempotency test (IN-01 below) — the test asserts function determinism, not the idempotency the name claims.

No Critical or Warning findings.

## Info

### IN-01: HOUSE-09 idempotency test does not exercise re-migration

**File:** `src/storage/storage.test.ts:348-358`
**Issue:** The test named "is idempotent on re-migration (running v1→v3 twice yields the same envelope)" passes two structurally-identical fresh v1 envelopes through `migrateEnvelope(env, 1)` and asserts `once === twice` by deep equality. That assertion only proves `migrateEnvelope` is a deterministic pure function for a given input — it does NOT test idempotency.

True idempotency would feed the first call's output back through the migration with its new effective version (the way the v1→v2 analog block at lines 180-195 does — that block seeds a v3-shaped envelope and calls `migrateEnvelope(v3Envelope, 3)` to confirm both ladder steps no-op). As written, a regression where `migrateEnvelope` mutated its input or where re-running the ladder on already-migrated data produced a different shape would still pass `expect(once).toEqual(twice)`.

This is test-quality debt, not a correctness bug — the chained assertion in the test above (lines 329-346) does verify the cascade itself, and the v2→v3 and v1→v2 blocks each contain their own correct idempotency cases. The HOUSE-09 block just doesn't add coverage commensurate with its test name.

**Fix:** Either rename the test to reflect what it actually asserts ("v1→v3 migration is a pure function of its inputs"), or restructure to exercise true idempotency, e.g.:

```ts
it('is idempotent — re-migrating the v3 output is a no-op', () => {
  const once = migrateEnvelope(
    { version: 1, settings: V1_SETTINGS, stats: V1_STATS },
    1,
  )
  // Feed the output back through with its terminal version. STATE_VERSION (3)
  // means both fromVersion < 2 and fromVersion < 3 guards are false — the
  // returned envelope must equal `once` (modulo the `version` field, which
  // writeEnvelope stamps, not migrateEnvelope).
  const twice = migrateEnvelope(once, STATE_VERSION)
  expect(twice).toEqual(once)
})
```

This would catch a regression where, e.g., the v2→v3 step started overwriting an already-present `stretch` slice on a v3 input.

---

_Reviewed: 2026-05-20T22:09:54Z_
_Reviewer: Claude (gsd-code-reviewer)_
_Depth: standard_
