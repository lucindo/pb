---
phase: 10-hooks-identity-effect-hygiene
reviewed: 2026-05-11T21:20:00Z
depth: standard
files_reviewed: 6
files_reviewed_list:
  - src/app/App.audio.test.tsx
  - src/app/App.tsx
  - src/hooks/useAudioCues.test.tsx
  - src/hooks/useAudioCues.ts
  - src/hooks/useSessionEngine.test.tsx
  - src/hooks/useSessionEngine.ts
findings:
  critical: 0
  warning: 0
  info: 1
  total: 1
status: clean
---

# Phase 10: Code Review Report (Post Gap-Closure)

**Reviewed:** 2026-05-11T21:20:00Z
**Depth:** standard
**Files Reviewed:** 6
**Status:** clean

## Summary

Re-review of Phase 10 (Hooks Identity & Effect Hygiene) after Plan 10-02 gap-closure commits (06cb75e, 4ac1647, 67e8db7, b4f312d). All three previously-blocking findings from the prior review have been resolved and verified against the source. The full Vitest suite passes (391/391, up from 390 — the new CR-01 regression test adds one), `npm run lint` exits 0, and `tsc --noEmit` exits 0.

**Prior-finding disposition:**

- **CR-01 (BLOCKER) — RESOLVED.** `src/app/App.tsx:81-84` now mirrors `session.liveFrame` (per-rAF, fresh `elapsedMs`) instead of `session.currentFrame` (per-phase-stable, frozen `elapsedMs`). `onAudioReanchorRequired` at lines 125-132 reads the live elapsed value, restoring the mid-session re-anchor math. The verbose Plan 06 Task 8 comment at lines 71-80 (which describes "subtract the session-elapsed visual offset") is now factually accurate against the implementation. The new regression test at `src/app/App.audio.test.tsx:616-763` ("CR-01 (Phase 10 gap closure): reconstruction at mid-phase re-anchors using LIVE session-elapsed") is well-shaped: it drives ~45% into the inhale phase, triggers reconstruction via the D-42 (4) interrupt/reject pattern, and asserts `Math.abs(audioTime - expectedAudioTime) < 0.05` where `expectedRemainingMs` is measured from the **same** audio clock that sources `newAC.currentTime` — sidestepping rAF/timer aliasing under fake timers. A regression that flipped the ref back to `currentFrame` would push the assertion off by ~1.96s (45% of `inhaleMs ≈ 4363ms`), comfortably outside the 0.05s epsilon. The synchronous capture of `acNowAtBoundary` inside `scheduleOutCue.mockImplementation` is correct — `vi.spyOn` is installed AFTER `const originalScheduleOutCue = cueSynth.scheduleOutCue` so the wrapper preserves the original behavior.
- **WR-01 (cancel-guard test silent on regression) — RESOLVED.** `src/hooks/useSessionEngine.test.tsx:253-306` now installs `vi.spyOn(console, 'error').mockImplementation(() => {})` and asserts `expect(consoleErrorSpy).not.toHaveBeenCalledWith(expect.stringContaining('unmounted'))`. The added comment acknowledges the React 18 nuance (the React-17 setState-on-unmounted warning was removed) and frames the spy as defense-in-depth for any console.error surfaced from the rAF lifecycle. Explicit `consoleErrorSpy.mockRestore()` at test end is correct — the file's `afterEach` does not call `vi.restoreAllMocks()`, so otherwise the spy would persist into the adjacent `runningSnapshotRef` test in the same describe block.
- **WR-02 (App.tsx comment claimed "engine owns null-out") — RESOLVED.** `src/app/App.tsx:442-455` comment block rewritten to match the engine's actual persist-on-transition behavior. The new comment cross-references `useSessionEngine.ts:79-91` so a future maintainer bisecting effect-ordering bugs can find the rationale in one hop. The engine-side comment at lines 81-91 ("DO NOT null the snapshot here. Hook effects ... run BEFORE consumer-component useEffects") is consistent with the App-side rewrite.
- **WR-03 / WR-04 — Deferred (per workflow instruction).** Both items remain present in the source at the same locations (useAudioCues.ts:208-212 idempotent-start state-sync gap; useSessionEngine.ts:124-139 defensive `if (!cancelled)` recheck after setState). Per the gap-closure scoping note, these were explicitly out of 10-02 scope and are not re-surfaced here.
- **IN-01 (RefObject import style) — Self-resolving.** Acceptable as-is, no change required, dropped from this re-review.
- **IN-02 (Duplicated `SpyableAC`) — Carried forward unchanged below.** Test-cleanup follow-up; still informational.

**No new defects** were introduced by the 10-02 gap-closure work. The CR-01 fix is a one-line surface swap (ref source) with a documented, robust regression test. The WR-01 fix is purely additive (spy install + positive assertion). The WR-02 fix is comment-only. The diff is minimal and well-scoped.

## Critical Issues

None.

## Warnings

None.

## Info

### IN-01: `SpyableAC` test double remains duplicated three times in `useAudioCues.test.tsx`

**File:** `src/hooks/useAudioCues.test.tsx:337-360, 451-507, 1033-1054`
**Issue:**
Unchanged from the prior review (was IN-02). The `SpyableAC` test double is duplicated three times in the same file: Phase 5.1 describe (line 337), Plan 06 describe (line 451), and Phase 10 HOOKS-01 describe (line 1033). The Phase 10 block's comment acknowledges the choice: "The class is duplicated here rather than hoisted to module scope to avoid touching the existing test geography; this block is strictly additive." That tradeoff was reasonable for a hygiene phase, and the new Plan 10-02 work did not touch this file at all, so the duplication is unchanged. Two of the three copies differ slightly (the Plan 06 variant adds `_simulateInterrupted` / `_listeners` registry / construction tracking).

**Fix:** None required for Phase 10. Track as a test-cleanup follow-up (v1.x): hoist `SpyableAC` to a `__fixtures__/SpyableAudioContext.ts` and import in all three describe blocks, parameterizing the resume-rejection behavior and the `interrupted` / construction-tracking surface. Worth doing before any future test that needs a fourth variant.

---

_Reviewed: 2026-05-11T21:20:00Z_
_Reviewer: Claude (gsd-code-reviewer)_
_Depth: standard_
