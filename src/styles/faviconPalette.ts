// src/styles/faviconPalette.ts
//
// Phase 21 Plan 01: Single source of truth for per-palette favicon colors and the
// recolor-only SVG circle template. Consumed by useFavicon (Plan 02) and the
// favicon.sync.test.ts sync guard.

import type { ThemeId } from '../domain/settings'

// SYNC WITH src/styles/theme.css --color-breathing-accent-strong AND index.html FAVICON SCRIPT
// These 5 hex values mirror the --color-breathing-accent-strong token per [data-theme] block.
// If any token drifts, the favicon.sync.test.ts automated guard will fail the build.
export const FAVICON_COLORS: Record<Exclude<ThemeId, 'system'>, string> = Object.freeze({
  light: '#5e81ac',
  dark: '#81a1c1',
  moss: '#35a77c',
  slate: '#3760bf',
  dusk: '#f6c177',
})

// D-01: Recolor-only flat SVG circle template. Fill is the only thing substituted —
// no glyph, ring, or two-tone. __FILL__ is replaced at runtime by buildFaviconDataUri.
// Based on public/favicon.svg (circle cx=16 cy=16 r=14, viewBox="0 0 32 32").
export const FAVICON_SVG_TEMPLATE =
  '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 32 32"><circle cx="16" cy="16" r="14" fill="__FILL__"/></svg>'

// D-03: Produces a runtime-recolored SVG data-URI from the single template.
// No new static per-theme files are created in public/.
// CS-WR-01: The whole SVG payload is percent-encoded via encodeURIComponent so the
// data-URI is RFC 2397-conformant — raw `<`, `>`, `"`, and spaces are all escaped,
// not just the `#` in the hex color.
export function buildFaviconDataUri(theme: Exclude<ThemeId, 'system'>): string {
  const hex = FAVICON_COLORS[theme]
  const svg = FAVICON_SVG_TEMPLATE.replace('__FILL__', hex)
  return `data:image/svg+xml,${encodeURIComponent(svg)}`
}
