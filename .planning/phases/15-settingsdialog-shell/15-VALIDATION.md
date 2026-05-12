---
phase: 15
slug: settingsdialog-shell
status: draft
nyquist_compliant: false
wave_0_complete: false
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
| TBD     | TBD  | TBD  | INFRA-04    | —          | N/A             | TBD       | TBD               | ❌ W0       | ⬜ pending |

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

- [ ] All tasks have `<automated>` verify or Wave 0 dependencies
- [ ] Sampling continuity: no 3 consecutive tasks without automated verify
- [ ] Wave 0 covers all MISSING references (N/A — none)
- [ ] No watch-mode flags (`test:run` not `test`)
- [ ] Feedback latency < 10s (quick) / 30s (full gate)
- [ ] `nyquist_compliant: true` set in frontmatter

**Approval:** pending
