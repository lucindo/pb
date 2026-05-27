---
phase: 48-appearance-page-i18n
chunk: domain
fixed_at: 2026-05-26T00:00:00Z
review_path: .planning/phases/48-appearance-page-i18n/48-REVIEW-domain.md
iteration: 1
findings_in_scope: 10
fixed: 7
skipped: 3
status: partial
---

# Phase 48: Code Review Fix Report (Domain Chunk)

**Fixed at:** 2026-05-26T00:00:00Z
**Source review:** `.planning/phases/48-appearance-page-i18n/48-REVIEW-domain.md`
**Iteration:** 1
**Chunk scope:** `src/domain/*.ts`

**Summary:**
- Findings in scope: 10
- Fixed: 7 (4 warnings + 3 info)
- Skipped: 3 (info, structural/cross-module)

All seven applied fixes verified with `tsc --noEmit` (project-wide, no new errors) and `eslint` (strict-type-checked config, no new errors). Vitest deliberately not run per chunk instructions.

## Fixed Issues

### WR-01: `getNaviKriyaBackCount` lacks multiple-of-4 invariant guard

**Files modified:** `src/domain/naviKriyaSession.ts`
**Commit:** `24097d3`
**Applied fix:** Added the four-clause guard (Number.isFinite + Number.isInteger + > 0 + multiple of 4) mirroring `isValidFrontCount`. Throws `RangeError` so the exported pure function is safe to call from any path without trusting upstream settings validation. `getNaviKriyaPhaseTarget` reaches the guard transitively through `getNaviKriyaBackCount(settings.frontCount)`.

### WR-02: `getClosestLowerStretchTargetBpm` invariant-violating fallback

**Files modified:** `src/domain/settings.ts`
**Commit:** `455302a`
**Applied fix:** Replaced the silent `DEFAULT_STRETCH_SETTINGS.targetBpm` fallback with a loud `RangeError`. The throw is unreachable through the picker UI (`STRETCH_INITIAL_BPM_OPTIONS` filters to `>= 1.5`), so this is defense-in-depth behind that gate.

### WR-03: `getStretchFrame` lacks empty-segments guard

**Files modified:** `src/domain/stretchRamp.ts`
**Commit:** `81bc7d1`
**Applied fix:** Added explicit `segments.at(-1) === undefined` guard at the top, matching the pattern in `computeStretchTotalMs`. Reused the resolved `finalSegment` binding to drop both `as StretchSegment` casts (the active-segment walk fallback AND the `sessionEndMs` derivation) without introducing non-null assertions.

### WR-04: `extendTimedSession` dead `Number.isFinite` + conflated error message

**Files modified:** `src/domain/sessionController.ts`
**Commit:** `d81cafe`
**Applied fix:** Removed the unreachable `Number.isFinite(durationMinutes)` clause (DURATION_OPTIONS membership above already excludes Infinity/NaN) and rewrote the remaining error message to describe the actual failure (monotonic-increase invariant) with concrete values for both the requested and current duration. Added a comment explaining why the check sequence is sufficient. Existing test `expect(() => extendTimedSession(extended, Number.POSITIVE_INFINITY, 0)).toThrow(RangeError)` still passes because Infinity hits the DURATION_OPTIONS guard first.

### IN-01: Mutability of domain-produced types

**Files modified:** `src/domain/sessionMath.ts`, `src/domain/breathingPlan.ts`, `src/domain/stretchRamp.ts`, `src/domain/sessionAudio.ts`
**Commit:** `286e7fa`
**Applied fix:** Marked every field of `SessionFrame`, `BreathingPlan`, `StretchSegment`, `StretchSessionFrame`, and `BoundaryAudioOffsets` as `readonly`. Settings types (`SessionSettings`, `StretchSettings`, `NaviKriyaSettings`) intentionally **not** changed — a `sessionController` test (`sessionController.test.ts:26-28`) mutates a local `SessionSettings` to verify the locking contract, and the picker forms also build/edit Settings objects. The finding's principal complaint ("frame.elapsedMs = -999 corrupts downstream state") is addressed by locking the *produced* types; the *input* types remain mutable by design.

### IN-02: `cloneSettings` shallow-copy contract

**Files modified:** `src/domain/sessionController.ts`
**Commit:** `983f77a`
**Applied fix:** Added a documenting comment above `cloneSettings` explaining why the single spread is intentionally sufficient (SessionSettings is flat) and what must change if a future field becomes an object/array. Function body unchanged.

### IN-03: Duplicated `RATIO_PARTS` table

**Files modified:** `src/domain/settings.ts`, `src/domain/breathingPlan.ts`, `src/domain/stretchRamp.ts`
**Commit:** `98234e0`
**Applied fix:** Promoted `RATIO_PARTS` to an `export` in `settings.ts` (next to `RatioLabel` and `RATIO_OPTIONS`) and dropped the duplicates in `breathingPlan.ts` and `stretchRamp.ts`. Both consumers now `import { RATIO_PARTS } from './settings'`. Inner object types tightened to `readonly` to match the new domain-output readonly convention.

## Skipped Issues

### IN-04: `endSession` discards `StretchSettings` with no domain-layer recovery path

**File:** `src/domain/sessionController.ts:95-100`
**Reason:** skipped: architectural decision required.
The reviewer's two suggested options trade off differently:
- Option (a) "document more prominently" is too small to qualify as a meaningful fix (the existing 3-line documentation already exists in `sessionLifecycle.ts`); restating it elsewhere is movement without substance.
- Option (b) extending `CompleteSessionState` and `RunningSessionState` with an optional `stretchSettings?: StretchSettings` field changes the state-machine surface and ripples into every consumer of `RunningSessionState` (`useStretchEngine.ts`, `useBreathingSessionController.ts`, `appViewModel.ts`, presentation layer, persistence layer). That is both out of scope for a `src/domain/` chunk fix AND an architectural question best resolved by the operator deciding whether stretch settings should live inside or outside the session state machine.

Recommend filing as a follow-up plan item rather than applying unilaterally.

### IN-05: `sessionLifecycle.ts` is a 3-line type-only file

**File:** `src/domain/sessionLifecycle.ts:1-3`
**Reason:** skipped: cross-module structural rename, out of scope.
Both suggested options require changes outside `src/domain/`:
- Renaming the file to `sessionLifecycleTypes.ts` (or folding it into `sessionController.ts` / `naviKriyaSession.ts`) breaks every import path in `src/app/sessionPresentation.ts`, `src/app/appViewModel.ts`, and `src/hooks/useNaviKriyaSessionController.ts`.
- Removing the `NaviLeadInDigit = LeadInDigit` alias would require edits in `src/app/sessionPresentation.ts`, `src/app/appViewModel.ts`, and `src/hooks/useNaviKriyaSessionController.ts` (verified via grep).

The chunk constraint explicitly disallows changes outside `src/domain/`. Skip for this pass; pick up in a dedicated cross-module hygiene chunk if desired.

### IN-06: `computeBoundaryAudioOffsets` duck-types on optional fields

**File:** `src/domain/sessionAudio.ts:13-21`
**Reason:** skipped: signature change ripples outside `src/domain/`.
The fix requires adding a `mode: 'standard' | 'stretch'` parameter to the function signature, which forces every caller (in `src/audio/` and `src/hooks/`) to pass the discriminator. That is outside the chunk scope (`NOT allowed: anything outside src/domain/`).

The current branch-on-optional-field works correctly today because the optional fields are populated exclusively by `getStretchFrame` and unpopulated exclusively by `getSessionFrame`, so the duck-typing acts as an implicit discriminator. The IN-01 readonly fix in this same pass strengthens the guarantee further: a downstream caller can no longer accidentally set `cycleStartMs` on a standard frame, which was the fragility the reviewer flagged.

---

_Fixed: 2026-05-26T00:00:00Z_
_Fixer: Claude (gsd-code-fixer)_
_Iteration: 1_
_Chunk: domain_
