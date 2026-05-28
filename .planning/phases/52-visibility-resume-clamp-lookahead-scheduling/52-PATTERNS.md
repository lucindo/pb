# Phase 52: Visibility-resume clamp + lookahead scheduling - Pattern Map

**Mapped:** 2026-05-28
**Files analyzed:** 8 source + N tests (existing modifications, no NEW source files)
**Analogs found:** 8 / 8 (every modified file is a SELF refactor — the closed `Cue` catalog + closed `SessionClock` surface from Phase 50/51 leave no room for new files)

## File Classification

| File | New / Mod | Role | Data Flow | Closest Analog | Match Quality |
|------|-----------|------|-----------|----------------|---------------|
| `src/audio/audioEngine.ts` | MOD | audio engine — extend `ActiveCue` with `cancel()`; new `cancelFutureCues()`; top-up dispatch reuses existing `schedule()` | event-driven (closed `Cue` dispatch) | self — `schedule()` switch L341-377, `pruneExpiredCues` L316-325, `applyMuteFadeOut` L169-192, `activeCues` Set L294 | n/a (self-extend) |
| `src/audio/cueSynth.ts` | MOD (light) | DSP builders — per-cue helpers return cancel handle; envelope self-termination at `phaseDurationSec` is load-bearing (D-12) | request-response (pure builder per cue) | self — `scheduleBowlCue` L75-185 (envelope hard fade-out L125-133 already self-terminates) | n/a (self-extend; CueHandle gains cancel field) |
| `src/audio/sessionClock.ts` | READ-ONLY | clock interface + factories — Phase 52 reads `onResume` / `onSuspend`, never modifies | event-driven (statechange listener) | self — no change | n/a |
| `src/audio/swappableSessionClock.ts` | READ-ONLY | proxy primitive — Phase 52 force-top-up subscribes via the proxy's `onResume` | event-driven (subscription forwarding) | self — no change | n/a |
| `src/hooks/useSessionEngine.ts` | MOD | rAF tick — add clamp + rebase + reanchor reset; potentially host the top-up trigger | event-driven (rAF) | self — rAF tick L145-214, `reanchorSessionClock` L322-339 | n/a (self-extend) |
| `src/hooks/useBreathingSessionController.ts` | MOD | boundary-detection effect — replaced by top-up trigger | event-driven (currentFrame dep effect) | self — boundary effect L325-364 (computes `boundaryStartSec`, dispatches `notifyPhaseBoundary`) | n/a (self-replace) |
| `src/hooks/useAudioCues.ts` | MOD | clock subscriber wiring — add `onResume(forceTopUp)` subscription alongside the three existing handlers; mute path extends with future-cue cancel | event-driven (clock subscriptions) | self — `handleResume`/`handleSuspend`/`handleClose` L213-246, `start` subscribe block L341-344, mute path L582-586 | n/a (self-extend) |
| `src/domain/sessionAudio.ts` | MOD (maybe) | offset helper — possibly add a "walk N cues from anchor" helper; current `computeBoundaryAudioOffsets` returns ONE boundary per call | request-response (pure function) | self — `computeBoundaryAudioOffsets` L14-32 (HRV branch + stretch-frame branch) | n/a (self-extend) |
| `src/domain/stretchRamp.ts` | READ-ONLY | segment table + `getStretchFrame` lookup — Phase 52 walks `buildStretchSegments` per top-up (D-11) | request-response (pure lookup) | self — `buildStretchSegments` L81-195, `getStretchFrame` L211-295 | n/a (read-only consumer) |
| Tests (clamp / lookahead / mute-cancel / Stretch-fidelity / hidden-tail / completion-trim) | NEW within existing test files | behavioral tests | request-response (vitest + fake timers + fake AC) | `src/audio/audioEngine.test.ts`, `src/hooks/useSessionEngine.test.tsx`, `src/audio/sessionClock.test.ts` | exact — same fake-AC + fake-timer harness |

**Note on "no new source files":** Phase 50 closed the `Cue` catalog (D-04) and Phase 51 closed the `SessionClock` surface. Phase 52's scheduling work flows through those existing seams — every change lands inside existing modules. The only NEW artifacts are test cases, added inside existing `*.test.ts(x)` files.

---

## Pattern Assignments

### `src/audio/audioEngine.ts` — `ActiveCue` extension + `cancelFutureCues()` + top-up reuse of `schedule()`

**Analog:** SELF — `audioEngine.ts` already owns the `activeCues: Set<CueHandle>` (L294), the `schedule()` dispatch (L341-377), and `pruneExpiredCues` (L316-325). Phase 52 layers cancel-handles on the existing Set and reuses `schedule()` as the top-up dispatch target.

**`activeCues` Set declaration + pruning pattern** (L290-325 — copy posture for adding the cancel field):
```typescript
// WR-08: track ALL in-flight cues (lead-in ticks + In/Out bowls), not just the
// most recent one. Mute mid-lead-in must silence the remaining ticks too —
// previously only the bowl cue stored as `activeCue` was faded, leaving ticks
// 2 and 3 audible after the user clicked Mute.
const activeCues = new Set<CueHandle>()

// ...

// Drop cues whose tails have already finished (cleanupAt < now). Keeps the Set
// bounded over a long session and avoids re-fading already-silent envelopes.
function pruneExpiredCues(): void {
  const now = audioCtx.currentTime
  // AH-WR-07: iterate a snapshot, not the live Set. Deleting from a Set during
  // a for...of over that same Set is defined for the current element but
  // fragile, and outright unsafe if this loop body is ever extended to add().
  // The spread copy decouples iteration from mutation.
  for (const cue of [...activeCues]) {
    if (cue.cleanupAt < now) activeCues.delete(cue)
  }
}
```
→ Phase 52 keeps `pruneExpiredCues` byte-identical and adds a sibling `cancelFutureCues()` for D-10. The snapshot-iterate-then-mutate pattern (`[...activeCues]`) MUST be preserved — the new cancel loop will both call `cancel()` (which mutates oscillators) AND `activeCues.delete(cue)`. Copy the spread-copy posture verbatim.

**Cancel handle shape — `ActiveCue` interface extension** (L69-73 in `cueSynth.ts` = current `CueHandle`; engine treats this as `ActiveCue`):
```typescript
// Current shape (cueSynth.ts L69-73):
export interface CueHandle {
  envelope: GainNode // exposed for D-08 mute fade-out
  scheduledAt: number // audioCtx.currentTime at strike
  cleanupAt: number // when nodes can be GC'd (start + 5*timeConstant + tail)
}
```
→ Phase 52 adds a `cancel(): void` field per CONTEXT discretion ("`ActiveCue` interface shape"). Per-cue helpers (`scheduleBowlCue`, `scheduleTick`, `scheduleEndChord`, NK variants) gain a closure that calls `osc.stop(audioCtx.currentTime)` + `envelope.disconnect()` (and disconnects any partials). The existing `addEventListener('ended', () => { osc.disconnect() })` self-cleanup at cueSynth.ts L164-178 is the model — wrap that disconnect logic into a `cancel()` closure that the cleanup listener can also call (or that cancel() can fire and the listener becomes a no-op).

**`schedule()` switch as top-up dispatch target** (L341-377 — the closed catalog the top-up MUST use):
```typescript
function schedule(when: number, cue: Cue): void {
  switch (cue.kind) {
    case 'lead-in-tick':
      activeCues.add(scheduleCountdownTick(audioCtx, when, audioCtx.destination, sessionTimbre))
      return
    case 'countdown-tick':
      activeCues.add(scheduleCountdownTick(audioCtx, when, audioCtx.destination, sessionTimbre))
      return
    case 'in':
      activeCues.add(scheduleInCueForTimbre(audioCtx, when, audioCtx.destination, sessionTimbre, cue.phaseDurationSec))
      return
    case 'out':
      activeCues.add(scheduleOutCueForTimbre(audioCtx, when, audioCtx.destination, sessionTimbre, cue.phaseDurationSec))
      return
    case 'end-chord': { ... return; }
    case 'nk-front': ...
    case 'nk-back': ...
    case 'nk-tick': ...
  }
}
```
→ Phase 52 top-up does NOT add new arms. It calls `schedule(when, { kind: 'in', phaseDurationSec, timbre: sessionTimbre })` and `schedule(when, { kind: 'out', ... })` for the next N cues in the lookahead window. Per CONTEXT D-11 and Phase 50 D-04, `cue.timbre` is in the type union for callers that pre-schedule cues — engine ignores `cue.timbre` and uses closed-over `sessionTimbre` (already enforced at L350-352 comment).

**Internal `scheduleNextCue` facade — model for the new top-up facade** (L432-444):
```typescript
scheduleNextCue({ newPhase, audioTime, phaseDurationSec }: { newPhase: 'in' | 'out'; audioTime: number; phaseDurationSec: number }): void {
  if (closed) return
  if (muted) return // D-08 unmute-waits-for-boundary; if currently muted, skip this cue.
  pruneExpiredCues()
  // AUDIO-02 D-01/D-02 callee-side clamp.
  const clampedAudioTime = Math.max(audioTime, audioCtx.currentTime + SAFE_LEAD_SEC)
  schedule(clampedAudioTime, { kind: newPhase, phaseDurationSec, timbre: sessionTimbre })
}
```
→ Phase 52's new method (likely `topUpLookahead(...)` or per-CONTEXT-discretion-named) follows the same posture: `closed`/`muted` guards at top, `pruneExpiredCues()` before dispatch, callee-side clamp via `Math.max(..., audioCtx.currentTime + SAFE_LEAD_SEC)`, then a loop that calls `schedule(clampedAudioTime, cue)` for each cue in the lookahead window. The `closed`/`muted` guard pattern is non-negotiable — every facade in this file has it.

**`applyMuteFadeOut` integration + new future-cue cancel path** (L458-475 — mute setter; Phase 52 D-10 extends it):
```typescript
setMuted(next: boolean): void {
  if (closed) {
    muted = next
    return
  }
  if (next && activeCues.size > 0) {
    // D-08 + WR-08: muting mid-cue applies a soft fade-out tail to EVERY in-flight
    // cue's envelope (lead-in ticks AND bowl cues). Prune already-finished cues
    // first so we don't ramp dead envelopes.
    pruneExpiredCues()
    for (const cue of activeCues) {
      applyMuteFadeOut(cue, audioCtx)
    }
  }
  // D-08: unmuting mid-phase is silent — the next cue plays at the next phase boundary,
  //       NOT a make-up cue here.
  muted = next
}
```
→ Phase 52 D-10 splits the iteration into TWO branches: in-flight cues (where `cue.scheduledAt <= audioCtx.currentTime` — fade) AND future cues (where `cue.scheduledAt > audioCtx.currentTime` — cancel). Per CONTEXT D-10: "setMuted(true) runs applyMuteFadeOut on cues currently playing (preserves today's D-08 behavior) AND calls the cancel path on every cue with startTime > now() — future-queued cues are stop()+disconnect()'d." Add a `startTime`/`scheduledAt` field check inside the existing loop, or split into two loops. Keep `applyMuteFadeOut` UNCHANGED; add `cue.cancel()` for the future branch.

**Engine method exposure** (CONTEXT discretion — exact method name to be picked at plan time):
- Top-up facade: a new method on the `AudioEngine` interface OR top-up logic lives in the hook calling `engine.schedule()` through `engine.clock.schedule()`. Per CONTEXT discretion "Force-top-up on `clock.onResume`: probably wire a force-top-up method exposed on the audio controller (parallel to `notifyPhaseBoundary`)".
- Cancel-future facade: a new method `cancelFutureCues()` on `AudioEngine` (engine-side) called from the hook's mute path.

---

### `src/audio/cueSynth.ts` — per-cue helpers return cancel handle (D-09); envelope self-termination is load-bearing (D-12)

**Analog:** SELF — `cueSynth.ts` already self-terminates each cue via `osc.stop(stopAt)` and `addEventListener('ended', () => { ...disconnect() })` (L143-178). Phase 52 D-12 leans on this: when the lookahead window exhausts, queued cues' envelopes naturally fade per the hard-fade-out at L130-131. NO new tail logic to write.

**Envelope self-termination (load-bearing for D-12 "clean stop on lookahead exhaustion")** (L89-137):
```typescript
// 260510-tc9 Bug 2: when the phase outlasts natural perceptual silence, decay
// toward a non-zero sustain floor (audible until the flip) and fade that
// floor out in the last PHASE_END_FADE_OUT_LEAD_SEC of the phase.
const naturalSilenceAt = defaultDecayTau * PERCEPTUAL_SILENCE_TAU_MULT
const needsSustain =
  phaseDurationSec !== undefined && phaseDurationSec > naturalSilenceAt

// ...envelope setup elided...

let stopAt: number
let cleanupAt: number
if (needsSustain) {
  // Hard fade-out in the last lead window so the floor does not bleed into
  // the next phase's strike.
  const phaseEnd = when + phaseDurationSec
  const fadeStart = phaseEnd - PHASE_END_FADE_OUT_LEAD_SEC
  envelope.gain.setTargetAtTime(NEAR_SILENCE, fadeStart, PHASE_END_FADE_OUT_TAU)
  stopAt = phaseEnd + TAIL_PADDING_SEC
  cleanupAt = phaseEnd + CLEANUP_PADDING_SEC
} else {
  stopAt = when + defaultDecayTau * TAIL_MULTIPLIER + TAIL_PADDING_SEC
  cleanupAt = when + defaultDecayTau * TAIL_MULTIPLIER + CLEANUP_PADDING_SEC
}
```
→ Phase 52 PRESERVES this verbatim. Per CONTEXT specifics: "Each queued cue's envelope self-terminates with hard-fade at `phaseDurationSec` (cueSynth.ts:89-95) — 'clean stop when lookahead exhausts' is automatic at the audio layer; no manual fade-tail scheduling needed." Tests must lock this — the hidden-tail test asserts that after the lookahead window exhausts, all envelopes have reached NEAR_SILENCE without any manual intervention from the engine.

**Explicit-disconnect on `ended` (existing pattern) — the model for the cancel handle** (L164-178):
```typescript
osc.addEventListener('ended', () => {
  try { osc.disconnect() } catch { /* silent — some browsers throw InvalidAccessError on already-disconnected nodes */ }
  try { partialGain.disconnect() } catch { /* silent */ }
}, { once: true })

lastOsc = osc
// ...
if (lastOsc !== null) {
  lastOsc.addEventListener('ended', () => {
    try { filter.disconnect() } catch { /* silent */ }
    try { envelope.disconnect() } catch { /* silent */ }
  }, { once: true })
}
```
→ Phase 52's `cancel()` closure follows the SAME try/catch posture: every `disconnect()` wrapped in try/catch with a "silent — node may already be disconnected" comment. The cancel closure also calls `osc.stop(audioCtx.currentTime)` BEFORE the disconnects (mirrors `close()` at audioEngine.ts L530-537 — the close path's explicit-disconnect loop is the closest in-repo analog for "tear down nodes whose 'ended' may not fire because we're stopping them now").

**Return-shape extension** (L180-184 — current `CueHandle` return):
```typescript
return {
  envelope,
  scheduledAt: when,
  cleanupAt,
}
```
→ Phase 52 extends to:
```typescript
return {
  envelope,
  scheduledAt: when,
  cleanupAt,
  cancel: () => {
    // 1. Stop all oscillators at `audioCtx.currentTime` (mirrors close()'s explicit disconnect at audioEngine.ts:534-537).
    // 2. Disconnect every node in the chain (envelope, filter, partials) — try/catch each per the L164-178 pattern.
  },
}
```
Per CONTEXT discretion: "ActiveCue interface shape: Add `cancel(): void` (oscillator `stop()` + `disconnect()`) alongside the existing `cleanupAt`. ... per-cue `scheduleXxxForTimbre` helpers return values carrying the cancel handle."

---

### `src/hooks/useSessionEngine.ts` — rAF tick gets clamp + rebase + reanchor reset

**Analog:** SELF — the rAF tick at L145-214 and `reanchorSessionClock` at L322-339 are the exact extension points named in CONTEXT D-05/D-06/D-07/D-08.

**rAF tick structure (extension target)** (L145-214):
```typescript
useEffect(() => {
  if (state.status !== 'running') {
    // HOOKS-02 / D-06: DO NOT null the snapshot here. ... 
    return undefined
  }

  let animationFrameId = 0
  let cancelled = false

  const tick = () => {
    // HOOKS-04 / D-10: top-of-tick cancel-guard.
    if (cancelled) return

    setState((currentState) => {
      if (currentState.status !== 'running') {
        return currentState
      }

      // HOOKS-02 / D-06 / D-08: write the running-snapshot from currentState.
      runningSnapshotRef.current = {
        key: String(currentState.startedAtSec),
        startedAtSec: currentState.startedAtSec,
        lastElapsedSec: currentState.lastFrame.elapsedSec,
      }

      return completeIfNeeded(currentState, clock.now())
    })

    // Re-check cancelled BEFORE scheduling the next rAF.
    // eslint-disable-next-line @typescript-eslint/no-unnecessary-condition
    if (!cancelled) {
      animationFrameId = requestAnimationFrame(tick)
    }
  }

  animationFrameId = requestAnimationFrame(tick)

  return () => {
    cancelled = true
    cancelAnimationFrame(animationFrameId)
  }
}, [state.status, clock])
```
→ Phase 52 extends the tick body with:
1. **Read `clock.now()` ONCE at the top** of `tick` (before `setState`), capture as `clockNowSec`.
2. **Read `lastClockNow` ref** (NEW ref added at hook scope, initialized to `clock.now()` when the effect starts).
3. **Compute `rawDelta = clockNowSec − lastClockNow`**.
4. **Clamp**: `const clampedDelta = Math.min(rawDelta, MAX_TICK_DELTA_SEC)` (D-05/D-06; `MAX_TICK_DELTA_SEC = 0.1`).
5. **Rebase on clamp fire**: if `rawDelta > MAX_TICK_DELTA_SEC`, inside the setState updater rewrite `startedAtSec += (rawDelta − MAX_TICK_DELTA_SEC)` so `elapsed = clock.now() − startedAtSec` stays consistent (D-07).
6. **Update `lastClockNow = clockNowSec`** at the end of tick.
7. Optionally trigger a top-up (CONTEXT discretion — top-up location).

**Stale-closure invariant** (the AH-WR-05 comment at L131-144 is non-negotiable — copy verbatim into any new ref logic):
> "this effect (and its rAF loop) is created ONCE per session (when status transitions to running) and NOT re-created on every per-frame state update. Consequently the `state` value captured in this effect's closure is FROZEN at the value it had when the session entered `running`. Every per-frame value (elapsedSec, lastFrame, cycleIndex, phaseProgress, ...) MUST be read inside the `setState((currentState) => ...)` updater via `currentState` — NEVER from the outer-closure `state`."
→ Phase 52's `startedAtSec` rebase MUST happen inside the `setState((currentState) => ...)` updater. Reading `state.startedAtSec` from the outer closure would observe first-frame-stale data.

**`reanchorSessionClock` — Phase 52 D-08 reset target** (L322-339):
```typescript
const reanchorSessionClock = useCallback((newClockNow: number) => {
  setState((currentState) => {
    if (currentState.status !== 'running') {
      return currentState
    }
    // D-10 reanchor math: preserve pre-reanchor elapsed across the AC swap.
    const newStartedAtSec = newClockNow - currentState.lastFrame.elapsedSec
    return {
      ...currentState,
      startedAtSec: newStartedAtSec,
    }
  })
}, [])
```
→ Phase 52 D-08: at the TOP of this body (before the setState), synchronously reset `lastClockNow = newClockNow` (the new ref added for the clamp). This means the next rAF tick computes `rawDelta = newClockNow − newClockNow = 0` — the clamp sees a small delta and passes through. No special-case logic inside the clamp itself is needed.

**Pattern note on the new `lastClockNow` ref:**
- Declare at hook scope: `const lastClockNowRef = useRef<number>(0)` (mirror the `runningSnapshotRef` posture at L129).
- Initialize at the START of the rAF effect (`lastClockNowRef.current = clock.now()`) — NOT at hook construction (clock may not yet be backed by the AC).
- DO NOT add to dep arrays (refs are stable; mirrors the `runningSnapshotRef` posture).

---

### `src/hooks/useBreathingSessionController.ts` — boundary-detection effect → top-up trigger

**Analog:** SELF — the boundary-detection effect at L325-364 is the exact replacement target per CONTEXT.

**Current boundary effect (replacement target)** (L325-364):
```typescript
useEffect(() => {
  if (phase !== 'running') {
    lastBoundaryKeyRef.current = null
    return
  }

  const frame = session.currentFrame
  if (frame === null) return

  const key = `${String(frame.cycleIndex)}:${frame.phase}`
  if (lastBoundaryKeyRef.current === key) return
  lastBoundaryKeyRef.current = key

  if (frame.cycleIndex === 0 && frame.phase === 'in') return

  const audioAnchor = audioAnchorRef.current
  const plan = planRef.current
  if (audioAnchor === null && plan !== null) {
    lastBoundaryKeyRef.current = null
    return
  }
  if (audioAnchor === null || plan === null) return

  const { boundaryStartSec, phaseDurationSec } = computeBoundaryAudioOffsets(frame, plan)
  const liveAudioNow = audioAudioNow()
  if (liveAudioNow === null) return

  // Phase 50-02 (D-02 ms→sec cascade): boundaryStartSec is seconds-shaped at the
  // source — add it directly to the audioAnchor (no `/1000` runtime conversion).
  const audioTime = audioAnchor + boundaryStartSec
  audioNotifyPhaseBoundary({
    newPhase: frame.phase,
    audioTime: Math.max(audioTime, liveAudioNow + SAFE_LEAD_SEC),
    phaseDurationSec,
  })
}, [phase, session.currentFrame, audioNotifyPhaseBoundary, audioAudioNow])
```
→ Per CONTEXT D-04 and "Lookahead state location" discretion, this effect is REPLACED by a top-up trigger. Two viable shapes (plan-time decision):

**Option A — top-up lives in `useSessionEngine.ts` rAF tick** (CONTEXT D-04: "Top-up trigger lives on the existing rAF tick in `useSessionEngine.ts:163`"):
- Delete this effect entirely.
- The rAF tick reads queue depth via `engine.clock.schedule` introspection or via a new `engine.topUp(...)` method.

**Option B — top-up lives here, replacing the effect**:
- Replace boundary key tracking with a queue-depth check.
- On every tick (driven by `session.liveFrame` dep instead of `session.currentFrame`), call `engine.topUpLookahead({anchor: audioAnchor, plan, currentCycle: frame.cycleIndex, lookaheadSec: LOOKAHEAD_WINDOW_SEC, minCues: LOOKAHEAD_MIN_CUES, targetSec})`.

Either way, **PRESERVE these load-bearing patterns from the current effect**:
1. **`phase !== 'running'` early return** — guards against firing during lead-in or post-end.
2. **`audioAnchor === null`/`plan === null` guards** — top-up must not fire before lead-in completes (anchor is null until `onComplete` in `startOrCancel` sets it at L224).
3. **Seconds-shaped time math** (Phase 50-02) — boundaryStartSec is already seconds; `audioTime = audioAnchor + boundaryStartSec` (no `/1000`).
4. **`SAFE_LEAD_SEC` clamp** — every dispatch is `Math.max(audioTime, liveAudioNow + SAFE_LEAD_SEC)`.

**`audioAnchorRef.current = firstInAudioTime` capture point** (L224, inside `startOrCancel`):
```typescript
leadInTimeoutsRef.current = scheduleLeadInTimeouts({
  onDigit: setLeadInDigit,
  onComplete: () => {
    setLeadInDigit(null)
    audioAnchorRef.current = firstInAudioTime
    setPhase('running')
    sessionStart()
  },
})
```
→ Phase 52 PRESERVES this verbatim. The top-up trigger reads `audioAnchorRef.current` after lead-in completes; before that, the anchor is null and the top-up no-ops.

---

### `src/hooks/useAudioCues.ts` — `clock.onResume` force-top-up subscription + mute future-cue cancel

**Analog:** SELF — the three existing subscriber handlers (handleResume L213-222, handleSuspend L224-234, handleClose L236-246) and the start-time subscription block (L341-344) are the exact model for the new `forceTopUp` subscription.

**Existing handler shape — copy posture for `forceTopUp` handler** (L213-222):
```typescript
const handleResume = useCallback((): void => {
  // AUDIO-05 D-04 / D-06: defensive single gate at top — protects future branches that
  // read engineRef.current (currently none in this handler, but preserves the prior
  // handleStateChange null-gate posture).
  const engine = engineRef.current
  if (engine === null) return
  void engine
  visibilityResumeAttemptedRef.current = false
  setAudioStatus('ok')
}, [])
```
→ Phase 52's `forceTopUp` handler follows the SAME posture:
```typescript
const forceTopUp = useCallback((): void => {
  const engine = engineRef.current
  if (engine === null) return
  // Call engine.topUpLookahead(...) or similar — fires synchronously inside the resume cb.
  // Per CONTEXT D-04: covers the case where the rAF tick hasn't fired yet after onResume.
}, [/* deps as needed */])
```
The `const engine = engineRef.current; if (engine === null) return; void engine` defensive-gate pattern is non-negotiable — every clock subscriber MUST start with it.

**Subscription registration (start-time)** (L341-344):
```typescript
const unsubResume = engine.clock.onResume(handleResume)
const unsubSuspend = engine.clock.onSuspend(handleSuspend)
const unsubClose = engine.clock.onClose(handleClose)
clockUnsubsRef.current = [unsubResume, unsubSuspend, unsubClose]
```
→ Phase 52 extends to FOUR subscriptions (or wires `forceTopUp` into `handleResume` itself — plan-time decision). If a separate subscription: `clockUnsubsRef.current = [unsubResume, unsubSuspend, unsubClose, unsubForceTopUp]`.

**Subscription teardown — preserved in stop() L394-395, reconstructEngine() L465-466, unmount L262-263**:
```typescript
for (const off of clockUnsubsRef.current) off()
clockUnsubsRef.current = []
```
→ Phase 52 changes are AUTOMATICALLY covered by these existing teardown loops (they iterate the array). No new teardown code needed.

**Mute path — Phase 52 D-10 extension target** (L582-586):
```typescript
const setMuted = useCallback((next: boolean): void => {
  setMutedState(next)
  // D-08 fade-out tail when muting mid-cue is owned by the engine.
  engineRef.current?.setMuted(next)
}, [])
```
→ Phase 52 D-10 extends the engine-side `setMuted` (in audioEngine.ts) to also cancel future cues. The HOOK side stays UNCHANGED — the cancel logic lives in the engine's setMuted body. The hook just continues to call `engineRef.current?.setMuted(next)`.

**Reconstruction interaction (CONTEXT discretion)** — per the discretion note, "When useAudioCues.reconstructEngine runs, the old AC closes and ALL queued cues vanish with the old graph. The Phase 51 D-10/D-11 reanchor fires; reanchorSessionClock(newClockNow) resets lastClockNow (D-08); next rAF tick's top-up sees queue depth = 0 and queues N cues from the new anchor. No special handling needed — the existing pieces compose." The forceTopUp subscription registered against `newEngine.clock.onResume` at L512-515 (mirror of the start subscription) automatically picks up the new AC's resume events.

---

### `src/domain/sessionAudio.ts` — may add "walk N cues from anchor" helper

**Analog:** SELF — `computeBoundaryAudioOffsets` at L14-32 is the pure HRV/stretch offset helper. Phase 52 may add a sibling helper that returns an array of N cues.

**Current pattern** (L14-32):
```typescript
export function computeBoundaryAudioOffsets(
  frame: SessionFrame,
  plan: BreathingPlan,
): BoundaryAudioOffsets {
  if (frame.cycleStartSec !== undefined) {
    const inhaleSec = frame.currentInhaleSec ?? plan.inhaleSec
    const exhaleSec = frame.currentExhaleSec ?? plan.exhaleSec

    return {
      boundaryStartSec: frame.cycleStartSec + (frame.phase === 'in' ? 0 : inhaleSec),
      phaseDurationSec: frame.phase === 'in' ? inhaleSec : exhaleSec,
    }
  }

  return {
    boundaryStartSec: frame.cycleIndex * plan.cycleSec + (frame.phase === 'in' ? 0 : plan.inhaleSec),
    phaseDurationSec: frame.phase === 'in' ? plan.inhaleSec : plan.exhaleSec,
  }
}
```
→ Phase 52 helper shape (CONTEXT integration point: "Walk N cues from a given anchor + plan (HRV) or anchor + segment table (Stretch); returns `[{audioTime, phaseDurationSec, kind}, ...]` for the top-up to dispatch"):
```typescript
// Phase 52: walk N future cues from an anchor. Each entry is one phase boundary.
export function walkFutureCues(args: {
  audioAnchor: number,       // sessionStartCtxTime equivalent
  fromCycleIndex: number,    // session.currentFrame.cycleIndex
  fromPhase: 'in' | 'out',
  count: number,             // LOOKAHEAD_MIN_CUES floor
  windowEndSec: number,      // audioAnchor + sessionStartCtxTime + LOOKAHEAD_WINDOW_SEC
  plan: BreathingPlan,
  segments?: StretchSegment[],  // present for stretch sessions
  targetSec?: number,        // session-end clamp (D-14)
}): Array<{ audioTime: number; phaseDurationSec: number; kind: 'in' | 'out' }> {
  // For HRV: cycleSec-stride walk.
  // For Stretch: walk via segments[] — each cycle reads activeSeg.inhaleSec/exhaleSec.
  // D-14: never emit cues whose audioTime > audioAnchor + targetSec.
  // D-01/D-02/D-03: emit at least `count` cues (floor) OR up to windowEndSec (whichever yields more cues at low BPM).
}
```
Per CONTEXT D-11: "Stretch lookahead walks `buildStretchSegments(stretchSettings)` from `currentCycle` to `currentCycle + N` for each top-up. Each queued cue carries its own correct `phaseDurationSec` in the `Cue` payload."

**Pure-function posture** — `computeBoundaryAudioOffsets` is `Zero React imports` and pure. The new helper MUST be the same: no React, no I/O, no side effects. Mirrors `domain/breathingPlan.ts` and `domain/sessionMath.ts`.

---

### `src/domain/stretchRamp.ts` — READ-ONLY consumer for Stretch lookahead

**Analog:** SELF — `buildStretchSegments` (L81-195) and `getStretchFrame` (L211-295) are the segment-table primitives.

**Segment walk pattern (Phase 52 D-11 uses this)** (L221-256 inside `getStretchFrame`):
```typescript
// Find the active segment (linear walk; open-ended last segment catches all remaining).
// finalSegment is the fallback when safeElapsedSec lands at or past every segment's endSec.
let activeSeg: StretchSegment = finalSegment
for (const seg of segments) {
  if (safeElapsedSec < seg.endSec) {
    activeSeg = seg
    break
  }
}

// ...
const rawElapsedInSec = safeElapsedSec - activeSeg.startSec
const elapsedInSec = activeSeg.endSec === Infinity
  ? rawElapsedInSec
  : Math.min(rawElapsedInSec, activeSeg.endSec - activeSeg.startSec - CLAMP_EPSILON_SEC)
const cycleInSegment = Math.floor(elapsedInSec / activeSeg.cycleSec)
const absoluteCycleIndex = activeSeg.cycleBaseIndex + cycleInSegment
const cycleStartSec = activeSeg.startSec + cycleInSegment * activeSeg.cycleSec

// Phase within cycle
const cycleElapsedSec = elapsedInSec - cycleInSegment * activeSeg.cycleSec
const isInPhase = cycleElapsedSec < activeSeg.inhaleSec
```
→ Phase 52's stretch lookahead walks the segment table per top-up. For each future cue:
1. Compute `cueElapsedSec = audioTime − audioAnchor` (subtract anchor to get session-elapsed seconds).
2. Linear walk segments to find the active segment containing that elapsed.
3. Read `activeSeg.inhaleSec` and `activeSeg.exhaleSec` for that segment.
4. Emit `{audioTime, phaseDurationSec: inhale-or-exhale-from-active-seg, kind: 'in'|'out'}`.

Per CONTEXT D-11: "Each queued cue carries its own correct `phaseDurationSec` in the `Cue` payload." The walk is byte-equivalent to what `getStretchFrame` does for a single moment — extended to walk forward N cues.

**Cycle-base-index invariant** — `cycleBaseIndex = cumulativeCycles` (L137 in buildStretchSegments) is the absolute cycleIndex anchor. Phase 52's walk MUST honor this: walking from `currentCycle` to `currentCycle + N` means walking across segment boundaries when a segment exhausts its `cycleSec` count — the next cycle reads from the next segment. The walk does NOT reset cycleIndex at segment boundaries (Pitfall 1).

---

## Shared Patterns

### Constants — single source of truth

**Source:** `src/audio/audioEngine.ts` L159-167
```typescript
export const LEAD_IN_TICK_INTERVAL_SEC = 1.0
export const LEAD_IN_DURATION_SEC = 3.0
export const LEAD_IN_TICK_INTERVAL_MS = LEAD_IN_TICK_INTERVAL_SEC * 1000
export const LEAD_IN_DURATION_MS = LEAD_IN_DURATION_SEC * 1000
/** Minimum scheduling lead ahead of audioCtx.currentTime for any cue dispatch.
 *  AUDIO-02 D-03: exported as single source of truth — App.tsx imports this symbol for the
 *  caller-side clamp (Plan 02); audioEngine.scheduleNextCue uses it for the callee-side clamp.
 *  No duplicated literals; both clamp sites derive from this constant. */
export const SAFE_LEAD_SEC = 0.005
```
**Apply to:** Phase 52's new constants — `LOOKAHEAD_WINDOW_SEC = 6` (D-02), `LOOKAHEAD_MIN_CUES = 2` (D-03), `MAX_TICK_DELTA_SEC = 0.1` (D-06). Export from `audioEngine.ts` as `export const` symbols with JSDoc citing the decision tokens. NO scattered literals; every consumer imports the symbol. Pattern matches Phase 50's WR-04 "single source of truth" invariant.

### Error/edge-case handling — silent absorb on closed engine

**Source:** `src/audio/audioEngine.ts` L432-434
```typescript
scheduleNextCue({ newPhase, audioTime, phaseDurationSec }: { ... }): void {
  if (closed) return
  if (muted) return // D-08 unmute-waits-for-boundary; if currently muted, skip this cue.
  // ...
}
```
**Apply to:** Phase 52's `topUpLookahead(...)`, `cancelFutureCues()`, and any new engine method. The `closed`-guard-at-top is the universal pattern in this file — every public method has it (`scheduleLeadIn` L408, `playEndChord` L447, `setMuted` L459, `close` L486, `resume` L545). New methods MUST follow.

### Test fake-AC harness

**Source:** `src/audio/sessionClock.test.ts` L29-66
```typescript
type FakeAudioCtxShape = {
  state: AudioContextState | 'interrupted'
  currentTime: number
  addEventListener: (type: string, listener: EventListener) => void
  removeEventListener: (type: string, listener: EventListener) => void
  _fireStateChange: () => void
}

function makeFakeAudioCtx(initialState: AudioContextState | 'interrupted' = 'running'): FakeAudioCtxShape {
  const listeners = new Map<string, Set<EventListener>>()
  const ctx: FakeAudioCtxShape = {
    state: initialState,
    currentTime: 0,
    addEventListener: vi.fn((type, listener) => { /* ...add... */ }),
    removeEventListener: vi.fn((type, listener) => { /* ...remove... */ }),
    _fireStateChange: () => {
      const evt = new Event('statechange')
      for (const l of listeners.get('statechange') ?? []) l(evt)
    },
  }
  return ctx
}

function asAudioCtx(fake: FakeAudioCtxShape): AudioContext {
  return fake as unknown as AudioContext
}
```
**Apply to:** Phase 52 tests that need a fake AC with mutable currentTime — hidden-window simulation = `audioCtx.currentTime += N` (no rAF fire); lookahead-empty simulation = advance currentTime past last queued cue. Per CONTEXT discretion: "Hidden-window simulation = advance clock by N seconds without firing rAF, then fire rAF + assert clamp clipped delta to 100ms AND `sessionStartCtxTime` rebased forward by `(N − 0.1)`."

**vitest.setup.ts polyfill awareness:** The setup file installs a richer FakeAudioContext on `window.AudioContext`. For engine-level integration tests (audioEngine.test.ts) the polyfill is enough. For sessionClock-level tests, use the tighter `makeFakeAudioCtx` helper above.

### Test fake-timer + rAF harness

**Source:** `src/hooks/useSessionEngine.test.tsx` L24-65
```typescript
const fakeClock = createWallSessionClock()

describe('useSessionEngine', () => {
  beforeEach(() => {
    vi.useFakeTimers()
    vi.setSystemTime(new Date('2026-05-09T00:00:00.000Z'))
  })

  afterEach(() => {
    vi.useRealTimers()
  })

  it('advances from In to Out from one monotonic elapsed-time source', () => {
    const { result, unmount } = renderHook(() => useSessionEngine(defaultSettings, null, fakeClock))

    act(() => { result.current.start() })
    act(() => { vi.advanceTimersByTime(5_000) })

    expect(result.current.currentFrame?.phaseLabel).toBe('Out')
    expect(result.current.currentFrame?.elapsedSec).toBeGreaterThanOrEqual(5)
    unmount()
  })
})
```
**Apply to:** Phase 52 tests for clamp behavior — wrap clock advancement in `vi.advanceTimersByTime(N)` (the wall clock reads `performance.now() / 1000` which advances with fake timers). To simulate a "hidden window without rAF firing," advance system time WITHOUT calling `vi.runOnlyPendingTimers()` for the rAF queue — `vi.advanceTimersByTime` advances time AND fires rAFs in jsdom. The CONTEXT discretion note says "advance clock by N seconds without firing rAF" — this requires holding rAFs explicitly via a polyfill that decouples `performance.now()` from rAF scheduling. Plan-time decision on the exact mock shape.

### Test pattern — spy on per-cue scheduler primitives

**Source:** `src/audio/audioEngine.test.ts` L90-103
```typescript
it('scheduleLeadIn schedules 3 ticks at t/+1/+2 and an In cue at +3', async () => {
  const tickSpy = vi.spyOn(nkCueSynth, 'scheduleCountdownTick')
  const inSpy = vi.spyOn(cueSynth, 'scheduleInCueForTimbre')
  const engine = await createAudioEngine({ timbre: 'bowl' })

  engine.scheduleLeadIn(0, samplePlan)

  expect(tickSpy).toHaveBeenCalledTimes(3)
  expect(tickSpy.mock.calls[0]?.[1]).toBe(0)
  expect(tickSpy.mock.calls[1]?.[1]).toBe(1)
  expect(tickSpy.mock.calls[2]?.[1]).toBe(2)
  expect(inSpy).toHaveBeenCalledTimes(1)
  expect(inSpy.mock.calls[0]?.[1]).toBe(3)

  await engine.close()
})
```
**Apply to:** Phase 52 lookahead tests — assert `scheduleInCueForTimbre` is called N times at the expected audio times (`audioAnchor + 0`, `audioAnchor + inhaleSec`, `audioAnchor + cycleSec`, ...) after a top-up trigger. Mute-cancel-future tests assert that cues scheduled in the lookahead are cancelled (via spy on the new `cancel()` field) when `engine.setMuted(true)` fires.

### Mock cue handle for mute tests

**Source:** `src/audio/audioEngine.test.ts` L23-55
```typescript
function makeMockCueHandle(opts: { withCancelAndHold?: boolean } = {}): {
  handle: CueHandle
  fns: MockEnvelopeFns
} {
  // ...constructs a CueHandle with a spy-friendly envelope.gain
}
```
**Apply to:** Phase 52 mute-cancel-future tests — extend `makeMockCueHandle` with a `cancel: vi.fn()` field; assert `cancel` is called for cues with `scheduledAt > now` when `setMuted(true)` fires AND assert `applyMuteFadeOut` (cancelAndHoldAtTime + setTargetAtTime) is called for cues with `scheduledAt <= now`.

### No-design-locking (from project memory)

Per project memory rule "no-design-locking": tests, code, and comments must NOT anchor downstream-modifiable values. For Phase 52:
- Test assertions on `LOOKAHEAD_WINDOW_SEC`, `LOOKAHEAD_MIN_CUES`, `MAX_TICK_DELTA_SEC` MUST import the symbols (NOT hard-code 6 / 2 / 0.1). If the value is tuned in a later phase, the test passes without edit.
- Assertions on cue counts use the imported `LOOKAHEAD_MIN_CUES` symbol, not literal `2`.
- Assertions on rebase math reference the imported `MAX_TICK_DELTA_SEC`, not literal `0.1`.

Mirrors Phase 50's sessionClock.test.ts approach: "tests assert dispatch BEHAVIOR (callback invocations, returned-function shape, scheduleImpl forwarding), NOT exact Cue field tuples."

---

## No Analog Found

No files in this phase lack an analog. Every modified file is a SELF refactor — the abstractions established in Phase 50 (closed `Cue` catalog, `schedule()` dispatch seam) and Phase 51 (audio-clock-backed `clock.now()`, proxy `onResume` survival across reconstruction) leave no room for new architectural surfaces. Phase 52 is pure extension of existing files.

**Phase 53 forward note:** Master GainNode (Phase 53) will add a NEW node-construction site inside `createAudioEngine` and swap `setMasterGain`'s body from no-op to a real ramp. Phase 52's cancel-future path is INDEPENDENT (different concern: queued nodes not yet started vs. in-flight attenuation). Both compose without conflict.

---

## Metadata

**Analog search scope:** `src/audio/`, `src/hooks/`, `src/domain/` (limited to files named in CONTEXT integration points).
**Files scanned:** audioEngine.ts (588L), cueSynth.ts (279L), sessionClock.ts (390L), swappableSessionClock.ts (251L), useSessionEngine.ts (353L), useBreathingSessionController.ts (394L), useAudioCues.ts (~640L), sessionAudio.ts (33L), stretchRamp.ts (316L), audioEngine.test.ts (200+L sampled), useSessionEngine.test.tsx (180L sampled), sessionClock.test.ts (120L sampled), 50-PATTERNS.md (format reference).
**Pattern extraction date:** 2026-05-28
