// src/styles/favicon.sync.test.ts
//
// Phase 21 Plan 01: D-07 automated sync guard.
// Asserts that FAVICON_COLORS, theme.css --color-breathing-accent-strong tokens, and
// index.html inline favicon map all agree. Prevents silent drift across the three sites.
//
// Analog: src/styles/theme.contrast.test.ts (reads theme.css, describe.each over concrete themes)

// Reason: node:fs and node:path are available in the Vitest jsdom test environment.
// tsconfig.app.json has types:["vite/client"] which excludes @types/node; the triple-slash
// reference adds Node.js type coverage for this test-only file without altering tsconfig.app.json.
/// <reference types="node" />

import { describe, it, expect } from 'vitest'
import { readFileSync } from 'node:fs'
import { resolve } from 'node:path'

import { FAVICON_COLORS } from './faviconPalette'
import { THEME_OPTIONS, type ThemeId } from '../domain/settings'

// D-16: skip 'system' — it has no CSS branch; JS resolves to 'light' or 'dark' at runtime
const CONCRETE_THEMES = THEME_OPTIONS.filter(
  (t): t is Exclude<ThemeId, 'system'> => t !== 'system',
)

// Plain regex parse approach (PATTERNS.md §"Approach 2" — lighter, no jsdom cascade quirks).
// Reads the theme.css file from disk and extracts each theme's --color-breathing-accent-strong value.

const themeCssPath = resolve(__dirname, 'theme.css')
const themeCssContent = readFileSync(themeCssPath, 'utf-8')

/**
 * Parse --color-breathing-accent-strong from theme.css for the given theme.
 * Light's value is in the base @theme block; dark/moss/slate/dusk in their
 * [data-theme='X']:root override blocks.
 */
function parseAccentStrongFromCss(themeId: Exclude<ThemeId, 'system'>): string {
  if (themeId === 'light') {
    // Base @theme block — not inside any [data-theme] selector
    // Match the value before any [data-theme] block starts
    const baseBlockMatch = /^([\s\S]*?)(?:\[data-theme=)/.exec(themeCssContent)
    const baseBlock = baseBlockMatch?.[1] ?? themeCssContent
    const tokenMatch = /--color-breathing-accent-strong:\s*(#[0-9a-fA-F]{6});/.exec(baseBlock)
    if (!tokenMatch?.[1]) {
      throw new Error(`favicon.sync.test: Could not parse --color-breathing-accent-strong for 'light' from theme.css`)
    }
    return tokenMatch[1].toLowerCase()
  } else {
    // [data-theme='X']:root override block
    const blockPattern = new RegExp(
      `\\[data-theme='${themeId}'\\][^{]*\\{([^}]+)`,
      's',
    )
    const blockMatch = blockPattern.exec(themeCssContent)
    if (!blockMatch?.[1]) {
      throw new Error(`favicon.sync.test: Could not find [data-theme='${themeId}'] block in theme.css`)
    }
    const tokenMatch = /--color-breathing-accent-strong:\s*(#[0-9a-fA-F]{6});/.exec(blockMatch[1])
    if (!tokenMatch?.[1]) {
      throw new Error(`favicon.sync.test: Could not parse --color-breathing-accent-strong for '${themeId}' from theme.css`)
    }
    return tokenMatch[1].toLowerCase()
  }
}

describe.each(CONCRETE_THEMES)('theme=%s', (themeId) => {
  // Assertion (1): FAVICON_COLORS[themeId] must match --color-breathing-accent-strong in theme.css
  // This assertion is LIVE — it guards against drift between the shared module and theme.css.
  it('FAVICON_COLORS hex matches --color-breathing-accent-strong in theme.css', () => {
    const cssHex = parseAccentStrongFromCss(themeId)
    const moduleHex = FAVICON_COLORS[themeId].toLowerCase()
    expect(moduleHex).toBe(cssHex)
  })

  // Assertion (2): FAVICON_COLORS[themeId] must match the inline hex map in index.html
  // PLAN 02: un-skip once index.html inline favicon map exists (lands in Plan 02 Task 1).
  // The inline map is added by Plan 02 — it does not exist yet when Plan 01 runs.
  it.skip('FAVICON_COLORS hex matches index.html inline favicon map (PLAN 02: un-skip there)', () => {
    const indexHtmlPath = resolve(__dirname, '../../index.html')
    const indexHtml = readFileSync(indexHtmlPath, 'utf-8')

    // Regex to extract the inline favicon hex map literal from the pre-paint script.
    // Expected pattern: {light:'#5e81ac',dark:'#81a1c1',moss:'#35a77c',slate:'#3760bf',dusk:'#f6c177'}
    // or with double quotes and/or spaces — match the value for themeId.
    const mapPattern = new RegExp(
      `['"]${themeId}['"]\\s*:\\s*['"]?(#[0-9a-fA-F]{6})['"]?`,
    )
    const mapMatch = mapPattern.exec(indexHtml)
    if (!mapMatch?.[1]) {
      throw new Error(
        `favicon.sync.test: Could not find inline favicon hex map for theme '${themeId}' in index.html. ` +
        `The inline map is expected to be added in Plan 02 — un-skip this test after Plan 02 Task 1.`,
      )
    }

    const inlineHex = mapMatch[1].toLowerCase()
    const moduleHex = FAVICON_COLORS[themeId].toLowerCase()
    expect(inlineHex).toBe(moduleHex)
  })
})
