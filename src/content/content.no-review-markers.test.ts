// src/content/content.no-review-markers.test.ts
//
// Phase 26 D-12: marker-guard. Originally failed if "// TODO: native-speaker review" appeared
// anywhere in src/content/. Locks the I18N-07 done-state against future regressions.
//
// Phase 48 D-18 (path a): extended with a structural allowlist for the new advanced.*
// namespace (renamed from appearance.* in Phase 49.1 Plan 03).
//
// Phase 48 REVIEW WR-03 follow-up: the original allowlist matched line-shape regexes (e.g.
// `/^\s*label:\s*'/`) that fired anywhere in a content file. Any future `label:` / `theme:`
// key introduced outside the advanced.* / appSettings.sections.theme block would be silently
// allowlisted. Replaced with block-scope tracking: a marker is allowed iff the value line
// immediately below it lives inside one of two structural contexts:
//
//   1. Any descendant of an `advanced: {` block (covers all advanced.* PT-BR keys); or
//   2. The `theme: ...` value line directly under `appSettings.sections` (D-01 renamed key).
//
// Close-out gate: when I18N-04 (native-speaker review pass) removes the markers, this guard
// stays green without further code changes — the allowlist is a relaxation, not a requirement.
//
// References:
//   CONTEXT.md D-18 — adaptation rationale and path selection
//   REQUIREMENTS.md I18N-02 — PT-BR completeness requirement (marker workflow)
//   REQUIREMENTS.md I18N-04 (future) — native-speaker review pass that closes the markers
//   REVIEW.md WR-03 — block-scope tightening rationale
//   Phase 49.1 Plan 03 — renamed appearance.* → advanced.* (D-10 / D-11)
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

// Block-open line: `<key>: {` at end of (trimmed) line. Captures the key name.
//
// Pattern intentionally rejects same-line block closes (e.g. `foo: {}`) — those
// don't open a persistent scope and shouldn't be pushed onto the stack.
const BLOCK_OPEN_RE = /^([a-zA-Z_$][\w$]*)\s*:\s*\{$/
// Block-close line: optional `)`/`,` decoration after the `}`.
const BLOCK_CLOSE_RE = /^\}\)?,?$/
// Value-line (any indented `<key>: <something>`). Captures the key name.
const VALUE_KEY_RE = /^\s*([a-zA-Z_$][\w$]*)\s*:/

/**
 * Walk through `text` line-by-line. For each REVIEW_MARKER on line N, check
 * whether the value line below it (line N+1) lives inside one of the two
 * structural allowlist contexts:
 *
 *   - Stack contains `'advanced'` (any descendant of `advanced: {`); or
 *   - Stack ends with `['appSettings', 'sections']` AND the next-line key is `theme`.
 *
 * Returns `${file}:${1-based-line-number}` entries for any marker that fails
 * both rules. A `null` `file` argument is permitted for synthetic test input.
 */
export function findUnreviewedMarkers(text: string, file: string | null): string[] {
  const lines = text.split('\n')
  const hits: string[] = []
  // Stack of currently-open block keys (root → leaf order).
  const stack: string[] = []

  for (let i = 0; i < lines.length; i++) {
    const raw = lines[i] ?? ''
    const trimmed = raw.trim()

    // Marker detection happens BEFORE we mutate the stack for this line so
    // the stack reflects the parent context of the value line below.
    if (raw.includes(REVIEW_MARKER)) {
      const nextLine = lines[i + 1] ?? ''
      const nextMatch = VALUE_KEY_RE.exec(nextLine)
      const nextKey = nextMatch?.[1] ?? null

      const inAdvanced = stack.includes('advanced')
      const inAppSettingsSectionsTheme =
        stack.length >= 2 &&
        stack[stack.length - 2] === 'appSettings' &&
        stack[stack.length - 1] === 'sections' &&
        nextKey === 'theme'

      if (!inAdvanced && !inAppSettingsSectionsTheme) {
        const where = file !== null ? `${file}:${String(i + 1)}` : `<input>:${String(i + 1)}`
        hits.push(where)
      }
    }

    // Update stack based on this line. We only handle the canonical
    // "block open on its own line" and "block close on its own line"
    // patterns — strings.ts follows these conventions consistently
    // (verified by Phase 26 / Phase 48 fixtures).
    const openMatch = BLOCK_OPEN_RE.exec(trimmed)
    if (openMatch?.[1]) {
      stack.push(openMatch[1])
    } else if (BLOCK_CLOSE_RE.test(trimmed) && stack.length > 0) {
      stack.pop()
    }
  }

  return hits
}

describe('src/content marker-guard (Phase 26 D-12 / I18N-07)', () => {
  it('no "// TODO: native-speaker review" marker remains outside the advanced.* / appSettings.sections.theme block context in src/content/', () => {
    const hits: string[] = []
    for (const file of CONTENT_FILES) {
      const text = readFileSync(file, 'utf-8')
      hits.push(...findUnreviewedMarkers(text, file))
    }
    expect(
      hits,
      `Unresolved native-speaker review markers outside the advanced.* block context in:\n${hits.join('\n')}`,
    ).toEqual([])
  })

  // WR-03 regression test: a `label:` key with a marker OUTSIDE the appearance.* block
  // must still fail the guard. The original shape-based allowlist would have allowed
  // this; the block-scope tracker correctly rejects it.
  it('flags a non-appearance label: key with a marker (WR-03 regression)', () => {
    const text = [
      `export const STUFF = {`,
      `  marketing: {`,
      `    // TODO: native-speaker review`,
      `    label: 'Compre agora',`,
      `  },`,
      `}`,
    ].join('\n')
    const hits = findUnreviewedMarkers(text, null)
    expect(hits).toEqual(['<input>:3'])
  })

  // WR-03 regression test: a `theme:` key with a marker OUTSIDE `appSettings.sections`
  // must still fail the guard. Locks the second half of the original shape-based
  // allowlist hole closed.
  it('flags a non-appSettings.sections theme: key with a marker (WR-03 regression)', () => {
    const text = [
      `export const STUFF = {`,
      `  someOtherBlock: {`,
      `    // TODO: native-speaker review`,
      `    theme: 'Tema',`,
      `  },`,
      `}`,
    ].join('\n')
    const hits = findUnreviewedMarkers(text, null)
    expect(hits).toEqual(['<input>:3'])
  })

  // Positive case: a marker INSIDE advanced.* must be allowlisted.
  it('allows a marker inside advanced.* (any descendant)', () => {
    const text = [
      `export const STUFF = {`,
      `  advanced: {`,
      `    orb: {`,
      `      options: {`,
      `        // TODO: native-speaker review`,
      `        halo: 'Halo',`,
      `      },`,
      `    },`,
      `  },`,
      `}`,
    ].join('\n')
    const hits = findUnreviewedMarkers(text, null)
    expect(hits).toEqual([])
  })

  // Positive case: a marker above `theme:` inside `appSettings.sections` must be allowlisted.
  it('allows a marker above theme: inside appSettings.sections', () => {
    const text = [
      `export const STUFF = {`,
      `  appSettings: {`,
      `    sections: {`,
      `      // TODO: native-speaker review`,
      `      theme: 'Tema',`,
      `    },`,
      `  },`,
      `}`,
    ].join('\n')
    const hits = findUnreviewedMarkers(text, null)
    expect(hits).toEqual([])
  })
})
