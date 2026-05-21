// src/audio/previewContext.no-audioengine-import.test.ts
//
// Phase 40 drift-guard (CONTEXT D-11) — PREV-03 structural lock.
//
// WHY this file exists: PREV-03 ("preview plays when muted") is satisfied
// structurally, not by a runtime branch. `let muted` lives only inside the
// createAudioEngine closure (audioEngine.ts:160) — no module-level export,
// no exported setter. Proving that previewContext.ts imports neither
// ./audioEngine nor any module known to re-export the engine's muted state
// proves the preview cannot be muted by setMuted.
//
// Future "helpfully wire engine into preview" refactors fail this test
// loudly. Deleting this file is the intentional unlock — record the
// rationale in the unlocking phase's SUMMARY.
//
// Pattern lineage: Phase 26 I18N-07 → 37 STATS-05 → 38 VAR-06 →
// 39 THM-01..03 → 40 PREV-03 (drift-guard-as-lock at the import-graph level).
// Analog: src/content/content.no-removed-themes.test.ts (Phase 39 — structural twin).

// Reason: node:fs and node:path are available in the Vitest jsdom test environment.
// tsconfig.app.json has types:["vite/client"] which excludes @types/node; the triple-slash
// reference adds Node.js type coverage for this test-only file without altering tsconfig.app.json.
/// <reference types="node" />

import { describe, it, expect } from 'vitest'
import { readFileSync } from 'node:fs'
import { resolve } from 'node:path'

const PREVIEW_PATH = resolve(__dirname, 'previewContext.ts')

// Forbidden import list (CONTEXT D-11 + D-15 Claude's Discretion).
// Each entry carries a human-readable label so the failure message names
// exactly which forbidden import tripped the guard.
const FORBIDDEN_IMPORTS: Array<{ label: string; pattern: RegExp }> = [
  // Primary lock for PREV-03 — direct engine import.
  { label: "import from './audioEngine'", pattern: /from\s+['"]\.\/audioEngine['"]/ },
  // Cover relative-path variants in case previewContext.ts ever moves.
  { label: "import from '../audio/audioEngine'", pattern: /from\s+['"]\.\.\/audio\/audioEngine['"]/ },
  // D-15 wider net: the hook re-exports mute state if it ever gets refactored.
  { label: "import from '../hooks/useAudioCues'", pattern: /from\s+['"]\.\.\/hooks\/useAudioCues['"]/ },
]

describe('Phase 40 drift-guard: previewContext.ts must not import audioEngine (PREV-03 structural lock)', () => {
  it('previewContext.ts imports neither ./audioEngine nor any module that re-exports muted state', () => {
    const text = readFileSync(PREVIEW_PATH, 'utf-8')
    const hits: string[] = []
    for (const f of FORBIDDEN_IMPORTS) {
      if (f.pattern.test(text)) hits.push(f.label)
    }
    expect(
      hits,
      `previewContext.ts contains forbidden import(s) — PREV-03 structural invariant violated:\n${hits.join('\n')}`,
    ).toEqual([])
  })
})
