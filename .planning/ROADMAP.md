# Roadmap: HRV Breathing WebApp

## Milestones

- ✅ **v1.0 MVP** — Phases 1–6 + 5.1 (shipped 2026-05-11)
- ✅ **v1.0.1 Code Review Patch** — Phases 7–12 (shipped 2026-05-12)
- ✅ **v1.1 Customization** — Phases 13–19 (shipped 2026-05-15)
- ✅ **v1.2 BPM Stretch** — Phases 20–22 (shipped 2026-05-15)
- ✅ **v1.3 Release Polish** — Phases 23–27 (shipped 2026-05-16)
- ✅ **v1.4 Install Helper** — Phases 28–29 (shipped 2026-05-16)
- 🔨 **v1.5 Navi Kriya Practice** — Phases 30–32 (in progress)

## Phases

### v1.5 Navi Kriya Practice (Phases 30–32)

- [ ] **Phase 30: Multi-Practice Architecture & Switcher** - A `practice` concept above `mode`, per-practice settings/stats, top segmented switcher, and a split chrome/practice settings screen
- [ ] **Phase 31: Navi Kriya Engine & Session** - App-paced OM-counting practice end to end — front/back phase machine, 4:1 ratio, auto-advance, four cue sounds, pause/resume/end, live on-screen count, and per-practice Navi Kriya stats
- [ ] **Phase 32: Learn & Localization** - Per-practice + shared Learn content and native-quality EN/PT-BR copy for all new surfaces

<details>
<summary>✅ v1.4 Install Helper (Phases 28–29) — SHIPPED 2026-05-16</summary>

- [x] Phase 28: Phone Install Banner (3/3 plans)
- [x] Phase 29: Settings Install Entry & Localization (3/3 plans)

Full detail: `.planning/milestones/v1.4-ROADMAP.md`
</details>

<details>
<summary>✅ v1.3 Release Polish (Phases 23–27) — SHIPPED 2026-05-16</summary>

- [x] Phase 23: License & README (1/1 plans)
- [x] Phase 24: Forrest Native-App Links (1/1 plans)
- [x] Phase 25: Labels-vs-Icons Cue Toggle (5/5 plans)
- [x] Phase 26: PT-BR Native-Speaker Review (1/1 plans)
- [x] Phase 27: PWA Install & Offline (3/3 plans)

Full detail: `.planning/milestones/v1.3-ROADMAP.md`
</details>

Earlier milestones (v1.0 → v1.2) are archived under `.planning/milestones/` — see `v1.x-ROADMAP.md` and `v1.x-REQUIREMENTS.md` for each.

## Phase Details

### Phase 30: Multi-Practice Architecture & Switcher
**Goal**: One app hosts two practices — a returning user keeps everything, switches with a top control, and shared vs. per-practice settings are cleanly separated.
**Depends on**: Nothing (v1.5 enabling foundation; builds on shipped v1.4 codebase)
**Requirements**: PRACTICE-01, PRACTICE-02, PRACTICE-03, PRACTICE-04, PRACTICE-05, PRACTICE-06
**Success Criteria** (what must be TRUE):
  1. User can switch between Resonant Breathing and Navi Kriya using a top segmented control above the orb
  2. User's last-used practice and each practice's own session settings persist across reloads
  3. User cannot operate the switcher while a session is in progress — it is disabled until the session ends
  4. A returning user with existing saved Resonant Breathing settings and stats sees them intact after the upgrade — nothing is lost
  5. User adjusts shared app-wide settings (theme, language, visual variant, cue style) from one settings screen, and sees only the active practice's practice-specific controls
**Plans**: 4 plans
- [x] 30-01-PLAN.md — Navi Kriya settings domain model + validators (D-02)
- [x] 30-02-PLAN.md — PracticeToggle segmented control + practice copy strings
- [x] 30-03-PLAN.md — STATE_VERSION v1→v2 migration + per-practice storage module
- [x] 30-04-PLAN.md — App.tsx rewiring, practice-aware SettingsForm, switcher integration
**UI hint**: yes

### Phase 31: Navi Kriya Engine & Session
**Goal**: User can run a complete app-paced Navi Kriya OM-counting session from start to end — with audible cues, live on-screen feedback, and a completed session recording its own per-practice stats.
**Depends on**: Phase 30 (the `practice` concept, per-practice settings/stats, and switcher must exist first)
**Requirements**: NK-01, NK-02, NK-03, NK-04, NK-05, NK-06, NK-07, NK-08, NK-09
**Success Criteria** (what must be TRUE):
  1. User can start an app-paced Navi Kriya session in which the app counts each OM and auto-advances front → back → next round with no pause-for-user between phases
  2. User can configure rounds (default 3), OM length (fast/medium/slow), and base front OM count (default 100) — with the back count fixed at one quarter of the front
  3. User hears distinct cue sounds marking the front-phase start, the back-phase start, and the end of practice, and can turn an audible per-OM tick on or off
  4. User can pause, resume, and end a Navi Kriya session in progress
  5. User sees the current OM count, the active phase (front/back), and the current round on screen throughout the session
  6. A completed Navi Kriya session records its own stats — total sessions, rounds completed, and total minutes — tracked separately from Resonant Breathing stats; it updates only the Navi Kriya numbers and leaves Resonant Breathing stats unchanged
**Plans**: TBD
**UI hint**: yes

### Phase 32: Learn & Localization
**Goal**: User can learn about whichever practice is active, still reaches the shared Forrest content, and reads every new screen in English or native-quality PT-BR.
**Depends on**: Phase 30 (active-practice concept), Phase 31 (Navi Kriya copy must be finalized to translate it)
**Requirements**: LEARN-02, LEARN-03, I18N-08
**Success Criteria** (what must be TRUE):
  1. User sees Learn content specific to the active practice — a practice description and relevant Forrest video links
  2. User sees the shared Learn sections (Who is Forrest, Forrest Resources) regardless of which practice is active
  3. User can read all new Navi Kriya and multi-practice UI copy in both English and native-quality PT-BR
**Plans**: TBD
**UI hint**: yes

## Progress

| Milestone | Phases | Status | Completed |
| --------- | ------ | ------ | --------- |
| v1.0 MVP | 1–6, 5.1 | Complete | 2026-05-11 |
| v1.0.1 Code Review Patch | 7–12 | Complete | 2026-05-12 |
| v1.1 Customization | 13–19 | Complete | 2026-05-15 |
| v1.2 BPM Stretch | 20–22 | Complete | 2026-05-15 |
| v1.3 Release Polish | 23–27 | Complete | 2026-05-16 |
| v1.4 Install Helper | 28–29 | Complete | 2026-05-16 |

### v1.5 Navi Kriya Practice

| Phase | Plans Complete | Status | Completed |
|-------|----------------|--------|-----------|
| 30. Multi-Practice Architecture & Switcher | 4/4 | Complete   | 2026-05-17 |
| 31. Navi Kriya Engine & Session | 0/? | Not started | - |
| 32. Learn & Localization | 0/? | Not started | - |
