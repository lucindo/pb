# Requirements: HRV Breathing WebApp — v1.4 Install Helper

**Defined:** 2026-05-16
**Core Value:** Users can start a hands-off HRV breathing session and comfortably follow accurate, uninterrupted inhale/exhale guidance through synchronized visuals and optional sound.

## v1.4 Requirements

Requirements for the v1.4 Install Helper milestone. Each maps to a roadmap phase.
Builds on the Phase 27 PWA infrastructure (manifest, Workbox service worker, install icons) — this milestone adds only the install *discovery* UX.

### Install Discovery

- [ ] **INSTALL-01**: User on a phone browser (app not yet installed) sees a slim, dismissible install banner that never blocks the breathing flow
- [ ] **INSTALL-02**: User on Android Chrome can tap the banner's install button to trigger the browser's native install prompt
- [ ] **INSTALL-03**: User on iOS Safari sees guided "Share → Add to Home Screen" steps in the banner (no native install prompt exists on iOS)
- [ ] **INSTALL-04**: User who dismisses the banner never sees it again — dismissal persists across visits
- [ ] **INSTALL-05**: User already running the app installed (standalone display mode) sees no install banner
- [ ] **INSTALL-06**: User can find a persistent install option in SettingsDialog whenever the app runs in a browser, including desktop
- [ ] **INSTALL-07**: User sees all install banner and Settings copy in their selected language (EN and PT-BR)

## Future Requirements

Deferred to a future release. Tracked but not in the current roadmap.

(None — v1.4 scope is intentionally narrow.)

## Out of Scope

Explicitly excluded. Documented to prevent scope creep.

| Feature | Reason |
|---------|--------|
| Desktop install banner | The persistent SettingsDialog install option (INSTALL-06) already covers desktop browsers; a desktop banner adds intrusion without value |
| Re-surfacing the banner after dismissal | Operator decision — dismissal is permanent; the Settings option remains the re-entry path |
| Install-rate analytics or tracking | No backend; local-only privacy constraint carried from v1 |
| Custom install flows for non-Safari iOS or non-Chrome Android browsers | Focus on the dominant phone browsers; other browsers fall back to their own UI |

## Traceability

Which phases cover which requirements. Updated during roadmap creation.

| Requirement | Phase | Status |
|-------------|-------|--------|
| INSTALL-01 | Phase 28 | Pending |
| INSTALL-02 | Phase 28 | Pending |
| INSTALL-03 | Phase 28 | Pending |
| INSTALL-04 | Phase 28 | Pending |
| INSTALL-05 | Phase 28 | Pending |
| INSTALL-06 | Phase 29 | Pending |
| INSTALL-07 | Phase 29 | Pending |

**Coverage:**
- v1.4 requirements: 7 total
- Mapped to phases: 7 (Phase 28: 5, Phase 29: 2)
- Unmapped: 0 ✓

---
*Requirements defined: 2026-05-16*
*Last updated: 2026-05-16 after v1.4 roadmap creation*
