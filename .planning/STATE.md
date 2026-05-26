---
gsd_state_version: 1.0
milestone: v2.1
milestone_name: Kuthasta and Settings Switches
status: planning
stopped_at: Phase 47 context gathered
last_updated: "2026-05-26T02:56:37.414Z"
last_activity: 2026-05-26
progress:
  total_phases: 3
  completed_phases: 1
  total_plans: 3
  completed_plans: 3
  percent: 33
---

# Project State

## Project Reference

See: .planning/PROJECT.md (updated 2026-05-25 after starting v2.1 Kuthasta and Settings Switches)

**Core value:** Users can start a hands-off Forrest Knutson practice — HRV breathing, Stretch, or Navi Kriya — and comfortably follow accurate, uninterrupted guidance through synchronized visuals and optional sound.
**Current focus:** Phase 47 — persistable feature flag preferences

## Current Position

Phase: 47
Plan: Not started
Status: Ready to plan
Last activity: 2026-05-26

## Performance Metrics

**Velocity (plans completed per milestone):**

- v1.0: 30 · v1.0.1: 12 · v1.1: 47 · v1.2: 8 · v1.3: 11 · v1.4: 6 · v1.5: 27 · v2.0: 35 + 18 spike-loop items

## Accumulated Context

### Decisions

Decisions are logged in PROJECT.md Key Decisions table — see the v1.5 rows for the multi-practice architecture, the migration ladder, the Navi Kriya engine, the Stretch promotion, the switcher A/B treatment, and the Flute timbre. v2.0 decisions (spike-010 visual system, anti-gamification stance, Variant removal, Theme collapse) are captured in `.planning/spikes/MANIFEST.md` Requirements and PROJECT.md Key Decisions.

**v2.1 operator-locked decisions:**

- [v2.1 roadmap]: Phase order is **Kuthasta → PREFS → APPEAR+i18n**, NOT collapsed. Operator wants the spike-012 V5 Halo Flame to ship and be visually UAT'd in the real app as a query-string-only addition before any persistence or UI work begins. This is an explicit operator sequencing decision, not a granularity choice — do not re-collapse Phase 46 into Phase 47/48 in future planning.
- [v2.1 roadmap]: PREFS uses the **per-field `coerceSettings` fallback pattern** established by Phase 8 D-01 (forward-compat read + refuse-downgrade write + missing-fields-default-on-read) — explicitly NO `STATE_VERSION` bump. Same shape as Phase 22 (Stretch settings), Phase 25 (cue style), Phase 38 (variant retirement), Phase 39 (theme retirement), Phase 35 (chime→flute coercion).
- [v2.1 roadmap]: I18N (3 reqs) is co-located with APPEAR (6 reqs) in Phase 48 rather than split into its own phase — the new strings only exist to serve the new Appearance surface; shipping them apart would mean either placeholder strings landing without a consuming view or a view landing without strings. Both anti-patterns.
- [v2.1 roadmap]: APPEAR composes the **existing primitives** (`SegmentedControl` from `LanguagePicker` + `SettingsToggleRow` + `PageShell` + `TopAppBar` with its existing `trailing` slot + `IconButton`). No new design-system work. The `TopAppBar` `trailing` prop already exists — Phase 48 simply passes a chevron `IconButton` into it.
- [v2.1 roadmap]: Kuthasta `KUTH-02` / `KUTH-04` colour values are **spike-locked** per `.planning/spikes/012-spiritual-eye-orb/README.md` "Locked V5 values" + "Implementation Mapping" — applied verbatim per `[[feedback_spike_implementation_fidelity]]` + `[[feedback_spike_is_design_not_features]]` + `[[feedback_spike_locked_values]]`. No re-tuning, no OQ checkpoint on hex values.

### Roadmap Evolution

- v2.1 roadmap created (2026-05-25): 3 phases (46, 47, 48) continuing the v2.0 numbering (no `--reset-phase-numbers`). 17/17 requirements mapped: KUTH-01..04 → Phase 46; PREFS-01..04 → Phase 47; APPEAR-01..06 + I18N-01..03 → Phase 48.

### Pending Todos

- v2.x carry-forwards (CARRY-01..04 in REQUIREMENTS.md Future Requirements) — deferred to a separate v2.2 bug-fix milestone per the operator's milestone-scoping note in PROJECT.md "Current Milestone".
- v1.x deferred (partially dispositioned): `.orb-layer--in/--out` → `.shape-layer--in/--out` rename — **obsolete-by-redesign** (closed in v2.0 Phase 44). Remaining items from this entry (per-variant token sets; live idle preview; additional shape variants) remain deferred (not yet obviated).

### Blockers/Concerns

- None blocking. v2.0 closed cleanly at `5b48c73` (HEAD post-tag at `v2.0` on `591df88`). v2.1 Phase 46 ready to plan when operator runs `/gsd:plan-phase 46`.

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

## Deferred Items

Items acknowledged and carried forward across milestone closes. The v1.x procedural register that previously lived here has been folded into Phase 36 (Housekeeping) — see the HOUSE-01..14 success criteria. The remaining entries are functional carry-forwards, product decisions, and not-yet-actionable items.

| Category | Item | Status | Deferred At |
|----------|------|--------|-------------|
| v2.x carry-forward (known bug) | iOS Safari mid-page audio recovery after lock/unlock (Override SC1, OS-level audio session loss) | Needs more investigation; deferred to a separate v2.2 bug-fix milestone per PROJECT.md "Key context" | 2026-05-20 v2.0 scoping |
| Deferred (product) | iOS standalone-PWA Wake Lock unavailable on iOS < 18.4 (WebKit bug 254545) — detect + warn | Documented in README at Phase 27; deferred to v2.2 per PROJECT.md "Key context" | 2026-05-15 v1.3 scoping |
| Deferred (product) | iOS Safari Pitfall 6 — phone-call interrupted state | Domain overlap with the iOS audio recovery known bug; deferred to v2.2 per PROJECT.md "Key context" | 2026-05-20 v2.0 scoping |
| Deferred (resource) | S2 Android Chrome wake-lock real-device UAT | Physical device unavailable; deferred to v2.2 per PROJECT.md "Key context" | 2026-05-11 v1.0 close |
| Deferred (product) | Stats display surface — re-introduce after a deliberate anti-gamification-compatible design decision (calm, non-comparative, no streaks/leaderboards) | Computation continues in v2.0; visible surface removed by Phase 37 | 2026-05-20 v2.0 scoping |
| Deferred (workflow) | PT-BR native-speaker review of v2.1 strings (I18N-04) — removes the `// TODO: native-speaker review` markers added in Phase 48 | Operator pass per Phase 26 D-01 pattern; tracked as Future Requirement in REQUIREMENTS.md | 2026-05-25 v2.1 scoping |
| Folded into v2.0 | Phase 12 VALIDATION + SECURITY; Phase 33/35 Nyquist VALIDATION; Phase 31 VERIFICATION re-flip; Phase 32/33/34/35 SUMMARY `requirements-completed` frontmatter backfill; Phase 02/03/05/15/18 VERIFICATION `human_needed` flips; 28-01/28-03 SUMMARY drift; explicit v1→v2→v3 chained-migration regression test | Absorbed into Phase 36 (HOUSE-01..09) | 2026-05-20 v2.0 scoping |
| Folded into v2.0 | 28 Info-severity findings from the 2026-05-16 deep review | Absorbed into Phase 44 POLISH-02 (disposition each: fix / defer-with-reason / obsolete-by-redesign) | 2026-05-20 v2.0 scoping |
| Naturally superseded | Inner-ring UX symmetry (replaced by Phase 41 J4 orb rewrite); Code review WR-01 `IosInstallSteps` `::marker` (dropped permanently — V3 install banner UX-12/13/14 abandoned at Phase 41 J13); Firefox Desktop orb scale-animation flicker (dropped permanently — old `.orb` keyframes don't survive Phase 41 J4) | Closed at v2.0 close | 2026-05-25 v2.0 close |

**Audit references:**

- `.planning/milestones/v1.0-MILESTONE-AUDIT.md` — PASSED 23/23
- `.planning/milestones/v1.0.1-MILESTONE-AUDIT.md` — PASSED 27/27
- v1.2, v1.3 — no milestone audit run (operator proceeded without `/gsd-audit-milestone`; requirements fully checked, all phases complete). v1.3 open-artifact gaps were resolved (not deferred) at close.
- `.planning/milestones/v1.4-MILESTONE-AUDIT.md` — PASSED (7/7 requirements, 12/12 integration, 7/7 E2E flows). Two coverage-doc gaps (29-VALIDATION.md stale, 29-SECURITY.md missing) closed at audit time.
- `.planning/milestones/v1.5-MILESTONE-AUDIT.md` — PASSED (re-audit 2026-05-19; 26/26 requirements, 6/6 phases, 0 integration blockers, 6/6 E2E flows).
- v2.0 close 2026-05-25 — all 8 phases (36, 37, 38, 39, 40, 41, 44, 45) verified; 9/9 POLISH satisfied at 44-VERIFICATION.md `passed`; 22/22 STRIDE threats verified at 44-SECURITY.md; 1166/1166 tests pass.

## Session Continuity

Last session: 2026-05-26T02:56:37.408Z
Stopped at: Phase 47 context gathered
Resume file: .planning/phases/47-persistable-feature-flag-preferences/47-CONTEXT.md
Next command: /gsd:plan-phase 46

## Operator Next Steps

- Plan Phase 46 (Kuthasta orb variant) with `/gsd:plan-phase 46`
