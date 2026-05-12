---
phase: 10-hooks-identity-effect-hygiene
created: 2026-05-11
milestone: v1.0.1
mapper: gsd-pattern-mapper
---

# Phase 10: Hooks Identity & Effect Hygiene — Pattern Map

**Mapped:** 2026-05-11
**Files analyzed:** 5 (3 source modified, 2 tests extended)
**Analogs found:** 5 / 5 — every modified file has at least one in-codebase analog
**Reference commit:** `352181d` (HEAD as of mapping)

## Summary

Every Phase 10 edit has a direct in-codebase analog. The phase is mechanical pattern-lifting: ref-mirror-of-prop (`onReanchorRequiredRef`) generalized to `mutedRef`; ref-on-top-of-state (`reconstructGenerationRef` AUDIO-01) posture re-used for `mutedRef`; existing `cancelled` flag at `useSessionEngine.ts:53-56` gets one extra read at the top of `tick()`; existing rAF tick callback gains an in-updater ref-write that replaces a deleted App-level effect; existing `currentFrame` useMemo dep array `[state]` tightens to `[state.status, state.lastFrame?.cycleIndex, state.lastFrame?.phase]`. No new patterns are introduced. No new abstractions, no new files outside the locked test geography.

## File Classification

| New/Modified File | Role | Data Flow | Closest Analog | Match Quality |
|-------------------|------|-----------|----------------|---------------|
| `src/hooks/useSessionEngine.ts` (MODIFY) | hook (state owner + rAF driver) | event-driven (rAF tick → setState) + ref-owned snapshot write | self — patterns 4 sites inside the same file + cross-file `useAudioCues.ts` ref-on-top-of-state | exact (self-reference) |
| `src/hooks/useAudioCues.ts` (MODIFY) | hook (audio-engine wrapper + callback host) | request-response (gesture → AC create) + ref-mirror-of-prop | self — `useAudioCues.ts:106-109` `onReanchorRequiredRef` (ref-mirror-of-prop) + `:86,:271` `reconstructGenerationRef` (ref-on-top-of-state, AUDIO-01) | exact (self-reference) |
| `src/app/App.tsx` (MODIFY) | orchestrator (effect host) | request-response (state transitions → side effects) | self — `App.tsx:81-84` `sessionFrameRef`-updater (ref-updater effect with explicit deps) | exact (self-reference) |
| `src/hooks/useSessionEngine.test.tsx` (EXTEND — **drift from D-13**) | test | renderHook identity / `===` reference assertions | self — `useSessionEngine.test.tsx:1-60` existing harness (renderHook + `vi.useFakeTimers` + `act` + `advanceTimersByTime`) | exact (self-reference) |
| `src/hooks/useAudioCues.test.tsx` (EXTEND) | test | renderHook identity assertions + AC mock injection | self — `useAudioCues.test.tsx:337-360` `SpyableAC` class + `vi.stubGlobal('AudioContext', SpyableAC)` | exact (self-reference) |

**Drift call-out (from RESEARCH.md §"Code-State Verification"):** CONTEXT D-13 / D-20 say `useSessionEngine.test.ts` is NEW. HEAD reality: `useSessionEngine.test.tsx` (`.tsx`, not `.ts`) already exists with 5 tests. The planner MUST treat D-13 as **EXTEND** of `useSessionEngine.test.tsx`, not NEW. The existing tests are preserved; new identity-stability tests are appended in a new `describe` block.

## Pattern Assignments

### `src/hooks/useSessionEngine.ts` (hook, event-driven rAF + ref-owned snapshot)

**Primary analog:** Self — the file already contains the rAF effect, `cancelled` flag, `currentFrame` useMemo, and `useRef` posture used throughout `useAudioCues.ts`. Cross-file analog for ref-on-top-of-state: `useAudioCues.ts:86,:271` (`reconstructGenerationRef` AUDIO-01).

#### Excerpt 1 — existing rAF effect with `cancelled` teardown flag (HEAD, lines 29-57)

This is the analog AND the edit target. HOOKS-04 (D-10) adds ONE line at the top of `tick()`; D-06/D-07/D-08 add the snapshot ref write INSIDE the `setState` updater.

```typescript
// useSessionEngine.ts:29-57 (HEAD — verbatim)
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

**Edits to apply on top of this analog (D-06/D-08/D-10):**
- Insert `if (cancelled) return` as the first statement of `tick` (above the `setState` call). This is D-10 (HOOKS-04).
- Inside the `setState((currentState) => { ... })` updater, BEFORE the `return completeIfNeeded(...)` line, write `runningSnapshotRef.current = { key: String(currentState.startedAtMs), startedAtMs: currentState.startedAtMs, lastElapsedMs: currentState.lastFrame.elapsedMs }`. This is D-06/D-07/D-08 (HOOKS-02 ownership move).
- RESEARCH.md Pitfall 1 (closure-staleness) resolves D-08 ambiguity: the write MUST be inside the updater, not in the outer closure, because `state` in the outer closure is captured at effect install and the dep array `[state.status]` does not refresh it per tick.
- On the early `if (state.status !== 'running') return undefined` branch (line 30-32), also null `runningSnapshotRef.current = null` before returning, so a transition out of running clears the snapshot at hook level.

#### Excerpt 2 — existing `currentFrame` useMemo (HEAD, lines 59-62)

```typescript
// useSessionEngine.ts:59-62 (HEAD — verbatim)
const currentFrame = useMemo(
  () => (state.status === 'running' ? state.lastFrame : null),
  [state],
)
```

**Edit to apply (D-03, HOOKS-03):**
- Replace dep array `[state]` with `[state.status, state.lastFrame?.cycleIndex, state.lastFrame?.phase]` (primitives-only).
- The memo body is unchanged.
- Per RESEARCH.md A4 (Assumptions Log) and §Pattern 1: eslint-plugin-react-hooks 7.1.1 accepts `state.lastFrame?.cycleIndex` natively. If lint trips, fall back to local-narrowing form (Variant B): `const lastFrame = state.status === 'running' ? state.lastFrame : null; const cycleKey = lastFrame?.cycleIndex; const phaseKey = lastFrame?.phase;` and use `[state.status, cycleKey, phaseKey]`.

#### Excerpt 3 — new `liveFrame` (additive, no analog needed — direct read mirroring the OLD `currentFrame`)

```typescript
// Direct read, no memo (D-04). Identity changes per rAF by design.
const liveFrame: SessionFrame | null =
  state.status === 'running' ? state.lastFrame : null
```

**Why no memo:** D-04 explicitly rejects memoization for `liveFrame` — the per-rAF identity churn IS the contract. Visual consumers (BreathingShape, SessionReadout) want a fresh `phaseProgress` value per render.

#### Excerpt 4 — `useRef<RunningSnapshot | null>(null)` declaration (analog: `useAudioCues.ts:77,:82,:86,:101,:106`)

The codebase has 5+ `useRef<T | null>(null)` declarations in `useAudioCues.ts` alone. Pick any as the pattern shape; the cleanest is the one nearest to the new use:

```typescript
// useAudioCues.ts:86 (HEAD — verbatim)
const reconstructGenerationRef = useRef<number>(0)
```

**Edit (D-07):** Add to `useSessionEngine.ts` (near the top, after `useState`):
```typescript
const runningSnapshotRef = useRef<RunningSnapshot | null>(null)
```
Export `RunningSnapshot` type from the same module (RESEARCH.md "Claude's Discretion" recommendation — named export so the App-side cleanup effect can import the type for narrowing).

#### Excerpt 5 — `SessionEngine` interface (HEAD, lines 14-21)

```typescript
// useSessionEngine.ts:14-21 (HEAD — verbatim)
export interface SessionEngine {
  state: SessionState
  currentFrame: SessionFrame | null
  setSelectedSettings(this: void, settings: SessionSettings): void
  start(this: void): void
  end(this: void): void
  extendDuration(this: void, durationMinutes: number): void
}
```

**Edits (D-02/D-07):**
- Add `liveFrame: SessionFrame | null` (placement: adjacent to `currentFrame` for readability — RESEARCH.md "Claude's Discretion" notes no technical impact).
- Add `runningSnapshotRef: React.RefObject<RunningSnapshot | null>`.
- Both new fields get prescriptive JSDoc per RESEARCH.md Pitfall 2 ("liveFrame consumer drift" mitigation — JSDoc differentiates the two `SessionFrame | null` fields).

---

### `src/hooks/useAudioCues.ts` (hook, request-response + ref-mirror-of-prop)

**Primary analog:** Self — `useAudioCues.ts:106-109` is the canonical ref-mirror-of-prop pattern. `useAudioCues.ts:86,:271` is the canonical ref-on-top-of-state posture (AUDIO-01 / Phase 9). D-11 explicitly says `mutedRef` mirrors both.

#### Excerpt 1 — ref-mirror-of-prop pattern (HEAD, lines 106-109) — DIRECT TEMPLATE for `mutedRef`

```typescript
// useAudioCues.ts:106-109 (HEAD — verbatim)
const onReanchorRequiredRef = useRef<typeof onReanchorRequired>(onReanchorRequired)
useEffect(() => {
  onReanchorRequiredRef.current = onReanchorRequired
}, [onReanchorRequired])
```

**Edit to apply (D-11, HOOKS-01) — mechanical transposition:**

```typescript
// Insert after the existing setMutedState declaration at line 91 (or near the
// other refs around lines 77-106 — placement is Claude's discretion). The
// existing `[muted, setMutedState] = useState<boolean>(initialMuted ?? false)`
// at line 91 STAYS — D-11 layers ref ON TOP of state, does NOT replace it.
const mutedRef = useRef<boolean>(initialMuted ?? false)
useEffect(() => {
  mutedRef.current = muted
}, [muted])
```

#### Excerpt 2 — ref-on-top-of-state posture exemplar (HEAD, line 86 + lines 269-325)

```typescript
// useAudioCues.ts:83-86 (HEAD — verbatim)
// AUDIO-01: monotonic counter; bumped on every reconstruct, stop, and unmount;
// checked post-await to detect cancellation. Layered ON TOP of the existing
// synchronous-null pattern (Pitfall 1 — do NOT remove synchronous-null).
const reconstructGenerationRef = useRef<number>(0)
```

This is the "layer ref ON TOP of existing state" posture D-11 explicitly mirrors. The comment style — "Layered ON TOP of the existing X pattern" — is the documentation template the new `mutedRef` declaration should adopt:

```typescript
// HOOKS-01 / D-11: mute state mirrored into a ref so callbacks that read mute
// (start, reconstructEngine) drop `muted` from their useCallback dep arrays
// without losing access to the current value. Layered ON TOP of the
// existing useState [muted, setMutedState] — does NOT replace it (the React
// state is still the UI-binding source for MuteToggle and the LOCL-01
// persistence path). Mirrors the onReanchorRequiredRef pattern at lines
// 106-109 and the AUDIO-01 reconstructGenerationRef posture above.
```

#### Excerpt 3 — `start` callback (HEAD, lines 192-232) — EDIT TARGET

```typescript
// useAudioCues.ts:192-232 (HEAD — abridged)
const start = useCallback(
  async (plan: BreathingPlan): Promise<number | null> => {
    const existing = engineRef.current
    if (existing !== null) {
      return firstInCueTimeRef.current
    }
    try {
      const engine = await createAudioEngine({ onStateChange: handleStateChange })
      engineRef.current = engine
      engine.setMuted(muted)        // ← D-11 edit: replace with mutedRef.current
      const startAudioTime = engine.now()
      const firstInCueTime = engine.scheduleLeadIn(startAudioTime, plan)
      // ...
    } catch {
      // ...
    }
  },
  [muted, handleStateChange],      // ← D-11 edit: drop `muted` from deps
)
```

**Edits (D-11):**
- Line 210 (verified at HEAD): `engine.setMuted(muted)` → `engine.setMuted(mutedRef.current)`.
- Line 231 (verified at HEAD): dep array `[muted, handleStateChange]` → `[handleStateChange]`.
- D-12 test lock: `useAudioCues.test.tsx` asserts `result.current.start === result.current.start` across `setMuted(true)`.

#### Excerpt 4 — `reconstructEngine` callback (HEAD, lines 269-325) — EDIT TARGET

```typescript
// useAudioCues.ts:269-325 (HEAD — abridged)
const reconstructEngine = useCallback(async (): Promise<void> => {
  const gen = ++reconstructGenerationRef.current
  const oldEngine = engineRef.current
  const currentMuted = muted        // ← D-11 edit: replace with mutedRef.current
  engineRef.current = null
  firstInCueTimeRef.current = null
  // ...
  newEngine.setMuted(currentMuted)
  // ...
}, [muted, handleStateChange])      // ← D-11 edit: drop `muted` from deps
```

**Edits (D-11):**
- Line 273 (verified at HEAD): `const currentMuted = muted` → `const currentMuted = mutedRef.current`.
- Line 325 (verified at HEAD): dep array `[muted, handleStateChange]` → `[handleStateChange]`.
- D-12 test lock: assert `resume` identity stable across mute toggles (resume calls reconstructEngine internally, so resume identity is a proxy for reconstructEngine identity).

---

### `src/app/App.tsx` (orchestrator, request-response effects)

**Primary analog:** Self — `App.tsx:81-84` is the existing ref-updater pattern with explicit deps (the HOOKS-05 verification target).

#### Excerpt 1 — ref-updater effect with explicit deps (HEAD, lines 81-84) — HOOKS-05 VERIFICATION TARGET

```typescript
// App.tsx:81-84 (HEAD — verbatim)
const sessionFrameRef = useRef(session.currentFrame)
useEffect(() => {
  sessionFrameRef.current = session.currentFrame
}, [session.currentFrame])
```

**Edits:** NONE. Per D-05, `sessionFrameRef` keeps reading `session.currentFrame` (NOT `liveFrame`) because the boundary effect at lines 480-527 depends on per-phase identity. Per D-18 / HOOKS-05, the effect already has explicit `[session.currentFrame]` deps and passes `react-hooks/exhaustive-deps` post-Phase-7. Phase 10's contribution: HOOKS-03 changes the trigger cadence (per-phase instead of per-rAF). Verification only — confirm `npm run lint` still exits 0 after the engine + App edits land.

**Note:** RESEARCH.md §Code-State Verification flags a TINY DRIFT — CONTEXT cites `:80-82` and `:80-84` in different spots; HEAD reality is `:81-84` (off by one line, likely a since-removed blank line). Use `:81-84`.

#### Excerpt 2 — running-snapshot effect (HEAD, lines 412-420) — TO DELETE

```typescript
// App.tsx:412-420 (HEAD — verbatim — DELETED per D-06)
// Phase 4 LOCL-02: keep runningSnapshotRef fresh on every render while running.
// Reads state.startedAtMs and state.lastFrame.elapsedMs (both available only on
// RunningSessionState — discriminated-union narrowing on `state.status === 'running'`
// is required for TypeScript). The snapshot is consumed by the cleanup effect on
// transition out of running.
useEffect(() => {
  if (state.status === 'running') {
    runningSnapshotRef.current = {
      key: String(state.startedAtMs),
      startedAtMs: state.startedAtMs,
      lastElapsedMs: state.lastFrame.elapsedMs,
    }
  }
}, [state])
```

**Edit (D-06):** DELETE the entire effect AND the local `runningSnapshotRef` declaration at `App.tsx:179-183`. The hook now owns both.

```typescript
// App.tsx:179-183 (HEAD — verbatim — DELETED per D-06/D-07)
const runningSnapshotRef = useRef<{
  key: string
  startedAtMs: number
  lastElapsedMs: number
} | null>(null)
```

**Replacement:** consume from the hook via destructuring or property access. RESEARCH.md Example 3 recommends:
```typescript
// At the existing session destructure / definition site (Claude's discretion on form):
const { runningSnapshotRef: sessionRunningSnapshotRef } = session
// ...or read inline: `session.runningSnapshotRef.current`.
```

#### Excerpt 3 — leave-running cleanup effect (HEAD, lines 428-464) — DEP TIGHTENING TARGET

```typescript
// App.tsx:428-464 (HEAD — verbatim, abridged at the elided body)
useEffect(() => {
  if (state.status !== 'running') {
    void audioStop()
    void wakeLockRelease()
    // Reason: subscribe-and-reflect — appPhase resets to 'idle' when session leaves running; this effect is the single write site per D-16 Phase 4 invariant.
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setAppPhase('idle')
    clearLeadInTimeouts()
    audioAnchorRef.current = null
    planRef.current = null
    lastBoundaryKeyRef.current = null

    const snap = runningSnapshotRef.current      // ← edit: session.runningSnapshotRef.current
    if (snap !== null && recordedSessionKeyRef.current !== snap.key) {
      const isComplete = state.status === 'complete'
      const elapsedMs = isComplete
        ? state.completedAtMs - snap.startedAtMs
        : snap.lastElapsedMs
      const updated = recordSession(elapsedMs, isComplete)
      setStats(updated)
      recordedSessionKeyRef.current = snap.key
    }
    runningSnapshotRef.current = null           // ← edit (Pitfall 2-ish A2 in RESEARCH):
                                                //   either session.runningSnapshotRef.current = null
                                                //   OR delete this line and let the hook null on transition.
                                                //   RESEARCH.md mild preference: delete and let hook own.
  }
}, [state, audioStop, wakeLockRelease, clearLeadInTimeouts])
//   ^^^^^ ← D-09 edit: state → state.status
```

**Edits (D-09, HOOKS-02):**
- Line 464 dep array: `[state, audioStop, wakeLockRelease, clearLeadInTimeouts]` → `[state.status, audioStop, wakeLockRelease, clearLeadInTimeouts]`.
- Line 452 `runningSnapshotRef.current` → `session.runningSnapshotRef.current`.
- Line 462 null-out (RESEARCH.md A2 — planner's call):
  - Option (a): delete line 462; hook handles null on status transition (cleaner tier discipline).
  - Option (b): keep line 462 as `session.runningSnapshotRef.current = null` (preserves App-side idempotency invariant).
  - RESEARCH.md mild preference: (a).
- The preserved `// eslint-disable-next-line react-hooks/set-state-in-effect` with `// Reason:` annotation at lines 437-438 STAYS unchanged — Phase 7 D-04 / D-19 compliant.
- RESEARCH.md Pitfall 3 warning: after dep tightening, exhaustive-deps MAY trip on `state.completedAtMs` (line 456). If it does, three options (Pitfall 3 A/B/C). Run `npm run lint` IMMEDIATELY after this edit to detect early.

#### Excerpt 4 — BreathingShape + SessionReadout call sites (HEAD, lines 555-560) — D-05 CONSUMER MIGRATION

```typescript
// App.tsx:555-560 (HEAD — verbatim)
<BreathingShape
  frame={appPhase === 'running' ? session.currentFrame : null}  // ← D-05 edit: session.liveFrame
  leadInDigit={appPhase === 'lead-in' ? leadInDigit : null}
/>
<SessionReadout
  frame={leadInPlaceholderFrame ?? session.currentFrame}        // ← D-05 edit: session.liveFrame
```

**Edits (D-05):**
- Line 556: `session.currentFrame` → `session.liveFrame`.
- Line 560: `session.currentFrame` → `session.liveFrame`.
- Components keep their existing `frame: SessionFrame | null` prop contract; no component-internal edit needed.

---

### `src/hooks/useSessionEngine.test.tsx` (test — EXTEND, was D-13 "NEW")

**Primary analog:** Self — the file already has 5 tests using `renderHook` + `vi.useFakeTimers` + `act` + `advanceTimersByTime`. The new identity tests append to it.

#### Excerpt 1 — existing test harness (HEAD, lines 1-50)

```typescript
// useSessionEngine.test.tsx:1-22 (HEAD — verbatim)
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

  afterEach(() => {
    vi.useRealTimers()
  })
  // ... 5 existing tests ...
```

**Pattern (D-13, HOOKS-03/04):** Append a new `describe('useSessionEngine — identity contracts (Phase 10 HOOKS-03/04)', () => { ... })` block. Each test follows the existing shape: `renderHook(...)` → `act(() => result.current.start())` → `act(() => vi.advanceTimersByTime(N))` → assertion → `unmount()`.

**Test shape examples (from RESEARCH.md §Code Examples Example 4):**
- `expect(result.current.currentFrame).toBe(firstFrame)` — `===` reference identity.
- `expect(live2).not.toBe(live1)` AND `expect(stable2).toBe(stable1)` in the same test — per-rAF vs. per-phase contrast.
- `expect(result.current.runningSnapshotRef.current).toBeNull()` baseline + `expect(snap).not.toBeNull()` post-tick — ref population contract.

#### Excerpt 2 — `liveFrame.phaseProgress` advances within a phase (D-13 test #4)

Follow RESEARCH.md Example 4 directly — `result.current.liveFrame?.phaseProgress` before/after a small `advanceTimersByTime(1000)` and assert `p2 > p1`.

#### Excerpt 3 — rAF cancel-guard assertion (D-13 test #5)

The negative assertion is implicit: after `unmount()`, a subsequent `vi.advanceTimersByTime(...)` must NOT produce an `act()` warning or `console.error` from `setState`-after-unmount. The test passes if the suite stays clean. The cancel-guard is what prevents the setState (HOOKS-04 D-10).

---

### `src/hooks/useAudioCues.test.tsx` (test — EXTEND, D-14)

**Primary analog:** Self — `useAudioCues.test.tsx:337-360` defines `SpyableAC`, an AudioContext stub with `resume()` on the prototype that `vi.spyOn` can intercept. The D-14 identity tests reuse this class directly.

#### Excerpt 1 — `SpyableAC` harness reuse (HEAD, lines 337-369)

```typescript
// useAudioCues.test.tsx:333-369 (HEAD — abridged)
// SpyableAC: an AudioContext stub that places resume() on the prototype so
// vi.spyOn(SpyableAC.prototype, 'resume') intercepts calls made by the engine's
// internal AC instance.
class SpyableAC {
  // ... implements createOscillator, createGain, createBiquadFilter,
  //     addEventListener, resume, close ...
}

// Usage pattern (verbatim shape):
vi.stubGlobal('AudioContext', SpyableAC)
```

**Pattern (D-14, HOOKS-01):** Append a new `describe('useAudioCues — callback identity (Phase 10 HOOKS-01)', () => { ... })` block at the end of the file. Each test:
1. `vi.stubGlobal('AudioContext', SpyableAC)` (reuse existing class — RESEARCH.md A5 confirms surface coverage).
2. `const { result, unmount } = renderHook(() => useAudioCues())`.
3. Capture `const startBefore = result.current.start`.
4. `act(() => { result.current.setMuted(true) })`.
5. `expect(result.current.start).toBe(startBefore)` — `===` identity lock.
6. `unmount()`.

**Test shapes (from RESEARCH.md §Code Examples Example 5):**
- `start` identity stable across `setMuted(true)` AND `setMuted(false)` round-trip.
- `resume` identity stable across `setMuted(true)` (resume calls reconstructEngine; resume identity is a proxy for reconstructEngine identity per D-14).
- Baseline `handleStateChange` regression guard — implicit via `start` identity (since `handleStateChange` is the only remaining dep of `start` after D-11, `start === start` proves `handleStateChange === handleStateChange`).

#### Excerpt 2 — `vi.unstubAllGlobals` + `vi.restoreAllMocks` afterEach (existing pattern)

Match the existing `afterEach` hooks in the file:
```typescript
afterEach(() => {
  vi.unstubAllGlobals()
  vi.restoreAllMocks()
})
```

---

## Shared Patterns

These cross-cutting patterns apply to multiple Phase 10 edits. All are already established in this codebase.

### Pattern A: Ref-mirror-of-prop (callback / state stability)

**Source:** `useAudioCues.ts:106-109`
**Apply to:** `useSessionEngine.ts` `runningSnapshotRef` writer + `useAudioCues.ts` `mutedRef`

```typescript
// useAudioCues.ts:106-109 (HEAD — verbatim — Pattern A exemplar)
const onReanchorRequiredRef = useRef<typeof onReanchorRequired>(onReanchorRequired)
useEffect(() => {
  onReanchorRequiredRef.current = onReanchorRequired
}, [onReanchorRequired])
```

**Generalization:** A `useRef` whose `.current` is kept in sync with a state/prop via a tiny effect. Callbacks read the ref instead of the state, so callback identity does not depend on the state. D-11 transposes this verbatim to `mutedRef`.

### Pattern B: Ref-on-top-of-state (do NOT replace; LAYER)

**Source:** `useAudioCues.ts:86,:271` (AUDIO-01 `reconstructGenerationRef`)
**Apply to:** `useAudioCues.ts` `mutedRef` (D-11 explicitly mirrors)

```typescript
// useAudioCues.ts:83-86 (HEAD — verbatim — Pattern B exemplar)
// AUDIO-01: monotonic counter; bumped on every reconstruct, stop, and unmount;
// checked post-await to detect cancellation. Layered ON TOP of the existing
// synchronous-null pattern (Pitfall 1 — do NOT remove synchronous-null).
const reconstructGenerationRef = useRef<number>(0)
```

**Generalization:** When a ref-based mechanism is added to address a specific concern (callback identity, async-token invalidation), the EXISTING state-based mechanism stays. Do not "simplify" by removing the state — the state still serves its original purpose (UI binding, persistence, etc.). D-11 says explicitly: "The React `muted` state STAYS (UI binding for MuteToggle, persistence via Phase 4 LOCL-01). Layered ON TOP of existing state — does NOT replace it."

### Pattern C: rAF cancel-guard via `cancelled` closure flag

**Source:** `useSessionEngine.ts:35,:53-56`
**Apply to:** `useSessionEngine.ts` `tick()` top (D-10, HOOKS-04)

```typescript
// useSessionEngine.ts:35,:46-48,:53-56 (HEAD — verbatim — Pattern C exemplar)
let cancelled = false
// ...
if (!cancelled) {
  animationFrameId = requestAnimationFrame(tick)
}
// ...
return () => {
  cancelled = true
  cancelAnimationFrame(animationFrameId)
}
```

**Generalization:** A boolean closure variable set by the effect's cleanup, checked before any state-writing side effect inside the rAF tick. D-10 adds ONE MORE read at the top of `tick()` — `if (cancelled) return` — to guarantee that any tick fired after `cancelAnimationFrame` (e.g., already-queued in jsdom's fake-timer rAF backing) is a no-op.

### Pattern D: Primitives-only useMemo deps

**Source:** `useSessionEngine.ts:59-62` (HEAD has the suboptimal `[state]`; D-03 tightens it)
**Apply to:** `currentFrame` (D-03, HOOKS-03)

```typescript
// Target form (D-03):
const currentFrame = useMemo<SessionFrame | null>(
  () => (state.status === 'running' ? state.lastFrame : null),
  [state.status, state.lastFrame?.cycleIndex, state.lastFrame?.phase],
)
```

**Generalization:** Replace object-typed deps (`[state]`, `[session.currentFrame]`) with the specific primitive fields the body reads (status discriminant + identity keys). Per RESEARCH.md Pattern 1, eslint-plugin-react-hooks 7.x accepts optional-chain expressions in deps natively. Variant B (local-narrow form) is the fallback if lint trips. Either variant passes `react-hooks/exhaustive-deps` per Phase 7 D-04 baseline.

### Pattern E: Discriminated-union narrowing inside effect body (state access)

**Source:** `App.tsx:454-456` (HEAD)
**Apply to:** `App.tsx` leave-running cleanup post-D-09 (HOOKS-02)

```typescript
// App.tsx:454-456 (HEAD — verbatim — Pattern E exemplar)
const isComplete = state.status === 'complete'
const elapsedMs = isComplete
  ? state.completedAtMs - snap.startedAtMs   // narrowed: state.status === 'complete'
  : snap.lastElapsedMs
```

**Generalization:** When the dep array carries only the discriminant (`state.status`), TypeScript still narrows on the discriminant inside the body. The linter may or may not — RESEARCH.md Pitfall 3 (A3 in Assumptions Log) warns that exhaustive-deps could flag `state.completedAtMs` as a missing dep. Three mitigation options if it trips: (A) extract `completedAtMs` to a top-of-effect const + add to deps; (B) move `completedAtMs` into the `RunningSnapshot` shape (shrinks dep array further); (C) annotated disable per Phase 7 D-04. Researcher's read: 7.1.1's flow analysis may correctly narrow on the union — verify empirically with `npm run lint`.

### Pattern F: Test harness — renderHook + fake timers + identity capture

**Source:** `useSessionEngine.test.tsx:1-22` + `useAudioCues.test.tsx:337-369`
**Apply to:** Both extended test files

**Shape (existing in codebase):**
- `import { act, renderHook } from '@testing-library/react'`
- `import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'`
- `beforeEach(() => { vi.useFakeTimers(); vi.setSystemTime(...) })`
- `afterEach(() => { vi.useRealTimers() })` OR `afterEach(() => { vi.unstubAllGlobals(); vi.restoreAllMocks() })` (audio tests need both)
- `const { result, unmount } = renderHook(() => useXxx(...))`
- `act(() => { result.current.someMethod() })`
- Identity assertion: `expect(result.current.fieldB).toBe(capturedBefore)` (uses `Object.is` — handles 0/`undefined`/`null` correctly).
- Always `unmount()` at the end (matches existing tests).

### Pattern G: `// Reason:` annotation on `react-hooks/*` eslint-disable (Phase 7 D-04)

**Source:** `App.tsx:437-438` (HEAD)
**Apply to:** Any NEW `// eslint-disable-next-line react-hooks/*` introduced by Phase 10 (D-19)

```typescript
// App.tsx:437-438 (HEAD — verbatim — Pattern G exemplar)
// Reason: subscribe-and-reflect — appPhase resets to 'idle' when session leaves running; this effect is the single write site per D-16 Phase 4 invariant.
// eslint-disable-next-line react-hooks/set-state-in-effect
setAppPhase('idle')
```

**Generalization:** D-19 carries forward Phase 7 D-04 — every surviving `react-hooks/*` disable MUST have a `// Reason:` line directly above. Phase 10's deltas should not require any new disables. If RESEARCH.md Pitfall 3 (Pattern E above, Option C) is exercised, the new disable carries a `// Reason: state.completedAtMs narrowed via state.status discriminant; safe to read inside isComplete branch.` annotation.

## No Analog Found

None. Every Phase 10 edit has an in-codebase analog. The phase is mechanical pattern-lifting, not new-pattern introduction.

This is consistent with RESEARCH.md §"Don't Hand-Roll":

> Every problem Phase 10 solves has an idiomatic React shape already in this codebase. The phase is mechanical: lift those existing patterns one level (mutedRef from a hypothesis to a fact; runningSnapshotRef from App-effect-write to hook-rAF-write; cancel-guard from end-of-tick to start-of-tick) and migrate two App.tsx consumer call sites to the new `liveFrame` output.

## Resolved Ambiguities (planner-relevant)

These are surfaced from RESEARCH.md Assumptions Log + Open Questions; the pattern map RESOLVES them by reference to in-codebase precedent.

| # | Ambiguity | Resolution by pattern precedent |
|---|---|---|
| A1 | D-08 "ref-write BEFORE setState" — lexical vs. inside-updater? | **Inside the `setState((currentState) => ...)` updater.** Precedent: `useAudioCues.ts:269-325` `reconstructEngine` reads / writes against the live captured value (`const currentMuted = muted` then later `const gen = ++reconstructGenerationRef.current` against the post-await check). Pattern is "live read inside the call boundary, not from outer closure". RESEARCH.md Pitfall 1 confirms lexical reading fails the D-13 snapshot-advances test. |
| A2 | `App.tsx:462` null-out — keep in App, or move to hook? | **Move to hook (Option a).** Precedent: D-06's "Owner of state owns the writer" tier-discipline rule. The hook nulls on the early `if (state.status !== 'running') return undefined` branch of the rAF effect; App.tsx:462 line is deleted. App's `recordedSessionKeyRef` idempotency guard at `:453` is untouched and continues to gate the stats write — does not depend on the null-out site. |
| A3 | HOOKS-05 verification — passive or active? | **Passive.** Precedent: `App.tsx:81-84` HEAD already has explicit `[session.currentFrame]` deps and passes exhaustive-deps post-Phase-7. No edit. Phase 10's contribution: HOOKS-03 changes trigger cadence only. Verification = `npm run lint` exits 0 after engine + App edits land. |
| A4 | Optional-chain in deps — Variant A inline or Variant B local-narrow? | **Variant A (inline) first; fall back to Variant B if lint trips.** Precedent: eslint-plugin-react-hooks 7.1.1 (verified in package.json) supports nullish-coalescing + optional-chaining in deps natively per the React monorepo changelog. Variant B is the safe-harbor escape. |
| A5 | SpyableAC harness surface for D-14 tests | **Reuse as-is.** Precedent: SpyableAC at `useAudioCues.test.tsx:337-360` implements `createOscillator`, `createGain`, `createBiquadFilter`, `addEventListener`, `resume`, `close` — full surface that `setMuted` chains through. RESEARCH.md A5 confirms LOW risk. |

## Metadata

**Analog search scope:**
- `src/hooks/useSessionEngine.ts` (HEAD lines 1-123 — full file)
- `src/hooks/useAudioCues.ts` (HEAD lines 1-130, 180-340 — relevant sections)
- `src/app/App.tsx` (HEAD lines 75-184, 405-465, 540-580 — relevant sections)
- `src/hooks/useSessionEngine.test.tsx` (HEAD lines 1-60 — harness)
- `src/hooks/useAudioCues.test.tsx` (HEAD lines 333-369 — SpyableAC class)
- `ls src/hooks/` — confirmed `useSessionEngine.test.tsx` exists (D-13 drift)

**Files scanned:** 5 source files, 2 directory listings. Targeted reads only — no full-file reads beyond `useSessionEngine.ts` (123 lines).

**Pattern extraction date:** 2026-05-11

**Drift carried into planner contract:**
- D-13 / D-20 `useSessionEngine.test.ts` is NEW → **actually EXTEND `useSessionEngine.test.tsx`** (RESEARCH.md confirms file exists; existing 5 tests preserved; new tests appended in a new describe block).
- CONTEXT line citations `:80-82` and `:80-84` for `sessionFrameRef` → **actual HEAD is `:81-84`** (off-by-one; HOOKS-05 verification still passive).

## PATTERN MAPPING COMPLETE
