// src/styles/faviconPalette.test.ts
//
// Phase 21 Plan 01 Task 1 (TDD RED): Unit tests for the faviconPalette module.
// Verifies FAVICON_COLORS shape, hex values, FAVICON_SVG_TEMPLATE, and buildFaviconDataUri.

import { describe, it, expect } from 'vitest'

import { FAVICON_COLORS, FAVICON_SVG_TEMPLATE, buildFaviconDataUri } from './faviconPalette'
import { THEME_OPTIONS, type ThemeId } from '../domain/settings'

const CONCRETE_THEMES = THEME_OPTIONS.filter(
  (t): t is Exclude<ThemeId, 'system'> => t !== 'system',
)

describe('FAVICON_COLORS', () => {
  it('has exactly 5 keys (no system key)', () => {
    expect(Object.keys(FAVICON_COLORS)).toHaveLength(5)
    expect('system' in FAVICON_COLORS).toBe(false)
  })

  it('light === #5e81ac', () => {
    expect(FAVICON_COLORS.light).toBe('#5e81ac')
  })

  it('dark === #81a1c1', () => {
    expect(FAVICON_COLORS.dark).toBe('#81a1c1')
  })

  it('moss === #35a77c', () => {
    expect(FAVICON_COLORS.moss).toBe('#35a77c')
  })

  it('slate === #3760bf', () => {
    expect(FAVICON_COLORS.slate).toBe('#3760bf')
  })

  it('dusk === #f6c177', () => {
    expect(FAVICON_COLORS.dusk).toBe('#f6c177')
  })

  it('all 5 concrete themes are present as keys', () => {
    for (const theme of CONCRETE_THEMES) {
      expect(FAVICON_COLORS).toHaveProperty(theme)
    }
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
    // The template should have a substitutable fill token
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

  it('output contains the per-theme hex (light)', () => {
    const result = buildFaviconDataUri('light')
    // Accept raw or URL-encoded forms (#5e81ac or %235e81ac)
    expect(result.toLowerCase()).toMatch(/5e81ac/)
  })

  it('output contains the per-theme hex (dark)', () => {
    const result = buildFaviconDataUri('dark')
    expect(result.toLowerCase()).toMatch(/81a1c1/)
  })

  it('output contains the per-theme hex (moss)', () => {
    const result = buildFaviconDataUri('moss')
    expect(result.toLowerCase()).toMatch(/35a77c/)
  })

  it('output contains the per-theme hex (slate)', () => {
    const result = buildFaviconDataUri('slate')
    expect(result.toLowerCase()).toMatch(/3760bf/)
  })

  it('output contains the per-theme hex (dusk)', () => {
    const result = buildFaviconDataUri('dusk')
    expect(result.toLowerCase()).toMatch(/f6c177/)
  })
})
