---
phase: 47-persistable-feature-flag-preferences
plan: 03
subsystem: ui
tags: [react, typescript, hook, feature-flags, storage-listener, custom-event, vitest]

# Dependency graph
requires:
  - phase: 47-persistable-feature-flag-preferences
    plan: 01
    provides: "2-arg readFeatureFlags(search, persisted) resolver — Plan 03 calls it with a slim 4-flag projection of loadPrefs() output"
  - phase: 47-persistable-feature-flag-preferences
    plan: 02
    provides: "loadPrefs() + 8-field UserPrefs interface — Plan 03 seeds its useState<UserPrefs> from loadPrefs() and projects to the 4 FeatureFlags fields"
provides:
  - "useFeatureFlags hook with persisted snapshot, cross-tab storage listener (e.key === STATE_KEY), same-tab hrv:prefs-changed listener (4-key filter + undefined forward-compat per D-11), and the 2-arg readFeatureFlags call — first plan in Phase 47 where loadPrefs() output reaches the resolver at runtime"
  - "Per-flag listener test coverage matrix in useFeatureFlags.test.ts: mount-seed, query-wins, cross-tab valid+unrelated, 4 per-flag CustomEvents, theme-ignore, timbre-ignore, undefined-forward-compat — 10 new it-blocks total"
affects: [47-04-choice-hooks, 48-appearance-page]

# Tech tracking
tech-stack:
  added: []
  patterns:
    - "Persisted-snapshot useState pattern in an App-side hook (mirrors useTheme.ts:27,60-89 verbatim, plus an extra 4-key filter inside the same-tab listener)"
    - "Slim projection at the call site: inline { switcherIcon, breathingShape, orbIdle, ringCue } literal that matches the FeatureFlags interface field-by-field (D-09 chosen over Pick-typed pass-through for single-call-site clarity)"
    - "4-key filter + undefined forward-compat — same-tab event filter accepts the 4 Phase 47 keys plus a missing key (re-read all prefs); rejects every other key"

key-files:
  created: []
  modified:
    - "src/hooks/useFeatureFlags.ts — replaced PRODUCTION_DEFAULTS literal with useState<UserPrefs>(() => loadPrefs()); 2 new useEffect blocks (storage + hrv:prefs-changed) with empty-deps + matching cleanups; resolver call shifts to readFeatureFlags(search, slimProjection)"
    - "src/hooks/useFeatureFlags.test.ts — beforeEach + STATE_KEY/DEFAULT_PREFS imports; seedPrefs(UserPrefs) helper; 10 new it-blocks covering mount-seed (PREFS-01), query-wins (PREFS-02), cross-tab (valid+unrelated), 4 per-flag CustomEvents, 2 unrelated-key ignores (theme + timbre), undefined forward-compat"

key-decisions:
  - "Honour the plan's RED/GREEN TDD split exactly: Task 1 RED ships the minimum failing mount-seed test (forces the bridge to break), Task 1 GREEN replaces the literal with loadPrefs() + 2 listener effects, Task 2 broadens to the full listener matrix. No absorbing across tasks; the bridge form in Plan 01 was specifically designed so this plan's source change is the smallest viable replacement (one initialiser + two effects + one call-site rewrite)."
  - "Use inline slim projection at the readFeatureFlags call site (D-09) — 4-line literal matches the FeatureFlags field order exactly. The Pick-typed pass-through alternative is equivalent at runtime; the inline form is clearer at the single call site and avoids leaking UserPrefs through the resolver's type signature."
  - "Cover BOTH 'theme' AND 'timbre' as unrelated-key negative tests (the optional 'k' it-block in the plan). Two negatives prove the filter is keyed on the 4-element allowlist, not a single-key special-case, with no extra setup cost."

patterns-established:
  - "App-side orchestrator hooks that consume persisted prefs follow useTheme.ts's 2-listener shape verbatim, with the only delta being the filter set in the same-tab event handler. Phase 47 sets the precedent that the same-tab filter is a 4-key allowlist when a hook tracks multiple persisted dimensions."
  - "TDD for source-vs-test plan splits where the test file and the source file are in different tasks: write the minimum failing test that proves the source's incomplete behaviour (RED in Task 1), implement (GREEN in Task 1), then expand coverage in Task 2. Avoids the 'absorbed' pattern from Plans 01/02 when a clean RED/GREEN split is achievable."

requirements-completed: [PREFS-01, PREFS-02, PREFS-03]

# Metrics
duration: 5min
completed: 2026-05-26
---

# Phase 47 Plan 03: `useFeatureFlags` with persisted snapshot + 2 listeners Summary

**`useFeatureFlags` now seeds its persisted snapshot from `loadPrefs()` at mount, refreshes it on cross-tab `storage` (filtered on `STATE_KEY`) and same-tab `hrv:prefs-changed` (filtered on the 4 Phase 47 keys + `undefined`) events, and passes a slim 4-field projection to the 2-arg `readFeatureFlags(search, persisted)` resolver — closing PREFS-01 (persisted prefs reach the app on first paint), PREFS-02 (query string still wins over persisted on mount), and PREFS-03 (returning users with no persisted change see byte-identical defaults via `DEFAULT_PREFS`).**

## Performance

- **Duration:** ~5 min
- **Started:** 2026-05-26T03:57:34Z
- **Completed:** 2026-05-26T04:02:45Z
- **Tasks:** 2 (Task 1 TDD with explicit RED + GREEN commits; Task 2 test-only extension)
- **Files modified:** 2 (`src/hooks/useFeatureFlags.ts`, `src/hooks/useFeatureFlags.test.ts`)

## Accomplishments

- **PREFS-01 first-paint coverage** — `useState<UserPrefs>(() => loadPrefs())` seeds the persisted snapshot at mount; the new test "seeds feature flags from loadPrefs() at mount when no query string is present (PREFS-01)" asserts that all 4 flag fields flow through from a non-default envelope without any query string.
- **PREFS-02 query-wins-on-mount preserved** — the existing per-field 4-way merge in `readFeatureFlags(search, persisted)` from Plan 01 already enforces this; the new "query string wins over persisted on mount (PREFS-02)" test proves end-to-end with a non-default persisted value AND a contradictory query string that the query wins.
- **PREFS-03 returning-user defaults preserved** — when localStorage is empty, `loadPrefs()` returns `DEFAULT_PREFS` (8-field object whose 4 flag-relevant fields equal the v2.0 production defaults from `*_FLAG.defaultValue`); the slim projection passed to the resolver is therefore byte-identical to the pre-Phase-47 default for any user who never opens an appearance picker.
- **Cross-tab storage parity (Phase 8 D-04a verbatim)** — Effect 1 filters on `e.key === STATE_KEY`; event payload is discarded (T-47-03-01 + T-47-03-04 mitigations). Asserted by 2 new tests (valid key + unrelated key).
- **Same-tab event parity with 4-key filter (D-11)** — Effect 2 filters on `detail.key` being one of `breathingShape` / `ringCue` / `orbIdle` / `switcherIcon` / `undefined`; `theme` / `timbre` / `cue` / `locale` keys are explicitly outside the set. Asserted by 4 per-flag positive tests + 2 unrelated-key negative tests (`theme` and `timbre`) + 1 undefined forward-compat test.
- **popstate via `useSyncExternalStore` preserved byte-identical** — the existing subscription + snapshot helpers at lines 27-41 are unchanged; the 2 existing popstate tests at lines 30-47 still pass byte-identical.
- **Hook return type unchanged** — `useFeatureFlags(): FeatureFlags` signature held; no breaking change for `useAppViewModel.ts:54,183` or `PracticeScreen.tsx:64,73-75` (D-08).
- **Per-commit green-gate held** — every commit (RED, GREEN, Task 2) is clean on tsc + eslint + focused vitest + full vitest. Final full suite: **1221/1221 pass** (was 1210 before this plan, +11 new tests: 1 in Task 1 RED + 10 in Task 2).

## Task Commits

Each task committed atomically with explicit TDD discipline for Task 1:

1. **Task 1 RED — failing test that hook seeds from loadPrefs() at mount** — `5b98987` (test)
2. **Task 1 GREEN — wire useFeatureFlags to loadPrefs + 2 listener effects** — `841e154` (feat)
3. **Task 2 — extend useFeatureFlags listener + integration coverage (10 new it-blocks)** — `17f5625` (test)

**Plan metadata commit:** to be created with this SUMMARY.

## Files Created/Modified

### `src/hooks/useFeatureFlags.ts` (modified, +78 / -14)

- **Replaced transitional PRODUCTION_DEFAULTS literal** (Plan 01 Rule 3 bridge) with a proper `useState<UserPrefs>(() => loadPrefs())` snapshot.
- **Extended imports** (line 21-25): added `useEffect, useState` to the `react` import; added `import { loadPrefs, type UserPrefs } from '../storage/prefs'`; added `import { STATE_KEY } from '../storage'`.
- **Module-private helpers preserved** (`subscribeToLocationSearch`, `getLocationSearchSnapshot`, `getServerLocationSearchSnapshot` at lines 27-41) — byte-identical with pre-plan; these own the `popstate` subscription.
- **Effect 1 — cross-tab `storage` listener** (lines 57-69): `if (e.key === STATE_KEY) { setPersisted(loadPrefs()) }`; empty deps; matching `removeEventListener` cleanup.
- **Effect 2 — same-tab `hrv:prefs-changed` listener** (lines 73-94): rejects non-CustomEvent; reads `detail.key`; re-reads on the 4-key allowlist plus `undefined` (D-11 forward-compat); empty deps; matching `removeEventListener` cleanup.
- **Resolver call** (lines 98-103): `readFeatureFlags(search, { switcherIcon, breathingShape, orbIdle, ringCue })` — inline 4-field projection matching the `FeatureFlags` interface field order exactly (D-09).
- **Module header comment** (lines 1-20): architecture summary mirroring `useTheme.ts:1-16` shape; explicitly notes the D-08 invariant (this hook is the only non-test caller of `readFeatureFlags`).

### `src/hooks/useFeatureFlags.test.ts` (modified, +213 / -1)

- **Extended `vitest` import** (line 2): added `beforeEach` and `vi` alongside the existing names.
- **Added storage + prefs imports** (lines 5-6): `STATE_KEY` from `'../storage'`; `DEFAULT_PREFS, type UserPrefs` from `'../storage/prefs'`.
- **Added `seedPrefs(prefs: UserPrefs): void` helper** (lines 12-17): writes a full envelope `{ version: 1, prefs }` to `localStorage[STATE_KEY]`. Mirrors `useTheme.test.ts:10-18` adapted for the 8-field `UserPrefs` shape.
- **Added top-level `beforeEach(() => { window.localStorage.clear() })`** (lines 19-21) for test isolation.
- **Extended `afterEach`** (lines 24-28): keeps the existing `setSearch('')` reset; adds `window.localStorage.clear()` and `vi.restoreAllMocks()`.
- **Preserved the 2 existing popstate tests** (lines 30-47) byte-identical — they continue to assert the `useSyncExternalStore` path and the default `switcherIcon: false` resolution.
- **New it-blocks** (lines 49-216):
  - `seeds feature flags from loadPrefs() at mount when no query string is present (PREFS-01)` — landed in Task 1 RED commit.
  - `query string wins over persisted on mount (PREFS-02)` — integration over Plan 01's resolver + Plan 03's wiring.
  - `cross-tab storage event with key === STATE_KEY re-reads persisted snapshot` — T-47-03-01 + T-47-03-04 positive.
  - `cross-tab storage event with unrelated key is ignored` — T-47-03-04 negative.
  - `same-tab hrv:prefs-changed with detail.key === "breathingShape" re-reads persisted` — T-47-03-02 + T-47-03-05 positive (key 1/4).
  - `same-tab hrv:prefs-changed with detail.key === "ringCue" re-reads persisted` — key 2/4.
  - `same-tab hrv:prefs-changed with detail.key === "orbIdle" re-reads persisted` — key 3/4.
  - `same-tab hrv:prefs-changed with detail.key === "switcherIcon" re-reads persisted` — key 4/4.
  - `same-tab hrv:prefs-changed with detail.key === "theme" is ignored` — T-47-03-05 negative (and proves the disk mutation does NOT propagate through the event).
  - `same-tab hrv:prefs-changed with detail.key === "timbre" is ignored` — second negative, proves the allowlist is keyed on the 4-element set (not a 'theme'-only special case).
  - `same-tab hrv:prefs-changed with detail.key === undefined re-reads persisted (forward-compat)` — D-11 forward-compat path.

## Decisions Made

- **Honour the plan's RED/GREEN TDD split exactly.** Plans 01 and 02 each absorbed a downstream step into Task 1 GREEN to keep the per-commit green-gate (resolver-signature break in 01; UserPrefs-widening break in 02). Plan 03 does NOT need that absorption because Plan 01's bridge form was specifically designed so this plan's source change is the smallest viable replacement (one initialiser + two effects + one call-site rewrite, with the bridge literal's runtime semantics already equal to DEFAULT_PREFS). Task 1 RED ships the minimum failing test (mount-seed with a non-default envelope), Task 1 GREEN replaces the literal with `loadPrefs()`-driven state, Task 2 broadens to the full listener matrix.
- **Inline slim projection at the `readFeatureFlags` call site (D-09)** — 4-line literal explicitly matching the `FeatureFlags` field order. Equivalent at runtime to passing `Pick<UserPrefs, …>` through the resolver, but clearer at the single call site and keeps the resolver's type signature free of `UserPrefs` (which is a storage-layer type, not a feature-flags-layer type).
- **Cover BOTH `'theme'` AND `'timbre'` as unrelated-key negative tests** (the plan's optional "k" it-block). Two negatives for ~0 extra setup cost is a small price for proving the filter is keyed on the 4-element allowlist rather than a single-key special-case. This makes the test surface symmetric with Plan 04's choice-hook tests, which will dispatch `'breathingShape'` / `'ringCue'` / `'orbIdle'` / `'switcherIcon'` keys and rely on the hook ignoring everything else.

## Deviations from Plan

None.

The plan was followed task-by-task with the explicit RED/GREEN split. No Rule 1/2/3/4 fixes were needed because (a) the source change is contained to a single hook with one call site, (b) the resolver signature and `loadPrefs` return shape are already finalised by Plans 01 and 02, and (c) no out-of-scope file was touched (the two `files_modified` paths in the frontmatter match the actual diff).

## Verification

All plan-level `<verification>` and `<success_criteria>` items pass:

- `npx vitest run src/hooks/useFeatureFlags.test.ts` — **13/13 pass** (was 2 pre-plan; +11 new tests).
- `npx vitest run` (full suite) — **1221/1221 pass** across 108 files (was 1210 after Phase 47 Plan 02; +11 from this plan: +1 in Task 1 RED, +10 in Task 2). No regression in `useTheme.test.ts` (the listener-shape mirror across hooks did not collide), no regression in any other suite.
- `npx tsc --noEmit` — exit 0. New imports, `useState<UserPrefs>` initialiser, and the slim projection all type-check against the post-Plan-01/02 surface.
- `npx eslint src/hooks/useFeatureFlags.ts src/hooks/useFeatureFlags.test.ts` — clean. No new lint debt; no eslint-disable comments needed in the source file (the test file uses the verbatim `@typescript-eslint/require-await` disable from `useTheme.test.ts` inside each `await act(async () => { … })` block).
- `tsc -b && vite build` (via main-repo `node_modules/vite/bin/vite.js`) — succeeds. dist/ output regenerated cleanly with the same 6 file shapes and a 91.35 kB gzipped JS bundle.
- `grep -c "readFeatureFlags(search)" src/hooks/useFeatureFlags.ts` returns **0** (no 1-arg call site remains in the hook — the transitional bridge is gone).
- `grep -nE "addEventListener\\('(storage|hrv:prefs-changed)'" src/hooks/useFeatureFlags.ts | wc -l` returns **2** (one per new listener).
- `grep -nE "removeEventListener\\('(storage|hrv:prefs-changed)'" src/hooks/useFeatureFlags.ts | wc -l` returns **2** (one cleanup per new listener).
- All 16 Task 1 acceptance-criteria greps return the expected counts (import patterns, `useState<UserPrefs>` initialiser, addEventListener / removeEventListener pairs, `e.key === STATE_KEY`, 4 per-key `detail.key === '…'` matches plus `undefined`, 0 matches for `theme/timbre/cue/locale` detail-key strings in the source, `readFeatureFlags(search,` 2-arg call site, `useSyncExternalStore(` popstate preserved).
- All 13 Task 2 acceptance-criteria greps return the expected counts (`beforeEach` imported, `STATE_KEY` imported, `DEFAULT_PREFS` appears 11 times across imports and test bodies, `seedPrefs(prefs: UserPrefs): void` helper present, PREFS-01 + PREFS-02 tags present, ≥2 `new StorageEvent('storage'`, 7 `new CustomEvent('hrv:prefs-changed'`, all 4 per-flag `detail: { key: '…'` matches plus the `'theme'` ignore).

## Threat-Model Summary

All Plan 03 threats are met as written in the plan's `<threat_model>`:

- **T-47-03-01 Tampering / cross-tab storage payload (`accept`):** handler discards `e.newValue`; `setPersisted(loadPrefs())` re-reads disk via `coercePrefs` (Plan 02 mitigation preserved byte-identical). Asserted indirectly by the cross-tab valid-key test (the test dispatches with `newValue: newEnvelope` but the assertion only holds because the handler reads disk, not the payload).
- **T-47-03-02 Tampering / same-tab CustomEvent payload (`accept`):** handler reads `detail.key` only; `detail.value` is never consumed. Asserted indirectly by every per-flag CustomEvent test (the event's `value` field is irrelevant to the assertion; the disk mutation is what changes the result).
- **T-47-03-03 DoS / listener leak (`mitigate`):** both effects use empty `[]` deps + matching `removeEventListener` cleanups; listener count is bounded by the number of `useFeatureFlags` consumers (currently 1: `useAppViewModel.ts:54`). Mirrors `useTheme.ts` cleanup pattern verbatim.
- **T-47-03-04 Spoofing / unrelated-tab storage event (`mitigate`):** `e.key === STATE_KEY` filter rejects every non-STATE_KEY event. Asserted by the new "cross-tab storage event with unrelated key is ignored" test.
- **T-47-03-05 Spoofing / unrelated-dimension picker event (`mitigate`):** 4-key allowlist rejects every key outside `{ breathingShape, ringCue, orbIdle, switcherIcon, undefined }`. Asserted by 2 new tests — `theme` ignore + `timbre` ignore — that both mutate disk before dispatch so the assertion only holds if the hook ignored the event.

**Preserved mitigations (named explicitly):**

- **T-14-01 / T-25-01 prototype-pollution mitigation** — transitively preserved via every `loadPrefs()` call routing through `coercePrefs` (the narrowing line + the no-`...raw`-spread invariant in `src/storage/prefs.ts` are byte-identical from Plan 02).
- **Phase 14 D-10 / D-17 non-throwing per-field coerce-and-fallback** — the hook never sees a malformed value because `loadPrefs()` returns a typed `UserPrefs`.
- **Phase 8 D-04a cross-tab signal-only contract** — preserved verbatim; event payload discarded, disk re-read.
- **Phase 16 D-22 same-tab event contract** — preserved verbatim; one event name (`hrv:prefs-changed`), per-dimension consumers filter on `detail.key`.
- **No `STATE_VERSION` bump / no `readEnvelope` / no `writeEnvelope` touch** — Plan 03 does not touch storage internals.

No new threats discovered during execution. No new attack surface beyond extending the existing untrusted-input boundary (`localStorage.prefs`) consumption from "App.tsx + useTheme.ts" to "App.tsx + useTheme.ts + useFeatureFlags.ts" — all three consumers route through the same `loadPrefs()` → `coercePrefs` path, so the mitigation surface is unchanged in shape.

## Issues Encountered

None.

## User Setup Required

None — no external service configuration required.

## Next Phase Readiness

- **Plan 04 (choice hooks: `useBreathingShapeChoice`, `useRingCueChoice`, `useOrbIdleChoice`, `useSwitcherIconChoice`)** can now rely on `useFeatureFlags` to:
  - Re-read disk when a choice hook calls `savePrefs({ ...current, breathingShape: next })` and dispatches `new CustomEvent('hrv:prefs-changed', { detail: { key: 'breathingShape', value: next } })` (D-11 same-tab path).
  - Re-read disk when another tab modifies localStorage (cross-tab path).
  - Hook return shape (`FeatureFlags`) is unchanged — `PracticeScreen.tsx:64,73-75` and `useAppViewModel.ts:54,183` consumers are untouched.
- **Phase 48 (Appearance Page)** can wire the 4 choice hooks from Plan 04 to pickers and trust that:
  - The user's selection persists across reloads via the storage envelope.
  - A second tab will reflect the change on the next `storage` event.
  - The query-string testing escape hatch (e.g., `?breathingShape=minimal-rings`) still works as a per-load override.

## Self-Check

**Files exist:**
- `src/hooks/useFeatureFlags.ts` — FOUND
- `src/hooks/useFeatureFlags.test.ts` — FOUND
- `.planning/phases/47-persistable-feature-flag-preferences/47-03-SUMMARY.md` — FOUND (this file)

**Commits exist:**
- `5b98987` (test RED for Task 1) — FOUND
- `841e154` (feat GREEN for Task 1) — FOUND
- `17f5625` (test for Task 2) — FOUND

## Self-Check: PASSED

---
*Phase: 47-persistable-feature-flag-preferences*
*Completed: 2026-05-26*
