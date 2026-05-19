# Milestones

## v1.5 Multi-Practice (Shipped: 2026-05-19)

**Phases completed:** 6 phases (30–35), 27 plans, 24 tasks

**Delivered:** Turned the single-practice HRV app into a multi-practice app — a top segmented switcher carrying three practices (HRV · Stretch · Navi Kriya), each with its own settings and stats — plus the app-paced Navi Kriya OM-counting engine, per-practice Learn content, and a new Flute cue timbre. Returning users migrate losslessly across a v1→v2→v3 storage-envelope chain. Zero net-new runtime dependencies; 1255/1255 tests pass.

**Key accomplishments:**

1. **Phase 30 — Multi-Practice Architecture & Switcher:** A `practice` concept above the existing `mode`; per-practice settings + stats persisted via a `STATE_VERSION` v1→v2 migration ladder that losslessly folds a returning user's flat envelope into `practices.resonant` (PRACTICE-04); prototype-pollution-safe `src/storage/practices.ts` persistence module; top segmented `PracticeToggle` above the orb, disabled during a session; practice-aware split `SettingsForm` separating shared chrome from per-practice controls (PRACTICE-01..06).
2. **Phase 31 — Navi Kriya Engine & Session:** App-paced OM-counting practice end to end — `useNKEngine` front/back phase machine with a fixed 4:1 ratio and auto-advance, four synthesized cue sounds (front/back markers, per-OM tick, end chord), a live on-screen OM count / phase / round readout, an end control, and per-practice Navi Kriya stats (sessions / rounds / minutes) isolated from Resonant's (NK-01..09).
3. **Phase 32 — Learn & Localization:** `learnContent.ts` restructured into a per-practice map over a shared base — practice-specific descriptions + Forrest video links, with the shared sections (Who is Forrest, Forrest Resources) rendered for every practice; all new v1.5 copy reviewed to native-quality EN + PT-BR (LEARN-02/03, I18N-08).
4. **Phase 33 — Close gap PRACTICE-02:** Restored resonant-settings persistence across reloads — retargeted the read path from the dead flat `env.settings` field to the `practices.resonant.settings` envelope, removed dead `loadSettings`/`saveSettings`, and added the remount regression tests that would have caught the read/write split-brain.
5. **Phase 34 — Stretch as a Distinct Practice:** Promoted Stretch from an intra-resonant `mode` to a top-level practice — 3-pill switcher (HRV · Stretch · Navi), a `STATE_VERSION` v2→v3 migration with a first-class `practices.stretch` slice, both switcher label treatments (text / icon+label) behind a developer-only `VITE_SWITCHER_TREATMENT` toggle; three UAT gap-closure plans landed exact-duration sessions and a fully-completing orb cycle (STRETCH-01..06 — delivers the deferred Future requirement PRACTICE-F1).
6. **Phase 35 — Flute Cue Timbre:** Replaced the windchime-clone Chime with the spike-008 Flute — harmonic 1·2·3 sine partials and a ~0.13 s soft breath attack via a new optional soft-attack envelope mode on `cueSynth` (strike stays default; Bowl/Bell/Sine byte-identical); `chime → flute` renamed across `TimbreId`, EN/PT-BR copy, and `TimbrePicker`, with a storage coercion migrating persisted `timbre: 'chime'` → `'flute'` (AUDIO-01/02).

**Verification:** Milestone audit `passed` (re-audit 2026-05-19) — 26/26 requirements satisfied, 6/6 phases verified, 0 integration blockers, 6/6 E2E flows complete; 1255/1255 Vitest tests green. NK-07 was amended at the audit to end-only (pause/resume dropped to mirror HRV's no-pause flow, commit `c19c0e1`).

**Known deferred items at close:** Non-blocking tech debt only — see STATE.md `## Deferred Items` and the v1.5 milestone audit `tech_debt` block (orphaned NK pause/resume code already swept by quick task 260519-bee; Nyquist `VALIDATION.md` docs missing for Phases 33/35; Phase 31 `VERIFICATION.md` frontmatter not re-flipped despite operator-confirmed UAT; misc carry-forwards).

**Test count progression:** v1.4 close 997 → v1.5 close 1255 (+258).

---

## v1.4 Install Helper (Shipped: 2026-05-16)

**Phases completed:** 2 phases (28–29), 6 plans, 11 tasks

**Delivered:** Detect when the app runs in a browser (not installed) and help users add it to their home screen — a dismissible phone install banner plus a persistent install option in Settings, fully localized EN + PT-BR.

**Key accomplishments:**

1. **Phase 28 — Phone Install Banner:** Slim, non-blocking, dismissible phone banner — Android `beforeinstallprompt` capture/replay and iOS guided "Share → Add to Home Screen" steps; dismissal persisted in `localStorage` (`hrv:install-dismissed`); phone-class + standalone detection via `useIsStandaloneOrPhone` + `useBeforeInstallPrompt` hooks; wired into `App.tsx` behind the composed `showBanner` gate (INSTALL-01..05).
2. **Phase 29 — Settings Install Entry & Localization:** Persistent install row in `SettingsDialog` gated `installable && !isStandalone` — reachable on any browser including desktop and post-dismissal phone; shared `IosInstallSteps` component as single source of truth for both install surfaces; EN + native-quality PT-BR install copy; GAP-1 closed (theme-aware `--color-breathing-muted` token restores WCAG AA contrast on all 5 themes) (INSTALL-06/07).

**Verification:** Phase 28 5/5, Phase 29 8/8; milestone audit `passed` (7/7 requirements, 12/12 integration, 7/7 E2E flows); 997/997 tests; operator UAT 5/5. Both phases Nyquist-compliant and threat-secure.

---

## v1.3 Release Polish (Shipped: 2026-05-16)

**Phases completed:** 5 phases (23, 24, 25, 26, 27), 11 plans

**Delivered:** Distribution-ready release — MIT LICENSE + refreshed README, Forrest Knutson's native Resonant Breathing apps linked from the Learn surface, a three-way in-orb cue picker, native-quality PT-BR catalogs, and an installable, offline-capable PWA. Zero net-new runtime dependencies; 959/959 tests pass.

**Key accomplishments:**

1. **Phase 23 — License & README:** Net-new MIT `LICENSE` at the repo root + a v1.3-accurate README refresh — corrected BPM range and test count, complete Features list, real MIT-pointer License section (DOCS-01/02).
2. **Phase 24 — Forrest Native-App Links:** Third Learn-dialog link section linking Forrest's iOS App Store and Google Play "Resonant Breathing" apps, neutral claim-safe copy, both EN and PT-BR, `rel="noopener noreferrer"` on every anchor (LEARN-01).
3. **Phase 25 — Labels-vs-Icons Cue Toggle:** New three-option SettingsDialog cue picker — text labels / directional arrow icons / nose-airflow drawing — via a `CueGlyph` component threaded through all 3 visual variants; choice persists in the prefs envelope with no `STATE_VERSION` bump; visually-hidden localized In/Out announcement keeps arrow and drawing modes accessible (CUE-01/02/03).
4. **Phase 26 — PT-BR Native-Speaker Review:** Operator-reviewed sweep of both `src/content/` catalogs — 98 `// TODO: native-speaker review` markers resolved to native quality (short `Puxa`/`Solta` labels kept for UI fit); new `content.no-review-markers.test.ts` fs-scan drift-guard locks the done-state; frozen-EN `LOCKED_COPY` byte-equality guard intact (I18N-07).
5. **Phase 27 — PWA Install & Offline:** `vite-plugin-pwa` wired as a build-time devDependency; `/hrv/`-scoped Web App Manifest with maskable + Apple touch icons; Workbox `generateSW` service worker precaches the app shell for full offline sessions; `autoUpdate` + `cleanupOutdatedCaches` rolls updates without a stale shell; dark orb-glow install icons; real-device iOS standalone UAT (iOS 18.7.9) passed all 6 scenarios (PWA-01/02/03).

**Gaps resolved at close:** 3 stale shipped-work todos moved to completed; phase 24 and 26 human-UAT browser checks recorded PASS; phase 24 `human_needed` verification closed.

**Test count progression:** v1.2 close 839 → v1.3 close 959 (+120).

---

## v1.2 BPM Stretch (Shipped: 2026-05-15)

**Phases completed:** 3 phases (20, 21, 22), 8 plans, 8 tasks

**Delivered:** BPM stretch session pattern (Warm-up → Stretch ramp → Settle) on the existing one-clock SessionFrame — sub-perceptual BPM steps along a cycle-aligned segment table — plus two small UX gaps closed: lead-in double-start prevention and per-theme favicons. Zero net-new runtime dependencies; 839/839 tests pass.

**Key accomplishments:**

1. **Phase 20 — Session Start Polish:** Primary button relabels to `Cancel` / `Cancelar` during the lead-in countdown via a three-way ternary label resolution (`inLeadIn` optional prop), removing the double-start affordance — a second click runs the existing cancel branch (LEAD-01).
2. **Phase 21 — Per-Theme Favicon:** Shared `faviconPalette` module (5 accent-strong palette colors + SVG template) + `useFavicon` orchestrator hook with dual-event cross-tab sync (`storage` + `hrv:prefs-changed`) and gated `matchMedia` system-theme resolve; pre-paint inline script in `index.html` applies the persisted-theme favicon before first paint with no FOUC; `favicon.sync.test.ts` guards palette/theme.css drift (FAVI-01/02/03).
3. **Phase 22 — BPM Stretch engine:** Piecewise-constant `stretchRamp.ts` ramp engine with a sub-0.5-BPM step invariant, cycle-aligned segment table so BPM steps land only on Out→In boundaries, minute-based stage durations, and a fully-typed `SessionSettings` schema (`SessionMode`, stretch field options, `isValid*` predicates, `DEFAULT_STRETCH_SETTINGS`).
4. **Phase 22 — Stretch persistence + controller:** Stretch settings persist via the existing forward-compat localStorage envelope with no `STATE_VERSION` bump (per-field `coerceSettings` fallback on read); `sessionController` dispatches frame computation to the segment table for stretch sessions; `extendTimedSession` rejects stretch sessions.
5. **Phase 22 — Stretch UI:** `SettingsForm` renders the Standard/Stretch mode picker, the conditional 5-field stretch block, the 15-min gate hint and a live computed-total Duration readout; `SessionReadout` shows the live BPM chip + stage label for running stretch sessions; EN + PT-BR strings for the full surface.
6. **Phase 22 — Stretch audio:** The App.tsx audio boundary effect computes per-cycle audio-clock offsets from the stretch segment table — Phase 3 D-13/D-14 dual-anchor scheduling holds across every BPM step with no gap or misalignment (STRETCH-08).

**Operator UAT deviation:** A mid-checkpoint operator UAT on Phase 22 drove a stretch-UX redesign (minimum-duration gate removed, minute-based stages, stage renames) implemented in commit `8eb35bd` and re-verified to approval.

**Known deferred items at close:** 5 open artifact items acknowledged and deferred (see STATE.md `## Deferred Items`) — 1 quick-task scanner false positive + 4 pending todos.

**Test count progression:** v1.1 close 712 → v1.2 close 839 (+127).

---

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
