---
phase: 50-sessionclock-scheduler-abstraction
reviewed: 2026-05-27T00:00:00Z
depth: standard
files_reviewed: 39
files_reviewed_list:
  - src/app/App.audio.test.tsx
  - src/app/App.session.test.tsx
  - src/app/appControllerAdapters.test.ts
  - src/app/appViewModel.test.ts
  - src/app/sessionPresentation.test.ts
  - src/audio/audioEngine.test.ts
  - src/audio/audioEngine.ts
  - src/audio/sessionClock.driftGuard.fixture.txt
  - src/audio/sessionClock.driftGuard.test.ts
  - src/audio/sessionClock.test.ts
  - src/audio/sessionClock.ts
  - src/components/OrbShape.test.tsx
  - src/components/OrbShape.tsx
  - src/components/SessionReadout.test.tsx
  - src/components/SessionReadout.tsx
  - src/components/SettingsForm.stretch.test.tsx
  - src/components/StretchSettingsForm.tsx
  - src/domain/breathingPlan.test.ts
  - src/domain/breathingPlan.ts
  - src/domain/naviKriyaSession.ts
  - src/domain/sessionAudio.test.ts
  - src/domain/sessionAudio.ts
  - src/domain/sessionController.test.ts
  - src/domain/sessionController.ts
  - src/domain/sessionMath.test.ts
  - src/domain/sessionMath.ts
  - src/domain/stretchRamp.test.ts
  - src/domain/stretchRamp.ts
  - src/hooks/useAmbientScale.test.tsx
  - src/hooks/useAmbientScale.ts
  - src/hooks/useAudioCues.test.tsx
  - src/hooks/useAudioCues.ts
  - src/hooks/useBreathingSessionController.ts
  - src/hooks/useNKEngine.test.tsx
  - src/hooks/useNKEngine.ts
  - src/hooks/useNaviKriyaAudio.ts
  - src/hooks/useNaviKriyaSessionController.ts
  - src/hooks/useSessionEngine.test.tsx
  - src/hooks/useSessionEngine.ts
findings:
  critical: 0
  warning: 7
  info: 5
  total: 12
status: issues_found
---

# Phase 50: Code Review Report

**Reviewed:** 2026-05-27T00:00:00Z
**Depth:** standard
**Files Reviewed:** 39
**Status:** issues_found

## Summary

Phase 50 introduces the `SessionClock` abstraction (`src/audio/sessionClock.ts`) and rewires five hooks (`useSessionEngine`, `useAudioCues`, `useNaviKriyaAudio`, `useNKEngine`, `useAmbientScale`) plus the engine itself to consume it. The drift-guard test fs-scans those five caller files for direct `performance.now()`, `new AudioContext()`, and `audioCtx.currentTime` reads. The ms→sec rename cascade through `sessionController`, `sessionMath`, `stretchRamp`, `breathingPlan`, and `sessionAudio` is consistent and well-documented.

**Adversarial assessment:** No security issues. No data-loss risks. No null/undefined dereference hazards. Tracing all five caller hooks through their new `SessionClock` plumbing confirms the architectural contracts hold; engine-only `notifySuspended()` escape hatch is correctly scoped via the augmented factory return type and never re-exported. The rename cascade is type-safe (no shadowed `ms`/`sec` variables visible).

The findings below are quality/maintainability concerns and forward-looking hazards. None block shipping Phase 50 as-is: the per-commit green-gate is met, the abstraction boundary holds, and observable behavior is preserved byte-identically per the success criteria. Phase 51 callers should re-examine WR-01 before relying on this seam for clock-source unification.

## Critical Issues

(none — no BLOCKER-tier findings surfaced)

## Warnings

### WR-01: `useAmbientScale.ts` per-tick math bypasses the SessionClock seam

**File:** `src/hooks/useAmbientScale.ts:54-63`
**Issue:** The rAF callback reads `nowSec = now / 1000` from the DOMHighResTimeStamp arg instead of `wallClock.now()`. Per the Phase 50 PATTERNS.md migration sketch (lines 552-577), every per-tick read should go through the injected clock so Phase 51 can substitute the time source by swapping the factory body. The current implementation only routes the INITIAL `start = wallClock.now()` through the clock — every subsequent tick reads the rAF timestamp directly. The decision is documented as "revision 1 Warning #8" (preserve byte-identicality), but it creates a forward-looking hazard: Phase 51's goal of rebasing onto `audioCtx.currentTime` cannot be achieved here without also re-touching this file, because the rAF timestamp is intrinsically wall-clock. The "seam" Phase 50 introduces for this hook is effectively cosmetic — only the start capture flows through it. If Phase 51 (or 52) needs the ambient rAF to track audio time during an active session, the rAF arm must be re-touched.

**Fix:** Either (a) acknowledge in `useAmbientScale.ts` that this hook will not participate in Phase 51's audio-clock rebase and is intentionally pinned to wall time, OR (b) call `wallClock.now()` at top-of-tick instead of converting the rAF timestamp. Choice (b) costs one extra reads-per-frame at no observable behavior change today and preserves the seam.
```typescript
// Option (b): top-of-tick clock read
const tick = () => {
  if (cancelled) return
  const nowSec = wallClock.now()  // was: const nowSec = now / 1000 (where `now` is rAF DOMHighResTimeStamp)
  // ... rest unchanged
}
```

### WR-02: Engine's `schedule()` silently ignores `cue.timbre` on `'in'`/`'out'` cases

**File:** `src/audio/audioEngine.ts:349-356`
**Issue:** The `Cue` discriminated union types `'in'` and `'out'` variants with required `timbre: TimbreId` payload (`src/audio/sessionClock.ts:63-64`). But the engine's `schedule()` dispatcher uses the engine-instance-captured `sessionTimbre` (line 353, 356) and ignores `cue.timbre` from the payload. A future external caller — including Phase 52's lookahead scheduler that the closed catalog (D-04, D-06) was designed for — that passes `cue.timbre: 'flute'` while the engine was constructed with `timbre: 'bell'` will silently get `'bell'`. The behavior is documented in the inline comment (L349-351), but the type signature does not reflect it. The test at `audioEngine.test.ts:783-797` even asserts the override: `cue.timbre: 'flute'` is ignored, `sessionTimbre: 'bell'` wins.

**Fix:** Either (a) drop `timbre` from the `Cue` `'in'`/`'out'` payload — it is dead at this layer — and let Phase 52's lookahead scheduler resolve timbre through its own context, OR (b) honor `cue.timbre` when supplied and fall back to `sessionTimbre` only when omitted (make the field optional and document explicit-override-wins). Today's "type says required, runtime ignores" is the worst of both worlds.
```typescript
// Option (a): drop the unused payload field
| { kind: 'in'; phaseDurationSec: number }
| { kind: 'out'; phaseDurationSec: number }
```

### WR-03: Drift-guard `stripComments` does not handle string literals — false-positive risk on future callers

**File:** `src/audio/sessionClock.driftGuard.test.ts:105-114`
**Issue:** The comment-stripper uses regex `/\/\*[\s\S]*?\*\//g` for block comments and `/(^|[^:])\/\/[^\n]*/g` for line comments. It does NOT strip string literals. A future caller that legitimately contains the literal string `"performance.now("` (e.g., in an error message, a documentation string, a log message) would trip the production drift-guard. The fixture test at lines 160-186 documents the limitation by asserting the regex DOES match the fixture's literals — but `.toBe(true)` in that sub-test means the limitation is locked in as an EXPECTED behavior, not flagged for repair. The mitigation rests entirely on "manual audit (Plans 50-02 through 50-05)" — a process control with no automated enforcement on future PRs touching these files.

**Fix:** Either (a) replace the regex-based stripper with a real tokenizer (e.g., a tiny TS-aware lexer or `typescript-estree`) so string literals are excluded; or (b) tighten the regex to also strip `'...'`, `"..."`, and `` `...` `` string literals (covers the common case). The fixture test should then assert `.toBe(false)` for the string-literal cases — making the test name positive ("string literals are NOT false-positives") rather than the current "limitation documented" framing. Otherwise the drift-guard's exclusion mechanism (`exemptFiles`) becomes the only repair path, and every future caller that needs banned tokens in source comments-or-strings must be added by name — defeating the purpose of an automated drift-guard.

### WR-04: `useNaviKriyaAudio` constructs a SessionClock per `begin()` call but only consumes `.now()`

**File:** `src/hooks/useNaviKriyaAudio.ts:79`
**Issue:** Inside `begin()`, after `audioCtx` is constructed, `createAudioSessionClock(audioCtx)` is called without `scheduleImpl`. The clock object holds three subscriber `Set`s (suspend, resume, close), attaches a `statechange` listener to the audioCtx, and exposes `schedule`/`setMasterGain`/`onSuspend`/`onResume`/`onClose` — none of which are used. The hook only reads `clock.now()` once per cue dispatch (via `cueWhen`). The unused machinery is technically harmless (the empty subscriber Sets fan no-ops; the listener is GC'd when the audioCtx is collected) but represents real construction-time cost (one `addEventListener` call, three Set allocations, six closure allocations) on every NK session start.

**Fix:** For the NK case where only `now()` is needed, either (a) introduce a narrower factory `createAudioClockReader(audioCtx): Pick<SessionClock, 'now'>` that returns just `{ now: () => audioCtx.currentTime }`, or (b) accept the overhead and add a one-line comment in `useNaviKriyaAudio.ts` explaining that the unused subscriber machinery is intentionally tolerated for symmetry with the HRV path. The CONTEXT memo at L46 says "useNaviKriyaAudio: NK passes NO scheduleImpl — clock.schedule is a no-op" — but doesn't address the equally-unused subscriber Sets.

### WR-05: `audioEngine.schedule()` has duplicate dispatch arms for `'lead-in-tick'` and `'countdown-tick'`

**File:** `src/audio/audioEngine.ts:343-348`
**Issue:** Both `case 'lead-in-tick'` and `case 'countdown-tick'` execute the identical body: `activeCues.add(scheduleCountdownTick(audioCtx, when, audioCtx.destination, sessionTimbre))`. The closed `Cue` catalog (D-04) lists both as separate kinds, but the engine's dispatch collapses them. There is no observable difference between the two at Phase 50. The kinds were preserved separately for Phase 52 disambiguation (per the patterns memo), but the duplication is real today: a refactor that touches one arm but not the other (e.g., adding bookkeeping) will silently diverge their semantics.

**Fix:** Factor the shared body into a single switch arm via case fall-through, OR collapse them in the type definition and add a new `'lead-in-tick'` field if Phase 52 needs to distinguish them later. Today's arrangement is verbose without information density.
```typescript
case 'lead-in-tick':
case 'countdown-tick':
  activeCues.add(scheduleCountdownTick(audioCtx, when, audioCtx.destination, sessionTimbre))
  return
```

### WR-06: `sessionClock.test.ts` "augmented return type" test does not verify the runtime narrowing

**File:** `src/audio/sessionClock.test.ts:277-294`
**Issue:** The test claims to verify that "a SessionClock-widened reference does not [expose notifySuspended]" but only asserts the type-level narrowing (`const publicClock: SessionClock = augmentedClock`). At runtime, `publicClock.notifySuspended` is still a real function on the object — only the TypeScript compiler refuses to let you call it. The test does NOT have a runtime assertion proving inaccessibility (e.g., `expect((publicClock as any).notifySuspended).toBe(...)`). The comment at L286-289 acknowledges this ("runtime the method still exists on the object") but the assertion only checks `typeof publicClock.now`, which is always present in `SessionClock` anyway. As a regression guard against accidentally exposing `notifySuspended` via the public surface, this test is weak: removing the type narrowing at line 584 of `audioEngine.ts` (or refactoring the augmented return type) would not fail this test, because the runtime object continues to expose the method.

**Fix:** Either (a) accept that this is a tsc-only invariant and remove the runtime test entirely with a comment pointing to a `// @ts-expect-error` line that proves the type-level guard; or (b) make `notifySuspended` truly private at runtime (e.g., via a `Symbol`-keyed property or a separate object holding only the public surface that the augmented factory return wraps). The current arrangement has the worst test asymmetry: `createWallSessionClock`'s analogous test at L371-380 uses `@ts-expect-error` to prove the type-level guard and verifies `probe === undefined` at runtime — that test IS discriminating. The audio-clock test should mirror it.

### WR-07: Cue `phaseDurationSec` accepts `NaN`/`Infinity` without validation

**File:** `src/audio/audioEngine.ts:353,356`; `src/audio/sessionClock.ts:63-64`
**Issue:** The `Cue` `'in'`/`'out'` variants type `phaseDurationSec: number` — any finite or non-finite number passes the type check. A future caller (Phase 52 lookahead) that computes `phaseDurationSec` from a divide-by-zero or `Math.log(0)` could pass `Infinity` or `NaN`. The downstream `scheduleInCueForTimbre` / `scheduleOutCueForTimbre` (`src/audio/cueSynth.ts`) consume this for the bowl-decay envelope stretch. Web Audio's `setValueAtTime`/`exponentialRampToValueAtTime` throws on non-finite values. The engine has no defensive guard; the SessionClock's `schedule()` dispatch forwards verbatim. The current production callers (`scheduleNextCue` at audioEngine.ts:432, `scheduleLeadIn` at L406) derive `phaseDurationSec` from `plan.inhaleSec` / `plan.exhaleSec` which are always finite — so this is dormant. But once Phase 52 opens the surface to external callers, the validation gap becomes reachable.

**Fix:** Add a guard in `schedule()` for the `'in'` and `'out'` cases — if `phaseDurationSec` is not finite or is negative, log a dev-only warning and either skip the dispatch or clamp to a sane default. The cost is one `Number.isFinite()` call per dispatch.
```typescript
case 'in':
case 'out':
  if (!Number.isFinite(cue.phaseDurationSec) || cue.phaseDurationSec <= 0) {
    if (import.meta.env.DEV) {
      // eslint-disable-next-line no-console
      console.warn(`[audioEngine] schedule(${cue.kind}) ignoring non-finite phaseDurationSec`, cue.phaseDurationSec)
    }
    return
  }
  // ... existing dispatch
```

## Info

### IN-01: Forward-looking comments reference Phases 51/52/53 but don't lock to issue numbers

**File:** `src/audio/sessionClock.ts:21-23,118-122`; `src/audio/audioEngine.ts:74-83`
**Issue:** Multiple comments reference "Phase 53 lands the GainNode insertion" and "Phase 52 lookahead may wire NK through schedule() later". These are future-tense aspirations. Per the `no-design-locking` memory rule, comments should not anchor downstream-modifiable plans. If Phases 51-53 are re-ordered or absorbed (as happened with Phase 36's spike-wrap-up deletion), these comments become stale future-tense notes. The CONTEXT.md is the right place for cross-phase coupling — code comments should describe what the code does today.

**Fix:** Replace "Phase 53 lands ..." with "this is intentionally a no-op today; the GainNode insertion is tracked in `.planning/...` if/when scheduled". Avoid hard-coded phase numbers in source comments. Or accept this as project convention (per the existing audioEngine.ts patterns) and lock in the convention explicitly in CLAUDE.md.

### IN-02: `useSessionEngine.test.tsx` shares a module-scoped `fakeClock` across tests

**File:** `src/hooks/useSessionEngine.test.tsx:22`
**Issue:** `const fakeClock = createWallSessionClock()` at module scope means every `renderHook(() => useSessionEngine(..., fakeClock))` call receives the same clock instance. The clock is stateless (just a wrapper around `performance.now() / 1000`), so this is observationally fine. But the dep array of `useSessionEngine`'s rAF effect (`[state.status, clock]`) sees the same identity across tests — if a future test mutates `clock` (e.g., to inject a custom now() spy), all subsequent tests would see the same instance. Mirror the `useNKEngine.test.tsx:16` pattern where each test calls `makeClock()` for a fresh instance.

**Fix:**
```typescript
const makeFakeClock = () => createWallSessionClock()
// Each test: useSessionEngine(..., makeFakeClock())
```

### IN-03: `useNaviKriyaSessionController.ts:62` creates an NK wall clock that is wholly redundant

**File:** `src/hooks/useNaviKriyaSessionController.ts:62`
**Issue:** The NK controller creates a `nkClock` via `createWallSessionClock()` purely to thread into `useNKEngine`. But `useNKEngine` only uses the clock for elapsed-stats math — a domain that has no audio-vs-wall distinction (it's just a stopwatch for the OM counter). The CONTEXT memo (D-09) frames this as the "wall-clock fallback when audio is unavailable" but the NK audio path constructs its own separate AC inside `useNaviKriyaAudio.begin()`. The engine's wall clock and the NK audio's audio clock are independent; the engine cares only about wall time for stats. The wrap-it-in-SessionClock posture is defensible for interface symmetry but adds a layer of indirection over what is effectively `performance.now()`.

**Fix:** Accept this as the cost of the abstraction (the consistency win is real). If the indirection ever shows up as a profiler hot spot — it won't — consider inlining `performance.now() / 1000` here. No code change recommended today.

### IN-04: Lead-in tick scheduling uses two cue kinds that map to identical builders

**File:** `src/audio/audioEngine.ts:417-419`; `src/audio/sessionClock.ts:65,70`
**Issue:** `scheduleLeadIn` calls `schedule(..., { kind: 'lead-in-tick' })` three times. The engine routes both `'lead-in-tick'` and `'countdown-tick'` to the same builder. The NK audio path's `countdownTick()` (in `useNaviKriyaAudio.ts:87-90`) doesn't go through `schedule()` at all — it calls `scheduleCountdownTick` directly. So `'countdown-tick'` in the Cue union is currently unused by any real call site at Phase 50. The patterns memo says "NK paths in useNaviKriyaAudio still call the per-cue scheduler primitives directly per Plan 50-03; D-05's NK migration through schedule() is documented as available but not exercised until Phase 52 lookahead". The Cue union pre-stages the kind for Phase 52, but nothing wires it. See WR-05 for the related dispatch duplication issue.

**Fix:** Either land the NK migration through `clock.schedule()` now (would require routing `useNaviKriyaAudio` callbacks through the engine's clock, which it does not have at Phase 50), or remove the `'countdown-tick'` kind from the union until Phase 52 actually needs it. Today the kind exists with no real caller, satisfying neither the closed-catalog invariant cleanly (it's only present because of Phase 52) nor the dead-code rule (no Phase 50 call site emits it).

### IN-05: `audioEngine.ts` line 412 comment refers to a deleted plan-token

**File:** `src/audio/audioEngine.ts:411-413`
**Issue:** Comment reads "Plan 50-06 D-05: facade over the internal schedule(when, cue) dispatch." Plan-token references (D-05, D-08, D-11, etc.) are appropriate while a phase is active but become stale after closeout. The CONTEXT.md is the source of truth for these tokens; once Phase 50 is in the rear-view, the in-source reference loses its grounding. Multiple files use this pattern (see also `useAudioCues.ts:289-298`, `useNaviKriyaAudio.ts:71-78`). This is project convention based on existing audioEngine.ts patterns from prior phases — flagged here for completeness, not for repair.

**Fix:** Accept as project convention. If future tooling auto-prunes stale decision tokens, this gives it a target. No code change recommended today.

---

_Reviewed: 2026-05-27T00:00:00Z_
_Reviewer: Claude (gsd-code-reviewer)_
_Depth: standard_
