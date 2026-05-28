# Phase 51 — iOS Device UAT

**Purpose.** Validate CLOCK-04 (iOS lock/unlock keeps audio + animation in
phase on resume) and the four ROADMAP Phase 51 success criteria on a real
iOS device. The architectural prereqs are deterministically locked behind
the Plan 51-04 behavioral tests (`useSessionEngine.test.tsx` describe
block "AC-suspension semantics (Phase 51 D-07 / CLOCK-05)"). This UAT
is the real-device confirmation that the seam delivers the user-observable
behavior.

**Scope.** Manual operator-driven test plan. Each scenario has explicit
PASS / FAIL criteria the operator marks off. UAT outcomes feed back into
plan-phase gap closure (`/gsd:plan-phase 51 --gaps`) if any scenario fails.

**Cross-references.**

- ROADMAP Phase 51 Success Criteria (`.planning/ROADMAP.md` §"Phase 51", criteria #1–#4)
- REQUIREMENTS:
  - **CLOCK-01** — Session elapsed derives from `SessionClock.now() − sessionStartCtxTime`
  - **CLOCK-03** — Animation phase progress derives from the audio clock each rAF
  - **CLOCK-04** — iOS lock/unlock keeps audio + animation in phase on resume *(this UAT closes this requirement)*
  - **CLOCK-05** — Foreground mid-session produces no observable audio/animation drift
- Plan 51-04 behavioral lock (`51-04-SUMMARY.md`) — proves the seam works architecturally
- Phase 5.1 iOS recovery affordance (preserved in Plan 51-02 Task 2) — morphing
  `MuteToggle` / `audioStatus === 'needs-resume'` recovery flow

---

## Device Matrix

The operator commits to testing **at minimum** the primary iOS device below.
Additional devices are welcome but not required.

| Device | iOS Version | Browser | Notes |
|---|---|---|---|
| _(operator fills)_ | _(operator fills)_ | Mobile Safari | Primary |
| _(operator fills, optional)_ | _(operator fills, optional)_ | Mobile Safari | Secondary |

---

## Out of Scope (per STATE.md deferred items — explicitly NOT in v2.2)

These are deferred per `.planning/STATE.md` L99-101 and are **not** required
to PASS for this UAT to close CLOCK-04:

- **S2 Android Chrome wake-lock UAT** — deferred to a future milestone.
- **iOS standalone-PWA Wake Lock < 18.4** — deferred (Phase 5.1 ground rules).
- **iOS Pitfall 6 — phone-call interrupted state** — deferred (covered by the
  Phase 5.1 morphing-MuteToggle recovery affordance; not tested here).

---

## Scenarios

Each scenario assumes:

1. The operator opens the deployed v2.2-or-later HRV app in Mobile Safari.
2. The operator starts from a clean idle state (no in-progress session).
3. PASS / FAIL is marked at the bottom of the scenario.

Mark **PASS** only if all stated PASS criteria hold AND no FAIL criteria fire.

---

### Scenario (a) — HRV breathing: short lock/unlock mid-session

**Goal.** Verify the core CLOCK-04 invariant for HRV.

**Steps.**

1. Select Practice = Resonant HRV; pick default settings (bpm 5.5 / ratio 40:60 / duration 10 min).
2. Tap Start; let the lead-in complete and the session enter running.
3. Watch the In/Out cycle for ~15 seconds to establish the baseline visual + audio rhythm.
4. Lock the device (press the side/power button — display sleeps; audio session continues).
5. Wait at least 30 seconds (do not interact).
6. Unlock the device (Face ID / Touch ID / passcode).
7. Observe audio + breathing animation immediately on resume.

**PASS criteria.**

- Audio continues at the same phase boundary it would have hit had the session never been locked.
- Breathing orb animation does not visibly "burst forward" — the orb's current radius matches what the audio is doing (e.g., audio playing "In" cue ↔ orb expanding).
- No perceptual mismatch between the breathing orb and the cue tone (the user does not feel "out of phase" with the audio).
- Session elapsed counter (if visible) reflects the AC-time elapsed (NOT 30 sec of wall time skipped during lock).

**FAIL criteria.**

- Animation bursts ahead to catch up wall time.
- Audio drifts ahead of animation (cue plays before orb completes the previous phase).
- Audio drifts behind animation (orb completes a phase before the cue fires).
- Audio fails to resume at all on unlock (this triggers the Phase 5.1 affordance — see scenario (f)).

**Result:** `[ ] PASS  [ ] FAIL`

**Notes:** _(operator writes observation)_

---

### Scenario (b) — Stretch: short lock/unlock mid-session

**Goal.** Verify CLOCK-04 for Stretch sessions; confirm `stretchRamp` continuity (D-09) across lock/unlock.

**Steps.**

1. Select Practice = Stretch; pick a stretch profile that has a visible BPM ramp (e.g., initial 5 → target 6, 10-min ramp).
2. Tap Start; let the lead-in complete and the session enter running.
3. Wait ~30 seconds into the warm-up so the ramp position has measurably advanced.
4. Lock the device. Wait at least 30 seconds.
5. Unlock the device.
6. Observe audio + animation immediately on resume.

**PASS criteria.**

- Audio resumes in phase (as scenario (a)).
- Stretch BPM is at the position it would have been at the AC-time when locked — NOT advanced by the wall-time of the lock (D-09: stretch ramp position rides AC-time).
- No visible animation burst.

**FAIL criteria.**

- Stretch BPM jumps forward by approximately the lock duration (would indicate ramp uses wall time).
- Any mismatch between orb and cue (as scenario (a)).

**Result:** `[ ] PASS  [ ] FAIL`

**Notes:**

---

### Scenario (c) — Navi Kriya: short lock/unlock mid-session

**Goal.** Verify CLOCK-04 for Navi Kriya AND that the stats rebase (Plan 51-03) excludes the lock duration from recorded `elapsedMs`.

**Steps.**

1. Select Practice = Navi Kriya; pick default settings (8 front-count, medium OM length, 1 round).
2. Tap Start; let the session enter running.
3. Wait ~20 seconds.
4. Lock the device. Wait at least 30 seconds.
5. Unlock the device.
6. Observe audio + animation immediately on resume.
7. Allow the session to complete naturally.
8. Open the local stats view (if exposed) or check the most-recent recorded Navi session in storage.

**PASS criteria.**

- Audio + animation resume in phase (as scenario (a)).
- The recorded session duration (`elapsedMs` in storage) does NOT include the 30+ sec of wall time during the lock — the stats reflect AC-time elapsed only.
- The cadence (OM rhythm) is preserved across the lock event.

**FAIL criteria.**

- Stats duration includes the lock interval (would indicate D-08 wiring broken — Plan 51-03 stats rebase failed).
- Any mismatch between cadence and animation (as scenario (a)).

**Result:** `[ ] PASS  [ ] FAIL`

**Notes:**

---

### Scenario (d) — Long lock test

**Goal.** Stress CLOCK-04 with a long lock duration. Mirrors the realistic user behavior of locking the phone, putting it in a pocket, and returning minutes later.

**Steps.**

1. Start any practice (Resonant HRV recommended). Default settings, 10-min duration.
2. Wait until the session is well into running (~30 seconds in).
3. Lock the device. Wait at least **5 minutes**.
4. Unlock the device.
5. Observe audio + animation immediately on resume.

**PASS criteria.**

- Session is still running (NOT auto-completed by wall-time advance — verifies B2 architectural invariant on real device).
- Audio + animation resume in phase.
- Session elapsed counter reflects AC-time (~30 sec + however much AC-time advanced during lock if iOS kept the AC alive, OR the same ~30 sec if iOS fully suspended the AC).

**FAIL criteria.**

- Session has auto-completed before the user unlocked (would indicate wall-time leaked into elapsed math — failed architectural prereq).
- Audio fails to resume (triggers scenario (f) recovery affordance — that's the correct behavior, just note it).
- Animation bursts forward by 5+ minutes (would indicate elapsed pulled from wall time).

**Result:** `[ ] PASS  [ ] FAIL`

**Notes:**

---

### Scenario (e) — Brief lock test

**Goal.** Verify the optimistic visibilitychange resume path at `useAudioCues.ts:249-262` still works for very short locks. This is the "glance at the lock screen" case.

**Steps.**

1. Start any practice. Default settings.
2. Wait until the session is well into running (~10 seconds in).
3. Lock the device. Wait **less than 5 seconds**.
4. Unlock the device immediately.
5. Observe audio + animation.

**PASS criteria.**

- Audio resumes near-instantly (within ~250ms of unlock).
- Animation resumes in phase.
- The morphing MuteToggle / `audioStatus === 'needs-resume'` recovery affordance does NOT appear (iOS did not kill the AC for a sub-5-second lock).

**FAIL criteria.**

- Audio takes more than ~1 sec to resume.
- The recovery affordance appears for a brief lock (would indicate the
  optimistic visibilitychange path regressed).

**Result:** `[ ] PASS  [ ] FAIL`

**Notes:**

---

### Scenario (f) — Long-lock recovery affordance (Phase 5.1 preservation)

**Goal.** Verify that when iOS fully kills the AC after a long lock, the morphing `MuteToggle` recovery affordance still appears AND that the session-clock reanchor (D-10/D-11) preserves the pre-lock elapsed across the AC-recovery cycle.

This scenario specifically tests the **interaction** between the Phase 5.1
recovery affordance (preserved verbatim in Plan 51-02 Task 2) and the new
Phase 51 reanchor flow. Without the reanchor, the user would see the
session restart from elapsed=0 after the AC-recovery; with the reanchor,
the user sees the session continue from where they left off.

**Steps.**

1. Start Resonant HRV. Default settings, 10-min duration.
2. Wait until the session is well into running (~60 seconds in). Note the
   visible elapsed at this point (e.g., "01:00").
3. Lock the device. Wait long enough that iOS reliably kills the AudioContext
   (typically 10+ minutes, but may vary by device / iOS version). For older
   devices, 5 minutes is often enough; for newer devices, leave it longer.
4. Unlock the device.
5. Observe:
   - The morphing `MuteToggle` may now show a recovery affordance (indicating
     `audioStatus === 'needs-resume'`).
   - The breathing orb may continue animating silently, OR pause and wait
     for the user to tap the recovery affordance.
6. Tap the recovery affordance to trigger AC reconstruction (Phase 5.1 flow).
7. Observe audio + animation post-reconstruction.

**PASS criteria.**

- Audio resumes cleanly post-reconstruction.
- Visible session elapsed reflects the pre-lock elapsed PLUS however much
  time has passed since (it does NOT reset to 00:00 — verifies the D-10/D-11
  reanchor preserved elapsed across the AC swap).
- Cycle phase + cue alignment is preserved post-reconstruction.

**FAIL criteria.**

- Recovery affordance does not appear when expected (Phase 5.1 regression).
- Session elapsed resets to 00:00 after AC reconstruction (D-10/D-11 reanchor
  failed — the controller did not call `session.reanchorSessionClock(newClockNow)`,
  OR the engine math is broken).
- Audio fails to resume even after tapping the recovery affordance (Phase 5.1
  regression).

**Result:** `[ ] PASS  [ ] FAIL`

**Notes:**

---

### Scenario (g) — Foreground long-run smoke (CLOCK-05 real-device confirmation)

**Goal.** Confirm CLOCK-05 on a real device. Plan 51-04 B7 proves this
deterministically in jsdom; this is the real-hardware version.

**Steps.**

1. Start Resonant HRV. Default settings or 5-min duration.
2. Set the device down (do NOT lock; keep the screen on — disable auto-lock
   in iOS Settings → Display & Brightness → Auto-Lock = Never, then restore
   afterward).
3. Watch (or periodically glance at) the session for at least **5 minutes**.
4. Observe audio + animation throughout the run.

**PASS criteria.**

- Audio and animation stay in phase for the entire 5 minutes.
- No visible drift accumulates (the orb's expansion peaks align with the
  "In" cue throughout).
- Session completes (or progresses normally) without unexpected pauses or skips.

**FAIL criteria.**

- Visible drift accumulates over the 5 minutes (would indicate CLOCK-05
  architectural failure — the foreground no-drift guarantee is not holding).
- Audio + animation desynchronize without any lock event triggering it.

**Result:** `[ ] PASS  [ ] FAIL`

**Notes:**

---

## Aggregate UAT Result

After completing all 7 scenarios, summarize below.

**Total scenarios:** 7
**Passed:** _____
**Failed:** _____

**Overall UAT verdict:** `[ ] ALL PASS  [ ] FAILURES`

### If "ALL PASS"

Reply to the operator confirmation checkpoint with `all UAT pass` or `approved`.
This closes CLOCK-04 and confirms ROADMAP Phase 51 Success Criteria #1–#4
against a real iOS device.

### If "FAILURES"

Reply to the operator confirmation checkpoint with:

```
UAT failures: <comma-separated scenario letters>
```

(e.g., `UAT failures: a, d, f`).

This routes into the gap-closure workflow via `/gsd:plan-phase 51 --gaps`,
which reads the recorded failures from this UAT + the Plan 51-05 SUMMARY +
the Phase 51 VERIFICATION to plan fix work.

---

## Operator Notes Section

_(free-form space for the operator to record any observations, device state
oddities, or behavior not covered by the explicit scenarios above)_

