---
phase: 46-kuthasta-orb-variant
reviewed: 2026-05-25T00:00:00Z
depth: standard
files_reviewed: 5
files_reviewed_list:
  - src/components/OrbShape.test.tsx
  - src/components/OrbShape.tsx
  - src/featureFlags.test.ts
  - src/featureFlags.ts
  - src/styles/theme.css
findings:
  critical: 0
  warning: 1
  info: 5
  total: 6
status: issues_found
---

# Phase 46: Code Review Report

**Reviewed:** 2026-05-25
**Depth:** standard
**Files Reviewed:** 5
**Status:** issues_found

## Summary

Phase 46 adds the `spiritual-eye` variant to the `BreathingShapeVariant` union, wiring the spike-012 V5 Halo Flame design into `OrbShape.tsx`, `featureFlags.ts`, and `theme.css`. The implementation is structurally sound: spike values transcribed verbatim, dispatch fans out cleanly across the four `OrbContainer` call sites, parser path extended with three alias literals (`spiritual-eye` / `kuthasta` / `star`), and 12 per-theme tokens added to `theme.css` (light + dark × 6 each: halo-1, halo-2, disc, disc-strong, star-fill, star-stroke).

No security defects; no hardcoded credentials; no `eval`/`innerHTML`/`dangerouslySetInnerHTML`; no debug artifacts. TypeScript and the existing test suite (1174 tests) gate against type drift. The findings below are: one Warning for ignored `cue` prop with `spiritual-eye` (a silent feature-loss for arrow/nose cue users that combine flags), plus five Info items around test-coverage gaps, a brittle test selector, a stale doc-comment count, redundant type assertions, and a misleading eslint-disable directive.

## Warnings

### WR-01: `cue` prop is silently dropped when `variant === 'spiritual-eye'`

**File:** `src/components/OrbShape.tsx:239-243`

**Issue:** In `OrbBody`, the `variant === 'spiritual-eye'` branch unconditionally renders `<StarGlyph />` and discards the `cue` prop entirely:

```tsx
{variant === 'spiritual-eye' ? (
  <StarGlyph />
) : (
  <CueGlyph cue={cue} phase={frame.phase} phaseLabel={phaseLabel} />
)}
```

When a user combines flags (e.g. `?breathingShape=spiritual-eye&cue=arrow`), the explicit `cue=arrow` selection is silently ignored — no arrow renders. The aria-label on the root still carries `phaseLabel`, so screen-reader parity is preserved, but the visual cue affordance is dropped without any user-visible signal.

The plan must_haves call this out as an "open item #1 resolution" (StarGlyph replaces CueGlyph as the Running disc child for spiritual-eye), so this is a deliberate design decision rather than a code bug. Nevertheless, it is a silent feature regression for cue accessibility users who specifically chose `arrow` or `nose` over `labels`, and it is not currently surfaced anywhere user-facing.

**Fix:** Either (a) document the intentional incompatibility in the JSDoc on `OrbShapeProps.cue` so future readers/maintainers understand the precedence (`variant === 'spiritual-eye'` overrides `cue`), and/or (b) add a small comment at the dispatch site mirroring the plan's "open item #1" justification:

```tsx
{/* Phase 46 D-04 / open item #1: spiritual-eye Running surface renders
    StarGlyph in place of CueGlyph — the `cue` prop is intentionally
    dropped for this variant. aria-label parity preserved at root. */}
{variant === 'spiritual-eye' ? (
  <StarGlyph />
) : (
  <CueGlyph cue={cue} phase={frame.phase} phaseLabel={phaseLabel} />
)}
```

Without this, the next maintainer is likely to "fix" the missing cue rendering and re-introduce the regression.

## Info

### IN-01: Missing test coverage — NK + spiritual-eye disc-bg branches

**File:** `src/components/OrbShape.test.tsx:223-309`

**Issue:** The Phase 46 test block does not exercise the `nkPhase='front'` / `nkPhase='back'` combinations with `variant='spiritual-eye'`. The plan's must_haves explicitly lock that NK-front renders `var(--color-orb-disc-spiritual-eye)` and NK-back renders `var(--color-orb-disc-spiritual-eye-strong)`. The `OrbLeadIn` discBg ternary at `OrbShape.tsx:306-313` has four product branches; only two are touched by the existing tests (front/non-spiritual-eye via existing NK suite if any, and the digit/non-NK path via Test D). The two NK-spiritual-eye branches have zero direct coverage in this file.

**Fix:** Add two assertions that render OrbShape with `nkPhase='front'` and `nkPhase='back'` plus `variant='spiritual-eye'`, then assert the inner disc `<div>`'s inline `background` style references the expected token name (no hex — per `[[feedback_no_design_locking]]`):

```tsx
it('NK front + spiritual-eye uses --color-orb-disc-spiritual-eye', () => {
  const { container } = render(
    <OrbShape frame={null} nkPhase="front" variant="spiritual-eye"
              strings={EN_STRINGS_FIXTURE.practice.breathing} />,
  )
  const disc = container.querySelector('div[style*="--color-orb-disc-spiritual-eye"]')
  expect(disc).not.toBeNull()
})
// + analogous test for nkPhase="back" expecting -spiritual-eye-strong
```

### IN-02: Missing assertion — completion + spiritual-eye uses production accent disc

**File:** `src/components/OrbShape.test.tsx:288-299` (Test E)

**Issue:** Test E confirms the StarGlyph polygon is NOT present and the CheckmarkGlyph polyline IS present, but does not lock the D-02 invariant that the completion disc-bg stays production `var(--color-breathing-accent)` (NOT the spiritual-eye gradient). The same gap exists for Test D (LeadIn digit). Without these assertions, a future refactor that changes `showCompletion`'s hardcoded `discBg="var(--color-breathing-accent)"` to derive from variant would pass all tests but silently break D-02.

**Fix:** Add an assertion in Tests D and E that the centre disc's inline background does NOT reference any `spiritual-eye` token:

```tsx
const disc = container.querySelector('div[style*="--color-orb-disc-spiritual-eye"]')
expect(disc).toBeNull()
```

### IN-03: Test selector for star polygon is brittle to SVG additions

**File:** `src/components/OrbShape.test.tsx:228`

**Issue:** `starPolygonSelector = 'svg[viewBox="0 0 100 100"] polygon'` discriminates by viewBox + presence of `<polygon>`. Today both `CueGlyph` (`CueGlyph.tsx:96,118`) and `ProgressArcLayer` (`OrbShape.tsx:561`) also use `viewBox="0 0 100 100"`; they happen to use `<path>` / `<line>` / `<polyline>` instead of `<polygon>`, so the selector is currently unambiguous. If any future SVG in the orb subtree adds a `<polygon>` child (e.g. a new cue mode, a new ring-cue variant), Test A's vertex-count assertion will silently match the wrong polygon.

**Fix:** Tag StarGlyph's `<svg>` with a stable data attribute and target that instead:

```tsx
// In StarGlyph:
<svg data-glyph="star" viewBox="0 0 100 100" ...>

// In test:
const starPolygonSelector = 'svg[data-glyph="star"] polygon'
```

### IN-04: Doc-comment token count is off-by-two relative to actual additions

**File:** `src/styles/theme.css:21-31, 82-90`

**Issue:** The Phase 46 task description states "10 per-theme CSS tokens added". The diff actually adds 12 (6 per theme × 2 themes): `--color-orb-halo-1-spiritual-eye`, `--color-orb-halo-2-spiritual-eye`, `--color-orb-disc-spiritual-eye`, `--color-orb-disc-spiritual-eye-strong`, `--color-orb-star-fill-spiritual-eye`, `--color-orb-star-stroke-spiritual-eye`. The block-level comment in `theme.css` itself is fine; the discrepancy is in the phase metadata / commit narrative. Worth fixing in the SUMMARY/commit message but not in code.

**Fix:** Update phase-level documentation (SUMMARY.md / commit message) from "10" to "12" to match the actual diff. No source-code change required.

### IN-05: Redundant `as`-casts on default values

**File:** `src/featureFlags.ts:66, 78, 89`

**Issue:** Three feature-flag specs use redundant assertions:

```ts
defaultValue: 'orb-halo' as BreathingShapeVariant,
defaultValue: 'ambient' as OrbIdleBehavior,
defaultValue: 'progress-arc' as RingCueStyle,
```

The literal `'orb-halo'` is already assignable to `BreathingShapeVariant`; the `as` cast is unnecessary. The trailing `satisfies QueryFeatureFlagSpec<...>` already enforces the constraint and would catch any drift. The casts are inert (no runtime cost, no type-safety loss), just stylistic noise.

**Fix:**

```ts
const BREATHING_SHAPE_FLAG = {
  queryParam: 'breathingShape',
  defaultValue: 'orb-halo',
  parse(rawValue: string): BreathingShapeVariant | null { /* … */ },
} satisfies QueryFeatureFlagSpec<BreathingShapeVariant>
```

This is a pre-existing pattern (also on the older flags); a one-pass cleanup is optional.

### IN-06: Misleading eslint-disable directive in matchMedia mock

**File:** `src/components/OrbShape.test.tsx:177`

**Issue:** The disable comment claims to suppress `@typescript-eslint/no-unnecessary-type-assertion`, but the cast `as unknown as MediaQueryList` IS necessary — the mock object is missing many `MediaQueryList` properties, so without the double cast TypeScript would reject the `mockReturnValue` call. The disable directive is therefore inert (no rule is firing) and the rule-name in the comment misleads future readers into thinking the cast could be removed. This is pre-existing from Phase 45 but worth flagging because it sets a precedent.

**Fix:** Either remove the eslint-disable line (the cast is genuinely needed and no rule complains in current ESLint config), or change the rule name to the one actually being suppressed (if any). The "Reason:" comment above it is accurate and can stay.

---

_Reviewed: 2026-05-25_
_Reviewer: Claude (gsd-code-reviewer)_
_Depth: standard_
