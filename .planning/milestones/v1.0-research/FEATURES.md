# Feature Research

**Domain:** HRV breathing / guided paced-breathing web app
**Researched:** 2026-05-08
**Confidence:** HIGH for mainstream guided-breathing features; MEDIUM for HRV-biofeedback features because v1 is intentionally sensorless/local-only.

## Feature Landscape

### Table Stakes (Users Expect These)

Features users assume exist. Missing these = product feels incomplete.

| Feature | Why Expected | Complexity | Notes |
|---------|--------------|------------|-------|
| Immediate start / pause / resume session | Guided-breathing apps are used in moments of stress, meditation, sleep prep, or practice; users expect to begin without account setup or deep navigation. | LOW | Make the default path one tap: choose remembered settings, press Start. Tap/click anywhere to pause is common and useful. |
| Accurate inhale/exhale timing | The product's core promise is paced breathing; poor timing or drift breaks trust. Competitors emphasize timed inhales/exhales/holds and user reviews complain when interval cues misfire. | MEDIUM | Use a monotonic clock and derive phase from elapsed time rather than chaining timers. Validate long sessions for drift. |
| Breathing pacer visual | A visual expanding/contracting ball/circle is a standard guided-breathing pattern; The Breathing App and iBreathe both center on simple visuals users can follow. | MEDIUM | Needs polished animation, no jank, clear phase affordance, and reduced-motion support. |
| Optional audio cues | Users often practice eyes-closed or in low-light settings. Reviews praise gentle tones and criticize jarring dings or repetitive voice prompts. | MEDIUM | Generated gong/bowl-like cues fit v1. Include mute and volume control; avoid licensed samples. |
| Configurable breathing rate | HRV/resonance apps commonly target roughly 5-7 breaths/min and generic apps allow custom intervals; this product specifically needs 1-7 BPM in 0.5 increments. | MEDIUM | Core settings UI. BPM must update both visual and audio guidance predictably. |
| Configurable inhale/exhale ratio | Resonance breathing and calming protocols often use balanced or elongated exhale patterns; The Breathing App recently added personal ratios as a highly requested feature. | MEDIUM | v1 ratios 50:50, 40:60, 30:70, 20:80 are enough for Forrest-style practice without complex custom holds. |
| Session duration presets plus unlimited | iBreathe added infinite cycles; reviews for The Breathing App ask for longer durations. Users expect short sessions and longer meditation sessions. | LOW | v1 5-60 minutes plus unlimited is table stakes for this niche. Include elapsed/remaining display, with option to hide during practice later. |
| Saved local settings | Users repeat the same personal cadence. A calming app should not require reconfiguration every session. | LOW | LocalStorage is sufficient; no account needed. Save BPM, ratio, duration, sound/mute, theme if added. |
| Session completion and basic stats | Habit apps commonly show streaks, mindful minutes, history, or achievements; even a local-only app should reassure users that practice was recorded. | MEDIUM | v1 can track sessions completed, minutes practiced, last session, and current streak locally. Avoid gamification that disrupts calm. |
| Mobile-first responsive design | Competitors are primarily mobile apps; this web app must feel good on phones and desktop browsers. | MEDIUM | Large tap targets, portrait/landscape support, safe-area handling, no tiny sliders as the only input method. |
| Background/screen-lock resilience guidance | Users repeatedly request breathing to continue with screen off/background audio. On the web this is constrained, but uninterrupted sessions are core value. | HIGH | v1 should prevent sleep where possible with Wake Lock when available, degrade gracefully, and explain limitations. Full PWA/background audio can come later. |
| Calm, low-friction UI | Top user praise for iBreathe and The Breathing App centers on simplicity/no clutter; clutter makes the product feel less calming. | MEDIUM | Settings should be available but visually subordinate to the session. No popups at completion. |
| Accessibility basics | Breathing apps rely on visual/audio cues; accessible alternatives are necessary. iBreathe explicitly lists VoiceOver, larger text, dark interface, and not relying on color alone. | MEDIUM | Provide semantic controls, keyboard support, visible focus, text phase labels, reduced motion, high contrast, and audio-independent visual cues. |
| Non-medical wellness positioning | Competitors often make strong claims, but this project should avoid medical claims. Users still expect a brief explanation of what the practice is. | LOW | Use wellness language: “guided HRV/resonance-style breathing practice,” not treatment for anxiety, blood pressure, insomnia, etc. |
| Attribution / Forrest Knutson links | This app is explicitly for Forrest Knutson-style sessions; users need context and a route to original teaching. | LOW | Prominent external links; no embedded protected content or copied assets without permission. |

### Differentiators (Competitive Advantage)

Features that set the product apart. Not required for all breathing apps, but valuable for this project.

| Feature | Value Proposition | Complexity | Notes |
|---------|-------------------|------------|-------|
| Forrest Knutson-style HRV breathing presets | Most competitors are broad stress/sleep/focus apps; a focused Forrest-style resonance practice is more useful to this audience than 100 generic classes. | LOW | Provide opinionated defaults matching project scope, with links to Forrest content for learning. |
| Ultra-simple no-account, local-only privacy | Breathwrk, Elite HRV, and many health apps collect or link data; The Breathing App highlights no account/no ads/data-not-collected. Privacy can be a strong trust signal. | LOW | Keep stats local, explain “your breathing history stays on this device.” No analytics by default unless explicitly chosen later. |
| Fine-grained BPM 1-7 by 0.5 | Many breathing apps expose interval seconds or presets; this niche wants breath-per-minute control for resonance/HRV practice. | MEDIUM | Make BPM primary, not hidden behind inhale/exhale seconds. Display derived inhale/exhale lengths. |
| Exhale-biased Forrest-style ratios | Generic apps often focus on box, 4-7-8, or broad custom patterns; a small set of exhale-lengthening ratios supports parasympathetic-oriented practice without overwhelming users. | LOW | v1 ratio set is enough; custom ratios/holds can wait. |
| Generated soft gong/bowl cues synchronized with visuals | Users value non-jarring audio and eyes-closed practice. Generated audio avoids licensing and can be perfectly aligned to phase changes. | MEDIUM | Use Web Audio synthesis; test startup unlock behavior on iOS Safari. |
| Hands-off uninterrupted session mode | The core value is following a session comfortably after starting. This can beat content-heavy apps that require navigation, subscriptions, or class selection. | HIGH | Combine Wake Lock, large full-screen session view, no accidental controls, and robust timing. |
| Browser-first cross-device access | Most polished competitors are native mobile apps. A high-quality web app works on desktop meditation setups and phones without app-store install. | MEDIUM | PWA install can be v1.x; responsive web is v1. |
| Minimal local practice analytics | Gives encouragement without accounts, leaderboards, or health-data integrations. | MEDIUM | Minutes, sessions, streak, and maybe favorite settings. Avoid over-measuring HRV without sensors. |
| Session ambience/themes | A polished, calm animation and subtle color themes can differentiate without adding cognitive load. | MEDIUM | Keep optional; do not delay core timing/audio. |
| “Practice notes” or intention prompt after session | Local-only journaling could deepen meditation practice without medicalization or cloud storage. | MEDIUM | Defer until core stats work; optional and private. |
| PWA offline install | Breathwrk lists offline access; The Breathing App supports background/screen-off native behavior. A PWA can reduce friction and improve reliability. | MEDIUM | v1.x candidate after core browser behavior is stable. |
| Import/export local stats/settings | Privacy-conscious users may value portability without accounts. | MEDIUM | JSON export/import later; useful if no cloud sync. |

### Anti-Features (Commonly Requested, Often Problematic)

Features that seem good but create problems.

| Feature | Why Requested | Why Problematic | Alternative |
|---------|---------------|-----------------|-------------|
| Accounts, cloud sync, social profiles | Users may want cross-device history and reminders. | Violates local-only constraint, adds privacy/security burden, and slows v1. | Local settings/stats; later optional export/import or PWA backup instructions. |
| Real HRV measurement without a proper sensor | “HRV breathing” sounds like it should show HRV metrics. | Phone/browser camera or watch integrations can be inaccurate or unavailable; medical-adjacent claims increase risk. HeartMath and Elite HRV rely on dedicated sensors for accurate HRV/coherence. | Position v1 as paced HRV/resonance-style breathing guidance, not HRV measurement. Add optional sensor research later if needed. |
| Medical claims or treatment protocols | Competitors market anxiety, blood pressure, sleep, HRV, and wellness outcomes. | Regulatory/trust risk and outside project scope. | Use educational, non-diagnostic wording; cite Forrest links and general practice context without promises. |
| Large content library/classes | Breathwrk differentiates with 100+ exercises/classes and daily content. | Content production is expensive and distracts from accurate hands-off Forrest-style practice. | Curated minimal presets and external links to Forrest Knutson content. |
| Voice coaching in v1 | Some users like guided classes and coaches. | Requires scriptwriting, localization, audio quality, and can become annoying for repeated sessions. | Simple text labels plus optional generated cues; consider optional voice packs much later. |
| Haptics/vibration as core guidance | Native breathing apps use haptics and watch vibration. | Web vibration support is inconsistent and can feel intrusive; desktop unavailable. | Treat as future progressive enhancement, not core. |
| Wearable integrations / Apple Health / Google Fit | Users of health apps expect mindful minutes and HR/HRV tracking. | Requires native APIs or platform-specific work; conflicts with no-account/simple web v1. | Local stats now; export or Health integration only if native/PWA scope changes. |
| Gamification, leaderboards, rankings | Habit apps use streaks/levels to increase retention. | Can make practice performance-oriented and less calming; social features require accounts. | Gentle local stats only; no competitive framing. |
| Ads, upsells, tip prompts after sessions | Monetization pattern seen in app stores. | User reviews explicitly call post-session prompts stressful and opposite to breathing app intent. | No interruptions in or immediately after sessions; if monetized later, use a quiet support link outside practice flow. |
| Hyper-custom ratio/hold editor in v1 | Power users ask for arbitrary holds and multi-set programs. | Adds UI complexity and testing matrix before core BPM/ratio app is validated. | Ship fixed Forrest-style ratios first; add advanced mode later if requested. |
| Licensed music/singing bowl samples | Polished audio can improve practice. | Licensing risk and larger asset footprint. | Generate soft tones with Web Audio or use clearly licensed/open assets only after review. |

## Feature Dependencies

```
Accurate timing engine
    ├──requires──> Session state model (idle/running/paused/complete)
    ├──enables──> Breathing pacer visual
    ├──enables──> Generated audio cues
    ├──enables──> Duration countdown / unlimited mode
    └──enables──> Reliable local stats

BPM + ratio settings
    ├──requires──> Validation and derived phase durations
    ├──drives──> Timing engine
    ├──drives──> Visual animation
    └──drives──> Audio cue schedule

Responsive session UI
    ├──requires──> Accessible controls
    ├──enhances──> Hands-off uninterrupted session mode
    └──enables──> Mobile/desktop launch quality

Local persistence
    ├──enables──> Saved settings
    ├──enables──> Basic stats
    └──enables──> Future export/import

Generated audio cues
    ├──requires──> User gesture audio unlock
    ├──requires──> Timing engine
    └──conflicts──> Silent/autoplay assumptions on mobile browsers

Wake Lock / uninterrupted mode
    ├──requires──> Running session lifecycle
    └──enhances──> Hands-off practice

Medical/HRV measurement claims
    └──conflicts──> Sensorless local-only v1
```

### Dependency Notes

- **Accurate timing engine is the first implementation dependency:** almost every visible feature depends on it, and timing defects are the fastest way to break product trust.
- **BPM/ratio settings must precede animation and audio polish:** the animation and cue scheduler should consume one canonical phase-duration model.
- **Local persistence unlocks both convenience and stats:** implement saved settings first, then session history; both can share a small storage abstraction.
- **Wake Lock depends on session lifecycle:** acquire only while running, release on pause/complete/unload, and show fallback copy where unsupported.
- **Audio requires mobile-browser care:** generated cues should start only after a user gesture and should degrade gracefully if AudioContext fails.
- **Avoid HRV measurement until a sensor strategy exists:** otherwise the roadmap risks inaccurate metrics, medical-adjacent claims, and large architecture changes.

## MVP Definition

### Launch With (v1)

Minimum viable product — what's needed to validate the concept.

- [ ] One-tap start/pause/resume/end session — essential for stress-free use.
- [ ] Accurate BPM/ratio timing engine — core product promise.
- [ ] BPM selector from 1-7 in 0.5 increments — required project scope and niche differentiation.
- [ ] Ratio selector: 50:50, 40:60, 30:70, 20:80 — required project scope.
- [ ] Duration selector: 5-60 minutes plus unlimited — required project scope and table stakes.
- [ ] Polished synchronized breathing animation — users need visual guidance.
- [ ] Optional generated soft gong/bowl-like audio cues with mute — users need eyes-closed guidance without protected assets.
- [ ] Responsive mobile/desktop layout — web app must work where users actually practice.
- [ ] Local saved settings — repeated practice should not require setup.
- [ ] Basic local stats: sessions, minutes, last session, streak — enough feedback without accounts.
- [ ] Accessibility basics: keyboard controls, labels, reduced motion, non-color phase indicators — necessary for inclusive launch.
- [ ] Forrest Knutson links and non-medical disclaimer — required positioning and scope control.
- [ ] Wake Lock attempt + fallback messaging — supports “hands-off uninterrupted” value within browser constraints.

### Add After Validation (v1.x)

Features to add once core is working.

- [ ] PWA install/offline support — add when browser experience is stable and repeat usage is proven.
- [ ] More audio timbres and volume envelope controls — add if users practice eyes-closed frequently.
- [ ] Theme/ambience options — add if visual polish is valued, but keep the core uncluttered.
- [ ] Export/import settings and stats — add for privacy-conscious cross-device portability.
- [ ] Optional practice notes — add if users want reflective meditation support.
- [ ] Advanced display options: hide countdown/cycles, dim controls, full-screen mode — add based on session feedback.
- [ ] Gentle reminders via browser notifications — only if users ask; must be opt-in and non-intrusive.

### Future Consideration (v2+)

Features to defer until product-market fit is established.

- [ ] Advanced custom pattern editor with holds/multi-set programs — useful for power users but not needed for Forrest-style v1.
- [ ] Sensor-based HRV/coherence biofeedback — requires dedicated research, device compatibility, accuracy validation, and careful claims.
- [ ] Health platform integrations — likely requires native wrappers or complex platform APIs.
- [ ] i18n/localization — future-friendly architecture now, translations later.
- [ ] Optional guided voice packs — defer until content and localization strategy exist.
- [ ] Native mobile/watch apps — defer until web product has validated demand.

## Feature Prioritization Matrix

| Feature | User Value | Implementation Cost | Priority |
|---------|------------|---------------------|----------|
| Accurate timing engine | HIGH | MEDIUM | P1 |
| Start/pause/resume/end session | HIGH | LOW | P1 |
| BPM 1-7 by 0.5 | HIGH | MEDIUM | P1 |
| Inhale/exhale ratios | HIGH | MEDIUM | P1 |
| Duration/unlimited mode | HIGH | LOW | P1 |
| Breathing animation | HIGH | MEDIUM | P1 |
| Generated audio cues + mute | HIGH | MEDIUM | P1 |
| Responsive design | HIGH | MEDIUM | P1 |
| Saved local settings | HIGH | LOW | P1 |
| Basic local stats | MEDIUM | MEDIUM | P1 |
| Forrest links + disclaimer | MEDIUM | LOW | P1 |
| Accessibility basics | HIGH | MEDIUM | P1 |
| Wake Lock / fallback | MEDIUM | MEDIUM | P1 |
| PWA install/offline | MEDIUM | MEDIUM | P2 |
| Audio timbre/volume options | MEDIUM | MEDIUM | P2 |
| Themes/ambience | MEDIUM | MEDIUM | P2 |
| Export/import | LOW | MEDIUM | P2 |
| Practice notes | LOW | MEDIUM | P2 |
| Reminders | MEDIUM | MEDIUM | P3 |
| Advanced custom patterns/holds | MEDIUM | HIGH | P3 |
| HRV sensor biofeedback | HIGH | HIGH | P3 |
| Health integrations | MEDIUM | HIGH | P3 |
| Voice coaching/classes | MEDIUM | HIGH | P3 |

**Priority key:**
- P1: Must have for launch
- P2: Should have, add when possible
- P3: Nice to have, future consideration

## Competitor Feature Analysis

| Feature | iBreathe | The Breathing App | Breathwrk | HeartMath / Elite HRV | Our Approach |
|---------|----------|-------------------|-----------|-----------------------|--------------|
| Core positioning | Simple customizable breathing, reminders, Apple Health, multi-device apps. | Minimal resonance breathing with ratios, sounds, background/screen-off use, no account/no ads. | Broad breathwork platform: exercises, classes, coaches, habits, streaks, Peloton content. | HRV/coherence biofeedback with sensors, readiness metrics, live charts, programs. | Focused Forrest-style paced HRV breathing web app; no accounts, no sensor claims. |
| Timing customization | Custom intervals, 0.5-second resolution, infinite cycles, multiple sets. | Personal ratios, inhale/exhale 1-30s and holds 0-90s. | Customizable duration, voice, sounds, haptics; many protocols/classes. | Personal resonance frequency pacer and biofeedback programs. | BPM-first 1-7 by 0.5 plus selected inhale/exhale ratios; avoid arbitrary editor in v1. |
| Guidance modalities | Visual, audio, haptics, Apple Watch; singing bowl option added. | Visual breathing ball, warm/bright sound, screen-off/background audio. | Sounds, visuals, haptics, breath coaches, video/instructor classes. | Visual/audio pacer plus real-time HRV/coherence feedback. | Polished animation + generated gong/bowl cues; no voice/haptics required for v1. |
| Stats/habits | Reminders, Apple Health mindful minutes, iCloud sync, watch. | Simple/free core; subscription for premium; privacy-first no data collection claim. | Streaks, levels, habits, daily classes, tests. | Morning readiness, HRV metrics, tags, charts, exports, teams. | Local-only basic stats; no accounts, streak pressure, or health integrations in v1. |
| Background/uninterrupted use | Added background breathing in 2025 after user demand. | Background/screen-off sound is highlighted and repeatedly restored/improved. | Offline access; native app context. | Sensor sessions in native apps. | Best-effort browser uninterrupted mode with Wake Lock and graceful limitations. |
| Monetization/product scope | Free with ads/premium/tips; reviews note post-session tip prompts can feel intrusive. | Free core plus subscription for advanced features. | Subscription / Peloton membership. | Hardware + app subscription/content ecosystem. | Keep v1 calm and uncluttered; no interruptive monetization or account funnel. |

## Sources

- Apple App Store: iBreathe – Relax and Breathe. Core features include simple UI, predefined/custom exercises, reminders, Apple Health, iCloud sync, Apple Watch, lock screen widget; release notes include 0.5-second intervals, infinite cycles, singing bowl signal, background breathing, haptics, and accessibility. HIGH confidence. https://apps.apple.com/us/app/ibreathe-relax-and-breathe/id1296605806
- Apple App Store: The Breathing App: Calm Daily. Describes resonance breathing at 5-7 breaths/min, personal ratios, minimalist design, calming sounds, screen-off/background support, no ads/account, data-not-collected privacy label; reviews praise simple visuals/audio and request Health integration/longer sessions. HIGH confidence. https://apps.apple.com/us/app/the-breathing-app-calm-daily/id1285982210
- Breathwrk official site and App Store listing. Describes 50-100+ exercises/classes, stress/sleep/focus/energy categories, sounds/visuals/haptics/coaches, reminders, streaks/levels, Apple Health, offline access, lung score/exhale tests, Peloton integration. HIGH confidence for Breathwrk feature set; LOW confidence for its medical-style claims as product guidance. https://www.breathwrk.com/ and https://apps.apple.com/us/app/breathwrk-breathing-exercises/id1481804500
- HeartMath Inner Balance Coherence Plus official product page. Describes HRV sensor, real-time coherence score every 5 seconds, app content/courses, 500 Hz sensor, Bluetooth/USB-C compatibility, and sensor requirement for accurate HRV. HIGH confidence. https://store.heartmath.com/innerbalance
- Apple App Store: Elite HRV: Wellness & Fitness. Describes sensor-required HRV tracking, morning readiness, ANS balance, guided breathing, live HRV biofeedback, resonance/coherence breathing pacer, audio/visual pacer, personal resonance frequency, tags/export/integrations. HIGH confidence. https://apps.apple.com/us/app/elite-hrv-wellness-fitness/id868829970

---
*Feature research for: HRV breathing / guided paced-breathing web app*
*Researched: 2026-05-08*
