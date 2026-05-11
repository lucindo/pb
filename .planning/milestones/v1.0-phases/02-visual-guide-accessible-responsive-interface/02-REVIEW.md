---
phase: 02-visual-guide-accessible-responsive-interface
reviewed: 2026-05-09T00:00:00Z
depth: standard
files_reviewed: 14
files_reviewed_list:
  - src/hooks/usePrefersReducedMotion.ts
  - src/hooks/usePrefersReducedMotion.test.ts
  - src/components/BreathingShape.tsx
  - src/components/EndSessionDialog.tsx
  - src/components/SettingsForm.tsx
  - src/components/SettingsStepper.tsx
  - src/components/SessionControls.tsx
  - src/components/SessionReadout.tsx
  - src/styles/theme.css
  - src/app/App.tsx
  - src/app/App.dialog.test.tsx
  - src/app/App.session.test.tsx
  - src/app/App.settings.test.tsx
  - vitest.setup.ts
findings:
  critical: 1
  warning: 4
  info: 4
  total: 9
status: issues_found
---

# Phase 02: Code Review Report

**Reviewed:** 2026-05-09
**Depth:** standard
**Files Reviewed:** 14
**Status:** issues_found

## Summary

Phase 02 implements the refined breathing-orb visual, the reduced-motion hook, focus/hit-area accessibility polish, and the native `<dialog>`-based end-session confirmation. The code is generally clean, well-tested, and idiomatic React 19 + TS strict.

One BLOCKER was found: the `@media (prefers-reduced-motion: reduce)` rule in `theme.css` uses `transform: none !important` on `.orb`, which silently overrides the inline `transform: scale(0.79)` that `BreathingShape` sets when `usePrefersReducedMotion()` is true. The result is that under user reduced-motion preference the orb renders at full 1.0 scale (visually wrong against D-06), even though the existing tests pass because they only assert the inline `style.transform` string and never check the resolved/computed style.

Additional warnings flag (a) the modal staying open and visually stale if the timed session auto-completes while the modal is showing (no synchronization between `state.status === 'complete'` and `endDialogOpen`), (b) effect-thrashing in `EndSessionDialog` because `App` recreates `onCancel`/`onConfirm` every render, (c) the inner reference ring relying on grid auto-positioning for centering with no explicit insets, and (d) double aria-label on the readout region (both `<section>` and inner `<div role="status">` carry `aria-label="Session readout"`).

## Critical Issues

### CR-01: Reduced-motion CSS overrides the JS-applied orb scale via `!important`

**File:** `src/styles/theme.css:87-93` (and `src/components/BreathingShape.tsx:54-57` for the conflicting inline style)
**Issue:**
The `@media (prefers-reduced-motion: reduce)` block sets `transform: none !important` on `.orb`. `BreathingShape` sets the reduced-motion fixed scale via `style={{ transform: \`scale(${MID_SCALE})\` }}` (where `MID_SCALE = 0.79`). Inline styles do NOT win over a stylesheet rule that uses `!important`, so under a real user `prefers-reduced-motion: reduce` setting the orb collapses to `transform: none` (effectively `scale(1)`), not the intended D-06 mid-scale.

The existing test (`src/app/App.session.test.tsx:144`) asserts `scaleHost!.style.transform` (the inline `style` attribute string), not `getComputedStyle(...).transform`. The inline attribute is correct, so the test passes — but the rendered visual is wrong. This is a contract bug between the styling and the JSX.

`MID_SCALE` is also encoded twice (`BreathingShape.tsx:12` and `theme.css:15` `--orb-scale-mid: 0.79`), so they will drift if either side is edited.

**Fix:** Remove `transform` from the reduced-motion override (keep `transition: none !important`) and let the JS-controlled inline `transform` carry the fixed scale. The CSS guarantee we need is "no transition animation," not "no transform at all." Also collapse the duplicated constant by reading the CSS token from the component (or vice versa).

```css
/* src/styles/theme.css */
@media (prefers-reduced-motion: reduce) {
  .breathing-shape,
  .orb {
    transition: none !important;
    /* Do NOT set `transform: none !important` — the inline `transform: scale(var(--orb-scale-mid))`
       set by BreathingShape under reduced-motion would be silently nuked. */
  }
}
```

Recommended additional regression test (asserts the *resolved* scale, not just the inline string):

```ts
// src/app/App.session.test.tsx — add inside the reduced-motion describe
it('does not let CSS override the JS-applied reduced-motion scale (CR-01)', async () => {
  vi.spyOn(window, 'matchMedia').mockReturnValue({
    matches: true, media: '(prefers-reduced-motion: reduce)', onchange: null,
    addEventListener: () => {}, removeEventListener: () => {},
    addListener: () => {}, removeListener: () => {}, dispatchEvent: () => false,
  } as unknown as MediaQueryList)

  const user = userEvent.setup()
  render(<App />)
  await user.click(screen.getByRole('button', { name: 'Start session' }))

  const scaleHost = screen
    .getByRole('img', { name: 'Breathing shape: In' })
    .querySelector<HTMLElement>('.orb')!
  // The resolved transform must reflect MID_SCALE, not be wiped out by `!important`.
  expect(getComputedStyle(scaleHost).transform).not.toBe('none')
})
```

## Warnings

### WR-01: Modal can outlive the running session if the timer auto-completes while it is open

**File:** `src/app/App.tsx:14-34`
**Issue:**
`requestEnd` opens the confirmation modal but explicitly leaves the session running (D-13 — the timing clock keeps advancing while the modal is open, verified in `App.dialog.test.tsx:213-240`). However nothing closes the modal when the session transitions on its own from `running` → `complete` due to the timer reaching the end. The modal will keep displaying "End this session?" over a "Session complete" readout; clicking "End" then calls `session.end()` against an already-complete session (which does work — `endSession` accepts both `running` and `complete`), but the user-visible state is incoherent for an arbitrary window of time.

Note that the test in `App.dialog.test.tsx:213-240` only advances 1 second and then explicitly closes the modal by pressing "Keep going". It does not exercise the case where the session completes underneath an open modal.

**Fix:** Auto-close the dialog when the session is no longer running. Either:

```tsx
// src/app/App.tsx
useEffect(() => {
  if (state.status !== 'running' && endDialogOpen) {
    setEndDialogOpen(false)
  }
}, [state.status, endDialogOpen])
```

…or, more conservative, don't open the dialog at all when not running and dismiss on transition:

```tsx
const requestEnd = () => {
  if (state.status === 'running' && state.lockedSettings.durationMinutes !== 'open-ended') {
    setEndDialogOpen(true)
    return
  }
  setEndDialogOpen(false)
  session.end()
}
```

Add a regression test that advances `vi.advanceTimersByTime` past the planned `totalMs` while the dialog is open and asserts both the dialog and the running button are gone.

### WR-02: `EndSessionDialog` re-binds the cancel listener on every parent render

**File:** `src/components/EndSessionDialog.tsx:28-39`, `src/app/App.tsx:26-34`
**Issue:**
The `useEffect` in `EndSessionDialog` depends on `[onCancel]`. `App` defines `confirmEnd` and `cancelEnd` as fresh function references on every render (no `useCallback`). Every time `App` re-renders (which happens roughly every animation frame while a session is running, because `useSessionEngine`'s `useEffect` `setState`'s on each `tick`), the `EndSessionDialog` effect tears down and re-attaches the `cancel` listener. While running, this is hundreds of `addEventListener` / `removeEventListener` calls per second — wasteful and a soft memory-churn risk on long sessions.

Functionally there is no bug — the listener is always present and the cleanup runs in the right order — but this is exactly the failure mode that `useCallback` exists to prevent.

**Fix:** Memoize the dialog handlers in `App.tsx` and/or use a ref-stable handler inside the dialog.

```tsx
// src/app/App.tsx
const confirmEnd = useCallback(() => {
  setEndDialogOpen(false)
  session.end()
}, [session])

const cancelEnd = useCallback(() => {
  setEndDialogOpen(false)
}, [])
```

Or, inside `EndSessionDialog`, route through a ref so the effect does not depend on the prop identity:

```tsx
const onCancelRef = useRef(onCancel)
useEffect(() => { onCancelRef.current = onCancel }, [onCancel])

useEffect(() => {
  const dialog = dialogRef.current
  if (!dialog) return
  const handleCancel = (event: Event) => {
    event.preventDefault()
    onCancelRef.current()
  }
  dialog.addEventListener('cancel', handleCancel)
  return () => dialog.removeEventListener('cancel', handleCancel)
}, []) // bind once
```

### WR-03: Inner reference ring centering relies on implicit grid auto-positioning

**File:** `src/components/BreathingShape.tsx:44-52`
**Issue:**
The outer ring uses `absolute inset-0` (explicitly anchored to all four sides) and is therefore always concentric with the orb. The inner ring uses `absolute rounded-full` with only `width: 58%; height: 58%` — no `inset`, `top`, or `left`. The visual centering relies on the parent's `grid place-items-center` placing the static position of the absolutely-positioned child at the grid cell center, which most modern browsers honor, but the spec is genuinely ambiguous for absolutely-positioned grid items and several real-world renderers (older Safari in particular) anchor such children to the grid container's content-box origin instead.

There is no test that asserts the centering — `App.session.test.tsx:80-83` only checks that the elements exist, not where they render.

**Fix:** Position the inner ring explicitly with `inset` + transform centering, which is unambiguous in every layout mode:

```tsx
{/* D-04: inner reference ring at MIN_SCALE boundary */}
<span
  aria-hidden="true"
  className="orb-ring--inner absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 rounded-full border-solid"
  style={{
    width: `${MIN_SCALE * 100}%`,
    height: `${MIN_SCALE * 100}%`,
  }}
/>
```

### WR-04: Duplicate `aria-label="Session readout"` on nested regions

**File:** `src/components/SessionReadout.tsx:20-28`
**Issue:**
The outer `<section aria-label="Session readout">` and the inner `<div role="status" aria-label="Session readout">` both carry the same accessible name. Tests deliberately rely on this (`getByRole('region', { name: 'Session readout' })` and `getByRole('status', { name: 'Session readout' })` in the same test file), but for an actual screen reader user the structure produces two regions with the same name nested inside each other — the AT will commonly announce "Session readout, region, Session readout, status …" on entry. The status live region in particular should be named for what it announces ("Session status" or be unnamed and rely on its content), not duplicated with its parent.

**Fix:** Drop the `aria-label` on the inner status region, or rename it to disambiguate from the outer region. The test selectors should be updated in lockstep.

```tsx
<div role="status" aria-live="polite" aria-atomic="true">
  {message ? <p ...>{message}</p> : null}
</div>
```

If the existing test contract must hold for now, at minimum add a `// FIXME` referencing this finding so the next a11y pass picks it up.

## Info

### IN-01: `MID_SCALE` is duplicated between component and CSS token

**File:** `src/components/BreathingShape.tsx:12`, `src/styles/theme.css:15`
**Issue:** `MID_SCALE = (MIN_SCALE + MAX_SCALE) / 2` evaluates to `0.79` and is also encoded in `--orb-scale-mid: 0.79`. If either is edited the two will drift silently. Same drift risk applies to `MIN_SCALE`/`MAX_SCALE` vs `--orb-scale-min`/`--orb-scale-max`.

**Fix:** Read the CSS variable from the component (e.g., `getComputedStyle(document.documentElement).getPropertyValue('--orb-scale-mid')`) on mount, or define the constants in one TS module that emits them as a `<style>` block. At minimum, leave a `// keep in sync with --orb-scale-mid` comment on both sides.

### IN-02: `usePrefersReducedMotion` does not re-sync against `mql.matches` inside the effect

**File:** `src/hooks/usePrefersReducedMotion.ts:13-25`
**Issue:** The `useState` initializer captures `matchMedia(QUERY).matches` at first render. The mount effect subscribes for future changes via `addEventListener('change', …)` but does not seed the state with `mql.matches` again. If the OS preference changed between the initial render commit and the effect mount (real, but rare on this codebase since SSR is not used), the hook will return a stale value until the next change event fires.

**Fix:** Re-sync inside the effect. This is the canonical pattern from MDN and Mantine's example.

```ts
useEffect(() => {
  if (typeof window === 'undefined' || !window.matchMedia) return
  const mql = window.matchMedia(QUERY)
  setReduced(mql.matches) // re-seed in case it drifted between render and mount
  const onChange = (event: MediaQueryListEvent) => setReduced(event.matches)
  mql.addEventListener('change', onChange)
  return () => mql.removeEventListener('change', onChange)
}, [])
```

### IN-03: Test `does not show the modal when open=false` is conditional and weakly asserting

**File:** `src/app/App.dialog.test.tsx:22-29`
**Issue:** The assertion is wrapped in `if (dialog) { … }` — if `queryByRole('dialog', { name: ... })` returns `null` (which it will for a closed `<dialog>`), the test passes without asserting anything. It would also pass if the dialog were missing for a different reason. This is an "always-green" risk.

**Fix:** Assert the closed-dialog contract directly. Either query by an attribute or query the DOM via a stable test id, then assert `.open === false`:

```tsx
it('does not show the modal when open=false', () => {
  const { container } = renderDialog({ open: false })
  const dialog = container.querySelector('dialog') as HTMLDialogElement | null
  expect(dialog).not.toBeNull()
  expect(dialog!.open).toBe(false)
})
```

### IN-04: `BreathingShape` calls `usePrefersReducedMotion` even when it returns null

**File:** `src/components/BreathingShape.tsx:14-18`
**Issue:** When `frame === null` (idle), the component still mounts the `usePrefersReducedMotion` hook, which subscribes to `matchMedia` for the lifetime of the idle screen. This is required for hooks ordering (the hook must be called unconditionally before the early return — current code is correct), but it is also unnecessary work because the hook's value is unused on the null branch.

**Fix:** Either accept the cost (it is real but tiny) or split the orb into a wrapper that decides whether to render the body, with the hook living inside the body component that only mounts when there is a frame to render. This keeps the subscription scoped to active sessions.

```tsx
export function BreathingShape({ frame }: BreathingShapeProps) {
  if (frame === null) return null
  return <BreathingShapeBody frame={frame} />
}

function BreathingShapeBody({ frame }: { frame: SessionFrame }) {
  const reducedMotion = usePrefersReducedMotion()
  // … rest of the existing render …
}
```

---

_Reviewed: 2026-05-09_
_Reviewer: Claude (gsd-code-reviewer)_
_Depth: standard_
