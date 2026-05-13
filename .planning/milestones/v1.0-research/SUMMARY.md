# Project Research Summary

**Project:** HRV Breathing / Guided Breathing Web App
**Domain:** Responsive, local-only HRV/resonance-style paced-breathing web app
**Researched:** 2026-05-08
**Confidence:** HIGH for browser stack, timing/audio architecture, and core guided-breathing features; MEDIUM for HRV-specific product nuance and future biofeedback scope.

## Executive Summary

This product is a focused, sensorless HRV/resonance-style breathing guide: users choose a breathing rate, inhale/exhale ratio, and duration, then follow synchronized visual and optional audio cues. Experts should build it less like a content platform and more like a precise browser timing instrument: one authoritative session clock drives phase math, animation, audio cues, countdowns, completion, and stats.

The recommended approach is a static React + Vite + TypeScript SPA with Tailwind for responsive UI, Zustand/Zod/localStorage for minimal local settings and stats, native Web Audio for generated gong/bowl-like cues, and `requestAnimationFrame`/`performance.now()` for timestamp-derived visuals. Keep the app local-only, no-account, privacy-forward, and non-medical; defer PWA, export/import, advanced patterns, sensor HRV, native apps, and health integrations until the core session loop is excellent.

The main risks are timing drift, mobile audio/autoplay failures, screen-lock/background-session surprises, motion/accessibility issues, brittle local persistence, unlicensed content, and medical claim creep. Mitigate them by building pure timing/session math first with long-session tests, wrapping browser APIs in capability adapters, using generated audio scheduled on the audio clock, respecting reduced motion and mute, previewing actual inhale/exhale seconds for extreme settings, and reviewing all copy/assets before launch.

## Key Findings

### Recommended Stack

Use a lightweight static web stack because the product has no accounts, no backend, and no server-rendering requirement. The core quality bar is not server scale; it is precise local timing, polished mobile UX, resilient browser API handling, and calm accessibility-first design.

**Core technologies:**
- **React 19.2.6:** Component UI for session, settings, stats, and learning/resource sections; good fit for polished stateful UI without SSR.
- **TypeScript 6.0.3:** Critical for typed timing units, session states, settings validation, and browser API wrappers.
- **Vite 8.0.11 + @vitejs/plugin-react 6.0.1:** Static SPA build/development path; avoids full-stack overhead.
- **Tailwind CSS 4.3.0 + @tailwindcss/vite 4.3.0:** Fast responsive styling, dark/calm design tokens, and zero-runtime UI polish.
- **Native Web Audio API:** Generate soft synchronized cues without licensed samples or heavy audio libraries.
- **Native `requestAnimationFrame` + `performance.now()`:** Smooth visuals derived from monotonic elapsed time; never use frame counting as truth.
- **Zustand 5.0.13 + Zod 4.4.3 + localStorage:** Persist validated local settings and simple stats with schema/version handling.

**Conditional additions:**
- **React Router:** Add only if learning/history deserve routable pages.
- **Dexie/IndexedDB:** Add only if per-session history/export becomes richer than aggregate stats.
- **Motion:** Use only for non-authoritative panel/route polish, not breath timing.
- **vite-plugin-pwa:** Defer until core timing/audio/mobile behavior is stable.

### Expected Features

The launch product must feel like a calm, immediate, reliable practice tool. Users expect a one-tap session path, accurate pacing, simple visual guidance, optional gentle audio, remembered preferences, and mobile-first responsiveness.

**Must have (table stakes):**
- Immediate start/pause/resume/end session — no account or deep navigation before practice.
- Accurate BPM/ratio timing engine — core trust requirement.
- BPM selector from 1-7 in 0.5 increments — required niche control.
- Ratio selector: 50:50, 40:60, 30:70, 20:80 — supports Forrest-style exhale-biased practice.
- Duration selector: 5-60 minutes plus unlimited — supports short and long sessions.
- Polished synchronized breathing animation — primary follow-along guidance.
- Optional generated soft audio cues with mute/volume affordance — supports eyes-closed practice.
- Saved local settings — repeated use should not require setup.
- Basic local stats — sessions, minutes, last session, and simple streak-like feedback without health claims.
- Mobile-first responsive layout — large tap targets and portrait/landscape resilience.
- Accessibility basics — keyboard controls, labels, visible phase text, reduced motion, high contrast, non-color cues.
- Wake Lock attempt and fallback messaging — best-effort hands-off use within browser limits.
- Forrest Knutson links plus non-medical disclaimer — satisfy lineage while controlling claims and asset use.

**Should have (competitive):**
- Forrest Knutson-style presets and defaults — sharper positioning than generic breathwork libraries.
- Privacy-first local-only framing — no accounts, no analytics by default, clear device-only storage.
- Generated synchronized gong/bowl cues — asset-safe differentiator for eyes-closed practice.
- Minimal local practice analytics — encouragement without gamification or health measurement.
- Hands-off uninterrupted session mode — full-screen/calm session UX plus Wake Lock where available.

**Defer (v1.x / v2+):**
- PWA install/offline, export/import, themes/ambience, audio timbre controls, notes, hide-countdown/full-screen refinements — useful after validation.
- Advanced custom holds/multi-set pattern editor — too much UI/testing complexity for v1.
- Sensor-based HRV/coherence biofeedback, wearables, Health integrations, native apps — require separate research, accuracy validation, platform scope, and careful claims.
- Voice coaching/classes/content library — distracts from the focused Forrest-style timer.
- Accounts, cloud sync, social/gamification, ads/upsells — conflict with calm local-only scope.

### Architecture Approach

Architect the app around one deterministic breathing plan and one authoritative session clock. Settings produce a pure breathing plan; the session engine derives the current frame from elapsed monotonic time; visual animation, countdown labels, audio cues, completion, stats, and wake-lock lifecycle consume that derived state. Browser APIs belong behind small services/adapters so audio, wake lock, and storage failures are explicit and testable.

**Major components:**
1. **SettingsForm / Settings Store** — validate BPM, ratio, duration, mute, and display preferences; persist safely.
2. **BreathingPlan** — pure conversion from BPM/ratio/duration into cycle, inhale, exhale, and completion math.
3. **SessionEngine** — lifecycle state machine for idle/running/paused/complete; derives elapsed time, phase, progress, cycle index, and remaining time.
4. **BreathingAnimation** — renders simple, calm visual guidance from derived phase state; replaceable and reduced-motion aware.
5. **AudioCueService** — optional Web Audio synthesis at boundary events, scheduled on `AudioContext.currentTime`.
6. **PersistenceService / StatsService** — versioned localStorage adapter plus simple completion-only stats updates.
7. **WakeLockService** — best-effort capability adapter; request during running sessions, release on pause/stop/complete, handle rejection/release.
8. **ResourceLinks** — static outbound Forrest Knutson links and claim-safe educational copy.

### Critical Pitfalls

1. **Treating animation as the source of truth** — avoid with a single monotonic session clock and long-session tests across all BPM/ratio combinations.
2. **Audio failing or drifting on mobile** — initialize/resume audio from Start gesture, schedule cues on the audio clock, use envelopes, and provide immediate persistent mute.
3. **Medical or biofeedback claim creep** — position as a guided breathing practice aid, not a treatment, diagnosis, HRV measurement tool, or clinical outcome tracker.
4. **Ignoring screen lock and visibility changes** — use Wake Lock as progressive enhancement, explicitly handle visibility transitions, and test 20-minute hands-off mobile sessions.
5. **Practice-hostile settings extremes** — show actual inhale/exhale seconds, label very slow combinations as advanced, and keep pause/stop easy.
6. **Over-polished motion harming calmness/accessibility/battery** — keep animation simple, provide reduced-motion mode, and profile mobile sessions.
7. **Brittle local persistence/privacy confusion** — centralize storage, validate/migrate schemas, keep stats minimal, communicate device-only storage, and provide reset.

## Implications for Roadmap

Based on research, suggested phase structure:

### Phase 0: Product Framing and Claim-Safe Scope
**Rationale:** Claim boundaries affect copy, stats names, feature names, resource links, and future HRV/biofeedback decisions; establish guardrails before UX and docs spread risky language.
**Delivers:** Product framing, non-medical disclaimer language, local-only privacy promise, asset/content rules, initial Forrest link policy.
**Addresses:** Non-medical wellness positioning, attribution/Forrest links, anti-features around medical claims and protected assets.
**Avoids:** Claim creep, endorsement implications, unlicensed media, overbuilding HRV measurement.

### Phase 1: Domain Timing Model and Session State Machine
**Rationale:** Every core feature depends on correct timing math; this must precede animation/audio polish.
**Delivers:** Pure settings model, breathing plan math, session states, start/pause/resume/end/complete rules, duration/unlimited handling, unit tests for all BPM/ratio combinations and simulated long sessions.
**Addresses:** Accurate timing, BPM selector, ratio selector, duration presets/unlimited, basic session lifecycle.
**Avoids:** Timing drift, multiple timers, frame counting, practice-hostile edge combinations.

### Phase 2: Minimal Session UI and Settings Persistence
**Rationale:** Users need an immediate usable loop before advanced polish; settings must flow through the canonical model and persist locally.
**Delivers:** One-screen responsive app shell, settings controls with computed inhale/exhale preview, basic text/shape guidance, local saved settings via validated storage adapter.
**Uses:** React, TypeScript, Tailwind, Zustand, Zod, localStorage.
**Implements:** SettingsForm, Settings Store, PersistenceService, initial SessionScreen.
**Avoids:** Overloaded start screen, hidden phase durations, brittle localStorage calls scattered through components.

### Phase 3: Visual Breathing Guide and Accessibility Baseline
**Rationale:** Once phase state is reliable, build the calm primary guidance channel and inclusive controls.
**Delivers:** Polished synchronized breathing animation, clear inhale/exhale labels, keyboard controls, focus states, high-contrast/dark-friendly styling, reduced-motion mode, responsive mobile/desktop layout.
**Addresses:** Breathing pacer visual, calm low-friction UI, accessibility basics, mobile-first design.
**Avoids:** Motion discomfort, battery-heavy animation, inaccessible visual-only guidance.

### Phase 4: Generated Audio Cues and Synchronization
**Rationale:** Audio is valuable but browser-autoplay-sensitive; it should consume stable boundary events rather than drive the session.
**Delivers:** Web Audio cue service, user-gesture unlock on Start, soft generated gong/bowl-like cues, boundary scheduling, mute/volume behavior, visual-only fallback.
**Uses:** Native Web Audio API.
**Implements:** AudioCueService and boundary cue detector.
**Avoids:** Autoplay failures, click/pop artifacts, jitter from RAF-triggered sound, inaccessible unsolicited audio.

### Phase 5: Local Stats, Completion, and Privacy Controls
**Rationale:** Stats depend on reliable completion events and persistence; keep them descriptive and local-only.
**Delivers:** Completed sessions/minutes/last session/simple streak or recent summary, completion handling, reset local data, privacy copy explaining device-only storage.
**Addresses:** Session completion, basic stats, local-only privacy differentiator.
**Avoids:** Health-outcome stats, over-collected wellness history, storage crashes, continuous per-frame writes.

### Phase 6: Mobile Hands-Off Resilience and Launch Polish
**Rationale:** The real use case is a long, low-interaction mobile session; validate browser capability edge cases after core timing/audio/stats work.
**Delivers:** Wake Lock adapter/status/fallback, visibility-change behavior, orientation/safe-area polish, resource cleanup, Forrest links, final copy/content/license review, launch QA checklist.
**Addresses:** Hands-off uninterrupted mode, background/screen-lock guidance, Forrest links, non-medical launch polish.
**Avoids:** Screen-lock session failures, wake lock resource leaks, claim creep, asset licensing mistakes.

### Phase 7: Post-Validation Enhancements
**Rationale:** Add retention and convenience only after the core session experience is trusted.
**Delivers:** Candidate v1.x features such as PWA install/offline, export/import, optional themes, audio timbre controls, full-screen/dim controls, practice notes, or reminders.
**Addresses:** Differentiators that are useful but not required for launch.
**Avoids:** Premature PWA/service-worker complexity, content/library bloat, accounts/cloud scope creep.

### Phase Ordering Rationale

- The order follows dependency flow: claim boundaries and product constraints first; pure timing model second; UI/persistence, animation, audio, stats, and mobile resilience layer on top.
- Timing, settings, and session lifecycle are grouped early because visual guidance, audio synchronization, completion, stats, and wake lock all consume the same derived session state.
- Browser API integrations are isolated into later focused phases so autoplay, wake lock, storage, and visibility failures get explicit handling instead of accidental component-level behavior.
- Launch polish comes after implementation but before release because claims, licensing, accessibility, and mobile hands-off QA are domain-critical, not optional cleanup.

### Research Flags

Phases likely needing deeper research during planning:
- **Phase 4: Generated Audio Cues and Synchronization** — research Web Audio autoplay behavior and iOS/Android test matrix if implementation details are unclear.
- **Phase 6: Mobile Hands-Off Resilience and Launch Polish** — research current Screen Wake Lock support, mobile browser visibility behavior, and HTTPS/static-host constraints.
- **Phase 7: Post-Validation Enhancements** — PWA/offline, export/import, notifications, advanced audio, and any future sensor/HRV biofeedback need separate scoped research before commitment.
- **Any future HRV sensor/biofeedback phase** — requires dedicated accuracy, device API, privacy, medical-claims, and regulatory research.

Phases with standard patterns (skip research-phase unless requirements change):
- **Phase 0:** Product framing can proceed from current pitfalls/features research plus review; no technical research needed.
- **Phase 1:** Timing/session math patterns are well documented by current research; plan directly with strong tests.
- **Phase 2:** React/Vite/Zustand/Zod/localStorage setup is standard.
- **Phase 3:** Responsive accessible UI and reduced-motion patterns are standard; use design/UX validation rather than more research.
- **Phase 5:** Basic local stats and storage adapter are standard if kept aggregate/local-only.

## Confidence Assessment

| Area | Confidence | Notes |
|------|------------|-------|
| Stack | HIGH | Core browser primitives and package versions were verified against official docs, Context7, MDN, Tailwind docs, and npm checks. Optional libraries have medium necessity, not medium technical fit. |
| Features | HIGH for mainstream guided-breathing expectations; MEDIUM for HRV-biofeedback expectations | Competitor research across iBreathe, The Breathing App, Breathwrk, HeartMath, and Elite HRV strongly supports table stakes. Sensorless HRV/biofeedback features are intentionally deferred. |
| Architecture | HIGH for browser/session architecture; MEDIUM for domain product structure | Single-clock, pure-domain, service-adapter architecture is strongly supported by browser docs and pitfalls. Exact product/module boundaries may evolve during implementation. |
| Pitfalls | HIGH for timing/audio/accessibility/storage/mobile browser risks; MEDIUM for HRV-specific nuance | Browser API risks are official-doc-backed. Medical/Forrest-specific nuance needs copy/content review and possibly direct source review before launch. |

**Overall confidence:** HIGH for v1 roadmap direction; MEDIUM for future sensor/biofeedback and content expansion decisions.

### Gaps to Address

- **Direct Forrest Knutson content policy:** Verify official links, wording, attribution style, and avoid implying endorsement or reusing protected content.
- **Mobile browser behavior:** Validate iOS Safari and Android Chrome audio unlock, wake lock, visibility, screen dim/lock, orientation, and long-session behavior during execution.
- **Default presets:** Research did not lock exact default BPM/ratio/duration. Choose conservative defaults during requirements and show actual inhale/exhale seconds.
- **Audio quality:** Generated gong/bowl synthesis is technically feasible, but perceived calmness needs headphone/mobile testing and possibly iteration.
- **Wake Lock support:** Treat as progressive enhancement; support/rejection behavior must be tested on deployment target over HTTPS.
- **Stats semantics:** Decide whether streaks are calming or too habit/gamification-oriented; keep labels descriptive and non-medical.
- **PWA/offline timing:** Defer service worker until core app is stable; research cache/update pitfalls before adding.

## Sources

### Primary (HIGH confidence)
- Context7 React 19 docs — React behavior and imperative ref guidance for timing loops.
- Context7 Vite 8 docs — Vite React/TypeScript configuration and strict compiler options.
- Tailwind official docs, “Installing Tailwind CSS with Vite” — Tailwind v4 Vite plugin setup.
- MDN Web Audio API and best practices — audio graph model, precise scheduling, autoplay/user-gesture constraints, ScriptProcessorNode deprecation.
- MDN `requestAnimationFrame()` — timestamp-based animation, high-refresh warning, and background pause behavior.
- MDN Page Visibility API — background throttling/visibility handling implications.
- MDN Screen Wake Lock API — secure-context, rejection/release, and reacquire behavior.
- MDN Web Storage / `localStorage` — persistence scope, sync behavior, private-mode and policy restrictions.
- W3C WCAG 2.2 Audio Control and Animation from Interactions — audio controls and reduced-motion/accessibility risks.
- npm registry checks on 2026-05-08 — verified recommended package versions.

### Secondary (MEDIUM confidence)
- Apple App Store: iBreathe — guided-breathing features, accessibility, custom intervals, infinite cycles, background breathing, haptics.
- Apple App Store: The Breathing App — resonance-breathing positioning, ratios, sounds, screen-off/background support, no-account/no-ads privacy posture.
- Breathwrk official site/App Store — broad breathwork content-platform feature set used mainly to define anti-scope for this focused v1.
- HeartMath Inner Balance and Elite HRV listings — sensor-backed HRV/coherence expectations and why real biofeedback should be deferred.
- FTC Health Claims guidance — substantiation principle for health-related marketing claims.
- Zaccaro et al. (2018) slow-breathing systematic review — supports cautious wellness framing but not app-specific clinical claims.

### Tertiary (LOW confidence)
- None material for v1 roadmap. Future biofeedback, health integrations, native apps, and clinical/medical positioning require fresh primary research before planning.

---
*Research completed: 2026-05-08*
*Ready for roadmap: yes*
