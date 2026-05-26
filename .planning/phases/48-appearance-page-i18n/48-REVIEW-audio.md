---
phase: 48-appearance-page-i18n (audio chunk)
reviewed: 2026-05-26T00:00:00Z
depth: deep
files_reviewed: 6
files_reviewed_list:
  - src/audio/audioEngine.ts
  - src/audio/audioStatus.ts
  - src/audio/cueSynth.ts
  - src/audio/nkCueSynth.ts
  - src/audio/previewContext.ts
  - src/audio/timbres.ts
findings:
  critical: 0
  blocker: 2
  warning: 7
  info: 4
  total: 13
status: issues_found
---

# Audio Chunk: Code Review Report

**Reviewed:** 2026-05-26
**Depth:** deep (cross-file, including consumer hooks `useAudioCues.ts`, `useNaviKriyaAudio.ts`, `TimbrePicker.tsx`)
**Files Reviewed:** 6
**Status:** issues_found

## Summary

Chunk-scoped deep review of the `src/audio/` module: AudioContext lifecycle owner (`audioEngine.ts`), pure DSP builders (`cueSynth.ts`, `nkCueSynth.ts`, `timbres.ts`), a preview singleton (`previewContext.ts`), and a one-line type alias (`audioStatus.ts`).

The lifecycle discipline in `audioEngine.ts` is generally strong: idempotent `close()`, explicit pre-close envelope disconnect to mitigate cues that may never fire `ended`, the `cancelAndHoldAtTime` fallback for Safari <16.4, the end-chord-tail-aware deferred close, and the dedicated `Set<CueHandle>` so mid-lead-in mute also silences ticks. These all look careful and intentional.

That said, three correctness defects warrant attention:

1. `scheduleEndChord` (nkCueSynth) returns only the **last** tone's envelope, so when `setMuted(true)` is invoked mid-chord, only one of the three chord voices gets the fade-out tail — the other two ring out at full peak. This is a real audible bug.
2. `scheduleTick` (cueSynth) is the only schedule\* primitive that does **not** install `'ended'` disconnect listeners on its osc/filter/envelope. Every lead-in path in production now routes through `scheduleCountdownTick` (which does install listeners), but `scheduleTick` remains exported and tested — any future caller leaks a 3-node chain per tick.
3. `previewContext.ts` exposes no error path: `new AudioContext()` and `previewCtx.resume()` (fire-and-forget) can both fail silently on iOS Safari, leaving the caller with no signal that the preview was inaudible. `TimbrePicker` does not guard the call.

Plus a handful of edge cases in `buildNKToneNodes` (zero-length pad envelope), the `pruneExpiredCues` heuristic vs. the real `'ended'` fire time, an `onStateChange` callback that can fire **before** `await createAudioEngine` resolves, and several lower-severity quality items.

## Blockers

### BL-01: `scheduleEndChord` exposes only the last voice's envelope — mute leaks 2/3 of the chord

**File:** `src/audio/nkCueSynth.ts:252-283` (return statement at 280-282) and consumer `src/audio/audioEngine.ts:237-245`
**Issue:**
`scheduleEndChord` builds three independent oscillator → partialGain → filter → envelope chains (one per ratio in `END_CHORD_RATIOS = [1.0, 1.25, 1.5]`). The returned `CueHandle.envelope` is just `lastEnvelope`, which by loop order is the **5th-ratio voice only**. Now combine with `audioEngine.setMuted(true)` (lines 237-245):

```ts
if (next && activeCues.size > 0) {
  pruneExpiredCues()
  for (const cue of activeCues) {
    applyMuteFadeOut(cue, audioCtx)   // <-- operates on cue.envelope (a single GainNode)
  }
}
```

Each `activeCue` corresponds to one `CueHandle`. The end chord adds **one** handle to `activeCues` (line 226–229) referencing only the fifth-voice envelope. The other two voices' GainNodes are unreachable from the handle. When the user taps Mute mid-end-chord (a ~5 s window because `END_CHORD_DURATION_SEC = 5.0`), only the fifth fades; the root and the major third continue ringing at peak through the `linearRampToValueAtTime(NEAR_SILENCE, when + durationSec)` schedule, audibly defeating the mute affordance.

This is identical in shape to WR-08 in `audioEngine` (track-all-cues, not just the most recent) and is the natural place that motivated WR-08. The fix needs to mirror it inside `scheduleEndChord`.

**Fix:** Either (a) return a single `GainNode` summing-bus for the chord, so the handle's envelope controls all three voices, or (b) widen `CueHandle` to support multi-envelope handles.

Option (a) — minimal blast radius, no type change:

```ts
export function scheduleEndChord(
  audioCtx: AudioContext,
  when: number,
  destination: AudioNode,
  timbre: TimbreId,
): CueHandle {
  const preset = TIMBRE_PRESETS[timbre]
  // Shared bus: route every voice through this single envelope so a single
  // handle.envelope.gain ramp silences the whole chord (D-08 mute fade-out).
  const masterEnvelope = audioCtx.createGain()
  masterEnvelope.gain.value = 1.0
  masterEnvelope.connect(destination)

  let lastCleanupAt = 0
  for (const ratio of END_CHORD_RATIOS) {
    const t = buildNKToneNodes(
      audioCtx, preset.fundamentalHzOut * ratio, END_CHORD_DURATION_SEC, when,
      masterEnvelope,                     // <-- voice routes into shared bus
      preset, END_CHORD_PEAK_GAIN,
      { attackSec: END_CHORD_ATTACK_SEC, releaseSec: END_CHORD_RELEASE_SEC },
    )
    t.osc.addEventListener('ended', () => {
      try { t.osc.disconnect() } catch { /* silent */ }
      try { t.partialGain.disconnect() } catch { /* silent */ }
      try { t.filter.disconnect() } catch { /* silent */ }
      try { t.envelope.disconnect() } catch { /* silent */ }
    }, { once: true })
    lastCleanupAt = Math.max(lastCleanupAt, t.cleanupAt)
  }
  // Disconnect the master bus when the longest voice ends — last-osc trick is
  // unreliable here because the three osc.stop times are identical; pick any
  // voice or schedule a one-shot setTimeout on lastCleanupAt.
  return { envelope: masterEnvelope, scheduledAt: when, cleanupAt: lastCleanupAt }
}
```

A regression test should mute mid-end-chord and assert that the gain on the master bus is ramped to `NEAR_SILENCE`.

---

### BL-02: `scheduleTick` leaks every lead-in tick's osc + filter + envelope (no `'ended'` cleanup)

**File:** `src/audio/cueSynth.ts:243-275`
**Issue:**
Compare `scheduleTick` against the sibling `scheduleBowlCue` (lines 163-185) and `scheduleNKTick` / `scheduleCountdownTick` in `nkCueSynth.ts` (lines 202-207, 232-237): all sibling cue builders install an `osc.addEventListener('ended', ...)` callback that disconnects every node in the chain. `scheduleTick` does NOT — it calls `osc.start(when); osc.stop(when + TICK_TOTAL_DURATION_SEC)` and returns. The osc → filter → envelope → destination chain stays wired forever; the only reason garbage collection eventually frees them is that the handle goes out of scope and the AudioContext keeps no strong reference back to oscillators whose `'ended'` has fired — which works *most* of the time on Chromium, but Safari is known to keep internal references on disconnected-but-not-explicitly-disconnected nodes (RESEARCH Pitfall in many Web Audio writeups).

Today this is partially mitigated because production callers route lead-in ticks through `scheduleCountdownTick` (`audioEngine.scheduleLeadIn`, lines 194-196), which DOES disconnect. But `scheduleTick` is still:

- exported (line 243),
- exercised by `cueSynth.test.ts:117`,
- and presented as part of the public surface alongside `scheduleInCue` / `scheduleOutCue`.

Any future caller (or refactor that reverts to the simpler `scheduleTick` for HRV's lead-in) silently regresses to leaking three nodes per tick. Over a long session that is ~375+ ticks of dead-but-connected nodes.

The comment at line 12 (`scheduleTick body is byte-identical to v1.0.1`) is correct historical context but does not absolve the leak — the v1.0.1 implementation had the same bug. AUDIO-04 in `cueSynth.ts:163` claims "explicit disconnect on osc.onended" as the cleanup contract; `scheduleTick` violates that contract.

**Fix:** Mirror the `scheduleBowlCue` / `scheduleNKTick` pattern.

```ts
export function scheduleTick(
  audioCtx: AudioContext,
  when: number,
  destination: AudioNode,
): CueHandle {
  const osc = audioCtx.createOscillator()
  osc.type = 'square'
  osc.frequency.value = TICK_FUNDAMENTAL_HZ

  const filter = audioCtx.createBiquadFilter()
  filter.type = 'lowpass'
  filter.frequency.value = TICK_FILTER_FREQ_HZ
  filter.Q.value = TICK_FILTER_Q

  const envelope = audioCtx.createGain()
  envelope.gain.setValueAtTime(TICK_PEAK_GAIN, when)
  envelope.gain.setTargetAtTime(0.0001, when + 0.001, TICK_DECAY_TIME_CONSTANT)

  osc.connect(filter)
  filter.connect(envelope)
  envelope.connect(destination)

  osc.start(when)
  osc.stop(when + TICK_TOTAL_DURATION_SEC)

  // AUDIO-04 contract: every schedule* primitive disconnects its chain on 'ended'.
  osc.addEventListener('ended', () => {
    try { osc.disconnect() } catch { /* silent */ }
    try { filter.disconnect() } catch { /* silent */ }
    try { envelope.disconnect() } catch { /* silent */ }
  }, { once: true })

  return {
    envelope,
    scheduledAt: when,
    cleanupAt: when + TICK_TOTAL_DURATION_SEC + TICK_CLEANUP_PADDING_SEC,
  }
}
```

If `scheduleTick` is actually unused in production (only `scheduleCountdownTick` is — verified via cross-file grep showing no non-test caller of `scheduleTick`), consider deleting the export entirely; that also closes the bug.

## Warnings

### WR-01: `previewContext.ts` swallows `new AudioContext()` and `resume()` failures with no caller signal

**File:** `src/audio/previewContext.ts:22-37`
**Issue:**
Two failure modes are completely silent:

1. **Line 25, `new AudioContext()`** — throws on iOS Safari when autoplay policy denies AC creation outside a user-gesture chain, or on older Safari that exposes only `webkitAudioContext`. There is no try/catch, and the consumer (`TimbrePicker.tsx:28` — `playInhalePreview(id)`) does not wrap the call either, so the click handler unwinds with an uncaught exception and the picker UI shows nothing changed.
2. **Line 34, `void previewCtx.resume()`** — fire-and-forget per the D-02 comment. The justification ("Web Audio tolerates a same-microtask resume + schedule pair") is plausible but not universal: on iOS Safari ≤16, scheduling on a context still in `'suspended'` at the moment of `osc.start()` causes the cue to be queued but never to fire if the context stays suspended. If `resume()` rejects (visibility/gesture race), no error is logged, the cue is silently dropped.

`audioEngine.ts:136-143` handles the analogous case correctly: it `await`s `audioCtx.resume()` inside a `try/catch`, closes the AC, and re-throws so `useAudioCues` can fall back to visuals-only. `previewContext.ts` has no equivalent.

**Fix:**

```ts
let ctx: AudioContext | null = null
let ctxFailed = false

function ensurePreviewContext(): AudioContext | null {
  if (ctxFailed) return null
  if (ctx === null) {
    try {
      ctx = new AudioContext()
    } catch {
      ctxFailed = true
      return null
    }
  }
  return ctx
}

export function playInhalePreview(timbre: TimbreId): void {
  const previewCtx = ensurePreviewContext()
  if (previewCtx === null) return // silent fallback: visuals only
  if (previewCtx.state === 'suspended') {
    previewCtx.resume().catch(() => { /* silent — preview is non-essential */ })
  }
  scheduleInCueForTimbre(previewCtx, previewCtx.currentTime, previewCtx.destination, timbre)
}
```

If the project really wants a user-visible signal when preview fails, expose a sibling `isPreviewAvailable()` boolean for `TimbrePicker` to disable preview taps.

---

### WR-02: `onStateChange` can fire before `createAudioEngine` resolves

**File:** `src/audio/audioEngine.ts:125-153`
**Issue:**
The async function:

1. line 129: `new AudioContext()` — initial state is `'suspended'` on many browsers,
2. line 136–143: optionally `await audioCtx.resume()` — fires a `statechange` event during the await,
3. line 153: `audioCtx.addEventListener('statechange', onStateChange)` happens AFTER the resume await.

Wait — the listener is registered AFTER resume(). That's safer than the inverse, but creates a different issue: the resume completes, the state transitions `suspended → running`, and the statechange event fires synchronously inside `audioCtx.resume()`. Because the listener isn't wired yet, that *first* transition is silently dropped. The next `statechange` won't fire until the context goes `interrupted` / `suspended` again.

The current code is therefore correct on a happy path (the hook initializes its `audioStatus` to `'ok'` and never expects a `running` notification). But it relies on **`onStateChange` never being called before `await createAudioEngine` resolves** — which is true today. Add a comment locking in this ordering, or flip the order and dedupe.

Separately, after line 153 wires the listener, a `suspended` AudioContext that *failed* to resume in 136-143 will still notify on the *next* state change. This is documented (Plan 06 D-36) but worth noting that the first transition is intentionally suppressed.

**Fix:** Add a comment near line 153 noting that the initial `suspended → running` transition is intentionally not reported (the caller assumes `'ok'` on resolution). If the order ever flips, dedupe via a `lastReportedState` guard inside `onStateChange`.

---

### WR-03: `close()` may fade phantom envelopes when `cleanupAt` lags `'ended'`

**File:** `src/audio/audioEngine.ts:173-182, 285-288` and `cueSynth.ts:135-137, 166-185`
**Issue:**
`pruneExpiredCues` drops cues whose `cleanupAt < now`. But the actual `'ended'` event fires at `stopAt = when + defaultDecayTau * TAIL_MULTIPLIER + TAIL_PADDING_SEC` for non-sustain cues (cueSynth line 135), and at `phaseEnd + TAIL_PADDING_SEC` for sustain cues (line 132). `cleanupAt` is always `stopAt + (CLEANUP_PADDING_SEC - TAIL_PADDING_SEC) = stopAt + 0.1s`.

Inside that 100 ms window, the `'ended'` listeners (cueSynth lines 172-185) have already disconnected the envelope from the destination AND from the upstream filter. The cue is still in `activeCues` because `pruneExpiredCues` waits for `cleanupAt`. If `setMuted(true)` is called during that window, `applyMuteFadeOut` queues automation on a disconnected GainNode — harmless (no error, no audible artifact) but **dead work**.

More importantly, the `close()` path at lines 285-287 calls `cue.envelope.disconnect()` on these phantoms — already disconnected. Wrapped in `try/catch` so it's safe, but the `try` is there precisely *because* of this ambiguity. The contract would be cleaner if the schedule\* primitives told the engine when they're truly done (e.g., resolve a per-cue promise on `'ended'`, then `pruneExpiredCues` could simply drop already-resolved handles).

**Fix:** Either tighten the bookkeeping (use a `done` flag on the handle, set inside the `'ended'` listener) or, at minimum, document that the 100 ms `cleanupAt - stopAt` slack is intentional and accept the phantom-fade as harmless.

---

### WR-04: `buildNKToneNodes` pad envelope can produce same-time automation events

**File:** `src/audio/nkCueSynth.ts:115-129`
**Issue:**
For a `PadEnvelope` with `attackSec + releaseSec > durationSec`:

```ts
const attackEnd = when + envelopeSpec.attackSec
const releaseStart = Math.max(attackEnd, when + durationSec - envelopeSpec.releaseSec)
```

When `releaseSec > durationSec - attackSec`, the `Math.max` clamps `releaseStart = attackEnd`. The four scheduled events become:

1. `setValueAtTime(NEAR_SILENCE, when)`
2. `linearRampToValueAtTime(peakGain, attackEnd)`
3. `setValueAtTime(peakGain, releaseStart === attackEnd)`  ← same time as #2
4. `linearRampToValueAtTime(NEAR_SILENCE, when + durationSec)`

Per the Web Audio spec, `setValueAtTime` at the same instant as the endpoint of a `linearRampToValueAtTime` is implementation-defined and Chrome/Safari handle it differently. For the current `END_CHORD_*` constants (attack 0.9, release 1.4, duration 5.0), `releaseStart = when + 3.6 > attackEnd = when + 0.9` so the bug is dormant. But if a future tuning shortens `END_CHORD_DURATION_SEC` below `attack + release = 2.3 s` (e.g., a "quick farewell" variant), or if `buildNKToneNodes` is reused with smaller durations, a glitch becomes possible.

Additionally, if `durationSec < attackSec` (caller passes a too-short duration), `attackEnd > when + durationSec`, meaning `osc.stop(stopAt)` cuts off the oscillator mid-ramp before `peakGain` is reached.

**Fix:** Clamp `attackEnd` to `Math.min(when + envelopeSpec.attackSec, when + durationSec - envelopeSpec.releaseSec)` so the ramp always completes before the release starts, and `Math.min` ensures the ramp endpoint is never after `stopAt`. Or simply guard at the public entry points to reject pad envelopes that don't fit.

---

### WR-05: `playEndChord` can be called twice; second call overwrites `endChordTailUntil`

**File:** `src/audio/audioEngine.ts:222-230, 270-275`
**Issue:**
`playEndChord` assigns `endChordTailUntil = cue.cleanupAt` unconditionally. If the engine's owner calls `playEndChord()` twice — e.g., a UI bug that double-dispatches the session-complete event — both end chords are scheduled (correct: `activeCues` adds them both), but `endChordTailUntil` only remembers the SECOND call's tail. If the second call happened to be scheduled at a slightly earlier audioTime (unlikely but not impossible), the first chord's tail would be cut by `close()`.

**Fix:** Take the max:

```ts
endChordTailUntil = Math.max(endChordTailUntil, cue.cleanupAt)
```

Defensive, no observable change on the happy path.

---

### WR-06: `close()` uses `setTimeout(wallclock-ms)` to wait for an audio-clock event

**File:** `src/audio/audioEngine.ts:270-275`
**Issue:**

```ts
const tailRemainingSec = endChordTailUntil - audioCtx.currentTime
if (tailRemainingSec > 0) {
  await new Promise<void>((resolve) => {
    setTimeout(resolve, tailRemainingSec * 1000)
  })
}
```

The `audioCtx.currentTime` clock and the `setTimeout` wallclock are independent. If the document goes to `hidden` while the end chord is ringing, browsers throttle `setTimeout` to ~1/s minimum (Chrome) or pause it entirely (background tabs in Safari with throttling). The `audioCtx` may auto-suspend at the same moment, in which case `currentTime` also stops advancing — so the `setTimeout` "happens to" wait long enough. But the two clocks have no contract relating them.

A safer pattern: poll `audioCtx.currentTime` in a microtask loop, or set up a `'statechange'` resolution. Given the comment at line 289 ("Pitfall 8: in-flight cue tails ring out via the audio thread's already-scheduled gain ramps. We close immediately and trust those ramps to drain naturally"), the entire wait is a belt-and-braces guard — `audioCtx.close()` mid-tail would mute the tail, hence the wait. But the wait itself has the same throttling vulnerability.

**Fix:** Document the trade-off explicitly, and consider switching to `audioCtx.suspend()` semantics for visibilitychange + a "real" close once both the chord has completed AND a `running` state is observed. Or accept that on hidden tabs the close happens "later" — usually fine because the user isn't listening.

---

### WR-07: `audioEngine.ts` re-imports `AudioStatus` type alias that conflicts with `audioStatus.ts`

**File:** `src/audio/audioEngine.ts:27` vs. `src/audio/audioStatus.ts:2`
**Issue:**
`audioEngine.ts` exports `type AudioStatus = 'idle' | 'lead-in' | 'failed'`. `audioStatus.ts` exports `type AudioStatusFlag = 'ok' | 'needs-resume' | 'unavailable'`. Two distinct types named `AudioStatus` and `AudioStatusFlag` describe overlapping concerns ("what state is audio in?") from different vantage points. The only consumer of `audioEngine`'s `AudioStatus` is `useAudioCues.test.tsx`. It is not used inside `audioEngine.ts` itself (the engine's own state-machine field is `state: AudioContextState | 'interrupted'`).

This is confusing for readers: an audio engine exports an `AudioStatus` type that no part of the engine actually emits. Either:

- delete the export from `audioEngine.ts` (dead, only tests import it), or
- rename to `LeadInPhase` or `SessionAudioPhase` to clarify the scope, or
- move it next to `AudioStatusFlag` in `audioStatus.ts` with prose explaining the difference.

**Fix:** Verify whether `useAudioCues.test.tsx` still needs `AudioStatus`. If yes, rename to `LeadInPhase` or similar; if no, delete the export.

## Info

### IN-01: `AUDIO-04` invariant claims `partialGain.length === oscillators.length` but loop guards `undefined`

**File:** `src/audio/cueSynth.ts:166-176`
**Issue:**
The comment on line 169 calls out that `oscillators` and `partialGains` are parallel arrays of equal length populated in the same loop. The very next line nevertheless guards `if (osc === undefined || partialGain === undefined) continue`. TypeScript's noUncheckedIndexedAccess forces the guard — fine — but the comment-and-guard combination is noisy. Alternative: index-into via `oscillators.at(i)!` with an eslint-disable, OR iterate `partials` and reconstruct both nodes per-iteration outside the array (mirrors the nkCueSynth pattern). Quality-of-life only.

---

### IN-02: Empty `preset.partials` would silently produce a silent cue + leak filter+envelope

**File:** `src/audio/cueSynth.ts:139-185`
**Issue:**
If a future preset is added with `partials: []`, the `for` loop body never executes, no oscillator is created, `oscillators.length === 0`, `lastOsc === undefined`, the second `addEventListener` block (lines 179-185) is skipped, and `filter` + `envelope` are connected to `destination` but never disconnected on any `'ended'` event (because no oscillator ever ends). Slow leak.

`timbres.ts` currently guarantees every preset has ≥1 partial, but no runtime invariant or test enforces it. Either add an `assert(preset.partials.length > 0)` guard at the top of `scheduleBowlCue`, or add a `timbres.test.ts` assertion that every preset has non-empty `partials`. Defensive depth only.

---

### IN-03: `previewContext.ts` cannot be torn down; AudioContext persists for the page lifetime

**File:** `src/audio/previewContext.ts:20-28`
**Issue:**
Module-level `let ctx: AudioContext | null = null`. There is no `closePreviewContext()` or `__resetForTests()` export. iOS Safari caps total ACs at ~6; the preview + the engine = 2, so this is fine in production. But it makes testing harder (each test that hits `playInhalePreview` shares the singleton — note that `previewContext.test.ts` already works around this) and prevents an "audio disabled" page-wide tear-down. Optional: expose a `closePreviewContext()` helper for symmetry with `engine.close()`.

---

### IN-04: Multiple `eslint-disable` comments justifying the WebKit `'interrupted'` cast — extract once

**File:** `src/audio/audioEngine.ts:148-151, 311-313, 320-323`
**Issue:**
Three repeated blocks:

```ts
// Reason: AudioContextState widened to include WebKit 'interrupted' extension (D-37 / Phase 5.1); cast documents intent even if TS DOM lib does not require it.
// eslint-disable-next-line @typescript-eslint/no-unnecessary-type-assertion
opts.onStateChange?.(audioCtx.state as AudioContextState | 'interrupted')
```

Each cast applies to `audioCtx.state`. A single-line helper would dedupe:

```ts
type ExtendedAudioContextState = AudioContextState | 'interrupted'
const readState = (): ExtendedAudioContextState => audioCtx.state as ExtendedAudioContextState
```

Three call sites collapse to `readState()`, eslint-disables disappear from the call sites, and the cast rationale lives in one place.

---

_Reviewed: 2026-05-26_
_Reviewer: Claude (gsd-code-reviewer, deep depth, audio chunk)_
_Cross-file scope: useAudioCues.ts, useNaviKriyaAudio.ts, TimbrePicker.tsx (consumers); appViewModel.ts (type re-export only)._
