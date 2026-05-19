---
gsd_state_version: 1.0
milestone: v1.5
milestone_name: Multi-Practice
status: Awaiting next milestone
stopped_at: v1.5 milestone complete
last_updated: "2026-05-19T11:37:54.782Z"
last_activity: 2026-05-19 — Milestone v1.5 completed and archived
progress:
  total_phases: 6
  completed_phases: 6
  total_plans: 27
  completed_plans: 27
  percent: 100
---

# Project State

## Project Reference

See: .planning/PROJECT.md (updated 2026-05-19 after v1.5 Multi-Practice milestone)

**Core value:** Users can start a hands-off Forrest Knutson practice — HRV breathing, Stretch, or Navi Kriya — and comfortably follow accurate, uninterrupted guidance through synchronized visuals and optional sound.
**Current focus:** Planning the next milestone (`/gsd-new-milestone`)

## Current Position

Phase: Milestone v1.5 complete
Plan: —
Status: Awaiting next milestone
Last activity: 2026-05-19 — Milestone v1.5 completed and archived

## Performance Metrics

**Velocity (plans completed per milestone):**

- v1.0: 30 · v1.0.1: 12 · v1.1: 47 · v1.2: 8 · v1.3: 11 · v1.4: 6 · v1.5: 27

## Accumulated Context

### Decisions

Decisions are logged in PROJECT.md Key Decisions table — see the v1.5 rows for the multi-practice architecture, the migration ladder, the Navi Kriya engine, the Stretch promotion, the switcher A/B treatment, and the Flute timbre.

### Pending Todos

- v1.x deferred: `.orb-layer--in/--out` → `.shape-layer--in/--out` rename for naming consistency; per-variant token sets; live idle preview; additional shape variants.

### Blockers/Concerns

- None blocking. v1.5 Multi-Practice shipped 2026-05-19 — all 6 phases (30–35), 27 plans. Awaiting next milestone.

### Quick Tasks Completed

| # | Description | Date | Commit | Directory |
|---|-------------|------|--------|-----------|
| 260510-tc9 | Bug fixes: orb Out-phase visual cue parity + audio bowl-cue decay scaled to phase duration (low-BPM gong cutoff) | 2026-05-11 | 0db8f5d | [260510-tc9-bug-fixes-1-add-out-phase-visual-complet](./quick/260510-tc9-bug-fixes-1-add-out-phase-visual-complet/) |
| 260519-63b | Change the Stretch practice heading to "HRV Stretch" (pt-BR "Alongar VFC") | 2026-05-19 | 6eb4d23 | [260519-63b-change-the-stretch-practice-heading-to-h](./quick/260519-63b-change-the-stretch-practice-heading-to-h/) |
| 260519-68l | Learn screen tweaks: bigger section titles (text-xl), relocate Forrest teachings tagline above affiliation line | 2026-05-19 | a481f87 | [260519-68l-learn-screen-tweaks-bigger-section-title](./quick/260519-68l-learn-screen-tweaks-bigger-section-title/) |
| fast | Center the "About this practice" title in the Learn dialog | 2026-05-19 | 4ddbe27 | — |
| 260519-6j6 | Trim "moving attention along the spine" from Navi Kriya Learn description (EN + pt-BR); center the iOS "How to install" button in Settings | 2026-05-19 | 6199b42 | [260519-6j6-learn-navi-description-trim-center-how-t](./quick/260519-6j6-learn-navi-description-trim-center-how-t/) |
| fast | Rename resonant practice to "HRV Breathing" in the reset-stats dialog (EN) — "Reset HRV Breathing stats?" | 2026-05-19 | 7003fb3 | — |
| 260519-91w | Review all app config values and defaults — drop temporary 1-min HRV duration, NK frontCount options→100–500 (min 100), NK rounds→1–12, NK last-OM hold 2→1.5, remove dead NK_SETTLE_MS; all practice defaults confirmed unchanged | 2026-05-19 | fb7db31 | [260519-91w-review-all-app-config-values-and-default](./quick/260519-91w-review-all-app-config-values-and-default/) |
| 260519-9mi | Set default values for app Settings items — DEFAULT_CUE labels→arrow, DEFAULT_TIMBRE bowl→sine (supersedes the earlier CUE "fixed to labels" decision); Theme/Variant/Language defaults confirmed unchanged | 2026-05-19 | 296904b | [260519-9mi-set-default-values-for-app-settings-item](./quick/260519-9mi-set-default-values-for-app-settings-item/) |
| fast | Make VITE_SWITCHER_TREATMENT=B the default in vite.config.ts (explicit 'A' opts out) | 2026-05-19 | f0f941f | — |
| 260519-bee | Remove orphaned NK pause/resume code and strings — dead after the v1.5-audit NK-07 end-only amendment (useNKEngine pause()/resume() + interface members, controls.pause/controls.resume EN+PT-BR, stale tests) | 2026-05-19 | f285e58 | [260519-bee-remove-orphaned-nk-pause-resume-code-and](./quick/260519-bee-remove-orphaned-nk-pause-resume-code-and/) |

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
| procedural | Nyquist `VALIDATION.md` missing for Phases 33 and 35 | Documentation gap only — full suite 1255/1255 green; `/gsd-validate-phase 33`/`35` to reconcile | 2026-05-19 v1.5 close |
| procedural | Phase 31 `VERIFICATION.md` frontmatter still `human_needed` | All 9 items operator-confirmed in `31-HUMAN-UAT.md` (`status: complete`); status not re-flipped | 2026-05-19 v1.5 close |
| procedural | SUMMARY `requirements-completed` frontmatter empty for all Phase 32/33/34/35 plans | Requirements satisfied per VERIFICATION.md evidence; cross-check frontmatter not populated | 2026-05-19 v1.5 close |
| v1.x debt | v1.5 audit code-review carry-forwards — `LearnDialog.tsx:91` misleading Stretch-fallback comment, LearnDialog paragraph-text React key (IN-01), `PracticeToggle` local `PracticeId` alias (IN-02), NK look-ahead (IN-03), NKShape phase a11y (WR-01) | Advisory; all non-blocking — see `.planning/milestones/v1.5-MILESTONE-AUDIT.md` `tech_debt` block | 2026-05-19 v1.5 close |
| v1.x debt | No explicit v1→v3 chained-migration regression test (`storage.test.ts` covers v1→v2 and v2→v3 separately) | Production path works — `readEnvelope` always passes the real on-disk version; dedicated regression test missing | 2026-05-19 v1.5 close |

**Audit references:**

- `.planning/milestones/v1.0-MILESTONE-AUDIT.md` — PASSED 23/23
- `.planning/milestones/v1.0.1-MILESTONE-AUDIT.md` — PASSED 27/27
- v1.2, v1.3 — no milestone audit run (operator proceeded without `/gsd-audit-milestone`; requirements fully checked, all phases complete). v1.3 open-artifact gaps were resolved (not deferred) at close.
- `.planning/milestones/v1.4-MILESTONE-AUDIT.md` — PASSED (7/7 requirements, 12/12 integration, 7/7 E2E flows). Two coverage-doc gaps (29-VALIDATION.md stale, 29-SECURITY.md missing) closed at audit time via `/gsd-validate-phase 29` + `/gsd-secure-phase 29`.
- `.planning/milestones/v1.5-MILESTONE-AUDIT.md` — PASSED (re-audit 2026-05-19; 26/26 requirements, 6/6 phases, 0 integration blockers, 6/6 E2E flows). LEARN-02 and NK-07 reviewed with the operator and resolved as non-gaps; NK-07 amended to end-only. Tech debt non-blocking — see the audit `tech_debt` block.

## Session Continuity

Last session: 2026-05-19 — v1.5 Multi-Practice milestone completed and archived
Stopped at: v1.5 milestone complete
Resume file: —
Next command: /gsd-new-milestone

## Operator Next Steps

- Start the next milestone with /gsd-new-milestone
