---
phase: 50-sessionclock-scheduler-abstraction
plan: 03
subsystem: navikriya-engine
tags:
  - sessionclock
  - hooks
  - navikriya
  - rename
  - ms-to-sec
dependency-graph:
  requires:
    - 50-01 (SessionClock interface + createAudioSessionClock + createWallSessionClock + SessionClock re-export from audioEngine.ts)
  provides:
    - useNaviKriyaAudio.begin() wraps the NK AudioContext via createAudioSessionClock; cueWhen() reads clock.now()
    - useNKEngine(clock: SessionClock) — SessionClock-consuming signature
    - useNaviKriyaSessionController constructs createWallSessionClock and threads it into useNKEngine
    - NK_LEAD_SEC = 5 (renamed from NK_LEAD_MS = 5000)
    - estimateNaviKriyaDurationSec (renamed from estimateNaviKriyaDurationMs)
    - NKEngineRecord seconds-shaped: omSec, startedAtSec, pendingDelaySec
    - NKOnComplete.elapsedSec (was elapsedMs)
    - Storage-boundary ms conversion (result.elapsedSec * 1000) localized in useNaviKriyaSessionController
  affects:
    - Plan 50-04 (engine-internal — independent from NK; NK has its own per-session AC clock)
    - Plan 50-05 (drift-guard test will lock zero performance.now() / audioCtx.currentTime in NK pair)
    - Plan 50-06 (engine internal facade — NK is NOT folded into the engine at Phase 50 per D-08)
    - Phase 51 (caller-level rebase — NK engine clock construction may swap from wall to audio later; out of scope here)
tech-stack:
  added: []
  patterns:
    - "Wrap-don't-construct factories (D-08): the AC is still constructed by useNaviKriyaAudio.begin via createOptionalAudioContext; createAudioSessionClock WRAPS it on the next line"
    - "Two distinct SessionClocks per NK lifecycle: a wall clock (createWallSessionClock) for engine elapsed-stats and an audio clock (createAudioSessionClock) for cue scheduling — they MUST NOT be conflated (revision 1 Warning #12)"
    - "Storage-boundary ms conversion (result.elapsedSec * 1000) localized to a single call-site at the storage edge (useNaviKriyaSessionController) — mirrors Plan 50-02's resonant/stretch pattern"
    - "Per-task green-gate commit decomposition (3 atomic commits): Task 1 audio-side substitution (byte-identical via Option A) → Task 2 domain constant rename with cross-file consumer bridging → Task 3 engine + controller + test rewire onto the typed clock"
key-files:
  created: []
  modified:
    - src/hooks/useNaviKriyaAudio.ts (+createAudioSessionClock wrap inside begin(); cueWhen reads clock.now())
    - src/domain/naviKriyaSession.ts (NK_LEAD_MS=5000 → NK_LEAD_SEC=5; estimateNaviKriyaDurationMs renamed to estimateNaviKriyaDurationSec; body drops /1000 multiplication; estimateNaviKriyaDurationMinutes divides by 60 not 60_000)
    - src/hooks/useNKEngine.ts (SessionClock parameter; 3 performance.now() → clock.now(); NKEngineRecord ms→sec rename; schedule helper accepts delaySec, multiplies by 1000 only at setTimeout boundary; NKOnComplete.elapsedSec)
    - src/hooks/useNKEngine.test.tsx (createWallSessionClock + makeClock factory; 6 useNKEngine call sites pass makeClock())
    - src/hooks/useNaviKriyaSessionController.ts (createWallSessionClock import + useMemo nkClock; useNKEngine(nkClock) call; storage-boundary elapsedSec * 1000)
    - src/app/App.session.test.tsx (NK_LEAD_MS_FOR_TIMERS = NK_LEAD_SEC * 1000 bridge for vi.advanceTimersByTime literals)
decisions:
  - "D-03 Option A substitution at useNaviKriyaAudio.ts:75 is byte-identical: clock.now() === audioCtx.currentTime by construction (Plan 50-01 verified). No behavior change; same `when` values reach scheduleNK* dispatches."
  - "D-08 NK AC ownership invariant preserved: createOptionalAudioContext (new AudioContext() at line 44) is untouched. The factory wraps; never constructs."
  - "Revision 1 Warning #6 pre-flight verified: estimateNaviKriyaDurationMs had exactly 2 references, both inside src/domain/naviKriyaSession.ts (declaration at L35 + sole consumer estimateNaviKriyaDurationMinutes at L47). No external consumers; rename fully scoped to this one file."
  - "Revision 1 Warning #12 — TWO SessionClocks per NK lifecycle, recorded as inline comments at every construction site: (a) the NK wall clock inside useNaviKriyaSessionController (createWallSessionClock for elapsed-stats), and (b) the NK audio clock inside useNaviKriyaAudio.begin (createAudioSessionClock for cue scheduling). They wrap DIFFERENT AudioContexts (the audio one) / NO AudioContext (the wall one) and MUST NOT be conflated. Neither is the engine's HRV clock; that's a third separate clock in audioEngine.ts (Plan 50-04)."
  - "Revision 1 Blocker #2 (Plan 50-01 carry-forward): NK passes NO scheduleImpl to createAudioSessionClock — clock.schedule is a typed no-op at Phase 50. NK uses per-cue scheduleNK* primitives directly; Phase 52 lookahead may wire NK through clock.schedule() later."
  - "Cross-file consumer bridging via NK_LEAD_MS_FOR_TIMERS: useNKEngine.test.tsx and App.session.test.tsx use vi.advanceTimersByTime(ms), so they introduce a single local `const NK_LEAD_MS_FOR_TIMERS = NK_LEAD_SEC * 1000` to convert the imported seconds-shaped constant. Plan source assertion grep -rn 'NK_LEAD_MS\\b' returns 0 because the bare token is renamed; the bridging names are NK_LEAD_MS_FOR_TIMERS (explicit-suffix variant) and never collide with the production constant."
  - "Storage-boundary ms conversion lives in useNaviKriyaSessionController.onComplete (consumer-to-storage edge), mirroring Plan 50-02's resonant/stretch pattern. recordNaviKriyaSession still accepts ms-shaped elapsedMs per the storage layer's preserved API."
  - "useNKEngine.test.tsx tests rendered once each (no rerender), so a fresh makeClock() per test is identity-stable in practice. The useCallback dep array on stepOm/start/end includes `clock` per react-hooks/exhaustive-deps."
metrics:
  duration: "~25 minutes"
  completed: 2026-05-28
  test-count-baseline: 1343 (post Plan 50-02)
  test-count-after: 1343
  test-count-delta: 0
  tasks-completed: 3
  files-modified: 6
---

# Phase 50 Plan 03: Navi Kriya SessionClock + ms→sec cascade Summary

The Navi Kriya pair (`useNaviKriyaAudio` + `useNKEngine`) now consumes the `SessionClock` interface end-to-end. `useNaviKriyaAudio.begin()` wraps its AudioContext via `createAudioSessionClock` immediately after construction (D-08 invariant preserved — the new AudioContext call site is untouched), and `cueWhen()` reads `clock.now() + SAFE_LEAD_SEC` instead of `audioCtx.currentTime + SAFE_LEAD_SEC` — byte-identical at runtime per D-03 Option A. `useNKEngine` accepts a `SessionClock` parameter and reads time exclusively via `clock.now()`; its 3 prior `performance.now()` call sites are gone. NKEngineRecord and the NKOnComplete callback are seconds-shaped throughout (`omSec`, `startedAtSec`, `pendingDelaySec`, `elapsedSec`); the schedule helper accepts a seconds-shaped `delaySec` and multiplies by 1000 only at the setTimeout boundary — the sole surviving ms-shaped expression in the file. `useNaviKriyaSessionController` constructs a memoized `createWallSessionClock()` instance and threads it into `useNKEngine(nkClock)`, with a single storage-boundary `elapsedSec * 1000` conversion at the `recordNaviKriyaSession` call site.

## What Got Built

### Truths Satisfied (from plan frontmatter `must_haves.truths`)

- ✓ `useNaviKriyaAudio.begin()` constructs an AudioContext exactly once (the existing call site at L44 via `createOptionalAudioContext`; D-08 invariant preserved) and immediately wraps it via `createAudioSessionClock(audioCtx)`; the single `audioCtx.currentTime + SAFE_LEAD_SEC` read at the former L75 becomes `clock.now() + SAFE_LEAD_SEC` — byte-identical at runtime per D-03 Option A.
- ✓ `useNKEngine` accepts a `SessionClock` parameter and reads time exclusively via `clock.now()`; zero `performance.now()` references in `src/hooks/useNKEngine.ts` source (D-09). Source assertion: `grep -v '^ *//' src/hooks/useNKEngine.ts | grep -c performance.now()` returns 0.
- ✓ NKEngineRecord time fields are seconds-shaped: `startedAtSec` (was `startedAtMs`), `omSec` (was `omMs`), `pendingDelaySec` (was `pendingDelayMs`); `NK_LEAD_MS` is renamed to `NK_LEAD_SEC` with value `5` (was `5000`) in `naviKriyaSession.ts` (D-02 cascade).
- ✓ NKOnComplete callback signature reports `elapsedSec` (not `elapsedMs`).
- ✓ The `setTimeout(stepOmRef.current, delaySec * 1000)` boundary in the schedule helper is the ONLY surviving ms-shaped value (the multiply-by-1000 at the boundary). All other expressions in the file are seconds-shaped.
- ✓ `useNaviKriyaSessionController` constructs/threads a SessionClock into `useNKEngine(clock)` via `createWallSessionClock()` — NK engine timing is for elapsed-stats only, not audio scheduling (the NK audio clock is constructed inside `useNaviKriyaAudio.begin` and is per-session, not per-render).
- ✓ `audioCtx.currentTime` no longer appears in `src/hooks/useNaviKriyaAudio.ts` source lines — the single read at L75 was replaced by `clock.now()`. Drift-guard (Plan 50-07) passes by construction against this file.
- ✓ **Revision 1 Warning #6 — `estimateNaviKriyaDurationMs` consumers pre-enumerated:** the only consumer of `estimateNaviKriyaDurationMs` in the entire src/ tree was `estimateNaviKriyaDurationMinutes` at `src/domain/naviKriyaSession.ts:47` (verified by `git grep -n estimateNaviKriyaDurationMs src/` returning exactly 2 lines pre-rename, both inside `src/domain/naviKriyaSession.ts`). No external consumers exist; the rename to `estimateNaviKriyaDurationSec` was fully scoped to this one file.
- ✓ **Revision 1 Warning #12 — phase-level invariant note recorded:** inline comments at every NK clock construction site cite the "NK clock, NOT engine clock; they wrap distinct AudioContexts" invariant. The two construction sites are (a) `createAudioSessionClock(audioCtx)` inside `useNaviKriyaAudio.begin()` (NK audio clock — local to NK's lifecycle), and (b) `useMemo(() => createWallSessionClock(), [])` inside `useNaviKriyaSessionController` (NK engine wall clock — for elapsed-stats only). Neither is the engine's HRV clock from Plan 50-04.

### Artifacts Satisfied (from plan frontmatter `must_haves.artifacts`)

- ✓ `src/hooks/useNaviKriyaAudio.ts` — wraps the begin()-constructed AudioContext via createAudioSessionClock; cueWhen() reads `clock.now() + SAFE_LEAD_SEC`. Contains `createAudioSessionClock`.
- ✓ `src/hooks/useNKEngine.ts` — `useNKEngine(clock: SessionClock)` signature; 3 performance.now() reads converted to clock.now(); NKEngineRecord seconds-shaped. Contains `clock.now()`.
- ✓ `src/domain/naviKriyaSession.ts` — `NK_LEAD_SEC = 5`; ms→sec rename of public constants; `estimateNaviKriyaDurationSec` replaces `estimateNaviKriyaDurationMs` (sole consumer `estimateNaviKriyaDurationMinutes` updated in-file per revision 1 Warning #6). Contains `NK_LEAD_SEC`.

### Key Links Verified

- ✓ `src/hooks/useNaviKriyaAudio.ts` → `src/audio/sessionClock.ts` via `createAudioSessionClock(audioCtx)` inside `begin()`. Pattern `createAudioSessionClock\\(audioCtx\\)` matches once.
- ✓ `src/hooks/useNKEngine.ts` → `src/audio/sessionClock.ts` (via `audioEngine.ts` re-export). Pattern `clock\\.now\\(\\)` matches 3 source call sites (L144, L199, L230) + the JSDoc reference at L38 documenting the startedAtSec field.

## Per-Task Commits

| Task | Name | Commit | Files |
|------|------|--------|-------|
| 1 | Wrap NK AC via createAudioSessionClock; cueWhen reads clock.now() | `3f702cb` | src/hooks/useNaviKriyaAudio.ts |
| 2 | Rename NK_LEAD_MS → NK_LEAD_SEC; estimateNaviKriyaDurationMs → estimateNaviKriyaDurationSec | `c010254` | src/domain/naviKriyaSession.ts, src/hooks/useNKEngine.ts, src/hooks/useNKEngine.test.tsx, src/app/App.session.test.tsx |
| 3 | useNKEngine consumes SessionClock; engine record seconds-shaped end-to-end | `4a9fd11` | src/hooks/useNKEngine.ts, src/hooks/useNKEngine.test.tsx, src/hooks/useNaviKriyaSessionController.ts |

## Verification

- ✓ `pnpm build` exits 0 (typecheck + Vite build all pass).
- ✓ `pnpm test:run` — 1343/1343 across 116 files. Baseline 1343 (post Plan 50-02) preserved exactly. No additions, no removals, no skips. Test count delta = 0.
- ✓ `pnpm test:run src/hooks/useNaviKriyaAudio.test.tsx` — 3/3 pass without test changes (FakeAudioContext.currentTime continues to drive clock.now() per D-03 Option A).
- ✓ `pnpm test:run src/hooks/useNKEngine.test.tsx` — 5/5 pass (only added `clock` argument threading; numeric assertions unchanged because vitest fake timers control both setTimeout and performance.now together).
- ✓ `git diff main..HEAD -- package.json` — 0 lines (DEPS-01 verified: zero new runtime or dev deps).
- ✓ All plan grep gates pass:
  - `git diff package.json` → empty
  - `grep -v '^ *//' src/hooks/useNKEngine.ts src/hooks/useNaviKriyaAudio.ts | grep -v '^ *\\*' | grep -c performance.now()` → 0
  - `grep -v '^ *//' src/hooks/useNaviKriyaAudio.ts | grep -v '^ *\\*' | grep -c audioCtx.currentTime` → 0
  - `grep -rn 'NK_LEAD_MS\\b' src/` → 0 matches
  - `grep -rn estimateNaviKriyaDurationMs src/` → 0 matches
  - `grep -c createAudioSessionClock src/hooks/useNaviKriyaAudio.ts` → 2 (import + invocation)
  - `grep -c 'new AudioContext' src/hooks/useNaviKriyaAudio.ts` → 1 (D-08 invariant preserved at L44 inside createOptionalAudioContext)
  - `grep -c 'delaySec \\* 1000' src/hooks/useNKEngine.ts` → 1 (the setTimeout boundary)
  - `grep -c 'startedAtMs\\|elapsedMs\\|pendingDelayMs\\|omMs' src/hooks/useNKEngine.ts` → 0
  - `grep -c 'useNKEngine(nkClock)' src/hooks/useNaviKriyaSessionController.ts` → 1
  - `git grep -n '\\.elapsedMs|\\.startedAtMs|\\.omMs|\\.pendingDelayMs' src/` → no matches
- ⚠ `pnpm lint` exits non-zero — same 4 pre-existing errors and 4 pre-existing warnings documented in Plan 50-01 and Plan 50-02 SUMMARIES (in `src/app/sessionPresentation.ts:113`, `src/audio/sessionClock.test.ts:377`, `src/storage/storage.ts:254/256/257`, `src/hooks/useAudioCues.ts:191/281`, `src/hooks/useWakeLock.ts:122`). None of these files were modified by this plan. Per SCOPE BOUNDARY in executor deviation rules, these remain out of scope. My 4 modified production files + 2 modified test files lint cleanly.

## Pre-flight Check (Revision 1 Warning #6)

Per the plan's Task 2 pre-flight requirement:

```
$ git grep -n estimateNaviKriyaDurationMs src/
src/domain/naviKriyaSession.ts:35:export function estimateNaviKriyaDurationMs(settings: NaviKriyaSettings): number {
src/domain/naviKriyaSession.ts:47:  return Math.round(estimateNaviKriyaDurationMs(settings) / 60_000)
```

Exactly 2 lines, both inside `src/domain/naviKriyaSession.ts`. No external consumers. The rename to `estimateNaviKriyaDurationSec` was fully scoped to this one file. Post-rename: `git grep -n estimateNaviKriyaDurationMs src/` returns no matches; `grep -c estimateNaviKriyaDurationSec src/domain/naviKriyaSession.ts` returns 2 (declaration + sole in-file consumer).

## Cross-File LSP-Rename Consumer Inventory (NK_LEAD_MS → NK_LEAD_SEC)

Pre-rename: `git grep -n NK_LEAD_MS src/` returned consumers in 4 files (production + tests):
- `src/domain/naviKriyaSession.ts` — declaration (renamed in-place).
- `src/hooks/useNKEngine.ts` — import + re-export + 4 call sites (Task 2 boundary-multiplied via `* 1000`, then Task 3 cleaned up).
- `src/hooks/useNKEngine.test.tsx` — import + 14 math references (Task 2 introduced `NK_LEAD_MS_FOR_TIMERS` bridge).
- `src/app/App.session.test.tsx` — import + 3 math references (Task 2 introduced same bridge).

No additional consumers surfaced beyond the plan's expected list. The rename is complete.

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 3 — Blocking dependency] Task 2 partially anticipated Task 3's engine-record rename**

- **Found during:** Task 2 (when renaming NK_LEAD_MS in `src/domain/naviKriyaSession.ts`, the export chain through `src/hooks/useNKEngine.ts` would have failed typecheck if useNKEngine.ts still used `schedule(NK_LEAD_MS)` — the value name no longer exists)
- **Issue:** The plan structures Task 2 as the domain rename only, with the cascade through useNKEngine.ts to be completed in Task 3. But the rename can't land atomically without updating useNKEngine.ts in the same commit (typescript build breaks otherwise — `pnpm build` would fail the per-commit green-gate). This is the same Rule 3 deviation pattern documented in Plan 50-02.
- **Fix:** In Task 2, updated useNKEngine.ts to import `NK_LEAD_SEC` and replaced the 4 `schedule(NK_LEAD_MS)` / `pendingDelayMs: NK_LEAD_MS` sites with `schedule(NK_LEAD_SEC * 1000)` / `pendingDelayMs: NK_LEAD_SEC * 1000` — keeping the schedule helper boundary at ms. Task 3 then cleaned this up by renaming the helper parameter to `delaySec` and multiplying by 1000 only at the setTimeout call, restoring the seconds-shaped chain end-to-end.
- **Files modified in Task 2 (in addition to those listed in plan):** `src/hooks/useNKEngine.ts` (4 boundary-multiplied sites + 1 comment update).
- **Commit:** Folded into `c010254` (Task 2).

**2. [Rule 2 — Missing critical functionality] Storage-boundary ms conversion in useNaviKriyaSessionController**

- **Found during:** Task 3 (wiring the renamed `NKOnComplete.elapsedSec` through to `recordNaviKriyaSession`)
- **Issue:** The plan's `<files>` list for Task 3 includes `useNaviKriyaSessionController.ts` only for the clock-threading change. But once `NKOnComplete` changed from `elapsedMs` to `elapsedSec`, the existing call `recordNaviKriyaSession(result.elapsedMs, ...)` becomes `recordNaviKriyaSession(result.elapsedSec, ...)` — silently recording durations 1000× shorter than reality (this would be a Rule 1 bug per the same pattern Plan 50-02 caught). The storage layer's `recordNaviKriyaSession(elapsedMs: number, ...)` API name is unchanged (storage layer untouched per Plan 50-02's invariant carry-forward).
- **Fix:** Added the boundary conversion `const elapsedMsForStorage = result.elapsedSec * 1000` at the consumer-to-storage edge in `useNaviKriyaSessionController.onComplete`, with an inline comment documenting that the storage layer is out of scope per Plan 50-02's invariant. This is the ONLY ms-shaped value emitted from the seconds-shaped chain in this file.
- **Files modified:** `src/hooks/useNaviKriyaSessionController.ts`
- **Commit:** Folded into `4a9fd11` (Task 3).

**3. [Rule 3 — Blocking dependency] Test bridging constant `NK_LEAD_MS_FOR_TIMERS` in two test files**

- **Found during:** Task 2 (the plan's source assertion `grep -rn 'NK_LEAD_MS' src/` returns 0 matches; the test files used `NK_LEAD_MS` for `vi.advanceTimersByTime(ms)` math)
- **Issue:** Two test files (`useNKEngine.test.tsx`, `App.session.test.tsx`) consumed `NK_LEAD_MS` for `vi.advanceTimersByTime(ms)` math. After the rename, the imported value is seconds-shaped — using it directly in `vi.advanceTimersByTime` would advance time by 5 milliseconds instead of 5000, breaking every NK timing test.
- **Fix:** Introduced a per-file local constant `const NK_LEAD_MS_FOR_TIMERS = NK_LEAD_SEC * 1000` at the top of each test file, with a comment explaining the ms-boundary at `vi.advanceTimersByTime`. All `NK_LEAD_MS` references in the test files were replaced with `NK_LEAD_MS_FOR_TIMERS`. The bare token `NK_LEAD_MS` (word-boundary) no longer appears in `src/` — only `NK_LEAD_MS_FOR_TIMERS` (an unambiguous suffix-named bridge).
- **Files modified:** `src/hooks/useNKEngine.test.tsx`, `src/app/App.session.test.tsx`
- **Commit:** Folded into `c010254` (Task 2).

### Out of Scope (Deferred)

- **Pre-existing lint errors on baseline (carried from Plans 50-01 and 50-02)** — same 4 errors in `src/app/sessionPresentation.ts:113`, `src/audio/sessionClock.test.ts:377`, `src/storage/storage.ts:254/256/257` plus 4 unused-disable warnings. None of these files were modified by this plan. Documented in Plan 50-01 SUMMARY's Self-Check section and Plan 50-02 SUMMARY's Verification section. Out of SCOPE BOUNDARY per executor deviation rules.

## Decisions Made

- **Three commit decomposition** (not the plan's per-task atomicity verbatim): Task 2's domain rename had to also update `src/hooks/useNKEngine.ts` consumers in the same commit because the type system requires the rename to land atomically with all consumer references. Task 3 then completed the full engine refactor. This is the same per-commit green-gate pattern documented in Plan 50-02's Rule 3 deviation, but on a smaller scope (Task 2 + minimal Task 3 prelude vs. Plan 50-02's full-Tasks-1-4-combined).
- **Wall clock for NK engine elapsed-stats (D-07 confirmed):** `useNaviKriyaSessionController` uses `createWallSessionClock()` for the engine clock arg, not `createAudioSessionClock`. Rationale: the NK audio clock is constructed inside `useNaviKriyaAudio.begin()` per-session and is independent of the engine; the engine's elapsed-stats math is for an internal stats display and doesn't need audio-clock-precision sync.
- **`makeClock()` factory in tests, not a memoized fixture:** each test calls `renderHook(() => useNKEngine(makeClock()))`. Since tests don't call `rerender`, the closure is identity-stable across the test's lifetime. Memoizing via `useMemo` inside the render function would require additional test scaffolding for no behavior gain.
- **Test count preserved exactly at 1343** — no new tests, no removed tests, no skipped tests. All 5 useNKEngine tests pass with only the `clock` argument threading; their numeric assertions are unchanged because vitest fake timers (`vi.useFakeTimers`) control both `setTimeout` and `performance.now()` (which the wall clock reads) deterministically and together.
- **Inline comment at the schedule helper's setTimeout call:** added the "D-02 boundary: setTimeout takes ms; engine record is seconds-shaped. Multiply at this boundary only." comment per the plan's action step 7.

## Discoveries for Wave 3+ Plans

1. **The NK audio clock is per-session, not per-render.** Plan 50-06's "engine internal facade" work explicitly does NOT fold the NK AC into the engine (D-08); NK keeps its own per-session AudioContext constructed in `useNaviKriyaAudio.begin()`. Plan 50-05's drift-guard test should ban `audioCtx.currentTime` reads in `useNaviKriyaAudio.ts` but should NOT ban `new AudioContext()` there (D-08 invariant).
2. **Three SessionClocks exist in NK lifecycle at any moment:** (a) the engine's HRV AC clock (from `audioEngine.ts`, Plan 50-04 wires it), (b) the NK wall clock for engine stats (`useNaviKriyaSessionController`'s `useMemo` clock), (c) the NK audio clock for cue scheduling (`useNaviKriyaAudio.begin()`'s `createAudioSessionClock(audioCtx)`). They wrap different sources. Plan 50-05's drift-guard test should not conflate them in its assertions.
3. **`recordNaviKriyaSession` storage API unchanged:** the storage layer's NK function continues to accept ms-shaped values. The boundary conversion `result.elapsedSec * 1000` lives in `useNaviKriyaSessionController.onComplete`. Consistent with Plan 50-02's "storage layer untouched" invariant.
4. **Test file `App.session.test.tsx` uses `nkSessionMs()` helper to compute timing.** The helper is ms-based throughout (it consumes `NK_LEAD_MS_FOR_TIMERS` and `omMs = NK_OM_SECONDS * 1000`). No change to the helper's body was needed — the ms-shaped intermediate values are deterministic and the assertions still pass.
5. **No new `NK_LEAD_MS` usage anywhere in `src/`.** The bare token is gone; the only remaining references are the test-file bridge constant `NK_LEAD_MS_FOR_TIMERS` (an explicit-suffix variant that won't collide with future production code). Plan 50-07's drift-guard regex can ban `\bNK_LEAD_MS\b` without false positives against the bridge.

## Threat Flags

None. No new trust boundaries; pure refactor.

## Self-Check: PASSED

- ✓ `src/hooks/useNaviKriyaAudio.ts` updated (verified by grep: `createAudioSessionClock` 2 occurrences; `audioCtx.currentTime` 0 source occurrences; `clock.now()` 1 source occurrence; `new AudioContext` 1 occurrence preserved).
- ✓ `src/domain/naviKriyaSession.ts` updated (verified by grep: `NK_LEAD_SEC = 5`; `estimateNaviKriyaDurationSec` 2 occurrences; no `NK_LEAD_MS`; no `estimateNaviKriyaDurationMs`).
- ✓ `src/hooks/useNKEngine.ts` updated (verified by grep: `import type { SessionClock }`; `useNKEngine(clock: SessionClock)`; 3 source `clock.now()` call sites; 0 `performance.now()`; 1 `delaySec * 1000`; no ms-field references).
- ✓ `src/hooks/useNaviKriyaSessionController.ts` updated (verified by grep: `createWallSessionClock` import + useMemo; `useNKEngine(nkClock)`; `elapsedMsForStorage = result.elapsedSec * 1000`).
- ✓ `src/hooks/useNKEngine.test.tsx` updated (verified by grep: `createWallSessionClock` import; `makeClock()` factory; 6 `useNKEngine(makeClock())` call sites; `NK_LEAD_MS_FOR_TIMERS` bridge).
- ✓ `src/app/App.session.test.tsx` updated (verified by grep: `NK_LEAD_SEC` import; `NK_LEAD_MS_FOR_TIMERS` bridge; 2 production references through the bridge).
- ✓ Commit `3f702cb` exists in `git log --all --oneline`.
- ✓ Commit `c010254` exists in `git log --all --oneline`.
- ✓ Commit `4a9fd11` exists in `git log --all --oneline`.
- ✓ 1343/1343 tests pass; baseline preserved.
- ✓ `pnpm build` exits 0.
- ✓ All plan grep gates pass.

## TDD Gate Compliance

N/A — this plan has `type: execute`, not `type: tdd`. No RED/GREEN/REFACTOR gate sequence required. The plan's invariant is "test parity at 1343 baseline preserved with per-task seconds-shaped refactor diffs only (no count change, no skipped tests)" — verified above.
