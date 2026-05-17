# Requirements: HRV Breathing WebApp — v1.5 Navi Kriya Practice

**Defined:** 2026-05-17
**Core Value:** Users can start a hands-off HRV breathing session and comfortably follow accurate, uninterrupted inhale/exhale guidance through synchronized visuals and optional sound.

**Milestone goal:** Add Navi Kriya as a second Forrest Knutson practice alongside Resonant Breathing — one app, switchable, each practice with its own settings and stats. Blueprint validated across 3 spikes (`.planning/spikes/`), packaged in the `spike-findings-hrv` skill.

## v1.5 Requirements

Requirements for milestone v1.5. Each maps to exactly one roadmap phase.

### Multi-Practice Architecture

- [ ] **PRACTICE-01**: User can switch between Resonant Breathing and Navi Kriya using a top segmented control above the orb
- [ ] **PRACTICE-02**: User's last-used practice and each practice's own settings persist across reloads
- [ ] **PRACTICE-03**: User cannot switch practices while a session is in progress — the switcher is disabled until the session ends
- [ ] **PRACTICE-04**: A returning user's existing saved Resonant Breathing settings and stats survive the upgrade to multi-practice
- [ ] **PRACTICE-05**: User can adjust shared app-wide settings (theme, language, visual variant, cue style) from one settings screen that serves both practices
- [ ] **PRACTICE-06**: User sees the practice-specific controls for whichever practice is currently active

### Navi Kriya

- [ ] **NK-01**: User can start an app-paced Navi Kriya session in which the app counts each OM and auto-advances front → back → next round
- [ ] **NK-02**: User can choose the number of rounds for a Navi Kriya session (default 3)
- [ ] **NK-03**: User can choose the OM length — fast, medium, or slow
- [ ] **NK-04**: User can choose the base front OM count (default 100); the back count is fixed at one quarter of the front
- [ ] **NK-05**: User hears distinct cue sounds marking the start of the front phase, the start of the back phase, and the end of practice
- [ ] **NK-06**: User can turn an audible per-OM cue on or off
- [ ] **NK-07**: User can pause, resume, and end a Navi Kriya session in progress
- [ ] **NK-08**: User can see Navi Kriya practice stats — sessions, rounds completed, and total minutes — tracked separately from Resonant Breathing stats
- [ ] **NK-09**: User sees the current OM count, the active phase (front/back), and the current round on screen throughout a Navi Kriya session

### Learn

- [ ] **LEARN-02**: User sees Learn content specific to the active practice — a practice description and relevant Forrest video links
- [ ] **LEARN-03**: User sees shared Learn sections (Who is Forrest, Forrest Resources) regardless of which practice is active

### Localization

- [ ] **I18N-08**: User can read all new Navi Kriya and multi-practice UI copy in both English and native-quality PT-BR

## Future Requirements

Deferred to a future release. Tracked but not in the v1.5 roadmap.

### Additional Practices

- **PRACTICE-F1**: Support a third (and further) Forrest Knutson practice. The top segmented control comfortably holds ~3–4 practices; beyond that the switcher mechanism must be revisited (spike 002).

### Carry-Forward Tech Debt

- The v1.x carry-forward register (iOS Safari mid-page audio recovery, Firefox orb flicker, Android wake-lock real-device UAT, code-review WR-01, 28 Info-severity findings, etc.) remains deferred — see PROJECT.md `### v1.x Carry-Forwards` and STATE.md `## Deferred Items`.

## Out of Scope

Explicitly excluded from v1.5. Documented to prevent scope creep.

| Feature | Reason |
|---------|--------|
| Tap-to-count / self-paced Navi Kriya | App-paced (metronome) chosen and validated in spike 003 — the app keeps the count |
| Breath-syncing Navi Kriya | Navi Kriya is a counting practice, not breath-paced — the Resonant inhale/exhale model does not apply |
| User-overridable front:back ratio | The 4:1 ratio is fixed by the practice; only the base front count is configurable |
| A third/fourth practice this milestone | v1.5 ships exactly two practices; further practices are Future (PRACTICE-F1) |
| v1.x carry-forward tech debt | This milestone is focused on the second practice; debt stays deferred |
| User accounts, cloud sync, biofeedback, gamification | Project-level out-of-scope — unchanged from v1.0 |

## Traceability

Which phases cover which requirements. Updated during roadmap creation.

| Requirement | Phase | Status |
|-------------|-------|--------|
| PRACTICE-01 | TBD | Pending |
| PRACTICE-02 | TBD | Pending |
| PRACTICE-03 | TBD | Pending |
| PRACTICE-04 | TBD | Pending |
| PRACTICE-05 | TBD | Pending |
| PRACTICE-06 | TBD | Pending |
| NK-01 | TBD | Pending |
| NK-02 | TBD | Pending |
| NK-03 | TBD | Pending |
| NK-04 | TBD | Pending |
| NK-05 | TBD | Pending |
| NK-06 | TBD | Pending |
| NK-07 | TBD | Pending |
| NK-08 | TBD | Pending |
| NK-09 | TBD | Pending |
| LEARN-02 | TBD | Pending |
| LEARN-03 | TBD | Pending |
| I18N-08 | TBD | Pending |

**Coverage:**
- v1.5 requirements: 18 total
- Mapped to phases: 0 (roadmap pending)
- Unmapped: 18 ⚠️

---
*Requirements defined: 2026-05-17*
*Last updated: 2026-05-17 at milestone v1.5 start*
