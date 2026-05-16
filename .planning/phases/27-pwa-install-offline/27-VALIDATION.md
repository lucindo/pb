---
phase: 27
slug: pwa-install-offline
status: planned
nyquist_compliant: true
wave_0_complete: false
created: 2026-05-16
---

# Phase 27 — Validation Strategy

> Per-phase validation contract for feedback sampling during execution.

---

## Test Infrastructure

| Property | Value |
|----------|-------|
| **Framework** | vitest |
| **Config file** | existing (vitest config in repo) |
| **Quick run command** | `vitest run` |
| **Full suite command** | `tsc -b && eslint . && vite build && vitest run` |
| **Estimated runtime** | ~30 seconds |

---

## Sampling Rate

- **After every task commit:** Run `vitest run`
- **After every plan wave:** Run `tsc -b && eslint . && vite build && vitest run`
- **Before `/gsd-verify-work`:** Full suite must be green
- **Max feedback latency:** 60 seconds

---

## Per-Task Verification Map

| Task ID | Plan | Wave | Requirement | Threat Ref | Secure Behavior | Test Type | Automated Command | File Exists | Status |
|---------|------|------|-------------|------------|-----------------|-----------|-------------------|-------------|--------|
| 27-01-T1 | 27-01 | 1 | PWA-01/02 | T-27-01,03 | devDep-only; zero net-new runtime deps | invariant check | `node -e` dependencies-unchanged check | ✅ | ⬜ pending |
| 27-01-T2 | 27-01 | 1 | PWA-01 | T-27-02 | static in-repo icon artwork | build-artifact | PNG signature + dimension check on 5 icons | ✅ | ⬜ pending |
| 27-02-T1 | 27-02 | 2 | PWA-01/02/03 | T-27-04,05,06,07 | /hrv/ scope; cleanupOutdatedCaches; no SW-reload import | build-artifact | `tsc -b && vite build` + manifest/sw.js asserts | ✅ | ⬜ pending |
| 27-02-T2 | 27-02 | 2 | PWA-01 | T-27-06 | iOS meta tags; no hand-added manifest link | build-artifact | `vite build` + index.html/dist asserts | ✅ | ⬜ pending |
| 27-03-T1 | 27-03 | 3 | PWA-01/02/03 | T-27-08 | documented iOS<18.4 Wake Lock gap | source assertion | `node -e` README content check | ✅ | ⬜ pending |
| 27-03-T2 | 27-03 | 3 | PWA-01/02/03 | T-27-09 | production build + UAT scaffold | build-artifact | `tsc -b && vite build` + UAT-record check | ✅ | ⬜ pending |
| 27-03-T3 | 27-03 | 3 | PWA-01/02/03 | T-27-08,09 | real-device iOS standalone UAT | manual UAT | recorded in 27-03-iOS-UAT.md (iOS-1..iOS-6) | Manual | ⬜ pending |

*Service worker, install flow, and offline behavior are not unit-testable — build-artifact assertions substitute, with real-device iOS UAT for the runtime-only scenarios (see Manual-Only Verifications). No Wave 0 test scaffolds required; build-artifact and source assertions cover every automatable task.*

*Status: ⬜ pending · ✅ green · ❌ red · ⚠️ flaky*

---

## Wave 0 Requirements

- [ ] `vite-plugin-pwa` installed in `devDependencies` — Plan 27-01 Task 1.

*Existing vitest infrastructure covers all jsdom-testable phase logic. SW/install/offline have no jsdom coverage — verified as build artifacts + real-device UAT.*

---

## Manual-Only Verifications

| Behavior | Requirement | Why Manual | Test Instructions |
|----------|-------------|------------|-------------------|
| App installs to home screen / desktop | PWA-01 | Install flow + browser-native affordance not available in jsdom | Real-device iOS standalone-mode UAT (iOS-1) — install via Safari Add to Home Screen; confirm icon, name, splash. |
| Started session runs fully offline | PWA-02 | Service worker + offline mode not available in jsdom | Real-device UAT (iOS-2) — start a session, enable airplane mode, confirm session completes (audio, visuals). |
| Update applies without stale shell / session interruption | PWA-03 | Service worker update lifecycle not available in jsdom | Deploy a new build; confirm installed app loads new version on next launch; confirm a running session is not interrupted by an update. |
| iOS standalone audio + Wake Lock behavior | PWA-01/02 | iOS standalone-mode regressions not reproducible in jsdom | Real-device iOS UAT (iOS-3) — confirm audio plays in standalone mode; document Wake Lock absence on iOS < 18.4 (WebKit bug 254545). |

---

## Validation Sign-Off

- [x] All tasks have `<automated>` verify (build-artifact / invariant / source assertion) or are an explicit manual UAT checkpoint
- [x] Sampling continuity: no 3 consecutive tasks without automated verify
- [x] Wave 0 covers all MISSING references (vite-plugin-pwa install — no test scaffolds needed)
- [x] No watch-mode flags
- [x] Feedback latency < 60s
- [x] `nyquist_compliant: true` set in frontmatter

**Approval:** planner-approved 2026-05-16
