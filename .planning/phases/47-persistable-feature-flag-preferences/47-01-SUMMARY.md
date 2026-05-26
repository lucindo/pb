---
phase: 47-persistable-feature-flag-preferences
plan: 01
subsystem: ui
tags: [react, typescript, query-string, feature-flags, vitest, resolver]

# Dependency graph
requires:
  - phase: 45-ring-cue-progress-arc
    provides: "RingCueStyle type + RING_CUE_FLAG query-string spec + featureFlags.ringCue field — the 4th flag the new resolver merges"
  - phase: 46-kuthasta-orb-variant
    provides: "BreathingShapeVariant 3-member union ('orb-halo' | 'minimal-rings' | 'spiritual-eye') + alias table (kuthasta/star) — the 3-way variant the new resolver merges per-field"
provides:
  - "Exported SWITCHER_ICON_FLAG / BREATHING_SHAPE_FLAG / ORB_IDLE_FLAG / RING_CUE_FLAG consts (defaults + parsers) — Plan 02 imports .defaultValue + .parse for the storage coercer DRY"
  - "2-arg readFeatureFlags(search, persisted) resolver: per-field 4-way merge of query > persisted > default, with invalid-query falling through to persisted (D-07)"
  - "Private readQueryFeatureFlagOrNull<T> helper that returns null for absent OR unparseable values so the resolver's ?? chain works uniformly across string-union AND boolean fields"
  - "Transitional bridge in useFeatureFlags.ts passing PRODUCTION_DEFAULTS as the 2nd arg — preserves byte-identical v2.0 runtime behaviour until Plan 03 wires loadPrefs()"
affects: [47-02-prefs-storage, 47-03-use-feature-flags-hook, 48-appearance-page]

# Tech tracking
tech-stack:
  added: []
  patterns:
    - "Per-field 4-way merge resolver (query > persisted > default) via ?? chain over a null-returning query helper"
    - "Defaults-DRY between query-string parser and persisted coercer: defaults live exactly once in *_FLAG.defaultValue and are imported wherever consumed"

key-files:
  created: []
  modified:
    - "src/featureFlags.ts — readFeatureFlags is now 2-arg; readQueryFeatureFlagOrNull added; 4 *_FLAG consts exported"
    - "src/featureFlags.test.ts — DEFAULT_PERSISTED helper, 22 existing single-flag tests updated to 2-arg, new 5-case 'readFeatureFlags 4-way resolver' describe block"
    - "src/hooks/useFeatureFlags.ts — transitional PRODUCTION_DEFAULTS bridge (Plan 03 replaces with loadPrefs())"

key-decisions:
  - "Bridge useFeatureFlags.ts in Plan 01 (not Plan 03) — the resolver signature change would otherwise break the build; bridge passes v2.0 production defaults so runtime is byte-identical and Plan 03 swaps the literal for loadPrefs() in one line"

patterns-established:
  - "readQueryFeatureFlagOrNull<T>: returns T | null (not T | defaultValue) so consumers can chain `?? fallback` to a non-default source — enables the 3-source precedence chain to compose without leaking the default into the middle layer"
  - "Boolean-safe ?? chain: returning null (not false) from the helper makes the ?? chain work uniformly for switcherIcon (boolean) alongside the three string-union flags"

requirements-completed: [PREFS-01, PREFS-02]

# Metrics
duration: 7min
completed: 2026-05-26
---

# Phase 47 Plan 01: Resolver with persisted snapshot Summary

**`readFeatureFlags` is now a 2-arg per-field 4-way merge resolver — query > persisted > default with D-07 invalid-query-falls-through-to-persisted — and the four *_FLAG specs are public exports for Plan 02's coercer DRY.**

## Performance

- **Duration:** 7 min
- **Started:** 2026-05-26T03:28:34Z
- **Completed:** 2026-05-26T03:35:22Z
- **Tasks:** 2 (both TDD)
- **Files modified:** 3 (src/featureFlags.ts, src/featureFlags.test.ts, src/hooks/useFeatureFlags.ts)

## Accomplishments

- **D-05 / D-06 / D-07 contract locked in code** — per-field 4-way merge, with unparseable query values now falling through to persisted instead of silently masking to the production default
- **D-02 / D-03 DRY enabled** — the four `*_FLAG` consts are now `export const` so Plan 02 can import `.defaultValue` (one source of truth for production defaults) and `.parse` (alias-table reuse: a persisted `'kuthasta'` will coerce to `'spiritual-eye'` for free via Plan 02's `coerceBreathingShape`)
- **Boolean-safe resolver** — `readQueryFeatureFlagOrNull` returns `null` (not `false`) when the boolean flag's query value is absent or unparseable, so `?? persisted.switcherIcon` composes correctly for the `boolean` field alongside the three string-union fields
- **5 new resolver-coverage `it()` blocks** under `describe('readFeatureFlags 4-way resolver (Phase 47 D-05/D-06/D-07)')`: query-wins, persisted-wins, default-wins, **invalid-query-falls-through-to-persisted** (D-07 explicit), per-field independence
- **22 existing single-flag tests** updated to the 2-arg form passing `DEFAULT_PERSISTED` — assertions stay byte-identical because `DEFAULT_PERSISTED` equals the v2.0 production defaults (proves PREFS-03 default-wins half)
- **Per-commit green-gate held** — tsc, lint, vitest, build all clean on every commit

## Task Commits

Each task was committed atomically (TDD where the test+source split is meaningful):

1. **Task 1 RED — failing tests for exported `*_FLAG` consts** — `3126b56` (test)
2. **Task 1 GREEN — export the 4 `*_FLAG` specs + add `readQueryFeatureFlagOrNull`** — `60d2d77` (feat)
3. **Task 2 — `readFeatureFlags` becomes 2-arg + 4-way resolver tests + transitional bridge in `useFeatureFlags.ts`** — `4a0e9c9` (feat)

**Plan metadata commit:** to be created with this SUMMARY.

_Task 2 was a single commit by plan design — the resolver signature change and the test-callsite migration must land together because either alone breaks compilation in the test file (PLAN.md Task 2 `<action>`)._

## Files Created/Modified

- `src/featureFlags.ts` — `readFeatureFlags` signature now `(search: string, persisted: FeatureFlags): FeatureFlags`; new private `readQueryFeatureFlagOrNull<T>` helper (returns `null` for absent/invalid); 4 `*_FLAG` consts are now `export const`. `parseQueryBoolean`, `readQueryFeatureFlag`, the `FeatureFlags` interface, and every alias-table body are byte-identical (no incidental refactor).
- `src/featureFlags.test.ts` — new top-level `DEFAULT_PERSISTED: FeatureFlags` constant; 22 existing `readFeatureFlags(search)` calls updated to `readFeatureFlags(search, DEFAULT_PERSISTED)`; new 4-test `describe('exported *_FLAG specs (Phase 47 D-02/D-03 DRY)')` block; new 5-test `describe('readFeatureFlags 4-way resolver (Phase 47 D-05/D-06/D-07)')` block. `describe('parseQueryBoolean')` and `describe('readQueryFeatureFlag')` blocks untouched.
- `src/hooks/useFeatureFlags.ts` — transitional `PRODUCTION_DEFAULTS: FeatureFlags` literal passed as the 2nd arg to `readFeatureFlags(search, PRODUCTION_DEFAULTS)`. **Byte-identical runtime behaviour vs. the prior 1-arg form** because the literal equals the v2.0 defaults. Plan 03 replaces this literal with `loadPrefs()` for the slim flag projection.

## Decisions Made

- **Bridge `useFeatureFlags.ts` in Plan 01 (not Plan 03)** — the resolver signature change would otherwise break the project build immediately (Plan 01 verification requires `npx tsc --noEmit` exit 0). The bridge passes v2.0 production defaults so runtime is byte-identical and Plan 03 simply swaps the literal for `loadPrefs()` in one line. This is the smallest change that keeps the green-gate invariant and respects D-08 (`useFeatureFlags.ts` is the only non-test caller).

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 3 - Blocking] Bridge useFeatureFlags.ts to the 2-arg resolver to keep tsc green**
- **Found during:** Task 2 (signature change to `readFeatureFlags`)
- **Issue:** The plan's `<objective>` says `useFeatureFlags.ts` "will still compile after this plan because the new second parameter accepts a FeatureFlags," but a required (non-optional) `persisted: FeatureFlags` parameter means the single existing 1-arg call site fails compilation. Plan 01 verification requires `npx tsc --noEmit` exit 0.
- **Fix:** Added a `PRODUCTION_DEFAULTS: FeatureFlags` literal in `src/hooks/useFeatureFlags.ts` and passed it as the second argument. The literal's field values equal the v2.0 production defaults (`switcherIcon: false`, `breathingShape: 'orb-halo'`, `orbIdle: 'ambient'`, `ringCue: 'progress-arc'`) — so runtime behaviour is byte-identical to the prior 1-arg form (D-06 default-wins half). Plan 03 will replace this literal with `loadPrefs()` per D-08; the change is a one-line swap.
- **Files modified:** `src/hooks/useFeatureFlags.ts`
- **Verification:** `npx tsc --noEmit` exits 0; full `npx vitest run` 1183/1183 pass; vite production build succeeds.
- **Committed in:** `4a0e9c9` (Task 2 commit)

**2. [Workflow note] TDD RED commit only for Task 1; Task 2 is a single GREEN commit by plan design**
- **Found during:** Task 2 planning
- **Issue:** Task 1's RED phase (test for the new exports) is meaningful and committable. Task 2's "two file edits" are signature change + 22 test-callsite migrations + 5 new tests — the plan author explicitly says "both must land in this task because the signature change in `readFeatureFlags` would break every call site in the test file" (the test file would not compile if the new resolver tests existed but the implementation didn't).
- **Fix:** Followed the plan as written — Task 2 is one atomic commit covering source + tests. The 5 new resolver tests conceptually constitute the RED expectation (D-07 invalid-query-falls-through-to-persisted explicitly fails the old implementation), and the source change is the GREEN.
- **Files modified:** N/A (workflow note)
- **Verification:** Plan 02 acceptance criteria all met (see "Verification" below).
- **Committed in:** N/A (workflow note)

---

**Total deviations:** 1 auto-fixed (Rule 3 - blocking compile error in `useFeatureFlags.ts`) + 1 workflow note (single-commit TDD for Task 2 per plan author's explicit guidance)
**Impact on plan:** No scope creep. The bridge fix is the minimum viable change required by the plan's own `<verification>` step (`npx tsc --noEmit` exit 0). Plan 03's scope is preserved — its job is still to wire `loadPrefs()` into `useFeatureFlags.ts`; the bridge is a one-line swap there.

## Verification

All plan-level `<verification>` and `<success_criteria>` items pass:

- `npx vitest run src/featureFlags.test.ts` exits 0 — **49/49 tests pass** (was 40 pre-plan; +4 from Task 1 exported-FLAG tests; +5 from Task 2 4-way resolver tests).
- Full `npx vitest run` exits 0 — **1183/1183 tests pass** across 108 files (was 1178; +5 new tests; no regression elsewhere).
- `npx tsc --noEmit` exits 0 — the new 2-arg signature, new exports, and `useFeatureFlags.ts` bridge all type-check.
- `npx eslint .` clean — Reason-annotated disable in Task 1 was removed in Task 2 when the consumer landed.
- `vite build` succeeds (worktree note: ran via main-repo `vite` binary; the worktree has no own `node_modules` so the `npm run build` script's relative path `./node_modules/vite/bin/vite.js` fails — this is a worktree-isolation artifact, not a code defect; the underlying `tsc -b && vite build` chain is green).
- `grep -c "readFeatureFlags(search)" src/featureFlags.ts` = 0 (no 1-arg form remains in source).
- `grep -nE "(spiritual-eye|kuthasta|star|orb-halo|orb\b|halo\b|minimal-rings|minimal\b|rings\b|outer-inner|production|progress-arc|progress\b|arc\b|south\b|still\b|ambient\b)" src/featureFlags.ts` returns 17 lines — alias tables byte-identical with pre-plan state.
- `grep -c "readQueryFeatureFlagOrNull(search," src/featureFlags.ts` = 4 (one per field in the new resolver body).
- `describe('parseQueryBoolean')` (lines 14-37) and `describe('readQueryFeatureFlag')` (lines 191-203) blocks in the test file are untouched.

## Threat-Model Summary

All Plan 01 threats remain `accept` per the plan's `<threat_model>`. **Preserved mitigations:**

- The existing parser narrowing at `BREATHING_SHAPE_FLAG.parse`, `ORB_IDLE_FLAG.parse`, `RING_CUE_FLAG.parse`, and `parseQueryBoolean` is the trust boundary that converts a raw `string` into a typed union member — Phase 47 Plan 01 modified zero parser bodies. Only the call-site fallback target changed (D-07: invalid → persisted instead of invalid → default).
- No `STATE_VERSION` bump, no `readEnvelope` / `writeEnvelope` touch — Plan 01 does not touch the storage envelope at all.
- No new third-party imports; no `eval` / `Function` / dynamic-key access introduced.

No new threats discovered during execution.

## Issues Encountered

None. The Rule 3 bridge fix was anticipated as soon as Task 2's signature change required tsc to stay green; it was resolved inline within Task 2's commit.

## User Setup Required

None — no external service configuration required.

## Next Phase Readiness

- **Plan 02 (storage/prefs.ts)** can now `import { SWITCHER_ICON_FLAG, BREATHING_SHAPE_FLAG, ORB_IDLE_FLAG, RING_CUE_FLAG, type BreathingShapeVariant, type OrbIdleBehavior, type RingCueStyle } from '../featureFlags'` and build `DEFAULT_PREFS` + the four `coerce*` functions per D-02/D-03 DRY without duplicating any alias table or default value.
- **Plan 03 (`useFeatureFlags.ts`)** can swap the transitional `PRODUCTION_DEFAULTS` literal for `loadPrefs()` (slim 4-flag projection) and add the two listener effects (cross-tab `storage` event + same-tab `hrv:prefs-changed` CustomEvent with the 4-key filter from PATTERNS.md `useFeatureFlags.ts` §). The resolver contract on the receiving side is fully in place.

## Self-Check

**Files exist:**
- `src/featureFlags.ts` — FOUND
- `src/featureFlags.test.ts` — FOUND
- `src/hooks/useFeatureFlags.ts` — FOUND
- `.planning/phases/47-persistable-feature-flag-preferences/47-01-SUMMARY.md` — FOUND (this file)

**Commits exist:**
- `3126b56` (test RED for Task 1) — FOUND
- `60d2d77` (feat GREEN for Task 1) — FOUND
- `4a0e9c9` (feat for Task 2) — FOUND

## Self-Check: PASSED

---
*Phase: 47-persistable-feature-flag-preferences*
*Completed: 2026-05-26*
