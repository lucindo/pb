// src/content/content.no-variants.test.ts
//
// Phase 38 VAR-06 drift-guard.
//
// Scanned roots: src/components/, src/app/, src/content/, src/styles/
//   - components/ + app/ cover all render paths.
//   - content/ catches variant-shaped i18n copy re-entering via strings.ts
//     before a consumer wires it back into a render path.
//   - styles/ catches [data-variant='square'/'diamond'] CSS rules re-entering
//     via theme.css (the WR-01 vector the original three-root scan would miss).
//
// Forbidden token classes (CONTEXT D-04 / D-05):
//   1. Plain substring (case-sensitive component/symbol names)
//   2. Regex (persisted-value literals: variant: 'square' / variant: 'diamond')
//   3. Regex (CSS attribute selectors: [data-variant='square'] / [data-variant='diamond'])
//
// WHY this file exists (CONTEXT D-06): Phase 38 deleted all forbidden variant tokens
// from the scanned roots. This drift-guard locks that done-state against future regressions.
// It is the lock — future re-introduction of a shape variant system is a deliberate phase
// decision that explicitly deletes this file with rationale recorded in that phase's SUMMARY.
// Deleting this file is the intentional unlock.
//
// Analog: src/content/content.no-stats-ui.test.ts (Phase 37 STATS-05)

// Reason: node:fs and node:path are available in the Vitest jsdom test environment.
// tsconfig.app.json has types:["vite/client"] which excludes @types/node; the triple-slash
// reference adds Node.js type coverage for this test-only file without altering tsconfig.app.json.
/// <reference types="node" />

import { describe, it, expect } from 'vitest'
import { readFileSync, readdirSync, statSync } from 'node:fs'
import { resolve, join } from 'node:path'

// Collect all non-test .ts / .tsx / .css files under dir (recursive).
// Excluding .test.ts and .test.tsx files is load-bearing — this guard file itself contains
// the literal token strings (inside the forbidden-token list below) and must not flag itself.
// Note: the STATS-05 analog handles .ts and .tsx only; Phase 38 must also scan .css because
// theme.css carries the [data-variant='square'/'diamond'] CSS rules that VAR-06 polices (D-07).
function collectFiles(dir: string, acc: string[] = []): string[] {
  for (const entry of readdirSync(dir)) {
    const full = join(dir, entry)
    const st = statSync(full)
    if (st.isDirectory()) {
      collectFiles(full, acc)
    } else if (
      (entry.endsWith('.ts') || entry.endsWith('.tsx') || entry.endsWith('.css')) &&
      !entry.endsWith('.test.ts') &&
      !entry.endsWith('.test.tsx')
    ) {
      acc.push(full)
    }
  }
  return acc
}

const COMPONENTS_DIR = resolve(__dirname, '..', 'components')
const APP_DIR        = resolve(__dirname, '..', 'app')
const CONTENT_DIR    = resolve(__dirname)
const STYLES_DIR     = resolve(__dirname, '..', 'styles')

// Flat list of all non-test production .ts / .tsx / .css files across the four scanned roots.
const SCAN_FILES: string[] = [
  ...collectFiles(COMPONENTS_DIR),
  ...collectFiles(APP_DIR),
  ...collectFiles(CONTENT_DIR),
  ...collectFiles(STYLES_DIR),
]

// Forbidden token list (CONTEXT D-05 — 14 tokens total).
// Each entry carries a human-readable label so the failure message names exactly which
// token tripped the guard — making it immediately clear to the contributor what landed.
const FORBIDDEN_TOKENS: Array<{ label: string; match: (text: string) => boolean }> = [
  // Plain substring (case-sensitive component / symbol names) — 10 entries
  { label: 'SquareShape (component name)',         match: (t) => t.includes('SquareShape') },
  { label: 'DiamondShape (component name)',        match: (t) => t.includes('DiamondShape') },
  { label: 'VariantPicker (component name)',       match: (t) => t.includes('VariantPicker') },
  { label: 'VisualVariantId (type name)',          match: (t) => t.includes('VisualVariantId') },
  { label: 'useVisualVariant (hook name)',         match: (t) => t.includes('useVisualVariant') },
  { label: 'useVariantChoice (hook name)',         match: (t) => t.includes('useVariantChoice') },
  { label: 'coerceVariant (coercer name)',         match: (t) => t.includes('coerceVariant') },
  { label: 'isValidVariant (predicate name)',      match: (t) => t.includes('isValidVariant') },
  { label: 'VARIANT_OPTIONS (constant name)',      match: (t) => t.includes('VARIANT_OPTIONS') },
  { label: 'DEFAULT_VARIANT (constant name)',      match: (t) => t.includes('DEFAULT_VARIANT') },
  // Regex — persisted-value literals (matches `variant: 'square'` and `variant: 'diamond'` in source)
  {
    label: "variant: 'square' (persisted-pref literal)",
    match: (t) => /variant:\s*['"]square['"]/.test(t),
  },
  {
    label: "variant: 'diamond' (persisted-pref literal)",
    match: (t) => /variant:\s*['"]diamond['"]/.test(t),
  },
  // Regex — CSS attribute selectors (catches theme.css re-entry)
  {
    label: "[data-variant='square'] CSS selector",
    match: (t) => /\[data-variant=['"]?square['"]?\]/.test(t),
  },
  {
    label: "[data-variant='diamond'] CSS selector",
    match: (t) => /\[data-variant=['"]?diamond['"]?\]/.test(t),
  },
]

describe('VAR-06 drift-guard (CONTEXT D-04 / D-05 / D-06)', () => {
  // Sanity assertion: a broken __dirname resolve or a renamed scan root would
  // silently produce an empty SCAN_FILES list and pass vacuously. Lock a floor
  // well below realistic file counts but above zero so any regression in
  // collectFiles itself surfaces immediately.
  it('scans a non-empty set of production files', () => {
    expect(
      SCAN_FILES.length,
      'VAR-06 drift-guard scanned zero files — collectFiles or scan-root resolve is broken',
    ).toBeGreaterThan(10)
  })

  it('no forbidden variant token appears in src/components/, src/app/, src/content/, or src/styles/', () => {
    const hits: string[] = []

    for (const file of SCAN_FILES) {
      const text = readFileSync(file, 'utf-8')
      for (const token of FORBIDDEN_TOKENS) {
        if (token.match(text)) {
          hits.push(`${file}: ${token.label}`)
        }
      }
    }

    expect(
      hits,
      `Forbidden variant tokens found (Phase 38 Orb-only invariant violated):\n${hits.join('\n')}`,
    ).toEqual([])
  })
})
