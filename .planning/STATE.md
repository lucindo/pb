---
gsd_state_version: 1.0
milestone: v2.2
milestone_name: Audio Sync
status: ready_to_plan
stopped_at: Phase 50 complete (7/7) — ready to discuss Phase 51
last_updated: 2026-05-28T03:01:03.434Z
last_activity: 2026-05-28 -- Phase 50 execution started
progress:
  total_phases: 6
  completed_phases: 7
  total_plans: 12
  completed_plans: 12
  percent: 117
---

# Project State

## Project Reference

See: .planning/PROJECT.md (updated 2026-05-27 after v2.2 Audio Sync milestone init)

**Core value:** Users can start a hands-off Forrest Knutson practice — HRV breathing, Stretch, or Navi Kriya — and comfortably follow accurate, uninterrupted guidance through synchronized visuals and optional sound.
**Current focus:** Phase 51 — master clock unification

## Current Position

Phase: 51
Plan: Not started
Status: Ready to plan
Last activity: 2026-05-28

## Performance Metrics

**Velocity (plans completed per milestone):**

- v1.0: 30 · v1.0.1: 12 · v1.1: 47 · v1.2: 8 · v1.3: 11 · v1.4: 6 · v1.5: 27 · v2.0: 35 + 18 spike-loop items · v2.1: 11

## Accumulated Context

### Decisions

Decisions are logged in PROJECT.md Key Decisions table — see the v1.5 rows for the multi-practice architecture, the migration ladder, the Navi Kriya engine, the Stretch promotion, the switcher A/B treatment, and the Flute timbre. v2.0 decisions (spike-010 visual system, anti-gamification stance, Variant removal, Theme collapse) are captured in `.planning/spikes/MANIFEST.md` Requirements and PROJECT.md Key Decisions. v2.1 decisions (spike-012 verbatim tokens, per-field `coerceSettings` for 4 flags with no `STATE_VERSION` bump, paste-and-rename picker hooks, existing-primitives-only Appearance composition, `returningFromAppearance` sentinel-based focus restoration, `appSettings.sections.appearance` → `sections.theme` rename, drift-guard `ALLOWED_KEY_PATTERNS` allowlist) are captured in PROJECT.md Key Decisions.

**v2.2 roadmap-time decisions (pre-plan-phase):**

- **Phase shape locked at 5 phases (49–53)** mirroring the operator-authoritative `.planning/notes/audio-clock-milestone-proposal.md` A–E proposal. Five phases derive directly from the audio-stack bug list — not imposed by template granularity.
- **Phase 49 is independent of Phases 50–53** — operator-designated fast-shipping opener (lives in this milestone because it's the same audio-stack domain, not because it depends on the clock unification work).
- **Phase 50 is a pure structural refactor with full test parity** — zero end-user behavior change at close. The `feedback_design_logic_separation` memory rule applies in reverse: this phase keeps logic untouched in user-facing terms (the refactor is behind the interface).
- **Phase 51 depends on Phase 50** (callers must consume the `SessionClock` interface before the clock source can be rebased onto `audioCtx.currentTime`).
- **Phase 52 depends on Phase 50 + 51** — the clamp behavior is clearer once both clocks are unified, and the lookahead window queues against `audioCtx.currentTime` via `SessionClock.schedule`.
- **Phase 53 depends on Phase 50 only** — independent of Phases 51 and 52 and could be parallelized with them after Phase 50 lands.
- **DEPS-01 + QUAL-01 cross-cutting** — verified in every phase rather than mapped to a separate verification phase. `dependencies` in `package.json` stays `react` + `react-dom`; per-commit green-gate (`tsc && lint && build && test`) holds on every commit.
- **Library migration (Tone.js / Howler) explicitly OUT of scope** — the `SessionClock` abstraction (Phase 50) keeps the swap available as a single-implementation change later.
- **Continuous ambient layer OUT of scope** — HRV cue envelope already provides perceptual continuity via the non-zero sustain floor (`cueSynth.ts:89-95`). Tracked as forward-looking requirement AMBIENT-F1 at `.planning/seeds/continuous-ambient-layer.md`; seed is preserved, not deleted.
- **Existing iOS Phase 5.1 reconstruction path preserved** — Phase 53's MUTE-03 only removes the engine-rebuild path from the MUTE flow; the standalone iOS-audio-recovery affordance (morphing `MuteToggle` triggered by `audioStatus === 'interrupted'`) stays in place.

### Roadmap Evolution

- v2.2 roadmap created (2026-05-27): 5 phases continuing the v2.1 numbering (49, 50, 51, 52, 53). 24/24 requirements mapped: IOS-01..05 → Phase 49; ABSTR-01..04 → Phase 50; CLOCK-01..05 → Phase 51; SCHED-01..05 → Phase 52; MUTE-01..04 → Phase 53; cross-cutting DEPS-01 + QUAL-01 verified per-phase. Coverage 100%; no orphaned requirements. Authoritative scope input: `.planning/notes/audio-clock-milestone-proposal.md`.
- v2.1 closed (2026-05-26): 3 phases (46, 47, 48), 11 plans, 17/17 requirements complete; tagged `v2.1`; archives at `.planning/milestones/v2.1-ROADMAP.md` + `v2.1-REQUIREMENTS.md`.
- v2.1 roadmap created (2026-05-25): 3 phases continuing the v2.0 numbering (no `--reset-phase-numbers`). 17/17 requirements mapped: KUTH-01..04 → Phase 46; PREFS-01..04 → Phase 47; APPEAR-01..06 + I18N-01..03 → Phase 48.

### Pending Todos

- PT-BR native-speaker review of v2.1 `appearance.*` strings (I18N-04, listed as Future Requirement in archived v2.1 REQUIREMENTS) — removes the 15 `// TODO: native-speaker review` markers added in Phase 48 per Phase 26 D-01 pattern. Operator pass; not blocking the v2.2 milestone.
- v2.x carry-forwards (CARRY-01..04 — see PROJECT.md "v2.x carry-forward") — Phase 51 CLOCK-04 partially addresses iOS Safari mid-page audio recovery on lock/unlock; wake-lock items (S2 Android Chrome UAT, iOS standalone-PWA Wake Lock < 18.4, iOS Pitfall 6 phone-call interrupted state) are NOT in v2.2 scope and remain deferred.
- v1.x deferred (partially dispositioned): `.orb-layer--in/--out` → `.shape-layer--in/--out` rename — **obsolete-by-redesign** (closed in v2.0 Phase 44). Remaining items from this entry (per-variant token sets; live idle preview; additional shape variants) remain deferred (not yet obviated).

### Blockers/Concerns

- None blocking. v2.2 roadmap is drafted with full requirement coverage; next operator step is `/gsd:plan-phase 49` to begin Phase 49 (iOS speaker route fix — fast-shipping opener).
- Risk flagged at roadmap time for plan-phase awareness: Phase 52 may need extended fake-timer support beyond the existing FakeAudioContext polyfill in `vitest.setup.ts` to validate the lookahead model. Flag this in Phase 52's plan-time risks.

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
| v2.x carry-forward (in scope) | iOS Safari mid-page audio recovery after lock/unlock (Override SC1, OS-level audio session loss) | Partially addressed by v2.2 Phase 51 CLOCK-04 (master clock unification on iOS lock/unlock) | 2026-05-20 v2.0 scoping |
| Deferred (product) | iOS standalone-PWA Wake Lock unavailable on iOS < 18.4 (WebKit bug 254545) — detect + warn | Documented in README at Phase 27; NOT in v2.2 scope (wake-lock domain) | 2026-05-15 v1.3 scoping |
| Deferred (product) | iOS Safari Pitfall 6 — phone-call interrupted state | Domain overlap with iOS audio recovery; NOT in v2.2 scope (deferred to a future audio milestone with real-device UAT) | 2026-05-20 v2.0 scoping |
| Deferred (resource) | S2 Android Chrome wake-lock real-device UAT | Physical device unavailable; NOT in v2.2 scope (wake-lock domain, not audio) | 2026-05-11 v1.0 close |
| Deferred (product) | Stats display surface — re-introduce after a deliberate anti-gamification-compatible design decision (calm, non-comparative, no streaks/leaderboards) | Computation continues in v2.0; visible surface removed by Phase 37 | 2026-05-20 v2.0 scoping |
| Deferred (workflow) | PT-BR native-speaker review of v2.1 strings (I18N-04) — removes the `// TODO: native-speaker review` markers added in Phase 48 | Operator pass per Phase 26 D-01 pattern; tracked as Future Requirement in v2.1 REQUIREMENTS.md (archived) | 2026-05-25 v2.1 scoping |
| Forward-looking (v2.2 future requirement) | Continuous ambient layer (AMBIENT-F1) — seed at `.planning/seeds/continuous-ambient-layer.md` | Tracked as Future Requirement in v2.2 REQUIREMENTS.md; trigger conditions are aesthetic-direction or sample-content additions. Seed preserved, not deleted | 2026-05-27 v2.2 scoping |
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
- v2.1 close 2026-05-26 — all 3 phases (46, 47, 48) verified; 14/14 (P46) + 5/5 (P47) + 9/9 (P48) must-haves satisfied; 17/17 requirements complete in archived `v2.1-REQUIREMENTS.md` traceability table; 1283/1283 tests pass. Operator proceeded without standalone `/gsd:audit-milestone` (matching v2.0 close pattern).

## Session Continuity

Last session: 2026-05-27T22:55:07.877Z
Stopped at: Phase 50 context gathered
Resume file: .planning/phases/50-sessionclock-scheduler-abstraction/50-CONTEXT.md
Next command: /gsd:plan-phase 49 (iOS speaker route fix — fast-shipping opener; independent of Phases 50–53)

## Operator Next Steps

- Run `/gsd:plan-phase 49` to break Phase 49 (iOS speaker route fix) into executable plans. Canonical implementation spec is at `.planning/todos/2026-05-27-ios-speaker-route-audio-element-fix.md` — load it into the plan-phase context.
- Phase 50 (SessionClock / scheduler abstraction) can be planned in parallel with Phase 49 or immediately after — they are independent.
- Phases 51 and 52 wait on Phase 50 (interface consumption); Phase 53 waits on Phase 50 only and can be parallelized with 51 + 52 after 50 lands.
