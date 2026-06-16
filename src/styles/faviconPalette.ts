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

// Recolor-only SVG template. A thin progress ring (low-opacity full circle) under a
// bold 270° accent arc — the app's in-session breathing ring. Single-colour: __FILL__
// is the only substituted value (stroke on the root), so per-theme recolouring keeps working.
// SYNC WITH the inline favUri() SVG in index.html and public/favicon.svg.
export const FAVICON_SVG_TEMPLATE =
  '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 32 32" fill="none" stroke="__FILL__" stroke-linecap="round">'
  + '<circle cx="16" cy="16" r="10.5" stroke-width="2.5" stroke-opacity="0.3"/>'
  + '<path d="M16 5.5A10.5 10.5 0 1 1 5.5 16" stroke-width="3.5"/></svg>'

// Fail at import if the template lost its `__FILL__` placeholders — a hardcoded
// hex would otherwise silently ship a fixed-colour favicon. A post-replaceAll
// check can't catch this (it can't tell "all replaced" from "none to replace").
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
  // replaceAll keeps recolouring correct if the template ever grows a second
  // `__FILL__`; replace() would silently leave any extra placeholder behind.
  const svg = FAVICON_SVG_TEMPLATE.replaceAll('__FILL__', hex)
  return `data:image/svg+xml,${encodeURIComponent(svg)}`
}
