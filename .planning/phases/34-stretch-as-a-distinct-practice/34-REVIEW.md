---
phase: 34-stretch-as-a-distinct-practice
reviewed: 2026-05-18T00:00:00Z
depth: standard
files_reviewed: 27
files_reviewed_list:
  - src/app/App.persistence.test.tsx
  - src/app/App.session.test.tsx
  - src/app/App.settings.test.tsx
  - src/app/App.tsx
  - src/components/BooleanToggle.tsx
  - src/components/LearnDialog.test.tsx
  - src/components/LearnDialog.tsx
  - src/components/PracticeToggle.test.tsx
  - src/components/PracticeToggle.tsx
  - src/components/SettingsForm.stretch.test.tsx
  - src/components/SettingsForm.tsx
  - src/content/strings.test.ts
  - src/content/strings.ts
  - src/domain/sessionController.test.ts
  - src/domain/sessionController.ts
  - src/domain/settings.test.ts
  - src/domain/settings.ts
  - src/domain/stretchRamp.test.ts
  - src/domain/stretchRamp.ts
  - src/hooks/useSessionEngine.test.tsx
  - src/hooks/useSessionEngine.ts
  - src/storage/practices.test.ts
  - src/storage/practices.ts
  - src/storage/settings.test.ts
  - src/storage/settings.ts
  - src/storage/storage.test.ts
  - src/storage/storage.ts
findings:
  critical: 1
  warning: 5
  info: 3
  total: 9
status: issues_found
---

# Phase 34: Code Review Report

**Reviewed:** 2026-05-18T00:00:00Z
**Depth:** standard
**Files Reviewed:** 27
**Status:** issues_found

## Summary

Phase 34 promotes Stretch to a first-class practice: a `StretchSettings` slice in the
per-practice envelope, a v2→v3 storage migration, dedicated stretch steppers in
`SettingsForm`, and a stretch branch through `useSessionEngine` / `sessionController`.

The session-controller and `stretchRamp` domain layers are solid and well-tested. The
defects concentrate at the trust boundary between the non-throwing storage coercer
(`coerceStretchSettings`) and the runtime consumers (`buildStretchSegments`,
`SettingsForm`). The coercer enforces every field individually but does NOT enforce the
cross-field invariant `targetBpm < initialBpm` that `validateStretchSettings` requires,
and the App start path never calls `validateStretchSettings` at all. A drifted or
tampered persisted slice therefore reaches the ramp engine unvalidated. Several
secondary issues (empty stepper options, misleading migration seeding, dead code) are
also flagged.

## Critical Issues

### CR-01: Coerced stretch settings bypass the `targetBpm < initialBpm` invariant — degenerate ramp reaches the engine

**File:** `src/storage/practices.ts:89-99`, consumed by `src/app/App.tsx:147-148,225` and `src/domain/stretchRamp.ts:76`

**Issue:** `coerceStretchSettings` validates `initialBpm` and `targetBpm` independently
with `isValidBpm`, but never enforces the cross-field constraint `targetBpm < initialBpm`
that `validateStretchSettings` (`src/domain/settings.ts:218`) treats as mandatory. Any
persisted stretch slice with `targetBpm >= initialBpm` — produced by localStorage
tampering, a future build's schema drift, or a stale cross-tab write — passes the coercer
unchanged.

That object then flows directly into the engine: `App.tsx` builds `activeStretchSettings`
from `stretchSettings` state (seeded from `loadPractices().stretch.settings`) and hands it
to `useSessionEngine`, which calls `startStretchSession(sSettings, ...)` →
`buildStretchSegments(settings)`. `buildStretchSegments` only guards
`rampDurationMinutes` (DS-WR-02 at line 82); it never re-validates the BPM relationship.
With `bpmSpan = initialBpm - targetBpm <= 0`, `numSteps` collapses to `Math.max(1, ceil(<=0))`
= 1 and the "ramp" produces a single segment at `initialBpm` followed by a cool-down at a
*higher* `targetBpm` — a silently inverted ramp the user never configured. The
`StretchSegment` table is structurally valid (no crash), so the corruption is invisible
until the session runs backwards.

The same gap means `SettingsForm` will render `computeStretchTotalMs`/steppers against an
out-of-contract object. `validateStretchSettings` exists precisely to reject this state but
is dead code on the stretch start path — nothing calls it (confirmed: no references in
`App.tsx`, `useSessionEngine.ts`, or `sessionController.ts`).

**Fix:** Make the coercer enforce the cross-field invariant, falling back both fields to
defaults when violated:
```ts
export function coerceStretchSettings(raw: unknown): StretchSettings {
  const r = asRecord(raw)
  let initialBpm = isValidBpm(r.initialBpm) ? r.initialBpm : DEFAULT_STRETCH_SETTINGS.initialBpm
  let targetBpm  = isValidBpm(r.targetBpm)  ? r.targetBpm  : DEFAULT_STRETCH_SETTINGS.targetBpm
  // Cross-field invariant (parity with validateStretchSettings): a down-only ramp.
  if (targetBpm >= initialBpm) {
    initialBpm = DEFAULT_STRETCH_SETTINGS.initialBpm
    targetBpm  = DEFAULT_STRETCH_SETTINGS.targetBpm
  }
  return {
    ratio: isValidRatio(r.ratio) ? r.ratio : DEFAULT_STRETCH_SETTINGS.ratio,
    initialBpm,
    targetBpm,
    warmUpMinutes:       isValidWarmUp(r.warmUpMinutes)             ? r.warmUpMinutes       : DEFAULT_STRETCH_SETTINGS.warmUpMinutes,
    rampDurationMinutes: isValidRampDuration(r.rampDurationMinutes) ? r.rampDurationMinutes : DEFAULT_STRETCH_SETTINGS.rampDurationMinutes,
    coolDownMinutes:     isValidCoolDown(r.coolDownMinutes)         ? r.coolDownMinutes     : DEFAULT_STRETCH_SETTINGS.coolDownMinutes,
  }
}
```
Additionally, defensively guard `buildStretchSegments` so the engine never silently builds
an inverted ramp (mirror the existing DS-WR-02 `rampDurationMinutes` guard):
```ts
if (!(targetBpm < initialBpm)) {
  throw new RangeError('targetBpm must be strictly below initialBpm')
}
```

## Warnings

### WR-01: `targetBpm` stepper can receive an empty `options` array

**File:** `src/components/SettingsForm.tsx:82,111-117`

**Issue:** `targetBpmOptions` is `BPM_OPTIONS.filter(v => v < stretchSettings.initialBpm)`.
The `initialBpm` *picker* is restricted to `STRETCH_INITIAL_BPM_OPTIONS` (>= 1.5), which
guarantees at least the value `1` survives the filter. But `stretchSettings.initialBpm`
comes from persisted state, and `coerceStretchSettings` validates `initialBpm` against the
full `BPM_OPTIONS` (which includes `1`). A persisted/migrated `initialBpm` of `1` yields
`targetBpmOptions = []` and `validTargets = []` at line 113, so `updateInitialBpm` calls
`updateStretchSettings({ initialBpm, targetBpm: validTargets[validTargets.length - 1] })`
with `targetBpm === undefined`. The `targetBpm` stepper then renders with zero options.
The `Pitfall 4` comment on `STRETCH_INITIAL_BPM_OPTIONS` (`settings.ts:52-56`) assumes the
picker is the only source of `initialBpm` — it is not.

**Fix:** Coerce `initialBpm` against `STRETCH_INITIAL_BPM_OPTIONS` (not the full
`BPM_OPTIONS`) in `coerceStretchSettings`, or guard `updateInitialBpm` /
`targetBpmOptions` against an empty list and fall back to a default `targetBpm`.

### WR-02: v2→v3 migration seeds stretch from resonant blob, but resonant no longer carries ramp fields

**File:** `src/storage/storage.ts:108-133`

**Issue:** The v2→v3 ladder seeds `practices.stretch.settings` from
`resonantSlice['settings']` — "carries ramp fields; downstream coercer validates" (line
122). This was true while resonant `SessionSettings` still embedded
`initialBpm`/`targetBpm`/`warmUpMinutes`/etc. (pre-Phase-34). But Phase 34 D-01/D-02
explicitly trimmed `SessionSettings` to 3 fields (`settings.ts:17-23`) and removed those
fields from `coerceSettings` (`settings.ts:8-9`). For any user who first ran a Phase 34+
build, the resonant blob is `{bpm, ratio, durationMinutes}` only — it has no ramp fields
to carry. The migration therefore always produces a stretch slice that
`coerceStretchSettings` fills entirely from `DEFAULT_STRETCH_SETTINGS` (except `ratio`,
which is shared). The seeding comment is now misleading. Worse, a user upgrading from a
*pre-trim* v2 envelope whose resonant blob still carries orphaned ramp fields can have
`targetBpm >= initialBpm` carried straight into the stretch slice (compounds CR-01).

**Fix:** Either drop the seeding pretense and seed `stretch.settings` as `undefined`
(coercer supplies the documented defaults), or explicitly map only the ramp fields known
to have existed in pre-trim v2 data. Update the comment to match reality.

### WR-03: Early-ended stretch sessions are recorded with no integration-test coverage

**File:** `src/storage/practices.ts:207-236`, `src/app/App.tsx:799-808`

**Issue:** `recordStretchSession` is reached from the leave-running cleanup effect for any
status transition out of `running`, including manual End (`status: 'idle'`) with
`isComplete: false` — which records `snap.lastElapsedMs` (the last rAF reading). For a
stretch session ended after, e.g., 45s, the 30s `COUNT_THRESHOLD_MS` gate lets that count
as a recorded session. This is parity with resonant behaviour, so it is likely intentional
— but the `App.tsx:803-806` comment conflates resonant and stretch in one branch, and no
App-level test exercises an early-ended stretch session's recorded elapsed value (the
practices test only calls `recordStretchSession(40_000, false, ...)` in isolation).

**Fix:** Add an App-level test that ends a stretch session before completion and asserts
the recorded `stretchStats`. If early-end stretch sessions should NOT count, gate the
`recordStretchSession` call on `isComplete` in the `activePractice === 'stretch'` branch.

### WR-04: `LearnDialog` stretch fallback is silent and the `as keyof typeof` cast masks a future missing key

**File:** `src/components/LearnDialog.tsx:90-95`

**Issue:** `practiceContentKey = activePractice === 'stretch' ? 'resonant' : activePractice`
silently substitutes resonant Learn content for the stretch practice, and
`practiceContent = practices[practiceContentKey as keyof typeof practices]` uses an `as`
cast. A stretch user opening "About this practice" sees resonant copy with no signal. The
dialog advertises itself as practice-aware (`activePractice` prop, D-07/D-08) but is not
for stretch. When stretch Learn content is later added, the `as keyof typeof` cast will
suppress the type error that would otherwise flag the missing `stretch` key, so a
forgotten ternary update fails silently.

**Fix:** Replace the `as keyof typeof` cast with an explicit lookup that fails the
type-check when `practices` gains a `stretch` key, add a `// TODO(phase-3x)` marker, and
track the missing stretch Learn content as an explicit follow-up rather than an inline
silent fallback.

### WR-05: `extendTimedSession` stretch rejection depends on undocumented guard ordering

**File:** `src/domain/sessionController.ts:102-124`

**Issue:** The stretch guard `if (state.stretchSegments !== null) throw` is correct for
sessions created by `startStretchSession` (which always sets a non-null table). It must
run *before* the `durationMinutes === 'open-ended'` check because a stretch session's
`lockedSettings` is the synthetic lead-in with `durationMinutes: 'open-ended'`
(`sessionController.ts:74-78`); a different ordering would route a stretch state into the
open-ended / `DURATION_OPTIONS` branches instead of the intended rejection. The ordering
is load-bearing but undocumented, and `useSessionEngine.extendDuration` swallows the
`RangeError` (`useSessionEngine.ts:253-256`), so a wrong branch would fail silently.

**Fix:** Document that the `stretchSegments` check MUST remain the first guard, and add a
unit test asserting `extendTimedSession` on a stretch state throws regardless of
`lockedSettings.durationMinutes`.

## Info

### IN-01: Temporary 1-minute duration option still shipped

**File:** `src/domain/settings.ts:60-63`

**Issue:** `DURATION_OPTIONS` includes a `1` entry flagged "TEMPORARY (testing aid) ...
Remove before release." It is unrelated to Phase 34 but is in a reviewed file and remains
shipped, widening the resonant duration picker for end users.

**Fix:** Remove the `1` entry before release, or move it behind a DEV-only guard.

### IN-02: `recordStretchSession` duplicates `recordResonantSession` verbatim

**File:** `src/storage/practices.ts:171-236`

**Issue:** `recordResonantSession` and `recordStretchSession` are byte-identical except
for the `resonant`/`stretch` slice key; `recordNaviKriyaSession` is a near-identical third
copy. Three copies of the threshold / finite-guard / write logic invite drift.

**Fix:** Extract a `recordPracticeSession(practice: 'resonant' | 'stretch', elapsedMs,
isComplete, deps)` helper; keep the named exports as thin wrappers if the public API must
stay stable.

### IN-03: Ramp-duration label value collides with the practice name

**File:** `src/content/strings.ts:272,352-354`

**Issue:** `settingsForm.rampDurationLabel` has the literal value `'Stretch'`, identical to
`practice.stretchName: 'Stretch'`. The stretch test file already works around this by
querying steppers via `role="group"` (`SettingsForm.stretch.test.tsx:34-37`). A label
string equal to the practice name is a maintainability hazard for any future text-based
assertion or screen-reader audit. (PT-BR avoids the collision: `rampDurationLabel:
'Progressão'` vs `stretchName: 'Alongar'`.)

**Fix:** Use a distinct EN label for the ramp-duration stepper (e.g. "Ramp") so it does
not collide with the practice name.

---

_Reviewed: 2026-05-18T00:00:00Z_
_Reviewer: Claude (gsd-code-reviewer)_
_Depth: standard_
