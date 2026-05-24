// src/content/content.no-removed-themes.test.ts
//
// Phase 39 drift-guard (CONTEXT D-03 / D-04 / D-05 / D-06).
//
// Scanned roots: src/components/, src/app/, src/content/, src/styles/
//   - components/ + app/ cover all render paths.
//   - content/ catches moss/slate/dusk i18n copy re-entering via strings.ts.
//   - styles/ catches [data-theme='moss'/'slate'/'dusk'] CSS rules re-entering
//     via theme.css.
//
// Forbidden token classes (CONTEXT D-04):
//   1. Plain substring — case-sensitive lowercase theme ids: 'moss', 'dusk'
//      (the 3rd lowercase id 'slate' is intentionally NOT a free-text matcher — see
//      VOCABULARY NOTE below; theme-ID usages of 'slate' are still caught by the
//      structural matchers — persisted-pref, CSS selector, object-key — that follow)
//   2. Plain substring — EN display strings: 'Moss', 'Slate', 'Dusk'
//   3. Plain substring — PT-BR display strings: 'Musgo', 'Ardósia', 'Crepúsculo'
//   4. Regex — persisted-pref literals (theme: 'moss'/'slate'/'dusk')
//   5. Regex — CSS attribute selectors ([data-theme='moss'/'slate'/'dusk'])
//   6. Regex — object-key entries ('moss'/'slate'/'dusk': — catches favicon palette / contrast floor / etc.)
//
// VOCABULARY NOTE (J1 spike-application loop, 2026-05-23):
//   The lowercase 'slate' word is now a legitimate color-family descriptor in the
//   Mono Zen palette (spike 010 — `cool slate` is the spike's own term). A bare
//   word-bounded `slate` matcher would generate false positives every time the
//   palette is referenced in a comment or docstring. The structural matchers
//   (#4 persisted-pref, #5 CSS selector, #6 object-key) cover the real
//   re-introduction vectors of `slate` as a *theme id*. The capitalized 'Slate'
//   stays a plain substring (EN display string would only re-appear as a
//   user-facing theme-name re-introduction). Previous lowercase free-text matcher
//   removed; rationale logged here so the test file documents its own narrowing.
//
// WHY this file exists (CONTEXT D-06): Phase 39 collapsed the 5-palette theme system
// to 3 options (light / dark / system) per the spike-010 visual lock. This drift-guard
// locks that done-state against future regressions. It is the lock — any future phase
// that re-introduces a deprecated palette (or claims one of these reserved names)
// explicitly deletes this file with rationale recorded in that phase's SUMMARY.
// Deleting this file is the intentional unlock.
//
// Analog: src/content/content.no-variants.test.ts (Phase 38 VAR-06 — verbatim structural twin)

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
// The .css extension is carried over from Phase 38 VAR-06 (D-04) so theme.css re-entry of
// [data-theme='moss'/'slate'/'dusk'] CSS rules is caught.
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

// Forbidden token list (CONTEXT D-04).
// Each entry carries a human-readable label so the failure message names exactly which
// token tripped the guard — making it immediately clear to the contributor what landed.
const FORBIDDEN_TOKENS: Array<{ label: string; match: (text: string) => boolean }> = [
  // Plain substring (case-sensitive lowercase theme ids — 'slate' is intentionally
  // omitted as a free-text matcher per the VOCABULARY NOTE in this file's header;
  // the structural matchers below still catch any re-introduction of 'slate' as a theme id)
  { label: "'moss' (theme id)",  match: (t) => t.includes('moss') },
  { label: "'dusk' (theme id)",  match: (t) => t.includes('dusk') },
  // Plain substring (case-sensitive EN display strings — 3 entries)
  { label: "'Moss' (EN display string)",  match: (t) => t.includes('Moss') },
  { label: "'Slate' (EN display string)", match: (t) => t.includes('Slate') },
  { label: "'Dusk' (EN display string)",  match: (t) => t.includes('Dusk') },
  // Plain substring (PT-BR display strings — 3 entries; D-04 errs on inclusion per Claude's Discretion)
  { label: "'Musgo' (PT-BR Moss)",       match: (t) => t.includes('Musgo') },
  { label: "'Ardósia' (PT-BR Slate)",    match: (t) => t.includes('Ardósia') },
  { label: "'Crepúsculo' (PT-BR Dusk)",  match: (t) => t.includes('Crepúsculo') },
  // Regex — persisted-value literals (catches `theme: 'moss'` / `theme: 'slate'` / `theme: 'dusk'`)
  {
    label: "theme: 'moss'/'slate'/'dusk' (persisted-pref literal)",
    match: (t) => /theme:\s*['"](moss|slate|dusk)['"]/.test(t),
  },
  // Regex — CSS attribute selectors (catches theme.css re-entry)
  {
    label: "[data-theme='moss'/'slate'/'dusk'] CSS selector",
    match: (t) => /\[data-theme=['"]?(moss|slate|dusk)['"]?\]/.test(t),
  },
  // Regex — object-key entries (catches favicon palette / contrast floors / etc. re-entry)
  {
    label: "'moss'/'slate'/'dusk':  object-key entry",
    match: (t) => /['"](moss|slate|dusk)['"]\s*:/.test(t),
  },
]

describe('Phase 39 drift-guard: no removed theme tokens (CONTEXT D-04 / D-05 / D-06)', () => {
  // Sanity assertion: a broken __dirname resolve or a renamed scan root would
  // silently produce an empty SCAN_FILES list and pass vacuously. Lock a floor
  // well below realistic file counts but above zero so any regression in
  // collectFiles itself surfaces immediately.
  it('scans a non-empty set of production files', () => {
    expect(
      SCAN_FILES.length,
      'Phase 39 drift-guard scanned zero files — collectFiles or scan-root resolve is broken',
    ).toBeGreaterThan(10)
  })

  it('no forbidden moss/slate/dusk token appears in src/components/, src/app/, src/content/, or src/styles/', () => {
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
      `Forbidden moss/slate/dusk tokens found (Phase 39 3-theme-only invariant violated):\n${hits.join('\n')}`,
    ).toEqual([])
  })
})
