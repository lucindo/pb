// src/styles/faviconPalette.test.ts
//
// Unit tests for the faviconPalette module. Verifies the SHAPE + CONTRACT of the
// module — not the specific hex values, which are design tokens that can change
// with the palette (no-design-locking rule). The cross-site agreement
// invariant (theme.css ↔ faviconPalette ↔ index.html) is enforced by
// src/styles/favicon.sync.test.ts; this file only tests this module's own surface.

import { describe, it, expect } from 'vitest'

import { FAVICON_COLORS, FAVICON_SVG_TEMPLATE, buildFaviconDataUri } from './faviconPalette'
import { THEME_OPTIONS, type ThemeId } from '../domain/settings'

const CONCRETE_THEMES = THEME_OPTIONS.filter(
  (t): t is Exclude<ThemeId, 'system'> => t !== 'system',
)

describe('FAVICON_COLORS', () => {
  it('has exactly 2 keys (light + dark, no system key)', () => {
    expect(Object.keys(FAVICON_COLORS)).toHaveLength(2)
    expect('system' in FAVICON_COLORS).toBe(false)
  })

  it('all concrete themes are present as keys', () => {
    for (const theme of CONCRETE_THEMES) {
      expect(FAVICON_COLORS).toHaveProperty(theme)
    }
  })

  it('every value is a well-formed 6-digit hex string', () => {
    for (const theme of CONCRETE_THEMES) {
      expect(FAVICON_COLORS[theme]).toMatch(/^#[0-9a-fA-F]{6}$/)
    }
  })

  it('light and dark values differ', () => {
    expect(FAVICON_COLORS.light).not.toBe(FAVICON_COLORS.dark)
  })
})

describe('FAVICON_SVG_TEMPLATE', () => {
  it('is a non-empty string', () => {
    expect(typeof FAVICON_SVG_TEMPLATE).toBe('string')
    expect(FAVICON_SVG_TEMPLATE.length).toBeGreaterThan(0)
  })

  it('contains SVG markup', () => {
    expect(FAVICON_SVG_TEMPLATE).toContain('<svg')
    expect(FAVICON_SVG_TEMPLATE).toContain('<circle')
  })

  it('contains a fill placeholder', () => {
    expect(FAVICON_SVG_TEMPLATE).toContain('__FILL__')
  })
})

describe('buildFaviconDataUri', () => {
  it('returns a data URI string', () => {
    const result = buildFaviconDataUri('light')
    expect(result).toMatch(/^data:image\/svg\+xml/)
  })

  it('outputs differ for different themes', () => {
    const light = buildFaviconDataUri('light')
    const dark = buildFaviconDataUri('dark')
    expect(light).not.toBe(dark)
  })

  it('output for each theme contains the corresponding FAVICON_COLORS hex (URL-encoded)', () => {
    for (const theme of CONCRETE_THEMES) {
      const result = buildFaviconDataUri(theme).toLowerCase()
      // Hex appears either raw (#rrggbb) or URL-encoded (%23rrggbb); match the rrggbb part.
      const rrggbb = FAVICON_COLORS[theme].slice(1).toLowerCase()
      expect(result).toContain(rrggbb)
    }
  })

  it('output substitutes the placeholder (no __FILL__ remains)', () => {
    for (const theme of CONCRETE_THEMES) {
      expect(buildFaviconDataUri(theme)).not.toContain('__FILL__')
    }
  })
})
