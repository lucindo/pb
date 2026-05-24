// src/styles/theme.contrast.test.ts
//
// J4: scoped to role-pair contrast checks (accent-strong vs on-accent for primary CTA
// readability; destructive vs destructive-on for End-session button). The historical
// orb-in vs orb-out gradient midpoint test (THEME-05 / D-14) was removed when the
// orb body redesign replaced the in/out crossfade with halo layers + a single
// centre disc — the primitive it asserted no longer exists.

// Reason: node:fs and node:path are available in the Vitest jsdom test environment.
// tsconfig.app.json has types:["vite/client"] which excludes @types/node; the triple-slash
// reference adds Node.js type coverage for this test-only file without altering tsconfig.app.json.
/// <reference types="node" />

import { describe, it, expect, beforeAll, afterAll, afterEach } from 'vitest'
import { readFileSync } from 'node:fs'
import { resolve } from 'node:path'

import { THEME_OPTIONS, type ThemeId } from '../domain/settings'

// Inline helpers — D-18 (no new deps)

function srgbToLinear(c: number): number {
  // WCAG 2.x canonical formula uses 0.03928 threshold (NOT IEC 0.04045)
  return c <= 0.03928 ? c / 12.92 : Math.pow((c + 0.055) / 1.055, 2.4)
}

function relativeLuminance(r: number, g: number, b: number): number {
  // WCAG formula: 0.2126*R + 0.7152*G + 0.0722*B (normalized 0-1 channels)
  return (
    0.2126 * srgbToLinear(r / 255) +
    0.7152 * srgbToLinear(g / 255) +
    0.0722 * srgbToLinear(b / 255)
  )
}

function parseColorToRgb(value: string): [number, number, number] {
  const trimmed = value.trim()

  // #rgb shorthand — access groups by index with ?? fallback for noUncheckedIndexedAccess
  // (captures are string|undefined at the type level; the if-guard ensures exec() returned
  // non-null so the named groups matched, meaning the fallback '' is never reached at runtime)
  const shortHexMatch = /^#([0-9a-fA-F])([0-9a-fA-F])([0-9a-fA-F])$/.exec(trimmed)
  if (shortHexMatch) {
    const r = shortHexMatch[1] ?? ''
    const g = shortHexMatch[2] ?? ''
    const b = shortHexMatch[3] ?? ''
    return [parseInt(r + r, 16), parseInt(g + g, 16), parseInt(b + b, 16)]
  }

  // #rrggbb full hex
  const fullHexMatch = /^#([0-9a-fA-F]{2})([0-9a-fA-F]{2})([0-9a-fA-F]{2})$/.exec(trimmed)
  if (fullHexMatch) {
    const r = fullHexMatch[1] ?? ''
    const g = fullHexMatch[2] ?? ''
    const b = fullHexMatch[3] ?? ''
    return [parseInt(r, 16), parseInt(g, 16), parseInt(b, 16)]
  }

  // rgb(r, g, b) with or without spaces
  const rgbMatch = /^rgb\(\s*(\d+)\s*,\s*(\d+)\s*,\s*(\d+)\s*\)$/.exec(trimmed)
  if (rgbMatch) {
    return [Number(rgbMatch[1] ?? '0'), Number(rgbMatch[2] ?? '0'), Number(rgbMatch[3] ?? '0')]
  }

  throw new Error(
    `parseColorToRgb: Cannot parse color value: '${value}'. ` +
      'Supported formats: #rgb, #rrggbb, rgb(r,g,b). ' +
      'If a future palette uses oklch() or hsl(), add a parser branch here.',
  )
}


function contrastRatio(
  rgb1: [number, number, number],
  rgb2: [number, number, number],
): number {
  const l1 = relativeLuminance(...rgb1)
  const l2 = relativeLuminance(...rgb2)
  const bright = Math.max(l1, l2)
  const dark = Math.min(l1, l2)
  return (bright + 0.05) / (dark + 0.05)
}

// Theme.css injection — D-15 / RESEARCH §"jsdom Cascade Probe"
// jsdom 29.1.1 does NOT recognize Tailwind v4's @theme at-rule (silently drops declarations).
// Rewrite @theme { -> :root { before injection to make cascade work correctly.
// Also, getComputedStyle(div).background returns var() UNRESOLVED in jsdom — read CSS variables
// directly from documentElement instead (empirically verified in research session 2026-05-12).
let styleEl: HTMLStyleElement

beforeAll(() => {
  const themeCssPath = resolve(__dirname, 'theme.css')
  const raw = readFileSync(themeCssPath, 'utf-8')
  // Rewrite @theme { -> :root { because jsdom does not recognize Tailwind v4's @theme at-rule
  const rewritten = raw.replace(/@theme\s*\{/g, ':root {')
  styleEl = document.createElement('style')
  styleEl.textContent = rewritten
  document.head.appendChild(styleEl)
})

afterAll(() => {
  styleEl.remove()
})

afterEach(() => {
  // Reset theme attribute between test iterations to avoid cascade leakage
  delete document.documentElement.dataset.theme
})

function readToken(token: string): [number, number, number] {
  const value = getComputedStyle(document.documentElement).getPropertyValue(token).trim()
  return parseColorToRgb(value)
}

// D-16: skip 'system' — it has no CSS branch per S-01; JS resolves to 'light' or 'dark' at runtime
const CONCRETE_THEMES = THEME_OPTIONS.filter(
  (t): t is Exclude<ThemeId, 'system'> => t !== 'system',
)

// J4: the reduced-motion in/out gradient midpoint-contrast test was removed.
// It asserted the perceptual distance of an `.orb-layer--in` / `.orb-layer--out`
// gradient crossfade that no longer exists post-J4 (orb body is now halos +
// centre disc, phase distinction comes from the inner-ring opacity fade gated
// by `showRings`). The accent-strong / on-accent and destructive-contrast
// tests below remain meaningful and unchanged.

describe.each(CONCRETE_THEMES)('theme=%s', (themeId) => {
  it('accent-strong vs on-accent contrast ratio is >= 1.5 (D-01)', () => {
    // Phase 16.1 D-01: new --color-breathing-on-accent token is the foreground role
    // when sitting on a --color-breathing-accent-strong background (e.g. primary
    // action button in SessionActionRow). The ≥ 1.5 floor matches THEME-05.
    if (themeId === 'light') {
      delete document.documentElement.dataset.theme
    } else {
      document.documentElement.dataset.theme = themeId
    }
    const accentStrong = readToken('--color-breathing-accent-strong')
    const onAccent = readToken('--color-breathing-on-accent')
    const ratio = contrastRatio(accentStrong, onAccent)
    expect(ratio).toBeGreaterThanOrEqual(1.5)
  })

  it('destructive vs destructive-on contrast ratio meets WCAG AA large (>= 3.0)', () => {
    // v2.0 refactor item A: --color-destructive carries the End-session button
    // background; --color-destructive-on is the label color sitting on top.
    // The button uses 16px bold text which qualifies as "large text" under
    // WCAG (≥14px bold) — AA large floor is 3.0.
    if (themeId === 'light') {
      delete document.documentElement.dataset.theme
    } else {
      document.documentElement.dataset.theme = themeId
    }
    const destructive = readToken('--color-destructive')
    const destructiveOn = readToken('--color-destructive-on')
    const ratio = contrastRatio(destructive, destructiveOn)
    expect(ratio).toBeGreaterThanOrEqual(3.0)
  })
})
