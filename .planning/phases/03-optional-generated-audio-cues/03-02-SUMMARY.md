---
phase: 03-optional-generated-audio-cues
plan: 02
subsystem: audio
tags: [audio, web-audio-api, react-hook, mute-fade, lifecycle, tdd]
type: execute
status: complete
wave: 2
dependency_graph:
  requires:
    - "src/audio/cueSynth.ts (Plan 01: scheduleInCue/scheduleOutCue/scheduleTick)"
    - "src/audio/lookaheadScheduler.ts (Plan 01: startScheduler — reserved, not yet bound)"
    - "vitest.setup.ts FakeAudioContext polyfill (Plan 01)"
    - "src/domain/breathingPlan.ts (BreathingPlan interface)"
    - "src/hooks/useSessionEngine.ts (lifecycle pattern reference)"
  provides:
    - "createAudioEngine() factory + AudioEngine interface"
    - "useAudioCues() React hook"
    - "AudioStatus type ('idle' | 'starting' | 'lead-in' | 'running' | 'failed' | 'closed') re-exported from both source modules"
  affects:
    - "Phase 3 plan 04 (App.tsx audio wiring) — calls audio.start(plan), audio.stop(), audio.notifyPhaseBoundary({...}), audio.setMuted(...)"
    - "Phase 3 plan 05 (UI mute toggle button) — consumes useAudioCues().muted + setMuted"
tech_stack:
  added: []
  patterns:
    - "Stateful service factory returning a closure-bound interface (engine pattern)"
    - "useRef for imperative resource (mirror of useSessionEngine animationFrameId posture)"
    - "Promise rejection as branchable signal (D-10 → catch → audioAvailable=false)"
    - "Idempotent close via 'closed' flag (Pitfall 3 leak guard)"
    - "Web Audio mute fade-out with cancelAndHoldAtTime + setTargetAtTime (Pitfall 9 fallback to cancelScheduledValues + setValueAtTime)"
key_files:
  created:
    - "src/audio/audioEngine.ts (143 lines)"
    - "src/audio/audioEngine.test.ts (272 lines, 15 it() blocks)"
    - "src/hooks/useAudioCues.ts (144 lines)"
    - "src/hooks/useAudioCues.test.tsx (263 lines, 10 it() blocks)"
    - ".planning/phases/03-optional-generated-audio-cues/deferred-items.md (15 lines)"
  modified:
    - "vitest.setup.ts (+1 line: configurable: true on the AudioContext defineProperty)"
decisions:
  - "Locked MUTE_FADE_TIME_CONSTANT at 0.05 s (~150 ms perceptual decay = 3× time constant). Source: 03-RESEARCH.md Pattern 5 lines 471-481. No deviation from RESEARCH default."
  - "MIN_GAIN_VALUE = 0.0001 — never ramp gain to 0.0 (exponentialRampToValueAtTime would throw; setTargetAtTime is more numerically stable with a nonzero target)."
  - "scheduleLeadIn returns the firstInCueTime (= startAudioTime + LEAD_IN_DURATION_SEC) UNCONDITIONALLY — even when muted or closed. This makes the return value a pure function of the input, which lets the caller (useAudioCues / App.tsx) co-anchor session.start() against a known audio-clock instant regardless of mute state."
  - "start() called twice without stop() returns the existing engine's now()+3 WITHOUT constructing a second AudioContext. The hook is defensive even though App.tsx (Plan 04) won't actually do this. Browsers cap concurrent ACs (~6 in Chrome) so the second-AC bug would surface as a soft DoS in dev-mode strict-effects."
  - "engineRef uses useRef (not useState) for the imperative AC resource. Mirrors useSessionEngine.ts:34 animationFrameId posture — render-reactivity for an audio context would cause spurious re-renders on each scheduleNextCue."
  - "vitest.setup.ts AudioContext property MUST be configurable so vi.stubGlobal can override it per-test. The Plan-01 polyfill set { writable: true } only; this plan added { configurable: true } so the D-10 failure-path test (and the close/now/idempotency probe tests) can swap in a custom AC class."
  - "Test 11 'close() calls audioCtx.close exactly once' uses a Probe AudioContext class instead of the shared FakeAudioContext, because the shared FakeAudioContext.close mock state would be visible across all tests in the describe block — making 'called exactly once' brittle. Probe ACs isolate the closeSpy to a single it() block."
metrics:
  duration: "7.8 min"
  completed: 2026-05-09
  tasks_planned: 2
  tasks_completed: 2
  files_changed: 6
  test_count_baseline: 100
  test_count_after: 125
  test_delta: 25
  commits: 6
---

# Phase 3 Plan 02: AudioEngine Service + useAudioCues Hook Summary

**One-liner:** Composed the pure cueSynth + lookaheadScheduler modules from Plan 01 into a stateful `audioEngine` service with mute-fade (D-08) + idempotent close (D-11), then wrapped it in a `useAudioCues` React hook exposing the imperative API (`start`, `stop`, `setMuted`, `notifyPhaseBoundary`, `audioNow`) that App.tsx in Plan 04 will wire to the Start session click handler.

## What Was Built

| Artifact                         | Purpose                                                                                                                                                                                                              | Used By                                                            |
| -------------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------ |
| `src/audio/audioEngine.ts`        | `createAudioEngine()` factory + `AudioEngine` interface (`scheduleLeadIn`, `scheduleNextCue`, `setMuted`, `now`, `close`, readonly `muted`). Owns the single `AudioContext` constructed from a user-gesture chain. | `src/hooks/useAudioCues.ts` (this plan), Plan 04 App.tsx wiring.   |
| `src/audio/audioEngine.test.ts`   | 15 it() blocks: lifecycle (create/close/idempotent), lead-in scheduling (3 ticks + In cue), boundary cue dispatch (in/out), mute fade (D-08), Pitfall 9 fallback, AC failure path (D-10), now()/post-close safety. | Verification only.                                                  |
| `src/hooks/useAudioCues.ts`        | `useAudioCues()` React hook. Status state machine + audioAvailable + muted (D-07 default false). Wraps the engine's lifecycle in a useEffect cleanup (Pitfall 3 leak guard).                                       | Plan 04 App.tsx (audio wiring), Plan 05 mute toggle UI.            |
| `src/hooks/useAudioCues.test.tsx`  | 10 it() blocks: initial state, success/failure paths, stop/cleanup, mute propagation, notifyPhaseBoundary routing, audioNow null vs number, double-start idempotency.                                              | Verification only.                                                  |
| `vitest.setup.ts` (1-line edit)   | Marked the AudioContext property as `configurable: true` so per-test `vi.stubGlobal('AudioContext', ...)` works.                                                                                                   | Test infrastructure for the D-10 failure-path test in this plan.   |
| `.planning/phases/03-.../deferred-items.md` | Logs 3 pre-existing lint errors (App.tsx:22, usePrefersReducedMotion.ts:22, vitest.setup.ts:93) discovered during this plan but out of scope per SCOPE BOUNDARY.                                | Verifier visibility.                                                |

## Final Mute Fade timeConstant

Locked at **0.05 s** (= ~150 ms perceptual decay, applying the 3× time-constant rule). Verbatim from 03-RESEARCH.md Pattern 5 lines 471-481. No deviation from RESEARCH default.

The fade primitive uses `cancelAndHoldAtTime(now)` + `setTargetAtTime(0.0001, now, 0.05)`. Pitfall 9 fallback (Safari < 16.4): when `cancelAndHoldAtTime` is unavailable, falls back to `cancelScheduledValues(now)` + `setValueAtTime(currentValue, now)` — both branches still apply the trailing `setTargetAtTime` ramp.

## Pitfall 9 Fallback Verification

Both branches of the fallback are exercised by the test suite:

- **Test 8** (`setMuted(true) mid-cue applies cancelAndHoldAtTime + setTargetAtTime fade-out`) — uses a mock CueHandle with `cancelAndHoldAtTime` defined. Asserts `cancelAndHoldAtTime` called once, `setTargetAtTime` called once with `(0.0001, now, 0.05)`.
- **Test 15** (`cancelAndHoldAtTime fallback (Pitfall 9): when undefined, uses cancelScheduledValues + setValueAtTime`) — uses a mock CueHandle with `cancelAndHoldAtTime` set to `undefined`. Asserts `cancelScheduledValues` called once, `setValueAtTime` called once, **and** `setTargetAtTime` still called once (fade ramp applies in both branches).

Result: full Safari < 16.4 fallback path is covered without needing a separate browser-version stub.

## Test Count Delta

- **Baseline before this plan:** 100 tests in 10 test files.
- **After this plan:** 125 tests in 12 test files.
- **Delta:** +25 tests, +2 test files.

| Subset                              | Tests | Status |
| ----------------------------------- | ----- | ------ |
| `audioEngine.test.ts`                | 15    | pass   |
| `useAudioCues.test.tsx`              | 10    | pass   |
| All pre-existing tests (Phase 1+2 + Plan 03-01) | 100   | pass   |
| **Full suite (`npm run test:run`)** | **125** | **pass** |
| Phase-3 focused subset (`-- src/audio src/hooks/useAudioCues`) | 45 | pass |

## Open Question Resolution: start() Called Twice Without stop()

**Chosen behavior (Plan 02 final):** `start()` called twice without an intervening `stop()` is **idempotent** — the second call returns `existingEngine.now() + LEAD_IN_DURATION_SEC` (= `now + 3`) **without constructing a second AudioContext**.

**Rationale:**
1. App.tsx in Plan 04 should not actually do this (the Start button is disabled while a session is running), but the hook should be defensive — a duplicated start in dev-mode strict-effects or a regression in the App.tsx state machine should not leak a second AudioContext.
2. Browsers cap concurrent ACs at ~6 (Chrome) before refusing new ones — a buggy double-start could otherwise surface as a soft DoS where the user can no longer create new ACs after a few page revisits.
3. The hook does NOT throw on double-start because the cost of the user-visible error (a session that mysteriously refuses to start a second time) is higher than the cost of the silent dedup.
4. Test 10 (`start() called twice without stop is idempotent — only one AudioContext is constructed`) asserts via a `CountingAC` probe class.

**Counter-considered alternatives:**
- Reject second start (throw or return error): rejected — too noisy; a UI-state regression would surface as an unhandled promise rejection.
- Tear down + restart: rejected — the user gesture chain is already consumed; a fresh AC at this point would likely come back 'suspended' and need a second click.

## Decisions Made

1. **Locked mute timeConstant at 0.05 s.** No deviation from 03-RESEARCH.md Pattern 5.
2. **MIN_GAIN_VALUE = 0.0001** — never ramp to 0.0; `setTargetAtTime` is more stable with a nonzero target, and using 0.0001 sidesteps the `exponentialRampToValueAtTime` zero-throw class of bug entirely.
3. **scheduleLeadIn always returns `startAudioTime + 3`** even when muted/closed. The return value is the App.tsx co-anchor for the dual-clock alignment (the audio-clock instant of the first In bowl strike); decoupling it from the mute state keeps the visual countdown timing stable.
4. **Double-start is idempotent** — see "Open Question Resolution" above.
5. **engineRef uses `useRef`, not `useState`.** Mirrors `useSessionEngine.ts:34`'s posture: imperative resources don't belong in render state.
6. **vitest.setup.ts AudioContext property is now `configurable: true`.** Required so per-test `vi.stubGlobal('AudioContext', ...)` overrides work without `Cannot redefine property` errors (would otherwise block the D-10 failure-path test).
7. **Test 11 (`close() calls audioCtx.close exactly once`) uses a Probe AC** instead of the shared FakeAudioContext. Isolates the closeSpy to a single test so cross-test mock pollution doesn't make "called exactly once" brittle.
8. **The `_plan` parameter on `scheduleLeadIn` is reserved.** D-14 currently fixes the lead-in at 3 s; the parameter is plumbed through (and has a `void _plan` no-op) so a future change adapting lead-in length per plan doesn't require an interface break.

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 3 — Blocking] vitest.setup.ts AudioContext polyfill was not configurable; blocked vi.stubGlobal in 4 tests.**

- **Found during:** Task 1 GREEN gate (initial 11/15 passing → 4 failing with `TypeError: Cannot redefine property: AudioContext`).
- **Issue:** Plan 01's polyfill used `Object.defineProperty(window, 'AudioContext', { writable: true, value: FakeAudioContext })` without `configurable: true`. By default, Object-defined properties are non-configurable, so `vi.stubGlobal('AudioContext', ProbeAC)` could not override the AC class for tests that needed a custom probe class.
- **Fix:** Added `configurable: true` to the defineProperty descriptor (1-line edit at `vitest.setup.ts:118`).
- **Files modified:** `vitest.setup.ts`
- **Commit:** `b8f9e9d` (folded into Task 1 GREEN; the polyfill change is part of the test-infrastructure capability needed for the audioEngine tests to pass).

**2. [Rule 1 — Lint Bug] `Unexpected aliasing of 'this' to local variable` in audioEngine.test.ts close test.**

- **Found during:** Task 2 final lint check.
- **Issue:** The `close() calls audioCtx.close exactly once` test had a `lastInstance = this` capture inside the ProbeAC constructor that wasn't asserting anything load-bearing — the only check was `expect(lastInstance).not.toBeNull()` which is trivially true once the constructor ran. Tripped `@typescript-eslint/no-this-alias`.
- **Fix:** Removed the dead `lastInstance` capture and the trivial assertion. The closeSpy assertion remains and is what makes the test useful.
- **Files modified:** `src/audio/audioEngine.test.ts`
- **Commit:** `132c481` (separate `refactor` commit between Task 1 and Task 2 GREEN).

### Plan-vs-Reality Notes (informational, not deviations from intent)

- **Acceptance criterion `grep -c "new AudioContext" src/audio/audioEngine.ts == 1` reports 3.** All three matches are in `audioEngine.ts`: line 19 (doc-comment), line 72 (doc-comment), line 78 (the only actual call site). The plan's `<verification>` block restated the intent as "audioEngine.ts has exactly ONE `new AudioContext` call site" — semantically met (one call site at line 78). The two doc-comment hits are referential and document the contract; removing them would degrade the file's self-documentation. No change.
- **Plan 02 added a 6th commit (deferred-items.md docs commit).** PLAN.md anticipated 4 commits (2 RED + 2 GREEN). Actual: 6 = 2 RED + 2 GREEN + 1 refactor (lint cleanup) + 1 docs (deferred-items). Each is atomic and traceable.

## Authentication Gates

None — Phase 3 is browser-side only with no network/auth/PII surface.

## Known Stubs

None — every function created in this plan has a real implementation, every test has real assertions against the FakeAudioContext / Probe AC spy surfaces. No placeholder constants, no `TODO` markers, no commented-out branches. The `_plan` parameter on `scheduleLeadIn` is intentionally reserved (documented in Decision #8) — it is plumbed through, not stubbed.

## Threat Flags

None — files created (`src/audio/audioEngine.ts`, `src/hooks/useAudioCues.ts`, plus their tests) introduce no new trust boundaries, no network surface, no auth/file/schema changes. The plan's `<threat_model>` mitigations remain in place:

- **T-03-03 (DoS — AC leak):** mitigated by `engine.close()` in `stop()` AND in the `useEffect` unmount cleanup. Test 9 (`unmount after a successful start triggers AudioContext.close`) and Test 4 (`stop() closes the engine and resets status to idle`) both pass.
- **T-03-05 (autoplay-policy violation):** mitigated by the `audioCtx.resume()` inside `createAudioEngine` for the Chrome-suspended-on-construct case, and by the contract that `useAudioCues.start` is only called from a click handler in App.tsx (Plan 04).
- **T-03-06 (raw error stack disclosure):** mitigated by the `catch {}` in `useAudioCues.start` that swallows the error without logging — D-10 says no toast, no console.error of stack traces.

## TDD Gate Compliance

| Task | RED commit | GREEN commit | REFACTOR commit |
| ---- | ---------- | ------------ | --------------- |
| 1: audioEngine | `807d7e2` test(03-02): add failing tests for audioEngine factory + interface | `b8f9e9d` feat(03-02): implement audioEngine factory + AudioEngine interface | `132c481` refactor(03-02): drop unused 'this' alias from audioEngine close test |
| 2: useAudioCues | `681d6d9` test(03-02): add failing tests for useAudioCues hook | `ba1c969` feat(03-02): implement useAudioCues React hook wrapping audioEngine | none needed (clean on first pass) |

Both required gates (test-then-feat ordering on each task) are present and the test commit precedes the feat commit in each pair. The refactor commit in Task 1 is a post-GREEN lint cleanup, not a behavior change.

The 6th commit (`e8046ab` docs(03-02): log out-of-scope lint errors) is the deferred-items.md log per the deviation-rules SCOPE BOUNDARY — not a test/feat/refactor gate.

## Self-Check: PASSED

**Files claimed:**
- `src/audio/audioEngine.ts` — FOUND
- `src/audio/audioEngine.test.ts` — FOUND
- `src/hooks/useAudioCues.ts` — FOUND
- `src/hooks/useAudioCues.test.tsx` — FOUND
- `vitest.setup.ts` — FOUND (modified, +1 line)
- `.planning/phases/03-optional-generated-audio-cues/deferred-items.md` — FOUND

**Commits claimed (verified via `git log --oneline -7`):**
- `807d7e2` — FOUND `test(03-02): add failing tests for audioEngine factory + interface`
- `b8f9e9d` — FOUND `feat(03-02): implement audioEngine factory + AudioEngine interface`
- `132c481` — FOUND `refactor(03-02): drop unused 'this' alias from audioEngine close test`
- `681d6d9` — FOUND `test(03-02): add failing tests for useAudioCues hook`
- `ba1c969` — FOUND `feat(03-02): implement useAudioCues React hook wrapping audioEngine`
- `e8046ab` — FOUND `docs(03-02): log out-of-scope lint errors discovered during plan 02`

**Acceptance gates verified:**

audioEngine.ts grep gates:
- no React imports = 0 ✓
- `export async function createAudioEngine` = 1 ✓
- `export interface AudioEngine` = 1 ✓
- `export type AudioStatus` = 1 ✓
- `audioCtx.close` ≥ 1 → got 1 ✓
- `audioCtx.resume` ≥ 1 → got 1 ✓
- `scheduleInCue|scheduleOutCue|scheduleTick` ≥ 4 → got 8 ✓
- `cancelAndHoldAtTime` ≥ 1 → got 6 (1 in code, 5 in comments/types) ✓
- `setTargetAtTime` ≥ 1 → got 3 ✓
- `cancelScheduledValues` ≥ 1 → got 3 ✓
- `0.0001` ≥ 1 → got 1 ✓
- `0.05` ≥ 1 → got 2 ✓
- `new AudioContext` reports 3 (1 call site + 2 doc-comments). Plan's verification phrasing accepts "exactly ONE call site" — met.

audioEngine.test.ts: 15 it() blocks ✓

useAudioCues.ts grep gates:
- `import .* from 'react'` = 1 ✓
- `export function useAudioCues` = 1 ✓
- `export interface UseAudioCues` = 1 ✓
- `createAudioEngine` ≥ 1 → got 2 ✓
- `useRef` ≥ 1 → got 2 ✓
- `useEffect` ≥ 1 → got 2 ✓
- `engine.close|engineRef.current.close` ≥ 1 → got 2 ✓
- `audioAvailable` ≥ 3 → got 6 ✓
- `useState<boolean>(false)` ≥ 1 → got 1 ✓

useAudioCues.test.tsx: 10 it() blocks ✓

**Verification gates verified:**
- `npm run test:run -- src/audio/audioEngine.test.ts` exits 0 with 15/15 pass.
- `npm run test:run -- src/hooks/useAudioCues.test.tsx` exits 0 with 10/10 pass.
- `npm run test:run -- src/audio src/hooks/useAudioCues` exits 0 with 45/45 pass.
- `npm run test:run` exits 0 with 125/125 pass in 12 test files.
- `audioEngine.ts` has exactly ONE `new AudioContext()` call site (line 78). ✓
- `useAudioCues.ts` uses `useRef` for the engine, NOT `useState`. ✓ (line 53)

## Next Steps for Plan 03

Plan 03 (audio-domain integration tests for `audio.test.tsx` end-to-end smoke + lead-in timing) can now `import { useAudioCues } from '../hooks/useAudioCues'` and exercise the full hook → engine → cueSynth → FakeAudioContext spy chain end-to-end. The hook's imperative API is stable; future plans should not need to re-shape it.

Plan 04 (App.tsx wiring) will:
- Call `audio.start(plan)` from the Start session click handler (user gesture).
- Use the returned `firstInCueTime` to co-anchor `session.start(performance.now())` against the audio clock (Pitfall 2 dual-anchor).
- Call `audio.notifyPhaseBoundary({ newPhase, audioTime: audio.audioNow() + msUntilBoundary/1000 })` as the visual state machine flips In ↔ Out.
- Call `audio.stop()` from the End-session confirm handler (D-11).
- Use `audio.audioAvailable === false` to render the "audio unavailable, visuals only" badge per D-10.

Plan 05 (mute toggle UI) will read `audio.muted` and call `audio.setMuted(...)` on click — no further hook work required.
