# Phase 3: Optional Generated Audio Cues - Pattern Map

**Mapped:** 2026-05-09
**Files analyzed:** 13 (3 modified, 9 new, 1 extended)
**Analogs found:** 13 / 13

> Phase 3 introduces a NEW source-of-sound layer (`src/audio/`) plus a new hook (`useAudioCues`) and a new presentational toggle (`MuteToggle`). No analogous Web Audio code exists in the tree, so all `src/audio/*` modules ride on the *project's pure-domain idiom* established in `src/domain/*` (pure functions, frame-shaped DTOs, no React imports). The hook mirrors the established `useSessionEngine` lifecycle (rAF-style subscribe + cleanup → AudioContext create + close). The component mirrors the existing `SettingsStepper` icon-button pattern (44×44 hit area, Tailwind disabled-opacity, focus-ring tokens). Every test file mirrors the closest existing test idiom (`renderHook` + `act` + `vi.useFakeTimers` for hooks; `render` + `userEvent` + role queries for components).

---

## File Classification

| New/Modified File | Status | Role | Data Flow | Closest Analog | Match Quality |
|---|---|---|---|---|---|
| `src/audio/cueSynth.ts` | new | utility (pure synthesis builders) | transform (plan + AudioContext → CueHandle) | `src/domain/breathingPlan.ts` (pure builder, no React) + `src/domain/sessionMath.ts` (pure transform `getSessionFrame`) | role-match (no Web Audio analog) |
| `src/audio/lookaheadScheduler.ts` | new | utility (pure scheduler factory) | event-driven (setTimeout watchdog → callback) | `src/hooks/useSessionEngine.ts:34-56` (rAF loop with `cancelled` flag + cleanup) | partial (different timer primitive, same loop+cleanup shape) |
| `src/audio/audioEngine.ts` | new | service (AudioContext lifecycle + scheduler binding) | request-response (start/stop/setMuted/scheduleNextCue) | `src/domain/sessionController.ts` (pure state-transition API: `startSession`, `endSession`, `extendTimedSession`) | role-match (lifecycle + transition API shape) |
| `src/audio/cueSynth.test.ts` | new | test (unit, pure) | transform-assertion | `src/domain/breathingPlan.test.ts` + `src/domain/sessionMath.test.ts` | exact (same pure-domain test idiom) |
| `src/audio/lookaheadScheduler.test.ts` | new | test (unit, fake timers) | timer-driven | `src/hooks/useSessionEngine.test.tsx` (fake timers + `vi.advanceTimersByTime`) | partial (no React, just fake timers) |
| `src/audio/audioEngine.test.ts` | new | test (unit, AC stub) | service-call assertion | `src/domain/sessionController.test.ts` (state-transition assertions) + `usePrefersReducedMotion.test.ts` (`vi.spyOn` global) | role-match |
| `src/hooks/useAudioCues.ts` | new | hook (cross-cutting concern) | event-driven (lifecycle + callbacks) | `src/hooks/useSessionEngine.ts` (state machine + useEffect lifecycle + useCallback API) | exact (same hook shape, different resource) |
| `src/hooks/useAudioCues.test.tsx` | new | test (hook lifecycle + AC stub) | event-driven | `src/hooks/useSessionEngine.test.tsx` (`renderHook` + `act` + fake timers) + `usePrefersReducedMotion.test.ts` (mock global pattern) | exact |
| `src/components/MuteToggle.tsx` | new | component (icon toggle button) | request-response (props in, onClick out) | `src/components/SettingsStepper.tsx:42-50` (icon button: 44×44, disabled-opacity, focus ring) + `SessionControls.tsx:11-19` (button class baseline) | exact (icon-button idiom) |
| `src/components/MuteToggle.test.tsx` | new | test (component, RTL) | event-driven | `src/app/App.dialog.test.tsx:10-79` (button-by-role + click + accessible-name assertions) | exact |
| `src/app/App.audio.test.tsx` | new | test (App-level integration) | event-driven | `src/app/App.session.test.tsx:1-130` (full `<App />` render + `userEvent` + role queries) + `App.dialog.test.tsx` (modal lifecycle integration) | exact |
| `vitest.setup.ts` | extend | config (test polyfills) | declarative | self (existing `HTMLDialogElement` and `matchMedia` polyfills, lines 6-44) | exact |
| `src/components/SessionControls.tsx` | modify | component (button strip composition) | request-response | self (current single-button file) | exact (additive: wrap in flex row, host `<MuteToggle/>` sibling) |
| `src/components/BreathingShape.tsx` | modify | component (presentational) | derived-render | self (current orb + in-orb label structure, lines 31-99) | exact (additive: optional `leadInDigit` prop swaps the label, suppresses scale) |
| `src/app/App.tsx` | modify | composition root (state machine) | event-driven | self (current `useSessionEngine` + dialog wiring, lines 10-100) | exact (additive: `appPhase` state, `useAudioCues` wiring, `leadInDigit` plumb to `BreathingShape`) |

---

## Pattern Assignments

### `src/audio/cueSynth.ts` (utility, transform)

**Analog:** `src/domain/breathingPlan.ts` (pure builder, no React imports, default-export-free named exports).
**Secondary analog:** `src/domain/sessionMath.ts` (pure `getSessionFrame` taking plan + scalar → DTO).

**Imports pattern** (mirrors `breathingPlan.ts:1-2`):
```ts
// breathingPlan.ts:1-2
import type { RatioLabel, SessionSettings } from './settings'
import { validateSettings } from './settings'
```
For `cueSynth.ts`: import only types (`AudioContext` is a global) plus any in-tree constants. Do NOT import from React. The module must be importable by a non-React test (`cueSynth.test.ts`) and by `audioEngine.ts`.

**Exported-shape pattern** (mirrors `breathingPlan.ts:4-11` interface + named function):
```ts
// breathingPlan.ts:4-11
export interface BreathingPlan {
  bpm: number
  ratio: RatioLabel
  cycleMs: number
  inhaleMs: number
  exhaleMs: number
  totalMs: number | null
}
```
For `cueSynth.ts`, define `CueHandle` (the return type of every `schedule*Cue` function — must expose the envelope `GainNode` so `audioEngine` can ramp it down on mute, plus `scheduledAt` and `cleanupAt` as documented in `03-RESEARCH.md` Pattern 2 lines 333-339):
```ts
export interface CueHandle {
  envelope: GainNode      // exposed for D-08 mute fade-out
  scheduledAt: number     // audioCtx.currentTime at start
  cleanupAt: number       // when nodes can be GC'd (start + 5*timeConstant + tail)
}
```

**Pure-function pattern** (mirrors `sessionMath.ts:15-34` — input → DTO, no side effects on the inputs, all writes go to fresh AudioNodes):
```ts
// sessionMath.ts:15-34
export function getSessionFrame(plan: BreathingPlan, elapsedMs: number): SessionFrame {
  const safeElapsedMs = Math.max(0, elapsedMs)
  // ... pure math ...
  return { phase: ..., phaseLabel: ..., elapsedMs: safeElapsedMs, ... }
}
```
For `cueSynth.ts`, every export is a pure builder: `scheduleInCue(audioCtx, when, destination)`, `scheduleOutCue(audioCtx, when, destination)`, `scheduleTick(audioCtx, when, destination)`. Each constructs the oscillator/filter/gain chain, calls `start(when)` / `stop(when + tail)`, and returns a `CueHandle`. No module-level mutable state. The strike-and-decay envelope sketch from `03-RESEARCH.md` lines 300-339 is the load-bearing reference; the constants (440 Hz / 220 Hz / 1200 Hz, partial ratios 1.0/2.76/5.40, decay timeConstant 1.4 s / 1.8 s) live as `const` near the top of `cueSynth.ts`, in the same idiom as `breathingPlan.ts:13` (`const MS_PER_MINUTE = 60_000`) and `breathingPlan.ts:15-20` (`const RATIO_PARTS: Record<…> = {…}`).

**Lookup-table pattern** (mirrors `breathingPlan.ts:15-20`):
```ts
// breathingPlan.ts:15-20
const RATIO_PARTS: Record<RatioLabel, { inhale: number; exhale: number }> = {
  '50:50': { inhale: 50, exhale: 50 },
  '40:60': { inhale: 40, exhale: 60 },
  ...
}
```
For `cueSynth.ts`, the partial-ratio table (`{ ratio: 1.0, gain: 1.0 }`, `{ ratio: 2.76, gain: 0.4 }`, `{ ratio: 5.40, gain: 0.15 }`) and the In/Out cue parameter table follow the same shape — module-level `const`, typed via `Record` or a dedicated tuple-array type.

**Error-handling pattern**: there is no try/catch in `breathingPlan.ts` or `sessionMath.ts` — pure functions trust their inputs (validation lives in `settings.ts:validateSettings`). `cueSynth.ts` follows the same posture: trust that `audioCtx.state === 'running'` (the caller `audioEngine.ts` is responsible for ensuring that before calling); do NOT catch oscillator construction errors. The `audioEngine.ts:start()` is the single place that wraps `new AudioContext()` in try/catch (D-10 fallback).

---

### `src/audio/lookaheadScheduler.ts` (utility, event-driven loop)

**Analog:** `src/hooks/useSessionEngine.ts:29-57` (the rAF loop with `cancelled` flag and cleanup return). The audio scheduler is the same shape with `setTimeout` swapped for `requestAnimationFrame` and a different "should I fire?" predicate.

**Loop-with-cleanup pattern** (mirrors `useSessionEngine.ts:29-57`):
```ts
// useSessionEngine.ts:29-57
useEffect(() => {
  if (state.status !== 'running') {
    return undefined
  }

  let animationFrameId = 0
  let cancelled = false

  const tick = () => {
    setState((currentState) => {
      if (currentState.status !== 'running') {
        return currentState
      }
      return completeIfNeeded(currentState, performance.now())
    })

    if (!cancelled) {
      animationFrameId = requestAnimationFrame(tick)
    }
  }

  animationFrameId = requestAnimationFrame(tick)

  return () => {
    cancelled = true
    cancelAnimationFrame(animationFrameId)
  }
}, [state.status])
```
For `lookaheadScheduler.ts` (sketch from `03-RESEARCH.md` lines 232-264 is the reference): export a single pure factory `startScheduler(audioCtx, getNextBoundaryAudioTime, scheduleAtTime): { stop(): void }`. Inside, mirror the `cancelled`-flag idiom — store `timeoutId`, define `tick`, recursively re-arm via `window.setTimeout(tick, LOOKAHEAD_MS)`, and return `{ stop() { window.clearTimeout(timeoutId) } }`. The 25 ms `LOOKAHEAD_MS` and 0.1 s `SCHEDULE_AHEAD_SEC` constants live as module-level `const` (mirrors `breathingPlan.ts:13`).

**Why a pure factory and not a hook:** `useSessionEngine.ts` owns React state via `useState` because its consumer is the App. The audio scheduler's consumer is `audioEngine.ts` (a service), which is itself owned by `useAudioCues`. Pushing the scheduler down to a pure factory keeps it unit-testable without `renderHook` (mirrors how `sessionController.ts` is a pure module that `useSessionEngine.ts` wraps).

**Error handling:** none. The two callbacks (`getNextBoundaryAudioTime`, `scheduleAtTime`) are caller-controlled and trusted. If `getNextBoundaryAudioTime` returns `null`, the loop continues (re-checks next tick) — natural end-of-session behavior. The `stop()` function is idempotent.

**Test pattern** (mirrors `useSessionEngine.test.tsx:13-22` fake-timers harness):
```ts
// useSessionEngine.test.tsx:13-22
describe('useSessionEngine', () => {
  beforeEach(() => {
    vi.useFakeTimers()
    vi.setSystemTime(new Date('2026-05-09T00:00:00.000Z'))
  })

  afterEach(() => {
    vi.useRealTimers()
  })
```
Apply directly to `lookaheadScheduler.test.ts`. Use `vi.advanceTimersByTime(25)` to step the watchdog, assert `scheduleAtTime` mock-call count and arguments, and call `handle.stop()` then `vi.advanceTimersByTime(100)` to assert no further callbacks fire after stop.

---

### `src/audio/audioEngine.ts` (service, request-response API)

**Analog:** `src/domain/sessionController.ts` (the named-export state-transition surface — `startSession`, `endSession`, `extendTimedSession`, `completeIfNeeded`).
**Secondary analog:** `src/hooks/useSessionEngine.ts` (lifecycle bookkeeping that the hook layer wraps).

**Module shape** (mirrors `sessionController.ts:1-32` — discriminated state types + named-export operations):
```ts
// sessionController.ts:7-32
export type SessionStatus = 'idle' | 'running' | 'complete'

export interface IdleSessionState {
  status: 'idle'
  selectedSettings: SessionSettings
}
export interface RunningSessionState {
  status: 'running'
  selectedSettings: SessionSettings
  lockedSettings: SessionSettings
  plan: BreathingPlan
  startedAtMs: number
  lastFrame: SessionFrame
}
// ...
export type SessionState = IdleSessionState | RunningSessionState | CompleteSessionState
```
For `audioEngine.ts`: define `AudioEngine` as the public interface (the API shape sketched in `03-RESEARCH.md` lines 359-370) and a factory `createAudioEngine(): Promise<AudioEngine>`. The factory is the only place that calls `new AudioContext()` (D-09: must be reachable from a user-gesture click). Wrap construction in try/catch; on failure, the factory's promise rejects so `useAudioCues.start()` can flip `audioAvailable=false` (D-10). This mirrors `sessionController.ts:59-69` (`extendTimedSession` throwing `RangeError` on invalid inputs, caught by `useSessionEngine.ts:103-110`).

**Lifecycle pattern** (mirrors `sessionController.ts:38-50` `startSession`):
```ts
// sessionController.ts:38-50
export function startSession(selectedSettings: SessionSettings, nowMs: number): RunningSessionState {
  const lockedSettings = cloneSettings(selectedSettings)
  const plan = createBreathingPlan(lockedSettings)

  return {
    status: 'running',
    selectedSettings: cloneSettings(selectedSettings),
    lockedSettings,
    plan,
    startedAtMs: nowMs,
    lastFrame: getSessionFrame(plan, 0),
  }
}
```
For `audioEngine.ts`: `createAudioEngine` constructs the AC, captures `audioCtx.currentTime` as the t=0 anchor, instantiates the `lookaheadScheduler` from `lookaheadScheduler.ts`, and returns an object with bound methods. The "anchor at start" pattern is identical in spirit to `sessionController.ts:47` (`startedAtMs: nowMs`).

**Mute fade pattern** (the load-bearing D-08 implementation):
```ts
// 03-RESEARCH.md lines 471-481
function applyMuteFadeOut(activeCue: CueHandle, audioCtx: AudioContext) {
  const NOW = audioCtx.currentTime
  activeCue.envelope.gain.cancelAndHoldAtTime(NOW)
  activeCue.envelope.gain.setTargetAtTime(0.0001, NOW, 0.05)
}
```
Per `03-RESEARCH.md` Pitfall 9 (lines 575-579), include the cross-browser fallback: if `cancelAndHoldAtTime` is unavailable, use `cancelScheduledValues(NOW)` followed by `setValueAtTime(envelope.gain.value, NOW)`. There is no analog for this pattern in the tree because no audio code exists; the canonical reference is the cited MDN + Chris Wilson sources in `03-RESEARCH.md` Sources section.

**Cleanup pattern** (mirrors `useSessionEngine.ts:53-56` cleanup return value):
```ts
// useSessionEngine.ts:53-56
return () => {
  cancelled = true
  cancelAnimationFrame(animationFrameId)
}
```
For `audioEngine.ts.close()`: `await audioCtx.close()`, call `scheduler.stop()`, null out internal references. The `useAudioCues.useEffect` cleanup (mirroring `useSessionEngine.ts:53-56`) calls `engine.close()` on unmount and on session-end paths (D-11).

**Test pattern** (mirrors `sessionController.test.ts:11-31` discrete state-transition tests + `usePrefersReducedMotion.test.ts:14-30` global-stub pattern):
```ts
// usePrefersReducedMotion.test.ts:17-26
vi.spyOn(window, 'matchMedia').mockReturnValue({
  matches: true,
  media: '(prefers-reduced-motion: reduce)',
  // ...
} as unknown as MediaQueryList)
```
For `audioEngine.test.ts`: the `vitest.setup.ts` polyfill provides a default `FakeAudioContext`; per-test override via `vi.stubGlobal('AudioContext', class { … })` (or by mutating the polyfill class to throw in its constructor) to exercise the D-10 failure path. Spy on the returned engine's internal `start`/`stop` calls via the FakeOscillatorNode/FakeGainNode `vi.fn()` slots (defined in the polyfill, see `03-RESEARCH.md` Code Examples lines 587-647).

---

### `src/audio/cueSynth.test.ts` (test, pure transform assertion)

**Analog:** `src/domain/breathingPlan.test.ts` and `src/domain/sessionMath.test.ts` (pure-domain tests — `describe` + `it` + `expect`, no React, no fake timers).

**Test-file shape** (mirrors `sessionController.test.ts:1-15`):
```ts
// sessionController.test.ts:1-15
import { describe, expect, it } from 'vitest'

import type { SessionSettings } from './settings'
import {
  completeIfNeeded,
  endSession,
  extendTimedSession,
  startSession,
} from './sessionController'

const baseSettings: SessionSettings = {
  bpm: 5.5,
  ratio: '40:60',
  durationMinutes: 10,
}
```
For `cueSynth.test.ts`: import `vitest` primitives, import the `schedule*Cue` builders, construct a `FakeAudioContext` (the polyfill is loaded by `vitest.setup.ts`), invoke each builder, and assert on the returned `CueHandle` shape AND on the spy calls inside the polyfill's `FakeOscillatorNode.start`/`stop` and `FakeAudioParam.setValueAtTime`/`setTargetAtTime` mocks. Example assertion idioms borrowed from `sessionController.test.ts:42-55` (assert specific properties on the returned state object) translate to "assert specific oscillator counts, frequency values, and envelope ramp parameters on the returned CueHandle".

**No describe-block nesting** — `breathingPlan.test.ts` and `sessionController.test.ts` use a single top-level `describe('breathing plan', () => {...})` per file. Follow the same.

---

### `src/audio/lookaheadScheduler.test.ts` (test, fake-timer driven)

**Analog:** `src/hooks/useSessionEngine.test.tsx:13-50` (fake-timers harness with `vi.advanceTimersByTime`), but WITHOUT React (`renderHook` not needed).

**Setup pattern** (mirrors `useSessionEngine.test.tsx:13-22`):
```ts
// useSessionEngine.test.tsx:13-22
beforeEach(() => {
  vi.useFakeTimers()
  vi.setSystemTime(new Date('2026-05-09T00:00:00.000Z'))
})

afterEach(() => {
  vi.useRealTimers()
})
```
For `lookaheadScheduler.test.ts`: same `beforeEach`/`afterEach`. Construct a `FakeAudioContext` directly (no React), supply controllable `getNextBoundaryAudioTime` and `scheduleAtTime` mocks via `vi.fn()`, call `startScheduler(...)`, advance timers in 25 ms steps, assert call counts and argument values. Verify `stop()` halts further callbacks (mirrors the unmount-cancels-rAF assertion implicit in `useSessionEngine.test.tsx:33` `unmount()`).

**Asserting "no parallel timer" invariant**: provide a `currentTime` that ticks faster than the scheduler interval; assert that `scheduleAtTime` is called with `audioCtx.currentTime` derived values, NEVER with `Date.now()`-derived values. This is the load-bearing anti-drift assertion for `03-RESEARCH.md` Pitfall 2.

---

### `src/audio/audioEngine.test.ts` (test, AC stub + state-transition assertions)

**Analog:** `src/domain/sessionController.test.ts` (state-transition + error-throwing assertions).
**Secondary analog:** `src/hooks/usePrefersReducedMotion.test.ts:53-80` (the IN-02 re-seed test — pattern for asserting "the right primitive was called at the right moment").

**Failure-path pattern** (mirrors `sessionController.test.ts:79-85` — the `extendTimedSession` `RangeError` path):
```ts
// sessionController.test.ts:79-85
expect(() => extendTimedSession(extended, 15)).toThrow(RangeError)
expect(() => extendTimedSession(extended, 10)).toThrow(RangeError)
expect(() => extendTimedSession(extended, Number.POSITIVE_INFINITY)).toThrow(RangeError)
```
For `audioEngine.test.ts`: `vi.stubGlobal('AudioContext', class { constructor() { throw new Error('blocked') } })`, then assert that `await createAudioEngine()` rejects (or returns a typed failure). This is the D-10 unit-test anchor.

**Lifecycle assertion pattern** (mirrors `sessionController.test.ts:33-41` ending state):
```ts
// sessionController.test.ts:33-41
const running = startSession(baseSettings, 1_000)
const extended = extendTimedSession(running, 15)
expect(endSession(extended)).toEqual({
  status: 'idle',
  selectedSettings: { ...baseSettings, durationMinutes: 15 },
})
```
For `audioEngine.test.ts`: assert that after `engine.close()`, the FakeAudioContext's `close` mock was called exactly once and the engine's subsequent `scheduleNextCue()` calls are no-ops (or throw).

**Spy-on-stub pattern** (mirrors `usePrefersReducedMotion.test.ts:32-51`):
```ts
// usePrefersReducedMotion.test.ts:32-51
const addSpy = vi.fn()
const removeSpy = vi.fn()
vi.spyOn(window, 'matchMedia').mockReturnValue({
  matches: false,
  // ...
  addEventListener: addSpy,
  removeEventListener: removeSpy,
  // ...
} as unknown as MediaQueryList)

const { unmount } = renderHook(() => usePrefersReducedMotion())
expect(addSpy).toHaveBeenCalledWith('change', expect.any(Function))

unmount()
expect(removeSpy).toHaveBeenCalledWith('change', expect.any(Function))
```
For `audioEngine.test.ts`: capture references to the FakeOscillatorNode / FakeGainNode instances created during `engine.scheduleNextCue(...)` and assert specific calls on them (`oscillator.start.mock.calls[0][0]` equals the expected `audioCtx.currentTime + Δ`, `envelope.gain.setTargetAtTime` was called with `(0.0001, NOW, 0.05)` on mute, etc.). The polyfill's `vi.fn()` slots make every audio-graph mutation introspectable.

---

### `src/hooks/useAudioCues.ts` (hook, lifecycle + callbacks)

**Analog:** `src/hooks/useSessionEngine.ts` (the canonical hook shape: state machine + useEffect lifecycle + named useCallback handlers + a single returned object).

**Imports pattern** (mirrors `useSessionEngine.ts:1-12`):
```ts
// useSessionEngine.ts:1-12
import { useCallback, useEffect, useMemo, useState } from 'react'

import type { SessionFrame } from '../domain/sessionMath'
import type { SessionSettings } from '../domain/settings'
import { DEFAULT_SETTINGS } from '../domain/settings'
import {
  completeIfNeeded,
  endSession,
  extendTimedSession,
  startSession,
  type SessionState,
} from '../domain/sessionController'
```
For `useAudioCues.ts`: import `useCallback, useEffect, useRef, useState` from React; import `BreathingPlan` type from `../domain/breathingPlan`; import `createAudioEngine`, `type AudioEngine` from `../audio/audioEngine`. The pattern of importing pure-module operations + types into a hook layer is identical.

**Public-interface + return pattern** (mirrors `useSessionEngine.ts:14-21` + `:115-122`):
```ts
// useSessionEngine.ts:14-21
export interface SessionEngine {
  state: SessionState
  currentFrame: SessionFrame | null
  setSelectedSettings(settings: SessionSettings): void
  start(): void
  end(): void
  extendDuration(durationMinutes: number): void
}
```
```ts
// useSessionEngine.ts:115-122
return {
  state,
  currentFrame,
  setSelectedSettings,
  start,
  end,
  extendDuration,
}
```
For `useAudioCues.ts`, define `UseAudioCues` exactly as sketched in `03-RESEARCH.md` lines 359-370 (`status`, `audioAvailable`, `start`, `stop`, `notifyPhaseBoundary`, `setMuted`, `muted`). Return a single object literal. Each callback is a `useCallback` with a minimal dependency array.

**Lifecycle cleanup pattern** (the load-bearing D-11 anchor; mirrors `useSessionEngine.ts:29-57` exactly):
```ts
// useSessionEngine.ts:29-57
useEffect(() => {
  if (state.status !== 'running') {
    return undefined
  }

  let animationFrameId = 0
  let cancelled = false

  const tick = () => { /* ... */ }

  animationFrameId = requestAnimationFrame(tick)

  return () => {
    cancelled = true
    cancelAnimationFrame(animationFrameId)
  }
}, [state.status])
```
For `useAudioCues.ts`: a single mount-effect (deps `[]`) returns a cleanup that `void engine.close()` + nulls the ref. This mirrors the "always-cleanup-on-unmount" guarantee. The `start()` callback creates the engine and stores it in a `useRef` (NOT in `useState`, to avoid render-reactivity for an imperative resource — same reason `useSessionEngine.ts` doesn't put `animationFrameId` in state).

**State-update pattern** (mirrors `useSessionEngine.ts:77-85`):
```ts
// useSessionEngine.ts:77-85
const start = useCallback(() => {
  setState((currentState) => {
    if (currentState.status === 'running') {
      return currentState
    }
    return startSession(currentState.selectedSettings, performance.now())
  })
}, [])
```
For `useAudioCues.ts.start(plan)`: set status to `'starting'`, await `createAudioEngine()`, on success set status to `'lead-in'` and store the engine in the ref; on failure set `audioAvailable=false` and status to `'failed'` (D-10). The error-handling shape mirrors `useSessionEngine.ts:103-110`:
```ts
// useSessionEngine.ts:103-110
try {
  return extendTimedSession(currentState, durationMinutes)
} catch (error) {
  if (error instanceof RangeError) {
    return currentState
  }
  throw error
}
```
The `useAudioCues.start` catch updates state to the failure branch instead of returning unchanged state — same shape, different recovery action.

---

### `src/hooks/useAudioCues.test.tsx` (test, hook + AC stub)

**Analog:** `src/hooks/useSessionEngine.test.tsx` (full hook lifecycle harness with `renderHook`, `act`, fake timers).
**Secondary analog:** `src/hooks/usePrefersReducedMotion.test.ts` (mock-global-resource pattern for the AC-failure path).

**Test-file shape** (mirrors `useSessionEngine.test.tsx:1-22`):
```tsx
// useSessionEngine.test.tsx:1-22
import { act, renderHook } from '@testing-library/react'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

import type { SessionSettings } from '../domain/settings'
import { useSessionEngine } from './useSessionEngine'

const defaultSettings: SessionSettings = {
  bpm: 5.5,
  ratio: '40:60',
  durationMinutes: 10,
}

describe('useSessionEngine', () => {
  beforeEach(() => {
    vi.useFakeTimers()
    vi.setSystemTime(new Date('2026-05-09T00:00:00.000Z'))
  })
```
For `useAudioCues.test.tsx`: same imports, same `vi.useFakeTimers()` setup. Declare a `defaultPlan: BreathingPlan` constant (mirrors `defaultSettings`).

**Hook lifecycle assertion pattern** (mirrors `useSessionEngine.test.tsx:23-34`):
```tsx
// useSessionEngine.test.tsx:23-34
it('starts from idle and immediately exposes an In frame', () => {
  const { result, unmount } = renderHook(() => useSessionEngine(defaultSettings))

  act(() => {
    result.current.start()
  })

  expect(result.current.state.status).toBe('running')
  expect(result.current.currentFrame?.phaseLabel).toBe('In')

  unmount()
})
```
For `useAudioCues.test.tsx`: `renderHook(() => useAudioCues())`, `await act(async () => { await result.current.start(defaultPlan) })`, assert `result.current.status === 'lead-in'` and `result.current.audioAvailable === true`. Always call `unmount()` to exercise the cleanup `engine.close()` path.

**Failure-path pattern** (mirrors `usePrefersReducedMotion.test.ts:14-30`):
```ts
// usePrefersReducedMotion.test.ts:14-30
vi.spyOn(window, 'matchMedia').mockReturnValue({
  matches: true,
  // ...
} as unknown as MediaQueryList)

const { result } = renderHook(() => usePrefersReducedMotion())
expect(result.current).toBe(true)
```
For `useAudioCues.test.tsx`: `vi.stubGlobal('AudioContext', class { constructor() { throw new Error('blocked') } })`, then assert `await result.current.start(plan)` resolves with `result.current.status === 'failed'` and `result.current.audioAvailable === false`. This is the D-10 hook-level test anchor.

**Cleanup-on-unmount pattern** (mirrors `useSessionEngine.test.tsx:33` `unmount()` + Pitfall 3 in research):
After a successful `start()`, capture the FakeAudioContext instance, call `unmount()`, assert `fakeAc.close.mock.calls.length === 1`. This is the rapid-Start/End leak guard (`03-RESEARCH.md` Pitfall 3).

---

### `src/components/MuteToggle.tsx` (component, icon toggle button)

**Analog:** `src/components/SettingsStepper.tsx:42-50` (the `−`/`+` icon-button pattern: `size-12 min-h-11 min-w-11`, disabled-opacity, focus-ring tokens).
**Secondary analog:** `src/components/SessionControls.tsx:11-19` (button class baseline, `motion-reduce:transition-none`, `focus-visible:ring-breathing-accent`).

**Imports pattern** (mirrors `SessionControls.tsx:1-2`):
```tsx
// SessionControls.tsx:1-2
import type { SessionStatus } from '../domain/sessionController'

export interface SessionControlsProps {
  status: SessionStatus
  onStart(): void
  onEnd(): void
}
```
For `MuteToggle.tsx`: the props interface has no domain imports — `muted: boolean`, `audioAvailable: boolean`, `onToggle(): void`, exactly as sketched in `03-RESEARCH.md` lines 657-662. The exact prop shape:
```tsx
export interface MuteToggleProps {
  muted: boolean
  audioAvailable: boolean
  onToggle(): void
}
```

**Icon-button class pattern** (mirrors `SettingsStepper.tsx:42-50` line-for-line):
```tsx
// SettingsStepper.tsx:42-50
<button
  type="button"
  aria-label={`Decrease ${label}`}
  className="grid size-12 min-h-11 min-w-11 place-items-center rounded-full border border-teal-200 bg-white text-2xl leading-none text-teal-800 shadow-sm transition hover:bg-teal-50 active:bg-teal-100 motion-reduce:transition-none focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-breathing-accent focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-45"
  disabled={disabled || disableDecrease || !canDecrease}
  onClick={() => changeBy(-1)}
>
  −
</button>
```
For `MuteToggle.tsx`: copy this class string, swapping `size-12` for `size-11` per `03-RESEARCH.md` line 690 ("size-11 = 44 px ... matches the Phase 2 D-17 hit-area floor"). Add `aria-pressed={muted}` (the WAI-ARIA toggle-state attribute, not present on the stepper because the stepper is not a toggle). Wrap an inline `<svg>` (speaker / speaker-with-slash) instead of the `−` text glyph. The `disabled:opacity-45` token is the D-10 disabled affordance — verbatim from `SettingsStepper.tsx:45`.

**Accessible-name pattern** — action-verb labels (`Mute audio cues` / `Unmute audio cues` / `Audio unavailable in this browser`) per `03-RESEARCH.md` lines 663-668. The closest analog for "label changes with state" is `SettingsStepper.tsx:44`/`SettingsStepper.tsx:59` (`Decrease ${label}` / `Increase ${label}`) — the stepper interpolates a static template per button. `MuteToggle.tsx` interpolates per state. Same idiom, different axis.

**Inline-SVG choice** — there is no existing icon component in the tree (`grep -r 'svg' src/` shows no `.svg` imports or icon components). Per `03-RESEARCH.md` line 691: "a 24-line inline SVG per icon is sufficient". Add two small functional components `<SpeakerIcon aria-hidden="true" />` and `<SpeakerSlashIcon aria-hidden="true" />` at the bottom of `MuteToggle.tsx` (or in a sibling `MuteToggleIcons.tsx`). Each renders a single `<svg>` with `width={20} height={20} fill="currentColor"` so the `text-teal-800` parent class colors them.

---

### `src/components/MuteToggle.test.tsx` (test, RTL component test)

**Analog:** `src/app/App.dialog.test.tsx:10-79` (component-level RTL test with `render`, `screen.getByRole`, `userEvent.setup()`, accessible-name assertions).

**Test-file shape** (mirrors `App.dialog.test.tsx:1-19`):
```tsx
// App.dialog.test.tsx:1-19
import '@testing-library/jest-dom/vitest'

import { act, fireEvent, render, screen, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { afterEach, describe, expect, it, vi } from 'vitest'

import { EndSessionDialog } from '../components/EndSessionDialog'
import App from './App'

function renderDialog(
  props: Partial<{ open: boolean; onConfirm: () => void; onCancel: () => void }> = {},
) {
  const onConfirm = props.onConfirm ?? vi.fn()
  const onCancel = props.onCancel ?? vi.fn()
  const utils = render(
    <EndSessionDialog open={props.open ?? false} onConfirm={onConfirm} onCancel={onCancel} />,
  )
  return { ...utils, onConfirm, onCancel }
}
```
For `MuteToggle.test.tsx`: same imports; helper `renderToggle(props: Partial<MuteToggleProps>)` mirrors `renderDialog` shape (defaults via `??`, returns `{ ...utils, onToggle }`).

**Accessible-name + click assertions** (mirrors `App.dialog.test.tsx:34-79`):
```tsx
// App.dialog.test.tsx:61-69
it('calls onConfirm when End is clicked', async () => {
  const user = userEvent.setup()
  const { onConfirm, onCancel } = renderDialog({ open: true })

  await user.click(screen.getByRole('button', { name: 'End' }))

  expect(onConfirm).toHaveBeenCalledTimes(1)
  expect(onCancel).not.toHaveBeenCalled()
})
```
For `MuteToggle.test.tsx`: assert that `screen.getByRole('button', { name: 'Mute audio cues' })` has `aria-pressed="false"` when `muted=false`; click it, assert `onToggle` was called once. Re-render with `muted=true`, assert role+name `'Unmute audio cues'` and `aria-pressed="true"`. Re-render with `audioAvailable=false`, assert `screen.getByRole('button', { name: 'Audio unavailable in this browser' })` has the `disabled` attribute and clicking it does NOT invoke `onToggle`.

**44×44 hit area assertion** — assert that the rendered button's `className` includes `min-h-11` and `min-w-11` (or `size-11`). Mirrors the pattern used in `App.dialog.test.tsx:118-120`:
```tsx
// App.dialog.test.tsx:118-120
expect(button.className).toMatch(/focus-visible:outline-none/)
expect(button.className).toMatch(/focus-visible:ring-2/)
```

---

### `src/app/App.audio.test.tsx` (test, App-level integration)

**Analog:** `src/app/App.session.test.tsx` (full `<App />` render, `userEvent.setup()`, role/name queries).
**Secondary analog:** `src/app/App.dialog.test.tsx` (modal-lifecycle integration patterns for the end-session-during-lead-in case).

**Test-file shape** (mirrors `App.session.test.tsx:1-16`):
```tsx
// App.session.test.tsx:1-16
import '@testing-library/jest-dom/vitest'

import { act, fireEvent, render, screen, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

import App from './App'

function settingGroup(name: string) {
  return screen.getByRole('group', { name })
}

function sessionReadout() {
  return screen.getByRole('region', { name: 'Session readout' })
}
```
For `App.audio.test.tsx`: same shell. Add helper `muteButton()` that returns `screen.getByRole('button', { name: /(Mute|Unmute) audio cues|Audio unavailable in this browser/ })`.

**Click-to-start assertion pattern** (mirrors `App.session.test.tsx:23-33`):
```tsx
// App.session.test.tsx:23-33
it('immediately shows the current In phase after starting a session (orb hosts the label per D-03)', async () => {
  const user = userEvent.setup()
  render(<App />)

  await user.click(screen.getByRole('button', { name: 'Start session' }))

  expect(screen.getByRole('img', { name: 'Breathing shape: In' })).toBeVisible()
  expect(sessionReadout()).toBeVisible()
})
```
For `App.audio.test.tsx`:
- Lead-in numerals visible: after `await user.click(Start)`, assert `screen.getByText('3')` is in the orb (use `screen.getByRole('img', { name: 'Lead-in: 3' })` if `BreathingShapeLeadIn` provides that aria-label per `03-RESEARCH.md` line 743).
- AC created on Start: spy on `window.AudioContext` constructor; click Start; assert spy called once with no args (or with the locked options from `useAudioCues`).
- AC closed on each end path: click `End session` (or click confirm in modal); assert the FakeAudioContext's `close` mock was called.
- AC failed → muted-disabled icon: stub `AudioContext` to throw; assert the mute icon button has `disabled` and `name="Audio unavailable in this browser"`; assert visuals still render.
- End-during-lead-in (`03-RESEARCH.md` Open Question 2 — recommended option (a) cancel back to idle without modal): click Start, advance fake timers 500 ms, click End; assert no modal appears, app is back to idle, `AudioContext.close()` was called.

**Fake-timer + clock-advancement pattern** (mirrors `useSessionEngine.test.tsx:42-44`):
```tsx
// useSessionEngine.test.tsx:42-44
act(() => {
  vi.advanceTimersByTime(5_000)
})
```
For the lead-in numeral progression test: after `await user.click(Start)`, `act(() => { vi.advanceTimersByTime(1000) })`, assert `getByText('2')`; advance another 1000 ms, assert `getByText('1')`; advance another 1000 ms, assert `getByRole('img', { name: 'Breathing shape: In' })` (numerals replaced by first In frame at t=0, per D-14).

---

### `vitest.setup.ts` (config, extend polyfills)

**Analog:** self (`vitest.setup.ts:6-44` — existing `HTMLDialogElement` and `matchMedia` polyfills).

**Extension pattern** (mirrors `vitest.setup.ts:6-24` `HTMLDialogElement` polyfill structure):
```ts
// vitest.setup.ts:6-24
if (typeof HTMLDialogElement !== 'undefined') {
  if (!HTMLDialogElement.prototype.showModal) {
    HTMLDialogElement.prototype.showModal = function () {
      this.open = true
    }
  }
  // ... etc ...
}
```
The Phase 3 addition is a guarded class-on-window install (mirrors `vitest.setup.ts:30-44` `matchMedia` polyfill which uses `Object.defineProperty(window, 'matchMedia', { writable: true, value: ... })`). The full polyfill body is verbatim from `03-RESEARCH.md` Code Examples lines 587-647 (`FakeAudioParam`, `FakeAudioNode`, `FakeOscillatorNode`, `FakeGainNode`, `FakeBiquadFilterNode`, `FakeAudioContext`, then `Object.defineProperty(window, 'AudioContext', { writable: true, value: FakeAudioContext })`).

**Critical detail**: the polyfill MUST use `vi.fn()` for every method-spy slot (`start`, `stop`, `setValueAtTime`, `setTargetAtTime`, etc.) so `audioEngine.test.ts` and `useAudioCues.test.tsx` can introspect calls. Mirrors how the existing tests rely on jsdom's `HTMLDialogElement.prototype.close` setter for assertions.

**Comment-citation pattern** (mirrors `vitest.setup.ts:3-5` and `:27-29` — every polyfill carries a short rationale + source comment):
```ts
// vitest.setup.ts:3-5
// HTMLDialogElement polyfill — jsdom 29.1.1 does not implement show/showModal/close.
// Source: 02-RESEARCH.md Pitfall 1 / Code Examples; verified against
// github.com/jestjs/jest/issues/13010 and github.com/jsdom/jsdom/issues/3294.
```
Add: `// AudioContext polyfill — jsdom 29.1.1 does not implement Web Audio. Source: 03-RESEARCH.md Code Examples; verified against github.com/jsdom/jsdom/issues/2900.`

---

### `src/components/SessionControls.tsx` (modify, additive)

**Analog:** self (current single-button file, lines 1-21).

**Existing structure to preserve** (lines 1-21 verbatim except for the additive wrap):
```tsx
// SessionControls.tsx:9-20
export function SessionControls({ status, onStart, onEnd }: SessionControlsProps) {
  const isRunning = status === 'running'

  return (
    <button
      type="button"
      className="mt-6 min-h-11 w-full rounded-full bg-teal-700 px-6 py-4 text-lg font-semibold text-white shadow-lg shadow-teal-900/20 transition hover:bg-teal-800 active:bg-teal-900 motion-reduce:transition-none focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-breathing-accent focus-visible:ring-offset-2"
      onClick={isRunning ? onEnd : onStart}
    >
      {isRunning ? 'End session' : 'Start session'}
    </button>
  )
}
```

**Additive transformation** (per `03-RESEARCH.md` Code Examples lines 696-712):
1. Extend props interface: add `muted: boolean`, `audioAvailable: boolean`, `onMuteToggle(): void`. Type these inline on the destructure or extend `SessionControlsProps`.
2. Wrap the existing button in a `<div className="mt-6 flex items-center gap-3">`. The `mt-6` class moves OFF the button and onto the wrapper (preserves vertical spacing).
3. Change the primary button's classes from `mt-6 min-h-11 w-full ...` to `min-h-11 flex-1 ...` (drop `mt-6`, swap `w-full` for `flex-1`). All other classes verbatim.
4. After the primary button, render `<MuteToggle muted={muted} audioAvailable={audioAvailable} onToggle={onMuteToggle} />`.

**Locked-copy preservation** (Phase 1 D-11, D-15): the `'Start session'` / `'End session'` strings remain verbatim. The Phase 1 + Phase 2 tests in `App.session.test.tsx:26` and `App.dialog.test.tsx` query by these names — must not break.

**End-during-lead-in case** (per `03-RESEARCH.md` Open Question 2): the recommended option (a) means the parent `App.tsx` controls whether the primary button shows `Start session` / `End session` / `Cancel`. SessionControls itself does NOT need a third state — the parent passes the appropriate `onStart`/`onEnd` and label-driving status. Confirm copy in the planner phase if uncertain.

---

### `src/components/BreathingShape.tsx` (modify, additive)

**Analog:** self (current orb structure, lines 1-99).

**Existing wrapper-split pattern to preserve** (lines 24-29 — the IN-04 wrapper that gates the `usePrefersReducedMotion` mount on `frame !== null`):
```tsx
// BreathingShape.tsx:24-29
export function BreathingShape({ frame }: BreathingShapeProps) {
  if (frame === null) {
    return null
  }
  return <BreathingShapeBody frame={frame} />
}
```

**Additive transformation** (per `03-RESEARCH.md` Code Examples lines 723-761):
1. Extend `BreathingShapeProps`: add optional `leadInDigit?: 3 | 2 | 1 | null`.
2. Update the wrapper:
   ```tsx
   export function BreathingShape({ frame, leadInDigit }: BreathingShapeProps) {
     if (frame === null && leadInDigit == null) return null
     if (leadInDigit != null) return <BreathingShapeLeadIn digit={leadInDigit} />
     return <BreathingShapeBody frame={frame!} />
   }
   ```
3. Add a sibling `BreathingShapeLeadIn({ digit })` component. Reuse the orb structure from `BreathingShapeBody` (lines 41-98) but: (a) no scaling — orb stays at `MID_SCALE` (0.79, line 17); (b) display the digit in the same large-display position as the In/Out label; (c) no `data-phase`/`data-progress` attributes; (d) `aria-label={\`Lead-in: ${digit}\`}` instead of `Breathing shape: ${frame.phaseLabel}`.

**Reused structural elements** (verbatim from `BreathingShape.tsx:53-97`):
- The outer `<div role="img" aria-label="..." className="relative mx-auto my-12 grid place-items-center" style={{ width: 'var(--orb-size)', height: 'var(--orb-size)' }}>` wrapper.
- The two `aria-hidden="true"` reference rings (`orb-ring--outer` at lines 54-57, `orb-ring--inner` at lines 63-70 with the `MIN_SCALE * 100%` width/height).
- The scaled `.orb` host with the `style={{ transform: \`scale(${MID_SCALE})\` }}` (only the `orb-layer--in` gradient rendered — no Out crossfade during lead-in, since this is a neutral pre-state).

**Digit typography** (per `03-RESEARCH.md` line 767, distinct from the In/Out label):
```tsx
<span className="relative z-10 text-7xl font-semibold tracking-tight text-slate-900 sm:text-8xl">
  {digit}
</span>
```
One step larger than the existing label's `text-5xl sm:text-6xl` (line 87) so the countdown visually dominates.

**Reduced-motion behavior** during lead-in: locked-orb-at-MID_SCALE is identical to Phase 2 D-06 reduced-motion mode (line 39 `const orbScale = reducedMotion ? MID_SCALE : liveScale`). The lead-in component does NOT need to call `usePrefersReducedMotion` — the orb is already neutralized for everyone.

---

### `src/app/App.tsx` (modify, additive composition)

**Analog:** self (current `useSessionEngine` + dialog wiring, lines 1-100).

**Existing structure to preserve** (lines 11-12 + 14 — session hook + idle/running flag + modal state):
```tsx
// App.tsx:11-14
const session = useSessionEngine()
const { state } = session
const isRunning = state.status === 'running'
const [endDialogOpen, setEndDialogOpen] = useState<boolean>(false)
```

**Additive transformations**:
1. Add `useAudioCues` instantiation: `const audio = useAudioCues()` (mirrors `const session = useSessionEngine()` at line 11).
2. Add `appPhase` state: `const [appPhase, setAppPhase] = useState<'idle' | 'lead-in' | 'running'>('idle')`. This is the lead-in state machine (`03-RESEARCH.md` Pattern 4).
3. Add `leadInDigit` derived state: a `useState<3 | 2 | 1 | null>(null)` that the lead-in driver advances every 1 s during `appPhase === 'lead-in'`.
4. Modify the click handler chain. The existing `requestEnd` (lines 28-34) and `confirmEnd` (lines 45-48) need to also call `audio.stop()` (mirror `sessionEnd = session.end` capture at line 44 — capture `audioStop = audio.stop`).
5. Wrap the Start click in an `onStartClick` that creates the AC inside the click (D-09): per `03-RESEARCH.md` Pattern 4 lines 437-455. The exact shape:
   ```tsx
   const onStartClick = async () => {
     setAppPhase('lead-in')
     const plan = createBreathingPlan(state.selectedSettings)
     await audio.start(plan)
     // 3-2-1 advance via setTimeout chain or rAF reading audioCtx.currentTime
     // After 3 s of lead-in:
     setAppPhase('running')
     session.start()
   }
   ```
6. Pass `leadInDigit` to `BreathingShape`: `<BreathingShape frame={session.currentFrame} leadInDigit={appPhase === 'lead-in' ? leadInDigit : null} />` (line 74).
7. Pass mute props to `SessionControls`: `<SessionControls status={state.status} onStart={onStartClick} onEnd={requestEnd} muted={audio.muted} audioAvailable={audio.audioAvailable} onMuteToggle={() => audio.setMuted(!audio.muted)} />` (line 86).

**Auto-close-modal-on-state-change pattern to preserve** (lines 20-24, the WR-01 effect — extend to cover the audio-stop on completion):
```tsx
// App.tsx:20-24
useEffect(() => {
  if (state.status !== 'running' && endDialogOpen) {
    setEndDialogOpen(false)
  }
}, [state.status, endDialogOpen])
```
Add a sibling effect: `useEffect(() => { if (state.status === 'complete') { void audio.stop() } }, [state.status, audio.stop])`. This is the D-11 + D-16 anchor — when the session reaches `'complete'`, the last cue decays naturally and we close the AC after a short delay (or immediately if the in-flight cue is already in deep decay; per `03-RESEARCH.md` Pitfall 8 line 572, `setTimeout(close, decayTailMs)` is sufficient).

**Memoization-of-stable-callback pattern to preserve** (lines 38-48, the WR-02 callbacks captured before memoization):
```tsx
// App.tsx:38-53
const sessionEnd = session.end
const confirmEnd = useCallback(() => {
  setEndDialogOpen(false)
  sessionEnd()
}, [sessionEnd])

const cancelEnd = useCallback(() => {
  setEndDialogOpen(false)
}, [])
```
Apply to audio: `const audioStop = audio.stop`. Then `confirmEnd` becomes:
```tsx
const confirmEnd = useCallback(() => {
  setEndDialogOpen(false)
  sessionEnd()
  void audioStop()
}, [sessionEnd, audioStop])
```
Same idiom as the existing line 45-48; just adds the audio teardown.

---

## Shared Patterns

### Lifecycle: useEffect cleanup that owns an external resource
**Source:** `src/hooks/useSessionEngine.ts:29-57` (rAF + cancelled flag + cleanup).
**Apply to:** `src/hooks/useAudioCues.ts` (AudioContext + scheduler cleanup), `src/audio/audioEngine.ts.close()` (scheduler stop + AC close).

```ts
// useSessionEngine.ts:29-57 (canonical excerpt)
useEffect(() => {
  if (state.status !== 'running') return undefined

  let animationFrameId = 0
  let cancelled = false

  const tick = () => { /* ... */ if (!cancelled) animationFrameId = requestAnimationFrame(tick) }
  animationFrameId = requestAnimationFrame(tick)

  return () => {
    cancelled = true
    cancelAnimationFrame(animationFrameId)
  }
}, [state.status])
```
The `cancelled` flag idiom plus `cancelAnimationFrame` translates directly to the audio scheduler's `stop()` returning a function that clears `setTimeout` and to the `useAudioCues` cleanup `void engine.close()`.

---

### State-transition API: pure named exports + discriminated state types
**Source:** `src/domain/sessionController.ts:7-87` (`SessionState` union, `startSession`, `endSession`, `extendTimedSession`, `completeIfNeeded`).
**Apply to:** `src/audio/audioEngine.ts` (typed `AudioStatus`, factory + lifecycle methods that return predictable shapes).

```ts
// sessionController.ts:7-32 (canonical excerpt — discriminated union shape)
export type SessionStatus = 'idle' | 'running' | 'complete'
export type SessionState = IdleSessionState | RunningSessionState | CompleteSessionState
```
Mirror with `AudioStatus = 'idle' | 'starting' | 'lead-in' | 'running' | 'failed'` (per `03-RESEARCH.md` line 357). Each lifecycle method (`start`, `stop`, `setMuted`, `notifyPhaseBoundary`) is a pure operation on the engine instance, parallel to the named exports in `sessionController.ts`.

---

### Pure-domain test idiom: `vitest` import + named-export round-trip
**Source:** `src/domain/sessionController.test.ts:1-15`, `src/domain/breathingPlan.test.ts`, `src/domain/sessionMath.test.ts`.
**Apply to:** `src/audio/cueSynth.test.ts`, `src/audio/lookaheadScheduler.test.ts`, `src/audio/audioEngine.test.ts`.

```ts
// sessionController.test.ts:1-9 (canonical excerpt)
import { describe, expect, it } from 'vitest'

import type { SessionSettings } from './settings'
import {
  completeIfNeeded,
  endSession,
  extendTimedSession,
  startSession,
} from './sessionController'
```
Single top-level `describe` per file, no nested `describe` blocks, no `beforeEach` other than `vi.useFakeTimers()` when timer-driven.

---

### Hook test idiom: `renderHook` + `act` + fake timers + `unmount()`
**Source:** `src/hooks/useSessionEngine.test.tsx:1-22` and per-test `unmount()` (lines 33, 50, 68, 90, 115, 131).
**Apply to:** `src/hooks/useAudioCues.test.tsx`.

```tsx
// useSessionEngine.test.tsx:1-22 (canonical excerpt)
import { act, renderHook } from '@testing-library/react'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

beforeEach(() => {
  vi.useFakeTimers()
  vi.setSystemTime(new Date('2026-05-09T00:00:00.000Z'))
})

afterEach(() => {
  vi.useRealTimers()
})
```
Always call `unmount()` at the end of each `it()` so the cleanup path executes (catches D-11 leaks).

---

### Component test idiom: `render` + `userEvent.setup()` + role+name queries
**Source:** `src/app/App.session.test.tsx:1-44` and `src/app/App.dialog.test.tsx:1-110` (`userEvent.setup()` + `screen.getByRole('button', { name: '...' })`).
**Apply to:** `src/components/MuteToggle.test.tsx`, `src/app/App.audio.test.tsx`.

```tsx
// App.session.test.tsx:23-33 (canonical excerpt)
const user = userEvent.setup()
render(<App />)

await user.click(screen.getByRole('button', { name: 'Start session' }))
expect(screen.getByRole('img', { name: 'Breathing shape: In' })).toBeVisible()
```
Always use accessible-name queries (`{ name: '...' }`); never use `getByText` for interactive elements; never use `data-testid`. The mute toggle's three accessible names (`Mute audio cues` / `Unmute audio cues` / `Audio unavailable in this browser`) are the test contract.

---

### Tailwind icon-button class baseline
**Source:** `src/components/SettingsStepper.tsx:42-50` (44×44 icon button, disabled-opacity, focus ring, `motion-reduce:transition-none`).
**Apply to:** `src/components/MuteToggle.tsx`.

```tsx
// SettingsStepper.tsx:42-50 (canonical excerpt — class string)
className="grid size-12 min-h-11 min-w-11 place-items-center rounded-full border border-teal-200 bg-white text-2xl leading-none text-teal-800 shadow-sm transition hover:bg-teal-50 active:bg-teal-100 motion-reduce:transition-none focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-breathing-accent focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-45"
```
For `MuteToggle`: swap `size-12` → `size-11` (mute is the smaller secondary control next to the full-width primary; matches the 44 px floor exactly via `min-h-11 min-w-11`). Drop `text-2xl leading-none` (icon, not glyph). All other classes verbatim.

---

### Vitest-setup polyfill convention
**Source:** `vitest.setup.ts:6-44` (`HTMLDialogElement` and `matchMedia` polyfills, each guarded by feature-detection, each commented with rationale + source).
**Apply to:** `vitest.setup.ts` extension for `AudioContext`.

```ts
// vitest.setup.ts:30-44 (canonical excerpt — guarded global install)
if (typeof window !== 'undefined' && !window.matchMedia) {
  Object.defineProperty(window, 'matchMedia', {
    writable: true,
    value: (query: string) => ({ /* shape */ }),
  })
}
```
For `AudioContext`: `if (typeof window !== 'undefined' && !window.AudioContext) { Object.defineProperty(window, 'AudioContext', { writable: true, value: FakeAudioContext }) }`. The full polyfill body is verbatim from `03-RESEARCH.md` Code Examples lines 587-647.

---

## No Analog Found

| File | Role | Data Flow | Reason |
|---|---|---|---|
| (none — every file has at least a role-match analog) | | | |

**Notes on the closest "no Web Audio code exists" gaps:**
- `src/audio/cueSynth.ts` — the *Web Audio synthesis* itself (oscillator + filter + gain construction, `setTargetAtTime` envelopes) has no in-tree analog. The closest *idiomatic* analog is `src/domain/breathingPlan.ts` (pure builder) — same posture (named exports, no React, lookup tables for parameters), different primitive (Web Audio nodes vs ms math). Planner should pull synthesis primitives directly from `03-RESEARCH.md` Pattern 2 lines 271-339.
- `src/audio/lookaheadScheduler.ts` — the *Chris Wilson scheduler pattern* itself has no in-tree analog. The closest *structural* analog is `useSessionEngine.ts:29-57` (loop with cleanup). Planner should pull the 25 ms / 100 ms constants and the `while`-loop body from `03-RESEARCH.md` Pattern 1 lines 232-264.
- `src/audio/audioEngine.ts.applyMuteFadeOut` — the *cancelAndHoldAtTime + setTargetAtTime* mute-fade primitive has no in-tree analog. Pull verbatim from `03-RESEARCH.md` lines 471-481, with the Pitfall 9 fallback to `cancelScheduledValues + setValueAtTime` for older Safari (`03-RESEARCH.md` lines 575-579).

---

## Metadata

**Analog search scope:** `src/audio/` (does not exist), `src/hooks/` (3 files), `src/domain/` (8 files), `src/components/` (6 files), `src/app/` (4 files), `vitest.setup.ts`.
**Files scanned:** 22 source files + tests.
**Pattern extraction date:** 2026-05-09
**Phase:** 03-optional-generated-audio-cues
