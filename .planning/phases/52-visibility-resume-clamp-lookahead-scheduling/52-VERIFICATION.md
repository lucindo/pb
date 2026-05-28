---
phase: 52-visibility-resume-clamp-lookahead-scheduling
verified: 2026-05-28T19:45:00Z
status: gaps_found
score: 3/5 must-haves verified
overrides_applied: 0
gaps:
  - truth: "User backgrounds tab mid-session under lookahead window: audio plays through; on foreground breathing doesn't race to catch up (per-tick clamp suppresses burst)."
    status: failed
    reason: "Per-tick clamp (D-05/D-06/D-07) is correctly wired and verified. However, the lookahead queue produces duplicate OscillatorNode chains for every cue that spans consecutive topUpLookahead calls (CR-01). topUpLookahead dispatches cues through schedule() which unconditionally calls activeCues.add() with a new OscillatorNode chain per call — no deduplication by audioTime/kind. A cue first queued at boundary N re-enters the 6s window at boundary N+1 and is scheduled again. The user hears doubled/phased cues. 'Audio plays through' is not clean."
    artifacts:
      - path: "src/audio/audioEngine.ts"
        issue: "topUpLookahead (L483-494) iterates args.cues and calls schedule() unconditionally for each. schedule() calls activeCues.add() with a fresh OscillatorNode chain every invocation — no audioTime/kind dedupe check."
      - path: "src/hooks/useBreathingSessionController.ts"
        issue: "Top-up effect fires on every session.currentFrame change (per rAF tick, ~60Hz). walkFutureCues at each tick returns a window that overlaps the prior tick's window for all cues past the first. No cancel-before-reschedule before audioTopUpLookahead(cues). No audioCancelFutureCues exposed from useAudioCues."
    missing:
      - "Either add deduplication at engine layer (Map keyed by quantized audioTime+kind, skip if already present and not expired) OR expose engine.cancelFutureCues through useAudioCues and call audioCancelFutureCues() before audioTopUpLookahead() in the controller effect."
      - "Regression test that drives two consecutive topUpLookahead calls with overlapping audioTime values and asserts scheduleInCueForTimbre call count equals the FINAL walk's cue count, not the sum of both walks."
  - truth: "User backgrounds tab indefinitely: audio plays cleanly through lookahead, then stops cleanly when window exhausted."
    status: failed
    reason: "Same root cause as above (CR-01). The doubled OscillatorNode chains mean audio does NOT play cleanly — each cue in the lookahead window fires twice, producing audible phasing or +6 dB doubling. 'Stops cleanly' is also undermined by the doubled nodes decaying at slightly different times."
    artifacts:
      - path: "src/audio/audioEngine.ts"
        issue: "schedule() creates fresh OscillatorNode per call; activeCues is a Set<CueHandle> keyed by handle object identity, not audioTime. Duplicate handles for identical audioTimes are not prevented."
    missing:
      - "Same fix as gap 1 — deduplication at engine layer or cancel-before-reschedule at controller."
  - truth: "Mid-session BPM/timbre change: queued cues cancelled and rescheduled cleanly — no stale cues fire."
    status: partial
    reason: "SCHED-05 is a defensive close: SettingsDialog is explicitly disabled in-session (Phase 14 inSessionView contract per CONTEXT §Deferred), so no user-facing trigger for a mid-session BPM/timbre change currently exists. The cancel mechanism (cancelFutureCues via setMuted path) is behaviorally locked by Plan 04 D-10 tests, which cover the same surface area. However, there is no direct behavioral test that simulates a settings change, cancels future cues, and asserts the next top-up re-queues from the new settings. SCHED-05 as a standalone observable truth is not directly testable because the UI trigger does not exist in-session. Accepted as intentional per roadmap decision; plan documentation explicitly calls this out."
    artifacts:
      - path: "src/hooks/useBreathingSessionController.ts"
        issue: "No mid-session settings-change path exists — the controller has no cancelFutureCues+reschedule flow triggered by BPM/timbre change. The mechanism is present (cancelFutureCues engine method + setMuted cancel path) but not wired to a settings-change event."
    missing:
      - "This gap is deferred by design per CONTEXT §Deferred — acceptable. No action required for Phase 52 close. When a future phase enables mid-session settings UI, a behavioral test MUST be added."
human_verification:
  - test: "Tab background audio continuity (short window)"
    expected: "Background tab mid-session for < 6 seconds; foreground — breathing animation resumes without racing; audio has played without interruption, cues sound like single strikes (not doubled/phased)"
    why_human: "After CR-01 fix is applied: requires a real browser tab-switch to verify both audio continuity and absence of cue doubling. WebAudio graph behavior in production cannot be confirmed by unit tests alone."
  - test: "Tab background indefinitely — clean stop"
    expected: "Background tab indefinitely; after ~6s lookahead exhausts, audio stops cleanly. Return to foreground — breathing is silent until next phase boundary, then audio resumes."
    why_human: "Requires real browser behavior — WebAudio envelope self-termination (cueSynth.ts L89-95) and the LOOKAHEAD_MIN_CUES floor behavior interact with real AC timing."
  - test: "Mute during active session with lookahead queue"
    expected: "Pressing mute should silence audio within one rAF tick — no 6-second tail of queued audio plays after mute press."
    why_human: "D-10 two-branch setMuted is unit-tested, but actual WebAudio node cancel/disconnect + fade interaction with in-flight vs future cues requires real browser verification."
---

# Phase 52: Visibility-Resume Clamp + Lookahead Scheduling Verification Report

**Phase Goal:** Add a per-tick elapsed-delta clamp so a long hidden window cannot trigger a catch-up burst on the first rAF after foreground, and replace boundary-driven cue scheduling with a lookahead window (LOOKAHEAD_WINDOW_SEC=6) so background tabs keep playing cues already queued into the WebAudio graph. Closes diagnosis #4 (catch-up burst) and #5 (audio dies on tab switch).
**Verified:** 2026-05-28T19:45:00Z
**Status:** gaps_found
**Re-verification:** No — initial verification

---

## Goal Achievement

### Observable Truths (from ROADMAP.md Success Criteria)

| # | Truth | Status | Evidence |
|---|-------|--------|----------|
| SC-1 | User backgrounds tab mid-session under lookahead window: audio plays through; on foreground breathing doesn't race to catch up (per-tick clamp suppresses burst). | ✗ FAILED | Clamp wiring verified (Plan 02, all tests pass). Lookahead wiring verified (Plan 03). BUT: topUpLookahead has no audioTime deduplication — consecutive per-tick calls schedule duplicate OscillatorNode chains for same audioTimes (CR-01). Audio will phase/double, not "play through" cleanly. |
| SC-2 | User backgrounds tab indefinitely: audio plays cleanly through lookahead, then stops cleanly when window exhausted. | ✗ FAILED | Same CR-01 root cause: cue doubling means audio does not play cleanly. D-12 envelope self-termination is present and correct but rendered irrelevant by the duplicate scheduling. |
| SC-3 | Mid-session BPM/timbre change: queued cues cancelled and rescheduled cleanly — no stale cues fire. | ? UNCERTAIN | SCHED-05 defensive close: SettingsDialog is disabled in-session (Phase 14 inSessionView contract). Cancel mechanism (D-10) exists and is behaviorally tested on the mute path, but no direct settings-change behavioral test exists. Intentionally deferred per CONTEXT §Deferred. |
| SC-4 | Cue scheduling no longer driven by per-tick rAF boundary detection — lookahead queues N cues ahead. | ✓ VERIFIED | computeBoundaryAudioOffsets removed from controller (grep confirms 0 references). walkFutureCues pure helper wires D-01 hybrid window. topUpLookahead facade in useAudioCues delegates to engine. Controller top-up effect verified. |
| SC-5 | Foreground HRV/Stretch/Navi behavior unchanged — BPM cadence, ratio splits, timed completion match v2.1 baseline; dual-anchor invariant (Phase 3 D-13/D-14) preserved through lookahead. | ✓ VERIFIED | walkFutureCues tests cover HRV baseline, Stretch segment-walk, D-14 timed trim, D-11 per-segment phaseDuration. Controller tests verify the replacement effect respects all guards. Full suite 1455/1455 passing. Foreground simulation tests in useBreathingSessionController.test.tsx pass. NOTE: the dual-anchor invariant is preserved via audioAnchor and session elapsed tracking; loop is additive, not replacing the anchor. |

**Score:** 2/5 truths fully verified (SC-4, SC-5). SC-1 and SC-2 FAILED due to CR-01. SC-3 UNCERTAIN (accepted defensive close).

---

### Required Artifacts

| Artifact | Expected | Status | Details |
|----------|----------|--------|---------|
| `src/audio/audioEngine.ts` | LOOKAHEAD_WINDOW_SEC=6, LOOKAHEAD_MIN_CUES=2, MAX_TICK_DELTA_SEC=0.1; topUpLookahead; cancelFutureCues | ✓ VERIFIED | All three const exports confirmed at L186/L192/L199. topUpLookahead at L483-494. cancelFutureCues at L500-511. Interface declarations at L80/L86. |
| `src/audio/cueSynth.ts` | CueHandle.cancel(): void; cancel closures in every scheduleXxx | ✓ VERIFIED | cancel(this: void): void at L76. cancel closures in scheduleBowlCue (scheduleInCueForTimbre + scheduleOutCueForTimbre) and scheduleTick. AUDIO-04 try/catch posture preserved. |
| `src/audio/nkCueSynth.ts` | CueHandle.cancel parity for NK helpers | ✓ VERIFIED | cancel closures confirmed in scheduleCountdownTick, scheduleNKFrontMarker, scheduleNKBackMarker, scheduleEndChord. Same try/catch posture. |
| `src/hooks/useSessionEngine.ts` | lastClockNowRef + per-tick clamp + startedAtSec rebase + reanchor reset | ✓ VERIFIED | lastClockNowRef at L141. MAX_TICK_DELTA_SEC import at L9. rawDelta computation at L197-198. rebasedState inside setState updater at L221-225. lastClockNowRef reset in reanchorSessionClock at L392. AH-WR-05 invariant comment extended for D-07 at L158. |
| `src/hooks/useSessionEngine.test.tsx` | Behavioral tests for clamp/rebase/reanchor | ✓ VERIFIED | describe('Phase 52 D-05/D-06/D-07 per-tick clamp') — 6 tests. describe('Phase 52 D-08 reanchorSessionClock lastClockNow reset') — 5 tests. All 35 tests pass. |
| `src/domain/sessionAudio.ts` | walkFutureCues pure helper | ✓ VERIFIED | export function walkFutureCues at L41. Handles HRV branch (cycleSec stride), Stretch branch (per-segment walk via segments[]), D-01 hybrid floor/window, D-14 targetSec trim. No React imports. |
| `src/domain/sessionAudio.test.ts` | 10 tests for walkFutureCues | ✓ VERIFIED | describe('Phase 52 D-01/D-11/D-14 walkFutureCues') — 10 tests passing. Covers HRV, Stretch, low-BPM floor, high-BPM window, targetSec trim, empty walk, Stretch cycleBaseIndex invariant, constant imports. |
| `src/hooks/useBreathingSessionController.ts` | Boundary-detection replaced; topUpLookahead called | ✓ VERIFIED | computeBoundaryAudioOffsets: 0 references in controller. walkFutureCues called at L362. audioTopUpLookahead called. LOOKAHEAD_WINDOW_SEC + LOOKAHEAD_MIN_CUES imported as symbols at L4-5. phase guard and audioAnchor null guard preserved. |
| `src/hooks/useAudioCues.ts` | topUpLookahead facade; handleForceTopUp; lastTopUpCuesRef; 4th clock subscription in start() and reconstructEngine() | ✓ VERIFIED | topUpLookahead useCallback at L627-635. handleForceTopUp at L263-271. lastTopUpCuesRef at L187. unsubForceTopUp in start() at L369 AND reconstructEngine() at L541. Both paths store 4-member clockUnsubsRef array. |
| `src/audio/audioEngine.ts` (setMuted) | D-10: two-branch setMuted — applyMuteFadeOut for in-flight, cancel loop for future | ✓ VERIFIED | setMuted at L525-557: pruneExpiredCues() → in-flight loop (scheduledAt <= now → applyMuteFadeOut) → future loop (snapshot [...activeCues] → cue.cancel() + activeCues.delete). D-08 preserved, D-10 comment present. |

---

### Key Link Verification

| From | To | Via | Status | Details |
|------|----|-----|--------|---------|
| useSessionEngine.ts:tick | MAX_TICK_DELTA_SEC clamp + startedAtSec rebase | Math.min semantics via `rawDelta > MAX_TICK_DELTA_SEC` guard | ✓ WIRED | L197-225: rawDelta computed, rebasedState constructed inside setState updater per AH-WR-05. |
| useSessionEngine.ts:reanchorSessionClock | lastClockNowRef.current = newClockNow | synchronous ref assignment at L392 before setState | ✓ WIRED | D-08 comment at L378 citing Phase 52 D-08 + Phase 51 D-10/D-11. |
| useBreathingSessionController.ts:top-up effect | domain/sessionAudio.ts:walkFutureCues | called at L362 on every session.currentFrame change | ✓ WIRED | pattern: walkFutureCues( confirmed. |
| useBreathingSessionController.ts:top-up effect | engine.topUpLookahead via useAudioCues facade | audioTopUpLookahead(cues) at L375 | ✓ WIRED | pattern: topUpLookahead( confirmed. |
| domain/sessionAudio.ts:walkFutureCues | Stretch branch via segments[] | segments array walked per cue to find activeSeg | ✓ WIRED | Stretch branch uses segments parameter; open-ended last segment (Infinity endSec) handled. |
| audioEngine.ts:topUpLookahead | activeCues via schedule() dispatch | dispatch loop iterates args.cues | ✗ PARTIAL | topUpLookahead dispatches each cue via schedule() but has NO deduplication by audioTime. Per-tick calls re-schedule same future cues. This is the CR-01 blocker. |
| audioEngine.ts:setMuted(true) | applyMuteFadeOut (in-flight) + cancel loop (future) | two-branch D-10 pattern | ✓ WIRED | Both branches confirmed in setMuted body. |
| useAudioCues.ts:handleForceTopUp | engine.topUpLookahead via cached lastTopUpCuesRef | subscribed to clock.onResume at L369 (start) and L541 (reconstructEngine) | ✓ WIRED | 4th subscription wired in both paths. |

---

### Data-Flow Trace (Level 4)

| Artifact | Data Variable | Source | Produces Real Data | Status |
|----------|---------------|--------|-------------------|--------|
| walkFutureCues (pure fn) | cue audioTimes | audioAnchor + cycleSec stride or segments[] | Yes — pure computation from live inputs | ✓ FLOWING |
| topUpLookahead (engine) | args.cues → activeCues | caller-supplied array from walkFutureCues | Yes — but no dedup check | ✗ DUPLICATE DATA (CR-01) |
| lastClockNowRef (useSessionEngine) | clock.now() per tick | SessionClock.now() = audioCtx.currentTime | Yes | ✓ FLOWING |
| lastTopUpCuesRef (useAudioCues) | cues array from last topUpLookahead call | written before engine null-gate (WR-02 minor gap) | Yes — slight staleness risk if called pre-start | ⚠ MINOR (WR-02) |

---

### Behavioral Spot-Checks

| Behavior | Command | Result | Status |
|----------|---------|--------|--------|
| All 1455 tests pass | pnpm test:run | 1455/1455 passed (120 files) | ✓ PASS |
| audioEngine Phase 52 tests | pnpm vitest run src/audio/audioEngine.test.ts | 75/75 pass | ✓ PASS |
| useSessionEngine Phase 52 tests | pnpm vitest run src/hooks/useSessionEngine.test.tsx | 35/35 pass | ✓ PASS |
| walkFutureCues Phase 52 tests | pnpm vitest run src/domain/sessionAudio.test.ts -t "Phase 52" | 10/10 pass | ✓ PASS |
| useAudioCues Phase 52 tests | pnpm vitest run src/hooks/useAudioCues.test.tsx | 52/52 pass | ✓ PASS |
| useBreathingSessionController Phase 52 tests | pnpm vitest run src/hooks/useBreathingSessionController.test.tsx | 9/9 pass | ✓ PASS |
| Two consecutive topUpLookahead calls with overlapping audioTimes deduplicate | (no test exists) | Test absent | ✗ FAIL — CR-01 not covered by any test |

---

### Requirements Coverage

| Requirement | Source Plan | Description | Status | Evidence |
|-------------|-------------|-------------|--------|----------|
| SCHED-01 | 52-02 | Per-tick elapsed-delta clamp suppresses catch-up bursts | ✓ SATISFIED | lastClockNowRef + MAX_TICK_DELTA_SEC clamp + rebasedState in setState updater. 11 behavioral tests. |
| SCHED-02 | 52-01, 52-03 | 5–10s lookahead window queues N cues ahead; rAF tick no longer the bottleneck | ✗ BLOCKED | Architecture is correct (walkFutureCues + topUpLookahead in place, boundary-detection removed), but cue duplication (CR-01) means the lookahead queue contains duplicate OscillatorNode chains. The bottleneck is removed but audio fidelity is broken. |
| SCHED-03 | 52-03, 52-04 | User backgrounds tab ≤ lookahead-window seconds: audio continues | ✗ BLOCKED | Blocked by same CR-01 issue: duplicate cues in the queue produce phased/doubled audio. |
| SCHED-04 | 52-03 | User backgrounds indefinitely: audio plays through window, stops cleanly | ✗ BLOCKED | CR-01: audio does not play cleanly with duplicate cues. D-12 envelope self-termination is correctly wired but the duplicated node chains undermine clean playback. |
| SCHED-05 | 52-01, 52-04 | Mid-session BPM/timbre change: no stale cues fire | ? NEEDS HUMAN | Defensive close: SettingsDialog disabled in-session (Phase 14). Cancel mechanism (D-10 + cancelFutureCues) exists and is tested via mute path. Not directly testable without enabling mid-session settings UI. |
| DEPS-01 | all | No new runtime dependencies | ✓ SATISFIED | package.json dependencies: react, react-dom, @fontsource-variable/inter only. |
| QUAL-01 | all | Per-commit green-gate | ✓ SATISFIED | 1455/1455 tests pass. Commits verified in git log (94e2717 → ee6133d). |

**Orphaned requirement check:** SCHED-01 through SCHED-05 map to this phase per REQUIREMENTS.md traceability table. No orphaned IDs found.

---

### Anti-Patterns Found

| File | Issue | Severity | Impact |
|------|-------|----------|--------|
| `src/audio/audioEngine.ts` (L483-494) | topUpLookahead dispatches every cue in args.cues unconditionally via schedule() with no audioTime/kind deduplication. schedule() adds a fresh OscillatorNode chain per call. | 🛑 BLOCKER (CR-01) | Every cue in the 6s lookahead window gets scheduled multiple times across consecutive per-tick top-up calls. User hears phased/doubled cues. |
| `src/hooks/useAudioCues.ts` (L629) | topUpLookahead writes lastTopUpCuesRef.current before the engine null-gate check. Pre-start calls can poison the forceTopUp cache with stale audioTimes. | ⚠ WARNING (WR-02) | If somehow called before start() (not current production path but admitted by API surface), stale cues fire on onResume. |
| `src/hooks/useAudioCues.ts` (L352-391) | scheduleLeadIn null-return path does not close engine, unsub clock handlers, or null engineRef. (CR-02) | ⚠ WARNING | Currently unreachable (scheduleLeadIn returns null only when closed===true), but any future engine change allowing null while closed===false would leak AC. |
| `src/hooks/useSessionEngine.ts` (tick) | rawDelta < 0 (clock backwards) passes through unclamped. (WR-03) | ⚠ WARNING | Proxy source swap during reconstruction could expose a briefly smaller clock value, causing elapsedSec to go backwards. Reanchor path mitigates the reconstruction case. |
| `src/hooks/useAudioCues.ts` | notifyPhaseBoundary still exported and engine still implements scheduleNextCue, but no production caller exists (IN-01). | ℹ INFO | Dead API surface; audit cost for future changes. |
| `src/audio/audioEngine.ts` | cancelFutureCues public method is a duplicate of the inline loop in setMuted (IN-02). The method reference issue is real (object literal sibling methods cannot cross-reference). | ℹ INFO | Code duplication of the AH-WR-07 snapshot-iterate pattern. |

---

### Human Verification Required

### 1. Tab Background Audio Continuity (after CR-01 fix)

**Test:** After applying the CR-01 deduplication fix — start an HRV session, background the tab for 3 seconds (within the 6s lookahead window), then return to foreground.
**Expected:** Audio has played continuously through the background period. Cues sound like single clean bowl strikes, not doubled or phased. Breathing animation resumes without racing (no catch-up burst visible).
**Why human:** WebAudio OscillatorNode behavior (phasing when two nodes fire at identical times) cannot be verified by unit tests. The clamp suppression requires observing real rAF timing behavior in a browser.

### 2. Tab Background Indefinitely — Clean Stop

**Test:** Start an HRV session at default BPM (~6 BPM / 10s cycle), background the tab for > 10 seconds (past the 6s lookahead window), then return to foreground.
**Expected:** Audio plays for ~6s after tab-hide, then stops cleanly with no garbled output. On foreground return, a new phase boundary triggers fresh cue queueing and audio resumes normally.
**Why human:** Envelope self-termination (cueSynth.ts L89-95) and the interaction between the lookahead exhaustion and the "session stays running" (D-12) semantics require real browser verification.

### 3. Mute During Active Lookahead Session

**Test:** Start an HRV session. Wait for the lead-in to complete and let 2-3 cues queue ahead in the lookahead window. Press Mute.
**Expected:** Audio mutes within one rAF tick — no ~6 seconds of queued audio plays after the mute press. In-flight cue (if playing) fades gracefully.
**Why human:** D-10 two-branch setMuted (applyMuteFadeOut for in-flight + cancel loop for future) is unit-tested but real WebAudio node.stop() + disconnect() interaction with live audio graph requires browser confirmation.

---

### Gaps Summary

**Root Cause: CR-01 — Cue Duplication in topUpLookahead**

The single blocking issue is that `topUpLookahead` in `audioEngine.ts` does not deduplicate cues by `audioTime`. The controller's top-up effect fires on every `session.currentFrame` change (~60Hz when running). Each call walks a fresh 6-second window from the current frame, which overlaps substantially with the prior tick's window. Every cue in the overlap (typically all cues except the very first in the window) gets passed to `schedule()` again, creating a new `OscillatorNode` chain for an audioTime that is already scheduled. The result is doubled/phased audio on every cue except the first.

The plan's threat-model entry T-52-08 incorrectly dismisses this by claiming "the underlying engine.schedule eventually-add-via-Set behavior is acceptable." The `activeCues` Set is keyed by handle object identity, not audioTime — adding a second handle for the same audioTime is unconditionally accepted.

**Fix paths:**

**Option A (preferred — minimal engine change):** In the controller effect, call `audioCancelFutureCues()` before `audioTopUpLookahead(cues)`. This requires:
1. Expose `engine.cancelFutureCues()` as a facade method on `useAudioCues` (parallel to `topUpLookahead`).
2. Add `audioCancelFutureCues` call at the top of the controller top-up effect body.
3. Add a regression test: drive two consecutive boundary updates, assert `scheduleInCueForTimbre` call count equals the FINAL walk's cue count.

**Option B (engine-layer dedup):** Add a `Map<number, CueHandle>` keyed by quantized audioTime+kind inside `topUpLookahead`. Skip dispatch if an active (not-yet-expired) handle already exists for that time+kind.

Option A is simpler and matches the "cancel-then-reschedule" pattern documented as SCHED-05 in the context. It is also what `setMuted(true)` does (cancel future cues, then the next top-up refills). The plumbing for `cancelFutureCues` is already in the engine (Plan 01) — only the hook exposure and controller wiring are missing.

The WR-02 warning (cache update before engine null-gate) and CR-02 (engine leak on null scheduleLeadIn) are secondary and should be addressed in the same fix pass.

---

_Verified: 2026-05-28T19:45:00Z_
_Verifier: Claude (gsd-verifier)_
