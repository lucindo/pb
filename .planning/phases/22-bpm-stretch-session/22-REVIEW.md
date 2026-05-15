---
phase: 22-bpm-stretch-session
reviewed: 2026-05-15T00:00:00Z
depth: standard
files_reviewed: 11
files_reviewed_list:
  - src/app/App.tsx
  - src/components/ModeToggle.tsx
  - src/components/SessionReadout.tsx
  - src/components/SettingsForm.tsx
  - src/components/SettingsStepper.tsx
  - src/content/strings.ts
  - src/domain/sessionController.ts
  - src/domain/sessionMath.ts
  - src/domain/settings.ts
  - src/domain/stretchRamp.ts
  - src/storage/settings.ts
findings:
  critical: 1
  warning: 5
  info: 3
  total: 9
status: issues_found
---

# Phase 22: Code Review Report

**Reviewed:** 2026-05-15
**Depth:** standard
**Files Reviewed:** 11
**Status:** issues_found

## Summary

Phase 22 adds the BPM Stretch Session: a piecewise-constant ramp engine
(`stretchRamp.ts`), stretch-aware session state in `sessionController.ts`, the
stretch settings schema, and the UI surfaces (`ModeToggle`, stretch branch of
`SettingsForm`, stretch readout in `SessionReadout`).

The core architecture is sound — the segment-table approach correctly snaps
every segment boundary to a whole-cycle multiple so the BPM never steps
mid-breath. However, there is a structural inconsistency between two notions of
"session total": the algebraic sum produced by `computeStretchTotalMs` and the
sum of the *cycle-snapped* segment durations actually built by
`buildStretchSegments`. These two values diverge by the accumulated rounding
error, and `getStretchFrame` mixes them — producing one provable defect
(premature/incorrect completion) and several display inaccuracies. The existing
`stretchRamp` test for completion re-derives `completionMs` with the same
formula under test, so it validates self-consistency rather than correctness
and does not catch this.

## Critical Issues

### CR-01: Cycle-snapping drift can complete a stretch session early (or skip the entire cool-down)

**File:** `src/domain/stretchRamp.ts:170-179`
**Issue:**
`buildStretchSegments` snaps every segment to a whole number of cycles:
`cycleCount = Math.max(1, Math.round(requestedMs / cycleMs))`, then
`durationMs = cycleCount * cycleMs`. The resulting segment table's total
duration is therefore *not* equal to `computeStretchTotalMs(settings)`, which
returns the pure algebraic sum `(warmUp + rampDuration + coolDown) * 60_000`.

The snapping error accumulates across the warm-up segment plus every ramp
segment (a ramp can be a dozen+ segments). With `initialBpm = 5.5`,
`cycleMs = 60000 / 5.5 ≈ 10909.09`, a 5-minute warm-up snaps to
`round(300000 / 10909.09) = round(27.5)` cycles → `28 * 10909.09 ≈ 305454 ms`,
i.e. ~5.45 s longer than the algebraic 300000 ms. Each ramp segment adds its
own ±half-cycle error. The cumulative drift can exceed a full short
`coolDownMinutes` (5 min) of slack in either direction.

`getStretchFrame` then computes:
```ts
completionMs = lastSeg.startMs
  + Math.ceil((totalMs - lastSeg.startMs) / lastSeg.cycleMs) * lastSeg.cycleMs
```
where `lastSeg.startMs` is the *snapped* cumulative offset but `totalMs` is the
*algebraic* total from `computeStretchTotalMs`. When the snapped warm-up + ramp
push `lastSeg.startMs` past the algebraic `totalMs`, the term
`(totalMs - lastSeg.startMs)` is negative, `Math.ceil(negative / cycleMs)` is
`<= 0`, and `completionMs <= lastSeg.startMs`. `isComplete` then fires the
instant the cool-down segment begins — the entire cool-down hold is skipped.
Even when the drift is smaller, the completion instant is offset from the
duration the user actually configured.

`remainingMs` has the matching defect: it is `Math.max(0, totalMs - elapsed)`
using the algebraic `totalMs`, so the readout can show `0:00` while the session
keeps running, or show a positive value after `isComplete` already fired.

**Fix:** Derive completion from the segment table itself rather than from the
algebraic `computeStretchTotalMs`. The last bounded segment already ends on a
cycle boundary, so its `endMs` *is* the correct completion instant:
```ts
// In getStretchFrame — when the session is bounded (last segment finite):
const lastSeg = segments[segments.length - 1]
const completionMs = Number.isFinite(lastSeg.endMs) ? lastSeg.endMs : null
const isComplete = completionMs !== null && safeElapsedMs >= completionMs
// remainingMs should also count down to completionMs, not the algebraic total:
const remainingMs = completionMs === null
  ? null
  : Math.max(0, completionMs - safeElapsedMs)
```
Alternatively, have `computeStretchTotalMs` build the segment table and return
the snapped total so the algebraic and table totals can never diverge. Either
way, `getStretchFrame` must not mix a snapped `startMs` with an unsnapped
`totalMs`. Add a test that builds segments, sums the *snapped* segment
durations, and asserts `completionMs` equals that sum (the current test at
`stretchRamp.test.ts:199` re-derives `completionMs` with the formula under test
and cannot catch this).

## Warnings

### WR-01: `getStretchFrame` segment walk misclassifies the exact end-of-session boundary

**File:** `src/domain/stretchRamp.ts:147-156`
**Issue:** The active-segment search uses a strict `safeElapsedMs < seg.endMs`.
At `elapsedMs` exactly equal to the final bounded segment's `endMs`, no segment
matches and the code falls back to `activeSeg = segments[segments.length - 1]`
(the same last segment). `elapsedInSegment = endMs - startMs = durationMs`, so
`cycleInSegment = Math.floor(durationMs / cycleMs) = cycleCount`, i.e. one cycle
*past* the last real cycle. `currentBpm`/`stage` stay correct (still the last
segment) but `cycleIndex` and `cycleStartMs` point one cycle beyond the table.
Because completion (`safeElapsedMs >= completionMs`) usually fires at or before
this point, it is normally masked — but combined with CR-01's drift it can be
observable, and the off-by-one frame is wrong on its face.
**Fix:** Clamp `cycleInSegment` to the segment's cycle count for bounded
segments, or treat `safeElapsedMs >= completionMs` as a dedicated terminal
frame before the segment walk.

### WR-02: `numSteps` can be 0 when `initialBpm === targetBpm`, producing `Infinity` cycle math

**File:** `src/domain/stretchRamp.ts:112-119`
**Issue:** `numSteps = Math.ceil(bpmSpan / 0.4999)`. `validateSettings` rejects
`targetBpm >= initialBpm`, and `SettingsForm` filters target options to
`< initialBpm`, so this is currently unreachable through the UI. But
`buildStretchSegments` is a public domain function with no internal guard: if
called with `initialBpm === targetBpm` (`bpmSpan = 0`), `numSteps = 0`, then
`stepRequestedMs = rampMs / 0 = Infinity`, the `for` loop body never runs, and
the ramp stage is silently absent. A negative span would loop zero times too.
The function should not depend on an external validator for an invariant it can
cheaply assert itself.
**Fix:** Add `const numSteps = Math.max(1, Math.ceil(bpmSpan / 0.4999))` or
throw a `RangeError` for `bpmSpan <= 0`, mirroring `validateSettings`.

### WR-03: `SettingsStepper` renders an out-of-range `value` with both buttons disabled and no recovery

**File:** `src/components/SettingsStepper.tsx:29-38`
**Issue:** `selectedIndex = options.indexOf(value)`. When `value` is not in
`options`, `selectedIndex` is `-1`: `canDecrease` is false, `canIncrease` is
false (`-1 >= 0` fails), `changeBy` no-ops. The stepper becomes permanently
inert while still displaying the stale value. In stretch mode this is
reachable: `targetBpm` options are `BPM_OPTIONS.filter(v => v < initialBpm)`. If
a persisted `targetBpm` is not below the current `initialBpm` (e.g. settings
restored from storage where `coerceSettings` validates each field
independently and does not enforce the cross-field `targetBpm < initialBpm`
relation), the target stepper is dead until the user changes `initialBpm`.
**Fix:** When `selectedIndex === -1`, fall back to a defined starting index
(e.g. `0`) so the user can step out of the invalid state, or have
`coerceSettings` repair the `targetBpm < initialBpm` invariant for stretch
settings on load.

### WR-04: `coerceSettings` does not enforce the stretch cross-field invariant

**File:** `src/storage/settings.ts:23-38`
**Issue:** `coerceSettings` validates each field in isolation
(`isValidBpm(r.targetBpm)` etc.) but never checks `targetBpm < initialBpm` for
`mode === 'stretch'`. A persisted envelope with `mode: 'stretch'`,
`initialBpm: 4`, `targetBpm: 5` passes coercion unchanged. The next
`createBreathingPlan`/`startSession` path runs `validateSettings`, which
*throws* a `RangeError` on `targetBpm >= initialBpm`
(`settings.ts:205`) — an uncaught throw out of `loadSettings()` →
`useMemo(loadSettings)` at `App.tsx:75`, crashing the app at mount. The whole
point of the non-throwing per-field coercer (file header, Pitfall 3) is to
prevent a drifted disk value from breaking the app; the stretch cross-field
relation defeats that guarantee.
**Fix:** After per-field coercion, if `mode === 'stretch'` and
`targetBpm >= initialBpm`, repair `targetBpm` to the highest `BPM_OPTIONS`
value below `initialBpm` (the same correction `SettingsForm.updateInitialBpm`
applies), or fall back the pair to `DEFAULT_STRETCH_SETTINGS`.

### WR-05: Boundary-audio offset uses fallback plan durations that do not match the stretch frame

**File:** `src/app/App.tsx:58-64`
**Issue:** In `computeBoundaryAudioOffsets`, the stretch branch reads
`frame.currentInhaleMs ?? plan.inhaleMs`. For a genuine stretch frame
`getStretchFrame` always sets `currentInhaleMs`/`currentExhaleMs`
(`stretchRamp.ts:193-195`), so the fallback never fires in practice — but if it
ever did, `plan` here is the stretch session's lead-in plan built at
`initialBpm` only (`sessionController.ts:48-49`). Mid-ramp that BPM is wrong, so
the fallback would compute a cue envelope for the wrong phase length. The `??`
fallback masks a contract violation rather than failing loudly.
**Fix:** Since `frame.cycleStartMs !== undefined` already implies a full
stretch frame, read `frame.currentInhaleMs`/`currentExhaleMs` directly (they
are guaranteed present on `StretchSessionFrame`), or assert they are defined
instead of silently falling back to a mismatched plan.

## Info

### IN-01: Dead optional-chain branches in `SessionReadout` placeholder

**File:** `src/components/SessionReadout.tsx:39-43`
**Issue:** The `isLeadInPlaceholder` branch documents (lines 36-38) that the
caller commits to a non-null `frame`, yet still guards with `frame?.remainingMs`
and `frame ? ... : '0:00'`. The defensive fallbacks are unreachable given the
documented contract; they add noise and a `'0:00'` path that is never exercised
by tests.
**Fix:** Either drop the optional chaining (trust the typed contract) or make
`frame` non-optional in the placeholder code path so the contract is enforced
by the type checker.

### IN-02: Redundant `frame.currentBpm !== undefined` re-check

**File:** `src/components/SessionReadout.tsx:79,100`
**Issue:** `isStretchRunning` is already defined as
`showTimeChip && frame.currentBpm !== undefined` (line 79), then line 100 tests
`isStretchRunning && frame.currentBpm !== undefined` again. The second check is
purely to re-narrow `frame.currentBpm` for the `.toFixed(1)` call at line 125;
it is logically redundant. A reader may mistake it for a meaningful second
condition.
**Fix:** Narrow once (e.g. hoist `const currentBpm = frame?.currentBpm`) or add
a comment that the repeat exists only for TS narrowing.

### IN-03: `message: 'Session complete'` literal still bypasses i18n in the domain layer

**File:** `src/domain/sessionController.ts:34,140`
**Issue:** `CompleteSessionState.message` is the hardcoded English literal
`'Session complete'`. `SessionReadout` already renders the translated
`strings.sessionComplete` via the `showCompletionHeadline` prop (the Phase 19
CR-01 fix noted in `SessionReadout.tsx:22-24`), so this field appears to be
unused dead state. Carrying a non-translatable user-facing string in domain
state invites a future regression where someone renders `state.message`
directly.
**Fix:** Remove the `message` field from `CompleteSessionState` if nothing
reads it, or document that it is internal-only and never user-facing.

---

_Reviewed: 2026-05-15_
_Reviewer: Claude (gsd-code-reviewer)_
_Depth: standard_
