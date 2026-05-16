---
phase: 29
slug: settings-install-entry-localization
status: complete
nyquist_compliant: true
wave_0_complete: true
created: 2026-05-16
updated: 2026-05-16
---

# Phase 29 — Validation Strategy

> Per-phase validation contract for feedback sampling during execution.

---

## Test Infrastructure

| Property | Value |
|----------|-------|
| **Framework** | Vitest 4.1.5 |
| **Config file** | vite.config.ts (vitest inline config) |
| **Quick run command** | `npm test -- --run src/components/SettingsDialog.test.tsx src/components/IosInstallSteps.test.tsx src/content/content.no-review-markers.test.ts` |
| **Full suite command** | `npm test -- --run` |
| **Estimated runtime** | ~15 seconds |

---

## Sampling Rate

- **After every task commit:** Run `npm test -- --run src/components/SettingsDialog.test.tsx src/content/content.no-review-markers.test.ts`
- **After every plan wave:** Run `npm test -- --run`
- **Before `/gsd-verify-work`:** Full suite must be green
- **Max feedback latency:** 15 seconds

---

## Per-Task Verification Map

| Task ID | Plan | Wave | Requirement | Threat Ref | Secure Behavior | Test Type | Automated Command | File Exists | Status |
|---------|------|------|-------------|------------|-----------------|-----------|-------------------|-------------|--------|
| 29-02 T2 | 29-02 | 2 | INSTALL-06 | — | Settings row visible when installable && !standalone | unit | `npm test -- --run src/components/SettingsDialog.test.tsx` | ✅ exists | ✅ green |
| 29-02 T2 | 29-02 | 2 | INSTALL-06 | — | Settings row absent when not installable | unit | `npm test -- --run src/components/SettingsDialog.test.tsx` | ✅ exists | ✅ green |
| 29-02 T2 | 29-02 | 2 | INSTALL-06 | — | Settings row absent when isStandalone | unit | `npm test -- --run src/components/SettingsDialog.test.tsx` | ✅ exists | ✅ green |
| 29-02 T2 | 29-02 | 2 | INSTALL-06 | — | Android/desktop: install button triggers triggerInstall | unit | `npm test -- --run src/components/SettingsDialog.test.tsx` | ✅ exists | ✅ green |
| 29-02 T2 | 29-02 | 2 | INSTALL-06 | — | iOS: steps toggle present, steps expand inline | unit | `npm test -- --run src/components/SettingsDialog.test.tsx` | ✅ exists | ✅ green |
| 29-01 T1 | 29-01 | 1 | INSTALL-06 | — | IosInstallSteps renders 3 steps with Share glyph, id prop wired | unit | `npm test -- --run src/components/IosInstallSteps.test.tsx` | ✅ exists | ✅ green |
| 29-01 T2 | 29-01 | 1 | INSTALL-06 | — | InstallBanner still renders IosInstallSteps (no regression) | unit | `npm test -- --run src/components/InstallBanner.test.tsx` | ✅ exists | ✅ green |
| 29-03 T2 | 29-03 | 1 | INSTALL-06 | — | iOS install steps carry theme-aware var(--color-breathing-*) token on all 3 <li> (GAP-1 regression) | unit | `npm test -- --run src/components/IosInstallSteps.test.tsx` | ✅ exists | ✅ green |
| 29-02 T3 | 29-02 | 2 | INSTALL-07 | — | PT-BR review markers removed from strings.ts | drift-guard | `npm test -- --run src/content/content.no-review-markers.test.ts` | ✅ exists | ✅ green |
| 29-01 T3 | 29-01 | 1 | INSTALL-07 | — | UiStrings.install has all keys in both locales | type check | `npx tsc --noEmit -p tsconfig.app.json` | ✅ exists | ✅ green |

*Status: ⬜ pending · ✅ green · ❌ red · ⚠️ flaky*

---

## Wave 0 Requirements

- [x] New `describe` blocks in `src/components/SettingsDialog.test.tsx` — INSTALL-06 row visibility, Android button, iOS toggle (`describe('SettingsDialog — install row (Phase 29 INSTALL-06)')`, 6 cases)
- [x] `src/components/IosInstallSteps.test.tsx` — D-06 shared component (steps render, Share glyph present, `id` prop wired; 4 cases incl. GAP-1 regression)
- [x] No new test files for `strings.ts` — TypeScript `satisfies` check + existing drift-guard cover INSTALL-07

---

## Manual-Only Verifications

| Behavior | Requirement | Why Manual | Test Instructions |
|----------|-------------|------------|-------------------|
| Native PWA install prompt actually fires on Android Chrome | INSTALL-06 | `beforeinstallprompt` cannot be synthesized in jsdom; real browser event | On Android Chrome, open Settings → tap install row → confirm OS install sheet appears |
| iOS Add-to-Home-Screen flow completes | INSTALL-06 | Real iOS Safari behavior; no jsdom equivalent | On iOS Safari, open Settings → expand iOS steps → follow Share → Add to Home Screen |
| PT-BR copy reads native-quality | INSTALL-07 | Linguistic quality is operator judgement, not assertable | Operator reviews drafted PT-BR strings before review markers removed (D-13) |

---

## Validation Sign-Off

- [x] All tasks have `<automated>` verify or Wave 0 dependencies
- [x] Sampling continuity: no 3 consecutive tasks without automated verify
- [x] Wave 0 covers all MISSING references
- [x] No watch-mode flags
- [x] Feedback latency < 15s
- [x] `nyquist_compliant: true` set in frontmatter

**Approval:** compliant — 2026-05-16

---

## Validation Audit 2026-05-16

State A audit (existing VALIDATION.md). Cross-referenced all 10 per-task verification rows (INSTALL-06 ×8, INSTALL-07 ×2) against the implemented test suite.

| Metric | Count |
|--------|-------|
| Requirements audited | 2 (INSTALL-06, INSTALL-07) |
| Verification rows | 10 |
| COVERED | 10 |
| PARTIAL | 0 |
| MISSING | 0 |
| Gaps found | 0 |
| Resolved | 0 (none needed) |
| Escalated | 0 |

All Wave 0 test files exist and pass: `SettingsDialog.test.tsx` (6 install-row cases), `IosInstallSteps.test.tsx` (4 cases incl. GAP-1 regression), `InstallBanner.test.tsx` (regression). `content.no-review-markers.test.ts` drift-guard green. `tsc --noEmit` clean. Phase-relevant suites: 4 files / 29 tests pass; full suite 997/997. The original `draft` VALIDATION.md predated execution — this audit reconciles it to `nyquist_compliant: true`. No tests generated; coverage was already complete.
