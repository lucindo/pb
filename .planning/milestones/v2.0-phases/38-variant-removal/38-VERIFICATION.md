---
phase: 38-variant-removal
verified: 2026-05-21T01:25:00Z
status: passed
score: 6/6 must-haves verified
overrides_applied: 0
re_verification:
  previous_status: gaps_found
  previous_score: 5/6
  gaps_closed:
    - "A repo-wide search for variant-specific tokens / CSS classes / EN+PT-BR strings / test fixtures returns zero leftover references (VAR-06) — commit 5b92f5c removed all 15 occurrences of `variant: 'orb'` from 9 test files"
  gaps_remaining: []
  regressions: []
---

# Phase 38: Variant Removal Verification Report

**Phase Goal:** Reduce the shape vocabulary to Orb-only — drop Square and Diamond from code, tokens, picker, and Start-capture, so the Phase 42 orb rewrite has exactly one shape to dispatch to.
**Verified:** 2026-05-21T01:25:00Z
**Status:** passed
**Re-verification:** Yes — after VAR-06 gap closure (commit 5b92f5c)

---

## Goal Achievement

### Observable Truths

| # | Truth | Status | Evidence |
|---|-------|--------|----------|
| 1 | `BreathingShape.tsx` and the `Variant` union no longer reference Square or Diamond; `sessionVariantRef` Start-capture invariant is gone (VAR-01, VAR-02, VAR-04) | VERIFIED | `BreathingShape.tsx` absent from disk; `grep -E "sessionVariantRef\|sessionVariant\|liveVariant\|VisualVariantId" src/app/App.tsx` → 0 results; `VisualVariantId` deleted from `src/domain/settings.ts` |
| 2 | The user `SettingsDialog` has no visible variant picker (VAR-03) | VERIFIED | `grep "VariantPicker" src/components/SettingsDialog.tsx` → 0 results; `grep "'variants'" src/components/SettingsDialog.tsx` → 0 results; full test suite 1095/1095 pass |
| 3 | A returning user with persisted `variant: 'square'` or `variant: 'diamond'` lands on `'orb'` via field-deletion — no STATE_VERSION bump, no FOUC, no broken UI (VAR-05) | VERIFIED | `variant` field deleted from `UserPrefs` interface and `coercePrefs`; `git diff main -- src/storage/storage.ts \| grep STATE_VERSION` → 0 matches; Phase 8 D-01 envelope tolerance harmlessly ignores the unknown persisted key on read |
| 4 | A repo-wide search for variant-specific tokens / CSS classes / EN+PT-BR strings / test fixtures returns zero leftover references (VAR-06) | VERIFIED | `grep -rn "variant: *['\"]orb['\"]" src/` → 0 matches (exit 1); commit 5b92f5c removed all 15 occurrences across 9 test files; tsc clean; 1095/1095 tests pass |
| 5 | `SettingsDialog` type surface: `Pick<UiStrings, ...>` union drops 'variants'; `UiStrings.variants` block and `variantLabel` deleted from type + EN + PT-BR catalogs | VERIFIED | `grep "'variants'" src/components/SettingsDialog.tsx` → 0; `grep -E "variantLabel\|variants:" src/content/strings.ts` → 0 |
| 6 | The VAR-06 drift-guard test exists, scans 4 roots, has 14 forbidden tokens, and currently passes | VERIFIED | `src/content/content.no-variants.test.ts` exists (133 lines); `npx vitest run src/content/content.no-variants.test.ts` exits 0, 2/2 passing |

**Score:** 6/6 truths verified

---

## Required Artifacts

| Artifact | Expected | Status | Details |
|----------|----------|--------|---------|
| `src/components/SquareShape.tsx` | Deleted | MISSING (intentional) | Confirmed absent; git rm'd in Plan 01 |
| `src/components/DiamondShape.tsx` | Deleted | MISSING (intentional) | Confirmed absent |
| `src/components/VariantPicker.tsx` | Deleted | MISSING (intentional) | Confirmed absent |
| `src/components/BreathingShape.tsx` | Deleted | MISSING (intentional) | Confirmed absent |
| `src/hooks/useVisualVariant.ts` | Deleted | MISSING (intentional) | Confirmed absent |
| `src/hooks/useVariantChoice.ts` | Deleted | MISSING (intentional) | Confirmed absent |
| `src/app/App.tsx` | OrbShape direct renders; no sessionVariantRef/liveVariant | VERIFIED | 2 OrbShape call sites; zero variant state identifiers |
| `src/components/NKShape.tsx` | Always-OrbShape; no variant prop | VERIFIED | `data-variant="orb"` fixed literal; no SquareShape/DiamondShape imports |
| `src/domain/settings.ts` | No VisualVariantId/VARIANT_OPTIONS/isValidVariant/DEFAULT_VARIANT | VERIFIED | All 4 symbols absent |
| `src/storage/prefs.ts` | 4-field UserPrefs; no coerceVariant | VERIFIED | UserPrefs: theme, timbre, cue, locale only |
| `src/content/strings.ts` | No variants block or variantLabel | VERIFIED | Both EN and PT-BR catalog entries deleted |
| `src/components/SettingsDialog.tsx` | No 'variants' in Pick union | VERIFIED | Pick union verified clean |
| `src/styles/theme.css` | No [data-variant='square'/'diamond'] selectors | VERIFIED | grep returns 0 results |
| `src/content/content.no-variants.test.ts` | VAR-06 drift-guard; 4 roots; 14 tokens; passing | VERIFIED | 133 lines; 2/2 tests pass |
| `src/app/App.session.test.tsx` | No stale variant field in fixtures | VERIFIED | Commit 5b92f5c removed all 3 occurrences (former lines 353, 361, 410); grep confirms 0 matches across all of src/ |

---

## Key Link Verification

| From | To | Via | Status | Details |
|------|----|-----|--------|---------|
| `src/app/App.tsx` | `src/components/OrbShape.tsx` | `<OrbShape cue=...>` JSX at 2 former BreathingShape sites | WIRED | Lines 982 and 999 confirmed |
| `src/components/NKShape.tsx` | `src/components/OrbShape.tsx` | always-OrbShape render (no dispatcher) | WIRED | NKShape collapsed; `<OrbShape frame={null} nkPhase={phase} ...>` confirmed |
| `src/storage/prefs.ts` | `src/domain/settings.ts` | import block: no variant-axis names | WIRED | Import verified: only `DEFAULT_THEME`, `isValidTheme`, etc. — no `VisualVariantId` |
| `src/content/content.no-variants.test.ts` | `src/components/`, `src/app/`, `src/content/`, `src/styles/` | `collectFiles` recursive fs-scan | WIRED | 14-token scan passes; sanity floor `> 10` files confirmed |

---

## Data-Flow Trace (Level 4)

The variant axis has been fully deleted — there is no variant data to trace. OrbShape receives `cue`, `frame`, `leadInDigit`, and `strings` directly from App.tsx; no variant dispatch path exists.

---

## Behavioral Spot-Checks

| Behavior | Command | Result | Status |
|----------|---------|--------|--------|
| TypeScript type-check | `npx tsc --noEmit` | exit 0 | PASS |
| Full test suite | `npx vitest run` | 1095/1095 pass | PASS |
| Build | `npm run build` | exit 0 (291 kB JS, 62 kB CSS) | PASS |
| VAR-06 drift-guard | `npx vitest run src/content/content.no-variants.test.ts` | 2/2 pass | PASS |
| VAR-06 fixture residue | `grep -rn "variant: *['\"]orb['\"]" src/` | 0 matches (exit 1) | PASS |

---

## Requirements Coverage

| Requirement | Source Plan | Description | Status | Evidence |
|-------------|-------------|-------------|--------|---------|
| VAR-01 | 38-01 | Square shape variant removed from BreathingShape.tsx and Variant union | SATISFIED | BreathingShape.tsx deleted; SquareShape.tsx deleted; NKShape collapsed to OrbShape-only |
| VAR-02 | 38-01 | Diamond shape variant removed from BreathingShape.tsx and Variant union | SATISFIED | DiamondShape.tsx deleted; no DiamondShape reference in production code |
| VAR-03 | 38-01, 38-02 | Variant picker removed from user SettingsDialog | SATISFIED | VariantPicker import and render deleted (Plan 01); 'variants' token removed from Pick union (Plan 02) |
| VAR-04 | 38-01, 38-03 | sessionVariantRef Start-capture invariant removed | SATISFIED | `grep -E "sessionVariantRef\|sessionVariant\|liveVariant"` in App.tsx → 0 results; all 12-thread capture/clear sites deleted |
| VAR-05 | 38-02 | Persisted variant:'square'/'diamond' coerced to 'orb'; no STATE_VERSION bump | SATISFIED | Field deleted from UserPrefs; coercePrefs ignores unknown key via Phase 8 D-01 envelope tolerance; STATE_VERSION unchanged |
| VAR-06 | 38-04 + 5b92f5c | Zero leftover variant-specific tokens/CSS/strings/test fixtures | SATISFIED | All production code, CSS, strings, and test fixtures are clean; `grep -rn "variant: *['\"]orb['\"]" src/` → 0 matches; drift-guard 2/2 pass |

---

## Anti-Patterns Found

| File | Line | Pattern | Severity | Impact |
|------|------|---------|----------|--------|
| `src/styles/theme.css` | 74, 78-80, 420 | Comment references to deleted `BreathingShape.tsx` as location of MIN_SCALE/MAX_SCALE/MID_SCALE constants | INFO | Stale comment; constants now live in `shapeConstants.ts`; no runtime impact (WR-01 from code review) |
| `src/components/NKShape.tsx` | 112-113 | `export { MID_SCALE }` — dead re-export; no consumer imports from NKShape | INFO | Dead export; not a variant-axis issue; no runtime impact (WR-02 from code review) |
| `src/hooks/` (multiple) | comment lines | Comment-only references to deleted `useVisualVariant.ts`, `useVariantChoice.ts` in `useFavicon.ts`, `useLocale.ts`, `useLocaleChoice.ts`, `useTimbreChoice.ts`, `useVisualCue.ts` | INFO | Comment-only; not in VAR-06 scan scope (per CONTEXT D-07 hooks/ exclusion); no runtime impact (WR-03 from code review) |
| `src/app/App.session.test.tsx` | 381 | Comment references deleted `sessionVariantRef` at "line ~338 of App.tsx" | INFO | Stale comment reference; no runtime impact (IN-01 from code review) |

**Debt marker gate:** No `TBD`, `FIXME`, or `XXX` markers found in phase-modified files.

**VAR-06 closure note:** The three WARNING-severity anti-patterns that were present in the initial verification (`variant: 'orb'` in App.session.test.tsx lines 353, 361, 410 and 12 additional occurrences across 8 other test files) were fully resolved by commit 5b92f5c. All INFO-only items above are pre-existing comment debt unrelated to the variant axis removal goal.

---

## Human Verification Required

None. All must-haves verified programmatically.

---

## Gaps Summary

No gaps. All 6 must-haves are fully verified.

VAR-06 closure summary: commit 5b92f5c (`chore(38): strip variant: 'orb' fixture residue from 9 test files`) removed 15 occurrences of `variant: 'orb'` from prefs envelopes in:
- `src/app/App.session.test.tsx` (3 lines — CR-01 originally flagged)
- `src/components/LanguagePicker.test.tsx`, `CuePicker.test.tsx`, `ThemePicker.test.tsx`, `TimbrePicker.test.tsx`
- `src/hooks/useTheme.test.ts` (2), `useFavicon.test.ts` (2), `useVisualCue.test.ts` (3), `useAudioCues.test.tsx` (1)

Post-closure confirmation: `grep -rn "variant: *['\"]orb['\"]" src/` → 0 matches; tsc clean; 1095/1095 tests pass.

---

_Verified: 2026-05-21T01:25:00Z_
_Verifier: Claude (gsd-verifier)_
