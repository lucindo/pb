---
phase: 52-visibility-resume-clamp-lookahead-scheduling
reviewed: 2026-05-28T00:00:00Z
depth: standard
files_reviewed: 12
files_reviewed_list:
  - src/audio/audioEngine.ts
  - src/audio/audioEngine.test.ts
  - src/audio/cueSynth.ts
  - src/audio/nkCueSynth.ts
  - src/domain/sessionAudio.ts
  - src/domain/sessionAudio.test.ts
  - src/hooks/useAudioCues.ts
  - src/hooks/useAudioCues.test.tsx
  - src/hooks/useBreathingSessionController.ts
  - src/hooks/useBreathingSessionController.test.tsx
  - src/hooks/useSessionEngine.ts
  - src/hooks/useSessionEngine.test.tsx
findings:
  critical: 0
  warning: 4
  info: 3
  total: 7
status: issues_found
---

# Phase 52: Code Review Report

**Reviewed:** 2026-05-28
**Depth:** standard
**Files Reviewed:** 12
**Status:** issues_found

## Summary

Second gap-closure pass (plan 52-06) over the lookahead audio-cue scheduler with visibility-resume clamp/reanchor. The code is unusually well-documented and the core scheduling invariants (drift clamp, anchor rebase, cancel-then-reschedule, mute fade/cancel split, reconstruction teardown symmetry) are coherent and well-tested. No BLOCKER-class correctness or security defects were found in the post-fix code.

The central question posed by the workflow — *is the accepted ~5ms flam residual genuinely the best available trade-off, or does a correct CR-01 fix exist that does not break reconstruction?* — resolves to: **a correct fix does exist** (engine-layer dedup keyed on the requested boundary time), and the deviation note's framing that the dispatch-site filter was the only candidate is incomplete. This is the most substantive finding (WR-01). The residual itself is genuinely minor and shipping as-is is defensible; the issue is that a low-cost, reconstruction-safe alternative was never evaluated.

Remaining findings are robustness/quality: a `walkFutureCues` floor-vs-trim endpoint edge case (WR-02), an unbounded `activeCues` growth window under the lagging-tick flam path (WR-03), and a defensive-gate ordering inconsistency in the `topUpLookahead` cache write (WR-04), plus three info-level items.

## Narrative Findings (AI reviewer)

## Warnings

### WR-01: A reconstruction-safe CR-01 fix exists — engine-layer dedup on requested boundary time

**File:** `src/hooks/useBreathingSessionController.ts:387-403`, `src/audio/audioEngine.ts:483-494`
**Issue:**
The deviation note (controller L387-401 and the test analysis block at `useBreathingSessionController.test.tsx:223-235`) asserts the dispatch-site `audioTime > audioNow() + SAFE_LEAD_SEC` filter was the only candidate fix and had to be removed because it drops legitimate post-reconstruction cues whose `audioTime` is behind `audioNow` (anchor math `audioAnchor = newAC − elapsed`). That premise is sound *for the dispatch-site filter*, but it does not follow that the residual flam is unavoidable.

Trace of the residual: on a lagging rAF tick, `walkFutureCues` is seeded from `frame.cycleIndex` / `frame.phase` (the per-phase-stable `currentFrame`), so the **first** emitted cue is the boundary that *just passed*. `cancelFutureCues()` leaves that in-flight cue alive (`scheduledAt <= now`), then `topUpLookahead(cues)` re-emits a cue for the same boundary, which the callee clamp pins to `audioNow + SAFE_LEAD_SEC`. Two live cues for one boundary = the flam.

The discriminator the dispatch site lacks — but the engine has — is *whether a live cue already covers that boundary*. A dedup inside `topUpLookahead`, keyed on the **unclamped requested** `cue.audioTime` against the `scheduledAt` of cues already in `activeCues` (within an epsilon, e.g. `SAFE_LEAD_SEC`), closes CR-01 cleanly:
- **Lagging-tick case:** the surviving in-flight cue's `scheduledAt` ≈ the re-requested boundary time → skip dispatch → no flam.
- **Reconstruction case:** the new engine returned by `createAudioEngine` starts with an empty `activeCues` (`audioEngine.ts:326`), so nothing matches → every cue dispatches normally. The anchor-shift edge case the dispatch-site filter mishandled never arises because the dedup compares against live cues, not against `audioNow`.

This is strictly more correct than the dispatch-site filter and is the natural home for the logic (the engine already owns `activeCues` and `pruneExpiredCues`). The residual is minor enough that shipping as-is is defensible, but the recorded rationale ("the filter is therefore only needed for the single-tick lag case") understates that the single-tick lag case is itself fully fixable.

**Fix:** In `topUpLookahead`, before dispatching each cue, skip it when a non-expired cue already covers the boundary:
```ts
topUpLookahead({ cues }) {
  if (closed || muted) return
  pruneExpiredCues()
  const now = audioCtx.currentTime
  for (const cue of cues) {
    // CR-01: skip if a live cue already covers this boundary (in-flight or queued).
    // Compares the UNCLAMPED requested time so reconstruction (empty activeCues) is unaffected.
    const alreadyCovered = [...activeCues].some(
      (h) => Math.abs(h.scheduledAt - cue.audioTime) < SAFE_LEAD_SEC,
    )
    if (alreadyCovered) continue
    const clampedAudioTime = Math.max(cue.audioTime, now + SAFE_LEAD_SEC)
    schedule(clampedAudioTime, { kind: cue.kind, phaseDurationSec: cue.phaseDurationSec, timbre: sessionTimbre })
  }
}
```
(`cancelFutureCues()` is still required for the mute path; keep it. Validate against the existing reconstruction test before adopting.)

### WR-02: walkFutureCues floor can emit a cue at exactly targetSec, colliding with the end-chord

**File:** `src/domain/sessionAudio.ts:139-147`
**Issue:**
The D-14 trim uses a strict `>` comparison: `if (targetSec !== undefined && audioTimeRelSec > targetSec) break`. A cue whose `audioTimeRelSec === targetSec` (boundary landing exactly on the session end) passes the trim and is emitted. Test 6 (`sessionAudio.test.ts:202-226`) explicitly acknowledges this: *"Next cycle at 300 is exactly at targetSec — may or may not be included."* For a timed session, scheduling a phase cue at the exact completion instant is wrong — the session is over and `playEndChord` is the intended sound at `targetSec`; a bowl strike at the same instant collides with it.

The floor (`result.length >= minCues`, L145) makes this reachable even when the seconds window would otherwise stop earlier: if fewer than `minCues` cues have been emitted, the floor stop condition is not yet satisfied, so a cue at exactly `targetSec` is pushed before the next iteration's trim check fires.

**Fix:** Make the trim inclusive of the endpoint:
```ts
if (targetSec !== undefined && audioTimeRelSec >= targetSec) {
  break
}
```
Confirm Test 6/Test 8 fixtures still pass; tighten Test 6's "may or may not be included" comment to assert exclusion.

### WR-03: activeCues grows across lagging-tick flam events between prunes

**File:** `src/audio/audioEngine.ts:483-494`, `src/hooks/useBreathingSessionController.ts:402-403`
**Issue:**
On every flam (WR-01), the duplicate boundary cue is added to `activeCues` but the original in-flight cue is **not** removed (it survives `cancelFutureCues` by design, and `pruneExpiredCues` only drops cues whose `cleanupAt < now`). For a low-BPM, long-phase cue with a multi-second `cleanupAt` (the sustain-floor path stretches `cleanupAt` to `phaseEnd + CLEANUP_PADDING_SEC`, `cueSynth.ts:133-137`), a burst of lagging ticks within one phase can stack several duplicate handles for the same boundary before the next prune evicts them. Each carries a full oscillator chain. Bounded in practice (one phase's worth) and not a permanent leak, but it is a real growth window the documented invariant ("Calls pruneExpiredCues() ... to keep activeCues bounded", `audioEngine.ts:78`) does not actually cover — pruning is keyed on tail expiry, not on duplication.

**Fix:** Adopt the WR-01 engine-layer dedup — it prevents the duplicate from being added in the first place. No separate change needed if WR-01 is taken.

### WR-04: topUpLookahead caches cues before the engine's muted/closed guards run

**File:** `src/hooks/useAudioCues.ts:665-672`, `src/audio/audioEngine.ts:483-485`
**Issue:**
The hook's `topUpLookahead` writes `lastTopUpCuesRef.current = cues` after the `engine === null` gate but **before** the engine's own `closed`/`muted` guards execute. The engine's `topUpLookahead` is a no-op when muted (`audioEngine.ts:485`). If the hook facade is ever called while the engine is muted (the controller currently gates on `audioMuted` at `useBreathingSessionController.ts:355`, so this is not reachable today), the cache is updated with cues the engine silently dropped, and `handleForceTopUp` (L268-276) later replays that cache on `clock.onResume` — re-dispatching intentionally-suppressed cues. The controller's muted-guard is the only thing preventing this; the hook facade does not enforce the invariant it depends on.

Defensive-depth, not a live bug, but the cache write should reflect the engine's accept/reject decision rather than assume the caller pre-filtered.

**Fix:** Document the precondition explicitly at the facade (L665: "caller MUST NOT call while muted; engine will drop and the force-top-up cache will desync"), or move the cache write so it occurs only when the engine accepts the dispatch.

## Info

### IN-01: Comment cross-references point to stale line numbers

**File:** `src/audio/audioEngine.ts:503`, `src/audio/cueSynth.ts:192` (and others)
**Issue:**
Several comments cite line numbers that have drifted: `cancelFutureCues` says "same pattern as pruneExpiredCues (L322)" but `pruneExpiredCues` is at L348; `cueSynth.ts:192` cites "audioEngine.ts:534-537" for the close() disconnect loop, which lives at L614-616. Numeric line refs rot on every edit and actively mislead. Project memory ("no-design-locking") warns against anchoring downstream-modifiable values in comments.
**Fix:** Replace numeric line refs with symbol names (e.g., "same pattern as `pruneExpiredCues`").

### IN-02: Several Phase 52 controller tests assert nothing about Phase 52 behavior

**File:** `src/hooks/useBreathingSessionController.test.tsx:121-220`
**Issue:**
Tests 1, 2, 4, 5, 6 in the "Phase 52 D-04/D-14 top-up trigger" block render the controller in idle state and assert only `phase === 'idle'` (or `currentFrame === null`). Their titles claim to verify top-up wiring, `walkFutureCues` usage, constant imports, and targetSec sourcing, but none drive the controller to `running`, so none exercise the top-up effect. They are render-smoke tests mislabeled as behavioral coverage. The genuinely behavioral tests (CR-01-FIX ordering, WR-02 muted-gating) live in separate blocks and do the real work. The mislabeled tests give false confidence that the D-04/D-14 paths are covered when they are only reached by the later blocks.
**Fix:** Drive these to `running` and assert on `walkFutureCues` output / `topUpLookahead` call args, or relabel them honestly as render-smoke tests.

### IN-03: AudioEngine.now() interface method is unused dead surface

**File:** `src/audio/audioEngine.ts:61-62`, `561-563`
**Issue:**
The `now()` method on the `AudioEngine` interface (and its implementation) has no production callers — every time read in `useAudioCues` goes through `engine.clock.now()` (the SessionClock seam, L389/601/690). The JSDoc still says "App.tsx uses this as the t=0 anchor," which is no longer true post-Phase-50/51 migration. Predates Phase 52 (not introduced here, hence out of strict scope), but the lookahead work touches this file heavily and the stale method adds confusion beside the live `clock` surface.
**Fix:** Remove `now()` from the interface and implementation, or mark its JSDoc deprecated/internal. Verify no test relies on it first.

---

_Reviewed: 2026-05-28_
_Reviewer: Claude (gsd-code-reviewer)_
_Depth: standard_
