# Roadmap: HRV Breathing WebApp

## Milestones

- ✅ **v1.0 MVP** — Phases 1–6 + 5.1 (shipped 2026-05-11)
- ✅ **v1.0.1 Code Review Patch** — Phases 7–12 (shipped 2026-05-12)
- ✅ **v1.1 Customization** — Phases 13–19 (shipped 2026-05-15)
- ✅ **v1.2 BPM Stretch** — Phases 20–22 (shipped 2026-05-15)
- ✅ **v1.3 Release Polish** — Phases 23–27 (shipped 2026-05-16)
- 🔄 **v1.4 Install Helper** — Phases 28–29 (active)

## Phases

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

### v1.4 Install Helper

- [x] **Phase 28: Phone Install Banner** — Slim dismissible banner on phone browsers: Android native prompt + iOS guided instructions, never shown when already installed (completed 2026-05-16)
- [ ] **Phase 29: Settings Install Entry & Localization** — Persistent install option in SettingsDialog for all browsers, plus EN + PT-BR copy on both install surfaces

## Phase Details

### Phase 28: Phone Install Banner
**Goal**: Phone users running the app in a browser (not installed) can discover and initiate installation through a slim, non-intrusive banner
**Depends on**: Phase 27 (PWA infrastructure — manifest, service worker, install icons)
**Requirements**: INSTALL-01, INSTALL-02, INSTALL-03, INSTALL-04, INSTALL-05
**Success Criteria** (what must be TRUE):
  1. On Android Chrome, a slim install banner appears below the app UI without blocking the breathing session; the banner's install button triggers the browser's native `beforeinstallprompt` install dialog
  2. On iOS Safari, the same banner appears with "Share → Add to Home Screen" step-by-step instructions in place of a native install button
  3. After a user taps dismiss, the banner never appears again — not on page reload, not on future visits — because dismissal is persisted in `localStorage`
  4. On a device where the app is already installed (standalone display mode), no banner appears at all
  5. On desktop browsers, no install banner appears (banner is phone-only)
**Plans**: 3 plans
- [x] 28-01-PLAN.md — Foundations: dismissal-persistence storage helper + UiStrings.install copy block (EN final, PT-BR draft)
- [x] 28-02-PLAN.md — Detection hooks: useBeforeInstallPrompt (Android capture) + useIsStandaloneOrPhone (phone/standalone)
- [x] 28-03-PLAN.md — InstallBanner component (Android + iOS paths) and App.tsx integration behind the showBanner gate
**UI hint**: yes

### Phase 29: Settings Install Entry & Localization
**Goal**: Users on any browser (including desktop and post-dismissal phone) can always reach an install option through SettingsDialog, and all install copy appears in the user's selected language
**Depends on**: Phase 28
**Requirements**: INSTALL-06, INSTALL-07
**Success Criteria** (what must be TRUE):
  1. When the app is running in a browser (not as an installed PWA), SettingsDialog shows an install entry that triggers the install flow (Android native prompt or iOS instructions depending on platform)
  2. The Settings install entry is present even after the phone banner has been dismissed, providing a persistent re-entry path
  3. When the user has selected PT-BR, all install banner copy and the Settings install entry appear in Portuguese; when EN is selected, all copy appears in English
  4. The Settings install entry is absent when the app is already running in standalone (installed) mode
**Plans**: 2 plans
- [x] 29-01-PLAN.md — Extract shared IosInstallSteps component, refactor InstallBanner, add settingsLabel string key
- [ ] 29-02-PLAN.md — Mount install row in SettingsDialog (prop-drilled from App.tsx), finalize PT-BR install copy
**UI hint**: yes

## Progress

| Phase | Plans Complete | Status | Completed |
|-------|----------------|--------|-----------|
| 28. Phone Install Banner | 3/3 | Complete    | 2026-05-16 |
| 29. Settings Install Entry & Localization | 1/2 | In Progress|  |

---

**Milestone progress:** 0/2 phases complete

| Milestone | Phases | Status | Completed |
| --------- | ------ | ------ | --------- |
| v1.0 MVP | 1–6, 5.1 | Complete | 2026-05-11 |
| v1.0.1 Code Review Patch | 7–12 | Complete | 2026-05-12 |
| v1.1 Customization | 13–19 | Complete | 2026-05-15 |
| v1.2 BPM Stretch | 20–22 | Complete | 2026-05-15 |
| v1.3 Release Polish | 23–27 | Complete | 2026-05-16 |
| v1.4 Install Helper | 28–29 | In progress | - |
