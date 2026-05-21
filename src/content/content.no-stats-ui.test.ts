// src/content/content.no-stats-ui.test.ts
//
// Phase 37 STATS-05 anti-gamification drift-guard.
//
// Scanned roots: src/components/ and src/app/ (all five render paths:
//   Idle, Running, Complete, Learn, App Settings).
//
// Forbidden token classes (CONTEXT D-09 / D-10):
//   1. Plain substring (case-sensitive): 'StatsFooter', 'ResetStatsDialog'
//   2. Regex case-insensitive: /MIN TODAY/i, /STREAK/i, /TOTAL TIME/i
//   3. Regex required-uppercase (no i flag, word-boundary): /\bSESSIONS\b/
//
// WHY this file exists (CONTEXT D-11): Plans 01 + 02 deleted all forbidden stats-UI tokens
// from the scanned roots. This drift-guard locks that done-state against future regressions.
// It is the lock — future re-introduction of a calm stats display is a deliberate phase
// decision that explicitly deletes this file with rationale recorded in that phase's SUMMARY
// (see REQUIREMENTS STATSDISPLAY-01). Deleting this file is the intentional unlock.
//
// Analog: src/content/content.no-review-markers.test.ts (Phase 26 D-12 / I18N-07)

// Reason: node:fs and node:path are available in the Vitest jsdom test environment.
// tsconfig.app.json has types:["vite/client"] which excludes @types/node; the triple-slash
// reference adds Node.js type coverage for this test-only file without altering tsconfig.app.json.
/// <reference types="node" />

import { describe, it, expect } from 'vitest'
import { readFileSync, readdirSync, statSync } from 'node:fs'
import { resolve, join } from 'node:path'

// Collect all non-test .ts and .tsx files under dir (recursive).
// Excluding .test.ts and .test.tsx files is load-bearing — this guard file itself contains
// the literal token strings (inside the forbidden-token list below) and must not flag itself.
// Note: the analog (content.no-review-markers.test.ts) only handles .ts / .test.ts;
// Phase 37 must scan .tsx as well because the deleted components and their App consumers
// were TSX files.
function collectFiles(dir: string, acc: string[] = []): string[] {
  for (const entry of readdirSync(dir)) {
    const full = join(dir, entry)
    const st = statSync(full)
    if (st.isDirectory()) {
      collectFiles(full, acc)
    } else if (
      (entry.endsWith('.ts') || entry.endsWith('.tsx')) &&
      !entry.endsWith('.test.ts') &&
      !entry.endsWith('.test.tsx')
    ) {
      acc.push(full)
    }
  }
  return acc
}

const COMPONENTS_DIR = resolve(__dirname, '..', 'components')
const APP_DIR = resolve(__dirname, '..', 'app')

// Flat list of all non-test production .ts / .tsx files across both scanned roots.
const SCAN_FILES: string[] = [
  ...collectFiles(COMPONENTS_DIR),
  ...collectFiles(APP_DIR),
]

// Forbidden token list (CONTEXT D-10).
// Each entry carries a human-readable label so the failure message names exactly which
// token tripped the guard — making it immediately clear to the contributor what landed.
const FORBIDDEN_TOKENS: Array<{ label: string; match: (text: string) => boolean }> = [
  {
    label: 'StatsFooter (component name)',
    match: (t) => t.includes('StatsFooter'),
  },
  {
    label: 'ResetStatsDialog (component name)',
    match: (t) => t.includes('ResetStatsDialog'),
  },
  {
    label: 'MIN TODAY (visual stats marker)',
    match: (t) => /MIN TODAY/i.test(t),
  },
  {
    label: 'STREAK (visual stats marker)',
    match: (t) => /STREAK/i.test(t),
  },
  {
    label: 'TOTAL TIME (visual stats marker)',
    match: (t) => /TOTAL TIME/i.test(t),
  },
  {
    // SESSIONS uses \b word-boundary without the /i flag per CONTEXT D-10:
    // only the uppercase form is forbidden (the visual stat readout uses the uppercase form).
    // The lowercase word "sessions" appears legitimately in other contexts (e.g. comments).
    label: 'SESSIONS (uppercase visual stats marker)',
    match: (t) => /\bSESSIONS\b/.test(t),
  },
]

describe('STATS-05 drift-guard (CONTEXT D-09 / D-10 / D-11)', () => {
  it('no forbidden stats-UI token appears in src/components/ or src/app/', () => {
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
      `Forbidden stats-UI tokens found (Phase 37 anti-gamification invariant violated):\n${hits.join('\n')}`,
    ).toEqual([])
  })
})
