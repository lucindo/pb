---
phase: 10-hooks-identity-effect-hygiene
created: 2026-05-11
milestone: v1.0.1
requirements:
  - HOOKS-01
  - HOOKS-02
  - HOOKS-03
  - HOOKS-04
  - HOOKS-05
---

# Phase 10 Context: Hooks Identity & Effect Hygiene

<domain>
Stabilize React-hook callback and frame identities so App-level effects stop running every animation frame. Specifically: (a) `useAudioCues.start` + `reconstructEngine` read mute via a `mutedRef` so their identities survive mute toggles (HOOKS-01); (b) `useSessionEngine.currentFrame` becomes per-phase-stable while a new `liveFrame` carries per-rAF values for visual consumers (HOOKS-03); (c) App's leave-running cleanup effect depends on `state.status` + refs, not on the per-frame `state` object (HOOKS-02); (d) the rAF loop short-circuits on `cancelled` at the top of `tick()` (HOOKS-04); (e) `App.tsx:80-82` ref-updater effect's explicit `[session.currentFrame]` deps inherit the new per-phase cadence and pass `react-hooks/exhaustive-deps` (HOOKS-05). Fix-only patch — no user-facing behavior changes. Lives in `src/hooks/useSessionEngine.ts`, `src/hooks/useAudioCues.ts`, and `src/app/App.tsx` with co-located test edits.
</domain>

<decisions>

### Frame identity API shape (HOOKS-03)

- **D-01:** Keep the `currentFrame` name and add a new sibling `liveFrame`. `currentFrame` becomes the per-phase-stable identity (same `===` reference across renders within the same `cycleIndex:phase`); `liveFrame` is the per-rAF frame (identity changes every animation frame, all fields fresh). Chosen over rename → `phaseFrame` / `liveFrame` because the App boundary effect's existing `[session.currentFrame]` dep keeps its semantics verbatim — only BreathingShape + SessionReadout call sites switch source. Smallest diff at the consumer boundary.

- **D-02:** Type contract unchanged: `currentFrame: SessionFrame | null` and `liveFrame: SessionFrame | null`. `currentFrame` carries the FULL SessionFrame snapshot captured at the phase-boundary tick — `elapsedMs`, `phaseProgress`, `remainingMs` are the values AT the boundary (so phaseProgress ≈ 0 at boundary start). The App boundary effect only reads `cycleIndex` + `phase` from `currentFrame`; stale per-frame fields are harmless. `liveFrame` always exposes fresh per-rAF values for the visual consumers that need them.

- **D-03:** Identity rule = primitives-only useMemo deps. `currentFrame = useMemo(() => state.status === 'running' ? state.lastFrame : null, [state.status, state.lastFrame?.cycleIndex, state.lastFrame?.phase])` (paraphrased — final code uses local narrowing for the optional-chain). Recomputes only when status / cycle / phase changes; same `===` within a phase. Idiomatic React; passes `react-hooks/exhaustive-deps` (BUILD-03 baseline) cleanly. Chosen over composite-key-string and custom ref-equality patterns.

- **D-04:** `liveFrame` is a direct read, no memoization: `liveFrame = state.status === 'running' ? state.lastFrame : null`. Identity changes per rAF by design — that IS the contract. BreathingShape + SessionReadout re-render per rAF as today; per-rAF fields stay fresh. No useMemo wrapper.

- **D-05:** Consumer migration lives at the App.tsx call sites. `<BreathingShape frame={appPhase === 'running' ? session.currentFrame : null} />` → `... session.liveFrame ...`. `<SessionReadout frame={leadInPlaceholderFrame ?? session.currentFrame} ... />` → `... session.liveFrame ...`. Components keep their existing `frame: SessionFrame | null` prop contract; no component-internal edit. `sessionFrameRef` at `App.tsx:81-84` keeps reading `session.currentFrame` (the boundary effect needs per-phase identity).

### Running-snapshot writer location (HOOKS-02)

- **D-06:** useSessionEngine owns + writes `runningSnapshotRef` inside the rAF tick callback (NOT a React effect). The App.tsx effect at lines 412-420 (`useEffect(() => { if (state.status === 'running') runningSnapshotRef.current = {...} }, [state])`) is DELETED. Drops the per-render write that fires every rAF. Owner of state owns the writer.

- **D-07:** Surface = useSessionEngine returns `runningSnapshotRef: RefObject<RunningSnapshot | null>` where `RunningSnapshot = { key: string; startedAtMs: number; lastElapsedMs: number }` (matches App's existing shape verbatim). The `SessionEngine` interface gains a `runningSnapshotRef` field; App reads `.current` synchronously in the leave-running cleanup. Refs are stable, not in deps.

- **D-08:** Write timing — at the top of the rAF tick callback, BEFORE the setState call. Mirrors Phase 9 Pitfall 1 "synchronous-then-update" posture: snapshot reflects the LAST known elapsed values; subsequent setState is independent. The snapshot persists until the leave-running cleanup nulls it (which the leave-running effect already does at `App.tsx:462`).

- **D-09:** Leave-running cleanup deps = `[state.status, audioStop, wakeLockRelease, clearLeadInTimeouts]`. Snapshot read inside via `session.runningSnapshotRef.current`. Drops `state` from deps. Discriminated-union access for `state.completedAtMs` stays inside the branch for the `isComplete` flag (the type narrows on `state.status === 'complete'`), but elapsed math reads the snapshot. Effect fires once per status transition out of `'running'`, not per rAF.

### rAF cancel-guard (HOOKS-04)

- **D-10:** The rAF loop short-circuits at the TOP of `tick()` in `useSessionEngine.ts:37`. New first statement: `if (cancelled) return`. setState moves below the guard. Mechanical one-line edit; locked by a Vitest case asserting that a rAF firing after the effect cleanup ran is a no-op (no setState observed). Same `cancelled` closure variable; no new state.

### mutedRef + callback identity (HOOKS-01)

- **D-11:** `mutedRef` lives inside `useAudioCues`, local to the hook. Updated by `useEffect(() => { mutedRef.current = muted }, [muted])`. `start` and `reconstructEngine` read `mutedRef.current` instead of the `muted` state, and drop `muted` from their `useCallback` dep arrays. The React `muted` state STAYS (UI binding for MuteToggle, persistence via Phase 4 LOCL-01). Layered ON TOP of existing state — does NOT replace it. Same posture as Phase 9 AUDIO-01 (reconstructGenerationRef on top of synchronous-null).

- **D-12:** Lock the new identity contracts with renderHook + ref-equality assertions in `useAudioCues.test.tsx`. Capture `result.current.start` before and after `setMuted(true)`; assert `===`. Same for the reconstruction path (assert `start` / `resume` identity stays stable across mute toggles). Phase 9 D-14 — colocate in the existing test file; no new file.

### Test geography & lock points

- **D-13:** Create `src/hooks/useSessionEngine.test.ts` (NEW file — useSessionEngine currently has no test file). Lock: (1) `currentFrame` identity stable across renders within a phase (`===`), (2) `currentFrame` identity changes at phase boundary, (3) `liveFrame` identity new per-rAF, (4) `liveFrame` reflects per-rAF phaseProgress, (5) rAF cancel-guard idempotency (rAF callback after effect cleanup is no-op), (6) `runningSnapshotRef.current` populated while running and nulled / preserved per the cleanup contract. ~5-6 tests.

- **D-14:** Extend `src/hooks/useAudioCues.test.tsx` with ~2-3 tests: `start` callback identity stable across `setMuted` toggle, `reconstructEngine` identity stable (probe via `resume` round-trip), baseline `handleStateChange` unchanged. Phase 9 D-14 — co-locate in existing file.

- **D-15:** No new App-level test file. Phase 3 / Phase 9 boundary-cue exactly-once tests via `lastBoundaryKeyRef` already lock success criterion #5 ("boundary cues fire exactly once per phase transition"). Phase 10 changes WHEN the boundary effect fires (per-phase instead of per-rAF) but NOT the `lastBoundaryKeyRef` gating logic — existing tests catch regressions. New tests focus on identity stability — the new contract. Target test count: 381 (Phase 9 baseline) → ~389.

### Plan packaging

- **D-16:** Single plan, single wave. All 5 HOOKS reqs interlock heavily: HOOKS-03 (frame split) enables HOOKS-02 (`[state]` → `[state.status]` dep tightening); HOOKS-05 (App.tsx:80-82 ref-updater) inherits its per-phase trigger cadence from HOOKS-03; HOOKS-01 (mutedRef) is isolated but trivial; HOOKS-04 (cancel-guard) is one line. Splitting wouldn't reduce risk — same test files, same review surface, no inter-task isolation gain.

- **D-17:** Task ordering inside the plan = engine-first, three tasks: (1) `useSessionEngine` — HOOKS-03 (currentFrame memoization + liveFrame split) + HOOKS-04 (rAF cancel-guard) + runningSnapshotRef ownership + tests in new `useSessionEngine.test.ts`; (2) `useAudioCues` — HOOKS-01 mutedRef + identity tests in existing `useAudioCues.test.tsx`; (3) `App.tsx` — HOOKS-02 dep tightening + liveFrame migration at BreathingShape + SessionReadout call sites + DELETE of the running-snapshot effect at `App.tsx:412-420` + HOOKS-05 verification (already-passing exhaustive-deps confirmation). Each task commits independently; tsc + lint + build + Vitest stay green between tasks because `liveFrame` is additive (currentFrame keeps working until App switches consumers in task 3).

### HOOKS-05 verification scope

- **D-18:** HOOKS-05 (App.tsx:80-82 ref-updater explicit deps) is largely passive — the effect ALREADY has explicit `[session.currentFrame]` deps and passes exhaustive-deps post-Phase-7. Phase 10's contribution: HOOKS-03 changes the trigger cadence (now per-phase instead of per-rAF). Verification = confirm `react-hooks/exhaustive-deps` still passes after the engine + App changes ship; ensure no `// eslint-disable-next-line react-hooks/exhaustive-deps` is reintroduced; the existing identity-stability tests in D-13 indirectly assert the cadence change. No code edit required for HOOKS-05 if exhaustive-deps stays clean.

### Carry-forward invariants

- **D-19:** Phase 7 D-04 applies: any new `// eslint-disable-next-line react-hooks/*` MUST carry a `// Reason:` annotation. The cleanup effect at `App.tsx:428-464` already has a documented `set-state-in-effect` disable with Reason annotation — preserved. No new disables should be required for Phase 10's deltas; if one IS, annotate per Phase 7 D-04.

- **D-20:** Phase 9 D-14 — co-locate new contract tests in existing `*.test.{ts,tsx}` neighbors. EXCEPTION: `useSessionEngine.test.ts` is NEW because the hook currently has no test file. This is a structural gap-fill, not a fresh test geography pattern.

- **D-21:** Phase 7 D-09 — every commit boundary inside Phase 10: `tsc --noEmit` exits 0, `npm run lint` exits 0, `npm run build` exits 0, full Vitest suite passes. A commit that breaks any is rolled back, not patched-forward.

</decisions>

<canonical_refs>

**REQUIREMENTS / specs:**
- `.planning/REQUIREMENTS.md` §"Hooks / Effect Hygiene" (lines 57-67) — HOOKS-01..05 source-of-truth with `WR-03/04/05/06` + `IN-01` traceability to v1.0 review.
- `REVIEW.md` (repo root, v1.0 full-codebase review) — §WR-03 (useAudioCues callback identity), §WR-04 (App rAF effects), §WR-05 (currentFrame identity split), §WR-06 (rAF cancel-guard), §IN-01 (App.tsx:80-82 ref-updater deps).

**Carry-forward CONTEXT files:**
- `.planning/phases/07-strict-type-lint-baseline/07-CONTEXT.md` — D-04 (`// Reason:` annotation policy for `react-hooks/*` disables); D-09 (per-commit tsc/lint/build/Vitest gate); D-04+D-05 `react-hooks/exhaustive-deps: error` baseline that Phase 10's tightened deps MUST pass.
- `.planning/phases/09-audio-wake-lock-lifecycle-hardening/09-CONTEXT.md` — D-14 (co-locate test contracts in existing `*.test.{ts,tsx}` neighbors); AUDIO-01 "generation counter ON TOP of synchronous-null Pitfall 1" pattern — mirrored by D-11 for mutedRef (ref ON TOP of useState, not in place of).

**Project-level:**
- `.planning/PROJECT.md` §"Current Milestone: v1.0.1 Code Review Patch" — "tests pass at v1.0 close — patch must not regress" invariant; "no user-facing features" constraint.
- `.planning/ROADMAP.md` §"Phase 10" — Goal + Success Criteria 1..5.
- `.planning/STATE.md` — phase 9 closeout + v1.0.1 sequencing.

**Source under edit:**
- `src/hooks/useSessionEngine.ts` — line 16 `currentFrame: SessionFrame | null` in `SessionEngine` interface (gains `liveFrame` + `runningSnapshotRef`), line 29-57 rAF effect (HOOKS-04 cancel-guard at top + D-08 ref-write before setState), line 59-62 `currentFrame` useMemo (D-03 dep tightening).
- `src/hooks/useAudioCues.ts` — line 71-91 hook intro (mutedRef declaration + sync effect), line 192-232 `start` (drop `muted` from deps), line 269-325 `reconstructEngine` (drop `muted` from deps; `currentMuted = mutedRef.current` instead of capturing `muted` state).
- `src/app/App.tsx` — line 81-84 sessionFrameRef effect (HOOKS-05 verify — already explicit `[session.currentFrame]`, no edit unless lint trip), line 412-420 running-snapshot effect (DELETE — replaced by useSessionEngine internal ref-write per D-06), line 428-464 leave-running cleanup effect (HOOKS-02 D-09 dep tightening: `[state, ...]` → `[state.status, ...]`; read `session.runningSnapshotRef.current` instead of computing from `state`), line 556 BreathingShape `frame={...}` (D-05 migrate to `session.liveFrame`), line 560 SessionReadout `frame={...}` (D-05 migrate to `session.liveFrame`).

**Reference patterns already in the codebase:**
- `useAudioCues.ts:106-109` — existing ref-mirror-of-prop pattern (`onReanchorRequiredRef` updated by effect on `[onReanchorRequired]`) — D-11 mirrors this exact pattern for mutedRef.
- `useAudioCues.ts:271,86` — `reconstructGenerationRef` pattern (Phase 9 AUDIO-01) — D-11 (mutedRef) explicitly mirrors the "layer ref ON TOP of existing state" posture from this site.
- `useSessionEngine.ts:53-56` — existing rAF teardown pattern (`cancelled = true; cancelAnimationFrame(animationFrameId)`) — HOOKS-04 (D-10) keeps `cancelled` semantics; just moves the read to the top of `tick()`.
- `App.tsx:81-84` — existing ref-updater pattern (`useEffect(() => { sessionFrameRef.current = session.currentFrame }, [session.currentFrame])`) — HOOKS-05 verification target; the pattern itself is fine, the dep is already correct.
- `App.tsx:412-420` — current running-snapshot effect — DELETED per D-06; logic moves into useSessionEngine's rAF tick.

</canonical_refs>

<code_context>

**Reusable assets:**
- `useState<SessionState>` in `useSessionEngine.ts:24` — discriminated union with `lastFrame`, `cycleIndex`, `phase`, `startedAtMs`, `lastElapsedMs` already exposed when running. D-07 `RunningSnapshot` shape derives from these existing fields verbatim.
- `useRef<>(null)` pattern — already extensively used throughout `useAudioCues.ts` (engineRef, firstInCueTimeRef, reconstructGenerationRef, visibilityResumeAttemptedRef, onReanchorRequiredRef). D-07 `runningSnapshotRef` and D-11 `mutedRef` add two more in the same posture.
- `useMemo` already used for `currentFrame` at `useSessionEngine.ts:59-62` — D-03 just tightens the dep array from `[state]` to `[state.status, state.lastFrame?.cycleIndex, state.lastFrame?.phase]`.
- `useEffect` cleanup `cancelled` flag at `useSessionEngine.ts:53-56` — HOOKS-04 adds the top-of-tick read; pattern preserved.
- Existing test harness: `useAudioCues.test.tsx` uses `vi.useFakeTimers()` + `SpyableAC` (renderHook + setup) — works for ref-identity assertions via `result.current.start`.

**Integration points:**
- `SessionEngine` interface in `useSessionEngine.ts:14-21` — add `liveFrame: SessionFrame | null` and `runningSnapshotRef: React.RefObject<RunningSnapshot | null>` fields. Export `RunningSnapshot` type from the same module.
- `App.tsx:13` import block — already imports `useSessionEngine`; new ref + field destructure is `const { ..., liveFrame, runningSnapshotRef } = useSessionEngine(...)`.
- `App.tsx:412-420` — entire effect DELETED. `App.tsx:188` (`recordedSessionKeyRef`) stays — still the idempotency guard for stats write.
- `App.tsx:464` deps `[state, audioStop, wakeLockRelease, clearLeadInTimeouts]` → `[state.status, audioStop, wakeLockRelease, clearLeadInTimeouts]`. The cleanup body reads `runningSnapshotRef.current` for elapsed math instead of state.lastFrame.elapsedMs.
- BreathingShape (`src/components/BreathingShape.tsx`) and SessionReadout (`src/components/SessionReadout.tsx`) — prop type unchanged (`frame: SessionFrame | null`); only the App-side wiring changes.

**Test geography:**
- NEW: `src/hooks/useSessionEngine.test.ts` (~5-6 tests, per D-13). Structural gap-fill — hook currently has no test file.
- EXTEND: `src/hooks/useAudioCues.test.tsx` (~2-3 tests, per D-14) — ref-identity assertions.
- EXTEND (verification only): existing App-level boundary-cue tests catch regressions per D-15.

</code_context>

<deferred>

- **Reduced motion BreathingShape boundary cue** (`.planning/todos/2026-05-11-reduced-motion-still-shows-out-phase-boundary-cue.md`) — reviewed during todo cross-reference. Tangentially touches BreathingShape (Phase 10 consumer migration) but the actual fix is reduced-motion render logic INSIDE BreathingShape — different scope. Keep in v1.x backlog.

- **Favicon 404** (`.planning/todos/2026-05-11-missing-favicon-404-in-console.md`) — reviewed during todo cross-reference. Unrelated to hooks scope; tracked under ASSETS-01 elsewhere in v1.0.1.

- **`useEvent`-style stable callback API for useSessionEngine consumers** (D-06 option b) — Considered then rejected for the running-snapshot writer; ref-based ownership (D-06 option a) is simpler. Re-evaluate if more useSessionEngine integration points need callbacks; v1.x.

- **Compile-time lock for "this consumer wants per-frame, use liveFrame"** — Considered: a TypeScript brand or a lint rule that flags reading per-frame fields off `currentFrame`. Not added; relies on code review + the per-phase identity behavior. v1.x if drift appears.

- **Move entire stats-record + leave-running cleanup logic into useSessionEngine** (D-06 option c full extension) — Considered then rejected: too invasive for a hygiene phase. Hook owns state; App owns side-effect orchestration. v1.x.

- **`react-hooks/exhaustive-deps` self-enforcement custom rule for un-annotated disables** (carried from Phase 7 D-05) — Still deferred. Phase 10's deltas should not introduce new disables; if they do, Phase 7 D-04 annotation policy applies.

</deferred>
