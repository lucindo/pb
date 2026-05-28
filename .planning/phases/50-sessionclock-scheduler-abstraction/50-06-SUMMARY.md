---
phase: 50-sessionclock-scheduler-abstraction
plan: 06
subsystem: audio
tags:
  - sessionclock
  - audio
  - audioengine
  - facade
  - dispatch
dependency-graph:
  requires:
    - 50-01 (SessionClock interface + Cue closed union + createAudioSessionClock factory with optional scheduleImpl)
    - 50-04 (engine.clock as readonly SessionClock — Plan 50-04 placed clock construction at L177 with scheduleImpl = undefined)
  provides:
    - "Internal schedule(when, cue) function in audioEngine.ts with `switch (cue.kind)` covering all 8 Cue arms"
    - "ABSTR-01 fully satisfied — SessionClock.schedule(when, cue) is wired to the engine's internal dispatch via scheduleImpl plumbed at construction (revision 1 Blocker #2)"
    - "scheduleLeadIn / scheduleNextCue / playEndChord refactored as thin facades over schedule() (D-05)"
    - "endChordTailUntil Math.max bookkeeping moved into schedule()'s 'end-chord' arm (preserved verbatim; close()-deferral semantics unchanged)"
  affects:
    - Plan 50-07 (drift-guard — confirms engine internals stay OUT of caller-file scope; the SAFE_LEAD_SEC clamp + playEndChord 'when' offset audioCtx.currentTime reads remain inside the engine and are NOT scanned)
    - Phase 52 (lookahead via engine.clock.schedule(when, cue) — the internal dispatch is the binding point for future pre-scheduling of N cues ahead)
tech-stack:
  added: []
  patterns:
    - "Internal dispatch from typed Cue value to per-cue primitives (`switch (cue.kind)` exhaustiveness gates against new kinds without an arm)"
    - "Facade pattern over internal dispatch — closed/muted guards live in the facade, schedule() assumes the facade has gated"
    - "scheduleImpl plumbed at construction (revision 1 Blocker #2) — no post-hoc readonly reassignment, no cast-based mutation"
    - "Augmented factory return type widening at the public-member assignment boundary (notifySuspended invisible to external consumers — revision 2 Blocker #1)"
key-files:
  created: []
  modified:
    - src/audio/audioEngine.ts (+82 / -38 — adds internal schedule(when, cue) function; moves clock construction from L177 to post-schedule position with scheduleImpl=schedule; rewrites 3 facade bodies)
    - src/audio/audioEngine.test.ts (+118 / -0 — adds Phase 50-06 dispatch describe block with 8 tests, one per Cue arm)
decisions:
  - "D-05 honored: scheduleLeadIn / scheduleNextCue / playEndChord become thin facades over the internal schedule(when, cue). The 4 direct primitive calls in scheduleLeadIn become 4 schedule() calls (3 lead-in-tick + 1 in). The ternary in scheduleNextCue becomes 1 schedule() with kind={newPhase}. playEndChord becomes 1 schedule() with kind='end-chord'."
  - "D-04 honored: the Cue discriminated union is consumed in full by the dispatch — every kind has a switch arm (8 total)."
  - "Revision 1 Blocker #2: scheduleImpl plumbed at construction (NOT post-hoc reassignment). Construction moved from Plan 50-04's L177 position to post-schedule-function position so schedule is in scope at the `createAudioSessionClock(audioCtx, schedule)` call."
  - "Revision 2 Blocker #1 preserved across the move: the local clock reference at the new construction site is typed as `SessionClock & { notifySuspended(): void }` (the augmented factory return type from Plan 50-01). The L445 InvalidStateError catch's `clock.notifySuspended()` call (placed by Plan 50-04) continues to type-check."
  - "Revision 2 Warning #6 ordering parity: both Plan 50-04 close (clock at L177) AND this plan close (clock at post-schedule position) pass per-commit green-gate independently. Move is observationally equivalent — listener attachment, subscriber Sets, notifySuspended escape hatch are independent of construction-site line number."
  - "Revision 2 Warning #7 reworded grep gate: the no-arg / single-arg form `createAudioSessionClock(audioCtx)` is verified absent via `grep -cE 'createAudioSessionClock\\(audioCtx[^,]'` returning 0. The only legitimate form post-Plan-50-06 is the 2-arg call."
  - "Phase 18 D-08 preserved at the dispatch boundary: 'in' / 'out' cue payloads carry a `timbre` field for type completeness (so Phase 52 callers without engine context can still satisfy the type), but the engine ignores cue.timbre and uses its closed-over sessionTimbre."
  - "endChordTailUntil bookkeeping moved into schedule()'s 'end-chord' arm. close()'s tail-defer setTimeout reads the same endChordTailUntil — semantics byte-identical, Math.max idempotency preserved."
  - "CONTEXT specifics honored: engine internals continue to read audioCtx.currentTime directly (the SAFE_LEAD_SEC clamp + playEndChord 'when' offset). These reads are INSIDE the engine and OUTSIDE the Plan 50-07 drift-guard scope (the 5 caller files exclusively)."
metrics:
  duration: 12 minutes
  completed: 2026-05-28
  test-count-baseline: 1343 (post Plans 50-01 through 50-05)
  test-count-after: 1351
  test-count-delta: +8
  tasks-completed: 2
  files-modified: 2
  files-created: 0
---

# Phase 50 Plan 06: audioEngine internal schedule dispatch + facade refactor Summary

`audioEngine.ts` now has an internal `schedule(when, cue)` function that performs a complete `switch (cue.kind)` dispatch over the 8-arm closed `Cue` discriminated union from Plan 50-01, and `scheduleLeadIn` / `scheduleNextCue` / `playEndChord` have been refactored into thin facades that build typed Cue values and forward through it. The `SessionClock`'s `schedule` member is now wired to the engine's internal dispatch via `scheduleImpl` plumbed at construction (revision 1 Blocker #2) — no post-hoc readonly reassignment, no cast-based mutation. External API surface is unchanged; behavior is byte-identical.

## What Got Built

### Truths Satisfied (from plan frontmatter `must_haves.truths`)

- ✅ `audioEngine.ts` has an internal `schedule(when: number, cue: Cue): void` function performing `switch (cue.kind)` dispatch to the existing per-cue scheduler primitives. All 8 arms present and reachable: `'lead-in-tick'` / `'countdown-tick'` route to `scheduleCountdownTick`; `'in'` / `'out'` route to `scheduleInCueForTimbre` / `scheduleOutCueForTimbre`; `'end-chord'` routes to `scheduleEndChord` (with the `endChordTailUntil = Math.max(...)` bookkeeping); `'nk-front'` / `'nk-back'` / `'nk-tick'` route to the corresponding `scheduleNK*` primitives.
- ✅ `scheduleLeadIn` is a thin facade — 4 `schedule()` calls (3× `lead-in-tick` + 1× `in`) replacing the prior 4 direct primitive calls. The 3-2-1 timing pattern, `closed` / `muted` early-return guards, `firstInCueTime` return value, and `activeCues.add` bookkeeping (now done inside schedule()) are preserved verbatim.
- ✅ `scheduleNextCue` is a thin facade — 1 `schedule(clampedAudioTime, { kind: newPhase, phaseDurationSec, timbre: sessionTimbre })` replacing the prior `scheduleInCueForTimbre` / `scheduleOutCueForTimbre` ternary. The `SAFE_LEAD_SEC` callee-side clamp stays in the facade (AUDIO-02 D-01/D-02). `pruneExpiredCues` continues to run before scheduling.
- ✅ `playEndChord` is a thin facade — 1 `schedule(when, { kind: 'end-chord' })`. The `endChordTailUntil` bookkeeping is now inside `schedule()`'s `'end-chord'` arm (Task 1) — close() still defers teardown until the tail rings out.
- ✅ External engine API (`AudioEngine` interface members `scheduleLeadIn`, `scheduleNextCue`, `playEndChord`, plus `clock`) is unchanged. Wave 2 consumers (useAudioCues from Plan 50-04) call these the same way as pre-refactor — verified by the existing 41 audioEngine tests passing unchanged.
- ✅ Engine internals continue to read `audioCtx.currentTime` directly (the SAFE_LEAD_SEC clamp in scheduleNextCue at the facade level, the `when = audioCtx.currentTime + SAFE_LEAD_SEC` offset in playEndChord, the pruneExpiredCues `now` read, and the `now()` member). These reads are INSIDE the engine and OUTSIDE the Plan 50-07 drift-guard scope per 50-CONTEXT.md specifics.
- ✅ NK arms (`'nk-front'` / `'nk-back'` / `'nk-tick'`) are wired with arm implementations but currently unused at Phase 50 — NK paths in useNaviKriyaAudio still call the per-cue schedulers directly per Plan 50-03 (D-05's NK migration through `schedule()` is documented as available but not exercised until Phase 52 lookahead).
- ✅ **Revision 1 Blocker #2 honored:** clock construction reads `createAudioSessionClock(audioCtx, schedule)` — `scheduleImpl` plumbed at construction. The Plan 50-04 1-arg form is deleted. No `clock.schedule = ...` reassignment, no `(clock as ...)...= ...` cast-based mutation. The readonly contract on `AudioEngine.clock: SessionClock` is preserved structurally.
- ✅ **Revision 2 Blocker #1 carried across the construction-site move:** the local clock reference at the new construction site is typed as `SessionClock & { notifySuspended(): void }` (the augmented factory return type from Plan 50-01). The L445 `clock.notifySuspended()` call inside the `resume()` `InvalidStateError` catch (placed by Plan 50-04) continues to type-check. The `engine.clock` public-member assignment widens to `SessionClock` so external consumers cannot see `notifySuspended`.
- ✅ **Revision 2 Warning #6 ordering parity:** Plan 50-04's intermediate-state construction at L177 (`createAudioSessionClock(audioCtx)`) passed the per-commit green-gate at that close. This plan's final-state construction at post-schedule position (`createAudioSessionClock(audioCtx, schedule)`) passes the per-commit green-gate at this close. The move is observationally equivalent — listener attachment, subscriber Sets lifecycle, and the `notifySuspended()` escape hatch are independent of the construction-site line number.
- ✅ **Revision 1 Warning #9 test count delta documented:** see [Test Count Delta](#test-count-delta-revision-1-warning-9) below.

### Artifacts Satisfied (from plan frontmatter `must_haves.artifacts`)

- ✅ `src/audio/audioEngine.ts`:
  - Internal `schedule(when, cue)` function with `switch (cue.kind)` dispatch covering all 8 Cue arms (the `contains: "switch \\(cue.kind\\)"` artifact check passes).
  - Facade refactor of `scheduleLeadIn` / `scheduleNextCue` / `playEndChord` over `schedule()`.
  - Clock construction amended to `createAudioSessionClock(audioCtx, schedule)` — revision 1 Blocker #2 scheduleImpl plumbed at construction.
  - Engine internals continue to read `audioCtx.currentTime` directly (CONTEXT.md specifics).
- ✅ `src/audio/audioEngine.test.ts`: 8 new dispatch tests inside a new `describe('Phase 50-06 — internal schedule(when, cue) dispatch (8 Cue arms)', ...)` block. Each test exercises one `cue.kind` arm, asserts the corresponding `scheduleX` primitive was invoked exactly once with the expected `when` and `sessionTimbre`, and (for `'in'` / `'out'` cues) confirms `cue.timbre` is ignored in favor of `sessionTimbre` per Phase 18 D-08. The `'end-chord'` test additionally asserts the `endChordTailUntil` bookkeeping via the `close()` setTimeout deferral path.

### Key Links Verified

- ✅ `src/audio/audioEngine.ts` (3 facades) → `src/audio/audioEngine.ts` (internal `schedule` function) via internal function call `schedule(when, { kind: ... })` — 6 matches across the 3 facades (3 lead-in-tick + 1 in + 1 newPhase + 1 end-chord). Pattern `schedule\\(.*,.*\\{ kind:` passes.
- ✅ `src/audio/audioEngine.ts` (`schedule` function) → `src/audio/cueSynth.ts` and `src/audio/nkCueSynth.ts` (per-cue primitives) via `switch (cue.kind)` dispatch — exactly 1 switch in audioEngine.ts. Pattern `switch \\(cue.kind\\)` passes.
- ✅ `src/audio/audioEngine.ts` (`createAudioEngine`) → `src/audio/sessionClock.ts` (`createAudioSessionClock` with `scheduleImpl` arg) via constructor plumbing. Pattern `createAudioSessionClock\\(audioCtx,` passes — exactly 1 match (the new 2-arg call); the 1-arg form is absent.

## Per-Task Commits

| Task | Name | Commit | Files | Lines |
|------|------|--------|-------|-------|
| 1 | Add internal `schedule(when, cue)` dispatch + amend clock construction (Revision 1 Blocker #2 scheduleImpl plumbing) | `c015995` | src/audio/audioEngine.ts, src/audio/audioEngine.test.ts | +247 / -25 |
| 2 | Refactor `scheduleLeadIn` / `scheduleNextCue` / `playEndChord` as thin facades over `schedule()` | `51c2614` | src/audio/audioEngine.ts | +25 / -23 |

## Verification

- ✅ `pnpm build` exits 0 (typecheck passes).
- ✅ `pnpm test:run src/audio/audioEngine.test.ts` — **41/41 pass** (33 baseline + 8 new dispatch tests).
- ✅ `pnpm test:run` (full suite) — **1351/1351 across 116 files**. Baseline 1343 → +8 new tests in `audioEngine.test.ts`. No existing tests modified, no skips introduced.
- ⚠️ `pnpm lint` exits non-zero with EXACTLY the pre-existing baseline issues (4 errors + 3 warnings in `sessionPresentation.ts`, `sessionClock.test.ts`, `useAudioCues.ts`, `useWakeLock.ts`, `storage.ts`). No new lint problems introduced by Plan 50-06. These are the same issues already documented in `deferred-items.md` by Plan 50-01 and Plan 50-04. Out of SCOPE BOUNDARY per executor deviation rules.
- ✅ `git diff package.json` is empty (DEPS-01 verified — zero new runtime or dev deps).
- ✅ Source assertions (full sweep):
  - `grep -c "function schedule" src/audio/audioEngine.ts` → 1 ✓
  - `grep -c "switch (cue.kind)" src/audio/audioEngine.ts` → 1 ✓
  - `grep -cE "case 'in':|case 'out':|case 'lead-in-tick':|case 'end-chord':|case 'nk-front':|case 'nk-back':|case 'nk-tick':|case 'countdown-tick':" src/audio/audioEngine.ts` → 8 ✓
  - `grep -c "createAudioSessionClock(audioCtx, schedule)" src/audio/audioEngine.ts` → 1 ✓ (positive: exactly one 2-arg call)
  - `grep -cE "createAudioSessionClock\(audioCtx[^,]" src/audio/audioEngine.ts` → 0 ✓ (revision 2 Warning #7 reworded gate — no-arg form rejected)
  - `grep -cE "clock\.schedule = |clock as " src/audio/audioEngine.ts` → 0 ✓ (revision 1 Blocker #2 — no post-hoc reassignment, no cast-based mutation)
  - `grep -c "SessionClock & { notifySuspended" src/audio/audioEngine.ts` → 4 ✓ (≥1 required; 3× annotation/JSDoc + 1× local reference type at the new construction site — revision 2 Blocker #1 preserved across the move)
  - `grep -c "scheduleCountdownTick(audioCtx, startAudioTime" src/audio/audioEngine.ts` → 0 ✓ (the lead-in ticks now go through schedule())
  - `grep -c "scheduleInCueForTimbre(audioCtx, firstInCueTime" src/audio/audioEngine.ts` → 0 ✓ (the first In cue now goes through schedule())
  - `grep -cE "schedule\(.*, \{ kind: 'lead-in-tick' \}\)" src/audio/audioEngine.ts` → 3 ✓
  - `grep -cE "schedule\(.*, \{ kind: 'in'" src/audio/audioEngine.ts` → 1 ✓ (≥1 required)
  - `grep -cE "schedule\(.*, \{ kind: 'end-chord' \}\)" src/audio/audioEngine.ts` → 1 ✓
  - `grep -cE "schedule\(.*, \{ kind: newPhase" src/audio/audioEngine.ts` → 1 ✓

## Test Count Delta (Revision 1 Warning 9)

Phase 50 cumulative test count delta (running tally):

| Plan | Test file changes | Δ tests | Cumulative |
|------|-------------------|---------|------------|
| Baseline (pre-Phase-50) | — | — | 1283 (per PROJECT.md v2.1 close) |
| Plan 50-01 | sessionClock.test.ts (new): 24 tests | +24 | 1319* |
| Plans 50-02 / 50-03 / 50-04 / 50-05 | renames + Blocker #4 path (a) — no test additions | 0 | 1343 |
| **Plan 50-06 (this plan)** | **audioEngine.test.ts dispatch block: 8 tests** | **+8** | **1351** |
| Plan 50-07 (pending) | drift-guard test (1-3 tests) | +1 to +3 | 1352 to 1354 |

*Note on the 1319 vs 1343 baseline mismatch noted in Plan 50-01 SUMMARY: Plan 50-01 reports its baseline as 1319 and the test-count-after as 1343 (+24). The PROJECT.md v2.1-close baseline is 1283; the additional 36 tests between 1283 and 1319 appear to be from quick task `260526-dse` (+14 tests at v2.1 close), Phase 49 (+5 tests + 1 CR-01 regression = +6), and Phase 49.1 (+30 tests on bypassSilentMode gating). At Plan 50-06 close, the full suite stands at 1351/1351 — verified end-to-end.

Zero existing tests removed; zero skips introduced. The 33 baseline `audioEngine` tests continue to pass with the same assertion shape (the facade refactor is observationally transparent: same primitives are invoked with the same args in the same order; only the dispatch path through `schedule()` is new).

## Construction-Site Move Audit

Plan 50-04's intermediate state placed the clock construction line at audioEngine.ts L177, immediately after `const audioCtx = new AudioContext()`, calling `createAudioSessionClock(audioCtx)` with no `scheduleImpl` arg. The intermediate `clock.schedule()` was a no-op for that plan-close.

This plan's final state moves the construction to a position AFTER the internal `schedule` function is defined (so the function symbol is in scope at construction time) and BEFORE the `const engine: AudioEngine = { ... }` object literal (so `clock` is in scope when the literal reads it). The construction now reads:

```ts
const clock: SessionClock & { notifySuspended(): void } = createAudioSessionClock(audioCtx, schedule)
```

Three invariants confirmed across the move:

1. **Listener attachment is unaffected.** The clock's single `audioCtx.addEventListener('statechange', ...)` registration is performed inside the factory body (Plan 50-01); the line at which the factory is *called* does not change when the listener is wired. Both Plan 50-04 close (L177) and this plan close (post-schedule) attach the listener exactly once per engine.
2. **Subscriber Sets lifecycle is unaffected.** `suspendSubscribers`, `resumeSubscribers`, and `closeSubscribers` are constructed inside the factory and persist for the lifetime of the returned clock. The factory-call site does not affect their identity or lifetime.
3. **`notifySuspended()` escape hatch is unaffected.** The L445 `clock.notifySuspended()` call in the `resume()` `InvalidStateError` catch continues to type-check because the local `clock` reference (now at the new construction site) is typed as the augmented factory return type. The `engine.clock` public-member assignment still widens to `SessionClock`.

Per-commit green-gate held at both intermediate (Plan 50-04 close) and final (this plan close) states: `pnpm build`, `pnpm lint` (same pre-existing baseline only), `pnpm test:run` all green.

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 1 — Inline polish] Removed an inline-comment false positive in `grep -c "createAudioSessionClock(audioCtx, schedule)"` count**
- **Found during:** Task 1 post-edit verification
- **Issue:** I initially wrote an orientation comment in the Plan 50-04 deletion site that contained the literal string `createAudioSessionClock(audioCtx, schedule)` (intended as a pointer to the new construction site). The plan's source assertion ` grep -c "createAudioSessionClock(audioCtx, schedule)" ... returns 1 (positive assertion: exactly one 2-arg call exists)` is targeting the actual call site, not comment occurrences. The literal-match comment caused the count to read 2.
- **Fix:** Rewrote the orientation comment to refer to the construction site abstractly (the `const clock = ...` line) without quoting the call expression verbatim. Count now reads 1 (the genuine call site at L404), satisfying the positive assertion.
- **Files modified:** `src/audio/audioEngine.ts`
- **Commit:** Folded into `c015995` (Task 1) before commit.

### Out of Scope (Deferred)

- **Pre-existing lint errors on baseline:** the 4 errors + 3 warnings in `sessionPresentation.ts`, `sessionClock.test.ts`, `useAudioCues.ts`, `useWakeLock.ts`, `storage.ts` are identical to the pre-existing baseline already tracked in `deferred-items.md` (Plan 50-01 + Plan 50-04 disposition). Plan 50-06 introduces zero new lint problems.
- **Untracked `pnpm-lock.yaml`:** was already untracked at session start, unchanged by this plan.

## Discoveries for Downstream Plans

1. **Plan 50-07 drift-guard scope unchanged.** This plan's facade refactor moves only internal dispatch — the public `engine.clock` surface from Plan 50-04 is unchanged, and engine internals continue to read `audioCtx.currentTime` directly (the SAFE_LEAD_SEC clamp + playEndChord `when` offset). The drift-guard test (Plan 50-07) scans the 5 caller files exclusively per 50-CONTEXT.md specifics; audioEngine.ts itself stays out of scope.

2. **Phase 52 lookahead binding point is now functional.** External callers can pre-schedule typed Cue values via `engine.clock.schedule(when, cue)` and the engine's internal dispatch routes them to the correct per-cue primitive. The 4 NK arms (`'nk-front'` / `'nk-back'` / `'nk-tick'`) are dormant at Phase 50 but ready for Phase 52 lookahead consumers — no further engine changes required to wire NK lookahead.

3. **`cue.timbre` payload is structural, not behavioral.** The `'in'` / `'out'` cue payloads carry a `timbre` field for type completeness (so Phase 52 callers without engine context can satisfy the type), but the engine ignores it and uses its closed-over `sessionTimbre` per Phase 18 D-08 capture-at-session-start. Future callers must NOT rely on `cue.timbre` reaching the per-cue primitive through the engine — it is silently overridden. An inline comment at the `'in'` arm documents this contract.

4. **The `'end-chord'` arm is the only one with bookkeeping side-effects.** All other arms simply `activeCues.add(...)` the returned handle. `'end-chord'` additionally updates `endChordTailUntil = Math.max(endChordTailUntil, c.cleanupAt)` so `close()` can defer teardown until the chord rings out. The Math.max idempotency means a double-dispatched end-chord cannot retreat the tail.

5. **Construction-site move is observationally byte-identical.** The Plan 50-04 → Plan 50-06 move of the clock construction line passes per-commit green-gate at both intermediate (L177, scheduleImpl=undefined) and final (post-schedule, scheduleImpl=schedule) positions. This validates the assumption that the factory's *call site* is independent of the factory's *side effects* (listener attachment, subscriber Sets, notifySuspended escape hatch).

## Self-Check: PASSED

- ✅ `src/audio/audioEngine.ts` modified (verified by `git log --oneline --all -- src/audio/audioEngine.ts | head -3` resolving to commits c015995 + 51c2614).
- ✅ `src/audio/audioEngine.test.ts` modified (verified by `git log --oneline --all -- src/audio/audioEngine.test.ts | head -3`).
- ✅ Commit `c015995` exists in `git log` (Task 1).
- ✅ Commit `51c2614` exists in `git log` (Task 2).
- ✅ `pnpm build` exits 0.
- ✅ `pnpm test:run` reports 1351/1351 pass.
- ✅ All 14 source assertions from the plan's `<verify>` blocks confirmed via `grep` (see Verification section).
- ✅ Internal `schedule(when, cue)` function exists with all 8 Cue arms.
- ✅ Revision 1 Blocker #2 honored: `createAudioSessionClock(audioCtx, schedule)` exactly once; no `clock.schedule = ...` reassignment; no `(clock as ...).schedule = ...` cast mutation.
- ✅ Revision 2 Blocker #1 preserved: local clock reference at new construction site typed as the augmented factory return type; L445 `clock.notifySuspended()` call type-checks.
- ✅ Revision 2 Warning #6 ordering parity: per-commit green-gate held at both Plan 50-04 intermediate and Plan 50-06 final construction sites.
- ✅ Revision 2 Warning #7 reworded grep gate verified: `createAudioSessionClock\\(audioCtx[^,]` returns 0.
- ✅ Revision 1 Warning #9 test count delta documented (running tally; +8 this plan).
- ✅ DEPS-01: `git diff HEAD~2 HEAD -- package.json` is empty.
- ✅ QUAL-01: per-commit green-gate (`pnpm build` + `pnpm test:run`) held through each of the 2 commits.
