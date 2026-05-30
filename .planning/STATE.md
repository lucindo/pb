---
gsd_state_version: 1.0
milestone: v2.3
milestone_name: Maintainability
status: "Roadmap drafted; awaiting `/gsd:plan-phase 55`"
stopped_at: Phase 55 context gathered
last_updated: "2026-05-30T03:19:08.770Z"
last_activity: 2026-05-30 — v2.3 roadmap created (Phases 55–61), 100% requirement coverage
progress:
  total_phases: 7
  completed_phases: 0
  total_plans: 0
  completed_plans: 0
  percent: 0
---

# Project State

## Project Reference

See: .planning/PROJECT.md (updated 2026-05-29 after v2.3 Maintainability milestone init)

**Core value:** Users can start a hands-off Forrest Knutson practice — HRV breathing, Stretch, or Navi Kriya — and comfortably follow accurate, uninterrupted guidance through synchronized visuals and optional sound.
**Current focus:** Phase 55 — Comment de-archaeology (behavior-preserving comment strip; unblocks reading for the rest of the milestone)

## Current Position

Phase: 55 — Comment de-archaeology (not started)
Plan: —
Status: Roadmap drafted; awaiting `/gsd:plan-phase 55`
Last activity: 2026-05-30 — v2.3 roadmap created (Phases 55–61), 100% requirement coverage

## Performance Metrics

**Velocity (plans completed per milestone):**

- v1.0: 30 · v1.0.1: 12 · v1.1: 47 · v1.2: 8 · v1.3: 11 · v1.4: 6 · v1.5: 27 · v2.0: 35 + 18 spike-loop items · v2.1: 11 · v2.2: 23 (+ 53/54 direct)

## Accumulated Context

### Decisions

Decisions are logged in PROJECT.md Key Decisions table — see the v1.5 rows for the multi-practice architecture, the migration ladder, the Navi Kriya engine, the Stretch promotion, the switcher A/B treatment, and the Flute timbre. v2.0 decisions (spike-010 visual system, anti-gamification stance, Variant removal, Theme collapse) are captured in `.planning/spikes/MANIFEST.md` Requirements and PROJECT.md Key Decisions. v2.1 decisions (spike-012 verbatim tokens, per-field `coerceSettings` for 4 flags with no `STATE_VERSION` bump, paste-and-rename picker hooks, existing-primitives-only Appearance composition, `returningFromAppearance` sentinel-based focus restoration) are captured in PROJECT.md Key Decisions. v2.2 decisions (5-phase audio-stack shape, `SessionClock` abstraction, master-clock unification, Web Worker background continuity, master-gain mute) are captured in PROJECT.md / the v2.2 milestone docs.

**v2.3 roadmap-time decisions (pre-plan-phase):**

- **Phase shape locked at 7 phases (55–61)** — the 6 groupings from `.planning/CODE-QUALITY-REVIEW.md` "Suggested milestone shape" PLUS one standalone test-audit phase (61). Phases derive directly from the maintainability audit's findings (#1–#6), not from template granularity. Operator-endorsed mapping; numbering continues from v2.2's last phase (54).
- **Cross-cutting requirements mapped to EVERY phase, not a separate phase** — TEST-01 (per-phase test pruning of the area touched), BEHAVIOR-01 (no user-facing behavior change, the milestone gate), and QUAL-01 (`tsc`/`lint`/`build` green per commit, curated suite passes, deps stay `react` + `react-dom`) are verified in each of phases 55–61.
- **Success criteria phrased as "no user-facing behavior change" — NEVER "tests pass"** (operator-mandated, per [[feedback_tests_not_truth_app_is_simple]]). Tests are not the source of truth and are themselves in scope for deletion/curation; green-tests-as-a-gate steers toward preserving garbage tests or contorting code to satisfy false assertions. Each phase's criteria are framed around observable app behavior + the structural outcome (file deleted, function collapsed, type converted), with test-curation as an explicit deliverable rather than a gate.
- **Phase 55 (comment strip) lands first** — biggest ROI, lowest risk, and it unblocks reading for phases 56–60. Phases 55–60 are otherwise largely independent (each touches a different area).
- **Phase 58 (session shell) + Phase 59 (frame model) are the deeper structural work** — per the audit, each warrants its own discuss/plan cycle. Phase 58 explicitly does NOT unify the rAF/worker vs setTimeout engine drivers (essential difference; "do not fix"). Phase 59 is independent domain-layer work.
- **Phase 61 (test sweep) is intentionally LAST** — per-phase pruning (TEST-01) will have already removed the area-tied garbage, leaving only orphan tests not tied to any refactor area for the standalone sweep (TEST-02).
- **Audit "do not fix" list honored as Out of Scope** — file-size splits, the three settings forms, the storage `unknown`-boundary coercion, the HRV/NK engine drivers, and `NKShape.tsx` are explicitly excluded (REQUIREMENTS.md Out of Scope table).

### Roadmap Evolution

- v2.3 roadmap created (2026-05-30): 7 phases continuing the v2.2 numbering (55–61; no `--reset-phase-numbers`). 18/18 phase-mapped requirements mapped to exactly one phase — COMMENT-01/02 → Phase 55; STORAGE-01..05 → Phase 56; VIEWMODEL-01..03 → Phase 57; SHELL-01/02 → Phase 58; FRAME-01/02 → Phase 59; CLEANUP-01..03 → Phase 60; TEST-02 → Phase 61. Cross-cutting TEST-01 + BEHAVIOR-01 + QUAL-01 verified in every phase. Coverage 100%; no orphaned requirements. Authoritative scope input: `.planning/CODE-QUALITY-REVIEW.md` (architecture healthy, no blockers — deletion + consolidation, not redesign).
- v2.2 closed (2026-05-29): 7 phases (49, 49.1, 50–54), audit PASSED, operator-verified end-to-end on desktop and mobile; tagged `v2.2`.
- v2.1 closed (2026-05-26): 3 phases (46, 47, 48), 11 plans, 17/17 requirements complete; tagged `v2.1`.

### Pending Todos

- PT-BR native-speaker review of v2.1 `appearance.*` strings (I18N-04, Future Requirement) — removes the 15 `// TODO: native-speaker review` markers added in Phase 48. Operator pass; NOT in v2.3 scope.
- v2.x carry-forwards — S2 Android Chrome wake-lock real-device UAT (physical device dependent); iOS standalone-PWA Wake Lock < 18.4 detect-and-warn product decision; iOS Pitfall 6 phone-call interrupted state. NOT in v2.3 scope (v2.3 is behavior-preserving cleanup only).

### Blockers/Concerns

- None blocking. v2.3 roadmap is drafted with full requirement coverage; next operator step is `/gsd:plan-phase 55` (Comment de-archaeology — the low-risk opener that unblocks reading for the rest).
- Note for plan-phase awareness: BEHAVIOR-01 is verified by behavior reasoning / running the app, NOT by a green suite. Every phase must treat its area's tests as in-scope for curation (TEST-01) — do not preserve a garbage test or contort code to satisfy a false assertion.

### Quick Tasks Completed

| # | Description | Date | Commit | Status | Directory |
|---|-------------|------|--------|--------|-----------|
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
| 260525-hzq | Version sync (package.json mirrors tag) and versioned GitHub Pages deploys with switchable official root pointer | 2026-05-25 | 060edda | Verified | [260525-hzq-version-sync-package-json-mirrors-tag-an](./quick/260525-hzq-version-sync-package-json-mirrors-tag-an/) |
| 260526-dse | Fix Navi session-complete state — wire showCompletion checkmark, swap Start→Done CTA, hide SetupCard config row on Navi + Stretch completion (3 view-layer plumbing gaps closed; +14 tests) | 2026-05-26 | 1afef72 | — | [260526-dse-fix-navi-session-complete-state-missing-](./quick/260526-dse-fix-navi-session-complete-state-missing-/) |

## Deferred Items

Items acknowledged and carried forward across milestone closes. The v1.x procedural register that previously lived here has been folded into Phase 36 (Housekeeping) — see the HOUSE-01..14 success criteria. The remaining entries are functional carry-forwards, product decisions, and not-yet-actionable items.

| Category | Item | Status | Deferred At |
|----------|------|--------|-------------|
| v2.x carry-forward | iOS Safari mid-page audio recovery after lock/unlock (Override SC1, OS-level audio session loss) | Addressed by v2.2 SessionClock/master-clock + reconstruction-reanchor; operator-verified on mobile at v2.2 close | 2026-05-20 v2.0 scoping |
| Deferred (product) | iOS standalone-PWA Wake Lock unavailable on iOS < 18.4 (WebKit bug 254545) — detect + warn | Documented in README at Phase 27; NOT in v2.3 scope (behavior-preserving cleanup only) | 2026-05-15 v1.3 scoping |
| Deferred (product) | iOS Safari Pitfall 6 — phone-call interrupted state | Domain overlap with iOS audio recovery; NOT in v2.3 scope | 2026-05-20 v2.0 scoping |
| Deferred (resource) | S2 Android Chrome wake-lock real-device UAT | Physical device unavailable; NOT in v2.3 scope | 2026-05-11 v1.0 close |
| Deferred (product) | Stats display surface — re-introduce after a deliberate anti-gamification-compatible design decision | Computation continues; visible surface removed by Phase 37 | 2026-05-20 v2.0 scoping |
| Deferred (workflow) | PT-BR native-speaker review of v2.1 strings (I18N-04) — removes the `// TODO: native-speaker review` markers added in Phase 48 | Operator pass per Phase 26 D-01 pattern; tracked as Future Requirement in REQUIREMENTS.md | 2026-05-25 v2.1 scoping |
| Forward-looking | Continuous ambient layer (AMBIENT-F1) — seed at `.planning/seeds/continuous-ambient-layer.md` | Tracked as Future Requirement; trigger is an aesthetic-direction or sample-content addition. Seed preserved, not deleted | 2026-05-27 v2.2 scoping |

**Audit references:**

- `.planning/milestones/v1.0-MILESTONE-AUDIT.md` — PASSED 23/23
- `.planning/milestones/v1.0.1-MILESTONE-AUDIT.md` — PASSED 27/27
- v1.2, v1.3 — no milestone audit run (requirements fully checked, all phases complete)
- `.planning/milestones/v1.4-MILESTONE-AUDIT.md` — PASSED (7/7 requirements, 12/12 integration, 7/7 E2E flows)
- `.planning/milestones/v1.5-MILESTONE-AUDIT.md` — PASSED (re-audit 2026-05-19; 26/26 requirements, 6/6 phases)
- v2.0 close 2026-05-25 — all 8 phases verified; 9/9 POLISH satisfied; 22/22 STRIDE threats verified; 1166/1166 tests pass
- v2.1 close 2026-05-26 — all 3 phases verified; 17/17 requirements complete; 1283/1283 tests pass
- `.planning/milestones/v2.2-MILESTONE-AUDIT.md` — PASSED (10/10 requirements resolved); operator-verified end-to-end on desktop and mobile

## Session Continuity

Last session: 2026-05-30T03:19:08.763Z
Stopped at: Phase 55 context gathered
Resume file: .planning/phases/55-comment-de-archaeology/55-CONTEXT.md
Next command: /gsd:plan-phase 55 (Comment de-archaeology — low-risk opener that unblocks reading for the rest)

## Operator Next Steps

- Run `/gsd:plan-phase 55` to begin the milestone (Comment de-archaeology).
