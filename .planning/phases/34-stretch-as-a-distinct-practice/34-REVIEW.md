---
phase: 34-stretch-as-a-distinct-practice
reviewed: 2026-05-18T00:00:00Z
depth: standard
files_reviewed: 8
files_reviewed_list:
  - src/app/App.tsx
  - src/app/App.session.test.tsx
  - src/components/SettingsForm.tsx
  - src/components/SettingsForm.stretch.test.tsx
  - src/domain/stretchRamp.ts
  - src/domain/stretchRamp.test.ts
  - src/storage/practices.ts
  - src/storage/practices.test.ts
findings:
  critical: 0
  warning: 2
  info: 3
  total: 5
status: issues_found
---

# Phase 34: Code Review Report

**Reviewed:** 2026-05-18T00:00:00Z
**Depth:** standard
**Files Reviewed:** 8
**Status:** issues_found

## Summary

This review covers the Phase 34 gap-closure diff (base `b02dc82^`) spanning plans 34-07
(UAT gap fixes) and 34-08 (verification blocker CR-01). The diff is small and tightly
scoped: four UAT gaps (rounded Duration readout, in-session stepper gating, stretch
end-confirmation dialog, top-anchored layout) plus the CR-01 cross-field BPM invariant
enforced in `coerceStretchSettings` and `buildStretchSegments`.

The two highest-severity findings from the prior full-phase review are now resolved:

- **CR-01 (resolved):** `coerceStretchSettings` now enforces `targetBpm < initialBpm`,
  resetting both BPM fields to defaults atomically when violated; `buildStretchSegments`
  adds a defensive `RangeError` guard. The `!(targetBpm < initialBpm)` form correctly
  traps NaN. Both paths are now test-covered.
- **WR-01 (resolved):** `coerceStretchSettings` now restricts `initialBpm` to
  `STRETCH_INITIAL_BPM_OPTIONS` (>= 1.5), so a coerced `initialBpm` of `1` can no longer
  collapse the `targetBpm` picker to an empty option list.

The four UAT fixes are minimal and correct. No blockers found. Two warnings concern the
coupling of the stretch end-confirmation gate to an internal controller field and a
brittle layout assertion in the new test. Three info items cover guard-strictness
divergence and test fragility.

## Warnings

### WR-01: Stretch end-confirmation dialog is gated on `state.stretchSegments`, coupling App to a controller-internal field

**File:** `src/app/App.tsx:646-656`

**Issue:** `requestEnd` now reads `state.stretchSegments` to decide whether to open the
end-confirmation dialog (`state.lockedSettings.durationMinutes !== 'open-ended' ||
state.stretchSegments !== null`). The `useCallback` dependency array is `[state, session,
audioStop]`, so the closure is fresh — no stale-closure bug. The concern is design
coupling: the App-layer dialog decision now depends on an internal field of the session
controller whose "non-null exactly for a stretch session" contract is asserted only by an
inline comment referencing `sessionController.ts:81-89`. If a future controller change
populates `stretchSegments` for a non-stretch session, or nulls it mid-running, the
dialog gating breaks silently with no test catching it. The condition also conflates two
distinct concepts — "is timed" and "is a stretch session" — into one boolean expression.

**Fix:** Prefer an explicit, intent-revealing signal. If the controller exposes a
practice/kind discriminator, gate on that. Otherwise extract named locals so intent is
self-documenting, and add a regression test asserting the dialog does NOT appear for a
stretch session if `stretchSegments` is null (or document why that combination is
unreachable):
```ts
const isStretchSession = state.stretchSegments !== null
const isTimedSession = state.lockedSettings.durationMinutes !== 'open-ended'
const requestEnd = useCallback(() => {
  if (state.status === 'running' && (isTimedSession || isStretchSession)) {
    setEndDialogOpen(true)
    return
  }
  session.end()
  void audioStop()
}, [state, session, audioStop])
```

### WR-02: GAP 4 layout test selects the root section by structural class matching — brittle and non-deterministic

**File:** `src/app/App.session.test.tsx` (GAP 4 test — `root layout section is top-anchored`)

**Issue:** The test locates the root section via `document.querySelectorAll('section')`
then `.find(s => s.classList.contains('flex') && s.classList.contains('flex-col'))`. It
picks the *first* `<section>` carrying both `flex` and `flex-col`. If any other section
in the tree (now or in a future change) also uses a `flex flex-col` layout, the test
silently asserts against the wrong element while still passing. The test also pins raw
Tailwind class names (`justify-start`/`justify-center`), so it breaks on any layout
refactor even when the visual intent (top-anchored) is preserved. This is a low-value,
high-fragility test pinning an implementation detail.

**Fix:** Give the root section a stable selector hook (`data-testid="app-root-section"`
or an accessible landmark role/label) and select on that so the assertion is
deterministic:
```ts
const rootSection = screen.getByTestId('app-root-section')
expect(rootSection).toHaveClass('justify-start')
expect(rootSection).not.toHaveClass('justify-center')
```

## Info

### IN-01: `buildStretchSegments` and `coerceStretchSettings` CR-01 guards diverge in strictness — document the asymmetry

**File:** `src/domain/stretchRamp.ts:90-92` and `src/storage/practices.ts:97-114`

**Issue:** `buildStretchSegments` rejects `!(targetBpm < initialBpm)` by throwing.
`coerceStretchSettings` enforces the same cross-field invariant but restricts only
`initialBpm` to `STRETCH_INITIAL_BPM_OPTIONS`; `targetBpm` is gated only by `isValidBpm`
(full `BPM_OPTIONS`, which includes `1`). This is not a defect — any BPM strictly below a
valid `initialBpm` is a legitimate ramp endpoint, so the engine accepts it — but the
asymmetry (initialBpm option-restricted, targetBpm not) is undocumented beyond the
WR-01-rationale comment and could surprise a future maintainer reading either function in
isolation.

**Fix:** Add a one-line comment in `coerceStretchSettings` stating that `targetBpm` is
intentionally only `isValidBpm`-gated (not option-restricted) because the cross-field
check below guarantees it lands strictly below a valid `initialBpm`.

### IN-02: GAP 1 rounding fix has no tolerance assertion against the true completion time

**File:** `src/components/SettingsForm.tsx:86-89`

**Issue:** `stretchDurationText` now applies `Math.round(stretchTotalMs / 60_000)`.
`computeStretchTotalMs` returns the snapped segment table's final `endMs`, which is not
whole-minute-aligned, so the rounded display can differ from the actual session length by
up to ~30s. `getStretchFrame`'s `isComplete` still fires at the true unrounded `endMs`.
This is acceptable and acknowledged in the code comment, but the GAP 1 tests only assert
integer-ness of the displayed value — none assert it stays within tolerance of the real
completion time, so a future change to the snapping logic that produces a wildly-off
display would not be caught.

**Fix:** Optional — add an assertion that `Math.abs(stretchTotalMs / 60_000 -
roundedMinutes) < 1` so the display cannot silently drift far from the true duration.

### IN-03: GAP 2 `STRETCH_GROUPS` test constant is indirected through label strings — silent drift risk

**File:** `src/components/SettingsForm.stretch.test.tsx:37`

**Issue:** `STRETCH_GROUPS = ['Start BPM', 'Target BPM', 'Warm-up', 'Stretch',
'Settle']`. The stretch branch renders six steppers plus Ratio and Duration; the GAP 2
hidden/visible tests iterate `STRETCH_GROUPS` and separately assert `Ratio` and
`Duration`. The group names are hard-coded label strings rather than derived from the
`strings` source the component consumes. If a label string changes, `STRETCH_GROUPS`
drifts silently and the GAP 2 visibility test passes while checking fewer (or wrong)
groups than intended.

**Fix:** Derive the expected group list from the same `strings` source the component
uses, or add a count assertion (`expect(screen.queryAllByRole('group')).toHaveLength(N)`)
so the test fails loudly when a stepper is added or removed.

---

_Reviewed: 2026-05-18T00:00:00Z_
_Reviewer: Claude (gsd-code-reviewer)_
_Depth: standard_
