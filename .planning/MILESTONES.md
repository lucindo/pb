# Milestones

## v1.1 Customization (Shipped: 2026-05-15)

**Phases completed:** 10 phases (13, 14, 15, 16, 16.1, 16.2, 16.3, 17, 18, 19), 47 plans, 58 tasks

**Delivered:** Full SettingsDialog with 4 pickers (Theme, Variant, Timbre, Language). 5 named palettes (Light, Dark, Moss, Slate, Dusk) curated from open-source design systems (Nord, Everforest, Tokyo Night, Rosé Pine), full UI token migration to `--color-breathing-*` cascade, 3 visual variants (Orb, Square, Diamond), 4 synthesized audio timbres (Bowl, Bell, Sine, Chime), and EN+PT-BR language switching with frozen-EN locked claim-safe copy guard. Zero net-new runtime dependencies; 712/712 tests pass.

**Key accomplishments:**

1. **Phase 13 — Inner-Ring UX Symmetry:** Reduced-motion path drops `.orb-ring--inner` in favor of `.orb-layer--out` opacity crossfade alone (WARMUP-01 / D-07 preserved). Pure CSS; closes carry-forward todo from v1.0.1.
2. **Phase 14 — Prefs Foundation:** `Envelope.prefs` storage shape + `Record<dimension, valid-value>` domain validators; coerce-on-read for unknown stored values. Unblocks every downstream customization dimension.
3. **Phase 15 — SettingsDialog Shell:** Native `<dialog>` shell + gear `SettingsAnchor` trigger + 4 stub pickers + `inSessionView` disable contract before any feature picker is wired (INFRA-04 SC1..SC5).
4. **Phase 16 + 16.1 + 16.2 + 16.3 — Themes:** 5-palette CSS token cascade (`@theme` + `[data-theme]:root` overrides), FOUC inline script, automated WCAG luminance contrast guard (≥ 1.5 on orb In/Out midpoints across all 5 palettes), full UI token migration of 16 components from hardcoded Tailwind classes to `var(--color-breathing-*)`, and final palette redesign sourced from named open-source design systems (Nord Frost, Nord Polar Night, Everforest Light, Tokyo Night Day, Rosé Pine Main).
5. **Phase 17 — Visual Variants:** 3 render variants (Orb default + Square 18% rounded-square + Diamond rotated-square clip-path) via dispatcher + sibling-shape pattern; render-local `data-variant`; sessionVariantRef snapshot at Start; zero new color tokens (D-13 token reuse across variants); mid-execution operator deviation Ring → Diamond with forward-compat coercion for old `'ring'` localStorage values.
6. **Phase 18 — Audio Timbres:** 4 synthesized timbre presets wired into `cueSynth` via `scheduleInCueForTimbre` / `scheduleOutCueForTimbre` dispatch; `timbreRef` mirror of `mutedRef`; timbre captured at session start (D-08/D-09); Bowl default byte-identical (TIMBRE-02 — zero audio change for users who never open SettingsDialog).
7. **Phase 19 — Language Switching:** EN+PT-BR catalogs with roll-your-own typed `Record<LocaleId, UiStrings>` (14 sub-objects), `useLocale` orchestrator hook (3 effects: lang write + cross-tab storage + same-tab `hrv:prefs-changed`), `LanguagePicker` radiogroup with native endonyms, strings-prop drilled to 17 consumer components, locked claim-safe copy module (`LOCKED_COPY`) guarded by frozen-EN byte-equality `.toBe()` snapshot in `lockedCopy.test.ts`. UAT-2 translation deviations applied post-execution (`app` slice for header/title, bowl→Taça, In/Out→Puxa/Solta, etc.). Locale-aware `formatLastSessionDate(locale)` so PT-BR users see dates in Portuguese.

**Known deferred items at close:** 7 (see STATE.md `## Deferred Items`). Primary carry-forward: PT-BR native-speaker review for 76 `// TODO: native-speaker review` markers (I18N-07 → v1.x).

**Test count progression:** v1.0.1 baseline 409 → v1.1 close 712 (+303).

**Roadmap insertions:** Phase 16.1 (UI Token Migration), Phase 16.2 (Palette Aesthetic Refresh), Phase 16.3 (Thorough Theme Revision) — each captured a gap surfaced during operator UAT and routed back through discuss → plan → execute before continuing the original roadmap.

---

## v1.0.1 Code Review Patch (Shipped: 2026-05-12)

**Phases completed:** 6 phases, 12 plans, 17 tasks

**Key accomplishments:**

- strictTypeChecked + projectService landed; 48 production ESLint errors eliminated across unbound-method (24), restrict-template-expressions (16), no-confusing-void-expression (6), and no-misused-promises (2) rule clusters via type-signature annotations, template-literal wrapping, JSX bracing, and void-wrappers
- 1. [Rule 2 - Missing] BreathingShape.tsx — redundant `as CSSProperties` casts
- react-hooks/exhaustive-deps explicitly overridden to error level in eslint.config.js; all three surviving set-state-in-effect disables in src/ annotated with D-04 // Reason: policy lines; Phase 7 milestone complete
- `readEnvelope` preserves on-disk numeric `version` and propagates unknown top-level fields via D-01 spread-then-override; `writeEnvelope` refuses to overwrite a future-version on-disk envelope via D-04a's nested-try-catch inline re-read; STORAGE-01/02 contracts locked with two Vitest cases.
- App.tsx now registers a `window` 'storage' event listener at mount that calls `setStats(loadStats())` when another same-origin tab writes the envelope (filtered by `e.key === STATE_KEY`); D-06a key filter, D-06 single-trigger, D-05 stats-only scope locked by two new Vitest cases; full suite at 366 tests passing.
- 1. [Rule 3 - Build Blocker] Removed setStatus('starting') in useAudioCues.ts
- 1. [Rule 3 — Blocking Issue] BreathingShape + SessionReadout consumer migration moved into Task 1
- 1. [Rule 3 — Blocking Issue] Task 2 muted-state setup added before render
- One-liner:
- Five-task cleanup landing the last v1.0.1 patch — favicon ships under Vite base-path, amzn.to short URL replaced with Forrest's verbatim amazon.com /dp/B0CCFWP4W8 canonical, predicate duplication eliminated via domain/storage extraction (9 new tests), JSDoc seam for formatLastSessionDate, and HYGIENE-01 closed as Overtaken-by-Phase-9-AUDIO-02 in two cross-cited docs.

---

## v1.0 MVP (Shipped: 2026-05-11)

**Delivered:** A hands-off HRV breathing webapp with accurate session timing, polished accessible visual guide, optional generated audio cues, local memory + practice stats, mobile wake-lock resilience, and a claim-safe Forrest Knutson learning surface.

**Phases:** 7 (Phases 1, 2, 3, 4, 5, 5.1 INSERTED, 6)
**Plans:** 30 (29 with SUMMARY.md; Plan 05-04 manual UAT logged via 05-04-UAT-LOG.md)
**Timeline:** 2026-05-08 → 2026-05-11 (3 days)
**Codebase:** ~9,032 LOC TypeScript/TSX/CSS in `src/`
**Tests:** 363/363 Vitest pass, `tsc --noEmit` exit 0, `npm run build` exit 0 (2026-05-10)
**Commits:** 334 total on `main` (55 `feat(` commits)

### Key accomplishments

1. **Configurable session timing** — BPM 1–7 (0.5 steps), 4 inhale/exhale ratios (50:50, 40:60, 30:70, 20:80), 5–60 min in 5-min steps or unlimited. Single accurate clock drives continuous inhale/exhale alternation with no pauses; timed completion + manual end paths both clean up cleanly.
2. **Polished accessible visual guide** — Orb with stacked gradient layers + two static reference rings + in-orb large phase label, fluid `clamp()` sizing, reduced-motion fixed-mid-scale + gradient crossfade branch, native `<dialog>` end-session confirm with locked copy, focus-visible rings, 44×44 hit-area floor.
3. **Optional generated audio cues** — FakeAudioContext-tested `cueSynth` + `lookaheadScheduler`, AC lifecycle + mute fade + lead-in scheduling, dual-anchor scheduling for phase-aligned cues, MuteToggle with morphing reconstruction affordance for iOS recovery.
4. **Local memory + practice stats** — Silent-fallback localStorage envelope, per-field validate-and-fallback restore on mount, persisted setters, single-write-site stats record with idempotency guard, StatsFooter (count + total minutes + last session), ResetStatsDialog wipes stats only.
5. **Mobile hands-off resilience** — Progressive-enhancement Wake Lock with two-ref pattern (sentinel + wasAcquired), match-pair sentinel guard, idempotent release, visibility re-acquire across 3 App.tsx call sites.
6. **Hands-off polish (Phase 5.1 INSERTED)** — iOS Safari audio engine reconstruction + dual-anchor re-anchor (D-29..D-44) + gesture-attached resume affordance; Safari desktop orb max-scale visual fix via explicit-positioning pattern on `.orb` + outer-ring spans.
7. **Learning + claim-safe positioning** — Page-level `LearnAnchor` (D-18 disable-not-hide contract during session view) + native `<dialog>` `LearnDialog` with Forrest YouTube/Website-Trainings/Mastering-Meditation-book/curated videos, locked `inspired by Forrest's teachings` phrase, two-line disclaimer.

### Carry-forwards to v1.x

| Item | Source |
|------|--------|
| iOS Safari mid-page audio recovery after lock/unlock | Override SC1 (user-signed 2026-05-10) — OS-level audio session loss |
| Firefox Desktop orb scale-animation flicker | Override FF-01 (user-signed 2026-05-10) — root remedy needs CSS keyframes |
| S2 Android Chrome wake lock real-device UAT | Phase 5 Plan 04 — physical device unavailable |
| iOS Safari Pitfall 6 — phone-call interrupted state | Phase 3 Open Question 5 / Assumption A6 |
| Inner-ring UX symmetry (Issue B) | Phase 5.1 — separate planning candidate |

Known deferred items at close: 5 functional carry-forwards + 2 procedural artifact gaps (Phase 5 missing VERIFICATION.md, Phase 02/03 VERIFICATION.md status `human_needed` after 5.1 Task 4 cross-browser sweep closed all items). See `.planning/STATE.md` Deferred Items.

### Audit

`.planning/milestones/v1.0-MILESTONE-AUDIT.md` — PASSED 23/23 requirements satisfied, 7/7 cross-phase flows wired.

---
