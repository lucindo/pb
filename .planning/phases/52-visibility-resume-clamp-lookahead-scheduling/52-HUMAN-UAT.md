---
status: issues_found
phase: 52-visibility-resume-clamp-lookahead-scheduling
source: [52-VERIFICATION.md]
started: 2026-05-29T01:21:22Z
updated: 2026-05-29T01:25:00Z
---

## Current Test

[testing complete — 2 issues found]

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
issues: 2
pending: 0
skipped: 0
blocked: 0

## Gaps

### GAP-52H-1 — Animation/audio desync on short-background resume (+ doubled audio)
status: failed
source_test: 1
observed: After backgrounding the tab < 6s and returning, the breathing animation resumes from the frozen position (clamp suppressed the burst) but remains out of sync with the audio, which progressed on the lookahead queue; the two clocks never re-converge. Audio also sounds doubled around the resume.
hypothesis: The per-tick clamp (SCHED-01) suppresses the visual catch-up but no reanchor/resync brings the animation clock back onto the audio (master) clock — so visual and audio drift apart for the short-hidden case. The "doubled audio" may be a resume-path re-dispatch / stale-cue replay distinct from (or compounding) the steady-state boundary flam (GAP-52H-2). Needs diagnosis: is the dual-anchor invariant (Phase 51 master-clock) being re-established on the clamped resume path, or does the clamp short-circuit the reanchor?
relates_to: SCHED-01 clamp; Phase 51 master-clock dual-anchor invariant

### GAP-52H-2 — Audible boundary flam (M-1 / CR-01 residual / REVIEW WR-01)
status: failed
source_test: 4
observed: A small audible tick (double-strike) on every inhale↔exhale boundary in normal foreground playback.
hypothesis: The single-tick rAF-lag double-strike that Plan 06 left as an "accepted ~5ms residual" (dispatch-site filter removed in ef46606) is in fact perceptible. The post-fix code review (52-REVIEW.md, WR-01) prescribes a reconstruction-safe engine-layer dedup in topUpLookahead: compare the unclamped requested cue.audioTime against existing activeCues.scheduledAt within a SAFE_LEAD_SEC epsilon; no-op after reconstruction because activeCues starts empty. REVIEW WR-02 (`>` → `>=` at targetSec) should be folded in.
relates_to: M-1, CR-01, REVIEW WR-01, REVIEW WR-02
