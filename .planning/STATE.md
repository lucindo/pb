---
gsd_state_version: 1.0
milestone: v2.0
milestone_name: New Design
status: executing
stopped_at: Plan 36-06 complete (HOUSE-09 — v1→v3 chained migrateEnvelope regression test)
last_updated: "2026-05-20T21:33:55.122Z"
last_activity: 2026-05-20
progress:
  total_phases: 9
  completed_phases: 0
  total_plans: 9
  completed_plans: 6
  percent: 67
---

# Project State

## Project Reference

See: .planning/PROJECT.md (updated 2026-05-20 after starting v2.0 New Design)

**Core value:** Users can start a hands-off Forrest Knutson practice — HRV breathing, Stretch, or Navi Kriya — and comfortably follow accurate, uninterrupted guidance through synchronized visuals and optional sound.
**Current focus:** Phase 36 — housekeeping-bookkeeping-reset

## Current Position

Phase: 36 (housekeeping-bookkeeping-reset) — EXECUTING
Plan: 7 of 9
Status: Ready to execute
Last activity: 2026-05-20

## Performance Metrics

**Velocity (plans completed per milestone):**

- v1.0: 30 · v1.0.1: 12 · v1.1: 47 · v1.2: 8 · v1.3: 11 · v1.4: 6 · v1.5: 27

## Accumulated Context

### Decisions

Decisions are logged in PROJECT.md Key Decisions table — see the v1.5 rows for the multi-practice architecture, the migration ladder, the Navi Kriya engine, the Stretch promotion, the switcher A/B treatment, and the Flute timbre. v2.0 decisions (spike-010 visual system, anti-gamification stance, Variant removal, Theme collapse) are captured in `.planning/spikes/MANIFEST.md` Requirements and will be back-promoted into PROJECT.md Key Decisions during the v2.0 milestone close.

- [Phase 36]: Plan 36-01: Conceptual commit #1 (CONTEXT D-05) collapsed to no-op — git restore from HEAD produced no diff; real HOUSE-10 commit lands in 36-07 as the git mv to .planning/milestones/v1.5-phases/. — git restore against HEAD only mutates the working tree when the index already matches HEAD; the 6 v1.5 phase dirs were in ' D' state, so restoring them brought files back from HEAD with zero index-vs-HEAD diff. Nothing to commit at this step.
- [Phase ?]: Plan 36-02: Closed HOUSE-01..04 by backfilling Phase 12 VALIDATION + SECURITY (v1.0.1 archive) and Phase 33/35 VALIDATION (restored v1.5 phase dirs) — all four ship status: verified, no gap-filling, single docs commit 919b2e6.
- [Phase 36]: Plan 36-03: Closed HOUSE-05 + HOUSE-07 by re-flipping VERIFICATION status human_needed -> passed for 5 v1.x phases (02/03/15/18/31) — Plan listed Phase 05 as a 6th target but no 05-VERIFICATION.md exists in git history; 05.1-VERIFICATION.md already reads passed (3/3 ROADMAP success criteria) so Phase 36 success criterion #2 is satisfied for the Phase 05 family. Documented as Rule 1 deviation in commit a02f82c body. Phase 19 also carries human_needed but is out of plan scope - flagged for operator triage.
- [Phase ?]: [Phase 36]: Plan 36-04: Closed HOUSE-06 by inserting requirements-completed frontmatter into the 4 last-plan SUMMARYs for Phases 32/33/34/35 — IDs derived from each phase's VERIFICATION.md Requirements Coverage table matched the planner's starter set exactly; single docs commit 8d81f43, 16 additions, zero body changes.
- [Phase 36]: Plan 36-05: Closed HOUSE-08 by recovering 28-01 + 28-03 SUMMARYs from f81f08f^ (deleted in `docs(phase-30): add security threat verification`, absent from HEAD ever since) and applying drift fixes against canonical code. 28-01 body's UiStrings.install field-count line updated (9 fields canonical, Phase 28-01 contributed 7; `regionLabel` from Phase 28 WR-06 and `settingsLabel` from Phase 29-01 added the other two). 28-03 `decisions:` row rewritten — `SafariNavigator` symbol survived in src/ (still used inside `useIsStandaloneOrPhone.ts` for the `isStandalone` branch), but iOS-detect semantics changed: detection now uses `detectIsIOS()` UA probe inside the hook (CR-01/d7561ce supersession). Single docs commit 0d61f5c atop 8d81f43; 205 line additions across 2 files, zero deletions, zero src/ touches.
- [Phase ?]: Plan 36-06: Closed HOUSE-09 by appending describe('migrateEnvelope v1→v3 chained (HOUSE-09)') to src/storage/storage.test.ts — 3 it() cases (v1→v3 chained / idempotency / STATE_VERSION). Resolved CONTEXT D-06 wording mismatch per 36-PATTERNS §1 strategy (a): naviKriya NOT asserted because migrateEnvelope doesn't seed it (coercePractices does, downstream); matches v1→v2 analog. Single test(36): commit d55a92a; 1257 tests pass (+3); tsc/build green. Pre-existing lint debt (53 errors on main, unrelated) logged to deferred-items.md, folded into Phase 44 POLISH-02; push-gate disposition flagged for plan 36-09.

### Pending Todos

- v1.x deferred: `.orb-layer--in/--out` → `.shape-layer--in/--out` rename for naming consistency; per-variant token sets; live idle preview; additional shape variants. (Many of these are obviated by Phase 42's orb rewrite — re-audit at v2.0 close.)

### Blockers/Concerns

- None blocking. v2.0 roadmap defined 2026-05-20 — 9 phases (36–44), 87 requirements mapped 1:1 against REQUIREMENTS.md. Phase 36 is the procedural reset (no source changes; pushes to `origin/main` at phase close).

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
| Phase 36 P36-01 | 1m | 2 tasks | 0 files |
| Phase 36 P36-02 | 18m | 6 tasks | 4 files |
| Phase 36 P03 | 2m | 3 tasks | 5 files |
| Phase 36 P04 | 3m | 3 tasks | 4 files |
| Phase 36 P05 | 2m | 4 tasks | 2 files |
| Phase 36 P06 | 2m | 3 tasks | 1 files |

## Deferred Items

Items acknowledged and carried forward across milestone closes. The v1.x procedural register that previously lived here has been folded into Phase 36 (Housekeeping) — see the HOUSE-01..14 success criteria. The remaining entries are functional carry-forwards, product decisions, and not-yet-actionable items.

| Category | Item | Status | Deferred At |
|----------|------|--------|-------------|
| v2.0 carry-forward (known bug) | iOS Safari mid-page audio recovery after lock/unlock (Override SC1, OS-level audio session loss) | Needs more investigation; remains a known bug to address in a future milestone — does NOT block v2.0 | 2026-05-20 v2.0 scoping |
| Deferred (product) | iOS standalone-PWA Wake Lock unavailable on iOS < 18.4 (WebKit bug 254545) — detect + warn | Documented in README at Phase 27; product decision still pending | 2026-05-15 v1.3 scoping |
| Deferred (product) | iOS Safari Pitfall 6 — phone-call interrupted state | Domain overlap with the iOS audio recovery known bug | 2026-05-20 v2.0 scoping |
| Deferred (resource) | S2 Android Chrome wake-lock real-device UAT | Physical device unavailable | 2026-05-11 v1.0 close |
| Deferred (product) | Stats display surface — re-introduce after a deliberate anti-gamification-compatible design decision (calm, non-comparative, no streaks/leaderboards) | Computation continues in v2.0; visible surface removed by Phase 37 | 2026-05-20 v2.0 scoping |
| Folded into v2.0 | Phase 12 VALIDATION + SECURITY; Phase 33/35 Nyquist VALIDATION; Phase 31 VERIFICATION re-flip; Phase 32/33/34/35 SUMMARY `requirements-completed` frontmatter backfill; Phase 02/03/05/15/18 VERIFICATION `human_needed` flips; 28-01/28-03 SUMMARY drift; explicit v1→v2→v3 chained-migration regression test | Absorbed into Phase 36 (HOUSE-01..09) | 2026-05-20 v2.0 scoping |
| Folded into v2.0 | 28 Info-severity findings from the 2026-05-16 deep review | Absorbed into Phase 44 POLISH-02 (disposition each: fix / defer-with-reason / obsolete-by-redesign) | 2026-05-20 v2.0 scoping |
| Naturally superseded | Inner-ring UX symmetry (replaced by Phase 42 orb rewrite); Code review WR-01 `IosInstallSteps` `::marker` (replaced by Phase 43 V3 inline install banner); Firefox Desktop orb scale-animation flicker (dropped permanently — old `.orb` keyframes don't survive Phase 42) | Closed at v2.0 scoping | 2026-05-20 v2.0 scoping |

**Audit references:**

- `.planning/milestones/v1.0-MILESTONE-AUDIT.md` — PASSED 23/23
- `.planning/milestones/v1.0.1-MILESTONE-AUDIT.md` — PASSED 27/27
- v1.2, v1.3 — no milestone audit run (operator proceeded without `/gsd-audit-milestone`; requirements fully checked, all phases complete). v1.3 open-artifact gaps were resolved (not deferred) at close.
- `.planning/milestones/v1.4-MILESTONE-AUDIT.md` — PASSED (7/7 requirements, 12/12 integration, 7/7 E2E flows). Two coverage-doc gaps (29-VALIDATION.md stale, 29-SECURITY.md missing) closed at audit time via `/gsd-validate-phase 29` + `/gsd-secure-phase 29`.
- `.planning/milestones/v1.5-MILESTONE-AUDIT.md` — PASSED (re-audit 2026-05-19; 26/26 requirements, 6/6 phases, 0 integration blockers, 6/6 E2E flows). LEARN-02 and NK-07 reviewed with the operator and resolved as non-gaps; NK-07 amended to end-only. Tech debt non-blocking — see the audit `tech_debt` block.

## Session Continuity

Last session: 2026-05-20T21:33:55.116Z
Stopped at: Plan 36-06 complete (HOUSE-09 — v1→v3 chained migrateEnvelope regression test)
Resume file: None
Next command: /gsd-plan-phase 36

## Operator Next Steps

- Start Phase 36 planning with /gsd-plan-phase 36
