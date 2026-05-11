---
phase: 7
slug: strict-type-lint-baseline
status: draft
nyquist_compliant: false
wave_0_complete: false
created: 2026-05-11
---

# Phase 7 — Validation Strategy

> Per-phase validation contract for feedback sampling during execution.

---

## Test Infrastructure

| Property | Value |
|----------|-------|
| **Framework** | vitest |
| **Config file** | `vitest.config.ts` (+ `vitest.setup.ts`) |
| **Quick run command** | `npm run test -- --run` |
| **Full suite command** | `npm run test -- --run && npm run lint && npm run build` |
| **Estimated runtime** | ~30s (vitest) + ~10s (lint) + ~15s (build) ≈ 55s |

---

## Sampling Rate

- **After every task commit:** Run `npm run test -- --run` AND `npx tsc --noEmit` AND `npm run lint`
- **After every plan wave:** Run full suite (`npm run test -- --run && npm run lint && npm run build`)
- **Before `/gsd-verify-work`:** Full suite green; Vitest pass count must equal 363/363
- **Max feedback latency:** ~55 seconds

Per D-09 the commit-boundary invariant is: tsc clean + lint clean + build clean + 363/363 vitest. A commit that violates any of these is rolled back, NOT patched-forward.

---

## Per-Task Verification Map

| Task ID | Plan | Wave | Requirement | Threat Ref | Secure Behavior | Test Type | Automated Command | File Exists | Status |
|---------|------|------|-------------|------------|-----------------|-----------|-------------------|-------------|--------|
| 7-01-* | 01 (tsconfig) | 1 | BUILD-01 | — | strict TS compile passes; behavior unchanged | compile + test | `npx tsc --noEmit && npm run test -- --run` | ✅ | ⬜ pending |
| 7-02-* | 02 (eslint preset) | 2 | BUILD-02 | — | strictTypeChecked lint passes; behavior unchanged | lint + test | `npm run lint && npm run test -- --run` | ✅ | ⬜ pending |
| 7-03-* | 03 (hooks audit) | 2 | BUILD-03 | — | exhaustive-deps at error; disables annotated; behavior unchanged | lint + test | `npm run lint && npm run test -- --run` | ✅ | ⬜ pending |

*Status: ⬜ pending · ✅ green · ❌ red · ⚠️ flaky*

*Plan IDs and wave assignments above are the planner's expected shape (per RESEARCH.md D-11 split recommendation: 226 ESLint errors > 100 threshold). Final IDs are locked when PLAN.md files are written and this table is regenerated.*

---

## Wave 0 Requirements

- [ ] None — vitest, eslint, tsc, vite-build infrastructure all already in place. No test scaffolding needed for Phase 7 (this phase adds NO behavioral tests; it tightens existing oracles).

*Existing infrastructure covers all phase requirements.*

---

## Manual-Only Verifications

| Behavior | Requirement | Why Manual | Test Instructions |
|----------|-------------|------------|-------------------|
| Surfaced bug pattern triage | D-08 | If strict reveals a real bug, planner/executor MUST decide: (a) behavior-preserving narrowing only in Phase 7, (b) log bug under owning later phase REQ. Triage is judgment, not automated. | When a strict-mode error suggests a runtime bug (not just a typing gap), file a one-line note under the owning phase's CONTEXT.md `## Open Bugs` and apply the smallest narrowing in Phase 7 that mirrors today's behavior. |
| Justification text quality on `// Reason:` annotations | D-04 | Annotation REQUIRES naming the invariant being protected. A linter cannot judge whether prose names a real invariant. | Code-review every surviving `eslint-disable` with its `// Reason:` line; reject any reason that is generic ("intentional", "needed", "by design") without naming the invariant. |

---

## Validation Sign-Off

- [ ] Every plan task has either an automated verify command or a Wave 0 dependency
- [ ] Sampling continuity: no 3 consecutive tasks without automated verify (commit boundary itself runs the trio of tsc/lint/test)
- [ ] No watch-mode flags (`--run` enforced for vitest)
- [ ] Feedback latency < 60s
- [ ] `nyquist_compliant: true` set in frontmatter once plan-checker confirms each task carries an oracle

**Approval:** pending
