# Phase 09: Audio + Wake Lock Lifecycle Hardening — Research

**Researched:** 2026-05-11
**Domain:** React imperative-resource lifecycle hygiene (Web Audio + Screen Wake Lock) under strict TS baseline
**Confidence:** HIGH (all four open questions resolved with spec / codebase evidence; everything fix-only against locked decisions D-01..D-14)

---

## User Constraints (from 09-CONTEXT.md)

### Locked Decisions (D-01..D-14 — research these, no alternatives)

- **D-01:** AUDIO-02 past-time clamp at BOTH sites — engine-side (`audioEngine.scheduleNextCue`, self-defending API) AND caller-side (App.tsx boundary effect at line 504, just before `audioNotifyPhaseBoundary`). Tests lock both sites.
- **D-02:** Clamp formula at both sites: `Math.max(audioTime, engine.now() + SAFE_LEAD_SEC)`. Apply BEFORE any further engine math; no transformation after.
- **D-03:** `SAFE_LEAD_SEC` is a named export from `src/audio/audioEngine.ts`: `export const SAFE_LEAD_SEC = 0.005`. App.tsx imports the symbol. Single source of truth; tests assert the constant.
- **D-04:** AUDIO-05 lands option (a) — null-safe end-to-end this phase. Every branch in `handleStateChange` reads `engineRef.current` into a local `const engine = engineRef.current; if (engine === null) return` at the top of the relevant scope. No other refs / setState calls mutated without the gate. Matches the Plan 06 WR-06 single-gate pattern documented at `useAudioCues.ts:156-158`.
- **D-05:** Defer the listener-lifecycle reshape (option b) to v1.x. Add `<deferred>` note + JSDoc cross-ref. Goal: surgical fix; do not destabilize Plan 06 D-35 resume path.
- **D-06:** Defensive gate covers ANY future branch reading `engineRef.current` — helper local at top of function body, not duplicated per branch. Tests: simulate `statechange` AFTER `stop()` nulled `engineRef`; assert no setState fires, no throw.
- **D-07:** Remove `'starting'` entirely from `AudioStatus` union. New union: `'idle' | 'lead-in' | 'failed'`.
- **D-08:** Delete `setStatus('starting')` at `useAudioCues.ts:192`. Transition `'idle' → 'lead-in'` (success) | `'idle' → 'failed'` directly.
- **D-09:** Rewrite state-machine docstring at `useAudioCues.ts:5-7` to: `// State machine: 'idle' → 'lead-in' (success) | 'failed' (D-10 Plan 06).` Drop dead-state explanation.
- **D-10:** Lock the tightened union with a Vitest case (or TypeScript-level assertion) — any future `setStatus('starting')` reintroduction must fail to compile or fail a test.
- **D-11:** Two plans, two waves. Wave 1 engine-layer; Wave 2 hook+App-layer.
- **D-12:** **Plan 01 (Wave 1)** — AUDIO-02 engine-side clamp + `SAFE_LEAD_SEC` export, AUDIO-03, AUDIO-04, AUDIO-06 union tightening, WAKELOCK-01. Files: `src/audio/audioEngine.ts`, `audioEngine.test.ts`, `cueSynth.ts`, `cueSynth.test.ts`, `useWakeLock.ts`, `useWakeLock.test.tsx`.
- **D-13:** **Plan 02 (Wave 2)** — AUDIO-01 reconstruct generation counter, AUDIO-05 null-safe `handleStateChange`, AUDIO-03 hook-side null propagation, AUDIO-06 hook-side cleanup, AUDIO-02 caller-side clamp at App.tsx:504. Files: `src/hooks/useAudioCues.ts`, `useAudioCues.test.tsx`, `src/app/App.tsx`, `App.audio.test.tsx`. `depends_on: ['01']`.
- **D-14:** Tests follow Phase 8 / prior-phase geography — co-locate in existing `*.test.{ts,tsx}` neighbors. No new test files unless an existing file would exceed reasonable size or has no natural home.

### Claude's Discretion (research recommended shapes)

- Generation-counter shape for AUDIO-01 (number vs symbol vs WeakRef) — picked: `useRef<number>` (see Open Question 1).
- `onended` listener leak posture for AUDIO-04 — picked: `{ once: true }` (see Open Question 2).
- Wake-lock in-flight ref shape for WAKELOCK-01 — picked: `useRef<boolean>` + post-await sentinel handoff (see Open Question 3).
- Test scaffolding extensions for stop-during-reconstruct — existing `SpyableAC` infrastructure suffices (see Open Question 4).

### Deferred Ideas (OUT OF SCOPE)

- AUDIO-05 (b) defer-attach `statechange` listener until after WR-06 resume — v1.x.
- iOS Safari OS-level audio session loss (Phase 5.1 carry-forward) — v1.x.
- `'starting'` UI surfacing — rejected explicitly; if wanted later, owns its own UI phase.
- Phase 10 (HOOKS-01..05) — sibling phase, touches same files but addresses identity / dep hygiene; runs AFTER Phase 9.
- Audio quality improvements beyond AUDIO-04 — out of v1.0.1.

---

## Project Constraints (no CLAUDE.md present)

No `./CLAUDE.md` exists at the project root. The applicable invariants come from project skill/state files:

- **Milestone invariant** (from STATE.md + PROJECT.md): `npm run test` must keep 363/363 Vitest tests passing at every phase boundary; `npm run build` and `tsc --noEmit` must exit 0. No new user-facing features.
- **Phase 7 baseline** (from 07-CONTEXT.md): strict TS (`strict: true`, `noUncheckedIndexedAccess`, `noImplicitReturns`, `noFallthroughCasesInSwitch`) + `tseslint.configs.strictTypeChecked` is active. Every line of new code must compile under that baseline. `no-floating-promises` enforced — `void ` prefix required for fire-and-forget. `// Reason:` annotations required for any new `// eslint-disable`.
- **Phase 8 posture** (from 08-CONTEXT.md, D-03): silent-fallback — no `console.warn` in prod, swallow rejections at every API boundary.

---

## Phase Requirements

| ID | Description | Plan | Research Support |
|----|-------------|------|------------------|
| AUDIO-01 | `reconstructEngine` stamps a generation counter; bails (closes new engine) if generation changed during `await createAudioEngine(...)`. `stop()` + unmount bump same counter. | 02 | Open Q1 — `useRef<number>` chosen; Pitfall 1 below — counter must overlay synchronous-null pattern, not replace it. |
| AUDIO-02 | Boundary effect clamps `audioTime` to `engine.now() + SAFE_LEAD_SEC` before scheduling. | 01 (engine) + 02 (App) | Web Audio past-time behavior is browser-implementation-dependent (Firefox drops silently; Chrome plays immediately) — clamp is correctness. Pitfall 5 — caller-side clamp depends on `audio.audioNow()` which is null-able. |
| AUDIO-03 | `scheduleLeadIn` returns `null` when engine `closed`; caller propagates null up `useAudioCues.start`'s existing `number \| null` return. | 01 (engine) + 02 (hook) | Defense-in-depth; the only realistic path is a race between scheduling and an unmount/stop — existing synchronous-null guards make this rare but not impossible. |
| AUDIO-04 | `cueSynth.scheduleBowlCue` explicitly disconnects partial nodes (`gain → filter → envelope`) via `osc.onended` to avoid retaining the partial-chain graph after `osc.stop()` resolves. | 01 | Open Q2 — `{ once: true }` chosen; spec evidence below. |
| AUDIO-05 | `handleStateChange` null-safe end-to-end against `engineRef.current === null` for any future branch it reads. | 02 | D-04 locks the pattern; Reference Implementation §A shows the exact shape. |
| AUDIO-06 | Remove dead `'starting'` from `AudioStatus`. | 01 (union) + 02 (hook+test) | IN-03 confirms transition is unobservable. Type-level lock (D-10) — `satisfies` or exhaustive switch in a test asserts the union shape. |
| WAKELOCK-01 | `useWakeLock.request()` guards against concurrent acquisitions via in-flight ref; second caller no-ops until first resolves. If `release()` / unmount ran during the await, freshly-acquired sentinel is released cleanly. | 01 | Open Q3 — `useRef<boolean>` + post-await `wasAcquiredRef` check + `.release().catch(() => undefined)` cleanup. Spec confirms `release()` is idempotent on an already-released sentinel. |

---

## Pre-Plan Research Summary

This phase is a pure-defensive fix-only patch. The architecture is already correct — what's missing is **invariant enforcement at the points where imperative resources cross async boundaries**. Five distinct race / leak / dead-code defects exist, all with the same shape:

> Resource A is acquired/scheduled via an `await`. During the await, another code path mutates the React-side state that the post-await branch trusts. The post-await branch needs an explicit gate that either (i) detects the mutation and bails, or (ii) is null-safe so it cannot mis-fire.

The fix in every case is the same kind: add a **generation token or null gate** at the precise boundary between the async resolution and the side-effect that follows. The codebase already uses two analog patterns that the planner should explicitly reference:

1. **Synchronous-null-then-async-close** (`useAudioCues.ts:222-230`, `useWakeLock.ts:90-99`) — null the ref BEFORE awaiting the teardown so a fast incoming call cannot see a half-closed resource. AUDIO-01 LAYERS a generation counter ON TOP of this pattern; it does NOT replace it. The synchronous-null still protects against the in-tab fast-second-call race; the generation counter additionally protects against an in-flight RECONSTRUCT being clobbered by a `stop()` or unmount.
2. **Single-gate-on-engineRef** (`useAudioCues.ts:156-158`, Plan 06 WR-06) — the visibility handler reads `engineRef.current === null` at the top and returns; the rest of the body is null-free. AUDIO-05 / D-04 / D-06 follow this verbatim for `handleStateChange`.

The remaining REQs are smaller:

- **AUDIO-02** is a clamp-on-write at two sites. Picked formula `Math.max(audioTime, engine.now() + SAFE_LEAD_SEC)` with `SAFE_LEAD_SEC = 0.005`. The constant is exported from `audioEngine.ts` and imported by App.tsx — no literal duplication.
- **AUDIO-03** is a return-type widening (`number → number | null`) plus a null check at the existing call site (`useAudioCues.start` already returns `number | null`).
- **AUDIO-04** is a small disconnect-on-`onended` extension of `cueSynth.scheduleBowlCue`. Using `{ once: true }` for the listener makes the listener self-removing — no manual `removeEventListener` needed.
- **AUDIO-06** is a deletion of dead union member + the one site that sets it + a docstring rewrite.

**Primary recommendation:** Wave 1 lands the engine-layer in five surgical commits (one per REQ-ID); Wave 2 lands the hook-and-App-layer in three (AUDIO-01 + AUDIO-05 are tightly coupled around `useAudioCues.ts`; AUDIO-02 caller-side + AUDIO-03/06 hook-side are independent). All existing tests pass unchanged; new co-located tests lock each REQ-ID contract.

---

## Open Questions Resolved

### Open Question 1 — Generation-counter shape (AUDIO-01)

**Question:** number vs symbol vs WeakRef sentinel? Confirm vs prior-art patterns.

**Resolution: use `useRef<number>` — simplest shape, matches both prior-art and the existing codebase pattern.**

**Evidence:**
1. **Codebase precedent:** The codebase already uses an integer generation counter via `startGenerationRef` in `App.tsx` (referenced in 07-CONTEXT.md "Established Patterns" — "Generation counters for async-token invalidation (Phase 5.1 `startGenerationRef`)"). Reusing the same pattern keeps the cognitive model consistent. [VERIFIED: codebase grep + 07-CONTEXT.md]
2. **React community pattern:** The React community standard for async-race invalidation is exactly this — a `useRef` holding an integer, bumped on each cancellation point, captured into a `const gen = ++ref.current` local at the start of the async function, then compared at every post-await side-effect site. [CITED: React docs "Synchronizing with Effects" and community articles on race-condition handling — though note `AbortController` is the modern primitive for fetch-style cancellation, it does not apply here because `createAudioEngine` does not accept an abort signal]
3. **Symbol/WeakRef ruled out:** Symbol would force every comparison to be a reference-equality check across closures — fine in principle but adds zero correctness and obscures the "monotonic counter" semantics. WeakRef is for object-identity tracking with GC participation; the engine here is owned by `engineRef` directly, no weak relationship.
4. **REVIEW.md fix sketch** (lines 136-155) explicitly proposes `const reconstructGenerationRef = useRef(0)` followed by `const gen = ++reconstructGenerationRef.current` — direct precedent.

**Recommended shape** (see "Recommended Code Shapes" §A below for the full skeleton):
```typescript
const reconstructGenerationRef = useRef<number>(0)

const reconstructEngine = useCallback(async (): Promise<void> => {
  const gen = ++reconstructGenerationRef.current
  // ... existing synchronous-null preserved ...
  let newEngine: AudioEngine
  try {
    newEngine = await createAudioEngine({ onStateChange: handleStateChange })
  } catch { /* ... */ return }

  // Bail if stop() / unmount / a newer reconstruct ran during the await.
  if (gen !== reconstructGenerationRef.current) {
    void newEngine.close()
    return
  }
  // ... existing assignment path ...
}, [muted, handleStateChange])
```

`stop()` and unmount cleanup also bump the counter (synchronous-null preserved AND counter bumped — defense in depth). [VERIFIED: REVIEW.md CR-03 fix sketch]

---

### Open Question 2 — `onended` listener leak (AUDIO-04)

**Question:** Does `addEventListener('ended', ...)` on an OscillatorNode itself need cleanup, or is the GC chain (osc → ended → handler → disconnect → drop) self-cleaning once the osc node releases? If leak risk exists, the plan should add `{ once: true }`.

**Resolution: there IS a non-trivial retention risk; use `{ once: true }` to make the listener self-removing.**

**Evidence:**

1. **Web Audio Working Group acknowledges the issue:** The WG has explicit issues open about node memory leaks after stop/disconnect — `stop()` does NOT automatically free the JS-side AudioNode graph and explicit `disconnect()` is the recommended fix. [CITED: [WebAudio/web-audio-api#904 — AudioNode stop/disconnect doesn't free memory](https://github.com/WebAudio/web-audio-api/issues/904); [#1471 — AudioNode Lifetime section](https://github.com/WebAudio/web-audio-api/issues/1471)]
2. **OscillatorNode-specific:** Per the spec discussions, an OscillatorNode keeps a "playing reference" to itself while playing. When playback ends (via `osc.stop()` resolving on the audio thread), the playing reference drops, but if a JS-side closure holds the node via an event listener, the node and its connections stay alive. Disconnecting the chain in `onended` is the canonical fix. [CITED: [#277 — onended of OscillatorNode description is confusable](https://github.com/WebAudio/web-audio-api/issues/277); [#1866 — References to garbage collection](https://github.com/WebAudio/web-audio-api/issues/1866)]
3. **`{ once: true }` is the right primitive:** The `addEventListener` option `{ once: true }` makes the listener self-removing after the first invocation. The `ended` event fires exactly once per oscillator (or never, on a stop-during-prepare path). Using `once: true` means there is no manual `removeEventListener` cleanup site to maintain, and the listener does not retain the chain. [CITED: [MDN EventTarget.addEventListener — once option](https://developer.mozilla.org/en-US/docs/Web/API/EventTarget/addEventListener#once)]
4. **Browser support:** Universal across modern browsers (Chrome, Firefox, Safari, Edge) — not a worry.

**Recommended shape:**
```typescript
// Inside scheduleBowlCue, for each partial:
osc.start(when)
osc.stop(stopAt)
osc.addEventListener('ended', () => {
  try { osc.disconnect() } catch { /* silent — already disconnected during teardown */ }
  try { partialGain.disconnect() } catch { /* silent */ }
}, { once: true })

// After the partials loop — the SHARED filter and envelope are disconnected once,
// after the LAST oscillator ends. Track via a counter or attach the listener to
// the last osc only:
const lastOsc = /* the last osc created in the partials loop */
lastOsc.addEventListener('ended', () => {
  try { filter.disconnect() } catch { /* silent */ }
  try { envelope.disconnect() } catch { /* silent */ }
}, { once: true })
```

**Note on the shared filter/envelope:** All three partials share one `filter` (3000 Hz biquad) and one `envelope` (master GainNode). The simplest correct cleanup is to attach the per-osc disconnect to each oscillator (each disconnects ITS OWN `partialGain`), and attach the shared-chain disconnect to ONE oscillator only (typically the last one created in the partials loop — they all `stop()` at the same audio-thread time, so any single `ended` event is fine). [VERIFIED: re-read of cueSynth.ts:117-134]

**Defensive try/catch:** All `.disconnect()` calls are wrapped in `try/catch` because disconnecting an already-disconnected node throws `InvalidAccessError` on some browsers. The silent-absorb posture matches Plan 06 D-09 and the broader codebase silent-fallback convention.

---

### Open Question 3 — Wake-lock release-during-await sentinel (WAKELOCK-01)

**Question:** When `release()` ran during `await navigator.wakeLock.request(...)`, the freshly-acquired sentinel must be released. Confirm `.release()` is idempotent on a sentinel that was never stored, and recommend the exact in-flight ref + post-await sentinel-handoff pattern.

**Resolution: `release()` IS idempotent per spec. Use `useRef<boolean>` in-flight gate + post-await check on `wasAcquiredRef`; release-and-discard if the consumer called `release()` during the await.**

**Evidence:**

1. **Spec confirms idempotency:** The W3C Screen Wake Lock spec's `release()` algorithm:
   > "If this's `[[Released]]` is `false`, then run release a wake lock with `|lock|` set to this and `|type|` set to the value of this's `type` attribute."

   The spec further states: "Once a `WakeLockSentinel` is released, `released` becomes `true`, and the value never changes again." Subsequent calls when `[[Released]]` is `true` skip the release-a-wake-lock algorithm entirely and resolve to `undefined`. The operation is fully idempotent. [CITED: [W3C Screen Wake Lock spec, §3 WakeLockSentinel](https://w3c.github.io/screen-wake-lock/#the-wakelocksentinel-interface) — verified via WebFetch]
2. **`.released` attribute is the disambiguator** if you need to know whether the call actually did anything — but for our use case (release-and-forget), idempotency is sufficient.
3. **REVIEW.md CR-04 fix sketch** (lines 164-189) is the canonical shape — confirmed correct.

**Recommended shape:**
```typescript
const sentinelRef = useRef<WakeLockSentinel | null>(null)
const wasAcquiredRef = useRef<boolean>(false)
const requestInFlightRef = useRef<boolean>(false)  // NEW for WAKELOCK-01

const request = useCallback(async (): Promise<void> => {
  if (!('wakeLock' in navigator)) return                  // D-09 API absent
  if (sentinelRef.current !== null) return                // D-08 already held
  if (requestInFlightRef.current) return                  // WAKELOCK-01: in-flight; second caller no-ops

  requestInFlightRef.current = true
  try {
    const sentinel = await navigator.wakeLock.request('screen')

    // WAKELOCK-01: if release() / unmount cleared wasAcquiredRef during the await,
    // the freshly-acquired sentinel is now orphaned — release it (idempotent per spec).
    if (!wasAcquiredRef.current && /* sentinel-not-yet-handed-off */ true) {
      // Subtle: at the moment of `await` resolution, no other code has touched
      // wasAcquiredRef BETWEEN the request resolving and us reading it (single-threaded
      // event loop). But release() may have set wasAcquiredRef = false WHILE the
      // await was pending — that's the race we are closing.
      // Caveat: wasAcquiredRef is false ALSO on the initial request (it gets set to
      // true at line 43 today). So the check must be: was wasAcquiredRef SET TO TRUE
      // and then CLEARED, or is this the first request? Use a separate "release was
      // called during await" sentinel:
      // SEE REVISED SHAPE BELOW.
    }
    // ...
  } finally {
    requestInFlightRef.current = false
  }
}, [])
```

**Revised shape (correct discriminator):** The simplest correct check is to compare `wasAcquiredRef` to its known pre-await value, OR to use a dedicated "release called during this in-flight request" flag. The REVIEW.md sketch sidesteps this with a slightly different approach: it stores the sentinel into `sentinelRef`, then a `release()` call that arrives later releases it via the normal path. That works as long as `release()` clears `requestInFlightRef` and we don't re-enter.

Recommended final shape (synthesizing REVIEW.md + spec):
```typescript
const request = useCallback(async (): Promise<void> => {
  if (!('wakeLock' in navigator)) return
  if (sentinelRef.current !== null) return
  if (requestInFlightRef.current) return
  requestInFlightRef.current = true
  try {
    const sentinel = await navigator.wakeLock.request('screen')

    // Post-await race check: if release() ran during the await, wasAcquiredRef
    // was cleared (set to false in release()). The freshly-acquired sentinel
    // is now orphaned — release it via the spec's idempotent path.
    // Note: on the FIRST request ever, wasAcquiredRef is also false here (it's
    // about to be set), but `requestInFlightRef.current === true` is sufficient
    // to gate this — release() also clears requestInFlightRef if it ran. So the
    // discriminator is: did `release()` (which sets wasAcquiredRef = false AND
    // clears requestInFlightRef-via-its-own-completion) actually run?
    // SIMPLEST CORRECT PATTERN: introduce a `releaseCalledDuringRequestRef` bool
    // that release() sets and the post-await branch reads + resets. This avoids
    // overloading wasAcquiredRef's semantics.

    const sentinelToKeep = !releaseCalledDuringRequestRef.current
    releaseCalledDuringRequestRef.current = false

    if (!sentinelToKeep) {
      void sentinel.release().catch(() => undefined)  // idempotent per spec; safe
      return
    }

    sentinelRef.current = sentinel
    wasAcquiredRef.current = true
    sentinel.addEventListener('release', () => {
      if (sentinelRef.current === sentinel) sentinelRef.current = null
    }, { once: true })  // match Pitfall 1 single-fire guard
  } catch {
    // D-09 silent
  } finally {
    requestInFlightRef.current = false
  }
}, [])

const release = useCallback(async (): Promise<void> => {
  wasAcquiredRef.current = false
  // WAKELOCK-01: if a request is in flight, signal post-await to discard the
  // freshly-acquired sentinel instead of storing it.
  if (requestInFlightRef.current) {
    releaseCalledDuringRequestRef.current = true
  }
  const sentinel = sentinelRef.current
  sentinelRef.current = null
  if (sentinel !== null) {
    try { await sentinel.release() } catch { /* D-09 */ }
  }
}, [])
```

`releaseCalledDuringRequestRef` is a third small ref but it gives an unambiguous signal that's easy to test. The planner may pick the simpler "check wasAcquiredRef after await" pattern from REVIEW.md if a test can disambiguate the first-request case — both shapes satisfy WAKELOCK-01.

**Idempotency in tests:** New Vitest case asserts that a second `request()` call entering during a pending first `request()`'s await is a no-op (only ONE `navigator.wakeLock.request('screen')` call observed). A separate case asserts that a `release()` arriving during a pending `request()`'s await results in `sentinel.release()` being called on the freshly-acquired sentinel (verifiable by spying on the sentinel returned by the mocked `navigator.wakeLock.request`).

---

### Open Question 4 — Test for "stop during reconstructEngine" (AUDIO-01)

**Question:** Existing tests cover stop-during-start. AUDIO-01 needs an analogous case for stop-during-reconstruct. Confirm whether the existing mock AudioContext in `useAudioCues.test.tsx` supports the timing primitives needed.

**Resolution: existing test scaffolding is sufficient. No extension needed.**

**Evidence:**

1. **`SlowCloseAC` pattern in `useAudioCues.test.tsx:248-289`** already demonstrates the controllable-close timing primitive — `close = vi.fn(() => new Promise<void>(() => {}))` returns a never-resolving promise, letting the test exercise the synchronous-null pattern. The same idiom works for `await createAudioEngine`: stub the AudioContext constructor to return an AC whose `state` getter (or any internal property accessed inside `createAudioEngine`) controls when the promise settles, OR — simpler — make `createAudioEngine`'s `await audioCtx.resume()` (the WR-06 path at line 114 in audioEngine.ts) settle on a controllable promise. [VERIFIED: re-read of useAudioCues.test.tsx]
2. **`SpyableAC` (`useAudioCues.test.tsx:447-503`)** is already the canonical reconstruction-path test scaffolding — tracks construction count, exposes `dispatchStateChange`, simulates `_simulateResumeReject`. The D-41 (d) test (line 597) already drives a synthetic `dispatchStateChange` AFTER an arbitrary state mutation, which is exactly the timing primitive the AUDIO-01 stop-during-reconstruct test needs.
3. **Recommended test outline** (for inclusion in `useAudioCues.test.tsx` under the existing `'reconstruction'` describe block):

```typescript
it("AUDIO-01: stop() during in-flight reconstructEngine closes the orphaned new engine and does not assign to engineRef", async () => {
  // 1. Setup: render hook, start, drive to needs-resume (existing D-41 (c) prelude).
  // 2. Arrange: when createAudioEngine is awaited (inside reconstructEngine), make
  //    the new AC's resume() return a controllable promise that does NOT settle
  //    until we explicitly resolve it. Use `_simulateResumeReject`-style controlled
  //    settlement, OR override the AC constructor itself to return an AC whose
  //    resume() returns a pending promise.
  // 3. Fire result.current.resume() WITHOUT awaiting. This enters reconstructEngine
  //    and parks on the await inside createAudioEngine.
  // 4. Synchronously call result.current.stop(). This bumps the generation counter
  //    (per AUDIO-01) and synchronously nulls engineRef (existing pattern).
  // 5. Resolve the parked resume() promise. createAudioEngine resolves with newEngine.
  // 6. Assert:
  //    - engineRef.current is still null (the new engine was NOT assigned).
  //    - newEngine.close() WAS called (the orphaned engine was closed).
  //    - reanchorSpy was NOT called (no re-anchor signal fired post-stop).
  //    - audioStatus is 'ok' (set by stop()), not flipped back to 'ok' by the
  //      post-reconstruct path (i.e., the bail-out branch returned early).
})
```

**Implementation primitive for "park `createAudioEngine` on a controllable promise":** the cleanest hook is to stub `AudioContext` such that its `resume()` returns a `new Promise<void>(resolve => { resolveFn = resolve })`. `createAudioEngine`'s line 114 awaits `audioCtx.resume()` inside the WR-06 startup path; that await parks the entire `createAudioEngine` promise. Resolve `resolveFn` to settle. The existing test patterns include a precedent for this (`SlowCloseAC`).

---

## Architectural Responsibility Map

| Capability | Primary Tier | Secondary Tier | Rationale |
|------------|-------------|----------------|-----------|
| Past-time clamp (audio scheduling) | Audio engine (`audioEngine.ts`) | App layer (`App.tsx` boundary effect) | D-01 belt-and-suspenders — engine self-defends; App caller-side blocks the bad value at its source so the engine never has to see it. Exporting `SAFE_LEAD_SEC` keeps the constant single-sourced. |
| Generation-counter race invalidation | React hook (`useAudioCues.ts`) | — | `reconstructEngine`, `stop()`, and the unmount cleanup all live in the hook. The engine layer is React-free per Phase 3 D-02 and stays so. |
| Web Audio node graph cleanup | Pure synth module (`cueSynth.ts`) | — | `onended` runs on the audio thread; disconnect is the audio-graph concern, not React's. |
| State-change null safety | React hook (`useAudioCues.ts`) | — | `handleStateChange` is the React-side bridge from engine onStateChange → audioStatus setState. Null gate lives here, not in the engine. |
| Wake-lock concurrency / in-flight guard | React hook (`useWakeLock.ts`) | — | Sole owner of the imperative wake-lock resource; mirrors `useAudioCues`'s lifecycle posture. |
| `AudioStatus` union shape | Type module (`audioEngine.ts:25`) | Hook (`useAudioCues.ts` setStatus sites) | Type lives where the engine API lives; hook is the only consumer. |

This map exactly matches the locked plan packaging in D-11..D-14 (Wave 1 engine-layer / Wave 2 hook+App-layer). No tier-misassignment risk.

---

## Standard Stack

This is a fix-only patch — no new libraries. The existing stack (verified Phase 3 D-04 — all audio is Web Audio API, no bundled assets; Phase 5 — Screen Wake Lock API) is preserved.

| Library | Version | Purpose | Why Standard |
|---------|---------|---------|--------------|
| React | 19.x (per project) | Hooks, refs, effects | Already in use; strict TS baseline (Phase 7) enforced. |
| Vitest | latest project | Test runner | 366 tests baseline; co-located `*.test.{ts,tsx}` per Phase 8 precedent. |
| `@testing-library/react` | latest project | Hook & component tests | `renderHook` + `act` idiom established in `useAudioCues.test.tsx`. |
| Web Audio API (browser) | n/a | Audio synthesis | Per Phase 3 D-04 (no bundled assets); `FakeAudioContext` polyfill in `vitest.setup.ts` is the test seam. |
| Screen Wake Lock API (browser) | n/a | Sleep prevention | Per Phase 5; `useWakeLock` is the sole consumer. |

**No installation step.** All new code goes against the existing toolchain.

---

## Architecture Patterns

### System Architecture Diagram

```
                                ┌──────────────────────────────┐
   user gesture (Start click)   │ App.tsx                      │
   ─────────────────────────────▶│  • boundary effect (L504)   │
                                 │  • dual anchor (audioAnchor) │
                                 └────────────┬─────────────────┘
                                              │ audioNotifyPhaseBoundary
                                              │ (clamp HERE — AUDIO-02 caller-side)
                                              ▼
                                ┌──────────────────────────────┐
                                │ useAudioCues.ts (hook)       │
                                │  • engineRef (imperative)    │
                                │  • generation counter (NEW)  │
                                │  • handleStateChange (gated) │
                                │  • setStatus union (-starting)│
                                └────────────┬─────────────────┘
                                              │ engine.scheduleNextCue
                                              │ engine.scheduleLeadIn
                                              │ engine.close
                                              ▼
                                ┌──────────────────────────────┐
                                │ audioEngine.ts (service)     │
                                │  • AC + envelope + activeCues│
                                │  • clamp HERE (AUDIO-02      │
                                │    callee-side)              │
                                │  • scheduleLeadIn → null      │
                                │    when closed (AUDIO-03)    │
                                │  • SAFE_LEAD_SEC export      │
                                └────────────┬─────────────────┘
                                              │ scheduleInCue/OutCue/Tick
                                              ▼
                                ┌──────────────────────────────┐
                                │ cueSynth.ts (pure builders)  │
                                │  • partial nodes + filter +  │
                                │    envelope graph            │
                                │  • osc.onended disconnect    │
                                │    (NEW — AUDIO-04)          │
                                └──────────────────────────────┘

  ── parallel imperative resource ──
                                ┌──────────────────────────────┐
   visibilitychange / Start ────▶│ useWakeLock.ts               │
                                │  • sentinelRef               │
                                │  • wasAcquiredRef             │
                                │  • requestInFlightRef (NEW)   │
                                │    + releaseCalledDuringReq.. │
                                │  • spec-idempotent .release() │
                                └──────────────────────────────┘
```

### Component Responsibilities

| File | Responsibility | Phase 9 Changes |
|------|----------------|-----------------|
| `src/audio/audioEngine.ts` | Stateful audio service (AC, envelope, lead-in, boundary dispatch). Zero React. | Add `SAFE_LEAD_SEC` export (D-03). Clamp inside `scheduleNextCue` (AUDIO-02 callee). Return `null` from `scheduleLeadIn` when `closed` (AUDIO-03). Tighten `AudioStatus` union (AUDIO-06). |
| `src/audio/cueSynth.ts` | Pure Web Audio synthesis builders. | Add `osc.onended` chain-disconnect with `{ once: true }` (AUDIO-04). |
| `src/hooks/useAudioCues.ts` | React-side state machine + imperative API. | Add `reconstructGenerationRef`; bump in `stop()` and unmount; check post-await in `reconstructEngine` (AUDIO-01). Null-gate every branch in `handleStateChange` (AUDIO-05). Propagate `scheduleLeadIn`'s new `null` return (AUDIO-03). Remove `setStatus('starting')` + docstring (AUDIO-06). |
| `src/hooks/useWakeLock.ts` | Wake-lock imperative API. | Add `requestInFlightRef` + `releaseCalledDuringRequestRef`; post-await sentinel-handoff cleanup (WAKELOCK-01). |
| `src/app/App.tsx` | App composition + boundary scheduling. | Import `SAFE_LEAD_SEC` from `audioEngine`; clamp `audioTime` at line 504 BEFORE the `audioNotifyPhaseBoundary` call (AUDIO-02 caller). Read `audio.audioNow()` once into a local; skip schedule if null. |

### Pattern 1: Generation-Counter Race Invalidation

**What:** A monotonic integer stored in `useRef` is bumped at the start of every async function and at every cancellation point (`stop()`, unmount). After every `await`, check whether the counter still equals the captured pre-await value. If not, bail.

**When to use:** Async operation that produces a side-effect (mutation to a ref or setState) which would be incorrect if the operation was logically cancelled mid-flight.

**Example** (from REVIEW.md CR-03 + adapted):
```typescript
const reconstructGenerationRef = useRef<number>(0)

const reconstructEngine = useCallback(async (): Promise<void> => {
  const gen = ++reconstructGenerationRef.current
  // ... existing synchronous-null preserved ...
  let newEngine: AudioEngine
  try {
    newEngine = await createAudioEngine({ onStateChange: handleStateChange })
  } catch { /* ... */ return }
  if (gen !== reconstructGenerationRef.current) {
    void newEngine.close()  // orphaned — close-and-discard
    return
  }
  engineRef.current = newEngine
  // ... rest of existing branch ...
}, [muted, handleStateChange])
```

### Pattern 2: Null-Gate Pattern (single-gate-on-engineRef)

**What:** At the top of any function that reads imperative state via a ref, read once into a local const and return early if null. The rest of the function body reads from the local, not from the ref.

**When to use:** React-side bridge functions (event handlers, callbacks) that may fire after an unmount/teardown nulled the ref.

**Example** (matches `useAudioCues.ts:156-158` precedent, applied to `handleStateChange` per D-04):
```typescript
const handleStateChange = useCallback(
  (state: AudioContextState | 'interrupted'): void => {
    const engine = engineRef.current  // D-04 / D-06 single gate at top
    if (engine === null) return       // future branches that need engine are safe
    // ... existing branches ...
  },
  [],
)
```

Note: today's `handleStateChange` body doesn't read `engineRef.current` — it only reads `visibilityResumeAttemptedRef` and calls `setAudioStatus`. D-04 is preventative: the gate is in place for ANY future addition. The null check itself is cheap (one ref read + nullish compare).

### Pattern 3: Self-Removing Listener (`{ once: true }`)

**What:** Pass `{ once: true }` as the third arg to `addEventListener`. The browser auto-removes the listener after the first event fires.

**When to use:** One-shot events on disposable resources — `osc.onended` (single fire per oscillator), `sentinel.release` (single fire per sentinel).

**Example** (for AUDIO-04):
```typescript
osc.addEventListener('ended', () => {
  try { osc.disconnect() } catch { /* silent */ }
  try { partialGain.disconnect() } catch { /* silent */ }
}, { once: true })
```

### Anti-Patterns to Avoid

- **Replacing synchronous-null with generation counter alone.** The codebase uses BOTH patterns and they are NOT redundant — synchronous-null protects against fast-second-call races (e.g., `start()` arriving during `stop()`'s `await close()`); generation counter protects against in-flight async resolution clobbering ref state after a synchronous cancellation. AUDIO-01 must add the counter ON TOP of the existing synchronous-null in `reconstructEngine` (lines 257-261). Do NOT remove the synchronous-null step.
- **Per-branch null checks in `handleStateChange`.** D-04 / D-06 explicitly mandate ONE gate at the top. Don't sprinkle `if (engineRef.current === null) return` inside each `if`/`else if` — invariant becomes opaque.
- **Custom rejection-code branching in `release().catch(...)`.** Existing `useWakeLock` Pitfall 3 / Anti-pattern (per `useWakeLock.ts:55-59`) — bare catch, no `err.name` discrimination. WAKELOCK-01 preserves this posture.
- **`console.warn` on the new no-downgrade / silent-clamp paths.** Phase 8 D-03 silent posture extends to Phase 9.
- **Forgetting to bump the generation counter in unmount cleanup.** The unmount cleanup at `useAudioCues.ts:141-150` MUST also bump `reconstructGenerationRef.current` — otherwise an in-flight reconstruct surviving the unmount would still assign to a now-disposed ref.

---

## Don't Hand-Roll

| Problem | Don't Build | Use Instead | Why |
|---------|-------------|-------------|-----|
| Event listener cleanup for one-shot events | Manual `addEventListener` + `removeEventListener` pair with a closure-captured handler reference | `addEventListener(type, fn, { once: true })` | Self-removing; one less site to maintain; matches browser spec primitive. |
| Wake-lock sentinel idempotency | `if (sentinel.released) return; await sentinel.release()` | Just `await sentinel.release()` | Spec confirms `.release()` is idempotent on an already-released sentinel — `released` attribute exists for observability, not as a precondition. |
| AbortController for `createAudioEngine` cancellation | Custom abort plumbing through `createAudioEngine` | Generation counter checked post-await | `createAudioEngine` does not accept an abort signal; adding one is scope creep. The counter pattern is sufficient and idiomatic. |
| Past-time detection inside cueSynth | Pre-flight `if (when < audioCtx.currentTime) ...` inside `scheduleBowlCue` | Engine-level clamp in `scheduleNextCue` (D-01 callee site) | Web Audio's past-time behavior is implementation-dependent (Firefox silently drops, Chrome plays immediately). Clamp UPSTREAM of cueSynth so cueSynth's pure-builder posture is preserved. |
| Symbol/WeakRef-based generation token | `useRef<symbol>(Symbol())` + reference-equality | `useRef<number>(0)` + bump | Number generation counter is the canonical React pattern; symbols add zero correctness here. |

**Key insight:** Every entry in this table is a place where the React/Web-Audio/WakeLock spec already gives us a battery-included primitive. Phase 9 is about USING those primitives, not building new ones.

---

## Runtime State Inventory

This phase has no rename/refactor/migration scope — only fix-only code edits in 6 source files and their test neighbors. No stored data, no live service config, no OS-registered state, no secret/env-var changes, no build artifact rename. **Step 2.5 SKIPPED — explicitly verified, no inventory items found in any category.**

---

## Common Pitfalls

### Pitfall 1: Removing synchronous-null when adding the generation counter (AUDIO-01)

**What goes wrong:** Developer reads REVIEW.md CR-03 fix sketch, copies the generation-counter pattern, and "simplifies" by removing the existing synchronous-null at `useAudioCues.ts:260-261`.

**Why it happens:** The two patterns LOOK redundant — both prevent stale ref state — but they protect different races. Synchronous-null protects the in-tab fast-second-call race (`setMuted()` arriving during the `await close()`). Generation counter protects the in-flight-await-clobbers-state race (`stop()` arriving during `await createAudioEngine`).

**How to avoid:** AUDIO-01's plan task description MUST explicitly say "ADD the generation counter ON TOP of the existing synchronous-null at L260-261; do NOT remove the synchronous-null step." Phase 9 plan-checker should verify the synchronous-null lines are still present after Wave 2.

**Warning signs:** A diff that deletes `engineRef.current = null` from `reconstructEngine` is wrong.

### Pitfall 2: `'starting'` removal breaks third-party consumer (AUDIO-06)

**What goes wrong:** Someone imports `AudioStatus` type elsewhere and writes a switch statement that handles `'starting'`. After D-07 deletes the union member, the switch becomes dead — but the strict ESLint `no-fallthrough-case-in-switch` and / or `no-unused-vars` may not catch this on its own.

**Why it happens:** Type-narrowing on a union member that no longer exists is silently fine if the switch arm body has no side effects.

**How to avoid:** Run `tsc --noEmit` AFTER D-07 lands. Any reference to the literal `'starting'` in a type position should produce a TS2367 (this comparison appears to be unintentional because the types have no overlap). Grep for `'starting'` across the codebase as a sanity check.

**Warning signs:** `grep -r "'starting'" src` returns non-zero matches after the change.

### Pitfall 3: `osc.onended` not fired on a stop-during-prepare (AUDIO-04)

**What goes wrong:** If `osc.stop()` is called before `osc.start()` (or with a stop time before the start time), the `ended` event may not fire — depends on browser. The `{ once: true }` listener stays attached forever; the chain is not disconnected.

**Why it happens:** Edge case in the spec. `cueSynth.scheduleBowlCue` always `start()`s before `stop()` in the SAME loop iteration, with `start(when)` and `stop(stopAt)` where `stopAt > when` — so this should never fire in normal operation. But if a future change scheduled `stop()` with a past time, the bug would lurk.

**How to avoid:** Document the invariant in a comment near the `addEventListener` site: `// Pre-condition: osc.stop(stopAt) where stopAt > when. If stopAt < when, ended may not fire and the chain leaks.` The post-stopAt cleanupAt-based `pruneExpiredCues` in `audioEngine.ts:141-146` would not catch this either — but cueSynth's invariant is currently safe.

**Warning signs:** A diff that changes the `osc.start(when) / osc.stop(stopAt)` ordering or makes `stopAt` dependent on a clock that could be < `when`.

### Pitfall 4: `noUncheckedIndexedAccess` surfaces on new test fixtures

**What goes wrong:** Adding test helpers like `tracker.instances[tracker.instances.length - 1]` (existing pattern in `App.audio.test.tsx:421`) produces `T | undefined` under Phase 7's `noUncheckedIndexedAccess` and triggers `no-non-null-assertion` if you `!` it.

**Why it happens:** Phase 7 enabled `noUncheckedIndexedAccess: true` — every array/object access via bracket-notation returns `T | undefined`.

**How to avoid:** Use the established Phase 7 escape-hatch: explicit narrowing with `// Reason:` annotated `// eslint-disable-next-line @typescript-eslint/no-non-null-assertion` per Phase 7 D-04. Or refactor to use `.at(-1)` with a defensive nullish check. Or store the last instance into a typed local before access.

**Warning signs:** New `eslint-disable` comments without `// Reason:` annotations — will fail Phase 7 D-04 code review.

### Pitfall 5: Caller-side clamp depends on a nullable `audio.audioNow()` (AUDIO-02 / cross-phase)

**What goes wrong:** App.tsx line 504 doesn't currently have access to `engine.now()` directly. The closest accessor is `audio.audioNow()` which returns `number | null` (per `useAudioCues.ts:64`). The caller-side clamp at App.tsx:504 needs to read this BEFORE the boundary check. But the existing AC-unavailable short-circuit at line 493 (`if (audioAnchor === null || plan === null) return`) does NOT guarantee `audio.audioNow()` is non-null.

**Why it happens:** `audioAnchor` is set by the lead-in completion callback; it survives engine close. `audio.audioNow()` returns null when `engineRef.current === null` — i.e., AFTER stop or close. So in the window between "engine just closed" and "audioAnchor not yet cleared," the caller-side clamp would see audioNow === null.

**How to avoid:** Add the caller-side clamp ONLY when `audio.audioNow()` returns non-null. If null, skip the schedule entirely (the engine-side clamp is the safety net at the callee). Concrete sequence:
```typescript
const liveAudioNow = audio.audioNow()
if (liveAudioNow === null) {
  // AC unavailable mid-frame; engine-side clamp + the L493 guard cover this.
  // Skip the boundary notification — the next frame's effect will re-evaluate.
  audioNotifyPhaseBoundary({ newPhase: frame.phase, audioTime, phaseDurationSec })
  return
}
const clampedAudioTime = Math.max(audioTime, liveAudioNow + SAFE_LEAD_SEC)
audioNotifyPhaseBoundary({ newPhase: frame.phase, audioTime: clampedAudioTime, phaseDurationSec })
```

Alternative: skip the entire scheduling when `liveAudioNow === null`. Simpler. The downside is that a transient null window would miss one boundary cue — but the user has just lost the AC anyway, so a missed cue is the least of their concerns.

**Warning signs:** Plan 02 task description for the caller-side clamp omits the null-check on `audio.audioNow()`.

**Cross-phase note:** Phase 12 HYGIENE-01 plans to REMOVE `audioNow` from the hook surface (IN-02 dead-API claim). If Phase 9 starts consuming `audio.audioNow()` at App.tsx:504, that consumer must also be deleted in Phase 12 — OR Phase 12 must keep `audioNow` exported. Document this dependency in the Plan 02 commit message so Phase 12's planner sees the consumer.

### Pitfall 6: `handleStateChange` null-gate logical equivalence under Phase 7 strict-type-checked

**What goes wrong:** Under Phase 7's `strictTypeChecked` preset, the rule `@typescript-eslint/no-unnecessary-condition` fires on `if (engineRef.current === null) return` because `engineRef.current`'s static type is `AudioEngine | null` — the check IS necessary, but eslint's flow analysis may flag it as redundant if the immediately preceding code doesn't narrow.

**Why it happens:** The strict-type-checked preset is aggressive about flagging "unnecessary" null checks.

**How to avoid:** This shouldn't fire because `engineRef.current` is a ref read whose value can change between statements (refs are by definition not narrowable). If it does fire, use the `// Reason: ref read is not narrowable across statements; gate documents the invariant` annotation pattern from Phase 7 D-04.

**Warning signs:** A new `no-unnecessary-condition` error in `useAudioCues.ts` after Plan 02 lands.

---

## Reference Implementations (codebase analog patterns)

### Reference A: Synchronous-null pattern (AUDIO-01 builds on this)

Location: `src/hooks/useAudioCues.ts:222-230` (within `stop()`)

```typescript
const stop = useCallback(async (): Promise<void> => {
  // Null engineRef synchronously BEFORE awaiting close — otherwise a fast
  // start() arriving during the close window hits the defensive guard in
  // start() and returns from a closing AudioContext, leaving engineRef
  // pointing at a dead engine.
  const engine = engineRef.current
  engineRef.current = null
  firstInCueTimeRef.current = null
  // ...
  if (engine !== null) {
    await engine.close() // D-11
  }
}, [])
```

Also at `useAudioCues.ts:254-261` (within `reconstructEngine`):
```typescript
const reconstructEngine = useCallback(async (): Promise<void> => {
  const oldEngine = engineRef.current
  const currentMuted = muted
  // Pattern B (Pitfall 3): synchronously null engineRef BEFORE awaiting —
  // mirrors stop()'s posture so a fast call into setMuted() during the window
  // does not deref a closing AC.
  engineRef.current = null
  firstInCueTimeRef.current = null
  // ...
})
```

**AUDIO-01 layers the generation counter ON TOP of this** — both protections coexist (see Pitfall 1).

### Reference B: Single-gate-on-engineRef pattern (AUDIO-05 follows this)

Location: `src/hooks/useAudioCues.ts:156-158` (in the comment on the visibility-resume effect):

```typescript
// The single gate is engineRef.current !== null (D-03 / D-04).
useEffect(() => {
  const onVisibility = (): void => {
    if (document.visibilityState !== 'visible') return
    if (engineRef.current === null) return       // ← single gate
    visibilityResumeAttemptedRef.current = true
    void engineRef.current.resume()
  }
  // ...
})
```

**AUDIO-05's `handleStateChange` follows this verbatim per D-04 / D-06.**

### Reference C: Pitfall-6 unmount race comment (WAKELOCK-01 formalizes this)

Location: `src/hooks/useWakeLock.ts:90-99`:

```typescript
return () => {
  document.removeEventListener('visibilitychange', onVisibility)
  // Pitfall 6: unmount-cleanup race against in-flight request(). Synchronously
  // null the sentinel ref BEFORE the await on release() so a fast new request()
  // arriving during the unmount window doesn't see a half-released sentinel.
  const sentinel = sentinelRef.current
  sentinelRef.current = null
  wasAcquiredRef.current = false
  if (sentinel !== null) {
    void sentinel.release().catch(() => {}) // D-09
  }
}
```

The comment already documents the race; WAKELOCK-01 closes it with an explicit `requestInFlightRef` + `releaseCalledDuringRequestRef`.

### Reference D: Sentinel match-pair guard (AUDIO-04's analog)

Location: `src/hooks/useWakeLock.ts:49-54`:

```typescript
sentinel.addEventListener('release', () => {
  if (sentinelRef.current === sentinel) {
    sentinelRef.current = null
  }
})
```

This is the codebase's pattern for "only clear the ref if it still points to THIS resource." AUDIO-04's `onended` listener uses the same defensive shape:
```typescript
osc.addEventListener('ended', () => {
  try { osc.disconnect() } catch { /* silent */ }
  // ...
}, { once: true })
```

(no need to check identity because each listener is bound to a specific osc instance via closure capture; identity is implicit).

### Reference E: SAFE_LEAD constant export pattern (AUDIO-02's analog)

Location: `src/audio/audioEngine.ts:77-80`:

```typescript
export const LEAD_IN_TICK_INTERVAL_SEC = 1.0
export const LEAD_IN_DURATION_SEC = 3.0
export const LEAD_IN_TICK_INTERVAL_MS = LEAD_IN_TICK_INTERVAL_SEC * 1000
export const LEAD_IN_DURATION_MS = LEAD_IN_DURATION_SEC * 1000
```

WR-04 (commented above the LEAD_IN exports): "exported as the single source of truth — App.tsx and useAudioCues.ts import these instead of redefining the same numbers locally (which silently drifted before)." AUDIO-02 / D-03's `SAFE_LEAD_SEC` follows this exact precedent.

### Reference F: D-41 (d) discriminating-assertion pattern (test geography for AUDIO-05)

Location: `src/hooks/useAudioCues.test.tsx:581-625` (D-41 (d) "closed state → audioStatus === 'unavailable' (discriminating: asserts BEFORE stop() resets)"):

```typescript
// Drive a synthetic 'closed' statechange dispatch on the live AC instance via
// a prototype-level spy on dispatchStateChange (same SpyableAC pattern as D-41 (c)).
vi.spyOn(SpyableAC.prototype, 'dispatchStateChange').mockImplementationOnce(function (this: SpyableAC) {
  this.state = 'closed'
  for (const l of (this as any)._listeners.get('statechange') ?? []) l(new Event('statechange'))
})
await act(async () => {
  const live = SpyableAC.lastInstance as SpyableAC
  live.dispatchStateChange()
  await Promise.resolve()
  await Promise.resolve()
})
expect(result.current.audioStatus).toBe('unavailable')
```

**AUDIO-05's test follows this exact pattern**, but with two differences: (a) `stop()` is called BEFORE the synthetic dispatch (to null engineRef); (b) the assertion is "no setState fired and no throw" (negative existence) rather than a positive state-shift assertion. The prototype-level spy + `SpyableAC.lastInstance` + manual `dispatchStateChange` invocation are reused.

---

## Recommended Code Shapes

### A. AUDIO-01 — Generation counter overlay on synchronous-null

```typescript
// useAudioCues.ts — NEW ref alongside existing engineRef
const reconstructGenerationRef = useRef<number>(0)

// REVISED stop() — bumps generation counter in addition to existing sync-null
const stop = useCallback(async (): Promise<void> => {
  ++reconstructGenerationRef.current  // AUDIO-01: invalidate in-flight reconstruct
  const engine = engineRef.current
  engineRef.current = null
  firstInCueTimeRef.current = null
  visibilityResumeAttemptedRef.current = false
  setAudioStatus('ok')
  setStatus('idle')
  if (engine !== null) {
    await engine.close()
  }
}, [])

// REVISED unmount cleanup — bumps generation counter
useEffect(() => {
  return () => {
    ++reconstructGenerationRef.current  // AUDIO-01: invalidate in-flight reconstruct
    const engine = engineRef.current
    if (engine !== null) {
      void engine.close()
      engineRef.current = null
    }
    firstInCueTimeRef.current = null
  }
}, [])

// REVISED reconstructEngine — stamps + checks generation
const reconstructEngine = useCallback(async (): Promise<void> => {
  const gen = ++reconstructGenerationRef.current  // AUDIO-01: stamp
  const oldEngine = engineRef.current
  const currentMuted = muted
  engineRef.current = null  // PRESERVE existing synchronous-null (Pitfall 1)
  firstInCueTimeRef.current = null

  let newEngine: AudioEngine
  try {
    newEngine = await createAudioEngine({ onStateChange: handleStateChange })
  } catch {
    if (oldEngine !== null) void oldEngine.close()
    setAudioStatus('unavailable')
    setAudioAvailable(false)
    return
  }

  // AUDIO-01: bail if stop() / unmount / a newer reconstruct ran during the await.
  if (gen !== reconstructGenerationRef.current) {
    void newEngine.close()
    if (oldEngine !== null) void oldEngine.close()
    return
  }

  if (oldEngine !== null) void oldEngine.close()
  engineRef.current = newEngine
  newEngine.setMuted(currentMuted)
  onReanchorRequiredRef.current?.(newEngine.now())
  visibilityResumeAttemptedRef.current = false
  setAudioStatus('ok')
  setAudioAvailable(true)
}, [muted, handleStateChange])
```

### B. AUDIO-02 — Engine-side clamp + SAFE_LEAD_SEC export

```typescript
// audioEngine.ts — new named export (after LEAD_IN_* exports)
/** AUDIO-02 D-03: minimum lead time between live audio clock and any scheduled cue.
 *  Web Audio drops past-time schedules silently (Firefox) or plays immediately (Chrome);
 *  this constant trades a microscopic perceptual delay for a guaranteed-audible cue. */
export const SAFE_LEAD_SEC = 0.005

// audioEngine.ts — REVISED scheduleNextCue
scheduleNextCue({ newPhase, audioTime, phaseDurationSec }): void {
  if (closed) return
  if (muted) return
  pruneExpiredCues()
  // AUDIO-02 D-01/D-02 callee-side clamp.
  const clampedAudioTime = Math.max(audioTime, audioCtx.currentTime + SAFE_LEAD_SEC)
  const cue = newPhase === 'in'
    ? scheduleInCue(audioCtx, clampedAudioTime, audioCtx.destination, phaseDurationSec)
    : scheduleOutCue(audioCtx, clampedAudioTime, audioCtx.destination, phaseDurationSec)
  activeCues.add(cue)
},
```

```typescript
// App.tsx — REVISED boundary effect (around line 504)
import { LEAD_IN_DURATION_MS, LEAD_IN_TICK_INTERVAL_MS, SAFE_LEAD_SEC } from '../audio/audioEngine'

// ... inside the boundary effect body, AFTER computing audioTime ...
const audioTime = audioAnchor + boundaryStartMs / 1000

// AUDIO-02 D-01/D-02 caller-side clamp.
const liveAudioNow = audio.audioNow()
if (liveAudioNow === null) {
  // AC unavailable mid-frame; the engine-side clamp will safely no-op if a stale
  // engineRef somehow remains. Pitfall 5: skip rather than schedule a stale value.
  return
}
const clampedAudioTime = Math.max(audioTime, liveAudioNow + SAFE_LEAD_SEC)
const phaseDurationSec = (frame.phase === 'in' ? plan.inhaleMs : plan.exhaleMs) / 1000
audioNotifyPhaseBoundary({ newPhase: frame.phase, audioTime: clampedAudioTime, phaseDurationSec })
```

### C. AUDIO-03 — `scheduleLeadIn` returns null when closed

```typescript
// audioEngine.ts — REVISED AudioEngine interface + implementation
export interface AudioEngine {
  /** Schedule the 3-2-1 lead-in. Returns the audioTime of the first In cue,
   *  or null when the engine is closed (AUDIO-03 — closed engine cannot project
   *  meaningful audio times). */
  scheduleLeadIn(startAudioTime: number, plan: BreathingPlan): number | null
  // ... rest unchanged ...
}

// In the implementation:
scheduleLeadIn(startAudioTime, plan): number | null {
  if (closed) return null  // AUDIO-03 (was: `return firstInCueTime`)
  const firstInCueTime = startAudioTime + LEAD_IN_DURATION_SEC
  if (muted) return firstInCueTime
  // ... rest unchanged ...
  return firstInCueTime
}
```

```typescript
// useAudioCues.ts — REVISED start() (call site at line 204)
const firstInCueTime = engine.scheduleLeadIn(startAudioTime, plan)
if (firstInCueTime === null) {
  // AUDIO-03: closed engine — fall through to the failure path.
  // The engine should never be closed here (we just created it), but
  // defense-in-depth.
  setAudioAvailable(false)
  setStatus('failed')
  return null
}
firstInCueTimeRef.current = firstInCueTime
setStatus('lead-in')
setAudioAvailable(true)
return firstInCueTime
```

### D. AUDIO-04 — Oscillator `onended` chain-disconnect

```typescript
// cueSynth.ts — REVISED scheduleBowlCue (lines 117-134)
const oscillators: OscillatorNode[] = []
const partialGains: GainNode[] = []
for (const partial of PARTIALS) {
  const osc = audioCtx.createOscillator()
  osc.type = 'sine'
  osc.frequency.value = fundamentalHz * partial.ratio
  const partialGain = audioCtx.createGain()
  partialGain.gain.value = partial.gain
  osc.connect(partialGain)
  partialGain.connect(filter)
  osc.start(when)
  osc.stop(stopAt)
  oscillators.push(osc)
  partialGains.push(partialGain)
}
filter.connect(envelope)
envelope.connect(destination)

// AUDIO-04: explicit disconnect on osc.onended.
// Pre-condition: osc.stop(stopAt) with stopAt > when — ensures 'ended' fires.
// Per-partial: disconnect osc + partialGain when this oscillator ends.
// Shared chain (filter + envelope): disconnect when the LAST partial ends.
// All three partials share the same stopAt, so any single 'ended' is fine — pick the last.
for (let i = 0; i < oscillators.length; i++) {
  const osc = oscillators[i]
  const partialGain = partialGains[i]
  // Reason: noUncheckedIndexedAccess — i is bounded by oscillators.length; both indices populated above.
  if (osc === undefined || partialGain === undefined) continue
  osc.addEventListener('ended', () => {
    try { osc.disconnect() } catch { /* silent */ }
    try { partialGain.disconnect() } catch { /* silent */ }
  }, { once: true })
}
// Shared filter + envelope: attached to the last oscillator only.
const lastOsc = oscillators[oscillators.length - 1]
if (lastOsc !== undefined) {
  lastOsc.addEventListener('ended', () => {
    try { filter.disconnect() } catch { /* silent */ }
    try { envelope.disconnect() } catch { /* silent */ }
  }, { once: true })
}
```

Alternative simpler shape (single shared `ended` listener that disconnects everything — relies on all three oscillators stopping at the same audio-thread time, which is true here):
```typescript
const lastOsc = oscillators[oscillators.length - 1]
if (lastOsc !== undefined) {
  lastOsc.addEventListener('ended', () => {
    for (const osc of oscillators) {
      try { osc.disconnect() } catch { /* silent */ }
    }
    for (const partialGain of partialGains) {
      try { partialGain.disconnect() } catch { /* silent */ }
    }
    try { filter.disconnect() } catch { /* silent */ }
    try { envelope.disconnect() } catch { /* silent */ }
  }, { once: true })
}
```

The planner picks; either shape satisfies AUDIO-04.

### E. AUDIO-05 — `handleStateChange` null gate (D-04 / D-06)

```typescript
// useAudioCues.ts — REVISED handleStateChange (lines 116-136)
const handleStateChange = useCallback(
  (state: AudioContextState | 'interrupted'): void => {
    // AUDIO-05 D-04 / D-06: defensive single gate at top — protects ANY future
    // branch that reads engineRef.current. Deferred reshape (D-05 → v1.x).
    // Reason: ref reads are not narrowable across statements; the null check
    // documents the invariant for branches that may be added in v1.x.
    const engine = engineRef.current
    if (engine === null) return

    if (state === 'running') {
      visibilityResumeAttemptedRef.current = false
      setAudioStatus('ok')
    } else if (state === 'closed') {
      setAudioStatus('unavailable')
    } else if (
      (state === 'suspended' || state === 'interrupted') &&
      visibilityResumeAttemptedRef.current
    ) {
      setAudioStatus('needs-resume')
    }
  },
  [],
)
```

### F. AUDIO-06 — `AudioStatus` union tightening

```typescript
// audioEngine.ts:25 — REVISED type
export type AudioStatus = 'idle' | 'lead-in' | 'failed'  // was: 'idle' | 'starting' | 'lead-in' | 'failed'
```

```typescript
// useAudioCues.ts:5-7 — REVISED docstring (D-09)
// State machine: 'idle' → 'lead-in' (success) | 'failed' (D-10 Plan 06).
```

```typescript
// useAudioCues.ts:192 — DELETE setStatus('starting') line entirely (D-08)
// Before:
//   setStatus('starting')
//   try { const engine = await createAudioEngine(...) ... }
// After:
//   try { const engine = await createAudioEngine(...) ... }
```

Test (D-10) — compile-time / Vitest assertion:
```typescript
// useAudioCues.test.tsx — NEW case
import type { AudioStatus } from '../audio/audioEngine'

it('AUDIO-06: AudioStatus union excludes "starting" (D-07)', () => {
  // Compile-time discrimination: this assignment compiles only if the
  // union exactly matches { 'idle' | 'lead-in' | 'failed' }. Any future
  // reintroduction of 'starting' would shift the exhaustive switch and
  // fail to compile or fail this assertion.
  const exhaustive: AudioStatus = 'idle'
  switch (exhaustive) {
    case 'idle':
    case 'lead-in':
    case 'failed':
      expect(true).toBe(true)
      break
    // Reason: exhaustive switch — no 'starting' branch must exist (AUDIO-06 D-07).
    // If 'starting' is reintroduced to the union, TS will error here.
  }
})
```

Alternative shape using `satisfies`:
```typescript
const _audioStatusValues = ['idle', 'lead-in', 'failed'] as const
type _Check = (typeof _audioStatusValues)[number]
// Compile-time assertion: AudioStatus extends _Check AND _Check extends AudioStatus.
const _exhaustive: AudioStatus extends _Check ? (_Check extends AudioStatus ? true : false) : false = true
```

### G. WAKELOCK-01 — In-flight ref + post-await sentinel handoff

```typescript
// useWakeLock.ts — REVISED hook
const sentinelRef = useRef<WakeLockSentinel | null>(null)
const wasAcquiredRef = useRef<boolean>(false)
const requestInFlightRef = useRef<boolean>(false)               // NEW WAKELOCK-01
const releaseCalledDuringRequestRef = useRef<boolean>(false)    // NEW WAKELOCK-01

const request = useCallback(async (): Promise<void> => {
  if (!('wakeLock' in navigator)) return
  if (sentinelRef.current !== null) return
  if (requestInFlightRef.current) return  // WAKELOCK-01: second concurrent caller no-ops
  requestInFlightRef.current = true
  try {
    const sentinel = await navigator.wakeLock.request('screen')
    // WAKELOCK-01: if release() ran during the await, discard the freshly-acquired sentinel.
    if (releaseCalledDuringRequestRef.current) {
      releaseCalledDuringRequestRef.current = false
      void sentinel.release().catch(() => undefined)  // idempotent per spec
      return
    }
    sentinelRef.current = sentinel
    wasAcquiredRef.current = true
    sentinel.addEventListener('release', () => {
      if (sentinelRef.current === sentinel) sentinelRef.current = null
    }, { once: true })  // match Reference D pattern; { once: true } makes it self-removing
  } catch {
    // D-09 silent
  } finally {
    requestInFlightRef.current = false
  }
}, [])

const release = useCallback(async (): Promise<void> => {
  wasAcquiredRef.current = false
  // WAKELOCK-01: signal post-await to discard the freshly-acquired sentinel.
  if (requestInFlightRef.current) {
    releaseCalledDuringRequestRef.current = true
  }
  const sentinel = sentinelRef.current
  sentinelRef.current = null
  if (sentinel !== null) {
    try { await sentinel.release() } catch { /* D-09 */ }
  }
}, [])

// Unmount cleanup (existing useEffect at lines 77-100) also needs the new ref
// reset. The cleanup branch should:
//   - clear wasAcquiredRef.current = false (already done)
//   - signal releaseCalledDuringRequestRef.current = true IF requestInFlightRef.current
//   - synchronously null sentinelRef (already done)
//   - void sentinel.release() (already done)
```

---

## State of the Art

| Old Approach | Current Approach | When Changed | Impact |
|--------------|------------------|--------------|--------|
| `addEventListener` + `removeEventListener` pair for one-shot events | `addEventListener(..., { once: true })` | DOM Level 3 Events / Living Standard, broadly available since ~2017 | Self-removing listeners — no closure retention via callback identity. |
| Hand-rolled abort tokens for async fetch | `AbortController` + `AbortSignal` | Fetch spec ~2017; widely adopted in React community ~2020 | Not applicable here (`createAudioEngine` does not take an abort signal) — generation counter remains the standard for non-AbortController cancellation. |
| Boolean `cancelled` flag | Integer generation counter | Same era; counter scales to multi-fire scenarios | Counter is correct when MULTIPLE async ops can race; boolean is correct only for single-fire. AUDIO-01 uses counter because `stop()` AND a newer `reconstruct()` can both invalidate an in-flight reconstruct. |
| Polling for sentinel `released` attribute | `release()` is idempotent | Screen Wake Lock API spec stabilized 2022 | No need to check `released` before calling `release()`. |

**Deprecated/outdated:**
- Pre-strict-mode TS null-handling conventions in this codebase are now compiler-enforced (Phase 7) — defensive `T | null` returns will compile cleanly without changes.
- `console.warn` on storage / audio path failures is explicitly OUT in Phase 8 D-03 / Phase 3 D-09 — silent-fallback is the milestone-wide posture.

---

## Validation Architecture (Nyquist Dimension 8)

This is a fix-only patch with zero user-facing behavior change. Validation reduces to:

- All 366 existing Vitest cases still pass (assertion: 366 → ≥ 366 after Phase 9).
- New co-located tests lock each REQ-ID contract per D-14.

### Test Framework

| Property | Value |
|----------|-------|
| Framework | Vitest (per package.json, project-installed) |
| Config file | vitest.config.* (existing); `vitest.setup.ts` provides `FakeAudioContext` polyfill |
| Quick run command (per task commit) | `npm run test -- src/audio/audioEngine.test.ts` (or the touched file) |
| Full suite command (per wave merge) | `npm run test` |
| Phase gate | Full suite green before `/gsd-verify-work`; `tsc --noEmit` exit 0; `npm run lint` exit 0; `npm run build` exit 0 |

### Phase Requirements → Test Map

| Req ID | Behavior | Test Type | Assertion Target File | Contract Locked | Test-Style Precedent |
|--------|----------|-----------|------------------------|------------------|----------------------|
| AUDIO-01 | stop() during in-flight reconstruct closes the orphaned new engine and does not assign to engineRef | unit | `src/hooks/useAudioCues.test.tsx` (new case in existing `'audioStatus state machine + reconstruction'` describe block) | After parking `createAudioEngine` mid-await, calling `stop()`, and then settling the await: `tracker.constructed()` rose by exactly 1, `engineRef` stayed null, `reanchorSpy` was NOT called, and the new AC's `close()` WAS called. | SpyableAC + `dispatchStateChange` + `_simulateResumeReject` precedent at `useAudioCues.test.tsx:558-579` (D-41 (c)). The "park resume() on a controllable promise" extension uses the `SlowCloseAC` pattern at `useAudioCues.test.tsx:248-289`. |
| AUDIO-01 (counter mechanics) | `reconstructGenerationRef` is bumped by `stop()` and unmount cleanup | unit | `src/hooks/useAudioCues.test.tsx` | Indirect: a second `reconstructEngine` call (no intervening stop) constructs a second AC and the earlier in-flight one bails out without assignment. | Same precedent as above. |
| AUDIO-02 (engine-side) | `scheduleNextCue` clamps `audioTime < engine.now() + SAFE_LEAD_SEC` to `engine.now() + SAFE_LEAD_SEC` | unit | `src/audio/audioEngine.test.ts` (new cases adjacent to existing `scheduleNextCue` cases at line 110-152) | Spy on `scheduleInCue` / `scheduleOutCue`; ProbeAC with controllable `currentTime`; pass `audioTime = currentTime - 0.5`; assert spy was called with `currentTime + SAFE_LEAD_SEC`. Also assert spy was called with `audioTime` (no clamp) when `audioTime > currentTime + SAFE_LEAD_SEC`. | `engine.now() returns audioCtx.currentTime` precedent at `audioEngine.test.ts:255-279`. |
| AUDIO-02 (caller-side) | App.tsx boundary effect clamps `audioTime` to `audio.audioNow() + SAFE_LEAD_SEC` BEFORE calling `audioNotifyPhaseBoundary` | integration | `src/app/App.audio.test.tsx` (new case in `'App — audio cues (Phase 3)'` describe block) | Mock the AC such that `currentTime` is large; drive the session past one boundary; assert the value passed to `notifyPhaseBoundary` (read via spy on `cueSynth.scheduleInCue/OutCue` per existing precedent at `useAudioCues.test.tsx:154-178`) is `>= currentTime + SAFE_LEAD_SEC`. | Existing boundary-cue precedent — TBD whether the existing `App.audio.test.tsx` cases already exercise the boundary effect; planner should grep for `scheduleOutCue` spy calls inside `App.audio.test.tsx`. |
| AUDIO-02 (constant single-source) | `SAFE_LEAD_SEC` is exported from `audioEngine.ts` and equals `0.005` | unit | `src/audio/audioEngine.test.ts` | Direct import; assert `SAFE_LEAD_SEC === 0.005`. | LEAD_IN_* exports precedent at `audioEngine.ts:77-80`. |
| AUDIO-03 | `scheduleLeadIn` returns `null` when engine is closed; `start` propagates `null` up | unit | `src/audio/audioEngine.test.ts` (new case adjacent to `scheduleLeadIn returns the audioTime of the first In cue` at line 103-108) + `src/hooks/useAudioCues.test.tsx` (new case in existing describe block) | (a) Engine: construct, close, call `scheduleLeadIn` — returns null. (b) Hook: stub `createAudioEngine` to return an engine whose `scheduleLeadIn` returns null; assert `result.current.start(plan)` resolves to null and `status === 'failed'`. | Existing `after close(), scheduleNextCue is a no-op` precedent at `audioEngine.test.ts:246-253`. |
| AUDIO-04 | `cueSynth.scheduleBowlCue` attaches `onended` listeners with `{ once: true }`; each calls `disconnect()` on its osc + partialGain; the last osc additionally disconnects filter + envelope | unit | `src/audio/cueSynth.test.ts` (new cases adjacent to existing `scheduleInCue creates 3 oscillator partials` at line 18) | Spy on `osc.disconnect`, `partialGain.disconnect`, `filter.disconnect`, `envelope.disconnect`. Schedule the cue. Trigger `osc.dispatchEvent(new Event('ended'))` on each oscillator. Assert each `disconnect()` was called exactly once; the listener should not fire twice (gated by `{ once: true }`). | Existing oscillator-tracking precedent at `cueSynth.test.ts:26-42` (`scheduleInCue uses fundamental 440 Hz and partial ratios`). |
| AUDIO-05 | `handleStateChange` is null-safe — synthetic `statechange` AFTER `stop()` nulled engineRef does NOT throw and does NOT call `setAudioStatus` | unit | `src/hooks/useAudioCues.test.tsx` (new case adjacent to D-41 (d) at line 581) | After `start()`, call `stop()` (synchronously nulls engineRef), then manually dispatch a synthetic 'closed' statechange on the formerly-live AC. Assert `audioStatus === 'ok'` (set by stop, NOT flipped to 'unavailable' by the post-stop event). Assert no exception thrown. | D-41 (d) discriminating-assertion pattern at `useAudioCues.test.tsx:581-625`. |
| AUDIO-06 (union) | `AudioStatus` is `'idle' \| 'lead-in' \| 'failed'` — no `'starting'` | compile-time + unit | `src/hooks/useAudioCues.test.tsx` (new exhaustive-switch / `satisfies` assertion) | See Recommended Code Shapes §F. Future reintroduction of `'starting'` fails to compile or fails the test. | New pattern; closest precedent is the type-level discrimination in storage tests (Phase 8). |
| AUDIO-06 (no transient render) | `start()` flow does NOT setStatus('starting') | unit | `src/hooks/useAudioCues.test.tsx` (extend existing `start(plan) on success transitions to lead-in` case OR add a render-observation case) | Use a render counter / observed value: `status` transitions `'idle' → 'lead-in'` directly. Assert that at no intermediate render does `status === 'starting'`. Easiest assertion: spy on `setStatus` (or observe via `result.current.status` across acts). | Existing case at `useAudioCues.test.tsx:35-54`. |
| WAKELOCK-01 (concurrent request) | Second `request()` arriving during a pending first `request()` is a no-op (only ONE `navigator.wakeLock.request('screen')` call) | unit | `src/hooks/useWakeLock.test.tsx` (new case alongside existing request cases) | Stub `navigator.wakeLock.request` to return a controllable pending promise; fire `request()` twice without awaiting; assert spy called exactly once. Resolve the promise; assert sentinelRef was set. | Existing `request() silently absorbs NotAllowedError rejection` precedent at `useWakeLock.test.tsx:49-67`. |
| WAKELOCK-01 (release during await) | `release()` arriving during a pending `request()`'s await: post-await, the freshly-acquired sentinel's `release()` is called and `sentinelRef` is null | unit | `src/hooks/useWakeLock.test.tsx` | Stub `navigator.wakeLock.request` to return a pending promise; call `request()` (no await); call `release()`; resolve the request promise with a spy-able sentinel; assert `sentinel.release()` was called and `sentinelRef.current === null`. | New shape; closest precedent is the in-flight teardown pattern from `Unmount with sentinel held releases the sentinel (Pitfall 6 leak guard)` at `useWakeLock.test.tsx:202-225`. |
| WAKELOCK-01 (unmount during await) | Unmount cleanup arriving during a pending `request()`'s await: post-await sentinel is released, not stored | unit | `src/hooks/useWakeLock.test.tsx` | Same shape as the `release()` test but use `unmount()` instead. | Pitfall 6 precedent. |

### Sampling Rate

- **Per task commit:** `npm run test -- <touched-file>` (under 30 seconds; one or two files at most)
- **Per wave merge:** `npm run test` (full suite, 366 + new cases)
- **Phase gate:** Full suite green; `tsc --noEmit` exit 0; `npm run lint` exit 0; `npm run build` exit 0 before `/gsd-verify-work`

### Wave 0 Gaps

**None** — existing test infrastructure covers all phase requirements:
- Vitest already installed.
- `vitest.setup.ts` `FakeAudioContext` polyfill already supports all needed timing primitives.
- `SpyableAC` test scaffolding in `useAudioCues.test.tsx` is reusable for AUDIO-01 (Open Question 4 resolved).
- `installTrackedAC` in `App.audio.test.tsx` already supports the AUDIO-02 caller-side test.
- `useWakeLock.test.tsx` infrastructure (vi.spyOn(navigator.wakeLock, 'request')) supports both concurrency tests.

No new test files; all assertions co-locate per D-14 (5 existing files: `audioEngine.test.ts`, `cueSynth.test.ts`, `useAudioCues.test.tsx`, `useWakeLock.test.tsx`, `App.audio.test.tsx`).

---

## Assumptions Log

| # | Claim | Section | Risk if Wrong |
|---|-------|---------|---------------|
| A1 | The existing 363/363 → 366/366 Vitest baseline at Phase 9 start is correct (REQUIREMENTS.md says 363, CONTEXT.md says 366; STATE.md hints Phase 8 was completed adding 3 cases). | Pre-Plan Research Summary, Validation Architecture | Off-by-3 in the baseline assertion. Planner should verify by running `npm run test` at Phase 9 start. The 363 number is stale; 366 (from CONTEXT.md `<scope_lock>`) is likely current. [ASSUMED] |
| A2 | Phase 12 HYGIENE-01 will remove `audio.audioNow` from the hook surface. If Plan 02 consumes `audio.audioNow()` in App.tsx:504 (per Recommended Code Shape §B), Phase 12 must either delete that consumer too OR re-keep `audioNow`. | Pitfall 5 | Phase 12 silently breaks Plan 02's caller-side clamp. Mitigation: Plan 02's commit message MUST cross-reference HYGIENE-01 / IN-02. [VERIFIED: REQUIREMENTS.md HYGIENE-01 mapping to Phase 12] |
| A3 | All three partials in `scheduleBowlCue` share the SAME `stopAt` (so any single `'ended'` event is fine for the shared-chain disconnect). | Recommended Code Shapes §D | If a future change makes partials stop at different times, the shared chain might disconnect mid-decay. Mitigation: comment the invariant near the listener attach site. [VERIFIED: re-read of cueSynth.ts:102-115 — `stopAt` is computed once before the partials loop and reused for every `osc.stop(stopAt)`.] |
| A4 | `noUncheckedIndexedAccess` from Phase 7 does NOT require new `// Reason:` annotations on the recommended code shapes that use bracket-indexing. | Recommended Code Shapes §D (alternate) | Some shapes might fail Phase 7 lint. Mitigation: Plan 01 should run `npm run lint` after each commit per Phase 7 D-09. [ASSUMED] |
| A5 | The W3C Screen Wake Lock spec's idempotency guarantee for `release()` is browser-implemented correctly. | Open Question 3 | A buggy browser could throw on a second `release()` call. Mitigation: the recommended shape already wraps `sentinel.release()` in `try { await sentinel.release() } catch { /* D-09 */ }` for the synchronous-call path, AND `void sentinel.release().catch(() => undefined)` for the fire-and-forget post-await discard path — both swallow any rejection. [VERIFIED: W3C spec via WebFetch, but defensive catch covers any implementation drift.] |

---

## Open Questions

All four open questions from CONTEXT.md `<open_questions>` are resolved above. No further open questions for the planner.

The only outstanding planner judgment call is which of the two AUDIO-04 shapes to pick (§D Recommended Code Shapes — granular per-osc disconnects vs. single shared listener on the last osc). Both satisfy the REQ-ID contract; both are testable via the proposed `cueSynth.test.ts` case.

---

## Environment Availability

This phase modifies code only (no new external tools, runtimes, services, or CLIs). Phase 7 strict TS toolchain and existing Vitest stack are sufficient. **Section SKIPPED — no external dependencies identified.**

---

## Security Domain

This phase is a defensive lifecycle hardening patch on existing client-side imperative resources. No new authentication, session, access-control, cryptography, or input-validation surface introduced.

### Applicable ASVS Categories

| ASVS Category | Applies | Standard Control |
|---------------|---------|-----------------|
| V2 Authentication | no | n/a (no auth in app) |
| V3 Session Management | no | n/a (no server sessions) |
| V4 Access Control | no | n/a (single-user local app) |
| V5 Input Validation | no | The clamp at AUDIO-02 is a numeric range guard, not security-motivated input validation. Plan 06 silent-fallback posture applies. |
| V6 Cryptography | no | n/a (no crypto operations) |

### Known Threat Patterns for client-side React + Web Audio

| Pattern | STRIDE | Standard Mitigation |
|---------|--------|---------------------|
| Resource leak via missing disconnect/release | Denial of service (self) | AUDIO-04 (osc disconnect), WAKELOCK-01 (sentinel release), AUDIO-01 (engine close) all address this. |

No CR-/WR-/IN-graded security findings in REVIEW.md map to Phase 9. Security domain is informational only for this phase.

---

## Sources

### Primary (HIGH confidence)
- `.planning/phases/09-audio-wake-lock-lifecycle-hardening/09-CONTEXT.md` — locked decisions D-01..D-14 + open questions verbatim.
- `.planning/REQUIREMENTS.md` §"Audio" + §"Wake Lock" — REQ-IDs AUDIO-01..06, WAKELOCK-01 with traceability to REVIEW.md CR-/WR-/IN- findings.
- `REVIEW.md` §CR-03, CR-04, WR-02, WR-10, WR-11, WR-12, IN-03 — fix sketches and root-cause descriptions for every REQ in this phase.
- `src/audio/audioEngine.ts`, `src/audio/cueSynth.ts`, `src/hooks/useAudioCues.ts`, `src/hooks/useWakeLock.ts`, `src/app/App.tsx` — read directly; all line numbers and patterns cited above verified against current source.
- `src/audio/audioEngine.test.ts`, `src/audio/cueSynth.test.ts`, `src/hooks/useAudioCues.test.tsx`, `src/hooks/useWakeLock.test.tsx`, `src/app/App.audio.test.tsx` — test geography precedents cited above.
- `.planning/phases/07-strict-type-lint-baseline/07-CONTEXT.md` + `08-storage-forward-compat-cross-tab-ui-sync/08-CONTEXT.md` — strict baseline + silent-fallback / test-geography precedent.
- [W3C Screen Wake Lock spec](https://w3c.github.io/screen-wake-lock/) — verified `release()` idempotency via WebFetch.

### Secondary (MEDIUM confidence)
- [WebAudio/web-audio-api#904 — AudioNode stop/disconnect doesn't free memory](https://github.com/WebAudio/web-audio-api/issues/904) — confirms manual disconnect is needed; supports AUDIO-04 motivation.
- [WebAudio/web-audio-api#1471 — AudioNode Lifetime](https://github.com/WebAudio/web-audio-api/issues/1471) — discusses GC observability constraints; supports the disconnect-on-onended fix as the correct primitive.
- [WebAudio/web-audio-api#277 — onended of OscillatorNode description is confusable](https://github.com/WebAudio/web-audio-api/issues/277) — confirms the `ended` event is the right cleanup hook for an oscillator.
- [MDN EventTarget.addEventListener (once option)](https://developer.mozilla.org/en-US/docs/Web/API/EventTarget/addEventListener) — `{ once: true }` self-removing listener.
- [MDN WakeLockSentinel](https://developer.mozilla.org/en-US/docs/Web/API/WakeLockSentinel) — confirms idempotency wording.
- [React docs — Synchronizing with Effects](https://react.dev/learn/synchronizing-with-effects) — generation-counter pattern (cancellation tokens / ignore flags) is the standard React idiom for non-AbortController async cancellation.

### Tertiary (LOW confidence)
- [web.dev — A tale of two clocks](https://web.dev/articles/audio-scheduling) — supports the past-time scheduling intuition but does not give a normative behavior; cross-browser behavior is implementation-dependent (Firefox drop / Chrome immediate). Treated as motivational, not normative.

---

## Metadata

**Confidence breakdown:**
- Standard stack: HIGH — no new libraries; existing toolchain verified.
- Architecture patterns: HIGH — direct codebase precedents for every pattern (Reference A–F all cite existing line numbers).
- Pitfalls: HIGH — six pitfalls each derived from a verified codebase or spec source.
- Open questions: HIGH — Open Q1 (generation counter shape) verified vs. codebase + REVIEW.md; Q2 (`{ once: true }`) verified vs. WebAudio WG issues + MDN; Q3 (release idempotency) verified vs. W3C spec; Q4 (test scaffolding) verified vs. existing test files.
- Code shapes: HIGH — each shape compiles in principle under Phase 7 strict TS; planner verifies under `tsc --noEmit` per Phase 7 D-09 at each commit.

**Research date:** 2026-05-11
**Valid until:** 2026-06-10 (30-day window for stable spec + stable codebase; Phase 9 should complete well inside this).
