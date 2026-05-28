---
phase: 50-sessionclock-scheduler-abstraction
plan: 01
subsystem: audio
tags:
  - sessionclock
  - audio
  - interface
  - abstraction
dependency-graph:
  requires: []
  provides:
    - SessionClock interface (public 6-member read-only surface)
    - Cue closed discriminated union (catalog frozen at Phase 50 per D-04)
    - createAudioSessionClock(audioCtx, scheduleImpl?) factory returning SessionClock & { notifySuspended(): void } (augmented type, engine-only escape hatch)
    - createWallSessionClock() factory returning plain SessionClock
    - SessionClock re-export from src/audio/audioEngine.ts (ABSTR-02 literal contract satisfier)
  affects:
    - Plans 50-02 through 50-05 (callers consume SessionClock via this seam in Wave 2)
    - Plan 50-06 (engine internal facade — passes scheduleImpl through this factory)
    - Phase 51 (caller-level rebase onto clock.now() − sessionStartCtxTime)
    - Phase 52 (lookahead via clock.schedule())
    - Phase 53 (master-gain mute via setMasterGain — currently stubbed no-op)
tech-stack:
  added: []
  patterns:
    - "Single statechange listener → fan-out Sets (analog: audioEngine.ts L243-257)"
    - "fanSuspend() factored as the single fan-out path shared by the natural statechange listener AND the synthetic notifySuspended() escape hatch — no behavior drift between the two suspend triggers (revision 2 Blocker #1)"
    - "Wrap-don't-construct factories (D-08): AC is passed in by caller; factory never invokes `new AudioContext()`"
    - "Capture-at-construction for scheduleImpl: avoids post-hoc readonly reassignment that would violate the interface contract (revision 1 Blocker #2)"
    - "Augmented factory return type as type-level access control: external consumers receive `SessionClock` (6-member); only the engine's internal augmented-type reference can call notifySuspended"
key-files:
  created:
    - src/audio/sessionClock.ts (389 lines)
    - src/audio/sessionClock.test.ts (381 lines)
  modified:
    - src/audio/audioEngine.ts (+4 lines — re-export + 2 comment lines only)
decisions:
  - "D-03 Option A implemented as specified: createAudioSessionClock.now() returns audioCtx.currentTime, createWallSessionClock.now() returns performance.now() / 1000 — locked in code AND tests"
  - "Revision 1 Blocker #1: onClose is the 6th SessionClock member; statechange listener fans 'closed' to a dedicated closeSubscribers Set; wall clock returns no-op unsubscribes for onClose"
  - "Revision 1 Blocker #2: scheduleImpl is a constructor parameter (NOT post-hoc reassignment) — the engine plumbs its internal dispatch through createAudioSessionClock(audioCtx, engineSchedule) at Plan 50-06"
  - "Revision 1 Warning #5: strict single-read source assertions hold — exactly 1 audioCtx.currentTime read inside createAudioSessionClock (the body of now()); exactly 1 performance.now read inside createWallSessionClock (the body of now()); 0 new AudioContext() constructions in this file"
  - "Revision 1 Warning #12: phase-level invariant comment at top of file documenting the two createAudioSessionClock invocation sites (HRV AC inside createAudioEngine; NK AC inside useNaviKriyaAudio.begin()) — they wrap DIFFERENT ACs and MUST NOT be conflated"
  - "Revision 2 Blocker #1: notifySuspended() is on the AUGMENTED FACTORY RETURN TYPE, not on the public SessionClock interface. Single fanSuspend() helper shared by the natural statechange listener AND notifySuspended(); type-level access control via the augmented return type — external consumers cannot reach notifySuspended"
metrics:
  duration: 11 minutes
  completed: 2026-05-28
  test-count-baseline: 1319
  test-count-after: 1343
  test-count-delta: +24
  tasks-completed: 3
  files-created: 2
  files-modified: 1
---

# Phase 50 Plan 01: SessionClock interface and factories Summary

The `SessionClock` interface and its two factory functions (`createAudioSessionClock`, `createWallSessionClock`) now exist in `src/audio/sessionClock.ts` with byte-identical D-03 Option A semantics — the audio factory reads `audioCtx.currentTime`, the wall factory reads `performance.now() / 1000`, and `audioEngine.ts` re-exports the type for downstream callers.

## What Got Built

### Truths Satisfied (from plan frontmatter `must_haves.truths`)

- ✅ `SessionClock` interface exists with EXACTLY 6 typed, documented members (`now()`, `schedule(when, cue)`, `setMasterGain(value, rampSec)`, `onSuspend(cb)`, `onResume(cb)`, `onClose(cb)`). The 6th member `onClose` was added in revision 1 to preserve the byte-identical `'unavailable'` setter at `useAudioCues.ts:164-165` (Phase 50 success criterion #3).
- ✅ Two factory functions exist: `createAudioSessionClock(audioCtx, scheduleImpl?)` returning `SessionClock & { notifySuspended(): void }` and `createWallSessionClock()` returning `SessionClock`. The optional `scheduleImpl` parameter is plumbed at construction time (revision 1 Blocker #2), so the engine can wire its internal dispatch at Plan 50-06 without any post-hoc reassignment of a `readonly` member.
- ✅ Revision 2 Blocker #1: `createAudioSessionClock` returns the augmented type `SessionClock & { notifySuspended(): void }`. `notifySuspended()` fans the `'suspended'` event to `suspendSubscribers` synchronously via the shared `fanSuspend()` helper. The public `SessionClock` read-only surface stays at exactly 6 members. External consumers see only `SessionClock`; only the engine's internal augmented-type reference (introduced in Plan 50-04 for the L445 InvalidStateError fan-out) can call `notifySuspended`.
- ✅ `createAudioSessionClock.now()` body returns `audioCtx.currentTime` (D-01 + D-03 Option A) — NOT `performance.now() / 1000`. Verified by source assertion and a dedicated test (`now() returns audioCtx.currentTime`).
- ✅ `createWallSessionClock.now()` body returns `performance.now() / 1000` (D-07).
- ✅ `createAudioSessionClock.onSuspend`/`onResume`/`onClose` fan out real `audioCtx.addEventListener('statechange', ...)` transitions to subscribers (D-11 extended). `createWallSessionClock` exposes no-op subscribers for all three (verified by test).
- ✅ `setMasterGain(value, rampSec)` body is a documented no-op stub at Phase 50; no GainNode is inserted into the audio graph (D-12).
- ✅ `audioEngine.ts` re-exports the `SessionClock` type (ABSTR-02 literal contract).
- ✅ Existing 1319-test baseline preserved (1343/1343 pass after Plan 50-01; net +24 from the new test file). No caller migration in this plan — Wave 2 (Plans 50-02 through 50-05) wires consumers.
- ✅ Phase-level invariant note at the top of the file documenting the two `createAudioSessionClock` invocation sites (HRV AC inside `createAudioEngine`; NK AC inside `useNaviKriyaAudio.begin()`) and the requirement that they MUST NOT be conflated (revision 1 Warning #12).
- ✅ EXACTLY one `audioCtx.currentTime` read inside `createAudioSessionClock` (inside `now()`'s body); EXACTLY one `performance.now()` read inside `createWallSessionClock` (inside `now()`'s body); zero `audioCtx.currentTime`/`performance.now()` reads outside those two factory bodies inside this file (revision 1 Warning #5 strict single-read assertions).

### Artifacts Satisfied (from plan frontmatter `must_haves.artifacts`)

- ✅ `src/audio/sessionClock.ts` (389 lines, > 100 min) — provides the SessionClock interface (6 members), Cue discriminated union (8 kinds; 'in'/'out' carry `timbre` + `phaseDurationSec`), `createAudioSessionClock` (returns augmented type; now() returns `audioCtx.currentTime`; `schedule()` forwards to `scheduleImpl` when provided; `notifySuspended()` fans 'suspended' synchronously to `suspendSubscribers`), and `createWallSessionClock` (returns plain SessionClock; now() returns `performance.now() / 1000`).
- ✅ `src/audio/sessionClock.test.ts` (381 lines, > 90 min) — provides unit tests for both factories: `now()` shape (AC-time vs wall-time), `onSuspend`/`onResume`/`onClose` fan-out via FakeAudioContext statechange, `notifySuspended()` fan-out (engine-only escape hatch), `setMasterGain` no-op, `schedule()` forwarding to `scheduleImpl`, single-listener invariant. 24 it() blocks total — exceeds the ≥22 requirement.
- ✅ `src/audio/audioEngine.ts` — adds the `export type { SessionClock } from './sessionClock'` re-export (ABSTR-02). No other behavior change in this plan.

### Key Links Verified

- ✅ `addEventListener('statechange'` appears exactly once in `sessionClock.ts` (the single fan-out listener pattern from `audioEngine.ts` L243-257).
- ✅ `audioCtx.currentTime` is read exactly once in `sessionClock.ts` (inside `createAudioSessionClock.now()`'s body — D-03 Option A site).
- ✅ `export type { SessionClock` re-export in `audioEngine.ts` matches the plan's literal-contract pattern.

## Per-Task Commits

| Task | Name | Commit | Files | Lines |
|------|------|--------|-------|-------|
| 1 | Add SessionClock interface and audio + wall factories | `e8ed71e` | src/audio/sessionClock.ts | +389 |
| 2 | Unit tests for both factories | `37e9aae` | src/audio/sessionClock.test.ts | +381 |
| 3 | Re-export SessionClock from audioEngine.ts | `18c84b0` | src/audio/audioEngine.ts | +4 |

## Verification

- ✅ `pnpm build` exits 0 (typecheck passes).
- ✅ `pnpm test:run src/audio/sessionClock.test.ts` — 24/24 pass.
- ✅ `pnpm test:run` (full suite) — 1343/1343 across 116 files. Baseline 1319 → +24 new tests in `sessionClock.test.ts`. No existing tests modified, no skips introduced.
- ✅ `git diff package.json` is empty (DEPS-01 verified — zero new runtime or dev deps; the entire plan ships against the existing `react` + `react-dom` runtime).
- ✅ All source-assertion patterns from the plan's `<verify>` blocks confirmed via `grep`.
- ⚠️ `pnpm lint` exits non-zero — but ONLY due to **3 pre-existing errors and 4 pre-existing warnings on the unmodified baseline 9f784d7** (in `src/app/sessionPresentation.ts`, `src/storage/storage.ts`, `src/hooks/useAudioCues.ts`, `src/hooks/useWakeLock.ts`). My two new files (`sessionClock.ts`, `sessionClock.test.ts`) and the modified `audioEngine.ts` all lint cleanly. See `deferred-items.md` for the full pre-existing-error log. These are out of SCOPE BOUNDARY per the executor deviation rules (Phase 50 changes don't touch those files).

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 1 — Bug] TypeScript narrowing tripped `@typescript-eslint/no-unnecessary-condition`**
- **Found during:** Task 1 (`pnpm lint`)
- **Issue:** The original `if (s === 'suspended' || s === 'interrupted') ... else if (s === 'running') ... else if (s === 'closed')` chain ended with `s` narrowed to `'closed'`, making the final comparison unconditional and tripping the lint rule.
- **Fix:** Replaced the `if/else` chain with a `switch (s)` statement. Each case fans to ONE Set; the closed catalog has no default case. Semantics identical, narrowing-induced lint error gone.
- **Files modified:** `src/audio/sessionClock.ts`
- **Commit:** Folded into `e8ed71e` (Task 1).

### Out of Scope (Deferred)

- **Pre-existing lint errors on baseline 9f784d7** — recorded in `deferred-items.md`. 3 errors (`src/app/sessionPresentation.ts:113`, `src/storage/storage.ts:256-257`) and 4 unused-disable warnings exist on the unmodified base commit. Out of scope for Plan 50-01 — files are unrelated to the SessionClock abstraction.
- **Untracked `pnpm-lock.yaml`** — was already untracked at session start (per the initial git status). Not in `.gitignore`. Not introduced by Plan 50-01. Project-wide policy decision (add to .gitignore or commit) is out of scope here.

## Discoveries for Wave 2 Plans

1. **FakeAudioContext drives statechange naturally.** The polyfill in `vitest.setup.ts` exposes a real `addEventListener` registry plus a `_fireStateChange()` helper. Tests in Plan 50-04 (engine-side `notifySuspended()` integration test) can use the same `state = 'X'; _fireStateChange()` pattern shown in `sessionClock.test.ts` rather than re-inventing a Fake.

2. **`notifySuspended()` and natural statechange share `fanSuspend()`.** Plan 50-04's L445 disposition can rely on the parity test in `sessionClock.test.ts` ("notifySuspended() parity with natural statechange") — both code paths produce identical observable behavior. The engine's call site in Plan 50-04 will be a single line: `clock.notifySuspended()` via its augmented internal reference.

3. **Augmented-type widening loses `notifySuspended` at the type level only.** As verified in test "augmented return type exposes notifySuspended but a SessionClock-widened reference does not", assigning a `createAudioSessionClock(...)` result to a `SessionClock`-typed variable strips `notifySuspended` from the type — but the property still exists on the runtime object. Plan 50-04 must keep the engine's internal reference typed as the augmented type (`const clock: SessionClock & { notifySuspended(): void } = createAudioSessionClock(audioCtx, engineSchedule)`) so the call site type-checks.

4. **Wall-clock has no notifySuspended at compile-time or runtime.** The `@ts-expect-error` assertion in the wall-clock test acts as a compile-time guard — any future attempt to expose `notifySuspended` on `createWallSessionClock` will fail at the type-checker. Plan 50-05's drift-guard (if any) does not need to re-prove this; the type system already enforces it.

5. **`pnpm install` ran during build/test invocations.** A 197 KB `pnpm-lock.yaml` was generated in the worktree and remains untracked (out of scope; pre-existing state).

## Self-Check: PASSED

- ✅ `src/audio/sessionClock.ts` exists (verified).
- ✅ `src/audio/sessionClock.test.ts` exists (verified).
- ✅ `src/audio/audioEngine.ts` contains `export type { SessionClock } from './sessionClock'` (verified by `grep -c`).
- ✅ Commit `e8ed71e` exists in `git log --all --oneline`.
- ✅ Commit `37e9aae` exists in `git log --all --oneline`.
- ✅ Commit `18c84b0` exists in `git log --all --oneline`.
- ✅ All 6 SessionClock members typed and documented (`now`, `schedule`, `setMasterGain`, `onSuspend`, `onResume`, `onClose`).
- ✅ `notifySuspended` present on factory return type, absent on public interface (per revision 2 Blocker #1).
- ✅ 24 it() blocks in test file (≥22 required).
- ✅ Strict single-read assertions pass for both `audioCtx.currentTime` and `performance.now`.
- ✅ 1343/1343 tests pass; baseline preserved.
- ✅ `pnpm build` exits 0.
