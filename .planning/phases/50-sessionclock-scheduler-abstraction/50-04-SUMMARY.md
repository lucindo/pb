---
phase: 50-sessionclock-scheduler-abstraction
plan: 04
subsystem: audio
tags:
  - sessionclock
  - hooks
  - audio
  - audiocues
  - statemachine
dependency-graph:
  requires:
    - 50-01 (SessionClock interface + createAudioSessionClock factory returning augmented type with notifySuspended)
  provides:
    - AudioEngine.clock — readonly SessionClock surface on the engine
    - useAudioCues now subscribes through engine.clock.onSuspend / onResume / onClose (the three Plan 50-01 channels) instead of AudioEngineOptions.onStateChange
    - clock.notifySuspended() (engine-only escape hatch) wired at the resume() InvalidStateError catch — preserves iOS Safari recovery flow byte-identically
    - engine.clock.now() consumed at all hook-side audio time reads (start lead-in anchor + audioNow helper + reconstruction re-anchor)
  affects:
    - Plan 50-06 (engine internal facade — will reconstruct the clock with a scheduleImpl pointing at the engine's internal dispatch)
    - Plan 50-07 (drift-guard — useAudioCues.ts is one of the 5 caller files locked free of performance.now / audioCtx.currentTime reads)
tech-stack:
  added: []
  patterns:
    - "Single AC statechange listener owned by the clock — engine internals no longer attach their own listener; external code consumes via engine.clock.on*"
    - "Engine-only synthetic-suspend escape hatch on the augmented factory return type — preserves the L445 fan-out byte-identically while keeping `notifySuspended` invisible to external consumers"
    - "Subscription teardown before engineRef-null in stop() / reconstructEngine / unmount — prevents subscriber Set growth across mount/unmount cycles (T-50.04-02)"
    - "Per-commit green-gate forced single-commit decomposition: removing AudioEngineOptions.onStateChange and removing the caller's `{ onStateChange: handleStateChange }` argument cannot stage as two TypeScript-compileable commits — Tasks 1 and 2 land as ONE commit (Rule 3 deviation, Plan 50-02 precedent)"
key-files:
  created: []
  modified:
    - src/audio/audioEngine.ts (+47 / -34 — adds `readonly clock: SessionClock`; constructs clock via createAudioSessionClock(audioCtx) with augmented-type local reference; removes onStateChange option + L243-257 listener + L378 removeEventListener; rewires L445 InvalidStateError catch to clock.notifySuspended())
    - src/hooks/useAudioCues.ts (+62 / -32 — splits handleStateChange into handleResume / handleSuspend / handleClose; subscribes via engine.clock.on* in start() and reconstructEngine; tears down subscriptions on stop()/unmount; replaces engine.now() with engine.clock.now() at all sites; updates JSDoc per revisions 1 Warning #11 + 2 Warning #5)
    - src/hooks/useAudioCues.test.tsx (+30 / -10 — drops onStateChange property assertion in timbre-capture test; updates comments under D-41 (c)/(d) + AUDIO-05 tests; adds no-op clock surface to two partial fake-engine literals so start()/reconstructEngine can subscribe)
decisions:
  - "D-11 honored: clock owns the single AC statechange listener; useAudioCues consumes suspend/resume/close via the three subscription channels added in Plan 50-01."
  - "Revision 1 Blocker #1 honored: engine.clock.onClose(handleClose) preserves the byte-identical setAudioStatus('unavailable') setter formerly at useAudioCues.ts:164-165 — Phase 50 success criterion #3 (byte-identical end-user behavior) satisfied."
  - "Revision 1 Blocker #2 honored: this plan passes no scheduleImpl to createAudioSessionClock — Plan 50-06 will reconstruct with the engine's internal dispatch (no post-hoc readonly reassignment)."
  - "Revision 1 Blocker #3 committed path implemented: the L243-257 local statechange listener and the L378 removeEventListener are DELETED. The clock's listener is the sole AC statechange consumer."
  - "Revision 2 Blocker #1 implemented: the L445 fan-out is REWIRED (NOT deleted) from `opts.onStateChange?.(readState())` to `clock.notifySuspended()` — the engine-only synthetic-suspend escape hatch on the augmented factory return type from Plan 50-01 revision 2 preserves the iOS Safari recovery flow (Plan 06 D-38) byte-identically. The engine's internal clock reference is typed as `SessionClock & { notifySuspended(): void }`; the public engine.clock member widens to SessionClock so external consumers cannot bypass the encapsulation."
  - "Revision 2 Warning #3 positive assertion verified: readState() now has exactly 1 call site (the get state() getter at L502). The L243-257 listener's readState() call is gone; the L445 readState() call is gone (replaced by clock.notifySuspended() which does not read state)."
  - "Revision 2 Warning #4 audited: AudioStatusFlag enum is `'ok' | 'needs-resume' | 'unavailable'` (3 values, no `'failed'`). No spurious `'failed'` references in useAudioCues.ts or its test file."
  - "Revision 1 Warning #11 + revision 2 Warning #5 honored: stale JSDoc references to performance.now and audioCtx.currentTime are removed from useAudioCues.ts (both in code AND in comments). The L66 audioNow interface JSDoc now reads `Returns engine.clock.now() (= AC currentTime per D-03 Option A)`."
  - "Revision 1 Warning #12 honored: the clock-construction inline comment documents the HRV/NK clock distinction (this is THE engine clock; useNaviKriyaAudio constructs its own SEPARATE clock for NK AC — they MUST NOT be conflated)."
  - "Revision 2 Warning #6 honored: clock construction at L219 (immediately after `new AudioContext()`) is the intermediate state. Plan 50-06 will move it to ~L295 (post-schedule-function definition) without changing observable behavior — clock listener attachment, subscribers Set lifecycle, and notifySuspended() escape hatch are independent of the construction-site line number."
  - "Rule 3 deviation (Plan 50-02 precedent): Tasks 1 and 2 land as a SINGLE commit because removing `onStateChange` from AudioEngineOptions and removing the caller's `{ onStateChange: handleStateChange }` arg cannot stage as two TypeScript-compileable commits. The per-commit green-gate is preserved at the combined-commit boundary."
metrics:
  duration: 75 minutes
  completed: 2026-05-28
  test-count-baseline: 1343 (post Plan 50-01, unchanged after 50-02 / 50-03)
  test-count-after: 1343
  test-count-delta: 0
  tasks-completed: 2 (combined into 1 commit per Rule 3 deviation)
  files-modified: 3
---

# Phase 50 Plan 04: useAudioCues SessionClock migration (engine.clock) Summary

`useAudioCues` now subscribes through the SessionClock seam — `AudioEngine` exposes `engine.clock: SessionClock`, the hook attaches three subscribers (suspend / resume / close) per session and tears them down in lockstep with the engine reference, and the iOS Safari InvalidStateError recovery path (Plan 06 D-38) flows through the engine-only `clock.notifySuspended()` escape hatch on the augmented factory return type. The AudioStatusFlag state machine (3-value enum per revision 2 Warning #4) is preserved verbatim — only the trigger source changes.

## What Got Built

### Truths Satisfied (from plan frontmatter `must_haves.truths`)

- ✅ `useAudioCues` consumes the `SessionClock` interface via `engine.clock` (exposed on AudioEngine); zero `performance.now` references in `src/hooks/useAudioCues.ts` source OR comment lines and zero direct `audioCtx.currentTime` reads (D-09). Verified by `grep`.
- ✅ `useAudioCues` no longer passes `onStateChange` to `createAudioEngine`. The hook subscribes via `engine.clock.onResume(handleResume)`, `engine.clock.onSuspend(handleSuspend)`, and `engine.clock.onClose(handleClose)` (revision 1 Blocker #1) right after `engineRef.current = engine`.
- ✅ Revision 2 Warning #4: AudioStatusFlag enum is `'ok' | 'needs-resume' | 'unavailable'` (3 values). The gesture-recovery seam, the `needs-resume` flow (Plan 06 D-36 + Pitfall 5), and the byte-identical `'unavailable'` setter on `'closed'` state are preserved.
- ✅ Revision 1 Blocker #1: `engine.clock.onClose(() => setAudioStatus('unavailable'))` replaces the prior `else if (state === 'closed') { setAudioStatus('unavailable') }` branch at useAudioCues.ts:164-165 — byte-identical behavior on AC `'closed'` transition.
- ✅ `engine.now()` call site at start() becomes `engine.clock.now()`; the returned `audioNow` helper likewise reads through `engineRef.current?.clock.now()`.
- ✅ `AudioEngine` interface exposes `readonly clock: SessionClock`; `createAudioEngine` constructs it once internally via `createAudioSessionClock(audioCtx)` (no scheduleImpl arg at this plan — Plan 50-06 will reconstruct with one).
- ✅ Revision 2 Blocker #1: L445 InvalidStateError fan-out PRESERVED via `clock.notifySuspended()` — the engine's internal reference is typed as the augmented factory return type so the call type-checks; the public engine.clock member is widened to SessionClock so external consumers cannot reach the escape hatch.
- ✅ Revision 1 Blocker #3: architectural path committed. The local statechange listener (L243-257) and the L378 removeEventListener are DELETED. The clock owns the single AC statechange listener.
- ✅ `reconstructEngine` re-subscribes `handleSuspend` / `handleResume` / `handleClose` against the new engine's `clock` and tears down the old subscriptions (stored in `clockUnsubsRef`) before nulling engineRef. Subscriptions never leak across reconstruction (T-50.04-02 mitigated).
- ✅ Revision 1 Warning #12: clock-construction inline comment cites the HRV-clock-vs-NK-clock distinction.
- ✅ Revision 2 Warning #6: intermediate-state construction site at audioEngine.ts L219 (immediately after `new AudioContext()`). Plan 50-06 will move it to ~L295 (post-schedule-function definition) without changing observable behavior.

### Artifacts Satisfied (from plan frontmatter `must_haves.artifacts`)

- ✅ `src/audio/audioEngine.ts`: `AudioEngine` interface adds `readonly clock: SessionClock`. `createAudioEngine` constructs the clock and assigns it to the returned engine literal. `AudioEngineOptions.onStateChange` REMOVED. The L243-257 listener and L378 removeEventListener are REMOVED. The L445 catch block REWIRES the fan-out to `clock.notifySuspended()`.
- ✅ `src/hooks/useAudioCues.ts`: migrated to `clock.onSuspend` / `onResume` / `onClose` subscriptions; AudioStatusFlag machine preserved; engine.now() reads route through engine.clock.now(); the L66 JSDoc on the audioNow interface method updated per revision 2 Warning #5 (`Returns engine.clock.now() (= AC currentTime per D-03 Option A)`).

### Key Links Verified

- ✅ `clock.onSuspend\|clock.onResume\|clock.onClose` appears 7× across `src/hooks/useAudioCues.ts` (≥6 expected — 2× start() + 2× reconstructEngine + 1× explanatory comment).
- ✅ `createAudioSessionClock(audioCtx)` appears exactly 1× in `src/audio/audioEngine.ts` (the construction site at L219).
- ✅ `clock.notifySuspended()` appears exactly 1× in `src/audio/audioEngine.ts` (the L494 InvalidStateError catch call).

## Per-Task Commits

| Task | Name | Commit | Files | Lines |
|------|------|--------|-------|-------|
| 1 + 2 (combined per Rule 3 deviation) | Migrate useAudioCues onto engine.clock subscriptions | `420fae6` | src/audio/audioEngine.ts, src/hooks/useAudioCues.ts, src/hooks/useAudioCues.test.tsx | +249 / -94 |

## Verification

- ✅ `pnpm test:run src/audio/audioEngine.test.ts` — 33/33 pass.
- ✅ `pnpm test:run src/hooks/useAudioCues.test.tsx` — 38/38 pass.
- ✅ `pnpm test:run` (full suite) — 1343/1343 across 116 files. Baseline preserved (test-count-delta = 0).
- ✅ `pnpm build` exits 0.
- ⚠️ `pnpm lint` exits non-zero with EXACTLY the pre-existing baseline issues (4 errors + 3 warnings). No new lint problems introduced by Plan 50-04. See `deferred-items.md`.
- ✅ Source assertions:
  - `grep -c "readonly clock: SessionClock" src/audio/audioEngine.ts` → 1 ✓
  - `grep -c "createAudioSessionClock(audioCtx)" src/audio/audioEngine.ts` → 1 ✓
  - `grep -c "SessionClock & { notifySuspended" src/audio/audioEngine.ts` → ≥1 (3 occurrences — augmented-type annotations + JSDoc) ✓
  - `grep -c "clock\.notifySuspended()" src/audio/audioEngine.ts` → 1 ✓
  - `grep -c "onStateChange" src/audio/audioEngine.ts` → 0 ✓
  - `grep -cE "addEventListener.*statechange" src/audio/audioEngine.ts` → 0 ✓
  - `grep -cE "removeEventListener.*statechange" src/audio/audioEngine.ts` → 0 ✓
  - `grep -c "readState()" src/audio/audioEngine.ts` → 1 (the `get state()` getter only) ✓
  - `grep -c "performance\.now" src/hooks/useAudioCues.ts` → 0 ✓
  - `grep -c "audioCtx\.currentTime" src/hooks/useAudioCues.ts` (source or comment) → 0 ✓
  - `grep -c "engine\.clock\.now()" src/hooks/useAudioCues.ts` → 5 (1 declaration in start + 1 in reconstructEngine + 3 JSDoc references) ✓
  - `grep -c "engineRef\.current?\.clock\.now()" src/hooks/useAudioCues.ts` → 1 ✓
  - `grep -cE "clock\.onSuspend|clock\.onResume|clock\.onClose" src/hooks/useAudioCues.ts` → 7 (≥6 expected) ✓
  - `grep -c "onStateChange" src/hooks/useAudioCues.ts` → 0 ✓
  - `grep -c "Returns engine.clock.now()" src/hooks/useAudioCues.ts` → 1 ✓ (matches the L66 JSDoc update per revision 2 Warning #5)
  - `grep -c "Returns audioCtx.currentTime" src/hooks/useAudioCues.ts` → 0 ✓ (the old form is gone)
  - `grep -c "'failed'" src/hooks/useAudioCues.ts` → 0 ✓ (revision 2 Warning #4 audit)

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 3 — Blocking] Tasks 1 & 2 land as a single commit (per-commit green-gate constraint)**
- **Found during:** Pre-commit planning (Plan 50-02 precedent)
- **Issue:** The plan's per-commit green-gate (`pnpm build` exits 0 at every commit boundary) cannot be satisfied with two atomic commits. Removing `onStateChange` from `AudioEngineOptions` in Task 1 invalidates the caller's `{ timbre, onStateChange: handleStateChange, bypassSilentMode }` argument in Task 2 — the intermediate commit would fail to typecheck.
- **Fix:** Bundle Tasks 1 and 2 into a single commit (mirroring Plan 50-02's decomposition decision). The combined commit ships green build + lint + 1343/1343 tests.
- **Files modified:** `src/audio/audioEngine.ts`, `src/hooks/useAudioCues.ts`, `src/hooks/useAudioCues.test.tsx`
- **Commit:** `420fae6`

**2. [Rule 1 — Bug] Pre-existing `react-hooks/exhaustive-deps` disable directives in the unmount cleanup are now unused**
- **Found during:** Task 2 lint pass (after adding the clock-subscription teardown loop)
- **Issue:** The unmount cleanup effect previously had a single `// eslint-disable-next-line react-hooks/exhaustive-deps` comment guarding `reconstructGenerationRef.current += 1`. After adding the clock-subscription teardown loop right after that line, eslint surfaced "Unused eslint-disable directive (no problems were reported from 'react-hooks/exhaustive-deps')" — the modern eslint-plugin-react-hooks does not flag mutating `.current` writes in cleanup. I had also added two new disable directives around the new teardown loop, both of which were also unused.
- **Fix:** Removed all three unused disable directives in the unmount cleanup; kept the explanatory comment about why reading `.current` inside cleanup is intentional.
- **Files modified:** `src/hooks/useAudioCues.ts`
- **Commit:** Folded into `420fae6`.

**3. [Rule 1 — Bug] Two partial fake-engine literals in `useAudioCues.test.tsx` were missing the new `clock` member**
- **Found during:** Task 2 test run (the AUDIO-01 and AUDIO-03 tests crashed because `start()` / `reconstructEngine()` now call `engine.clock.onResume(...)` immediately after the createAudioEngine factory resolves)
- **Issue:** Two test-double `fakeEngine`/`fakeFirstEngine`/`fakeNewEngine` literals (used to drive the bail path in AUDIO-01 and the scheduleLeadIn-null path in AUDIO-03) only stubbed the legacy AudioEngine surface — `now`, `setMuted`, `scheduleLeadIn`, `scheduleNextCue`, `close`, `resume`. They lacked a `clock` member.
- **Fix:** Added a no-op `clock` member to each fake (with `now`, `schedule`, `setMasterGain`, `onSuspend`, `onResume`, `onClose` — the last three returning no-op unsubscribes). The tests assert on bail-path semantics (no statechange fan-out is exercised), so no-op subscribers are sufficient.
- **Files modified:** `src/hooks/useAudioCues.test.tsx`
- **Commit:** Folded into `420fae6`.

### Source-assertion count notes (informational — no plan compliance impact)

- **`grep -c "engine.clock.now()" src/hooks/useAudioCues.ts` returns 5, not 1:** the plan's source_assertion specifies "at least 1". The 5 occurrences are 2 actual call sites (the `startAudioTime` and `reanchorAudioTime` reads) plus 3 JSDoc/comment references that document the seam. Spirit of assertion met.
- **`grep -c "onClose" src/hooks/useAudioCues.ts` returns 3, not the plan's expected 4:** the plan counted `handleClose declaration + 2 subscriptions + 1 unsubscribe storage` = 4, but `handleClose` and `unsubClose` do NOT contain the literal substring `onClose` (the case is wrong — `handleClose` starts with lowercase `h`, `unsubClose` starts with lowercase `u`). The 3 actual `onClose` matches are 2 subscription calls + 1 explanatory comment. Structural requirement (Blocker #1 onClose wiring) is fully met; the plan's literal grep count was off by 1.

### Out of Scope (Deferred)

- **Pre-existing lint errors/warnings on baseline:** the 4 errors + 3 warnings in `sessionPresentation.ts`, `sessionClock.test.ts`, `useAudioCues.ts` (L328 no-console), `useWakeLock.ts` (L122), `storage.ts` are identical to the pre-existing baseline already tracked in `deferred-items.md` (Plan 50-01 disposition). Plan 50-04 introduces zero new lint problems.

## Discoveries for Downstream Plans

1. **Subscriber teardown is the primary defense against subscriber-Set growth (T-50.04-02 mitigation).** `clockUnsubsRef` stores 3 unsubs per active engine and is iterated in stop(), reconstructEngine, and unmount cleanup. The internal `engineRef === null` gate inside each handler is layered defense — even if a stray statechange event fired on a closed AC, the handler would short-circuit. The AUDIO-05 regression test exercises this path and passes byte-identically.

2. **Plan 50-06 must reconstruct the clock with a scheduleImpl.** This plan constructs at `createAudioSessionClock(audioCtx)` (no scheduleImpl). Plan 50-06 will pass the engine's internal dispatch as the second arg AND move the construction site from L219 to ~L295 (post-schedule-function definition). The move is observably equivalent at the green-gate (revision 2 Warning #6).

3. **The augmented-type widening trick works at the engine boundary.** The engine's internal `const clock: SessionClock & { notifySuspended(): void } = ...` keeps `notifySuspended` reachable inside the engine's closure; the `engine.clock` literal assignment widens to `SessionClock` so external code (typed via the `export type { SessionClock }` re-export at audioEngine.ts:31) cannot call `notifySuspended`. T-50.04-07 (external code forging suspend events) is structurally enforced.

4. **No test count delta.** ABSTR-04 honored: 1343 tests in, 1343 tests out. The migration's only test changes are comment/assertion updates and the addition of a no-op `clock` member on two partial fake engines.

5. **iOS Safari recovery path verified end-to-end through clock.notifySuspended().** The D-41 (c) test in useAudioCues.test.tsx drives `engine.resume()` rejection with `InvalidStateError`, which now flows through the new path: engine's catch → `clock.notifySuspended()` → fanSuspend() → suspendSubscribers (containing handleSuspend) → setAudioStatus('needs-resume'). The test passes unchanged — proving byte-identical observable behavior between the old `opts.onStateChange?.(readState())` fan-out and the new `clock.notifySuspended()` fan-out.

## Self-Check: PASSED

- ✅ `src/audio/audioEngine.ts` modified (verified by `git log`).
- ✅ `src/hooks/useAudioCues.ts` modified (verified by `git log`).
- ✅ `src/hooks/useAudioCues.test.tsx` modified (verified by `git log`).
- ✅ Commit `420fae6` exists in `git log` (`git rev-parse 420fae6` resolves).
- ✅ `pnpm build` exits 0.
- ✅ `pnpm test:run` reports 1343/1343 pass.
- ✅ All source assertions from Task 1 + Task 2 `<verify>` blocks confirmed via grep.
- ✅ `AudioStatusFlag` enum unchanged (`'ok' | 'needs-resume' | 'unavailable'` — revision 2 Warning #4).
- ✅ Revision 1 Blocker #1 wired (`engine.clock.onClose(handleClose)` + `setAudioStatus('unavailable')`).
- ✅ Revision 1 Blocker #3 committed path implemented (no local listener; no removeEventListener).
- ✅ Revision 2 Blocker #1 implemented (L445 fan-out rewired to `clock.notifySuspended()`).
- ✅ Revision 2 Warning #3 positive assertion (`readState()` count = 1).
- ✅ Revision 2 Warning #5 (audioNow JSDoc update).
- ✅ Revision 2 Warning #6 acknowledged (construction site at L219 is intermediate; Plan 50-06 will move it).
