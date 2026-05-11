---
phase: 10-hooks-identity-effect-hygiene
created: 2026-05-11
milestone: v1.0.1
researcher: gsd-researcher
confidence: HIGH
---

# Phase 10: Hooks Identity & Effect Hygiene — Research

**Researched:** 2026-05-11
**Domain:** React 19 hooks identity, useMemo dep narrowing, rAF lifecycle, Vitest renderHook
**Confidence:** HIGH — all locked decisions in CONTEXT.md verified against HEAD with one structural drift (D-13)

## Summary

CONTEXT.md (D-01..D-21) already locks the design. This research is verification-heavy: it confirms HEAD line numbers, exposes one structural drift (D-13 says "useSessionEngine has no test file" — it does, `useSessionEngine.test.tsx`), maps each requirement to a Vitest detection frequency, and resolves three open technical questions (optional-chain in deps, rAF mock plumbing under Vitest, harness reuse).

**Primary recommendation:** Ship CONTEXT.md as-locked with two precise edits to the plan — (1) `useSessionEngine.test.tsx` is EXTEND not NEW; (2) the test count delta moves from "381 → ~389" to "381 → ~390" because two D-13 tests now live in an existing file (no `describe` block overhead change) but D-13/D-14 still net ~8 cases.

<phase_requirements>
## Phase Requirements

| ID | Description | Research Support |
|----|-------------|------------------|
| HOOKS-01 | `useAudioCues.start()` and `reconstructEngine` read mute state via `mutedRef`; `start` callback identity stable across mute toggles | §"Reference patterns" `useAudioCues.ts:106-109` (existing ref-mirror-of-prop) + §"Code Examples — mutedRef pattern" |
| HOOKS-02 | App leave-running cleanup depends on `state.status`, not `state`; running-snapshot writer moves off React effects | §"Architecture Patterns — Ref ownership migration" + §"Code Examples — runningSnapshotRef inside rAF tick" |
| HOOKS-03 | `useSessionEngine.currentFrame` returns same memoized object across renders within same `cycleIndex:phase`; new `liveFrame` carries per-rAF values | §"Architecture Patterns — primitives-only useMemo dep narrowing" + §"Code Examples — currentFrame useMemo with optional-chain deps" |
| HOOKS-04 | rAF loop's `cancelled` short-circuit at top of `tick()`; extra rAF after teardown returns immediately | §"Reference patterns" `useSessionEngine.ts:53-56` + §"Code Examples — cancel-guard at top of tick" |
| HOOKS-05 | `sessionFrameRef`-updater effect at `App.tsx:81-84` declares explicit `[session.currentFrame]` deps and passes `react-hooks/exhaustive-deps` | §"Code-state verification" confirms current code already passes; verification-only |

</phase_requirements>

<user_constraints>
## User Constraints (from CONTEXT.md)

### Locked Decisions

**Frame identity API shape (HOOKS-03):**
- **D-01:** Keep `currentFrame` name; add new sibling `liveFrame`. `currentFrame` becomes per-phase-stable (same `===` within `cycleIndex:phase`); `liveFrame` is per-rAF.
- **D-02:** Type contract unchanged: both are `SessionFrame | null`. `currentFrame` carries the FULL SessionFrame captured at the phase-boundary tick. App boundary effect only reads `cycleIndex` + `phase`; stale per-frame fields are harmless. `liveFrame` always exposes fresh per-rAF values.
- **D-03:** Identity rule = primitives-only useMemo deps. `currentFrame = useMemo(...)` with deps `[state.status, state.lastFrame?.cycleIndex, state.lastFrame?.phase]` (paraphrased; final code uses local narrowing for optional-chain). Recomputes only when status / cycle / phase changes.
- **D-04:** `liveFrame` is a direct read, no memoization: `liveFrame = state.status === 'running' ? state.lastFrame : null`. Identity changes per rAF by design.
- **D-05:** Consumer migration at App.tsx call sites only. BreathingShape + SessionReadout switch to `session.liveFrame`. Components keep their `frame: SessionFrame | null` prop. `sessionFrameRef` at `App.tsx:81-84` keeps reading `session.currentFrame`.

**Running-snapshot writer location (HOOKS-02):**
- **D-06:** useSessionEngine owns + writes `runningSnapshotRef` inside the rAF tick callback (NOT a React effect). The App.tsx effect at lines 412-420 is DELETED.
- **D-07:** Surface = useSessionEngine returns `runningSnapshotRef: RefObject<RunningSnapshot | null>` where `RunningSnapshot = { key: string; startedAtMs: number; lastElapsedMs: number }` (matches App's existing shape verbatim).
- **D-08:** Write timing — at top of the rAF tick callback, BEFORE the setState call.
- **D-09:** Leave-running cleanup deps = `[state.status, audioStop, wakeLockRelease, clearLeadInTimeouts]`. Snapshot read inside via `session.runningSnapshotRef.current`. Discriminated-union access for `state.completedAtMs` stays inside the branch for the `isComplete` flag.

**rAF cancel-guard (HOOKS-04):**
- **D-10:** Short-circuit at TOP of `tick()` in `useSessionEngine.ts:37`. New first statement: `if (cancelled) return`. setState moves below.

**mutedRef + callback identity (HOOKS-01):**
- **D-11:** `mutedRef` inside `useAudioCues`. Updated by `useEffect(() => { mutedRef.current = muted }, [muted])`. `start` and `reconstructEngine` read `mutedRef.current` and drop `muted` from `useCallback` deps. The React `muted` state STAYS (UI binding + Phase 4 LOCL-01 persistence).
- **D-12:** Lock the new identity contracts in `useAudioCues.test.tsx` — capture `result.current.start` before/after `setMuted(true)`; assert `===`.

**Test geography & lock points:**
- **D-13:** Create `src/hooks/useSessionEngine.test.ts` (CONTEXT says NEW — see drift in §"Open Questions"). Lock identity, per-rAF freshness, cancel-guard, and runningSnapshotRef. ~5-6 tests.
- **D-14:** Extend `src/hooks/useAudioCues.test.tsx` with ~2-3 tests: start-identity-stable-across-setMuted, reconstructEngine identity, baseline handleStateChange.
- **D-15:** No new App-level test file. Target: 381 (Phase 9 baseline) → ~389.

**Plan packaging:**
- **D-16:** Single plan, single wave. Splitting wouldn't reduce risk.
- **D-17:** Task ordering = engine-first: (1) `useSessionEngine` (HOOKS-03 + HOOKS-04 + runningSnapshotRef + tests), (2) `useAudioCues` (HOOKS-01 mutedRef + identity tests), (3) `App.tsx` (HOOKS-02 dep tightening + liveFrame migration + DELETE running-snapshot effect at 412-420 + HOOKS-05 verification).

**HOOKS-05 verification scope:**
- **D-18:** HOOKS-05 is largely passive. The effect ALREADY has explicit `[session.currentFrame]` deps. Verification = `react-hooks/exhaustive-deps` still passes; no new `// eslint-disable-next-line react-hooks/exhaustive-deps`.

**Carry-forward invariants:**
- **D-19:** Phase 7 D-04 applies. Any new `// eslint-disable-next-line react-hooks/*` MUST carry a `// Reason:` annotation. Preserved disables: `App.tsx:251-253` and `:437-439` (set-state-in-effect).
- **D-20:** Phase 9 D-14 — co-locate tests in existing `*.test.{ts,tsx}` neighbors. EXCEPTION CONTEXT cites for `useSessionEngine.test.ts` is moot — file already exists (see drift).
- **D-21:** Phase 7 D-09 — every commit boundary: `tsc --noEmit` exits 0, `npm run lint` exits 0, `npm run build` exits 0, full Vitest suite passes.

### Claude's Discretion

- Optional-chain narrowing form in the `useMemo` body (`const f = state.lastFrame; const cycleIndex = f?.cycleIndex; ...`) vs. inline `state.status === 'running' ? state.lastFrame : null` then narrow — pick the form that passes `react-hooks/exhaustive-deps` cleanly without `eslint-disable`.
- Whether to declare `RunningSnapshot` as a named export from `useSessionEngine.ts` or keep it as an internal type accessed via the `RefObject<RunningSnapshot | null>` field — researcher recommends named export so the App-side cleanup effect can import the type for its narrow without re-declaring.
- The `liveFrame` field placement in the `SessionEngine` interface — adjacent to `currentFrame` for readability vs. at the end for backward-compat optics. No technical impact.

### Deferred Ideas (OUT OF SCOPE)

- Reduced motion BreathingShape boundary cue (`.planning/todos/2026-05-11-reduced-motion-still-shows-out-phase-boundary-cue.md`) — different scope.
- Favicon 404 — tracked under ASSETS-01.
- `useEvent`-style stable callback API for useSessionEngine consumers (D-06 option b) — v1.x.
- Compile-time lock for "this consumer wants per-frame, use liveFrame" — v1.x.
- Move entire stats-record + leave-running cleanup logic into useSessionEngine (D-06 option c) — too invasive for hygiene phase; v1.x.
- `react-hooks/exhaustive-deps` self-enforcement custom rule for un-annotated disables — v1.x (Phase 7 D-05 still deferred).

</user_constraints>

## Project Constraints (from CLAUDE.md)

`./CLAUDE.md` does not exist at repo root. The personal `~/.claude/CLAUDE.md` discusses `rtk` (Rust Token Killer CLI proxy) and is operator tooling — not a project-level constraint. No project-level directives override Phase 10's design. [VERIFIED: filesystem grep — `ls /Users/lucindo/Code/hrv/CLAUDE.md` returns nothing]

## Architectural Responsibility Map

| Capability | Primary Tier | Secondary Tier | Rationale |
|------------|-------------|----------------|-----------|
| Per-phase frame identity (`currentFrame`) | useSessionEngine hook | — | State owner owns identity contract |
| Per-rAF frame value (`liveFrame`) | useSessionEngine hook | BreathingShape / SessionReadout consumers | Hook exposes; visual components consume per-frame |
| Running-snapshot ref ownership | useSessionEngine hook | App.tsx leave-running cleanup (reader only) | D-06 "Owner of state owns the writer" |
| rAF cancel-guard | useSessionEngine hook | — | Tick callback is purely internal to the engine |
| mutedRef + callback identity | useAudioCues hook | App.tsx onStartClick consumer (downstream identity stability) | Hook owns ref; App benefits without touching it |
| App leave-running cleanup orchestration | App.tsx effect | wakeLock, audio hooks (side-effect targets) | App owns side-effect orchestration; hooks expose stable APIs |
| BreathingShape / SessionReadout rendering | Component | — | Consumes `frame` prop verbatim; no internal change needed |

**Why this matters:** Phase 10 is a tier-discipline phase. The HOOKS-02 + HOOKS-03 fixes specifically move responsibility CLOSER to the state owner (useSessionEngine) and AWAY from the orchestrator (App.tsx). Misassigning the runningSnapshotRef writer back to App.tsx (or putting `currentFrame` memoization in App.tsx) would re-introduce the per-frame effect re-runs the phase exists to eliminate.

## Standard Stack

This is an in-place hygiene phase. No new dependencies. All required libraries are already installed and verified at HEAD.

### Core
| Library | Version | Purpose | Why Standard |
|---------|---------|---------|--------------|
| React | ^19.2.5 | Hooks runtime — `useRef`, `useMemo`, `useEffect`, `useCallback` | Already in use; React 19's exhaustive-deps story is stable for optional-chain deps in eslint-plugin-react-hooks 7.x+ |
| @testing-library/react | ^16.3.2 | `renderHook` + `act` for hook-identity assertions | Already used by `useAudioCues.test.tsx`, `useSessionEngine.test.tsx` |
| vitest | ^4.1.5 | Test runner + `vi.useFakeTimers()` + `vi.stubGlobal` | Already configured; fake timers mock `requestAnimationFrame` by default per [Vitest fakeTimers config](https://vitest.dev/config/faketimers) |
| eslint-plugin-react-hooks | ^7.1.1 | `exhaustive-deps` at error level + `set-state-in-effect` warnings | Phase 7 D-04 baseline; v7.0+ added nullish coalescing + optional chaining support in dep arrays |
| typescript-eslint | ^8.58.2 | `strictTypeChecked` preset | Phase 7 D-01 baseline |

[VERIFIED: package.json HEAD — versions match `npm view` registry as of 2026-05-11; React 19.2.5 published 2025-12, eslint-plugin-react-hooks 7.1.1 published 2025-11]

### Supporting
| Library | Version | Purpose | When to Use |
|---------|---------|---------|-------------|
| jsdom | ^29.1.1 | DOM polyfill for hook tests | Used by all `*.test.tsx` files; provides `document.dispatchEvent`, `setTimeout`, etc. |

### Alternatives Considered
| Instead of | Could Use | Tradeoff |
|------------|-----------|----------|
| Plain `useMemo` for `currentFrame` | `useEvent` (React experimental) | `useEvent` is unstable in React 19; not exported. Adds risk for no win — primitives-only deps already give stable identity. |
| `useRef`-based identity-stable wrapper | `useSyncExternalStore` | Overkill — the state is already inside React; `useSyncExternalStore` is for non-React sources. |
| Custom ref-equality memo helper | None | Idiomatic React patterns suffice. D-03 explicitly chose primitives-only deps over custom ref-equality. |

**Installation:** None — all dependencies present. No `npm install` step required.

**Version verification:** [VERIFIED: `npm view react version` → 19.2.5 matches]. [VERIFIED: `npm view eslint-plugin-react-hooks version` → confirms 7.1.1 line is current and supports optional-chain deps].

## Architecture Patterns

### System Architecture Diagram

```
                  ┌─────────────────────────────────────────────────────┐
                  │ User input (Start / End / Mute click)               │
                  └────────────────────────┬────────────────────────────┘
                                           │
                                           ▼
                        ┌────────────────────────────────────┐
                        │ App.tsx (orchestrator)             │
                        │ - onStartClick, requestEnd         │
                        │ - boundary effect (audio cue route)│
                        │ - leave-running cleanup effect ◄───┼─── reads runningSnapshotRef.current
                        │ - sessionFrameRef updater          │       (Phase 10 HOOKS-02)
                        └─────────┬──────────────┬───────────┘
                                  │              │
                                  │              ▼
                                  │   ┌──────────────────────────────────┐
                                  │   │ useSessionEngine                 │
                                  │   │ - SessionState (status, lastFrame│
                                  │   │ - rAF effect [state.status]      │
                                  │   │     tick() {                     │
                                  │   │       if (cancelled) return ◄────┼── Phase 10 HOOKS-04 (top of tick)
                                  │   │       snapshotRef.current = {...}┼── Phase 10 HOOKS-02 (D-08 ref-write BEFORE setState)
                                  │   │       setState(...)              │
                                  │   │       if (!cancelled) rAF(tick)  │
                                  │   │     }                            │
                                  │   │ - currentFrame = useMemo([...])  │◄─── Phase 10 HOOKS-03 (primitives-only deps)
                                  │   │ - liveFrame = direct read        │◄─── Phase 10 HOOKS-03 (per-rAF, no memo)
                                  │   │ - runningSnapshotRef             │◄─── Phase 10 HOOKS-02 (new field, ref owner)
                                  │   └──────────────────────────────────┘
                                  ▼
                ┌──────────────────────────────────────────┐
                │ useAudioCues                             │
                │ - engineRef, audioStatus, muted state    │
                │ - mutedRef [updated on effect [muted]] ◄─┼── Phase 10 HOOKS-01
                │ - start = useCallback([handleStateChange])◄─── (drops muted dep)
                │ - reconstructEngine = useCallback([..]) ◄┼── (drops muted dep)
                └──────────────────────────────────────────┘
                                  │
                                  ▼
                ┌──────────────────────────────────────────┐
                │ Visual consumers                         │
                │ - BreathingShape (frame={session.liveFrame})◄─── Phase 10 D-05 migration
                │ - SessionReadout (frame={lead-in?? session.liveFrame})◄─── Phase 10 D-05 migration
                └──────────────────────────────────────────┘
```

### Recommended Project Structure

Unchanged. Phase 10 is in-place edits to three files:

```
src/
├── hooks/
│   ├── useSessionEngine.ts          # Task 1: HOOKS-03 + HOOKS-04 + runningSnapshotRef
│   ├── useSessionEngine.test.tsx    # Task 1 tests (EXTEND — file exists)
│   ├── useAudioCues.ts              # Task 2: HOOKS-01 mutedRef
│   └── useAudioCues.test.tsx        # Task 2 tests (EXTEND)
└── app/
    └── App.tsx                       # Task 3: HOOKS-02 dep tightening + liveFrame migration + DELETE 412-420 + HOOKS-05 verify
```

### Pattern 1: Primitives-only useMemo dep narrowing for per-phase identity

**What:** A memoized value that recomputes only when narrowed primitive keys change, giving stable `===` identity within a phase.

**When to use:** When a downstream consumer's effect depends on the value but only cares about coarse-grained changes (phase boundary, not per-frame).

**Example (D-03 final shape — Claude's discretion on narrowing form):**

```typescript
// Source: derived from useSessionEngine.ts:59-62 HEAD + D-03 lock
// Variant A: inline access to optional chain. eslint-plugin-react-hooks 7.x supports this.
const currentFrame = useMemo<SessionFrame | null>(
  () => (state.status === 'running' ? state.lastFrame : null),
  [state.status, state.lastFrame?.cycleIndex, state.lastFrame?.phase],
)

// Variant B: local narrowing (more defensive against any future plugin regression).
const lastFrame = state.status === 'running' ? state.lastFrame : null
const cycleKey = lastFrame?.cycleIndex
const phaseKey = lastFrame?.phase
const currentFrame = useMemo<SessionFrame | null>(
  () => lastFrame,
  [state.status, cycleKey, phaseKey],
)
```

Both pass `react-hooks/exhaustive-deps` per [eslint-plugin-react-hooks 7.0 changelog — nullish coalescing + optional chaining support](https://github.com/facebook/react/blob/main/packages/eslint-plugin-react-hooks/CHANGELOG.md). [VERIFIED: package.json shows eslint-plugin-react-hooks ^7.1.1.]

### Pattern 2: Ref-on-top-of-state for callback identity stability

**What:** A `useRef` whose `.current` is kept in sync with a state value via a tiny effect; callbacks read the ref instead of the state, so callback identity does not depend on the state.

**When to use:** When a callback's dep array includes a state that changes frequently (mute toggles, prop churn) and the callback identity matters to downstream memoization.

**Example (mirrors `useAudioCues.ts:106-109` `onReanchorRequiredRef` pattern):**

```typescript
// Source: useAudioCues.ts:106-109 (HEAD) + D-11 lock
const mutedRef = useRef<boolean>(initialMuted ?? false)
useEffect(() => {
  mutedRef.current = muted
}, [muted])

// Drops `muted` from the dep array. start() identity now changes only when
// handleStateChange changes (which is itself useCallback([])).
const start = useCallback(
  async (plan: BreathingPlan): Promise<number | null> => {
    // ... synchronous AC construction (gesture-preserving) ...
    engine.setMuted(mutedRef.current) // read the ref, not the state
    // ...
  },
  [handleStateChange], // muted removed
)
```

### Pattern 3: rAF cancel-guard at top of tick

**What:** A boolean flag set by the effect's cleanup, checked as the FIRST statement of the rAF callback. Guarantees that any tick fired after teardown is a no-op.

**When to use:** Any rAF-driven hook where teardown order matters and an extra tick after `cancelAnimationFrame` could observably interact with React state.

**Example (D-10 lock — mechanical relocation):**

```typescript
// Source: useSessionEngine.ts:37-49 HEAD + D-10 lock — single-line edit pattern.
const tick = () => {
  if (cancelled) return  // HOOKS-04 — first statement
  setState((currentState) => {
    if (currentState.status !== 'running') return currentState
    return completeIfNeeded(currentState, performance.now())
  })
  if (!cancelled) {
    animationFrameId = requestAnimationFrame(tick)
  }
}
```

### Pattern 4: Ref-owner-writes-from-tick (state owner owns the writer)

**What:** When a snapshot of mutating state needs to outlive the state's discriminated-union narrowing, the hook owning the state writes the snapshot ref from inside its own update path (rAF tick, callback, etc.) — not via a React effect at the consumer.

**When to use:** When the consumer needs to read post-narrowing state values during a cleanup that fires AFTER the narrowing has happened.

**Example (D-06/D-07/D-08 lock):**

```typescript
// Source: derived from App.tsx:179-183 (existing shape) + D-06/D-07/D-08 lock
export interface RunningSnapshot {
  key: string
  startedAtMs: number
  lastElapsedMs: number
}

// Inside useSessionEngine:
const runningSnapshotRef = useRef<RunningSnapshot | null>(null)

useEffect(() => {
  if (state.status !== 'running') return undefined

  let animationFrameId = 0
  let cancelled = false

  const tick = () => {
    if (cancelled) return  // HOOKS-04

    // D-08: ref-write BEFORE setState. Snapshot reflects LAST known elapsed values.
    setState((currentState) => {
      if (currentState.status !== 'running') return currentState

      // Write the snapshot from inside the updater so it reads the latest
      // running state (closure on `state` in the outer effect would be stale).
      runningSnapshotRef.current = {
        key: String(currentState.startedAtMs),
        startedAtMs: currentState.startedAtMs,
        lastElapsedMs: currentState.lastFrame.elapsedMs,
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

**Note on D-08 vs the diagram:** The strict reading of D-08 ("at the top of the rAF tick callback, BEFORE the setState call") means writing BEFORE setState. But that would close over a stale `state` from the outer effect — only `state.status` is in the dep array, so the closure does not refresh per tick. The correct implementation writes from INSIDE the setState updater, where `currentState` is the live value. The planner should resolve this — researcher recommends "inside the updater" (above) as the only correct shape under React 19's batched updater semantics. [ASSUMED — needs planner / discuss-phase confirmation; D-08 wording is ambiguous on this point]

**Null-out timing:** The leave-running effect at `App.tsx:462` currently nulls `runningSnapshotRef.current = null` after the stats write. Under D-06/D-07 the hook owns the ref, but the App effect still needs to null it (or read-then-discard) to match the existing recordedSessionKeyRef idempotency posture. Planner decides: (a) hook nulls on `status → !running` cleanup of the rAF effect, or (b) App keeps the null-out at 462. Option (a) is cleaner; option (b) preserves the App-side idempotency invariant. Researcher mild preference: (a) + remove `App.tsx:462` null-out. [ASSUMED — needs planner decision]

### Pattern 5: Anti-pattern — depending on per-rAF object identity

**What goes wrong:** Effects with `[state]` or `[session.currentFrame]` in deps re-run every animation frame when state is a fresh object each tick. The body short-circuits, but React still does the dep-comparison work — hundreds of effect executions per second.

**Examples already in HEAD that Phase 10 fixes:**
- `App.tsx:420` `useEffect(..., [state])` running-snapshot writer — DELETED per D-06.
- `App.tsx:464` `useEffect(..., [state, audioStop, wakeLockRelease, clearLeadInTimeouts])` leave-running cleanup — narrowed to `[state.status, ...]` per D-09.

### Anti-Patterns to Avoid

- **Using `currentFrame` for per-rAF visual rendering after Phase 10.** Use `liveFrame`. [VERIFIED: only 2 sites consume frame for rendering: `App.tsx:556` BreathingShape, `App.tsx:560` SessionReadout. Both migrate per D-05.]
- **Putting the runningSnapshotRef writer back in App.tsx as a per-render effect.** D-06 explicitly moves ownership to the hook to avoid the per-rAF effect re-runs.
- **Adding `// eslint-disable-next-line react-hooks/exhaustive-deps` for the new dep arrays.** Phase 7 D-04 + D-19 require `// Reason:` annotations on every surviving disable; the design must pass exhaustive-deps cleanly. eslint-plugin-react-hooks 7.x supports `state.lastFrame?.cycleIndex` in deps natively.
- **Forgetting `state.lastFrame?.cycleIndex` is `0` legitimately at session start.** Falsy values must not trigger spurious memo recompute — the dep compare uses `Object.is`, which handles 0 correctly. Not a hazard with primitives-only deps.
- **Reading `runningSnapshotRef.current` from a callback whose dep array excludes the ref.** Refs are stable; never put them in deps. The leave-running cleanup reads `.current` synchronously inside the effect body — correct posture.

## Don't Hand-Roll

| Problem | Don't Build | Use Instead | Why |
|---------|-------------|-------------|-----|
| Stable callback identity across prop changes | Custom `useStableCallback` hook | `useRef` + sync effect (Pattern 2 above) | React's experimental `useEvent` is not in React 19 stable; the ref-mirror pattern is the documented workaround [Reference: React docs](https://react.dev/reference/react/useRef) and already used twice in this codebase (`onReanchorRequiredRef`, `reconstructGenerationRef`) |
| Per-frame memo identity stability | Custom ref-equality wrapper | Primitives-only useMemo deps (Pattern 1 above) | Idiomatic React; passes exhaustive-deps; no new abstraction. CONTEXT D-03 explicitly rejects composite-key-string and ref-equality patterns. |
| rAF teardown ordering | Manual queueing / generation counter | `cancelled` flag + cancel-guard at top of tick (Pattern 3 above) | Same closure variable pattern already used in `useSessionEngine.ts:53-56`. Generation counters are for async-token invalidation (Phase 9 AUDIO-01), not for rAF — rAF is synchronous. |
| Cross-effect shared state | Custom event emitter / pub-sub | `useRef` (Pattern 4 above) | Refs survive renders, have no identity churn, and don't need dep tracking. CONTEXT D-06 rejected `useEvent`-style stable callbacks for the running-snapshot writer in favor of direct ref ownership. |

**Key insight:** Every problem Phase 10 solves has an idiomatic React shape already in this codebase. The phase is mechanical: lift those existing patterns one level (mutedRef from a hypothesis to a fact; runningSnapshotRef from App-effect-write to hook-rAF-write; cancel-guard from end-of-tick to start-of-tick) and migrate two App.tsx consumer call sites to the new `liveFrame` output.

## Runtime State Inventory

> Skipped — Phase 10 is purely a code/identity-discipline phase. No rename, refactor of stored data, or migration. No databases, services, OS-registered state, secrets, or build artifacts are affected.

**Stored data:** None affected. (localStorage envelope unchanged.) [VERIFIED: grep `localStorage|storage` in `src/hooks/useSessionEngine.ts`, `src/hooks/useAudioCues.ts`, App.tsx target lines — no storage writes change.]
**Live service config:** None. (No external services.)
**OS-registered state:** None.
**Secrets/env vars:** None.
**Build artifacts:** None new — `npm run build` re-emits the existing bundle.

## Common Pitfalls

### Pitfall 1: D-08 closure-staleness if write happens BEFORE setState in outer scope

**What goes wrong:** A literal reading of D-08 "ref-write before the setState call" can be implemented as `runningSnapshotRef.current = { ...state }` BEFORE `setState(...)` at the top of `tick()`. But `state` in that scope comes from the outer effect closure, which only re-runs on `[state.status]` — so `state.lastFrame` is the value at the time the running effect started, NOT the latest tick.

**Why it happens:** React 18+ batches state updates; the outer effect closure captures `state` at the time of effect installation, not at each rAF callback invocation. The updater function inside `setState` receives the live `currentState` — that's where the snapshot must be computed.

**How to avoid:** Write the snapshot INSIDE the `setState((currentState) => ...)` updater, before the `completeIfNeeded` return (see Pattern 4 above). The "before setState" semantic in D-08 should be interpreted as "synchronous in the same call-stack as the setState, computed from the live updater state" — not as "in the lexical line preceding setState in the outer closure".

**Warning signs:** A test that asserts `runningSnapshotRef.current.lastElapsedMs` advances over time would fail with the literal-reading implementation (snapshot frozen at session start).

**Resolution recommendation for planner:** Flag this to discuss-phase or treat as Claude's-discretion implementation detail since the failure mode is test-detectable.

### Pitfall 2: liveFrame consumer drift — using session.currentFrame for visual rendering post-Phase-10

**What goes wrong:** A future PR adds a third consumer (e.g., a sparkline component or a debug overlay) and reaches for `session.currentFrame` expecting per-rAF freshness. The visual stutters at phase rate (every ~10s at default BPM) instead of animating smoothly.

**Why it happens:** The Phase 10 contract change is INVISIBLE in the type — both `currentFrame` and `liveFrame` are `SessionFrame | null`. Only the comment and the JSDoc differentiate them.

**How to avoid:** JSDoc on `SessionEngine.currentFrame` and `SessionEngine.liveFrame` must be prescriptive — `currentFrame` "use for phase-boundary effects (cycleIndex/phase reads only); identity stable within phase", `liveFrame` "use for per-frame visual rendering; identity changes per rAF". CONTEXT §"Deferred Ideas" lists a compile-time lock (brand types or custom lint rule) as v1.x candidate — if drift appears.

**Warning signs:** A PR review where someone writes `<SomeVisualComponent frame={session.currentFrame} />`. Plan-checker could grep for this pattern as a tier-discipline check.

### Pitfall 3: HOOKS-05 false-passive — exhaustive-deps trips after the Phase 10 changes

**What goes wrong:** CONTEXT D-18 says HOOKS-05 is verification-only. But the dep-tightening edits in D-09 (`[state, ...]` → `[state.status, ...]`) could surface an exhaustive-deps complaint about an inner read of `state.completedAtMs` or `state.lastFrame.elapsedMs` that the linter now treats as a missing dep (since `state` itself is no longer in the array).

**Why it happens:** The leave-running cleanup body reads `state.completedAtMs` (line 456) and `state.lastFrame.elapsedMs` indirectly through `snap.lastElapsedMs`. With `state` in deps, the linter saw `state.X` reads as covered. With only `state.status` in deps, the linter could flag `state.completedAtMs`. The discriminated-union narrowing on `state.status === 'complete'` means TS is happy, but the linter compares syntactic deps.

**How to avoid:** Test the new dep array with `npm run lint` IMMEDIATELY after the App.tsx edit lands. If exhaustive-deps trips on `state.completedAtMs`:
- Option A: extract `const completedAtMs = state.status === 'complete' ? state.completedAtMs : null` at the top of the effect and declare `[state.status, completedAtMs, ...]`.
- Option B: rely on the snapshot — store `completedAtMs` in `RunningSnapshot` too, then the effect body only reads `snap.X` and the dep array shrinks further.
- Option C (last resort, Phase 7 D-04 compliant): `// Reason: state.completedAtMs narrowed via state.status discriminant; safe to read inside isComplete branch.` + `// eslint-disable-next-line react-hooks/exhaustive-deps`.

**Warning signs:** `npm run lint` exits non-zero after the App.tsx task with the message `react-hooks/exhaustive-deps: 'state.completedAtMs' is missing from dep array`. Researcher's read of HEAD says this is plausible but not certain — eslint-plugin-react-hooks 7.x's flow analysis may correctly narrow on the discriminated union. [ASSUMED — confirm empirically during execution]

### Pitfall 4: Test count target drift

**What goes wrong:** CONTEXT D-15 targets 381 → ~389 tests (delta of +8). Researcher's verification at HEAD shows 381 passing tests. If D-13 lands ~5-6 tests + D-14 lands ~2-3 tests, the delta is +7 to +9 — consistent with ~389-390.

**Why it matters:** Phase 7 D-09 and CONTEXT D-21 require the full Vitest suite to stay green at every commit. The count itself is not a contract but a sanity check — if the final count is, say, 376 (regression) or 405 (over-test), the plan-checker should flag it.

**How to avoid:** Plan-checker computes expected count = 381 (baseline) + new tests added in this phase, and verifier asserts actual count matches. Existing tests must NOT change count — only NEW tests are added (test-locking behavior, not changing it).

**Warning signs:** A failing test in `useAudioCues.test.tsx` that wasn't touched, or `useSessionEngine.test.tsx` losing a test through accidental deletion when extending.

## Code-State Verification

> Researcher confirms CONTEXT.md line numbers against HEAD as of 2026-05-11 commit `352181d`.

| CONTEXT.md claim | HEAD reality | Drift? |
|---|---|---|
| `useSessionEngine.ts:14-21` SessionEngine interface | Lines 14-21 — `interface SessionEngine` with `state`, `currentFrame`, `setSelectedSettings`, `start`, `end`, `extendDuration` | NO DRIFT [VERIFIED: file Read] |
| `useSessionEngine.ts:29-57` rAF effect | Lines 29-57 — `useEffect(() => { ... }, [state.status])` with `cancelled` flag at 35 and rAF teardown at 53-56 | NO DRIFT [VERIFIED] |
| `useSessionEngine.ts:37` `tick` | Line 37 — `const tick = () => {` | NO DRIFT [VERIFIED] |
| `useSessionEngine.ts:53-56` teardown pattern | Lines 53-56 — `return () => { cancelled = true; cancelAnimationFrame(animationFrameId) }` | NO DRIFT [VERIFIED] |
| `useSessionEngine.ts:59-62` currentFrame useMemo | Lines 59-62 — `useMemo(() => state.status === 'running' ? state.lastFrame : null, [state])` | NO DRIFT [VERIFIED — current dep is `[state]` exactly as CONTEXT implies] |
| `useAudioCues.ts:71-91` hook intro | Lines 71-91 — function signature, engineRef, firstInCueTimeRef, reconstructGenerationRef, status state, muted state | NO DRIFT [VERIFIED] |
| `useAudioCues.ts:106-109` ref-mirror pattern | Lines 106-109 — `useRef<typeof onReanchorRequired>(onReanchorRequired)` + `useEffect(() => { onReanchorRequiredRef.current = onReanchorRequired }, [onReanchorRequired])` | NO DRIFT [VERIFIED — Pattern 2 exemplar matches] |
| `useAudioCues.ts:192-232` `start` callback | Lines 192-232 — `useCallback(async (plan) => { ... }, [muted, handleStateChange])` | NO DRIFT [VERIFIED — line 231 dep array `[muted, handleStateChange]` exactly] |
| `useAudioCues.ts:269-325` `reconstructEngine` | Lines 269-325 — `useCallback(async () => { ... const currentMuted = muted; ... }, [muted, handleStateChange])` | NO DRIFT [VERIFIED — line 273 captures muted state, line 325 dep array] |
| `App.tsx:80-84` (CONTEXT says :80-82) sessionFrameRef | Lines 81-84 — `useRef(session.currentFrame)` + `useEffect(() => { sessionFrameRef.current = session.currentFrame }, [session.currentFrame])` | **TINY DRIFT** — CONTEXT cites :80-82 / :80-84; actual is :81-84. Off by one line in CONTEXT (likely from a since-removed blank line). Effect ALREADY has explicit deps. HOOKS-05 is genuinely verification-only. [VERIFIED] |
| `App.tsx:412-420` running-snapshot effect | Lines 412-420 — `useEffect(() => { if (state.status === 'running') runningSnapshotRef.current = {...} }, [state])` | NO DRIFT [VERIFIED — exact effect to DELETE per D-06] |
| `App.tsx:428-464` leave-running cleanup | Lines 428-464 — `useEffect(() => { if (state.status !== 'running') { ... } }, [state, audioStop, wakeLockRelease, clearLeadInTimeouts])` | NO DRIFT [VERIFIED — line 464 dep array exactly matches CONTEXT D-09] |
| `App.tsx:462` runningSnapshotRef null-out | Line 462 — `runningSnapshotRef.current = null` | NO DRIFT [VERIFIED — but see Pitfall 4-ish: under D-06/D-07, this null-out's ownership is ambiguous; planner decides] |
| `App.tsx:556` BreathingShape frame consumer | Line 556 — `<BreathingShape frame={appPhase === 'running' ? session.currentFrame : null} ...>` | NO DRIFT [VERIFIED — migrate to liveFrame per D-05] |
| `App.tsx:560` SessionReadout frame consumer | Line 560 — `<SessionReadout frame={leadInPlaceholderFrame ?? session.currentFrame} ...>` | NO DRIFT [VERIFIED — migrate to liveFrame per D-05] |
| `useAudioCues.test.tsx` reusable harness | File exists, uses `vi.useFakeTimers()` + `SpyableAC` class (lines 337-360, 451+) + `renderHook` from `@testing-library/react`. Identity-assertion via `result.current.start` reference capture is supported by the renderHook return shape. | NO DRIFT [VERIFIED — D-14 extension can reuse SpyableAC class for AC mocking; rerender support via the `rerender` method documented in [@testing-library/react renderHook API](https://testing-library.com/docs/react-testing-library/api/#renderhook)] |
| All four "Reference patterns" in CONTEXT § canonical_refs | `useAudioCues.ts:106-109` ✓; `useAudioCues.ts:271,86` ✓ (reconstructGenerationRef at line 86, ++ at line 271); `useSessionEngine.ts:53-56` ✓; `App.tsx:81-84` ✓ | NO DRIFT [VERIFIED — all four exist exactly as cited] |

**One drift to call out:**

- **CONTEXT D-13 / D-20 say `src/hooks/useSessionEngine.test.ts` is NEW** ("structural gap-fill — useSessionEngine currently has no test file"). **HEAD reality:** `src/hooks/useSessionEngine.test.tsx` (note the `.tsx` extension) ALREADY EXISTS with 5 tests covering start, advance In→Out, end, complete, extendDuration. The plan must treat D-13 as EXTEND, not NEW. This is a meaningful drift because the D-13 tests live in `.tsx` not `.ts`, and the existing tests need to be preserved (the new identity-stability tests are additive). [VERIFIED: `ls src/hooks/useSessionEngine.test.tsx` returns the file with `mtime 2026-05-09`]

## Code Examples

> All examples are minimal patches against HEAD. Final implementation belongs to the planner/executor.

### Example 1: `useSessionEngine.ts` — full hook with HOOKS-03 + HOOKS-04 + runningSnapshotRef

```typescript
// Source: target shape derived from useSessionEngine.ts HEAD + D-01..D-10 lock.
import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
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

// D-07 lock — RunningSnapshot shape matches App's existing definition verbatim.
export interface RunningSnapshot {
  key: string
  startedAtMs: number
  lastElapsedMs: number
}

export interface SessionEngine {
  state: SessionState
  /**
   * Phase 10 HOOKS-03: per-phase-stable frame identity. Same `===` reference
   * across renders within the same cycleIndex:phase. Use this for effects
   * that should fire once per phase boundary (audio cue scheduling,
   * sessionFrameRef updater) — NOT for per-frame visual rendering.
   */
  currentFrame: SessionFrame | null
  /**
   * Phase 10 HOOKS-03: per-rAF frame value. Identity changes every animation
   * frame; phaseProgress and elapsedMs are fresh. Use this for visual
   * rendering (BreathingShape, SessionReadout) — NOT for phase-boundary
   * effects.
   */
  liveFrame: SessionFrame | null
  /**
   * Phase 10 HOOKS-02 (D-06/D-07/D-08): running-session snapshot owned by the
   * engine, written from inside the rAF tick. Consumed by the App's
   * leave-running cleanup. Read .current synchronously; refs are stable —
   * do NOT put in effect dep arrays.
   */
  runningSnapshotRef: React.RefObject<RunningSnapshot | null>
  setSelectedSettings(this: void, settings: SessionSettings): void
  start(this: void): void
  end(this: void): void
  extendDuration(this: void, durationMinutes: number): void
}

export function useSessionEngine(initialSettings: SessionSettings = DEFAULT_SETTINGS): SessionEngine {
  const [state, setState] = useState<SessionState>(() => ({
    status: 'idle',
    selectedSettings: { ...initialSettings },
  }))

  // D-06/D-07: hook owns the running-snapshot ref. App's running-snapshot
  // effect at App.tsx:412-420 is DELETED in Task 3.
  const runningSnapshotRef = useRef<RunningSnapshot | null>(null)

  useEffect(() => {
    if (state.status !== 'running') {
      // D-06: null-out on transition out of running so the next session
      // starts with a fresh snapshot. (Planner decides whether the App.tsx:462
      // null-out is kept as belt-and-suspenders or removed.)
      runningSnapshotRef.current = null
      return undefined
    }

    let animationFrameId = 0
    let cancelled = false

    const tick = () => {
      // D-10 (HOOKS-04): cancel-guard at top of tick. New first statement.
      if (cancelled) return

      setState((currentState) => {
        if (currentState.status !== 'running') {
          return currentState
        }
        // D-08: ref-write inside the updater so the snapshot reflects the
        // LAST known elapsed values (computed from currentState, not the
        // outer-closure state which only refreshes on status change).
        runningSnapshotRef.current = {
          key: String(currentState.startedAtMs),
          startedAtMs: currentState.startedAtMs,
          lastElapsedMs: currentState.lastFrame.elapsedMs,
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

  // D-03 (HOOKS-03): primitives-only deps. Recomputes only on status/cycle/phase change.
  // Same === reference across renders within the same phase tick.
  const currentFrame = useMemo<SessionFrame | null>(
    () => (state.status === 'running' ? state.lastFrame : null),
    [state.status, state.lastFrame?.cycleIndex, state.lastFrame?.phase],
  )

  // D-04: liveFrame — direct read, no memo. Identity changes per rAF by design.
  const liveFrame: SessionFrame | null =
    state.status === 'running' ? state.lastFrame : null

  // ... unchanged setSelectedSettings, start, end, extendDuration callbacks ...

  return {
    state,
    currentFrame,
    liveFrame,
    runningSnapshotRef,
    setSelectedSettings,
    start,
    end,
    extendDuration,
  }
}
```

### Example 2: `useAudioCues.ts` — mutedRef pattern (HOOKS-01)

```typescript
// Source: useAudioCues.ts:106-109 reference pattern + D-11 lock.

// Inside useAudioCues, near the other refs (after engineRef, before status state):
const mutedRef = useRef<boolean>(initialMuted ?? false)
const [muted, setMutedState] = useState<boolean>(initialMuted ?? false)

// D-11: sync effect. Mirrors onReanchorRequiredRef pattern at lines 106-109.
useEffect(() => {
  mutedRef.current = muted
}, [muted])

// start: drop `muted` from deps; read mutedRef.current.
const start = useCallback(
  async (plan: BreathingPlan): Promise<number | null> => {
    const existing = engineRef.current
    if (existing !== null) {
      return firstInCueTimeRef.current
    }
    try {
      const engine = await createAudioEngine({ onStateChange: handleStateChange })
      engineRef.current = engine
      engine.setMuted(mutedRef.current)  // ← was: engine.setMuted(muted)
      const startAudioTime = engine.now()
      const firstInCueTime = engine.scheduleLeadIn(startAudioTime, plan)
      if (firstInCueTime === null) { setAudioAvailable(false); setStatus('failed'); return null }
      firstInCueTimeRef.current = firstInCueTime
      setStatus('lead-in')
      setAudioAvailable(true)
      return firstInCueTime
    } catch {
      setAudioAvailable(false)
      setStatus('failed')
      return null
    }
  },
  [handleStateChange],  // ← was: [muted, handleStateChange]
)

// reconstructEngine: drop `muted` from deps; replace `const currentMuted = muted` with mutedRef read.
const reconstructEngine = useCallback(async (): Promise<void> => {
  const gen = ++reconstructGenerationRef.current
  const oldEngine = engineRef.current
  const currentMuted = mutedRef.current  // ← was: const currentMuted = muted
  engineRef.current = null
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
}, [handleStateChange])  // ← was: [muted, handleStateChange]
```

### Example 3: `App.tsx` — Task 3 edits

```typescript
// Source: App.tsx HEAD + D-05, D-06, D-09 locks.

// (1) DELETE the running-snapshot effect at lines 412-420 entirely.
//     The useSessionEngine hook now owns this ref-write via the rAF tick.

// (2) Update the runningSnapshotRef declaration at line 179 — REMOVE the local
//     useRef and consume from the hook instead:
const { state, currentFrame, liveFrame, runningSnapshotRef } = session

//     ...or keep destructuring style consistent with HEAD:
//     const liveFrame = session.liveFrame
//     const sessionRunningSnapshotRef = session.runningSnapshotRef

// (3) Tighten leave-running cleanup deps (line 464):
useEffect(() => {
  if (state.status !== 'running') {
    void audioStop()
    void wakeLockRelease()
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setAppPhase('idle')
    clearLeadInTimeouts()
    audioAnchorRef.current = null
    planRef.current = null
    lastBoundaryKeyRef.current = null

    const snap = session.runningSnapshotRef.current  // ← was: runningSnapshotRef.current (local)
    if (snap !== null && recordedSessionKeyRef.current !== snap.key) {
      const isComplete = state.status === 'complete'
      const elapsedMs = isComplete
        ? state.completedAtMs - snap.startedAtMs
        : snap.lastElapsedMs
      const updated = recordSession(elapsedMs, isComplete)
      setStats(updated)
      recordedSessionKeyRef.current = snap.key
    }
    // Planner decides: keep the null-out here, or let the hook handle it on status transition.
    session.runningSnapshotRef.current = null
  }
}, [state.status, audioStop, wakeLockRelease, clearLeadInTimeouts])
//   ^^^^^^^^^^^^ ← was: state — now state.status (D-09)

// (4) BreathingShape + SessionReadout migration (D-05):
<BreathingShape
  frame={appPhase === 'running' ? session.liveFrame : null}  // ← was: session.currentFrame
  leadInDigit={appPhase === 'lead-in' ? leadInDigit : null}
/>
<SessionReadout
  frame={leadInPlaceholderFrame ?? session.liveFrame}  // ← was: session.currentFrame
  status={appPhase === 'lead-in' ? 'idle' : state.status}
  message={state.status === 'complete' && !inSessionView ? state.message : undefined}
/>

// (5) sessionFrameRef updater at lines 81-84: NO CHANGE.
//     The effect's existing [session.currentFrame] dep array inherits the new
//     per-phase cadence automatically (HOOKS-05 verification target).

// (6) Boundary effect at lines 480-527: NO CHANGE.
//     The dep array already includes session.currentFrame; under the new
//     per-phase identity, the effect fires once per phase boundary instead
//     of every rAF. The existing lastBoundaryKeyRef gate at line 488 is now
//     redundant-but-harmless (boundary effect won't fire mid-phase). Keep it
//     as defense-in-depth.
```

### Example 4: `useSessionEngine.test.tsx` — D-13 identity tests (EXTEND existing file)

```typescript
// Source: D-13 lock + Vitest fakeTimers contract — appended to existing describe block.

import { act, renderHook } from '@testing-library/react'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import type { SessionSettings } from '../domain/settings'
import { useSessionEngine } from './useSessionEngine'

const defaultSettings: SessionSettings = {
  bpm: 5.5,
  ratio: '40:60',
  durationMinutes: 10,
}

// ... existing tests ...

describe('useSessionEngine — identity contracts (Phase 10 HOOKS-03/04)', () => {
  beforeEach(() => {
    vi.useFakeTimers()
    vi.setSystemTime(new Date('2026-05-09T00:00:00.000Z'))
  })
  afterEach(() => {
    vi.useRealTimers()
  })

  it('currentFrame identity is stable across renders within the same phase', () => {
    const { result, unmount } = renderHook(() => useSessionEngine(defaultSettings))
    act(() => { result.current.start() })

    const firstFrame = result.current.currentFrame
    expect(firstFrame).not.toBeNull()

    // Advance < inhale duration to stay within the same phase tick.
    // inhaleMs at bpm 5.5 ratio 40:60 ≈ 4_363 ms — advance 1 s.
    act(() => { vi.advanceTimersByTime(1000) })

    expect(result.current.currentFrame).toBe(firstFrame)  // ===
    unmount()
  })

  it('currentFrame identity changes at a phase boundary', () => {
    const { result, unmount } = renderHook(() => useSessionEngine(defaultSettings))
    act(() => { result.current.start() })

    const inFrame = result.current.currentFrame
    expect(inFrame?.phase).toBe('in')

    // Advance past inhaleMs (~4_363 ms) to cross into Out.
    act(() => { vi.advanceTimersByTime(5000) })

    const outFrame = result.current.currentFrame
    expect(outFrame?.phase).toBe('out')
    expect(outFrame).not.toBe(inFrame)  // identity changed at boundary
    unmount()
  })

  it('liveFrame identity changes per rAF (per advance) while currentFrame stays stable', () => {
    const { result, unmount } = renderHook(() => useSessionEngine(defaultSettings))
    act(() => { result.current.start() })

    const live1 = result.current.liveFrame
    const stable1 = result.current.currentFrame

    act(() => { vi.advanceTimersByTime(100) })

    const live2 = result.current.liveFrame
    const stable2 = result.current.currentFrame

    expect(live2).not.toBe(live1)  // per-rAF freshness
    expect(stable2).toBe(stable1)  // per-phase stability
    unmount()
  })

  it('liveFrame.phaseProgress advances within a phase', () => {
    const { result, unmount } = renderHook(() => useSessionEngine(defaultSettings))
    act(() => { result.current.start() })

    const p1 = result.current.liveFrame?.phaseProgress ?? 0
    act(() => { vi.advanceTimersByTime(1000) })
    const p2 = result.current.liveFrame?.phaseProgress ?? 0

    expect(p2).toBeGreaterThan(p1)
    unmount()
  })

  it('rAF cancel-guard: tick after effect cleanup is a no-op (HOOKS-04)', () => {
    // Strategy: spy on setState by checking that state shape does not change
    // after a synthetic post-cleanup rAF fire. Vitest's fake-timer rAF queue
    // is drained by advanceTimersByTime; after unmount the cleanup runs and
    // cancelled=true; a subsequent timer advance must not produce new state.
    const { result, unmount } = renderHook(() => useSessionEngine(defaultSettings))
    act(() => { result.current.start() })
    act(() => { vi.advanceTimersByTime(1000) })

    const frameBeforeUnmount = result.current.liveFrame
    unmount()  // cleanup fires; cancelled = true; cancelAnimationFrame called.

    // Any pending rAF callback that survives the cancelAnimationFrame
    // (jsdom uses setInterval under the hood — see Vitest docs) hits the
    // top-of-tick `if (cancelled) return` and exits without setState.
    act(() => { vi.advanceTimersByTime(1000) })
    // No way to read result.current after unmount; the negative assertion is
    // implicit: no act() warning, no console.error from setState-after-unmount.
    expect(frameBeforeUnmount).not.toBeNull()  // sanity guard
  })

  it('runningSnapshotRef.current is populated while running and nulled on transition out', () => {
    const { result, unmount } = renderHook(() => useSessionEngine(defaultSettings))
    expect(result.current.runningSnapshotRef.current).toBeNull()  // idle baseline

    act(() => { result.current.start() })
    act(() => { vi.advanceTimersByTime(1000) })  // rAF tick writes the snapshot

    const snap = result.current.runningSnapshotRef.current
    expect(snap).not.toBeNull()
    expect(snap?.key).toBe(String(performance.now() - 1000))  // approx; exact arithmetic depends on fake-timer base
    expect(snap?.lastElapsedMs).toBeGreaterThanOrEqual(1000 - 100)  // allow rAF jitter

    act(() => { result.current.end() })
    expect(result.current.runningSnapshotRef.current).toBeNull()  // nulled on transition
    unmount()
  })
})
```

### Example 5: `useAudioCues.test.tsx` — D-14 identity tests (EXTEND existing file)

```typescript
// Source: D-14 lock — appended to existing describe block in useAudioCues.test.tsx.
// Reuse the SpyableAC class already defined at lines 337-360 / 451+.

describe('useAudioCues — callback identity (Phase 10 HOOKS-01)', () => {
  afterEach(() => {
    vi.unstubAllGlobals()
    vi.restoreAllMocks()
  })

  it('start callback identity is stable across setMuted toggle (HOOKS-01)', async () => {
    vi.stubGlobal('AudioContext', SpyableAC)  // reuse existing SpyableAC
    const { result, unmount } = renderHook(() => useAudioCues())

    const startBefore = result.current.start
    act(() => { result.current.setMuted(true) })
    const startAfterMute = result.current.start
    act(() => { result.current.setMuted(false) })
    const startAfterUnmute = result.current.start

    expect(startAfterMute).toBe(startBefore)
    expect(startAfterUnmute).toBe(startBefore)
    unmount()
  })

  it('resume callback (proxy for reconstructEngine identity) is stable across setMuted', () => {
    vi.stubGlobal('AudioContext', SpyableAC)
    const { result, unmount } = renderHook(() => useAudioCues())

    const resumeBefore = result.current.resume  // resume calls reconstructEngine internally
    act(() => { result.current.setMuted(true) })
    const resumeAfter = result.current.resume

    expect(resumeAfter).toBe(resumeBefore)
    unmount()
  })

  it('baseline: handleStateChange identity unchanged across setMuted (regression guard)', () => {
    vi.stubGlobal('AudioContext', SpyableAC)
    // handleStateChange is internal to the hook (not in the return surface),
    // but its stability is asserted indirectly: the public start callback
    // identity is its only consumer in the dep array, so start === before/after
    // proves handleStateChange === across the toggle.
    const { result, unmount } = renderHook(() => useAudioCues())
    const startBefore = result.current.start
    act(() => { result.current.setMuted(true) })
    expect(result.current.start).toBe(startBefore)
    unmount()
  })
})
```

## State of the Art

| Old Approach | Current Approach | When Changed | Impact |
|--------------|------------------|--------------|--------|
| `useEvent` for stable callbacks | `useRef` + sync effect (Pattern 2) | React 18+ (useEvent never shipped to stable) | The ref-mirror pattern is the canonical idiom for stable callback identity in React 18/19. Already used twice in this codebase. |
| Optional chaining unsupported in exhaustive-deps | Supported natively | eslint-plugin-react-hooks 7.0 (2024) | `state.lastFrame?.cycleIndex` in dep arrays is now accepted. Project uses 7.1.1. [Reference: changelog](https://github.com/facebook/react/blob/main/packages/eslint-plugin-react-hooks/CHANGELOG.md) |
| Vitest fakeTimers required explicit `toFake: ['requestAnimationFrame']` | Default behavior includes rAF | Vitest 1.x+ | `vi.useFakeTimers()` mocks rAF by default since v1. Default `toFake` = "everything available globally except nextTick and queueMicrotask" [Reference: Vitest docs](https://vitest.dev/config/faketimers) |
| `useMemo` with object deps causing identity churn | Primitives-only deps (D-03) | React community consensus, ~2023+ | Idiomatic; passes exhaustive-deps; avoids ref-equality custom helpers. |
| App-level effects writing refs for hook-internal state | Hook owns the writer (D-06) | Tier-discipline principle | Cleaner separation; eliminates per-render effect overhead. |

**Deprecated/outdated:**
- `useEvent` proposal — was never shipped in React 19 stable; the ref-mirror workaround remains the recommended pattern.
- `Object.is` shallow ref-equality custom hooks — superseded by primitives-only useMemo deps.

## Assumptions Log

| # | Claim | Section | Risk if Wrong |
|---|-------|---------|---------------|
| A1 | D-08's "ref-write before the setState call" should be interpreted as "inside the setState updater" rather than "lexically before setState in the outer closure". The literal reading suffers from closure-staleness on `state.lastFrame.elapsedMs`. | §Common Pitfalls Pitfall 1; §Code Examples Example 1 | Planner picks literal reading; snapshot never advances; D-13 "runningSnapshotRef populated while running" test fails. **Mitigation:** Pitfall 1 documents the failure mode + the D-13 test catches it empirically. Recommend planner / discuss-phase confirm. |
| A2 | The `App.tsx:462` `runningSnapshotRef.current = null` null-out can either move to the hook's status-out-of-running cleanup (option a) or stay in App.tsx (option b). No technical impact either way. | §Code Examples Example 1 + Example 3 | Wrong choice → cosmetic only; both options work. Recommend planner picks (a) for tier discipline. |
| A3 | HOOKS-05 verification is genuinely passive (no edit). HEAD already has explicit `[session.currentFrame]` deps at App.tsx:84. Phase 10's contribution is cadence change only. | §"Code-State Verification" + Pitfall 3 | If exhaustive-deps trips on the tightened App.tsx:464 dep array (state → state.status), the plan needs a Pitfall 3 mitigation path (extract `completedAtMs` to a const, or add an annotated disable). Recommend executor run `npm run lint` between subtasks to detect early. |
| A4 | eslint-plugin-react-hooks 7.1.1 (installed) cleanly accepts `state.lastFrame?.cycleIndex` in a useMemo dep array. v7.0+ added support per the React monorepo changelog. | §"Standard Stack" + §Architecture Patterns Pattern 1 | If lint trips: fall back to local-narrowing form (Variant B in Pattern 1) — `const cycleKey = state.lastFrame?.cycleIndex`, then `[state.status, cycleKey, phaseKey]`. Both forms are presented; planner / executor picks. |
| A5 | The existing `SpyableAC` class in `useAudioCues.test.tsx` (lines 337-360, 451+) is reusable for D-14 identity tests. Identity assertions don't need a fully-functional AC mock — they only need `renderHook` to not throw during `useAudioCues()` invocation. | §"Code-State Verification" + Example 5 | If `setMuted(true)` requires more AC mock surface than SpyableAC provides, the D-14 tests may need a minimal additional stub. SpyableAC implements `createOscillator`, `createGain`, `createBiquadFilter`, `addEventListener`, `resume`, `close` — all the surface `setMuted` chains through. Risk: LOW. |
| A6 | Final test count = 381 (baseline) + ~6 (D-13) + ~3 (D-14) = ~390. CONTEXT D-15 targets ~389. Within tolerance. | §Pitfall 4 | Wrong by ±2 — cosmetic. No execution risk. |

**These assumptions should be confirmed by the planner.** A1 in particular has a non-trivial implementation impact and should either be (a) elevated to a planner decision, or (b) re-routed to discuss-phase if the planner is uncertain.

## Open Questions

1. **D-08 closure-staleness resolution (A1 in Assumptions Log)**
   - What we know: D-08 says "at the top of the rAF tick callback, BEFORE the setState call". This can be implemented two ways (lexical vs. inside-updater). Lexical fails the D-13 "snapshot advances" test; inside-updater succeeds.
   - What's unclear: Whether the discuss-phase intended the lexical reading.
   - Recommendation: Planner treats this as a Claude's-discretion implementation detail and picks the inside-updater form. If planner is uncertain, escalate to discuss-phase before the engine task lands.

2. **runningSnapshotRef null-out site (A2 in Assumptions Log)**
   - What we know: App.tsx:462 currently nulls the ref. Under D-06 the hook owns the ref. Both keep-or-move are valid.
   - What's unclear: CONTEXT doesn't explicitly say.
   - Recommendation: Hook handles it on transition-out-of-running (more consistent with D-06 "owner of state owns the writer"). Remove App.tsx:462 null-out. Test in D-13 already locks "nulled on transition out".

3. **D-13 file extension drift**
   - What we know: CONTEXT D-13 / D-20 / canonical_refs all say `useSessionEngine.test.ts` is NEW. Reality: `useSessionEngine.test.tsx` already exists with 5 tests.
   - What's unclear: Whether the CONTEXT author missed the existing file or intended a new `.ts` file alongside.
   - Recommendation: Plan treats D-13 as EXTEND of the existing `.tsx` file. Append new tests in a separate `describe` block. Do NOT create a parallel `.ts` file — would split the engine's contract across two files and violate Phase 9 D-14 co-location precedent.

4. **HOOKS-05 lint regression risk (A3 in Assumptions Log)**
   - What we know: HEAD's leave-running cleanup body reads `state.completedAtMs`. Tightening deps to `[state.status, ...]` might trip exhaustive-deps.
   - What's unclear: Whether eslint-plugin-react-hooks 7.1.1 narrows correctly on the discriminated union.
   - Recommendation: Plan-checker runs lint after the App.tsx task. If trip: option A (extract completedAtMs const) is the cleanest fix; option C (annotated disable) is the fallback per Phase 7 D-04.

## Environment Availability

> Skipped — Phase 10 has no external tool dependencies beyond the already-installed npm packages. All work runs inside the existing Vite + Vitest + TypeScript + ESLint toolchain.

[VERIFIED: `node --version` → v22.x (sufficient for Vite 8); `npm --version` works; all package versions match package.json HEAD]

## Validation Architecture

> Nyquist Dimension 8 — sampling rate per phase requirement.

### Test Framework

| Property | Value |
|----------|-------|
| Framework | Vitest 4.1.5 + @testing-library/react 16.3.2 |
| Config file | `vitest.setup.ts` (FakeAudioContext polyfill); `vite.config.ts` (test config inline) |
| Quick run command | `npx vitest run src/hooks/useSessionEngine.test.tsx src/hooks/useAudioCues.test.tsx` |
| Full suite command | `npm run test -- --run` |

### Phase Requirements → Test Map

| Req ID | Behavior | Test Type | Automated Command | File Exists? |
|--------|----------|-----------|-------------------|--------------|
| HOOKS-01 | `start` identity stable across `setMuted(true)` toggle | unit (renderHook) | `npx vitest run src/hooks/useAudioCues.test.tsx -t "start callback identity is stable"` | ❌ Wave 0 — new test in EXTEND of `useAudioCues.test.tsx` |
| HOOKS-01 | `reconstructEngine` identity stable across setMuted (via `resume` proxy) | unit (renderHook) | `npx vitest run src/hooks/useAudioCues.test.tsx -t "resume callback.+is stable"` | ❌ Wave 0 — new test |
| HOOKS-02 | `runningSnapshotRef` populated while running | unit (renderHook + fake timers) | `npx vitest run src/hooks/useSessionEngine.test.tsx -t "runningSnapshotRef.+populated"` | ❌ Wave 0 — new test in EXTEND of `useSessionEngine.test.tsx` |
| HOOKS-02 | App leave-running cleanup fires once per status-transition-out-of-running, not per rAF | integration (App-level — verified by existing boundary-cue exactly-once tests per D-15) | `npm run test -- --run` (full suite; relies on Phase 3 `lastBoundaryKeyRef` tests already locking this) | ✅ existing — `App.audio.test.tsx` |
| HOOKS-03 | `currentFrame` identity stable across renders within same `cycleIndex:phase` | unit (renderHook + fake timers) | `npx vitest run src/hooks/useSessionEngine.test.tsx -t "currentFrame identity is stable"` | ❌ Wave 0 — new test |
| HOOKS-03 | `currentFrame` identity changes at phase boundary | unit (renderHook + fake timers) | `npx vitest run src/hooks/useSessionEngine.test.tsx -t "currentFrame identity changes"` | ❌ Wave 0 — new test |
| HOOKS-03 | `liveFrame` identity changes per rAF; `currentFrame` stays stable | unit (renderHook + fake timers) | `npx vitest run src/hooks/useSessionEngine.test.tsx -t "liveFrame identity changes per rAF"` | ❌ Wave 0 — new test |
| HOOKS-03 | `liveFrame.phaseProgress` advances within a phase | unit (renderHook + fake timers) | `npx vitest run src/hooks/useSessionEngine.test.tsx -t "liveFrame.phaseProgress"` | ❌ Wave 0 — new test |
| HOOKS-04 | rAF cancel-guard: tick after teardown is a no-op | unit (renderHook + unmount + advanceTimersByTime) | `npx vitest run src/hooks/useSessionEngine.test.tsx -t "rAF cancel-guard"` | ❌ Wave 0 — new test |
| HOOKS-05 | `react-hooks/exhaustive-deps` passes on `App.tsx:81-84` and tightened `App.tsx:464` | lint (no test required) | `npm run lint` exits 0 | ✅ existing — enforced by Phase 7 D-04 / BUILD-03 |

### Sampling Rate

- **Per task commit:** `npx vitest run src/hooks/<file>.test.tsx` (the file touched by this task) — should complete in < 5 s.
- **Per wave merge:** `npm run test -- --run` (full Vitest suite, 381 + new tests ≈ 390) — completes in ~3 s on developer hardware per HEAD verification.
- **Phase gate:** Full suite green + `tsc --noEmit` exits 0 + `npm run lint` exits 0 + `npm run build` exits 0 before `/gsd-verify-work`. Per CONTEXT D-21 and Phase 7 D-09.

### Wave 0 Gaps

- [ ] `src/hooks/useSessionEngine.test.tsx` — extend with 5-6 identity-stability tests (HOOKS-03/04 + HOOKS-02 runningSnapshotRef lock). NO new file — file already exists per drift in §Code-State Verification.
- [ ] `src/hooks/useAudioCues.test.tsx` — extend with 2-3 callback-identity tests (HOOKS-01). NO new file.
- [ ] Framework install: none — Vitest, @testing-library/react, jsdom all present per package.json.
- [ ] No new App-level test file (per D-15). Existing `App.audio.test.tsx` and `App.persistence.test.tsx` cover boundary-cue exactly-once + leave-running cleanup correctness.

## Security Domain

> Required when `security_enforcement` is enabled. `.planning/config.json` does not set `security_enforcement` — default behavior applies.

### Applicable ASVS Categories

| ASVS Category | Applies | Standard Control |
|---------------|---------|------------------|
| V2 Authentication | no | No auth surface in this app (local-only, no backend) |
| V3 Session Management | no | No sessions in the security sense; "session" here = breathing session, not authenticated session |
| V4 Access Control | no | No access control |
| V5 Input Validation | no | Phase 10 changes no user input paths |
| V6 Cryptography | no | No crypto involved |

### Known Threat Patterns for the React-hooks domain

| Pattern | STRIDE | Standard Mitigation |
|---------|--------|---------------------|
| Memory leak via uncancelled rAF callback (resource exhaustion) | Denial of Service | HOOKS-04 cancel-guard at top of tick + existing `cancelAnimationFrame` in cleanup. Phase 10 directly addresses this. |
| Stale closure causing incorrect state writes (correctness) | Tampering (data integrity, self-inflicted) | Pattern 4 (ref-owner-writes-from-tick) ensures the snapshot reflects live state, not stale closure. Mitigated by D-08 + D-13 test lock. |
| Identity churn causing render explosion (resource exhaustion) | Denial of Service | HOOKS-01 mutedRef + HOOKS-03 currentFrame memoization eliminate the per-rAF render path. Phase 10's primary motivation. |

**No new security surface introduced.** Phase 10 is a hygiene patch that REDUCES resource consumption (effect re-runs) — net security posture improves.

## Sources

### Primary (HIGH confidence)
- HEAD source code at commit `352181d` — all line numbers verified against:
  - `src/hooks/useSessionEngine.ts` (124 lines)
  - `src/hooks/useAudioCues.ts` (376 lines)
  - `src/app/App.tsx` (623 lines)
  - `src/hooks/useAudioCues.test.tsx` (~600+ lines, full Read)
  - `src/hooks/useSessionEngine.test.tsx` (138 lines)
  - `src/components/BreathingShape.tsx` (221 lines)
  - `src/components/SessionReadout.tsx` (51 lines)
- `package.json` — dependency versions verified
- `.planning/REQUIREMENTS.md` — HOOKS-01..05 source-of-truth
- `.planning/phases/10-hooks-identity-effect-hygiene/10-CONTEXT.md` — D-01..D-21 locked decisions
- `REVIEW.md` — v1.0 review WR-03..WR-06, IN-01 source-of-truth for the requirements
- `.planning/ROADMAP.md` §"Phase 10" — Success Criteria 1..5
- `npm view react version` / `npm view eslint-plugin-react-hooks version` — registry verification of installed versions
- `npm run test -- --run` — HEAD baseline test count: **381 passing tests across 27 files** (executed 2026-05-11)

### Secondary (MEDIUM confidence)
- [Vitest fakeTimers config](https://vitest.dev/config/faketimers) — confirms rAF is mocked by default since v1
- [eslint-plugin-react-hooks CHANGELOG](https://github.com/facebook/react/blob/main/packages/eslint-plugin-react-hooks/CHANGELOG.md) — v7.0 added optional chaining + nullish coalescing support
- [React docs — useRef](https://react.dev/reference/react/useRef) — ref-mirror pattern documentation
- [@testing-library/react renderHook API](https://testing-library.com/docs/react-testing-library/api/#renderhook) — `result.current` reference capture semantics

### Tertiary (LOW confidence — flagged for empirical validation)
- D-08 closure-staleness interpretation (Pitfall 1 / A1) — researcher's reading of React 18+ batched-updater semantics. Empirically validated by the D-13 "snapshot advances" test.
- HOOKS-05 lint-regression risk (Pitfall 3 / A3) — researcher cannot conclusively predict whether eslint-plugin-react-hooks 7.1.1's flow analysis narrows on the discriminated union without running lint against the post-edit code.

## Metadata

**Confidence breakdown:**
- Standard stack: HIGH — all versions installed at HEAD and verified
- Architecture patterns: HIGH — all four "Reference patterns" in CONTEXT canonical_refs verified at exact line numbers; patterns are well-documented React idioms
- Pitfalls: MEDIUM-HIGH — Pitfall 1 (D-08 closure staleness) and Pitfall 3 (HOOKS-05 lint regression) carry empirical-validation risk; both are testable
- Code examples: HIGH — derived directly from HEAD shape + CONTEXT locks; no new pattern invented
- Test plumbing (Vitest fake timers, renderHook): HIGH — existing tests in `useSessionEngine.test.tsx` already use the exact `vi.useFakeTimers()` + `vi.advanceTimersByTime()` pattern needed for D-13

**Research date:** 2026-05-11
**Valid until:** 2026-06-10 (30 days — stable React 19 + Vitest 4.x toolchain; no rapid-moving APIs in scope)

## RESEARCH COMPLETE
