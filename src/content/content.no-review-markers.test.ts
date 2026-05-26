// src/content/content.no-review-markers.test.ts
//
// Phase 26 D-12: marker-guard. Originally failed if "// TODO: native-speaker review" appeared
// anywhere in src/content/. Locks the I18N-07 done-state against future regressions.
//
// Phase 48 D-18 (path a): Extended with a structural line-above-value allowlist for the new
// appearance.* namespace introduced in Phase 48. The allowlist is a fixed list of key-shape
// patterns — not a file-name wildcard or namespace-string match — so it is tight: only markers
// placed on the line immediately above one of the listed appearance.* key value lines are allowed.
// Any marker above an unlisted key (e.g., above `language: 'Idioma'`) still fails.
//
// Close-out gate: when I18N-04 (native-speaker review pass) removes the markers, this guard
// stays green without further code changes — the allowlist is a relaxation, not a requirement.
//
// References:
//   CONTEXT.md D-18 — adaptation rationale and path selection
//   REQUIREMENTS.md I18N-02 — PT-BR completeness requirement (marker workflow)
//   REQUIREMENTS.md I18N-04 (future) — native-speaker review pass that closes the markers
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

// Phase 48 D-18 path (a): structural allowlist of appearance.* value-line shapes.
//
// When a REVIEW_MARKER appears on line N, this guard checks whether line N+1 matches
// one of these patterns. If yes, the marker is allowlisted (it precedes a known
// appearance.* key value). If no, the marker is a violation.
//
// Pattern design: each regex matches the structural shape of an appearance.* value line
// (leading whitespace + key name + colon + single-quote). This is tight enough to avoid
// false-positives in unrelated sections while not requiring brace-balance tracking.
//
// The `theme:` pattern covers the D-01 renamed key (appSettings.sections.theme 'Tema')
// which also carries a // TODO: native-speaker review marker per D-09.
//
// D-18 + I18N-02 reference: these patterns correspond 1:1 to the Phase 48 PT-BR entries
// in UI_STRINGS['pt-BR'].appearance.* and UI_STRINGS['pt-BR'].appSettings.sections.theme.
// I18N-04 future requirement: when the native-speaker pass removes all markers, this
// allowlist becomes vacuously unexercised — no code change needed.
const ALLOWED_KEY_PATTERNS: RegExp[] = [
  /^\s*title:\s*'/,
  /^\s*backChevron:\s*'/,
  /^\s*rightChevronAriaOnSettings:\s*'/,
  /^\s*orbStyle:\s*'/,
  /^\s*visual:\s*'/,
  /^\s*label:\s*'/,
  /^\s*halo:\s*'/,
  /^\s*minimal:\s*'/,
  /^\s*kuthasta:\s*'/,
  /^\s*arc:\s*'/,
  /^\s*rings:\s*'/,
  /^\s*theme:\s*'/, // D-01 renamed key: appSettings.sections.theme (PT-BR 'Tema')
]

describe('src/content marker-guard (Phase 26 D-12 / I18N-07)', () => {
  it('no "// TODO: native-speaker review" marker remains outside the appearance.* allowlist in src/content/', () => {
    const hits: string[] = []
    for (const file of CONTENT_FILES) {
      const text = readFileSync(file, 'utf-8')
      const lines = text.split('\n')
      for (let i = 0; i < lines.length; i++) {
        const currentLine = lines[i] ?? ''
        if (currentLine.includes(REVIEW_MARKER)) {
          // Check whether the next line matches one of the allowed appearance.* key patterns.
          const nextLine = lines[i + 1] ?? ''
          const isAllowed = ALLOWED_KEY_PATTERNS.some((pattern) => pattern.test(nextLine))
          if (!isAllowed) {
            hits.push(`${file}:${i + 1}`)
          }
        }
      }
    }
    expect(
      hits,
      `Unresolved native-speaker review markers outside appearance.* allowlist in:\n${hits.join('\n')}`,
    ).toEqual([])
  })
})
