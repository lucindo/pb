---
phase: 40-timbre-preview-cue
plan: 02
status: complete
type: execute
wave: 2
depends_on: [40-01]
requirements_addressed: [PREV-03]
tags: [audio, drift-guard, structural-test, import-graph, prev-03]
---

# Plan 40-02: PREV-03 structural import-graph drift-guard

## What was delivered

One new test file: `src/audio/previewContext.no-audioengine-import.test.ts`.

### Drift-guard contents

- `/// <reference types="node" />` triple-slash directive (matches Phase 39 analog).
- WHY-only header comment block citing CONTEXT D-11, PREV-03, the audioEngine.ts:160 closure mechanism, and the unlock contract ("Deleting this file is the intentional unlock").
- Imports `readFileSync` from `'node:fs'` and `resolve` from `'node:path'`.
- One `describe` / one `it`: reads `previewContext.ts` via `readFileSync`, iterates a ban-list of 3 forbidden import patterns, asserts hits equals `[]` with a failure message naming any tripped imports.

### Ban-list (the load-bearing PREV-03 lock)

| Label | Regex pattern |
|-------|---------------|
| `import from './audioEngine'` | `/from\s+['"]\.\/audioEngine['"]/` |
| `import from '../audio/audioEngine'` | `/from\s+['"]\.\.\/audio\/audioEngine['"]/` |
| `import from '../hooks/useAudioCues'` | `/from\s+['"]\.\.\/hooks\/useAudioCues['"]/` |

The first entry is the minimum CONTEXT D-11 requires. Entries 2-3 are D-15 Claude's Discretion: relative-path variant in case previewContext.ts moves, and the indirect-via-hook path.

## Why the structural lock works

`let muted` lives only inside the `createAudioEngine` closure (`src/audio/audioEngine.ts:160`). There is no module-level export, no exported setter, no global flag. The only path to that variable is through the engine instance returned by `createAudioEngine()`. Proving that `previewContext.ts` imports none of those modules proves the preview cannot be muted by `setMuted` — PREV-03 is locked at the import-graph level.

## Verification

| Gate | Command | Result |
|------|---------|--------|
| Test passes against current source | `npx vitest run src/audio/previewContext.no-audioengine-import.test.ts` | 1/1 passed (589ms) |
| Type-check | `npx tsc --noEmit` | exit 0 |

## Unlock contract

Deleting this file is the documented intentional unlock. Any future phase that legitimately introduces an audioEngine import path to previewContext.ts must delete this guard and record the rationale in that phase's SUMMARY.

## Commits

- `6faaf06` test(40): lock PREV-03 via structural import-graph guard

## Key files created

- `src/audio/previewContext.no-audioengine-import.test.ts` (55 lines)

## Self-Check: PASSED

- [x] File exists at the planned path
- [x] Triple-slash node reference directive present
- [x] WHY-only header cites D-11 and PREV-03
- [x] `readFileSync` + `resolve` imports from `node:fs`/`node:path`
- [x] Ban-list covers the 3 forbidden imports listed in the plan
- [x] Test exits 0 against the current previewContext.ts
- [x] `npx tsc --noEmit` exits 0
