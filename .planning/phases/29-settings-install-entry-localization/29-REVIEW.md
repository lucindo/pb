---
phase: 29-settings-install-entry-localization
reviewed: 2026-05-16T18:08:00Z
depth: standard
files_reviewed: 2
files_reviewed_list:
  - src/components/IosInstallSteps.tsx
  - src/components/IosInstallSteps.test.tsx
findings:
  critical: 0
  warning: 1
  info: 1
  total: 2
status: issues_found
---

# Phase 29: Code Review Report (gap-closure 29-03)

**Reviewed:** 2026-05-16T18:08:00Z
**Depth:** standard
**Files Reviewed:** 2
**Status:** issues_found

> Scope note: This review covers only the GAP-1 gap-closure changes from plan
> 29-03 (`src/components/IosInstallSteps.tsx` and its test). It supersedes the
> earlier full-phase review of this file. The earlier review's IN-04
> ("first `<li>` has an explicit color class the other two lack") is the exact
> defect GAP-1 closed and is now resolved.

## Summary

Plan 29-03 closes GAP-1: the iOS install steps rendered near-black text that was
unreadable on dark theme backgrounds. The fix applies theme-aware
`var(--color-breathing-*)` text-color tokens to all three step `<li>` elements
(step 1 = `accent-strong`, steps 2 & 3 = `muted`) and adds a regression test
asserting the contract.

The change is correct and minimal. Both tokens are confirmed defined in all five
`[data-theme]` blocks of `src/styles/theme.css`, and the usage matches the
existing convention in sibling components (`InstallBanner.tsx`, `StatsFooter.tsx`,
`App.tsx`). All 4 tests pass.

No critical (BLOCKER) issues. One WARNING (the `<ol>` numbering markers are an
unverified part of the fix) and one INFO (the regression test is string-based,
not style-based).

## Warnings

### WR-01: Ordered-list numbering markers are not explicitly themed — partial GAP-1 surface uncovered

**File:** `src/components/IosInstallSteps.tsx:23-31`
**Issue:** GAP-1 is "near-black text unreadable on dark backgrounds." The fix
colors the *step text* by setting `color` on each `<li>`. The `list-decimal`
numbering markers ("1.", "2.", "3.") are rendered by the `::marker` pseudo-element,
which inherits `color` from its `<li>`. Because each `<li>` now sets a color, the
markers happen to be themed correctly today — but this coupling is implicit and
fragile. A common future refactor (moving the color onto an inner `<span>` inside
the `<li>`, or extracting step text into a child component) would leave the `<li>`
without a `color`, silently reverting the markers to the near-black page default
and partially reopening GAP-1. The regression test (see IN-01) asserts the `<li>`
className string, so it would still pass after such a regression — the marker
readability would not be caught.
**Fix:** Centralize the color on the `<ol>` so every descendant (markers + all
step text) is themed from one place, then layer the step-1 emphasis on top:
```tsx
<ol className="list-decimal pl-5 text-[var(--color-breathing-muted)]">
  <li className="text-[var(--color-breathing-accent-strong)]">
    {strings.iosStep1} <IOsShareIcon />
  </li>
  <li>{strings.iosStep2}</li>
  <li>{strings.iosStep3}</li>
</ol>
```
This guarantees no element in the subtree falls back to the page default. (Note:
the current per-`<li>` token assertions in the test would need to be relaxed for
steps 2 & 3 if this fix is adopted.) If the per-`<li>` approach is kept
intentionally, add a code comment stating that `::marker` color is deliberately
driven by the `<li>` `color` property so the coupling is not lost in a refactor.

## Info

### IN-01: Regression test asserts static class strings, not resolved color

**File:** `src/components/IosInstallSteps.test.tsx:41-56`
**Issue:** The GAP-1 regression test verifies `li.className` contains the literal
substring `var(--color-breathing-`. This confirms the JSX still carries the
class, but does not verify the token resolves to a readable color, nor that the
`::marker` is themed (see WR-01). The assertion essentially restates the source
JSX, so it would not catch a CSS-side regression — e.g. a token removed from
`theme.css`, or the Tailwind arbitrary-value class failing to compile. This is an
acceptable structural guard given jsdom does not resolve CSS custom properties;
flagged as INFO, not a defect.
**Fix:** No change required for this phase. For stronger coverage later, assert
on `getComputedStyle` in a browser-mode/Playwright test where the theme CSS is
actually applied, or assert the tokens exist in `theme.css`.

---

_Reviewed: 2026-05-16T18:08:00Z_
_Reviewer: Claude (gsd-code-reviewer)_
_Depth: standard_
</content>
