---
phase: 40-timbre-preview-cue
plan: 03
status: complete
type: execute
wave: 2
depends_on: [40-01]
requirements_addressed: [PREV-01, PREV-04]
tags: [ui, timbre-picker, onclick, wiring, prev-01, prev-04]
---

# Plan 40-03: TimbrePicker onClick wiring + D-10(e/f/g) tests

## What was delivered

Two file edits — both surgical, matching the D-04 plan-shape budget.

### Task 1: `src/components/TimbrePicker.tsx` — 3-line wiring diff

```diff
 import { TIMBRE_OPTIONS, type TimbreId } from '../domain/settings'
 import { useTimbreChoice } from '../hooks/useTimbreChoice'
+import { playInhalePreview } from '../audio/previewContext'
 import type { UiStrings } from '../content/strings'
...
-              onClick={() => { setTimbre(id) }}
+              onClick={() => { setTimbre(id); playInhalePreview(id) }}
```

- Stat: 1 file changed, 2 insertions, 1 deletion.
- D-04 surgical edit honoured. No JSX restructure, no prop changes, no useEffect, no equality guard.
- D-16/D-17 invariants intact: `TimbrePickerProps` unchanged, no `useTimbreChoice` coupling.

### Task 2: `src/components/TimbrePicker.test.tsx` — vi.mock + 3 wiring cases

- Added `vi.mock('../audio/previewContext', () => ({ playInhalePreview: vi.fn() }))` hoisted above the `TimbrePicker` import.
- Added `import { playInhalePreview } from '../audio/previewContext'`.
- Added `vi.mocked(playInhalePreview).mockClear()` to the existing `beforeEach` (because `vi.restoreAllMocks` resets spies but not the factory-created `vi.fn`).
- Added 3 new `it` blocks to the existing `describe('TimbrePicker — real radiogroup picker (Phase 18)')` block:

| Test title (substring) | Decision | Assertion |
|------------------------|----------|-----------|
| clicking an option fires playInhalePreview with the new TimbreId | D-10(e) / D-04 | `toHaveBeenCalledTimes(1)` + `toHaveBeenCalledWith('sine')` |
| when disabled=true, clicking a button does NOT invoke playInhalePreview | D-10(f) / PREV-04 | `not.toHaveBeenCalled()` |
| tapping the currently-selected timbre fires playInhalePreview again | D-10(g) / D-09 | `toHaveBeenCalledTimes(2)` + `toHaveBeenNthCalledWith(1, 'bell')` + `toHaveBeenNthCalledWith(2, 'bell')` |

## Verification

| Gate | Command | Result |
|------|---------|--------|
| Wiring grep | `grep -E 'setTimbre\(id\).*playInhalePreview\(id\)' src/components/TimbrePicker.tsx` | match found |
| No useEffect | `grep -c 'useEffect' src/components/TimbrePicker.tsx` | 0 (D-05 lock holds) |
| Tests | `npx vitest run src/components/TimbrePicker.test.tsx` | 11/11 passed (8 pre-existing + 3 new) |
| Type-check | `npx tsc --noEmit` | exit 0 |
| Lint (file-scoped) | `npx eslint src/components/TimbrePicker.tsx src/components/TimbrePicker.test.tsx` | exit 0 |

## Invariants preserved

- Phase 18 D-16 (timbre body in TimbrePicker.tsx + useTimbreChoice.ts only).
- Phase 18 D-17 (props stay `{ disabled, strings, sectionLabel }`).
- CONTEXT D-05 (onClick-only trigger — no `useEffect` cross-tab path).
- CONTEXT D-09 (re-tap re-auditions — no equality guard).
- PREV-04 satisfied structurally via the pre-existing `disabled={inSessionView}` prop drilling; D-10(f) is the test-level lock.

## Commits

- `ad8a9d6` feat(40): wire TimbrePicker onClick to playInhalePreview
- `1256c9f` test(40): cover TimbrePicker preview wiring (D-10 e/f/g)

## Key files modified

- `src/components/TimbrePicker.tsx` (3-line diff)
- `src/components/TimbrePicker.test.tsx` (+47 lines: mock setup + 3 tests)

## Self-Check: PASSED

- [x] TimbrePicker.tsx contains the named import from `../audio/previewContext`
- [x] onClick calls `setTimbre(id)` then `playInhalePreview(id)` in that order
- [x] TimbrePickerProps unchanged
- [x] No `useEffect` in TimbrePicker.tsx
- [x] No equality guard / `if (timbre === id)` on the onClick
- [x] 3 new test titles present with substring matches
- [x] D-10(g) test uses `toHaveBeenNthCalledWith(1, 'bell')` AND `toHaveBeenNthCalledWith(2, 'bell')`
- [x] All 11 TimbrePicker tests pass
- [x] tsc + lint exit 0
