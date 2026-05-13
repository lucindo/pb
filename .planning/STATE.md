---
gsd_state_version: 1.0
milestone: v1.1
milestone_name: Customization
status: executing
stopped_at: Completed 16.1-01-PLAN.md
last_updated: "2026-05-13T04:43:15.078Z"
last_activity: 2026-05-13
progress:
  total_phases: 8
  completed_phases: 4
  total_plans: 17
  completed_plans: 12
  percent: 71
---

# Project State

## Project Reference

See: .planning/PROJECT.md (updated 2026-05-12 — v1.0.1 shipped, v1.1 roadmap defined)

**Core value:** Users can start a hands-off HRV breathing session and comfortably follow accurate, uninterrupted inhale/exhale guidance through synchronized visuals and optional sound.
**Current focus:** Phase 16.1 — UI Token Migration

## Current Position

Phase: 16.1 (UI Token Migration) — EXECUTING
Plan: 2 of 7
Status: Ready to execute
Last activity: 2026-05-13

Progress: [███████░░░] 71%

## Performance Metrics

**Velocity:**

- Total plans completed (v1.0): 30
- Total plans completed (v1.0.1): 12
- Average duration: N/A (v1.1 not started)
- Total execution time: 0.0 hours (v1.1)

**By Phase (v1.1):**

| Phase | Plans | Status |
|-------|-------|--------|
| 13. Inner-Ring UX Symmetry | 1 | Complete |
| 14. Prefs Foundation | 1 | Complete |
| 15. SettingsDialog Shell | 4 | Complete |
| 16. Themes | 4 | Complete |
| 16.1. UI Token Migration | TBD | Not started (INSERTED) |
| 17. Visual Variants | TBD | Not started |
| 18. Audio Timbres | TBD | Not started |
| 19. Language Switching | TBD | Not started |
| Phase 16.1 P01 | 260 | 3 tasks | 5 files |

## Accumulated Context

### Roadmap Evolution

- Phase 16.1 inserted after Phase 16: UI Token Migration — gap closure after Phase 16 human-verify surfaced 16+ components with hardcoded teal/slate Tailwind classes that don't rebind on data-theme swap (URGENT)

### Decisions

Decisions are logged in PROJECT.md Key Decisions table.
Recent decisions affecting current work:

- **[v1.1 phase ordering]** Smallest-blast-radius-first sequencing: Phase 13 (pure CSS warm-up) → Phase 14 (storage/domain foundation) → Phase 15 (dialog shell) → Phase 16 (themes, CSS-only, smallest surface) → Phase 17 (render-only variants) → Phase 18 (audio timbres, highest technical risk) → Phase 19 (i18n, widest string surface, last to minimize structural conflicts).
- **[D-12 locked-copy override]** I18N-06: Forrest claim-safe copy IS routed through the translation pipeline (user decision overriding research recommendation). Phase 19 must ship a guardrail mechanism (translation-key allowlist or locked-copy review checklist) so future locale contributions cannot silently weaken D-12 positioning.
- **[Next-session-only swap]** Timbre and Variant pickers are disabled while `inSessionView`. No mid-session swap. Captured at session start.
- **[Zero net-new runtime deps]** All v1.1 features achieved with existing Tailwind v4, Web Audio API, React, and TypeScript patterns. No `npm install` permitted.
- **[Per-commit green-gate]** `tsc && lint && build && test` must exit 0 at every commit (D-09/D-15 invariant carried forward from v1.0.1).
- **[Roll-your-own i18n]** No i18n library for v1.1. Typed `Record<LocaleId, UiStrings>` content file + locale-keyed `learnContent.ts` map. Revisit Lingui only if 5+ locales ship.
- **[PT-BR machine translation]** I18N-07 machine translation with `// TODO: native-speaker review` flag is acceptable for v1.1 ship; native review is a v1.x carry-forward.
- **[Bowl default byte-identical]** TIMBRE-02: Default timbre = `'bowl'`. Users who never open SettingsDialog hear zero audio change from v1.0.1.
- [Phase ?]: Plan 16.1-01 D-02 strategy: Path A (Tailwind v4 /N alpha modifier on var()) is the default; Path B (inline rgb(from var(...) r g b / N)) is the fallback if plan 04 dev-server smoke check shows transparent render

### Pending Todos

- Phase 13 planning: `/gsd-plan-phase 13`
- Carry-forward from v1.0.1: `2026-05-11-reduced-motion-still-shows-out-phase-boundary-cue` — RESOLVED directly by Phase 13 (WARMUP-01 reframed as reduced-motion `.orb-ring--inner { display: none }`; no separate verification step). Todo moves to `.planning/todos/completed/` on phase close per 13-CONTEXT.md D-09.

### Blockers/Concerns

None at roadmap creation. Technical risk flags:

- **Phase 18 (highest risk):** `timbreRef` + reconstruction replay interaction with AUDIO-01 generation counter. Phase sequenced after prefs + dialog foundation to isolate failure mode.
- **Phase 19 (widest surface):** I18N string surface touches every visible label; sequenced last to avoid structural conflicts with theme/variant/timbre changes in Phases 16–18.

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
| v1.x carry-forward | Per-locale `learnContent.ts` native-speaker review for PT-BR (I18N-07) | Machine translation ships with TODO flag | v1.1 scoping |
| v2 | PWA install (PWA-01) — Web App Manifest + service worker | Out of v1.1 scope; revisit after customization milestone validation | v1.1 scoping |
| v2 | BPM stretch session (PATT-02) | Out of v1.1 scope; revisit post-customization | v1.1 scoping |
| v1.x debt | Cross-tab `recordSession` increment race (WR-07 root) — STORAGE-03 covers UI consistency only | Documented in REQUIREMENTS.md v1.0.1 Out of Scope | 2026-05-11 v1.0.1 planning |
| procedural | Phase 5 lacks VERIFICATION.md | Artifact gap only; coverage intact via 5.1 UAT Task 4 | 2026-05-11 v1.0 close |
| procedural | Phase 02/03 VERIFICATION.md status "human_needed" (all items closed via 5.1 Task 4 sweep) | Statuses not re-flipped | 2026-05-11 v1.0 close |

**Audit references:**

- `.planning/milestones/v1.0-MILESTONE-AUDIT.md` — PASSED 23/23
- `.planning/milestones/v1.0.1-MILESTONE-AUDIT.md` — PASSED 27/27

## Session Continuity

Last session: 2026-05-13T04:43:15.072Z
Stopped at: Completed 16.1-01-PLAN.md
Resume file: None
Next command: Phase 16.1 (UI Token Migration) planning — `/gsd-plan-phase 16.1`

## Operator Next Steps

- Begin Phase 17 (Visual Variants) planning: `/gsd-plan-phase 17`
