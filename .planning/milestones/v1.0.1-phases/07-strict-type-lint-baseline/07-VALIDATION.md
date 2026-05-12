---
phase: 7
slug: strict-type-lint-baseline
status: verified
nyquist_compliant: true
wave_0_complete: true
created: 2026-05-11
updated: 2026-05-11
audited: 2026-05-11
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

- **After every task commit:** Run `npm run test -- --run` AND `npx tsc --noEmit -p tsconfig.app.json` AND `npx tsc --noEmit -p tsconfig.node.json` AND `npm run lint`
- **After every plan wave:** Run full suite (`npm run test -- --run && npm run lint && npm run build`)
- **Before `/gsd-verify-work`:** Full suite green; Vitest pass count must equal 363/363; `npm run lint` exit 0
- **Max feedback latency:** ~55 seconds

Per D-09 the commit-boundary invariant is: tsc clean + lint clean + build clean + 363/363 vitest. A commit that violates any of these is rolled back, NOT patched-forward.

**Phased D-09 lint-exit-0 application** (per 07-01-PLAN.md `<d09_scope_note>`): The `npm run lint` exit-0 invariant becomes binding from the Plan 07-02 Task 1 commit (the strictTypeChecked + projectService landing) onward. The FIRST commit at which `npm run lint` exits 0 across ALL files is Plan 07-03 Task 2 (the test-file fix pass that drives the 162 test errors to zero). Plan 07-01 tasks gate on lint-count-not-increased (226 baseline). Plan 07-02 tasks gate on lint-count-strictly-decreasing (no new regressions). Plans 07-03 and 07-04 gate on lint-exits-0 at every task commit.

---

## Per-Task Verification Map

| Task ID | Plan | Wave | Requirement | Threat Ref | Secure Behavior | Test Type | Automated Command | File Exists | Status |
|---------|------|------|-------------|------------|-----------------|-----------|-------------------|-------------|--------|
| 7-01-T1 | 01 (tsconfig strict) | 1 | BUILD-01 | T-07-01-01 | Strict tsconfig flags landed; tsc still passes (errors only in 4 test files); no production regression | compile + JSON-shape audit | `npx tsc --noEmit -p tsconfig.node.json 2>&1 \| { grep -c "error TS" \|\| echo 0; } \| grep -qx 0 && node -e "..."` (full command in 07-01 Task 1 verify block — JSON-reads both tsconfigs, asserts the four flags) | ✅ | ✅ green |
| 7-01-T2 | 01 (tsconfig strict) | 1 | BUILD-01 | T-07-01-01 | All 12 strict-surfaced TS errors in 4 test files eliminated by inline narrowing (Option A/B/C); no behavior change | compile + build + test | `npx tsc --noEmit -p tsconfig.app.json && npx tsc --noEmit -p tsconfig.node.json && npm run build && npm run test -- --run 2>&1 \| tail -5 \| grep -E "363 passed"` | ✅ | ✅ green |
| 7-02-T1 | 02 (eslint preset upgrade) | 2 | BUILD-02 | T-07-02-01 | strictTypeChecked + projectService active; lint surfaces ~226 errors as a clean baseline; type-aware rules confirmed firing | grep + lint-fires + tsc | `npx tsc --noEmit -p tsconfig.app.json && npx tsc --noEmit -p tsconfig.node.json && node -e "..." && npm run lint 2>&1 \| grep -qE "(unbound-method\|restrict-template-expressions\|no-floating-promises)"` | ✅ | ✅ green |
| 7-02-T2 | 02 (unbound-method) | 2 | BUILD-02 | T-07-02-01 | All 24 unbound-method errors eliminated by `this: void` on 11 interfaces; no implementation change | lint-grep + tsc + test | `npm run lint 2>&1 \| { grep -c "unbound-method" \|\| echo 0; } \| grep -qx 0 && npx tsc --noEmit -p tsconfig.app.json && npm run test -- --run 2>&1 \| tail -5 \| grep -E "363 passed"` | ✅ | ✅ green |
| 7-02-T3 | 02 (string/JSX hygiene) | 2 | BUILD-02 | T-07-02-01 | All 16 restrict-template-expressions + 6 no-confusing-void-expression + 2 no-misused-promises errors eliminated by inline String()/.toFixed() / brace bodies / void wrappers; CSS visual output preserved (363/363 tests pass) | lint-grep + tsc + build + test | `npm run lint 2>&1 \| { grep -cE "(restrict-template-expressions\|no-confusing-void-expression\|no-misused-promises)" \|\| echo 0; } \| grep -qx 0 && npx tsc --noEmit -p tsconfig.app.json && npm run build && npm run test -- --run 2>&1 \| tail -5 \| grep -E "363 passed"` | ✅ | ✅ green |
| 7-03-T1 | 03 (production singletons + App.tsx:411 stale removal) | 3 | BUILD-02 | T-07-03-01 | All 16 isolated production rule fires fixed inline (no-unnecessary-condition × 6 incl. usePrefersReducedMotion typeof-window removal × 2; no-unnecessary-type-assertion × 5 incl. WebKit casts kept-and-annotated; no-non-null-assertion × 1 main.tsx; no-useless-assignment × 1 useAudioCues; exhaustive-deps × 1 App.tsx audio dep); App.tsx:411 stale react-hooks/set-state-in-effect disable removed; lines 205 + 390 untouched for Plan 04 | lint-grep + tsc + build + test + App.tsx-counter | `npm run lint 2>&1 \| grep -E "(no-unnecessary-condition\|no-unnecessary-type-assertion\|no-non-null-assertion\|no-useless-assignment\|exhaustive-deps)" \| grep -v "\.test\." \| grep -v "vitest.setup" \| wc -l \| tr -d ' ' \| grep -qx 0 && npx tsc --noEmit -p tsconfig.app.json && npm run build && npm run test -- --run 2>&1 \| tail -5 \| grep -E "363 passed" && node -e "..."` (App.tsx assertion: exactly 2 set-state-in-effect occurrences post-task) | ✅ | ✅ green |
| 7-03-T2 | 03 (test-file pass — full lint exit 0) | 3 | BUILD-02 | T-07-03-01 | All ~162 test-file ESLint errors eliminated by 5 inline-fix passes (typed JSON.parse helpers + toMatchObject; annotated non-null assertions; annotated no-extraneous-class on FakeAudioContext variants; annotated require-await on suspend/close in vitest.setup.ts; resume left untouched). FIRST commit at which `npm run lint` exits 0 in Phase 7. App.tsx untouched in this task. | lint-exit-0 + tsc + build + test | `npm run lint 2>&1 \| tail -3 \| grep -E "(0 problems\|^$)" \|\| (npm run lint; false) && npx tsc --noEmit -p tsconfig.app.json && npx tsc --noEmit -p tsconfig.node.json && npm run build && npm run test -- --run 2>&1 \| tail -5 \| grep -E "363 passed"` | ✅ | ✅ green |
| 7-04-T1 | 04 (hooks audit — exhaustive-deps error override) | 4 | BUILD-03 | T-07-04-01 | eslint.config.js carries explicit `react-hooks/exhaustive-deps: 'error'` override after the recommended.rules spread; resolved severity verified via `--print-config`; lint stays at 0 (Plan 03 already fixed the single exhaustive-deps fire) | rule-resolution + lint-exit-0 + tsc + build + test | `node -e "..." (regex over eslint.config.js for the new override) && npx eslint --print-config src/app/App.tsx > /tmp/eslint-resolved-config.json 2>/dev/null && node -e "..." (asserts severity = error or 2) && npm run lint && npx tsc --noEmit -p tsconfig.app.json && npx tsc --noEmit -p tsconfig.node.json && npm run build && npm run test -- --run` | ✅ | ✅ green |
| 7-04-T2 | 04 (D-04 // Reason: annotations on surviving react-hooks disables) | 4 | BUILD-03 | T-07-04-01 | App.tsx:205 and App.tsx:390 each preceded by their // Reason: annotation lines; usePrefersReducedMotion.ts setReduced(mql.matches) site preceded by a NEW // Reason: + // eslint-disable-next-line react-hooks/set-state-in-effect pair; full D-04 audit complete (every react-hooks disable in src/ has a // Reason: line on the immediately preceding line); count of set-state-in-effect occurrences in App.tsx remains 2 (Plan 03 left it at 2, Plan 04 only adds // Reason: comments — no new disables in App.tsx); count of set-state-in-effect occurrences in usePrefersReducedMotion.ts is 1 (the new annotated disable) | lint-exit-0 + tsc + build + test + node-D04-audit-script | `npm run lint && npx tsc --noEmit -p tsconfig.app.json && npx tsc --noEmit -p tsconfig.node.json && npm run build && npm run test -- --run 2>&1 \| tail -5 \| grep -E "363 passed" && node -e "..."` (D-04 audit: scans App.tsx + usePrefersReducedMotion.ts and reports any react-hooks disable NOT preceded by // Reason: — must report 0 issues) | ✅ | ✅ green |

*Status: ✅ green · ✅ green · ❌ red · ⚠️ flaky*

*Plan IDs and wave assignments above reflect the FINAL 4-plan / 4-wave shape (post-revision split of original 07-02 into new 07-02 + new 07-03; original hooks-audit plan moved to 07-04). Waves are strictly serial (07-01 → 07-02 → 07-03 → 07-04) because of file-overlap on App.tsx (Plans 02, 03, 04 each touch it for distinct concerns) and on eslint.config.js (Plans 02 and 04). Same-wave parallelism is NOT possible for this phase given the file-overlap constraints documented in 07-RESEARCH.md and per-plan files_modified frontmatter.*

---

## Wave 0 Requirements

- [x] None — vitest, eslint, tsc, vite-build infrastructure all already in place. No test scaffolding needed for Phase 7 (this phase adds NO behavioral tests; it tightens existing oracles).

*Existing infrastructure covers all phase requirements. wave_0_complete = true (declared not needed; no scaffolding work to perform).*

---

## Manual-Only Verifications

| Behavior | Requirement | Why Manual | Test Instructions |
|----------|-------------|------------|-------------------|
| Surfaced bug pattern triage | D-08 | If strict reveals a real bug, planner/executor MUST decide: (a) behavior-preserving narrowing only in Phase 7, (b) log bug under owning later phase REQ. Triage is judgment, not automated. | When a strict-mode error suggests a runtime bug (not just a typing gap), file a one-line note under the owning phase's CONTEXT.md `## Open Bugs` and apply the smallest narrowing in Phase 7 that mirrors today's behavior. |
| Justification text quality on `// Reason:` annotations | D-04 | Annotation REQUIRES naming the invariant being protected. A linter cannot judge whether prose names a real invariant. | Code-review every surviving `eslint-disable` with its `// Reason:` line; reject any reason that is generic ("intentional", "needed", "by design") without naming the invariant. |

---

## Validation Sign-Off

- [x] Every plan task has either an automated verify command or a Wave 0 dependency (verified: all 9 tasks across 4 plans carry `<verify><automated>...</automated></verify>` blocks; Wave 0 declared not needed)
- [x] Sampling continuity: no 3 consecutive tasks without automated verify (every task verifies; commit boundary itself runs the trio of tsc/lint/test per the per-task-commit sampling rate above)
- [x] No watch-mode flags (`--run` enforced for vitest in every task verify command)
- [x] Feedback latency < 60s (estimated 55s per the Test Infrastructure table)

**Approval:** signed-off (post plan-checker pass; nyquist_compliant + wave_0_complete + sign-off rows all updated to reflect the final 4-plan / 4-wave shape).

---

## Validation Audit 2026-05-11

| Metric | Count |
|--------|-------|
| Gaps found | 0 |
| Resolved | 0 |
| Escalated | 0 |

### Audit Evidence

| Gate | Command | Result |
|------|---------|--------|
| TypeScript (app) | `npx tsc --noEmit -p tsconfig.app.json` | exit 0 |
| TypeScript (node) | `npx tsc --noEmit -p tsconfig.node.json` | exit 0 |
| ESLint | `npm run lint` | exit 0, 0 problems |
| Build | `npm run build` | exit 0, 228.36 kB bundle |
| Vitest | `npm run test -- --run` | 363/363 passed (27 test files) |

All 9 task-level automated verify commands evaluated against the post-execution codebase. Every gate green. nyquist_compliant remains `true`; status promoted from `ready` → `verified`.

</content>
</invoke>