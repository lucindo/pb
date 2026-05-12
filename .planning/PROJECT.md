# HRV Breathing WebApp

## What This Is

HRV Breathing WebApp is a simple, calming web app for following Forrest Knutson-style HRV breathing sessions on mobile and desktop browsers. It gives users configurable breath timing, a polished accessible inhale/exhale visual guide, soft generated audio cues, mobile hands-off wake-lock behavior, local memory + practice stats, and a claim-safe Learn surface linking to Forrest Knutson's YouTube content and explanations.

v1.0 shipped 2026-05-11 as an inspired redesign rather than a clone of the existing iPhone/Android Resonant Breathing app — immediately useful for people who already follow Forrest's teachings while remaining understandable to general meditators who arrive without that background.

## Core Value

Users can start a hands-off HRV breathing session and comfortably follow accurate, uninterrupted inhale/exhale guidance through synchronized visuals and optional sound.

## Current State

**Shipped:** v1.0 MVP (2026-05-11) — 7 phases, 30 plans, ~9,032 LOC TypeScript/TSX/CSS, 363/363 Vitest tests pass.

**In progress:** v1.0.1 Code Review Patch — fix-only patch landing all 26 findings from full-codebase deep review (REVIEW.md). No new features. Phase 7 complete (strict TS + `strictTypeChecked` ESLint + `react-hooks/exhaustive-deps: error` baseline — BUILD-01/02/03). Phase 8 complete (storage forward-compat, downgrade refusal, cross-tab stats refresh — STORAGE-01/02/03; 366/366 tests; manual two-window UAT pending in `08-HUMAN-UAT.md`). Phase 10 complete (hooks identity & effect hygiene — mutedRef, currentFrame/liveFrame split, runningSnapshotRef ownership move into engine, top-of-tick cancel-guard, status-primitive cleanup deps; HOOKS-01..05; 391/391 tests; real-iPhone UAT passed).

**Next milestone (queued, deferred):** v1.1 — Appearance/Settings umbrella (themes, audio timbres, visual variants, language), PWA install + app icon, BPM stretch session, plus v1.0 → v1.1 carry-forwards. Runs after v1.0.1 ships.

## Current Milestone: v1.0.1 Code Review Patch

**Goal:** Land all 26 findings from full-codebase deep review (REVIEW.md) — 5 Critical, 12 Warning, 9 Info — without changing user-facing behavior or shipping new features.

**Target fixes:**
- **Build/types** — Enable `tsconfig` `strict` + `@typescript-eslint` `strictTypeChecked` + verify `react-hooks/exhaustive-deps` enforcement
- **Assets** — Fix favicon absolute path under Vite `base: '/hrv/'`
- **Storage** — Preserve on-disk envelope version; refuse downgrade; cross-tab `storage` event sync
- **Audio** — Reconstruction generation counter; clamp boundary cue audio time; `scheduleLeadIn` null-on-closed; per-cue node disconnect; defensive `handleStateChange`; remove dead `'starting'` enum
- **Wake Lock** — In-flight request lock
- **Hooks** — `useAudioCues.start` mute via ref; split `currentFrame` identity per-phase vs per-frame; status-only deps on App rAF effects; tick cancel-guard ordering; explicit ref-updater deps
- **Domain** — Explicit `DurationOption` validation in `extendTimedSession`
- **UI contracts** — `SessionReadout` lead-in placeholder contract; symmetric auto-close for Learn/Reset dialogs in-session
- **A11y** — `MuteToggle` role + describedby when `needsResume`
- **Content** — Replace `amzn.to` short-URL or disclose affiliate
- **Hygiene** — Remove unused `audioNow` from hook return; extract shared `isValid<X>` predicates; document `formatLastSessionDate` test-only seam

**Source spec:** `REVIEW.md` (full-codebase deep review, 2026-05-11 — 5 Critical / 12 Warning / 9 Info / 26 total).

**Constraint:** 363/363 tests pass at v1.0 close — patch must not regress. Enabling `strict` likely surfaces latent compiler errors that must be fixed inline.

## Requirements

### Validated

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

### Active

v1.0.1 patch — all requirements live in `.planning/REQUIREMENTS.md` keyed `BUILD-/ASSETS-/STORAGE-/AUDIO-/WAKELOCK-/HOOKS-/DOMAIN-/UI-/A11Y-/CONTENT-/HYGIENE-*`. Each maps 1:1 to one or more REVIEW.md findings (CR-/WR-/IN-).

### v1.x Carry-Forwards (Tech Debt)

- [ ] iOS Safari mid-page audio recovery after lock/unlock (Override SC1, OS-level audio session loss).
- [ ] Firefox Desktop orb scale-animation flicker (Override FF-01, needs CSS keyframes root remedy).
- [ ] S2 Android Chrome wake lock real-device UAT (Phase 5 Plan 04 — physical device unavailable).
- [ ] iOS Safari Pitfall 6 — phone-call interrupted state (Phase 3 Open Question 5).
- [ ] Inner-ring UX symmetry (Issue B, Phase 5.1) — separate planning candidate.

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

**Tech stack:** React 18 + Vite + TypeScript + Tailwind + Vitest + jsdom. Pure domain math under `src/domain/`, hooks under `src/hooks/`, components under `src/components/`, app shell under `src/app/`. Local-only state via `localStorage` with silent-fallback envelope. Audio via Web Audio API with FakeAudioContext test polyfill. Wake Lock via Screen Wake Lock API as progressive enhancement.

**Codebase size at v1.0 ship:** ~9,032 LOC in `src/` (TS/TSX/CSS); 363/363 Vitest tests across 27 files.

## Constraints

- **Platform:** Web-first, responsive across mobile and desktop browsers — the core motivation is access without native apps.
- **Privacy:** No backend or account system in v1 — settings and practice history stay local to the browser.
- **Timing:** Breath phase timing must be accurate and continuous — no pauses between inhale and exhale.
- **Audio:** Browser audio is generated or bundled locally — no dependency on externally hosted audio.
- **Branding:** Forrest links and educational references are prominent, but logo usage depends on available rights or supplied assets.
- **Language:** English UI for v1, but future internationalization should remain possible (architecture: section-keyed content shape in `learnContent.ts`).
- **Tone:** Calm and non-medical — avoid health claims, diagnostic language, or overstated benefits.

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
| OS `prefers-reduced-motion` is sole switch (D-05); fixed mid-scale orb + gradient crossfade as substitute cue (D-06/D-07, Phase 2) | Honors OS accessibility preference without an in-app override; chromatic delta carries phase signal | ✓ Validated Phase 2 |
| Native `<dialog>` for End-session modal with locked copy (D-10/D-11, Phase 2) | Browser-managed top-layer + focus trap; locked strings prevent copy drift | ✓ Validated Phase 2 (pattern reused by ResetStatsDialog + LearnDialog) |
| Fluid clamp() orb sizing + 44×44 hit-area floor + focus-visible rings (D-15/D-17/D-18/D-21, Phase 2) | Mobile-first responsive without media-query churn; WCAG target size + keyboard-only operation | ✓ Validated Phase 2 |
| FakeAudioContext polyfill in vitest.setup.ts (Phase 3) | Lets pure cueSynth + scheduler test under jsdom without flakey real audio | ✓ Validated Phase 3 — reused by audioEngine tests + Phase 5.1 reconstruction tests |
| Dual-anchor audio scheduling (Phase 3, D-13/D-14) | Lock cue alignment to session-clock anchors; survives BPM changes (forward-compat for PATT-02) | ✓ Validated Phase 3 + reused Phase 5.1 reconstruction |
| Silent-fallback localStorage envelope + per-field coercers (Phase 4, D-09) | Safari Private Browsing + corrupted-data resilience | ✓ Validated Phase 4 |
| Wake Lock two-ref pattern + match-pair sentinel guard (Phase 5, D-08) | Prevents stale-ref release when visibility re-acquire races with manual end | ✓ Validated Phase 5 |
| Phase 5.1 INSERTED for hands-off resilience polish | Plan 05-04 real-device UAT exposed iOS audio + Safari visual gaps that block trustworthy hands-off use | ✓ Validated 5.1 — iOS engine reconstruction + Safari explicit-positioning fix shipped |
| Clone-don't-extract Dialog pattern (Phase 4 ResetStatsDialog, Phase 6 LearnDialog) | Locked-copy contracts cheaper to verify per-clone than to abstract | ✓ Validated v1.0 — three dialogs all stable |
| LearnAnchor D-18 disable-not-hide contract (Phase 6) | Anchor visible+disabled during running session preserves layout invariant | ✓ Validated Phase 6 |
| Locked `inspired by Forrest's teachings` phrase + two-line disclaimer (Phase 6, D-12) | Claim-safe positioning resistant to copy drift across plans | ✓ Validated Phase 6 |

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
*Last updated: 2026-05-11 — Phase 10 (Hooks Identity & Effect Hygiene) complete*
