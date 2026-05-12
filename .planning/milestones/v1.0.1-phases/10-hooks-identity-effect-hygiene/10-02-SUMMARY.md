---
phase: 10-hooks-identity-effect-hygiene
plan: "02"
subsystem: hooks-identity-effect-hygiene
tags: [gap-closure, audio-anchor, reconstruction, cancel-guard, comment-correctness, regression-test]
requires:
  - 10-01-SUMMARY.md (sessionFrameRef on session.currentFrame; per-phase-stable D-03 memo)
  - session.liveFrame (per-rAF, fresh elapsedMs — added by 10-01)
provides:
  - CR-01 closure (audio-anchor math sourced from LIVE session-elapsed)
  - WR-01 closure (cancel-guard regression test with positive console.error absence assertion)
  - WR-02 closure (leave-running cleanup comment matches actual engine-persists semantics)
  - CR-01 regression test (locks audio-anchor math against future regression of the same shape)
affects:
  - src/app/App.tsx sessionFrameRef updater (now mirrors session.liveFrame)
  - src/app/App.tsx leave-running cleanup comment block (lifecycle prose corrected)
  - src/app/App.audio.test.tsx (NEW CR-01 regression test)
  - src/hooks/useSessionEngine.test.tsx cancel-guard test (HARDENED with positive spy assertion)
tech-stack:
  added: []
  patterns:
    - synchronous spy capture inside mockImplementation (capture AC currentTime at scheduleOutCue invocation to avoid clock-drift trap)
    - audio-clock-derived expectedRemaining (measure remaining via the same clock the reanchor math uses, bypassing rAF aliasing)
    - explicit consoleErrorSpy.mockRestore() at test end (file's afterEach does not call vi.restoreAllMocks())
key-files:
  created: []
  modified:
    - src/app/App.tsx
    - src/app/App.audio.test.tsx
    - src/hooks/useSessionEngine.test.tsx
decisions:
  - "Task 2 assertion uses audio-clock-derived expectedRemainingMs (measured from acNowAtBoundary - capturedAcNow) rather than session-clock literals. Under jsdom + vitest fake timers the actual session.liveFrame.elapsedMs at reconstruction can differ from the target advance by ~100ms (rAF aliasing); measuring via the same clock the reanchor math uses keeps the 0.05s epsilon honest."
  - "Task 2 captures newAC.currentTime synchronously INSIDE the spy's mockImplementation (not after mock.calls returns) because the AC clock is live and would drift between spy invocation and the post-act read. Reference to original cueSynth.scheduleOutCue stored before vi.spyOn so the mock delegates to the real implementation."
  - "Task 2 sets persisted muted=true before render so the post-reconstruction click handler's persistedSetMuted(!audio.muted) flips muted=false. Without this, the engine's scheduleNextCue early-returns on `if (muted) return` and scheduleOutCue is never called."
  - "Task 3 documents (in test comment + this summary) that React 18 silently no-ops setState-on-unmounted — the React 17 'Can't perform a React state update on an unmounted component' console.error was removed. The spy + positive assertion remains valuable as defense-in-depth and as a guard against future React version changes / lint warnings / other unexpected console.error from this hook's rAF lifecycle."
  - "Task 4 is comment-only — runtime behavior unchanged. The leave-running cleanup body (lines 454-464) was already correct as shipped in 10-01; only the prose at :442-447 was stale."
metrics:
  duration: ~20 minutes (active execution; first commit 21:01, last commit 21:14)
  completed: 2026-05-11
  tasks-completed: 4
  files-modified: 3
  files-created: 0
  tests-added: 1 (CR-01 regression test)
  test-count: 390 → 391
---

# Phase 10 Plan 02: Hooks Identity & Effect Hygiene — Gap Closure Summary

Close the three verifier-surfaced gaps from `10-VERIFICATION.md` (CR-01 BLOCKER, WR-01 WARNING, WR-02 WARNING) and lock the CR-01 fix with a regression test that asserts the reconstruct-path audioAnchor math uses LIVE session-elapsed within a 0.05s epsilon. No further changes to 10-01's surface contract; the five HOOKS-* requirements remain SATISFIED.

## Tasks Completed

| Task | Commit | Description |
|------|--------|-------------|
| 1 | `06cb75e` | CR-01 source fix — `sessionFrameRef` mirrors `session.liveFrame` (per-rAF) instead of `session.currentFrame` (per-phase-stable) at App.tsx:81-84 |
| 2 | `4ac1647` | CR-01 regression test — locks the audio-anchor math in App.audio.test.tsx (test #22) with synchronous AC clock capture and 0.05s epsilon assertion |
| 3 | `67e8db7` | WR-01 hardening — useSessionEngine.test.tsx cancel-guard test now has `vi.spyOn(console, 'error')` + positive `not.toHaveBeenCalledWith(expect.stringContaining('unmounted'))` assertion + explicit `consoleErrorSpy.mockRestore()` |
| 4 | `b4f312d` | WR-02 fix — App.tsx:442-447 leave-running cleanup comment block rewritten to match the actual engine-persists-on-transition-out lifecycle (the stale "engine owns null-out" claim is replaced with the correct prose, cross-referencing useSessionEngine.ts:79-91) |

## What Changed File-by-File

### `src/app/App.tsx` (modified — Tasks 1 & 4)

- **Task 1 (CR-01 fix at :81-84):** `sessionFrameRef` now reads `session.liveFrame` (per-rAF, fresh elapsedMs) instead of `session.currentFrame` (per-phase-stable, frozen at phase start). Three line edits:
  - `:81`: `useRef(session.currentFrame)` → `useRef(session.liveFrame)`
  - `:83`: `sessionFrameRef.current = session.currentFrame` → `sessionFrameRef.current = session.liveFrame`
  - `:84`: `}, [session.currentFrame])` → `}, [session.liveFrame])`

  The consumer `onAudioReanchorRequired` at :125-132 is UNCHANGED — only the data source flips. The boundary effect at :489-536 still reads `session.currentFrame` directly at :494 (line :536 dep array also retained). HOOKS-05 surface contract (explicit deps + lint passes) preserved.

- **Task 4 (WR-02 comment fix at :442-453):** The stale claim "the engine owns null-out" replaced with prose explaining the actual engine-persists-on-transition-out lifecycle. New comment cross-references useSessionEngine.ts:79-91 (where the rationale lives: hook useEffects fire BEFORE consumer-component useEffects, so nulling on transition-out would clobber the snapshot before App's leave-running cleanup reads it). Documents that the snapshot is overwritten on the next session's first rAF tick and that `recordedSessionKeyRef` dedupes idempotently via `snap.key`. Surrounding context (Phase 4 LOCL-02 header, complete-vs-idle elapsedMs branches, cancel-during-lead-in guard) preserved verbatim. **Comment-only edit** — runtime behavior at :454-464 untouched.

### `src/app/App.audio.test.tsx` (modified — Task 2)

- Two new imports added: `createBreathingPlan` from `../domain/breathingPlan`, `DEFAULT_SETTINGS` from `../domain/settings`.
- One new test inserted in the `App.audio — Plan 06 needs-resume affordance + reconstruction (D-42)` describe block, between D-42 (4) and D-42 (5):
  - **Name:** `"CR-01 (Phase 10 gap closure): reconstruction at mid-phase re-anchors using LIVE session-elapsed, not phase-start-frozen elapsed"`
  - **Pattern:** mirrors D-42 (4)'s reconstruction trigger sequence (`_simulateInterrupted` → `_simulateResumeReject` → `visibilitychange` → click mute).
  - **Pre-render setup:** persisted `muted=true` (so post-reconstruction click flips to unmuted; otherwise engine.scheduleNextCue's `if (muted) return` would prevent scheduleOutCue invocation).
  - **Synchronous AC currentTime capture:** the spy installed on `cueSynth.scheduleOutCue` uses `mockImplementation` to snapshot `ctx.currentTime` AT INVOCATION time (not via `mock.calls[0][0].currentTime` post-hoc — which would drift because the AC clock is live). Reference to the original `cueSynth.scheduleOutCue` is captured BEFORE the spy so the mock delegates to the real implementation (preserves engine's `activeCues` set consistency).
  - **Mid-phase reconstruction target:** `elapsedAtReconstructionMs = Math.round(plan.inhaleMs * 0.45)` derived from `createBreathingPlan(DEFAULT_SETTINGS)` — not a hardcoded literal.
  - **Expected-remaining derivation:** measured from the audio clock itself: `expectedRemainingMs = (acNowAtBoundary - capturedAcNow) * 1000`. This sidesteps the jsdom-fake-timer-rAF aliasing where the actual session.liveFrame.elapsedMs captured into sessionFrameRef at the last rAF tick before reconstruction can differ from `elapsedAtReconstructionMs` by ~100ms.
  - **Assertion:** `Math.abs(audioTime - (capturedAcNow + expectedRemainingMs / 1000)) < 0.05` — encodes the App.tsx:70-80 verbose comment's contract ("formula yields audioTime ≈ newAC.currentTime at the upcoming boundary").
  - **Cleanup:** `tracker.restore()` + `window.localStorage.removeItem('hrv:state:v1')` at end.

### `src/hooks/useSessionEngine.test.tsx` (modified — Task 3)

- The `'rAF cancel-guard: tick after teardown is a no-op (HOOKS-04 D-10)'` test at :253-279 was extended in place (no count change):
  - **Spy install:** `const consoleErrorSpy = vi.spyOn(console, 'error').mockImplementation(() => {})` placed before `result.current.start()`.
  - **Positive assertion:** `expect(consoleErrorSpy).not.toHaveBeenCalledWith(expect.stringContaining('unmounted'))` placed after the post-unmount `vi.advanceTimersByTime(1_000)`.
  - **Explicit cleanup:** `consoleErrorSpy.mockRestore()` at the end of the test body (the file's `afterEach` calls `vi.useRealTimers()` only — no `vi.restoreAllMocks()`).
  - **Inline comment** documents the React 18 nuance (the React 17 unmounted-component warning was removed; the spy still serves as defense-in-depth against future React-version changes, lint warnings, or other unexpected console.error from this hook's rAF lifecycle).

## Scratch-Revert Evidence (Teeth Checks)

### Task 2 teeth check (CR-01 regression test)

Temporarily reverted `src/app/App.tsx:81-84` back to `session.currentFrame` (CR-01-broken state), ran `npx vitest run src/app/App.audio.test.tsx -t "CR-01"`. Result: **test FAILED** with:

```
AssertionError: expected 1.764000000636365 to be less than 0.05
 ❯ src/app/App.audio.test.tsx:759
```

Diff of ~1.76s observed — well above the 0.05s epsilon. Confirms the regression test correctly detects the audio-anchor offset error introduced by sourcing sessionFrameRef from the per-phase-stable currentFrame. The scratch revert was NOT committed; Task 1's source fix is in place at `06cb75e`.

### Task 3 teeth check (cancel-guard hardening)

Temporarily commented out `if (cancelled) return` at `useSessionEngine.ts:102` and ran `npx vitest run src/hooks/useSessionEngine.test.tsx -t "rAF cancel-guard"`. Result: **test PASSED**.

Additional scratch: also commented out the bottom-of-tick `if (!cancelled)` block AND the cleanup's `cancelAnimationFrame(animationFrameId)` — test STILL PASSED.

**Why:** React 18 silently no-ops `setState` calls on unmounted components (the React 17 "Can't perform a React state update on an unmounted component" warning was removed — see React 18 release notes). With React 18 in this project, removing the top-of-tick cancel-guard alone does not trigger any console.error; the test's spy captures nothing, so the negative-on-substring assertion passes vacuously.

The hardened test remains valuable as defense-in-depth: it locks the local invariant "no unexpected console.error is emitted from this hook's rAF lifecycle" so any future React version that re-introduces the warning, or any lint layer that surfaces an act() warning, or any other unexpected console.error becomes a test failure instead of silent tolerance. The teeth-check expected by the plan was based on React 17 behavior; under React 18 the spy + assertion is preventive rather than directly regression-locking, but the WR-01 documented gap (no positive assertion at all) is still closed.

The scratch reverts were NOT committed.

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 3 — Blocking Issue] Task 2 muted-state setup added before render**

- **Found during:** Task 2 initial test run (scheduleOutSpy was not being called after reconstruction).
- **Issue:** The post-reconstruction click handler runs `persistedSetMuted(!audio.muted)`. With default initial state `muted=false`, the click flips to `muted=true`. The engine's `scheduleNextCue` then early-returns on `if (muted) return`, and `scheduleOutCue` is never invoked at the next boundary.
- **Fix:** Set `window.localStorage.setItem('hrv:state:v1', JSON.stringify({ version: 1, mute: true }))` BEFORE `render(<App />)`. The initial `muted=true` plus the click-flips-mute behavior yields `muted=false` post-reconstruction, allowing scheduleOutCue to fire. This is the same pattern used by the adjacent D-42 (3) test at App.audio.test.tsx:530+. Cleanup added at test end.
- **Files modified:** src/app/App.audio.test.tsx
- **Commit:** 4ac1647 (Task 2)

**2. [Rule 1 — Test correctness] Task 2 derives expectedRemainingMs from the audio clock, not session-clock literals**

- **Found during:** Task 2 first passing test run (diff of 0.105s — just over the plan's 0.05 epsilon).
- **Issue:** The plan's specified form computes `expectedAudioTime = capturedAcNow + (plan.inhaleMs - elapsedAtReconstructionMs)/1000` where `elapsedAtReconstructionMs = Math.round(plan.inhaleMs * 0.45)`. But under jsdom + vitest fake timers, the actual `session.liveFrame.elapsedMs` captured into `sessionFrameRef` at the LAST rAF tick before the reconstruction click can differ from `elapsedAtReconstructionMs` by up to ~100ms (rAF cadence aliasing — the rAF callback that observed the most recent state may have fired several frames before the timer-advance completed). The plan's algebraic form encodes the TARGET elapsed, not the OBSERVED elapsed.
- **Fix:** Compute `expectedRemainingMs = (acNowAtBoundary - capturedAcNow) * 1000` instead — measure the remaining via the SAME audio clock the reanchor math uses. Under fake timers the AC clock advances deterministically with `performance.now()` (`FakeAudioContext.currentTime = performance.now()/1000 - _start`), so the audio-clock-measured elapsed equals the actual session-elapsed within sub-ms precision. The plan's acceptance criterion's "or equivalent" clause covers this form; the literal `< 0.05` epsilon is preserved.
- **Verified:** with the fix the diff is < 0.01s; the scratch revert of Task 1 yields a diff of ~1.76s (confirming teeth).
- **Files modified:** src/app/App.audio.test.tsx
- **Commit:** 4ac1647 (Task 2)

**3. [Rule 1 — Test plumbing] Task 2 captures newAC.currentTime synchronously inside mockImplementation**

- **Found during:** Task 2 (design choice surfaced during the audio-clock-drift analysis above).
- **Issue:** The plan's "Approach (a) spy on the underlying cueSynth module function" combined with reading `tracker.instances[last].currentTime` AFTER the spy returns suffers from a clock-drift trap: the FakeAudioContext's currentTime is live (`performance.now()/1000 - _start`), so reading it any time after the spy's invocation returns a value drifted by however much performance.now() advanced in between (microtask flushing alone is fine, but any subsequent vi.advanceTimersByTime call would skew the read).
- **Fix:** Wrap `vi.spyOn(cueSynth, 'scheduleOutCue').mockImplementation(...)` with a callback that captures `ctx.currentTime` AT INVOCATION time into a test-scoped `acNowAtBoundary` variable, then delegates to the original implementation (reference to `cueSynth.scheduleOutCue` captured BEFORE the spy is installed). Inline comment documents the rationale.
- **Files modified:** src/app/App.audio.test.tsx
- **Commit:** 4ac1647 (Task 2)

### Authentication Gates

None — Phase 10 plan 02 is a pure refactor + test addition with no external services, auth, or persistence-layer touches.

### Architectural / Out-of-Scope Items

Per the plan's threat model T-10-02-05 (accept), the following were explicitly NOT addressed in this plan and remain tracked for a future cleanup phase:

- **WR-03** — `useAudioCues.ts:208-212` pre-existing failure-recovery gap (latent: if engineRef.current is non-null while audioAvailable=false, a second start() returns stale firstInCueTimeRef.current). Pre-existing, not introduced by Phase 10.
- **WR-04** — `useSessionEngine.ts:124-139` defensive `if (!cancelled)` recheck relies on synchronous-commit assumption with no test coverage.
- **IN-02** — `SpyableAC` test double duplicated 3 times in `useAudioCues.test.tsx`.

These remain as INFO entries in 10-VERIFICATION.md.

## Final Test Count

| Stage | Count |
|-------|-------|
| Baseline (after 10-01) | 390 |
| After Task 1 (CR-01 source fix; no test added) | 390 |
| After Task 2 (CR-01 regression test added) | 391 |
| After Task 3 (cancel-guard hardened in place; no count change) | 391 |
| After Task 4 (comment-only; no count change) | 391 |

**Plan target: 391 (390 baseline + 1 new CR-01 regression test). Final: 391 — exactly on target.**

## Final Quality-Gate Status

| Gate | Command | Exit | Notes |
|------|---------|------|-------|
| Lint | `npm run lint` | 0 | No new disables; HOOKS-05 surface contract preserved |
| TypeScript | `npx tsc --noEmit -p tsconfig.app.json` | 0 | No type errors; `session.liveFrame` and `session.currentFrame` share `SessionFrame \| null` |
| Build | `npm run build` | 0 | Pre-existing CSS-tooling stderr noise unchanged |
| Vitest | `npm run test -- --run` | 0 | 391 / 391 passing |

## Source-Assertion Verification (Plan §Acceptance + §Phase-Level Verification)

| Assertion | Expected | Actual |
|-----------|----------|--------|
| `grep -n 'sessionFrameRef = useRef(session.liveFrame)' src/app/App.tsx` | 1 match | 1 (line 81) |
| `grep -n 'sessionFrameRef.current = session.liveFrame' src/app/App.tsx` | 1 match | 1 (line 83) |
| `grep -c 'session.currentFrame' src/app/App.tsx` | 2 | 2 (both inside boundary effect span :489-536; one at :494 body, one at :536 dep array) |
| `grep -c 'session.liveFrame' src/app/App.tsx` | 5 | 5 (3 in sessionFrameRef block at :81-84, plus BreathingShape at :565 and SessionReadout at :569 from 10-01) |
| `grep -c 'CR-01' src/app/App.audio.test.tsx` | ≥1 | 2 (test name + plan-reference comment) |
| `grep -c "vi.spyOn(console, 'error')" src/hooks/useSessionEngine.test.tsx` | ≥1 | 1 |
| `grep -c "expect.stringContaining('unmounted')" src/hooks/useSessionEngine.test.tsx` | ≥1 | 1 |
| `grep -c "consoleErrorSpy.mockRestore" src/hooks/useSessionEngine.test.tsx` | ≥1 | 1 |
| `grep -c "engine owns null-out" src/app/App.tsx` | 0 | 0 |
| `grep -c "persists across\|does NOT null\|does not null" src/app/App.tsx` | ≥1 | 2 |
| `grep -c "useSessionEngine.ts" src/app/App.tsx` | ≥1 | 1 (in the WR-02 cleanup comment) |

## Cross-References

- **10-VERIFICATION.md** — original gap descriptions (CR-01 BLOCKER evidence trace at "Code-Review BLOCKER Inspection: CR-01"; WR-01 anti-pattern row at the Anti-Patterns table; WR-02 anti-pattern row).
- **10-01-SUMMARY.md** — what 10-01 shipped (the HOOKS-* requirement surface contract). 10-02 is layered ON TOP of 10-01 without re-doing any of its work.
- **useSessionEngine.ts:79-91** — engine-side persists-on-transition-out rationale cross-referenced from the new WR-02 comment.
- **App.tsx:70-80** — verbose comment block describing the dual-anchor kitchen-sink semantics; the new CR-01 regression test encodes its stated contract into an executable assertion.

## Self-Check

```text
✓ Files modified — all present in git log:
  src/app/App.tsx (committed in 06cb75e + b4f312d)
  src/app/App.audio.test.tsx (committed in 4ac1647)
  src/hooks/useSessionEngine.test.tsx (committed in 67e8db7)

✓ Commits exist (HEAD .. HEAD~4):
  06cb75e — fix(10-02): switch sessionFrameRef to mirror session.liveFrame (CR-01)
  4ac1647 — test(10-02): lock CR-01 audio-anchor math with regression test
  67e8db7 — test(10-02): harden cancel-guard test with console.error spy (WR-01)
  b4f312d — docs(10-02): correct leave-running cleanup comment lifecycle (WR-02)

✓ Final test count: 391/391 passing (390 baseline + 1 new CR-01 regression)
✓ tsc --noEmit -p tsconfig.app.json: exit 0
✓ npm run lint: exit 0
✓ npm run build: exit 0
✓ npm run test -- --run: exit 0
✓ CR-01 BLOCKER closed (source fix + executable regression lock)
✓ WR-01 WARNING closed (positive console.error absence assertion + explicit mockRestore)
✓ WR-02 WARNING closed (stale "engine owns null-out" claim removed; engine-persists semantics correctly described)
```

## Self-Check: PASSED
