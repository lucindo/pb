# Requirements: HRV Breathing WebApp — v1.3 Release Polish

**Defined:** 2026-05-15
**Core Value:** Users can start a hands-off HRV breathing session and comfortably follow accurate, uninterrupted inhale/exhale guidance through synchronized visuals and optional sound.

**Milestone goal:** Make the app distribution-ready — proper licensing, an installable offline-capable PWA, completed PT-BR translations, and two small UX additions.

**Phase ordering:** Smallest-blast-radius first, operator-decided — LICENSE+README → Forrest links → labels-vs-icons toggle → PT-BR review → PWA install. Continues v1.2 phase numbering (starts at Phase 23).

## v1.3 Requirements

Requirements for the v1.3 release. Each maps to one roadmap phase.

### Documentation

- [x] **DOCS-01**: The repository has a `LICENSE` file containing the MIT License.
- [x] **DOCS-02**: The `README` accurately describes the app, local dev/build setup, and the project's claim-safe positioning (guided breathing practice, inspired by Forrest Knutson's teachings — no medical claims).

### Learn Surface

- [x] **LEARN-01**: User can open Forrest Knutson's native "Resonant Breathing" apps (iOS App Store + Google Play) from the Learn surface.

### Cue Indicator

- [x] **CUE-01**: User can choose how the in-orb In/Out breathing cue is shown — text labels, directional arrow icons, or a nose-airflow drawing — via a new SettingsDialog picker with three options.
- [x] **CUE-02**: User's cue-style choice persists across reloads via the existing localStorage prefs envelope (forward-compat read, refuse-downgrade write, no `STATE_VERSION` bump).
- [x] **CUE-03**: Arrow and drawing modes keep an accessible localized In/Out announcement (visually-hidden localized text + `aria-hidden` SVG) and render correctly across all 3 visual variants (Orb, Square, Diamond) and under reduced-motion.

### Internationalization

- [x] **I18N-07**: All machine-translated PT-BR strings (`src/content/` catalogs) are reviewed by a native speaker, corrected where needed, and every `// TODO: native-speaker review` marker is removed — with the frozen-EN `LOCKED_COPY` byte-equality guard and `Record<LocaleId, UiStrings>` type completeness intact.

### Progressive Web App

- [x] **PWA-01**: User can install the app to their home screen / desktop — Web App Manifest with correct `start_url`/`scope` for the `/hrv/` base path, maskable icons, and an Apple touch icon.
- [x] **PWA-02**: User can run a started breathing session fully offline — a service worker precaches the app shell and all static assets.
- [x] **PWA-03**: The installed app updates to the latest deployed version without serving a stale app shell, and an update never interrupts a running breathing session.

## Future Requirements

Deferred to a later release. Tracked but not in v1.3 roadmap.

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

### v1.x Carry-Forwards (Tech Debt)

- iOS Safari mid-page audio recovery after lock/unlock (Override SC1, OS-level audio session loss).
- Firefox Desktop orb scale-animation flicker (Override FF-01, needs CSS keyframes root remedy).
- S2 Android Chrome wake-lock real-device UAT (Phase 5 Plan 04 — physical device unavailable).
- iOS Safari Pitfall 6 — phone-call interrupted state (Phase 3 Open Question 5).
- Inner-ring UX symmetry (Issue B, Phase 5.1) — separate planning candidate.
- Phase 12 `VALIDATION.md` + `SECURITY.md` retroactive close (advisory; threat model inlined in `12-01-PLAN.md`).
- iOS standalone-PWA Wake Lock unavailable on iOS < 18.4 (WebKit bug 254545) — surfaced by PWA-01; product decision whether to detect + warn.

## Out of Scope

Explicitly excluded. Documented to prevent scope creep.

| Feature | Reason |
|---------|--------|
| Accounts, login, cloud sync, profiles, or backend user data | v1 stays local-only, private, low-friction |
| Medical, therapeutic, or diagnostic claims | App presents guided breathing practice, not health advice |
| Biofeedback (camera pulse, HR/HRV sensors) | Out of v1 scope |
| Streaks, leaderboards, gamified pressure | History stays simple and calm |
| Unlicensed Forrest Knutson logos / protected assets | Branding requires permission context |
| Native mobile/watch apps and health platform integrations | Web-first; native adds scope and privacy complexity |
| Pause/resume mid-session (SESS-06) | Deferred — revisit in a later milestone |
| Cue volume control (AUDI-03) | Deferred — mute is enough for now |
| Recolored / restyled App Store + Google Play badges | Both stores' brand guidelines forbid modifying official badges; use official badges or plain styled text links |
| Per-theme PWA install icons | The OS reads the install icon once at install time; the dynamic per-theme favicon system cannot extend to it — one neutral static icon set |
| Service-worker runtime caching beyond the app shell | The app has no backend and generates audio at runtime; precaching the static shell is sufficient for full offline use |
| In-app custom PWA install button / prompt UX | Browser-native install affordance + iOS "Add to Home Screen" instructions are enough for v1.3 |
| Localized App Store / Google Play URLs | Store URLs are locale-invariant; only the link labels are translated |

## Traceability

Which phases cover which requirements. Filled during roadmap creation.

| Requirement | Phase | Status |
|-------------|-------|--------|
| DOCS-01 | Phase 23 | Complete |
| DOCS-02 | Phase 23 | Complete |
| LEARN-01 | Phase 24 | Complete |
| CUE-01 | Phase 25 | Complete |
| CUE-02 | Phase 25 | Complete |
| CUE-03 | Phase 25 | Complete |
| I18N-07 | Phase 26 | Complete |
| PWA-01 | Phase 27 | Complete |
| PWA-02 | Phase 27 | Complete |
| PWA-03 | Phase 27 | Complete |
