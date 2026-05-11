---
phase: 03-optional-generated-audio-cues
reviewed: 2026-05-10T00:26:21Z
depth: standard
files_reviewed: 11
files_reviewed_list:
  - src/app/App.tsx
  - src/audio/audioEngine.ts
  - src/audio/cueSynth.ts
  - src/audio/lookaheadScheduler.ts
  - src/components/BreathingShape.tsx
  - src/components/MuteToggle.tsx
  - src/components/SessionControls.tsx
  - src/components/SessionReadout.tsx
  - src/domain/sessionMath.ts
  - src/domain/settings.ts
  - src/hooks/useAudioCues.ts
findings:
  critical: 1
  warning: 9
  info: 4
  total: 14
status: issues_found
---

# Phase 3: Code Review Report

**Reviewed:** 2026-05-10T00:26:21Z
**Depth:** standard
**Files Reviewed:** 11
**Status:** issues_found

## Summary

The Phase 3 implementation wires generated audio cues onto the existing breathing
session, adds a lead-in countdown state machine, and preserves the visuals-only
D-10 fallback. The architecture is broadly defensible — the dual-anchor effect
keys cues from `audioCtx.currentTime` rather than `performance.now()`, mute
short-circuits cue scheduling, and AC.close is idempotent.

However, several real defects survive:

1. A genuine race in cancel-during-lead-in can leak an `AudioContext` and bypass
   the `appPhase` reset, leaving the user in a half-running state with no orb but
   active audio (BLOCKER).
2. The Pitfall 2 dual-anchor design is documented but not actually implemented —
   `audioAnchorRef` is captured from a `setTimeout(3000)` callback rather than
   the deterministic `firstInAudioTime` returned by `audioStart`. Every Out cue
   in cycle 0 inherits the ~3 s setTimeout overrun jitter on top of the rAF
   jitter that fires every subsequent boundary.
3. `lookaheadScheduler.ts` is dead code — written, tested, documented as
   composed by `audioEngine.ts`, and never imported by any non-test file. The
   comment in `audioEngine.ts:1` actively misleads.
4. `sessionAnchorMsRef` is set in three places and never read — orphaned state.
5. The lead-in duration constant is duplicated three times across modules with
   no shared source of truth.
6. `AudioStatus` exports `'running'` and `'closed'` values that are never set.
7. AC `resume()` rejection leaks the `AudioContext` (no close on the error path).

The remaining findings cover minor code smells (dead variable, incorrect return
value contract on the defensive double-start path, ticks immune to mid-lead-in
mute, accessibility nit on disabled aria-pressed).

## Critical Issues

### CR-01: Cancel-during-lead-in races AC creation, leaks engine and corrupts state

**File:** `src/app/App.tsx:99-139`
**Issue:** `onStartClick` is `async` and `await`s `audioStart(plan)`. Between
`setAppPhase('lead-in')` (line 113) and `await audioStart(plan)` resolving (line
119), the user can re-click the same button (still labelled "Start session", per
W4). The second click's handler runs while the first is suspended on the await:

1. Click 1: `setAppPhase('lead-in')` → React batches → flush → `await audioStart(plan)` (suspends; `engineRef.current` is still `null` while `createAudioEngine` is in-flight).
2. Click 2 (after the React flush, while await is still pending): `appPhase === 'lead-in'` → cancel branch fires → `clearLeadInTimeouts()` (timeouts not yet scheduled — empty), `setAppPhase('idle')`, `audioAnchorRef = null`, `void audioStop()` runs `engineRef.current = null` (was already null) → no-op.
3. Click 1's continuation resumes: `createAudioEngine` resolves, `useAudioCues` writes `engineRef.current = engine`, `engine.scheduleLeadIn(...)` schedules ticks + first In cue, then `setStatus('lead-in')`.
4. Click 1 then schedules `t1`, `t2`, `t3` setTimeouts. When `t3` fires it calls `setAppPhase('running')` and `session.start()`.

Result: `appPhase` ends up `'running'` even though the user cancelled; an
AudioContext that the user never asked to keep is alive and playing the lead-in
ticks; the orb shows the In phase; and the only clean exit is for the user to
click End. The `AudioContext` from the cancelled lead-in is never closed because
`audioStop()` ran when `engineRef.current` was still null.

This is reproducible whenever `createAudioEngine`'s promise takes longer than a
single React commit (typical on a cold first user gesture in Safari, where
`new AudioContext()` plus `await audioCtx.resume()` can take 100+ ms).

**Fix:** Track the in-flight start promise and abort it in the cancel branch, or
synchronously stamp a generation token captured by the async chain so the
post-await continuation aborts when the token has been bumped:

```typescript
const startGenerationRef = useRef(0)

const onStartClick = useCallback(async () => {
  if (appPhase === 'lead-in') {
    startGenerationRef.current += 1 // invalidate any in-flight start
    clearLeadInTimeouts()
    setLeadInDigit(null)
    setAppPhase('idle')
    audioAnchorRef.current = null
    sessionAnchorMsRef.current = null
    planRef.current = null
    void audioStop()
    return
  }
  if (appPhase !== 'idle') return

  const generation = ++startGenerationRef.current
  setAppPhase('lead-in')
  setLeadInDigit(3)

  const plan = createBreathingPlan(state.selectedSettings)
  planRef.current = plan
  const firstInAudioTime = await audioStart(plan)
  // Abort if the user cancelled while we were awaiting AC creation.
  if (generation !== startGenerationRef.current) {
    void audioStop()
    return
  }
  // ... rest of the original code
}, [...])
```

(Also fixes the related WR-02 issue by allowing `firstInAudioTime` to be used
as the audio anchor — see that finding.)

## Warnings

### WR-01: Audio anchor uses wallclock-driven re-query instead of the deterministic firstInAudioTime — Pitfall 2 not actually fixed

**File:** `src/app/App.tsx:119, 133`
**Issue:** `await audioStart(plan)` returns `firstInAudioTime` (the audio-clock
time of the first In cue, computed as `engine.now() + 3` at the moment
`scheduleLeadIn` was called — fully deterministic on the audio clock). The
return value is discarded. Three seconds of wallclock later, the `t3` setTimeout
callback calls `audioAnchorRef.current = audioNow()` to capture the t=0 anchor.

`setTimeout(3000)` overshoots its deadline by typically 4–16 ms (more under
load) and `audioCtx.currentTime` advances during that overshoot. So the captured
`audioAnchor` is later than the actual first In cue's playback time by the
overshoot delta, and every subsequent In/Out cue computed from the plan
(`audioAnchor + boundaryStartMs / 1000`) is also late by that same delta plus
the rAF jitter at the moment the boundary effect detects the phase transition.

The Plan documents Pitfall 2 explicitly and the comments in `App.tsx:200-213`
claim the dual-anchor design fixes it. As written, the implementation reads
`audioCtx.currentTime` at a wallclock-driven instant (the `setTimeout`
callback), reintroducing exactly the main-thread-clock contamination that
Pitfall 2 warns against.

**Fix:** Capture the anchor from the value `audioStart` returned, not from
`audioNow()` in the setTimeout callback. The anchor is `firstInAudioTime - 0`
(the In cue at t=0). This is sample-accurate on the audio clock:

```typescript
const onStartClick = useCallback(async () => {
  // ... setup ...
  const firstInAudioTime = await audioStart(plan)
  // ... cancel-token check from CR-01 ...
  const t3 = window.setTimeout(() => {
    setLeadInDigit(null)
    // Use the deterministic audio time returned by audioStart, not a
    // re-query from the setTimeout callback (which inherits its overshoot).
    audioAnchorRef.current = firstInAudioTime // null if AC unavailable
    sessionAnchorMsRef.current = performance.now()
    setAppPhase('running')
    session.start()
  }, 3000)
}, [...])
```

### WR-02: lookaheadScheduler.ts is dead code

**File:** `src/audio/lookaheadScheduler.ts:1-54`
**Issue:** The module exports `startScheduler`, `LOOKAHEAD_MS`,
`SCHEDULE_AHEAD_SEC`, and `SchedulerHandle`. None of them are imported by any
production file — only `lookaheadScheduler.test.ts`. `audioEngine.ts:1` and
`audioEngine.test.ts:3` both claim "engine composes the pure cueSynth +
lookaheadScheduler modules"; that composition never happened. The module pulls
its weight in test runtime, increases bundle size if tree-shaking misses it, and
the misleading comments will frustrate the next reader who searches for where
the lookahead scheduler runs.

**Fix:** Either wire `startScheduler` into `audioEngine.ts` (which would also
mitigate WR-01 by scheduling cues on the audio clock instead of from rAF
ticks), or delete `lookaheadScheduler.ts`, its test, and the references in the
audio engine comments.

### WR-03: sessionAnchorMsRef is dead state — set in three places, never read

**File:** `src/app/App.tsx:47, 106, 134, 194`
**Issue:** `sessionAnchorMsRef` is declared as `useRef<number | null>(null)`,
written in three places (cancel branch, t3 setTimeout, lifecycle exit effect),
and never read anywhere. The comment on line 43 says it "matches what
useSessionEngine captures internally" — but no code ever consumes that match.

This either (a) was meant to back-compute the audio anchor for boundaries
(redundant given `audioAnchorRef`) or (b) was a placeholder for a feature that
was descoped. Either way, it's dead state with bookkeeping cost on every
session start/end.

**Fix:** Delete the ref and all three writes plus the explanatory comment.

### WR-04: Lead-in duration is duplicated in three files with no shared constant

**File:** `src/audio/audioEngine.ts:53`, `src/hooks/useAudioCues.ts:26`, `src/app/App.tsx:124-137`
**Issue:** Three separate definitions of "lead-in is 3 seconds":
- `audioEngine.ts:53`: `const LEAD_IN_DURATION_SEC = 3.0`
- `useAudioCues.ts:26`: `const LEAD_IN_DURATION_SEC = 3.0`
- `App.tsx:124-137`: setTimeouts with hardcoded `1000`, `2000`, `3000` ms

If a future change adjusts the lead-in length, all three locations must move in
lockstep or the visual countdown, the audio ticks, and the audio anchor will
desync. The `useAudioCues.ts` constant is also only used in the defensive
double-start return value (which is itself buggy — see WR-05).

**Fix:** Export a single constant from `src/audio/audioEngine.ts` (e.g.
`LEAD_IN_DURATION_MS = 3000`) and import it everywhere. Drive the App.tsx
setTimeouts from `LEAD_IN_DURATION_MS` (3000) and `LEAD_IN_TICK_INTERVAL_SEC *
1000` (1000, 2000) so future changes flow naturally.

### WR-05: useAudioCues.start() returns wrong audio time on defensive double-call

**File:** `src/hooks/useAudioCues.ts:76-79`
**Issue:** When `start()` is called twice without an intervening `stop()`, the
defensive guard returns `existing.now() + LEAD_IN_DURATION_SEC`. This is a
projection of "now plus 3 s" at the second call's instant, but the actual first
In cue was scheduled at `engine.now()_at_first_call + 3`. The two values can be
seconds apart.

The current callers in `App.tsx` discard `audioStart`'s return value (see
WR-01), so the bug is masked. It will bite as soon as anyone uses the documented
return contract — and the JSDoc on `start()` line 37 explicitly says "Returns
the audioTime of the first In cue."

**Fix:** Cache the firstInCueTime from the original schedule and return it on
subsequent calls, or refuse the second call (return null with a console
diagnostic, or bump status to a `'busy'` value the caller can react to):

```typescript
const firstInCueTimeRef = useRef<number | null>(null)

const start = useCallback(async (plan) => {
  const existing = engineRef.current
  if (existing !== null) {
    return firstInCueTimeRef.current  // honest answer or null
  }
  // ...
  const firstInCueTime = engine.scheduleLeadIn(startAudioTime, plan)
  firstInCueTimeRef.current = firstInCueTime
  // ... reset on stop()
  return firstInCueTime
}, [muted])
```

### WR-06: AudioContext is leaked when audioCtx.resume() rejects

**File:** `src/audio/audioEngine.ts:78-84`
**Issue:** `new AudioContext()` succeeds, then `await audioCtx.resume()` rejects
(e.g., the user agent vetoed autoplay between construction and the resume
attempt). The throw propagates out of `createAudioEngine`, and the caller
(`useAudioCues.start`) catches it and sets `audioAvailable = false`. The
constructed `audioCtx` is never closed.

Browsers cap concurrent AudioContexts (~6 in Chrome). On a flaky autoplay
device, repeatedly clicking Start will accumulate suspended-then-leaked ACs
until the cap is hit and `new AudioContext()` itself starts throwing.

**Fix:** Wrap the resume in try/catch and close the AC on rejection:

```typescript
const audioCtx = new AudioContext()
if (audioCtx.state === 'suspended') {
  try {
    await audioCtx.resume()
  } catch (err) {
    await audioCtx.close().catch(() => undefined)
    throw err
  }
}
```

### WR-07: AudioStatus declares values that are never set

**File:** `src/audio/audioEngine.ts:25`, `src/hooks/useAudioCues.ts:24, 29, 54`
**Issue:** `AudioStatus = 'idle' | 'starting' | 'lead-in' | 'running' | 'failed' | 'closed'`.
Searching the codebase, only `'idle'`, `'starting'`, `'lead-in'`, and `'failed'`
are ever passed to `setStatus`. The `'running'` and `'closed'` values are
phantom — consumers that switch on them will write dead branches.

**Fix:** Either remove the unused values from the union, or wire them up
(`setStatus('running')` when the first In cue plays / `setStatus('closed')`
when `engine.close()` resolves).

### WR-08: Mid-lead-in mute does not silence already-scheduled tick cues

**File:** `src/audio/audioEngine.ts:91-115`
**Issue:** `scheduleLeadIn` schedules three tick cues with their own
`GainNode` envelopes and an In bowl cue captured as `activeCue`. `setMuted(true)`
runs `applyMuteFadeOut` against `activeCue` (the bowl cue), but the three tick
cues retain their own envelopes and continue playing at full volume.

In practice, the worst case is the user mutes between tick 1 (already played)
and tick 2 — they then hear tick 2 and tick 3 despite having clicked Mute. For a
calm-breathing app where the mute toggle implies "stop talking to me," this is a
small but real audible defect.

**Fix:** Track all active cues (ticks + bowl) in a `Set<CueHandle>` and apply
the fade-out to every member on `setMuted(true)`. Prune entries whose
`cleanupAt` has passed.

### WR-09: Unused local variable `isRunning` in App.tsx

**File:** `src/app/App.tsx:20`
**Issue:** `const isRunning = state.status === 'running'` is computed at the
top of the component but never read. Line 286's `isRunning={inSessionView}` is
a JSX prop name, not a reference to the variable.

ESLint/TypeScript should be flagging `noUnusedLocals` here; either the rule is
off or the lint baseline is allowing it.

**Fix:** Delete the line.

## Info

### IN-01: Lookaheadscheduler.ts allows infinite loop if scheduleAtTime is non-advancing

**File:** `src/audio/lookaheadScheduler.ts:32-36`
**Issue:** The `while (next !== null && next < audioCtx.currentTime + SCHEDULE_AHEAD_SEC)`
loop relies on `getNextBoundaryAudioTime` returning a different value (or null)
after each `scheduleAtTime` call. If the caller forgets to advance their
boundary queue, the loop spins forever blocking the main thread.

This is academic until WR-02 is resolved (the module is dead), but if it gets
wired in, document the contract explicitly or guard with a safety counter.

**Fix:** Add a JSDoc note on `getNextBoundaryAudioTime` that it must advance on
each call, and consider a defensive `for (let i = 0; i < 64; i++)` guard.

### IN-02: CueHandle.scheduledAt and cleanupAt are unused outside tests

**File:** `src/audio/cueSynth.ts:42-43, 86-87, 147-148`
**Issue:** `scheduledAt` and `cleanupAt` are exposed on every `CueHandle` but
no production consumer reads them. Only the cueSynth tests reference them. They
add tracking work to every cue construction.

**Fix:** If the planned use is GC tracking (a `for (const cue of activeCues) if
(cue.cleanupAt < now) prune(cue)` sweep), wire it up. Otherwise drop both
fields from the public interface.

### IN-03: aria-pressed on disabled MuteToggle is misleading to assistive tech

**File:** `src/components/MuteToggle.tsx:29-32`
**Issue:** When `audioAvailable === false`, the button is `disabled` AND has
`aria-pressed={muted}` (which is `false` by default). Some screen readers
announce the pressed state even on disabled buttons; the user hears "audio
unavailable, not pressed, button" which is more confusing than "audio
unavailable, button."

**Fix:** Drop `aria-pressed` (or set it to `undefined`) on the
`!audioAvailable` branch:

```tsx
aria-pressed={audioAvailable ? muted : undefined}
```

### IN-04: SessionControls keeps a legacy single-button branch alive only for tests

**File:** `src/components/SessionControls.tsx:33-47`
**Issue:** The legacy branch is unreachable from `App.tsx` (which always
passes the three audio props). The comment on lines 28-32 acknowledges this is
"preserved for Phase 1/2 tests." Maintenance surface that exists only to keep
historic test files green.

**Fix:** Migrate the Phase 1/2 tests (`App.session.test.tsx`,
`App.dialog.test.tsx`) to the inline-mute layout (or to a render helper that
provides the three audio props) and delete the legacy branch.

---

_Reviewed: 2026-05-10T00:26:21Z_
_Reviewer: Claude (gsd-code-reviewer)_
_Depth: standard_
