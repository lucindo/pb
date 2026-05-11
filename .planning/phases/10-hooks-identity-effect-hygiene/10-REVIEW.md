---
phase: 10-hooks-identity-effect-hygiene
reviewed: 2026-05-11T19:55:00Z
depth: standard
files_reviewed: 5
files_reviewed_list:
  - src/hooks/useSessionEngine.ts
  - src/hooks/useSessionEngine.test.tsx
  - src/hooks/useAudioCues.ts
  - src/hooks/useAudioCues.test.tsx
  - src/app/App.tsx
findings:
  critical: 1
  warning: 4
  info: 2
  total: 7
status: issues_found
---

# Phase 10: Code Review Report

**Reviewed:** 2026-05-11T19:55:00Z
**Depth:** standard
**Files Reviewed:** 5
**Status:** issues_found

## Summary

Phase 10 lands the five HOOKS-* requirements (mutedRef identity stabilization, currentFrame per-phase memoization with liveFrame per-rAF sibling, runningSnapshotRef ownership migration into the engine's rAF tick, top-of-tick cancel-guard, and App leave-running cleanup dep tightening). The full Vitest suite passes (390/390), `npm run lint` and `tsc --noEmit` both exit 0, and the additive identity-contract tests are well shaped.

However, the frame-identity split has a silent semantic regression in one App-side consumer that the design documents (CONTEXT, RESEARCH, PATTERNS, PLAN) all missed: `sessionFrameRef.current` is the per-phase-stable frame post-Phase-10, but the `onAudioReanchorRequired` callback reads `sessionFrameRef.current.elapsedMs` and treats it as the live session-elapsed offset. Reading a stale phase-boundary `elapsedMs` here breaks the new-AC re-anchor math by up to one phase duration after mid-phase engine reconstruction — exactly the iOS recovery path Plan 06 added. There are also several documentation defects and one weak test that does not actually fail when the asserted invariant is removed.

## Critical Issues

### CR-01: `onAudioReanchorRequired` reads stale phase-boundary `elapsedMs` from `sessionFrameRef`, breaking mid-session re-anchor math by up to one phase duration

**File:** `src/app/App.tsx:81-84, 125-132`
**Issue:**
Pre-Phase-10, `session.currentFrame` was a per-rAF value (deps `[state]` recomputed every frame), so `sessionFrameRef.current.elapsedMs` was approximately the live session-elapsed time. Phase 10 D-03 changed `currentFrame` to per-phase-stable identity (deps `[state.status, cycleKey, phaseKey]`), so `currentFrame` is now the FROZEN frame object captured at the last phase boundary — `currentFrame.elapsedMs` equals the elapsed at phase START, not at the current rAF tick.

`onAudioReanchorRequired` at line 125-132 still reads `sessionFrameRef.current?.elapsedMs` as the live offset:
```ts
const onAudioReanchorRequired = useCallback((newAudioAnchor: number) => {
  const elapsedMs = sessionFrameRef.current?.elapsedMs ?? 0
  audioAnchorRef.current = newAudioAnchor - elapsedMs / 1000
}, [])
```

The verbose comment at lines 70-80 makes the intent explicit: "subtract the session-elapsed visual offset so the formula yields audioTime ≈ newAC.currentTime at the upcoming boundary." That requires the LIVE elapsed at the moment of reconstruction. With per-phase-stale `elapsedMs`, `audioAnchorRef.current` is set TOO FAR IN THE PAST by `(T_live - T_boundary)`. The downstream boundary effect then computes `audioTime = audioAnchor + boundaryStartMs/1000`, producing a time `(T_live - T_boundary)/1000` seconds LATE on the new AC clock — up to ~5s at the default BPM 5.5 ratio 40:60. Audio cues fire perceptibly after their visual phase boundary.

Design docs missed this: PATTERNS.md §"Excerpt 1" justifies keeping `sessionFrameRef` on `currentFrame` solely by referencing the boundary effect's dep array — but the boundary effect only reads `cycleIndex`/`phase` from the frame (App.tsx:494-496), not `elapsedMs`. The actual consumer that NEEDS live `elapsedMs` (`onAudioReanchorRequired`) was not analyzed.

The lint/test gates do not catch this: D-42 (4) at `App.audio.test.tsx:579-612` only asserts a new AC was constructed; it does not assert correct audio-time computation post-reconstruction. No test exercises `elapsedMs`-sensitive re-anchor math.

**Fix:** Have `sessionFrameRef` mirror `session.liveFrame` (per-rAF, fresh `elapsedMs`) since `onAudioReanchorRequired` is the only consumer and it needs live values:
```ts
// App.tsx:81-84 — switch to liveFrame so onAudioReanchorRequired reads the
// live session-elapsed offset (Phase 10 CR-01: currentFrame is per-phase-stable
// post-D-03; its elapsedMs is frozen at phase-boundary capture time).
const sessionFrameRef = useRef(session.liveFrame)
useEffect(() => {
  sessionFrameRef.current = session.liveFrame
}, [session.liveFrame])
```
Add a regression test in `App.audio.test.tsx` that drives reconstruction mid-phase, then asserts the scheduled `audioTime` of the next cue is within a small epsilon of the new AC's `currentTime + expectedRemaining`.

## Warnings

### WR-01: `useSessionEngine.test.tsx` cancel-guard test (HOOKS-04) does not actually fail when the guard is removed

**File:** `src/hooks/useSessionEngine.test.tsx:253-279`
**Issue:**
The test comment explicitly acknowledges this: "the negative assertion is implicit via clean test runner output; this test's value is exercising the code path under fake timers so a regression that removed the guard would surface as a console.error from React." But Vitest does not fail tests on `console.error` by default, and `vitest.setup.ts`/`vite.config.ts` do not install an `onConsoleLog`/`onConsoleError` failure hook. Removing the `if (cancelled) return` guard at `useSessionEngine.ts:102` would silently leave the test green — defeating the entire purpose of HOOKS-04's test lock (CONTEXT D-13 test 5).

**Fix:** Wire an explicit assertion. Spy on `console.error` (or set up a `process.on('uncaughtException')`/`vi.spyOn` capture), and after the post-unmount `vi.advanceTimersByTime(...)`, assert that no React "Can't perform a React state update on an unmounted component" / "setState during render" error was emitted. Alternative: configure `vitest` global `onConsoleLog: (log, type) => type === 'stderr' ? false : undefined` to fail on console.error and make the test discriminating without changes.

### WR-02: App.tsx leave-running cleanup comment claims "engine owns null-out", contradicting the engine's deliberate persist-on-transition behavior

**File:** `src/app/App.tsx:442-447`
**Issue:**
The cleanup-effect comment at lines 442-447 says: "the hook writes from inside its rAF tick's setState updater (D-08) **and nulls the ref on the transition-out-of-running branch of its rAF effect**. App-side no-longer null the ref here; **the engine owns null-out**." But `src/hooks/useSessionEngine.ts:80-91` explicitly does NOT null the ref on transition out — the implementation chose persistence for hook-vs-consumer effect-ordering reasons, and the engine-side test at `useSessionEngine.test.tsx:281-331` asserts persistence ("snapshot persists unchanged across the transition out"). These two comments contradict each other and the App-side comment misleads future maintainers about the snapshot lifecycle.

This is also a divergence from CONTEXT D-13 test 6 ("`runningSnapshotRef.current` populated while running and nulled on transition out") and PLAN action item (e) ("On the early-return branch ... null the ref BEFORE returning: `runningSnapshotRef.current = null`"). The implementation deliberately departed from the locked decision without updating the plan/context or aligning the App.tsx comment.

**Fix:** Update the App.tsx:442-447 comment to match reality:
```ts
// Phase 4 LOCL-02 + Phase 10 HOOKS-02 (D-06/D-09): single write site for
// stats (Pitfall 1). Reads the running-snapshot ref now owned by
// useSessionEngine — the hook writes from inside its rAF tick's setState
// updater (D-08). The hook does NOT null the ref on transition out of
// running (hook effects run BEFORE consumer effects in the same component,
// so nulling would clobber the value before this cleanup reads it). The
// snapshot persists across the transition and is overwritten on the next
// session's first rAF tick; recordedSessionKeyRef makes the read here
// idempotent via the snapshot's `key` (= startedAtMs).
```
Optionally, also retroactively note the design change in `10-CONTEXT.md` (or a small follow-up addendum) so future phases see the persist-not-null decision recorded.

### WR-03: `start()` idempotent re-call returns the cached `firstInCueTimeRef.current` but skips the `audioAvailable=true` / `status='lead-in'` state-sync, leaving stale state if the first call took the failure path

**File:** `src/hooks/useAudioCues.ts:208-212`
**Issue:**
The defensive double-call branch in `start()` is:
```ts
const existing = engineRef.current
if (existing !== null) {
  return firstInCueTimeRef.current
}
```
If the FIRST `start()` succeeded, `engineRef.current` is non-null AND `firstInCueTimeRef.current` is set AND `status === 'lead-in'` AND `audioAvailable === true`. The second call returns the cached value with no further side effects. Correct path.

But if a previous lifecycle left `engineRef.current` non-null while `audioAvailable === false` / `status === 'failed'` (e.g., a hypothetical future code path where engine construction succeeded but `scheduleLeadIn` returned null and we forgot to null the engine — currently `start()` does NOT null `engineRef.current` on the `firstInCueTime === null` failure branch at line 230), the second `start()` would silently return a stale `firstInCueTimeRef.current` value (also stale from a prior session if `start()` ran twice across sessions without `stop()`).

Reading lines 228-232 carefully:
```ts
const firstInCueTime = engine.scheduleLeadIn(startAudioTime, plan)
if (firstInCueTime === null) { setAudioAvailable(false); setStatus('failed'); return null }
firstInCueTimeRef.current = firstInCueTime // WR-05
```
On the `firstInCueTime === null` branch, the engine is left in `engineRef.current` (constructed successfully) but the lead-in failed. `firstInCueTimeRef.current` keeps its OLD value (could be a number from a prior session, could be `null` from `stop()`/`reconstruct`/init). A subsequent retry-`start()` would early-return that stale value WITHOUT recovering `status`/`audioAvailable` from the `'failed'` state.

This is not a Phase 10 regression (the AUDIO-03 failure-path predates Phase 10), but Phase 10's review window is the right time to surface it. Specifically the Phase 10 callback-identity tests at `useAudioCues.test.tsx:1061-1087` only exercise the happy path, so the identity-stability changes do not surface this latent bug either.

**Fix:** Either (a) on the `firstInCueTime === null` branch at line 230, also `engineRef.current = null` and `firstInCueTimeRef.current = null` before returning (defensive cleanup so a retry-`start()` re-enters the construction path); or (b) on the early-return branch at line 210, also check `status === 'lead-in'` and re-sync `audioAvailable`/`status` if drift is detected. (a) is simpler and matches AUDIO-03's "fall through to failure" comment intent.

### WR-04: useSessionEngine rAF effect's `cancelled` re-check after `setState` relies on subtle synchronous-commit assumptions and would benefit from explicit comments tying back to a test

**File:** `src/hooks/useSessionEngine.ts:124-139`
**Issue:**
The second `if (!cancelled)` gate after `setState` is annotated as protecting against a narrow case where "the setState above commits synchronously, triggers an effect-cleanup that flips `cancelled = true`". Under React 19 automatic batching, `setState` in an rAF callback typically does NOT commit synchronously — the cleanup would fire on the next microtask/render. So this defensive gate either:
1. Provides genuine protection IF some future code path makes the setState commit sync (e.g., a `flushSync` wrap), OR
2. Is unreachable defensive code.

Either reading is fine, but the eslint-disable annotation justifies the gate as "the runtime check is genuinely needed" — that claim is non-obvious without identifying the specific synchronous-commit code path it guards. No test exercises the gate. If the gate is unreachable, it's dead code with an eslint-disable that adds noise; if it's reachable, there should be a test fixture forcing the path.

**Fix:** Either (a) add a focused test that flushes synchronously and asserts no extra rAF is scheduled after teardown (verifies the gate is meaningful and exercised); or (b) document explicitly in the comment which `flushSync`/strict-mode/synchronous-commit code path the gate guards, with a citation. The current state — non-obvious defensive code with an eslint-disable but no test — is harder to reason about than either explicit alternative.

## Info

### IN-01: `RefObject` type import used in interface — verify import-style consistency with codebase

**File:** `src/hooks/useSessionEngine.ts:2`
**Issue:**
`import type { RefObject } from 'react'` is used (line 2) for the `runningSnapshotRef: RefObject<RunningSnapshot | null>` field. The plan and CONTEXT both reference the type as `React.RefObject<RunningSnapshot | null>` (namespaced via `React.`). The named-import form is cleaner and idiomatic; just confirming the choice is intentional and matches the rest of the codebase's React-type-import style.

**Fix:** None required — `import type { RefObject }` is the preferred form. If consistency check finds the codebase elsewhere uses `import type * as React from 'react'` or `React.RefObject`, harmonize. Otherwise leave as-is.

### IN-02: Duplicated `SpyableAC` class in `useAudioCues.test.tsx`

**File:** `src/hooks/useAudioCues.test.tsx:337-360, 451-507, 1033-1054`
**Issue:**
The `SpyableAC` test double class is duplicated three times in the same file (Phase 5.1 describe, Plan 06 describe at line 451, and Phase 10 HOOKS-01 describe at line 1033). The Phase 10 block's comment acknowledges this: "The class is duplicated here rather than hoisted to module scope to avoid touching the existing test geography; this block is strictly additive." That tradeoff is reasonable for a hygiene phase, but the duplication is now ~100 lines and will compound on future test additions. Two of the three copies differ slightly (the Plan 06 variant has `_simulateInterrupted` / `_listeners` registry).

**Fix:** None required for Phase 10. Track as a test-cleanup follow-up (v1.x): hoist `SpyableAC` to a `__fixtures__/SpyableAudioContext.ts` and import in all three describe blocks, parameterizing the resume-rejection behavior.

---

_Reviewed: 2026-05-11T19:55:00Z_
_Reviewer: Claude (gsd-code-reviewer)_
_Depth: standard_
