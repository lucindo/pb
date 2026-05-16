### Phase 25: Labels-vs-Icons Cue Toggle
**Goal**: Users can choose how the in-orb In/Out breathing cue is shown — text labels, directional arrow icons, or a nose-airflow drawing.
**Depends on**: Phase 24
**Requirements**: CUE-01, CUE-02, CUE-03
**Success Criteria** (what must be TRUE):
  1. A user can switch the in-orb In/Out cue between text labels, arrow icons, and a nose-airflow drawing via a new three-option picker in SettingsDialog.
  2. The user's cue-style choice persists across reloads via the existing localStorage prefs envelope, with no `STATE_VERSION` bump.
  3. In arrow and drawing modes, a screen reader still announces the localized In/Out word (visually-hidden localized text + `aria-hidden` SVG), and the existing `aria-live` phase announcements are unchanged.
  4. The arrow and drawing cues read clearly and unambiguously across all 3 visual variants (Orb, Square, Diamond), under `prefers-reduced-motion`, and across all 5 palettes.
  5. The default cue style is `'labels'` (Text), so users who never open SettingsDialog see today's exact rendering with zero regression.
**Plans**: 5 plans
Plans:
**Wave 1**
- [x] 25-01-PLAN.md — Cue dimension foundation: domain enum + prefs envelope coerce + i18n strings

**Wave 2** *(blocked on Wave 1 completion)*
- [x] 25-02-PLAN.md — Cue hook pair: useCueChoice (picker-side) + useVisualCue (App-side orchestrator)
- [x] 25-03-PLAN.md — Cue rendering: CueGlyph (labels/arrow/nose SVGs + a11y) threaded through all 3 shapes

**Wave 3** *(blocked on Wave 2 completion)*
- [x] 25-04-PLAN.md — CuePicker radiogroup component wired into SettingsDialog

**Wave 4** *(blocked on Wave 3 completion)*
- [x] 25-05-PLAN.md — App.tsx capture-at-Start wiring + operator visual-review checkpoint
**UI hint**: yes

### Phase 26: PT-BR Native-Speaker Review

**Goal:** Every machine-translated PT-BR string in `src/content/` is reviewed by a native speaker, corrected where needed, and every `// TODO: native-speaker review` marker is removed — with the frozen-EN `LOCKED_COPY` byte-equality guard and `Record<LocaleId, UiStrings>` type completeness intact.
**Requirements**: I18N-07
**Depends on:** Phase 25
**Plans:** 1/1 plans complete

Plans:
**Wave 1**
- [x] 26-01-PLAN.md — Operator-reviewed pt-BR sweep of both content catalogs (98 markers resolved) + marker-guard drift test

### Phase 27: PWA Install & Offline

**Goal**: The HRV breathing app is an installable, offline-capable PWA — a Web App Manifest makes it addable to home screen/desktop, a service worker precaches the app shell so a started session runs fully offline, and updates roll out without serving a stale shell or interrupting a running session.
**Depends on**: Phase 26
**Requirements**: PWA-01, PWA-02, PWA-03
**Success Criteria** (what must be TRUE):
  1. A user can install the app to their home screen / desktop via the browser-native affordance — Web App Manifest has correct `start_url`/`scope` for the `/hrv/` base path, maskable icons, and an Apple touch icon.
  2. A user can run a started breathing session fully offline — a service worker precaches the app shell and all static assets.
  3. The installed app updates to the latest deployed version without serving a stale app shell, and an update never interrupts a running breathing session.
  4. Real-device iOS standalone-mode UAT confirms install, offline session, audio, and Wake Lock behavior — this is a named deliverable, not a deferred carry-forward (iOS < 18.4 Wake Lock limitation documented per WebKit bug 254545).
  5. The zero-net-new-*runtime*-deps invariant holds: `dependencies` stays `react` + `react-dom`; `vite-plugin-pwa` enters as a build-time dependency only.
**UI hint**: no
