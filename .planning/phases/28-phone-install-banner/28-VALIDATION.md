---
phase: 28
slug: phone-install-banner
status: validated
nyquist_compliant: true
wave_0_complete: true
created: 2026-05-16
updated: 2026-05-16
---

# Phase 28 — Validation Strategy

> Per-phase validation contract for feedback sampling during execution.

---

## Test Infrastructure

| Property | Value |
|----------|-------|
| **Framework** | vitest 4.1.5 |
| **Config file** | `vite.config.ts` (test block) |
| **Quick run command** | `npx vitest run <file>` |
| **Full suite command** | `npm run test:run` |
| **Estimated runtime** | ~12 seconds (full suite, 987 tests) |

---

## Sampling Rate

- **After every task commit:** Run `npx vitest run <changed test file>`
- **After every plan wave:** Run `npm run test:run`
- **Before `/gsd-verify-work`:** Full suite must be green
- **Max feedback latency:** ~12 seconds

---

## Per-Task Verification Map

| Task ID | Plan | Wave | Requirement | Threat Ref | Secure Behavior | Test Type | Automated Command | File Exists | Status |
|---------|------|------|-------------|------------|-----------------|-----------|-------------------|-------------|--------|
| 28-01-01 | 01 | 1 | INSTALL-03 | T-28-01 / T-28-02 / T-28-03 | `loadInstallDismissed` strict-equals `'true'`; corrupt/throwing storage reads as `false` | unit | `npx vitest run src/storage/installDismissed.test.ts` | ✅ | ✅ green |
| 28-01-02 | 01 | 1 | INSTALL-01/02 | — | `UiStrings.install` EN + PT-BR copy block present, type-complete | unit | `npm run test:run` (catalog completeness + LOCKED_COPY guards) | ✅ | ✅ green |
| 28-02-01 | 02 | 2 | INSTALL-04, INSTALL-05 | — | `useIsStandaloneOrPhone` — `(pointer: coarse)` phone gate, `(display-mode: standalone)`/`navigator.standalone` installed gate, iOS UA detect | unit | `npx vitest run src/hooks/useIsStandaloneOrPhone.test.ts` | ✅ | ✅ green |
| 28-02-02 | 02 | 2 | INSTALL-01 | T-28-04 / T-28-05 | `useBeforeInstallPrompt` — captures `beforeinstallprompt`, `triggerInstall` preserves gesture chain, nulls after use, persists dismissal on accept/`appinstalled` | unit | `npx vitest run src/hooks/useBeforeInstallPrompt.test.ts` | ✅ | ✅ green |
| 28-03-01 | 03 | 3 | INSTALL-01, INSTALL-02 | T-28-07 / T-28-09 | `InstallBanner` — Android install-button path, iOS inline-expand steps, dismiss control, localized copy | unit | `npx vitest run src/components/InstallBanner.test.tsx` | ✅ | ✅ green |
| 28-03-02 | 03 | 3 | INSTALL-01..05 | T-28-08 | `App.tsx` `showBanner` gate composes all 5 conditions; banner in normal document flow | unit | `npm run test:run` | ✅ | ✅ green |

*Status: ⬜ pending · ✅ green · ❌ red · ⚠️ flaky*

All 6 tasks have automated unit verification. 4 phase test files: `installDismissed.test.ts` (5), `useIsStandaloneOrPhone.test.ts` (8), `useBeforeInstallPrompt.test.ts` (8), `InstallBanner.test.tsx` (7) — 28 phase tests, full suite 987/987 green.

---

## Wave 0 Requirements

Existing infrastructure covers all phase requirements. vitest + jsdom + Testing Library already configured (`vite.config.ts`); no framework install or new fixtures required.

---

## Manual-Only Verifications

The unit layer above covers each requirement's logic. The following end-to-end behaviors depend on real browser APIs (`beforeinstallprompt`, `pointer: coarse`, `display-mode: standalone`, `navigator.standalone`) that jsdom cannot simulate — they require real-device confirmation. Tracked in `28-HUMAN-UAT.md`.

| Behavior | Requirement | Why Manual | Test Instructions |
|----------|-------------|------------|-------------------|
| Android Chrome native install dialog | INSTALL-01 | `beforeinstallprompt` fires only in a qualifying Android Chrome PWA environment | On an Android phone in Chrome, open the app; tap the banner's "Install" button; native "Add to Home Screen" dialog appears |
| iOS Safari inline steps expand | INSTALL-02 | `navigator.standalone` + iOS layout require a real device viewport | On an iPhone in Safari (not installed), tap "How to install"; three numbered steps expand inline with the Share glyph; no modal |
| Dismiss persists across reload | INSTALL-03 | Requires real-browser `localStorage` persistence across sessions/tabs | Tap × dismiss; reload + open a new tab; banner absent on all loads; `localStorage['hrv:install-dismissed']` is `'true'` |
| Standalone mode hides banner | INSTALL-04 | `display-mode: standalone` is only true when launched from the home screen | Install the app, launch from the home screen icon; no banner appears |
| Desktop excludes banner | INSTALL-05 | `pointer: coarse` vs `fine` distinction requires a real pointer device | Open the app in a desktop browser; no banner appears |
| Banner hidden during breathing session | INSTALL-01..05 | Requires the full session flow to observe the `appPhase` transition | On a phone browser, start a session; banner hidden while running; reappears at idle |

---

## Validation Sign-Off

- [x] All tasks have `<automated>` verify or Wave 0 dependencies
- [x] Sampling continuity: no 3 consecutive tasks without automated verify
- [x] Wave 0 covers all MISSING references (none — existing infra sufficient)
- [x] No watch-mode flags (`test:run` uses `vitest run`)
- [x] Feedback latency < 15s
- [x] `nyquist_compliant: true` set in frontmatter

**Approval:** approved 2026-05-16

---

## Validation Audit 2026-05-16

| Metric | Count |
|--------|-------|
| Gaps found | 0 |
| Resolved | 0 |
| Escalated | 0 |

All 6 phase tasks (INSTALL-01..05) carry automated unit verification — 28 phase tests, full suite 987/987 green. 6 end-to-end behaviors are inherently device-dependent and documented as manual-only in `28-HUMAN-UAT.md`. No test gaps; no auditor spawn required.
