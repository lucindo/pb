---
phase: 27-pwa-install-offline
reviewed: 2026-05-16T00:00:00Z
depth: standard
files_reviewed: 4
files_reviewed_list:
  - vite.config.ts
  - index.html
  - public/favicon.svg
  - README.md
findings:
  critical: 0
  warning: 2
  info: 3
  total: 5
status: issues_found
---

# Phase 27: Code Review Report

**Reviewed:** 2026-05-16T00:00:00Z
**Depth:** standard
**Files Reviewed:** 4
**Status:** issues_found

## Summary

Reviewed the Phase 27 PWA Install & Offline changes: `vite-plugin-pwa` (`generateSW`)
integration in `vite.config.ts`, iOS PWA meta tags in `index.html`, the redesigned
`public/favicon.svg`, and the README "Known Limitations" subsection. All six referenced
icon assets exist in `public/`, the manifest theme/background colors are valid, and the
service-worker config is sound (`autoUpdate` + `cleanupOutdatedCaches`). No security
vulnerabilities and no blocking defects were found.

Two warnings concern correctness/consistency: a deprecated iOS meta tag without its
standards-track companion, and a real visual divergence between the new static
`favicon.svg` and the runtime-recolored tab favicon — plus stale documentation that the
favicon sync guard cannot catch. Three info items cover minor robustness and consistency
nits.

## Warnings

### WR-01: Redesigned `favicon.svg` diverges from the runtime tab favicon; stale sync comment

**File:** `public/favicon.svg:1`
**Issue:** The redesigned `favicon.svg` is a two-tone design — a dark `#2e3440` full-bleed
`rect` background with a `radialGradient`-filled circle at `r="10.1"`. However, the live
browser-tab favicon is *not* this file: `index.html` (line 18) and `src/hooks/useFavicon.ts`
both render a runtime data-URI built from `FAVICON_SVG_TEMPLATE` in
`src/styles/faviconPalette.ts`, which is a flat single-color circle at `r="14"` with no
background rect. So the static file shipped as the install/PWA icon source and the favicon
actually shown in the tab now look materially different (gradient orb on dark square vs.
flat solid circle filling the viewport).

Worse, `faviconPalette.ts:22` still carries the comment
`// Based on public/favicon.svg (circle cx=16 cy=16 r=14, viewBox="0 0 32 32").` — that
description no longer matches the redesigned file (`r="10.1"`, gradient, rect background).
The `favicon.sync.test.ts` guard only compares *hex colors* across the three sites; it does
**not** compare SVG geometry, so this drift is silent and the build stays green.

This is flagged as a Warning, not Info, because the divergence is a real product
inconsistency (the icon a user sees in the tab vs. the icon used for the PWA/Home Screen
install differs) and the load-bearing sync comment is now factually wrong, which will
mislead the next person who edits either file.
**Fix:** Decide on one intended source of truth and reconcile:
- If the gradient design is intended for the tab favicon too, update
  `FAVICON_SVG_TEMPLATE` (and the runtime recolor logic) to match, or
- If the flat circle is intentional for the tab and the gradient only for install icons,
  update the `faviconPalette.ts:22` comment to stop claiming `favicon.svg` is the basis
  for the template, e.g.:
  ```ts
  // Flat recolor-only circle template for the runtime tab favicon.
  // NOTE: public/favicon.svg is a separate two-tone design used as the static
  // install-icon source — it is intentionally NOT the basis for this template.
  ```
  Either way, ensure the geometry comment reflects reality so future edits do not
  re-introduce confusion.

### WR-02: `apple-mobile-web-app-capable` is deprecated; standards-track `mobile-web-app-capable` is missing

**File:** `index.html:10`
**Issue:** `<meta name="apple-mobile-web-app-capable" content="yes">` is the legacy
Apple-only tag. The standards-track equivalent is `<meta name="mobile-web-app-capable"
content="yes">`. Modern guidance (and Chrome's Lighthouse / DevTools) is to include the
standard tag; the manifest's `display: standalone` covers Android/Chrome installs, but the
non-prefixed meta is still the documented companion and current best practice. Shipping
only the deprecated Apple-prefixed form is a forward-compatibility gap — if a future iOS
WebKit release drops the legacy prefix, standalone install behavior regresses with no
fallback.
**Fix:** Add the standard tag alongside the legacy one (keep both for max coverage):
```html
<meta name="mobile-web-app-capable" content="yes">
<meta name="apple-mobile-web-app-capable" content="yes">
```

## Info

### IN-01: `apple-touch-icon` `sizes` attribute is non-standard for that link relation

**File:** `index.html:8`
**Issue:** `<link rel="apple-touch-icon" href="..." sizes="180x180">` — iOS ignores the
`sizes` attribute on `apple-touch-icon` links; it keys off the filename / single declared
icon and the actual PNG dimensions. The attribute is harmless but misleading: it implies
size negotiation that does not happen. Confirm `apple-touch-icon.png` is genuinely
180x180 (the value asserts it) since iOS will scale whatever it finds.
**Fix:** Either drop the `sizes` attribute, or keep it only if you intentionally document
the expected dimension — and verify the PNG matches.

### IN-02: `theme_color` / `theme-color` is hardcoded to the `light` palette only

**File:** `vite.config.ts:28`, `index.html:14`
**Issue:** Both the manifest `theme_color` and the `<meta name="theme-color">` are pinned
to `#5e81ac` (the `light` palette's `--color-breathing-accent-strong`). The app supports
five palettes and dynamically recolors the favicon per theme (`useFavicon.ts`), but the
PWA theme color (status bar / task switcher tint) and the static meta theme-color stay on
the light value regardless of the user's selected theme. This is a consistency gap, not a
bug — but a user on the `dusk` or `dark` palette gets a mismatched standalone status-bar
tint. Out of scope to fully fix in this phase; noted so it is a deliberate decision rather
than an oversight. If left, consider a brief comment near `vite.config.ts:28` stating the
theme color intentionally tracks only the `light` palette.
**Fix (optional):** Drive `<meta name="theme-color">` from the same pre-paint theme
script that already resolves the active theme in `index.html:18`, or accept and document
the light-only behavior.

### IN-03: Manifest omits `id`; relies on `start_url`/`scope` auto-default

**File:** `vite.config.ts:24-48`
**Issue:** The manifest comment (line 31) correctly notes `start_url`/`scope` auto-default
to the Vite `base` (`/hrv/`). However the manifest also omits the `id` member. Without an
explicit `id`, the install identity is derived from `start_url`; if `base` ever changes
(or the app is served from a different path), Chrome may treat it as a *new* installable
app, orphaning existing installs. For a GitHub-Pages-style fixed base this is low risk,
hence Info.
**Fix (optional):** Add a stable `id` to decouple install identity from the served path:
```ts
manifest: {
  id: '/hrv/',
  name: 'HRV Breathing',
  // ...
}
```

---

_Reviewed: 2026-05-16T00:00:00Z_
_Reviewer: Claude (gsd-code-reviewer)_
_Depth: standard_
