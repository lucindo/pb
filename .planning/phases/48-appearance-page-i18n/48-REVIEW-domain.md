---
phase: 48-appearance-page-i18n
reviewed: 2026-05-26T00:00:00Z
depth: deep
scope: src/domain
files_reviewed: 10
files_reviewed_list:
  - src/domain/breathingPlan.ts
  - src/domain/index.ts
  - src/domain/naviKriyaSession.ts
  - src/domain/naviKriyaSettings.ts
  - src/domain/sessionAudio.ts
  - src/domain/sessionController.ts
  - src/domain/sessionLifecycle.ts
  - src/domain/sessionMath.ts
  - src/domain/settings.ts
  - src/domain/stretchRamp.ts
findings:
  critical: 0
  warning: 4
  info: 6
  total: 10
status: issues_found
---

# Phase 48: Code Review Report (Domain Layer)

**Reviewed:** 2026-05-26T00:00:00Z
**Depth:** deep
**Scope:** src/domain (pure-domain layer)
**Files Reviewed:** 10
**Status:** issues_found

## Summary

Deep review of the entire `src/domain/` surface following Phase 48's i18n/appearance work. None of these files were touched by the phase diff itself (no `appearance.*` keys reference domain code), but they were submitted for adversarial review as the foundation under the new UI surface.

The domain layer is well-structured and pure-functional. The state-machine (`SessionState` discriminated union, NK engine record) is largely complete, invariants are explicit in comments, and validation predicates are defensive. The stretch-ramp residual-absorption logic is non-trivial but documented in detail and includes a deliberate `CLAMP_EPSILON_MS` to avoid a phantom extra-cycle bug at the exact end boundary.

No critical bugs or security vulnerabilities were found.

Four warnings concern: (1) an exported pure function `getNaviKriyaBackCount` lacking the multiple-of-4 invariant guard that its caller's settings predicate enforces — defense-in-depth gap, (2) `getClosestLowerStretchTargetBpm` returning an invariant-violating fallback when initialBpm has no lower BPM_OPTIONS value, (3) `getStretchFrame` taking an unsanitized `segments` array with no empty-array guard, (4) `extendTimedSession`'s dead `Number.isFinite` check that signals an unstated invariant.

Six info items track minor code-quality and structural concerns.

## Warnings

### WR-01: `getNaviKriyaBackCount` lacks the multiple-of-4 invariant guard

**File:** `src/domain/naviKriyaSession.ts:14-16`

**Issue:** `getNaviKriyaBackCount(frontCount)` returns `frontCount / 4` with no input validation. The settings layer (`isValidFrontCount` in `naviKriyaSettings.ts:30-36`) enforces that `frontCount` must be a positive integer multiple of 4 ("Pitfall 5 guard" per the comment), but this exported pure function does not assert that invariant defensively. A caller that bypasses validation (e.g., a future code path that constructs `NaviKriyaSettings` from an untrusted source, or a test fixture) can pass `frontCount = 100.5` or `frontCount = 7`, and the function silently returns `25.125` or `1.75`. Downstream, `e.count >= target` in `useNKEngine.ts:151` compares an integer counter against a fractional target, which means `count >= 1.75` triggers at `count === 2` — one OM too many in the back phase. This is a latent state-machine completeness defect.

Note: `getNaviKriyaPhaseTarget` (same file, line 18) also lacks defensive validation and propagates the same risk.

**Fix:** Add the defensive guard mirroring the rampDurationMinutes / targetBpm guards in `stretchRamp.ts:93-103`:

```ts
export function getNaviKriyaBackCount(frontCount: number): number {
  if (!Number.isFinite(frontCount) || !Number.isInteger(frontCount) || frontCount <= 0 || frontCount % 4 !== 0) {
    throw new RangeError('frontCount must be a positive integer multiple of 4')
  }
  return frontCount / 4
}
```

This makes the pure function safe to call from any caller without trusting upstream settings validation — matching the pattern already established in `buildStretchSegments`.

### WR-02: `getClosestLowerStretchTargetBpm` fallback can produce an invariant-violating value

**File:** `src/domain/settings.ts:105-108`

**Issue:**

```ts
export function getClosestLowerStretchTargetBpm(initialBpm: number): number {
  const options = getStretchTargetBpmOptions(initialBpm)
  return options[options.length - 1] ?? DEFAULT_STRETCH_SETTINGS.targetBpm
}
```

When `initialBpm <= 1` (the lowest entry in `BPM_OPTIONS`), `getStretchTargetBpmOptions(initialBpm)` returns `[]` (no BPM < 1 in the table). The fallback then returns `DEFAULT_STRETCH_SETTINGS.targetBpm` which is `4.5`. But `4.5 >= 1`, which violates the `targetBpm < initialBpm` invariant. If the result is then fed into `StretchSettings` and through `validateStretchSettings`, the validator (`settings.ts:240`) correctly throws — but only at validation time, far from the call site. Worse, `getStretchSettingsWithInitialBpm` (line 110) calls this directly and returns an invariant-violating `StretchSettings` if `targetBpm >= initialBpm`, bypassing validation.

This is currently gated by `STRETCH_INITIAL_BPM_OPTIONS` filtering to `>= 1.5` in the picker UI, but the gate is upstream only; the exported function does not enforce it. Per the file's own comment at `settings.ts:53` "Pitfall 4 — prevents empty targetBpm picker", the entire intent of `STRETCH_INITIAL_BPM_OPTIONS` is to avoid an empty options array, but the protection is by-convention only.

**Fix:** Either (a) widen the lowest BPM option so there is always at least one lower value, or (b) make the function fail loudly when the precondition is violated:

```ts
export function getClosestLowerStretchTargetBpm(initialBpm: number): number {
  const options = getStretchTargetBpmOptions(initialBpm)
  const closest = options[options.length - 1]
  if (closest === undefined) {
    throw new RangeError(`No BPM option is strictly below initialBpm=${initialBpm}`)
  }
  return closest
}
```

This makes the invariant enforcement visible at the call site, not deferred to `validateStretchSettings`.

### WR-03: `getStretchFrame` lacks empty-segments guard; trusts caller's array shape

**File:** `src/domain/stretchRamp.ts:217-230`

**Issue:** The function opens with:

```ts
let activeSeg = segments[segments.length - 1] as StretchSegment
```

The `as StretchSegment` cast hides that `segments[segments.length - 1]` is `undefined` when `segments.length === 0`. Subsequent reads of `activeSeg.endMs` / `activeSeg.startMs` would then throw a runtime TypeError. `buildStretchSegments` guarantees a non-empty array under valid inputs, but the function is exported and the type signature accepts any `StretchSegment[]` — including `[]`. The cast is misleading because TypeScript will not flag the unsafe access at the call site.

This is the same defensive pattern that `computeStretchTotalMs` (line 310) already implements correctly with an explicit `if (finalSegment === undefined) throw new Error(...)`. The discipline is inconsistent across the file.

**Fix:** Add the same guard at the top of `getStretchFrame`:

```ts
export function getStretchFrame(
  segments: StretchSegment[],
  elapsedMs: number,
): StretchSessionFrame {
  if (segments.length === 0) {
    throw new RangeError('getStretchFrame requires a non-empty segments array')
  }
  const safeElapsedMs = Math.max(0, elapsedMs)
  // ... rest unchanged
```

Drop the `as StretchSegment` cast on the `activeSeg` initializer once the guard is in place — the non-empty array contract makes the index access safe.

### WR-04: `extendTimedSession` has dead `Number.isFinite` check and missing equality-case message

**File:** `src/domain/sessionController.ts:118-124`

**Issue:**

```ts
if (!(DURATION_OPTIONS as readonly DurationOption[]).includes(durationMinutes)) {
  throw new RangeError('durationMinutes must be one of DURATION_OPTIONS')
}

if (!Number.isFinite(durationMinutes) || durationMinutes <= state.lockedSettings.durationMinutes) {
  throw new RangeError('Timed sessions can only be extended to a greater finite duration')
}
```

The `Number.isFinite(durationMinutes)` clause is dead code: any value not in `DURATION_OPTIONS` (a finite-number-only set excluding `'open-ended'`, which can't reach this line because `lockedSettings.durationMinutes === 'open-ended'` was already rejected) would have thrown above. `NaN` and `Infinity` are not in `DURATION_OPTIONS`, so they hit the first throw. The second clause's `Number.isFinite` check is unreachable.

The combined error message also conflates two distinct failure modes: "not finite" (impossible per the previous check) and "not greater than current" (the real failure). When a user passes a valid `DURATION_OPTIONS` value that equals the current duration, the error message says "must be greater than finite duration" — confusing because finiteness was never the issue.

**Fix:** Drop the dead check and split the error messages:

```ts
if (!(DURATION_OPTIONS as readonly DurationOption[]).includes(durationMinutes)) {
  throw new RangeError('durationMinutes must be one of DURATION_OPTIONS')
}

if (durationMinutes <= state.lockedSettings.durationMinutes) {
  throw new RangeError(
    `Cannot extend to ${durationMinutes} (current is ${state.lockedSettings.durationMinutes}); new duration must be strictly greater`,
  )
}
```

This reflects the actual invariants (membership + monotonic increase) and removes the unreachable code path.

## Info

### IN-01: Mutability of frame fields contradicts the "pure function" claim

**File:** `src/domain/sessionMath.ts:6-21`, `src/domain/stretchRamp.ts:22-31`

**Issue:** `SessionFrame` and `StretchSegment` are interface types whose fields are not `readonly`. The file headers describe these modules as pure-functional, but the return values are deeply mutable. A consumer can `frame.elapsedMs = -999` and silently corrupt downstream state. The `BreathingPlan` interface (`breathingPlan.ts:4-11`) has the same shape. Other domain interfaces (`StretchSettings`, `NaviKriyaSettings`) also use non-readonly fields.

**Fix:** Mark fields `readonly` on all returned value types:

```ts
export interface SessionFrame {
  readonly phase: BreathPhase
  readonly phaseLabel: 'In' | 'Out'
  readonly elapsedMs: number
  // ...
}
```

This is a defense-in-depth measure — TS-only, no runtime cost — that signals intent and catches accidental mutation at compile time.

### IN-02: `cloneSettings` is a one-liner shallow copy that adds no safety

**File:** `src/domain/sessionController.ts:39-41`

**Issue:** `cloneSettings({ ...settings })` is a single spread. The function adds a named identifier but provides no deeper protection: `SessionSettings` is already flat (only primitives). If a future field becomes an object/array, the shallow clone silently shares references with the caller, defeating the abstraction.

**Fix:** Either inline the spread (it's clearer at the call sites) or document the contract:

```ts
// SessionSettings contains only primitives — a shallow copy is intentionally sufficient.
// If any field becomes an object/array, change this to a deep clone.
function cloneSettings(settings: SessionSettings): SessionSettings {
  return { ...settings }
}
```

### IN-03: Duplicated `RATIO_PARTS` table across `breathingPlan.ts` and `stretchRamp.ts`

**File:** `src/domain/breathingPlan.ts:15-20` and `src/domain/stretchRamp.ts:51-56`

**Issue:** Both files define an identical `RATIO_PARTS: Record<RatioLabel, { inhale: number; exhale: number }>` constant. A future edit to one (e.g., adding a `'10:90'` ratio) requires manual mirror-edit of the other. The comment in `stretchRamp.ts:47` even acknowledges "mirroring breathingPlan.ts" — explicit copy-paste.

**Fix:** Extract to `src/domain/ratioParts.ts` (or alongside `RatioLabel` in `settings.ts`):

```ts
// settings.ts (with RatioLabel)
export const RATIO_PARTS: Record<RatioLabel, { inhale: number; exhale: number }> = {
  '50:50': { inhale: 50, exhale: 50 },
  '40:60': { inhale: 40, exhale: 60 },
  '30:70': { inhale: 30, exhale: 70 },
  '20:80': { inhale: 20, exhale: 80 },
}
```

Then `import { RATIO_PARTS } from './settings'` in both consumers.

### IN-04: `endSession` discards `StretchSettings` with no domain-layer recovery path

**File:** `src/domain/sessionController.ts:95-100`

**Issue:** When ending a stretch `CompleteSessionState`, `endSession` returns an `IdleSessionState` containing only `selectedSettings` (the resonant standard config preserved through the session). The original `StretchSettings` are not retained anywhere in the domain layer — they exist only as the segment table inside `state.stretchSegments` and the synthetic lead-in plan inside `state.lockedSettings`. Neither carries the original `targetBpm`, `warmUpMinutes`, `rampDurationMinutes`, or `coolDownMinutes` in a recoverable form.

The architectural intent is that callers (storage layer / hooks) persist the `StretchSettings` separately and re-supply them on next start. This is documented in `sessionController.ts:64-66`, but it means the domain layer does not own the full session-state lifecycle for stretch sessions. A consumer that drops the original `StretchSettings` reference (e.g., a hook that re-mounts) cannot recover them from the domain state machine. This is a *state-machine completeness* concern rather than a bug.

**Fix:** Either (a) document this contract more prominently in `sessionLifecycle.ts` (currently 3 lines), or (b) extend `CompleteSessionState` (and `RunningSessionState`) with an optional `stretchSettings?: StretchSettings` field carried through the lifecycle so `endSession` can return them or callers can read them. Option (b) trades a small memory cost for full domain-layer recoverability.

### IN-05: `sessionLifecycle.ts` is a 3-line type-only file with overlapping concerns

**File:** `src/domain/sessionLifecycle.ts:1-3`

**Issue:** The file exports `BreathingSessionPhase`, `LeadInDigit`, and `NaviLeadInDigit` — three type aliases unrelated to the `SessionState` discriminated union in `sessionController.ts`. The name "sessionLifecycle" suggests this is the canonical lifecycle layer, but the actual lifecycle (`idle | running | complete`) lives in `sessionController.ts:10`. The current file is misleading.

Also: `NaviLeadInDigit = LeadInDigit` is a type alias that adds no information.

**Fix:** Either (a) rename the file to `sessionLifecycleTypes.ts` (or fold the types into `sessionController.ts` / `naviKriyaSession.ts`), or (b) move the `SessionStatus`/`SessionState` types here and re-export from `sessionController.ts`. Drop `NaviLeadInDigit` as a useless alias and have NK code use `LeadInDigit` directly.

### IN-06: `computeBoundaryAudioOffsets` silently masks `cycleStartMs` semantics

**File:** `src/domain/sessionAudio.ts:13-21`

**Issue:** The function branches on `frame.cycleStartMs !== undefined` to distinguish stretch from standard frames. For standard frames the offset uses `frame.cycleIndex * plan.cycleMs`, but for stretch frames it uses `frame.cycleStartMs`. The two formulas can disagree if a stretch frame happens to have `cycleStartMs === cycleIndex * plan.cycleMs` (i.e., never, because stretch BPM varies). The function works correctly today, but the duck-typing on optional fields is fragile.

Specifically, if a future `SessionFrame` consumer ever sets `cycleStartMs` on a standard frame for any reason, the function silently switches branches and uses a different formula. Type narrowing through optional fields is not safe.

**Fix:** Make the discriminator explicit. Either pass an explicit `mode: 'standard' | 'stretch'` argument, or split into two functions (`computeStandardBoundaryOffsets` / `computeStretchBoundaryOffsets`) with distinct argument shapes:

```ts
export function computeBoundaryAudioOffsets(
  frame: SessionFrame,
  plan: BreathingPlan,
  mode: 'standard' | 'stretch',
): BoundaryAudioOffsets {
  if (mode === 'stretch') {
    // ...
  }
  // ...
}
```

This makes the contract visible at every call site rather than depending on field presence.

---

_Reviewed: 2026-05-26T00:00:00Z_
_Reviewer: Claude (gsd-code-reviewer)_
_Depth: deep_
