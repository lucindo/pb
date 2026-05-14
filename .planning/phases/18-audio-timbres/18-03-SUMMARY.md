---
phase: 18-audio-timbres
plan: 03
subsystem: audio
tags:
  - audio
  - dispatch
  - engine
  - timbre-presets
  - parameterization
dependency-graph:
  requires:
    - "src/audio/timbres.ts (Plan 01: TIMBRE_PRESETS Readonly<Record<TimbreId, TimbrePreset>> + TimbrePreset interface)"
    - "src/domain/settings.ts (Phase 14 D-01: TimbreId, DEFAULT_TIMBRE — locked)"
  provides:
    - "scheduleInCueForTimbre / scheduleOutCueForTimbre exported dispatch surface in src/audio/cueSynth.ts"
    - "scheduleBowlCue parameterized signature (preset: TimbrePreset, kind: 'in' | 'out') replacing loose fundamentalHz + defaultDecayTau args"
    - "AudioEngineOptions.timbre required TimbreId field with capture-at-construction (sessionTimbre const, no setter)"
    - "scheduleInCue / scheduleOutCue preserved as Bowl-only thin wrappers (TIMBRE-02 signature stability)"
  affects:
    - "Plan 04 (useAudioCues timbreRef + start(plan, timbre)) — replaces this plan's interim DEFAULT_TIMBRE scaffold with proper timbre threading + reconstruction capture"
    - "Plan 06 (App integration) — App.tsx onStartClick will read loadPrefs().timbre and pass to audio.start(plan, timbre)"
tech-stack:
  added: []
  patterns:
    - "Parameterized DSP scheduler reading from preset-record (TIMBRE_PRESETS[timbre]) — replaces individual scheduleBellCue/scheduleSineCue/scheduleChimeCue functions"
    - "Capture-at-construction via const closure (no setter) — D-08 immutability invariant"
    - "Bowl-only thin wrapper preservation pattern for signature stability across timbre dispatch refactor"
key-files:
  created: []
  modified:
    - "src/audio/cueSynth.ts (113 LOC delta — 8 Bowl module constants deleted; scheduleBowlCue parameterized; 2 new exports + 2 preserved wrappers)"
    - "src/audio/audioEngine.ts (19 LOC delta — AudioEngineOptions.timbre required; sessionTimbre const capture; scheduleLeadIn + scheduleNextCue forwarders)"
    - "src/audio/cueSynth.test.ts (+110 LOC — 32 new it.each(TIMBRE_OPTIONS) tests across 2 new describe blocks; zero deletions from existing Bowl tests)"
    - "src/audio/audioEngine.test.ts (131 LOC delta — 20 createAudioEngine() call sites updated to { timbre: 'bowl' }; spy retarget; 3 new propagation tests)"
    - "src/hooks/useAudioCues.ts (16 LOC delta — DEFAULT_TIMBRE import + interim scaffold at 2 createAudioEngine call sites; Plan 04 will replace)"
    - "src/hooks/useAudioCues.test.tsx (7 LOC delta — single spy retargeted from scheduleOutCue → scheduleOutCueForTimbre)"
    - "src/app/App.audio.test.tsx (18 LOC delta — 4 spy retargets + 1 mockImplementation signature update for new 5-arity dispatch)"
decisions:
  - "D-01 option (a) — scheduleInCue / scheduleOutCue preserved as Bowl-only thin wrappers (smaller diff + TIMBRE-02 signature stability proof) rather than deleted (option (b))"
  - "D-07 hard invariant — scheduleTick body byte-identical to v1.0.1 (only its position in the file shifts due to import additions); 3 scheduleTick calls in audioEngine.ts UNCHANGED"
  - "D-08 capture-at-construction — sessionTimbre is a const closed over once at engine birth; no setTimbre setter on AudioEngine; mutation only possible via new engine construction"
  - "D-12 shared sustain-floor — 5 sustain-floor module constants preserved across all 4 timbres; per-timbre threshold auto-derives from preset.decayTauIn/Out × PERCEPTUAL_SILENCE_TAU_MULT"
  - "Rule 3 deviation — extended scope to src/hooks/useAudioCues.ts + 2 test files because making AudioEngineOptions.timbre required broke type-checking and Vitest spies at out-of-plan call sites. Interim DEFAULT_TIMBRE scaffold preserves Bowl audio path verbatim (TIMBRE-02 still proven)."
patterns-established:
  - "Required field with downstream-test sweep: when widening a struct's required surface, the same plan that mandates the field must update ALL caller sites in tests; otherwise the green-gate breaks. Plan 03 originally scoped this to audioEngine.test.ts only; runtime discovery extended to App.audio.test.tsx + useAudioCues.test.tsx (caused by engine-internal call-site refactor, not by the field requirement itself)."
  - "Wrapper-preservation for byte-identical proof: keep the v1.0.1 public signature as a thin wrapper that delegates to the new dispatch surface with the locked default ID. Future callers can migrate to the dispatch surface incrementally without breaking unmigrated paths."
requirements-completed:
  - TIMBRE-01
  - TIMBRE-02
  - TIMBRE-03
  - TIMBRE-05
metrics:
  duration: "~70 min wall time (1 parameterization task + 1 capture task + 2 test extension tasks + global green-gate + 3 deviation fixes)"
  completed: 2026-05-14
  tasks: 5
  test-count-delta: "+35 (599 baseline after Plans 01+02 → 634 after Plan 03; 32 cueSynth.test.ts + 3 audioEngine.test.ts)"
  commit-count: 1
---

# Phase 18 Plan 03: Audio Timbre Engine Dispatch Summary

**One-liner:** Wire `TIMBRE_PRESETS` through `cueSynth` via parameterized `scheduleBowlCue` + new `scheduleInCueForTimbre` / `scheduleOutCueForTimbre` dispatch, extend `AudioEngineOptions.timbre: TimbreId` with capture-at-construction in `createAudioEngine`, and preserve byte-identical Bowl + lead-in tick paths.

## Performance

- **Duration:** ~70 min wall time
- **Started:** 2026-05-14T16:50:00Z (approx — first read of plan)
- **Completed:** 2026-05-14T18:10:47Z
- **Tasks:** 5 (Task 1 parameterize cueSynth, Task 2 capture-at-construction in audioEngine, Task 3 per-timbre tests, Task 4 audioEngine.test.ts sweep + propagation, Task 5 green-gate)
- **Files modified:** 7 (4 in-plan + 3 deviation files)

## Accomplishments

- `scheduleBowlCue` parameterized: accepts `preset: TimbrePreset` + `kind: 'in' | 'out'` instead of loose `fundamentalHz` + `defaultDecayTau` args. Body reads all DSP parameters (partials, filter freq/Q, peak gain, oscillator type) from the preset.
- Two new exported dispatch functions in `cueSynth.ts`: `scheduleInCueForTimbre(audioCtx, when, destination, timbre, phaseDurationSec?)` and `scheduleOutCueForTimbre(...)` look up `TIMBRE_PRESETS[timbre]` and call the parameterized `scheduleBowlCue`.
- Preserved `scheduleInCue` / `scheduleOutCue` public signatures as Bowl-only thin wrappers (D-01 option (a)): both delegate to the dispatch surface with the locked `'bowl'` TimbreId — TIMBRE-02 signature stability across the refactor.
- Deleted 8 Bowl module constants from `cueSynth.ts` (`IN_FUNDAMENTAL_HZ`, `OUT_FUNDAMENTAL_HZ`, `PEAK_GAIN`, `PARTIALS`, `IN_DECAY_TIME_CONSTANT`, `OUT_DECAY_TIME_CONSTANT`, `FILTER_FREQ_HZ`, `FILTER_Q`). Their values now live in `TIMBRE_PRESETS.bowl` (Plan 01) — TIMBRE-02 byte-identical proof completes at the consumer site (numeric MOVE, not CHANGE).
- `scheduleTick` body byte-identical to v1.0.1 — D-07 lead-in tick fixed across all timbres.
- 5 sustain-floor constants preserved at module level — D-12 shared sustain logic across all 4 timbres.
- `AudioEngineOptions.timbre: TimbreId` is now required. `createAudioEngine` captures it once into a closed-over `sessionTimbre` const before the engine object literal — D-08 immutability invariant; no `setTimbre` setter exposed.
- `scheduleLeadIn` forwards `sessionTimbre` to `scheduleInCueForTimbre` on the first In cue. The 3 `scheduleTick` calls inside `scheduleLeadIn` are UNCHANGED — D-07 hard invariant.
- `scheduleNextCue` forwards `sessionTimbre` to `scheduleInCueForTimbre` / `scheduleOutCueForTimbre` via the in/out ternary.
- 20 existing `createAudioEngine()` no-arg call sites in `audioEngine.test.ts` updated to `createAudioEngine({ timbre: 'bowl' })` — TIMBRE-02 integration-layer proof (existing v1.0.1 tests continue exercising the Bowl path verbatim).
- 32 new `it.each(TIMBRE_OPTIONS)` tests across `cueSynth.test.ts` — for each of the 4 timbres, both `scheduleInCueForTimbre` + `scheduleOutCueForTimbre` are verified for oscillator count, fundamental frequency, peak gain, and decay time constant (4 metrics × 2 directions × 4 timbres = 32 assertions).
- 3 new `audioEngine.test.ts` propagation tests verify: Bell forwards to first In cue via `scheduleLeadIn`; Sine forwards to both `scheduleInCueForTimbre` + `scheduleOutCueForTimbre` via `scheduleNextCue`; two engines with different timbres operate independently (capture immutability).
- All four green-gates pass at the commit boundary: `tsc && lint && build && test` exit 0. **634/634 Vitest passing** (599 baseline → 634; +35 tests).

## Task Commits

All five tasks landed in a single atomic commit per D-13 (the plan explicitly requested a single per-commit green-gate boundary):

1. **Tasks 1–5 (all)** — `f635048` (feat)
   - `feat(18-03): wire TIMBRE_PRESETS through cueSynth dispatch + audioEngine capture (TIMBRE-01/02/05)`
   - Includes Task 1 (cueSynth parameterization), Task 2 (audioEngine capture), Task 3 (cueSynth per-timbre tests), Task 4 (audioEngine.test.ts call-site sweep + propagation tests), Task 5 (global green-gate).
   - Also includes the Rule 3 deviation fixes at `useAudioCues.ts` + 2 test files (see Deviations section).

## Files Modified

- `src/audio/cueSynth.ts` — Parameterized `scheduleBowlCue(preset, kind, …)`, added `scheduleInCueForTimbre` + `scheduleOutCueForTimbre` exports, preserved `scheduleInCue` + `scheduleOutCue` as Bowl wrappers, deleted 8 Bowl module constants, preserved sustain-floor + tick constants + `scheduleTick` body. (113 LOC delta.)
- `src/audio/audioEngine.ts` — Replaced import of `scheduleInCue` / `scheduleOutCue` with the dispatch functions; added `import type { TimbreId }`; added required `timbre: TimbreId` field on `AudioEngineOptions` with JSDoc; dropped `= {}` default; added `const sessionTimbre = opts.timbre` capture; updated `scheduleLeadIn` first-In-cue call + `scheduleNextCue` in/out ternary to forward `sessionTimbre`. (19 LOC delta.)
- `src/audio/cueSynth.test.ts` — Added 3 new imports (`scheduleInCueForTimbre`, `scheduleOutCueForTimbre`, `TIMBRE_OPTIONS`, `TIMBRE_PRESETS`); added 2 new sibling `describe` blocks with 4 `it.each(TIMBRE_OPTIONS)` tests each (8 unique test cases × 4 timbres = 32 test runs); zero deletions from existing Bowl tests (TIMBRE-02 byte-identical proof preserved). (+110 LOC.)
- `src/audio/audioEngine.test.ts` — Replaced 20 `createAudioEngine()` no-arg call sites with `createAudioEngine({ timbre: 'bowl' })`; retargeted all `scheduleInCue` / `scheduleOutCue` spies to `scheduleInCueForTimbre` / `scheduleOutCueForTimbre`; updated phaseDurationSec assertion from index `[3]` → `[4]` (signature widened by `timbre` at index 3); added 3 new propagation tests for Bell/Sine/Chime. (131 LOC delta.)

## Deviation Files (Rule 3 — see Deviations section below)

- `src/hooks/useAudioCues.ts` — Added `import { DEFAULT_TIMBRE } from '../domain/settings'`; passed `timbre: DEFAULT_TIMBRE` at both `createAudioEngine` call sites (the `start()` path and the `reconstructEngine()` path). Documented as an interim scaffold replaced by Plan 04. (16 LOC delta.)
- `src/hooks/useAudioCues.test.tsx` — Retargeted single `vi.spyOn(cueSynth, 'scheduleOutCue')` → `vi.spyOn(cueSynth, 'scheduleOutCueForTimbre')` in the `notifyPhaseBoundary` routing test. (7 LOC delta.)
- `src/app/App.audio.test.tsx` — Retargeted 4 `vi.spyOn(cueSynth, 'scheduleOutCue')` → `'scheduleOutCueForTimbre'`; updated 1 `mockImplementation` callback signature from `(ctx, time, dest, durSec)` → `(ctx, time, dest, timbre, durSec)` to match the new 5-arity dispatch. (18 LOC delta.)

## TIMBRE-02 Byte-Identical Bowl Proof (consumer site)

`git diff` summary of the 8 deleted Bowl module constants in `cueSynth.ts`:

| Deleted Constant            | Old Value          | Now Lives In                          |
| --------------------------- | ------------------ | ------------------------------------- |
| `IN_FUNDAMENTAL_HZ`         | `440`              | `TIMBRE_PRESETS.bowl.fundamentalHzIn` |
| `OUT_FUNDAMENTAL_HZ`        | `220`              | `TIMBRE_PRESETS.bowl.fundamentalHzOut`|
| `PEAK_GAIN`                 | `0.18`             | `TIMBRE_PRESETS.bowl.peakGain`        |
| `PARTIALS`                  | 3-partial array    | `TIMBRE_PRESETS.bowl.partials`        |
| `IN_DECAY_TIME_CONSTANT`    | `1.4`              | `TIMBRE_PRESETS.bowl.decayTauIn`      |
| `OUT_DECAY_TIME_CONSTANT`   | `1.8`              | `TIMBRE_PRESETS.bowl.decayTauOut`     |
| `FILTER_FREQ_HZ`            | `3000`             | `TIMBRE_PRESETS.bowl.filterFreqHz`    |
| `FILTER_Q`                  | `0.5`              | `TIMBRE_PRESETS.bowl.filterQ`         |

Plus `osc.type = 'sine'` → `osc.type = preset.oscillatorType` (`'sine'` for all 4 presets in Plan 01).

**Existing 17 Bowl tests in `cueSynth.test.ts` pass UNCHANGED** — synthesis-layer byte-identical proof.
**All 20 existing `createAudioEngine({ timbre: 'bowl' })` test paths pass UNCHANGED** — integration-layer byte-identical proof.

## New Dispatch Surface

```typescript
export function scheduleInCueForTimbre(
  audioCtx: AudioContext, when: number, destination: AudioNode,
  timbre: TimbreId, phaseDurationSec?: number,
): CueHandle

export function scheduleOutCueForTimbre(
  audioCtx: AudioContext, when: number, destination: AudioNode,
  timbre: TimbreId, phaseDurationSec?: number,
): CueHandle
```

Both look up `TIMBRE_PRESETS[timbre]` and call the parameterized `scheduleBowlCue(preset, 'in'|'out', …)`.

## Test Count Delta

- Baseline (post Plan 01+02): **599 passing tests** across 48 files.
- Post-plan: **634 passing tests** across 48 files.
- Delta: **+35 tests / 0 files** (32 from `cueSynth.test.ts` + 3 from `audioEngine.test.ts`).
- Zero existing tests deleted. 9 existing tests in `audioEngine.test.ts` + 5 in `App.audio.test.tsx` + 1 in `useAudioCues.test.tsx` were UPDATED to retarget spies from the old dispatch (`scheduleInCue` / `scheduleOutCue`) to the new dispatch (`scheduleInCueForTimbre` / `scheduleOutCueForTimbre`) — necessary because the engine now calls the new dispatch functions internally.

## Green-Gate Verification (D-13)

All four gates green at the commit boundary:

- `npx tsc --noEmit -p tsconfig.app.json` — exit 0 (strict + strictTypeChecked).
- `npm run lint` — exit 0 (no rule disables introduced).
- `npm run build` — exit 0 (`✓ built in 127ms`; lightning-css `Unexpected token Delim` warnings are pre-existing Tailwind v4 token output background noise, unrelated to this plan).
- `npm test --run` — exit 0, 634/634 passing across 48 files.

## Decisions Made

- **D-01 option (a) confirmed:** `scheduleInCue` / `scheduleOutCue` kept as Bowl-only wrappers rather than deleted. Smaller diff + TIMBRE-02 signature stability proof + zero risk to any unmigrated caller paths.
- **D-08 capture-at-construction:** `sessionTimbre` is a `const` declared inside `createAudioEngine` after `let muted = false`. No `setTimbre` method on the engine interface. Two engines constructed with different timbres operate independently (verified by the new immutability test in `audioEngine.test.ts`).
- **D-12 shared sustain-floor:** the 5 module-level sustain-floor constants (`PERCEPTUAL_SILENCE_TAU_MULT`, `SUSTAIN_FLOOR_RATIO`, `PHASE_END_FADE_OUT_TAU`, `PHASE_END_FADE_OUT_LEAD_SEC`, `NEAR_SILENCE`) stay shared. Bowl's existing low-BPM behavior is preserved verbatim; the other 3 timbres' thresholds emerge automatically from `preset.decayTauIn/Out × PERCEPTUAL_SILENCE_TAU_MULT`.
- **D-07 scheduleTick byte-identical:** the entire `scheduleTick` function body is preserved — only the file position shifts due to the constants deletion above and the import additions at the top of the file.

## Deviations from Plan

The plan's Task 5 verify step asserted exactly 4 files in the commit and no touches to `src/hooks/useAudioCues.ts` / `src/app/App.tsx` / `src/components/`. Three Rule 3 deviations widened that to 7 files because making `AudioEngineOptions.timbre` REQUIRED propagated type-system + runtime-spy failures to out-of-plan call sites. All deviations preserve the v1.0.1 Bowl audio path verbatim — TIMBRE-02 byte-identical proof holds across the transitional commit.

### Auto-fixed Issues

**1. [Rule 3 - Blocking] `src/hooks/useAudioCues.ts` no-arg `createAudioEngine` calls broke type-checking**
- **Found during:** Task 2 (extend `AudioEngineOptions.timbre` + capture-at-construction).
- **Issue:** Making `timbre: TimbreId` required (per truth #7 of the plan's must_haves) caused TS to reject the two `createAudioEngine({ onStateChange: handleStateChange })` calls in `useAudioCues.ts` (`start()` body + `reconstructEngine()` body). Both errors were `TS2345: Property 'timbre' is missing`. The plan's Task 5 verify step prohibited touching `useAudioCues.ts`, but the green-gate could not pass without addressing them. The plan's own narrative says "Plan 04 will add timbreRef + start(plan, timbre) to useAudioCues.ts" — meaning Plan 04 owns the proper threading, but the green-gate had to hold at Plan 03's commit boundary.
- **Fix:** Added `import { DEFAULT_TIMBRE } from '../domain/settings'` and passed `timbre: DEFAULT_TIMBRE` at both call sites, with comments explicitly marking them as interim scaffolds replaced by Plan 04. Bowl is the default, so the audio path is byte-identical to v1.0.1 — TIMBRE-02 proof holds.
- **Files modified:** `src/hooks/useAudioCues.ts`
- **Verification:** `npx tsc --noEmit -p tsconfig.app.json` exit 0 after the change; runtime behavior unchanged (Bowl path active).
- **Committed in:** `f635048` (single atomic Task 5 commit).

**2. [Rule 3 - Blocking] `audioEngine.test.ts` + `useAudioCues.test.tsx` + `App.audio.test.tsx` spy targets pointed at the old dispatch path**
- **Found during:** Task 5 (global green-gate).
- **Issue:** The audio engine now calls `scheduleInCueForTimbre` / `scheduleOutCueForTimbre` internally instead of `scheduleInCue` / `scheduleOutCue`. Existing tests that spied via `vi.spyOn(cueSynth, 'scheduleInCue')` saw zero calls — the engine doesn't reach those functions anymore. 8 tests failed in `audioEngine.test.ts`, 4 in `App.audio.test.tsx`, 1 in `useAudioCues.test.tsx`. This is a direct consequence of Task 2's engine refactor, not a pre-existing problem.
- **Fix:** Retargeted all affected `vi.spyOn` calls to the new dispatch function names. Updated one phaseDurationSec assertion from index `[3]` → `[4]` (signature widened by `timbre` at index 3). Updated one `mockImplementation` callback signature from 4-arity to 5-arity to match the new dispatch surface.
- **Files modified:** `src/audio/audioEngine.test.ts` (in-plan; Task 4 owns this), `src/hooks/useAudioCues.test.tsx` (1 spy), `src/app/App.audio.test.tsx` (4 spies + 1 mockImpl signature).
- **Verification:** `npm test --run` exit 0; 634/634 passing.
- **Committed in:** `f635048` (single atomic commit).

---

**Total deviations:** 2 auto-fixed (both Rule 3 — blocking issues directly caused by the engine signature refactor).
**Impact on plan:** Both deviations were required for the per-commit green-gate (D-13 invariant). Neither expands user-visible scope nor introduces new dependencies. Plan 04 will replace the `useAudioCues.ts` interim scaffold with proper `timbreRef` capture + `start(plan, timbre)` parameter threading per CONTEXT.md §Phase Boundary item 5.

## Issues Encountered

- The plan's Task 5 verify step `! git show --stat HEAD | grep -E "(useAudioCues|App|TimbrePicker|prefs|settings)"` reflected the planner's intent for file-split isolation, but conflicted with the technically-mandatory propagation of `timbre: TimbreId` required. The pragmatic resolution (Rule 3 deviation) is documented above and clearly bounded — Plan 04 will close the interim scaffold.
- No other issues. All 5 in-plan tasks executed as written.

## User Setup Required

None - no external service configuration required.

## Next Phase Readiness

- **Plan 04 (useAudioCues `timbreRef` + `start(plan, timbre)`):** The two `createAudioEngine({ timbre: DEFAULT_TIMBRE, ... })` call sites in `useAudioCues.ts` are the exact spots Plan 04 will replace with:
  - `start(plan, timbre)`: `timbreRef.current = timbre` synchronous-pre-await capture, then `createAudioEngine({ timbre, ... })`.
  - `reconstructEngine`: `const currentTimbre = timbreRef.current` synchronous-pre-await capture (mirror of `currentMuted = mutedRef.current` at line 292), then `createAudioEngine({ timbre: currentTimbre, ... })`.
- **Plan 06 (App integration):** `onStartClick` reads `loadPrefs().timbre` once at the user-gesture boundary (mirror of `sessionVariantRef.current = liveVariant`) and passes the snapshot to `audioStart(plan, capturedTimbre)`.
- The dispatch surface (`scheduleInCueForTimbre` / `scheduleOutCueForTimbre`) is stable and exercised under 4-timbre coverage — no further changes needed at the cueSynth or audioEngine layer for Phase 18.

## Self-Check: PASSED

- `src/audio/cueSynth.ts`: FOUND with `scheduleInCueForTimbre` + `scheduleOutCueForTimbre` exports, no Bowl module constants, scheduleTick body preserved, sustain-floor constants preserved.
- `src/audio/audioEngine.ts`: FOUND with `timbre: TimbreId` field on `AudioEngineOptions`, `const sessionTimbre: TimbreId = opts.timbre` capture, no `setTimbre`.
- `src/audio/cueSynth.test.ts`: FOUND with 2 new describe blocks containing 8 `it.each(TIMBRE_OPTIONS)` calls = 32 parameterized test runs, zero deletions from existing Bowl tests.
- `src/audio/audioEngine.test.ts`: FOUND with 20 `timbre: 'bowl'` updates + 3 propagation tests; zero no-arg `createAudioEngine()` remaining.
- Commit `f635048`: FOUND via `git log --oneline -3` showing `feat(18-03): wire TIMBRE_PRESETS through cueSynth dispatch + audioEngine capture (TIMBRE-01/02/05)`.
- Test suite: 634/634 passing.
- Gates: tsc + lint + build + test all exit 0.
- TIMBRE-02 byte-identical proof: 17 existing Bowl tests in `cueSynth.test.ts` UNCHANGED and green; 20 existing audioEngine.test.ts call sites pass `timbre: 'bowl'` and exercise the v1.0.1 Bowl path verbatim.
- D-07 invariant: 3 `scheduleTick` calls in `audioEngine.ts` UNCHANGED (verified via grep); `scheduleTick` body in `cueSynth.ts` byte-identical.
- D-08 invariant: no `setTimbre` setter exists anywhere in `audioEngine.ts` (verified via grep).
- D-12 invariant: 5 sustain-floor module constants preserved (verified via grep).

---
*Phase: 18-audio-timbres*
*Plan: 03*
*Completed: 2026-05-14*
