---
phase: 47-persistable-feature-flag-preferences
plan: 04
subsystem: hooks
tags: [react, hooks, prefs, feature-flags, vitest, choice-hooks, picker-side]

# Dependency graph
requires:
  - phase: 47-persistable-feature-flag-preferences
    plan: 02
    provides: "8-field UserPrefs interface + loadPrefs/savePrefs round-trip — Plan 04 imports both for the picker-side setters and the envelope-merge contract"
provides:
  - "useBreathingShapeChoice — picker-side hook for breathingShape (loadPrefs seed + savePrefs spread-merge + hrv:prefs-changed dispatch with detail.key === 'breathingShape')"
  - "useRingCueChoice — picker-side hook for ringCue (same shape; detail.key === 'ringCue')"
  - "useOrbIdleChoice — picker-side hook for orbIdle (same shape; detail.key === 'orbIdle')"
  - "useSwitcherIconChoice — picker-side hook for switcherIcon (boolean variant; no type import; detail.key === 'switcherIcon')"
  - "Stable setter identity contract (useCallback empty deps) — Phase 48 pickers can use the setter as a stable onChange prop without churn"
affects: [48-appearance-page]

# Tech tracking
tech-stack:
  added: []
  patterns:
    - "Picker-side choice-hook paste-and-rename of useTimbreChoice (D-09): useState lazy seed from loadPrefs().<field> + useCallback([]) setter doing fresh loadPrefs → savePrefs({ ...current, <field>: next }) → setState → dispatchEvent"
    - "Per-flag CustomEvent detail.key contract (D-10): same event name ('hrv:prefs-changed'), field-specific detail.key so Plan 03's useFeatureFlags listener filters on the 4-key set without colliding with the 4 existing pickers (theme/timbre/cue/locale)"
    - "Boolean choice-hook variant (no type import; useState<boolean> explicit generic): primitive type swap of the string-union template; CustomEvent detail.value typed as boolean"

key-files:
  created:
    - "src/hooks/useBreathingShapeChoice.ts (21 lines) — picker-side hook for breathingShape; setter dispatches detail.key === 'breathingShape'"
    - "src/hooks/useRingCueChoice.ts (21 lines) — picker-side hook for ringCue; setter dispatches detail.key === 'ringCue'"
    - "src/hooks/useOrbIdleChoice.ts (21 lines) — picker-side hook for orbIdle; setter dispatches detail.key === 'orbIdle'"
    - "src/hooks/useSwitcherIconChoice.ts (20 lines) — picker-side hook for switcherIcon (boolean); setter dispatches detail.key === 'switcherIcon' with boolean value"
    - "src/hooks/useBreathingShapeChoice.test.ts (116 lines) — 6 it() cases: initial state / optimistic update / write-through / 8-field envelope-merge preservation / CustomEvent dispatch / setter identity stability"
    - "src/hooks/useRingCueChoice.test.ts (116 lines) — same 6 cases for ringCue"
    - "src/hooks/useOrbIdleChoice.test.ts (116 lines) — same 6 cases for orbIdle"
    - "src/hooks/useSwitcherIconChoice.test.ts (116 lines) — same 6 cases for switcherIcon (boolean detail.value assertion)"
  modified: []

key-decisions:
  - "Field-specific top-of-file comment per hook citing D-09 + naming the analog (useTimbreChoice). Keeps the four new files self-documenting without recreating the full 22-line header from useTimbreChoice.ts — that header's history (Phase 18 D-08, Phase 14 D-17, MDN-documented Pitfall 4) is referenced by the cited decisions in PLAN.md / CONTEXT.md / PATTERNS.md rather than duplicated four times."
  - "useSwitcherIconChoice uses an explicit useState<boolean> generic. PATTERNS.md called this out to prevent TS inferring from a literal true/false default — applied verbatim."
  - "Each test file pre-seeds the envelope-merge contract test with non-default values across all 8 fields (theme: 'dark', timbre: 'bell', cue: 'arrow', locale: 'pt-BR', plus all 4 Phase-47 flags at non-default values) so the 7-sibling-preservation assertion is the maximal proof: every field could have moved, only the one under test did."
  - "Did NOT extract a FeatureFlagChoice<T> abstraction. The four hooks are independent today (mirrors the precedent of useThemeChoice / useTimbreChoice / useCueChoice / useLocaleChoice — each also independent). Per CONTEXT D-09 Claude's Discretion."

patterns-established:
  - "Picker-side choice-hook 4-step contract (D-09 verbatim): (1) fresh loadPrefs() read; (2) savePrefs spread-merge; (3) setState BEFORE dispatchEvent (optimistic UI); (4) field-specific CustomEvent dispatch. The order matters — picker re-renders before any listener round-trips."
  - "Test file 6-case suite for picker-side choice hooks: initial-state / optimistic-update / write-through / 8-field envelope-merge preservation / CustomEvent dispatch / setter-identity-stability. Drop-in template for future picker-side hooks."

requirements-completed: [PREFS-03]

# Metrics
duration: ~9min
completed: 2026-05-26
---

# Phase 47 Plan 04: Picker-side choice hooks for the 4 feature flags Summary

**Four 20-line picker-side hooks (`useBreathingShapeChoice` / `useRingCueChoice` / `useOrbIdleChoice` / `useSwitcherIconChoice`) — each a paste-and-rename of `useTimbreChoice` that seeds local state from `loadPrefs().<field>`, writes through `savePrefs({ ...current, <field>: next })` to preserve the 7 sibling prefs fields per Phase 14 D-17, and dispatches `hrv:prefs-changed` with a field-specific `detail.key` per D-10 — closes the PREFS-03 setter-API half. Phase 48 will bind these to its Appearance pickers; Phase 47 ships them as data-layer plumbing only, no UI surface (D-12).**

## Performance

- **Duration:** ~9 min
- **Started:** 2026-05-26T03:53Z (worktree spawn)
- **Completed:** 2026-05-26T04:02Z
- **Tasks:** 2 (Task 1 = create 4 source files; Task 2 = create 4 test files)
- **Files created:** 8 (4 source + 4 test); 0 modified
- **LOC added:** 547 total (83 source + 464 test)

## Accomplishments

- **D-09 paste-and-rename held verbatim** — each of the four new hooks is structurally identical to `useTimbreChoice.ts:24-49` with only the field name, the union type, and the `detail.key` string substituted. No new abstraction introduced; the four hooks are independent (mirrors the precedent of `useThemeChoice`/`useTimbreChoice`/`useCueChoice`/`useLocaleChoice`).
- **D-10 per-flag detail.key contract enforced** — `useBreathingShapeChoice` dispatches `detail.key === 'breathingShape'`; `useRingCueChoice` dispatches `'ringCue'`; `useOrbIdleChoice` dispatches `'orbIdle'`; `useSwitcherIconChoice` dispatches `'switcherIcon'`. Plan 03's `useFeatureFlags` listener filters on the 4-key set (per the listener implementation that landed in the parallel Wave 3 plan); the 4 existing pickers (theme/timbre/cue/locale) ignore these keys via their existing equality filters.
- **D-12 no-UI-surface constraint held** — the four hooks are pure data-layer plumbing. No picker UI, no Appearance page, no `window.__hrvPrefs`, no `?devPrefs=1` overlay. Phase 48 will bind these to its Appearance pickers; Phase 47 proves them via Vitest only.
- **Phase 14 D-17 envelope-merge contract proven against the 8-field UserPrefs** — each of the four test files has a dedicated `envelope merge contract (8-field UserPrefs)` test that pre-seeds an envelope with non-default values across ALL 8 fields (theme/timbre/cue/locale + the 4 Phase-47 flags), calls the setter, then asserts ALL 7 sibling fields are preserved verbatim AND the field-under-test moved to the new value. This is the critical proof that the spread-merge form `{ ...current, <field>: next }` correctly preserves all 7 siblings against the post-Plan-02 8-field shape.
- **Boolean variant honored** — `useSwitcherIconChoice.ts` has no type import (`boolean` is a primitive), uses an explicit `useState<boolean>` generic to prevent TS inferring from a literal default, and its CustomEvent dispatches `detail.value` typed as `boolean` (test asserts `event.detail.value === true` against the boolean, not a string).
- **Setter identity stability proven** — each test file has an `identity is stable across re-renders` test that captures the initial setter reference, calls `rerender()`, and asserts identity equality. Proves the `useCallback([])` contract per `useTimbreChoice.ts:34`.
- **24 new test cases (6 × 4) all pass** — `npx vitest run` for the four new test files reports 24/24 in 513 ms.
- **Full suite green** — `npx vitest run` (all 112 test files) reports 1234/1234 pass (was 1210 at Plan 02 close; +24 from this plan; no regression in `useTimbreChoice.test.ts` / `useFeatureFlags.test.ts` / `prefs.test.ts` / any other suite).
- **Per-commit green-gate held** — `npx tsc --noEmit` exits 0; `npx eslint` on all 8 new files exits 0 (no new lint debt); per-commit invariant preserved on both commits.

## Task Commits

Each task committed atomically:

1. **Task 1 — feat: four new picker-side choice hook source files** — `18fe10b` (feat)
2. **Task 2 — test: 24 new vitest cases covering the four hooks (6 per hook)** — `4f8fffa` (test)

**Plan metadata commit:** to be created with this SUMMARY.

## Files Created

### `src/hooks/useBreathingShapeChoice.ts` (created, 21 lines)

- Top-of-file comment cites Phase 47 Plan 04 (D-09) and names `useTimbreChoice` as the analog.
- Imports: `useCallback`, `useState` from `'react'`; `loadPrefs`, `savePrefs` from `'../storage/prefs'`; `type BreathingShapeVariant` from `'../featureFlags'`.
- Export: `useBreathingShapeChoice(): { breathingShape: BreathingShapeVariant; setBreathingShape: (next: BreathingShapeVariant) => void }`.
- Body: `useState<BreathingShapeVariant>(() => loadPrefs().breathingShape)`; `useCallback([], ...)` setter performs fresh `loadPrefs()` → `savePrefs({ ...current, breathingShape: next })` → `setBreathingShapeState(next)` → `window.dispatchEvent(new CustomEvent('hrv:prefs-changed', { detail: { key: 'breathingShape', value: next } }))`.

### `src/hooks/useRingCueChoice.ts` (created, 21 lines)

- Same shape with `RingCueStyle` from `'../featureFlags'`; `detail.key === 'ringCue'`.

### `src/hooks/useOrbIdleChoice.ts` (created, 21 lines)

- Same shape with `OrbIdleBehavior` from `'../featureFlags'`; `detail.key === 'orbIdle'`.

### `src/hooks/useSwitcherIconChoice.ts` (created, 20 lines)

- No type import (`boolean` is a primitive); explicit `useState<boolean>` generic; `detail.key === 'switcherIcon'`; CustomEvent detail.value is a `boolean`.

### `src/hooks/useBreathingShapeChoice.test.ts` (created, 116 lines)

- 6 `it()` cases inside `describe('useBreathingShapeChoice')`:
  - `initial state matches loadPrefs().breathingShape when localStorage is pre-seeded` — seeds `'spiritual-eye'`, asserts mount-time value.
  - `setBreathingShape updates local state optimistically` — seeds `'orb-halo'`, calls setter inside `act()`, asserts `result.current.breathingShape === 'spiritual-eye'`.
  - `setBreathingShape writes the new value to disk via savePrefs` — seeds `'orb-halo'`, calls `setBreathingShape('minimal-rings')`, parses `localStorage[STATE_KEY]`, asserts `raw.prefs.breathingShape === 'minimal-rings'`.
  - `setBreathingShape preserves all other 7 prefs fields — envelope merge contract (8-field UserPrefs)` — seeds an 8-field envelope with non-default values across ALL 8 fields, calls the setter, asserts: `raw.prefs.breathingShape === 'spiritual-eye'` AND `raw.prefs.theme === 'dark'` AND `raw.prefs.timbre === 'bell'` AND `raw.prefs.cue === 'arrow'` AND `raw.prefs.locale === 'pt-BR'` AND `raw.prefs.ringCue === 'outer-inner'` AND `raw.prefs.orbIdle === 'still'` AND `raw.prefs.switcherIcon === true`.
  - `setBreathingShape dispatches hrv:prefs-changed CustomEvent with correct detail shape` — attaches a `vi.fn()` spy, calls the setter, asserts `spy.toHaveBeenCalledTimes(1)`, `event instanceof CustomEvent`, `event.detail.key === 'breathingShape'`, `event.detail.value === 'spiritual-eye'`.
  - `setBreathingShape identity is stable across re-renders (useCallback empty deps contract)` — captures initial setter reference, calls `rerender()`, asserts identity equality.

### `src/hooks/useRingCueChoice.test.ts` (created, 116 lines)

- Same 6 cases for `ringCue`. Envelope-merge test seeds `ringCue: 'progress-arc'` + all sibling non-defaults, sets to `'outer-inner'`, asserts all 7 siblings preserved (including `breathingShape: 'spiritual-eye'`, `orbIdle: 'still'`, `switcherIcon: true`).

### `src/hooks/useOrbIdleChoice.test.ts` (created, 116 lines)

- Same 6 cases for `orbIdle`. Envelope-merge test seeds `orbIdle: 'ambient'` + all sibling non-defaults, sets to `'still'`, asserts all 7 siblings preserved.

### `src/hooks/useSwitcherIconChoice.test.ts` (created, 116 lines)

- Same 6 cases for `switcherIcon`. Envelope-merge test seeds `switcherIcon: false` + all sibling non-defaults, sets to `true`, asserts all 7 siblings preserved. CustomEvent assertion casts to `CustomEvent<{ key: string; value: boolean }>` and asserts `event.detail.value === true` (boolean, not string).

## Decisions Made

- **Per-hook field-specific top-of-file comment, NOT a copy of the full 22-line `useTimbreChoice.ts` header.** The new files cite D-09 + D-10 + the analog name in a single line. The original 22-line header's content (Phase 18 D-08 rationale, MDN-documented Pitfall 4, optimistic-UI rationale) is captured in CONTEXT.md / PATTERNS.md / PLAN.md and referenced via the cited decisions — duplicating it 4× would be `[[feedback_no_design_locking]]` violation at the comment layer.
- **`useSwitcherIconChoice` uses explicit `useState<boolean>` generic.** PATTERNS.md called this out as a defensive measure against TS inferring from a literal `true` or `false` default. Applied verbatim. `loadPrefs().switcherIcon` is already typed as `boolean` so inference would be correct here today, but the explicit generic is the durable form.
- **Envelope-merge test seeds non-default values across ALL 8 fields, not just the 4 Phase-47 flags.** This is the maximal proof: any sibling could have moved, only the one under test did. The plan's `<acceptance_criteria>` requires `grep -nE "raw\.prefs\.(theme|timbre|cue|locale)\)\.toBe"` returns at least 4 lines AND `grep -nE "raw\.prefs\.(breathingShape|ringCue|orbIdle|switcherIcon)\)\.toBe"` returns at least 4 lines — the implementation returns 4 and 5 (3 siblings + field-under-test in envelope-merge test + write-through test = 5), exceeding both gates.
- **No `FeatureFlagChoice<T>` abstraction extracted.** Per CONTEXT D-09 Claude's Discretion, the four existing choice hooks (`useThemeChoice` / `useTimbreChoice` / `useCueChoice` / `useLocaleChoice`) are independent today — extracting an abstraction across 4+4=8 hooks would lock in a shape that the next picker hook might not fit. Paste-and-rename preserves the per-hook flexibility.

## Deviations from Plan

None. Plan executed exactly as written. Both tasks landed verbatim from the action specifications; all per-task acceptance criteria pass; plan-level verification passes; full suite green at 1234/1234 with no regressions.

## Verification

All plan-level `<verification>` and `<success_criteria>` items pass:

- `npx vitest run src/hooks/useBreathingShapeChoice.test.ts src/hooks/useRingCueChoice.test.ts src/hooks/useOrbIdleChoice.test.ts src/hooks/useSwitcherIconChoice.test.ts` exits 0 — **24/24 tests pass** (6 per hook × 4 hooks).
- `npx vitest run` (full suite) exits 0 — **1234/1234 tests pass** across 112 files (was 1210 after Phase 47 Plan 02; +24 from this plan). No regression in `useTimbreChoice.test.ts` / `useFeatureFlags.test.ts` / `prefs.test.ts` / any other suite that consumes the prefs envelope or the choice-hook pattern.
- `npx tsc --noEmit` exits 0 — the four new hooks type-check against `BreathingShapeVariant` / `RingCueStyle` / `OrbIdleBehavior` / `boolean` from the post-Plan-01 / Plan-02 surface; the four new test files type-check against the 8-field `UserPrefs`.
- `npx eslint` on the 8 new files exits 0 — no new lint debt; the 4 verbatim `// eslint-disable-next-line @typescript-eslint/no-non-null-assertion` comments come from the `useTimbreChoice.test.ts` template and are annotated with a `Reason:` comment per the v1.0.1 D-04 policy.
- `grep -cE "^export function use(BreathingShape|RingCue|OrbIdle|SwitcherIcon)Choice" src/hooks/useBreathingShapeChoice.ts src/hooks/useRingCueChoice.ts src/hooks/useOrbIdleChoice.ts src/hooks/useSwitcherIconChoice.ts | awk -F: '{ s+=$2 } END { print s }'` returns **4** (one per file).
- `grep -cE "useEffect" src/hooks/useBreathingShapeChoice.ts src/hooks/useRingCueChoice.ts src/hooks/useOrbIdleChoice.ts src/hooks/useSwitcherIconChoice.ts | awk -F: '{ s+=$2 } END { print s }'` returns **0** (write-only hooks; no listeners — listening for storage / hrv:prefs-changed events is the App-side `useFeatureFlags` hook's job, per Plan 03).

Per-task acceptance criteria all pass (Task 1 = 11 grep gates + tsc; Task 2 = 9 grep gates + vitest + tsc).

## Threat-Model Summary

All Plan 04 threats hold as written in the plan's `<threat_model>`. **Preserved mitigations:**

- **T-47-04-01 Tampering / set<Field> argument type:** the TypeScript signatures `setBreathingShape: (next: BreathingShapeVariant) => void`, `setRingCue: (next: RingCueStyle) => void`, `setOrbIdle: (next: OrbIdleBehavior) => void`, `setSwitcherIcon: (next: boolean) => void` block any non-union value at the call site. Proven by tsc passing; a call like `setBreathingShape('junk')` would fail to compile.
- **T-47-04-02 Tampering / `savePrefs({ ...current, ... })` spread of fresh `loadPrefs()`:** the spread is over `loadPrefs()` which returns a typed `UserPrefs` produced by `coercePrefs` — the prototype-pollution mitigation T-14-01 / T-25-01 in `coercePrefs` (Plan 02, byte-identical to the v1.1 pattern) guarantees the spread source has no unknown keys. Mitigated transitively.
- **T-47-04-03 Spoofing / malicious script dispatches forged `hrv:prefs-changed`:** the choice hooks' `set<Field>State(next)` writes only to the hook's LOCAL state, not to disk via the event. The disk is updated only by the actual `savePrefs` call inside the setter. A forged event reaching Plan 03's `useFeatureFlags` listener triggers a fresh `loadPrefs()` read which returns the on-disk value — the forged `detail.value` is discarded. Verified by inspection (no `detail.value` consumption in the listener — covered by Plan 03's own tests).
- **T-47-04-04 Denial of Service / hook mounted 100 times:** each hook instance owns one `useState` and one `useCallback`. No `useEffect` (confirmed by grep — returns 0). No listeners attached, no leak. Bounded resource usage proportional to consumer count.

**Preserved cross-plan mitigations:**

- **Prototype-pollution mitigation T-14-01 / T-25-01** — transitively via `loadPrefs()` → `coercePrefs` (Plan 02 byte-identical).
- **Non-throwing per-field coerce-and-fallback (Phase 14 D-10 / D-17)** — transitively; any future read of the persisted blob (by Plan 03's `useFeatureFlags`, or by `useTimbreChoice` / `useThemeChoice` / etc.) goes through coercer fallback.
- **Envelope-merge contract (Phase 14 D-17 / `useTimbreChoice` precedent)** — preserved verbatim across all 4 new hooks; spread-merge form `{ ...current, <field>: next }` preserves all 7 sibling fields. Proven explicitly by the envelope-merge test in each of the 4 new test files (8-field assertion bank).
- **Per-flag `detail.key` contract (Phase 16 D-22 / D-10)** — each setter dispatches the field-specific key; Plan 03's `useFeatureFlags` listener filters on the 4-key set, and the existing `useTheme` / `useTimbre` / `useCue` / `useLocale` listeners ignore the 4 new keys (their filters check `=== 'theme'` etc.). Proven by the CustomEvent dispatch test in each of the 4 new test files asserting `event.detail.key === '<field>'` verbatim.
- **No `STATE_VERSION` bump** — these hooks write through `savePrefs`, which writes a typed `UserPrefs` into the existing `Envelope.prefs` subtree at the existing `STATE_VERSION`. No version mutation. Confirmed by inspection of `savePrefs` in `src/storage/prefs.ts:130-133` (untouched in this plan).

No new threats discovered during execution. No new attack surface introduced beyond extending the existing user-input boundary (picker → setter) from 4 fields to 8 fields — the type-system mitigation already covers arbitrary union narrowing at the call site.

## Issues Encountered

None. The plan was executable verbatim — the post-Plan-02 8-field `UserPrefs` shape and the 8-field `DEFAULT_PREFS` literal made the test seedPrefs calls drop-in compatible (the `{ ...DEFAULT_PREFS, <override> }` spread pattern auto-extends if `UserPrefs` widens further). Per-commit green-gate held throughout.

## User Setup Required

None — no external service configuration required.

## Next Phase Readiness

- **Phase 48 (Appearance page)** can now `import { useBreathingShapeChoice } from '../hooks/useBreathingShapeChoice'` (and the three siblings) and bind each setter to its respective segmented picker / toggle row. The setter identity is stable across re-renders (`useCallback([])`), so passing `setBreathingShape` directly as `onChange` does not cause picker churn.
- **Plan 03's `useFeatureFlags` listener** is already filtering on the 4-key set per the parallel Wave 3 plan; the four new hooks dispatch the field-specific `detail.key` that the listener expects. No cross-wave coordination needed beyond the shared event-name + detail-shape contract that PATTERNS.md locked.
- **Phase 47 PREFS-03 setter-API half is complete.** The other half (read-back via `useFeatureFlags`) lands in Plan 03.

## Self-Check

**Files exist:**
- `src/hooks/useBreathingShapeChoice.ts` — FOUND
- `src/hooks/useRingCueChoice.ts` — FOUND
- `src/hooks/useOrbIdleChoice.ts` — FOUND
- `src/hooks/useSwitcherIconChoice.ts` — FOUND
- `src/hooks/useBreathingShapeChoice.test.ts` — FOUND
- `src/hooks/useRingCueChoice.test.ts` — FOUND
- `src/hooks/useOrbIdleChoice.test.ts` — FOUND
- `src/hooks/useSwitcherIconChoice.test.ts` — FOUND
- `.planning/phases/47-persistable-feature-flag-preferences/47-04-SUMMARY.md` — FOUND (this file)

**Commits exist:**
- `18fe10b` (feat: Task 1 — four new picker-side choice hook source files) — FOUND
- `4f8fffa` (test: Task 2 — 24 new vitest cases covering the four hooks) — FOUND

## Self-Check: PASSED

---
*Phase: 47-persistable-feature-flag-preferences*
*Completed: 2026-05-26*
