---
gsd_state_version: 1.0
milestone: v1.2
milestone_name: BPM Stretch
status: Awaiting next milestone
stopped_at: Phase 22 UI-SPEC approved
last_updated: "2026-05-15T18:51:37.078Z"
last_activity: 2026-05-15 — Milestone v1.2 completed and archived
progress:
  total_phases: 3
  completed_phases: 3
  total_plans: 8
  completed_plans: 8
  percent: 100
---

# Project State

## Project Reference

See: .planning/PROJECT.md (updated 2026-05-15 — after v1.2 BPM Stretch milestone close)

**Core value:** Users can start a hands-off HRV breathing session and comfortably follow accurate, uninterrupted inhale/exhale guidance through synchronized visuals and optional sound.
**Current focus:** Planning next milestone — `/gsd-new-milestone`

## Current Position

Phase: Milestone v1.2 complete
Plan: —
Status: Awaiting next milestone
Last activity: 2026-05-15 — Milestone v1.2 completed and archived

## Performance Metrics

**Velocity:**

- Total plans completed (v1.0): 30
- Total plans completed (v1.0.1): 12
- Total plans completed (v1.1): 47
- Total plans completed (v1.2): 8

**By Phase (v1.1):**

| Phase | Plans | Status |
|-------|-------|--------|
| 13. Inner-Ring UX Symmetry | 1 | Complete |
| 14. Prefs Foundation | 1 | Complete |
| 15. SettingsDialog Shell | 4 | Complete |
| 16. Themes | 4 | Complete |
| 16.1. UI Token Migration | 7 | Complete |
| 16.2. Palette Aesthetic Refresh | 2 | Complete (INSERTED 2026-05-13 — Phase 16.1 UAT carry-forward closed; perceptual aesthetic UAT deferred to Phase 16.3) |
| 16.3. Thorough Theme Revision | 7 | Complete (INSERTED 2026-05-13 — 5 palettes redesigned from named open-source design systems with per-palette UAT; ring-inner harmonization carry-forwards closed for Moss + Slate) |
| 17. Visual Variants | 6 | Complete (2026-05-14 — operator-driven Ring → Diamond deviation in plan 17-06; VisualVariantId `'orb' \| 'square' \| 'diamond'`; 588 tests passing; D-05 default `'orb'` invariant held; old `'ring'` values coerce to `'orb'`) |
| 18. Audio Timbres | 6 | Complete (2026-05-14) |
| 19. Language Switching | 9 | Complete (2026-05-14) |

**By Phase (v1.2):**

| Phase | Plans | Status |
|-------|-------|--------|
| 20. Session Start Polish | 1 | Complete (2026-05-15 — LEAD-01; Cancel/Cancelar lead-in label) |
| 21. Per-Theme Favicon | 2 | Complete (2026-05-15 — FAVI-01..03; faviconPalette + useFavicon + pre-paint script) |
| 22. BPM Stretch Session | 5 | Complete (2026-05-15 — STRETCH-01..08; stretchRamp engine + segment table + UI; operator-UAT UX redesign) |

## Accumulated Context

### Roadmap Evolution

- Phase 16.1 inserted after Phase 16: UI Token Migration — gap closure after Phase 16 human-verify surfaced 16+ components with hardcoded teal/slate Tailwind classes that don't rebind on data-theme swap (URGENT)
- Phase 16.1 complete (2026-05-13) — 16 production .tsx files + index.css migrated to --color-breathing-* tokens; D-01 --color-breathing-on-accent added across 5 palettes; theme.no-hardcoded-classes.test.ts guard active (10 patterns); contrast guard extended with accent-strong vs on-accent iteration; 7 plans across 4 waves
- Phase 16.2 inserted after Phase 16.1: Palette Aesthetic Refresh — UAT carry-forward from 16.1 plan 06 (5 findings: Light Out + Moss Out + Slate Out gradients over-saturated; Dusk In too bright; Dusk Out softening). Out of 16.1 scope per CONTEXT.md (palette retuning)
- Phase 16.2 Plan 01 executed 2026-05-13 — 4 atomic per-palette commits (B1 bisect cadence): Light F1 amber-500/300 (`565581a`), Moss F4 emerald-700/300 (`fffa7ac`), Slate F5 slate-600/400 (`5eb446e`), Dusk F6+F7 violet-200/100 + amber-700/200 (`cc58998`). All 5 palettes pass THEME-05 ≥ 1.5 contrast (Light 1.59, Dark 4.85 unchanged, Moss 2.36, Slate 3.68, Dusk 1.85). Dark palette byte-identical (approved-untouched protocol held).
- Phase 16.2 closed 2026-05-13 — smoke + text-legibility UAT approved; perceptual aesthetic UAT deferred to Phase 16.3 per operator decision (thorough theme revision sourcing each palette from a vetted open-source design system supersedes ad-hoc retune). F1/F4/F5/F6/F7 mathematically closed in 16.2; perceptual sign-off to be re-collected after 16.3 redesign.
- Phase 16.3 inserted 2026-05-13 — Thorough Theme Revision: interactive theme-by-theme palette redesign with user-supplied open-source design-system reference per palette (e.g. Catppuccin Frappe for Dark). Replaces 16.1/16.2 ad-hoc aesthetic results with deliberately-curated palettes; honors THEME-05 ≥ 1.5 contrast and THEME-UI-01 token-binding contracts.
- Phase 16.3 closed 2026-05-13 — 5 palettes redesigned from named open-source design systems (Light=Nord Frost, Dark=Nord Polar Night, Moss=Everforest Light medium, Slate=Tokyo Night Day, Dusk=Rosé Pine Main); 7 plans / 7 waves (1 preflight + 5 per-palette B1 cadence + 1 close); per-palette THEME-05 floor + D-01 ≥ 1.5 hold across all 5 palettes; 5/5 perceptual UAT approved; ring-inner harmonization carry-forward closed for Moss + Slate; REQUIREMENTS.md untouched (B2 — aesthetic redesign honors existing constraint IDs only).
- Phase 17 closed 2026-05-14 — Visual Variants: 3 render variants (Orb default + Square 18% rounded-square + Diamond rotated-square clip-path) via dispatcher + sibling-shape pattern (D-01); `.shape-marker--*` CSS rename (D-15); render-local `data-variant` attribute (D-16); zero new color tokens (D-13 token reuse across variants); sessionVariantRef snapshot at Start (D-09/D-10); 6 plans across 5 waves. Mid-execution operator UAT deviation: variant 3 swapped from Ring (annulus radial-gradient) → Diamond (rotated-square via clip-path on body + inscribed rotated-square markers via CSS-only override); 6 deviation commits (`c6ae41f`, `cac9680`, `78d5f69`, `3d4f97f`, `4c8846e`, `9bf5b90`); D-05 default `'orb'` invariant held; forward-compat: old `'ring'` localStorage values coerce to `DEFAULT_VARIANT`; per-palette + reduced-motion + cross-tab UAT approved; 588 tests passing; zero net-new runtime deps (D-18).
- Phase 18 closed 2026-05-14 — Audio Timbres: 4 synthesized timbre presets (Bowl default + Bell + Sine + Chime) wired into cueSynth via scheduleInCueForTimbre/scheduleOutCueForTimbre dispatch; timbreRef mirror of mutedRef; timbre captured at session start per D-08/D-09; TimbrePicker radiogroup body (verbatim mirror of ThemePicker); 6 plans across 5 waves; zero net-new runtime deps; per-commit green-gate held.
- Phase 19 closed 2026-05-14 — Language Switching: EN+PT-BR instant React state swap; roll-your-own typed Record<LocaleId, UiStrings> catalog (14 sub-objects, 63 PT-BR entries); LOCKED_COPY module with frozen-EN byte-equality guard (lockedCopy.test.ts .toBe assertions); useLocale orchestrator (3 effects: lang write + cross-tab storage + same-tab hrv:prefs-changed); LanguagePicker radiogroup; strings-prop drilled to 17 consumer components across Plans 06+07; App.tsx wires useLocale + resolves per-render catalogs (Plans 08+09); medical-advice migrated to LOCKED_COPY.medicalAdviceLine; 9 plans across 5 waves; 712 tests passing post-UAT deviation fixes; UAT-2 PT-BR translation deviations applied in commit 311a55e (UiStrings.app slice + bowl→Taça + 4 video titles reverted to English); I18N-07 native-speaker review deferred to v1.x; zero net-new runtime deps.
- v1.2 BPM Stretch roadmap created 2026-05-15 — 3 phases (20 Session Start Polish, 21 Per-Theme Favicon, 22 BPM Stretch Session) ordered smallest-blast-radius first; backlog items 999.1 and 999.2 promoted into Phases 21 and 20 respectively; 12/12 requirements mapped; PATT-02 remains constrained to one-clock SessionFrame + dual-anchor audio (Phase 3 D-13/D-14) + existing localStorage envelope (Phase 8 D-01/D-04a).

### Decisions

Decisions are logged in PROJECT.md Key Decisions table.
Recent decisions affecting current work:

- **[v1.1 phase ordering]** Smallest-blast-radius-first sequencing: Phase 13 (pure CSS warm-up) → Phase 14 (storage/domain foundation) → Phase 15 (dialog shell) → Phase 16 (themes, CSS-only, smallest surface) → Phase 17 (render-only variants) → Phase 18 (audio timbres, highest technical risk) → Phase 19 (i18n, widest string surface, last to minimize structural conflicts).
- **[D-12 locked-copy override]** I18N-06: Forrest claim-safe copy IS routed through the translation pipeline (user decision overriding research recommendation). Phase 19 must ship a guardrail mechanism (translation-key allowlist or locked-copy review checklist) so future locale contributions cannot silently weaken D-12 positioning.
- **[Next-session-only swap]** Timbre and Variant pickers are disabled while `inSessionView`. No mid-session swap. Captured at session start. Mid-session BPM swap (outside the planned stretch ramp) also remains forbidden (consistent with v1.1 timbre/variant rule).
- **[Zero net-new runtime deps]** All v1.1 features achieved with existing Tailwind v4, Web Audio API, React, and TypeScript patterns. No `npm install` permitted for v1.2.
- **[Per-commit green-gate]** `tsc && lint && build && test` must exit 0 at every commit (D-09/D-15 invariant carried forward from v1.0.1).
- **[Roll-your-own i18n]** No i18n library for v1.1. Typed `Record<LocaleId, UiStrings>` content file + locale-keyed `learnContent.ts` map. Revisit Lingui only if 5+ locales ship.
- **[PT-BR machine translation]** I18N-07 machine translation with `// TODO: native-speaker review` flag is acceptable for v1.1 ship; native review is a v1.x carry-forward.
- **[Bowl default byte-identical]** TIMBRE-02: Default timbre = `'bowl'`. Users who never open SettingsDialog hear zero audio change from v1.0.1.
- **[v1.2 phase ordering]** Smallest-blast-radius first: Phase 20 (single button state, surgical) → Phase 21 (favicon swap, asset + DOM) → Phase 22 (engine + UI, highest risk). Operator-decided at roadmap creation.
- **[Stretch on existing one-clock SessionFrame]** Phase 22 must not introduce a second clock or timing abstraction. BPM steps ride the Phase 1 contract unchanged.
- **[Stretch audio reuses dual-anchor scheduling]** Phase 3 D-13/D-14 dual-anchor invariant holds across the stretch ramp. No per-segment audio cue variants; single cue contract per session.
- **[Stretch settings ride existing envelope]** Phase 8 D-01/D-04a refuse-downgrade write + forward-compat read contract applies to stretch settings persistence. Schema bump must remain backward-compatible.
- [Phase ?]: Plan 16.1-01 D-02 strategy: Path A (Tailwind v4 /N alpha modifier on var()) is the default; Path B (inline rgb(from var(...) r g b / N)) is the fallback if plan 04 dev-server smoke check shows transparent render

### Pending Todos

- v1.x deferred: `.orb-layer--in/--out` → `.shape-layer--in/--out` rename for naming consistency; per-variant token sets; live idle preview; additional shape variants.
- Open todos (4) tracked under `.planning/todos/` — see Deferred Items below. Triage at next-milestone scoping.

### Blockers/Concerns

None — v1.2 shipped clean. No open blockers.

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
| v1.x debt | Cross-tab `recordSession` increment race (WR-07 root) — STORAGE-03 covers UI consistency only | Documented in REQUIREMENTS.md v1.0.1 Out of Scope | 2026-05-11 v1.0.1 planning |
| procedural | Phase 5 lacks VERIFICATION.md | Artifact gap only; coverage intact via 5.1 UAT Task 4 | 2026-05-11 v1.0 close |
| procedural | Phase 02/03 VERIFICATION.md status "human_needed" (all items closed via 5.1 Task 4 sweep) | Statuses not re-flipped | 2026-05-11 v1.0 close |
| procedural | Phase 15 HUMAN-UAT.md (partial — 3 pending scenarios) | Operator-accepted at phase close; remaining items deferred | 2026-05-15 v1.1 close |
| procedural | Phase 18 HUMAN-UAT.md (partial — 4 pending scenarios) | Operator-accepted at phase close; remaining items deferred | 2026-05-15 v1.1 close |
| procedural | Phase 19 19-UAT.md (audit reports "unknown" status — artifact-format mismatch with audit-open scanner; UAT outcomes recorded inline PASS/PARTIAL/PASS/PASS) | 4/4 UAT items recorded; operator-approved phase close | 2026-05-15 v1.1 close |
| procedural | Phase 15 VERIFICATION.md status "human_needed" | All items resolved via operator UAT sign-off; status not re-flipped | 2026-05-15 v1.1 close |
| procedural | Phase 18 VERIFICATION.md status "human_needed" | All items resolved via operator UAT sign-off; status not re-flipped | 2026-05-15 v1.1 close |
| procedural | Quick task `260510-tc9` listed "missing" status by audit-open scanner | Bug fixes shipped in commit `0db8f5d` (Phase 5.1 close) — status field gap only | 2026-05-15 v1.1 close |
| v1.x carry-forward | Pending todo `2026-05-13-themes-aesthetic-refresh.md` (medium) | Aesthetic refresh deferred behind 16.3 thorough redesign; revisit if 16.3 results show further gaps | 2026-05-15 v1.1 close |
| procedural | Quick task `260510-tc9` still listed "missing" by audit-open scanner | Bug fixes shipped in commit `0db8f5d`; status field gap only — re-acknowledged at v1.2 close | 2026-05-15 v1.2 close |
| todo | Pending todo `2026-05-15-add-forrest-native-app-links-to-learn-page.md` (ui) | New v1.x candidate — add links to Forrest's native Resonant Breathing apps on the Learn surface; triage at next-milestone scoping | 2026-05-15 v1.2 close |
| todo | Pending todo `2026-05-15-add-labels-vs-icons-toggle-for-session-indicator.md` (ui) | New v1.x candidate — labels-vs-icons toggle for the session indicator; triage at next-milestone scoping | 2026-05-15 v1.2 close |
| todo | Pending todo `2026-05-15-add-license-to-repo-and-update-readme.md` (docs) | New v1.x candidate — add a LICENSE file and update README; triage at next-milestone scoping | 2026-05-15 v1.2 close |

**Audit references:**

- `.planning/milestones/v1.0-MILESTONE-AUDIT.md` — PASSED 23/23
- `.planning/milestones/v1.0.1-MILESTONE-AUDIT.md` — PASSED 27/27
- v1.2 — no milestone audit run (operator chose to proceed without `/gsd-audit-milestone`; 12/12 requirements checked off, all 3 phases complete)

## Session Continuity

Last session: 2026-05-15 — v1.2 BPM Stretch milestone completed and archived
Stopped at: Milestone v1.2 complete
Resume file: —
Next command: `/gsd-new-milestone`

## Operator Next Steps

- Start the next milestone with /gsd-new-milestone
