---
phase: 05-mobile-hands-off-resilience
plan: 04
status: partial
signed_off: false
gating_gap: S2 (Android Chrome real-device coverage)
build_commit: 9d11af8
deployed_url: https://lucindo.github.io/hrv/
tested_on: 2026-05-10
tested_by: Renato Lucindo
---

# Phase 5 Manual UAT Log

## Status: PARTIAL — 4/5 mandatory scenarios PASS, S2 documented gap

Phase 5 wake-lock implementation passes all run scenarios (S1, S3, S4, S5).
S2 (Android Chrome real-device) skipped — no Android device available at
test time. Plan 05-04 acceptance criteria requires ≥1 Android Chrome
device for Scenarios 1–3 cross-platform coverage; that line item is the
remaining open gap for formal Phase 5 sign-off.

## Test Environment

| Field | Value |
|-------|-------|
| App build commit | `9d11af8` |
| Deployed URL | https://lucindo.github.io/hrv/ |
| Tested by | Renato Lucindo |
| Date | 2026-05-10 |

## Scenario Results

| # | Device / Browser | Scenario | Result | Notes |
|---|------------------|----------|--------|-------|
| 1 | iPhone Xs Max, iOS 18.7.8, Safari | 10-min timed session keeps screen awake (ROADMAP SC2) | PASS | Auto-Lock set to 30s; screen stayed awake full 10 min; "Session complete" reached. After session ended, OS auto-lock kicked in ~30s later as expected (D-07 release-on-end working). |
| 2 | _no Android device available_ | 10-min timed session keeps screen awake on Android Chrome (ROADMAP SC2) | SKIP | **Gating gap — see Gaps section.** Acceptance requires ≥1 Android Chrome device for cross-platform coverage. |
| 3 | iPhone Xs Max, iOS 18.7.8, Safari | Lock 30s → unlock → screen awake 1 min (D-03) | PASS (with adjacent bug) | Wake lock re-acquired after unlock; screen stayed awake 1 min. **However, audio guidance broken after unlock — see "Out-of-scope findings" #2.** |
| 4 | Desktop Firefox 126+ | Zero console errors, zero wake-lock UI (D-09 / D-10 / D-12) | PASS | No console errors; no Wake Lock-related warnings; no user-visible UI references wake lock. Optional `dom.screenwakelock.enabled=false` sub-step not run. |
| 5 | Desktop (Safari) | Visual sweep across 5+ states — zero wake-lock UI (D-12) | PASS | All states scanned: idle, lead-in, running, end-modal, complete. Zero text/icon references to wake lock, screen, awake, stay-on. Codebase grep confirmed: only matches are hook impl + comments, no rendered UI strings. |
| 6 | _not run_ | Battery-low / power-saver-on path | SKIPPED | Per `05-VALIDATION.md` Manual-Only Verifications acceptability — hook treats revocation as silent absorption via same code path as any rejection (test-covered in Plan 02). |

## Gaps

### Gap 1 — S2 Android Chrome coverage missing (gating)

- **Scenario:** S2 (`05-04-PLAN.md` Scenario 2 — Android Chrome 10-min screen-awake)
- **Observed:** Not run — no Android device available
- **Expected:** ≥1 Android Chrome ≥85 device runs the same 10-min hands-off test as S1 and screen stays awake
- **Acceptance impact:** Plan 04 acceptance line "At minimum, ONE iOS Safari device AND ONE Android Chrome device are recorded for Scenarios 1–3 (real cross-platform coverage)" not satisfied
- **Suspected cause:** N/A — implementation should work (Wake Lock API supported in Chrome ≥85), but unverified on real Android hardware
- **Recommended remediation:** Source any Android device (borrow, second-hand, BrowserStack, friend's phone) and run S2 + S3 cycle; on PASS, append to this log and flip `status: signed_off`. Until then, Phase 5 should NOT be marked complete in ROADMAP for SC2.

## Out-of-Scope Findings (NOT Phase 5 wake-lock gates — informational)

### Finding 1 — Safari desktop: breathing-orb max-scale doesn't reach outer ring boundary

- **Scope:** Phase 2 / 3 visual styling — NOT Phase 5
- **Browser:** Safari desktop (version not captured)
- **Symptom:** At peak "In" (orbScale = MAX_SCALE = 1.0), inner aqua orb does not visually meet the dashed outer guide ring; visible gap remains. On Chromium the orb fills exactly to the ring.
- **Mechanism (suspected):** `transform: scale(1.0)` on `.orb` (`src/components/BreathingShape.tsx:88`) vs `inset-0` outer ring (`src/components/BreathingShape.tsx:70`). Likely sub-pixel rounding or border-box vs content-box discrepancy between Safari and Chromium. The animated element and reference ring should be coincident at scale 1.0 but Safari renders them with a visible margin.
- **Reproducibility:** Screenshot captured at peak In transition (`/Users/lucindo/Desktop/Screenshot 2026-05-10 at 12.00.15.png`)
- **Severity:** Cosmetic — animation still conveys breath cadence correctly
- **Recommended:** Backlog item for visual fidelity polish; investigate `border-box` sizing on `.orb-ring--outer` and explicit width match against the orb's max bounding box.

### Finding 2 — iOS Safari: AudioContext silent after screen-lock/unlock cycle (Phase 5-adjacent gap)

- **Scope:** Phase 3 audio + Phase 5 hands-off promise — NOT covered by Phase 5 wake-lock spec but undermines Phase 5 user value
- **Device:** iPhone Xs Max, iOS 18.7.8, Safari
- **Symptom:**
  1. Start session, audio playing normally
  2. Lock phone (power button), wait 30s, unlock
  3. Wake lock re-acquired (S3 PASS) — screen stays awake
  4. **Audio NEVER resumes.** Mute toggle off → on cycle has no effect. Only `End session` + `Start session` (full re-init) restores audio.
- **Mechanism (suspected):** iOS Safari suspends AudioContext on display sleep / page hidden. Phase 3 `audioStart` initializes the context on the start gesture but there is no `visibilitychange → visible` re-resume path mirroring what `useWakeLock` does (D-03). The context stays suspended until a fresh user gesture in a freshly-mounted audio session re-creates it.
- **Severity:** **HIGH for Phase 5 user value.** Phase 5's whole promise is "hands-off resilience across mobile lock cycles." The screen stays awake but the user-meaningful guidance (audio cues) silently breaks on the very scenario the phase exists to support.
- **Recommended remediation:** Plan a follow-up phase (Phase 5.5 or Phase 6 prerequisite) that adds an AudioContext resume path on `visibilitychange → visible`, conditional on `state.status === 'running'`. Mirror the structure of `useWakeLock`'s re-acquire — ref-gated, idempotent, silent-fallback on rejection.
- **Cross-reference:** RESEARCH "Validation Architecture → Browser-Specific Holes" notes jsdom can't exercise the real iOS suspend semantics — this finding is exactly the class of bug that section warned would only surface on real hardware.

## Tester Signature

Tested by: Renato Lucindo
Date: 2026-05-10
App build: `9d11af8` (deployed at https://lucindo.github.io/hrv/)

## Phase 5 Acceptance Disposition

**NOT formally complete.** Resolve Gap 1 (S2 Android Chrome) before
flipping ROADMAP SC2 to PASS. Findings 1 and 2 are tracked as
out-of-scope follow-ups; they do not block Phase 5 wake-lock acceptance
but Finding 2 should be triaged for a follow-up phase before v1 ship.

When Gap 1 is closed, replace the gating-gap line in this log's
frontmatter with `signed_off: true` and re-run `/gsd-verify-work 05`.
