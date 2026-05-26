---
phase: 47-persistable-feature-flag-preferences
reviewed: 2026-05-26T04:31:12Z
depth: standard
files_reviewed: 20
files_reviewed_list:
  - src/featureFlags.ts
  - src/featureFlags.test.ts
  - src/hooks/useFeatureFlags.ts
  - src/hooks/useFeatureFlags.test.ts
  - src/storage/prefs.ts
  - src/storage/prefs.test.ts
  - src/hooks/useBreathingShapeChoice.ts
  - src/hooks/useBreathingShapeChoice.test.ts
  - src/hooks/useRingCueChoice.ts
  - src/hooks/useRingCueChoice.test.ts
  - src/hooks/useOrbIdleChoice.ts
  - src/hooks/useOrbIdleChoice.test.ts
  - src/hooks/useSwitcherIconChoice.ts
  - src/hooks/useSwitcherIconChoice.test.ts
  - src/app/App.locale.test.tsx
  - src/hooks/useCueChoice.test.ts
  - src/hooks/useLocale.test.ts
  - src/hooks/useLocaleChoice.test.ts
  - src/hooks/useThemeChoice.test.ts
  - src/hooks/useTimbreChoice.test.ts
findings:
  critical: 0
  warning: 4
  info: 5
  total: 9
status: issues_found
---

# Phase 47: Code Review Report

**Reviewed:** 2026-05-26T04:31:12Z
**Depth:** standard
**Files Reviewed:** 20
**Status:** issues_found

## Summary

Phase 47 promotes the four feature flags (`breathingShape`, `ringCue`, `orbIdle`, `switcherIcon`) from query-string-only into the persisted `UserPrefs` envelope, adds four paired choice hooks (`use*Choice.ts`) and extends `useFeatureFlags` with a per-field query > persisted > default resolver. Implementation is patterns-faithful: the new coercers reuse `*_FLAG.parse` (alias single-source-of-truth), `DEFAULT_PREFS` imports defaults from `featureFlags.ts` (no drift), and the choice hooks are byte-fidelity copies of `useTimbreChoice` / `useLocaleChoice`. No `STATE_VERSION` bump; envelope tolerance handles pre-Phase-47 reads.

The adversarial review found **no Critical issues**. Four Warning items concern (1) a counter-intuitive coercer behaviour where a persisted empty string flips a boolean flag to `true`, (2) `useFeatureFlags`'s `hrv:prefs-changed` filter triggering spurious re-reads on malformed event payloads, (3) an `App.locale.test.tsx` integration gap — none of the four new persisted flags are end-to-end tested through `App`, and (4) two `useFeatureFlags.test.ts` assertions where the StorageEvent payload happens to match the seeded disk state, so the "disk-is-source-of-truth" invariant is not actually proven. Five Info items cover stale comments, sloppy type assertions, and a missing test for "invalid persisted value coerces but doesn't break the resolver."

## Warnings

### WR-01: `coerceSwitcherIcon('')` returns `true` — surprising persisted-boolean semantics

**File:** `src/storage/prefs.ts:99-106`
**Issue:** `coerceSwitcherIcon` delegates to `parseQueryBoolean` for any string input. `parseQueryBoolean('')` returns `true` because empty-string is in `TRUE_QUERY_BOOLEAN_VALUES` (it models the `?switcherIcon` flag-as-presence URL idiom). When applied to a persisted JSON envelope, a stored `{ switcherIcon: "" }` (from a hand-edited file, a future-build downgrade, or any non-canonical writer) coerces to `true`. That contradicts the file-level invariant: persisted prefs are byte-for-byte round-trippable booleans, and any non-canonical value should fall to the per-flag default (which is `false`).

The risk is small in practice — the production write path serialises an actual `boolean`, so `''` never appears on disk through normal use — but the persisted coercer doesn't make a "stored value" vs "query value" distinction, and adopting parseQueryBoolean's `''` → `true` mapping in a persisted-prefs path is at minimum a Chesterton's-fence smell. There is no test exercising the `''` branch, so a future refactor could trip over it silently.

**Fix:** Either (a) special-case empty string in `coerceSwitcherIcon` to fall through to the default, or (b) skip `parseQueryBoolean` and require an actual boolean for the persisted path (the inline comment about "legacy/hand-edited string envelopes" can be removed — there is no shipped feature relying on string-encoded booleans on disk).

```ts
export function coerceSwitcherIcon(raw: unknown): boolean {
  if (typeof raw === 'boolean') return raw
  if (typeof raw === 'string' && raw !== '') {
    const parsed = parseQueryBoolean(raw)
    if (parsed !== null) return parsed
  }
  return SWITCHER_ICON_FLAG.defaultValue
}
```

Add an explicit test:

```ts
it("coerceSwitcherIcon('') falls back to default — empty-string flag-as-presence is URL-only semantics, not persisted", () => {
  expect(coerceSwitcherIcon('')).toBe(false)
})
```

---

### WR-02: `useFeatureFlags` re-reads disk on malformed `hrv:prefs-changed` payloads

**File:** `src/hooks/useFeatureFlags.ts:73-92`
**Issue:** The filter is:

```ts
const detail = e.detail as { key?: string } | null
if (
  !detail ||
  detail.key === undefined ||
  detail.key === 'breathingShape' ||
  ...
) { setPersisted(loadPrefs()) }
```

Two unintended branches:

1. **`detail === null`** triggers a re-read via `!detail`. That is presumably the "forward-compat broadcast" intent, but it is undocumented and untested. The narrative comment only mentions the `detail.key === undefined` branch (D-11).
2. **`detail` is a primitive** (`42`, `'foo'`, etc.) — `!detail` is `false` for `42`, then `(42).key === undefined` is `true`, so re-read fires. The type assertion `as { key?: string } | null` is a lie that masks this — at runtime there is no protection against `e.detail` being anything other than the documented `{ key?: string }` shape.

Functionally, every spurious re-read is harmless (`loadPrefs()` is idempotent and React bails on identical state). The cost is correctness clarity: a sibling listener that fires `new CustomEvent('hrv:prefs-changed', { detail: 'reset' })` would silently force this hook to re-read even though the contract says "key-filtered." The asymmetry where `detail: 0` does NOT re-read (because `!0` is true → early return) but `detail: 42` DOES re-read is the clearest tell that the predicate is structurally wrong, not just permissive.

**Fix:** Validate the runtime shape before destructuring:

```ts
const onPrefsChanged = (e: Event): void => {
  if (!(e instanceof CustomEvent)) return
  const raw = e.detail
  // Bare-broadcast forward-compat: an absent/null detail or an object with no `key` re-reads all prefs.
  if (raw === null || raw === undefined) {
    setPersisted(loadPrefs())
    return
  }
  if (typeof raw !== 'object') return
  const key = (raw as { key?: unknown }).key
  if (
    key === undefined ||
    key === 'breathingShape' ||
    key === 'ringCue' ||
    key === 'orbIdle' ||
    key === 'switcherIcon'
  ) {
    setPersisted(loadPrefs())
  }
}
```

Note: the same pattern exists in `useTheme.ts`, `useLocale.ts`, `useVisualCue.ts`, and `useFavicon.ts` — out of Phase 47 scope but worth a follow-up since the listener was copy-pasted.

---

### WR-03: Cross-tab `storage` event test does not prove disk-is-source-of-truth

**File:** `src/hooks/useFeatureFlags.test.ts:80-104`
**Issue:** The "cross-tab storage event with key === STATE_KEY re-reads persisted snapshot" test writes the new envelope to `localStorage` AND passes the same envelope as the `StorageEvent.newValue`. So the test can pass even if the handler trusted the event payload instead of re-reading disk. The narrative claim in the hook source (lines 54-57) is that the event is "signal only — disk is the source of truth"; the test does not falsify the opposing implementation.

The comment on line 84 ("Write the new envelope BEFORE dispatching (Pitfall 6: handler reads disk synchronously)") is accurate about why disk has to be written first, but doesn't go far enough — the test should also write a *different* value to the StorageEvent payload to prove the payload is discarded.

**Fix:** Add a divergent-payload test:

```ts
it('cross-tab storage event payload is ignored — disk is the source of truth', async () => {
  const { result } = renderHook(() => useFeatureFlags())
  // Disk says spiritual-eye; the event payload says minimal-rings.
  const diskEnvelope = JSON.stringify({ version: 1, prefs: { ...DEFAULT_PREFS, breathingShape: 'spiritual-eye' } })
  const lyingPayload  = JSON.stringify({ version: 1, prefs: { ...DEFAULT_PREFS, breathingShape: 'minimal-rings' } })
  window.localStorage.setItem(STATE_KEY, diskEnvelope)
  // eslint-disable-next-line @typescript-eslint/require-await
  await act(async () => {
    window.dispatchEvent(
      new StorageEvent('storage', { key: STATE_KEY, newValue: lyingPayload, oldValue: null }),
    )
  })
  expect(result.current.breathingShape).toBe('spiritual-eye')
})
```

The same applies to the same-tab `hrv:prefs-changed` tests (`useFeatureFlags.test.ts:127-189`) — every test seeds disk with the value it expects to see, and the dispatched `detail.value` happens to match. If a future refactor accidentally trusted `e.detail.value`, all six existing tests would still pass.

---

### WR-04: No end-to-end integration coverage that the 4 new persisted flags reach `PracticeScreen`

**File:** `src/app/App.locale.test.tsx` (and absent integration coverage generally)
**Issue:** Phase 47 ships a complete data-layer pipeline (envelope → coercer → `useFeatureFlags` → `vm.featureFlags` → `PracticeScreen`), but the only integration test that mounts `App` and exercises a persisted seed (`App.locale.test.tsx`) tests only the `locale` field. There is no test that seeds `{ breathingShape: 'spiritual-eye' }` (or any of the four new fields), renders `App`, and asserts the rendered orb reflects that variant. `useFeatureFlags.test.ts` tests the hook in isolation; nothing proves the value actually propagates through `useAppViewModel` → `vm.featureFlags` → `PracticeScreen.tsx:73-75`.

The Phase 47 context (D-12) explicitly accepts Vitest-only proof of persistence, but the existing tests cover the contract slice (coerce, resolver, hook) without an end-to-end smoke. A regression in `useAppViewModel.ts:54` (e.g., a stray spread that drops `breathingShape`) would not be caught by any test in this phase.

**Fix:** Add one smoke test per new flag to a new file `src/app/App.featureFlags.test.tsx` (or extend `App.locale.test.tsx`). Pattern:

```tsx
it('seeded breathingShape="spiritual-eye" renders the spiritual-eye orb variant', () => {
  seedPrefs({ ...DEFAULT_FULL_PREFS, breathingShape: 'spiritual-eye' })
  render(<App />)
  // Assert via a render-output marker the spiritual-eye variant ships
  // (e.g., a data-testid on OrbShape; pick whatever the existing
  // breathingShape rendering surface uses for test-fixture identity).
})
```

If end-to-end coverage is explicitly deferred to Phase 48 (Appearance UI), document that in `47-SUMMARY.md` so future readers know the gap is intentional.

## Info

### IN-01: Stale comment references removed `PRODUCTION_DEFAULTS` bridge

**File:** `src/hooks/useFeatureFlags.test.ts:50-52`
**Issue:** The comment reads: "With the current PRODUCTION_DEFAULTS literal bridge (Plan 01), seeded non-default prefs are ignored — this test fails until the hook is wired to loadPrefs()." This was a RED-gate annotation written during TDD. After GREEN (Plan 03), the comment is misleading — the symbol `PRODUCTION_DEFAULTS` no longer exists in `src/featureFlags.ts` and there is no "literal bridge" anywhere in the shipped code. A new reader will grep for the symbol, find nothing, and waste time.

**Fix:** Replace the RED-gate comment with a steady-state description:

```ts
// PREFS-01 — proves the hook seeds its persisted snapshot from loadPrefs() at mount.
// Without the loadPrefs() seed, seeded non-default prefs would not survive into the
// first render (the query-string defaults would mask them).
```

---

### IN-02: Test type assertion narrows `value` to `string` even when it is `boolean`

**File:** `src/hooks/useSwitcherIconChoice.test.ts:101`
**Issue:** The CustomEvent payload is cast `as CustomEvent<{ key: string; value: boolean }>` (correct), but the parallel cast in `useBreathingShapeChoice.test.ts:101`, `useRingCueChoice.test.ts:101`, and `useOrbIdleChoice.test.ts:101` declares `value: string` — which happens to be a true supertype of `BreathingShapeVariant`/`RingCueStyle`/`OrbIdleBehavior` (all string-literal unions), but loses the narrower type and weakens future refactor safety. If `BreathingShapeVariant` ever gains a non-string member, the test would silently lose type coverage on `value`.

**Fix:** Narrow the cast to the actual union:

```ts
const event = spy.mock.calls[0]![0] as CustomEvent<{ key: 'breathingShape'; value: BreathingShapeVariant }>
```

Apply the same narrowing pattern across the four choice-hook test files.

---

### IN-03: `coercePrefs` corrupt-field tolerance suite never tests the all-four-corrupt case

**File:** `src/storage/prefs.test.ts:305-367`
**Issue:** The "corrupt-field tolerance" block has one test per new flag, plus a "pre-Phase-47 envelope (4 keys only)" test. Missing: an envelope where ALL FOUR of the new flag values are corrupt simultaneously — e.g., `{ breathingShape: 'junk', ringCue: 42, orbIdle: null, switcherIcon: [] }` should produce all four defaults while preserving the four base fields. The per-flag isolation contract (D-17 "single drifted dimension does NOT discard the others") is asserted for each of the four flags in isolation, but the multi-corrupt path is not exercised.

**Fix:** Add the all-corrupt assertion to round out the matrix.

```ts
it('all 4 new fields corrupt simultaneously — each falls back to per-flag default; 4 base fields preserved', () => {
  const out = coercePrefs({
    theme: 'dark', timbre: 'bell', cue: 'arrow', locale: 'pt-BR',
    breathingShape: 'junk', ringCue: 42, orbIdle: null, switcherIcon: [],
  })
  expect(out).toEqual({
    theme: 'dark', timbre: 'bell', cue: 'arrow', locale: 'pt-BR',
    breathingShape: 'orb-halo', ringCue: 'progress-arc',
    orbIdle: 'ambient', switcherIcon: false,
  })
})
```

---

### IN-04: `useFeatureFlags.ts` projection comment refers to "D-09" but D-09 is the choice-hook decision

**File:** `src/hooks/useFeatureFlags.ts:97`
**Issue:** Comment reads: "D-09: inline projection chosen over Pick-typed pass-through for clarity at the single call site." But `47-CONTEXT.md` D-09 is about the four paired choice hooks, not the projection-vs-Pick question. The projection choice falls under the "Claude's Discretion" block ("The exact name of `readFeatureFlags(search, persisted)`'s second parameter type"). Misciting decisions makes the codebase harder to navigate when a future reader chases context.

**Fix:** Drop the `D-09` reference or replace it with `47-CONTEXT.md §"Claude's Discretion"`.

---

### IN-05: Four near-identical choice-hook source files — duplication is expected per plan, but worth a tracking note

**File:** `src/hooks/useBreathingShapeChoice.ts`, `src/hooks/useRingCueChoice.ts`, `src/hooks/useOrbIdleChoice.ts`, `src/hooks/useSwitcherIconChoice.ts`
**Issue:** The four hooks are 20-line near-clones differing only in (a) the type imported from `featureFlags.ts`, (b) the prefs key string, and (c) the return-object property names. The context explicitly endorses this as "boring on purpose" (D-09 + §specifics), so this is not a defect to fix — but the duplication footprint has now crossed four implementations × four tests = eight files of mostly-identical logic. If a sixth or seventh choice hook ever ships, the bug surface for "forgot to update one of the four" grows linearly.

**Fix:** None for Phase 47. Capture as a deferred candidate in `.planning/REQUIREMENTS.md` (e.g., "Hook-factory helper `createUserPrefChoice<K>(key)` when the count of choice hooks exceeds six"). The "Deferred Ideas" block in `47-CONTEXT.md` already mentions this — confirming it stays deferred is sufficient.

---

_Reviewed: 2026-05-26T04:31:12Z_
_Reviewer: Claude (gsd-code-reviewer)_
_Depth: standard_
