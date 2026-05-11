---
phase: 03-optional-generated-audio-cues
fixed_at: 2026-05-09T22:04:19Z
review_path: .planning/phases/03-optional-generated-audio-cues/03-REVIEW.md
iteration: 1
findings_in_scope: 10
fixed: 10
skipped: 0
status: all_fixed
---

# Phase 3: Code Review Fix Report

**Fixed at:** 2026-05-09T22:04:19Z
**Source review:** `.planning/phases/03-optional-generated-audio-cues/03-REVIEW.md`
**Iteration:** 1

**Summary:**
- Findings in scope: 10 (1 critical + 9 warnings; 4 info findings out of scope)
- Fixed: 10
- Skipped: 0

All in-scope findings were fixed. Verification used a Tier 2 syntax check
(`tsc --noEmit -p tsconfig.app.json`) plus the project's full Vitest suite
(15 files, 162 tests, all passing) after every fix. The CR-01 + WR-01 pair
share the same handler (`onStartClick` in `src/app/App.tsx`); they were
applied as two separate sequential commits to keep the per-finding commit
log honest, with each intermediate state typechecking and passing tests.

## Fixed Issues

### CR-01: Cancel-during-lead-in races AC creation, leaks engine and corrupts state

**Files modified:** `src/app/App.tsx`
**Commit:** `41be6be`
**Applied fix:** Added `startGenerationRef` cancel-token. The cancel branch
bumps the token; the start branch stamps a local generation before the
`await audioStart(plan)` and re-checks after the await, calling `audioStop()`
and returning when the token has been bumped. Prevents the post-await
continuation from scheduling lead-in timeouts that would later flip
`appPhase` back to `'running'` on a session the user already cancelled.
**Note (logic-bug class — requires human verification):** The race window
itself is hard to reproduce reliably in unit tests; the fix's correctness
depends on React's batching guarantees holding between the two clicks. Worth
manual verification with a synthetic delay injected into `createAudioEngine`.

### WR-01: Audio anchor uses wallclock-driven re-query instead of firstInAudioTime

**Files modified:** `src/app/App.tsx`
**Commit:** `ade2278`
**Applied fix:** Captured the value returned by `await audioStart(plan)` as
`firstInAudioTime` and stored it in `audioAnchorRef.current` from the t3
setTimeout callback (instead of re-querying `audioNow()` inside the
overshoot window). Removed the now-unused `audioNow` hoist and dependency.
Sample-accurate on the audio clock.

### WR-02: lookaheadScheduler.ts is dead code

**Files modified:** `src/audio/lookaheadScheduler.ts` (deleted), `src/audio/lookaheadScheduler.test.ts` (deleted), `src/audio/audioEngine.ts`, `src/audio/audioEngine.test.ts`
**Commit:** `ca5f9ea`
**Applied fix:** Deleted both the dead module and its tests. Updated the
misleading comments in `audioEngine.ts:1` and `audioEngine.test.ts:3` from
"composes the pure cueSynth + lookaheadScheduler modules" to "composes the
pure cueSynth module". Chose deletion over wiring it in because Plan 04's
boundary effect already schedules cues at deterministic audio-clock times
through `audioNotifyPhaseBoundary` — the lookahead scheduler would be
duplicate machinery on the same scheduling path.

### WR-03: sessionAnchorMsRef is dead state

**Files modified:** `src/app/App.tsx`
**Commit:** `ab6b7b0`
**Applied fix:** Deleted the ref declaration, all three writes (cancel
branch, t3 setTimeout, lifecycle-exit effect), and the explanatory comment
that paired it with `audioAnchorRef`.

### WR-04: Lead-in duration is duplicated in three files

**Files modified:** `src/audio/audioEngine.ts`, `src/hooks/useAudioCues.ts`, `src/app/App.tsx`
**Commit:** `c357417`
**Applied fix:** Promoted the existing `LEAD_IN_TICK_INTERVAL_SEC` and
`LEAD_IN_DURATION_SEC` to `export`s, plus added `LEAD_IN_TICK_INTERVAL_MS`
and `LEAD_IN_DURATION_MS` as ms-domain conveniences. `useAudioCues.ts`
imports `LEAD_IN_DURATION_SEC` (later removed by WR-05); `App.tsx` imports
the MS exports and drives its three setTimeout calls from `1 *
LEAD_IN_TICK_INTERVAL_MS`, `2 * LEAD_IN_TICK_INTERVAL_MS`, and
`LEAD_IN_DURATION_MS`. Single source of truth.

### WR-05: useAudioCues.start() returns wrong audio time on defensive double-call

**Files modified:** `src/hooks/useAudioCues.ts`
**Commit:** `cc2dcd7`
**Applied fix:** Added `firstInCueTimeRef` to cache the value returned by
the original `engine.scheduleLeadIn` call. The defensive double-start guard
returns the cached anchor instead of computing a fresh `engine.now() + 3`
projection that drifts from the actually-scheduled cue time. Reset on
`stop()` and on unmount cleanup. Removed the now-unused
`LEAD_IN_DURATION_SEC` import.

### WR-06: AudioContext leaked when audioCtx.resume() rejects

**Files modified:** `src/audio/audioEngine.ts`
**Commit:** `6ce6e01`
**Applied fix:** Wrapped `await audioCtx.resume()` in try/catch. On
rejection, calls `audioCtx.close().catch(() => undefined)` before
re-throwing — the `.catch` swallows close-time errors so the original
resume error remains the propagated rejection. Prevents AC accumulation on
the autoplay-veto path.

### WR-07: AudioStatus declares values that are never set

**Files modified:** `src/audio/audioEngine.ts`
**Commit:** `c6c87ff`
**Applied fix:** Removed `'running'` and `'closed'` from the `AudioStatus`
union (kept `'idle' | 'starting' | 'lead-in' | 'failed'`, the four values
actually passed to `setStatus`). No callers touched these values, so no
downstream changes were required.

### WR-08: Mid-lead-in mute does not silence already-scheduled tick cues

**Files modified:** `src/audio/audioEngine.ts`
**Commit:** `4e9f528`
**Applied fix:** Replaced the single `activeCue` slot with an
`activeCues: Set<CueHandle>`. `scheduleLeadIn` adds all 3 ticks plus the
bowl; `scheduleNextCue` adds each new bowl. `setMuted(true)` iterates the
Set and calls `applyMuteFadeOut` on every cue. Added a `pruneExpiredCues()`
helper (drops cues whose `cleanupAt < currentTime`) called before mute and
before each `scheduleNextCue` to keep the Set bounded.

### WR-09: Unused local variable `isRunning` in App.tsx

**Files modified:** `src/app/App.tsx`
**Commit:** `7521cec`
**Applied fix:** Deleted the line. The `isRunning={inSessionView}` JSX prop
elsewhere in the file is a prop name, not a reference to this variable —
verified before deletion.

---

_Fixed: 2026-05-09T22:04:19Z_
_Fixer: Claude (gsd-code-fixer)_
_Iteration: 1_
