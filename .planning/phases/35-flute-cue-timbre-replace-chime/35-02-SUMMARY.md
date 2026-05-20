---
phase: 35-flute-cue-timbre-replace-chime
plan: "02"
subsystem: audio
tags: [audio, timbre, flute, tdd, envelope, spike-008, AUDIO-01]
dependency_graph:
  requires: [35-01]
  provides: [TIMBRE_PRESETS.flute, TimbrePreset.attackSec, cueSynth-soft-attack-mode]
  affects: [src/audio/timbres.ts, src/audio/cueSynth.ts, src/audio/nkCueSynth.ts, src/audio/timbres.test.ts, src/audio/cueSynth.test.ts, src/audio/audioEngine.test.ts, src/hooks/useAudioCues.test.tsx, src/app/App.session.test.tsx]
tech_stack:
  added: []
  patterns: [additive-sine-synthesis, optional-envelope-mode, tdd-red-green, attack-ramp-then-exp-decay]
key_files:
  created: []
  modified:
    - src/audio/timbres.ts
    - src/audio/timbres.test.ts
    - src/audio/cueSynth.ts
    - src/audio/cueSynth.test.ts
    - src/audio/nkCueSynth.ts
    - src/audio/audioEngine.test.ts
    - src/hooks/useAudioCues.test.tsx
    - src/app/App.session.test.tsx
decisions:
  - "Soft-attack mode keyed on preset.attackSec (not a separate enum flag): 0 = strike, >0 = linear ramp. Same shape as spike-005 buildNKToneNodes number|PadEnvelope pattern — optional mode, strike is default"
  - "Decay for soft-attack starts at when+attackSec (ramp end), not when+STRIKE_RAMP_OFFSET — preserves the exp-decay character after the breath onset"
  - "Existing per-timbre it.each envelope-peak tests updated to branch on attackSec: assert via linearRampToValueAtTime for flute, setValueAtTime for bowl/bell/sine"
  - "App.persistence.test.tsx 3 pre-existing failures (Reset dialog) are out of scope and pre-date this plan"
requirements-completed:
  - AUDIO-01
  - AUDIO-02
metrics:
  duration: "~5 minutes"
  completed: "2026-05-19"
  tasks_completed: 3
  files_modified: 8
---

# Phase 35 Plan 02: Spike-008 Flute DSP Values + cueSynth Soft-Attack Mode Summary

Installed the spike-008 winning Flute preset into `TIMBRE_PRESETS.flute`, added an `attackSec` field to `TimbrePreset`, gave `cueSynth.scheduleBowlCue` an optional linear-ramp soft-attack envelope mode, and cleaned all stale `chime` literals from audio-adjacent test fixtures.

## Tasks Completed

| Task | Name | Commit | Files |
|------|------|--------|-------|
| 1 (RED) | Add failing tests for spike-008 flute preset and attackSec field | c10e4d7 | src/audio/timbres.test.ts |
| 1 (GREEN) | Add attackSec to TimbrePreset; install spike-008 flute preset | ba1a859 | src/audio/timbres.ts |
| 2 (RED) | Add failing tests for cueSynth soft-attack envelope mode | 20c0a45 | src/audio/cueSynth.test.ts |
| 2 (GREEN) | Add optional soft-attack envelope mode to scheduleBowlCue | f75cb2b | src/audio/cueSynth.ts, src/audio/cueSynth.test.ts |
| 3 | Rename stale chime literals in nkCueSynth and audio test fixtures | 3627a5b | src/audio/nkCueSynth.ts, src/audio/audioEngine.test.ts, src/hooks/useAudioCues.test.tsx, src/app/App.session.test.tsx |

## Verification Results

- `grep -c "chime" src/audio/timbres.ts` → 0
- `grep "attackSec" src/audio/timbres.ts` → present in interface and all 4 presets
- `npx tsc --noEmit` → exits 0 (type-clean)
- `npx vitest run src/audio/timbres.test.ts` → 11/11 pass (D-21 guard green — flute keeps 440/220)
- `npx vitest run src/audio/cueSynth.test.ts` → 51/51 pass
- `npx vitest run src/audio` → 103/103 pass (all 4 audio suites)
- `grep -rin "chime" src/audio src/hooks src/app` → 3 lines in timbres.test.ts comments/test-names only (asserting absence of 'chime'; intentional guard tests)
- `src/storage/prefs.ts` retains `if (raw === 'chime') return 'flute'` — intentional AUDIO-02 migration code from Plan 01

## Decisions Made

- **Soft-attack mode keyed on `preset.attackSec`:** When `attackSec > 0`, `scheduleBowlCue` sets gain to `NEAR_SILENCE` at `when`, ramps to `peakGain` over `attackSec` via `linearRampToValueAtTime`, then starts `setTargetAtTime` exp-decay from the ramp end (`when + attackSec`). When `attackSec === 0`, the existing strike path is byte-identical — `setValueAtTime(peakGain, when)` then `setTargetAtTime` from `when + STRIKE_RAMP_OFFSET`.
- **Decay start time for soft-attack is `when + attackSec`:** Using the ramp end as the decay start point means the exp-decay character is preserved after the breath onset — consistent with how the spike-005 `buildNKToneNodes` pad envelope handles the transition.
- **Per-timbre test update (Rule 1 fix):** The existing `it.each(TIMBRE_OPTIONS) envelope peak gain` tests assumed `setValueAtTime` for all timbres. Updated to branch on `preset.attackSec` — flute asserts `linearRampToValueAtTime`, bowl/bell/sine still assert `setValueAtTime`. Test intent unchanged; only the assertion path is envelope-mode aware.

## Known Stubs

None. The `TIMBRE_PRESETS.flute` entry carries the verbatim spike-008 values; `cueSynth.scheduleBowlCue` routes through the soft-attack path when `attackSec > 0`. No placeholder values or TODO paths remain.

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 1 - Bug] Per-timbre envelope-peak tests assumed `setValueAtTime` for all timbres**
- **Found during:** Task 2 GREEN
- **Issue:** `scheduleInCueForTimbre (all timbres) > flute: envelope peak gain matches preset.peakGain` and its Out counterpart failed because the flute now calls `linearRampToValueAtTime` (not `setValueAtTime`) with the peakGain value.
- **Fix:** Updated both `it.each` blocks in `cueSynth.test.ts` to branch on `preset.attackSec > 0`: flute asserts via `linearRampToValueAtTime`, bowl/bell/sine via `setValueAtTime`. Test intent (peak gain matches preset) is preserved.
- **Files modified:** src/audio/cueSynth.test.ts
- **Commit:** f75cb2b

### Pre-existing Out-of-Scope Failures

`src/app/App.persistence.test.tsx` — 3 tests in the `LOCL-03` describe fail with `Unable to find an accessible element with the role "dialog" and name "Reset Resonant Breathing stats?"`. Confirmed pre-existing by stashing all Task 3 changes and re-running — same 3 failures appear. These are unrelated to the timbre rename and are logged as deferred.

## TDD Gate Compliance

**Task 1:**
- RED commit (test): c10e4d7 — `test(35-02): add failing tests for spike-008 flute preset and attackSec field`
- GREEN commit (feat): ba1a859 — `feat(35-02): add attackSec to TimbrePreset; install spike-008 flute preset (AUDIO-01)`
- Gate sequence: RED → GREEN (compliant)

**Task 2:**
- RED commit (test): 20c0a45 — `test(35-02): add failing tests for cueSynth soft-attack envelope mode (AUDIO-01)`
- GREEN commit (feat): f75cb2b — `feat(35-02): add optional soft-attack envelope mode to cueSynth.scheduleBowlCue (AUDIO-01)`
- Gate sequence: RED → GREEN (compliant)

## Threat Surface Scan

No new network endpoints, auth paths, file access patterns, or schema changes introduced. The `attackSec` field is a compile-time constant in `TIMBRE_PRESETS` (0.13 for flute, 0 for the rest) — never user-supplied, never deserialized from storage. T-35-03 and T-35-04 dispositions from the plan's threat model apply as expected (accept — no runtime clamp warranted for a hard-coded constant).

## Self-Check

Files exist:
- src/audio/timbres.ts — FOUND (contains flute:, attackSec: 0.13, 0 chime references)
- src/audio/timbres.test.ts — FOUND (contains spike-008 assertions, attackSec tests)
- src/audio/cueSynth.ts — FOUND (contains linearRampToValueAtTime, preset.attackSec, soft-attack branch)
- src/audio/cueSynth.test.ts — FOUND (contains soft-attack and bowl strike path tests)
- src/audio/nkCueSynth.ts — FOUND (line-4 comment reads Bowl / Bell / Sine / Flute)
- src/audio/audioEngine.test.ts — FOUND (engineFlute, 'flute' literal)
- src/hooks/useAudioCues.test.tsx — FOUND (fluteEnvelope/flute replacement)
- src/app/App.session.test.tsx — FOUND (fluteEnvelope replacement)

Commits exist: c10e4d7, ba1a859, 20c0a45, f75cb2b, 3627a5b — all on branch worktree-agent-a88dd4a2faebb8674

## Self-Check: PASSED
