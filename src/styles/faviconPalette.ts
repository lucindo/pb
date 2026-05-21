// src/styles/faviconPalette.ts
//
// Phase 21 Plan 01: Single source of truth for per-palette favicon colors and the
// recolor-only SVG circle template. Consumed by useFavicon (Plan 02) and the
// favicon.sync.test.ts sync guard.

import type { ThemeId } from '../domain/settings'

// SYNC WITH src/styles/theme.css --color-breathing-accent-strong AND index.html FAVICON SCRIPT
// These 2 hex values mirror the --color-breathing-accent-strong token per [data-theme] block.
// If any token drifts, the favicon.sync.test.ts automated guard will fail the build.
export const FAVICON_COLORS: Record<Exclude<ThemeId, 'system'>, string> = Object.freeze({
  light: '#5e81ac',
  dark: '#81a1c1',
})

// D-01: Recolor-only SVG template. Spike 006 ("Breathing rings") replaced the
// flat circle with the breathing-rings mark — two concentric rings + a centre
// dot, the small-size reduction of the installed app icon. Still single-colour:
// __FILL__ is the only substituted value (every ring stroke + the dot), so the
// favicon recolours per theme exactly as before. Every __FILL__ occurrence is
// replaced — buildFaviconDataUri uses replaceAll, not replace.
// SYNC WITH the inline favUri() SVG in index.html and public/favicon.svg.
export const FAVICON_SVG_TEMPLATE =
  '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 32 32">'
  + '<circle cx="16" cy="16" r="12.4" fill="none" stroke="__FILL__" stroke-width="2.4" stroke-opacity="0.5"/>'
  + '<circle cx="16" cy="16" r="7.6" fill="none" stroke="__FILL__" stroke-width="2.4"/>'
  + '<circle cx="16" cy="16" r="3.5" fill="__FILL__"/></svg>'

// D-03: Produces a runtime-recolored SVG data-URI from the single template.
// No new static per-theme files are created in public/.
// CS-WR-01: The whole SVG payload is percent-encoded via encodeURIComponent so the
// data-URI is RFC 2397-conformant — raw `<`, `>`, `"`, and spaces are all escaped,
// not just the `#` in the hex color.
export function buildFaviconDataUri(theme: Exclude<ThemeId, 'system'>): string {
  const hex = FAVICON_COLORS[theme]
  // replaceAll — the Breathing-rings template (Spike 006) has __FILL__ in three
  // places (two ring strokes + the centre dot); replace() would recolour only one.
  const svg = FAVICON_SVG_TEMPLATE.replaceAll('__FILL__', hex)
  return `data:image/svg+xml,${encodeURIComponent(svg)}`
}
