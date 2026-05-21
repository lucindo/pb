---
phase: 40-timbre-preview-cue
plan: "01"
subsystem: audio
tags: [web-audio, audiocontext, singleton, preview, vitest, tdd]

requires:
  - phase: 18-timbres
    provides: "scheduleInCueForTimbre dispatch API + TimbreId type"
  - phase: 03-audio-engine
    provides: "FakeAudioContext polyfill in vitest.setup.ts"
provides:
  - "src/audio/previewContext.ts: pure audio module with playInhalePreview(timbre) + module-level AudioContext singleton"
  - "src/audio/previewContext.test.ts: D-10(a-d) unit coverage under FakeAudioContext polyfill"
affects: [40-02, 40-03, 43-app-settings]

tech-stack:
  added: []
  patterns:
    - "Module-level AudioContext singleton (D-01): lazy-create on first tap, reuse on subsequent taps"
    - "Fire-and-forget ctx.resume() before scheduling (D-02): synchronous-call-path contract, no await"
    - "vi.doMock + vi.resetModules per-test for module-singleton isolation in Vitest"
    - "vi.stubGlobal for capturing AudioContext instance in constructor-intercept tests"

key-files:
  created:
    - src/audio/previewContext.ts
    - src/audio/previewContext.test.ts
  modified: []

key-decisions:
  - "vi.doMock('./cueSynth') used instead of vi.spyOn because previewContext.ts captures scheduleInCueForTimbre at import time via ES module binding — spying the module object after import would not intercept the internal reference"
  - "vi.stubGlobal('AudioContext', class extends OriginalAC) used for D-10(b) instead of vi.spyOn(window, 'AudioContext').mock.instances — spyOn instances lose FakeAudioContext prototype methods (_fireStateChange) in the wrapper context"
  - "D-03 natural decay lock asserted via callArgs.length === 4 + callArgs[4].toBeUndefined() rather than positional undefined in toHaveBeenCalledWith — vitest does not treat an omitted arg as a passed undefined in the call record"

patterns-established:
  - "Module-singleton pattern for WebAudio in previewContext.ts: pure module, single export, no class, no React"

requirements-completed: [PREV-02, PREV-05]

duration: 10min
completed: 2026-05-21
---

# Phase 40 Plan 01: previewContext Module + Unit Tests Summary

**Pure `playInhalePreview(timbre)` audio module with module-level AudioContext singleton, resume-if-suspended dispatch, and D-10(a-d) Vitest unit coverage under FakeAudioContext polyfill**

## Performance

- **Duration:** ~10 min
- **Started:** 2026-05-21T22:50:00Z
- **Completed:** 2026-05-21T22:59:40Z
- **Tasks:** 2 (both committed atomically in one commit per plan specification)
- **Files modified:** 2 (both new)

## Accomplishments

- Created `src/audio/previewContext.ts` as a pure audio module exporting a single bare function `playInhalePreview(timbre: TimbreId): void` — zero React imports, zero audioEngine imports, module-level `let ctx: AudioContext | null = null` singleton, fire-and-forget `ctx.resume()` before scheduling, `scheduleInCueForTimbre` called with `phaseDurationSec` omitted
- Created `src/audio/previewContext.test.ts` with 7 passing tests covering D-10(a–d): per-timbre dispatch correctness for all 4 TimbreIds with phaseDurationSec=undefined lock (a), resume-when-suspended (b), singleton reuse across N taps (c), synchronous-call-path contract (d)
- PREV-02 satisfied: dispatch goes through `scheduleInCueForTimbre` from `./cueSynth` — no duplicated DSP
- PREV-05 satisfied structurally: no `await` in `playInhalePreview`; `scheduleInCueForTimbre` called in the same microtask as entry (D-12 contract)

## Task Commits

1. **Tasks 1+2: previewContext module + unit tests** - `9c93da6` (feat)

**Plan metadata:** TBD (docs commit at end)

## Files Created/Modified

- `src/audio/previewContext.ts` — Pure audio module: singleton AudioContext, resume-if-suspended, scheduleInCueForTimbre dispatch. 40 lines, zero React imports, zero audioEngine imports, single export.
- `src/audio/previewContext.test.ts` — D-10(a-d) unit tests: 7 tests, vi.resetModules singleton isolation, vi.doMock cueSynth interception for dispatch-correctness and sync-path proofs.

## D-10 Test Case Count

| Case | Description | Status |
|------|-------------|--------|
| a (×4) | per-timbre dispatch + phaseDurationSec=undefined | 4 passing |
| b | ctx.resume() called when suspended | 1 passing |
| c | singleton reuse across N taps | 1 passing |
| d | synchronous-call-path contract | 1 passing |

**Total: 7 tests passing**

## Decisions Made

1. **ES module binding interception via `vi.doMock`**: `previewContext.ts` captures `scheduleInCueForTimbre` at import time via a live ES module binding. `vi.spyOn(cueSynth, 'scheduleInCueForTimbre')` after import would not intercept the internal reference. Solution: `vi.doMock('./cueSynth', () => ({ scheduleInCueForTimbre: spy }))` registers the mock before the module is imported.

2. **`vi.stubGlobal` for D-10(b) instance capture**: `vi.spyOn(window, 'AudioContext').mock.instances[0]` loses the `FakeAudioContext` prototype chain — specifically `_fireStateChange` (a private class method) is not accessible via the spy wrapper. Solution: `vi.stubGlobal('AudioContext', class extends OriginalAC { constructor() { super(); capturedCtx = this } })` captures the instance at construction time with the full prototype intact.

3. **D-03 assertion via `callArgs.length === 4`**: Vitest's `toHaveBeenCalledWith(..., undefined)` requires the function to have been called with 5 arguments where the 5th is `undefined`. But `previewContext.ts` calls `scheduleInCueForTimbre(ctx, when, dest, timbre)` with exactly 4 args. The correct assertion is `expect(callArgs).toHaveLength(4)` + `expect(callArgs[4]).toBeUndefined()`.

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 1 - Bug] Test approach for `vi.spyOn` on cueSynth required `vi.doMock`**
- **Found during:** Task 2 (previewContext.test.ts implementation)
- **Issue:** PATTERNS.md showed `vi.spyOn(cueSynth, 'scheduleInCueForTimbre')` approach, but this doesn't intercept the function reference already captured by `previewContext.ts` at import time.
- **Fix:** Used `vi.doMock('./cueSynth', () => ({ scheduleInCueForTimbre: spy }))` + `vi.resetModules()` per test, which registers a fresh mock before the module is imported via dynamic `await import('./previewContext')`.
- **Files modified:** `src/audio/previewContext.test.ts`
- **Verification:** 4 per-timbre dispatch tests now pass.
- **Committed in:** `9c93da6`

**2. [Rule 1 - Bug] `vi.spyOn(window, 'AudioContext').mock.instances` loses prototype methods**
- **Found during:** Task 2, D-10(b) implementation
- **Issue:** Getting `acCtor.mock.instances[0]` and calling `._simulateSuspend()` threw `TypeError: this._fireStateChange is not a function` — the spy wrapper breaks the FakeAudioContext prototype chain.
- **Fix:** Used `vi.stubGlobal('AudioContext', class extends OriginalAC)` to subclass FakeAudioContext and capture `this` at construction time, preserving the full prototype chain.
- **Files modified:** `src/audio/previewContext.test.ts`
- **Verification:** D-10(b) suspend/resume test passes.
- **Committed in:** `9c93da6`

---

**Total deviations:** 2 auto-fixed (both Rule 1 - test approach corrections)
**Impact on plan:** Both fixes are test implementation corrections within Task 2 scope. Production code (`previewContext.ts`) unchanged from plan specification. No scope creep.

## Issues Encountered

None beyond the two test approach adjustments documented above as deviations.

## Green Gate Evidence

```
npx tsc --noEmit     → exit 0 (no type errors)
npx vitest run src/audio/previewContext.test.ts → 7/7 passed
```

No lint or build regressions (production code files only: previewContext.ts — no React, no complex patterns, tsc clean).

## Known Stubs

None. The implementation is complete for Plan 01's scope. `playInhalePreview` is wired to the real `scheduleInCueForTimbre` via the real `./cueSynth` import; no mocks or placeholders in the production module.

## Threat Surface Scan

No new network endpoints, auth paths, file access patterns, or schema changes introduced. `previewContext.ts` is a pure in-process audio module. No additions to the threat register beyond the four accepted items in the Plan 01 `<threat_model>` block.

## Next Phase Readiness

- `src/audio/previewContext.ts` is ready for Plan 02 (structural import-graph drift guard asserting no `./audioEngine` import — D-11 / PREV-03 lock)
- `src/audio/previewContext.ts` is ready for Plan 03 (TimbrePicker.tsx onClick wiring — D-04)
- Plan 02 and Plan 03 are parallel-safe (Plan 02 only reads previewContext.ts; Plan 03 edits TimbrePicker.tsx which does not exist in this plan's file set)

---
*Phase: 40-timbre-preview-cue*
*Completed: 2026-05-21*
