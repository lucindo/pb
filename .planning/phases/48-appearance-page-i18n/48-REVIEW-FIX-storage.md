---
phase: 48-appearance-page-i18n
chunk: storage
fixed_at: 2026-05-26T00:00:00Z
review_path: .planning/phases/48-appearance-page-i18n/48-REVIEW-storage.md
iteration: 1
findings_in_scope: 11
fixed: 11
skipped: 0
deferred: 0
status: all_fixed
---

# Phase 48 Storage Chunk — Code Review Fix Report

**Fixed at:** 2026-05-26T00:00:00Z
**Source review:** .planning/phases/48-appearance-page-i18n/48-REVIEW-storage.md
**Chunk scope:** `src/storage/*.ts` (+ one cited cross-file touch to `index.html` for IN-03)
**Iteration:** 1

**Summary**

- Findings in scope: 11 (5 warning + 6 info — all severities approved)
- Fixed: 11
- Skipped: 0
- Deferred: 0
- Logic changes flagged for human verification: 1 (WR-05)

All fixes pass `npx tsc --noEmit` (full-project, errors-in-modified-file scope). Vitest deliberately not run per task instruction.

## Fixed Issues

### WR-01: writeEnvelope future-version TOCTOU window

**Files modified:** `src/storage/storage.ts`
**Commit:** `51b5971`
**Applied fix:** Doc-only update. Expanded the `writeEnvelope` doc-comment to explicitly state the residual TOCTOU window between the inner re-read and the outer setItem, noted that the guard is best-effort (not transactional), and pointed at BroadcastChannel / Web Locks as the deferred path to a full fix.

### WR-02: Older build silently discards user actions on future-version envelope

**Files modified:** `src/storage/storage.ts`
**Commit:** `3432eba`
**Applied fix:** Option 2 from the review — DEV-only `console.warn` gated on `import.meta.env.DEV` at the `currentVersion > STATE_VERSION` short-circuit. Production stays silent (D-03/D-17, RAM authoritative). Also added a user-facing-failure-mode comment so QA/UAT knows to clear localStorage between build downgrades. The full sentinel return-type refactor was NOT chosen — it would ripple through every save*/record* call site, violating the "design must not touch logic" scoping rule for an Info/Warning fix.

### WR-03: coerceTimbre chime→flute remap never persists

**Files modified:** `src/storage/prefs.ts`
**Commit:** `3c4ea4b`
**Applied fix:** Option 2 from the review — extracted `LEGACY_TIMBRE_REMAP` as an exported, `Object.freeze`d `Readonly<Record<string, TimbreId>>` with explicit contract documentation: "MUST NOT be deleted (and entries MUST NOT be removed) without a STATE_VERSION bump + an explicit migrateEnvelope ladder step." `coerceTimbre` now looks the raw value up in the table. Option 1 (persist-on-read) was NOT chosen — adding a write side-effect inside a read path is a larger behavior change that warrants its own discussion.

### WR-04: saveActivePractice writes unvalidated id

**Files modified:** `src/storage/practices.ts`
**Commit:** `a222e34`
**Applied fix:** Inserted `coerceActivePractice(id)` at the write boundary exactly as the review proposed. No-op for type-correct callers; corruption guard for type-unsafe ones.

### WR-05: Recording one practice rewrites others' on-disk slices

**Files modified:** `src/storage/practices.ts`
**Commit:** `c16b922`
**Applied fix:** Introduced `rawPracticesMap()` helper that returns the unguarded on-disk record. All six write paths (`saveResonantSettings`, `saveStretchSettings`, `saveNaviKriyaSettings`, `recordResonantSession`, `recordStretchSession`, `recordNaviKriyaSession`) refactored to coerce only their target slice (the one being updated) and spread the sibling slices through as raw `unknown`. Self-healing-on-read via `coercePractices` at load time is unchanged. The policy is now "load-time normalization, write-time pass-through" rather than "every write normalizes everything."

**Logic change — flagged for human verification:** The existing `practices.test.ts` isolation tests (`saveX leaves Y untouched`, `recordX leaves Y untouched`, the STATS-04 round-trip block) check observable behavior through `loadPractices`, so they remain valid contracts. Existing tests should pass since `coercePractices` at read time still normalizes everything on the way out. New behavior to verify manually: a future-build envelope with `practices.stretch.settings.experimentalRamp: true` will now SURVIVE a `recordResonantSession` call (previously the spread-from-coerced pattern would have stripped it).

### IN-01: snapToNearestOption empty-array fallback is dead defensive code

**Files modified:** `src/storage/practices.ts`
**Commit:** `938daf3`
**Applied fix:** Added the strict-mode-artifact comment exactly as the review's second sub-option suggested. The `eslint-disable + as const` alternative was NOT chosen — it requires modifying the domain literal in `src/domain/naviKriyaSettings.ts`, which is out of the storage-chunk scope.

### IN-02: installDismissed lacks StorageDeps injection

**Files modified:** `src/storage/installDismissed.ts`
**Commit:** `f357aa7`
**Applied fix:** Added opt-in `StorageDeps` parameter with `deps.storage ?? window.localStorage` resolution on both load and save. Default-empty deps keeps every existing call site working unchanged. Updated the module-header comment to explain that the original RESEARCH decision was about avoiding the Envelope wrapper, not the dependency-injection seam itself.

### IN-03: FOUC↔STATE_KEY hand-maintained invariant

**Files modified:** `src/storage/storage.ts`, `index.html`
**Commit:** `8b32377`
**Applied fix:** Strengthened the bi-directional SYNC comments. The `STATE_KEY` doc-comment in storage.ts now explicitly mentions the `prefs.theme` JSON path coupling and the silent failure mode (data-theme="light" flash). The FOUC script's HTML comment in index.html now mirrors the same information back. CI grep guard (review's primary fix option 1) was NOT applied — that touches `package.json` / CI configuration, which is out of the storage-chunk scope per the chunk constraints.

### IN-04: Asymmetric legacy-migration policy

**Files modified:** `src/storage/prefs.ts`
**Commit:** `9e331fa`
**Applied fix:** Added the policy comment at the top of `prefs.ts` exactly as the review proposed, codifying the deletion/rename/structural distinction. Cross-references the new `LEGACY_TIMBRE_REMAP` table from WR-03.

### IN-05: record* return value is fire-and-forget projection, not write-ack

**Files modified:** `src/storage/stats.ts`, `src/storage/practices.ts`
**Commit:** `e4b7142`
**Applied fix:** Added a JSDoc block on `recordSession` explaining the RAM-authoritative return semantics. Added shorter cross-references on `recordResonantSession`, `recordStretchSession`, and `recordNaviKriyaSession` pointing to the canonical posture. Did NOT change the return-value shape — that would ripple through every caller.

### IN-06: coerceStats roundsCompleted preservation leak

**Files modified:** `src/storage/stats.ts`
**Commit:** `6570b9b`
**Applied fix:** Added the surface-level note exactly as the review suggested, documenting that `roundsCompleted` is preserved for any input that has it and that consumers MUST NOT rely on its absence for resonant/stretch slots.

## Memory Rules Respected

- **feedback_no_design_locking** — Honored. No new tests added; no byte-locks on storage-key strings, schema versions, or hardcoded `STATE_KEY` literals. `LEGACY_TIMBRE_REMAP` is exported as a contract (its deletion is now caught via grep/code-review, not via a frozen-array test).
- **feedback_design_logic_separation** — Honored. All edits are inside `src/storage/`. The single cross-chunk touch (`index.html` for IN-03) was explicitly authorized in the chunk-scope contract because the finding's root cause requires changes on both sides of the FOUC<->STATE_KEY invariant.
- **General hygiene** — No WHAT comments added; comments explain WHY (rationale, constraints, contracts). No finding-ID references in source code (commit messages carry the IDs; source code is policy-neutral).

---

_Fixed: 2026-05-26T00:00:00Z_
_Fixer: Claude (gsd-code-fixer)_
_Iteration: 1_
_Chunk: storage_
