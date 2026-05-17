---
phase: 32
slug: learn-localization
status: draft
nyquist_compliant: false
wave_0_complete: false
created: 2026-05-17
---

# Phase 32 — Validation Strategy

> Per-phase validation contract for feedback sampling during execution.

---

## Test Infrastructure

| Property | Value |
|----------|-------|
| **Framework** | vitest |
| **Config file** | existing — no Wave 0 install needed |
| **Quick run command** | `npx vitest run src/content src/components/LearnDialog.test.tsx` |
| **Full suite command** | `npx vitest run` |
| **Estimated runtime** | ~30 seconds |

---

## Sampling Rate

- **After every task commit:** Run `npx vitest run src/content src/components/LearnDialog.test.tsx`
- **After every plan wave:** Run `npx vitest run`
- **Before `/gsd-verify-work`:** Full suite must be green
- **Max feedback latency:** 30 seconds

---

## Per-Task Verification Map

| Task ID | Plan | Wave | Requirement | Threat Ref | Secure Behavior | Test Type | Automated Command | File Exists | Status |
|---------|------|------|-------------|------------|-----------------|-----------|-------------------|-------------|--------|
| TBD | TBD | TBD | LEARN-02 / LEARN-03 / I18N-08 | — | N/A | unit | `npx vitest run` | ✅ existing | ⬜ pending |

*Status: ⬜ pending · ✅ green · ❌ red · ⚠️ flaky*

*Filled in by the planner — every task touching `learnContent.ts`, `LearnDialog.tsx`, or `strings.ts` maps to a vitest assertion in the corresponding `.test.ts` / `.test.tsx` file.*

---

## Wave 0 Requirements

*Existing infrastructure covers all phase requirements — vitest is configured, and `learnContent.test.ts`, `LearnDialog.test.tsx`, `strings.test.ts`, and `content.no-review-markers.test.ts` already exist.*

---

## Manual-Only Verifications

| Behavior | Requirement | Why Manual | Test Instructions |
|----------|-------------|------------|-------------------|
| PT-BR copy is native-quality | I18N-08 | Translation quality cannot be asserted by code — needs operator review | Operator reviews the 31 draft strings + 5 new `learn.*` keys for native-quality PT-BR; review markers removed only after sign-off |

---

## Validation Sign-Off

- [ ] All tasks have `<automated>` verify or Wave 0 dependencies
- [ ] Sampling continuity: no 3 consecutive tasks without automated verify
- [ ] Wave 0 covers all MISSING references
- [ ] No watch-mode flags
- [ ] Feedback latency < 30s
- [ ] `nyquist_compliant: true` set in frontmatter

**Approval:** pending
