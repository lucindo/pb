---
phase: 17-visual-variants
verified: 2026-05-14T12:30:00Z
status: passed
score: 5/5 success criteria verified (7/7 VARIANT requirements verified)
overrides_applied: 0
re_verification: false
---

# Phase 17: Visual Variants — Verification Report

**Phase Goal:** Users can choose between the default Orb and 2 alternate visual variants; the selection persists and the picker is disabled during active sessions.

**Verified:** 2026-05-14T12:30:00Z
**Status:** PASSED
**Re-verification:** No — initial verification

---

## Goal Achievement

### Observable Truths (Roadmap Success Criteria)

| # | Criterion | Status | Evidence |
|---|-----------|--------|----------|
| SC-1 | Opening SettingsDialog and selecting a variant immediately updates the visual guide when not in session; Orb default unchanged (VARIANT-02) | PASS | `VariantPicker.tsx:20` calls `useVariantChoice` which dispatches `hrv:prefs-changed`; `useVisualVariant.ts:35-46` re-reads `loadPrefs().variant` on that event; `App.tsx:634` renders `BreathingShape` with `sessionVariant ?? liveVariant`; `DEFAULT_VARIANT = 'orb'` at `settings.ts:81`. |
| SC-2 | Variant picker disabled while `inSessionView`; active variant captured at session start, no mid-session change (VARIANT-03) | PASS | `SettingsDialog.tsx:83` passes `disabled={inSessionView}` to `VariantPicker`; `App.tsx:332-333` snapshots `sessionVariantRef.current = liveVariant` and `setSessionVariant(liveVariant)` before `setAppPhase('lead-in')` at line 335; `App.tsx:634` renders `variant={sessionVariant ?? liveVariant}` — frozen ref wins during session. Tests at `App.session.test.tsx:362-453` cover all three VARIANT-03 scenarios. |
| SC-3 | Every variant renders the 3-2-1 lead-in countdown via `leadInDigit` (VARIANT-05) | PASS | `OrbShape.tsx:14-16` returns `<OrbLeadIn digit={leadInDigit} />` when `leadInDigit != null`; identical pattern in `SquareShape.tsx:14-16` and `DiamondShape.tsx:13-15`. All three `*LeadIn` sub-components render the digit via `{digit}` in a `text-7xl` span (e.g. `OrbShape.tsx:201`, `SquareShape.tsx:215`, `DiamondShape.tsx:193`). Test at `App.session.test.tsx:437-453` asserts `data-variant="square"` on the lead-in shape. |
| SC-4 | Every variant applies `prefers-reduced-motion: reduce` fixed-mid + crossfade fallback (VARIANT-04) | PASS | All three `*Body` components: `OrbShape.tsx:25,32`, `SquareShape.tsx:25,32`, `DiamondShape.tsx:38,45` — all call `usePrefersReducedMotion()` and branch to `MID_SCALE` when `true`. CSS `motion-reduce:transition-none` on `.orb` div in all three. `@media (prefers-reduced-motion: reduce)` in `theme.css:514-522` globally suppresses inner-ring and dialog fade. Test at `App.session.test.tsx:153-180` asserts `scale(0.79)` under reduced-motion. |
| SC-5 | Selected variant persists across reloads via `Envelope.prefs.variant`; `tsc && lint && build && test` exit 0 (VARIANT-07) | PASS | `useVariantChoice.ts:33-36` calls `savePrefs({ ...current, variant: next })`; `prefs.ts:72-74` calls `writeEnvelope({ ...env, prefs })`; `useVisualVariant.ts:17` seeds state from `loadPrefs().variant`. Live build: `tsc` exit 0, ESLint exit 0, Vite build exit 0, Vitest 588/588 tests pass (all 46 test files). |

**Score:** 5/5 success criteria verified.

---

## VARIANT Requirement Traceability (VARIANT-01..07)

| Requirement | Description | Verdict | Code Reference |
|-------------|-------------|---------|----------------|
| VARIANT-01 | User can choose between Orb (default), Square, Diamond from SettingsDialog | PASS | `VariantPicker.tsx:31` maps over `VARIANT_OPTIONS = ['orb','square','diamond']` (`settings.ts:75`); `SettingsDialog.tsx:83` renders `<VariantPicker disabled={inSessionView} />`; App wires dialog at `App.tsx:699`. |
| VARIANT-02 | Default variant is Orb; zero-regression for users who never open picker | PASS | `settings.ts:81`: `DEFAULT_VARIANT: VisualVariantId = 'orb'`; `BreathingShape.tsx:27`: `variant = 'orb'` default prop; `prefs.ts:47`: `coerceVariant` falls back to `DEFAULT_VARIANT`; test at `App.session.test.tsx:427-435` asserts `data-variant="orb"` with empty localStorage. |
| VARIANT-03 | Picker disabled while `inSessionView`; variant captured at session start; no mid-session swap | PASS | `SettingsDialog.tsx:83`: `disabled={inSessionView}`; `App.tsx:179-180` ref+state pair; `App.tsx:332-333` snapshot before lead-in; `App.tsx:497-498` clear on session end. Three tests in `App.session.test.tsx:349-453` verify capture, cross-tab immutability, and reset for next session. |
| VARIANT-04 | Every variant honors `prefers-reduced-motion: reduce` | PASS | `usePrefersReducedMotion()` + `orbScale = reducedMotion ? MID_SCALE : liveScale` in all three `*Body` components; `motion-reduce:transition-none` CSS class on `.orb` div; `@media (prefers-reduced-motion: reduce)` in `theme.css:514` applies globally (including inner-ring suppression). |
| VARIANT-05 | Every variant renders 3-2-1 lead-in countdown digit through `leadInDigit` prop path | PASS | `OrbShape.tsx:14-16`, `SquareShape.tsx:14-16`, `DiamondShape.tsx:13-15`: all check `leadInDigit != null` and delegate to `*LeadIn` sub-component; each sub-component renders `{digit}` in a dominant `text-7xl` span. |
| VARIANT-06 | Every variant honors 44x44 hit area + `focus-visible` ring where interactive | PASS | `VariantPicker.tsx:36`: `baseClasses` includes `min-h-12` (48px, exceeds 44px floor) and `focus-visible:ring-2 focus-visible:ring-breathing-accent focus-visible:ring-offset-2`; shape components themselves are non-interactive (`role="img"`). |
| VARIANT-07 | Selected variant persists across reloads via `Envelope.prefs.variant` | PASS | Full round-trip: `useVariantChoice.ts:33-36` writes via `savePrefs`; `prefs.ts:60-65` coerces on read; `useVisualVariant.ts:17` seeds from `loadPrefs().variant` at mount; `useVariantChoice.test.ts` covers the write+event cycle. |

---

## Required Artifacts

| Artifact | Status | Evidence |
|----------|--------|----------|
| `src/components/OrbShape.tsx` | VERIFIED | 207 lines; full `OrbBody` + `OrbLeadIn`; `usePrefersReducedMotion`; `data-variant="orb"` |
| `src/components/SquareShape.tsx` | VERIFIED | 220 lines; `SquareBody` + `SquareLeadIn`; 18% border-radius; `data-variant="square"` |
| `src/components/DiamondShape.tsx` | VERIFIED | 199 lines; `DiamondBody` + `DiamondLeadIn`; clip-path geometry; `data-variant="diamond"` |
| `src/components/shapeConstants.ts` | VERIFIED | Exports `MIN_SCALE=0.58`, `MAX_SCALE=1.0`, `MID_SCALE=0.79` |
| `src/components/BreathingShape.tsx` | VERIFIED | 40-line dispatcher; 3-way `switch(variant)`; idle `null` guard; `variant='orb'` default prop |
| `src/components/VariantPicker.tsx` | VERIFIED | Full radiogroup; `useVariantChoice`; `disabled` prop; `min-h-12` + `focus-visible` |
| `src/hooks/useVisualVariant.ts` | VERIFIED | Seeds from `loadPrefs().variant`; `storage` + `hrv:prefs-changed` listeners; returns `{ variant, setVariant }` |
| `src/hooks/useVariantChoice.ts` | VERIFIED | `savePrefs` write; optimistic state update; `hrv:prefs-changed` dispatch |
| `src/domain/settings.ts` (updated) | VERIFIED | `VisualVariantId = 'orb' \| 'square' \| 'diamond'`; `VARIANT_OPTIONS`; `DEFAULT_VARIANT = 'orb'`; `isValidVariant` predicate |
| `src/styles/theme.css` (updated) | VERIFIED | `[data-variant='square']` marker radius rules at line 405-410; `[data-variant='diamond']` clip-path + inscribed-square marker rules at lines 418-473; `@media (prefers-reduced-motion: reduce)` at line 514 |

---

## Key Link Verification

| From | To | Via | Status | Detail |
|------|----|-----|--------|--------|
| `VariantPicker` | `useVariantChoice` | import + `const { variant, setVariant } = useVariantChoice()` | WIRED | `VariantPicker.tsx:13,20` |
| `useVariantChoice.setVariant` | `storage/prefs.savePrefs` | direct call `savePrefs({ ...current, variant: next })` | WIRED | `useVariantChoice.ts:33-36` |
| `useVariantChoice.setVariant` | `useVisualVariant` | `window.dispatchEvent(new CustomEvent('hrv:prefs-changed', ...))` | WIRED | `useVariantChoice.ts:40-43`; listener at `useVisualVariant.ts:35-46` |
| `App.tsx` | `useVisualVariant` | import + `const { variant: liveVariant } = useVisualVariant()` | WIRED | `App.tsx:17,141` |
| `App.tsx` | `sessionVariantRef` snapshot | `sessionVariantRef.current = liveVariant` before `setAppPhase('lead-in')` | WIRED | `App.tsx:332-335` |
| `App.tsx` JSX | `BreathingShape` | `<BreathingShape variant={sessionVariant ?? liveVariant} ...>` | WIRED | `App.tsx:633-636` |
| `BreathingShape` | `OrbShape / SquareShape / DiamondShape` | `switch(variant)` cases | WIRED | `BreathingShape.tsx:31-39` |
| `SettingsDialog` | `VariantPicker` | `<VariantPicker disabled={inSessionView} />` | WIRED | `SettingsDialog.tsx:83` |
| `App.tsx` | `SettingsDialog` | `<SettingsDialog open={...} inSessionView={inSessionView} ...>` | WIRED | `App.tsx:699` |

---

## Data-Flow Trace (Level 4)

| Artifact | Data Variable | Source | Produces Real Data | Status |
|----------|---------------|--------|--------------------|--------|
| `BreathingShape` | `variant` prop | `sessionVariant ?? liveVariant` in `App.tsx` | Yes — `useVisualVariant` reads `loadPrefs()` from `localStorage`; `useVariantChoice.setVariant` writes via `savePrefs` | FLOWING |
| `VariantPicker` | `variant` state | `useVariantChoice` → `loadPrefs().variant` from `localStorage` | Yes — reads real persisted value; writes back on change | FLOWING |
| `OrbShape / SquareShape / DiamondShape` | `frame` prop | `session.liveFrame` from `useSessionEngine` rAF loop | Yes — rAF-driven `phaseProgress` from real `sessionMath.getSessionFrame()` | FLOWING |

---

## Behavioral Spot-Checks

| Behavior | Command | Result | Status |
|----------|---------|--------|--------|
| 588 tests pass (including 5 VARIANT-03 integration tests) | `npx vitest run` | 588/588 tests, 46 files | PASS |
| TypeScript strict mode clean | `npx tsc --noEmit` | exit 0, no output | PASS |
| ESLint zero warnings | `npx eslint "src/**/*.{ts,tsx}" --max-warnings=0` | exit 0, no output | PASS |
| Vite production build | `npx vite build` | `dist/assets/index-kaLfCMKh.js 248.32 kB (gzip 72.58 kB)`, exit 0 | PASS |

---

## Requirements Coverage

| Requirement | Phase | Status | Evidence |
|-------------|-------|--------|----------|
| VARIANT-01 | Phase 17 | SATISFIED | `VariantPicker.tsx` renders all 3 options from `VARIANT_OPTIONS` |
| VARIANT-02 | Phase 17 | SATISFIED | `DEFAULT_VARIANT = 'orb'`; BreathingShape default prop `'orb'`; zero-regression test passes |
| VARIANT-03 | Phase 17 | SATISFIED | `sessionVariantRef` snapshot + `disabled={inSessionView}` + 5 integration tests |
| VARIANT-04 | Phase 17 | SATISFIED | `usePrefersReducedMotion` in all 3 shape Body components; `@media` block in `theme.css` |
| VARIANT-05 | Phase 17 | SATISFIED | `*LeadIn` sub-components in all 3 shapes render `leadInDigit` |
| VARIANT-06 | Phase 17 | SATISFIED | `min-h-12` + `focus-visible:ring-2` in `VariantPicker.tsx:36` |
| VARIANT-07 | Phase 17 | SATISFIED | `savePrefs` / `loadPrefs` round-trip; `useVisualVariant` seeds at mount |

---

## Anti-Patterns Found

None. No `TBD`, `FIXME`, or `XXX` markers in any Phase 17 source file. No placeholder or stub returns in shape components — all render real kinematics.

Notable carry-forward items documented in SUMMARY.md (not blockers):
- `.orb-layer--in/--out` class naming inconsistency (non-Orb variants reuse Orb-named classes) — deferred to v1.2 ergonomics pass, no functional impact.
- Live idle preview deferred per D-12.

---

## Human Verification Required

None required. All functional behaviors are testable programmatically:

- Variant picker disabled state: wired via `disabled={inSessionView}` prop threading and verified in SettingsDialog tests.
- Cross-tab storage isolation: verified in `App.session.test.tsx:372-425` using `StorageEvent` simulation.
- Reduced-motion scale: verified in `App.session.test.tsx:153-180` via `matchMedia` mock.
- Shape geometry (visual correctness of diamond clip-path, square border-radius): this is the one area that is render-only and cannot be checked programmatically. The operator UAT completed 3 iterations and approved the final state (SUMMARY.md §"UAT Iteration Log"). No code concern surfaced.

---

## Gaps Summary

No gaps. All 5 roadmap success criteria and all 7 VARIANT-01..07 requirements are satisfied by substantive, wired, and data-flowing code. The test suite is green at 588 tests, TypeScript compiles clean, ESLint exits 0, and the production build is byte-identical to the SUMMARY.md–reported output.

The one documented deviation (Ring → Diamond) is fully reflected in the codebase: `VisualVariantId = 'orb' | 'square' | 'diamond'` (`settings.ts:73`), `DiamondShape.tsx` replaces the never-shipped `RingShape.tsx`, all tests use `'diamond'`, and old `'ring'` localStorage values coerce safely to `'orb'` via `coerceVariant` (`prefs.ts:46-48`).

---

_Verified: 2026-05-14T12:30:00Z_
_Verifier: Claude (gsd-verifier)_
