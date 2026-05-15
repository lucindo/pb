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
- [ ] 25-01-PLAN.md — Cue dimension foundation: domain enum + prefs envelope coerce + i18n strings
- [ ] 25-02-PLAN.md — Cue hook pair: useCueChoice (picker-side) + useVisualCue (App-side orchestrator)
- [ ] 25-03-PLAN.md — Cue rendering: CueGlyph (labels/arrow/nose SVGs + a11y) threaded through all 3 shapes
- [ ] 25-04-PLAN.md — CuePicker radiogroup component wired into SettingsDialog
- [ ] 25-05-PLAN.md — App.tsx capture-at-Start wiring + operator visual-review checkpoint
**UI hint**: yes
