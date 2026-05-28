# Phase 52: Visibility-resume clamp + lookahead scheduling - Discussion Log

> **Audit trail only.** Do not use as input to planning, research, or execution agents.
> Decisions captured in CONTEXT.md — this log preserves the analysis.

**Date:** 2026-05-28
**Phase:** 52-visibility-resume-clamp-lookahead-scheduling
**Mode:** discuss (default — single-question turns per area)
**Areas selected by user:** Lookahead window + low-BPM floor; Clamp threshold + semantics; Cancel + reschedule on mid-session change; Background indefinite tail

## Area 1: Lookahead window + low-BPM floor

### Q1 — How should the lookahead window be sized?
- A: **Hybrid: seconds + cue floor (Recommended)** ← chosen
  - Seconds budget AND minimum N cues regardless. Handles 1 BPM (60s/cue) without 0-cue starvation at the top of the seconds range.
- B: Fixed seconds only — at 1 BPM degenerates to current boundary-driven behavior.
- C: Fixed N cues only — robust at low BPM but wasteful at high BPM, harder cancel-on-settings-change.

### Q2 — What lookahead window in seconds?
- A: **6 seconds (Recommended)** ← chosen
  - Middle of ROADMAP 5–10s band; survives brief tab-switches at any BPM ≥3.
- B: 8 seconds — marginal benefit; same as 6s after floor activates.
- C: 10 seconds — top of band; more overlap with cancel-and-reschedule cost.

### Q3 — Minimum cue floor?
- A: **2 cues ahead (Recommended)** ← chosen
  - Always queue next-cue + cue-after. Survives brief tab-switch at any BPM. Cancel cost = at most 2 oscillator stops.
- B: 1 cue ahead — matches current depth; may be too thin for hidden-window success criterion.
- C: 4 cues ahead — more resilient but ~4 minutes queued at 1 BPM; higher cancel cost.

### Q4 — When does the top-up fire?
- A: **rAF tick (Recommended)** ← chosen
  - Naturally aligns with existing rAF in useSessionEngine.ts:163. Paused while hidden; on foreground rAF resumes → top-up re-fills. Plus an AC statechange===running listener forces a top-up on AC reconstruction/resume.
- B: Phase-boundary effect only — simpler diff but loses mid-phase top-up.
- C: setInterval driver — browsers throttle to ~1Hz when hidden anyway; only adds complexity.

## Area 2: Clamp threshold + semantics

### Q1 — What triggers the per-tick clamp?
- A: **Always cap delta to a hard ceiling (Recommended)** ← chosen
  - Every rAF tick: `delta = min(clock.now() - lastClockNow, MAX_TICK_DELTA_SEC)`. No state tracking; foreground frames at ~16ms pass through unchanged.
- B: Edge-trigger on visibilitychange — narrower coverage, doesn't catch DevTools/OS throttling.
- C: Threshold-only clamp — adds conditional with no behavior difference in practice.

### Q2 — What's the ceiling value?
- A: **0.1s = 100ms (Recommended)** ← chosen
  - Tight enough that 60→6fps drop passes through (100ms = 6×16.67ms). Catches anything beyond as hidden-window resumption.
- B: 0.25s = 250ms — slightly more graceful for foreground dips; marginal benefit.
- C: One phase duration (dynamic) — at 1 BPM ceiling is 30-50s, essentially no clamp. Defeats the goal.

### Q3 — Clamp semantics when delta is discarded?
- A: **Rebase sessionStartCtxTime forward (Recommended)** ← chosen
  - Advance sessionStartCtxTime by (raw_delta − 0.1s). Hidden time NOT counted toward session duration. Mirrors Phase 51 D-07/D-08 practice-time semantics across iOS lock + desktop tab-hide.
- B: Cap visible delta, let elapsed catch up gradually — 30s hide takes ~5s of frames to catch up; inconsistent with iOS lock.
- C: Cap visible delta, accept elapsed jumps — defeats the point of the clamp.

### Q4 — On AC reanchor (Phase 51 D-10/D-11), how does the clamp handle the time-base jump?
- A: **Reset lastClockNow inside reanchorSessionClock (Recommended)** ← chosen
  - Set lastClockNow = newClockNow synchronously when reanchorSessionClock fires. Next rAF tick computes delta against new clock base; clamp sees small delta. No special-case in clamp code.
- B: Detect negative/large delta — conflates reanchor with bug states.
- C: Generation counter — adds state for a problem option A solves at the seam.

## Area 3: Cancel + reschedule on mid-session change

### Q1 — How should queued lookahead cues be tracked + cancelled?
- A: **Extend activeCues with cancel handles (Recommended)** ← chosen
  - Each schedule() call adds cue to existing activeCues Set with stop()+disconnect() handles. Cancel iterates activeCues with startTime > now() and stops them. Reuses existing Set.
- B: Per-session master GainNode — overlaps with Phase 53; pulls Phase 53's work forward.
- C: Reschedule from sessionStartCtxTime each top-up + rebuild AC — heavy; drops audio graph on every change.

### Q2 — What does setMuted(true) do to lookahead-queued cues?
- A: **Cancel future queued + fade in-flight (Recommended)** ← chosen
  - applyMuteFadeOut on cues currently playing + stop()+disconnect() future cues. Unmute waits for next boundary; top-up re-queues from new anchor. Perceptually instant mute.
- B: Let future cues fire at mute floor — wastes nodes; conflates mute-state with envelope-state.
- C: Top-up gate on !muted only — user hears up to 6s of audio after pressing mute. Bad UX.

### Q3 — How does lookahead handle Stretch's per-cycle varying phaseDurationSec?
- A: **Walk segment table for each queued cue (Recommended)** ← chosen
  - Lookahead top-up walks buildStretchSegments(stretchSettings) from currentCycle to currentCycle+N. Each cue carries own phaseDurationSec in payload. Honors STRETCH-08 ramp accuracy.
- B: Use current phase duration for all N queued cues — accepts 1-2 cycle drift; cadence stutter on steep ramp slope.
- C: Lookahead applies to HRV only; Stretch stays boundary-driven — defeats SCHED-* for Stretch users.

## Area 4: Background indefinite tail

### Q1 — After the lookahead window exhausts in a still-hidden tab, what happens to the session state?
- A: **Session stays running; auto-resume on foreground (Recommended)** ← chosen
  - Session state remains 'running'. Clock per Phase 51 semantics. On foreground, rAF resumes → clamp + top-up handle transition. Fresh first cue ~SAFE_LEAD_SEC after return.
- B: Auto-end after N seconds of silence — surprises users with shorter sessions; conflicts with Phase 51 D-07 practice-time semantics.
- C: Hard-stop on visibility loss — conflicts with SCHED-03 "audio continues through hidden window".

### Q2 — Does Phase 52's lookahead + clamp apply to Navi Kriya?
- A: **Out of scope; NK stays as-is (Recommended)** ← chosen
  - Phase 51 D-01 already locked NK on setTimeout cadence. Per-tick clamp doesn't apply (no rAF). Lookahead would require moving NK cadence onto schedule() — bigger refactor than SCHED-* text covers.
- B: Add lookahead to NK only — ~half the lookahead work duplicated for NK.
- C: Full NK rebase + lookahead — major scope expansion; belongs in own phase.

### Q3 — How does timed-session completion interact with the lookahead queue?
- A: **Trim lookahead to targetSec; end-chord owns the tail (Recommended)** ← chosen
  - Top-up never queues a cue whose start exceeds (sessionStartCtxTime + targetSec). Queued cues already past start play envelopes; useBreathingSessionController plays end-chord (existing flow).
- B: Queue freely; cancel on completion — adds forced-cancel path on completion.
- C: Let queued cues play out after session ends — inconsistent with session ending.

## Wrap

User selected "I'm ready for context" after all four areas completed. CONTEXT.md captures the 14 locked decisions (D-01..D-14) plus Claude's Discretion bullets covering placement / interface details / test strategy.
