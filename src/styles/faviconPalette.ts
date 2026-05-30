// src/styles/faviconPalette.ts
//
// Single source of truth for per-palette favicon colors and the recolor-only SVG
// circle template. Consumed by useFavicon and the favicon.sync.test.ts sync guard.

import type { ThemeId } from '../domain/settings'

// SYNC WITH src/styles/theme.css --color-breathing-accent-strong AND index.html FAVICON SCRIPT
// These 2 hex values mirror the --color-breathing-accent-strong token per [data-theme] block.
// If any token drifts, the favicon.sync.test.ts automated guard will fail the build.
// `as const satisfies` provides compile-time readonly + key-set conformance to
// `Record<Exclude<ThemeId,'system'>, string>` — stronger than runtime
// `Object.freeze` because TypeScript catches assignment attempts at build time.
export const FAVICON_COLORS = {
  light: '#414957',
  dark: '#ccd0d9',
} as const satisfies Record<Exclude<ThemeId, 'system'>, string>

// Recolor-only SVG template. Three concentric filled circles at decreasing opacity
// (0.22 → 0.32 → 0.50) topped by a fully-opaque centre disc, mirroring the in-app
// orb's 3-halo + accent-disc layout. Single-colour: __FILL__ is the only substituted
// value, so per-theme recolouring keeps working.
// SYNC WITH the inline favUri() SVG in index.html and public/favicon.svg.
export const FAVICON_SVG_TEMPLATE =
  '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 32 32">'
  + '<circle cx="16" cy="16" r="14" fill="__FILL__" fill-opacity="0.22"/>'
  + '<circle cx="16" cy="16" r="12" fill="__FILL__" fill-opacity="0.32"/>'
  + '<circle cx="16" cy="16" r="10" fill="__FILL__" fill-opacity="0.50"/>'
  + '<circle cx="16" cy="16" r="8" fill="__FILL__"/></svg>'

// Module-load drift guard: the recolour pipeline relies on at least one
// `__FILL__` placeholder. The stale comment "three places" (already
// outdated when the J16 update bumped to four) showed this template can
// drift undetected — a future edit that hardcodes a hex and forgets to
// revert would silently emit a fixed-colour favicon. Failing at import
// time is loud and unmistakable; runtime checks after replaceAll cannot
// distinguish "no placeholders left, all replaced" from "no placeholders
// to begin with".
const FAVICON_FILL_PLACEHOLDER_COUNT =
  (FAVICON_SVG_TEMPLATE.match(/__FILL__/g) ?? []).length
if (FAVICON_FILL_PLACEHOLDER_COUNT === 0) {
  throw new Error(
    'faviconPalette: FAVICON_SVG_TEMPLATE contains no __FILL__ placeholders — '
    + 'per-theme recolouring is broken.',
  )
}

// Produces a runtime-recolored SVG data-URI from the single template.
// No static per-theme files are created in public/.
// The whole SVG payload is percent-encoded via encodeURIComponent so the data-URI is
// RFC 2397-conformant — raw `<`, `>`, `"`, and spaces are all escaped, not just the `#`.
export function buildFaviconDataUri(theme: Exclude<ThemeId, 'system'>): string {
  const hex = FAVICON_COLORS[theme]
  // replaceAll — the template has multiple `__FILL__` placeholders (current
  // count guarded at module load above); replace() would recolour only one.
  const svg = FAVICON_SVG_TEMPLATE.replaceAll('__FILL__', hex)
  return `data:image/svg+xml,${encodeURIComponent(svg)}`
}
