// src/styles/theme.contrast.test.ts
//
// Phase 16 THEME-05: every shipped theme preserves reduced-motion crossfade contrast.
// D-13 / D-14 / D-15 / D-16: WCAG luminance contrast ratio >= 1.5 on the orb-in vs orb-out
// midpoint colors, iterated over the 5 concrete themes (light, dark, moss, slate, dusk).

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

  // #rgb shorthand
  const shortHexMatch = /^#([0-9a-fA-F])([0-9a-fA-F])([0-9a-fA-F])$/.exec(trimmed)
  if (shortHexMatch) {
    const [, r, g, b] = shortHexMatch
    return [
      parseInt(r + r, 16),
      parseInt(g + g, 16),
      parseInt(b + b, 16),
    ]
  }

  // #rrggbb full hex
  const fullHexMatch = /^#([0-9a-fA-F]{2})([0-9a-fA-F]{2})([0-9a-fA-F]{2})$/.exec(trimmed)
  if (fullHexMatch) {
    const [, r, g, b] = fullHexMatch
    return [parseInt(r, 16), parseInt(g, 16), parseInt(b, 16)]
  }

  // rgb(r, g, b) with or without spaces (also handles no-comma space-separated)
  const rgbMatch = /^rgb\(\s*(\d+)\s*[, ]\s*(\d+)\s*[, ]\s*(\d+)\s*\)$/.exec(trimmed)
  if (rgbMatch) {
    return [Number(rgbMatch[1]), Number(rgbMatch[2]), Number(rgbMatch[3])]
  }

  throw new Error(
    `parseColorToRgb: Cannot parse color value: '${value}'. ` +
      'Supported formats: #rgb, #rrggbb, rgb(r,g,b). ' +
      'If a future palette uses oklch() or hsl(), add a parser branch here.',
  )
}

function midpoint(
  a: [number, number, number],
  b: [number, number, number],
): [number, number, number] {
  return [
    Math.round((a[0] + b[0]) / 2),
    Math.round((a[1] + b[1]) / 2),
    Math.round((a[2] + b[2]) / 2),
  ]
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
// directly from documentElement instead (empirically verified in research session).
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

describe.each(CONCRETE_THEMES)('theme=%s', (themeId) => {
  it('reduced-motion crossfade midpoint contrast ratio is >= 1.5 (THEME-05 / D-14)', () => {
    // Light is the @theme baseline -> no override block -> no data-theme attribute
    // Other 4 themes have [data-theme='X']:root override blocks
    if (themeId === 'light') {
      delete document.documentElement.dataset.theme
    } else {
      document.documentElement.dataset.theme = themeId
    }

    const inFrom = readToken('--color-orb-in-from')
    const inTo = readToken('--color-orb-in-to')
    const outFrom = readToken('--color-orb-out-from')
    const outTo = readToken('--color-orb-out-to')

    const inMid = midpoint(inFrom, inTo)
    const outMid = midpoint(outFrom, outTo)

    const ratio = contrastRatio(inMid, outMid)

    // D-14 floor: WCAG luminance contrast >= 1.5
    expect(ratio).toBeGreaterThanOrEqual(1.5)
  })
})
