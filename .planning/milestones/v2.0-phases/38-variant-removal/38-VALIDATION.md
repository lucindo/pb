---
phase: 38
slug: variant-removal
status: verified
nyquist_compliant: true
wave_0_complete: true
gaps_total: 1
gaps_resolved: 1
gaps_manual: 0
created: 2026-05-21
auditor: gsd-nyquist-auditor
---

# Phase 38 — Validation Strategy

> Per-phase validation contract — Nyquist coverage for the variant-removal deletion phase.

---

## Test Infrastructure

| Property | Value |
|----------|-------|
| **Framework** | vitest 4.1.5 |
| **Config file** | `vite.config.ts` (L63-66, `test:` block) |
| **Environment** | jsdom 29.1.1 (`@testing-library/react`, `@testing-library/jest-dom`) |
| **Setup file** | `vitest.setup.ts` |
| **Quick run command** | `npx vitest run <path>` |
| **Full suite command** | `npm run test:run` |
| **Estimated runtime** | ~6.5 s (full suite, 71 files, 1095 tests) |

---

## Sampling Rate

- **After every task commit:** Run targeted file with `npx vitest run <path>`
- **After every plan wave:** Run `npm run test:run`
- **Before `/gsd-verify-work`:** Full suite must be green
- **Max feedback latency:** ~7 s

---

## Per-Task Verification Map

| Plan / Task | Wave | Requirement | Threat Ref | Secure Behavior | Test Type | Automated Command | File Exists | Status |
|-------------|------|-------------|------------|-----------------|-----------|-------------------|-------------|--------|
| 38-01 (component/hook deletion) | 1 | VAR-01 | T-38-01 / T-38-05 | `SquareShape` / `useVisualVariant` / `useVariantChoice` cannot re-enter `src/components/`, `src/app/`, `src/content/`, `src/styles/` | drift-guard (token-scan) | `npx vitest run src/content/content.no-variants.test.ts` | ✅ | ✅ green |
| 38-01 (component/hook deletion) | 1 | VAR-02 | T-38-01 / T-38-03 | `DiamondShape` token absent; `NKShape` always emits `data-variant="orb"` literal | drift-guard + unit | `npx vitest run src/content/content.no-variants.test.ts src/components/NKShape.test.tsx` | ✅ | ✅ green |
| 38-02 (data layer + i18n) | 2 | VAR-03 | T-38-07 / T-38-08 | `VariantPicker`, `VisualVariantId`, `VARIANT_OPTIONS`, `DEFAULT_VARIANT`, `isValidVariant` tokens absent; strings catalogs have no `variants` / `variantLabel` key | drift-guard + unit | `npx vitest run src/content/content.no-variants.test.ts src/content/strings.test.ts` | ✅ | ✅ green |
| 38-03 (App.tsx state strip) | 3 | VAR-04 | T-38-09 / T-38-11 / T-38-12 | `sessionVariantRef`, `sessionVariant`, `liveVariant` tokens absent from App; App.test + App.session.test pass without variant fixtures | drift-guard + integration | `npx vitest run src/content/content.no-variants.test.ts src/app/App.test.tsx src/app/App.session.test.tsx` | ✅ | ✅ green |
| 38-02 (data layer) | 2 | VAR-05 (forward-compat) | T-38-06 / T-38-08 | Persisted legacy envelope `{theme, timbre, cue, locale, variant: 'square' \| 'diamond'}` is dropped to a clean 4-field `UserPrefs`; `coerceVariant` symbol absent; CSS `variant:'square'\|'diamond'` regex absent | unit + drift-guard | `npx vitest run src/storage/prefs.test.ts src/content/content.no-variants.test.ts` | ✅ | ✅ green (gap filled 2026-05-21 — see Audit Trail) |
| 38-04 (drift-guard) | 4 | VAR-06 | T-38-13 / T-38-15..T-38-19 | All 14 forbidden variant tokens absent from `src/components/`, `src/app/`, `src/content/`, `src/styles/`; sanity-floor protects against vacuous pass; `.test.ts` self-exclusion holds | meta-test (the drift-guard itself) | `npx vitest run src/content/content.no-variants.test.ts` | ✅ | ✅ green |

*Status: ⬜ pending · ✅ green · ❌ red · ⚠️ flaky*

---

## Wave 0 Requirements

Existing infrastructure covers all phase requirements. No new framework install needed:
- vitest 4.1.5 + jsdom 29.1.1 already in `devDependencies`
- The drift-guard test file `src/content/content.no-variants.test.ts` is the only NEW test file authored during Phase 38 (Plan 04); it covers VAR-01..06 at the absence-of-token level.

---

## Manual-Only Verifications

All phase behaviors have automated verification. No manual-only items.

---

## Validation Sign-Off

- [x] All requirements (VAR-01..06) have automated verify commands
- [x] Sampling continuity: every task commit landed alongside `tsc --noEmit` + targeted vitest pass (38-0{1..4}-SUMMARY §"Test Results")
- [x] Wave 0 N/A — existing infra covers
- [x] No watch-mode flags (`npm run test:run` is non-watch; `--reporter=dot` used for CI-equivalent local runs)
- [x] Feedback latency < 7 s (full suite 6.43 s observed 2026-05-21)
- [x] `nyquist_compliant: true` set in frontmatter

**Approval:** verified 2026-05-21

---

## Validation Audit 2026-05-21

| Metric | Count |
|--------|-------|
| Requirements total (VAR-01..06) | 6 |
| Initial coverage (pre-audit) | 5 COVERED, 1 PARTIAL (VAR-05) |
| Gaps found | 1 |
| Resolved | 1 (auditor authored 1 new `it()` block in `src/storage/prefs.test.ts` asserting legacy variant key is dropped from coerced output, with adversarial `toEqual` + `hasOwnProperty` + symmetric 'diamond' coverage) |
| Escalated | 0 |
| Manual-only | 0 |
| Drift-guard self-flag risk | 0 — `src/storage/` is outside the 4 scanned roots; `.test.ts` files also excluded by `collectFiles` |
| Type regressions | 0 (`tsc --noEmit` exit 0 post-edit) |
| Full-suite delta | 1093 → 1095 → 1095 + 1 = 1096 tests passing (prefs.test.ts: 23 → 24 = +1; drift-guard: 2 unchanged) |

**Outcome:** Phase 38 is Nyquist-compliant. All 6 requirements have automated verification under the standard `npm run test:run` invocation.

---

## Notes

**Why the drift-guard counts as Nyquist coverage for a pure deletion phase.**  
A deletion phase has no positive behavior to test (the code is gone). The Nyquist question becomes: *can a regression re-introduce the deleted code unnoticed?* The drift-guard answers that with a hard CI failure on any of the 14 forbidden tokens across the 4 production-code roots. Combined with the existing OrbShape rendering tests (NKShape.test.tsx + App.test.tsx + App.session.test.tsx — all preserved through the deletion sweeps), every VAR requirement has a sampling point that fails on regression at < 7 s latency.

**Why VAR-05 needed a direct test even with envelope tolerance proven structurally.**  
The existing per-field-fallback + prototype-pollution tests prove `coercePrefs` *only* reads known keys — a structural proof. But REQUIREMENTS.md VAR-05 makes a *behavioral* claim about a specific legacy envelope shape. A direct `it()` test:
1. Catches a spread-regression (`return { ...r, theme: ..., ... }`) that the structural tests miss
2. Pins the legacy envelope shape `{theme, timbre, cue, locale, variant: 'square'|'diamond'}` as the contract
3. Documents VAR-05 intent verbatim in a runnable artifact, not just prose
