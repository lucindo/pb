---
phase: 51-master-clock-unification
plan: 02
status: complete
completed: 2026-05-28
requirements_addressed:
  - CLOCK-01
  - CLOCK-02
  - CLOCK-03
  - DEPS-01
  - QUAL-01
key_files:
  created:
    - src/hooks/useBreathingSessionController.test.tsx
  modified:
    - src/hooks/useSessionEngine.ts
    - src/hooks/useSessionEngine.test.tsx
    - src/hooks/useAudioCues.ts
    - src/hooks/useAudioCues.test.tsx
    - src/hooks/useBreathingSessionController.ts
    - src/app/appControllerAdapters.test.ts
commits:
  - 7eabaeb feat(51-02): add reanchorSessionClock to useSessionEngine (D-10/D-11)
  - 95ff763 feat(51-02): expose SessionClock proxy on useAudioCues (D-03/D-05/D-10/D-11)
  - 84c04c3 feat(51-02): rewire useBreathingSessionController onto audio.clock (D-05)
---

# Plan 51-02 Summary — Breathing engine on audioCtx.currentTime

Rebases HRV session elapsed time + animation phase progress onto the
audio-backed `SessionClock` via the Phase 50 seam (CLOCK-01 + CLOCK-03).
The seam was already in place — `useSessionEngine` reads `clock.now()`
inside its rAF tick (Phase 50) and `startedAtSec` is captured from
`clock.now()` at session start (Phase 50). The only change in this plan
is the clock **source**: today `useBreathingSessionController` constructed
a `createWallSessionClock()` and passed it into `useSessionEngine`. After
this plan, the source is the proxy clock exposed by `useAudioCues.clock`,
whose internal source swaps from a wall-clock initial to `engine.clock`
inside `useAudioCues.start()` after the AudioContext is constructed (D-05).

## What was built

### Task 1 — `reanchorSessionClock` on useSessionEngine (commit 7eabaeb)
- Added `reanchorSessionClock(this: void, newClockNow: number): void` to
  the `SessionEngine` interface with JSDoc citing D-10/D-11/Phase 50 D-02.
- Implemented via `useCallback` + `setState` updater. Narrows on
  `status === 'running'` and rewrites
  `startedAtSec = newClockNow - lastFrame.elapsedSec` so the next rAF
  tick computes the same `elapsedSec` it held pre-reanchor (D-10 — preserves
  the user-observable elapsed across the AC swap).
- No-op when `status !== 'running'` (idle/complete have nothing to reanchor).
- 3 new behavioral tests in `useSessionEngine.test.tsx`:
  running rewrite, idle no-op, post-reanchor rAF tick elapsed consistency.
- Test-double sweep in `appControllerAdapters.test.ts` — added a no-op
  `reanchorSessionClock` to the `SessionEngine` literal so existing tests
  still typecheck.

### Task 2 — SessionClock proxy on useAudioCues (commit 95ff763)
- Added stable-identity `clock: SessionClock` field to the `UseAudioCues`
  interface, built once via
  `useMemo(() => createSwappableSessionClock(createWallSessionClock()), [])`.
  The proxy reference is stable for the hook instance lifetime and exists
  before any AC is constructed (D-03).
- **D-05 swap moment:** inside `start()`, immediately after
  `engineRef.current = engine`, calls `proxyMemoRef.current.setSource(engine.clock)`.
  Subsequent `clock.now()` reads delegate to the AC's `currentTime`. The
  lead-in `setTimeout` chain before this point runs on the wall-clock initial
  source (intentional per CONTEXT D-05).
- **D-06 defensive revert:** `stop()` reverts the proxy source to a fresh
  `createWallSessionClock()` so post-stop reads return wall time, not a
  frozen AC `currentTime` from a closed context.
- **D-10/D-11 reconstruction:** `reconstructEngine()` swaps the proxy to
  `newEngine.clock` immediately after `engineRef` reassignment, then fires
  a new `onSessionClockReanchored?(newClockNow)` callback BEFORE the
  existing `onReanchorRequired?(reanchorAudioTime)` callback (D-11
  ordering: session-clock reanchor first, then audio-anchor reanchor).
- Added `onSessionClockReanchored` as 3rd optional ctor arg with
  `onSessionClockReanchoredRef` mirror (same pattern as `onReanchorRequiredRef`).
- 5 new behavioral tests in `useAudioCues.test.tsx`:
  D-03 clock exposure, D-03 wall-shape pre-start, D-05 AC-shape post-start,
  D-11 callback order via `mock.invocationCallOrder`, D-10 newClockNow value.

### Task 3 — Controller rewiring (commit 84c04c3)
- Deleted `createWallSessionClock` import + the `sessionClock` `useMemo`
  wrapper at L83.
- **Flipped hook order:** `audio = useAudioCues(...)` now runs BEFORE
  `session = useSessionEngine(..., audio.clock)`. The seam producer must
  precede the seam consumer.
- Added `onSessionClockReanchored` `useCallback` wired as the new 3rd arg
  to `useAudioCues`. Forwards through a stable `sessionReanchorRef`
  populated by a post-render effect:
  `useEffect(() => { sessionReanchorRef.current = session.reanchorSessionClock }, [session.reanchorSessionClock])`.
  This resolves the chicken-and-egg problem (callback needs session,
  session needs audio) without reordering hooks.
- `sessionFrameRef` now initialized to `null` and populated by an effect.
  Safe because `onAudioReanchorRequired` only fires from
  `useAudioCues.reconstructEngine` (post-mount, post-effect-flush).
- New smoke test file `useBreathingSessionController.test.tsx` (3 tests):
  renders without crashing in idle, `session.reanchorSessionClock` is
  callable, `setSelectedSettings` flows through after the flip.

## Verification

- `npx tsc -b` → exit 0 (typecheck passes; project-level build runs cleanly).
- `npm run lint` → no new lint errors introduced (4 pre-existing baseline
  errors in `sessionPresentation.ts`, `sessionClock.test.ts`, `storage.ts`
  are present on `main` and remain unchanged).
- `npm run test:run` → **119 test files, 1371 tests passed** (baseline at
  this worktree's HEAD was 1360 after merging plan 51-01; this plan adds
  3 from Task 1 + 5 from Task 2 + 3 from Task 3 = 11 new tests).
- All three task commits pass `tsc -b` at the boundary (verified during
  Task 3 development; Task 1 + Task 2 commits were verified during the
  Bash-permission recovery before re-staging).

## Requirements traced

- **CLOCK-01** — HRV session elapsed time now rides `audioCtx.currentTime`
  via the swapped proxy clock in running sessions.
- **CLOCK-02** — Ambient scale strict reading explicitly deferred per
  CONTEXT `<deferred>` section. No `useAmbientScale.ts` modification at
  Phase 51 (idle-only, no in-session ambient surface).
- **CLOCK-03** — Animation phase progress satisfied by construction:
  `useSessionEngine` already invokes `completeIfNeeded(currentState, clock.now())`
  in its rAF tick, and `clock.now()` is now the audio-backed source.
- **DEPS-01** — `package.json` `dependencies` unchanged.
- **QUAL-01** — `npx tsc -b && npm run test:run` exits 0 at every commit
  boundary.

## Deviations from plan

- **Plan called for `pnpm typecheck && pnpm lint && pnpm test:run`.** Project
  uses **npm** with scripts `build` (which runs `tsc -b && vite build`),
  `lint`, and `test:run`. No standalone `typecheck` script — typecheck runs
  via `npx tsc -b` or as part of `npm run build`. Substituted the equivalent
  npm commands.
- **Recovery posture:** Task 2 work was authored by a worktree executor
  agent whose Bash tool was denied mid-task — Task 2 changes existed on
  disk but were uncommitted, and Task 3 was not started. The orchestrator
  ran typecheck + lint + tests in the worktree to verify the Task 2
  changes were correct, then committed Task 2 + implemented Task 3 + added
  the smoke test inline. Implementation matches the plan's `must_haves.truths`
  verbatim.

## Self-Check: PASSED
