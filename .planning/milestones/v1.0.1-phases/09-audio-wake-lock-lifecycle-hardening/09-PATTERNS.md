# Phase 09: Audio + Wake Lock Lifecycle Hardening — Pattern Map

**Mapped:** 2026-05-11
**Files analyzed:** 10 (5 source + 5 test)
**Analogs found:** 10 / 10 (all intra-codebase; defensive-fix patch with strong existing precedents)

---

## Scope (from CONTEXT.md `<scope_lock>` + D-12, D-13)

| File | Wave | REQ-IDs touched | Modified vs new |
|------|------|------------------|------------------|
| `src/audio/audioEngine.ts` | 1 | AUDIO-02 engine clamp + `SAFE_LEAD_SEC` export, AUDIO-03 `scheduleLeadIn` null, AUDIO-06 union | modified |
| `src/audio/audioEngine.test.ts` | 1 | AUDIO-02/03 lock | modified (co-located cases) |
| `src/audio/cueSynth.ts` | 1 | AUDIO-04 oscillator disconnect | modified |
| `src/audio/cueSynth.test.ts` | 1 | AUDIO-04 lock | modified (co-located cases) |
| `src/hooks/useWakeLock.ts` | 1 | WAKELOCK-01 in-flight ref + release-during-await | modified |
| `src/hooks/useWakeLock.test.tsx` | 1 | WAKELOCK-01 lock | modified (co-located cases) |
| `src/hooks/useAudioCues.ts` | 2 | AUDIO-01 generation counter, AUDIO-05 null gate, AUDIO-03 hook-side, AUDIO-06 cleanup | modified |
| `src/hooks/useAudioCues.test.tsx` | 2 | AUDIO-01/03/05/06 lock | modified (co-located cases) |
| `src/app/App.tsx` | 2 | AUDIO-02 caller-side clamp | modified |
| `src/app/App.audio.test.tsx` | 2 | AUDIO-02 caller-side lock | modified (co-located cases) |

---

## File Classification

| File | Role | Data Flow | Closest Analog | Match Quality |
|------|------|-----------|----------------|---------------|
| `src/audio/audioEngine.ts` | service (audio engine factory) | event-driven / scheduled-callback (Web Audio scheduler) | `src/audio/audioEngine.ts` (itself — multiple intra-file precedents) | exact (self-analog) |
| `src/audio/audioEngine.test.ts` | unit test (engine) | request-response (sync API assertions + close idempotency) | `src/audio/audioEngine.test.ts:246-253` (`after close(), scheduleNextCue is a no-op`) | exact (self-analog) |
| `src/audio/cueSynth.ts` | pure synth module (Web Audio node graph builder) | transform (audio params → node graph; one-shot listeners) | `src/hooks/useWakeLock.ts:49-54` (match-pair listener disconnect pattern); intra-file for graph construction | role + flow match |
| `src/audio/cueSynth.test.ts` | unit test (synth builders) | request-response (assert on graph + ParamSpy) | `src/audio/cueSynth.test.ts:58-80` (`scheduleInCue starts and stops each oscillator`) | exact (self-analog) |
| `src/hooks/useWakeLock.ts` | React hook (imperative resource API) | event-driven (visibilitychange + sentinel.release) | `src/hooks/useAudioCues.ts:221-238` (`stop()` sync-null pattern) + intra-file `useWakeLock.ts:62-75` | exact (sister hook) |
| `src/hooks/useWakeLock.test.tsx` | unit test (hook) | request-response + async-promise control | `src/hooks/useWakeLock.test.tsx:202-225` (Pitfall 6 leak guard); `useAudioCues.test.tsx:248-289` (`SlowCloseAC` pending-promise control) | exact (self + sister) |
| `src/hooks/useAudioCues.ts` | React hook (imperative engine wrapper) | event-driven (visibilitychange + statechange) + request-response | `src/app/App.tsx:158, 285, 306` (`startGenerationRef` canonical pattern); `src/hooks/useAudioCues.ts:254-299` (existing `reconstructEngine` body); `:156-158` (single-gate precedent) | exact (self + sister) |
| `src/hooks/useAudioCues.test.tsx` | unit test (hook) | event-driven (synthetic statechange dispatch) | `src/hooks/useAudioCues.test.tsx:581-625` (D-41 (d) discriminating-assertion); `:248-289` (SlowCloseAC pending-promise) | exact (self-analog) |
| `src/app/App.tsx` | App composition + boundary scheduling effect | event-driven (effect on `session.currentFrame` change) | `src/app/App.tsx:480-515` (the very effect being modified; pre-existing AC-unavailable short-circuit at L493 is the analog for the new null-check pattern); `:17-20` (LEAD_IN_* import block) | exact (self-analog) |
| `src/app/App.audio.test.tsx` | integration test (App) | request-response over rendered DOM + fake timers + `installTrackedAC` | `src/app/App.audio.test.tsx:128-154` (`schedules an Out cue at the correct audio-clock time`); `:358-379` (`installTrackedAC` scaffolding) | exact (self-analog) |

All analogs exist inside the codebase at strong-match quality. No "no analog found" rows.

---

## Pattern Assignments

### `src/audio/audioEngine.ts` (service / scheduled callback) — Wave 1

**Analog (intra-file):** `src/audio/audioEngine.ts` exported-constants pattern + scheduleLeadIn/scheduleNextCue/close branches.

#### Pattern E1 — Named-constant export, single source of truth (AUDIO-02 D-03)

Source: `src/audio/audioEngine.ts:74-80`

```typescript
// Lead-in: 3 ticks one second apart, then the first In cue at the start of the breath cycle.
// WR-04: exported as the single source of truth — App.tsx and useAudioCues.ts import these
// instead of redefining the same numbers locally (which silently drifted before).
export const LEAD_IN_TICK_INTERVAL_SEC = 1.0
export const LEAD_IN_DURATION_SEC = 3.0
export const LEAD_IN_TICK_INTERVAL_MS = LEAD_IN_TICK_INTERVAL_SEC * 1000
export const LEAD_IN_DURATION_MS = LEAD_IN_DURATION_SEC * 1000
```

**Copy to:** New `export const SAFE_LEAD_SEC = 0.005` placed right after the `LEAD_IN_*` block (lines 80–81 region), with WR-04-style JSDoc explaining single-source-of-truth + cross-importer (App.tsx caller-side clamp consumes it).

#### Pattern E2 — `AudioStatus` union literal (AUDIO-06 D-07)

Source: `src/audio/audioEngine.ts:25`

```typescript
export type AudioStatus = 'idle' | 'starting' | 'lead-in' | 'failed'
```

**Modify to:** `export type AudioStatus = 'idle' | 'lead-in' | 'failed'` (delete the `'starting'` literal in the union; Phase 7 `strictTypeChecked` lint will surface any orphan reference).

#### Pattern E3 — Engine-internal `closed` short-circuit (AUDIO-02 callee + AUDIO-03)

Source: `src/audio/audioEngine.ts:169-180` (`scheduleNextCue` body):

```typescript
scheduleNextCue({ newPhase, audioTime, phaseDurationSec }: { newPhase: 'in' | 'out'; audioTime: number; phaseDurationSec: number }): void {
  if (closed) return
  if (muted) return // D-08 unmute-waits-for-boundary; if currently muted, skip this cue.
  pruneExpiredCues()
  // 260510-tc9 Bug 2: forward phaseDurationSec as the 4th arg so cueSynth
  // can stretch the decay envelope to the phase length.
  const cue =
    newPhase === 'in'
      ? scheduleInCue(audioCtx, audioTime, audioCtx.destination, phaseDurationSec)
      : scheduleOutCue(audioCtx, audioTime, audioCtx.destination, phaseDurationSec)
  activeCues.add(cue)
},
```

**Modify to (AUDIO-02 D-01/D-02 callee-side clamp):** insert `const clampedAudioTime = Math.max(audioTime, audioCtx.currentTime + SAFE_LEAD_SEC)` AFTER `pruneExpiredCues()` and BEFORE the `newPhase === 'in' ? ...` branch, then pass `clampedAudioTime` into both `scheduleInCue` / `scheduleOutCue`. Do NOT subtract or transform after the clamp (D-02).

Also source: `src/audio/audioEngine.ts:148-167` (`scheduleLeadIn` body):

```typescript
scheduleLeadIn(startAudioTime: number, plan: BreathingPlan): number {
  const firstInCueTime = startAudioTime + LEAD_IN_DURATION_SEC
  if (closed) return firstInCueTime
  if (muted) return firstInCueTime
  // ... ticks + first In cue ...
  return firstInCueTime
},
```

**Modify to (AUDIO-03):**
- Widen interface return type at `audioEngine.ts:30` from `number` to `number | null` with JSDoc explaining the null branch.
- Change `if (closed) return firstInCueTime` to `if (closed) return null`.
- Keep `if (muted) return firstInCueTime` unchanged (muted engine still has a meaningful first In time projection).

#### Pattern E4 — `scheduleNextCue closed` no-op test (AUDIO-02/03 test precedent)

Source: `src/audio/audioEngine.test.ts:246-253`

```typescript
it('after close(), scheduleNextCue is a no-op (does not throw, does not call cueSynth)', async () => {
  const inSpy = vi.spyOn(cueSynth, 'scheduleInCue')
  const engine = await createAudioEngine()
  await engine.close()
  inSpy.mockClear()
  expect(() => { engine.scheduleNextCue({ newPhase: 'in', audioTime: 5, phaseDurationSec: 4.36 }) }).not.toThrow()
  expect(inSpy).not.toHaveBeenCalled()
})
```

**Copy structure to:** new AUDIO-03 case `'scheduleLeadIn returns null when engine is closed'` — construct, close, call `scheduleLeadIn(0, samplePlan)`, assert return value is `null` (instead of `not.toThrow`).

#### Pattern E5 — Controllable `currentTime` ProbeAC (AUDIO-02 engine-side test)

Source: `src/audio/audioEngine.test.ts:255-279`

```typescript
it('engine.now() returns audioCtx.currentTime', async () => {
  let probeTime = 0
  class ProbeAC {
    state: AudioContextState = 'running'
    sampleRate = 44100
    destination = {}
    get currentTime() {
      return probeTime
    }
    resume = vi.fn(async () => {})
    close = vi.fn(async () => {})
    createOscillator = vi.fn()
    createGain = vi.fn()
    createBiquadFilter = vi.fn()
    addEventListener = vi.fn()
    removeEventListener = vi.fn()
  }
  vi.stubGlobal('AudioContext', ProbeAC)

  const engine = await createAudioEngine()
  probeTime = 42.5
  expect(engine.now()).toBe(42.5)
  await engine.close()
})
```

**Copy structure to:** new AUDIO-02 engine-side clamp case — instantiate ProbeAC with `probeTime = 10`, spy on `cueSynth.scheduleInCue`, call `engine.scheduleNextCue({ newPhase: 'in', audioTime: 9.5, phaseDurationSec: 4 })`, assert spy received `10 + SAFE_LEAD_SEC` (clamped) as 2nd arg. Add a paired case for `audioTime = 12` (no clamp; spy receives `12` verbatim).

#### Pattern E6 — `SAFE_LEAD_SEC` constant assertion (AUDIO-02 D-10 type-lock)

No exact analog; the simplest shape is a direct import + numeric equality:

```typescript
import { SAFE_LEAD_SEC } from './audioEngine'
it('SAFE_LEAD_SEC export equals 0.005 (D-03 single-source-of-truth)', () => {
  expect(SAFE_LEAD_SEC).toBe(0.005)
})
```

Maps to the LEAD_IN_DURATION_SEC asymptotic pattern (constants are asserted only indirectly today, via `scheduleLeadIn returns the audioTime of the first In cue (= startAudioTime + 3)` at `audioEngine.test.ts:103-108` — same idiom).

---

### `src/audio/cueSynth.ts` (pure synth / Web Audio graph builder) — Wave 1

**Analog (cross-file for listener idiom; intra-file for graph shape):**

#### Pattern S1 — Match-pair `addEventListener` for one-shot resource lifecycle (AUDIO-04)

Source: `src/hooks/useWakeLock.ts:49-54`

```typescript
sentinel.addEventListener('release', () => {
  if (sentinelRef.current === sentinel) {
    sentinelRef.current = null
    // Do NOT clear wasAcquiredRef — D-04 keeps it true for visibilitychange re-acquire.
  }
})
```

This is the codebase's "react to a one-shot event from an imperative resource" idiom. AUDIO-04's oscillator-ended listener uses the same shape, with two refinements:
- Use `{ once: true }` as the 3rd `addEventListener` arg (RESEARCH §3 — self-removing).
- No identity check needed (closure capture binds each listener to a specific osc).

#### Pattern S2 — Partial-oscillator graph construction loop (AUDIO-04 site)

Source: `src/audio/cueSynth.ts:117-134`

```typescript
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
}

filter.connect(envelope)
envelope.connect(destination)
```

**Modify to (AUDIO-04):** Collect each `osc` + `partialGain` into local arrays inside the loop, then attach per-osc `{ once: true }` `'ended'` listeners that `try/catch` `osc.disconnect()` + `partialGain.disconnect()`. On the LAST oscillator (`oscillators[oscillators.length - 1]`), additionally disconnect the shared `filter` + `envelope` nodes. All three partials share the same `stopAt` (verified RESEARCH A3), so any single `'ended'` event is safe for the shared-chain disconnect.

Annotate the listener attachment site with the invariant from RESEARCH Pitfall 3:
```typescript
// Pre-condition: osc.stop(stopAt) with stopAt > when — ensures 'ended' fires.
// If a future change makes stopAt < when, ended may not fire and the chain leaks.
```

#### Pattern S3 — Defensive `try { node.disconnect() } catch {}` (AUDIO-04 inner cleanup)

No exact intra-codebase analog for `disconnect()` specifically; closest precedent for the `try { ... } catch { /* silent */ }` posture is `useWakeLock.ts:69-73`:

```typescript
if (sentinel !== null) {
  try {
    await sentinel.release()
  } catch {
    // D-09
  }
}
```

**Copy posture to:** each `osc.disconnect()` / `partialGain.disconnect()` / `filter.disconnect()` / `envelope.disconnect()` call is wrapped in `try { ... } catch { /* silent */ }` (some browsers throw `InvalidAccessError` on already-disconnected nodes — RESEARCH §D).

#### Pattern S4 — Spy on `createOscillator` to track instances (AUDIO-04 test scaffolding)

Source: `src/audio/cueSynth.test.ts:58-80` (`scheduleInCue starts and stops each oscillator`):

```typescript
it('scheduleInCue starts and stops each oscillator', () => {
  const ac = createAc()
  const oscillators: OscillatorNode[] = []
  const realCreate = ac.createOscillator.bind(ac)
  vi.spyOn(ac, 'createOscillator').mockImplementation(() => {
    const osc = realCreate()
    oscillators.push(osc)
    return osc
  })

  scheduleInCue(ac, 1.0, ac.destination)

  for (const osc of oscillators) {
    // Reason: vi.fn mock accessed for test assertion; unbound-method suppressed because mock does not use 'this'.
    // eslint-disable-next-line @typescript-eslint/unbound-method
    const startMock = osc.start as unknown as ReturnType<typeof vi.fn>
    // eslint-disable-next-line @typescript-eslint/unbound-method
    const stopMock = osc.stop as unknown as ReturnType<typeof vi.fn>
    expect(startMock).toHaveBeenCalledWith(1.0)
    const stopArg = stopMock.mock.calls[0]?.[0] as number
    expect(stopArg).toBeGreaterThanOrEqual(1.0 + 1.4 * 5)
  }
})
```

**Copy structure to:** new AUDIO-04 test. Same `createOscillator` spy idiom; additionally spy `createBiquadFilter` + `createGain` to get the `filter` + `envelope` + per-osc `partialGain` references. Schedule the cue, then for each oscillator dispatch `osc.dispatchEvent(new Event('ended'))` (or invoke the captured listener directly — FakeAudioContext oscillators expose `disconnect: vi.fn()` per `useAudioCues.test.tsx:464`). Assert each `disconnect` was called exactly once, AND that dispatching `'ended'` twice still only calls `disconnect` once (gated by `{ once: true }`).

---

### `src/hooks/useWakeLock.ts` (React hook / imperative wake-lock API) — Wave 1

**Analog (sister hook):** `src/hooks/useAudioCues.ts` `stop()` + `reconstructEngine` synchronous-null pattern; intra-file existing structure.

#### Pattern W1 — Synchronous-null-then-async-close (WAKELOCK-01 baseline preserved)

Source: `src/hooks/useWakeLock.ts:62-75` (existing `release()` body):

```typescript
const release = useCallback(async (): Promise<void> => {
  // Synchronous-null-then-async-close mirrors useAudioCues.stop() (useAudioCues.ts:123-135).
  // wasAcquiredRef cleared synchronously to halt visibility re-acquires (D-04 inverse).
  wasAcquiredRef.current = false
  const sentinel = sentinelRef.current
  sentinelRef.current = null
  if (sentinel !== null) {
    try {
      await sentinel.release()
    } catch {
      // D-09
    }
  }
}, [])
```

**Modify to (WAKELOCK-01):** add `if (requestInFlightRef.current) releaseCalledDuringRequestRef.current = true` BEFORE the existing `wasAcquiredRef.current = false` line. Rest of body unchanged. The synchronous-null on `sentinelRef` is preserved verbatim (RESEARCH Pitfall 1 — DO NOT replace).

#### Pattern W2 — `request()` body with API-absent + idempotency gates (WAKELOCK-01)

Source: `src/hooks/useWakeLock.ts:34-60` (existing `request()` body):

```typescript
const request = useCallback(async (): Promise<void> => {
  // D-09: silent fallback when API absent (RESEARCH Pitfall 4 — non-optional in types
  // but actually undefined on iOS <16.4 / Firefox <126 / insecure contexts)
  if (!('wakeLock' in navigator)) return
  // D-08: idempotent — skip if already holding a fresh sentinel
  if (sentinelRef.current !== null) return
  try {
    const sentinel = await navigator.wakeLock.request('screen')
    sentinelRef.current = sentinel
    wasAcquiredRef.current = true
    // ... addEventListener('release', ..., (no { once: true } today)) ...
  } catch {
    // D-09: silently absorb NotAllowedError, SecurityError ...
  }
}, [])
```

**Modify to (WAKELOCK-01 per RESEARCH §G):**
1. Add a third guard line `if (requestInFlightRef.current) return` after the existing two gates.
2. Set `requestInFlightRef.current = true` inside the `try` block (BEFORE the `await`).
3. After the `await navigator.wakeLock.request('screen')` resolves, check `if (releaseCalledDuringRequestRef.current)` — if true, reset that flag, call `void sentinel.release().catch(() => undefined)`, and `return` (orphan path).
4. Otherwise the existing assignment branch runs unchanged, but add `{ once: true }` as 3rd arg to the existing `sentinel.addEventListener('release', ...)` at line 49 (RESEARCH §G + Reference D).
5. Wrap the whole `try` body in `finally { requestInFlightRef.current = false }` to ensure the in-flight flag is always cleared.

#### Pattern W3 — Two new refs alongside `sentinelRef` + `wasAcquiredRef` (WAKELOCK-01)

Source: `src/hooks/useWakeLock.ts:31-32` (existing refs):

```typescript
const sentinelRef = useRef<WakeLockSentinel | null>(null)
const wasAcquiredRef = useRef<boolean>(false)
```

**Modify to:** add two new refs after the existing pair (same style — boolean refs initialized at `false`):

```typescript
const requestInFlightRef = useRef<boolean>(false)               // WAKELOCK-01: concurrent-request gate
const releaseCalledDuringRequestRef = useRef<boolean>(false)    // WAKELOCK-01: release-during-await signal
```

#### Pattern W4 — Unmount cleanup also signals the new ref (WAKELOCK-01)

Source: `src/hooks/useWakeLock.ts:88-99`:

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

**Modify to (WAKELOCK-01):** add `if (requestInFlightRef.current) releaseCalledDuringRequestRef.current = true` BEFORE the existing `sentinelRef.current = null` line. Rest of cleanup unchanged.

#### Pattern W5 — Pending-promise control + spied sentinel (WAKELOCK-01 tests)

Source: `src/hooks/useWakeLock.test.tsx:81-96` (`release() calls sentinel.release() once when held`):

```typescript
it('release() calls sentinel.release() once when held', async () => {
  const requestSpy = vi.spyOn(navigator.wakeLock, 'request')
  const { result, unmount } = renderHook(() => useWakeLock())
  await act(async () => {
    await result.current.request()
  })
  // eslint-disable-next-line @typescript-eslint/no-non-null-assertion
  const sentinel = await requestSpy.mock.results[0]!.value as WakeLockSentinel
  const releaseSpy = vi.spyOn(sentinel, 'release')
  await act(async () => {
    await result.current.release()
  })
  expect(releaseSpy).toHaveBeenCalledTimes(1)
  unmount()
})
```

Also source: `src/hooks/useAudioCues.test.tsx:248-289` (`SlowCloseAC` pattern — returning a never-resolving promise from a stubbed method to park an async operation):

```typescript
const closeSpy = vi.fn(() => new Promise<void>(() => {}))
// ... class SlowCloseAC { close = closeSpy ... } ...
```

**Combine for new WAKELOCK-01 cases:**

1. **"Second concurrent `request()` no-ops"**:
   ```typescript
   // Park the first request promise. Mock navigator.wakeLock.request to return a
   // controllable promise (capture resolve in an outer variable).
   let resolveFn: (s: WakeLockSentinel) => void
   const pendingPromise = new Promise<WakeLockSentinel>(r => { resolveFn = r })
   const requestSpy = vi.spyOn(navigator.wakeLock, 'request').mockReturnValueOnce(pendingPromise)
   // Fire request() twice without awaiting — second is a no-op per WAKELOCK-01.
   // Assert requestSpy called exactly once. Then resolve and assert sentinelRef set.
   ```

2. **"`release()` during in-flight `request()` orphans the fresh sentinel"**:
   - Same parked-promise scaffolding.
   - Fire `request()` (no await).
   - Fire `release()` (sets `releaseCalledDuringRequestRef`).
   - Resolve the pending promise with a spy-able sentinel.
   - Assert `sentinel.release()` was called, `sentinelRef.current === null`, and the post-resolve assignment branch did NOT run.

3. **"Unmount during in-flight `request()` orphans the fresh sentinel"**: same shape, replacing `release()` with `unmount()`. Closest existing precedent: `useWakeLock.test.tsx:202-225` (`Unmount with sentinel held releases the sentinel`).

---

### `src/hooks/useAudioCues.ts` (React hook / engine wrapper) — Wave 2

**Analog:** Canonical generation-counter at `App.tsx:158, 285, 306`; existing `reconstructEngine` body at `useAudioCues.ts:254-299`; existing single-gate at `useAudioCues.ts:156-158`; existing visibility handler at `useAudioCues.ts:167-180`.

#### Pattern H1 — Integer generation counter (canonical, AUDIO-01)

Source: `src/app/App.tsx:152-158` (declaration + JSDoc):

```typescript
// CR-01: cancel-during-lead-in race guard. onStartClick is async (awaits AC creation).
// Between setAppPhase('lead-in') and the await resolving, the user can re-click — the
// cancel branch flips appPhase back to 'idle' and calls audioStop(). When the original
// chain resumes, it would otherwise schedule timeouts that flip appPhase back to
// 'running' on a session the user already cancelled. Bumping startGenerationRef in
// both branches and re-checking after the await lets the post-await continuation abort.
const startGenerationRef = useRef(0)
```

And source: `src/app/App.tsx:266-309` (bump-then-stamp-then-compare across the cancel + start paths):

```typescript
if (appPhase === 'lead-in') {
  // CR-01: invalidate any in-flight start whose await audioStart(plan) is still
  // pending. The post-await continuation re-checks startGenerationRef and aborts
  // when the token has been bumped.
  startGenerationRef.current += 1
  // ... cancel branch ...
  return
}
// ... start branch ...
// CR-01: stamp this start's generation token before any await — the cancel branch
// bumps the same ref, so the post-await continuation can detect "I was cancelled"
// by comparing local generation against the ref's current value.
const generation = ++startGenerationRef.current
// ... await audioStart(plan) ...
if (generation !== startGenerationRef.current) {
  void audioStop()
  return
}
```

**Copy verbatim to `useAudioCues.ts`** (per RESEARCH §A):
- Declare `const reconstructGenerationRef = useRef<number>(0)` near the other refs (line 83 region).
- In `reconstructEngine` (line 254 region), as the FIRST line of the function body: `const gen = ++reconstructGenerationRef.current`.
- In `stop()` (line 221) and the unmount cleanup (line 141): bump `++reconstructGenerationRef.current` as the FIRST sync mutation, BEFORE the existing synchronous-null step.
- After `await createAudioEngine(...)` settles (line 265), insert the post-await bail check:
  ```typescript
  if (gen !== reconstructGenerationRef.current) {
    void newEngine.close()
    if (oldEngine !== null) void oldEngine.close()
    return
  }
  ```
- DO NOT remove the existing synchronous-null at `useAudioCues.ts:260-261` (RESEARCH Pitfall 1).

#### Pattern H2 — Single-gate-on-engineRef at the top of a handler (AUDIO-05)

Source: `src/hooks/useAudioCues.ts:156-158, 167-180` (visibility-resume effect — D-03/D-04 documented pattern):

```typescript
// The single gate is engineRef.current !== null (D-03 / D-04). ...
useEffect(() => {
  const onVisibility = (): void => {
    if (document.visibilityState !== 'visible') return
    if (engineRef.current === null) return       // ← single gate
    visibilityResumeAttemptedRef.current = true
    void engineRef.current.resume()
  }
  // ...
}, [])
```

**Copy to `handleStateChange`** at lines 116-136. RESEARCH §E shape:

```typescript
const handleStateChange = useCallback(
  (state: AudioContextState | 'interrupted'): void => {
    // AUDIO-05 D-04 / D-06: defensive single gate at top — protects ANY future
    // branch that reads engineRef.current. Deferred reshape (D-05 → v1.x).
    const engine = engineRef.current
    if (engine === null) return
    // ... existing if/else if branches unchanged ...
  },
  [],
)
```

Note RESEARCH Pitfall 6: if `@typescript-eslint/no-unnecessary-condition` fires on the gate, annotate with `// Reason: ref read is not narrowable across statements; gate documents the invariant for branches that may be added in v1.x` per Phase 7 D-04.

#### Pattern H3 — `'starting'` deletion + docstring rewrite (AUDIO-06 D-08/D-09)

Source: `src/hooks/useAudioCues.ts:5-7` (existing docstring):

```typescript
// State machine: 'idle' → 'starting' → 'lead-in' (success) | 'failed' (D-10).
//   - 'idle' is the initial and post-stop() resting state.
//   - 'starting' is the transient between start() being called and the AC
//     promise resolving (visible to the UI as a brief "preparing" state).
//   - 'lead-in' is the post-success state (the lead-in cues are scheduled
//     and the first In bowl will strike at +3 s).
//   - 'failed' is the D-10 visuals-only fallback path; audioAvailable=false.
```

**Modify to (D-09):** single-line docstring: `// State machine: 'idle' → 'lead-in' (success) | 'failed' (D-10 Plan 06).` Drop the dead-state explanation entirely.

Source: `src/hooks/useAudioCues.ts:192` (the call site to delete):

```typescript
setStatus('starting')
try {
  const engine = await createAudioEngine({ onStateChange: handleStateChange })
  // ...
```

**Modify to (D-08):** delete the `setStatus('starting')` line entirely. The `try { const engine = await createAudioEngine(...) ... }` block stays. Transition is now `'idle' → 'lead-in'` (success) directly.

#### Pattern H4 — Hook-side null propagation from `scheduleLeadIn` (AUDIO-03)

Source: `src/hooks/useAudioCues.ts:200-208` (existing `start()` success branch):

```typescript
const startAudioTime = engine.now()
const firstInCueTime = engine.scheduleLeadIn(startAudioTime, plan)
firstInCueTimeRef.current = firstInCueTime // WR-05
setStatus('lead-in')
setAudioAvailable(true)
return firstInCueTime
```

**Modify to (AUDIO-03 + AUDIO-06 D-08 combined):** Since `engine.scheduleLeadIn` now returns `number | null` (per E3 above), insert a null branch BEFORE `firstInCueTimeRef.current = firstInCueTime` that falls through to the `'failed'` exit path (mirrors the existing `catch` branch at lines 209-216):

```typescript
const firstInCueTime = engine.scheduleLeadIn(startAudioTime, plan)
if (firstInCueTime === null) {
  // AUDIO-03: closed engine — defense-in-depth, fall through to failure.
  setAudioAvailable(false)
  setStatus('failed')
  return null
}
firstInCueTimeRef.current = firstInCueTime
setStatus('lead-in')
setAudioAvailable(true)
return firstInCueTime
```

#### Pattern H5 — `SlowCloseAC` pending-promise control (AUDIO-01 test)

Source: `src/hooks/useAudioCues.test.tsx:248-289` (`start() after stop() builds a fresh AudioContext`):

```typescript
const closeSpy = vi.fn(() => new Promise<void>(() => {}))
let constructCount = 0
class SlowCloseAC {
  state: AudioContextState = 'running'
  // ...
  constructor() {
    constructCount++
  }
  resume = vi.fn(async () => {})
  close = closeSpy
  // ...
}
vi.stubGlobal('AudioContext', SlowCloseAC)
// ... act { void result.current.stop() } -> close stays pending; start re-enters ...
```

**Combine with `SpyableAC` pattern** (`useAudioCues.test.tsx:447-503`) for AUDIO-01 stop-during-reconstruct test (RESEARCH Open Q4):

- Stub AC so `resume()` returns a controllable pending promise (the WR-06 path at `audioEngine.ts:113-118` parks `createAudioEngine` on this await).
- Render hook, call `start()`, drive to needs-resume via D-41 (c) prelude.
- Fire `result.current.resume()` without awaiting — enters `reconstructEngine` and parks on the resume await inside `createAudioEngine`.
- Synchronously call `result.current.stop()` (bumps generation counter, sync-nulls engineRef).
- Resolve the parked resume promise. `createAudioEngine` resolves with `newEngine`.
- Assert: `engineRef` still null (post-await branch bailed), `newEngine.close()` was called, `reanchorSpy` was NOT called.

#### Pattern H6 — D-41 (d) discriminating-assertion (AUDIO-05 test)

Source: `src/hooks/useAudioCues.test.tsx:581-625` (`D-41 (d): 'closed' state → audioStatus === 'unavailable' (discriminating)`):

```typescript
vi.spyOn(SpyableAC.prototype, 'dispatchStateChange').mockImplementationOnce(function (this: SpyableAC) {
  this.state = 'closed'
  // Reason: accessing private _listeners map through any cast to simulate state-change dispatch in closed spy.
  // eslint-disable-next-line @typescript-eslint/no-explicit-any, @typescript-eslint/no-unsafe-member-access, @typescript-eslint/no-unsafe-call
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

**Copy structure to AUDIO-05 test**, with two differences (per RESEARCH Reference F):
- Call `result.current.stop()` BEFORE the synthetic `dispatchStateChange` invocation (synchronously nulls `engineRef`).
- Assert "no throw" + `audioStatus` STAYS at the post-stop value (`'ok'`), rather than flipping to `'unavailable'` (because the null gate at the top of `handleStateChange` returned early).

#### Pattern H7 — `AudioStatus` exhaustive switch test (AUDIO-06 D-10)

No exact intra-codebase analog. RESEARCH §F shape:

```typescript
import type { AudioStatus } from '../audio/audioEngine'

it('AUDIO-06: AudioStatus union excludes "starting" (D-07)', () => {
  const exhaustive: AudioStatus = 'idle'
  switch (exhaustive) {
    case 'idle':
    case 'lead-in':
    case 'failed':
      expect(true).toBe(true)
      break
    // If 'starting' is reintroduced to the union, TS will error on missing case.
  }
})
```

Place this in `useAudioCues.test.tsx` near the existing `start(plan) on success transitions to lead-in` case at line 35.

---

### `src/app/App.tsx` (composition + boundary scheduling effect) — Wave 2

**Analog (intra-file):** The boundary effect itself at lines 480-515; the existing `LEAD_IN_*` import block at lines 17-20; the existing `audioAnchor === null || plan === null` short-circuit at line 493.

#### Pattern A1 — Import `SAFE_LEAD_SEC` alongside existing engine exports (AUDIO-02)

Source: `src/app/App.tsx:17-20`:

```typescript
import {
  LEAD_IN_DURATION_MS,
  LEAD_IN_TICK_INTERVAL_MS,
} from '../audio/audioEngine'
```

**Modify to:** add `SAFE_LEAD_SEC` to the import list (alphabetical or appended, follow existing style):

```typescript
import {
  LEAD_IN_DURATION_MS,
  LEAD_IN_TICK_INTERVAL_MS,
  SAFE_LEAD_SEC,
} from '../audio/audioEngine'
```

#### Pattern A2 — Boundary effect with caller-side clamp (AUDIO-02 caller-side)

Source: `src/app/App.tsx:480-515` (the very effect being modified):

```typescript
const frame = session.currentFrame
if (frame === null) return
const key = `${String(frame.cycleIndex)}:${frame.phase}`
if (lastBoundaryKeyRef.current === key) return
lastBoundaryKeyRef.current = key

// Skip the very first In phase: ... cycleIndex=0 + phase='in' is the t=0 moment we covered.
if (frame.cycleIndex === 0 && frame.phase === 'in') return

const audioAnchor = audioAnchorRef.current
const plan = planRef.current
// D-10 fallback: AC unavailable → no-op (visual session continues uninterrupted).
if (audioAnchor === null || plan === null) return

// ... boundaryStartMs math ...
const audioTime = audioAnchor + boundaryStartMs / 1000

// ... phaseDurationSec ...
audioNotifyPhaseBoundary({ newPhase: frame.phase, audioTime, phaseDurationSec })
```

**Modify to (RESEARCH §B + Pitfall 5):** insert the caller-side clamp between the existing `audioTime` computation at L504 and the `audioNotifyPhaseBoundary` call at L514:

```typescript
const audioTime = audioAnchor + boundaryStartMs / 1000

// AUDIO-02 D-01/D-02 caller-side clamp. Pitfall 5: audio.audioNow() returns
// number | null — null can occur in the window between engine close and
// audioAnchor clear. Skip the schedule entirely when null (engine-side clamp is
// the safety net at the callee; the next frame's effect will re-evaluate).
const liveAudioNow = audio.audioNow()
if (liveAudioNow === null) return
const clampedAudioTime = Math.max(audioTime, liveAudioNow + SAFE_LEAD_SEC)

const phaseDurationSec =
  (frame.phase === 'in' ? plan.inhaleMs : plan.exhaleMs) / 1000

audioNotifyPhaseBoundary({ newPhase: frame.phase, audioTime: clampedAudioTime, phaseDurationSec })
```

**Important — useEffect dep list:** the boundary effect at line 515 currently has `[appPhase, session.currentFrame, audioNotifyPhaseBoundary]`. Adding `audio.audioNow()` reads `audio` (mutable object literal from `useAudioCues`) — but `audio.audioNow` is `useCallback([])`-stable (per `useAudioCues.ts:333-335`). Hoist `audio.audioNow` into a stable reference at the top of `App` next to `audioNotifyPhaseBoundary` (matches the existing hoist pattern at `App.tsx:195-197`), then add THAT stable reference to the dep list. Do NOT add the raw `audio` object — would re-fire the effect every render. RESEARCH Pitfall 5 cross-phase note: document the Phase 12 HYGIENE-01 dependency in the commit message.

#### Pattern A3 — Existing test scaffolding: `installTrackedAC` (AUDIO-02 caller-side test)

Source: `src/app/App.audio.test.tsx:358-379`:

```typescript
function installTrackedAC(): { instances: AnyAC[]; constructed: () => number; restore: () => void } {
  const instances: AnyAC[] = []
  const OrigAC = window.AudioContext
  const TrackAC: any = function (this: AnyAC, opts: AudioContextOptions | undefined) {
    const inst = new (OrigAC as any)(opts)
    instances.push(inst)
    return inst
  }
  TrackAC.prototype = OrigAC.prototype
  vi.stubGlobal('AudioContext', TrackAC)
  return { instances, constructed: () => instances.length, restore: () => vi.unstubAllGlobals() }
}
```

And `src/app/App.audio.test.tsx:128-154` (the existing boundary-cue scheduling case):

```typescript
it('schedules an Out cue at the correct audio-clock time on the first Out boundary (after full lead-in completion)', async () => {
  const scheduleOutSpy = vi.spyOn(cueSynth, 'scheduleOutCue')
  render(<App />)
  await startAndAdvancePastLeadIn()
  // ... advance timers past first Out boundary ...
  expect(scheduleOutSpy).toHaveBeenCalled()
  const [firstCallArgs] = scheduleOutSpy.mock.calls
  expect(typeof firstCallArgs![1]).toBe('number')
  expect(firstCallArgs![1]).toBeGreaterThan(0)
})
```

**Compose into new AUDIO-02 caller-side test:** wrap with `installTrackedAC`, advance fake timers past lead-in, then DURING a phase advance manipulate the tracked instance's `currentTime` so the computed `audioTime` would be a past value (or use a `Object.defineProperty(instance, 'currentTime', { get: () => largeNumber })` override). Spy on `cueSynth.scheduleOutCue` (matches existing line 129), advance timers to first Out boundary, assert the value passed to `scheduleOutCue` is `>= currentTime + SAFE_LEAD_SEC` (i.e., the clamp fired). Co-locate in the existing `describe('App — audio cues (Phase 3)', ...)` block.

---

## Shared Patterns (cross-cutting; applied to multiple files)

### Shared Pattern 1: Silent-fallback try/catch (D-09 / Phase 8 D-03)

**Source:** `src/hooks/useWakeLock.ts:55-59`, `:71-73`, `:97`; `src/audio/audioEngine.ts:115-117`, `:225-243`

**Apply to:** all new try/catch sites added in Phase 9:
- `osc.disconnect()` / `partialGain.disconnect()` / `filter.disconnect()` / `envelope.disconnect()` calls in cueSynth (AUDIO-04)
- `sentinel.release().catch(() => undefined)` orphan path in `useWakeLock.request` (WAKELOCK-01)
- `newEngine.close()` orphan path in `reconstructEngine` (AUDIO-01)

**Posture:** bare `catch { /* silent */ }` — no `err.name` discrimination (RESEARCH Anti-pattern: "Re-implementing rejection codes"). Comment with the responsible decision tag (`D-09`, `Pitfall N`, REQ-ID).

### Shared Pattern 2: Phase 7 strict-type `// Reason:` annotations

**Source:** every existing `eslint-disable-next-line` in the touched files (e.g., `useAudioCues.ts:123-127`, `:233-238`; `audioEngine.ts:125-126`, `:233-238`; `cueSynth.test.ts:47-52`)

**Apply to:** any new `eslint-disable` introduced by Phase 9:
- The `@typescript-eslint/no-unnecessary-condition` annotation on the `handleStateChange` null gate (RESEARCH Pitfall 6) if lint fires.
- Any `@typescript-eslint/no-non-null-assertion` introduced by indexing the partials arrays in cueSynth (Pitfall 4).

**Required format:** `// Reason: <one-line explanation tying the disable to a phase/D-tag/REQ-ID>` immediately preceding the `eslint-disable-next-line` line. Phase 7 D-04 baseline.

### Shared Pattern 3: Co-located test geography (D-14)

**Source:** every test file under modification was last extended via co-located additions (e.g., `useAudioCues.test.tsx` grew from the original 10 cases to its current 798 lines via in-file appends in Plans 04/05/06/08).

**Apply to:** all new Phase 9 test cases. NO new test files. Add cases to:
- `audioEngine.test.ts` — new cases after the existing `engine.now()` / `scheduleLeadIn` cases (lines 100-280 region).
- `cueSynth.test.ts` — new AUDIO-04 case after the existing `scheduleInCue starts and stops each oscillator` case (line 80 region).
- `useAudioCues.test.tsx` — AUDIO-01 case in the existing `'audioStatus state machine + reconstruction'` describe block (after line 625); AUDIO-05 case adjacent to D-41 (d); AUDIO-06 union case near the initial-state cases (line 35); AUDIO-03 case after the existing `start` cases.
- `useWakeLock.test.tsx` — new WAKELOCK-01 cases after the existing `Unmount with sentinel held` case (line 225 region).
- `App.audio.test.tsx` — new AUDIO-02 caller-side case in the existing `describe('App — audio cues (Phase 3)', ...)` block.

### Shared Pattern 4: `vi.stubGlobal('AudioContext', ProbeAC)` for engine-level tests

**Source:** `audioEngine.test.ts:200-218`, `:222-238`, `:255-278`, `:285-315`; `useAudioCues.test.tsx:82-113`, `:213-244`, `:248-289`, `:448-503`

**Apply to:** all new engine/hook tests that need observable behavior on `audioCtx.close` / `audioCtx.currentTime` / `audioCtx.resume`. Reuse:
- `ProbeAC` shape (audioEngine.test.ts) when only `currentTime` / `close` need to be controllable.
- `SlowCloseAC` shape (useAudioCues.test.tsx:252) when an async operation needs to be parked on a never-resolving promise.
- `SpyableAC` shape (useAudioCues.test.tsx:448) when statechange dispatch + reconstruction-counter tracking are needed (AUDIO-01 stop-during-reconstruct).

All three classes are available verbatim in their respective files; AUDIO-01's test extends `SpyableAC` (no new class needed per RESEARCH Open Q4 resolution).

### Shared Pattern 5: `// Reason:` cross-references between phase tags

**Source:** every D-tag reference in the touched files (e.g., `useAudioCues.ts:152-166` documents Phase 5.1 D-01..D-09 + Plan 06 D-39 in the visibility-resume effect's JSDoc).

**Apply to:** every Phase 9 modification carries an explicit `// AUDIO-NN D-NN` (or `// WAKELOCK-01 D-NN`) tag in the inline comment, mirroring the existing convention. Examples:
- `// AUDIO-02 D-01/D-02 callee-side clamp.`
- `// AUDIO-05 D-04 / D-06: defensive single gate at top — protects ANY future branch ...`
- `// AUDIO-01: bail if stop() / unmount / a newer reconstruct ran during the await.`

This makes the diff self-documenting and matches the convention of every prior phase.

---

## No Analog Found

None. All 10 phase files have at least one strong intra-codebase analog. This is consistent with the phase being a fix-only defensive patch — the architecture exists; what's being added is invariant enforcement at known-thin points using already-established patterns.

---

## Metadata

**Analog search scope:**
- `src/audio/` (audioEngine.ts, cueSynth.ts + tests) — engine + synth tier
- `src/hooks/` (useAudioCues.ts, useWakeLock.ts, useSessionEngine.ts + tests) — React hook tier
- `src/app/App.tsx` + `App.audio.test.tsx` — composition + integration test tier
- `vitest.setup.ts` — `FakeAudioContext` polyfill + `navigator.wakeLock` polyfill (confirmed sufficient per RESEARCH Wave 0 Gaps section — no extension needed)

**Files scanned (via Read or Grep):** 10 source + 5 test + 2 cross-references (`useSessionEngine.ts`, `vitest.setup.ts`) = 17 files total. All read non-overlappingly per the no-re-reads rule.

**Pattern extraction date:** 2026-05-11

**Pattern-density confidence:** HIGH. Every REQ-ID has either an exact in-codebase analog (AUDIO-01 → `App.tsx:158, 285, 306`; AUDIO-05 → `useAudioCues.ts:156-158`; WAKELOCK-01 → `useWakeLock.ts:62-75` baseline + RESEARCH §G additions; AUDIO-02/03/06 → intra-file `audioEngine.ts` patterns; AUDIO-04 → `useWakeLock.ts:49-54` match-pair listener idiom) OR an exact test scaffolding precedent (`SpyableAC`, `SlowCloseAC`, `installTrackedAC`). The planner can copy directly from the cited line ranges without re-discovering shapes.
