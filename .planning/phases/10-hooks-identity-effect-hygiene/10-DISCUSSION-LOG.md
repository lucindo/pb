# Phase 10: Hooks Identity & Effect Hygiene - Discussion Log

> **Audit trail only.** Do not use as input to planning, research, or execution agents.
> Decisions are captured in CONTEXT.md — this log preserves the alternatives considered.

**Date:** 2026-05-11
**Phase:** 10-hooks-identity-effect-hygiene
**Areas discussed:** Frame identity API shape (HOOKS-03), Running-snapshot writer location (HOOKS-02), Frame memoization key strategy (HOOKS-03 mechanics), Plan packaging / wave split

---

## Frame identity API shape (HOOKS-03)

### Q1: How should useSessionEngine expose per-phase vs per-rAF frames?

| Option | Description | Selected |
|--------|-------------|----------|
| Keep `currentFrame` + add `liveFrame` | `currentFrame` per-phase-stable, `liveFrame` per-rAF. Smallest diff: App boundary effect's `[session.currentFrame]` dep keeps semantics; BreathingShape + SessionReadout move to `liveFrame`. | ✓ |
| Rename → `phaseFrame` + `liveFrame` | Both names explicit but renames every consumer (App.tsx 7 sites + 2 components + interface + tests). | |
| Single `currentFrame` with split internal fields | Internally `{ stable, live }` structure. Most clever but breaks SessionFrame type contract. | |

**User's choice:** Keep `currentFrame` + add `liveFrame`.

### Q2: Which fields does `currentFrame` carry under the per-phase contract?

| Option | Description | Selected |
|--------|-------------|----------|
| Full SessionFrame snapshot from phase-boundary tick | Full type preserved; phaseProgress/elapsed are the values AT the boundary (≈ 0). | ✓ |
| Narrow type — only per-phase fields | `PhaseFrame = Pick<SessionFrame, 'cycleIndex' \| 'phase' \| 'totalCycles'>`. | |
| Full SessionFrame with phaseProgress zeroed | Quirky middle-ground. | |

**User's choice:** Full SessionFrame snapshot from phase-boundary tick.

### Q3: Should currentFrame return a *new* object each phase boundary or alias to liveFrame's snapshot?

| Option | Description | Selected |
|--------|-------------|----------|
| useMemo recomputes when key changes | `useMemo(() => state.lastFrame, [state.status, lastFrame.cycleIndex, lastFrame.phase])`. Idiomatic React; passes exhaustive-deps. | ✓ |
| Manual prev-key compare returning previous ref | Equivalent effect via useRef + useMemo wrapper; more code. | |
| Return liveFrame snapshot frozen via effect-write | Defers boundary capture by one tick — wrong for boundary effect. | |

**User's choice:** useMemo recomputes when key changes.

### Q4: Where do BreathingShape + SessionReadout get migrated to read liveFrame?

| Option | Description | Selected |
|--------|-------------|----------|
| At App.tsx call sites | Components keep `frame: SessionFrame \| null` prop; only call sites change source. | ✓ |
| Add second prop to each component | Bigger API surface for marginal benefit. | |
| Switch components to a hook pulling from context | Out of scope — introduces context/provider. | |

**User's choice:** At App.tsx call sites.

**Notes:** Decisions D-01..D-05 in CONTEXT.md.

---

## Running-snapshot writer location (HOOKS-02)

### Q1: Where does runningSnapshotRef get written each tick?

| Option | Description | Selected |
|--------|-------------|----------|
| useSessionEngine owns + writes the ref inside rAF tick | Drops App effect at lines 412-420. Owner of state owns the writer. | ✓ |
| Stable useEvent-style callback from App | useSessionEngine accepts `onTick(snapshot)`; useEvent is not in stable React. | |
| Keep the App effect, only tighten deps | Doesn't satisfy ROADMAP "moved off React effects" — fails HOOKS-02. | |

**User's choice:** useSessionEngine owns + writes the ref inside rAF tick.

### Q2: What surface does useSessionEngine expose for the running snapshot?

| Option | Description | Selected |
|--------|-------------|----------|
| Returned ref: `runningSnapshotRef: RefObject<RunningSnapshot \| null>` | Hook returns ref directly; App reads `.current` in cleanup. Idiomatic. | ✓ |
| Imperative getter: `getRunningSnapshot(): RunningSnapshot \| null` | Stable callback. Slight stale-closure risk. | |
| Ref attached to existing return shape: `engine.snapshotRef` | Same as option 1 nested. Stylistic choice. | |

**User's choice:** Returned ref object.

### Q3: When does useSessionEngine write the snapshot ref?

| Option | Description | Selected |
|--------|-------------|----------|
| Inside rAF tick callback, BEFORE setState | Mirrors Phase 9 Pitfall 1 sync-then-update posture. | ✓ |
| Inside setState callback (after completeIfNeeded) | Marginally fresher; requires post-tick status discrimination. | |
| Only at session.start() + then in tick | Redundant complexity at start. | |

**User's choice:** Inside rAF tick callback, BEFORE setState.

### Q4: How does the App leave-running cleanup effect read the snapshot under tightened deps?

| Option | Description | Selected |
|--------|-------------|----------|
| Deps `[state.status, audioStop, wakeLockRelease, clearLeadInTimeouts]`; read `runningSnapshotRef.current` inside | Status primitive dep — fires once per status transition; drops `state`. | ✓ |
| Deps `[state.status, state.completedAtMs]` + ref otherwise | Mixed primitive deps. Marginally more re-fire scenarios. | |
| Move entire cleanup into useSessionEngine + callback to App | Out of phase scope. | |

**User's choice:** Deps `[state.status, audioStop, wakeLockRelease, clearLeadInTimeouts]`; read `runningSnapshotRef.current` inside.

**Notes:** Decisions D-06..D-09 in CONTEXT.md.

---

## Frame memoization key strategy (HOOKS-03 mechanics)

### Q1: What dep array shape memoizes currentFrame?

| Option | Description | Selected |
|--------|-------------|----------|
| Primitives only — `[state.status, state.lastFrame?.cycleIndex, state.lastFrame?.phase]` | Idiomatic React; passes exhaustive-deps cleanly. | ✓ |
| Composite key string | useMemo on derived string; less idiomatic. | |
| State object + custom equality check via useRef | Out of style for the project. | |

**User's choice:** Primitives only.

### Q2: How is liveFrame derived (the per-rAF frame)?

| Option | Description | Selected |
|--------|-------------|----------|
| Direct read: `state.status === 'running' ? state.lastFrame : null` | No memoization; identity changes per rAF by design. | ✓ |
| useMemo on `[state]` — same as current currentFrame | Slightly redundant. | |
| Memoize per rAF on phaseProgress changes only | Premature optimization. | |

**User's choice:** Direct read.

### Q3: Where is the identity-stability assertion locked in tests?

| Option | Description | Selected |
|--------|-------------|----------|
| useSessionEngine.test.ts — new file co-located with hook | Hook has no test file today (structural gap-fill). | ✓ |
| Extend src/app/App.audio.test.tsx | Integration boundary; bigger setup. | |
| Both — unit + integration | Maximum coverage; over-scoped. | |

**User's choice:** useSessionEngine.test.ts — new file.

### Q4: How is useAudioCues `start` / `reconstructEngine` callback-identity-stability locked (HOOKS-01 mutedRef)?

| Option | Description | Selected |
|--------|-------------|----------|
| Direct ref-identity assertion in useAudioCues.test.tsx | renderHook + capture-toggle-recapture; assert `===`. | ✓ |
| Render-count assertion via Testing Library | Tests observable effect; brittle to React internals. | |
| Both — ref-identity + render-count | Maximum coverage; render-count flakier. | |

**User's choice:** Direct ref-identity assertion in existing test file.

**Notes:** Decisions D-10..D-15 in CONTEXT.md.

---

## Plan packaging / wave split

### Q1: How are Phase 10's 5 requirements packaged into plans?

| Option | Description | Selected |
|--------|-------------|----------|
| Single plan, single wave | All 5 HOOKS reqs interlock; splitting wouldn't reduce risk. | ✓ |
| Two plans mirroring Phase 9 (engine-side / App-side) | Plan 01 useSessionEngine; Plan 02 App + useAudioCues. More overhead for 5 small-medium reqs. | |
| Three plans: useSessionEngine, useAudioCues, App | Maximum isolation; over-packaging. | |

**User's choice:** Single plan, single wave.

### Q2: Task ordering inside the single plan?

| Option | Description | Selected |
|--------|-------------|----------|
| Engine-first: 1) useSessionEngine, 2) useAudioCues, 3) App.tsx | Bottom-up; liveFrame is additive so intermediate commits stay green. | ✓ |
| All-at-once: single TDD task per req with red→green | More explicit contract surfacing; heavier for hygiene phase. | |
| Top-down: App.tsx first, then refactor hooks | Risks intermediate broken commits. | |

**User's choice:** Engine-first three tasks.

### Q3: Boundary test — phase 10 success criteria #5 ("boundary cues still fire exactly once per phase transition") — how locked?

| Option | Description | Selected |
|--------|-------------|----------|
| Existing tests already lock it; add identity-stability tests only | Phase 3 + Phase 9 lock exactly-once via lastBoundaryKeyRef. | ✓ |
| Add a new App-level integration test | Belt-and-suspenders; existing tests cover. | |
| Both unit (existing) and dedicated regression test | Maximum coverage but drift risk. | |

**User's choice:** Existing tests already lock it; new tests focus on identity stability.

### Q4: Test count target for the plan?

| Option | Description | Selected |
|--------|-------------|----------|
| ~8 new tests across 2 files | useSessionEngine.test.ts (5-6) + useAudioCues.test.tsx (2-3). | ✓ |
| Minimal — 4-5 new tests | Tighter; might miss subtle regressions. | |
| Aggressive — 12-15 with edge cases | Higher maintenance cost; over-scoped. | |

**User's choice:** ~8 new tests across 2 files.

**Notes:** Decisions D-16..D-21 in CONTEXT.md. 381 → ~389 test baseline target.

---

## Claude's Discretion

None — every option was explicitly selected by the user.

## Deferred Ideas

- **Reduced motion BreathingShape boundary cue** (todo file `2026-05-11-reduced-motion-still-shows-out-phase-boundary-cue.md`) — tangential to Phase 10 BreathingShape consumer migration; fix lives inside the component's reduced-motion render logic. v1.x backlog.
- **Favicon 404** (todo file `2026-05-11-missing-favicon-404-in-console.md`) — unrelated to hooks scope; ASSETS-01 elsewhere in v1.0.1.
- **`useEvent`-style stable callback API for useSessionEngine consumers** — considered then rejected for running-snapshot writer; ref-based ownership simpler. Revisit if more callback integration points emerge. v1.x.
- **Compile-time lock for "this consumer wants per-frame, use liveFrame"** — TypeScript brand or lint rule. Not added; relies on review + per-phase identity behavior. v1.x if drift appears.
- **Move entire stats-record + leave-running cleanup logic into useSessionEngine** — considered then rejected as too invasive. Hook owns state; App owns side-effect orchestration. v1.x.
- **`react-hooks/exhaustive-deps` self-enforcement custom rule** — carried from Phase 7 D-05; still deferred.
