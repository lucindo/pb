---
phase: 27
slug: pwa-install-offline
status: draft
nyquist_compliant: false
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
| TBD | — | — | PWA-01/02/03 | — | N/A | build-artifact | `vite build && ls dist` | ❌ W0 | ⬜ pending |

*Planner populates this table from PLAN.md tasks. Service worker, install flow, and offline behavior are not unit-testable — build-artifact assertions substitute (see Manual-Only Verifications).*

*Status: ⬜ pending · ✅ green · ❌ red · ⚠️ flaky*

---

## Wave 0 Requirements

- [ ] `vite-plugin-pwa` installed in `devDependencies` — if not present.

*Existing vitest infrastructure covers all jsdom-testable phase logic. SW/install/offline have no jsdom coverage.*

---

## Manual-Only Verifications

| Behavior | Requirement | Why Manual | Test Instructions |
|----------|-------------|------------|-------------------|
| App installs to home screen / desktop | PWA-01 | Install flow + browser-native affordance not available in jsdom | Real-device iOS standalone-mode UAT — install via Safari Add to Home Screen; confirm icon, name, splash. |
| Started session runs fully offline | PWA-02 | Service worker + offline mode not available in jsdom | Real-device UAT — start a session, enable airplane mode, confirm session completes (audio, visuals). |
| Update applies without stale shell / session interruption | PWA-03 | Service worker update lifecycle not available in jsdom | Deploy a new build; confirm installed app loads new version on next launch; confirm a running session is not interrupted by an update. |
| iOS standalone audio + Wake Lock behavior | PWA-01/02 | iOS standalone-mode regressions not reproducible in jsdom | Real-device iOS UAT — confirm audio plays in standalone mode; document Wake Lock absence on iOS < 18.4 (WebKit bug 254545). |

---

## Validation Sign-Off

- [ ] All tasks have `<automated>` verify (build-artifact) or Wave 0 dependencies
- [ ] Sampling continuity: no 3 consecutive tasks without automated verify
- [ ] Wave 0 covers all MISSING references
- [ ] No watch-mode flags
- [ ] Feedback latency < 60s
- [ ] `nyquist_compliant: true` set in frontmatter

**Approval:** pending
