# Requirements: HRV Breathing WebApp — v1.5 Navi Kriya Practice

**Defined:** 2026-05-17
**Core Value:** Users can start a hands-off HRV breathing session and comfortably follow accurate, uninterrupted inhale/exhale guidance through synchronized visuals and optional sound.

**Milestone goal:** Add Navi Kriya as a second Forrest Knutson practice alongside Resonant Breathing — one app, switchable, each practice with its own settings and stats. Blueprint validated across 3 spikes (`.planning/spikes/`), packaged in the `spike-findings-hrv` skill.

## v1.5 Requirements

Requirements for milestone v1.5. Each maps to exactly one roadmap phase.

### Multi-Practice Architecture

- [x] **PRACTICE-01**: User can switch between Resonant Breathing and Navi Kriya using a top segmented control above the orb
- [x] **PRACTICE-02**: User's last-used practice and each practice's own settings persist across reloads
- [x] **PRACTICE-03**: User cannot switch practices while a session is in progress — the switcher is disabled until the session ends
- [x] **PRACTICE-04**: A returning user's existing saved Resonant Breathing settings and stats survive the upgrade to multi-practice
- [x] **PRACTICE-05**: User can adjust shared app-wide settings (theme, language, visual variant, cue style) from one settings screen that serves both practices
- [x] **PRACTICE-06**: User sees the practice-specific controls for whichever practice is currently active

### Navi Kriya

- [x] **NK-01**: User can start an app-paced Navi Kriya session in which the app counts each OM and auto-advances front → back → next round
- [x] **NK-02**: User can choose the number of rounds for a Navi Kriya session (default 3)
- [x] **NK-03**: User can choose the OM length — fast, medium, or slow
- [x] **NK-04**: User can choose the base front OM count (default 100); the back count is fixed at one quarter of the front
- [x] **NK-05**: User hears distinct cue sounds marking the start of the front phase, the start of the back phase, and the end of practice
- [x] **NK-06**: User can turn an audible per-OM cue on or off
- [x] **NK-07**: User can end a Navi Kriya session in progress _(amended at the v1.5 milestone audit, 2026-05-19: pause/resume dropped — Navi Kriya intentionally mirrors HRV's no-pause flow, per commit `c19c0e1`. Original text: "pause, resume, and end".)_
- [x] **NK-08**: User can see Navi Kriya practice stats — sessions, rounds completed, and total minutes — tracked separately from Resonant Breathing stats
- [x] **NK-09**: User sees the current OM count, the active phase (front/back), and the current round on screen throughout a Navi Kriya session

### Learn

- [x] **LEARN-02**: User sees Learn content specific to the active practice — a practice description and relevant Forrest video links
- [x] **LEARN-03**: User sees shared Learn sections (Who is Forrest, Forrest Resources) regardless of which practice is active

### Localization

- [x] **I18N-08**: User can read all new Navi Kriya and multi-practice UI copy in both English and native-quality PT-BR

## Phase 34 — Stretch as a Distinct Practice

Post-v1.5 phase appended to the roadmap (like Phase 33). Delivers the Future
requirement PRACTICE-F1 — the third practice. Sourced from spikes 002 + 007.

- [x] **STRETCH-01**: User can switch between HRV, Stretch, and Navi using the top segmented control above the orb
- [x] **STRETCH-02**: The 3-practice switcher stays legible and tappable on mobile down to 320px, in English and PT-BR, and ships both label treatments (text / icon+label) selectable via a developer-only toggle
- [x] **STRETCH-03**: Stretch has its own per-practice session settings, persisted across reloads, separate from HRV's
- [x] **STRETCH-04**: Stretch records its own per-practice stats — separate from HRV's and Navi Kriya's
- [x] **STRETCH-05**: A returning user's existing HRV and Navi data survives the upgrade, and prior Stretch usage is preserved under the new Stretch practice slice (storage-envelope migration)
- [x] **STRETCH-06**: User can read all new Stretch UI copy in both English and native-quality PT-BR

## Phase 35 — Flute Cue Timbre

Post-v1.5 phase appended to the roadmap (like Phases 33 and 34). Sourced from spike 008
(chime-replacement-timbre) — the operator found the Chime cue timbre too close to Bowl.

- [x] **AUDIO-01**: The Chime cue timbre is replaced by a Flute timbre — harmonic sine partials with a soft breath attack — audibly distinct from Bowl, Bell, and Sine on both the In and Out cues
- [x] **AUDIO-02**: A returning user with a persisted `timbre: 'chime'` preference is migrated to `'flute'` with no crash and no lost preference

## Future Requirements

Deferred to a future release. Tracked but not in the v1.5 roadmap.

### Additional Practices

- **PRACTICE-F1**: Support a third (and further) Forrest Knutson practice. The top segmented control comfortably holds ~3–4 practices; beyond that the switcher mechanism must be revisited (spike 002). — _Being delivered by Phase 34 (Stretch as a Distinct Practice); see STRETCH-01..06 above._

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
| PRACTICE-01 | Phase 30 | Complete |
| PRACTICE-02 | Phase 30 (closed by Phase 33) | Complete |
| PRACTICE-03 | Phase 30 | Complete |
| PRACTICE-04 | Phase 30 | Complete |
| PRACTICE-05 | Phase 30 | Complete |
| PRACTICE-06 | Phase 30 | Complete |
| NK-01 | Phase 31 | Complete |
| NK-02 | Phase 31 | Complete |
| NK-03 | Phase 31 | Complete |
| NK-04 | Phase 31 | Complete |
| NK-05 | Phase 31 | Complete |
| NK-06 | Phase 31 | Complete |
| NK-07 | Phase 31 | Complete (amended — end-only) |
| NK-08 | Phase 31 | Complete |
| NK-09 | Phase 31 | Complete |
| LEARN-02 | Phase 32 | Complete |
| LEARN-03 | Phase 32 | Complete |
| I18N-08 | Phase 32 | Complete |
| STRETCH-01 | Phase 34 | Complete |
| STRETCH-02 | Phase 34 | Complete |
| STRETCH-03 | Phase 34 | Complete |
| STRETCH-04 | Phase 34 | Complete |
| STRETCH-05 | Phase 34 | Complete |
| STRETCH-06 | Phase 34 | Complete |
| AUDIO-01 | Phase 35 | Complete |
| AUDIO-02 | Phase 35 | Complete |

**Coverage:**
- v1.5 requirements: 18 total
- Mapped to phases: 18 ✓
- Unmapped: 0 ✓
- Post-v1.5 appended: STRETCH-01..06 → Phase 34 (6)

**Per-phase breakdown:**
- Phase 30 — Multi-Practice Architecture & Switcher: PRACTICE-01..06 (6)
- Phase 31 — Navi Kriya Engine & Session: NK-01..09 (9)
- Phase 32 — Learn & Localization: LEARN-02, LEARN-03, I18N-08 (3)
- Phase 34 — Stretch as a Distinct Practice: STRETCH-01..06 (6)

---
*Requirements defined: 2026-05-17*
*Last updated: 2026-05-19 — v1.5 milestone re-audit: NK-01..09 marked Complete; NK-07 amended to end-only (pause/resume dropped to mirror HRV); PRACTICE-02 annotated as closed by Phase 33*
