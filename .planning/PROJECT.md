# HRV Breathing WebApp

## What This Is

HRV Breathing WebApp is a simple, calming web app for following Forrest Knutson's breathing and meditation practices on mobile and desktop browsers. As of v1.5 it hosts three practices, switchable from one screen — Resonant HRV breathing, a guided BPM Stretch, and the app-paced Navi Kriya OM-counting practice. It gives users per-practice configurable timing, a polished accessible visual guide, soft generated audio cues, mobile hands-off wake-lock behavior, per-practice local memory + stats, and a claim-safe Learn surface linking to Forrest Knutson's YouTube content and explanations.

v1.0 shipped 2026-05-11 as an inspired redesign rather than a clone of the existing iPhone/Android Resonant Breathing app — immediately useful for people who already follow Forrest's teachings while remaining understandable to general meditators who arrive without that background. v1.0.1 shipped 2026-05-12, landing all 27 fix requirements from the 2026-05-11 deep code review without changing user-facing behavior beyond a favicon, an honest book-link hover, and elimination of audio race conditions.

## Core Value

Users can start a hands-off Forrest Knutson practice — HRV breathing, Stretch, or Navi Kriya — and comfortably follow accurate, uninterrupted guidance through synchronized visuals and optional sound.

## Current State

**Shipped:** v1.5 Multi-Practice (2026-05-19) — 6 phases (30–35), 27 plans, 1255/1255 Vitest tests pass (997 → 1255). Turned the single-practice app into a multi-practice app: a top segmented switcher carrying three practices (HRV · Stretch · Navi Kriya), each with its own settings and stats; the app-paced Navi Kriya OM-counting engine (`useNKEngine` front/back phase machine, fixed 4:1 ratio, four synthesized cue sounds, live readout); Stretch promoted from an intra-HRV `mode` to a top-level practice; per-practice + shared Learn content; a new spike-008 Flute cue timbre replacing Chime; and a lossless v1→v2→v3 storage-envelope migration chain for returning users. All 26 v1.5 requirements satisfied. Milestone audit `passed` (26/26 requirements, 6/6 phases verified, 0 integration blockers, 6/6 E2E flows). Zero net-new runtime dependencies.

**Prior milestones:** v1.0 MVP (2026-05-11) — 30 plans, audit PASSED 23/23. v1.0.1 Code Review Patch (2026-05-12) — 12 plans, audit PASSED 27/27. v1.1 Customization (2026-05-15) — 47 plans, SettingsDialog + 5 named palettes + 3 visual variants + 4 audio timbres + EN/PT-BR language switching. v1.2 BPM Stretch (2026-05-15) — 8 plans, Warm-up → Stretch ramp → Settle on the one-clock SessionFrame. v1.3 Release Polish (2026-05-16) — 11 plans, MIT LICENSE + README, Forrest native-app links, three-way cue picker, native-quality PT-BR catalogs, installable offline PWA. v1.4 Install Helper (2026-05-16) — 6 plans, dismissible phone install banner + persistent `SettingsDialog` install entry, EN/PT-BR.

**v1.x carry-forward (next milestone):** iOS Safari mid-page audio recovery (OS-level session loss). Firefox Desktop orb scale-animation flicker. S2 Android Chrome wake-lock real-device UAT. iOS Pitfall 6 phone-call interrupted state. Inner-ring UX symmetry. Phase 12 VALIDATION/SECURITY retroactive close. iOS standalone-PWA Wake Lock < 18.4 detect-and-warn product decision. 28 Info-severity findings from the 2026-05-16 full-codebase review (low priority — 23 Warnings already fixed). Code review WR-01 — `IosInstallSteps` `::marker` color coupling. v1.5 audit tech debt: Nyquist `VALIDATION.md` missing for Phases 33/35; Phase 31 `VERIFICATION.md` frontmatter not re-flipped despite operator-confirmed UAT. See STATE.md `## Deferred Items` for the full register.

## Current Milestone: v2.0 New Design

**Goal:** Land the spike-010 Monochrome Zen visual system end-to-end — collapse themes (5 → 3 options: `light`/`dark`/`system`), drop legacy shape variants (Square/Diamond), strip the visible stats UI (keep computation + persistence), rebuild the orb as a three-layer halo + centre disc, redesign all five app surfaces (Learn / App Settings / Idle / Running / Complete), and close the procedural GSD backlog in a single bookkeeping sweep up front.

**Target features:**

- **Housekeeping bookkeeping reset (Phase 36)** — Phase 12 `VALIDATION.md` + `SECURITY.md` retroactive close, Phase 33/35 Nyquist `VALIDATION.md` backfill, Phase 31 `VERIFICATION.md` frontmatter re-flip to `passed`, Phase 32/33/34/35 SUMMARY `requirements-completed` backfill, legacy `human_needed` flips (02/03/05/15/18), 28-01/28-03 SUMMARY drift, v1→v2→v3 chained-migration regression test. **Also:** remove root `CLAUDE.md` + `.claude/skills/spike-findings-hrv/` (no longer used), gitignore `.claude/`, and push Phase 36 commits to `origin/main` since no code changes.
- **Stats UI removal (Phase 37)** — remove `StatsFooter`, `ResetStatsDialog`, Practice Settings "Reset stats" affordance. `recordSession` computation + localStorage persistence stay; regression test confirms continued tracking. **Complete (2026-05-21):** STATS-01..05 closed, 1204/1204 tests pass, anti-gamification stance locked by `content.no-stats-ui.test.ts` drift-guard (scans components/+app/+content/).
- **Variant config drop (Phase 38)** — remove Square + Diamond shape variants (code, tokens, picker, Start-capture refs). Persisted `variant: 'square'`/`'diamond'`/`'orb'` falls back to `'orb'` via field deletion + Phase 8 D-01 envelope tolerance (no `STATE_VERSION` bump). **Complete (2026-05-21):** VAR-01..06 closed, 1095/1095 tests pass, Orb-only render path locked by `content.no-variants.test.ts` drift-guard (scans components/+app/+content/+styles/).
- **Theme config drop (Phase 39)** — remove Moss / Slate / Dusk palettes (CSS + ThemePicker). Persisted theme outside `{light, dark, system}` coerced to `'system'`. ThemePicker becomes Light/Dark/System. **Complete (2026-05-21):** THM-01..08 closed, 1082/1082 tests pass, removed-theme contract locked by `content.no-removed-themes.test.ts` drift-guard (12 forbidden tokens × 4 src roots).
- **Timbre preview cue (Phase 40)** — switching Timbre in App Settings plays the inhale-only cue at current pitch via the existing scheduler.
- **Mono Zen palette + tokens (Phase 41)** — apply spike-010 light (`bg #f3f5f7`, surface `#ffffff`, accent slate `#5d6877`) + dark (`#1a1d24` / surface `#252932` / accent dimmed mid-slate `#b4bac4`) palettes; add `borderSoft` token; introduce `orbHalo1/2/3` rgba tokens; semibold Inter typography; WCAG contrast guard regenerated.
- **New orb (Phase 42)** — three-layer translucent-halo + solid centre disc, asymmetric border-radii; breath label inside disc in `onAccent`; V1 (orb-halo) + V2 (minimal) behind `VITE_BREATHING_SHAPE`; `VITE_ORB_IDLE_BEHAVIOR=still|ambient` dev toggle; end-of-phase ring cues preserved (outer always, inner during exhale); rings hidden on Idle (A) + Complete (C); `MuteToggle` chrome aligned to `borderSoft` / `textSoft`.
- **Five-surface redesign (Phase 43)** — App Settings page (Appearance / Language / Audio / About), Idle V1 Grid SetupCard, Practice Settings sheet (mobile) / center modal (desktop), Running with per-practice feedback (HRV time-based; Stretch + Navi share `FeedbackCount` primitive), Complete (orb + check marker + "Session complete · Take a moment" — may drop), Learn reorganized, V3 inline-card install banner, desktop centered column (520/600 px), no-jiggle invariant.
- **Final POLISH (Phase 44)** — full `/gsd-code-review --all --fix` sweep, test cleanup (less wordy / fewer redundancies), Tiger Style comment audit (WHY-only), refactoring where warranted, security re-review, readability pass, sweep the 28 Info-severity findings from 2026-05-16.

## Requirements

### Validated

**v1.0 core experience (validated 2026-05-09 → 2026-05-11):**

- [x] User can choose breaths per minute from 1 to 7 in 0.5 increments. Validated in Phase 1.
- [x] User can choose inhale/exhale ratio from 50:50, 40:60, 30:70, and 20:80. Validated in Phase 1.
- [x] User can choose session duration from 5 to 60 minutes in 5 minute increments, or choose an unlimited session. Validated in Phase 1.
- [x] User can start a hands-off breathing session that continuously alternates inhale and exhale with no pauses. Validated in Phase 1.
- [x] User can follow a polished breathing animation that clearly communicates in/out breathing. Validated in Phase 2 (orb + In/Out label + reduced-motion crossfade).
- [x] User can use the app comfortably on mobile and desktop browsers. Validated in Phase 2 (mobile-first breakpoints, 44×44 hit areas, fluid clamp() orb sizing, focus-visible rings, native end-session dialog).
- [x] User can hear soft built-in inhale and exhale cues that align with the active breathing phase and can be muted. Validated in Phase 3 (cueSynth + lookaheadScheduler + dual-anchor scheduling + MuteToggle + lead-in countdown). *iOS Safari mid-page lock recovery → v1.x carry-forward.*
- [x] User's last settings are saved locally for convenience between visits. Validated in Phase 4 (silent-fallback localStorage envelope, per-field validate-and-fallback restore, persisted setters).
- [x] User can see basic local practice stats such as total sessions, total minutes, and last session. Validated in Phase 4 (StatsFooter + ResetStatsDialog).
- [x] User can start a hands-off mobile session where the browser supports Wake Lock. Validated in Phase 5 (two-ref pattern, idempotent release, visibility re-acquire). *S2 Android Chrome real-device UAT → v1.x carry-forward.*
- [x] User can recover from background → foreground audio interruptions via a gesture-attached resume affordance. Validated in Phase 5.1 (MuteToggle morph + engine reconstruction + dual-anchor re-anchor). *iOS Safari OS-level audio session loss → v1.x carry-forward.*
- [x] User can access a prominent learning section with links to Forrest Knutson's YouTube channel and curated HRV breathing explanation videos. Validated in Phase 6 (LearnAnchor + LearnDialog with locked claim-safe copy).
- [x] User sees copy that frames the app as guided breathing practice, not medical advice or diagnosis. Validated in Phase 6 (locked `inspired by Forrest's teachings` phrase + two-line disclaimer).
- [x] User can switch among Light/Dark/System + 3 named palette themes; choice persists across reloads and applies before first paint. Validated in Phase 16 (THEME-01..05 — CSS token cascade + FOUC inline script + useTheme/useThemeChoice hooks + ThemePicker). *Full UI token migration (Start/Stop button + 15 other components) → Phase 16.1 gap closure. Aesthetic palette refresh → v1.x carry-forward.*

**v1.0.1 patch fixes (validated 2026-05-11 → 2026-05-12 — all 27 REQ-IDs satisfied; see `.planning/milestones/v1.0.1-REQUIREMENTS.md` for full traceability):**

- [x] **BUILD-01/02/03 (Phase 7)** — `tsconfig` `strict` + `noUncheckedIndexedAccess` + `noImplicitReturns` + ESLint `strictTypeChecked` + `react-hooks/exhaustive-deps: error`. 48 production lint errors fixed inline; D-04 `// Reason:` annotation policy established.
- [x] **STORAGE-01/02/03 (Phase 8)** — Forward-compat envelope read (preserves on-disk `version`, spreads unknown fields), refuse-downgrade write (nested-try-catch inline re-read), cross-tab `storage` event listener filtered by `STATE_KEY`.
- [x] **AUDIO-01..06 + WAKELOCK-01 (Phase 9)** — Reconstruction generation counter, caller-side past-time clamp, lead-in null-on-closed, per-cue oscillator disconnect, state-change null-guard, dead `'starting'` removal, wake-lock in-flight + release-during-await guards.
- [x] **HOOKS-01..05 (Phase 10)** — `mutedRef` to stabilize `start`/`reconstructEngine`, status-primitive deps on App rAF effects, per-phase frame identity in `useSessionEngine`, rAF cancel-guard ordering, explicit ref-updater deps.
- [x] **DOMAIN-01 + UI-01/02 + A11Y-01 (Phase 11)** — `extendTimedSession` boundary validation, `SessionReadout` lead-in placeholder contract, symmetric auto-close for Learn/Reset dialogs in-session, `MuteToggle` resume-mode `role`/`aria-describedby`.
- [x] **ASSETS-01 + CONTENT-01 + HYGIENE-01/02/03 (Phase 12)** — Favicon `%BASE_URL%` swap + new `public/favicon.svg`, canonical amazon.com `/dp/B0CCFWP4W8` book URL, `isValid<X>` predicate relocation from `storage` to `domain/settings` (+ 9 new domain tests), `formatLastSessionDate` test-only-seam JSDoc, HYGIENE-01 docs-only flip to "Overtaken by Phase 9 AUDIO-02" (caller-side clamp depends on `audio.audioNow`).

**v1.1 Customization (validated 2026-05-12 → 2026-05-15 — see `.planning/milestones/v1.1-REQUIREMENTS.md` for full traceability):**

- [x] **WARMUP-01 + INFRA-01..04 (Phases 13–15)** — Reduced-motion inner-ring symmetry; `Envelope.prefs` storage shape + domain validators; native `<dialog>` SettingsDialog shell with `inSessionView` disable contract.
- [x] **THEME-01..05 + THEME-UI-01 (Phases 16 + 16.1/16.2/16.3)** — 5 named palettes curated from open-source design systems; full UI token migration of 16 components to `var(--color-breathing-*)`; WCAG luminance contrast guard.
- [x] **CUST-01..03 (Phase 17)** — 3 visual variants (Orb default + Square + Diamond) via render dispatcher; sessionVariantRef capture-at-Start; old `'ring'` localStorage values coerce to default.
- [x] **TIMBRE-01..05 (Phase 18)** — 4 synthesized audio timbres (Bowl default byte-identical + Bell + Sine + Chime); timbre captured at session start.
- [x] **I18N-01..06 (Phase 19)** — EN+PT-BR language switching; typed `Record<LocaleId, UiStrings>` catalog; `useLocale` orchestrator; frozen-EN byte-equality guard on locked claim-safe copy. *I18N-07 native-speaker review → v1.x carry-forward.*

**v1.2 BPM Stretch (validated 2026-05-15 — see `.planning/milestones/v1.2-REQUIREMENTS.md` for full traceability):**

- [x] **LEAD-01 (Phase 20)** — Primary button relabels to `Cancel`/`Cancelar` during the lead-in countdown; double-start affordance removed.
- [x] **FAVI-01/02/03 (Phase 21)** — Per-palette favicon for each of the 5 themes; swaps on theme change (same-tab + cross-tab); persisted-theme favicon applied pre-paint with no FOUC.
- [x] **STRETCH-01..08 (Phase 22)** — BPM stretch session mode (Warm-up → Stretch ramp → Settle) on the one-clock SessionFrame; cycle-aligned segment table with sub-0.5-BPM steps; minute-based stage durations + computed-total Duration readout; stretch settings persist via the existing localStorage envelope; dual-anchor audio (Phase 3 D-13/D-14) holds across the ramp.

**v1.3 Release Polish (validated 2026-05-16 — see `.planning/milestones/v1.3-REQUIREMENTS.md` for full traceability):**

- [x] **DOCS-01/02 (Phase 23)** — MIT `LICENSE` at the repo root; README refreshed to v1.3 accuracy (corrected BPM range + test count, complete Features list, real MIT-pointer License section).
- [x] **LEARN-01 (Phase 24)** — Forrest Knutson's native iOS App Store + Google Play "Resonant Breathing" apps linked from a third Learn-dialog section; neutral claim-safe copy, both locales, `rel="noopener noreferrer"` on every anchor.
- [x] **CUE-01/02/03 (Phase 25)** — Three-option in-orb cue picker (text labels / arrow icons / nose-airflow drawing) via `CueGlyph` threaded through all 3 visual variants; choice persists in the prefs envelope with no `STATE_VERSION` bump; visually-hidden localized In/Out announcement keeps arrow and drawing modes accessible.
- [x] **I18N-07 (Phase 26)** — PT-BR native-speaker review: all 98 `// TODO: native-speaker review` markers removed from `src/content/`; pt-BR catalogs corrected to native quality (RPM/VFC glossary applied, operator override kept short `Puxa`/`Solta` inhale/exhale labels for UI fit); new `content.no-review-markers.test.ts` fs-scan drift-guard locks the done-state. Frozen-EN `LOCKED_COPY` byte-equality guard and `Record<LocaleId, UiStrings>` type completeness intact.
- [x] **PWA-01/02/03 (Phase 27)** — Installable, offline-capable PWA: `vite-plugin-pwa` wired as a build-time devDependency (zero net-new runtime deps — `dependencies` stays `react` + `react-dom`); `/hrv/`-scoped Web App Manifest with maskable + Apple touch icons; Workbox `generateSW` service worker precaches the app shell (17 entries) for full offline sessions; silent `autoUpdate` + `cleanupOutdatedCaches` rolls updates without a stale shell or interrupting a running session; dark orb-glow install icons; iOS PWA meta tags; README documents the iOS < 18.4 standalone Wake Lock limitation (WebKit bug 254545). Real-device iOS standalone UAT (iOS 18.7.9) passed all six scenarios.

**v1.4 Install Helper (validated 2026-05-16 — see `.planning/milestones/v1.4-REQUIREMENTS.md` for full traceability):**

- [x] **INSTALL-01..05 (Phase 28)** — Phone install banner: `useIsStandaloneOrPhone` gates on `(pointer: coarse)` for phone-class + `(display-mode: standalone)`/`navigator.standalone` for installed-PWA state; `useBeforeInstallPrompt` captures the Android `beforeinstallprompt` and replays it from the user-gesture chain; `InstallBanner` shows the Android install-button path and the iOS inline-expand "Share → Add to Home Screen" steps; wired into `App.tsx` behind the composed `showBanner` gate (phone, not standalone, not dismissed, idle, iOS-or-deferredPrompt); dismissal persisted in `localStorage` (`hrv:install-dismissed`); EN copy final, PT-BR draft; 987/987 tests pass. Validated in Phase 28: Phone Install Banner (automated 5/5; 6 human-device UAT items tracked in `28-HUMAN-UAT.md`).
- [x] **INSTALL-06..07 (Phase 29)** — Settings install entry & localization: persistent install row in `SettingsDialog` gated `installable && !isStandalone`, rendered below the Language picker; non-iOS path triggers `onInstall`/`triggerInstall`, iOS path inline-expands the shared `IosInstallSteps` component (also consumed by `InstallBanner` — single source of truth); `UiStrings.install.settingsLabel` added with EN + PT-BR values; GAP-1 (iOS steps unreadable on dark themes) closed in plan 29-03 — steps 2 & 3 carry theme-aware `text-[var(--color-breathing-muted)]`; 997/997 tests pass. Validated in Phase 29: Settings Install Entry & Localization (automated 8/8; operator UAT 5/5 passed).

**v1.5 Multi-Practice (validated 2026-05-17 → 2026-05-19 — see `.planning/milestones/v1.5-REQUIREMENTS.md` for full traceability):**

- [x] **PRACTICE-01..06 (Phases 30, 33)** — Multi-practice architecture & switcher: a `practice` concept above the existing `mode`; per-practice settings + stats persisted via a `STATE_VERSION` v1→v2 `migrateEnvelope` ladder that losslessly folds a returning user's flat envelope into `practices.resonant` (PRACTICE-04); prototype-pollution-safe `src/storage/practices.ts` persistence module; top segmented `PracticeToggle` disabled during a session; practice-aware split `SettingsForm` separating shared chrome from per-practice controls. Phase 33 closed PRACTICE-02 — retargeted the resonant-settings read path from the dead flat `env.settings` field to the `practices.resonant.settings` envelope and removed dead `loadSettings`/`saveSettings`.
- [x] **NK-01..09 (Phase 31)** — Navi Kriya engine & session: the `useNKEngine` app-paced OM-counting machine (front/back phases, fixed 4:1 ratio, auto-advance), four synthesized cue sounds (front/back markers, per-OM tick, end chord), a live OM count / phase / round readout, an end control, and per-practice Navi Kriya stats isolated from Resonant's. NK-07 amended at the milestone audit to end-only (pause/resume dropped to mirror HRV's no-pause flow).
- [x] **LEARN-02, LEARN-03, I18N-08 (Phase 32)** — Learn & localization: `learnContent.ts` restructured into a per-practice map over a shared base; `LearnDialog` made practice-aware via an `activePractice` prop; shared sections (Who is Forrest, Forrest Resources) render for every practice; all new v1.5 copy reviewed to native-quality EN + PT-BR with the `// TODO: native-speaker review` drift-guard markers removed.
- [x] **STRETCH-01..06 (Phase 34)** — Stretch as a distinct practice: promoted from an intra-HRV `mode` to a top-level practice — 3-pill switcher (HRV · Stretch · Navi), a `STATE_VERSION` v2→v3 migration with a first-class `practices.stretch` slice, both switcher label treatments (text / icon+label) behind a developer-only `VITE_SWITCHER_TREATMENT` build-time toggle. Delivers the deferred Future requirement PRACTICE-F1.
- [x] **AUDIO-01, AUDIO-02 (Phase 35)** — Flute cue timbre: replaced the windchime-clone Chime with the spike-008 Flute (harmonic 1·2·3 sine partials, ~0.13 s soft breath attack via a new optional soft-attack envelope mode on `cueSynth`; strike stays default, Bowl/Bell/Sine byte-identical); `chime → flute` renamed across `TimbreId`, EN/PT-BR copy, and `TimbrePicker`, with a storage coercion migrating persisted `timbre: 'chime'` → `'flute'`.

### Active

v2.0 New Design (started 2026-05-20) — see `.planning/REQUIREMENTS.md` for the full REQ-ID list and `.planning/ROADMAP.md` for the phase mapping. Spike-010 visual system is the design contract; spike `.planning/spikes/MANIFEST.md` Requirements are the non-negotiables.

### v2.0 Carry-Forwards (Known Bugs)

- [ ] **iOS Safari mid-page audio recovery after lock/unlock** (Override SC1, OS-level audio session loss). Needs more investigation; remains a known bug to address in a future milestone — does NOT block v2.0.

### Closed at v2.0 Start

The v1.x carry-forward register was disposed at v2.0 scoping (2026-05-20):

- **Dropped permanently** — Firefox Desktop orb scale-animation flicker (the orb is being rebuilt in Phase 42; old `.orb` keyframes won't survive the rewrite).
- **Absorbed into Phase 36 (Housekeeping)** — Phase 12 `VALIDATION.md`+`SECURITY.md`, Phase 33/35 Nyquist `VALIDATION.md`, Phase 31 `VERIFICATION.md` frontmatter re-flip, 28-01/28-03 SUMMARY drift, legacy `human_needed` flips (02/03/05/15/18), v1→v2→v3 chained-migration regression test.
- **Naturally superseded by redesign** — Inner-ring UX symmetry (replaced by Phase 42 new orb), Code review WR-01 `IosInstallSteps` `::marker` (replaced by Phase 43 V3 inline install banner), 28 Info-severity findings from 2026-05-16 (swept by Phase 44 POLISH).
- **Deferred without bundling (product decisions, not bugs)** — S2 Android Chrome wake-lock real-device UAT (physical device unavailable), iOS Safari Pitfall 6 phone-call interrupted (domain overlap with iOS audio recovery), iOS standalone-PWA Wake Lock < 18.4 detect-and-warn (product decision still pending).

### Out of Scope

- User accounts, login, cloud sync, and user profiles — v1 should remain local-only and low-friction.
- Medical, therapeutic, or diagnostic claims — the app should present guided breathing practice, not health advice.
- Biofeedback such as camera pulse, heart-rate sensors, or HRV measurement — interesting future exploration, but not part of v1.
- Streaks, leaderboards, achievements, social sharing, or gamified pressure — history should stay simple and calm.
- Unlicensed Forrest Knutson logos or protected assets — Forrest branding is desired, but actual logo/assets require supplied files and permission context.
- Native mobile/watch apps and health platform integrations — web-first is the project motivation; platform integrations add scope and privacy complexity.
- Large content library, voice coaching, ads, or intrusive monetization in the practice flow — these distract from the focused hands-off breathing guide.

## Context

Forrest Knutson teaches HRV breathing on YouTube and has existing free iPhone and Android apps under the Resonant Breathing name. This project exists because there is no equivalent web version that works naturally from a desktop browser or a mobile browser link.

HRV breathing rules for this project:

- Fewer than 7 breaths per minute.
- No pauses between inhaling and exhaling.
- Exhaling is longer than inhaling for asymmetric ratios.

Normal user-selected options:

- Breaths per minute: 1 to 7, step 0.5.
- Inhale/exhale ratio: 50:50, 40:60, 30:70, 20:80.
- Session time: 5 to 60 minutes, step 5, plus unlimited/uncapped.

**Tech stack:** React 19 + Vite + TypeScript (strict + `strictTypeChecked`) + Tailwind + Vitest + jsdom. Pure domain math under `src/domain/` (includes `isValidBpm`/`isValidRatio`/`isValidDuration` shared predicates since v1.0.1), hooks under `src/hooks/`, components under `src/components/`, app shell under `src/app/`. Local-only state via `localStorage` with silent-fallback envelope (forward-compat read + refuse-downgrade write + cross-tab listener since v1.0.1). Audio via Web Audio API with FakeAudioContext test polyfill. Wake Lock via Screen Wake Lock API as progressive enhancement with in-flight + release-during-await guards.

**Codebase size at v1.5 ship:** ~28,933 LOC TypeScript/TSX/CSS in `src/`; 1255/1255 Vitest tests (997 → 1255). v1.5 added the `practice` axis and per-practice persistence (`src/storage/practices.ts`, v1→v2→v3 envelope migrations), the `useNKEngine` Navi Kriya engine + `NKShape`/`NKSessionReadout` session screen, the `PracticeToggle` 3-pill switcher, a per-practice `learnContent.ts`, and the Flute timbre — zero net-new runtime dependencies (`dependencies` stays `react` + `react-dom`). (v1.4 baseline: 997 tests; v1.3 baseline: 959 tests; v1.2 baseline: ~19,161 LOC / 839 tests; v1.0.1 baseline: ~10,925 LOC / 409 tests.)

## Constraints

- **Platform:** Web-first, responsive across mobile and desktop browsers — the core motivation is access without native apps.
- **Privacy:** No backend or account system in v1 — settings and practice history stay local to the browser.
- **Timing:** Breath phase timing must be accurate and continuous — no pauses between inhale and exhale.
- **Audio:** Browser audio is generated or bundled locally — no dependency on externally hosted audio.
- **Branding:** Forrest links and educational references are prominent, but logo usage depends on available rights or supplied assets.
- **Language:** English UI for v1, but future internationalization should remain possible (architecture: section-keyed content shape in `learnContent.ts`).
- **Tone:** Calm and non-medical — avoid health claims, diagnostic language, or overstated benefits.
- **Strict baseline (since v1.0.1):** `tsconfig` `strict` + ESLint `strictTypeChecked` + `react-hooks/exhaustive-deps: error` are the compiler-enforced floor for all future code. Per-commit green-gate (`tsc/lint/build/test`) is the v1.0.1 D-09/D-15 invariant carried forward.

## Key Decisions

| Decision | Rationale | Outcome |
|----------|-----------|---------|
| Build an inspired redesign rather than a close clone | The goal is a distinct web experience that carries the HRV breathing practice | ✓ Validated v1.0 — shipped without copying mobile-app UI |
| Prioritize timing, visuals, and audio equally | The guided breathing experience only works if all three feel cohesive | ✓ Validated v1.0 — Phase 1 timing + Phase 2 visual + Phase 3 audio cross-validated via dual-anchor scheduling |
| Use a hands-off session flow | Users should start practice on a phone before meditation and follow without further interaction | ✓ Validated v1.0 — Phase 5 wake lock + Phase 5.1 audio recovery affordance |
| Use built-in tones with mute support for v1 | Avoid sourcing audio assets while delivering phase cues; sound must remain optional | ✓ Validated v1.0 — cueSynth + lookaheadScheduler |
| Save last settings and basic practice stats locally | Convenience and progress context without accounts or personal data sync | ✓ Validated v1.0 — Phase 4 silent-fallback localStorage envelope |
| Keep customization and biofeedback out of v1 | Prove the core breathing guide before adding advanced features | ✓ Validated v1.0 — deferred to v1.1+ |
| English first while keeping multilingual support possible later | English is enough for v1, but future multi-language support is expected | ✓ Validated v1.0 — section-keyed `learnContent.ts` shape ready for I18N-01 |
| Treat Forrest logo/assets as permission-dependent | Honor Forrest's material without assuming rights to protected branding | ✓ Validated v1.0 — text + link references only, no logo reuse |
| Single abstract orb as visual guide (D-01, Phase 2) | One excellent default beats multiple animation styles | ✓ Validated Phase 2 |
| OS `prefers-reduced-motion` is sole switch (D-05); fixed mid-scale orb + gradient crossfade (D-06/D-07, Phase 2) | Honors OS accessibility preference without an in-app override | ✓ Validated Phase 2 |
| Native `<dialog>` for End-session modal with locked copy (D-10/D-11, Phase 2) | Browser-managed top-layer + focus trap; locked strings prevent copy drift | ✓ Validated Phase 2 (pattern reused by ResetStatsDialog + LearnDialog) |
| Fluid clamp() orb sizing + 44×44 hit-area floor + focus-visible rings (D-15/D-17/D-18/D-21, Phase 2) | Mobile-first responsive without media-query churn; WCAG target size | ✓ Validated Phase 2 |
| FakeAudioContext polyfill in vitest.setup.ts (Phase 3) | Lets pure cueSynth + scheduler test under jsdom without flakey real audio | ✓ Validated Phase 3 — reused everywhere since |
| Dual-anchor audio scheduling (Phase 3, D-13/D-14) | Lock cue alignment to session-clock anchors; survives BPM changes | ✓ Validated Phase 3 + reused Phase 5.1 reconstruction |
| Silent-fallback localStorage envelope + per-field coercers (Phase 4, D-09) | Safari Private Browsing + corrupted-data resilience | ✓ Validated Phase 4 |
| Wake Lock two-ref pattern + match-pair sentinel guard (Phase 5, D-08) | Prevents stale-ref release when visibility re-acquire races with manual end | ✓ Validated Phase 5 |
| Phase 5.1 INSERTED for hands-off resilience polish | Plan 05-04 real-device UAT exposed iOS audio + Safari visual gaps | ✓ Validated 5.1 |
| Clone-don't-extract Dialog pattern (Phase 4/6) | Locked-copy contracts cheaper to verify per-clone than to abstract | ✓ Validated v1.0 |
| LearnAnchor D-18 disable-not-hide contract (Phase 6) | Anchor visible+disabled during running session preserves layout invariant | ✓ Validated Phase 6 |
| Locked `inspired by Forrest's teachings` phrase + two-line disclaimer (Phase 6, D-12) | Claim-safe positioning resistant to copy drift across plans | ✓ Validated Phase 6 |
| Strict TS + `strictTypeChecked` ESLint as v1.0.1 baseline (Phase 7) | Every later patch phase writes against the compiler floor; latent errors surface once | ✓ Validated v1.0.1 — held through 6 phases, 143 commits |
| `react-hooks/exhaustive-deps: error` with `// Reason:` annotation policy (Phase 7 D-04) | Disables must justify themselves; new disables cannot land silently | ✓ Validated v1.0.1 — six pre-existing disables annotated, zero new since |
| Per-commit green-gate (`tsc && lint && build && test`) invariant (Phase 7 D-09 / Phase 11 D-17 / Phase 12 D-15) | Catches regressions at the boundary; bisect-friendly | ✓ Validated v1.0.1 — every commit green |
| Envelope spread-then-override (Phase 8 D-01) + refuse-downgrade (D-04a) | Forward-compat for v1.1 schema bumps without losing unknown fields | ✓ Validated Phase 8 |
| Reconstruction generation counter (Phase 9 AUDIO-01) | Eliminates use-after-stop race on async engine reconstruction | ✓ Validated Phase 9 |
| Caller-side past-time clamp (Phase 9 AUDIO-02) — depends on `audio.audioNow` export | Pitfall 5: belt-and-suspenders against negative scheduling | ✓ Validated Phase 9 + made HYGIENE-01 in Phase 12 a docs-only "Overtaken" flip |
| `mutedRef` ref-based mute (Phase 10 HOOKS-01) | Stabilizes `start`/`reconstructEngine` identity across mute toggles | ✓ Validated Phase 10 |
| `extendTimedSession` boundary validation throws on out-of-range (Phase 11 DOMAIN-01) | Caller contract is now the single source of truth for duration validity | ✓ Validated Phase 11 |
| Shared `isValid<X>` predicates in `domain/settings.ts` (Phase 12 HYGIENE-02) | Eliminates allow-list duplication between `validateSettings` (throws) and `coerceSettings` (fallback) | ✓ Validated Phase 12 |
| HYGIENE-01 "Overtaken" docs-only flip (Phase 12 D-01/D-02) | Phase 9 AUDIO-02 caller-side clamp DEPENDS on `audio.audioNow` — literal removal would break the contract | ✓ Validated Phase 12 — docs flip + REVIEW.md addendum |
| Favicon `%BASE_URL%` HTML substitution (Phase 12 D-04) | Survives any future Vite `base` change without an HTML edit | ✓ Validated Phase 12 |
| Cancel-label over disabled-attribute for lead-in (Phase 20) | Three-way ternary label keeps the button interactive; a second click runs the existing cancel branch instead of needing a separate disabled state | ✓ Validated v1.2 — LEAD-01 |
| Shared `faviconPalette` module + sync-guard test (Phase 21 D-01/D-07) | Single source for the 5 palette accent colors; `favicon.sync.test.ts` blocks drift between palette module and `theme.css` | ✓ Validated v1.2 — FAVI-01..03 |
| Pre-paint inline favicon script in `index.html` (Phase 21) | Applies the persisted-theme favicon before first paint — no FOUC, same pattern as the theme FOUC script | ✓ Validated v1.2 |
| BPM stretch rides the existing one-clock SessionFrame (Phase 22) | No second clock or timing abstraction; piecewise-constant ramp via a cycle-aligned segment table so steps land only on Out→In boundaries | ✓ Validated v1.2 — STRETCH-04 |
| Stretch settings ride the existing localStorage envelope (Phase 22) | Per-field `coerceSettings` fallback on read; no `STATE_VERSION` bump — forward-compat read + refuse-downgrade write contract (Phase 8 D-01/D-04a) unchanged | ✓ Validated v1.2 — STRETCH-07 |
| Stretch audio reuses dual-anchor scheduling (Phase 22) | Phase 3 D-13/D-14 dual-anchor invariant holds across every BPM step; per-cycle audio-clock offsets computed from the segment table; no per-segment cue variants | ✓ Validated v1.2 — STRETCH-08 |
| Operator UAT as deviation source-of-truth (Phase 22) | Mid-checkpoint UAT redesigned the stretch UX (gate removed, minute-based stages, stage renames); plan accommodated a fix-now deviation at the close checkpoint | ✓ Validated v1.2 — commit `8eb35bd` |
| Cue style rides the existing prefs envelope (Phase 25) | New `cue` field added via per-field `coerceSettings` fallback; no `STATE_VERSION` bump — forward-compat read + refuse-downgrade write contract unchanged | ✓ Validated v1.3 — CUE-02 |
| Single `CueGlyph` component threaded through all 3 shapes (Phase 25) | One a11y-complete glyph renderer (labels/arrow/nose SVGs + visually-hidden localized text) beats per-variant duplication | ✓ Validated v1.3 — CUE-03 |
| Operator as the PT-BR native reviewer (Phase 26) | The operator is a native pt-BR speaker; an `fs`-scan `content.no-review-markers.test.ts` drift-guard locks the done-state so markers cannot silently return | ✓ Validated v1.3 — I18N-07 |
| `vite-plugin-pwa` enters as a build-time devDependency only (Phase 27) | The zero-net-new-*runtime*-deps invariant holds — `dependencies` stays `react` + `react-dom`; Workbox `generateSW` + `autoUpdate` rolls updates without a stale shell | ✓ Validated v1.3 — PWA-01/02/03 |
| Dark orb-glow PWA install icons, redesigned post-UAT (Phase 27) | The original light orb washed out against neighboring home-screen icons; real-device UAT drove a dark `#2e3440` + frost-blue glow redesign re-confirmed by the operator | ✓ Validated v1.3 — commit `29425f1` |
| Single shared `IosInstallSteps` component for both install surfaces (Phase 29 D-06) | One iOS-steps renderer consumed by both `InstallBanner` and `SettingsDialog` (distinct `id` props) — one fix corrects both surfaces; GAP-1 dark-theme readability fix landed once | ✓ Validated v1.4 — INSTALL-06 |
| `installable = isIOS \|\| deferredPrompt !== null` derived boolean, prop-drilled from `App.tsx` (Phase 29) | Settings install row gates on `installable && !isStandalone` with no `isPhone` check — desktop browsers included; D-07 ensures a visible row is never a dead button | ✓ Validated v1.4 — INSTALL-06 |
| Permanent banner dismissal; Settings is the persistent re-entry path (Phase 28/29) | Dismissal persisted in `localStorage` (`hrv:install-dismissed`) is never re-surfaced; the `SettingsDialog` install entry is the always-available fallback for all browsers | ✓ Validated v1.4 — INSTALL-04/06 |
| Theme-aware `--color-breathing-muted` token on iOS install steps (Phase 29-03 GAP-1) | Operator UAT found steps 2–3 unreadable on dark themes (no text-color class); applying the WCAG-AA muted token restored contrast on all 5 themes in one change | ✓ Validated v1.4 — INSTALL-06 gap closure |
| `practice` concept above the existing `mode`, with per-practice settings + stats slices (Phase 30) | One app hosting multiple Forrest practices needs an axis above intra-practice `mode`; theme/timbre/variant/cue/locale stay shared app-wide chrome | ✓ Validated v1.5 — PRACTICE-01..06 |
| `STATE_VERSION` migration ladder — v1→v2 then v2→v3 (Phases 30, 34) | Each new practice slice is a schema bump; a chained `migrateEnvelope` ladder folds returning users forward losslessly and idempotently | ✓ Validated v1.5 — PRACTICE-04, STRETCH-05 |
| Navi Kriya is app-paced (metronome) with a fixed 4:1 front:back ratio (Phase 31) | Spike 003 validated app-paced over tap-to-count; the 4:1 ratio is fixed by the practice — only the base front count is configurable | ✓ Validated v1.5 — NK-01..04 |
| Navi Kriya drops pause/resume — end-only, mirroring HRV's no-pause flow (v1.5 audit, NK-07 amendment) | A counting practice with auto-advance has no natural pause point; consistency with HRV's session model beats a half-used control (commit `c19c0e1`) | ✓ Validated v1.5 — NK-07 amended end-only |
| Stretch promoted from an intra-HRV `mode` to a top-level practice (Phase 34, D-01) | Stretch had its own settings and session shape — modelling it as a peer practice removed the `mode` branch and made the switcher the single practice axis | ✓ Validated v1.5 — STRETCH-01..06 |
| Switcher A/B label treatments behind a build-time `VITE_SWITCHER_TREATMENT` env var (Phase 34) | The text-vs-icon+label choice is a developer decision, not a user setting — a build-time env var keeps it out of the user `SettingsDialog` | ✓ Validated v1.5 — STRETCH-02 |
| Optional soft-attack envelope mode on `cueSynth`; strike stays the default (Phase 35) | The Flute needs a ~0.13 s breath attack, but Bowl/Bell/Sine + countdown/end cues must stay byte-identical — an opt-in mode preserves them | ✓ Validated v1.5 — AUDIO-01 |

## Evolution

This document evolves at phase transitions and milestone boundaries.

**After each phase transition** (via `/gsd-transition`):
1. Requirements invalidated? → Move to Out of Scope with reason
2. Requirements validated? → Move to Validated with phase reference
3. New requirements emerged? → Add to Active
4. Decisions to log? → Add to Key Decisions
5. "What This Is" still accurate? → Update if drifted

**After each milestone** (via `/gsd-complete-milestone`):
1. Full review of all sections
2. Core Value check — still the right priority?
3. Audit Out of Scope — reasons still valid?
4. Update Context with current state

---
*Last updated: 2026-05-21 after Phase 39 (Theme simplification) completion*
