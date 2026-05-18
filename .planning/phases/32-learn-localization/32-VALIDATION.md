---
phase: 32
slug: learn-localization
status: validated
nyquist_compliant: true
wave_0_complete: true
created: 2026-05-17
validated: 2026-05-17
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
| T1 | 01 | 1 | LEARN-02 / LEARN-03 / I18N-08 | T-32-01, T-32-02 | Static authored video URLs — no user input | unit | `npx vitest run src/content/learnContent.test.ts` | ✅ existing | ✅ green |
| T2 | 01 | 1 | LEARN-02 / I18N-08 | — | N/A | unit | `npx vitest run src/content/strings.test.ts src/content/learnContent.test.ts` | ✅ existing | ✅ green |
| T3 | 01 | 1 | LEARN-02 | — | N/A | checkpoint:human-verify | — | manual | ⬜ manual-only (operator approved) |
| T1 | 02 | 2 | LEARN-02 / LEARN-03 | T-32-03, T-32-04 | Every `<a>` carries `target="_blank" rel="noopener noreferrer"` | unit | `npx vitest run src/components/LearnDialog.test.tsx` | ✅ existing | ✅ green |
| T2 | 02 | 2 | LEARN-02 / LEARN-03 | T-32-03, T-32-04 | Parameterized security-attribute sweep for `activePractice='naviKriya'` | unit | `npx vitest run src/components/LearnDialog.test.tsx` | ✅ existing | ✅ green |
| T1 | 03 | 3 | I18N-08 | — | N/A | checkpoint:human-verify | — | manual | ⬜ manual-only (operator approved) |
| T2 | 03 | 3 | I18N-08 | T-32-06 | Drift-guard fails if any review marker survives marker removal | unit | `npx vitest run src/content/content.no-review-markers.test.ts` | ✅ existing | ✅ green |
| T3 | 03 | 3 | I18N-08 | — | N/A | suite+build | `npx vitest run && npm run build` | ✅ existing | ✅ green |

*Status: ⬜ pending · ✅ green · ❌ red · ⚠️ flaky*

*Coverage confirmed by audit on 2026-05-17: `npx vitest run src/content src/components/LearnDialog.test.tsx` → 5 files / 120 tests passed. Every task touching `learnContent.ts`, `LearnDialog.tsx`, or `strings.ts` maps to a vitest assertion in the corresponding `.test.ts` / `.test.tsx` file. The two `checkpoint:human-verify` tasks (01-T3, 03-T1) are manual by design — see Manual-Only table.*

---

## Wave 0 Requirements

*Existing infrastructure covers all phase requirements — vitest is configured, and `learnContent.test.ts`, `LearnDialog.test.tsx`, `strings.test.ts`, and `content.no-review-markers.test.ts` already exist.*

---

## Manual-Only Verifications

| Behavior | Requirement | Why Manual | Test Instructions |
|----------|-------------|------------|-------------------|
| EN Navi Kriya description copy is claim-safe and accurate | LEARN-02 | Editorial/non-medical-claim quality cannot be asserted by code — needs operator review | Operator (Plan 01 Task 3 checkpoint) reviews and locks the two EN NK description sections. ✅ Approved — copy locked with no wording changes (32-01-SUMMARY). |
| PT-BR copy is native-quality | I18N-08 | Translation quality cannot be asserted by code — needs operator review | Operator (Plan 03 Task 1 checkpoint) reviews all 38 v1.5 PT-BR strings for native quality; review markers removed only after sign-off. ✅ Approved — 35 as-is + 3 corrections applied, all 7 drift markers removed (32-03-SUMMARY). |

---

## Validation Sign-Off

- [x] All tasks have `<automated>` verify or Wave 0 dependencies
- [x] Sampling continuity: no 3 consecutive tasks without automated verify
- [x] Wave 0 covers all MISSING references (no Wave 0 needed — existing infra)
- [x] No watch-mode flags
- [x] Feedback latency < 30s
- [x] `nyquist_compliant: true` set in frontmatter

**Approval:** validated 2026-05-17

---

## Validation Audit 2026-05-17

| Metric | Count |
|--------|-------|
| Gaps found | 0 |
| Resolved | 0 |
| Escalated | 0 |

All 8 tasks across 3 plans audited. Six automated tasks are COVERED green (120 tests passing across `learnContent.test.ts`, `strings.test.ts`, `LearnDialog.test.tsx`, `content.no-review-markers.test.ts`, `lockedCopy.test.ts`). Two `checkpoint:human-verify` tasks (01-T3 EN copy review, 03-T1 PT-BR review) are manual-only by design and both operator-approved during execution. No test files generated — existing infrastructure already covers all automatable phase requirements.
