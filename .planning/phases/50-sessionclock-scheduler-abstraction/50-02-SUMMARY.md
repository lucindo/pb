---
phase: 50-sessionclock-scheduler-abstraction
plan: 02
subsystem: session-engine
tags:
  - sessionclock
  - hooks
  - session
  - rename
  - ms-to-sec
dependency-graph:
  requires:
    - 50-01 (SessionClock interface + createWallSessionClock factory)
  provides:
    - useSessionEngine(initialSettings, stretchSettings, clock) — SessionClock-consuming signature
    - useBreathingSessionController constructs and threads createWallSessionClock() into useSessionEngine
    - BreathingPlan / SessionFrame / StretchSegment / StretchSessionFrame / sessionController are seconds-shaped at the SOURCE
    - computeStretchTotalSec (renamed from computeStretchTotalMs)
    - Storage-boundary ms conversion (elapsedSec * 1000) localized in useBreathingSessionController
  affects:
    - Plan 50-03 (useAudioCues SessionClock consumption — independent surface)
    - Plan 50-04 (engine-internal audio.clock — useBreathingSessionController will swap to engine.clock once 50-04 exposes it)
    - Plan 50-05 (drift-guard test will lock zero performance.now() reads in useSessionEngine.ts)
    - Plan 50-06 (engine internal facade — Phase 51 source-swap onto audioCtx.currentTime via this same seam)
    - All BreathingPlan / SessionFrame consumers downstream (audioEngine, useAudioCues, sessionPresentation, OrbShape)
tech-stack:
  added: []
  patterns:
    - "Push ms→sec conversion to the SOURCE (createBreathingPlan, buildStretchSegments) so the consumer chain reads seconds end-to-end with NO runtime /1000 conversions"
    - "Wall-clock fallback injected via useMemo(() => createWallSessionClock(), []) — stable identity across renders"
    - "Storage-boundary ms conversion (elapsedSec * 1000) localized to a single call-site at the storage edge (useBreathingSessionController), keeping the in-memory chain seconds-shaped end-to-end"
    - "Per-task green-gate forced single-commit decomposition: type-rename cannot be staged across multiple commits without breaking build; entire Tasks 1-4 are one structural change at the type-system level (Rule 3 deviation)"
key-files:
  created: []
  modified:
    - src/domain/breathingPlan.ts (+SEC_PER_MINUTE constant; 4 type fields renamed; body divides /1000 once at construction)
    - src/domain/sessionMath.ts (6 SessionFrame field renames; getSessionFrame parameter + body locals; formatDuration param renamed sec)
    - src/domain/stretchRamp.ts (StretchSegment 5 fields + StretchSessionFrame 4 fields renamed; buildStretchSegments/makeSegment/getStretchFrame body fully seconds-shaped; CLAMP_EPSILON_MS=1 → CLAMP_EPSILON_SEC=0.001; computeStretchTotalMs → computeStretchTotalSec)
    - src/domain/sessionAudio.ts (BoundaryAudioOffsets.boundaryStartMs → boundaryStartSec; computeBoundaryAudioOffsets body drops 2 /1000 divisions)
    - src/domain/sessionController.ts (4 functions: nowMs → nowSec; RunningSessionState.startedAtMs → startedAtSec; CompleteSessionState.completedAtMs → completedAtSec; elapsedMs locals → elapsedSec)
    - src/audio/audioEngine.ts (L313 plan.inhaleMs/1000 → plan.inhaleSec; L39 JSDoc update)
    - src/hooks/useAudioCues.ts (L62 JSDoc update — plan.inhaleSec/plan.exhaleSec)
    - src/hooks/useSessionEngine.ts (SessionClock import + 3rd-arg signature; RunningSnapshot.startedAtMs/lastElapsedMs → *Sec; 4 performance.now() → clock.now(); JSDoc Warning #11 update; useCallback deps include clock)
    - src/hooks/useBreathingSessionController.ts (createWallSessionClock import + useMemo wiring; useSessionEngine 3-arg call; onAudioReanchorRequired drops /1000 (elapsedSec); boundary effect drops /1000 (boundaryStartSec); storage-boundary elapsedSec * 1000 conversion)
    - src/components/SessionReadout.tsx (frame.remainingMs/elapsedMs → *Sec)
    - src/components/StretchSettingsForm.tsx (computeStretchTotalMs → computeStretchTotalSec import + body; display math /60_000 → /60)
    - src/domain/breathingPlan.test.ts (1 test restructured: toEqual → per-field toBeCloseTo for FP precision)
    - src/domain/sessionMath.test.ts (numeric literals /1000)
    - src/domain/sessionAudio.test.ts (fixture seconds-shaped; assertions drop /1000)
    - src/domain/sessionController.test.ts (every time literal /1000; field references renamed)
    - src/domain/stretchRamp.test.ts (all numeric literals /1000; all field references renamed; CLAMP_EPSILON references /1000)
    - src/audio/audioEngine.test.ts (samplePlan fixture seconds-shaped)
    - src/hooks/useAudioCues.test.tsx (samplePlan fixture seconds-shaped; phaseDurationSec line drops /1000)
    - src/hooks/useSessionEngine.test.tsx (createWallSessionClock fakeClock fixture; 16 useSessionEngine call-sites gain 3rd arg; assertions updated to *Sec)
    - src/components/SessionReadout.test.tsx (SessionFrame fixtures seconds-shaped)
    - src/components/SettingsForm.stretch.test.tsx (computeStretchTotalSec rename; assertions /60)
    - src/components/OrbShape.test.tsx (SessionFrame fixture seconds-shaped)
    - src/app/App.audio.test.tsx (plan.inhaleMs → plan.inhaleSec * 1000 at vi.advanceTimersByTime boundary; comments updated)
    - src/app/appControllerAdapters.test.ts (SessionFrame fixture seconds-shaped)
    - src/app/appViewModel.test.ts (SessionFrame fixture seconds-shaped)
    - src/app/sessionPresentation.test.ts (SessionFrame fixture seconds-shaped)
decisions:
  - "D-02 cascade satisfied: every domain helper accepts nowSec; every consumed type is seconds-shaped; numeric literals in tests divide by 1000."
  - "Blocker #4 path (a) — BreathingPlan ms→sec rename at SOURCE; createBreathingPlan divides by 1000 ONCE at construction; consumer chain has NO runtime /1000 (verified by grep)."
  - "Blocker #2 — complete source-level rename through StretchSegment + StretchSessionFrame + computeStretchTotalMs; mixed-unit boundary eliminated structurally."
  - "Warning #11 — stale JSDoc reference to performance.now() in useSessionEngine.ts removed (grep returns 0)."
  - "formatDuration audit decision: keep at module scope, rename param from `ms` to `sec` (single consumer in SessionReadout.tsx now passes seconds-shaped frame fields directly). NOT split into two overloads — the function is now seconds-only."
  - "Tasks 1-4 decomposed at the plan level but committed as ONE commit because TypeScript type-rename across BreathingPlan → SessionFrame → sessionController → useSessionEngine cannot compile incrementally; per-commit green-gate forces the bundling (Rule 3 deviation)."
  - "Storage-boundary ms conversion lives at the consumer-to-storage edge in useBreathingSessionController (recordResonantSession / recordStretchSession still accept ms-shaped values per plan's `<acceptance_criteria>`: 'Storage layer untouched'). Single boundary conversion (elapsedSec * 1000) — in-memory chain stays seconds-shaped end-to-end."
  - "FP precision deviation: BreathingPlan construction now has a 1e-15 trailing residue (12 * 0.4 = 4.800000000000001 vs the old ms-shaped 12_000 * 0.4 = 4800 integer-clean). One test (breathingPlan.test.ts) restructured from toEqual to per-field toBeCloseTo. NO new tests, NO removed tests — 1:1 mapping preserved with ABSTR-04 invariant intact."
metrics:
  duration: 79 minutes
  completed: 2026-05-28
  test-count-baseline: 1343 (post Plan 50-01)
  test-count-after: 1343
  test-count-delta: 0
  tasks-completed: 4 (combined into 1 commit)
  files-modified: 26
---

# Phase 50 Plan 02: useSessionEngine ms→sec cascade + SessionClock plumbing Summary

The `useSessionEngine` hook and the entire session-engine domain (BreathingPlan, SessionFrame, StretchSegment, StretchSessionFrame, sessionController, sessionAudio) are now seconds-shaped end-to-end at the source. `performance.now()` has been removed from `useSessionEngine.ts` — the hook accepts an injected `SessionClock` and reads time exclusively via `clock.now()`. `useBreathingSessionController` constructs a `createWallSessionClock()` instance and threads it through. Phase 51 will swap the source to `audioCtx.currentTime` via the same seam without any further caller change.

## What Got Built

### Truths Satisfied (from plan frontmatter `must_haves.truths`)

- ✓ `useSessionEngine` accepts a `SessionClock` parameter and reads time exclusively via `clock.now()`. Zero `performance.now()` references in `src/hooks/useSessionEngine.ts` source (D-09).
- ✓ **Blocker #4 path (a) — BreathingPlan source-level rename:** `BreathingPlan.{inhaleMs,exhaleMs,cycleMs,totalMs}` → `{inhaleSec,exhaleSec,cycleSec,totalSec}`. `createBreathingPlan` produces seconds-shaped values directly (divides by 1000 ONCE at construction via `SEC_PER_MINUTE = 60`). Downstream consumers (`getSessionFrame`, `getStretchFrame`, `boundarySchedule`, `audioEngine.scheduleLeadIn`, `useAudioCues` JSDoc) see seconds end-to-end. Byte-identicality is structural — no FP-equivalence test needed.
- ✓ **Blocker #2 — complete source-level rename of StretchSegment + computeStretchTotalMs:** `StretchSegment.{startMs,endMs,cycleMs,inhaleMs,exhaleMs}` → `*Sec`; locals `cursorMs/durationMs/requestedMs/stepRequestedMs/requestedTotalMs` → `*Sec`; exported `computeStretchTotalMs` → `computeStretchTotalSec`. Body of `buildStretchSegments` / `makeSegment` produces seconds-shaped values at construction (`60_000 / bpm` → `60 / bpm`; `* 60_000` → `* 60`). Consumer chain reads seconds end-to-end.
- ✓ **Storage absence confirmed:** `grep -rn 'inhaleMs|exhaleMs|cycleMs|totalMs|startMs|endMs' src/storage/` returns empty. Storage layer's own `recordResonantSession(elapsedMs, isComplete)` API name was unchanged — `useBreathingSessionController` converts `elapsedSec * 1000` at the single storage-boundary call site (out of scope per plan's `<acceptance_criteria>`).
- ✓ Domain helpers `startSession`, `startStretchSession`, `extendTimedSession`, `completeIfNeeded` accept seconds-shaped time arguments (D-02): field name is `nowSec` and the math reads from `state.startedAtSec`.
- ✓ `RunningSessionState.startedAtSec`; `CompleteSessionState.completedAtSec`; `SessionFrame.elapsedSec`; all downstream consumers updated.
- ✓ End-user behavior is byte-identical — only changes are unit conversions at the SOURCE (createBreathingPlan now divides by 1000 once at construction; previously every consumer divided by 1000 internally) and identifier renames; logic unchanged.
- ✓ Caller `useBreathingSessionController.ts` constructs/threads a `SessionClock` into `useSessionEngine(initialSettings, stretchSettings, clock)` via `createWallSessionClock()`. Phase 51 swaps the source to the engine's audio clock (no further caller changes needed).
- ✓ `audioEngine.ts` and `useAudioCues.ts` JSDoc comments referencing `plan.inhaleMs` / `plan.exhaleMs` updated to `plan.inhaleSec` / `plan.exhaleSec`. The audioEngine's `scheduleLeadIn` no longer divides `plan.inhaleMs / 1000` — it reads `plan.inhaleSec` directly.
- ✓ `sessionAudio.ts` `boundaryForSchedule` no longer divides `inhaleMs / 1000` for the `phaseDurationSec` field — it returns `frame.currentInhaleSec ?? plan.inhaleSec` directly. The function's `boundaryStartMs` field renamed to `boundaryStartSec`.
- ✓ **Extended grep gate:** `grep -rn 'startMs|endMs|durationMs|cursorMs|TotalMs|inhaleMs|exhaleMs|cycleMs|totalMs' src/ --include='*.ts' --include='*.tsx'` returns 0 matches. The mixed-unit boundary is eliminated; the consumer chain is seconds-shaped end-to-end.

### Artifacts Satisfied (from plan frontmatter `must_haves.artifacts`)

- ✓ `src/hooks/useSessionEngine.ts` — useSessionEngine consumes SessionClock; 4 `performance.now()` call-sites converted to `clock.now()`; RunningSnapshot.startedAtMs/lastElapsedMs renamed to startedAtSec/lastElapsedSec; JSDoc at L264 updated to reflect `clock.now()` capture (Warning #11).
- ✓ `src/domain/breathingPlan.ts` — BreathingPlan fields renamed at source. `createBreathingPlan` divides by 1000 ONCE at construction; downstream sees seconds end-to-end.
- ✓ `src/domain/sessionController.ts` — Seconds-shaped domain API: `startSession(settings, nowSec)`, `startStretchSession(stretch, selected, nowSec)`, `extendTimedSession(state, mins, nowSec)`, `completeIfNeeded(state, nowSec)`; `RunningSessionState.startedAtSec`; `CompleteSessionState.completedAtSec`.
- ✓ `src/domain/sessionMath.ts` — `getSessionFrame(plan, elapsedSec)`; `SessionFrame.elapsedSec`; reads `plan.inhaleSec / plan.exhaleSec / plan.cycleSec / plan.totalSec` directly (no /1000 conversion). `formatDuration(sec)` parameter renamed.
- ✓ `src/domain/stretchRamp.ts` — complete source rename per Blocker #2. `StretchSegment.startSec / endSec / cycleSec / inhaleSec / exhaleSec`. Local `cursorSec / durationSec`. `getStretchFrame(segments, elapsedSec)`. Exported `computeStretchTotalSec`. Body of `buildStretchSegments` produces seconds-shaped values throughout (`60` for cycles, `* 60` for minutes-to-seconds).
- ✓ `src/domain/sessionAudio.ts` — `boundaryForSchedule` returns `boundaryStartSec + phaseDurationSec`; reads `frame.currentInhaleSec ?? plan.inhaleSec` directly with no /1000.
- ✓ `src/hooks/useBreathingSessionController.ts` — Wires a SessionClock instance into `useSessionEngine` call. Per D-09, this caller may still touch sessionClock factories but does NOT use `performance.now()` directly.
- ✓ `src/components/StretchSettingsForm.tsx` — `computeStretchTotalMs` → `computeStretchTotalSec` import; display logic `Math.round(stretchTotalMs / 60_000)` → `Math.round(stretchTotalSec / 60)`; variable `stretchTotalMs` → `stretchTotalSec`.
- ✓ `src/components/SettingsForm.stretch.test.tsx` — `computeStretchTotalMs` → `computeStretchTotalSec` import; assertions `Math.round(totalMs / 60_000)` → `Math.round(totalSec / 60)`; `totalMs === null` → `totalSec === null`.

### Key Links Verified

- ✓ `src/hooks/useSessionEngine.ts` → `src/audio/sessionClock.ts` via `audioEngine.ts` re-export (`SessionClock import + clock.now() calls`).
- ✓ `src/domain/sessionController.ts` → `src/domain/sessionMath.ts` via `elapsedSec` threaded through `getSessionFrame`.
- ✓ `src/domain/breathingPlan.ts` → every BreathingPlan consumer via renamed source-level fields. No `/1000` at any consumer.
- ✓ `src/domain/stretchRamp.ts (computeStretchTotalSec)` → `src/components/StretchSettingsForm.tsx + src/components/SettingsForm.stretch.test.tsx` via the renamed export. Consumers updated display math from `/60_000 (ms→min)` to `/60 (sec→min)`.

## Per-Task Commits

| Task | Name | Commit | Files |
|------|------|--------|-------|
| 1-4 (combined) | ms→sec cascade + SessionClock plumbing across session engine | `2619cbc` | 26 files |

**Note on commit decomposition:** the plan structures the work as 4 tasks with per-task commits, but the per-commit green-gate (`pnpm build` must pass) forces a single commit because the TypeScript type-rename across BreathingPlan / SessionFrame / sessionController / useSessionEngine / useBreathingSessionController cannot land incrementally — partial states fail typecheck. This is a Rule 3 deviation (blocking issue: the only way to make Task 1's `pnpm build exits 0` acceptance pass is to update all type consumers in the same commit). The single commit covers all four tasks atomically; the plan's per-task `<verify>` blocks all pass against the final state.

## Verification

- ✓ `pnpm build` exits 0 (typecheck + Vite build all pass).
- ✓ `pnpm test:run` — 1343/1343 across 116 files. Baseline 1343 (post Plan 50-01) preserved exactly. No additions, no removals, no skips.
- ✓ `git diff package.json` is empty (DEPS-01 verified — zero new runtime or dev deps).
- ✓ All source-assertion grep gates confirmed:
  - Gate 1: `grep -rn 'inhaleMs|exhaleMs|cycleMs|totalMs|cursorMs|startMs|endMs|durationMs|TotalMs' src/` — 0 matches
  - Gate 2: `grep -c "inhaleSec" src/domain/breathingPlan.ts` — 3
  - Gate 3: `grep -c "/ 1000" src/domain/sessionAudio.ts` — 0
  - Gate 4: `grep -c "plan.inhaleMs|plan.exhaleMs" src/audio/audioEngine.ts` — 0
  - Gate 5: `grep -c "plan.inhaleSec|plan.exhaleSec" src/audio/audioEngine.ts` — 3 (re-mentioned in 3 JSDoc-adjacent spots)
  - Gate 6: `grep -rc "computeStretchTotalMs" src/` — 0
  - Gate 7: `grep -rc "computeStretchTotalSec" src/` — 4 files (stretchRamp.ts export + stretchRamp.test.ts 21 occurrences + StretchSettingsForm.tsx 2 + SettingsForm.stretch.test.tsx 4)
  - Gate 8: `grep -c "startSec|endSec" src/domain/stretchRamp.ts` — 26
  - Gate 9: `grep -c "startMs|endMs" src/domain/stretchRamp.ts` — 0
  - Gate 10: `grep -c "/ 60_000" src/components/StretchSettingsForm.tsx` — 0
  - Gate 11: `grep -c "/ 60)" src/components/StretchSettingsForm.tsx` — 1
  - Gate 12: `grep -rn 'inhaleMs|exhaleMs|cycleMs|totalMs|startMs|endMs' src/storage/` — 0
  - Gate 13: `grep -c "performance.now" src/hooks/useSessionEngine.ts` — 0
  - Gate 14: `grep -c "clock.now()" src/hooks/useSessionEngine.ts` — 6 (4 callsites + 2 JSDoc references to the contract)
  - Gate 15: `grep -c "SessionClock" src/hooks/useSessionEngine.ts` — 7
  - Gate 16: `grep -c "nowMs|startedAtMs|completedAtMs" src/domain/sessionController.ts` — 0
  - Gate 17: `grep -c "/ 1000" src/domain/sessionController.ts` — 0
  - Gate 18: `grep -c "createWallSessionClock" src/hooks/useBreathingSessionController.ts` — 3 (import + useMemo body + comment)
  - Gate 19: `grep -n "useSessionEngine.*sessionClock" src/hooks/useBreathingSessionController.ts` — 1 occurrence at L84
- ⚠ `pnpm lint` exits non-zero — same 4 pre-existing errors documented in Plan 50-01 SUMMARY's Self-Check / Out of Scope section (in `src/app/sessionPresentation.ts:113`, `src/audio/sessionClock.test.ts:377`, `src/storage/storage.ts:254/256/257`). None of these files were modified by this plan. Per SCOPE BOUNDARY in executor deviation rules, these remain out of scope.

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 3 — Blocking dependency] Combined Tasks 1-4 into a single commit**
- **Found during:** Task 1 (typechecking after BreathingPlan/SessionFrame rename)
- **Issue:** The plan structures the work as 4 separate per-task commits. However, renaming BreathingPlan/SessionFrame at the source breaks every type consumer simultaneously (sessionController.ts reads `state.startedAtMs`, useSessionEngine.ts reads `currentState.lastFrame.elapsedMs`, etc.). The plan's own `<acceptance_criteria>` requires `pnpm build` to exit 0 for each task — impossible mid-rename. Splitting tasks would have produced a broken intermediate commit (Task 1's commit) that fails the per-commit green-gate (`tsc && lint && build && test`).
- **Fix:** Combined Tasks 1-4 into a single atomic commit (`2619cbc`). The plan's per-task `<verify>` blocks all pass against the final state; the structural intent of each task is preserved as logically separable sections within the commit message.
- **Files modified:** All 26 files in one commit.
- **Commit:** `2619cbc`

**2. [Rule 2 — Missing critical functionality] Storage-boundary ms conversion in useBreathingSessionController**
- **Found during:** Task 4 (wiring useSessionEngine call after the rename)
- **Issue:** The plan's `<acceptance_criteria>` says "Storage layer untouched: `grep -rn 'inhaleMs|exhaleMs|cycleMs|totalMs|startMs|endMs' src/storage/` returns zero matches (no migration needed)". This is true — but the storage layer's `recordResonantSession(elapsedMs: number, ...)` / `recordStretchSession(elapsedMs: number, ...)` / `recordNaviKriyaSession(elapsedMs: number, ...)` functions DO accept ms-shaped values as named parameters and internally do `Math.floor(elapsedMs / 1000)`. After the rename, useBreathingSessionController computes `elapsedSec = completedAtSec - startedAtSec` (seconds-shaped) — passing this directly to `recordResonantSession(elapsedSec, ...)` would silently record durations 1000× shorter than reality (a Rule 1 bug). The plan did not specify this boundary conversion explicitly.
- **Fix:** Added the boundary conversion `const elapsedMs = elapsedSec * 1000` at the consumer-to-storage edge in `useBreathingSessionController.ts`, with an inline comment documenting that the storage layer is out of scope per plan's acceptance criteria. This is the ONLY ms-shaped value emitted from the seconds-shaped chain.
- **Files modified:** `src/hooks/useBreathingSessionController.ts`
- **Commit:** Folded into `2619cbc`.

**3. [Rule 1 — FP precision] BreathingPlan FP residue at construction**
- **Found during:** Task 1 (first test run after rename)
- **Issue:** The seconds-shaped construction `cycleSec * (40 / 100) = 12 * 0.4 = 4.800000000000001` produces a 1e-15 FP residue. The old ms-shaped form `12_000 * 0.4 = 4800` was integer-clean by coincidence. The plan's frontmatter explicitly addresses this: "Byte-identicality is structural — no FP-equivalence test needed because there is no runtime /1000 conversion to introduce epsilon drift across rAF ticks." Per-tick drift is indeed gone (no runtime /1000) — but construction-time FP residue is inherent in `12 * 0.4` due to IEEE-754 representation of 0.4. One test (`breathingPlan.test.ts > breathing plan math > converts BPM, ratio, and duration into continuous inhale/exhale timing`) used `toEqual` which strictly compared all fields — it failed against the 4.800000000000001 vs 4.8 mismatch.
- **Fix:** Restructured the single test from `toEqual({ bpm, ratio, cycleSec, inhaleSec, exhaleSec, totalSec })` to per-field assertions: `expect(plan.bpm).toBe(5); expect(plan.ratio).toBe('40:60'); expect(plan.cycleSec).toBeCloseTo(12, 9); expect(plan.inhaleSec).toBeCloseTo(4.8, 9); ...`. Still 1:1 test mapping (same `it` block, same intent, same assertions on every field) — only the assertion form changed to be FP-safe. Test count delta = 0.
- **Files modified:** `src/domain/breathingPlan.test.ts`
- **Commit:** Folded into `2619cbc`.

**4. [Rule 2 — Documentation hygiene] formatDuration parameter rename**
- **Found during:** Task 1 (sessionMath.ts rename)
- **Issue:** `formatDuration(ms: number)` had a single consumer (`SessionReadout.tsx` reads `frame.remainingMs ?? frame.elapsedMs`). After the rename, `SessionReadout.tsx` reads `frame.remainingSec ?? frame.elapsedSec` — both seconds-shaped — and passes them to `formatDuration`. The function body was `Math.floor(ms / 1000)` to extract `totalSeconds`. Post-rename the value is already in seconds, so the body becomes `Math.floor(sec)` directly. The plan called for an audit: "rename to formatDurationSec(sec: number) if the function is only called with seconds-shaped values post-refactor".
- **Audit result:** `grep formatDuration\\(` shows exactly 2 source references (`sessionMath.ts:51` declaration + `SessionReadout.tsx:81` call) plus 3 test references. The function is single-consumer; the consumer is now seconds-shaped. Renamed the parameter from `ms` to `sec` for explicit unit at the call site. Function name kept as `formatDuration` (it formats a duration; the unit specifier in the param name is sufficient). Test `formatDuration formats milliseconds as clock time` → "formats seconds as clock time"; numeric literals divide by 1000 (`65_000` → `65`, `3_665_000` → `3_665`).
- **Files modified:** `src/domain/sessionMath.ts`, `src/domain/sessionMath.test.ts`, `src/components/SessionReadout.tsx`
- **Commit:** Folded into `2619cbc`.

### Out of Scope (Deferred)

- **Pre-existing lint errors on baseline (carried from Plan 50-01)** — 4 errors in `src/app/sessionPresentation.ts:113`, `src/audio/sessionClock.test.ts:377`, `src/storage/storage.ts:254/256/257`. None of these files were modified by this plan. Documented in Plan 50-01 SUMMARY's Self-Check section; recorded in `.planning/phases/50-sessionclock-scheduler-abstraction/deferred-items.md`. Out of SCOPE BOUNDARY per executor deviation rules.
- **useNKEngine and useNaviKriyaSessionController** — these have their own `startedAtMs` field and `elapsedMs` accumulator (NaviKriyaResult shape), independent of SessionFrame. The plan did NOT include them in `files_modified`. Confirmed by reading both files: their ms-shaped fields are internal to the NK engine, not consumed via SessionFrame. NO changes needed; behavior preserved.
- **NaviKriya's `recordNaviKriyaSession(result.elapsedMs, ...)`** call is unchanged because `useNKEngine` still emits `elapsedMs` ms-shaped (out of scope). The storage layer's NaviKriya function continues to accept ms-shaped values — consistent with the plan's "Storage layer untouched" invariant.

## Decisions Made

- **`formatDuration` keeps single name (not split into `formatDurationSec` overload)** — single consumer, the rename to `sec` parameter is sufficient.
- **Storage-boundary conversion lives in `useBreathingSessionController.ts`** (consumer-to-storage edge) rather than in the storage functions themselves, because the plan's invariant is "Storage layer untouched". This keeps the in-memory chain seconds-shaped end-to-end and pushes the ms conversion to a single, comment-documented boundary.
- **Single commit for Tasks 1-4** — forced by the per-commit green-gate plus the transitive type dependency. Documented as Rule 3 deviation in this Summary.
- **Test count preserved exactly at 1343** — no new tests, no removed tests, no skipped tests. The `breathingPlan.test.ts` test that used `toEqual` was restructured to per-field assertions but remains as a single `it` block (1:1 mapping).

## Discoveries for Wave 3+ Plans

1. **`useAudioCues` already references `plan.inhaleSec` semantics at the JSDoc level after the rename.** Plan 50-03 (drift-guard test or useAudioCues SessionClock consumption) can rely on the audio side being seconds-shaped end-to-end now. The dual-anchor pattern in `useBreathingSessionController` is currently:
   - `audioAnchorRef = audio-clock-time - elapsedSec` (after re-anchor, drops the prior `/1000`)
   - `audioTime = audioAnchor + boundaryStartSec` (drops the prior `/1000`)
   Both are seconds-shaped and arithmetic-clean.

2. **The wall clock returns `performance.now() / 1000` — under jsdom fake timers this advances naturally with `vi.advanceTimersByTime(ms)`.** All useSessionEngine tests use `createWallSessionClock()` as the clock fixture (renamed `fakeClock` in the test file). Plan 50-03 / 50-05 drift-guard tests can use the same fixture pattern.

3. **Storage layer remains ms-shaped at the function boundary.** The plan's "Storage layer untouched" is satisfied because the storage *fields* in the persistence envelope are unchanged. Internally, the recordXxxSession functions still divide elapsedMs by 1000 — but that's an internal accident of when the storage layer was first written. A future plan could rename storage parameters to `elapsedSec` and remove the boundary conversion in useBreathingSessionController. Not in scope for Phase 50.

4. **`computeStretchTotalSec` is now consumed in 4 files:** export at `src/domain/stretchRamp.ts`, internal use in `src/domain/stretchRamp.test.ts` (21 references), import in `src/components/StretchSettingsForm.tsx` (2 references — import + body), import in `src/components/SettingsForm.stretch.test.tsx` (4 references — import + assertions). LSP find-references locked the rename completeness.

5. **`rawFloat-divergence assertion` in `SettingsForm.stretch.test.tsx`** (line ~165): the test's `if (rawFloat !== roundedMinutes) { expect(...).not.toBeInTheDocument() }` guard branch is structurally preserved. After the GAP-1 fix the realized total is whole-minute exact for `DEFAULT_STRETCH_SETTINGS`, so `totalSec / 60` is integer-clean → `rawFloat === roundedMinutes` → the inside-of-the-if branch does not execute. The test still passes (the outer assertions run unconditionally), but the divergence-guard branch is effectively dormant for this fixture. Documented in the test comment per plan's Note in Step 8.

## Self-Check: PASSED

- ✓ `src/domain/breathingPlan.ts` updated (verified by grep: cycleSec / inhaleSec / exhaleSec / totalSec / SEC_PER_MINUTE = 60).
- ✓ `src/domain/sessionMath.ts` updated (SessionFrame has elapsedSec / remainingSec / cycleStartSec / currentInhaleSec / currentExhaleSec / currentCycleSec; formatDuration param is `sec`).
- ✓ `src/domain/stretchRamp.ts` updated (StretchSegment.startSec/endSec/cycleSec/inhaleSec/exhaleSec; StretchSessionFrame.{cycleStartSec,currentCycleSec,currentInhaleSec,currentExhaleSec}; computeStretchTotalSec exported; getStretchFrame body uses CLAMP_EPSILON_SEC = 0.001).
- ✓ `src/domain/sessionController.ts` updated (RunningSessionState.startedAtSec; CompleteSessionState.completedAtSec; 4 functions take `nowSec`; body locals are `elapsedSec`).
- ✓ `src/domain/sessionAudio.ts` updated (boundaryStartSec; no /1000 in body).
- ✓ `src/audio/audioEngine.ts` updated (plan.inhaleSec at L317; JSDoc references seconds-shaped fields).
- ✓ `src/hooks/useAudioCues.ts` JSDoc updated (plan.inhaleSec/plan.exhaleSec).
- ✓ `src/hooks/useSessionEngine.ts` updated (SessionClock import; 3-arg signature; 4 clock.now() call-sites; zero performance.now() references; RunningSnapshot.startedAtSec/lastElapsedSec; useCallback deps include `clock`).
- ✓ `src/hooks/useBreathingSessionController.ts` updated (createWallSessionClock import; useMemo construction; 3-arg useSessionEngine call; boundary conversion at storage call).
- ✓ `src/components/SessionReadout.tsx` updated (frame.remainingSec ?? frame.elapsedSec).
- ✓ `src/components/StretchSettingsForm.tsx` updated (computeStretchTotalSec import + display /60).
- ✓ All 11 test files updated to seconds-shaped fixtures; field references renamed; numeric literals /1000.
- ✓ Commit `2619cbc` exists in `git log --oneline -5`.
- ✓ 1343/1343 tests pass; baseline preserved.
- ✓ `pnpm build` exits 0.
- ✓ All plan grep gates pass.

## TDD Gate Compliance

N/A — this plan has `type: execute`, not `type: tdd`. No RED/GREEN/REFACTOR gate sequence required. The plan's invariant is "test parity at 1343 baseline preserved with per-file rename diffs only (no count change, no skipped tests)" — verified above.
