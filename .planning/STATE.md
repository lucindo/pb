---
gsd_state_version: 1.0
milestone: v1.3
milestone_name: Release Polish
status: executing
stopped_at: Phase 23 context gathered
last_updated: "2026-05-15T21:17:45.334Z"
last_activity: 2026-05-15 -- Phase 23 planning complete
progress:
  total_phases: 5
  completed_phases: 0
  total_plans: 1
  completed_plans: 0
  percent: 0
---

# Project State

## Project Reference

See: .planning/PROJECT.md (updated 2026-05-15 — v1.3 Release Polish milestone opened)

**Core value:** Users can start a hands-off HRV breathing session and comfortably follow accurate, uninterrupted inhale/exhale guidance through synchronized visuals and optional sound.
**Current focus:** v1.3 Release Polish — roadmap created (Phases 23–27); ready to plan Phase 23.

## Current Position

Phase: 23 — LICENSE + README (not started)
Plan: —
Status: Ready to execute
Last activity: 2026-05-15 -- Phase 23 planning complete

## Performance Metrics

**Velocity:**

- Total plans completed (v1.0): 30
- Total plans completed (v1.0.1): 12
- Total plans completed (v1.1): 47
- Total plans completed (v1.2): 8

**By Phase (v1.2):**

| Phase | Plans | Status |
|-------|-------|--------|
| 20. Session Start Polish | 1 | Complete (2026-05-15 — LEAD-01; Cancel/Cancelar lead-in label) |
| 21. Per-Theme Favicon | 2 | Complete (2026-05-15 — FAVI-01..03; faviconPalette + useFavicon + pre-paint script) |
| 22. BPM Stretch Session | 5 | Complete (2026-05-15 — STRETCH-01..08; stretchRamp engine + segment table + UI; operator-UAT UX redesign) |

**By Phase (v1.3):**

| Phase | Plans | Status |
|-------|-------|--------|
| 23. LICENSE + README | TBD | Not started |
| 24. Forrest Native-App Links | TBD | Not started |
| 25. Labels-vs-Icons Cue Toggle | TBD | Not started |
| 26. PT-BR Native-Speaker Review | TBD | Not started |
| 27. PWA Install & Offline | TBD | Not started |

## Accumulated Context

### Roadmap Evolution

- v1.2 BPM Stretch roadmap created 2026-05-15 — 3 phases (20 Session Start Polish, 21 Per-Theme Favicon, 22 BPM Stretch Session) ordered smallest-blast-radius first; backlog items 999.1 and 999.2 promoted into Phases 21 and 20 respectively; 12/12 requirements mapped.
- v1.3 Release Polish roadmap created 2026-05-15 — 5 phases (23 LICENSE + README, 24 Forrest Native-App Links, 25 Labels-vs-Icons Cue Toggle, 26 PT-BR Native-Speaker Review, 27 PWA Install & Offline) in a clean 1:1 feature-to-phase mapping, ordered smallest-blast-radius first; 10/10 requirements mapped; phases form a linear dependency chain (23→24→25→26→27). Phase 26 (PT-BR review) deliberately sequenced after Phases 24 and 25 so the single native-speaker pass also covers the new strings those phases introduce. Phase 27 (PWA) sequenced last so service-worker caching wraps a frozen, verified app; it carries a first-class real-device UAT success criterion (iOS installed standalone mode), not a deferred carry-forward. Three deferred-item todos (Forrest links, labels-vs-icons toggle, LICENSE/README) promoted into Phases 24/25/23; PWA install promoted from the v2 backlog into Phase 27.

### Decisions

Decisions are logged in PROJECT.md Key Decisions table.
Recent decisions affecting current work:

- **[v1.3 phase ordering]** Smallest-blast-radius first, operator-confirmed: Phase 23 (docs, repo root only) → Phase 24 (additive Learn content) → Phase 25 (the integration hotspot — 5th SettingsDialog picker) → Phase 26 (content-quality review pass) → Phase 27 (highest blast radius — PWA). Linear dependency chain.
- **[PT-BR review sequenced last-but-PWA]** Phase 26 must run after Phases 24 and 25 because both introduce new `// TODO: native-speaker review` markers; the "grep returns 0" done-signal is only meaningful once all marker-producing phases have landed.
- **[PWA real-device UAT is first-class]** Phase 27 must include a real-device iOS standalone-mode UAT as a named success criterion / deliverable — not a v1.x carry-forward. Mirrors the v1.0 retro lesson on audio/wake-lock real-device verification.
- **[Zero net-new runtime deps]** v1.3 may introduce a build-time dependency (`vite-plugin-pwa`) for the PWA phase; the zero-net-new-*runtime*-deps invariant still holds (`dependencies` stays `react` + `react-dom`). Flag at planning.
- **[No STATE_VERSION bump for the cue toggle]** Phase 25's new `indicator` prefs field uses per-field coercion with no `STATE_VERSION` bump (v1.1/v1.2 precedent — Phase 8 D-01/D-04a + Phase 22 STRETCH-07).
- **[Per-commit green-gate]** `tsc && lint && build && test` must exit 0 at every commit (D-09/D-15 invariant carried forward).
- **[Stale PROJECT.md stack line]** Research verified the actual shipped stack is React 19.2 + Vite 8.0 + TypeScript 6 (PROJECT.md says "React 18 + Vite"). v1.3 planning must target the real versions — load-bearing for the `vite-plugin-pwa@^1.3.0` Vite-8 peer-dep. Correct PROJECT.md when convenient.

### Pending Todos

- The three v1.x candidate todos (Forrest native-app links, labels-vs-icons toggle, LICENSE/README) are now scoped into v1.3 Phases 24, 25, and 23 respectively.
- v1.x deferred: `.orb-layer--in/--out` → `.shape-layer--in/--out` rename for naming consistency; per-variant token sets; live idle preview; additional shape variants.

### Blockers/Concerns

- **[Phase 24 planning input]** The Apple App Store numeric ID for Forrest's Resonant Breathing app could not be retrieved during research — must be confirmed at Phase 24 planning. Google Play package ID is confirmed: `com.johngoodstadt.knutson.meditation`.
- **[Phase 25 open questions]** Two one-line operator decisions to resolve at Phase 25 planning: (a) live-swappable vs capture-at-start for the cue toggle (research recommends live); (b) whether the In/Out indicator is on screen before a session starts (decides whether pre-paint FOUC handling is needed).
- **[Phase 27 risks]** The `/hrv/` Vite base-path vs service-worker scope, the stale-cache trap, and iOS standalone-mode audio/Wake-Lock regressions are the dominant Phase 27 risks — none testable in jsdom; budget real-device UAT.

### Quick Tasks Completed

| # | Description | Date | Commit | Directory |
|---|-------------|------|--------|-----------|
| 260510-tc9 | Bug fixes: orb Out-phase visual cue parity + audio bowl-cue decay scaled to phase duration (low-BPM gong cutoff) | 2026-05-11 | 0db8f5d | [260510-tc9-bug-fixes-1-add-out-phase-visual-complet](./quick/260510-tc9-bug-fixes-1-add-out-phase-visual-complet/) |

## Deferred Items

Items acknowledged and carried forward from previous milestone close:

| Category | Item | Status | Deferred At |
|----------|------|--------|-------------|
| v1.x carry-forward | iOS Safari mid-page audio recovery after lock/unlock (Override SC1, user-signed 2026-05-10 — OS-level audio session loss) | Reconstruction infrastructure ships; works on non-iOS engines | 2026-05-11 v1.0 close |
| v1.x carry-forward | Firefox Desktop orb scale-animation flicker (Override FF-01, user-signed 2026-05-10 — root remedy needs CSS keyframes) | Multiple mitigations attempted; ship as-is | 2026-05-11 v1.0 close |
| v1.x carry-forward | S2 Android Chrome wake lock real-device UAT (Phase 5, 05-04-UAT-LOG.md Gap 1) | Physical device unavailable | 2026-05-11 v1.0 close |
| v1.x carry-forward | iOS Safari Pitfall 6 — phone-call interrupted state (Phase 3, Open Question 5 / Assumption A6) | No mitigation planned for v1 | 2026-05-11 v1.0 close |
| v1.x carry-forward → v1.3 Phase 26 | Per-locale `learnContent.ts` native-speaker review for PT-BR (I18N-07) | Scoped into v1.3 Phase 26 | v1.1 scoping |
| v2 → v1.3 Phase 27 | PWA install (PWA-01) — Web App Manifest + service worker | Scoped into v1.3 Phase 27 | v1.1 scoping |
| v1.x debt | Cross-tab `recordSession` increment race (WR-07 root) — STORAGE-03 covers UI consistency only | Documented in REQUIREMENTS.md v1.0.1 Out of Scope | 2026-05-11 v1.0.1 planning |
| procedural | Phase 5 lacks VERIFICATION.md | Artifact gap only; coverage intact via 5.1 UAT Task 4 | 2026-05-11 v1.0 close |
| procedural | Phase 02/03 VERIFICATION.md status "human_needed" (all items closed via 5.1 Task 4 sweep) | Statuses not re-flipped | 2026-05-11 v1.0 close |
| procedural | Phase 15 HUMAN-UAT.md (partial — 3 pending scenarios) | Operator-accepted at phase close; remaining items deferred | 2026-05-15 v1.1 close |
| procedural | Phase 18 HUMAN-UAT.md (partial — 4 pending scenarios) | Operator-accepted at phase close; remaining items deferred | 2026-05-15 v1.1 close |
| procedural | Phase 19 19-UAT.md (audit reports "unknown" status — artifact-format mismatch with audit-open scanner; UAT outcomes recorded inline PASS/PARTIAL/PASS/PASS) | 4/4 UAT items recorded; operator-approved phase close | 2026-05-15 v1.1 close |
| procedural | Phase 15 VERIFICATION.md status "human_needed" | All items resolved via operator UAT sign-off; status not re-flipped | 2026-05-15 v1.1 close |
| procedural | Phase 18 VERIFICATION.md status "human_needed" | All items resolved via operator UAT sign-off; status not re-flipped | 2026-05-15 v1.1 close |
| v1.x carry-forward | iOS standalone-PWA Wake Lock unavailable on iOS < 18.4 (WebKit bug 254545) — surfaced by PWA-01 | Product decision at Phase 27: document as known limitation, optionally detect + warn | 2026-05-15 v1.3 scoping |

**Audit references:**

- `.planning/milestones/v1.0-MILESTONE-AUDIT.md` — PASSED 23/23
- `.planning/milestones/v1.0.1-MILESTONE-AUDIT.md` — PASSED 27/27
- v1.2 — no milestone audit run (operator chose to proceed without `/gsd-audit-milestone`; 12/12 requirements checked off, all 3 phases complete)

## Session Continuity

Last session: 2026-05-15T20:46:55.851Z
Stopped at: Phase 23 context gathered
Resume file: .planning/phases/23-license-readme/23-CONTEXT.md
Next command: `/gsd-plan-phase 23`

## Operator Next Steps

- Review `.planning/ROADMAP.md` (v1.3 group, Phases 23–27) and `.planning/REQUIREMENTS.md` traceability.
- Plan the first phase with `/gsd-plan-phase 23`.
