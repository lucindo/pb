---
phase: 37
slug: stats-ui-removal
status: approved
nyquist_compliant: true
wave_0_complete: true
created: 2026-05-21
---

# Phase 37 — Validation Strategy

> Per-phase validation contract. Retroactive audit — all five STATS-01..05 requirements already have automated test coverage shipped by Plans 01–03 and the post-verification WR-01..03 hardening (commit a63dae3).

---

## Test Infrastructure

| Property | Value |
|----------|-------|
| **Framework** | Vitest 1.x (already installed; no Wave 0 required) |
| **Config file** | `vitest.config.ts` (project root) |
| **Quick run command** | `npx vitest run src/storage/practices.test.ts src/content/content.no-stats-ui.test.ts` |
| **Full suite command** | `npx vitest run` |
| **Estimated runtime** | ~7 seconds (full suite, 1204 tests across 76 files) |

---

## Sampling Rate

- **After every task commit:** Run quick command (STATS-04 envelope regression + STATS-05 drift-guard)
- **After every plan wave:** Run full suite
- **Before `/gsd-verify-work`:** Full suite must be green (confirmed at post-merge gate)
- **Max feedback latency:** 7 seconds (full suite)

---

## Per-Task Verification Map

| Req | Plan | Behavior | Test Type | Automated Command | File | Status |
|-----|------|----------|-----------|-------------------|------|--------|
| STATS-01 | 37-01 | `StatsFooter.tsx` is removed from the app shell | drift-guard token scan | `npx vitest run src/content/content.no-stats-ui.test.ts -t "drift-guard"` | `src/content/content.no-stats-ui.test.ts:101` (forbids `StatsFooter` literal token in components+app+content non-test files) | ✅ green |
| STATS-02 | 37-01 | `ResetStatsDialog.tsx` is removed from the app shell | drift-guard token scan | `npx vitest run src/content/content.no-stats-ui.test.ts -t "drift-guard"` | `src/content/content.no-stats-ui.test.ts:101` (forbids `ResetStatsDialog` literal token) | ✅ green |
| STATS-03 | 37-01, 37-02 | "Reset stats" affordance removed from Practice Settings; storage-layer `resetPracticeStats` deleted | drift-guard + type system absence | `npx vitest run src/content/content.no-stats-ui.test.ts -t "drift-guard"` + `npm run build` (tsc -b — any consumer of removed export fails compile) | `src/content/content.no-stats-ui.test.ts` (UI) + `src/storage/practices.ts` (export list — `resetPracticeStats` absent) | ✅ green |
| STATS-04 | 37-02 | `recordSession()` continues to compute + persist stats to `localStorage`; envelope round-trip is lossless and `STATE_VERSION` unchanged | unit regression | `npx vitest run src/storage/practices.test.ts -t "STATS-04"` | `src/storage/practices.test.ts:485` — `describe('STATS-04 record-and-persist regression (CONTEXT D-05 / D-08)')` with 3 it-cases (resonant / stretch / naviKriya) | ✅ green (3/3) |
| STATS-05 | 37-03 (+ a63dae3 hardening) | No "12 MIN TODAY · STREAK 5d" or equivalent stat surface anywhere in Idle, Running, Complete, Learn, App Settings | invariant drift-guard | `npx vitest run src/content/content.no-stats-ui.test.ts` | `src/content/content.no-stats-ui.test.ts:101` — 6 forbidden tokens (`StatsFooter`, `ResetStatsDialog`, `/MIN TODAY/i`, `/STREAK/i`, `/TOTAL TIME/i`, `/\bSESSIONS\b/`) scanned across `src/components/`, `src/app/`, `src/content/`; plus `SCAN_FILES.length > 10` sanity assertion guarding against vacuous pass | ✅ green (2/2) |

*Status: ⬜ pending · ✅ green · ❌ red · ⚠️ flaky*

---

## Wave 0 Requirements

*None.* Existing Vitest infrastructure covers all phase requirements. Phase 37 is a pure deletion + tests-only phase; no new tooling, frameworks, or fixtures introduced.

---

## Manual-Only Verifications

*None.* All five STATS requirements have automated verification via Vitest. The drift-guard (STATS-05) is invariant — any future regression that re-introduces a forbidden stats-UI token across the three scanned roots fails the suite immediately.

---

## Validation Sign-Off

- [x] All STATS-01..05 requirements have automated verify commands
- [x] Sampling continuity: STATS-04 + STATS-05 both run in <1 second; usable as per-commit gate
- [x] No Wave 0 dependencies missing
- [x] No watch-mode flags (all commands use `vitest run`)
- [x] Feedback latency 7s (full suite) / <1s (STATS-specific tests)
- [x] `nyquist_compliant: true` set in frontmatter

**Approval:** approved 2026-05-21 — retroactive audit confirmed all requirements covered by shipped tests; zero gaps to fill, no auditor agent dispatch required.

## Validation Audit 2026-05-21

| Metric | Count |
|--------|-------|
| Requirements audited | 5 (STATS-01, STATS-02, STATS-03, STATS-04, STATS-05) |
| COVERED | 5 |
| PARTIAL | 0 |
| MISSING | 0 |
| Manual-only escalations | 0 |
