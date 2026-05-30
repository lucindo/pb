// src/styles/theme.no-hardcoded-classes.test.ts
//
// Regression guard: no production .tsx file may reference the 10 banned hardcoded
// Tailwind palette utilities. Any re-introduction of these patterns fails CI.

/// <reference types="node" />

import { describe, it, expect } from 'vitest'
import { readFileSync, readdirSync, statSync } from 'node:fs'
import { resolve, join } from 'node:path'

// The 10 banned regex patterns:
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

// Exclude *.test.tsx, *.stories.tsx, and src/themes/** (token defs).
function collectTsxFiles(dir: string, acc: string[] = []): string[] {
  for (const entry of readdirSync(dir)) {
    const full = join(dir, entry)
    const st = statSync(full)
    if (st.isDirectory()) {
      if (entry === 'themes') continue // src/themes/** exclusion
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

describe.each(BANNED_PATTERNS)('banned class %s', (name, pattern) => {
  it('is not present in any production .tsx file', () => {
    const hits: string[] = []
    for (const file of TSX_FILES) {
      const text = readFileSync(file, 'utf-8')
      if (pattern.test(text)) hits.push(file)
    }
    expect(hits, `Found banned ${name} in:\n${hits.join('\n')}`).toEqual([])
  })
})
