// src/content/content.no-review-markers.test.ts
//
// Phase 26 D-12: marker-guard. Fails if "// TODO: native-speaker review" appears
// anywhere in src/content/. Locks the I18N-07 done-state against future regressions.
//
// Analog: src/styles/theme.no-hardcoded-classes.test.ts (banned-pattern fs-scan guard)

// Reason: node:fs and node:path are available in the Vitest jsdom test environment.
// tsconfig.app.json has types:["vite/client"] which excludes @types/node; the triple-slash
// reference adds Node.js type coverage for this test-only file without altering tsconfig.app.json.
/// <reference types="node" />

import { describe, it, expect } from 'vitest'
import { readFileSync, readdirSync, statSync } from 'node:fs'
import { resolve, join } from 'node:path'

// Collect all non-test .ts files in src/content/.
// Excluding .test.ts files is load-bearing — this guard file itself contains the
// literal marker substring (in the const below) and must not flag itself.
function collectFiles(dir: string, acc: string[] = []): string[] {
  for (const entry of readdirSync(dir)) {
    const full = join(dir, entry)
    const st = statSync(full)
    if (st.isDirectory()) {
      collectFiles(full, acc)
    } else if (entry.endsWith('.ts') && !entry.endsWith('.test.ts')) {
      acc.push(full)
    }
  }
  return acc
}

const CONTENT_DIR = resolve(__dirname) // = src/content
const CONTENT_FILES = collectFiles(CONTENT_DIR)

const REVIEW_MARKER = 'TODO: native-speaker review'

describe('src/content marker-guard (Phase 26 D-12 / I18N-07)', () => {
  it('no "// TODO: native-speaker review" marker remains in src/content/', () => {
    const hits: string[] = []
    for (const file of CONTENT_FILES) {
      const text = readFileSync(file, 'utf-8')
      if (text.includes(REVIEW_MARKER)) hits.push(file)
    }
    expect(hits, `Unresolved native-speaker review markers in:\n${hits.join('\n')}`).toEqual([])
  })
})
