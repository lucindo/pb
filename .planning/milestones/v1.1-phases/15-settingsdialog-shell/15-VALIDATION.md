---
phase: 15
slug: settingsdialog-shell
status: ready
nyquist_compliant: true
wave_0_complete: true
created: 2026-05-12
---

# Phase 15 — Validation Strategy

> Per-phase validation contract for feedback sampling during execution.

---

## Test Infrastructure

| Property | Value |
|----------|-------|
| **Framework** | vitest 1.x + @testing-library/react |
| **Config file** | `vitest.config.ts` + `vitest.setup.ts` (HTMLDialogElement polyfill at lines 87-114) |
| **Quick run command** | `npx vitest run <file>` |
| **Full suite command** | `npm run test:run` |
| **Estimated runtime** | ~7.4s (438-test baseline at HEAD) |

---

## Sampling Rate

- **After every task commit:** Run `npx vitest run <changed-files>`
- **After every plan wave:** Run `npm run test:run`
- **Before `/gsd-verify-work`:** Full green-gate must pass — `npx tsc --noEmit && npm run lint && npm run build && npm run test:run`
- **Max feedback latency:** ~10s (test:run) / ~30s (full green-gate)

---

## Per-Task Verification Map

> Populated by planner. Each task in PLAN.md MUST map to a row here via Task ID.

| Task ID | Plan | Wave | Requirement | Threat Ref | Secure Behavior | Test Type | Automated Command | File Exists | Status |
|---------|------|------|-------------|------------|-----------------|-----------|-------------------|-------------|--------|
| 15-01-01 | 01 | 1 | INFRA-04 | — | N/A | unit | `npx tsc --noEmit && npx eslint src/components/SettingsAnchor.tsx` | ✅ | ⬜ pending |
| 15-01-02 | 01 | 1 | INFRA-04 | — | N/A | unit | `npx vitest run src/components/SettingsAnchor.test.tsx` | ✅ | ⬜ pending |
| 15-02-01 | 02 | 1 | INFRA-04 | — | N/A | unit | `npx vitest run src/components/ThemePicker.test.tsx` | ✅ | ⬜ pending |
| 15-02-02 | 02 | 1 | INFRA-04 | — | N/A | unit | `npx vitest run src/components/VariantPicker.test.tsx` | ✅ | ⬜ pending |
| 15-02-03 | 02 | 1 | INFRA-04 | — | N/A | unit | `npx vitest run src/components/TimbrePicker.test.tsx` | ✅ | ⬜ pending |
| 15-02-04 | 02 | 1 | INFRA-04 | — | N/A | unit | `npx vitest run src/components/LanguagePicker.test.tsx` | ✅ | ⬜ pending |
| 15-03-01 | 03 | 2 | INFRA-04 | — | N/A | unit | `npx tsc --noEmit && npx eslint src/components/SettingsDialog.tsx` | ✅ | ⬜ pending |
| 15-03-02 | 03 | 2 | INFRA-04 | — | N/A | unit | `npx vitest run src/components/SettingsDialog.test.tsx` | ✅ | ⬜ pending |
| 15-04-01 | 04 | 3 | INFRA-04 | — | N/A | integration | `npx tsc --noEmit && npx eslint src/app/App.tsx && npm run build && npm run test:run` | ✅ | ⬜ pending |
| 15-04-02 | 04 | 3 | INFRA-04 | — | N/A | docs | `grep -c "\| INFRA-04 \| Phase 15 \| Done \|" .planning/REQUIREMENTS.md && test -f .planning/phases/15-settingsdialog-shell/15-SUMMARY.md && npm run test:run` | ✅ | ⬜ pending |

*Status: ⬜ pending · ✅ green · ❌ red · ⚠️ flaky*

---

## Wave 0 Requirements

- [ ] None — existing test infrastructure (vitest + RTL + HTMLDialogElement polyfill at vitest.setup.ts:87-114) covers all Phase 15 requirements.

*Phase 15 adds new `*.test.tsx` files but introduces no new framework, no new setup, no new fixtures.*

---

## Manual-Only Verifications

| Behavior | Requirement | Why Manual | Test Instructions |
|----------|-------------|------------|-------------------|
| Native `<dialog>` focus return to trigger on close | INFRA-04 (SC2 partial) | JSDOM polyfill at vitest.setup.ts:87-114 does not implement focus-trap or focus-return — only sets `open` property. Test files should comment this acknowledgement. | Real-browser smoke: open dialog via gear → press Esc → assert keyboard focus returns to `SettingsAnchor`. Repeat with backdrop click + Close button. |
| Native `<dialog>` focus-trap (Tab cycle stays inside) | INFRA-04 (SC2 partial) | Same JSDOM limitation. | Real-browser smoke: open dialog → press Tab repeatedly → assert focus cycles inside dialog, never leaves. |
| Gear icon visual rendering (SVG path correctness) | INFRA-04 (SC1 visual) | SVG path is hand-coded; visual correctness is human-judged. | Real-browser smoke: render idle view → assert gear icon visible at top-left of breathing column, mirrors LearnAnchor (top-right) visually. |

---

## Validation Sign-Off

- [x] All tasks have `<automated>` verify or Wave 0 dependencies
- [x] Sampling continuity: no 3 consecutive tasks without automated verify
- [x] Wave 0 covers all MISSING references (N/A — none)
- [x] No watch-mode flags (`test:run` not `test`)
- [x] Feedback latency < 10s (quick) / 30s (full gate)
- [x] `nyquist_compliant: true` set in frontmatter

**Approval:** approved 2026-05-12 (post plan-checker VERIFICATION PASSED)
