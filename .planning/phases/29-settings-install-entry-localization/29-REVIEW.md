---
phase: 29-settings-install-entry-localization
reviewed: 2026-05-16T00:00:00Z
depth: standard
files_reviewed: 7
files_reviewed_list:
  - src/app/App.tsx
  - src/components/InstallBanner.tsx
  - src/components/IosInstallSteps.test.tsx
  - src/components/IosInstallSteps.tsx
  - src/components/SettingsDialog.test.tsx
  - src/components/SettingsDialog.tsx
  - src/content/strings.ts
findings:
  critical: 0
  warning: 3
  info: 4
  total: 7
status: issues_found
---

# Phase 29: Code Review Report

**Reviewed:** 2026-05-16T00:00:00Z
**Depth:** standard
**Files Reviewed:** 7
**Status:** issues_found

## Summary

Phase 29 extracts the iOS install step list into a shared `IosInstallSteps`
component and adds an install entry row to `SettingsDialog`, with localized
strings for both EN and PT-BR. The diff is small and the implementation is
generally sound: the shared component is correctly parameterized with a unique
`id` prop, prop drilling from `App.tsx` is consistent, and the new strings are
fully typed in both locales.

No critical (BLOCKER) issues found — no security defects, no crashes, no data
loss paths. Three WARNING-level defects exist: a stale-state bug where the iOS
expander does not reset across dialog open/close cycles, an install-row that
disappears under the user's cursor after an Android install, and a missing test
for the most important Settings-install behavior (the disabled state during a
session). Four INFO items cover minor quality concerns.

## Warnings

### WR-01: `iosExpanded` state is not reset when SettingsDialog closes

**File:** `src/components/SettingsDialog.tsx:44`
**Issue:** `iosExpanded` is component-local `useState` that lives for the entire
mounted lifetime of `SettingsDialog`. The dialog is never unmounted — `App.tsx`
keeps `<SettingsDialog>` in the tree always and toggles visibility via the
`open` prop and the imperative `showModal()` / `close()` effect (lines 48-64).
Consequently, if an iOS user expands the install steps, closes the dialog, and
re-opens it, the steps are still expanded from the previous session. The
disclosure button's `aria-expanded` will correctly read `true`, but the user
expected a fresh (collapsed) dialog. This also means the `aria-live="polite"`
region in `IosInstallSteps` is present in the DOM immediately on re-open rather
than being announced as a fresh expansion.
**Fix:** Reset `iosExpanded` to `false` when the dialog transitions to closed.
Add to the existing open/close effect:
```tsx
} else if (!open && dialog.open) {
  dialog.close()
  setIosExpanded(false)  // reset disclosure so a re-open starts collapsed
}
```
Note `InstallBanner.tsx` does not have this problem — it is conditionally
mounted/unmounted by the `showBanner` gate in `App.tsx`, so its `iosExpanded`
state is destroyed and recreated each time.

### WR-02: Android install row vanishes under the cursor after a successful install

**File:** `src/components/SettingsDialog.tsx:107`, `src/app/App.tsx:827`
**Issue:** The install row visibility is `installable && !isStandalone`, where
`installable = isIOS || deferredPrompt !== null` is computed in `App.tsx:827`.
On Android, after the user clicks the install button, `triggerInstall()` calls
`deferredPrompt.prompt()` and then `setDeferredPrompt(null)`
(`useBeforeInstallPrompt.ts`). On the next render `installable` becomes `false`
and the entire install row unmounts — while the SettingsDialog itself stays
open. The user's focus was on the (now-removed) install button; native
`<dialog>` focus is left dangling and the dialog content visibly shifts. If the
user *dismissed* the native prompt (outcome `'dismissed'`), the row also
disappears even though no install happened, giving no way to retry without
closing and reopening Settings.
**Fix:** Either keep the row visible after `prompt()` is consumed (track a
separate "install completed" flag and only hide on confirmed `appinstalled`),
or, at minimum, close the SettingsDialog as part of the install action so the
content does not mutate under the user. Closing the dialog on install click is
the smaller change:
```tsx
onClick={() => { void onInstall(); onClose() }}
```

### WR-03: No test covers the install row / iOS toggle disabled state during a session

**File:** `src/components/SettingsDialog.test.tsx:165-202`
**Issue:** `SettingsDialog.tsx` threads `disabled={inSessionView}` onto both the
iOS steps-toggle button (line 119) and the Android install button (line 130).
The phase's stated invariant is that all interactive Settings controls are
inert during a session (Landmine 7 — every picker receives `disabled`). The new
`install row` describe block exercises `installable`, `isStandalone`, `isIOS`,
and the click handlers, but never renders with `inSessionView: true`, so the
`disabled` wiring on the two install buttons is completely unverified. A
regression that drops `disabled={inSessionView}` from either button would let a
user trigger `onInstall()` mid-session and ship green.
**Fix:** Add a test in the install-row describe block:
```tsx
it('install button is disabled during a session (inSessionView=true)', () => {
  renderDialog({ open: true, installable: true, isIOS: false, inSessionView: true })
  expect(screen.getByRole('button', { name: EN_STRINGS_FIXTURE.install.installButton }))
    .toBeDisabled()
})
it('iOS steps-toggle is disabled during a session (inSessionView=true)', () => {
  renderDialog({ open: true, installable: true, isIOS: true, inSessionView: true })
  expect(screen.getByRole('button', { name: EN_STRINGS_FIXTURE.install.iosStepsButton }))
    .toBeDisabled()
})
```

## Info

### IN-01: `onInstall` rejection is swallowed silently in both consumers

**File:** `src/components/InstallBanner.tsx:59`, `src/components/SettingsDialog.tsx:131`
**Issue:** Both call sites invoke the install action as `() => { void onInstall() }`.
`onInstall` is typed `Promise<void>` and `triggerInstall` awaits
`deferredPrompt.prompt()`, which can reject (browser-internal failure). The
`void` discards the promise, so a rejection becomes an unhandled promise
rejection with no user-visible feedback. The current `triggerInstall` body
happens not to throw on the no-op path, but the type contract allows rejection
and a future change to `prompt()` handling would surface here.
**Fix:** Attach a catch at the call site, e.g.
`onClick={() => { onInstall().catch(() => {}) }}`, or have `triggerInstall`
guarantee it never rejects (wrap the `prompt()` call in try/catch).

### IN-02: `IosInstallSteps` is rendered in two places with two hardcoded ids — collision is one edit away

**File:** `src/components/InstallBanner.tsx:77`, `src/components/SettingsDialog.tsx:125`
**Issue:** The shared component was correctly built to take an `id` prop so no
literal is baked into `IosInstallSteps` itself (Pitfall 3). But the two
consumers each hardcode their own literal — `"install-ios-steps"` and
`"settings-ios-steps"` — and the matching `aria-controls` literals are repeated
separately on the toggle buttons (`InstallBanner.tsx:50`,
`SettingsDialog.tsx:118`). The banner and the dialog can both be in the DOM at
the same time (idle + Settings open), so if a future edit accidentally aligns
the two literals, two elements would share an id and `aria-controls` would be
ambiguous, with no test catching it. Consider deriving the `id` from a shared
constant or `useId()` so the toggle button and the steps container cannot drift
apart.
**Fix:** Low priority. Co-locate each `id`/`aria-controls` pair as a single
`const` per consumer, or use React's `useId()` and pass the same value to both
`aria-controls` and the `IosInstallSteps` `id` prop.

### IN-03: `IosInstallSteps` test does not assert step ordering or the `<ol>` semantics

**File:** `src/components/IosInstallSteps.test.tsx:18-23`
**Issue:** The component's WR-04 comment states the ordered-list semantics are
load-bearing (sequential steps conveyed to assistive tech via `<ol>`). The test
asserts all three step texts are present and the SVG exists, but never asserts
the container is an `<ol>` / `list-decimal`, nor that the steps appear in
1-2-3 order. A refactor to an unordered `<ul>` or a `<div>` stack would not be
caught.
**Fix:** Add `expect(container.querySelector('ol')).not.toBeNull()` and assert
the three `<li>` texts appear in document order.

### IN-04: `IosInstallSteps` first `<li>` has an explicit color class the other two lack

**File:** `src/components/IosInstallSteps.tsx:21-27`
**Issue:** The first `<li>` carries
`className="text-[var(--color-breathing-accent-strong)]"` while `<li>` 2 and 3
have no className and inherit the parent `<div>`'s default text color. This is
an inconsistent style with no stated reason — likely a copy artifact from the
pre-extraction `InstallBanner` markup. It produces a subtly two-toned step list
(step 1 visually emphasized, steps 2-3 muted). Either apply the color
uniformly to all three steps or remove it from step 1 for a consistent list.
**Fix:** Move the color class to the parent `<ol>` (or `<div>`) so all steps
render identically, or drop it.

---

_Reviewed: 2026-05-16T00:00:00Z_
_Reviewer: Claude (gsd-code-reviewer)_
_Depth: standard_
