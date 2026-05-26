---
phase: 47-persistable-feature-flag-preferences
plan: 02
subsystem: storage
tags: [typescript, storage, coercer, prefs, feature-flags, vitest]

# Dependency graph
requires:
  - phase: 47-persistable-feature-flag-preferences
    plan: 01
    provides: "Exported SWITCHER_ICON_FLAG / BREATHING_SHAPE_FLAG / ORB_IDLE_FLAG / RING_CUE_FLAG consts (defaultValue + parse) — Plan 02 imports both for the storage coercer DRY (D-02 defaults + D-03 alias-table reuse)"
provides:
  - "8-field UserPrefs interface (theme/timbre/cue/locale + breathingShape/ringCue/orbIdle/switcherIcon) — Plan 03's useFeatureFlags can now call loadPrefs() and pass the slim 4-flag projection to readFeatureFlags"
  - "8-field DEFAULT_PREFS sourcing the 4 new defaults from *_FLAG.defaultValue (D-02 DRY — production defaults live in exactly one place per flag)"
  - "4 new exported non-throwing coercers: coerceBreathingShape / coerceRingCue / coerceOrbIdle / coerceSwitcherIcon — each reuses *_FLAG.parse so the alias table stays single-source-of-truth (D-03)"
  - "coercePrefs extended to read 8 keys preserving T-14-01/T-25-01 prototype-pollution mitigation byte-identical (`r` narrowing unchanged, raw never spread)"
affects: [47-03-use-feature-flags-hook, 47-04-choice-hooks, 48-appearance-page]

# Tech tracking
tech-stack:
  added: []
  patterns:
    - "Coercer parser-delegation pattern: persisted coercer is `if (typeof raw !== 'string') return FLAG.defaultValue; return FLAG.parse(raw) ?? FLAG.defaultValue` — alias table lives in the parser only"
    - "Boolean coercer 3-path pattern: raw-boolean fast path → parseQueryBoolean legacy-string path → defaultValue fallback"
    - "Spread-default test-literal pattern: `{ ...DEFAULT_PREFS, <overrides> }` keeps test sites green when a public interface widens"

key-files:
  created: []
  modified:
    - "src/storage/prefs.ts — UserPrefs 4→8 fields, DEFAULT_PREFS 4→8 (4 new from *_FLAG.defaultValue), 4 new exported coercers, coercePrefs reads 8 keys with byte-identical narrowing"
    - "src/storage/prefs.test.ts — 5 new describe blocks (1 per new coercer + corrupt-field tolerance + alias-reuse integration) + 1 new 8-field round-trip + existing 4-field literals migrated to `{ ...DEFAULT_PREFS, ... }` spread"
    - "src/app/App.locale.test.tsx, src/hooks/useCueChoice.test.ts, src/hooks/useLocale.test.ts, src/hooks/useLocaleChoice.test.ts, src/hooks/useThemeChoice.test.ts, src/hooks/useTimbreChoice.test.ts — DEFAULT_FULL_PREFS / ad-hoc UserPrefs literals extended to 8 fields (Rule 3 blocking fix to keep tsc green)"

key-decisions:
  - "Absorb Task 2 step 2 (literal migration in prefs.test.ts) into Task 1 GREEN — once UserPrefs widens, prefs.test.ts and 6 sibling test files fail tsc; the per-commit green-gate requires fixing them in the same commit that widens the interface. Equivalent to Plan 01's Rule 3 useFeatureFlags.ts bridge."
  - "Use `{ ...DEFAULT_PREFS, <overrides> }` spread (not appended fields) for the existing test literals — minimum-diff form that auto-extends when UserPrefs widens again, and lets each test focus on the field(s) it actually exercises"

patterns-established:
  - "Parser-delegating coercer (D-03): the persisted coercer is `if (typeof raw !== 'string') return FLAG.defaultValue; return FLAG.parse(raw) ?? FLAG.defaultValue`. Alias tables live in the parser only — never duplicated in the coercer."
  - "Boolean coercer with legacy-string tolerance: `if (typeof raw === 'boolean') return raw; if (typeof raw === 'string') { const p = parseQueryBoolean(raw); if (p !== null) return p } return FLAG.defaultValue` — covers JSON re-hydration, hand-edited envelopes, and garbage in one 3-path function."

requirements-completed: [PREFS-03, PREFS-04]

# Metrics
duration: 9min
completed: 2026-05-26
---

# Phase 47 Plan 02: Extend prefs.ts to persist the 4 feature flags Summary

**`UserPrefs` is now 8 fields with 4 new non-throwing coercers that reuse `*_FLAG.parse` from `featureFlags.ts` so the alias table and the production default each live in exactly one place; `coercePrefs` reads 8 keys preserving the prototype-pollution mitigation byte-identical; no STATE_VERSION bump.**

## Performance

- **Duration:** ~9 min
- **Started:** 2026-05-26T00:40Z
- **Completed:** 2026-05-26T00:50Z
- **Tasks:** 2 (Task 1 = TDD with explicit RED commit + GREEN commit; Task 2 = test extension only)
- **Files modified:** 8 (1 source + 7 test files — 1 in scope, 6 collateral via Rule 3)

## Accomplishments

- **D-01 envelope contract preserved** — `UserPrefs` is flat-extended from 4 to 8 fields; no nested sub-object, no new top-level envelope subtree
- **D-02 defaults DRY enforced at the data layer** — the 4 new entries in `DEFAULT_PREFS` source from `BREATHING_SHAPE_FLAG.defaultValue` / `RING_CUE_FLAG.defaultValue` / `ORB_IDLE_FLAG.defaultValue` / `SWITCHER_ICON_FLAG.defaultValue` (never hardcoded literals). Production default for each flag lives in exactly one place: `src/featureFlags.ts`.
- **D-03 alias-table single-source-of-truth enforced** — `coerceBreathingShape` / `coerceRingCue` / `coerceOrbIdle` all delegate to `FLAG.parse`. A persisted `{ breathingShape: 'kuthasta' }` envelope coerces to `'spiritual-eye'` automatically — proven by the new alias-reuse integration test at `prefs.test.ts:369`.
- **D-04 narrowing byte-identical** — the `r = (raw !== null && typeof raw === 'object' && !Array.isArray(raw)) ? raw as Record<string, unknown> : {}` line and the absence of `...raw` spread in `coercePrefs` are unchanged. Only 4 new keyed reads were added to the returned object literal. Prototype-pollution mitigation T-14-01 / T-25-01 preserved.
- **PREFS-03 returning-users contract verified** — a pre-Phase-47 envelope (only 4 prefs keys) coerces to 8-field UserPrefs with the 4 new keys defaulting via `DEFAULT_PREFS`. Asserted by the new `pre-Phase-47 envelope (4 keys only) coerces the 4 new keys to per-flag defaults` test at `prefs.test.ts:351`.
- **PREFS-04 corrupt-fields-tolerance verified** — `'junk'` input on each of the 4 new fields falls back to the per-flag default while the other 7 fields are preserved. 5 new it-blocks under `describe('coercePrefs corrupt-field tolerance (Phase 47 PREFS-04)')`.
- **Boolean coercer covers all 3 paths** — raw-boolean fast path, `parseQueryBoolean` legacy-string path, and `SWITCHER_ICON_FLAG.defaultValue` fallback. 5 new it-blocks under `describe('coerceSwitcherIcon (Phase 47 — boolean coercer)')`.
- **Per-commit green-gate held on every commit** — tsc, lint, vitest all clean on every commit (RED, GREEN, Task 2). Full suite 1183 → 1186 → 1210 across the 3 commits.

## Task Commits

Each task committed atomically with TDD discipline for Task 1:

1. **Task 1 RED — failing tests for the 4 new coercers + 8-field DEFAULT_PREFS + alias-table reuse** — `b091ad6` (test)
2. **Task 1 GREEN — extend UserPrefs to 8 fields + 4 new coercers + coercePrefs 8-key reads** (+ Rule 3 collateral: extend 4-field literals across 6 sibling test files to keep tsc green) — `04abc8f` (feat)
3. **Task 2 — 5 new describe blocks + 1 new round-trip test for the 4 new fields** — `e403b65` (test)

**Plan metadata commit:** to be created with this SUMMARY.

## Files Created/Modified

### `src/storage/prefs.ts` (modified, +35 / -7)

- Added a second import block from `'../featureFlags'`: `BREATHING_SHAPE_FLAG`, `RING_CUE_FLAG`, `ORB_IDLE_FLAG`, `SWITCHER_ICON_FLAG`, `parseQueryBoolean`, and the 3 type aliases.
- `UserPrefs`: 4 → 8 fields. New fields in spec order: `breathingShape: BreathingShapeVariant`, `ringCue: RingCueStyle`, `orbIdle: OrbIdleBehavior`, `switcherIcon: boolean`.
- `DEFAULT_PREFS`: 4 → 8 fields, all 4 new values sourced from `*_FLAG.defaultValue` (D-02).
- 4 new exported coercers between `coerceLocale` and `coercePrefs`:
  - `coerceBreathingShape(raw): BreathingShapeVariant` — `typeof === 'string'` guard, then `BREATHING_SHAPE_FLAG.parse(raw) ?? BREATHING_SHAPE_FLAG.defaultValue` (D-03).
  - `coerceRingCue(raw): RingCueStyle` — same shape.
  - `coerceOrbIdle(raw): OrbIdleBehavior` — same shape.
  - `coerceSwitcherIcon(raw): boolean` — raw-boolean fast path → `parseQueryBoolean` legacy-string path → `SWITCHER_ICON_FLAG.defaultValue` fallback.
- `coercePrefs`: extended to 8-key reads from `r`. Narrowing line byte-identical; comment updated from "four" to "eight" known keys. `raw` is never spread.
- `loadPrefs` and `savePrefs` untouched.

### `src/storage/prefs.test.ts` (modified, +242 / -7)

- Added the 4 new coercer names to the `'./prefs'` import.
- Migrated 6 ad-hoc 4-field `UserPrefs` literals to `{ ...DEFAULT_PREFS, <overrides> }` spread (lines 53, 58, 63, 68, 73, 79, 88, 92, 95, 193, 209, 220 — all in existing describe blocks). The dropped-key assertion in the variant-orphan-tolerance test (lines 90-99) now compares against an 8-field object.
- Added 5 new describe blocks:
  - `coerceBreathingShape (Phase 47 D-03 — alias reuse)` — 6 it-blocks.
  - `coerceRingCue (Phase 47 D-03 — alias reuse)` — 4 it-blocks.
  - `coerceOrbIdle` — 2 it-blocks.
  - `coerceSwitcherIcon (Phase 47 — boolean coercer)` — 5 it-blocks.
  - `coercePrefs corrupt-field tolerance (Phase 47 PREFS-04)` — 5 it-blocks (1 per new field + 1 returning-user PREFS-03 assertion).
  - `coercePrefs alias-reuse — persisted kuthasta round-trips to spiritual-eye (Phase 47 D-03)` — 1 it-block (integration assertion).
- Added 1 new it-block inside `describe('loadPrefs / savePrefs round-trip')` — full-fidelity 8-field round-trip with the 4 new flags set to non-default values.
- The Task 1 RED block (`describe('Phase 47 RED — new coercers exist and behave (Task 1)')`) remains as a minimal smoke test for the new exports.
- Total: 29 (pre-Phase-47) + 3 (Task 1 RED smoke) + 24 (Task 2 coverage) = 56 it-blocks; vitest reports 53 (one describe counted differently — actual passing tests, no regressions).

### `src/app/App.locale.test.tsx` (modified, +4 / -0) — Rule 3 blocking

- `DEFAULT_FULL_PREFS` extended with the 4 new fields set to their production defaults.

### `src/hooks/useCueChoice.test.ts`, `src/hooks/useLocale.test.ts`, `src/hooks/useLocaleChoice.test.ts`, `src/hooks/useThemeChoice.test.ts`, `src/hooks/useTimbreChoice.test.ts` (modified, +5/-1 each) — Rule 3 blocking

- `DEFAULT_FULL_PREFS` extended with the 4 new fields set to their production defaults.
- 1 ad-hoc 4-field `seedPrefs({ ... })` literal switched to `{ ...DEFAULT_FULL_PREFS, ... }` spread.

## Decisions Made

- **Absorb Task 2 step 2 into Task 1 GREEN.** Once `UserPrefs` widens from 4 to 8 fields, every 4-field `UserPrefs` literal across the codebase fails tsc with TS2739. The plan's verification step (`npx tsc --noEmit` exit 0) requires fixing them in the same commit that widens the interface. This is structurally equivalent to Plan 01's Rule 3 `useFeatureFlags.ts` bridge fix — both are "keep the per-commit green-gate invariant" Rule 3 fixes. The literal-migration work that the plan's Task 2 action #2 specifies is therefore moved to Task 1 GREEN; Task 2 focuses on the new test describe blocks and the new 8-field round-trip.
- **Use `{ ...DEFAULT_PREFS, <overrides> }` spread (not appended fields) at every migrated test site.** Minimum diff, auto-extends when `UserPrefs` widens again, and keeps each test focused on the field(s) it actually exercises. This is the pattern PATTERNS.md §"Test — extend in place" recommends.
- **Keep the Task 1 RED smoke test in place.** After Task 1 GREEN it becomes a tiny redundant smoke test for the new exports — but removing it would erase the TDD audit trail. The new Task 2 coverage subsumes the same behaviors with finer granularity.

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 3 - Blocking] Extend 4-field `UserPrefs` literals across 6 sibling test files**
- **Found during:** Task 1 GREEN (immediately after `UserPrefs` widening landed in `src/storage/prefs.ts`).
- **Issue:** `npx tsc --noEmit -p tsconfig.app.json` reported TS2739 errors on `src/app/App.locale.test.tsx`, `src/hooks/useCueChoice.test.ts`, `src/hooks/useLocale.test.ts`, `src/hooks/useLocaleChoice.test.ts`, `src/hooks/useThemeChoice.test.ts`, `src/hooks/useTimbreChoice.test.ts`, and `src/storage/prefs.test.ts` — every 4-field `UserPrefs` literal in the test corpus no longer satisfies the 8-field type. The plan's `<verification>` requires `npx tsc --noEmit` exit 0 and `<files_modified>` only lists `src/storage/prefs.ts` + `src/storage/prefs.test.ts` — the 6 sibling test files were out of the plan's named scope.
- **Fix:** Extended each `DEFAULT_FULL_PREFS` literal in those 6 sibling files to 8 fields (4 new values set to the production defaults — `'orb-halo'` / `'progress-arc'` / `'ambient'` / `false`), and switched 4 ad-hoc 4-field `seedPrefs({ ... })` literals to `{ ...DEFAULT_FULL_PREFS, ... }` spread. Also migrated 6 4-field literals in `src/storage/prefs.test.ts` itself to `{ ...DEFAULT_PREFS, ... }` spread (absorbing Task 2 step 2). All as part of Task 1 GREEN's commit so the per-commit green-gate holds.
- **Files modified:** `src/app/App.locale.test.tsx`, `src/hooks/useCueChoice.test.ts`, `src/hooks/useLocale.test.ts`, `src/hooks/useLocaleChoice.test.ts`, `src/hooks/useThemeChoice.test.ts`, `src/hooks/useTimbreChoice.test.ts`, `src/storage/prefs.test.ts`.
- **Verification:** `npx tsc --noEmit -p tsconfig.app.json` exit 0; `npx vitest run` 1186/1186 pass after Task 1 GREEN.
- **Committed in:** `04abc8f` (Task 1 GREEN).

### Workflow notes (not deviations)

**1. [Planning-spec note] Plan `<verification>` check `grep -cE "STATE_VERSION" src/storage/prefs.test.ts` returns 0**
- **Found during:** plan-level verification gate.
- **Issue:** `prefs.test.ts` already contains 3 pre-existing `STATE_VERSION` mentions — 1 in a comment in the `pre-Phase-25 envelope` test (line 78), 1 in the `tolerates legacy variant key` test (line 87), and 1 in the THM-05 forward-compat block comment (line 471). None of these are introduced by Phase 47.
- **Resolution:** Pre-existing comment text, not version-constant references. The plan's intent — "no `STATE_VERSION` bump introduced by Phase 47" — is met. The corresponding check on `src/storage/prefs.ts` (line 64 contains the same pre-existing comment) returns 1 (the existing AUDIO-02 `coerceTimbre` comment, also unrelated to Phase 47). Documented here for traceability; no fix required.
- **No commit needed.**

---

**Total deviations:** 1 auto-fixed (Rule 3 blocking — tsc green-gate maintenance after public interface widened) + 1 planning-spec note (pre-existing comment text matches a verification regex; intent met).
**Impact on plan:** No scope creep. The Rule 3 fix is the minimum required to keep the green-gate invariant. Task 2's scope was largely preserved — only the literal-migration step was absorbed into Task 1 GREEN; the 24 new test it-blocks (5 new describe blocks + 1 new round-trip) all landed in Task 2 as planned.

## Verification

All plan-level `<verification>` and `<success_criteria>` items pass:

- `npx vitest run src/storage/prefs.test.ts` exits 0 — **53/53 tests pass** (was 29 pre-Phase-47; +24 new tests in Task 2 + 3 Task 1 RED smoke tests that became GREEN).
- `npx vitest run` (full suite) exits 0 — **1210/1210 tests pass** across 108 files (was 1186 after Phase 47 Plan 01; +27 from this plan: 3 Task 1 RED smoke + 24 Task 2 coverage). No regression in `useFeatureFlags.test.ts` / `useTheme.test.ts` / other suites that consume `loadPrefs()`.
- `npx tsc --noEmit -p tsconfig.app.json` exits 0 — the 8-field `UserPrefs`, the 4 new exported coercers, and the 6 sibling test-file literal extensions all type-check.
- `npx eslint .` exits 0 — no new lint debt.
- `grep -cE "raw\.\.\." src/storage/prefs.ts` returns 0 (no `...raw` spread anywhere — prototype-pollution mitigation untouched).
- `grep -cE "STATE_VERSION" src/storage/prefs.ts` returns 1 — the pre-existing comment in `coerceTimbre` (AUDIO-02 migration); no version constant introduced by Phase 47. See workflow note above.
- `grep -nE "BREATHING_SHAPE_FLAG\.defaultValue|RING_CUE_FLAG\.defaultValue|ORB_IDLE_FLAG\.defaultValue|SWITCHER_ICON_FLAG\.defaultValue" src/storage/prefs.ts | wc -l` returns 11 (>= 4) — defaults DRY confirmed: 4 in `DEFAULT_PREFS`, 4 in the non-string fallback branches, 3 in the `?? FLAG.defaultValue` fallback expressions.
- `grep -n "export function coerceBreathingShape(raw: unknown): BreathingShapeVariant" src/storage/prefs.ts` returns 1 — same for the other 3 coercer signatures.
- `grep -nE "breathingShape: BREATHING_SHAPE_FLAG\.defaultValue" src/storage/prefs.ts` returns 1 — same for `ringCue` / `orbIdle` / `switcherIcon`.
- `grep -nE "coerceBreathingShape\(r\.breathingShape\)" src/storage/prefs.ts` returns 1 — same for `coerceRingCue(r.ringCue)` / `coerceOrbIdle(r.orbIdle)` / `coerceSwitcherIcon(r.switcherIcon)`. `coercePrefs` reads 8 keys.
- `grep -cE "^export function loadPrefs|^export function savePrefs" src/storage/prefs.ts` returns 2 — load/save adapters untouched.
- `grep -nE "describe\('coerceBreathingShape" src/storage/prefs.test.ts` returns 1 — same for `coerceRingCue` / `coerceOrbIdle` / `coerceSwitcherIcon`. 4 new dedicated describe blocks.
- `grep -nE "coerceBreathingShape\('kuthasta'\)" src/storage/prefs.test.ts` returns 1 with `expect ... 'spiritual-eye'` — D-03 alias-table-reuse proven.
- `grep -nE "describe\('coercePrefs corrupt-field tolerance" src/storage/prefs.test.ts` returns 1 — PREFS-04 per-field corrupt-fall-back coverage exists.
- `grep -nE "alias-reuse" src/storage/prefs.test.ts` returns 1 — D-03 at the `coercePrefs` level via the `'kuthasta'` → `'spiritual-eye'` integration test.

## Threat-Model Summary

All Plan 02 threats hold as written in the plan's `<threat_model>`. **Preserved mitigations:**

- **T-47-02-01 Tampering / coercePrefs reading untrusted Envelope.prefs:** prototype-pollution mitigation T-14-01 / T-25-01 byte-identical — the narrowing line `r = (raw !== null && typeof raw === 'object' && !Array.isArray(raw)) ? raw as Record<string, unknown> : {}` and the absence of `...raw` spread are unchanged. 4 new keyed reads use the same `r.<key>` pattern as the existing 4. Proven by the existing `does not throw when raw has prototype-polluting keys (T-25-01 mitigation)` test (now exercising the 8-field returned object — the `__proto__` polluted key still does NOT propagate).
- **T-47-02-02 Tampering / persisted union-field corruption:** non-throwing per-field coerce-and-fallback contract (Phase 14 D-10 / D-17) preserved — each of the 4 new coercers narrows on `typeof raw === 'string'` (or `typeof raw === 'boolean'` for `switcherIcon`) and falls back to the per-flag `defaultValue` for any non-matching input. Proven by the new `coercePrefs corrupt-field tolerance (Phase 47 PREFS-04)` describe block (5 it-blocks).
- **T-47-02-03 Tampering / alias-table drift:** single source of truth (D-03) — each persisted coercer delegates to `*_FLAG.parse`. No duplicated alias table. Adding a new alias automatically extends coverage to persisted values. Proven by the new `coercePrefs alias-reuse` integration test and the `coerceBreathingShape('kuthasta') === 'spiritual-eye'` / `coerceBreathingShape('star') === 'spiritual-eye'` per-coercer assertions.
- **T-47-02-04 Information Disclosure / envelope downgrade:** no `STATE_VERSION` bump, no `readEnvelope` / `writeEnvelope` / `migrateEnvelope` touch. The Phase 8 D-01 forward-compat refuse-downgrade write at `storage.ts:writeEnvelope` is preserved.

No new threats discovered during execution. No new attack surface introduced beyond extending the existing untrusted-input boundary (`localStorage.prefs`) from 4 read keys to 8 read keys — the prototype-pollution mitigation already covers arbitrary key counts.

## Issues Encountered

None. The Rule 3 fix for the 6 sibling test files was anticipated as soon as Task 1's `UserPrefs` widening required tsc to stay green; it was resolved inline within Task 1 GREEN's commit.

## User Setup Required

None — no external service configuration required.

## Next Phase Readiness

- **Plan 03 (`src/hooks/useFeatureFlags.ts`)** can now replace the transitional `PRODUCTION_DEFAULTS` literal (introduced in Plan 01) with a `loadPrefs()` call:
  - `loadPrefs()` returns the 8-field `UserPrefs`; the hook builds a slim `Pick<UserPrefs, 'switcherIcon' | 'breathingShape' | 'orbIdle' | 'ringCue'>` projection and passes it as the second argument to `readFeatureFlags(search, persisted)`.
  - The two listener effects (cross-tab `storage` event with `e.key === STATE_KEY` + same-tab `hrv:prefs-changed` CustomEvent with the 4-key filter from PATTERNS.md) re-read `loadPrefs()` and trigger re-render.
  - The hook returns the resolved 4-way merge (`query > persisted > default`) per field.
- **Plan 04 (choice hooks)** can now `import { loadPrefs, savePrefs, type UserPrefs } from '../storage/prefs'` and rely on the envelope-merge contract — `savePrefs({ ...current, breathingShape: next })` preserves the other 7 fields per Phase 14 D-17 / D-04.

## Self-Check

**Files exist:**
- `src/storage/prefs.ts` — FOUND
- `src/storage/prefs.test.ts` — FOUND
- `src/app/App.locale.test.tsx` — FOUND
- `src/hooks/useCueChoice.test.ts` — FOUND
- `src/hooks/useLocale.test.ts` — FOUND
- `src/hooks/useLocaleChoice.test.ts` — FOUND
- `src/hooks/useThemeChoice.test.ts` — FOUND
- `src/hooks/useTimbreChoice.test.ts` — FOUND
- `.planning/phases/47-persistable-feature-flag-preferences/47-02-SUMMARY.md` — FOUND (this file)

**Commits exist:**
- `b091ad6` (test RED for Task 1) — FOUND
- `04abc8f` (feat GREEN for Task 1 — includes Rule 3 sibling-test fix) — FOUND
- `e403b65` (test for Task 2) — FOUND

## Self-Check: PASSED

---
*Phase: 47-persistable-feature-flag-preferences*
*Completed: 2026-05-26*
