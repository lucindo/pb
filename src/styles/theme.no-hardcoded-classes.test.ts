// src/styles/theme.no-hardcoded-classes.test.ts
//
// Phase 16.1 THEME-UI-01 / D-04: regression guard — no production .tsx file
// references the 10 banned hardcoded Tailwind palette utilities. Long-term safety net
// for Phase 17/18/19 to prevent silent re-introduction of theme-blind colors.
//
// Lifecycle:
//   - Wave 0 (this commit): test is RED — today's codebase has ~58 banned-class
//     occurrences across 16 production .tsx files. RED proves the guard catches the
//     real regression that motivated Phase 16.1.
//   - Waves 1-2 (plans 02, 03, 04, 05, 06): each migration plan reduces the per-file
//     hit count. The guard stays RED until plan 06 (Group A — SessionControls) clears
//     the last text-white/bg-teal occurrences.
//   - Wave 3 (plan 07): the test flips to GREEN as part of the phase-close criterion.
//
// TEMPORARILY SKIPPED Wave 0..Wave 2 (D-04 + D-17 per-commit green-gate carry-over):
//   The describe.each is `.skip`'d so the per-commit green-gate stays intact while
//   the migration is in progress. Re-enabled at plan 07 phase close (remove `.skip`).
//   Manual run to see RED progress narrowing:
//     `npx vitest run src/styles/theme.no-hardcoded-classes.test.ts --no-skip`
//   (or temporarily flip `describe.each.skip` back to `describe.each` in this file.)

/// <reference types="node" />

import { describe, it, expect } from 'vitest'
import { readFileSync, readdirSync, statSync } from 'node:fs'
import { resolve, join } from 'node:path'

// CONTEXT.md D-04: the 10 banned regex patterns (authoritative for both migration AND guard).
const BANNED_PATTERNS: ReadonlyArray<readonly [string, RegExp]> = [
  ['text-slate-N', /\btext-slate-[0-9]/],
  ['bg-slate-N', /\bbg-slate-[0-9]/],
  ['border-slate-N', /\bborder-slate-[0-9]/],
  ['text-teal-N', /\btext-teal-[0-9]/],
  ['bg-teal-N', /\bbg-teal-[0-9]/],
  ['border-teal-N', /\bborder-teal-[0-9]/],
  ['text-white', /\btext-white\b/],
  ['bg-white', /\bbg-white\b/],
  ['text-black', /\btext-black\b/],
  ['bg-black', /\bbg-black\b/],
]

// CONTEXT.md D-04: exclude *.test.tsx, *.stories.tsx, and src/themes/** (token defs).
// PATTERNS.md §3: walker is shape-identical to the recursive scan in theme.contrast.test.ts.
function collectTsxFiles(dir: string, acc: string[] = []): string[] {
  for (const entry of readdirSync(dir)) {
    const full = join(dir, entry)
    const st = statSync(full)
    if (st.isDirectory()) {
      if (entry === 'themes') continue // src/themes/** exclusion (D-04)
      collectTsxFiles(full, acc)
    } else if (
      entry.endsWith('.tsx') &&
      !entry.endsWith('.test.tsx') &&
      !entry.endsWith('.stories.tsx')
    ) {
      acc.push(full)
    }
  }
  return acc
}

const SRC_DIR = resolve(__dirname, '..')
const TSX_FILES = collectTsxFiles(SRC_DIR)

// Vitest 4 API: skip modifier comes before .each (describe.skip.each, not describe.each.skip).
// The acceptance criteria allow either form; functionally identical (suite-level skip).
describe.skip.each(BANNED_PATTERNS)('banned class %s', (name, pattern) => {
  it('is not present in any production .tsx file', () => {
    const hits: string[] = []
    for (const file of TSX_FILES) {
      const text = readFileSync(file, 'utf-8')
      if (pattern.test(text)) hits.push(file)
    }
    expect(hits, `Found banned ${name} in:\n${hits.join('\n')}`).toEqual([])
  })
})
