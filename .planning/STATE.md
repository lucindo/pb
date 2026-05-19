---
gsd_state_version: 1.0
milestone: v1.5
milestone_name: Navi Kriya Practice
status: milestone_complete
stopped_at: Phase 34 context gathered
last_updated: "2026-05-19T06:24:46.337Z"
last_activity: 2026-05-19 -- Phase 34 execution started
progress:
  total_phases: 5
  completed_phases: 5
  total_plans: 25
  completed_plans: 22
  percent: 100
---

# Project State

## Project Reference

See: .planning/PROJECT.md (updated 2026-05-18 — Phase 32 complete; v1.5 all phases done)

**Core value:** Users can start a hands-off HRV breathing session and comfortably follow accurate, uninterrupted inhale/exhale guidance through synchronized visuals and optional sound.
**Current focus:** Phase 34 — stretch-as-a-distinct-practice

## Current Position

Phase: 34
Plan: Not started
Status: Milestone complete
Last activity: 2026-05-19 - Completed quick task 260519-63b: Change the Stretch practice heading to "HRV Stretch" (pt-BR "Alongar VFC")
Progress: [██████████] 100% — 3/3 phases complete

## Performance Metrics

**Velocity (plans completed per milestone):**

- v1.0: 30 · v1.0.1: 12 · v1.1: 47 · v1.2: 8 · v1.3: 11 · v1.4: 6

**v1.5 phases (roadmap revised 2026-05-17):**

| Phase | Plans | Status |
|-------|-------|--------|
| 30. Multi-Practice Architecture & Switcher | 4/4 | Complete (2026-05-18) |
| 31. Navi Kriya Engine & Session | 6/6 | Complete (2026-05-18) |
| 32. Learn & Localization | 3/3 | Complete (2026-05-18) |

## Accumulated Context

### Roadmap Evolution

- Phase 33 added: Close gap: PRACTICE-02 — resonant settings read/write split-brain (v1.5 milestone audit gap)

### Decisions

Decisions are logged in PROJECT.md Key Decisions table.

**v1.5 blueprint (validated across 3 spikes, packaged in `spike-findings-hrv` skill):**

- A `practice` concept (`'resonant' | 'naviKriya'`) sits one level above the existing intra-practice `mode` (standard/stretch). Per-practice session settings + stats; theme/timbre/variant/cue/locale stay shared app-wide chrome.
- Adding the `practices` map + `activePractice` to the prefs envelope is a `STATE_VERSION` migration — existing single-practice users coerce into `practices.resonant` (covers PRACTICE-04).
- The practice switcher is a top segmented control above the orb, disabled during a session (spike 002 winner over bottom tab bar / launch screen).
- `src/components/SettingsDialog.tsx` mixes shared chrome and per-practice controls — it must be split (PRACTICE-05/06).
- Navi Kriya: app-paced metronome, fixed 4:1 front:back ratio (default 100/25), auto-advance, four cue sounds (front marker / back marker / per-OM tick / end chord) routed through the existing `src/audio/audioEngine.ts` + timbres. Self-rescheduling timer chain; ~700ms LEAD_MS after a marker; provisional tempo fast 1.75 / medium 2.5 / slow 4s (real ~2.16s/OM) — finalize in the build, keep adjustable. `frontCount` must stay a multiple of 4.
- Navi Kriya per-practice stats (NK-08) ship with the engine phase — a completed Navi Kriya session is what records sessions/rounds/minutes, so stats belong with "the practice works end to end" rather than as a standalone phase.

### Pending Todos

- v1.x deferred: `.orb-layer--in/--out` → `.shape-layer--in/--out` rename for naming consistency; per-variant token sets; live idle preview; additional shape variants.
- Review all app config values and defaults (HRV + Navi — every default/min/max/step) before milestone close — `.planning/todos/pending/2026-05-17-review-all-app-config-values-and-defaults.md`.

### Blockers/Concerns

- None blocking. v1.5 Navi Kriya Practice complete — all 3 phases (30–32) done, 13/13 plans.
- ⚠️ [Phase 30] Code-review CR-01 — resonant settings still persist via the legacy flat `env.settings` path; `practices.resonant.settings` is not yet the write target. Carried forward for resolution.
- ⚠️ [Phase 32] Code-review WR-01 — `practices[activePractice]` lacks a runtime guard against a future unmatched `PracticeId` (advisory; TypeScript-constrained today).

### Quick Tasks Completed

| # | Description | Date | Commit | Directory |
|---|-------------|------|--------|-----------|
| 260510-tc9 | Bug fixes: orb Out-phase visual cue parity + audio bowl-cue decay scaled to phase duration (low-BPM gong cutoff) | 2026-05-11 | 0db8f5d | [260510-tc9-bug-fixes-1-add-out-phase-visual-complet](./quick/260510-tc9-bug-fixes-1-add-out-phase-visual-complet/) |
| 260519-63b | Change the Stretch practice heading to "HRV Stretch" (pt-BR "Alongar VFC") | 2026-05-19 | 6eb4d23 | [260519-63b-change-the-stretch-practice-heading-to-h](./quick/260519-63b-change-the-stretch-practice-heading-to-h/) |

## Deferred Items

Items acknowledged and carried forward across milestone closes:

| Category | Item | Status | Deferred At |
|----------|------|--------|-------------|
| v1.x carry-forward | iOS Safari mid-page audio recovery after lock/unlock (Override SC1, user-signed 2026-05-10 — OS-level audio session loss) | Reconstruction infrastructure ships; works on non-iOS engines | 2026-05-11 v1.0 close |
| v1.x carry-forward | Firefox Desktop orb scale-animation flicker (Override FF-01, user-signed 2026-05-10 — root remedy needs CSS keyframes) | Multiple mitigations attempted; ship as-is | 2026-05-11 v1.0 close |
| v1.x carry-forward | S2 Android Chrome wake lock real-device UAT (Phase 5, 05-04-UAT-LOG.md Gap 1) | Physical device unavailable | 2026-05-11 v1.0 close |
| v1.x carry-forward | iOS Safari Pitfall 6 — phone-call interrupted state (Phase 3, Open Question 5 / Assumption A6) | No mitigation planned for v1 | 2026-05-11 v1.0 close |
| v1.x debt | Cross-tab `recordSession` increment race (WR-07 root) — STORAGE-03 covers UI consistency only | Documented in REQUIREMENTS.md v1.0.1 Out of Scope | 2026-05-11 v1.0.1 planning |
| procedural | Phase 5 lacks VERIFICATION.md | Artifact gap only; coverage intact via 5.1 UAT Task 4 | 2026-05-11 v1.0 close |
| procedural | Phase 02/03 VERIFICATION.md status "human_needed" (all items closed via 5.1 Task 4 sweep) | Statuses not re-flipped | 2026-05-11 v1.0 close |
| procedural | Phase 15 / Phase 18 HUMAN-UAT.md (partial — operator-accepted at phase close) | Remaining scenarios deferred | 2026-05-15 v1.1 close |
| procedural | Phase 15 / Phase 18 VERIFICATION.md status "human_needed" | Resolved via operator UAT sign-off; status not re-flipped | 2026-05-15 v1.1 close |
| v1.x carry-forward | iOS standalone-PWA Wake Lock unavailable on iOS < 18.4 (WebKit bug 254545) | Documented in README at Phase 27; product decision whether to detect + warn | 2026-05-15 v1.3 scoping |
| v1.x debt | 28 Info-severity findings from the 2026-05-16 full-codebase deep review | Low priority — 23 Warnings fixed same-day; re-run `/gsd-code-review 27 --fix --all` to sweep | 2026-05-16 v1.3 close |
| v1.x debt | Code review WR-01 — `IosInstallSteps` `<ol>` `::marker` numbering themed implicitly via per-`<li>` color inheritance | Advisory; correct today, fragile under future refactor — centralize color on the `<ol>` | 2026-05-16 v1.4 close |
| procedural | 28-01 / 28-03 SUMMARY doc drift (field count, superseded `SafariNavigator`) | Code correct; SUMMARYs are earlier snapshots | 2026-05-16 v1.4 close |

**Audit references:**

- `.planning/milestones/v1.0-MILESTONE-AUDIT.md` — PASSED 23/23
- `.planning/milestones/v1.0.1-MILESTONE-AUDIT.md` — PASSED 27/27
- v1.2, v1.3 — no milestone audit run (operator proceeded without `/gsd-audit-milestone`; requirements fully checked, all phases complete). v1.3 open-artifact gaps were resolved (not deferred) at close.
- `.planning/milestones/v1.4-MILESTONE-AUDIT.md` — PASSED (7/7 requirements, 12/12 integration, 7/7 E2E flows). Two coverage-doc gaps (29-VALIDATION.md stale, 29-SECURITY.md missing) closed at audit time via `/gsd-validate-phase 29` + `/gsd-secure-phase 29`.

## Session Continuity

Last session: 2026-05-18T15:26:46.630Z
Stopped at: Phase 34 context gathered
Resume file: .planning/phases/34-stretch-as-a-distinct-practice/34-CONTEXT.md
Next command: /gsd-complete-milestone v1.5

## Operator Next Steps

- Close milestone v1.5 with /gsd-complete-milestone v1.5
- Optional: /gsd-audit-milestone v1.5 before closing (no audit run for v1.2/v1.3)
