---
phase: 38
slug: variant-removal
status: verified
threats_open: 0
threats_total: 19
threats_closed: 19
asvs_level: 1
block_on: high
created: 2026-05-21
auditor: gsd-security-auditor
---

# Phase 38 — variant-removal Security Audit

**Phase:** 38 — variant-removal (HRV Breathing WebApp)
**Threats Closed:** 19/19
**ASVS Level:** 1
**Block-on:** high
**Auditor:** gsd-security-auditor
**Audit Date:** 2026-05-21
**Commit Range:** 3a93663..HEAD (Phase 38 commits: 8e81224, 83bd3cb, 85b2ef1, f5b4f57, 0a92cce, 36628f0, f3b0196, 7ee2b70, 4699fde, 5b92f5c plus doc commits)

## Phase Summary

Pure deletion phase — closes the variant axis (Square/Diamond shapes and all supporting scaffolding) so OrbShape is the sole rendered shape. No new attack surface. Register authored at plan time; 19 threats. All threats verified CLOSED.

## Threat Verification — Plan 01 (component / hook deletion)

| Threat ID | Category | Disposition | Evidence |
|-----------|----------|-------------|----------|
| T-38-01 | T (future regression — deleted surface) | mitigate | VAR-06 drift-guard at `src/content/content.no-variants.test.ts` lines 74-83 includes literal `t.includes('SquareShape' / 'DiamondShape' / 'VariantPicker' / 'useVisualVariant' / 'useVariantChoice')`; scans `src/components`, `src/app`, `src/content`, `src/styles` (lines 56-67). Test passes (2/2). |
| T-38-02 | I (orphan WHY comment) | mitigate | `grep -nE "SquareShape\|DiamondShape" src/components/shapeConstants.ts` → 0 results. Verified clean. |
| T-38-03 | D (NKShape broken render) | mitigate | `src/components/NKShape.tsx` L9 comment "Phase 38 (VAR-01/VAR-02): shape variants removed; NKShape always renders OrbShape"; L83 emits literal `data-variant="orb"`. NKShape.test.tsx L26-28 still asserts the wrapper attribute. `grep -E "variant" src/components/NKShape.tsx` returns only the literal `data-variant="orb"` + the Phase 38 prose comment. |
| T-38-04 | E (n/a — auth surface) | n/a | Deletion phase, no auth surface introduced. |
| T-38-05 | I (App.tsx orphan import) | mitigate | `grep -nE "BreathingShape\|useVisualVariant\|useVariantChoice\|VariantPicker\|SquareShape\|DiamondShape" src/app/App.tsx` → 0 results. `npx vitest run src/content/content.no-variants.test.ts` passes; phase SUMMARY records `npx tsc --noEmit` exits 0. |

## Threat Verification — Plan 02 (data layer + i18n)

| Threat ID | Category | Disposition | Evidence |
|-----------|----------|-------------|----------|
| T-38-06 | T (persisted-data compat) | accept | `src/storage/prefs.ts` UserPrefs at L24-29 has 4 fields exactly (theme, timbre, cue, locale); `coercePrefs` at L59-71 reads only `r.theme / r.timbre / r.cue / r.locale` — `r.variant` never read. L60 comment confirms "we only read four known keys ... raw is never spread". STATE_VERSION untouched (Plan 04 SUMMARY confirms `git diff main -- src/storage/storage.ts | grep STATE_VERSION` returns 0). Render path is OrbShape only (Plan 01). Accepted-risk rationale (Phase 8 D-01 envelope tolerance + OrbShape-only render) is documented in CONTEXT D-01 and 38-02-SUMMARY.md §"Phase 8 D-01 Envelope Tolerance". |
| T-38-07 | I (orphan i18n catalog) | mitigate | `grep -nE "variants\|variantLabel" src/content/strings.ts` → 0 results. VAR-06 drift-guard `/variant:\s*['"]square['"]/` and `/variant:\s*['"]diamond['"]/` regex (lines 86-92) lock the absence. |
| T-38-08 | T (orphan coercer) | mitigate | `grep -nE "VisualVariantId\|VARIANT_OPTIONS\|isValidVariant\|DEFAULT_VARIANT\|coerceVariant" src/domain/settings.ts src/storage/prefs.ts` → 0 results. Single-commit deletion (commit 83bd3cb) covered all 5 sites: 3 imports + UserPrefs field + DEFAULT_PREFS field + standalone function + coercePrefs return. `tsc --noEmit` exits 0 (38-02-SUMMARY). |
| T-38-09 | D (mid-plan broken test) | mitigate | `grep -nE "VARIANT-03\|VARIANT-02\|seedVariant\|VisualVariantId" src/app/App.session.test.tsx` → 0 results. 38-02-SUMMARY records that the entire VARIANT-03 describe block (pre-edit L342-459) including seedVariant + VARIANT-02 it() was deleted in commit 83bd3cb same-commit-boundary as the type removal. |
| T-38-10 | I (REQUIREMENTS wording drift) | accept | 38-02-SUMMARY §"Forward Pointers / Deferred" records the REQUIREMENTS.md `coerceSettings` → `coerceVariant` wording fix is explicitly deferred per CONTEXT §deferred. Field-deletion path observably satisfies the VAR-05 intent (no STATE_VERSION bump; persisted unknown key tolerated). Accepted-risk rationale documented. |

## Threat Verification — Plan 03 (App.tsx state strip + theme.css + fixtures)

| Threat ID | Category | Disposition | Evidence |
|-----------|----------|-------------|----------|
| T-38-11 | T (dead CSS re-entry) | mitigate | `grep -nE "data-variant=['\"]?(square\|diamond)['\"]?" src/styles/theme.css` → 0 results. `grep -n "data-variant" src/styles/theme.css` → 0 results (entire selector class gone). VAR-06 drift-guard regex `/\[data-variant=['"]?square\|diamond['"]?\]/` (lines 93-101) scans `src/styles/` via STYLES_DIR (L59) with `.css` filter accept clause (L46). |
| T-38-12 | I (orphan WHY comments) | mitigate | `grep -nE "sessionVariant\|liveVariant\|sessionVariantRef\|VisualVariantId" src/app/App.tsx` → 0 results. 38-03-SUMMARY task 1 step 12 records comment debt sweep (orphan BreathingShape reference in Phase 25 D-09 cue comment → OrbShape; VariantPicker removed from SettingsDialog JSX comment). |
| T-38-13 | D (broken App render) | accept | 38-03-SUMMARY §"ROADMAP Success Criteria" / SC1 records App.tsx renders OrbShape at all 3 prior BreathingShape sites (Plan 01) with no `sessionVariant ?? liveVariant` JSX read remaining; full test suite passes (1093/1093) — empirical safety net documented. Accepted-risk rationale captured: existing App test suite is the empirical safety net for the state-strip. |
| T-38-14 | I (App test fixture drift) | mitigate | `grep -nE "variant:\s*'(orb\|square\|diamond)'" src/app/App.test.tsx src/app/App.locale.test.tsx` → 0 results (Plan 03 commit 7ee2b70 stripped 4 sites; the additional 9-test fixture sweep landed in commit 5b92f5c "strip variant: 'orb' fixture residue from 9 test files (VAR-06 closure)"). `tsc --noEmit` exits 0; `vitest run` 1093/1093 + 2 new drift-guard cases. |

## Threat Verification — Plan 04 (VAR-06 drift-guard test)

| Threat ID | Category | Disposition | Evidence |
|-----------|----------|-------------|----------|
| T-38-15 | T (future re-entry) | mitigate | `src/content/content.no-variants.test.ts` exists and passes (verified by running `npx vitest run src/content/content.no-variants.test.ts` → 2/2 passing). FORBIDDEN_TOKENS array (lines 72-102) contains all 14 declared tokens: 10 plain-substring (lines 74-83) + 2 persisted-value regex (lines 85-92) + 2 CSS selector regex (lines 94-101). describe block at L104 + "no forbidden variant token" it() at L116 enforces the invariant. |
| T-38-16 | I (vacuous pass) | mitigate | Sanity-floor it() at lines 109-114: `expect(SCAN_FILES.length, ...).toBeGreaterThan(10)` — guards against broken `__dirname` resolve or renamed scan root producing an empty list. |
| T-38-17 | I (drift-guard self-flag) | mitigate | `collectFiles` (lines 39-54) reject clause at lines 47-48 explicitly excludes `.test.ts` and `.test.tsx` files via filename suffix filter. The drift-guard file itself ends in `.test.ts` so is excluded from its own scan. Note at L35-36 documents this is "load-bearing". |
| T-38-18 | D (false positive on legitimate "square"/"diamond" English) | mitigate | FORBIDDEN_TOKENS list (lines 72-102) does NOT include plain-English `'Square'` / `'Diamond'` / `'Quadrado'` / `'Losango'` — only symbol-name plain-substring tokens (capitalized component/symbol names) + `variant:` regex + `[data-variant=...]` CSS regex. The 4 plain-English words (which appear in audio-synth comments and shape geometry comments) are intentionally excluded per CONTEXT D-05 / D-08; 38-04-SUMMARY §"Rationale for exclusions" documents. |
| T-38-19 | I (CSS coverage gap) | mitigate | 4th scanned root `STYLES_DIR = resolve(__dirname, '..', 'styles')` at L59; `SCAN_FILES` concatenation at L62-67 includes `...collectFiles(STYLES_DIR)`. File filter accept clause at L46 includes `.css` alongside `.ts`/`.tsx`. theme.css is therefore scanned for the 2 CSS-attribute regex tokens. |

## Cross-Cutting Evidence

- Cumulative `git grep` across `src/` per 38-04-SUMMARY belt-and-suspenders audit (Task 2 Step 5): all 4 pattern audits return 0 matches in production files.
- `npx tsc --noEmit`: exits 0 (recorded in every Plan SUMMARY).
- `npx vitest run`: 1095/1095 passing (1093 pre-existing + 2 new drift-guard cases) — recorded in 38-04-SUMMARY.
- `npm run build`: exits 0 (recorded in 38-04-SUMMARY).
- STATE_VERSION lock confirmed (Plan 04 SUMMARY): `git diff main -- src/storage/storage.ts | grep STATE_VERSION` returns 0 matches.

## Accepted Risks Log

| Threat ID | Risk | Accepted-by Rationale | Reviewer |
|-----------|------|-----------------------|----------|
| T-38-06 | Returning user with persisted `prefs.variant: 'square'\|'diamond'` in localStorage | Phase 8 D-01 envelope tolerance preserves unknown keys on disk; `coercePrefs` reads only theme/timbre/cue/locale; OrbShape is the only render path (Plan 01). No STATE_VERSION bump per CONTEXT D-01. Documented at 38-02-PLAN.md threat register and 38-02-SUMMARY §"Phase 8 D-01 Envelope Tolerance". | CONTEXT D-01 design decision |
| T-38-10 | REQUIREMENTS.md VAR-05 names `coerceSettings` but actual coercer was `coerceVariant` inside `coercePrefs` | Field-deletion path satisfies VAR-05 intent (forward-compat read, no STATE_VERSION bump); REQUIREMENTS.md tidy explicitly deferred per CONTEXT §deferred. Documented at 38-02-SUMMARY §"Forward Pointers / Deferred". | CONTEXT §deferred wording-fix bullet |
| T-38-13 | App.tsx render path after sessionVariantRef / sessionVariant state strip | Plan 01 already replaced JSX prop reads with `cue` / `frame` / `leadInDigit` / `strings` only — no `sessionVariant ?? liveVariant` survives in JSX. Existing App test suite (119/119 in src/app) is the empirical safety net. Documented at 38-03-PLAN.md threat register and 38-03-SUMMARY §"ROADMAP Success Criteria SC1". | Existing test coverage |

## Unregistered Flags

None. SUMMARY scans:
- 38-01-SUMMARY.md §"Threat Surface Scan" — "No new network endpoints, auth paths, file access patterns, or schema changes introduced."
- 38-02-SUMMARY.md — no threat-flags section; no new attack surface recorded.
- 38-03-SUMMARY.md §"Threat Flags" — explicitly "None".
- 38-04-SUMMARY.md — no threat-flags section; the only new file is a test (drift-guard) — not new runtime surface.

This is a pure deletion phase. No new dependencies, no new endpoints, no new auth surface, no new file/network/schema access. Verified.

## Security Audit Trail

| Audit Date | Threats Total | Closed | Open | Run By |
|------------|---------------|--------|------|--------|
| 2026-05-21 | 19 | 19 | 0 | gsd-security-auditor (initial creation, state B) |

## Sign-Off

- [x] All threats have a disposition (mitigate / accept / transfer / n/a)
- [x] Accepted risks documented in Accepted Risks Log (T-38-06, T-38-10, T-38-13)
- [x] `threats_open: 0` confirmed
- [x] `status: verified` set in frontmatter

**Approval:** verified 2026-05-21

## Result

**SECURED** — all 19 declared threats verified CLOSED. Phase 38 may ship.
