# HRV Breathing WebApp

## What This Is

HRV Breathing WebApp is a simple, calming web app for following Forrest Knutson-style HRV breathing sessions on mobile and desktop browsers. It gives users configurable breath timing, a clear inhale/exhale visual guide, soft audio cues, and a prominent learning area linking to Forrest Knutson's YouTube content and explanations.

The first release is an inspired redesign rather than a clone of the existing iPhone/Android Resonant Breathing app. It should be immediately useful for people who already follow Forrest's teachings, while remaining understandable to general meditators who arrive without that background.

## Core Value

Users can start a hands-off HRV breathing session and comfortably follow accurate, uninterrupted inhale/exhale guidance through synchronized visuals and optional sound.

## Requirements

### Validated

- [x] User can choose breaths per minute from 1 to 7 in 0.5 increments. Validated in Phase 1: Configurable Session Timing.
- [x] User can choose inhale/exhale ratio from 50:50, 40:60, 30:70, and 20:80. Validated in Phase 1: Configurable Session Timing.
- [x] User can choose session duration from 5 to 60 minutes in 5 minute increments, or choose an unlimited session. Validated in Phase 1: Configurable Session Timing.
- [x] User can start a hands-off breathing session that continuously alternates inhale and exhale with no pauses. Validated in Phase 1: Configurable Session Timing.

### Active

- [ ] User can follow a polished breathing animation that clearly communicates in/out breathing without requiring exact mimicry of the mobile app.
- [ ] User can hear soft built-in inhale and exhale cues that align with the active breathing phase and can be muted.
- [ ] User can use the app comfortably on mobile and desktop browsers.
- [ ] User's last settings are saved locally for convenience between visits.
- [ ] User can see basic local practice stats such as total sessions, total minutes, and recent session information.
- [ ] User can access a prominent learning section with links to Forrest Knutson's YouTube channel and selected HRV breathing explanation videos.

### Out of Scope

- User accounts, login, cloud sync, and user profiles — v1 should remain local-only and low-friction.
- Medical, therapeutic, or diagnostic claims — the app should present guided breathing practice, not health advice.
- Biofeedback such as camera pulse, heart-rate sensors, or HRV measurement — interesting future exploration, but not part of v1.
- Multiple animation styles, themes, or sound packs — configurable experience can come later after the core guide feels right.
- Streaks and gamification — history should stay simple and calm in v1.
- Installable PWA/offline behavior — keep the first release as a normal responsive web app unless later planning shows it is cheap and low-risk.
- Unlicensed Forrest Knutson logos or protected assets — Forrest branding is desired, but actual logo/assets require supplied files and permission context.

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

The desired experience is clean, light, relaxing, meditative, and likely pastel. The animation should communicate breathing in and breathing out. It may use a meditation silhouette/lung metaphor or a more abstract breathing visual; the stronger design should be chosen during UI planning. The first version should prioritize one excellent default rather than many configuration options.

Audio should use built-in generated tones for v1 rather than requiring sourced audio files. The sound should feel like a soft Tibetan gong or bowl cue that fades gently across the inhale phase and then a new cue that follows the exhale phase. Sound must be optional, and the visual guide must work on its own.

The first audience is people who already follow Forrest Knutson's teachings, with the expectation that general meditators may also use it. The app should be shareable as a link and understandable without forcing users to leave the app first.

The first release feels successful when:

- It is good enough for daily personal use.
- It is easy to share with Forrest viewers.
- Timing, animation, sound, and visual design feel cohesive and trustworthy.

## Constraints

- **Platform**: Web-first, responsive across mobile and desktop browsers — the core motivation is access without native apps.
- **Privacy**: No backend or account system in v1 — settings and practice history should stay local to the browser.
- **Timing**: Breath phase timing must be accurate and continuous — no pauses between inhale and exhale.
- **Audio**: Browser audio should be generated or bundled locally for v1 — no dependency on externally hosted audio.
- **Branding**: Forrest links and educational references should be prominent, but logo usage depends on available rights or supplied assets.
- **Language**: English UI for v1, but future internationalization should remain possible.
- **Tone**: Calm and non-medical — avoid health claims, diagnostic language, or overstated benefits.

## Key Decisions

| Decision | Rationale | Outcome |
|----------|-----------|---------|
| Build an inspired redesign rather than a close clone | The goal is a distinct web experience that carries the HRV breathing practice, not a native app copy | — Pending |
| Prioritize timing, visuals, and audio equally | The guided breathing experience only works if all three feel cohesive | — Pending |
| Use a hands-off session flow | Users should be able to start practice on a phone before meditation and follow without further interaction | — Pending |
| Use built-in tones with mute support for v1 | Avoid sourcing audio assets while still delivering phase cues; sound must remain optional | — Pending |
| Save last settings and basic practice stats locally | Convenience and progress context are useful without requiring accounts or personal data sync | — Pending |
| Keep customization and biofeedback out of v1 | The first milestone should prove the core breathing guide before adding advanced features | — Pending |
| Use English first while keeping multilingual support possible later | English is enough for v1, but future multi-language support is expected | — Pending |
| Treat Forrest logo/assets as permission-dependent | The app should honor Forrest's material without assuming rights to protected branding | — Pending |

---
*Last updated: 2026-05-09 after Phase 1 completion*
