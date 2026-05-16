---
phase: 29
slug: settings-install-entry-localization
status: draft
nyquist_compliant: false
wave_0_complete: false
created: 2026-05-16
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
| (planner assigns) | — | — | INSTALL-06 | — | Settings row visible when installable && !standalone | unit | `npm test -- --run src/components/SettingsDialog.test.tsx` | ❌ W0 | ⬜ pending |
| (planner assigns) | — | — | INSTALL-06 | — | Settings row absent when not installable | unit | `npm test -- --run src/components/SettingsDialog.test.tsx` | ❌ W0 | ⬜ pending |
| (planner assigns) | — | — | INSTALL-06 | — | Settings row absent when isStandalone | unit | `npm test -- --run src/components/SettingsDialog.test.tsx` | ❌ W0 | ⬜ pending |
| (planner assigns) | — | — | INSTALL-06 | — | Android/desktop: install button triggers triggerInstall | unit | `npm test -- --run src/components/SettingsDialog.test.tsx` | ❌ W0 | ⬜ pending |
| (planner assigns) | — | — | INSTALL-06 | — | iOS: steps toggle present, steps expand inline | unit | `npm test -- --run src/components/SettingsDialog.test.tsx` | ❌ W0 | ⬜ pending |
| (planner assigns) | — | — | INSTALL-06 | — | IosInstallSteps renders 3 steps with Share glyph, id prop wired | unit | `npm test -- --run src/components/IosInstallSteps.test.tsx` | ❌ W0 | ⬜ pending |
| (planner assigns) | — | — | INSTALL-06 | — | InstallBanner still renders IosInstallSteps (no regression) | unit | `npm test -- --run src/components/InstallBanner.test.tsx` | ✅ adjust | ⬜ pending |
| (planner assigns) | — | — | INSTALL-07 | — | PT-BR review markers removed from strings.ts | drift-guard | `npm test -- --run src/content/content.no-review-markers.test.ts` | ✅ existing | ⬜ pending |
| (planner assigns) | — | — | INSTALL-07 | — | UiStrings.install has all keys in both locales | type check | `npm run build` (tsc) | ✅ existing | ⬜ pending |

*Status: ⬜ pending · ✅ green · ❌ red · ⚠️ flaky*

---

## Wave 0 Requirements

- [ ] New `describe` blocks in `src/components/SettingsDialog.test.tsx` — INSTALL-06 row visibility, Android button, iOS toggle
- [ ] `src/components/IosInstallSteps.test.tsx` — D-06 shared component (steps render, Share glyph present, `id` prop wired to `aria-controls`)
- [ ] No new test files for `strings.ts` — TypeScript `satisfies` check + existing drift-guard cover INSTALL-07

---

## Manual-Only Verifications

| Behavior | Requirement | Why Manual | Test Instructions |
|----------|-------------|------------|-------------------|
| Native PWA install prompt actually fires on Android Chrome | INSTALL-06 | `beforeinstallprompt` cannot be synthesized in jsdom; real browser event | On Android Chrome, open Settings → tap install row → confirm OS install sheet appears |
| iOS Add-to-Home-Screen flow completes | INSTALL-06 | Real iOS Safari behavior; no jsdom equivalent | On iOS Safari, open Settings → expand iOS steps → follow Share → Add to Home Screen |
| PT-BR copy reads native-quality | INSTALL-07 | Linguistic quality is operator judgement, not assertable | Operator reviews drafted PT-BR strings before review markers removed (D-13) |

---

## Validation Sign-Off

- [ ] All tasks have `<automated>` verify or Wave 0 dependencies
- [ ] Sampling continuity: no 3 consecutive tasks without automated verify
- [ ] Wave 0 covers all MISSING references
- [ ] No watch-mode flags
- [ ] Feedback latency < 15s
- [ ] `nyquist_compliant: true` set in frontmatter

**Approval:** pending
