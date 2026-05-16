---
phase: 28-phone-install-banner
reviewed: 2026-05-16T00:00:00Z
depth: standard
files_reviewed: 11
files_reviewed_list:
  - src/content/strings.ts
  - src/storage/installDismissed.ts
  - src/storage/installDismissed.test.ts
  - src/storage/index.ts
  - src/hooks/useBeforeInstallPrompt.ts
  - src/hooks/useBeforeInstallPrompt.test.ts
  - src/hooks/useIsStandaloneOrPhone.ts
  - src/hooks/useIsStandaloneOrPhone.test.ts
  - src/components/InstallBanner.tsx
  - src/components/InstallBanner.test.tsx
  - src/app/App.tsx
findings:
  critical: 1
  warning: 6
  info: 4
  total: 11
status: issues_found
---

# Phase 28: Code Review Report

**Reviewed:** 2026-05-16T00:00:00Z
**Depth:** standard
**Files Reviewed:** 11
**Status:** issues_found

## Summary

Phase 28 adds a phone install banner: a dismissal-persistence storage module, two
detection hooks (`useBeforeInstallPrompt`, `useIsStandaloneOrPhone`), a presentational
`InstallBanner` component, and the `showBanner` gate wiring in `App.tsx`.

The storage module and `useBeforeInstallPrompt` hook are sound and well-tested. The
main concerns cluster around the `isIOS` detection in `App.tsx`, which is functionally
wrong on installed iOS PWAs and is not memoized, plus several accessibility and
robustness gaps in `InstallBanner.tsx`. One BLOCKER: the iOS detection produces an
incorrect `isIOS` value on iOS once the app is installed, which feeds the banner gate
and the component branch.

## Critical Issues

### CR-01: `isIOS` detection is logically inverted relative to its intent on installed iOS PWAs

**File:** `src/app/App.tsx:195-197`
**Issue:** `isIOS` is derived as:
```ts
const isIOS = (navigator as SafariNavigator).standalone !== undefined
```
`navigator.standalone` is an Apple-specific property that is **only defined on iOS
Safari**, so `!== undefined` does correctly distinguish iOS Safari from other browsers.
However, the value carried by `navigator.standalone` is a *boolean* — it is `false` in
a normal Safari tab and `true` when the app is already running as a home-screen PWA. In
both cases the property *exists*, so `isIOS` is `true` in both — which is the intent.

The real defect is the interaction with the rest of the gate. `showBanner` is:
```ts
isPhone && !isStandalone && !installDismissed && appPhase === 'idle' && (isIOS || deferredPrompt !== null)
```
`useIsStandaloneOrPhone` sets `isStandalone` partly from `navigator.standalone === true`.
On an installed iOS PWA, `isStandalone` is `true`, so `!isStandalone` already excludes
that case — good. But the deeper problem is **non-iOS coverage**: on Android Chrome and
all desktop browsers `navigator.standalone` is `undefined`, so `isIOS` is `false` there,
which is correct. The genuinely broken case is **iPadOS 13+ in desktop-mode Safari**,
where `navigator.standalone` can be `undefined` even though the device is an iPad — there
`isIOS` is `false` and the banner falls through to the Android branch
(`deferredPrompt !== null`), which never fires on Safari, so the iPad user gets **no
install affordance at all**. Conversely, any future browser that exposes a `standalone`
property would be misclassified as iOS and shown the manual iOS steps with no working
Android prompt.

Detection should not rely on the mere *existence* of `navigator.standalone`. Use an
explicit platform check (user-agent or feature detection of the share/`beforeinstallprompt`
absence) and centralize it, rather than a `!== undefined` probe.
**Fix:**
```ts
// Centralize in useIsStandaloneOrPhone (or a dedicated useIsIOS hook), not inline in App.
function detectIsIOS(): boolean {
  const ua = navigator.userAgent
  // iPhone / iPod, plus iPadOS which reports as Mac with touch points.
  return /iP(hone|od|ad)/.test(ua) ||
    (/Macintosh/.test(ua) && navigator.maxTouchPoints > 1)
}
```
Then derive `isIOS` once from that and pass it down. Do not infer iOS from the presence
of `navigator.standalone`.

## Warnings

### WR-01: `isIOS` is recomputed on every render and the `SafariNavigator` interface is declared inside the component body

**File:** `src/app/App.tsx:196-197`
**Issue:** `interface SafariNavigator extends Navigator { standalone?: boolean }` is
declared inside the `App` function body, and `isIOS` is computed inline on every render.
`App` re-renders on every animation frame during a running session. The interface
declaration is hoisted by TS so it is harmless at runtime, but recomputing `isIOS`
each frame is wasteful and inconsistent with the rest of the file, which carefully
memoizes/hoists everything (`initialSettings`, `audioStop`, etc.). It also duplicates
the identical `SafariNavigator` interface already declared in
`useIsStandaloneOrPhone.ts:3-5`.
**Fix:** Move the `SafariNavigator` interface to module scope (or reuse the hook's), and
either compute `isIOS` inside `useIsStandaloneOrPhone` (it already owns
`navigator.standalone` access) and return it, or wrap it in `useMemo(() => ..., [])`.

### WR-02: `InstallBanner` `<img>` has no error handling — a broken icon renders a broken-image glyph in the banner

**File:** `src/components/InstallBanner.tsx:28-32`
**Issue:** The banner renders `<img src={`${import.meta.env.BASE_URL}pwa-192x192.png`} ... />`
with no `onError` fallback. If the icon asset is missing, mis-pathed under a non-root
`BASE_URL`, or blocked, the user sees the browser's broken-image placeholder embedded in
a polished banner. The rest of the app uses inline SVG glyphs (per the comment at
line 79) specifically to avoid asset-loading fragility.
**Fix:** Either add `onError` to hide the image (`e.currentTarget.style.display = 'none'`)
or use an inline SVG / decorative element so the banner degrades cleanly. At minimum
mark it decorative if the text already conveys the meaning.

### WR-03: iOS expand button is not associated with the region it controls — missing `aria-expanded` / `aria-controls`

**File:** `src/components/InstallBanner.tsx:36-43, 64-74`
**Issue:** The "How to install" button toggles `iosExpanded`, which conditionally renders
the steps `<div>`. The button exposes no `aria-expanded` state and no `aria-controls`
pointing at the steps container, and the steps `<div>` has no `id`. Screen-reader users
get no indication that the button is a disclosure control or whether it is currently
open. The `aria-live="polite"` on the steps container partially mitigates this, but a
disclosure pattern requires `aria-expanded`.
**Fix:**
```tsx
<button
  type="button"
  aria-expanded={iosExpanded}
  aria-controls="install-ios-steps"
  onClick={() => { setIosExpanded(prev => !prev) }}
  ...
>
...
{isIOS && iosExpanded && (
  <div id="install-ios-steps" aria-live="polite" ...>
```

### WR-04: iOS step list is rendered as loose `<p>` tags, not an ordered list — numbered steps lose their semantics

**File:** `src/components/InstallBanner.tsx:64-74`
**Issue:** `iosStep1/2/3` are sequential instructions ("Tap Share", then "Add to Home
Screen", then "Add") but are rendered as three sibling `<p>` elements. There is no visible
or programmatic ordering, no step numbers — a screen-reader user hears three unrelated
sentences. The strings themselves contain no "1./2./3." prefixes either.
**Fix:** Render as an `<ol>` with `<li>` items so the ordinal relationship is conveyed
both visually and to assistive tech.

### WR-05: `truncate` on the banner text can silently hide the install message on small viewports

**File:** `src/components/InstallBanner.tsx:33-35`
**Issue:** The banner text span uses `flex-1 truncate`. With a 32px icon, an action button
("How to install" is fairly wide), and a 44px dismiss button competing for width on a
narrow phone (320px-class devices), `truncate` can clip "Add to your home screen for
offline use" to "Add to your home scre…", defeating the banner's entire purpose. The
PT-BR string ("Adicione à sua tela inicial para uso offline") is longer and more likely
to clip.
**Fix:** Allow the text to wrap (`break-words` / remove `truncate`) and let the banner
grow vertically, or move the text to its own row above the action row. Truncating the
single most important sentence is the wrong failure mode.

### WR-06: `aria-label="Install app"` on the banner region is hardcoded English — not localized

**File:** `src/components/InstallBanner.tsx:23`
**Issue:** The component receives a fully-localized `strings` object (`UiStrings['install']`)
and uses it for every visible string, but the region's `aria-label="Install app"` is a
hardcoded English literal. A PT-BR user with a screen reader hears an English region
label in an otherwise localized UI. The test at `InstallBanner.test.tsx:80-83` hardcodes
the same English string, so this will not be caught by the suite.
**Fix:** Add an `install.regionLabel` entry to `UiStrings['install']` (with EN and PT-BR
values) and use `aria-label={strings.regionLabel}`. Update the test to read from
`UI_STRINGS`.

## Info

### IN-01: `BeforeInstallPromptEvent` interface omits `userChoice` and is narrower than the platform event

**File:** `src/hooks/useBeforeInstallPrompt.ts:5-7`
**Issue:** The locally declared `BeforeInstallPromptEvent` types `prompt()` as returning
`Promise<{ outcome: ... }>`. The real platform `prompt()` returns `Promise<void>`; the
outcome is read from the separate `event.userChoice` promise. The current code happens
to work in Chrome because `prompt()`'s resolution value is non-standardly populated, but
this is browser-implementation-dependent and may break. The standards-compliant path is
`await e.prompt(); const { outcome } = await e.userChoice;`.
**Fix:** Type both `prompt(): Promise<void>` and `userChoice: Promise<{ outcome: ... }>`
and read the outcome from `userChoice`.

### IN-02: `import` statements appear after a top-of-file `interface` declaration

**File:** `src/hooks/useBeforeInstallPrompt.ts:5-10` and `src/hooks/useIsStandaloneOrPhone.ts:3-7`
**Issue:** Both hooks declare a local `interface` before their `import` statements. This
is legal TS (imports are hoisted) and the comment explains the placement, but it is
inconsistent with the convention everywhere else in the codebase where imports lead the
file. Minor readability/lint-consistency cost.
**Fix:** Move the `import` lines above the interface declaration; keep the explanatory
comment with the interface.

### IN-03: `InstallBanner` icon `alt` text is hardcoded English

**File:** `src/components/InstallBanner.tsx:31`
**Issue:** `alt="HRV app icon"` is a hardcoded English literal in an otherwise localized
component. Lower impact than WR-06 (the text duplicates info already in `bannerText`),
but if WR-02 is resolved by keeping the image, the `alt` should be localized or set to
`""` (decorative) since `bannerText` already conveys the meaning.
**Fix:** Set `alt=""` (decorative — `bannerText` carries the meaning) or add a localized
string.

### IN-04: PT-BR install copy is explicitly marked DRAFT and shipping in this phase

**File:** `src/content/strings.ts:404-413`
**Issue:** The comment `// DRAFT: Phase 29 will finalize PT-BR install copy` flags that
the PT-BR `install` strings are unreviewed draft copy. They are nonetheless wired into
the live `UI_STRINGS` catalog and will render to PT-BR users in this phase. This is a
planned-debt acceptance rather than a defect, but it means PT-BR users see unreviewed
copy until Phase 29 ships.
**Fix:** Confirm with the phase owner that shipping draft PT-BR copy is intended for
Phase 28; otherwise gate the banner to `en` only until Phase 29 finalizes the strings.

---

_Reviewed: 2026-05-16T00:00:00Z_
_Reviewer: Claude (gsd-code-reviewer)_
_Depth: standard_
</content>
</invoke>
