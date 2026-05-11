---
phase: 02-visual-guide-accessible-responsive-interface
fixed_at: 2026-05-09T15:23:00Z
review_path: .planning/phases/02-visual-guide-accessible-responsive-interface/02-REVIEW.md
iteration: 2
findings_in_scope: 9
fixed: 9
skipped: 0
status: all_fixed
---

# Phase 02: Code Review Fix Report

**Fixed at:** 2026-05-09T15:23:00Z
**Source review:** .planning/phases/02-visual-guide-accessible-responsive-interface/02-REVIEW.md
**Iteration:** 2 (cumulative; round 1 = CR + WR findings, round 2 = INFO findings)

**Summary:**
- Findings in scope: 9 (1 Critical + 4 Warning + 4 Info)
- Fixed: 9
- Skipped: 0

All 9 findings from REVIEW.md are now fixed across two iteration rounds. After
the round-2 fixes, the full Vitest suite (8 files, 80 tests — 78 pre-existing
+ 1 WR-01 regression test from round 1 + 1 IN-02 regression test from round 2)
passes, and `npx tsc --noEmit` is clean.

## Round 1 (CR + WR) — fixed 2026-05-09T13:02:00Z

### CR-01: Reduced-motion CSS overrides the JS-applied orb scale via `!important`

**Files modified:** `src/styles/theme.css`
**Commit:** `b45757c`
**Status:** fixed: requires human verification
**Applied fix:** Removed `transform: none !important` from the `@media (prefers-reduced-motion: reduce)` rule on `.breathing-shape, .orb`. Kept `transition: none !important` (the actual reduced-motion guarantee — no animation). The inline `transform: scale(var(--orb-scale-mid))` set by `BreathingShape` under reduced-motion now reaches the rendered output instead of being silently overridden. Added an explanatory comment in the CSS so future edits do not re-introduce the override.

**Why "requires human verification":** The bug is invisible to the existing JSDOM unit tests because they assert `style.transform` (the inline attribute string), not `getComputedStyle()` (which would resolve `@media` + `!important`). JSDOM does not evaluate `@media` queries against stylesheets, so a `getComputedStyle`-based regression test would not actually exercise the fix. The visual regression must be confirmed in a real browser with `prefers-reduced-motion: reduce` enabled (System Settings → Accessibility on macOS, or DevTools → Rendering → Emulate CSS media feature → reduce).

### WR-01: Modal can outlive the running session if the timer auto-completes while it is open

**Files modified:** `src/app/App.tsx`, `src/app/App.dialog.test.tsx`
**Commit:** `8c5d452`
**Applied fix:** Added a `useEffect` in `App` that closes the end-session dialog whenever `state.status` transitions away from `'running'` while the dialog is open. This handles the case where the timer auto-completes while the user is reading the modal. Added a regression test ("auto-closes the modal when the session completes underneath it (WR-01)") inside the `SESS-05 regression with fake timers` block that opens the modal mid-session, advances past the planned `totalMs`, and asserts both that the dialog has gone and that the post-session state ("Session complete", Start button visible) is reached. Test count went from 78 → 79.

### WR-02: `EndSessionDialog` re-binds the cancel listener on every parent render

**Files modified:** `src/app/App.tsx`
**Commit:** `c8a3cf0`
**Applied fix:** Wrapped `confirmEnd` and `cancelEnd` in `useCallback`. **Important deviation from the review's suggested deps:** the review proposed `[session]`, but `useSessionEngine` returns a fresh object literal every render, so `[session]` would NOT memoize. I depend on `session.end` directly (`const sessionEnd = session.end`), because `session.end` is itself wrapped in `useCallback([])` inside `useSessionEngine.ts:87-95` and is therefore truly stable. The result: `confirmEnd` and `cancelEnd` are now identity-stable across renders, so `EndSessionDialog`'s `useEffect([onCancel])` no longer tears down and re-attaches the cancel listener on every animation-frame tick.

### WR-03: Inner reference ring centering relies on implicit grid auto-positioning

**Files modified:** `src/components/BreathingShape.tsx`
**Commit:** `40a63ba`
**Applied fix:** Added `left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2` to the inner ring's class list. Centering is now driven by explicit positioning + transform offset, which is unambiguous in every layout mode (and matches the spec for non-grid contexts). Older Safari and any renderer that anchors absolutely-positioned grid children to the grid container's content-box origin will now render the inner ring concentric with the orb, same as the outer ring. Existing tests still pass; the change is purely a CSS positioning hardening.

### WR-04: Duplicate `aria-label="Session readout"` on nested regions

**Files modified:** `src/components/SessionReadout.tsx`, `src/app/App.session.test.tsx`, `src/app/App.dialog.test.tsx`
**Commit:** `c5570f5`
**Applied fix:** Renamed the inner `<div role="status">`'s `aria-label` from `"Session readout"` (duplicated the outer section's name) to `"Session announcement"`. **Deviation from the review's first-choice fix (drop the aria-label entirely):** the unnamed approach was attempted first but failed — the page contains other implicit `role="status"` elements (the form's `<output>` sliders for BPM and Ratio), so an unnamed `getByRole('status')` query was ambiguous and 5 tests broke. Renaming preserves the find-by-name pattern while disambiguating the two nested regions. Updated 4 test sites in lockstep (`App.session.test.tsx` × 3, `App.dialog.test.tsx` × 1) to query for `'Session announcement'`. Added a comment in `SessionReadout.tsx` documenting the naming rationale.

## Round 2 (INFO) — fixed 2026-05-09T15:23:00Z

### IN-01: `MID_SCALE` is duplicated between component and CSS token

**Files modified:** `src/components/BreathingShape.tsx`, `src/styles/theme.css`
**Commit:** `dd3e134`
**Applied fix:** Added cross-reference "keep in sync" comments on both sides — the TS constants `MIN_SCALE`/`MAX_SCALE`/`MID_SCALE` in `BreathingShape.tsx` annotate which CSS token they mirror (`--orb-scale-min`/`--orb-scale-max`/`--orb-scale-mid`), and the CSS tokens annotate the same in reverse. The TS side drives the breathing math; the CSS side is consumed by stylesheet fallbacks (e.g. the `transform: scale(var(--orb-scale-mid))` reduced-motion path). **Deviation from the review's first-choice fix:** the review suggested reading the CSS variable from the component at mount via `getComputedStyle(document.documentElement).getPropertyValue(...)`. That approach was rejected because (a) it introduces a runtime dependency on the document being painted before the math runs, (b) it would break SSR/test harnesses that already assume the constants are pure, and (c) the values are dimensionless small numbers used in arithmetic — string-parsing them on every mount is more failure-prone than the documented mirror. The `// keep in sync` comment-pair was the review's explicit fallback option.

### IN-02: `usePrefersReducedMotion` does not re-sync against `mql.matches` inside the effect

**Files modified:** `src/hooks/usePrefersReducedMotion.ts`, `src/hooks/usePrefersReducedMotion.test.ts`
**Commit:** `b980093`
**Applied fix:** Added `setReduced(mql.matches)` inside the mount effect, before the `'change'` subscription is attached — the canonical pattern from MDN. The `useState` initializer captures `matchMedia(QUERY).matches` at first render; if the OS preference changes between the render commit and the effect mount (rare on this codebase since SSR is not used, but real), the hook would otherwise return the stale initial value until the next change event. Added a regression test ("re-syncs against mql.matches inside the mount effect (IN-02)") that simulates the drift case via a `vi.spyOn(window, 'matchMedia')` mock that flips `matches` between the useState-initializer call and the effect call, then asserts the hook returns the post-effect value. Test count went from 79 → 80.

### IN-03: Test 'does not show the modal when open=false' is conditional and weakly asserting

**Files modified:** `src/app/App.dialog.test.tsx`
**Commit:** `15c5c2b`
**Applied fix:** Replaced the `if (dialog) { expect(...) }` wrapper with an unconditional contract assertion. Since a closed native `<dialog>` exposes no accessible role, `queryByRole('dialog', ...)` returned `null` and the original test passed without ever reaching its only assertion. New test queries the DOM directly via `container.querySelector('dialog')`, asserts the element exists (`not.toBeNull()`), and asserts `(dialog as HTMLDialogElement).open === false` unconditionally. Test count unchanged (80 → 80) — same test, stricter assertions.

### IN-04: `BreathingShape` calls `usePrefersReducedMotion` even when it returns null

**Files modified:** `src/components/BreathingShape.tsx`
**Commit:** `4427fbd`
**Applied fix:** Split `BreathingShape` into a thin wrapper that early-returns `null` when `frame === null`, plus an inner `BreathingShapeBody` that owns the `usePrefersReducedMotion` subscription. The matchMedia subscription is now scoped to active sessions only — on the idle screen the hook never mounts. Hooks-rules-of-React are still satisfied because each component calls its hooks unconditionally. Test count unchanged (80 → 80) — pure refactor, no behavior change.

---

_Fixed: 2026-05-09T15:23:00Z_
_Fixer: Claude (gsd-code-fixer)_
_Iteration: 2_
