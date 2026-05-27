# Phase 49: iOS speaker route fix — Pattern Map

**Mapped:** 2026-05-27
**Files analyzed:** 3 (2 modified, 1 explicitly no-change)
**Analogs found:** 3/3 (all in-file analogs — same module surgery)

## File Classification

| New/Modified File | Role | Data Flow | Closest Analog | Match Quality |
|-------------------|------|-----------|----------------|---------------|
| MODIFY `src/audio/audioEngine.ts` | service (lifecycle/factory) | resource-acquisition + teardown | self — `new AudioContext()` head at L129 + `engine.close()` body at L281-325 | exact (same factory, same close, in-file insertion) |
| MODIFY `src/audio/audioEngine.test.ts` | test (factory lifecycle) | request-response (sync construct + async close) | self — existing `createAudioEngine` + `close()` tests at L62-71, L202-250, L294-318 | exact (same suite, same `ProbeAC` pattern, same `vi.stubGlobal('AudioContext', …)` mechanism) |
| NO-CHANGE `src/hooks/useAudioCues.test.tsx` | test (hook reconstruct path) | n/a | n/a — element is invisible at the hook seam (D-04) | called out so the planner does not invent edits |

**No new files created.** D-01 explicitly forbids hooks/components from learning about the element; D-03 forbids `public/` assets; D-04/D-05 wire everything inside `createAudioEngine()`.

## Pattern Assignments

### MODIFY `src/audio/audioEngine.ts` (service, resource-acquisition + teardown)

**Analog:** `src/audio/audioEngine.ts` itself — this is single-file surgery. Both insertion points already exist verbatim; the planner mirrors the structure for the new resource.

---

#### Pattern A — Module-level audio-clock constants block (where `SILENT_WAV_DATA_URL` lives)

**Source:** `src/audio/audioEngine.ts:78-96`

```typescript
// D-08: soft fade-out tail when muting mid-cue.
// timeConstant 0.05 → ~150 ms perceptual decay (3× constant — see 03-RESEARCH.md Pattern 5).
const MUTE_FADE_TIME_CONSTANT = 0.05
// Never ramp gain to 0.0 — exponentialRampToValueAtTime would throw, and even
// setTargetAtTime is more numerically stable with a nonzero target.
const MIN_GAIN_VALUE = 0.0001

// Lead-in: 3 ticks one second apart, then the first In cue at the start of the breath cycle.
// WR-04: exported as the single source of truth — App.tsx and useAudioCues.ts import these
// instead of redefining the same numbers locally (which silently drifted before).
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

**What to copy:** declaration style for `SILENT_WAV_DATA_URL` — `const` with a leading comment block explaining purpose + provenance. Planner picks `const` (file-local per D-03 "Claude's Discretion" note) OR `export const` if a test imports it. The same comment-anchored single-source-of-truth idiom (`SAFE_LEAD_SEC` is the canonical example) applies if exported.

**Volume constant analog (for the near-zero `0.0001` D-05 picks):** `MIN_GAIN_VALUE = 0.0001` at L83. Phase 49 should reuse that same `0.0001` numerical value but as a SEPARATE constant (e.g. `SILENT_LOOP_VOLUME = 0.0001`) — coupling the audio-element volume to the gain-ramp floor would create false sharing across two unrelated invariants.

---

#### Pattern B — Sync gesture-head construction (insert silent-loop construct + play call here)

**Source / insertion site:** `src/audio/audioEngine.ts:125-143`

```typescript
/** Create a new AudioContext + engine. MUST be called from a user-gesture path (D-09).
 *  Throws (rejects) if AudioContext construction fails (D-10 caller branch). */
export async function createAudioEngine(opts: AudioEngineOptions): Promise<AudioEngine> {
  // D-09: AudioContext is constructed here, which is invoked synchronously from the
  // Start session click handler in App.tsx (Plan 04). The browser autoplay policy MUST
  // see a fresh user-gesture chain or AC will start in 'suspended'.
  const audioCtx = new AudioContext()                       // ← L129 — D-04 sync invariant anchor

  // Chrome can occasionally hand back an AC in 'suspended' even from a gesture chain
  // (race conditions during page bootstrap); resume immediately so currentTime advances.
  // WR-06: if resume() rejects (e.g., the user agent vetoed autoplay between
  // construction and the resume attempt), close the AC before re-throwing — otherwise
  // the AC leaks (browsers cap concurrent ACs ~6 in Chrome).
  if (audioCtx.state === 'suspended') {                     // ← L136 — first awaited resume; D-04
    try {                                                   //         requires `new Audio(...)` +
      await audioCtx.resume()                               //         `audioElement.play()` to run
    } catch (err) {                                         //         BEFORE this `await`.
      await audioCtx.close().catch(() => undefined)
      throw err
    }
  }
```

**What to copy:**

1. **D-04 sync-first-construct invariant.** Insert `const audioElement = new Audio(SILENT_WAV_DATA_URL)` + attribute config + `void audioElement.play().catch(...)` **between L129 and L136** — i.e., after `new AudioContext()` and before the `if (audioCtx.state === 'suspended')` block that contains the first `await`. The order `new AudioContext() → new Audio(...) → audioElement.play()` (all sync) MUST hold; only then may the `audioCtx.resume()` await fire.
2. **Silent-absorb posture for `.play()` rejection.** Mirror the silent-absorb pattern already established at lines L139-143 (AC `resume()` reject), but for `.play()` use `void audioElement.play().catch(() => undefined)` — fire-and-forget WITHOUT a re-throw. D-09 lock: a silent-loop play failure must NOT propagate; the session continues, iOS users just don't get speaker routing. Critically different from the AC `resume()` reject at L139-143 which DOES re-throw after closing the AC — Phase 49's silent loop is non-essential infrastructure, the AC is essential.
3. **Element attribute wiring (D-05).** Set `playsInline = true`, `loop = true`, `muted = false`, `volume = 0.0001` (final value resolved by planner; default per D-05). Done as direct property assignments on the element (the file-header "Zero React imports" invariant — DOM property API, not JSX — is preserved automatically).
4. **WR-06 mirror — partial.** D-09 explicitly REJECTS the WR-06 close-on-fail pattern for `.play()`; it applies only to the AC. The silent loop's failure is sub-essential.

---

#### Pattern C — Per-engine resource ownership (closure-captured `audioElement` reference)

**Source:** `src/audio/audioEngine.ts:165-177`

```typescript
audioCtx.addEventListener('statechange', onStateChange)

// WR-08: track ALL in-flight cues (lead-in ticks + In/Out bowls), not just the
// most recent one. Mute mid-lead-in must silence the remaining ticks too —
// previously only the bowl cue stored as `activeCue` was faded, leaving ticks
// 2 and 3 audible after the user clicked Mute.
const activeCues = new Set<CueHandle>()
let muted = false // D-07: default false (audio ON on first visit)
// Phase 18 D-08: capture timbre once at construction. Immutable for this
// engine's lifetime — no setter exposed. scheduleLeadIn + scheduleNextCue
// forward this value to scheduleInCueForTimbre / scheduleOutCueForTimbre.
const sessionTimbre: TimbreId = opts.timbre
let closed = false
```

**What to copy:** the per-engine closure-state declaration block. Add `let audioElement: HTMLAudioElement | null = audioElement` to this region (or whichever name preserves naming hygiene given the local `const audioElement` from Pattern B). The "every engine instance owns its `AudioContext`, its `activeCues` Set, its statechange listener" pattern (D-04 spec line) extends here: **the engine instance also owns its silent `<audio>` element**. The pattern is closure-captured, not stored on the returned `engine` object — no public getter, no setter, no exposure on the interface.

---

#### Pattern D — `engine.close()` teardown insertion site

**Source:** `src/audio/audioEngine.ts:281-325`

```typescript
async close(): Promise<void> {
  if (closed) return
  closed = true
  // Plan 06 D-36: remove the statechange listener BEFORE close() so a final
  // 'closed' transition does not fire after the hook has nulled engineRef.
  audioCtx.removeEventListener('statechange', onStateChange)
  // … end-chord tail wait at L302-307 …
  const tailRemainingSec = endChordTailUntil - audioCtx.currentTime
  if (tailRemainingSec > 0) {
    await new Promise<void>((resolve) => {
      setTimeout(resolve, tailRemainingSec * 1000)
    })
  }
  // AH-WR-03: node cleanup is otherwise driven entirely by the oscillator
  // 'ended' event (AUDIO-04 explicit-disconnect contract in cueSynth). The
  // Web Audio spec does NOT guarantee 'ended' fires for an oscillator whose
  // stopAt is still in the future when audioCtx.close() runs — so a cue
  // scheduled close to the close() call could leak its node chain. Before
  // closing the context, explicitly disconnect every in-flight cue's
  // envelope (the GainNode wired to destination — the only node the
  // CueHandle exposes; tearing this edge severs the chain from the graph
  // output) and clear the Set so the handles become GC-able.
  for (const cue of [...activeCues]) {                        // ← L317 — D-08 insertion site
    try { cue.envelope.disconnect() } catch { /* silent — node may already be disconnected */ }
  }
  activeCues.clear()
  // Pitfall 8: in-flight cue tails (up to ~5× decayTimeConstant) ring out via the audio
  // thread's already-scheduled gain ramps. We close immediately and trust those ramps
  // to drain naturally. D-11: closing AudioContext releases the system audio resources.
  await audioCtx.close()
},
```

**What to copy:**

1. **Idempotency guard reused for free.** The existing `if (closed) return; closed = true` at L282-283 already covers the silent-loop teardown — no new flag needed. Phase 49 element teardown lives strictly INSIDE the `closed` guard, so a second `close()` call cannot re-pause an already-paused element.
2. **Insertion point.** Per D-08: pause + clear `src` + null reference, INSIDE `close()` body, BEFORE the in-flight-cue disconnect loop at L317 (the "Claude's Discretion" note in D-08 allows ordering relative to the loop only as long as it runs before `await audioCtx.close()` at L324). Recommended exact ordering: `removeEventListener` (L286) → end-chord wait (L302-307) → **element teardown (NEW)** → cue disconnect loop (L317-320) → `await audioCtx.close()` (L324). Putting it before the disconnect loop matches the "drop the heaviest external resource first" pattern the loop itself follows (sever from `destination` before closing the AC).
3. **Teardown shape.** `if (audioElement !== null) { audioElement.pause(); audioElement.removeAttribute('src'); audioElement = null }`. Per D-08: `pause()` + clear `src` (releases the decoded buffer) + drop reference (GC-able). No `try/catch` needed — these are inert DOM operations on an element that the engine owns exclusively; nothing else can mutate it between construct and close.
4. **No await needed.** Unlike `audioCtx.close()` (async, awaited), `audioElement.pause()` returns void and `removeAttribute()` is sync. Element teardown stays sync, before the existing async ones, and adds zero new awaits to the close path.

---

### MODIFY `src/audio/audioEngine.test.ts` (test, sync-construct + async-close lifecycle)

**Analog:** `src/audio/audioEngine.test.ts` itself — same suite, mirror the established `createAudioEngine` + `close()` test patterns.

---

#### Pattern E — `createAudioEngine` resolves with engine (test for element-constructed-and-played)

**Source:** `src/audio/audioEngine.test.ts:62-71`

```typescript
it('createAudioEngine resolves with an engine when AudioContext construction succeeds', async () => {
  const engine = await createAudioEngine({ timbre: 'bowl' })
  expect(engine).toBeDefined()
  expect(typeof engine.scheduleLeadIn).toBe('function')
  expect(typeof engine.scheduleNextCue).toBe('function')
  expect(typeof engine.setMuted).toBe('function')
  expect(typeof engine.now).toBe('function')
  expect(typeof engine.close).toBe('function')
  await engine.close()
})
```

**What to copy:** the basic `await createAudioEngine + await engine.close()` skeleton. New Phase 49 tests for element-construction/play should follow the same arrange-act-assert shape:

1. **Spy on `Audio` constructor** — `vi.spyOn(globalThis, 'Audio')` (or `vi.stubGlobal('Audio', SpyAudio)`) BEFORE `createAudioEngine` runs. The element is constructed sync inside the factory head, so the spy must be in place at the call site.
2. **Spy on `HTMLAudioElement.prototype.play`** (returns a `Promise<void>` in real browsers; jsdom may return a rejected promise — see Pattern G below).
3. **Assert sync ordering:** Audio constructor called exactly once; called BEFORE any awaited path through the engine factory. The order constraint can be expressed as `expect(audioConstructorSpy).toHaveBeenCalledBefore(resumeSpy)` (vitest extension) OR by capturing call timestamps and asserting `audioCall.invocationCallOrder[0] < resumeCall.invocationCallOrder[0]`.
4. **Assert attribute wiring:** the constructed element has `playsInline === true`, `loop === true`, `muted === false`, `volume === 0.0001` (or whatever D-05 final value).

---

#### Pattern F — `close()` teardown asserted via call-count spy

**Source:** `src/audio/audioEngine.test.ts:202-226`

```typescript
it('close() calls audioCtx.close exactly once', async () => {
  // Spy on a Probe AudioContext whose close is observable (the generic FakeAudioContext
  // close is shared across instances and gets noisy if other tests in the same describe
  // leak an unclosed engine).
  const closeSpy = vi.fn(async () => {})
  class ProbeAC {
    state: AudioContextState = 'running'
    sampleRate = 44100
    destination = {}
    currentTime = 0
    resume = vi.fn(async () => {})
    close = closeSpy
    createOscillator = vi.fn()
    createGain = vi.fn()
    createBiquadFilter = vi.fn()
    // Plan 06: engine wires a statechange listener at construction.
    addEventListener = vi.fn()
    removeEventListener = vi.fn()
  }
  vi.stubGlobal('AudioContext', ProbeAC)

  const probeEngine = await createAudioEngine({ timbre: 'bowl' })
  await probeEngine.close()
  expect(closeSpy).toHaveBeenCalledTimes(1)
})
```

**What to copy:** the `ProbeAC` + `vi.stubGlobal` per-test override is the right shape for asserting that `engine.close()` invokes `audioElement.pause()` and clears `src`. New test sketch:

```typescript
it('close() pauses the silent-loop element and clears its src (D-08 teardown)', async () => {
  const pauseSpy = vi.fn()
  const removeAttributeSpy = vi.fn()
  class SpyAudio {
    playsInline = false
    loop = false
    muted = true
    volume = 1
    pause = pauseSpy
    removeAttribute = removeAttributeSpy
    play = vi.fn(async () => {})
    // Reason: constructor mirrors HTMLAudioElement(src?) signature.
    // eslint-disable-next-line @typescript-eslint/no-useless-constructor, @typescript-eslint/no-unused-vars
    constructor(_src?: string) {}
  }
  vi.stubGlobal('Audio', SpyAudio)

  const engine = await createAudioEngine({ timbre: 'bowl' })
  await engine.close()
  expect(pauseSpy).toHaveBeenCalledTimes(1)
  expect(removeAttributeSpy).toHaveBeenCalledWith('src')
})
```

**Idempotency mirror — `close()` is idempotent (already tested at L228-250 for `audioCtx.close`).** Add a parallel test for the silent-loop element: `await close(); await close()` calls `pause` and `removeAttribute` at most once total. The existing `if (closed) return` guard at L282 covers this for free — the test is a downstream-protection contract.

---

#### Pattern G — AudioContext construction failure tests as the silent-absorb-on-play-reject analog

**Source:** `src/audio/audioEngine.test.ts:73-85`

```typescript
it('createAudioEngine rejects when AudioContext construction throws (D-10 anchor)', async () => {
  vi.stubGlobal(
    'AudioContext',
    // Reason: test stub — constructor-only class simulates a browser that denies AudioContext.
    // eslint-disable-next-line @typescript-eslint/no-extraneous-class
    class {
      constructor() {
        throw new Error('blocked')
      }
    },
  )
  await expect(createAudioEngine({ timbre: 'bowl' })).rejects.toThrow('blocked')
})
```

**What to copy in INVERTED form:** Phase 49's silent-loop `.play()` reject MUST NOT propagate — the engine still resolves successfully. New test sketch:

```typescript
it('createAudioEngine resolves even when silent-loop element.play() rejects (D-09 silent-absorb)', async () => {
  class RejectingAudio {
    playsInline = false; loop = false; muted = true; volume = 1
    pause = vi.fn(); removeAttribute = vi.fn()
    play = vi.fn(async () => { throw new DOMException('autoplay denied', 'NotAllowedError') })
    // eslint-disable-next-line @typescript-eslint/no-useless-constructor, @typescript-eslint/no-unused-vars
    constructor(_src?: string) {}
  }
  vi.stubGlobal('Audio', RejectingAudio)

  // Engine MUST resolve — silent-loop failure is non-fatal (D-09 lock).
  const engine = await createAudioEngine({ timbre: 'bowl' })
  expect(engine).toBeDefined()
  await engine.close()
})
```

This contract is the inverse of D-10 / Pattern G: the AC construction rejection at L73-85 RE-THROWS; the silent-loop play rejection ABSORBS. Both shapes use the same `vi.stubGlobal` mechanism, opposite outcomes.

---

#### Pattern H — Reconstruct sync-construct invariant (for the "sync-construct order preserved on reconstruct" test)

**Source — engine-level analog:** `src/audio/audioEngine.ts:125-143` (Pattern B) is the locus the test verifies.
**Source — hook-level mirror:** `src/hooks/useAudioCues.ts:296-309` (Plan 06 Task 8 invariant) — DO NOT add tests here per the no-change directive below.
**Source — closest existing engine-level construct-count test:** `src/hooks/useAudioCues.test.tsx:293-329` (`CountingAC` pattern)

```typescript
it('start() called twice without stop is idempotent — only one AudioContext is constructed', async () => {
  let constructCount = 0
  class CountingAC {
    state: AudioContextState = 'running'
    sampleRate = 44100
    destination = {}
    currentTime = 0
    constructor() {
      constructCount++
    }
    resume = vi.fn(async () => {})
    close = vi.fn(async () => {})
    createOscillator = vi.fn()
    createGain = vi.fn()
    createBiquadFilter = vi.fn()
    addEventListener = vi.fn()
    removeEventListener = vi.fn()
  }
  vi.stubGlobal('AudioContext', CountingAC)
```

**What to copy:** the construct-counting pattern, applied symmetrically to `Audio` AND `AudioContext`. The Phase 49 test asserts construction-order parity: every engine instance constructs exactly one `Audio` + one `AudioContext`, and they construct in `AudioContext`→`Audio` order (D-04 sync chain). Test sketch:

```typescript
it('sync-construct order: new AudioContext() precedes new Audio() in createAudioEngine (D-04)', async () => {
  const callOrder: string[] = []
  class OrderedAC {
    state: AudioContextState = 'running'
    sampleRate = 44100; destination = {}; currentTime = 0
    constructor() { callOrder.push('AudioContext') }
    resume = vi.fn(async () => {})
    close = vi.fn(async () => {})
    createOscillator = vi.fn(); createGain = vi.fn(); createBiquadFilter = vi.fn()
    addEventListener = vi.fn(); removeEventListener = vi.fn()
  }
  class OrderedAudio {
    playsInline = false; loop = false; muted = true; volume = 1
    pause = vi.fn(); removeAttribute = vi.fn(); play = vi.fn(async () => {})
    // eslint-disable-next-line @typescript-eslint/no-useless-constructor, @typescript-eslint/no-unused-vars
    constructor(_src?: string) { callOrder.push('Audio') }
  }
  vi.stubGlobal('AudioContext', OrderedAC)
  vi.stubGlobal('Audio', OrderedAudio)

  const engine = await createAudioEngine({ timbre: 'bowl' })
  expect(callOrder).toEqual(['AudioContext', 'Audio'])
  await engine.close()
})
```

The hook-level reconstruct test at `useAudioCues.test.tsx:293-329` (`CountingAC`) already covers the reconstruct path; engine-level coverage of the new construct order is sufficient. D-04's reconstruct sync invariant is verified transitively: `reconstructEngine()` calls `createAudioEngine()`, and `createAudioEngine()`'s order is fixed here.

---

### NO-CHANGE `src/hooks/useAudioCues.test.tsx`

**Reason for listing:** D-04 ("Mirror engine lifecycle exactly") + integration-points doc explicitly state the element is invisible at the hook seam. The hook's reconstruct path already invokes `createAudioEngine()`, and the silent-loop teardown happens inside `engine.close()` — both internal to the engine. No hook-level test needs to change.

**Planner directive:** Do NOT introduce edits to `useAudioCues.test.tsx`. The existing reconstruct tests (e.g. the `CountingAC` test at L293-329, the AUDIO-01 in-flight reconstruct test at L804+, and the gesture-preservation test referenced in the iOS-gesture commentary at `useAudioCues.ts:296-309`) continue to pass unchanged.

If you find a hook test failing, the regression is in the engine wiring — fix the engine, not the hook test.

## Shared Patterns

### Silent-absorb on resource-acquisition failures
**Sources:**
- `src/audio/audioEngine.ts:139-143` — AC `resume()` reject (re-throws after closing AC; for ESSENTIAL infra)
- `src/audio/audioEngine.ts:327-348` — AC `resume()` reject in `engine.resume()` (absorbs except `InvalidStateError` for state-machine signal)
- `src/hooks/useAudioCues.ts:257-269` — `start()` outer catch (visuals-only fallback)

**Apply to:** Phase 49 silent-loop `.play()` rejection (D-09).

```typescript
// Pattern reference — D-09 silent-absorb (lifted shape from useAudioCues.ts:257-269).
// Engine continues; iOS users without speaker routing are no worse than pre-Phase-49.
void audioElement.play().catch(() => undefined)
```

**Critical distinction:** Phase 49 uses the **non-re-throwing** variant. The AC `resume()` reject at L139-143 re-throws after `audioCtx.close()` (the AC is essential infra; without it the session cannot run). The silent-loop is sub-essential (D-09 explicit). Do NOT copy the L139-143 close-and-rethrow shape.

### Zero React imports in audioEngine.ts
**Source:** `src/audio/audioEngine.ts:1` (file-header invariant)
**Apply to:** Phase 49 element wiring — `new Audio(...)` is a DOM API (no React). The planner MUST NOT import anything from `react`, `react-dom`, or any `*.tsx` file into `audioEngine.ts`. If the planner contemplates introducing a `useEffect`-based wiring path, redirect immediately back to D-01: engine owns the element, period.

### Per-engine resource ownership
**Source:** spec comments at `src/audio/audioEngine.ts:1-26` + per-engine state declarations at L165-177
**Apply to:** Phase 49 silent-loop element. The engine instance now owns: its `AudioContext`, its `activeCues` Set, its `statechange` listener, AND its silent `<audio>` element. Same construct/teardown symmetry: constructed inside `createAudioEngine()` factory body, torn down inside the returned `engine.close()` method. No external code can reach the element (it is closure-captured, not exposed on the `AudioEngine` interface at L29-63).

### Idempotent close under `closed` flag
**Source:** `src/audio/audioEngine.ts:282-283`
```typescript
if (closed) return
closed = true
```
**Apply to:** Phase 49 element teardown — placed INSIDE the existing guard. No new idempotency flag needed; the element pause + src clear inherits the guard for free, and the second `close()` call short-circuits at L282 before reaching the new teardown code.

### `vi.stubGlobal` per-test class-override + restore
**Sources:**
- `src/audio/audioEngine.test.ts:73-85, 202-226, 228-250, 294-318` — multiple `class ProbeAC` examples
- `src/audio/audioEngine.test.ts:57-60` — `afterEach(() => { vi.unstubAllGlobals(); vi.restoreAllMocks() })`

**Apply to:** Phase 49 tests that need to spy on `Audio` (the constructor) or `HTMLAudioElement.prototype.play`. Use the same `vi.stubGlobal('Audio', SpyAudio)` mechanism. The existing `afterEach` at L57-60 covers cleanup — no change to teardown needed.

## No Analog Found

| File | Role | Data Flow | Reason |
|------|------|-----------|--------|
| (none) | — | — | Phase 49 is single-file surgery; every pattern has an in-file or in-suite analog. The `Audio` element + `play()` returns-`Promise` API is a DOM primitive that jsdom provides natively (no polyfill needed in `vitest.setup.ts` for the constructor), though jsdom's `play()` typically returns a rejected promise — Pattern G's silent-absorb shape covers that case directly. |

**One small caveat for the planner:** there is no existing `HTMLAudioElement` polyfill in `vitest.setup.ts` (verified — only `AudioContext`, `HTMLDialogElement`, `matchMedia`, `wakeLock` are polyfilled). If a Phase 49 test relies on `play()` resolving (rather than being asserted as called and ignored), the planner should either:
1. Stub `Audio` per-test with `vi.stubGlobal('Audio', class { play = async () => {}; … })` (matches the established pattern at `audioEngine.test.ts:202-226`); or
2. Spy on `HTMLAudioElement.prototype.play` and replace it with a resolving promise.

Adding a new polyfill to `vitest.setup.ts` is NOT required and would be out of scope for Phase 49 — keep stubs test-local.

## Metadata

**Analog search scope:**
- `/Users/lucindo/Code/hrv/src/audio/` (full)
- `/Users/lucindo/Code/hrv/src/hooks/useAudioCues.ts` (lines 240-369, reconstruct path)
- `/Users/lucindo/Code/hrv/src/hooks/useAudioCues.test.tsx` (greps + lines 280-360, 760-870)
- `/Users/lucindo/Code/hrv/vitest.setup.ts` (full — confirmed no `Audio`/`HTMLAudioElement` polyfill)
- `/Users/lucindo/Code/hrv/vite.config.ts` (full — confirmed jsdom env)
- Global grep for `new Audio` / `HTMLAudioElement` across `src/` (no usages — Phase 49 introduces the first)

**Files scanned:** 7 (4 in-scope source/test, 3 build/setup)
**Skills loaded:** none (no `.claude/skills/` or `.agents/skills/` exists in this project; operator removed spike-findings-hrv per memory rule)
**Pattern extraction date:** 2026-05-27
