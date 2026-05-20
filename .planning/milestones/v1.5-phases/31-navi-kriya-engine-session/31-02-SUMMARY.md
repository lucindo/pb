---
phase: 31-navi-kriya-engine-session
plan: "02"
subsystem: audio
tags: [audio, navi-kriya, web-audio, tdd, nk-05]
dependency_graph:
  requires:
    - src/audio/cueSynth.ts (CueHandle type import)
    - src/audio/timbres.ts (TIMBRE_PRESETS, TimbrePreset)
    - src/domain/settings.ts (TimbreId)
  provides:
    - src/audio/nkCueSynth.ts (scheduleNKFrontMarker, scheduleNKBackMarker, scheduleNKTick, scheduleNKEndChord)
  affects:
    - App.tsx (Wave 2 injects these as NKAudioCallbacks in onNKStartClick)
tech_stack:
  added: []
  patterns:
    - TDD RED/GREEN cycle for audio synthesis
    - Per-tone private builder (buildNKToneNodes) returning raw nodes for caller-controlled cleanup
    - TIMBRE_PRESETS[timbre] lookup per exported function (D-05)
    - addEventListener('ended', { once: true }) cleanup per tone (T-31-04 / AUDIO-04)
    - CueHandle.scheduledAt anchored to gesture start (not second-tone offset)
key_files:
  created:
    - src/audio/nkCueSynth.ts
    - src/audio/nkCueSynth.test.ts
  modified: []
decisions:
  - "scheduleNKTone refactored into buildNKToneNodes helper returning raw nodes; each exported function registers its own addEventListener('ended') cleanup — satisfies >={4} literal count and matches cueSynth.ts AUDIO-04 discipline"
  - "scheduledAt for two-tone gestures (front/back markers) anchors to gesture start `when`, not to the second tone's scheduled offset — CueHandle contract requires scheduledAt = when passed in"
  - "NK_TICK_PEAK_GAIN=0.08 (vs. preset.peakGain ~0.18) gives barely-there quality per D-07"
  - "End chord uses 3 tones (root×1.0, major-third×1.25, fifth×1.5) from fundamentalHzOut for a resolved low feel (D-08)"
metrics:
  duration_minutes: 5
  completed: "2026-05-17"
  tasks_completed: 2
  tasks_total: 2
  files_created: 2
  files_modified: 0
---

# Phase 31 Plan 02: NK Cue Synth Summary

**One-liner:** Four NK Web Audio cue builders (front/back/tick/end-chord) routing through TIMBRE_PRESETS with per-tone cleanup discipline.

## Tasks Completed

| Task | Name | Commit | Files |
|------|------|--------|-------|
| 1 | Write failing nkCueSynth test scaffold (RED) | 0c0cc0b | src/audio/nkCueSynth.test.ts |
| 2 | Implement four NK cue synthesis functions (GREEN) | eb27170 | src/audio/nkCueSynth.ts |

## What Was Built

`src/audio/nkCueSynth.ts` — a new standalone audio module with four exported functions:

- **`scheduleNKFrontMarker`** (D-06): Rising two-tone gesture — `fundamentalHzOut` at `when`, `fundamentalHzIn` at `when + 0.30`. Returns `CueHandle` with `scheduledAt = when` (gesture start).
- **`scheduleNKBackMarker`** (D-06): Falling two-tone gesture — `fundamentalHzIn` at `when`, `fundamentalHzOut` at `when + 0.30`. Same CueHandle anchor convention.
- **`scheduleNKTick`** (D-07): Single soft short tone (0.12 s, peakGain 0.08 — barely-there) at `fundamentalHzIn`. Routes through the selected timbre.
- **`scheduleNKEndChord`** (D-08): Three-note resolved low chord (root × 1.0, major-third × 1.25, fifth × 1.5 relative to `fundamentalHzOut`), 1.8 s duration, long decay.

All four functions:
- Read `TIMBRE_PRESETS[timbre]` (D-05 — 5 occurrences in source)
- Register `addEventListener('ended', { once: true })` cleanup per tone (6 occurrences — T-31-04)
- Import only `type CueHandle` from `./cueSynth` (zero value imports from cueSynth)

`src/audio/nkCueSynth.test.ts` — 11 tests covering:
- CueHandle contract (envelope, scheduledAt, cleanupAt) for all four builders
- `scheduledAt` equals `when` for front/back/end
- `cleanupAt > scheduledAt` for all four builders
- D-07: tick duration shorter than end chord (barely-there)
- D-06: front/back marker calls without throwing for every `TimbreId`

## Verification Results

- `npx vitest run src/audio/nkCueSynth.test.ts` — 11/11 passed
- `npx vitest run` — 1068/1068 passed (no regressions; +11 from 1057 baseline)
- `npx tsc --noEmit` — clean (no new errors)

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 1 - Bug] Fixed CueHandle.scheduledAt for two-tone gestures**
- **Found during:** Task 2 first test run
- **Issue:** Initial implementation returned the tone-2 handle directly, so `scheduledAt = when + 0.30` instead of `when`. Tests asserting `scheduledAt === when` failed.
- **Fix:** Store tone-2 nodes, return a new CueHandle literal `{ envelope: t2.envelope, scheduledAt: when, cleanupAt: t2.cleanupAt }` — anchors the gesture start to the caller's `when`.
- **Files modified:** src/audio/nkCueSynth.ts
- **Commit:** eb27170

**2. [Rule 2 - Missing critical functionality] Restructured cleanup to satisfy `>= 4 addEventListener` acceptance criterion**
- **Found during:** Task 2 acceptance criteria check
- **Issue:** Initial design used a shared `scheduleNKTone` helper with 1 literal `addEventListener` call; plan requires `>= 4` (cleanup discipline per builder).
- **Fix:** Refactored to `buildNKToneNodes` helper (returns raw nodes); each exported function registers its own `addEventListener('ended')` listener — 6 total literal occurrences, matching the cueSynth.ts AUDIO-04 inline discipline.
- **Files modified:** src/audio/nkCueSynth.ts
- **Commit:** eb27170 (same commit, same iteration)

## Threat Surface Scan

No new threat surface introduced. This module:
- Reads only `TIMBRE_PRESETS` (static data) and `when`/`destination` args
- Creates nodes within the passed AudioContext (no new context creation)
- No network, no storage, no PII

T-31-04 (DoS via leaked nodes) mitigated: every tone disconnects on `'ended'` with `{ once: true }`.
T-31-05 (Information Disclosure): accepted — pure synthesis, no data read or persisted.

## Self-Check: PASSED

| Item | Status |
|------|--------|
| src/audio/nkCueSynth.ts | FOUND |
| src/audio/nkCueSynth.test.ts | FOUND |
| 31-02-SUMMARY.md | FOUND |
| commit 0c0cc0b (test scaffold) | FOUND |
| commit eb27170 (implementation) | FOUND |
