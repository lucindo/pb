---
phase: 18-audio-timbres
plan: 01
subsystem: audio
tags:
  - audio
  - presets
  - timbres
  - pure-data
dependency-graph:
  requires:
    - "src/domain/settings.ts (Phase 14 D-01: TimbreId, TIMBRE_OPTIONS — locked)"
  provides:
    - "src/audio/timbres.ts: TimbrePreset interface + TIMBRE_PRESETS Readonly<Record<TimbreId, TimbrePreset>>"
  affects:
    - "Plan 03 (cueSynth parameterization) will consume TIMBRE_PRESETS and delete the duplicate module-level constants from cueSynth.ts"
    - "Plan 04 (useAudioCues timbre capture) consumes nothing from this plan directly — depends on Plan 03's parameterized scheduler"
    - "Plan 05 (TimbrePicker fill) consumes TIMBRE_OPTIONS / TimbreId from settings.ts only; this plan adds no UI deps"
tech-stack:
  added: []
  patterns:
    - "Pure-data preset record (Readonly<Record<EnumId, PresetShape>>) — new pattern in this codebase; mirrors research §CUST-02 architecture"
    - "Type-only import of TimbreId from ../domain/settings (preserves Phase 14 D-09 file-split invariant)"
key-files:
  created:
    - "src/audio/timbres.ts (~99 LOC including doc comments; interface + 4-preset record)"
    - "src/audio/timbres.test.ts (~58 LOC; 5 pure-data tests)"
  modified: []
decisions:
  - "D-02 verbatim Bowl proof: bowl preset numeric values are byte-identical to cueSynth.ts lines 11-24 module-level constants (TIMBRE-02 data-layer guarantee — values MOVED, never CHANGED)."
  - "D-21 TIMBRE-05 invariant guard test ('every preset uses A4/A3 fundamentals') asserts fundamentalHzIn===440 && fundamentalHzOut===220 across all four presets — catches future preset additions that drift fundamentals."
  - "D-14 no-PeriodicWave invariant guard test asserts every preset.oscillatorType === 'sine' — locks the partial-stacked-sine architecture across the four presets."
  - "D-15 file-split invariant preserved: src/domain/settings.ts is untouched; only TimbreId type-only import."
  - "cueSynth.ts NOT edited in this plan — the module-level constants stay in place as a temporary duplicate so this plan commits independently green (D-13). Plan 03 owns the consumer-side migration and the duplicate-constant deletion."
metrics:
  duration: "~12 min wall time (single-task plan, all-additive)"
  completed: 2026-05-14
  tasks: 3
  test-count-delta: "+5 (588 baseline → 593)"
  commit-count: 1
---

# Phase 18 Plan 01: Audio Timbre Preset Module Summary

**One-liner:** Pure-data `src/audio/timbres.ts` exporting `TimbrePreset` interface + `TIMBRE_PRESETS` Readonly Record over four named presets (Bowl/Bell/Sine/Chime), with TIMBRE-02 verbatim-Bowl proof and a TIMBRE-05 A4/A3 fundamental invariant guard test.

## Files Added

- `src/audio/timbres.ts` — Zero-React pure-data module. Exports `interface TimbrePreset` (9 fields) and `TIMBRE_PRESETS: Readonly<Record<TimbreId, TimbrePreset>>` with all four presets locked.
- `src/audio/timbres.test.ts` — 5 pure-data tests (no FakeAudioContext): preset-record key coverage, TIMBRE-05 fundamental invariant guard (D-21), TIMBRE-02 Bowl verbatim proof (D-02), `partials[0].ratio === 1.0` anchor, OscillatorType='sine' invariant (D-14).

## Files Modified

None. The plan is purely additive — `cueSynth.ts` keeps its module-level constants intact (TIMBRE-02 byte-identical posture is preserved through Plan 03, where the consumer migrates and the duplicate is deleted in the same atomic commit).

## TIMBRE-02 Bowl Preset Byte-Identical Proof

The Bowl preset numeric values copied verbatim from `cueSynth.ts:11-24`:

| Field             | Bowl preset value                                                      | cueSynth.ts constant                | Match  |
| ----------------- | ---------------------------------------------------------------------- | ----------------------------------- | ------ |
| `fundamentalHzIn` | `440`                                                                  | `IN_FUNDAMENTAL_HZ = 440`           | exact  |
| `fundamentalHzOut`| `220`                                                                  | `OUT_FUNDAMENTAL_HZ = 220`          | exact  |
| `partials`        | `[{1.0, 1.0}, {2.76, 0.4}, {5.4, 0.15}]`                               | `PARTIALS = [{1.0,1.0},{2.76,0.4},{5.4,0.15}]` | exact  |
| `decayTauIn`      | `1.4`                                                                  | `IN_DECAY_TIME_CONSTANT = 1.4`      | exact  |
| `decayTauOut`     | `1.8`                                                                  | `OUT_DECAY_TIME_CONSTANT = 1.8`     | exact  |
| `filterFreqHz`    | `3000`                                                                 | `FILTER_FREQ_HZ = 3000`             | exact  |
| `filterQ`         | `0.5`                                                                  | `FILTER_Q = 0.5`                    | exact  |
| `peakGain`        | `0.18`                                                                 | `PEAK_GAIN = 0.18`                  | exact  |
| `oscillatorType`  | `'sine'`                                                               | `osc.type = 'sine'` (line 123)      | exact  |

All nine fields are byte-identical. The `bowl preset matches verbatim cueSynth constants` test in `timbres.test.ts` asserts each field explicitly — future regression in either source file will surface as a failing test.

## TIMBRE-05 / D-21 Invariant Locked

Test `'every preset uses A4/A3 fundamentals (440 Hz In / 220 Hz Out)'` iterates `Object.values(TIMBRE_PRESETS)` and asserts `fundamentalHzIn === 440 && fundamentalHzOut === 220` for every preset. Any future preset addition (e.g., a 5th timbre at 523/261 Hz per research's Bell suggestion) fails this test, preventing the silent regression.

## Bell / Sine / Chime Preset Values (D-03/D-04/D-05)

Recorded verbatim per CONTEXT.md so future audits can diff without re-reading the plan:

- **Bell (D-03):** 440/220, partials `[1.0/1.0, 2.5/0.5, 4.0/0.15]`, decay 0.8/1.1, filter 5000/Q 0.8, peak 0.18, sine.
- **Sine (D-04):** 440/220, partials `[1.0/1.0]`, decay 1.5/2.0, filter 8000/Q 0.3, peak 0.18, sine.
- **Chime (D-05):** 440/220, partials `[1.0/1.0, 2.76/0.4, 5.4/0.15, 7.6/0.08]`, decay 1.0/1.4, filter 7000/Q 1.0, peak 0.16, sine.

## Test Count Delta

- Baseline (pre-plan): **588 passing tests** across 46 files.
- Post-plan: **593 passing tests** across 47 files.
- Delta: **+5 tests / +1 file** — exactly as planned. Zero existing tests modified or broken.

## Green-Gate Verification (D-13)

All four gates green at the commit boundary:

- `npx tsc --noEmit` — exit 0 (strict + strictTypeChecked).
- `npm run lint` — exit 0 (no rule disables introduced).
- `npm run build` — exit 0 (`✓ built in 149ms`; the lightning-css `Unexpected token Delim` lines are pre-existing background warnings in Tailwind v4 token output, unrelated to this plan).
- `npm test --run` — exit 0, 593/593 passing.

## Commits

- `09e55d7` — `feat(18-01): add timbres.ts pure-data preset module (TIMBRE-01/02/05)` (single atomic commit per D-13).

## Deviations from Plan

None. The plan executed exactly as written — three tasks, two new files, one atomic commit, all gates green on first pass.

## Forward Declaration

Plan 03 (cueSynth parameterization) consumes `TIMBRE_PRESETS` from this module and deletes the duplicate module-level constants from `cueSynth.ts` (`IN_FUNDAMENTAL_HZ`, `OUT_FUNDAMENTAL_HZ`, `PEAK_GAIN`, `PARTIALS`, `IN_DECAY_TIME_CONSTANT`, `OUT_DECAY_TIME_CONSTANT`, `FILTER_FREQ_HZ`, `FILTER_Q`). The git diff for Plan 03 will show those constants disappearing from `cueSynth.ts` with zero numeric change — the TIMBRE-02 byte-identical proof completes at the consumer site.

Plans 04-06 do not consume this module directly. They depend on Plan 03's parameterized `scheduleInCueForTimbre` / `scheduleOutCueForTimbre` dispatch.

## Self-Check: PASSED

- `src/audio/timbres.ts`: FOUND.
- `src/audio/timbres.test.ts`: FOUND.
- Commit `09e55d7`: FOUND (`git log --oneline -1` shows `feat(18-01): ...`).
- Test suite: 593/593 passing.
- Gates: tsc + lint + build + test all exit 0.
- TIMBRE-02 / TIMBRE-05 / D-14 invariants asserted in `timbres.test.ts`.
- Zero React imports verified in `timbres.ts`.
- Zero edits to `cueSynth.ts`, `audioEngine.ts`, `domain/settings.ts`, `storage/prefs.ts`.
