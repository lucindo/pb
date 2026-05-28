---
phase: 52-visibility-resume-clamp-lookahead-scheduling
plan: "05"
subsystem: audio-scheduling
tags:
  - audio
  - scheduling
  - lookahead
  - cancellation
  - gap-closure
requirements_completed:
  - SCHED-02
  - SCHED-03
  - SCHED-04
  - SCHED-05
  - DEPS-01
  - QUAL-01
dependency_graph:
  requires:
    - 52-01 (engine cancelFutureCues + topUpLookahead surface)
    - 52-03 (top-up effect in controller + walkFutureCues)
    - 52-04 (cancelFutureCues D-09/D-10 facade + setMuted cancel-then-reschedule)
  provides:
    - cancelFutureCues facade on useAudioCues (CR-01-FIX)
    - cancel-then-reschedule wiring in controller top-up effect (CR-01 BLOCKER closed)
    - topUpLookahead cache-after-gate hardening (WR-02-FIX)
    - null-leadIn start() teardown mirrors stop() (CR-02-FIX)
    - setAudioStatus='unavailable' on both start() failure branches (WR-01-FIX)
  affects:
    - src/hooks/useAudioCues.ts
    - src/hooks/useBreathingSessionController.ts
    - src/audio/audioEngine.test.ts
    - src/hooks/useAudioCues.test.tsx
    - src/hooks/useBreathingSessionController.test.tsx
tech_stack:
  added: []
  patterns:
    - cancel-then-reschedule (SCHED-05 doctrine D-10) — mirrors setMuted(true) cancel-then-refill
    - cache-after-gate — write ref only after engine null-check
    - teardown mirror — null-leadIn branch mirrors stop() cleanup sequence
key_files:
  created: []
  modified:
    - src/hooks/useAudioCues.ts
    - src/hooks/useBreathingSessionController.ts
    - src/audio/audioEngine.test.ts
    - src/hooks/useAudioCues.test.tsx
    - src/hooks/useBreathingSessionController.test.tsx
decisions:
  - "Option A (cancel-then-reschedule) over Option B (engine-layer dedup) — per REVIEW.md + VERIFICATION.md; mirrors setMuted(true) D-10 doctrine; reuses existing engine.cancelFutureCues without engine-layer change"
  - "void engine.close() in null-leadIn branch (fire-and-forget) — mirrors iOS gesture preservation posture in reconstructEngine; avoids await on a known-bad engine"
metrics:
  duration: "~25 minutes"
  completed: "2026-05-28T23:28:13Z"
  tasks_completed: 5
  files_modified: 5
---

# Phase 52 Plan 05: Gap Closure (CR-01 + WR-02 + CR-02 + WR-01) Summary

**One-liner:** Cancel-then-reschedule facade wired in controller top-up effect with hardened cache-after-gate and null-leadIn teardown mirroring stop().

## What Was Built

### Task 1: CR-01 engine-level regression tests (RED)
Added `describe('Phase 52 CR-01 cancel-then-reschedule prevents overlap doubling')` to `src/audio/audioEngine.test.ts` with two `it` blocks:

1. **Positive test** (grep: "Phase 52 CR-01: cancelFutureCues() between two overlapping topUpLookahead calls..."): spies on `scheduleInCueForTimbre` + `scheduleOutCueForTimbre`, calls `cancelFutureCues()` between two overlapping topUpLookahead walks, asserts combined call count equals `secondWalk.length` (not the sum of both walks). Assertions use symbolic length, not hard-coded literals (no design-locking).

2. **Negative-control test** (grep: "Phase 52 CR-01: without cancelFutureCues..."): verifies that without `cancelFutureCues()`, the second walk dispatches its full cue count — proving the engine does not self-deduplicate and Option A (cancel-then-reschedule) is required at the caller layer.

Commit: `cf67550` — 77 tests pass (75 baseline + 2 new).

### Task 2: cancelFutureCues facade + topUpLookahead cache-after-gate + stop() cache clear (RED → GREEN)
**RED (`14ada58`):** 5 failing tests added to `src/hooks/useAudioCues.test.tsx`:
- `describe('Phase 52 CR-01-FIX: cancelFutureCues facade')`: 3 tests (exposed on return, null-gate no-op, delegates to engine after start)
- `describe('Phase 52 WR-02-FIX: topUpLookahead cache-after-gate')`: 2 tests (pre-start call does not poison cache; stop() clears cache for cross-session safety)

**GREEN (`d95f647`):** Implementation in `src/hooks/useAudioCues.ts`:
1. Added `cancelFutureCues(this: void): void` to `UseAudioCues` interface with JSDoc citing CR-01-FIX.
2. Added `cancelFutureCues` useCallback (stable identity, empty deps): reads `engineRef.current`; returns if null; calls `engine.cancelFutureCues()`.
3. Moved `lastTopUpCuesRef.current = cues` AFTER `if (engine === null) return` in `topUpLookahead` (WR-02 cache-after-gate).
4. Added `lastTopUpCuesRef.current = []` in `stop()` after clockUnsubsRef teardown.
5. Returned `cancelFutureCues` from hook return object.

58 tests pass (52 baseline + 5 new WR-02 + 1 (previously existing AUDIO-03 was modified in Task 3 = 5 net new from this task) = actually 5 new tests from this task).

### Task 3: Tighten AUDIO-03 + fix null-leadIn teardown + WR-01 (RED → GREEN)
**RED (`f6e9f3f`):** Extended AUDIO-03 test in `src/hooks/useAudioCues.test.tsx`:
- Refactored fake clock mocks to return tracked unsub `vi.fn()`s (4 total: unsubResume1, unsubResume2, unsubSuspend, unsubClose).
- Extended AUDIO-03 assertions: `fakeEngine.close` called once; all 4 unsubs called once each; `audioStatus === 'unavailable'`.
- Added new sibling test: construction-catch branch also sets `audioStatus='unavailable'` (WR-01-FIX).

**GREEN (`34cfffd`):** Implementation in `src/hooks/useAudioCues.ts` — null-leadIn branch (`if (firstInCueTime === null)`) now executes a full teardown sequence mirroring `stop()`:
1. `clockUnsubsRef` loop + clear (CR-02-FIX)
2. `engineRef.current = null` (CR-02-FIX)
3. `proxyMemoRef.current.setSource(createWallSessionClock())` (CR-02-FIX)
4. `firstInCueTimeRef.current = null` + `lastTopUpCuesRef.current = []` (CR-02-FIX + WR-02-FIX)
5. `setAudioAvailable(false)` (preserved)
6. `setAudioStatus('unavailable')` (WR-01-FIX)
7. `setStatus('failed')` (preserved)
8. `void engine.close()` (CR-02-FIX, fire-and-forget)

Construction-catch branch additionally calls `setAudioStatus('unavailable')` (WR-01-FIX).

58 tests pass (1 net new from the construction-catch sibling test; AUDIO-03 is extended not replaced).

### Task 4: Wire audioCancelFutureCues into controller top-up effect (RED → GREEN)
**RED (`df862c5`):** 3 failing tests added to `src/hooks/useBreathingSessionController.test.tsx` in `describe('Phase 52 CR-01-FIX: controller top-up effect calls cancelFutureCues before topUpLookahead')`:
- Test 1: cancel called immediately before topUpLookahead (verified via `mock.invocationCallOrder`).
- Test 2: two consecutive frame changes — cancel fires twice, dispatch fires twice; pairwise ordering asserted.
- Test 3: does NOT call cancelFutureCues when audioAnchor is null (idle guard).

Uses `vi.spyOn(useAudioCuesModule, 'useAudioCues').mockReturnValue(fakeAudio)` with typed return.

**GREEN (`f2e31cf`):** Implementation in `src/hooks/useBreathingSessionController.ts`:
1. Destructured `cancelFutureCues: audioCancelFutureCues` from `audio.cancelFutureCues` (line 126).
2. Added `audioCancelFutureCues()` immediately before `audioTopUpLookahead(cues)` in the top-up effect (line 379).
3. Added `audioCancelFutureCues` to the effect dep array.
4. Inline comment cites CR-01-FIX + SCHED-05 + 52-VERIFICATION.md.

12 tests pass (9 baseline + 3 new).

### Task 5: Full-suite green-gate + VERIFICATION audit
- `pnpm tsc --noEmit`: exits 0
- `pnpm vitest run src/audio/audioEngine.test.ts`: 77 passed (75 baseline + 2 new)
- `pnpm vitest run src/hooks/useAudioCues.test.tsx`: 58 passed (52 baseline + 6 new)
- `pnpm vitest run src/hooks/useBreathingSessionController.test.tsx`: 12 passed (9 baseline + 3 new)
- `pnpm test:run`: 1466 passed (1455 baseline + 11 new)
- `pnpm build`: exits 0
- Lint: 4 pre-existing errors (all in `storage.ts` + `sessionPresentation.ts`), no new errors from Plan 05

## Verification Results

| Check | Result |
|-------|--------|
| `pnpm tsc --noEmit` | 0 (passes) |
| `pnpm vitest run src/audio/audioEngine.test.ts` | 77 tests (baseline 75 + 2 new) |
| `pnpm vitest run src/hooks/useAudioCues.test.tsx` | 58 tests (baseline 52 + 6 new) |
| `pnpm vitest run src/hooks/useBreathingSessionController.test.tsx` | 12 tests (baseline 9 + 3 new) |
| `pnpm test:run` | 1466 tests (baseline 1455 + 11 new) |
| `pnpm build` | 0 (passes) |
| `grep -n "audioCancelFutureCues" useBreathingSessionController.ts` | 3 hits (destructure + effect call + dep array) |
| `grep -n "engine.cancelFutureCues" useAudioCues.ts` | 1 hit (inside cancelFutureCues useCallback) |
| `grep -c "setAudioStatus('unavailable')" useAudioCues.ts` | 7 hits (>= 3 required) |
| `grep -n "lastTopUpCuesRef.current = []" useAudioCues.ts` | 2 hits (null-leadIn branch + stop()) |
| `pnpm lint` errors | 4 (pre-existing, unchanged from baseline) |

## Gap Closure Traceability

| Gap | Severity | Files That Close It | Test Lock |
|-----|----------|---------------------|-----------|
| **CR-01 (BLOCKER)** — duplicate OscillatorNode chains from consecutive overlapping topUpLookahead | BLOCKER | `useBreathingSessionController.ts` (cancel-then-reschedule wiring, line 379) + `useAudioCues.ts` (cancelFutureCues facade, line 673-678) | `audioEngine.test.ts` describe('Phase 52 CR-01 cancel-then-reschedule prevents overlap doubling') + `useBreathingSessionController.test.tsx` describe('Phase 52 CR-01-FIX') |
| **WR-02** — `lastTopUpCuesRef` written before engine null-gate (cache poisoning) | WARNING | `useAudioCues.ts` (topUpLookahead body: cache write moved after null-gate, line ~660; stop() clears cache, line 469) | `useAudioCues.test.tsx` describe('Phase 52 WR-02-FIX: topUpLookahead cache-after-gate') |
| **CR-02** — start() null-leadIn branch leaks engine + AC + clock subscriptions | WARNING (high impact) | `useAudioCues.ts` (null-leadIn branch, lines ~391-412: clockUnsubsRef loop + engineRef null + proxy revert + engine.close) | `useAudioCues.test.tsx` AUDIO-03 test (extended assertions: fakeEngine.close called once; all 4 unsubs fired once each) |
| **WR-01** — `audioStatus` not 'unavailable' on start() failure branches | WARNING | `useAudioCues.ts` (null-leadIn branch line ~409: `setAudioStatus('unavailable')` + catch branch line ~432) | `useAudioCues.test.tsx` AUDIO-03 test (extended: `audioStatus === 'unavailable'`) + new construction-catch test |

## Threat Model Updates

| Threat ID | Status | Notes |
|-----------|--------|-------|
| T-52-NEW-A (timing window, cancel-reschedule) | accepted (bounded) | The cancel+reschedule runs within a single effect execution; bounded by one rAF tick (~16ms) |
| T-52-NEW-B (setMuted race vs. top-up effect) | accepted (serialised) | React serialises DOM event handlers and useEffect flush; `activeCues` snapshot iteration (AH-WR-07) provides re-entrancy safety |
| T-52-NEW-C (Option B engine-layer dedup rejected) | rejected | Option A chosen; T-52-NEW-C records the decision for future plan-checkers |
| T-52-NEW-D (start() null-leadIn resource leak) | mitigated | Task 3 mirrors stop() teardown: clockUnsubsRef loop, engineRef null, proxy revert, engine.close, cache clear. AUDIO-03 test asserts all 4 unsubs fired + close called |
| T-52-NEW-E (lastTopUpCuesRef cache poisoning) | mitigated | Task 2 moves cache write after null-gate; stop() clears cache. WR-02-FIX tests cover both |
| T-52-08 reversal | re-confirmed FALSE under Plan 05 | The Set-keyed-by-handle-identity pattern is acceptable ONLY BECAUSE the controller cancel-then-reschedules on every top-up. The dependency between controller wiring and engine bookkeeping is explicit. |
| T-52-NEW-SC (no new packages) | accepted (no-op) | Plan 05 adds zero runtime or dev dependencies. DEPS-01 satisfied trivially. |

## Deviations from Plan

None — plan executed exactly as written.

The two test timing adjustments in Task 4 (advancing timers by 5100ms to cross phase boundaries instead of 200ms) are implementation details within the plan's scope — the plan specified "trigger a session.currentFrame advance" without prescribing the exact millisecond amount.

## Known Stubs

None — no placeholder values, hardcoded empty arrays (beyond initialized refs), or disconnected data flows introduced.

## Threat Flags

No new trust-boundary-crossing surfaces introduced. All changes are within the existing hook + controller layer, using the existing engine API surface (Plan 01) without modification.

## Self-Check: PASSED

Files created/modified — verified to exist:

- `src/hooks/useAudioCues.ts` — FOUND (modified)
- `src/hooks/useBreathingSessionController.ts` — FOUND (modified)
- `src/audio/audioEngine.test.ts` — FOUND (modified)
- `src/hooks/useAudioCues.test.tsx` — FOUND (modified)
- `src/hooks/useBreathingSessionController.test.tsx` — FOUND (modified)
- `.planning/phases/52-visibility-resume-clamp-lookahead-scheduling/52-05-SUMMARY.md` — FOUND (this file)

Commits verified in git log:

- `cf67550` test(52-05): CR-01 engine-level regression tests — FOUND
- `14ada58` test(52-05): cancelFutureCues facade + WR-02 RED tests — FOUND
- `d95f647` feat(52-05): cancelFutureCues facade + cache-after-gate + stop() clear — FOUND
- `f6e9f3f` test(52-05): AUDIO-03 tighten + CR-02 + WR-01 RED tests — FOUND
- `34cfffd` fix(52-05): null-leadIn teardown + audioStatus='unavailable' — FOUND
- `df862c5` test(52-05): controller CR-01-FIX RED tests — FOUND
- `f2e31cf` fix(52-05): controller cancel-then-reschedule wiring (closes CR-01) — FOUND
- `27e881f` style(52-05): lint cleanup — FOUND
