# HRV Breathing WebApp

## What This Is

HRV Breathing WebApp is a simple, calming web app for following Forrest Knutson's breathing and meditation practices on mobile and desktop browsers. As of v1.5 it hosts three practices, switchable from one screen — Resonant HRV breathing, a guided BPM Stretch, and the app-paced Navi Kriya OM-counting practice. It gives users per-practice configurable timing, a polished accessible visual guide, soft generated audio cues, mobile hands-off wake-lock behavior, per-practice local memory + stats, and a claim-safe Learn surface linking to Forrest Knutson's YouTube content and explanations.

v1.0 shipped 2026-05-11 as an inspired redesign rather than a clone of the existing iPhone/Android Resonant Breathing app — immediately useful for people who already follow Forrest's teachings while remaining understandable to general meditators who arrive without that background. v1.0.1 shipped 2026-05-12, landing all 27 fix requirements from the 2026-05-11 deep code review without changing user-facing behavior beyond a favicon, an honest book-link hover, and elimination of audio race conditions.

## Core Value

Users can start a hands-off Forrest Knutson practice — HRV breathing, Stretch, or Navi Kriya — and comfortably follow accurate, uninterrupted guidance through synchronized visuals and optional sound.

## Current State

**Shipped:** v2.0 New Design (2026-05-25) — 8 phases (36, 37, 38, 39, 40, 41, 44, 45 — 42/43 absorbed into 41 by design), 35 plans + 18 spike-loop items, 1166/1166 Vitest tests pass (1255 → 1166; net reduction from redundancy removal in 44-02 + dead-test deletions partially offset by spike-loop drift-guards). Landed the spike-010 Monochrome Zen visual system end-to-end across all five surfaces via a per-item operator-in-the-loop spike-loop (J1–J18, ~100+ atomic commits) — cool-slate light + dark palettes with new `borderSoft`/`textSoft`/`orbHalo*`/`onAccent` tokens, self-hosted Inter Variable typography, 3-halo + centre disc orb with V1/V2 variants behind query-string flags (`?breathingShape=` + `?orbIdle=`), idle states (still/ambient), redesigned Idle SetupCard + Running per-practice feedback (`FeedbackTime`/`FeedbackCount`) + Complete checkmark orb + restructured Learn (SectionHeader/SectionCard) + 4-section App Settings page (Appearance/Language/Feedback/About). Stats UI gone (anti-gamification), Square/Diamond variants gone, Moss/Slate/Dusk palettes gone (ThemePicker reduced to Light/Dark/System), audible timbre preview added, Phase 36 housekeeping reset the v1.x procedural backlog in a single sweep up front, Phase 44 closed POLISH-01..09 with a `/gsd:code-review --all --fix` zero-Warning sweep + 28 Info-finding dispositions + Tiger Style WHY-only comment audit + `SettingsRow` primitive extraction + 22-threat STRIDE security re-review, Phase 45 shipped the spike-011-validated bidirectional progress-arc ring cue as the production default (post-UAT flip). Zero net-new runtime dependencies (`dependencies` stays `react` + `react-dom`); PWA precache 515.72 KiB; per-commit green-gate (`tsc && lint && build && test`) held through every commit on `main`. **Versioned GitHub Pages deploy** went live at `lucindo.github.io/hrv/` with switchable official-root pointer via `versions.json` (quick-task 260525-hzq, closed at `060edda`).

**Prior milestones:** v1.0 MVP (2026-05-11) — 30 plans, audit PASSED 23/23. v1.0.1 Code Review Patch (2026-05-12) — 12 plans, audit PASSED 27/27. v1.1 Customization (2026-05-15) — 47 plans, SettingsDialog + 5 named palettes + 3 visual variants + 4 audio timbres + EN/PT-BR language switching. v1.2 BPM Stretch (2026-05-15) — 8 plans, Warm-up → Stretch ramp → Settle on the one-clock SessionFrame. v1.3 Release Polish (2026-05-16) — 11 plans, MIT LICENSE + README, Forrest native-app links, three-way cue picker, native-quality PT-BR catalogs, installable offline PWA. v1.4 Install Helper (2026-05-16) — 6 plans, dismissible phone install banner + persistent `SettingsDialog` install entry, EN/PT-BR. v1.5 Multi-Practice (2026-05-19) — 27 plans, three-practice switcher + Navi Kriya engine + Stretch promotion + Flute timbre + v1→v2→v3 envelope migration chain.

**v2.x carry-forward (next milestone):** iOS Safari mid-page audio recovery (OS-level session loss) — still pending after v2.0; S2 Android Chrome wake-lock real-device UAT — still pending (physical device unavailable); iOS Pitfall 6 phone-call interrupted state — still pending; iOS standalone-PWA Wake Lock < 18.4 detect-and-warn product decision — still pending. (Firefox Desktop orb flicker dropped permanently in v2.0 — old `.orb` keyframes are gone after Phase 41 J4 rewrite. Phase 12 VALIDATION/SECURITY + v1.5 Nyquist VALIDATION + Phase 31 VERIFICATION re-flip + 28 Info-severity findings + WR-01 — all absorbed at v2.0 start by Phase 36 HOUSE-01..14 + Phase 44 POLISH-02.)

## Next Milestone

Not yet scoped. Run `/gsd:new-milestone` to question → research → define requirements → roadmap the next milestone.

Likely seed areas (operator's call):

- **Carry-forwards still pending after v2.0:** iOS Safari mid-page audio recovery (OS-level session loss); S2 Android Chrome wake-lock real-device UAT; iOS Pitfall 6 phone-call interrupted state; iOS standalone-PWA Wake Lock < 18.4 detect-and-warn product decision.
- **Backlog-style enhancements:** Calm, deliberate stats display (computation + persistence are intact — only the visible surface was removed in Phase 37 for the anti-gamification stance); Phase 40 D-08 polyphonic-overlap refinement; further ring-cue variants (spike 011 only audited two of several candidates).
- **Versioned Pages workflow follow-ons:** Promote `versions.json:official` from `v1.5` → `v2.0` if/when the operator decides v2.0 is the production-default deploy.

For full v2.0 detail see `.planning/milestones/v2.0-ROADMAP.md` + `v2.0-REQUIREMENTS.md`.

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

**v2.0 New Design (validated 2026-05-20 → 2026-05-25 — see `.planning/milestones/v2.0-REQUIREMENTS.md` for full traceability):**

- [x] **HOUSE-01..14 (Phase 36)** — Procedural backlog reset: Phase 12 `VALIDATION.md`+`SECURITY.md` backfilled from `12-01-PLAN.md`; Phase 33/35 Nyquist `VALIDATION.md` written; Phase 31 `VERIFICATION.md` frontmatter re-flipped to `passed` (9 items operator-confirmed); Phase 32/33/34/35 SUMMARY `requirements-completed` populated from VERIFICATION evidence; legacy `human_needed` re-flipped for Phases 02/03/05/15/18; 28-01/28-03 SUMMARY drift recovered from git history with field-count corrections; v1→v2→v3 chained `migrateEnvelope` regression test added; restored v1.5 phase dirs re-archived to `.planning/milestones/v1.5-phases/`; root `CLAUDE.md` and `.claude/skills/spike-findings-hrv/` (22 tracked files) removed; `.claude/` gitignored; Phase 36 commits pushed to `origin/main` so the GSD baseline reset is publicly visible.
- [x] **STATS-01..05 (Phase 37)** — Stats UI removal: `StatsFooter` + `ResetStatsDialog` + Practice Settings "Reset stats" affordance + dead `resetPracticeStats`/`formatLastSession` formatters + stats i18n strings deleted. `recordSession()` computation + localStorage persistence preserved (regression test). `content.no-stats-ui.test.ts` drift-guard locks the deletion (scans `components/+app/+content/`).
- [x] **VAR-01..06 (Phase 38)** — Variant removal: Square + Diamond shape variants removed from `BreathingShape.tsx` + `Variant` union; `sessionVariantRef` Start-capture invariant removed; `VariantPicker` removed from `SettingsDialog`; persisted `variant: 'square'|'diamond'` coerces to `'orb'` via `coerceSettings` (no STATE_VERSION bump); 14-token forbidden-list drift-guard `content.no-variants.test.ts` locks the deletion across 4 src roots.
- [x] **THM-01..08 (Phase 39)** — Theme simplification: Moss / Slate / Dusk palettes removed (CSS + `ThemeId` union + `themes.*` i18n + ThemePicker + index.html FOUC IIFE); `ThemePicker` reduced to Light/Dark/System; persisted `theme: 'moss'|'slate'|'dusk'` coerces to `'system'` on read + re-persists going forward (no STATE_VERSION bump); `faviconPalette` reduced to light + dark only; `favicon.sync.test.ts` updated to guard the 2-palette mapping; WCAG luminance contrast guard regenerated; 12-token forbidden-list drift-guard `content.no-removed-themes.test.ts` locks the deletion.
- [x] **PREV-01..05 (Phase 40)** — Timbre preview cue: switching the Timbre in App Settings plays the inhale cue once at A4 via the existing `cueSynth` scheduler (no looping, no exhale, no double-trigger); singleton `previewContext.ts` AudioContext with resume-if-suspended dispatch; preview plays even when `MuteToggle` is muted (structural drift-guard at `previewContext.no-audioengine-import.test.ts` at import-graph level); preview suppressed during active session; ≤100 ms latency to first audio sample on commodity hardware. All 4 empirical UAT items operator-confirmed at v2.0 milestone close (cue correctness × 4 timbres, mute irrelevance, rapid-tap overlap, iOS Safari standalone-PWA cold-start).
- [x] **TOK-01..08, ORB-01..11, UX-01..11 + UX-15..22 (Phase 41 — spike-loop J1-J18)** — Mono Zen visual system end-to-end: cool-slate light + dark palettes; new `borderSoft`/`textSoft`/`onAccent`/`orbHalo1/2/3` tokens; self-hosted Inter Variable typography (Workbox precaches Latin + Latin-ext woff2 only); 3-layer translucent halo + solid centre disc orb with asymmetric organic-puddle border-radii and in-disc breath label; V1 (orb-halo) + V2 (minimal) variants behind query-string flag `?breathingShape=` (operator deviation from `VITE_*` env vars); idle states `?orbIdle=still|ambient`; preserved ring cues (outer always Running, inner exhale-only, both hidden Idle+Complete); SetupCard + SettingsSheet primitive (responsive bottom-sheet mobile / center-modal desktop) + FeedbackTime (HRV) + FeedbackCount (Stretch/Navi) primitives; 4-section App Settings page (Appearance/Language/Feedback/About); Complete screen retained with checkmark orb + "Session complete · Take a moment" + Done; Learn restructured to SectionHeader + SectionCard pattern; desktop centered column (520 px practice / 600 px page / 320 px orb); no-jiggle invariant across all phases + practices; `LOCKED_COPY` strings verified verbatim across redesign (J17); J18 final audit closed 8-item orphan cleanup queue with `content.no-removed-keys.test.ts` drift-guard. Closed at `d2b886b`. **UX-12/13/14 explicitly DROPPED** per operator J13 decision (install banner V3 not implemented — install kept only in App Settings → About → Install row).
- [x] **POLISH-01..09 (Phase 44)** — Final POLISH: full-codebase `/gsd:code-review --all --fix` sweep finished with zero Warning-severity findings open (POLISH-01); 28 Info-severity findings from 2026-05-16 dispositioned in `44-INFO-FINDINGS.md` (3 fix / 24 obsolete-by-Phase-41-redesign / 1 deferred); broad Tiger Style WHY-only comment audit (POLISH-04); `SettingsRow` primitive extracted (3 adapters retrofitted); 22-threat STRIDE security re-review at `44-SECURITY.md` (0 open); `44-VERIFICATION.md` 9/9 POLISH satisfied + REFACTOR-LOOP-STATE.md bookkeeping leak closed per D-12; zero net-new runtime code dependencies (POLISH-08 — `dependencies` stays `react` + `react-dom`); per-commit green-gate (`tsc && lint && build && test`) held through milestone close (POLISH-09).
- [x] **Phase 45** — Ring progress-cue toggle (post-Phase-44 add-on): `RingCueStyle` type + `RING_CUE_FLAG` query-string spec + `featureFlags.ringCue` field mirror the existing `BREATHING_SHAPE_FLAG`/`ORB_IDLE_FLAG` pattern; `OrbShape` inner-ring slot branches on a new `ringCue` prop to a verbatim spike-011 `ProgressArcLayer` transcription (viewBox 0 0 100 100, r = 49.7, sweep-flags 0/1, strokeWidth 2.5; reduced-motion suppresses the arc but the faint outer track survives); `featureFlags.ringCue` threaded end-to-end through `PracticeScreen → PracticeSessionView → {Breathing,NaviKriya}SessionSurface → OrbShape`. **Default flipped to `progress-arc` post-UAT at operator request** — the prior outer + inner ring rendering remains reachable via `?ringCue=outer-inner` (with aliases `production`/`rings`/`default`). 14/14 must-haves verified programmatically; 2 visual UAT items operator-approved.

### Active

No milestone is active. Run `/gsd:new-milestone` to scope the next milestone (questioning → research → requirements → roadmap).

### v2.x Carry-Forwards (Known Bugs)

- [ ] **iOS Safari mid-page audio recovery after lock/unlock** (OS-level audio session loss). Still pending after v2.0 — needs more investigation; remains a known bug to address in a future milestone.
- [ ] **S2 Android Chrome wake-lock real-device UAT** — physical device still unavailable.
- [ ] **iOS Safari Pitfall 6 phone-call interrupted state** — domain overlap with iOS audio recovery; held until iOS audio is addressed.
- [ ] **iOS standalone-PWA Wake Lock < 18.4 detect-and-warn** — product decision still pending.

### Closed at v2.0 Close

- **Resolved by v2.0 work** — All 14 HOUSE requirements (procedural backlog), 5 STATS requirements (anti-gamification stance), 6 VAR + 8 THM requirements (vocabulary collapse), 5 PREV requirements (timbre preview), 8 TOK + 11 ORB + 19 UX requirements (visual system end-to-end), 9 POLISH requirements (closeout sweep).
- **Carried into v2.0 from v1.x and closed** — Phase 12 VALIDATION/SECURITY retroactive (HOUSE-01/02), Phase 33/35 Nyquist VALIDATION (HOUSE-03/04), Phase 31 VERIFICATION re-flip (HOUSE-05), Inner-ring UX symmetry (replaced by Phase 41 J4 orb rewrite), Code review WR-01 (install banner V3 dropped at J13), 28 Info-severity findings from 2026-05-16 review (Phase 44 POLISH-02 disposition).
- **Dropped permanently** — Firefox Desktop orb scale-animation flicker (old `.orb` keyframes deleted in Phase 41 J4), v1.5 audit tech debt (orphaned NK pause/resume code already swept by quick task 260519-bee).

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

**Codebase size at v2.0 ship:** ~30,096 LOC TypeScript/TSX/CSS in `src/` (108 test files); 1166/1166 Vitest tests (1255 → 1166; net reduction from intra-file redundancy removal in Phase 44-02 + dead-test deletions across Phases 37/38/39/41, partially offset by spike-loop drift-guards). v2.0 added: self-hosted Inter Variable typography (`@fontsource-variable/inter` — devDependency, not runtime), Mono Zen palette + new token vocabulary, 3-halo + centre disc orb with V1/V2 variants, idle states (still/ambient), responsive SettingsSheet primitive (bottom-sheet / center-modal), per-practice Running feedback (`FeedbackTime`/`FeedbackCount`), 4-section App Settings page, `previewContext.ts` singleton AudioContext, `SettingsRow` primitive, `ProgressArcLayer` ring cue. v2.0 removed: `StatsFooter`/`ResetStatsDialog`/`resetPracticeStats`, Square/Diamond shape variants, Moss/Slate/Dusk palettes (CSS + ThemePicker + favicon module + FOUC IIFE), root `CLAUDE.md` + `.claude/skills/spike-findings-hrv/` (22 tracked files). Zero net-new runtime dependencies (`dependencies` stays `react` + `react-dom`). (v1.5 baseline: ~28,933 LOC / 1255 tests; v1.4: 997 tests; v1.3: 959 tests; v1.2: ~19,161 LOC / 839 tests; v1.0.1: ~10,925 LOC / 409 tests.)

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
| Housekeeping bookkeeping reset up front (Phase 36) | Close the entire v1.x procedural backlog in a single sweep before any v2.0 build work so the GSD baseline resets cleanly and the reset is publicly visible on `origin/main` | ✓ Validated v2.0 — all 14 HOUSE requirements closed; 26 commits pushed in one go (`e1d1257..e8e1781`) |
| Anti-gamification stance — Stats UI removed but computation + persistence preserved (Phase 37) | Spike-010 calm-tone principle; a deliberate future re-introduction stays cheap because the data layer is intact (`recordSession` still writes to localStorage) | ✓ Validated v2.0 — STATS-04 regression test confirms continued tracking; `content.no-stats-ui.test.ts` drift-guard locks the deletion |
| Vocabulary collapse via field deletion + coercer fallback (no STATE_VERSION bump) (Phase 38/39) | Persisted prefs with retired values (`variant: 'square'\|'diamond'`, `theme: 'moss'\|'slate'\|'dusk'`) coerce to the new default on read — Phase 8 D-01 envelope-tolerance contract handles it without a migration; returning users land on the new defaults with zero FOUC | ✓ Validated v2.0 — VAR-05, THM-05 prefs.test round-trip locks |
| Drift-guard tests for every deletion sweep (Phases 37/38/39/41) | Deletion is the deletion; the drift-guard is the contract that the deletion stays deleted. Forbidden-token regex scans across src roots catch silent reintroduction in PRs | ✓ Validated v2.0 — 4 drift-guards landed (no-stats-ui / no-variants / no-removed-themes / no-removed-keys); two helper drift-guards (`previewContext.no-audioengine-import` / `favicon.sync`) too |
| Audible timbre preview via singleton AudioContext (Phase 40) | Switching Timbre is a preview, not a session cue — it routes through a dedicated `previewContext.ts` singleton (NOT `audioEngine`) so the structural lock proves mute-irrelevance at the import-graph level | ✓ Validated v2.0 — PREV-01..05; `previewContext.no-audioengine-import.test.ts` structural drift-guard |
| **Spike-loop format absorbed Phases 41/42/43 into one** (Phase 41) | Mono Zen visual system is tightly coupled across all 5 surfaces; sequencing as 3 separate phases × N plans would land surface-by-surface with broken intermediate states. Spike-loop kept operator-in-the-loop on every visual increment and absorbed mid-stream feedback dumps (J16 alone landed ~50 sub-commits this way) | ✓ Validated v2.0 — J1–J18 delivered at `d2b886b`; per-commit green-gate maintained throughout |
| Dev toggles via query-string params, NOT `VITE_*` env vars (Phase 41 ORB-05/06, Phase 45 RING_CUE_FLAG) | `?breathingShape=` / `?orbIdle=` / `?ringCue=` allow per-tab toggling without a rebuild — operator decision at J5+J6+J45 propose. Aliases supported case-insensitively with default-on-junk parsing | ✓ Validated v2.0 — `src/featureFlags.ts` parser with explicit alias tables |
| Install banner V3 DROPPED entirely (Phase 41 J13) | Operator decision: install stays only in App Settings → About → Install row. The shared `IosInstallSteps` survives (re-tokenized to Mono Zen at J18.6 for quieter pairing) | ✓ Validated v2.0 — UX-12/13/14 marked obsolete; no banner reachable; install-row tested |
| Theme picker keeps 3 options (Light/Dark/System) — `'system'` NOT pruned (Phase 41 J18 Decision B) | Operator validated the 3-option theme picker during design; orphan-queue claim that 'system' should be pruned superseded | ✓ Validated v2.0 — `THEME_OPTIONS` 3 entries, ThemePicker renders 3 options |
| `installDismissed` storage kept alive (Phase 41 J18 Decision A2) | Still used by `useBeforeInstallPrompt` on `appinstalled` + `triggerInstall` success; only the dead read in `useAppViewModel` was pruned | ✓ Validated v2.0 — `installDismissed` writer paths intact; reader-only removal |
| **Design must not touch logic** (operator architectural rule, v2.0) | Design-only changes must not touch state machines, audio, persistence, business logic. Tests over a mixed monolith are NOT trustworthy as a design-isolation guarantee | ✓ Locked at v2.0 (saved to operator memory) — applied through Phase 41 spike-loop + Phase 44 polish; refactor loop items A-I preserved this separation |
| **Spike is design, NOT features** (operator architectural rule, v2.0) | Spike locks visuals/controls/colors only; do NOT add features, move features between surfaces, or change data model based on spike screens. Cue-sound toggle + Timbre relocation were mistakes that were rolled back | ✓ Locked at v2.0 (saved to operator memory) — prevents J-item scope creep |
| **Spike implementation fidelity** (operator architectural rule, v2.0) | Spike-locked designs MUST be implemented verbatim; deviation undermines spike value and breaks trust | ✓ Locked at v2.0 (saved to operator memory) — Phase 41 ORB-01 organic-puddle radii, Phase 45 ProgressArcLayer transcription both followed this |
| **Spike-locked values are not decisions** (operator architectural rule, v2.0) | When a spike already locked a hex/value, apply verbatim and quietly relax downstream guards; never re-surface as an OQ checkpoint | ✓ Locked at v2.0 (saved to operator memory) — Phase 41 J1 palette hex applied verbatim; spike-008 Flute pitch applied verbatim in v1.5 |
| **No design locking** in code/tests/comments (operator architectural rule, v2.0) | Tests must not anchor downstream-modifiable values (Tailwind classes, hex, design tokens, deleted-code refs, stale future-tense notes). Phase 44-02 explicitly removed these | ✓ Locked at v2.0 (saved to operator memory) — `44-02-SUMMARY.md` enforces 0 token-locking |
| **Propose-step checklist mandatory** (operator procedural rule, v2.0) | Every propose step must include Downstream Constraints + Applicable Memory Rules sections BEFORE Goal/Scope/Risk; no exceptions for "small" changes | ✓ Locked at v2.0 (saved to operator memory) — refactor loop items A-I followed this; Phase 41 J18.6 followed this |
| Final POLISH as a real sweep, not a checkbox (Phase 44) | `/gsd:code-review --all --fix` against the redesigned codebase produced disposition for 28 Info findings, broad Tiger Style WHY-only comment audit, `SettingsRow` primitive extraction. 22-threat STRIDE security re-review for new attack surfaces (preview audio, dev toggles, font asset) | ✓ Validated v2.0 — 9/9 POLISH satisfied; 0 open Warning findings at close; per-commit green-gate held |
| Phase 45 ProgressArcLayer transcribed verbatim from spike-011 (Phase 45) | Spike screen-locked the SVG arc math (viewBox 0 0 100 100, r = 49.7, sweep-flags 0/1, strokeWidth 2.5, no `pathLength`/`stroke-dasharray` interactions); transcription preserved the math byte-identically. Default flipped to `progress-arc` post-UAT at operator request | ✓ Validated v2.0 — 14/14 must-haves verified programmatically; 2 visual UAT items operator-approved |
| **Versioned GitHub Pages deploy** (quick-task 260525-hzq) | Tag-triggered multi-version deploy at `lucindo.github.io/hrv/`; gotchas locked: tag form is `vX.Y` short (not full SemVer); GH Pages env needs explicit `v*` tag policy; `versions.json` drives root official; commit-back uses `[skip ci]` | ✓ Validated v2.0 — v2.0 tag at `591df88` triggered deploy; `versions.json` lists `v1.5` + `v2.0` with `official: v1.5` (operator-deferred promotion) |

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
*Last updated: 2026-05-25 after v2.0 New Design milestone close — all 8 phases shipped, ROADMAP + REQUIREMENTS archived to `.planning/milestones/v2.0-*.md`, REQUIREMENTS.md reset for next milestone.*
