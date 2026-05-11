---
phase: 10-hooks-identity-effect-hygiene
plan: 01
subsystem: hooks-identity-effect-hygiene
tags: [hooks, react-effects, callback-identity, rAF-tick, cancel-guard, ref-ownership]
requires:
  - useSessionEngine (HEAD: lines 14-21 SessionEngine interface, 29-57 rAF effect, 59-62 currentFrame useMemo)
  - useAudioCues (HEAD: lines 91 muted state, 106-109 onReanchorRequiredRef pattern, 192-232 start, 269-325 reconstructEngine)
  - App.tsx (HEAD: lines 81-84 sessionFrameRef updater, 179-183 local runningSnapshotRef, 412-420 running-snapshot effect, 428-464 leave-running cleanup, 556 BreathingShape, 560 SessionReadout)
provides:
  - useSessionEngine.SessionEngine.liveFrame (per-rAF SessionFrame | null)
  - useSessionEngine.SessionEngine.runningSnapshotRef (engine-owned snapshot ref)
  - useSessionEngine.RunningSnapshot (exported interface)
  - useAudioCues mutedRef (ref-mirror of muted state; layered ON TOP of useState)
  - useSessionEngine rAF top-of-tick cancel-guard (HOOKS-04)
  - useSessionEngine inside-updater ref-write (D-08 — Pitfall 1 resolution)
affects:
  - App.tsx BreathingShape consumer (migrated to session.liveFrame)
  - App.tsx SessionReadout consumer (migrated to session.liveFrame)
  - App.tsx leave-running cleanup effect (dep array tightened, reads session.runningSnapshotRef)
  - App.tsx local runningSnapshotRef (DELETED — engine owns)
  - App.tsx running-snapshot effect (DELETED — engine writes from rAF tick)
tech-stack:
  added: []
  patterns:
    - ref-mirror-of-prop (mutedRef mirrors muted state — same pattern as onReanchorRequiredRef at useAudioCues.ts:106-109)
    - ref-on-top-of-state (mutedRef alongside muted useState — same posture as Phase 9 AUDIO-01 reconstructGenerationRef)
    - inside-setState-updater ref-write (engine writes runningSnapshotRef from currentState inside setState updater — Pitfall 1 closure-staleness resolution)
    - top-of-tick cancel-guard (`if (cancelled) return` as first statement of rAF tick)
    - Pitfall 3 Option A const-extract (hoist `completedAtMs` + `runningSnapshotRefStable` so exhaustive-deps sees primitives + a ref-local, avoiding a new eslint-disable)
key-files:
  created: []
  modified:
    - src/hooks/useSessionEngine.ts
    - src/hooks/useSessionEngine.test.tsx
    - src/hooks/useAudioCues.ts
    - src/hooks/useAudioCues.test.tsx
    - src/app/App.tsx
decisions:
  - "D-03 Variant B (local-narrow) was needed: TS strict-mode rejects the `state.lastFrame?.cycleIndex` optional-chain Variant A in the useMemo dep array because `lastFrame` exists only on `RunningSessionState`. Surfaced primitives `cycleKey`/`phaseKey` via local narrowing and accepted one annotated `react-hooks/exhaustive-deps` disable (with explicit `// Reason:` per Phase 7 D-04 / D-19)."
  - "Pitfall 3 Option A (const-extract) was sufficient for App.tsx leave-running cleanup dep tightening — no new eslint-disable needed."
  - "Engine does NOT null `runningSnapshotRef` on transition out of running. Custom-hook useEffects fire BEFORE consumer-component useEffects; nulling on transition out would clobber the snapshot before App's leave-running cleanup could read it. Snapshot persists across transition and is overwritten on next session's first rAF tick; App's `recordedSessionKeyRef` keys idempotency on snap.key. This is a Rule 1 deviation from the plan's CONTEXT D-06 wording."
  - "BreathingShape + SessionReadout consumer migration moved into Task 1 (Rule 3 deviation): plan ordering put them in Task 3 but per-phase-stable `currentFrame` would freeze SessionReadout's Remaining countdown between phase boundaries, breaking `App.dialog.test.tsx > keeps the session timing clock advancing`. Migration done in Task 1 to keep all four per-commit gates green at Task 1's commit boundary."
metrics:
  duration: ~13 minutes (active execution; first commit 19:36, third commit 19:43)
  completed: 2026-05-11
  tasks-completed: 3
  files-modified: 5
  files-created: 0
  tests-added: 9 (6 engine + 3 audio)
  test-count: 381 → 390
---

# Phase 10 Plan 01: Hooks Identity & Effect Hygiene Summary

Migrate the running-session snapshot writer from a per-render App-level effect into the engine's rAF tick (with the ref-write INSIDE the setState updater to defeat closure staleness), split `useSessionEngine.currentFrame` into a per-phase-stable memo and a new per-rAF `liveFrame`, layer a mutedRef ON TOP of `useAudioCues.muted` so `start` / `reconstructEngine` callback identity survives mute toggles, add a top-of-tick `if (cancelled) return` cancel-guard to the engine's rAF loop, and tighten the App leave-running cleanup deps from `[state, ...]` to a hoisted-primitives form. All five HOOKS-* requirements (HOOKS-01..05) land in three atomic commits.

## Tasks Completed

| Task | Commit | Description |
|------|--------|-------------|
| 1 | `46d9292` | useSessionEngine identity contracts + engine-owned snapshot writer + cancel-guard (HOOKS-02/03/04) + consumer migration in App.tsx (BreathingShape + SessionReadout → session.liveFrame) |
| 2 | `d385abb` | useAudioCues mutedRef layered on top of muted state; start + reconstructEngine drop `muted` from useCallback deps (HOOKS-01) |
| 3 | `172e38b` | App.tsx: delete local runningSnapshotRef + running-snapshot effect; tighten leave-running cleanup deps via Pitfall 3 Option A const-extract; engine snapshot-lifetime fix (no auto-null on transition out) (HOOKS-02/05) |

## What Changed File-by-File

### `src/hooks/useSessionEngine.ts` (modified — Tasks 1 & 3)

- Imported `useRef` and `RefObject` from React.
- Exported new `RunningSnapshot` interface (`{ key: string; startedAtMs: number; lastElapsedMs: number }`) — verbatim shape from HEAD App.tsx:179-183 per D-07.
- Extended `SessionEngine` interface: added `liveFrame: SessionFrame | null` (D-04) and `runningSnapshotRef: RefObject<RunningSnapshot | null>` (D-07). Added prescriptive JSDoc differentiating `currentFrame` (per-phase-stable) from `liveFrame` (per-rAF).
- Declared `runningSnapshotRef = useRef<RunningSnapshot | null>(null)` after the `useState<SessionState>` (D-06 — hook owns the writer).
- rAF effect body: top-of-tick `if (cancelled) return` (HOOKS-04 / D-10). The bottom-of-tick `if (!cancelled)` guard kept and annotated (TS narrows after the top-check; the cleanup function can flip the flag during the synchronous setState commit, so the runtime check is genuinely needed).
- rAF effect's inside-setState-updater ref-write (D-08): `runningSnapshotRef.current = { key: String(currentState.startedAtMs), startedAtMs: currentState.startedAtMs, lastElapsedMs: currentState.lastFrame.elapsedMs }` placed AFTER the `if (currentState.status !== 'running') return currentState` narrowing and BEFORE `return completeIfNeeded(...)`. Pitfall 1 (closure staleness) resolved: the value comes from `currentState`, not the outer-closure `state`.
- The transition-out-of-running branch (`if (state.status !== 'running') return undefined`) does NOT null the ref (Task 3 fix — see Deviations section). Snapshot persists across the transition and is overwritten on next session's first rAF tick. JSDoc on `RunningSnapshot` and the interface field documents the new lifetime.
- `currentFrame` useMemo: dep array tightened from `[state]` to `[state.status, cycleKey, phaseKey]` via Variant B local-narrow (D-03). One annotated `react-hooks/exhaustive-deps` disable with explicit `// Reason:` per Phase 7 D-04 / D-19. The state-discriminant narrowing surfaces primitives `cycleKey`/`phaseKey` that drive the memo's identity contract.
- New `liveFrame` direct read after the useMemo (D-04) — `state.status === 'running' ? state.lastFrame : null`. NO useMemo wrapper; per-rAF identity churn IS the contract.
- Returned object extended with `liveFrame` and `runningSnapshotRef`.

### `src/hooks/useSessionEngine.test.tsx` (extended — Tasks 1 & 3)

- Existing 5 tests in the original `describe('useSessionEngine')` block preserved verbatim.
- New describe block `useSessionEngine — identity contracts (Phase 10 HOOKS-03/04)` appended at file end with 6 identity tests matching `-t` patterns in 10-VALIDATION.md:
  1. currentFrame identity is stable across renders within the same phase
  2. currentFrame identity changes at a phase boundary
  3. liveFrame identity changes per rAF while currentFrame stays stable
  4. liveFrame.phaseProgress advances within a phase
  5. rAF cancel-guard: tick after teardown is a no-op (HOOKS-04 D-10)
  6. runningSnapshotRef.current is populated while running and persists across the transition out (lifetime test, updated in Task 3 to match the new no-null-on-transition-out contract)

### `src/hooks/useAudioCues.ts` (modified — Task 2)

- Added `mutedRef = useRef<boolean>(initialMuted ?? false)` immediately after the `[muted, setMutedState]` useState (D-11). The ref is layered ON TOP of the React state — `setMuted` still calls `setMutedState(next)` (UI binding + Phase 4 LOCL-01 persistence path preserved).
- Added the sync effect: `useEffect(() => { mutedRef.current = muted }, [muted])` (same shape as the `onReanchorRequiredRef` pattern at lines 106-109).
- `start` useCallback: `engine.setMuted(muted)` → `engine.setMuted(mutedRef.current)`; dep array `[muted, handleStateChange]` → `[handleStateChange]`. Identity now `===` stable across `setMuted` toggles.
- `reconstructEngine` useCallback: `const currentMuted = muted` → `const currentMuted = mutedRef.current` (synchronous capture before any await — same gesture-preservation posture as the original); dep array `[muted, handleStateChange]` → `[handleStateChange]`.
- The pre-existing synchronous-null pattern + AUDIO-01 generation counter are NOT touched (Pitfall 1 of the audio-engine path stays intact).

### `src/hooks/useAudioCues.test.tsx` (extended — Task 2)

- All 28 existing tests preserved verbatim.
- New describe block `useAudioCues — callback identity (Phase 10 HOOKS-01)` appended at file end with 3 identity tests using an inline SpyableAC matching the existing Phase 5.1 fixture:
  1. start callback identity is stable across setMuted toggle (HOOKS-01 D-11)
  2. resume callback is stable across setMuted (proxy for reconstructEngine identity)
  3. Baseline regression guard: handleStateChange identity unchanged across setMuted

### `src/app/App.tsx` (modified — Tasks 1 & 3)

- **Task 1 (consumer migration, Rule 3 deviation):** BreathingShape `frame={appPhase === 'running' ? session.currentFrame : null}` → `... session.liveFrame ...`. SessionReadout `frame={leadInPlaceholderFrame ?? session.currentFrame}` → `... session.liveFrame ...`.
- **Task 3:** DELETED the local `runningSnapshotRef = useRef<{...}>(null)` declaration (HEAD lines 179-183) and the associated Phase 4 LOCL-02 comment block (HEAD lines 174-178). Replaced with a brief carry-forward comment noting the engine now owns the writer.
- **Task 3:** DELETED the running-snapshot effect (HEAD lines 412-420 — the `useEffect(() => { if (state.status === 'running') runningSnapshotRef.current = {...} }, [state])`). Replaced with NOTHING — the engine's rAF tick now writes from inside the setState updater (D-08).
- **Task 3 (leave-running cleanup):**
  - `const snap = runningSnapshotRef.current` → `const snap = runningSnapshotRefStable.current` (where `runningSnapshotRefStable = session.runningSnapshotRef` is hoisted to a local for exhaustive-deps detection).
  - Inside the body, `state.completedAtMs` reads replaced with the hoisted `completedAtMs` local (Pitfall 3 Option A const-extract).
  - The `runningSnapshotRef.current = null` line at HEAD line 462 REMOVED (engine owns null-out; revised lifetime — engine now leaves the snapshot persistent across transition, but the App-side null-out is also no longer needed since the engine ref's lifecycle is fully internal).
  - Dep array `[state, audioStop, wakeLockRelease, clearLeadInTimeouts]` → `[state.status, completedAtMs, runningSnapshotRefStable, audioStop, wakeLockRelease, clearLeadInTimeouts]`.
  - The pre-existing `// Reason:` + `// eslint-disable-next-line react-hooks/set-state-in-effect` at HEAD line 437-438 preserved unchanged.
- **HOOKS-05 verification (D-18 passive):** The `sessionFrameRef` updater at App.tsx:81-84 is UNCHANGED. `[session.currentFrame]` deps already explicit; `npm run lint` exits 0 after all Phase 10 edits.

## Pitfall 1 Resolution (Closure Staleness)

The engine's rAF tick now writes `runningSnapshotRef.current` from INSIDE the `setState((currentState) => {...})` updater:

- Location: `src/hooks/useSessionEngine.ts` (post-Phase 10) — write site at line 115 (visible as `runningSnapshotRef.current = { key: String(currentState.startedAtMs), ... }`), nested inside the setState updater body that begins at line 109.
- The value source is `currentState` (the live argument React passes to the updater), NOT the outer-closure `state` (captured at effect install via the `[state.status]` dep — refreshed only on status changes).
- This is the RESEARCH §"Common Pitfalls — Pitfall 1" resolution: writing from outer-closure `state` would yield a stale snapshot reflecting the LAST status-change state, not the current rAF tick's value.

## Pitfall 3 Exercise (HOOKS-05 Lint Regression)

Yes, `npm run lint` tripped after tightening App.tsx's leave-running cleanup deps from `[state, ...]` to `[state.status, ...]`. The error: `React Hook useEffect has missing dependencies: 'session.runningSnapshotRef' and 'state.completedAtMs'`.

**Mitigation applied:** Option A const-extract (preferred per the plan).

- `const completedAtMs = state.status === 'complete' ? state.completedAtMs : null` hoisted BEFORE the effect.
- `const runningSnapshotRefStable = session.runningSnapshotRef` hoisted to a local so exhaustive-deps detects the ref-shape via the `runningSnapshot*Ref` naming heuristic.
- Effect body uses the hoisted locals; dep array becomes `[state.status, completedAtMs, runningSnapshotRefStable, audioStop, wakeLockRelease, clearLeadInTimeouts]`.

No new eslint-disable was needed for HOOKS-05 (Option C fallback not exercised). D-19 / Phase 7 D-04 fully respected.

## Final Test Count

| Stage | Count |
|-------|-------|
| Baseline (HEAD before Phase 10) | 381 |
| After Task 1 (engine identity tests +6) | 387 |
| After Task 2 (audio identity tests +3) | 390 |
| After Task 3 (no test count change) | 390 |

Plan target: ~389-390. Final: **390** — exactly on target.

## HOOKS-05 Verification Outcome

Passive: the `sessionFrameRef` updater at `App.tsx:81-84` was NOT edited. `git diff HEAD~3 src/app/App.tsx --unified=0 | grep "sessionFrameRef.current"` produces NO matches. The pre-existing `[session.currentFrame]` deps now inherit the per-phase trigger cadence from HOOKS-03 — the ref-updater fires once per phase boundary instead of per rAF, exactly the desired Phase 10 outcome with zero code edit on the HOOKS-05 site.

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 3 — Blocking Issue] BreathingShape + SessionReadout consumer migration moved into Task 1**

- **Found during:** Task 1 verification (vitest run after engine source change).
- **Issue:** `App.dialog.test.tsx > "keeps the session timing clock advancing while the modal is open (D-13)"` failed: with `session.currentFrame` now per-phase-stable, SessionReadout's "Remaining" text froze at the phase-boundary value and the test's `advanceTimersByTime(1000)` could not observe `10:00 → 9:59`.
- **Fix:** Migrated both BreathingShape (App.tsx:556) and SessionReadout (App.tsx:560) consumers to `session.liveFrame` as part of Task 1's commit. Task 3 still owns the bigger App.tsx changes (delete local ref, delete running-snapshot effect, tighten cleanup deps).
- **Why it matters:** The plan's per-task gate invariant (D-21: all four gates green per commit) cannot be satisfied with Task 1 in isolation because per-phase-stable `currentFrame` reaching the unmigrated SessionReadout consumer breaks an existing test. Two options were possible: (a) migrate consumers in Task 1, or (b) skip the gate on Task 1 and only run gates at Task 3 commit. Option (a) preserves the plan's atomic-commit invariant.
- **Files modified:** src/app/App.tsx
- **Commit:** 46d9292 (Task 1)

**2. [Rule 1 — Bug] Engine does NOT null runningSnapshotRef on transition out of running**

- **Found during:** Task 3 verification (vitest run after App.tsx leave-running cleanup edits).
- **Issue:** Three `App.persistence.test.tsx` tests failed (`records a session when timed completion fires`, `records a session on manual End when elapsed >= 30s`, `does NOT double-write when cleanup effect fires after manual End`). Root cause: custom-hook useEffects fire BEFORE consumer-component useEffects when both hooks are called in the same component. The engine's rAF effect's transition-out-of-running early-return branch ran FIRST, nulling `runningSnapshotRef.current = null`, BEFORE App's leave-running cleanup read it. By the time App's cleanup ran, `snap === null` and the stats write was skipped.
- **Fix:** Engine no longer nulls the ref on its transition-out branch. The snapshot persists across the transition and is overwritten on the next session's first rAF tick (the inside-setState-updater write naturally clobbers it). App's existing `recordedSessionKeyRef` keyed on `snap.key` handles idempotency — a stale snapshot from a prior session won't double-write because its key was already recorded.
- **Test update:** The Task 1 engine test asserting "nulled on transition out" was updated to assert "persists across transition + overwritten on next start" (matches the corrected lifetime).
- **Plan-level correction:** CONTEXT D-06 said "Owner of state owns the writer" — true. But the planner's prescribed null-out-on-transition-out (Task 1 action (e)) was based on an incorrect assumption about hook-vs-consumer effect ordering. RESEARCH §"Common Pitfalls" did not cover this specific cross-hook ordering case. The fix preserves the spirit of D-06 (engine owns the writer) while honoring the React effect-ordering reality.
- **Files modified:** src/hooks/useSessionEngine.ts (removed null-out + updated JSDoc), src/hooks/useSessionEngine.test.tsx (updated lifetime test).
- **Commit:** 172e38b (Task 3)

**3. [Rule 1 — Bug] tsc strict-mode rejected Variant A useMemo dep form**

- **Found during:** Task 1 source edit (tsc immediately after engine code rewrite).
- **Issue:** The plan's Variant A form `useMemo(() => ..., [state.status, state.lastFrame?.cycleIndex, state.lastFrame?.phase])` fails tsc with `Property 'lastFrame' does not exist on type 'IdleSessionState'`. The discriminated-union prevents the optional-chain access in the dep-array literal because the TS narrower doesn't see the dep array as a discriminated-union access site.
- **Fix:** Fell back to Variant B (local-narrow) per CONTEXT D-03's documented fallback path. Surfaces `cycleKey` / `phaseKey` via `state.status === 'running' ? state.lastFrame.cycleIndex : null` BEFORE the useMemo, then uses them as primitives in the dep array. Required ONE annotated `react-hooks/exhaustive-deps` disable (Variant B is itself the safe-harbor per the plan, but exhaustive-deps still complains because the memo body reads `state.lastFrame` and the dep array doesn't contain `state` or `state.lastFrame` directly). The disable carries an immediately-preceding `// Reason:` line per Phase 7 D-04 / D-19.
- **Files modified:** src/hooks/useSessionEngine.ts (Variant B form + Reason-annotated disable).
- **Commit:** 46d9292 (Task 1).

### Authentication Gates

None — Phase 10 is a pure refactor with no external services, auth, or persistence-layer touches.

## New `// Reason:` Annotations Introduced

1. **`src/hooks/useSessionEngine.ts:136`** — `// eslint-disable-next-line @typescript-eslint/no-unnecessary-condition` for the bottom-of-tick `if (!cancelled)` check. Reason (lines 132-135): `cancelled` is mutated by the effect cleanup function during the synchronous setState commit window; TS narrowing after the top-of-tick check would otherwise mark this check as unreachable, but it's genuinely needed for race-safety against synchronous effect cleanup.

2. **`src/hooks/useSessionEngine.ts:168`** — `// eslint-disable-next-line react-hooks/exhaustive-deps` for the `currentFrame` useMemo's Variant B dep array. Reason (line 167): the memo body reads `state.lastFrame` only under the `state.status === 'running'` narrowing; primitives `cycleKey`/`phaseKey` surfaced above fully determine identity; adding `state` to deps would defeat the per-phase-stable identity contract (D-03) by re-memoizing on every rAF tick.

No other new disables were introduced. The pre-existing `useAudioCues.ts:162` `react-hooks/exhaustive-deps` disable (Phase 9 AUDIO-01 `reconstructGenerationRef` cleanup) and the two `react-hooks/set-state-in-effect` disables at `App.tsx:252` and `App.tsx:437` are preserved verbatim from HEAD with their pre-existing Reason annotations.

## Source-Assertion Verification (Plan §Acceptance + §Phase-Level Verification)

| Assertion | Expected | Actual |
|-----------|----------|--------|
| `export interface RunningSnapshot` count | ≥1 | 1 (useSessionEngine.ts:31) |
| `liveFrame: SessionFrame` in interface | ≥1 | 1 (useSessionEngine.ts:50) |
| `runningSnapshotRef: RefObject` in interface | ≥1 | 1 (useSessionEngine.ts:60) |
| `useRef<RunningSnapshot \| null>(null)` | ≥1 | 1 (useSessionEngine.ts:77) |
| `if (cancelled) return` at top of tick | ≥1 | 1 (useSessionEngine.ts:102) |
| `runningSnapshotRef.current = {` inside updater | ≥1 | 1 (useSessionEngine.ts:115) |
| `useMemo([state])` remaining (excl. comments) | 0 | 0 |
| App.tsx local `runningSnapshotRef = useRef<{` | 0 | 0 |
| App.tsx `session.runningSnapshotRef` / `runningSnapshotRefStable` | ≥1 | 6 |
| App.tsx `session.liveFrame` count | exactly 2 | 2 |
| `mutedRef.current` reads in useAudioCues.ts | ≥2 | 3 (`mutedRef.current = muted`, `engine.setMuted(mutedRef.current)`, `const currentMuted = mutedRef.current`) |
| `engine.setMuted(muted)` (raw old form, excl. comments) | 0 | 0 |
| `const mutedRef = useRef<boolean>` declaration | 1 | 1 |
| Leave-running dep array tightened | 1 | 1 (`[state.status, completedAtMs, runningSnapshotRefStable, audioStop, wakeLockRelease, clearLeadInTimeouts]`) |
| Old `[state, audioStop, wakeLockRelease, clearLeadInTimeouts]` form gone (excl. comments) | 0 | 0 |
| Phase 10-introduced `react-hooks/*` disables without immediately-preceding Reason | 0 | 0 |
| sessionFrameRef updater at App.tsx:81-84 unchanged | yes | yes (no diff on those lines) |

## Self-Check

```text
✓ Files modified — all present in git status (none missing):
  src/hooks/useSessionEngine.ts (committed in 46d9292 + 172e38b)
  src/hooks/useSessionEngine.test.tsx (committed in 46d9292 + 172e38b)
  src/hooks/useAudioCues.ts (committed in d385abb)
  src/hooks/useAudioCues.test.tsx (committed in d385abb)
  src/app/App.tsx (committed in 46d9292 + 172e38b)

✓ Commits exist:
  46d9292 — feat(10-01): split useSessionEngine frame identity and own snapshot writer (HOOKS-02/03/04)
  d385abb — feat(10-01): add mutedRef so useAudioCues start/reconstructEngine identity stays stable across setMuted (HOOKS-01)
  172e38b — feat(10-01): tighten App leave-running cleanup deps and migrate snapshot ownership to engine (HOOKS-02/05)

✓ Final test count: 390/390 passing
✓ tsc --noEmit -p tsconfig.app.json: exit 0
✓ npm run lint: exit 0
✓ npm run build: exit 0
✓ npm run test -- --run: exit 0
```

## Self-Check: PASSED
