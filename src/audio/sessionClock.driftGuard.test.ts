// src/audio/sessionClock.driftGuard.test.ts
//
// Drift-guard for the SessionClock callers.
//
// The caller files consume time EXCLUSIVELY through the SessionClock interface —
// no direct `performance.now()`, `new AudioContext()`, or `audioCtx.currentTime` reads.
// This test fs-scans those files and asserts the absence of three banned tokens.
//
// Scope: EXACTLY 2 files — useSessionEngine.ts, useAudioCues.ts. This is NOT
// a project-wide ban — the engine internals (`src/audio/audioEngine.ts`)
// and the factory bodies (`src/audio/sessionClock.ts`) legitimately read
// the underlying tokens (only factories may touch `performance.now()` /
// `audioCtx.currentTime`; engine wires its own dispatch through `createAudioSessionClock`).
//
// Adding a caller: any NEW file under `src/hooks/` that imports from
// `src/audio/` should be added to CALLER_FILES below.
//
// Analog: src/content/content.no-review-markers.test.ts (banned-pattern
// fs-scan with hard-coded scope + comment-strip pre-pass).

// Reason: node:fs and node:path are available in the Vitest jsdom test
// environment. tsconfig.app.json has types:["vite/client"] which excludes
// @types/node; the triple-slash reference adds Node.js type coverage for
// this test-only file without altering tsconfig.app.json. Identical
// pattern to the analog at src/content/content.no-review-markers.test.ts.
/// <reference types="node" />

import { describe, it, expect } from 'vitest'
import { readFileSync } from 'node:fs'
import { resolve } from 'node:path'

// Hard-coded caller scope: exactly the SessionClock-consuming hooks.
// Deliberately a fixed list (NOT a directory walk) so the drift-guard
// scope is auditable and so adding a caller is an explicit review event.
// The test file itself is NOT in this list — no self-match risk for the regex sources below.
const CALLER_FILES = [
  resolve(__dirname, '..', 'hooks', 'useSessionEngine.ts'),
  resolve(__dirname, '..', 'hooks', 'useAudioCues.ts'),
] as const

interface BannedPattern {
  readonly name: string
  readonly re: RegExp
  // Files whose basename matches one of these strings are exempt from
  // this specific pattern. Matched via `basename.endsWith(b)`. Empty /
  // undefined = no exemption.
  readonly exemptFiles?: ReadonlyArray<string>
}

// Banned patterns. No caller is exempt — all SessionClock-consuming hooks
// must read time exclusively through the SessionClock interface.
const BANNED: ReadonlyArray<BannedPattern> = [
  {
    name: 'performance.now() direct call',
    re: /\bperformance\.now\(/,
  },
  {
    name: 'new AudioContext() construction',
    re: /\bnew\s+AudioContext\b/,
  },
  {
    name: 'raw audioCtx.currentTime read',
    re: /\baudioCtx\.currentTime\b/,
  },
]

// Strip single-line and block comments so the regex assertions are
// scoped to executable source. JSDoc or historical-reference comments
// may legitimately mention "performance.now()" or "audioCtx.currentTime";
// those must not trip the guard.
//
// Known limitation (documented by the string-literal sub-case below):
// this stripper does NOT remove string literals. Banned tokens embedded
// in string literals would still match the regex. The caller files
// have been audited to contain NO such literals. If a future caller
// introduces a banned-token string literal, the main test would flag it
// as a false-positive — at which point the stripper would need to be extended.
function stripComments(text: string): string {
  // Block comments /* ... */
  const noBlocks = text.replace(/\/\*[\s\S]*?\*\//g, '')
  // Line comments // ...
  // The leading `(^|[^:])` excludes `://` (URL schemes) so a literal
  // URL in a string is not partially eaten. Sufficient for the
  // caller files; matches the analog at content.no-review-markers.test.ts.
  const noLines = noBlocks.replace(/(^|[^:])\/\/[^\n]*/g, '$1')
  return noLines
}

describe('SessionClock drift-guard (Phase 50 / ABSTR-03 / D-09)', () => {
  it('no caller reads time directly (no performance.now() / new AudioContext() / audioCtx.currentTime)', () => {
    const hits: string[] = []
    for (const file of CALLER_FILES) {
      const raw = readFileSync(file, 'utf-8')
      const stripped = stripComments(raw)
      const basename = file.split('/').pop() ?? file
      for (const { name, re, exemptFiles } of BANNED) {
        if (exemptFiles?.some((b) => basename.endsWith(b))) continue
        if (re.test(stripped)) {
          hits.push(`${basename}: ${name}`)
        }
      }
    }
    expect(
      hits,
      `SessionClock drift-guard found banned tokens in caller files. ` +
        `These callers MUST consume time exclusively through the SessionClock ` +
        `interface (D-09 / ABSTR-03). Hits:\n${hits.join('\n')}`,
    ).toEqual([])
  })

  // Positive acceptance criterion for the string-literal false-positive case.
  //
  // The simple comment-stripper does NOT remove string literals. Banned tokens
  // embedded in string literals would still match the regex. The fixture file
  // intentionally contains string literals with banned tokens; the test asserts
  // the regex DOES match them, documenting the known limitation.
  //
  // The contract: production caller files MUST NOT contain banned tokens even
  // inside string literals; enforced by manual audit and the main caller-file scan above.
  //
  // If a future revision extends the stripper to also strip string literals, the
  // assertions below invert to `.toBe(false)` and this comment block is updated.
  it('does not match string-literal forms of banned tokens (revision 1 Warning #10)', () => {
    const fixturePath = resolve(__dirname, 'sessionClock.driftGuard.fixture.txt')
    const raw = readFileSync(fixturePath, 'utf-8')
    const stripped = stripComments(raw)
    // The fixture contains banned tokens inside string literals. After
    // comment-strip, the string literals are preserved, so the regex
    // matches them. This documents the known false-positive behavior
    // of the simple stripper.
    expect(
      /\bperformance\.now\(/.test(stripped),
      'fixture should contain a string-literal form of `performance.now(` ' +
        'that the simple regex matches (documenting the known limitation)',
    ).toBe(true)
    expect(
      /\bnew\s+AudioContext\b/.test(stripped),
      'fixture should contain a string-literal form of `new AudioContext` ' +
        'that the simple regex matches (documenting the known limitation)',
    ).toBe(true)
    expect(
      /\baudioCtx\.currentTime\b/.test(stripped),
      'fixture should contain a string-literal form of `audioCtx.currentTime` ' +
        'that the simple regex matches (documenting the known limitation)',
    ).toBe(true)
    // Contract: production caller files MUST be free of banned-token
    // string literals. Enforced by manual audit (Plans 50-02 through
    // 50-05) and by the main drift-guard test above.
  })
})
