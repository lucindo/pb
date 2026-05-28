---
phase: 52-visibility-resume-clamp-lookahead-scheduling
reviewed: 2026-05-28T00:00:00Z
depth: standard
files_reviewed: 12
files_reviewed_list:
  - src/audio/audioEngine.test.ts
  - src/audio/audioEngine.ts
  - src/audio/cueSynth.ts
  - src/audio/nkCueSynth.ts
  - src/domain/sessionAudio.test.ts
  - src/domain/sessionAudio.ts
  - src/hooks/useAudioCues.test.tsx
  - src/hooks/useAudioCues.ts
  - src/hooks/useBreathingSessionController.test.tsx
  - src/hooks/useBreathingSessionController.ts
  - src/hooks/useSessionEngine.test.tsx
  - src/hooks/useSessionEngine.ts
findings:
  critical: 1
  warning: 5
  info: 3
  total: 9
status: issues_found
---

# Phase 52: Code Review Report

**Reviewed:** 2026-05-28T00:00:00Z
**Depth:** standard
**Files Reviewed:** 12
**Status:** issues_found

## Summary

Phase 52 adds audio-cue lookahead scheduling (`walkFutureCues` + `topUpLookahead`), future-cue cancellation (`cancelFutureCues` / `CueHandle.cancel`), a per-rAF-tick elapsed-delta clamp with anchor rebase, and clock-resume force-top-up. The gap-closure plan (52-05) wired `cancelFutureCues` into the cancel-then-reschedule path, hardened the top-up cache, added full teardown on the null-leadIn path, and set `audioStatus` on failure paths.

The fixes for WR-02 (cache-after-gate), CR-02 (null-leadIn teardown), and WR-01 (audioStatus on failure) are correct and complete. `CueHandle.cancel` idempotency and the snapshot-iterate patterns are sound.

However, the CR-01 cancel-then-reschedule fix has a **race-window duplicate-strike defect** that re-introduces the exact class of audible artifact it was meant to remove (BLOCKER). There are also robustness gaps in `walkFutureCues` (degenerate-plan infinite loop), in the clamp/rebase atomicity, and in the reconstruction force-top-up replaying stale cues against a shifted clock origin.

## Critical Issues

### CR-01: Cancel-then-reschedule re-schedules the just-crossed boundary cue as a duplicate strike when the rAF tick lags the audio clock

**File:** `src/hooks/useBreathingSessionController.ts:342-381`, `src/audio/audioEngine.ts:483-511`

**Issue:**
The lookahead effect fires on every `session.currentFrame` identity change (per phase boundary). It runs `audioCancelFutureCues()` then `audioTopUpLookahead(cues)`, where `cues[0]` is the **just-entered** phase, computed from `frame.cycleIndex` / `frame.phase` / `frame.elapsedSec`.

`cancelFutureCues()` only cancels cues whose `scheduledAt > audioCtx.currentTime` (audioEngine.ts:506). The first cue of the new walk has `audioTime ≈ audioAnchor + currentPhaseStartSec`, which `topUpLookahead` clamps to `Math.max(audioTime, now + SAFE_LEAD_SEC)` (audioEngine.ts:489) and always dispatches.

The race: `currentFrame` flips inside the rAF `setState` updater, but the React effect that runs the walk fires *after* commit — one or more frames later than the audio-clock instant of the boundary. By the time the effect runs, the boundary cue the PRIOR walk already queued has `scheduledAt <= now` (it has started, or is within `SAFE_LEAD_SEC` of now). Two things then happen in the same effect run:

1. `cancelFutureCues()` does **not** cancel that already-in-flight boundary cue (`scheduledAt <= now`), so it keeps ringing.
2. The new walk's `cues[0]` for the *same* boundary is re-dispatched, clamped to `now + SAFE_LEAD_SEC`, producing a **second oscillator chain striking the same bowl cue a few ms apart** — an audible double-strike / flam at every phase boundary, which is exactly the duplicate-OscillatorNode artifact CR-01 was filed to eliminate.

This is not hypothetical: rAF callbacks are coalesced and routinely lag the audio clock by 16–50 ms, while `SAFE_LEAD_SEC` is only 5 ms, so the prior boundary cue is reliably `scheduledAt <= now` by the time the effect runs at the boundary it just crossed. The unit tests pass because they exercise `cancelFutureCues` and `topUpLookahead` in isolation with hand-set `scheduledAt`; no test drives the controller's effect across a real boundary with a lagging frame, so the duplicate-strike interaction is untested.

**Fix:**
The new walk must not re-emit the boundary cue that is already in flight. Either (a) drop any cue whose `audioTime <= audioNow + SAFE_LEAD_SEC` before dispatch (it is already queued/firing), or (b) have the engine de-duplicate by `scheduledAt`. Option (a) at the controller dispatch site:

```ts
const audioNow = audio.audioNow()
const freshCues =
  audioNow === null ? cues : cues.filter((c) => c.audioTime > audioNow + SAFE_LEAD_SEC)
audioCancelFutureCues()
audioTopUpLookahead(freshCues)
```

Add a controller-level test that advances the session across a phase boundary with the rAF tick lagging the clock and asserts the boundary's `scheduleInCueForTimbre` is called exactly once.

## Warnings

### WR-01: `walkFutureCues` HRV branch can infinite-loop on an inconsistent plan that passes the `cycleSec <= 0` guard

**File:** `src/domain/sessionAudio.ts:65, 84-140`

**Issue:**
The only degenerate-input guard for the HRV branch is `if (plan.cycleSec <= 0) return []` (L65). The walk advances via `cycleStart = currentCycleIndex * plan.cycleSec` and `phaseOffset = plan.inhaleSec`. The loop's only stop conditions are `audioTimeRelSec > targetSec` (open-ended sessions pass `targetSec === undefined`) and `result.length >= minCues && audioTimeRelSec > windowEndElapsedSec`.

If `plan.cycleSec > 0` but the phase decomposition is inconsistent (`plan.inhaleSec` negative, or `> plan.cycleSec`) — not validated here — `audioTimeRelSec` can fail to advance monotonically, so the floor and the window-exhausted condition may never both hold. With `targetSec === undefined` (the common open-ended case) the `for (;;)` loop has no hard iteration cap and hangs the rAF tick. The guard checks `cycleSec` but not the phase offsets it relies on.

**Fix:** Add a hard iteration cap (the floor + window can never need more than a bounded count of cues):

```ts
const MAX_WALK_ITERATIONS = 10_000 // defense against degenerate/inconsistent plans
for (let i = 0; i < MAX_WALK_ITERATIONS; i++) {
  // ... existing body, break conditions unchanged
}
```

### WR-02: `cancelFutureCues` runs unconditionally every boundary even when muted; cancel/top-up muted-gating is asymmetric

**File:** `src/hooks/useBreathingSessionController.ts:379-380`, `src/audio/audioEngine.ts:500-511`

**Issue:**
The controller calls `audioCancelFutureCues()` then `audioTopUpLookahead(cues)` on every boundary unconditionally. `topUpLookahead` early-returns when muted (audioEngine.ts:485), but `cancelFutureCues` has **no muted guard** (audioEngine.ts:501 checks only `closed`). While muted, every boundary still invokes `cancelFutureCues()`. More importantly the asymmetry (cancel always runs; top-up gated on mute) means there is no force-refill on unmute: after `setMuted(false)`, nothing re-queues until the *next* boundary fires. If unmute lands just after a boundary, the first post-unmute cue is silently skipped — a behavior gap that is easy to regress against the documented "unmute waits for boundary" intent.

**Fix:** Mirror the muted gate on both sides — skip both cancel and top-up when muted in the controller, or add a muted guard to `cancelFutureCues`. If "refill on unmute" is the desired UX, trigger a top-up from the mute toggle, not only from boundary changes.

### WR-03: Clamp anchor advance and rebase decision are not atomic — a dropped/short-circuited updater loses the 0.1 s credit

**File:** `src/hooks/useSessionEngine.ts:196-242`

**Issue:**
On the first tick after a hidden window, `rawDelta = clockNowSec - lastClockNow` is large; the rebase pushes `startedAtSec` forward by `rawDelta - MAX_TICK_DELTA_SEC` so the clamped tick counts only `MAX_TICK_DELTA_SEC` (0.1 s). The intended practice-time semantic. But `lastClockNowRef.current = clockNowSec` is written **before** the `setState` updater (L207). If the updater short-circuits (the `currentState.status !== 'running'` guard at L210 fires because status changed between the ref read and commit), the anchor has already advanced while the rebase never applied — the next tick computes `rawDelta` from the advanced anchor with no rebase credit, and elapsed jumps by the unclamped gap. The anchor mutation and the rebase decision must be transactional.

**Fix:** Move the `lastClockNowRef.current = clockNowSec` write inside the `setState` updater (it already has `clockNowSec`/`rawDelta` in closure) so the anchor only advances on a committed running tick that also applied the rebase.

### WR-04: Reconstruction force-top-up replays cached cues against the new AC origin, collapsing the whole lookahead into one stacked strike

**File:** `src/hooks/useAudioCues.ts:268-276, 569-573`

**Issue:**
`handleForceTopUp` is subscribed to `clock.onResume` and re-dispatches `lastTopUpCuesRef.current` verbatim via `engine.topUpLookahead({ cues })`. After `reconstructEngine`, the new AC's `currentTime` restarts near 0, so the cached cues' absolute `audioTime` values belong to the **old** clock origin. `topUpLookahead` clamps each to `now + SAFE_LEAD_SEC` (audioEngine.ts:489), so every cached cue collapses onto the same `now + 0.005` instant — all N lookahead cues fire as one stacked strike at unlock. The "≤ 1 rAF (~16ms) stale" claim in the comment holds only for plain suspend/resume on the same AC; for the reconstruct path the origin shift is the entire elapsed session. There is also no `cancelFutureCues()` before the re-dispatch.

**Fix:** Do not run the cached-cue replay on the reconstruction `onResume` (which already re-anchors via `onReanchorRequired` and the next boundary effect will refill against the fresh anchor). Either gate `handleForceTopUp` to the same-AC resume path only, or recompute cues from the live anchor before dispatch.

### WR-05: `reconstructEngine` does not clear `lastTopUpCuesRef`, leaving the WR-02-FIX stale-replay hole open on the reconstruct path

**File:** `src/hooks/useAudioCues.ts:495-609` (vs. `stop()` at 469)

**Issue:**
`stop()` clears `lastTopUpCuesRef.current = []` (L469) specifically so a fast `stop()`→`start()` cannot replay stale cues (WR-02-FIX). `reconstructEngine` performs a full engine swap and re-subscribes `handleForceTopUp` against the new clock (L572) but never clears `lastTopUpCuesRef`. The new engine's `onResume` then replays the pre-reconstruction cues (compounding WR-04). The same stale-replay hazard WR-02-FIX closed for `stop()` is left open for reconstruction.

**Fix:** Add `lastTopUpCuesRef.current = []` to `reconstructEngine` alongside the other ref resets (near L529-530), mirroring `stop()`.

## Info

### IN-01: `void engine` no-op statements are dead code in the clock-subscriber handlers

**File:** `src/hooks/useAudioCues.ts:234, 242, 259`

**Issue:** `handleResume`, `handleSuspend`, and `handleClose` read `engineRef.current` into `engine`, null-gate, then write `void engine` solely to suppress unused-var lint. The binding is never used.

**Fix:** Replace with a bare `if (engineRef.current === null) return` until a handler actually needs the engine reference.

### IN-02: `walkFutureCues` uses an unbounded `for (;;)` loop

**File:** `src/domain/sessionAudio.ts:84`

**Issue:** Break-only exit is intentional, but combined with WR-01 it reads as an unbounded loop with no documented invariant on max iterations.

**Fix:** See WR-01; name the cap as a module constant and tie its comment to `LOOKAHEAD_WINDOW_SEC` / `LOOKAHEAD_MIN_CUES`.

### IN-03: Cross-file line-number references in comments have already drifted

**File:** `src/audio/cueSynth.ts:192` ("Mirrors the close() explicit-disconnect loop at audioEngine.ts:534-537"), `src/audio/audioEngine.ts:488` ("identical posture to scheduleNextCue (L439)"), and similar citations throughout

**Issue:** Comments cite absolute line numbers (e.g., "audioEngine.ts:534-537", "L439", "L322") that no longer match the current files (the close() loop is now ~L614, the clamp ~L471). These mislead readers and rot on every edit.

**Fix:** Reference symbols (function/constant names) instead of line numbers.

---

_Reviewed: 2026-05-28T00:00:00Z_
_Reviewer: Claude (gsd-code-reviewer)_
_Depth: standard_
