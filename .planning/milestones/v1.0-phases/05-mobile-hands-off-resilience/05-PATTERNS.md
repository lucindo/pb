# Phase 5: Mobile Hands-Off Resilience — Pattern Map

**Mapped:** 2026-05-10
**Files analyzed:** 5 (2 NEW, 3 MODIFIED — 1 of the modifies is `vitest.setup.ts`, 1 is `src/app/App.tsx` with three call sites, 1 is the new App-integration test file `App.wakeLock.test.tsx`)
**Analogs found:** 5 / 5 (all in-codebase, no RESEARCH-only fallbacks needed)

---

## File Classification

| New/Modified File | Role | Data Flow | Closest Analog | Match Quality |
|-------------------|------|-----------|----------------|---------------|
| `src/hooks/useWakeLock.ts` (NEW) | hook (imperative-resource) | event-driven + request-response (DOM API + visibilitychange listener) | `src/hooks/useAudioCues.ts` | exact — same role + same data-flow shape (imperative methods, sentinel ref, unmount cleanup) |
| `src/hooks/useWakeLock.test.tsx` (NEW) | test (hook unit) | request-response (renderHook + act) | `src/hooks/useAudioCues.test.tsx` | exact — same testing idiom (`renderHook`, `vi.spyOn`, `vi.stubGlobal`, `vi.restoreAllMocks`) |
| `src/app/App.wakeLock.test.tsx` (NEW) | test (App integration) | request-response (fireEvent + advance fake timers) | `src/app/App.audio.test.tsx`, `src/app/App.persistence.test.tsx` | exact — same flushMicrotasks + LEAD_IN_MS helpers, same `acInstance` capture pattern adapted to a wakeLock spy |
| `vitest.setup.ts` (MODIFIED) | config (test polyfill) | config | existing `AudioContext` polyfill block at `vitest.setup.ts:126-200` and `localStorage` block at `vitest.setup.ts:29-81` | exact — same `Object.defineProperty(...)` + `writable: true, configurable: true` shape, same conditional-install gate |
| `src/app/App.tsx` (MODIFIED, 3 call sites) | controller (composition site) | event-driven (gesture handlers + lifecycle effects) | The existing `audioStart(plan)` and `void audioStop()` calls in the same three sites | exact — Wake Lock literally tracks the audio engine's three call sites |

---

## Pattern Assignments

### `src/hooks/useWakeLock.ts` (NEW — hook, imperative-resource)

**Analog:** `src/hooks/useAudioCues.ts`

**Why this analog fits:** `useAudioCues` is the codebase's canonical imperative-resource hook. It owns a private ref (`engineRef`) for a browser-side handle, exposes `start`/`stop` as `useCallback([])`-stable methods, runs a single `useEffect([])` for unmount cleanup, and silently absorbs failures via try/catch. `useWakeLock` is a strictly simpler shape: no state machine, no async creation, no React state in the public return — just two refs (`sentinelRef`, `wasAcquiredRef`), two imperative methods (`request`, `release`), and one `useEffect([])` that hosts both the `visibilitychange` listener (D-03) AND the unmount cleanup (Pitfall 6). The `useAudioCues` template is the structural starting point; strip the state machine and audio-specific arguments, then add the visibility listener.

**Imports pattern** (`useAudioCues.ts:21-29`):
```typescript
import { useCallback, useEffect, useRef, useState } from 'react'

import type { BreathingPlan } from '../domain/breathingPlan'
import {
  createAudioEngine,
  type AudioEngine,
  type AudioStatus,
} from '../audio/audioEngine'
```
Mirror this with React-only imports — Wake Lock has no domain types and no engine module:
```typescript
import { useCallback, useEffect, useRef } from 'react'  // no useState (D-12)
```

**Public-interface declaration** (`useAudioCues.ts:32-52`):
```typescript
export interface UseAudioCues {
  status: AudioStatus
  audioAvailable: boolean
  muted: boolean
  start(plan: BreathingPlan): Promise<number | null>
  stop(): Promise<void>
  setMuted(muted: boolean): void
  notifyPhaseBoundary(args: { newPhase: 'in' | 'out'; audioTime: number }): void
  audioNow(): number | null
}
```
Mirror with the minimal D-12 surface — no React state fields, just two methods:
```typescript
export interface UseWakeLock {
  request(): Promise<void>
  release(): Promise<void>
}
```

**Private-handle ref + cleanup pattern** (`useAudioCues.ts:54-82`):
```typescript
export function useAudioCues(initialMuted?: boolean): UseAudioCues {
  // Imperative resource — engineRef is NOT in render state because each AC create/close
  // is a side effect, not a UI value. Mirrors useSessionEngine.ts's animationFrameId posture.
  const engineRef = useRef<AudioEngine | null>(null)
  // ...
  // Cleanup-on-unmount: close the engine if a session is still alive.
  // Pitfall 3 leak guard: rapid mount/unmount during dev/strict-mode would otherwise
  // leak AudioContexts. Browsers cap concurrent ACs (~6 in Chrome) before refusing new ones.
  useEffect(() => {
    return () => {
      const engine = engineRef.current
      if (engine !== null) {
        void engine.close()
        engineRef.current = null
      }
      firstInCueTimeRef.current = null
    }
  }, [])
```
Mirror with two refs (sentinel + wasAcquired) and a `useEffect([])` that ALSO installs/removes the `visibilitychange` listener (the only structural difference vs `useAudioCues`). The unmount cleanup body is identical in spirit: read the live handle, null the ref synchronously, fire-and-forget release.

**Imperative method pattern with try/catch silent fallback** (`useAudioCues.ts:84-121`):
```typescript
const start = useCallback(
  async (plan: BreathingPlan): Promise<number | null> => {
    // Defensive: if the hook user accidentally calls start() twice without stop(),
    // return the cached firstInCueTime from the ORIGINAL schedule (WR-05) ...
    const existing = engineRef.current
    if (existing !== null) {
      return firstInCueTimeRef.current
    }
    setStatus('starting')
    try {
      const engine = await createAudioEngine()
      engineRef.current = engine
      // ...
      return firstInCueTime
    } catch {
      // D-10: visuals-only fallback. ... The error is intentionally swallowed (T-03-06: no raw
      // stack to user-facing surfaces).
      setAudioAvailable(false)
      setStatus('failed')
      return null
    }
  },
  [muted],
)
```
**Specific structural elements to mirror in `request()`:**
- Feature-detect-then-bail at the top (`if (!('wakeLock' in navigator)) return`) — D-09 silent fallback for absent API.
- Idempotency guard mirroring the `existing !== null` check (`if (sentinelRef.current !== null) return`) — D-08.
- `try { sentinelRef.current = await navigator.wakeLock.request('screen'); wasAcquiredRef.current = true; sentinel.addEventListener('release', ...) } catch { /* D-09 */ }` — mirrors the try/catch that swallows the error to a flag without re-throwing.
- `useCallback([])` empty deps (mirrors `stop`/`setMuted`/`notifyPhaseBoundary`/`audioNow` — all have `[]`); only `start` had `[muted]` because of state coupling, which `request()` does NOT need.

**Synchronous-null-then-async-close pattern** (`useAudioCues.ts:123-135`):
```typescript
const stop = useCallback(async (): Promise<void> => {
  // Null engineRef synchronously BEFORE awaiting close — otherwise a fast
  // start() arriving during the close window hits the defensive guard in
  // start() and returns from a closing AudioContext, leaving engineRef
  // pointing at a dead engine.
  const engine = engineRef.current
  engineRef.current = null
  firstInCueTimeRef.current = null // WR-05: clear cached anchor for the next start()
  setStatus('idle')
  if (engine !== null) {
    await engine.close() // D-11
  }
}, [])
```
**Specific structural elements to mirror in `release()`:**
- Read the handle to a local, null the ref synchronously, THEN await the actual release. This kills the same race the audio hook documents — a fast `request()` arriving during release won't see a half-released sentinel.
- Set `wasAcquiredRef.current = false` synchronously to stop visibility re-acquires (D-04 inverse — `release()` is the only thing that clears intent).
- Wrap `await sentinel.release()` in try/catch and swallow (D-09).
- `useCallback([])` empty deps.

**Sentinel `'release'` event listener** (no direct analog in `useAudioCues` — `useAudioCues` does not have an OS-initiated release event). The closest project pattern is the `audioCtx.addEventListener` calls inside the FakeAudioContext polyfill (declarative `addEventListener` style). Use the project-wide convention of `addEventListener('release', ...)` rather than the `onrelease` setter property. Apply the `if (sentinelRef.current === sentinel)` guard documented in RESEARCH Pitfall 1 / Anti-pattern 4 to avoid stale listeners clobbering a freshly-acquired sentinel.

**Visibility-listener `useEffect` pattern** (no direct analog — `useAudioCues` has only the unmount cleanup). The MDN canonical pattern (RESEARCH Pattern 2 / Code Examples) plus the order-independent guard (RESEARCH Pitfall 2) is the structure:
```typescript
useEffect(() => {
  const onVisibility = () => {
    if (document.visibilityState !== 'visible') return
    if (!wasAcquiredRef.current) return
    if (sentinelRef.current !== null) return  // already re-acquired
    void request()
  }
  document.addEventListener('visibilitychange', onVisibility)
  return () => {
    document.removeEventListener('visibilitychange', onVisibility)
    // Unmount: synchronously release if still held — same shape as useAudioCues:73-82.
    const sentinel = sentinelRef.current
    sentinelRef.current = null
    wasAcquiredRef.current = false
    if (sentinel !== null) void sentinel.release().catch(() => {})  // D-09
  }
}, [request])
```

---

### `src/hooks/useWakeLock.test.tsx` (NEW — hook unit tests)

**Analog:** `src/hooks/useAudioCues.test.tsx`

**Why this analog fits:** `useAudioCues.test.tsx` is the project's canonical hook unit-test file. It uses `renderHook` from `@testing-library/react`, wraps state mutations in `act(async () => { ... })`, mocks the browser API via `vi.stubGlobal('AudioContext', ...)`, and resets per test with `vi.unstubAllGlobals()` + `vi.restoreAllMocks()`. The Wake Lock equivalent is structurally identical — replace `AudioContext` with `navigator.wakeLock.request`, replace `engine.close()` assertions with `sentinel.release()` assertions, and add a synthetic `dispatchEvent(new Event('visibilitychange'))` for the re-acquire test.

**Imports pattern** (`useAudioCues.test.tsx:1-10`):
```typescript
// Tests for the useAudioCues React hook (Plan 03-02).
// Source: 03-02-PLAN.md <behavior> tests 1-10.
// Mirrors the renderHook + act idiom from useSessionEngine.test.tsx.

import { act, renderHook } from '@testing-library/react'
import { afterEach, describe, expect, it, vi } from 'vitest'

import type { BreathingPlan } from '../domain/breathingPlan'
import * as cueSynth from '../audio/cueSynth'
import { useAudioCues } from './useAudioCues'
```
Mirror with the same testing imports, drop domain imports, target `./useWakeLock`.

**Per-test reset pattern** (`useAudioCues.test.tsx:21-25`):
```typescript
describe('useAudioCues', () => {
  afterEach(() => {
    vi.unstubAllGlobals()
    vi.restoreAllMocks()
  })
```
Copy verbatim — same hygiene posture is needed for `vi.spyOn(navigator.wakeLock, 'request')` and any per-test `Object.defineProperty(navigator, 'wakeLock', ...)` overrides.

**Success-path renderHook + act pattern** (`useAudioCues.test.tsx:35-52`):
```typescript
it('start(plan) on success transitions to lead-in and returns the firstInCueTime', async () => {
  const { result, unmount } = renderHook(() => useAudioCues())

  let firstInCueTime: number | null = null
  await act(async () => {
    firstInCueTime = await result.current.start(samplePlan)
  })

  expect(firstInCueTime).not.toBeNull()
  expect(firstInCueTime!).toBeGreaterThanOrEqual(3)
  expect(result.current.status).toBe('lead-in')
  expect(result.current.audioAvailable).toBe(true)

  await act(async () => {
    await result.current.stop()
  })
  unmount()
})
```
**Specific structural elements to mirror:**
- `renderHook(() => useWakeLock())` (no args — D-12 means no `initialMuted`-style param).
- `await act(async () => { await result.current.request() })` for the request call.
- `vi.spyOn(navigator.wakeLock, 'request')` to assert call shape (`.toHaveBeenCalledWith('screen')`).
- Always `unmount()` at the end (Pitfall 6 leak guard).

**Failure-path stub pattern** (`useAudioCues.test.tsx:54-75`):
```typescript
it('start(plan) on AudioContext failure → status=failed, audioAvailable=false (D-10), returns null', async () => {
  vi.stubGlobal(
    'AudioContext',
    class {
      constructor() {
        throw new Error('blocked')
      }
    },
  )
  const { result, unmount } = renderHook(() => useAudioCues())

  let res: number | null = 0
  await act(async () => {
    res = await result.current.start(samplePlan)
  })

  expect(res).toBeNull()
  expect(result.current.status).toBe('failed')
  expect(result.current.audioAvailable).toBe(false)

  unmount()
})
```
**Specific structural elements to mirror for D-09 silent-fallback tests:**
- API-absent path: `delete (navigator as any).wakeLock` (or `Object.defineProperty(navigator, 'wakeLock', { value: undefined, configurable: true, writable: true })`) inside the test, restore in `afterEach` — RESEARCH Pattern 3 includes this exact recipe.
- API-rejection path: `vi.spyOn(navigator.wakeLock, 'request').mockRejectedValueOnce(new DOMException('blocked', 'NotAllowedError'))`.
- Assert that the `act` call resolves without throwing (`await expect(act(...)).resolves.toBeUndefined()` — RESEARCH Code Examples scaffolding).
- No `result.current.status` to assert (D-12 has no public state) — instead assert observable side-effects: `requestSpy` was called, OR `releaseSpy` on the sentinel was NOT called, OR a follow-up `release()` is a no-op.

**Unmount-cleanup pattern** (`useAudioCues.test.tsx:200-227`):
```typescript
it('unmount after a successful start triggers AudioContext.close (Pitfall 3 leak guard)', async () => {
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
  }
  vi.stubGlobal('AudioContext', ProbeAC)

  const { result, unmount } = renderHook(() => useAudioCues())
  await act(async () => {
    await result.current.start(samplePlan)
  })

  unmount()

  // Unmount triggers cleanup which calls engine.close() → audioCtx.close().
  // close is async but cleanup fires synchronously; allow microtasks to flush.
  await Promise.resolve()
  await Promise.resolve()
  expect(closeSpy).toHaveBeenCalledTimes(1)
})
```
**Specific structural elements to mirror for the Wake Lock unmount-leak test (Pitfall 6):**
- Capture the sentinel returned by the polyfill — either store `acInstance`-style by wrapping `vi.spyOn(navigator.wakeLock, 'request').mockImplementation(...)` to capture the sentinel, OR rely on the polyfill's `vi.fn(...)` mock to expose `request.mock.results[0].value` and assert its `release` was called.
- Two `await Promise.resolve()` flushes after `unmount()` — same idiom (`release()` is async, cleanup fires synchronously).

**Visibility re-acquire test (no direct analog in `useAudioCues.test.tsx`)** — RESEARCH Validation Architecture line 776 specifies the test:
- Synthesize `Object.defineProperty(document, 'visibilityState', { value: 'visible', configurable: true })` then `document.dispatchEvent(new Event('visibilitychange'))` inside `act(...)`.
- Assert `requestSpy.toHaveBeenCalledTimes(2)` after first request + visibility cycle.
- Negative test: do NOT call `request()` first; assert `requestSpy.toHaveBeenCalledTimes(0)` after visibility event (D-04 gate).

---

### `src/app/App.wakeLock.test.tsx` (NEW — App integration tests)

**Analog (primary):** `src/app/App.audio.test.tsx`
**Analog (secondary):** `src/app/App.persistence.test.tsx`

**Why these analogs fit:** `App.audio.test.tsx` is the closest match — it tests an imperative-resource hook (`useAudioCues`) wired into `App.tsx` at the same three call sites Wake Lock will use. The `acInstance` capture pattern (constructed-via-spy → assert `closeMock.toHaveBeenCalled()`) maps 1:1 to a `wakeLockInstance` capture (sentinel-returned-via-spy → assert `release` was called). `App.persistence.test.tsx` contributes the same `flushMicrotasks` / `LEAD_IN_MS` helpers and demonstrates the cleaner `vi.useFakeTimers()` + `fireEvent` posture this file should adopt.

**Imports + helpers pattern** (`App.audio.test.tsx:1-47`):
```typescript
import '@testing-library/jest-dom/vitest'

import { act, fireEvent, render, screen } from '@testing-library/react'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

import App from './App'
import * as cueSynth from '../audio/cueSynth'

// ...

const LEAD_IN_MS = 3000

async function flushMicrotasks() {
  await act(async () => {
    await Promise.resolve()
    await Promise.resolve()
  })
}

async function startAndAdvancePastLeadIn() {
  fireEvent.click(screen.getByRole('button', { name: 'Start session' }))
  await act(async () => {
    await Promise.resolve()
    await Promise.resolve()
    vi.advanceTimersByTime(LEAD_IN_MS)
  })
}

describe('App — audio cues (Phase 3)', () => {
  beforeEach(() => {
    vi.useFakeTimers()
    vi.setSystemTime(new Date('2026-05-09T00:00:00.000Z'))
  })

  afterEach(() => {
    vi.useRealTimers()
    vi.unstubAllGlobals()
    vi.restoreAllMocks()
  })
```
Copy this scaffolding verbatim, retitle the describe to `'App — wake lock (Phase 5)'`, drop the `cueSynth` import, add a `wakeLock` spy/capture helper.

**Spy + capture pattern for an imperative resource** (`App.audio.test.tsx:233-268` — cancel-during-lead-in):
```typescript
it('pressing the primary button during lead-in (still labelled Start session) cancels back to idle without opening the EndSessionDialog', async () => {
  const OriginalAC = window.AudioContext
  let acInstance: AudioContext | null = null
  const acSpy = vi.fn(function (this: AudioContext, ...args: unknown[]) {
    acInstance = new (OriginalAC as new (...args: unknown[]) => AudioContext)(...args)
    return acInstance
  })
  vi.stubGlobal('AudioContext', acSpy)

  render(<App />)
  fireEvent.click(screen.getByRole('button', { name: 'Start session' }))
  await flushMicrotasks()
  act(() => {
    vi.advanceTimersByTime(500)
  })
  expect(screen.getByRole('img', { name: 'Lead-in: 3' })).toBeVisible()

  // ... cancel click
  const primaryBtn = screen.getByRole('button', { name: 'Start session' })
  fireEvent.click(primaryBtn)
  await flushMicrotasks()

  // ... assertions
  expect(acInstance).not.toBeNull()
  const closeMock = (acInstance as unknown as { close: ReturnType<typeof vi.fn> }).close
  expect(closeMock).toHaveBeenCalled()
})
```
**Specific structural elements to mirror for each Wake Lock integration test:**
- Replace `OriginalAC = window.AudioContext` + `vi.stubGlobal('AudioContext', acSpy)` with `const requestSpy = vi.spyOn(navigator.wakeLock, 'request')` that captures the returned sentinel: `requestSpy.mockImplementation(async (type) => { sentinelInstance = await /* original */; return sentinelInstance })` — OR use the polyfill's already-installed `vi.fn` and read `requestSpy.mock.results[0].value`.
- The four canonical exit-path tests (per RESEARCH Validation Architecture lines 781-785) all share the same shape: render → start → advance past lead-in → exit (manual End / modal-confirm End / complete / cancel-during-lead-in) → assert `release` was called on the captured sentinel.
- Test 11 in `App.audio.test.tsx:233-268` (cancel-during-lead-in) is the structural template for the cancel-during-lead-in Wake Lock test — identical click sequence, identical lead-in numeral assertions, just substitute `closeMock` for `releaseMock`.
- Tests 8/9/10 in `App.audio.test.tsx:152-231` (modal-confirm End / open-ended End / timed completion) are the structural templates for the three "end during running" Wake Lock tests — identical structure.

**Silent-fallback integration test pattern (D-09)** — no direct analog (Phase 3 D-10 is tested at the hook level, not at App level — verify the polyfill is enough). For the D-09 App-level silent-fallback test, set up by deleting `navigator.wakeLock` in a `beforeEach` for that single suite block and asserting `render(<App />)` + `startAndAdvancePastLeadIn()` does not throw and renders the expected lead-in / running state. Restore in `afterEach`. This mirrors the App.audio.test.tsx Test 12 (D-10 visuals-only fallback, lines 271-299) shape: stub the API to fail, render, start, assert the visual session continues normally without any user-visible error surface.

---

### `vitest.setup.ts` (MODIFIED — add `navigator.wakeLock` polyfill)

**Analog:** Same file's existing `AudioContext` polyfill (lines 126-200) and `localStorage` polyfill (lines 29-81).

**Why these analogs fit:** Both polyfills follow the project convention exactly: a `if (... && !('property' in target))` conditional install gate (so the polyfill is a no-op when the host environment supplies the API natively), classes that extend the appropriate DOM base where applicable, and `Object.defineProperty(target, 'name', { writable: true, configurable: true, value: ... })` to install. The `configurable: true` flag is load-bearing — it lets per-test `vi.stubGlobal(...)` and `Object.defineProperty(...)` overrides redefine the property for failure-path tests. RESEARCH A3 confirms this pattern works in jsdom 29.1.1 + Node 25.9.0.

**`AudioContext` polyfill structure** (`vitest.setup.ts:126-200`):
```typescript
// AudioContext polyfill — jsdom 29.1.1 does not implement Web Audio.
// Source: 03-RESEARCH.md Code Examples (lines 585-649); verified against
// github.com/jsdom/jsdom/issues/2900.
if (typeof window !== 'undefined' && !window.AudioContext) {
  class FakeAudioParam {
    value = 0
    setValueAtTime = vi.fn()
    // ...
  }

  class FakeAudioNode {
    connect = vi.fn().mockReturnThis()
    disconnect = vi.fn()
  }

  // ... more fake classes ...

  class FakeAudioContext {
    state: AudioContextState = 'running'
    // ...
    constructor(_options?: AudioContextOptions) {}
    createOscillator() { return new FakeOscillatorNode() }
    // ...
    addEventListener = vi.fn()
    removeEventListener = vi.fn()
  }

  Object.defineProperty(window, 'AudioContext', {
    writable: true,
    configurable: true, // allow vi.stubGlobal('AudioContext', ...) per-test overrides (D-10 / failure-path tests in audioEngine).
    value: FakeAudioContext,
  })
}
```

**Specific structural elements to mirror for Wake Lock:**
- Conditional gate: `if (typeof navigator !== 'undefined' && !('wakeLock' in navigator)) { ... }` (RESEARCH Pattern 3 verbatim).
- Fake sentinel class **must extend `EventTarget`** (so `addEventListener('release', ...)` and `dispatchEvent(...)` work natively — A1 reliability). This is the structural difference vs `FakeAudioContext`, which uses `vi.fn()` for `addEventListener`. Wake Lock tests need REAL `EventTarget` semantics because the visibility re-acquire test fires an actual `'release'` event.
- Inside `FakeWakeLockSentinel.release()`: set `released = true`, fire the `onrelease` handler if set (lib.dom.d.ts contract), `dispatchEvent(new Event('release'))` (so `addEventListener('release', ...)` listeners run).
- Wrap the `request` method in `vi.fn(async (_type) => new FakeWakeLockSentinel())` — the `vi.fn` wrapper means tests can use `vi.spyOn(navigator.wakeLock, 'request')` AND read call history directly off the polyfill's mock (no extra setup).
- Use the same `Object.defineProperty(navigator, 'wakeLock', { writable: true, configurable: true, value: ... })` shape — the per-test override pattern (RESEARCH Pattern 3) depends on `configurable: true`.
- Append the new block AFTER the existing `AudioContext` block (line 200) to preserve the file's polyfill-section ordering.

**`localStorage` polyfill `Object.defineProperty(window, ...)` shape** (`vitest.setup.ts:71-80`):
```typescript
Object.defineProperty(window, 'localStorage', {
  writable: true,
  configurable: true,
  value: makeFakeStorage(),
})
Object.defineProperty(window, 'sessionStorage', {
  writable: true,
  configurable: true,
  value: makeFakeStorage(),
})
```
This is the second confirming reference for the `writable: true, configurable: true` shape — the Wake Lock polyfill uses an identical install line, just with `navigator` as the target instead of `window`. (Note A3 in RESEARCH: if jsdom rejects `Object.defineProperty(navigator, ...)` for any reason, the documented fallback is `Object.defineProperty(window.navigator, ...)` or a per-suite `vi.stubGlobal('navigator', ...)`.)

---

### `src/app/App.tsx` (MODIFIED — three call sites)

**Analog (per call site):** The existing `audioStart(plan)` call inside `onStartClick` (lines 191-193) AND the two `void audioStop()` calls inside the cancel-during-lead-in branch (line 177) and the `state.status !== 'running'` cleanup effect (line 315). These are the literal structural template — Phase 5 adds a parallel call next to each.

**Why these analogs fit:** Phase 5 D-01 / D-07 explicitly state Wake Lock acquisition fires "parallel with `audioStart(plan)`" and release fires "alongside the existing `void audioStop()`" at every exit path. RESEARCH Pitfall 5 + Code Examples (lines 580-616) document the exact placements. The audio engine's three call sites ARE the Wake Lock's three call sites — same gesture chain, same exit funnel, same cancel branch.

**Hoist-stable-references pattern** (`App.tsx:114-122`):
```typescript
// useAudioCues returns a fresh object literal each render, but its individual
// function fields are wrapped in useCallback([]) so their identities are stable.
// Hoist the stable references so effects can depend on them without re-firing
// every render (the bug: depending on `audio` made the complete useEffect run on
// each render while status was 'complete', repeatedly resetting appPhase to
// 'idle' AND destroying the engine that onStartClick had just rebuilt).
const audioStop = audio.stop
const audioStart = audio.start
const audioNotifyPhaseBoundary = audio.notifyPhaseBoundary
```
**Mirror this verbatim for Wake Lock**: introduce the hook (`const wakeLock = useWakeLock()`) near the existing `useAudioCues` line (`App.tsx:50`), then hoist its methods into stable locals (`const wakeLockRequest = wakeLock.request; const wakeLockRelease = wakeLock.release`) so the cleanup effect's dep array stays narrow. The comment at `App.tsx:114-119` is critical context — depending on the bare `wakeLock` object would re-fire effects every render.

**Site 1 — `onStartClick` lead-in branch** (`App.tsx:185-193`):
```typescript
// CR-01: stamp this start's generation token before any await ...
const generation = ++startGenerationRef.current

setAppPhase('lead-in')
setLeadInDigit(3)

// D-09: AudioContext is constructed inside this user-gesture-derived chain.
const plan = createBreathingPlan(state.selectedSettings)
planRef.current = plan // stored for Task 1b boundary computation
const firstInAudioTime = await audioStart(plan)
```
**Specific structural elements to mirror — RESEARCH Pitfall 5 / Code Examples (lines 580-590):**
- Insert `void wakeLockRequest()` IMMEDIATELY after `setLeadInDigit(3)` and BEFORE `const plan = createBreathingPlan(...)`. This placement:
  1. Keeps the call as gesture-fresh as possible (D-01).
  2. Doesn't depend on `plan` (Wake Lock takes no plan argument).
  3. Doesn't change the existing await chain (preserves existing test contracts — A4).
- Use `void` prefix (mirrors `void audioStop()` convention) — fire-and-forget per D-02; the lead-in countdown must not be blocked by Wake Lock acquisition.
- Do NOT add a try/catch at the call site — the hook's internal try/catch already swallows errors (D-09). A second try/catch at the App level would be defensive-but-redundant.

**Site 2 — `onStartClick` cancel-during-lead-in branch** (`App.tsx:167-179`):
```typescript
// Cancel-during-lead-in branch (Open Question 2 option (a) + checker W4):
if (appPhase === 'lead-in') {
  // CR-01: invalidate any in-flight start whose await audioStart(plan) is still
  // pending. The post-await continuation re-checks startGenerationRef and aborts
  // when the token has been bumped.
  startGenerationRef.current += 1
  clearLeadInTimeouts()
  setLeadInDigit(null)
  setAppPhase('idle')
  audioAnchorRef.current = null
  planRef.current = null
  void audioStop()
  return
}
```
**Specific structural elements to mirror — RESEARCH Code Examples (lines 592-603):**
- Insert `void wakeLockRelease()` IMMEDIATELY after `void audioStop()`, BEFORE the `return`.
- D-08 idempotency: `release()` is a no-op when `sentinelRef.current === null`, so this call is safe even when the user cancels before Wake Lock acquisition has resolved (the in-flight `request()` will write the sentinel later, and the unmount cleanup or the next exit path will release it).

**Site 3 — `state.status !== 'running'` cleanup effect** (`App.tsx:308-343`):
```typescript
useEffect(() => {
  if (state.status !== 'running') {
    // Covers BOTH 'complete' (timed end-of-session) and 'idle' (manual End,
    // modal-confirm End, open-ended End). All four lifecycle exits must
    // reset appPhase + clear engine/anchor refs ...
    void audioStop()
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setAppPhase('idle')
    clearLeadInTimeouts()
    audioAnchorRef.current = null
    planRef.current = null
    lastBoundaryKeyRef.current = null

    // Phase 4 LOCL-02: single write site for stats (Pitfall 1).
    // ...
    const snap = runningSnapshotRef.current
    if (snap !== null && recordedSessionKeyRef.current !== snap.key) {
      // ...
      const updated = recordSession(elapsedMs, isComplete)
      // ...
    }
    runningSnapshotRef.current = null
  }
}, [state, audioStop, clearLeadInTimeouts])
```
**Specific structural elements to mirror — RESEARCH Code Examples (lines 605-616):**
- Insert `void wakeLockRelease()` on the line immediately AFTER `void audioStop()`. Same idempotent fire-and-forget shape.
- Add `wakeLockRelease` to the dep array (mirrors how `audioStop` is in the dep array). The hoisted stable ref makes this safe — RESEARCH explicitly notes "the planner should hoist `wakeLock.release` to a stable local before the effect's dep array (the hook returns a fresh object each render but the methods themselves are `useCallback([])` stable — see `App.tsx:120-122` for the existing precedent)".
- Do NOT add Wake Lock to the unmount cleanup at `App.tsx:394-398` (only `clearLeadInTimeouts` is there). The hook owns its own unmount cleanup internally (Pitfall 6 leak guard inside `useEffect([])`); duplicating at the App level would be redundant.

**Phase 4 wrapping pattern as structural precedent** (`App.tsx:124-138`):
```typescript
// Phase 4 LOCL-01: wrap setSelectedSettings + setMuted to persist on every change.
// The wrapped functions are passed to children in place of the raw setters.
const sessionSetSelectedSettings = session.setSelectedSettings
const audioSetMuted = audio.setMuted

const persistedSetSettings = useCallback((next: SessionSettings) => {
  sessionSetSelectedSettings(next)
  saveSettings(next)
}, [sessionSetSelectedSettings])

const persistedSetMuted = useCallback((next: boolean) => {
  audioSetMuted(next)
  saveMute(next)
}, [audioSetMuted])
```
This is the precedent CONTEXT lines 70-71 explicitly point to — Phase 4's pattern of "add new behavior at the App composition site without modifying prior hooks". Phase 5 follows it: the new `useWakeLock()` is added next to `useAudioCues()`, its methods are hoisted next to `audioStop`/`audioStart`, and call sites are added IN PARALLEL with audio calls — never modifying prior hooks or replacing existing call sites.

---

## Shared Patterns

### Silent-fallback try/catch wrapper (D-09)

**Source:** `src/hooks/useAudioCues.ts:84-121` (Phase 3 D-10) AND `src/storage/storage.ts` Phase 4 D-16/D-17 (storage failures).
**Apply to:** Every async DOM-API call inside `useWakeLock` — `request()`, `release()`, the visibility-listener's re-acquire branch, and the unmount cleanup's release.

```typescript
// Mirror useAudioCues.ts:96-117 — try/catch that flips a flag without re-throwing
try {
  const sentinel = await navigator.wakeLock.request('screen')
  // ...success path: write refs, install listeners
} catch {
  // D-09: NotAllowedError, SecurityError (insecure context), any synchronous throw
  // from an older stub. All silent. No re-throw, no console output (debug optional).
}
```

The shared rule across Phase 3 / Phase 4 / Phase 5 is: **bare `catch {}` (no error binding, no `err.name` branching) is both correct and simplest** for browser-API failure paths in this project (RESEARCH Pitfall 3 + Anti-pattern "Re-implementing rejection codes").

### Hoist-stable-method-refs before effect dep arrays

**Source:** `src/app/App.tsx:114-122`.
**Apply to:** Any new `wakeLock.request` / `wakeLock.release` references inside `useEffect` dep arrays in `App.tsx`.

```typescript
// useAudioCues returns a fresh object literal each render, but its individual
// function fields are wrapped in useCallback([]) so their identities are stable.
// Hoist the stable references so effects can depend on them without re-firing
// every render ...
const audioStop = audio.stop
const audioStart = audio.start
```

The rule: when a hook returns `{ method1, method2, ... }` where each method is `useCallback([])`-stable but the object literal is fresh per render, hoist the methods into bare locals BEFORE referencing them in dep arrays. Otherwise the effect re-runs every render — explicitly documented as a bug Phase 3 fixed.

### Polyfill-and-spy testing seam (D-13)

**Source:** `vitest.setup.ts:71-80` (localStorage), `vitest.setup.ts:195-199` (AudioContext).
**Apply to:** The new `navigator.wakeLock` block in `vitest.setup.ts` AND any per-test failure-path setup in `useWakeLock.test.tsx` / `App.wakeLock.test.tsx`.

```typescript
Object.defineProperty(<target>, '<property>', {
  writable: true,
  configurable: true,  // mandatory — enables per-test overrides
  value: <fake>,
})
```

The `configurable: true` flag is the load-bearing piece — it's why `vi.stubGlobal` works on `AudioContext`, why `localStorage` can be re-defined per test, and why the Wake Lock tests can `delete (navigator as any).wakeLock` for the API-absent failure-path test. RESEARCH Pattern 3 documents the exact shape.

### `useCallback([])` empty deps for imperative hook methods

**Source:** `src/hooks/useAudioCues.ts:123-152` — `stop`, `setMuted`, `notifyPhaseBoundary`, `audioNow` all have empty `[]` deps. Only `start` has `[muted]` because of state coupling.
**Apply to:** Both `request()` and `release()` in `useWakeLock`. Neither couples to React state (D-12 — no React state at all), so empty `[]` is correct AND keeps the hoisted stable-ref pattern at the App level working.

### Match-pair sentinel guard for stale event listeners

**Source:** No project precedent — this is a Wake-Lock-specific pattern from RESEARCH Anti-pattern 4 / Pitfall 1.
**Apply to:** The `'release'` event listener attached to each newly-acquired sentinel inside `useWakeLock.request()`.

```typescript
sentinel.addEventListener('release', () => {
  if (sentinelRef.current === sentinel) {
    sentinelRef.current = null
  }
})
```

This `=== sentinel` identity check ensures a stale listener (from a prior acquire/release cycle) does not clobber a freshly-acquired sentinel ref. Belt-and-braces against A2 (race between OLD sentinel's belated release event and a NEW request resolving). No analog inside the project today; introduce it correctly in Phase 5 for future-proofing.

---

## No Analog Found

| File / Pattern | Reason | Substitute |
|----------------|--------|------------|
| Visibility-listener `useEffect` body | `useAudioCues` has only the unmount cleanup; no project hook installs a `visibilitychange` listener today | RESEARCH Pattern 2 (MDN canonical) + project two-ref refinement (RESEARCH Pattern 1 lines 286-339). Use this verbatim. |
| Sentinel `'release'` event listener with `=== sentinel` identity guard | No project hook listens for OS-initiated release events | RESEARCH Anti-pattern 4 + Pitfall 1 (lines 433, 459-466) — the `if (sentinelRef.current === sentinel)` guard is the documented fix. |
| App-integration silent-fallback test for an absent browser API | Phase 3 D-10 (AC failure) is tested only at the hook level; Phase 4 D-16/D-17 (storage failure) is tested at the storage-utility level; no App-level test exists yet for "API is undefined" | Use the App.audio.test.tsx Test 12 (lines 271-299) "AC construction throws" pattern AS A SHAPE, but adapted: instead of a stubbed-throwing constructor, use `Object.defineProperty(navigator, 'wakeLock', { value: undefined, configurable: true, writable: true })` in a single `beforeEach` for that suite block, restore in `afterEach`. RESEARCH Pattern 3 + Validation Architecture line 785 confirm the test design. |

---

## Metadata

**Analog search scope:**
- `/Users/lucindo/Code/hrv/src/hooks/` (4 files: `useAudioCues.ts`, `useAudioCues.test.tsx`, `useSessionEngine.ts`, `usePrefersReducedMotion.ts`)
- `/Users/lucindo/Code/hrv/src/app/` (6 files: `App.tsx` + 5 `App.*.test.tsx`)
- `/Users/lucindo/Code/hrv/vitest.setup.ts` (1 file, 200 lines)

**Files scanned:** 11 (all read in part or whole). Phase 5 is structurally simple — 5 strong analogs found within the project; no need to widen the search.

**Pattern extraction date:** 2026-05-10

**Confidence:** HIGH — every analog is in-codebase, verified against the actual file contents, and explicitly mentioned by CONTEXT or RESEARCH as the structural precedent. Zero analogs were taken from RESEARCH-only sources (the canonical MDN visibility-re-acquire pattern is the one piece without a direct project analog, and RESEARCH Pattern 2 already supplied the verbatim code).
