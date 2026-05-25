# Milestones

## v2.0 New Design (Shipped: 2026-05-25)

**Phases completed:** 8 phases (36, 37, 38, 39, 40, 41, 44, 45 — phases 42/43 absorbed into 41 by design), 35 plans + 18 spike-loop items, 335 commits, 6-day timeline (2026-05-20 → 2026-05-25).

**Delivered:** Landed the spike-010 Monochrome Zen visual system end-to-end across all five surfaces (Idle / Running / Complete / Learn / App Settings) with a per-item operator-in-the-loop spike-loop format; tightened the vocabulary (Stats UI gone, Square/Diamond gone, Moss/Slate/Dusk gone); added an audible timbre preview; reset the v1.x procedural backlog in a single bookkeeping sweep up front; closed out with a `/gsd:code-review --all --fix` polish sweep plus a post-UAT bidirectional progress-arc ring cue (default flipped at operator request). Zero net-new runtime dependencies; 1166/1166 Vitest tests green at close; PWA precache 515.72 KiB.

**Key accomplishments:**

1. **Phase 36 — Housekeeping bookkeeping reset:** Closed the v1.x procedural backlog in a single sweep (14 HOUSE requirements) — backfilled Phase 12 `VALIDATION.md` + `SECURITY.md`, Phase 33 + 35 Nyquist `VALIDATION.md`, re-flipped legacy `human_needed` `VERIFICATION` frontmatter for Phases 02/03/05/15/18/31, populated SUMMARY `requirements-completed` for Phases 32–35, recovered 28-01/28-03 SUMMARY drift, added v1→v2→v3 chained `migrateEnvelope` regression, re-archived the v1.5 phase dirs to `.planning/milestones/v1.5-phases/`, removed dead `.claude/skills/spike-findings-hrv/` (22 files) + root `CLAUDE.md`, gitignored `.claude/`, and pushed to `origin/main` so the GSD baseline reset was publicly visible before any v2.0 build work.
2. **Phase 37 — Stats UI removal:** Implemented the spike-010 anti-gamification stance — removed `StatsFooter`, `ResetStatsDialog`, the "Reset stats" Practice Settings affordance, dead `resetPracticeStats` / `formatLastSession` formatters, and stats i18n strings. `recordSession()` computation + localStorage persistence preserved (regression test). Drift-guard `src/content/content.no-stats-ui.test.ts` locks the deletion across `components/+app/+content/` (STATS-01..05).
3. **Phase 38 + 39 — Vocabulary collapse:** Dropped Square + Diamond shape variants (code, tokens, picker, `sessionVariantRef` Start-capture) and Moss / Slate / Dusk palettes (CSS, ThemeId union, ThemePicker, `faviconPalette`, FOUC inline IIFE). Persisted `variant: 'square'|'diamond'` coerces to `'orb'`; persisted `theme: 'moss'|'slate'|'dusk'` coerces to `'system'`; both forward-compat with no `STATE_VERSION` bump. Drift-guards `content.no-variants.test.ts` (14 forbidden tokens × 4 src roots) and `content.no-removed-themes.test.ts` (12 forbidden tokens) lock the deletion (VAR-01..06, THM-01..08).
4. **Phase 40 — Timbre preview cue:** Switching the Timbre in App Settings plays the inhale cue once at A4 via the existing `cueSynth` scheduler — singleton `previewContext.ts` AudioContext with resume-if-suspended dispatch. Preview plays even when `MuteToggle` is muted (structurally locked by `previewContext.no-audioengine-import.test.ts` drift-guard at the import-graph level), suppressed during an active session, ≤100 ms latency to first audio sample on commodity hardware. All four empirical UAT items operator-confirmed at milestone close (cue correctness × 4 timbres, mute irrelevance, rapid-tap overlap, iOS Safari standalone-PWA cold-start) (PREV-01..05).
5. **Phase 41 — Spike 010 Mono Zen — full implementation (`d2b886b`):** Per-item propose/go/implement/approve spike-loop (J1–J18, ~100+ atomic commits) absorbed the originally-planned Phases 41 (palette + tokens) + 42 (new orb) + 43 (five-surface redesign) into a single tightly-coupled implementation. Delivered: Mono Zen light + dark palettes (cool slate) with new `borderSoft` / `textSoft` / `orbHalo1/2/3` / `onAccent` tokens; self-hosted Inter Variable typography (`@fontsource-variable/inter`, Workbox precaches Latin + Latin-ext woff2); 3-halo + centre disc orb with asymmetric organic-puddle border-radii and breath label in-disc; V1 (orb-halo) + V2 (minimal) variants behind **query-string** flags (`?breathingShape=` + `?orbIdle=` — operator deviation from `VITE_*` env vars for per-tab toggling without rebuild); idle states (`still` / `ambient` 40:60); preserved ring cues (outer always Running, inner exhale-only); SetupCard + SettingsSheet (responsive bottom-sheet / center-modal) + FeedbackTime + FeedbackCount primitives; 4-section App Settings page (Appearance / Language / Feedback / About); Complete screen kept with checkmark orb + "Session complete · Take a moment" + Done; Learn restructured to SectionHeader + SectionCard pattern; desktop centered column (520 / 600 / 320 px); no-jiggle invariant; LOCKED_COPY verified verbatim. **Operator decisions:** install banner V3 (UX-12/13/14) dropped entirely per J13 (install stays only in App Settings → About → Install row); ThemePicker keeps 3 options (Light/Dark/System). J18 final audit closed 8-item orphan cleanup queue (dead components Card / BooleanToggle / StatusPanel deleted, dead viewmodel fields + 6 i18n keys + helper deleted, install LOCKED_COPY orphans trimmed) with `content.no-removed-keys.test.ts` drift-guard. Per-commit green-gate maintained throughout. (TOK-01..08, ORB-01..11, UX-01..11 + UX-15..22, POLISH-07 partial, POLISH-08, POLISH-09)
6. **Phase 44 — Final POLISH:** Closed POLISH-01..09 in 7 plans. 44-01 mega-commit `476caba` ran `/gsd:code-review --all --fix` — lint 0/0 on HEAD; 28 Info findings dispositioned in `44-INFO-FINDINGS.md` (3 fix / 24 obsolete-by-Phase-41-redesign / 1 deferred). 44-02 `dac3dec` tightened test names + removed intra-file redundancy (1155→1153 tests, 7 drift-guards preserved, 3× flake-clean). 44-03 `4a0b77f` broad Tiger Style WHY-only comment sweep (19 DROP / 75 KEEP across 13 files, zero behavior change per Item I sibling-pattern). 44-04 `b84f936` extracted `SettingsRow` primitive (3 adapters retrofitted, +3 behavioral tests) and reconciled the obsolete `.orb-layer` rename. 44-05 fold case (POLISH-07 already closed by 44-03 — 20 grep hits all KEEP-with-rationale). 44-06 `e6b2f24` `44-SECURITY.md` (22 STRIDE threats, 0 open: 11 inherited + 11 new for query-string toggles + font asset). 44-07 `e4ff788` `44-VERIFICATION.md` (9/9 POLISH satisfied, status `passed`) + closed `REFACTOR-LOOP-STATE.md` bookkeeping leak per D-12. Zero net-new runtime code dependencies (POLISH-08); per-commit green-gate held through milestone close (POLISH-09).
7. **Phase 45 — Ring progress-cue toggle (post-Phase-44 add-on):** Shipped the spike-011-validated bidirectional progress-arc ring cue as the production default. 45-01 added `RingCueStyle` type + `RING_CUE_FLAG` query-string spec + `featureFlags.ringCue` field (mirrors `BREATHING_SHAPE_FLAG` 1:1). 45-02 added `ringCue` prop to `OrbShape` and branched the inner-ring slot to a verbatim spike-011 `ProgressArcLayer` transcription (viewBox 0 0 100 100, r = 49.7, sweep-flags 0/1, strokeWidth 2.5, no `pathLength` / `stroke-dasharray`; reduced-motion suppresses the arc, faint outer track survives). 45-03 threaded `vm.featureFlags.ringCue` through `PracticeScreen → PracticeSessionView → {Breathing,NaviKriya}SessionSurface → OrbShape`. **Default flipped to `progress-arc` post-UAT at operator request** — the prior outer + inner ring rendering remains reachable via `?ringCue=outer-inner` (with aliases `production` / `rings` / `default`). 14/14 must-haves verified programmatically; 2 visual UAT items operator-approved.
8. **Versioned GitHub Pages deploy (quick-task 260525-hzq):** Tag-triggered multi-version deploy at `lucindo.github.io/hrv/` with switchable official-root pointer via `versions.json`. Gotchas locked: tag form is `vX.Y` (short, not full SemVer); GH Pages env needs explicit `v*` tag policy; `versions.json` drives root official; commit-back uses `[skip ci]`. Closed at `060edda` (12/12 verified). README + icons synced post-tag (`7ee5b2f` + `5b48c73`).

**Operator-locked architectural rules established this milestone (saved to memory):**

- **Design must not touch logic** — design-only changes must not touch state machines, audio, persistence, business logic.
- **Spike is design, NOT features** — spike locks visuals/controls/colors only; do NOT add features, move features between surfaces, or change data model based on spike screens.
- **Spike implementation fidelity** — spike-locked designs MUST be implemented verbatim; deviation undermines spike value and breaks trust.
- **Spike-locked values are not decisions** — when a spike already locked a hex/value, apply verbatim and quietly relax downstream guards; never re-surface as an OQ checkpoint.
- **No design locking** — tests, code, and comments must not anchor downstream-modifiable values (Tailwind classes, hex, design tokens, deleted-code refs, stale future-tense notes).
- **Refactor / propose loop** — per-item propose/go/implement/approve 4-step cycle with state at `.planning/REFACTOR-LOOP-STATE.md`; resumes after `/clear`.

**Verification:** All 8 phases pass programmatic verification; 9/9 POLISH satisfied at 44-VERIFICATION.md `passed`; 22/22 STRIDE threats verified at 44-SECURITY.md; 4/4 Phase 40 empirical UAT items operator-confirmed at milestone close; 2/2 Phase 45 visual UAT items operator-approved; 1166/1166 tests pass; tsc + lint + build + test exit 0 on every commit on `main` through v2.0 (POLISH-09).

**Known deferred items at close:** None — operator confirmed at milestone close that "all is fully tested, nothing to defer, only close as done". All 11 audit-open items resolved before close (Phase 40 VERIFICATION re-flipped to `passed`, all 7 quick-task slug files closed via top-level `SUMMARY.md` with `status: complete`).

**Carry-forwards from earlier milestones:** v1.x iOS Safari mid-page audio recovery (OS-level session loss) — still pending; Firefox Desktop orb scale-animation flicker — dropped per [[v2-carryforward-disposition]]; S2 Android Chrome wake-lock real-device UAT — still pending; iOS Pitfall 6 phone-call interrupted state — still pending; Phase 12 VALIDATION/SECURITY retroactive close — absorbed by Phase 36 HOUSE-01..02; v1.5 Nyquist VALIDATION docs missing for 33/35 + Phase 31 VERIFICATION frontmatter re-flip — all absorbed by Phase 36 HOUSE-03/04/05.

**Test count progression:** v1.5 close 1255 → v2.0 close 1166 (–89; net reduction from intra-file redundancy removal in 44-02 + dead-test deletions across Phases 37/38/39/41, partially offset by spike-loop drift-guards).

**Git range:** `v1.5` (5410b50 territory) → `5b48c73` (HEAD); tag `v2.0` at `591df88` (release commit; 2 docs commits ahead at HEAD: `7ee5b2f` README sync + `5b48c73` icon refresh).

---

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
