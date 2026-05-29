---
phase: 52-visibility-resume-clamp-lookahead-scheduling
verified: 2026-05-28T22:30:00Z
status: human_needed
score: 4/6 must-haves verified
overrides_applied: 0
re_verification:
  previous_status: gaps_found
  previous_score: 3/5
  gaps_closed:
    - "Cue duplication from consecutive overlapping topUpLookahead calls (CR-01 main case) — resolved by cancel-then-reschedule in Plan 05 + muted-gating symmetry in Plan 06"
    - "Stale cache write before engine null-gate (WR-02) — fixed, lastTopUpCuesRef written AFTER null-gate"
    - "Reconstruction-path stale-cue replay (WR-04+WR-05) — lastTopUpCuesRef cleared in reconstructEngine"
    - "Mute/unmute asymmetry (WR-02 Plan06) — both cancel and top-up now gated on audioMuted symmetrically"
    - "Unbounded walkFutureCues loop (WR-01) — MAX_WALK_ITERATIONS=10_000 cap with degenerate-plan test"
    - "Non-atomic clamp/rebase anchor (WR-03) — anchor resets in non-running updater branch"
  gaps_remaining:
    - "Single lagging-rAF-tick flam: boundary cue scheduled twice with ~5ms gap when rAF fires after audio clock crosses boundary (accepted residual)"
  regressions: []
gaps:
  - truth: "At every phase boundary, the boundary bowl cue is scheduled exactly once (no flam / double-strike), even when the rAF tick lags the audio clock across the boundary."
    status: partial
    reason: "The dispatch-site audioTime > audioNow + SAFE_LEAD_SEC filter was implemented then removed (commit ef46606) because it incorrectly dropped legitimate reconstruction-path cues. The residual: when the rAF tick fires 16–50ms after the audio clock crosses a boundary, cancelFutureCues() leaves the in-flight cue alive (scheduledAt <= now), and the fresh walkFutureCues walk re-emits the same boundary cue which topUpLookahead schedules at audioNow + SAFE_LEAD_SEC. Two live handles for one boundary = ~5ms flam. The post-fix code review (52-REVIEW.md WR-01) identified a reconstruction-safe fix (engine-layer dedup in topUpLookahead keyed on unclamped audioTime within SAFE_LEAD_SEC epsilon) that was not evaluated before Plan 06 closed."
    artifacts:
      - path: "src/audio/audioEngine.ts"
        issue: "topUpLookahead (L483-494) dispatches every cue unconditionally via schedule(). No dedup against activeCues by audioTime. schedule() always adds a new OscillatorNode chain to activeCues."
      - path: "src/hooks/useBreathingSessionController.ts"
        issue: "Controller effect comment at L387-401 explicitly acknowledges the 5ms flam as an accepted residual. No dispatch-site filter (SAFE_LEAD_SEC/audioNow removed from live code, present only in comments). cancel-then-reschedule handles consecutive-walk duplicates but not single-tick lag."
    missing:
      - "Engine-layer dedup in topUpLookahead: before dispatching a cue, skip it if activeCues already contains a non-expired handle with |scheduledAt - cue.audioTime| < SAFE_LEAD_SEC. This is safe for reconstruction because the new engine starts with empty activeCues. (52-REVIEW.md WR-01 prescribes the exact implementation.)"
      - "Regression test asserting scheduleInCueForTimbre is called exactly once for a lagging-frame boundary crossing (the current CR-01 Plan06 test at L247-308 only asserts cancel fires before topUp, not that the boundary cue was dispatched exactly once)."
human_verification:
  - test: "Tab background audio continuity (short window)"
    expected: "Background tab mid-session for < 6 seconds; return to foreground — breathing animation resumes without racing (clamp suppresses burst); audio has played without interruption. Note: if boundary timing is very tight (rAF fires within ~50ms of boundary), there may be a barely-audible ~5ms flam on the first cue after the boundary nearest to the tab-switch."
    why_human: "Real browser tab-switch is required to observe both (a) audio continuity during background, and (b) absence of animation catch-up burst. WebAudio OscillatorNode scheduling and rAF timing cannot be fully replicated by unit tests."
  - test: "Tab background indefinitely — clean stop"
    expected: "Background tab indefinitely; after ~6s lookahead exhausts, audio stops cleanly. Return to foreground — breathing is silent until next phase boundary, then audio resumes. No garbled or partial-attack output after resumption."
    why_human: "D-12 envelope self-termination and LOOKAHEAD_MIN_CUES floor interaction with session-still-running semantics requires real WebAudio graph behavior in a browser."
  - test: "Mute during active session with lookahead queue"
    expected: "Press mute mid-session — audio silences within one rAF tick; no queued cues fire after mute. Unmute — audio stays silent until next phase boundary, then resumes with a fresh cue (D-10 unmute-waits-for-boundary). In-flight cue fades gracefully."
    why_human: "D-10 two-branch setMuted (applyMuteFadeOut for in-flight + cancelFutureCues for future) is unit-tested but real WebAudio node.stop() + disconnect() interaction with live audio graph requires browser confirmation."
  - test: "Boundary flam assessment (optional quality check)"
    expected: "At a phase boundary, exactly one bowl strike fires with a single clean attack. If a ~5ms flam is audible (two overlapping strikes separated by ~5ms), the accepted residual is confirmed and WR-01 / engine-layer dedup should be prioritized."
    why_human: "The 5ms flam residual from the lagging-rAF-tick case is inaudible on most hardware but may be perceptible on high-quality speakers. Human listening is the only way to confirm acceptability."
---

# Phase 52: Visibility-Resume Clamp + Lookahead Scheduling Verification Report

**Phase Goal:** Add a per-tick elapsed-delta clamp so a long hidden window cannot trigger a catch-up burst on the first rAF after foreground, and replace boundary-driven cue scheduling with a lookahead window (LOOKAHEAD_WINDOW_SEC=6) so background tabs keep playing cues already queued into the WebAudio graph. Closes diagnosis #4 (catch-up burst) and #5 (audio dies on tab switch).
**Verified:** 2026-05-28T22:30:00Z
**Status:** human_needed
**Re-verification:** Yes — after Plan 06 gap closure (previous status: gaps_found, score: 3/5)

---

## Goal Achievement

### Observable Truths (52-06 must_haves + ROADMAP Success Criteria)

| # | Truth | Status | Evidence |
|---|-------|--------|----------|
| M-1 | Boundary bowl cue scheduled exactly once — no flam/double-strike even when rAF tick lags audio clock. | ✗ PARTIAL | dispatch-site filter removed (ef46606). cancel-then-reschedule closes consecutive-walk case but not single-tick lag. 5ms flam residual acknowledged in controller comment L387-401. REVIEW.md WR-01 prescribes unconsidered reconstruction-safe fix. |
| M-2 | walkFutureCues always terminates on degenerate plan. | ✓ VERIFIED | MAX_WALK_ITERATIONS=10_000 exported constant at sessionAudio.ts:31. Bounded for-loop at L103. Degenerate-plan test at sessionAudio.test.ts:312. |
| M-3 | Clamp anchor (lastClockNowRef) advances only when rebase commits — atomic clamp/rebase. | ✓ VERIFIED | WR-03: lastClockNowRef.current = lastClockNow reset inside non-running updater branch (useSessionEngine.ts L220). Behavioral test at useSessionEngine.test.tsx:1402. |
| M-4 | Stale cached cues with old-AC-origin audioTimes never replayed on reconstruction/reanchor path. | ✓ VERIFIED | WR-05: lastTopUpCuesRef.current = [] in reconstructEngine at useAudioCues.ts:537. WR-04+WR-05 tests at useAudioCues.test.tsx:2102-2214. handleForceTopUp early-returns on empty cache (L274). |
| M-5 | reconstructEngine clears lastTopUpCuesRef. | ✓ VERIFIED | useAudioCues.ts:537 confirmed. Mirrors stop()'s WR-02-FIX cache-clear at L469. |
| M-6 | Mute/unmute symmetric and consistent with locked D-10 unmute-waits-for-boundary decision. | ✓ VERIFIED | WR-02: `if (audioMuted) return` at useBreathingSessionController.ts:355 gates BOTH cancelFutureCues and topUpLookahead. audioMuted in dep array at L404. WR-02 tests at useBreathingSessionController.test.tsx:318. |
| SC-4 | Cue scheduling no longer driven by per-tick rAF boundary detection — lookahead queues N cues ahead. | ✓ VERIFIED | computeBoundaryAudioOffsets: 0 references in controller. walkFutureCues called at L375. audioTopUpLookahead called at L403. LOOKAHEAD_WINDOW_SEC + LOOKAHEAD_MIN_CUES imported as symbols at L4-5. |
| SC-5 | Foreground session behavior unchanged — BPM cadence, ratio splits, timed completion, dual-anchor invariant. | ✓ VERIFIED | 1475/1475 tests pass. Controller tests cover running-phase top-up. useSessionEngine tests cover foreground tick behavior. walkFutureCues tests cover HRV/Stretch/D-14 trim. |

**Score:** 4/6 must-haves verified. M-1 partial (5ms flam residual). SC-1/SC-2/SC-3 have human-verification dependency.

---

### Deferred Items

No items deferred to later phases. Phase 53 addresses master-gain mute (separate subsystem).

---

### Required Artifacts

| Artifact | Expected | Status | Details |
|----------|----------|--------|---------|
| `src/audio/audioEngine.ts` | LOOKAHEAD_WINDOW_SEC=6, LOOKAHEAD_MIN_CUES=2, MAX_TICK_DELTA_SEC=0.1; topUpLookahead; cancelFutureCues | ✓ VERIFIED | Constants at L186/L192/L199. topUpLookahead L483-494. cancelFutureCues L500-511. Interface declarations present. |
| `src/audio/cueSynth.ts` | CueHandle.cancel(): void; cancel closures in every scheduleXxx | ✓ VERIFIED | cancel(this: void): void in interface. Cancel closures with try/catch AUDIO-04 posture in all schedule helpers. |
| `src/audio/nkCueSynth.ts` | CueHandle.cancel parity for NK helpers | ✓ VERIFIED | cancel closures in NK helpers confirmed from Plan 01 verification (carried forward). |
| `src/hooks/useSessionEngine.ts` | lastClockNowRef + per-tick clamp + startedAtSec rebase + WR-03 anchor reset | ✓ VERIFIED | lastClockNowRef at L141. MAX_TICK_DELTA_SEC imported. rawDelta computation L196-198. WR-03 anchor reset at L220. reanchorSessionClock lastClockNowRef reset confirmed. |
| `src/domain/sessionAudio.ts` | walkFutureCues + MAX_WALK_ITERATIONS cap | ✓ VERIFIED | walkFutureCues at L57. MAX_WALK_ITERATIONS=10_000 at L31. Bounded for-loop L103. |
| `src/hooks/useBreathingSessionController.ts` | Boundary detection removed; cancel-then-reschedule; muted guard symmetric | ✓ VERIFIED | computeBoundaryAudioOffsets: 0 references. audioCancelFutureCues() before audioTopUpLookahead() at L402-403. if (audioMuted) return at L355. audioMuted in dep array. |
| `src/hooks/useAudioCues.ts` | topUpLookahead facade (cache AFTER null-gate); cancelFutureCues facade; lastTopUpCuesRef cleared in reconstructEngine + stop | ✓ VERIFIED | topUpLookahead at L665-673 (cache write at L669 after null-gate at L668). cancelFutureCues at L681-685. lastTopUpCuesRef cleared at L537 (reconstructEngine) and L469 (stop). handleForceTopUp with empty-cache guard at L274. |
| `src/audio/audioEngine.ts` (setMuted) | D-10 two-branch: applyMuteFadeOut (in-flight) + cancel loop (future) | ✓ VERIFIED | setMuted at L525-557: pruneExpiredCues → in-flight loop → future loop with [...activeCues] snapshot. |

---

### Key Link Verification

| From | To | Via | Status | Details |
|------|----|-----|--------|---------|
| useSessionEngine.ts:tick | MAX_TICK_DELTA_SEC clamp + startedAtSec rebase | rawDelta > MAX_TICK_DELTA_SEC guard at L232 | ✓ WIRED | rebasedState constructed inside setState updater per AH-WR-05 constraint. |
| useSessionEngine.ts:tick (non-running branch) | lastClockNowRef reset | lastClockNowRef.current = lastClockNow at L220 | ✓ WIRED | WR-03 atomic anchor: anchor rollback only in non-running short-circuit. |
| useBreathingSessionController.ts:top-up effect | walkFutureCues + cancel-then-reschedule | audioCancelFutureCues() then audioTopUpLookahead(cues) at L402-403 | ✓ WIRED | Confirmed in source. audioMuted guard at L355 gates both symmetrically. |
| useAudioCues.ts:topUpLookahead | engine.topUpLookahead + lastTopUpCuesRef cache | cache at L669 (AFTER null-gate at L668) | ✓ WIRED | WR-02-FIX confirmed: pre-start calls cannot poison cache. |
| useAudioCues.ts:reconstructEngine | lastTopUpCuesRef = [] | L537 alongside other ref resets | ✓ WIRED | WR-05 confirmed. |
| audioEngine.ts:topUpLookahead | activeCues via schedule() dispatch | loop at L487-493 | ✗ PARTIAL | No audioTime/kind dedup against activeCues. A cue already in activeCues (in-flight after lagging rAF tick) is not skipped. This is the M-1 partial source. |
| audioEngine.ts:setMuted(true) | cancelFutureCues + applyMuteFadeOut | two-branch loop in setMuted L534-556 | ✓ WIRED | Both branches confirmed. |
| useAudioCues.ts:handleForceTopUp | engine.topUpLookahead via cached lastTopUpCuesRef | subscribed to clock.onResume at start() and reconstructEngine() | ✓ WIRED | 4th subscription in clockUnsubsRef confirmed at L579-580. Empty-cache guard at L274 prevents stale replay. |

---

### Data-Flow Trace (Level 4)

| Artifact | Data Variable | Source | Produces Real Data | Status |
|----------|---------------|--------|-------------------|--------|
| walkFutureCues (pure fn) | cue audioTimes | audioAnchor + cycleSec stride or segments[] | Yes — pure computation from live session state | ✓ FLOWING |
| topUpLookahead (engine) | args.cues → activeCues | caller-supplied from walkFutureCues | Yes — no dedup but each cue adds a real OscillatorNode chain | ✗ PARTIAL (M-1 residual) |
| lastClockNowRef (useSessionEngine) | clock.now() per tick | SessionClock.now() = audioCtx.currentTime | Yes | ✓ FLOWING |
| lastTopUpCuesRef (useAudioCues) | cues array from last topUpLookahead | written AFTER engine null-gate (WR-02-FIX) | Yes | ✓ FLOWING |
| reconstructEngine → lastTopUpCuesRef | [] reset | explicitly cleared at L537 | Yes — prevents stale replay | ✓ FLOWING |

---

### Behavioral Spot-Checks

| Behavior | Command | Result | Status |
|----------|---------|--------|--------|
| All 1475 tests pass | pnpm vitest run | 1475/1475 passed (120 files) | ✓ PASS |
| audioEngine Phase 52 tests | pnpm vitest run src/audio/audioEngine.test.ts | 77/77 pass | ✓ PASS |
| useSessionEngine Phase 52 tests (incl. WR-03) | pnpm vitest run src/hooks/useSessionEngine.test.tsx | 37/37 pass | ✓ PASS |
| walkFutureCues tests (incl. WR-01 degenerate) | pnpm vitest run src/domain/sessionAudio.test.ts | 16/16 pass | ✓ PASS |
| useAudioCues tests (incl. WR-04+WR-05) | pnpm vitest run src/hooks/useAudioCues.test.tsx | 60/60 pass | ✓ PASS |
| useBreathingSessionController tests (incl. WR-02, CR-01 ordering) | pnpm vitest run src/hooks/useBreathingSessionController.test.tsx | 15/15 pass | ✓ PASS |
| TypeScript typecheck | pnpm tsc --noEmit | 0 errors | ✓ PASS |
| Exactly-once boundary cue under lagging-frame crossing | (no test asserts count=1) | CR-01 Plan06 test asserts cancel-before-topUp ordering only; no toBeCalledTimes(1) on scheduleInCueForTimbre | ✗ MISSING (M-1) |

---

### Requirements Coverage

| Requirement | Source Plan | Description | Status | Evidence |
|-------------|-------------|-------------|--------|----------|
| SCHED-01 | 52-02, 52-06 | Per-tick elapsed-delta clamp suppresses catch-up bursts | ✓ SATISFIED | lastClockNowRef + MAX_TICK_DELTA_SEC clamp + rebasedState in setState updater. WR-03 atomic anchor. 37 behavioral tests. |
| SCHED-02 | 52-01, 52-03, 52-06 | 5–10s lookahead window queues N cues ahead; rAF no longer the bottleneck | ✓ SATISFIED | Architecture verified: walkFutureCues + cancel-then-reschedule + topUpLookahead. Consecutive-walk deduplication confirmed. Architecture is correct; residual flam is quality concern, not architectural failure. |
| SCHED-03 | 52-03, 52-04, 52-06 | User backgrounds ≤ window: audio continues; no animation race on foreground | ? NEEDS HUMAN | Architecture is correct. Clamp wired (SCHED-01). Lookahead pre-queues cues (SCHED-02). The M-1 5ms flam residual may be audible in practice. Real browser verification required. |
| SCHED-04 | 52-03, 52-06 | User backgrounds indefinitely: audio plays through window, stops cleanly | ? NEEDS HUMAN | D-12 envelope self-termination wired correctly. Architecture correct. Real browser verification required for "cleanly." |
| SCHED-05 | 52-01, 52-04, 52-06 | Mid-session BPM/timbre change: no stale cues fire | ? NEEDS HUMAN | Defensive close: SettingsDialog disabled in-session (Phase 14 inSessionView contract). Cancel mechanism (D-10 + cancelFutureCues + symmetric muted-gating WR-02) exists and is tested. Not directly testable without in-session settings UI. |
| DEPS-01 | all | No new runtime dependencies | ✓ SATISFIED | package.json dependencies: react, react-dom only. 0 new entries across all 6 plans. |
| QUAL-01 | all | Per-commit green-gate | ✓ SATISFIED | 1475/1475 tests pass. All Plan 06 commits verified in git log (271fbe2 → ef46606). |

**Orphaned requirement check:** SCHED-01 through SCHED-05 + DEPS-01 + QUAL-01 — all accounted for across plans. No orphaned IDs.

---

### Anti-Patterns Found

| File | Line | Pattern | Severity | Impact |
|------|------|---------|----------|--------|
| `src/audio/audioEngine.ts` (topUpLookahead, L483-494) | L487-493 | No audioTime/kind dedup against live activeCues — a cue whose audioTime matches an in-flight handle is re-dispatched | ⚠ WARNING (M-1 residual) | ~5ms flam on lagging-rAF-tick boundary crossings. Per 52-REVIEW.md WR-01, a correct fix exists (epsilon-match against activeCues) and was not evaluated before Plan 06 closed. Minor quality issue; not an architectural failure. |
| `src/domain/sessionAudio.ts` (walkFutureCues, L140) | L140 | D-14 trim uses strict `>` — a cue with audioTimeRelSec === targetSec passes and is emitted, colliding with the end-chord at the same instant | ⚠ WARNING (REVIEW WR-02) | Audible at timed-session boundary: bowl strike collides with end-chord at the exact completion instant. Only reachable when LOOKAHEAD_MIN_CUES floor is still unsatisfied at targetSec. |
| `src/audio/audioEngine.ts` (various comments) | Multiple | Comments cite stale line numbers (e.g., "L322" for pruneExpiredCues) | ℹ INFO (REVIEW IN-01) | Misleads future readers. Project memory "no-design-locking" warns against this. |
| `src/hooks/useBreathingSessionController.test.tsx` (L121-220) | L121-220 | Phase 52 D-04/D-14 top-up trigger tests 1/2/4/5/6 assert only `phase === 'idle'`; they never drive the controller to `running` and don't exercise the top-up effect | ℹ INFO (REVIEW IN-02) | False confidence that D-04/D-14 paths are covered by these tests. The genuinely behavioral tests are in later describe blocks. |
| `src/audio/audioEngine.ts` (now() method, L61-62) | L61-62 | `now()` method on AudioEngine interface has no production callers post Phase 50/51 migration; JSDoc still says "App.tsx uses this" | ℹ INFO (REVIEW IN-03) | Dead API surface. Adds confusion beside the live `clock` surface. |

**Debt marker gate:** No `TBD`, `FIXME`, or `XXX` markers found in Phase 52 modified files.

---

### Human Verification Required

### 1. Tab Background Audio Continuity (short window)

**Test:** Start an HRV session at default BPM, background the tab for 3 seconds (within the 6s lookahead window), return to foreground.
**Expected:** Audio has played continuously during the background period. Breathing animation resumes without racing (no visible catch-up burst). Cues sound like single clean bowl strikes. If a very slight flam (two attacks ~5ms apart) is audible on a cue near the tab-switch boundary, note it — this is the M-1 accepted residual.
**Why human:** Real browser rAF + tab-hide interaction required to confirm (a) clamp suppresses animation burst, (b) WebAudio cues fired during hidden window. Cannot be confirmed by unit tests alone.

### 2. Tab Background Indefinitely — Clean Stop

**Test:** Start an HRV session at default BPM, background the tab for > 10 seconds (past the 6s lookahead window), return to foreground.
**Expected:** Audio plays for ~6s after tab-hide, then stops cleanly with no garbled or partial output. On return to foreground, audio is silent until the next phase boundary fires a fresh cue.
**Why human:** D-12 envelope self-termination and LOOKAHEAD_MIN_CUES floor interaction with session-still-running semantics requires real WebAudio graph behavior.

### 3. Mute During Active Lookahead Session

**Test:** Start an HRV session, let the lead-in complete and session run for ~10s (2-3 cues queued). Press Mute.
**Expected:** Audio silences within one rAF tick — no ~6 seconds of queued audio fires after mute. Any in-flight cue fades gracefully. Unmute — audio stays silent until next phase boundary, then resumes normally (D-10 unmute-waits-for-boundary).
**Why human:** D-10 two-branch setMuted (applyMuteFadeOut for in-flight + cancel loop for future) is unit-tested, but real WebAudio node.stop() + disconnect() with a live audio graph requires browser confirmation.

### 4. Boundary Flam Assessment (Quality Check for M-1 Residual)

**Test:** Run an HRV session for 1–2 minutes on high-quality speakers. Listen specifically at phase boundaries.
**Expected:** Exactly one clean bowl strike per phase transition. If two overlapping strikes separated by ~5ms are audible (a "flam"), this confirms the M-1 residual is perceptible and WR-01 engine-layer dedup should be prioritized.
**Why human:** WebAudio OscillatorNode timing at 5ms precision cannot be verified by unit tests. Whether the flam is perceptible is a hardware/context-dependent judgment.

---

### Gaps Summary

**One partial must-have (M-1): Boundary cue scheduled "exactly once" guarantee not fully met**

The phase headline guarantee in 52-06-PLAN.md is "exactly one boundary bowl cue per phase boundary (no flam/double-strike), even when the rAF tick lags the audio clock across the boundary." This is not fully met in the current codebase.

**Root cause:** The lagging-rAF-tick flam was addressed in Plan 05 for consecutive overlapping walks (cancel-then-reschedule prevents double-scheduling across tick N → tick N+1). But the single-tick case remains: when the rAF fires 16–50ms after the audio clock crosses a boundary, cancelFutureCues() leaves the in-flight boundary cue alive (scheduledAt ≤ audioCtx.currentTime), and the fresh walkFutureCues re-emits the same boundary cue. topUpLookahead schedules it at audioNow + SAFE_LEAD_SEC, producing two live handles for the same boundary ~5ms apart.

**Disposition of the Plan 06 fix attempt:** Plan 06 prescribed a dispatch-site filter (REVIEW.md Option A: `audioTime > audioNow + SAFE_LEAD_SEC`). This was implemented and then removed (commit ef46606) because it incorrectly dropped reconstruction-path cues. The 52-REVIEW.md (WR-01) identified that the dispatch-site filter was not the only available fix — an engine-layer dedup inside `topUpLookahead` keyed on the unclamped requested `cue.audioTime` against live `activeCues.scheduledAt` (within SAFE_LEAD_SEC epsilon) would close the flam without affecting reconstruction (new engine has empty activeCues). This alternative was not evaluated before Plan 06 closed.

**Severity:** The ~5ms flam is a quality concern, not an architectural or behavioral correctness failure. Audio continues to play through the hidden window; the animation clamp works; the session records correctly. The flam may be inaudible on most hardware. Human verification (check #4) is needed to determine if the residual is acceptable for the v2.2 milestone.

**Recommended action:** If the flam is perceptible in human verification, a targeted Plan 07 to add engine-layer dedup in `topUpLookahead` (52-REVIEW.md WR-01 prescription, ~10 lines of code) would close M-1 without requiring a new gap-closure phase. If the flam is inaudible in practice, an operator override with a documented rationale is appropriate.

**Secondary warnings (not blockers):**
- REVIEW WR-02: walkFutureCues `>` vs `>=` at targetSec (L140) — bowl strike can collide with end-chord at exact timed-session completion. Low priority; only reachable when LOOKAHEAD_MIN_CUES floor is unsatisfied at targetSec.
- REVIEW IN-01: stale line-number cross-references in comments — informational, not a correctness issue.

---

_Verified: 2026-05-28T22:30:00Z_
_Verifier: Claude (gsd-verifier)_
