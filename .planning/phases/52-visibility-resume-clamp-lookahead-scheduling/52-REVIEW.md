---
phase: 52-visibility-resume-clamp-lookahead-scheduling
reviewed: 2026-05-28T00:00:00Z
depth: standard
files_reviewed: 12
files_reviewed_list:
  - src/audio/audioEngine.ts
  - src/audio/audioEngine.test.ts
  - src/audio/cueSynth.ts
  - src/audio/nkCueSynth.ts
  - src/domain/sessionAudio.ts
  - src/domain/sessionAudio.test.ts
  - src/hooks/useAudioCues.ts
  - src/hooks/useAudioCues.test.tsx
  - src/hooks/useBreathingSessionController.ts
  - src/hooks/useBreathingSessionController.test.tsx
  - src/hooks/useSessionEngine.ts
  - src/hooks/useSessionEngine.test.tsx
findings:
  critical: 2
  warning: 6
  info: 4
  total: 12
status: issues_found
---

# Phase 52: Code Review Report

**Reviewed:** 2026-05-28
**Depth:** standard
**Files Reviewed:** 12
**Status:** issues_found

## Summary

Phase 52 introduces lookahead-window cue scheduling (`walkFutureCues` + `engine.topUpLookahead`), per-tick `MAX_TICK_DELTA_SEC` clamping with `startedAtSec` rebasing, and `CueHandle.cancel` for future-cue cancellation. The engine-side machinery is well-implemented (snapshot-iterate-then-mutate, callee-side `SAFE_LEAD_SEC` clamp, AUDIO-04 disconnect posture extended through `cancel()`). The session-clock clamp is correctly threaded through `setState` updaters and respects the AH-WR-05 stale-closure constraint.

The major correctness gap is **cue duplication via the controller's per-boundary top-up effect**: `engine.topUpLookahead` does not dedupe and `schedule()` constructs fresh `OscillatorNode` chains on every call. Each cue at the far edge of the 6 s lookahead window gets scheduled on both the boundary it first enters the window and the boundary it advances to "next-cue." The user will hear most cues approximately twice (phasing/louder). The plan's threat-model entry T-52-08 acknowledges the concern and waves it off as "eventually-add-via-Set behavior is acceptable" — but the Set is for handle bookkeeping, not for deduping WebAudio scheduling.

A secondary correctness gap exists in `useAudioCues.start()` when `engine.scheduleLeadIn` returns null: the hook leaves `engineRef`, the clock subscriptions, and the silent-loop element fully wired before transitioning to `'failed'`, so the engine and its AudioContext leak.

## Critical Issues

### CR-01: `engine.topUpLookahead` schedules duplicate cues; `schedule()` does not dedupe

**File:** `src/audio/audioEngine.ts:483-494` (engine), `src/hooks/useBreathingSessionController.ts:341-375` (call site)

**Issue:**
`topUpLookahead` iterates the caller-supplied cue list and dispatches every entry through `schedule()`, which unconditionally builds a new `OscillatorNode` chain and adds a `CueHandle` to `activeCues` (see `audioEngine.ts:373-409`). There is no dedupe by `audioTime`/`kind` and no "already scheduled at this time" check.

The controller effect at `useBreathingSessionController.ts:341-375` calls `audioTopUpLookahead(cues)` on every change of `session.currentFrame` (per-phase-stable; fires at each phase boundary). Each call computes a fresh `walkFutureCues` window. With `LOOKAHEAD_WINDOW_SEC = 6 s` and a typical 5.5 BPM cycle of ~10.9 s, the same cue lands in the window across two consecutive boundaries:

- Boundary at `t = 3 s` (In→Out): walk returns cues at `audioTime ∈ {3, ~7.4, ~10.9}` (with `LOOKAHEAD_MIN_CUES = 2` floor + 6 s window).
- Boundary at `t = ~7.4 s` (Out→In): walk returns cues at `audioTime ∈ {~7.4, ~10.9, ~14.3}`.

The cue at `audioTime ≈ 7.4 s` is scheduled once at boundary N, then `pruneExpiredCues` does not remove it because `cleanupAt = stopAt + 0.1 s > now` for ~5×τ + ~3 s; at boundary N+1 the same `audioTime` enters `schedule()` again and a SECOND oscillator chain starts at the same time. The user hears two simultaneous strikes — phasing / +6 dB / cancellation depending on phase alignment. Similarly for `audioTime ≈ 10.9 s` across boundaries N+1 and N+2. Essentially every cue past the first one in any walk gets scheduled twice.

The plan's threat-model entry T-52-08 (`52-03-PLAN.md:312`) says "repeated calls dispatch the SAME audioTimes for the SAME cues — the underlying engine.schedule eventually-add-via-Set behavior is acceptable; activeCues.size stays bounded." This is incorrect: `activeCues` is a `Set<CueHandle>` keyed by handle identity, not by `audioTime`. Each `schedule()` call adds a brand-new handle. The WebAudio side has no dedupe.

This is not caught by any test: the engine tests in `audioEngine.test.ts:1003-1080` assert call counts for a single `topUpLookahead({ cues })` call, never two consecutive calls with overlapping `audioTime` values. The controller smoke tests in `useBreathingSessionController.test.tsx:107-219` are status-only and never drive the rAF loop into multiple boundaries.

**Fix:**
Either dedupe at the engine layer (track a `Map<audioTime, CueHandle>` keyed by quantized `audioTime` + `kind`, skip if already present and not in the past) OR cancel future-queued cues before each top-up:

```ts
// In useBreathingSessionController.ts top-up effect, BEFORE audioTopUpLookahead:
audioCancelFutureCues()
audioTopUpLookahead(cues)
```

This requires exposing `engine.cancelFutureCues` through the hook (the plumbing is half-done — the engine method exists but `useAudioCues` does not expose it). The cancel-then-reschedule approach is also what `setMuted(true)` does at `audioEngine.ts:530-550`, and it is the pattern documented as SCHED-05 in `52-CONTEXT.md:16` ("queued cues in the lookahead window are cancelled and rescheduled cleanly").

A regression test should drive two consecutive phase boundaries and assert `scheduleInCueForTimbre.mock.calls.length` equals the cue count from `walkFutureCues` at the FINAL boundary, not the sum of the two walks.

---

### CR-02: `useAudioCues.start()` leaks engine + AudioContext when `scheduleLeadIn` returns null

**File:** `src/hooks/useAudioCues.ts:352-391`

**Issue:**
After `createAudioEngine` resolves, `start()` runs:

1. `engineRef.current = engine` (L353)
2. `proxyMemoRef.current.setSource(engine.clock)` (L358)
3. Subscribes four clock handlers (L366-370), stores unsubs in `clockUnsubsRef`
4. `engine.setMuted(mutedRef.current)` (L376)
5. `engine.scheduleLeadIn(...)` → `firstInCueTime`
6. `if (firstInCueTime === null) { setAudioAvailable(false); setStatus('failed'); return null }`

The null-return path at L387 does NOT close the engine, does NOT tear down the clock subscriptions, does NOT revert the proxy source, and does NOT null `engineRef`. The AC stays alive in `engineRef`, the silent-loop `<audio>` element stays playing, the four clock subscribers stay registered, and `audioStatus` ends as `'ok'` (never updated to `'unavailable'`).

`AUDIO-03` is documented as "closed engine has no meaningful projection" (`audioEngine.ts:440`), so `scheduleLeadIn` returns null ONLY when `closed === true`. The hook would have to close the engine elsewhere to reach this branch — but the only synchronous path to closure in this region would be a separate `stop()` racing the `start()`, which `engineRef === null` guard at L335-338 already blocks. So in production this branch is currently unreachable through the documented engine surface.

However: the test at `useAudioCues.test.tsx:1010-1050` directly mocks `createAudioEngine` to return a fake engine whose `scheduleLeadIn` returns null synchronously. That path goes through the L387 branch with a live (fake) engine never closed. The test happens to use a fake engine whose `close` is a `vi.fn()` so no resource leak surfaces, but the production code path has the same gap: any future engine change that lets `scheduleLeadIn` return null while `closed === false` (e.g., a defensive failure mode) silently leaks the AC.

Browsers cap concurrent ACs (~6 in Chrome — see the Pitfall 3 comment at L274-275). One leaked AC per failed start eats the budget quickly.

**Fix:**
Mirror `stop()`'s teardown sequence inside the L387 branch before returning:

```ts
if (firstInCueTime === null) {
  for (const off of clockUnsubsRef.current) off()
  clockUnsubsRef.current = []
  engineRef.current = null
  proxyMemoRef.current.setSource(createWallSessionClock())
  void engine.close()
  setAudioAvailable(false)
  setStatus('failed')
  return null
}
```

Update the AUDIO-03 test to also assert `engine.close` was called and `clock.onResume` mock's returned unsub function was invoked.

---

## Warnings

### WR-01: `audioStatus` not driven to `'unavailable'` on the start-failure null branch

**File:** `src/hooks/useAudioCues.ts:387,392-405`

**Issue:**
Both failure branches in `start()` set `audioAvailable=false` and `status='failed'` but leave `audioStatus` at its current value (default `'ok'`). The catch at L402-404 is the AC-construction failure; the L387 path is the `scheduleLeadIn === null` branch. Neither calls `setAudioStatus('unavailable')`, so the App view-model's `MuteToggle.needsResume` consumer (`audio.audioStatus`) reads `'ok'` and the mute affordance keeps showing as healthy even though the audio path is dead.

`handleClose` does set `audioStatus = 'unavailable'`, but only when the clock fires `'closed'` — which requires a live engine and a real AC transition. After a construction failure, no engine exists to fire that transition.

**Fix:**
Add `setAudioStatus('unavailable')` to both failure branches (L387 and L402-404) so the UI reads a consistent terminal state.

---

### WR-02: `topUpLookahead` caches cues into `lastTopUpCuesRef` even when engine is null

**File:** `src/hooks/useAudioCues.ts:627-635`

**Issue:**
```ts
const topUpLookahead = useCallback((cues) => {
  lastTopUpCuesRef.current = cues // cached BEFORE the engine null-gate
  const engine = engineRef.current
  if (engine === null) return
  engine.topUpLookahead({ cues })
}, [])
```

If `topUpLookahead` is somehow called before `start()` (current controller code does not do this, but the public API admits it), the cache is updated to a list of cues with `audioTime` values relative to no anchor. If `start()` later constructs a new engine and the clock fires `'resume'` (e.g., immediate startup), `handleForceTopUp` reads this stale cache and dispatches obsolete cues to the new engine. The engine's callee-side clamp would re-anchor to `currentTime + SAFE_LEAD_SEC`, so they'd fire near-instantly — an audible burst of stale cues.

**Fix:**
Move the cache-update INSIDE the engine null-gate, so a no-engine call cannot poison the cache:

```ts
const topUpLookahead = useCallback((cues) => {
  const engine = engineRef.current
  if (engine === null) return
  lastTopUpCuesRef.current = cues
  engine.topUpLookahead({ cues })
}, [])
```

The `stop()` path at L437-438 should also clear the cache: add `lastTopUpCuesRef.current = []` so a fast `stop()` → `start()` sequence cannot inherit cues from the prior session.

---

### WR-03: `useSessionEngine` tick allows negative `rawDelta` to pass through unclamped

**File:** `src/hooks/useSessionEngine.ts:196-242`

**Issue:**
```ts
const clockNowSec = clock.now()
const lastClockNow = lastClockNowRef.current
const rawDelta = clockNowSec - lastClockNow
// ...
const rebasedState = rawDelta > MAX_TICK_DELTA_SEC ? { ...rebase... } : currentState
```

The clamp condition is one-sided: `rawDelta > MAX_TICK_DELTA_SEC`. A negative `rawDelta` (clock went backwards) falls through unchanged. The wall clock never goes backwards, but `audioCtx.currentTime` can stall (browser-specific behavior on iOS suspension), and during reconstruction the proxy source swap could briefly expose a smaller value than `lastClockNowRef.current`. In that case, `elapsed = clock.now() - startedAtSec` decreases on the next tick — `lastFrame.elapsedSec` goes BACKWARDS, breaking the documented "monotonic elapsed-time source" contract from the v1.0.1 tests (`useSessionEngine.test.tsx:48-69`).

The reanchor path at L377-410 resets `lastClockNowRef` synchronously, which mitigates the AC-reconstruction case when the controller wires it correctly. But there is no defensive symmetric clamp for clock-backwards anomalies.

**Fix:**
Symmetric clamp on the absolute delta:

```ts
const rawDelta = clockNowSec - lastClockNow
const rebaseTriggered = rawDelta > MAX_TICK_DELTA_SEC || rawDelta < 0
const rebasedState = rebaseTriggered
  ? { ...currentState, startedAtSec: currentState.startedAtSec + (rawDelta - Math.max(0, Math.min(rawDelta, MAX_TICK_DELTA_SEC))) }
  : currentState
```

Or at minimum, clamp `rawDelta` at 0 before any math runs (treat clock-backwards as "no time passed since last tick"). Add a regression test that drives `clock.now()` backwards and asserts `state.lastFrame.elapsedSec` is monotonically non-decreasing.

---

### WR-04: `useSessionEngine.reanchorSessionClock` does not validate `newClockNow`

**File:** `src/hooks/useSessionEngine.ts:377-410`

**Issue:**
The reanchor method accepts `newClockNow: number` and writes it to `lastClockNowRef.current` and into `startedAtSec`. There is no guard against `NaN`, `-Infinity`, or values smaller than the current `startedAtSec`. If the caller (a future audio-anchor source) passes a malformed value, the rAF tick produces NaN-elapsed frames or wildly wrong `startedAtSec`.

The current production caller in `useAudioCues.reconstructEngine` reads `newEngine.clock.now()` which is the new AC's `currentTime` (always ≥ 0 and finite), so this is currently safe. But the public surface admits the failure mode.

**Fix:**
Add a guard at the top of `reanchorSessionClock`:

```ts
const reanchorSessionClock = useCallback((newClockNow: number) => {
  if (!Number.isFinite(newClockNow) || newClockNow < 0) return
  lastClockNowRef.current = newClockNow
  // ...
}, [])
```

---

### WR-05: `walkFutureCues` may return empty array when `targetSec === elapsedSec` due to strict `>` comparison

**File:** `src/domain/sessionAudio.ts:121-128`

**Issue:**
```ts
if (targetSec !== undefined && audioTimeRelSec > targetSec) {
  break
}
if (result.length >= minCues && audioTimeRelSec > windowEndElapsedSec) {
  break
}
```

The trim uses strict `>` — a cue exactly at `audioTimeRelSec === targetSec` is emitted. But at the end-of-session edge, the controller passes `targetSec = plan.totalSec` (`useBreathingSessionController.ts:360`). If `walkFutureCues` is called with `elapsedSec = plan.totalSec` and `fromCycleIndex = floor(totalSec/cycleSec)`, the first cue lands at `audioTimeRelSec = fromCycleIndex * cycleSec`. If this equals `targetSec` exactly, it's emitted; otherwise the floor walk skips past `targetSec` and produces 0 cues, but `LOOKAHEAD_MIN_CUES` floor expects 2.

Test 6 at `sessionAudio.test.ts:203-226` documents that "D-14: floor does NOT override target — may return fewer than LOOKAHEAD_MIN_CUES" but this is silently relied upon: the `useBreathingSessionController` top-up effect calls `audioTopUpLookahead([])` on the empty result, which the engine then no-ops cleanly. OK in practice — but the test that asserts this combination (timed session + boundary near `targetSec`) does not exist.

Additionally, the inner walk loop is `for (;;)`. If `plan.cycleSec > 0` but `phaseOffset` calculations produce `audioTimeRelSec === windowEndElapsedSec` exactly on every iteration, the `>` comparison never breaks. Specifically, when `result.length < minCues` and `audioTimeRelSec == windowEndElapsedSec` and the same cue is emitted, the loop advances `currentCycleIndex` so the next iteration's `audioTimeRelSec` is strictly greater. So the loop terminates. But the dependence on monotonic advance is implicit; a future change that lets phaseOffset reset to 0 across some boundary could brick this.

**Fix:**
Tighten to `>=` for the floor-met case:

```ts
if (result.length >= minCues && audioTimeRelSec >= windowEndElapsedSec) {
  break
}
```

Add a regression test that calls `walkFutureCues` with `elapsedSec === targetSec` and a timed session and asserts the result is well-defined (either empty or exactly the boundary cue).

---

### WR-06: Engine `playEndChord` does not call `pruneExpiredCues` before scheduling

**File:** `src/audio/audioEngine.ts:513-523`

**Issue:**
`scheduleNextCue` (L464-476) and `topUpLookahead` (L483-494) both call `pruneExpiredCues()` before `schedule()`. `playEndChord` skips the prune. Over a long session the `activeCues` Set will grow with phantom handles whose `cleanupAt < now` but were never pruned — only `scheduleNextCue` and `topUpLookahead` clean them up. On a natural HRV completion, `playEndChord` runs once just before `close()`; the leak is short-lived. But on a session that hits manual end → start cycle without intervening boundary crossings, `playEndChord` is the only scheduling call and `activeCues` could carry stale handles from the prior session. (Though `close()` clears the Set at L617.)

Less serious than the others — included because the asymmetry is a code smell. The `endChordTailUntil = Math.max(endChordTailUntil, c.cleanupAt)` at L396 depends on the engine's bookkeeping staying internally consistent.

**Fix:**
Add `pruneExpiredCues()` at the top of `playEndChord` after the closed/muted gates, mirroring the other facades.

---

## Info

### IN-01: `notifyPhaseBoundary` is unused by the controller but still in the public API

**File:** `src/hooks/useAudioCues.ts:80-86, 615-620`, `src/hooks/useBreathingSessionController.ts` (no caller)

**Issue:**
The Plan 03 boundary-detection effect was replaced by the top-up effect, removing all controller calls to `notifyPhaseBoundary`. The hook still exports `notifyPhaseBoundary` and the engine still implements `scheduleNextCue`. Searching the source: no production caller remains. Tests at `useAudioCues.test.tsx:157-181` still exercise the path. Dead in production; alive in tests and API surface.

**Fix:**
Either remove `notifyPhaseBoundary` from the `UseAudioCues` return value (and `scheduleNextCue` from `AudioEngine`) if the lookahead model fully subsumes per-boundary scheduling, or document why both paths coexist. The audit cost of keeping two scheduling paths is high (each future change must consider both).

---

### IN-02: `cancelFutureCues` exposed on the engine but never called from outside

**File:** `src/audio/audioEngine.ts:496-511`, no production caller

**Issue:**
`engine.cancelFutureCues()` is on the public `AudioEngine` interface but the only callers are tests. The Plan 04 summary documents that the setMuted body inlines the same loop "because cancelFutureCues is a method on the same object literal and cannot be referenced by name from a sibling method." This is a real JavaScript constraint, but the cleaner fix is to extract the loop into a closed-over function inside `createAudioEngine` and call it from both `setMuted` and the public method. The current code duplicates the snapshot-iterate-then-mutate pattern across L505-510 and L545-550.

**Fix:**
Refactor to a single private function:

```ts
function cancelFutureCuesImpl(): void {
  if (closed) return
  const now = audioCtx.currentTime
  for (const cue of [...activeCues]) {
    if (cue.scheduledAt > now) {
      cue.cancel()
      activeCues.delete(cue)
    }
  }
}
```

Call from both `setMuted(true)` (after the in-flight fade loop) and the public `cancelFutureCues()` method. Eliminates the duplicate AH-WR-07 pattern and the "object-literal method cannot self-reference" workaround.

---

### IN-03: `bypassSilentMode` cache is never reset on `stop()`

**File:** `src/hooks/useAudioCues.ts:171, 437-447`

**Issue:**
`stop()` clears `firstInCueTimeRef`, `clockUnsubsRef`, and sets the proxy source back to a wall clock, but does not clear `bypassSilentModeRef` or `timbreRef`. These persist into the next `start()` call — a `start(plan, timbre)` that omits the third arg would still trigger the prior session's `bypassSilentMode` through the reconstruction path's `bypassSilentModeRef.current` read at L488. Actually, looking again: `start()` overwrites `bypassSilentModeRef.current = bypassSilentMode` at L351 before any read, so the stale value is correctly overwritten on every new session start. No actual bug, but the asymmetry is fragile — `firstInCueTimeRef` is explicitly cleared in `stop()`, why isn't this one? Inconsistent maintenance posture.

**Fix:**
For symmetry, add `bypassSilentModeRef.current = undefined` and `timbreRef.current = DEFAULT_TIMBRE` to `stop()`. Or document the asymmetry inline ("only the explicit `start()` overwrite mutates these refs; stop does not need to clear them").

---

### IN-04: Test file documents a subtle test-vs-production behavior gap

**File:** `src/hooks/useSessionEngine.test.tsx:680-700`

**Issue:**
The `advanceForeground` helper uses `STEP = MAX_TICK_DELTA_SEC / 2` and the long-run smoke test uses `SUB_STEP = MAX_TICK_DELTA_SEC / 2, SUB_STEPS_PER_ITER = 20`. The comment at L681-689 documents the IEEE-754 float drift workaround: "stepping by exactly `MAX_TICK_DELTA_SEC` sits on the clamp boundary; sum-of-0.1 drift occasionally pushes rawDelta above the threshold."

This means the production code path is sensitive to the EXACT timing pattern: a rAF tick that drifts microseconds above 100 ms triggers the clamp and rebases `startedAtSec`. In production, browser rAF callbacks ARE jittery and 60→6 fps drops produce per-tick deltas right around the 100 ms threshold. The clamp will fire on legitimate foreground slowdowns and silently advance `startedAtSec` by a few ms each time, accumulating over a long session.

This isn't strictly a bug — the constant was tuned to "100 ms is tight enough that a 60→6 fps frame-rate drop passes through unchanged (6×16.67 ms = 100 ms)" — but the test workaround proves that even a slight drift causes the clamp to fire. The threshold should probably have a small epsilon margin (e.g., `MAX_TICK_DELTA_SEC = 0.12`) to absorb the same drift in production that the test had to absorb.

**Fix:**
Either (a) bump `MAX_TICK_DELTA_SEC` to a value that has visible margin above a 6 fps drop (e.g., 0.15 s), or (b) leave the constant and document the residual drift behavior in `52-PATTERNS.md`. No code change required if (b) is chosen.

---

_Reviewed: 2026-05-28_
_Reviewer: Claude (gsd-code-reviewer)_
_Depth: standard_
