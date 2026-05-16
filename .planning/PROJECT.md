# HRV Breathing WebApp

## What This Is

HRV Breathing WebApp is a simple, calming web app for following Forrest Knutson-style HRV breathing sessions on mobile and desktop browsers. It gives users configurable breath timing, a polished accessible inhale/exhale visual guide, soft generated audio cues, mobile hands-off wake-lock behavior, local memory + practice stats, and a claim-safe Learn surface linking to Forrest Knutson's YouTube content and explanations.

v1.0 shipped 2026-05-11 as an inspired redesign rather than a clone of the existing iPhone/Android Resonant Breathing app — immediately useful for people who already follow Forrest's teachings while remaining understandable to general meditators who arrive without that background. v1.0.1 shipped 2026-05-12, landing all 27 fix requirements from the 2026-05-11 deep code review without changing user-facing behavior beyond a favicon, an honest book-link hover, and elimination of audio race conditions.

## Core Value

Users can start a hands-off HRV breathing session and comfortably follow accurate, uninterrupted inhale/exhale guidance through synchronized visuals and optional sound.

## Current State

**Shipped:** v1.3 Release Polish (2026-05-16) — 5 phases (23–27), 11 plans, 959/959 Vitest tests pass (839 → 959). All 10 v1.3 requirements validated. MIT `LICENSE` + distribution-ready README, Forrest Knutson's native Resonant Breathing apps linked from the Learn surface, a three-way in-orb cue picker (text / arrow / nose-airflow), native-quality PT-BR catalogs (98 review markers removed), and an installable offline-capable PWA (Workbox app-shell precache, `/hrv/`-scoped manifest, real-device iOS standalone UAT 6/6). Zero net-new runtime dependencies.

**Prior milestones:** v1.0 MVP (2026-05-11) — 30 plans, audit PASSED 23/23. v1.0.1 Code Review Patch (2026-05-12) — 12 plans, audit PASSED 27/27. v1.1 Customization (2026-05-15) — 47 plans, SettingsDialog + 5 named palettes + 3 visual variants + 4 audio timbres + EN/PT-BR language switching. v1.2 BPM Stretch (2026-05-15) — 8 plans, Warm-up → Stretch ramp → Settle on the one-clock SessionFrame.

**v1.x carry-forward (next milestone):** iOS Safari mid-page audio recovery (OS-level session loss). Firefox Desktop orb scale-animation flicker. S2 Android Chrome wake-lock real-device UAT. iOS Pitfall 6 phone-call interrupted state. Inner-ring UX symmetry. Phase 12 VALIDATION/SECURITY retroactive close. iOS standalone-PWA Wake Lock < 18.4 detect-and-warn product decision. 28 Info-severity findings from the 2026-05-16 full-codebase review (low priority — 23 Warnings already fixed). See STATE.md `## Deferred Items` for the full register.

**In progress:** v1.4 Install Helper — Phase 28 Phone Install Banner complete (2026-05-16): phone-class + standalone detection hooks, Android `beforeinstallprompt` capture, `InstallBanner` (Android button + iOS guided steps) wired into `App.tsx` behind the `showBanner` gate, dismissal persisted in `localStorage`. 987/987 tests pass. Phase 29 (Settings install entry + EN/PT-BR localization) remains.

## Current Milestone: v1.4 Install Helper

**Goal:** Detect when the app runs in a browser (not installed) and help users install it to their home screen — via a dismissible phone banner plus a persistent install option in Settings.

**Target features:**
- Phone detection — show the install banner only on phone-class browsers, and never when already running as an installed PWA (standalone display mode)
- Android Chrome — capture `beforeinstallprompt`; the banner CTA fires the native install prompt
- iOS Safari — banner shows guided "Share → Add to Home Screen" instructions (no install API exists on iOS)
- Dismissible banner UI — slim, non-modal, never blocks the breathing flow; dismissal persists permanently in `localStorage` (never re-shown)
- Settings install option — whenever the app runs in a browser (not installed), SettingsDialog shows an install entry; persistent, available even after the banner is dismissed, and covers desktop browsers
- Localized EN + PT-BR copy for both surfaces

**Key context:** PWA infrastructure (manifest, Workbox service worker, install icons) shipped in Phase 27 — v1.4 adds only the install *discovery* UX layer. Two surfaces: the banner is phone-only and dismissible; the Settings option is the persistent fallback. Continues phase numbering from 28.

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

**v1.4 Install Helper:**

- [x] **INSTALL-01..05 (Phase 28)** — Phone install banner: `useIsStandaloneOrPhone` gates on `(pointer: coarse)` for phone-class + `(display-mode: standalone)`/`navigator.standalone` for installed-PWA state; `useBeforeInstallPrompt` captures the Android `beforeinstallprompt` and replays it from the user-gesture chain; `InstallBanner` shows the Android install-button path and the iOS inline-expand "Share → Add to Home Screen" steps; wired into `App.tsx` behind the composed `showBanner` gate (phone, not standalone, not dismissed, idle, iOS-or-deferredPrompt); dismissal persisted in `localStorage` (`hrv:install-dismissed`); EN copy final, PT-BR draft; 987/987 tests pass. Validated in Phase 28: Phone Install Banner (automated 5/5; 6 human-device UAT items tracked in `28-HUMAN-UAT.md`).

### Active

**v1.4 Install Helper (defining requirements 2026-05-16):**

- [ ] Persistent install option in SettingsDialog whenever running in a browser
- [ ] Localized EN + PT-BR copy for both install surfaces

### v1.x Carry-Forwards (Tech Debt)

- [ ] iOS Safari mid-page audio recovery after lock/unlock (Override SC1, OS-level audio session loss).
- [ ] Firefox Desktop orb scale-animation flicker (Override FF-01, needs CSS keyframes root remedy).
- [ ] S2 Android Chrome wake lock real-device UAT (Phase 5 Plan 04 — physical device unavailable).
- [ ] iOS Safari Pitfall 6 — phone-call interrupted state (Phase 3 Open Question 5).
- [ ] Inner-ring UX symmetry (Issue B, Phase 5.1) — separate planning candidate.
- [ ] Phase 12 `VALIDATION.md` + `SECURITY.md` retroactive close (advisory; threat model inlined in `12-01-PLAN.md`).
- [ ] iOS standalone-PWA Wake Lock unavailable on iOS < 18.4 (WebKit bug 254545) — product decision whether to detect and warn (surfaced by PWA-01, documented in README).
- [ ] 28 Info-severity findings from the 2026-05-16 full-codebase deep review (low priority — the 23 Warning-severity findings were fixed the same day; re-run `/gsd-code-review 27 --fix --all` to sweep).

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

**Tech stack:** React 18 + Vite + TypeScript (strict + `strictTypeChecked`) + Tailwind + Vitest + jsdom. Pure domain math under `src/domain/` (includes `isValidBpm`/`isValidRatio`/`isValidDuration` shared predicates since v1.0.1), hooks under `src/hooks/`, components under `src/components/`, app shell under `src/app/`. Local-only state via `localStorage` with silent-fallback envelope (forward-compat read + refuse-downgrade write + cross-tab listener since v1.0.1). Audio via Web Audio API with FakeAudioContext test polyfill. Wake Lock via Screen Wake Lock API as progressive enhancement with in-flight + release-during-await guards.

**Codebase size at v1.3 ship:** 959/959 Vitest tests (839 → 959). Cue dimension added under `src/domain/` + `CueGlyph` component; `vite-plugin-pwa` build-time integration in `vite.config.ts`; static PWA icons under `public/`. (v1.2 baseline: ~19,161 LOC / 839 tests; v1.0.1 baseline: ~10,925 LOC / 409 tests.)

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
*Last updated: 2026-05-16 after Phase 28 Phone Install Banner completion*
