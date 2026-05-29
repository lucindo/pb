---
status: issues_found
phase: 52-visibility-resume-clamp-lookahead-scheduling
source: [52-VERIFICATION.md]
started: 2026-05-29T01:21:22Z
updated: 2026-05-29T01:25:00Z
---

## Current Test

[testing complete — both issues RESOLVED 2026-05-29 (Phase 54)]

## Tests

### 1. Tab background audio continuity (short window)
expected: Background tab mid-session for < 6 seconds; return to foreground — breathing animation resumes without racing (clamp suppresses burst); audio has played without interruption. Note: if boundary timing is very tight (rAF fires within ~50ms of boundary), there may be a barely-audible ~5ms flam on the first cue after the boundary nearest to the tab-switch.
result: issue — On return from a <6s background, the breathing animation resumes from where it was frozen (clamp correctly suppresses the visual catch-up burst) but then stays OUT OF SYNC with the audio, which advanced via the lookahead queue. The two clocks do not re-converge. Audio additionally sounds like it is "playing twice" (doubled) on/around the resume.

### 2. Tab background indefinitely — clean stop
expected: Background tab indefinitely; after ~6s lookahead exhausts, audio stops cleanly. Return to foreground — breathing is silent until next phase boundary, then audio resumes. No garbled or partial-attack output after resumption.
result: passed

### 3. Mute during active session with lookahead queue
expected: Press mute mid-session — audio silences within one rAF tick; no queued cues fire after mute. Unmute — audio stays silent until next phase boundary, then resumes with a fresh cue (D-10 unmute-waits-for-boundary). In-flight cue fades gracefully.
result: passed

### 4. Boundary flam assessment (optional quality check)
expected: At a phase boundary, exactly one bowl strike fires with a single clean attack. If a ~5ms flam is audible (two overlapping strikes separated by ~5ms), the accepted residual is confirmed and WR-01 / engine-layer dedup should be prioritized.
result: issue — Audible "small tick" on every in/out (inhale↔exhale) phase change in steady-state foreground playback. Confirms the M-1 ~5ms boundary flam is perceptible (not just a tight-timing edge case). WR-01 engine-layer dedup is warranted.

## Summary

total: 4
passed: 2
issues: 0 (2 resolved 2026-05-29)
pending: 0
skipped: 0
blocked: 0

## Gaps

### GAP-52H-1 — Animation/audio desync on short-background resume (+ doubled audio)
status: RESOLVED — operator-verified working on device (2026-05-29)
resolution (2026-05-29): Fixed by the Phase 54 rework (commits eeda95d + 9a866d0): removed the SCHED-01 clamp so the orb tracks true audio time and snaps to the live position on resume; added a Web Worker heartbeat so cue top-up survives a backgrounded desktop tab (audio no longer dies after ~6s); in-flight boundary-cue dedup kills the doubled/flam strike. Operator confirmed working on device.
source_test: 1
observed: After backgrounding the tab < 6s and returning, the breathing animation resumes from the frozen position (clamp suppressed the burst) but remains out of sync with the audio, which progressed on the lookahead queue; the two clocks never re-converge. Audio also sounds doubled around the resume.
root_finding (2026-05-28, debug session + operator clarification): This is NOT a Phase-52-patchable bug. It is a symptom of a requirements gap. Phase 52's clamp (D-07) deliberately FREEZES the visual clock on resume (practice-time semantics), while the lookahead keeps audio advancing in real time — so they are desynced BY DESIGN with no reconvergence path. More fundamentally, the operator's ACTUAL requirement is full-session (hours) background audio continuity on DESKTOP (see Phase 52 SC#2 "audio stops cleanly after lookahead" — that accepted criterion is WRONG vs. the real requirement). The ~6s rAF-driven lookahead architecturally cannot deliver this (rAF freezes when the tab is hidden → top-up loop dies → queue drains → silence). A patch fix was attempted this session and REVERTED (it re-anchored audio onto the frozen visual → audible cycle-restart; commit bae8aec hard-reset out). The correct resolution is a re-architecture (rAF-independent / Web Worker-driven top-up) tracked as a NEW phase, with platform-split behavior (desktop = indefinite background continuity; mobile = installed focused PWA, screen-on). See ROADMAP "Phase 54" and memory project_background_audio_full_session.
relates_to: SCHED-01 clamp; Phase 51 master-clock dual-anchor invariant; ROADMAP Phase 52 SC#1/SC#2 (requirements correction); new background-continuity phase

### GAP-52H-2 — Audible boundary flam (M-1 / CR-01 residual / REVIEW WR-01)
status: RESOLVED — operator-verified working on device (2026-05-29)
source_test: 4
observed: A small audible tick (double-strike) on every inhale↔exhale boundary in normal foreground playback.
resolution (2026-05-29, commit eeda95d): engine-layer dedup in topUpLookahead per REVIEW WR-01 — skip a requested cue whose unclamped audioTime is within SAFE_LEAD_SEC of an IN-FLIGHT cue's scheduledAt (in-flight only, so future cues stay the caller's cancel-then-reschedule responsibility). One clean strike per boundary. Operator confirmed working on device.
relates_to: M-1, CR-01, REVIEW WR-01
