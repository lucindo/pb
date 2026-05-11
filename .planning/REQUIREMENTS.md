# Requirements: HRV Breathing WebApp

**Defined:** 2026-05-08
**Core Value:** Users can start a hands-off HRV breathing session and comfortably follow accurate, uninterrupted inhale/exhale guidance through synchronized visuals and optional sound.

## v1 Requirements

Requirements for initial release. Each maps to roadmap phases.

### Session

- [x] **SESS-01**: User can start a breathing session from the main app screen.
- [x] **SESS-02**: User can end/reset a running breathing session.
- [x] **SESS-03**: User can complete a timed session and see completion handled without manual cleanup.
- [x] **SESS-04**: User can run an unlimited session until they choose to end it.
- [x] **SESS-05**: User can follow inhale/exhale phases driven by one accurate session clock with no pauses between phases.

### Breath Settings

- [x] **BREA-01**: User can choose breaths per minute from 1 to 7 in 0.5 increments.
- [x] **BREA-02**: User can choose inhale/exhale ratio from 50:50, 40:60, 30:70, and 20:80.
- [x] **BREA-03**: User can choose session duration from 5 to 60 minutes in 5 minute increments or unlimited.

### Visual Guidance & Accessibility

- [x] **GUID-01**: User can follow a polished breathing animation synchronized to the current inhale/exhale phase.
- [ ] **GUID-02**: User can always read the current breathing phase as text.
- [ ] **GUID-03**: User with reduced-motion preference gets a calmer reduced-motion session display.
- [ ] **GUID-04**: User can operate the app with accessible labeled controls, visible focus states, keyboard support, and non-color-only cues.

### Audio

- [ ] **AUDI-01**: User can hear generated soft gong/bowl-like cues aligned to inhale and exhale phase changes.
- [ ] **AUDI-02**: User can mute audio cues and still use the visual guide.

### Local Memory & Stats

- [x] **LOCL-01**: User's last BPM, ratio, duration, and audio preference are saved locally between visits.
- [x] **LOCL-02**: User can see basic local practice stats: total sessions, total minutes, and last session.
- [x] **LOCL-03**: User can reset locally saved settings and stats.

### Mobile & Responsive Use

- [ ] **MOBL-01**: User can use the app comfortably on mobile and desktop browser layouts.
- [ ] **MOBL-02**: User can start a session that attempts to keep the screen awake using Wake Lock where supported.

### Learning & Positioning

- [ ] **LEARN-01**: User can access a prominent link to Forrest Knutson's YouTube channel.
- [ ] **LEARN-02**: User can access curated links to selected HRV breathing explanation videos.
- [ ] **LEARN-03**: User can read a brief in-app explanation of HRV/resonance-style breathing and the timing rules used by the app.
- [ ] **LEARN-04**: User sees claim-safe copy that frames the app as guided breathing practice, not medical advice.

## v2 Requirements

Deferred to future release. Tracked but not in current roadmap.

> **Next-milestone immediate priorities (user-captured 2026-05-11):**
> An **Appearance / Settings area** (umbrella surface) hosting CUST-01 (themes / colours), CUST-02 (sound timbre options — Flute as the named alternative), CUST-03 (visual guide variants — Meditator, Lungs, alternate expanding/retracting shapes), and I18N-01 (language switch). Plus **PWA-01** (mobile home-screen install with app icon) and **PATT-02** (BPM stretch / ramp session). Treat this cluster as the spine of the next milestone.

### Session

- **SESS-06**: User can pause and resume a running session.

### Breath Settings

- **BREA-04**: User can preview derived inhale and exhale seconds before starting.

### Audio

- **AUDI-03**: User can adjust cue volume.

### Local Memory & Stats

- **LOCL-04**: User can view a short recent-session list.

### Mobile & Responsive Use

- **MOBL-03**: User sees a Wake Lock fallback explanation when unsupported or rejected.

### PWA & Offline

- **PWA-01**: User can install or use the app offline after core web behavior is stable. Includes the mobile **Add to Home Screen** flow, the manifest (`name`, `short_name`, `theme_color`, `background_color`, `display: standalone`), and the full app-icon set (favicon variants, 192 / 512 maskable PNGs, Apple touch icon). May require a dedicated app logo asset.

### Customization

- **CUST-01**: User can choose between theme / colour palettes (e.g. the current pastel teal, plus one or more alternate calm palettes). Lives inside an `Appearance / Settings` umbrella surface (planner picks the navigation gesture — full settings page vs. expandable drawer vs. modal vs. a tab inside the Learn anchor).
- **CUST-02**: User can pick the audio cue timbre. v1 ships a single bowl-like tone; v2 adds at least **Flute** as a named alternative, with the option to add further calm timbres later (e.g. soft pad, harmonic chime). Selection is persisted in the same `localStorage` namespace as mute.
- **CUST-03**: User can pick the visual guide. v1 ships the abstract orb (with reduced-motion fallback); v2 adds at least **Meditator** and **Lungs** silhouettes, plus the option to add further expanding/retracting shape or effect variants. Each variant honors `prefers-reduced-motion` and shares the engine's frame contract — they are presentation-only swaps.

### Biofeedback

- **BIOF-01**: User can explore camera pulse, sensors, HRV, or coherence biofeedback after separate research.

### Localization

- **I18N-01**: User can use the app in multiple languages after English v1. Surfaces inside the `Appearance / Settings` umbrella as a language switch. Reuses Phase 6's section-keyed content shape (`learnContent.ts`) and extends the pattern to the rest of the page copy.

### Advanced Patterns

- **PATT-01**: User can use advanced custom ratios, holds, or multi-stage breathing programs.
- **PATT-02**: User can run a **BPM stretch session** — picks an `initialBpm`, a `targetBpm`, a `holdInitialSeconds` (or minutes) warm-up where BPM stays at `initialBpm`, then the engine slowly walks BPM toward `targetBpm` with a step strictly **smaller than 0.5 BPM** (so the transition is sub-perceptual), and finally holds at `targetBpm` for a `holdTargetSeconds` cool-down. The total session duration is the sum of the three segments (or open-ended on the target hold). Only enabled for sessions long enough to make the ramp meaningful (planner picks the minimum-duration gate). The ramp interpolation runs on the same engine timing clock as v1 so the dual-anchor audio invariants (Phase 3 D-13/D-14) keep holding across BPM changes.

## Out of Scope

Explicitly excluded. Documented to prevent scope creep.

| Feature | Reason |
|---------|--------|
| Accounts, login, cloud sync, profiles, or backend user data | v1 should stay local-only, private, and low-friction |
| Medical, therapeutic, diagnostic, or HRV-improvement claims | The app is a guided breathing practice tool, not a validated clinical or biofeedback system |
| Forrest logo/media without supplied assets and permission | Avoid protected asset reuse and implied endorsement |
| Leaderboards, achievements, social sharing, or gamified pressure | The experience should stay calm and practice-oriented |
| Native mobile/watch apps and health platform integrations | Web-first is the project motivation; platform integrations add scope and privacy complexity |
| Large content library, voice coaching, ads, or intrusive monetization in the practice flow | These distract from the focused hands-off breathing guide |

## Traceability

Which phases cover which requirements. Updated during roadmap creation.

| Requirement | Phase | Status |
|-------------|-------|--------|
| SESS-01 | Phase 1 | Complete |
| SESS-02 | Phase 1 | Complete |
| SESS-03 | Phase 1 | Complete |
| SESS-04 | Phase 1 | Complete |
| SESS-05 | Phase 1 | Complete |
| BREA-01 | Phase 1 | Complete |
| BREA-02 | Phase 1 | Complete |
| BREA-03 | Phase 1 | Complete |
| GUID-01 | Phase 2 | Complete |
| GUID-02 | Phase 2 | Pending |
| GUID-03 | Phase 2 | Pending |
| GUID-04 | Phase 2 | Pending |
| AUDI-01 | Phase 3 | Pending |
| AUDI-02 | Phase 3 | Pending |
| LOCL-01 | Phase 4 | Complete |
| LOCL-02 | Phase 4 | Complete |
| LOCL-03 | Phase 4 | Complete |
| MOBL-01 | Phase 2 | Pending |
| MOBL-02 | Phase 5 | Pending |
| LEARN-01 | Phase 6 | Pending |
| LEARN-02 | Phase 6 | Pending |
| LEARN-03 | Phase 6 | Pending |
| LEARN-04 | Phase 6 | Pending |

**Coverage:**
- v1 requirements: 23 total
- Mapped to phases: 23
- Unmapped: 0

---
*Requirements defined: 2026-05-08*
*Last updated: 2026-05-08 after roadmap creation*
