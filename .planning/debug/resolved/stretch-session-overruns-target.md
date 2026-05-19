---
status: resolved
trigger: "stretch-session-overruns-target — 5/5/5 stretch session runs ~3s long; in-session REMAINING shows 15:03 while Settings Duration rounds to 15 min"
created: 2026-05-19T00:00:00Z
updated: 2026-05-19T04:00:00Z
---

## Current Focus

hypothesis: The 15:03 overrun is a GENUINE engine overrun (not a display bug). buildStretchSegments snaps every segment to a whole number of its own cycles; the snapped cycle counts do not sum back to the requested 15:00, so the engine actually runs the session to endMs=903220ms. The 34-07 Math.round only re-hides this on the Settings readout.
test: Replicated buildStretchSegments arithmetic for 5/5/5, initialBpm 5.5, targetBpm 4.5, ratio 40:60.
expecting: If segment cycle-snapping accumulates a non-zero residual, the final endMs > 900000ms.
next_action: Investigation CONFIRMED — diagnosis returned to caller.

## Symptoms

expected: A 5m/5m/5m stretch session runs for exactly 15:00; the in-session REMAINING countdown agrees with the Settings panel Duration readout.
actual: In-session REMAINING shows 15:03 for warm-up 5 / ramp 5 / cool-down 5. The Settings panel rounds the same total to "15 min" via the 34-07 Math.round fix, so the live countdown and the Settings display disagree, and the session overruns the requested 15:00.
errors: None reported.
reproduction: Test 4 in UAT — start a stretch session with default-ish 5/5/5 segment minutes and observe the STATUS panel REMAINING field.
started: Discovered during UAT for Phase 34. Likely introduced by plan 34-06 (commit fce4f24) changing computeStretchTotalMs to return the cycle-aligned segment table's final endMs.

## Eliminated

- hypothesis: The two displays disagree because they read different totals.
  evidence: Both the in-session REMAINING (getStretchFrame remainingMs) and the Settings Duration readout (computeStretchTotalMs) read the SAME value — segments.at(-1).endMs of the snapped table. Since commit fce4f24 they are consistent. The apparent disagreement is only because the Settings readout applies Math.round(total/60_000) (34-07), which rounds 15.05 min to "15 min" while the countdown shows raw mm:ss 15:03.
  timestamp: 2026-05-19T00:00:00Z

## Evidence

- timestamp: 2026-05-19T00:00:00Z
  checked: buildStretchSegments arithmetic for default 5/5/5 (initialBpm 5.5, targetBpm 4.5, ratio 40:60), replicated in Node.
  found: |
    Segment table built:
    - warm-up: cycleMs 10909.091 (5.5 BPM), requested 300000ms, snapped to 27 cycles = 294545.5ms (UNDER by 5454.5ms)
    - ramp step 1: 5.5 BPM, requested 100000ms, 9 cycles = 98181.8ms
    - ramp step 2: 5.167 BPM, cycleMs 11612.903, requested 100000ms, 9 cycles = 104516.1ms
    - ramp step 3: 4.833 BPM, cycleMs 12413.793, requested 100000ms, 8 cycles = 99310.3ms
    - cool-down: 4.5 BPM, cycleMs 13333.333, requested 300000ms, snapped to 23 cycles = 306666.7ms (OVER by 6666.7ms)
    TOTAL endMs = 903220.4ms = 15:03.22. Requested 900000ms (15:00). Overrun = +3220.4ms.
  implication: The overrun is real engine behavior. The session genuinely runs 15:03. Each segment's Math.round(requestedMs/cycleMs) rounds independently — warm-up rounds down (-5.5s), cool-down rounds up (+6.7s), ramp steps net slightly positive — the residuals do NOT cancel and sum to +3.2s.

- timestamp: 2026-05-19T00:00:00Z
  checked: git history of computeStretchTotalMs (commit fce4f24, plan 34-06).
  found: |
    Before fce4f24, computeStretchTotalMs returned the raw algebraic sum:
      (warmUpMinutes + rampDurationMinutes + coolDownMinutes) * 60_000  ->  exactly 900000ms.
    fce4f24 ("CR-01 — derive computeStretchTotalMs from snapped segment table") changed it to:
      buildStretchSegments(settings).at(-1)!.endMs  ->  903220ms.
    The commit message states the intent: make the Settings Duration agree with the elapsed time at
    which getStretchFrame reports isComplete (which has ALWAYS read the snapped table — see dc04959,
    "derive stretch completion from the segment table, not algebraic total").
  implication: |
    Before 34-06: Settings showed 15:00 (algebraic) but the engine still ran to ~15:03 (snapped table).
    That was a Settings-vs-engine disagreement. 34-06 fixed THAT by aligning the Settings readout to
    the engine's true end. The cost: the Settings Duration now reflects the snapped 15:03 reality.
    34-07 then layered Math.round on the readout (15.05 -> "15 min"), which superficially re-creates a
    Settings("15 min")-vs-countdown(15:03) mismatch — but underneath, both now agree on 903220ms.

- timestamp: 2026-05-19T00:00:00Z
  checked: Settings readout formatting — src/components/SettingsForm.tsx:86-89; in-session readout — src/components/SessionReadout.tsx:131.
  found: |
    SettingsForm: stretchTotalMs = computeStretchTotalMs(stretchSettings)  // 903220
                  stretchDurationText = `${Math.round(stretchTotalMs / 60_000)} ${minutesUnit}`  // Math.round(15.05) = "15 min"
    SessionReadout: timeValue = formatDuration(frame.remainingMs ?? frame.elapsedMs)  // raw mm:ss -> "15:03" at start
  implication: Same underlying number (903220ms), two different display precisions — whole-minute rounded vs mm:ss. The "disagreement" the UAT reports is a precision/formatting artifact, not two different totals.

## Resolution

root_cause: |
  GENUINE engine overrun, surfaced (not caused) by a display-precision mismatch.

  buildStretchSegments snaps EACH segment's duration to a whole number of that segment's own
  breathing cycles (Math.round(requestedMs / cycleMs) * cycleMs) so BPM only ever steps on an
  Out->In cycle boundary. Because every segment runs at a different BPM (different cycleMs), the
  per-segment rounding residuals are independent and do NOT cancel. For the default 5/5/5 session
  (initialBpm 5.5 -> targetBpm 4.5, ratio 40:60) they sum to +3220ms: the session genuinely runs
  15:03, not 15:00.

  The engine has always behaved this way (segment-snapping predates Phase 34; getStretchFrame's
  isComplete/remainingMs have read the snapped table since dc04959). What changed in plan 34-06
  (commit fce4f24) is that computeStretchTotalMs — the Settings-panel Duration source — was
  switched from the algebraic whole-minute sum to the snapped table's final endMs. That was a
  deliberate consistency fix: it made the Settings Duration match the engine's true completion
  time. The 34-07 Math.round on the SettingsForm readout then rounds the snapped 15.05 min back
  to "15 min", so the Settings panel and the raw mm:ss live countdown DISPLAY different strings
  ("15 min" vs "15:03") even though both derive from the identical 903220ms value.

  Design tension: whole-cycle alignment (every segment boundary on an Out->In transition, so BPM
  never steps mid-breath) is fundamentally incompatible with hitting an exact whole-minute total,
  because cycle lengths (10.9s..13.3s here) do not evenly divide 60s. You can honor the requested
  minute total OR honor whole-cycle boundaries, not both. The codebase chose whole-cycle
  alignment as the source of truth and accepted that the realized total drifts a few seconds
  from the requested minutes.

  This is a one-of-two-bugs report: the SECOND UAT issue (orb freezing mid-cycle at countdown
  zero) is a separate defect tracked as its own STATE.md gap and is out of scope here.

fix: |
  Diagnose-only mode — no fix applied. Fix DIRECTION (for the planning phase): pick one of two
  reconciliation strategies, not both.

  Option A (recommended) — Make the engine honor the requested whole-minute total. Add a final
  correction so the realized total equals the requested total: e.g. let the cool-down (the last
  bounded segment) absorb the residual by snapping its cycle count to whatever lands closest to
  the remaining requested ms after the warm-up + ramp segments are placed — or distribute the
  residual across segments. Whole-cycle alignment is kept for every internal BPM step; only the
  realized total is corrected to the minute target.

  Option B — Accept the snapped total as truth and make the displays honest about it. Drop the
  Math.round in SettingsForm.tsx:89 and show mm:ss like the countdown, so the Settings panel
  reads "15:03" and matches the live countdown exactly. This removes the display disagreement
  but the session still overruns the user's requested 15:00 by ~3s.

  Recommendation: Option A — the UAT truth statement is "runs for exactly 15:00", so a
  display-only fix (Option B) does not satisfy it. The minute total is the user-facing contract;
  cycle alignment is an internal implementation guarantee.

verification: Not applicable — diagnose-only mode.
files_changed: []
