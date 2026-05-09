---
phase: 03-optional-generated-audio-cues
plan: 01
subsystem: audio
tags: [audio, scheduler, web-audio-api, polyfill, tdd, foundation]
type: execute
status: complete
wave: 1
dependency_graph:
  requires:
    - "vitest.setup.ts (existing matchMedia + HTMLDialogElement polyfills)"
    - "src/domain/breathingPlan.ts (pattern reference: pure-builder + lookup-table)"
    - "src/hooks/useSessionEngine.ts (pattern reference: cancelled-flag-with-cleanup)"
  provides:
    - "FakeAudioContext polyfill on window.AudioContext (test environment only)"
    - "scheduleInCue / scheduleOutCue / scheduleTick + CueHandle interface"
    - "startScheduler factory + LOOKAHEAD_MS / SCHEDULE_AHEAD_SEC + SchedulerHandle"
  affects:
    - "Phase 3 plan 02 (audioEngine.ts) — composes both modules without re-litigating jsdom"
    - "Phase 3 plan 03 (useAudioCues.ts) — owns lifecycle of the scheduler handle"
tech_stack:
  added: []
  patterns:
    - "Pure synthesis builder (no React, no try/catch, named exports + lookup table for partial ratios)"
    - "Chris Wilson canonical lookahead scheduler (web.dev/audio-scheduling)"
    - "Cancelled-flag-with-cleanup idiom (mirrors useSessionEngine.ts:29-57)"
    - "Guarded jsdom polyfill (mirrors matchMedia + HTMLDialogElement at vitest.setup.ts:3-44)"
key_files:
  created:
    - "src/audio/cueSynth.ts (150 lines)"
    - "src/audio/cueSynth.test.ts (170 lines, 11 it() blocks)"
    - "src/audio/lookaheadScheduler.ts (53 lines)"
    - "src/audio/lookaheadScheduler.test.ts (163 lines, 9 it() blocks)"
  modified:
    - "vitest.setup.ts (+76 lines — FakeAudioContext + 4 fake nodes + FakeAudioParam)"
decisions:
  - "Locked In/Out fundamentals at 440 Hz (A4) and 220 Hz (A3) per 03-RESEARCH.md Pattern 2. Rationale: A4/A3 sit in the most spectrally pleasant midrange for soft bowl-style cues; an octave apart gives a clear pitch delta (D-03)."
  - "Locked partial ratios at [1.0, 2.76, 5.40] with relative gains [1.0, 0.4, 0.15] — Risset bell-style stack from 03-RESEARCH.md Pattern 2. These ratios produce an inharmonic, gong/bowl-like timbre rather than a clean sine."
  - "Decay timeConstant: In = 1.4 s, Out = 1.8 s. Out decays slightly longer to reinforce the perceptual difference (Out is the longer, lower-energy phase of the breath cycle in asymmetric ratios)."
  - "Tick uses square wave at 1200 Hz through low-pass 2400 Hz / Q 1.5, total ~80 ms. Distinct timbre (square vs sine stack) and distinct duration (~80 ms vs ~7+ s) satisfy D-15's perceptual-distinction requirement."
  - "Master peak gain: bowl 0.18, tick 0.12 — both well below the 0.25 headroom target."
  - "LOOKAHEAD_MS = 25 and SCHEDULE_AHEAD_SEC = 0.1 — Chris Wilson canonical values from web.dev/audio-scheduling; 100 ms ahead is comfortably more than 25 ms tick jitter."
  - "FakeAudioContext polyfill is install-only (no exports) and lives behind feature-detect guard `!window.AudioContext`. Mirrors the matchMedia + HTMLDialogElement style at vitest.setup.ts:3-44."
metrics:
  duration: "7.2 min"
  completed: 2026-05-09
  tasks_planned: 3
  tasks_completed: 3
  files_changed: 5
  test_count_baseline: 80
  test_count_after: 100
  test_delta: 20
  commits: 5
---

# Phase 3 Plan 01: Foundation — Polyfill, cueSynth, lookaheadScheduler Summary

**One-liner:** Installed jsdom AudioContext polyfill plus the two pure audio modules (Risset-bowl `cueSynth` with locked 440/220/1200 Hz constants, and Chris Wilson `lookaheadScheduler` with 25 ms / 100 ms cadence) so plan 02's audioEngine can compose them without re-litigating Web Audio test scaffolding.

## What Was Built

| Artifact                                | Purpose                                                                                                                                                                       | Used By                                          |
| --------------------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------ |
| `vitest.setup.ts` (+ AudioContext block) | FakeAudioContext + FakeOscillatorNode/FakeGainNode/FakeBiquadFilterNode/FakeAudioParam — every method/AudioParam slot is `vi.fn()` so downstream tests can spy mock calls. | All audio test files (this plan's two + plan 02/03). |
| `src/audio/cueSynth.ts`                  | `scheduleInCue`, `scheduleOutCue`, `scheduleTick`, `CueHandle`. Pure builders — zero React, zero try/catch, no Date.now leakage.                                              | Plan 02 audioEngine, Plan 03 useAudioCues hook.  |
| `src/audio/lookaheadScheduler.ts`        | `startScheduler(audioCtx, getNextBoundaryAudioTime, scheduleAtTime)` returning `SchedulerHandle`. Fires every 25 ms, scans for boundaries inside +0.1 s window.              | Plan 02 audioEngine.                              |
| `src/audio/cueSynth.test.ts`             | 11 it() blocks — partial counts, frequencies, envelope, low-pass filter, peak gain headroom, tick distinctness, CueHandle contract.                                          | Verification only.                                |
| `src/audio/lookaheadScheduler.test.ts`   | 9 it() blocks — handle shape, within/beyond-window scheduling, 25 ms re-tick, null tolerance, stop() halt + idempotency, currentTime read.                                   | Verification only.                                |

## Final In/Out/Tick Frequency Choices

| Cue                | Fundamental | Partials (ratio × fundamental) | Decay τ  | Total tail | Peak gain |
| ------------------ | ----------- | ------------------------------ | --------- | ---------- | --------- |
| In (scheduleInCue)  | 440 Hz (A4) | 440 / 1214.4 / 2376 Hz         | 1.4 s     | ~7.1 s     | 0.18      |
| Out (scheduleOutCue) | 220 Hz (A3) | 220 / 607.2 / 1188 Hz          | 1.8 s     | ~9.1 s     | 0.18      |
| Tick               | 1200 Hz square (LP 2400 Hz / Q 1.5) | n/a (single oscillator)           | 0.04 s    | ~0.13 s    | 0.12      |

These are the values from 03-RESEARCH.md Pattern 2 (lines 271-340) installed verbatim. No deviation from RESEARCH defaults.

## FakeAudioContext Polyfill Location + Citation

- **Location:** `vitest.setup.ts:46-122` (the new block after the existing matchMedia polyfill).
- **Citation comment** (`vitest.setup.ts:46-49`): cites `03-RESEARCH.md Code Examples (lines 585-649)` and `github.com/jsdom/jsdom/issues/2900` (jsdom Web Audio gap).
- **Install pattern:** `Object.defineProperty(window, 'AudioContext', { writable: true, value: FakeAudioContext })` behind `if (typeof window !== 'undefined' && !window.AudioContext)`.
- **Spy surface:** every audio-graph method/AudioParam slot uses `vi.fn()` so test code can introspect via `mock.calls` (used heavily by `cueSynth.test.ts`).

## Test Count Delta

- **Baseline before this plan:** 80 tests in 8 test files (NOT 102 as the PLAN.md `<verification>` block hypothesised — see Deviations below).
- **After this plan:** 100 tests in 10 test files.
- **Delta:** +20 tests, +2 test files.

| Subset                              | Tests | Status |
| ----------------------------------- | ----- | ------ |
| `cueSynth.test.ts`                  | 11    | pass   |
| `lookaheadScheduler.test.ts`        | 9     | pass   |
| All pre-existing tests (Phase 1+2)  | 80    | pass   |
| **Full suite (`npm run test:run`)** | **100** | **pass** |

## Decisions Made

1. **Stuck verbatim with 03-RESEARCH.md Pattern 1 + Pattern 2 numbers.** No frequency tweaks, no partial-ratio drift, no decay-constant overrides. The plan called the locked tables load-bearing for Plan 02; preserving them removes a coordination question.
2. **Module-level constants as `const`, not exported.** Mirrors `breathingPlan.ts:13-20`: callers do not need to override frequencies (T-03-01 in the plan threat model: Hz values are not user-controlled in v1).
3. **Tick = square wave + low-pass.** D-15 needed perceptual distinction from the sine-stack bowl cues. Square + steep LP at 2400 Hz / Q 1.5 produces a softened click that is unmistakably different in timbre but not harsh.
4. **`scheduleBowlCue` is a private helper.** scheduleInCue and scheduleOutCue both delegate to it with their own `(fundamentalHz, decayTimeConstant)` pair — DRY without exporting the helper. Matches the pure-builder style of `breathingPlan.ts`.
5. **No try/catch in either module.** Validation lives upstream (audioEngine in plan 02 ensures `audioCtx.state === 'running'` before calling). Mirrors `breathingPlan.ts`'s validate-then-build posture.
6. **Scheduler test uses `Object.defineProperty` to override `currentTime`.** The polyfill's getter is `performance.now()`-based, but tests need deterministic clock values; `Object.defineProperty(ac, 'currentTime', { get: ... })` is the cleanest override that does not require a second polyfill class.

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 1 — Bug] Test for "re-runs after LOOKAHEAD_MS" caused an infinite loop, OOM-killing the worker.**

- **Found during:** Task 3 GREEN gate (`npm run test:run -- src/audio/lookaheadScheduler.test.ts`)
- **Issue:** The PLAN.md spec had `getNextBoundaryAudioTime` return `null` on first tick then `0.05` thereafter. After the second tick scheduled the 0.05 boundary, my draft followed the spec literally and kept returning `0.05` forever — the scheduler's while-drain loop then called `scheduleAtTime(0.05)` infinitely, exhausting the heap.
- **Fix:** Replaced `let firstTick = true` toggle with a finite `[null, 0.05]` sequence array drained via `shift()`. Returns null after the queue is empty, so the while-loop exits naturally.
- **Files modified:** `src/audio/lookaheadScheduler.test.ts` (test 5)
- **Commit:** `0ed6194` (folded into the GREEN commit since this was a TEST defect uncovered during GREEN, not a SOURCE bug).

**2. [Rule 1 — Bug] Test for "reads from audioCtx.currentTime" expected the getter to fire when getNext returned null.**

- **Found during:** Task 3 GREEN gate (after fix #1)
- **Issue:** When `getNextBoundaryAudioTime()` returns null, JavaScript short-circuits the `next !== null && next < audioCtx.currentTime + ...` condition without ever evaluating the right-hand side — so `currentTime` is never read on a null-result tick. My draft test asserted the getter fired, which it correctly did not.
- **Fix:** Test now passes a beyond-window boundary (`() => 99.0`) so the while-condition evaluates the right side (and exits without entering the body, preserving the original "no schedule" intent of the assertion).
- **Files modified:** `src/audio/lookaheadScheduler.test.ts` (test 9)
- **Commit:** `0ed6194` (same GREEN commit).

**3. [Rule 1 — Documentation] Comment in `lookaheadScheduler.ts` mentioned `Date.now()` and `performance.now()` literally, tripping the acceptance grep gate.**

- **Found during:** Task 3 acceptance-criteria scan
- **Issue:** Acceptance criterion required `grep -c "Date.now\|performance.now" src/audio/lookaheadScheduler.ts == 0`. My initial comment said "NEVER read Date.now() / performance.now() here" — semantically correct (it bans them) but trips a literal grep.
- **Fix:** Rephrased to "NEVER read main-thread wallclock APIs here" — same intent, no grep collision.
- **Files modified:** `src/audio/lookaheadScheduler.ts` (one comment line)
- **Commit:** `0ed6194` (same GREEN commit).

### Plan-vs-Reality Notes (informational, not deviations from intent)

- **PLAN.md `<verification>` block referenced "102 existing tests"; actual baseline is 80.** No regression — all 80 still pass — but the plan's expected number was off by 22. This is a planning artifact (likely double-counting some test names) and does not change the outcome. After this plan: 100 tests total. The plan's success criteria (`npm run test:run returns 0`, `npm run test:run -- src/audio returns 0`) were both met.
- **Acceptance criterion `grep -c "5.40\|5\.4"` returned 1.** I used `5.4` in the source (`{ ratio: 5.4, gain: 0.15 }`), which matches the second alternative in the regex. The criterion accepts either spelling.

## Authentication Gates

None — Phase 3 is browser-side only with no network/auth/PII surface.

## Known Stubs

None — every function created in this plan has a real implementation, every test has real assertions against the FakeAudioContext spy surface. No placeholder constants, no `TODO`, no commented-out branches.

## Threat Flags

None — files created (`vitest.setup.ts` polyfill block, `src/audio/cueSynth.ts`, `src/audio/lookaheadScheduler.ts`) introduce no new trust boundaries, no network surface, no auth/file/schema changes. The plan's `<threat_model>` accepted T-03-01 (frequency constants are not user-controlled) and T-03-02 (polyfill is jsdom-only) — both still hold; nothing this plan added expands threat surface.

## TDD Gate Compliance

| Task | RED commit | GREEN commit | REFACTOR commit |
| ---- | ---------- | ------------ | --------------- |
| 1: vitest.setup polyfill | n/a (infrastructure-only — verified via existing-suite regression check) | `3e879cb` (test commit type because it's test-environment scaffolding) | none needed |
| 2: cueSynth | `e384770` | `48bd082` | none needed (clean on first pass) |
| 3: lookaheadScheduler | `5d65c5d` | `0ed6194` | folded into GREEN — test fixes were defect repairs, not refactor |

All three required gates (test-then-feat ordering on Tasks 2 and 3) are present in the git log. Task 1 is a polyfill shim and does not have a meaningful RED phase on its own — its "test" is that the existing 80-test suite continues passing AND that downstream tests can `new AudioContext()`, both of which are demonstrated by Tasks 2 and 3 going green against this polyfill.

## Self-Check: PASSED

**Files claimed:**
- `vitest.setup.ts` — FOUND (modified, +76 lines)
- `src/audio/cueSynth.ts` — FOUND
- `src/audio/cueSynth.test.ts` — FOUND
- `src/audio/lookaheadScheduler.ts` — FOUND
- `src/audio/lookaheadScheduler.test.ts` — FOUND

**Commits claimed (verified via `git log --oneline -7`):**
- `3e879cb` — FOUND `test(03-01): extend vitest.setup with FakeAudioContext polyfill`
- `e384770` — FOUND `test(03-01): add failing tests for cueSynth bowl + tick builders`
- `48bd082` — FOUND `feat(03-01): implement cueSynth bowl + tick builders`
- `5d65c5d` — FOUND `test(03-01): add failing tests for lookaheadScheduler factory`
- `0ed6194` — FOUND `feat(03-01): implement Chris Wilson lookaheadScheduler factory`

**Acceptance gates verified:** Task 1 grep gates (FakeAudioContext ≥ 2, FakeOscillatorNode/FakeGainNode/FakeBiquadFilterNode/FakeAudioParam ≥ 1, citation comment = 1, vi import = 1, defineProperty = 1, HTMLDialogElement preserved = 6, matchMedia preserved = 4) all pass. Task 2 grep gates (no React, all three exports + CueHandle interface, frequency constants 440/220/1200/2.76/5.4, decay constants 1.4/1.8, setValueAtTime/setTargetAtTime present, square wave present, ≥10 it() blocks → got 11) all pass. Task 3 grep gates (no React, LOOKAHEAD_MS = 25, SCHEDULE_AHEAD_SEC = 0.1, startScheduler + SchedulerHandle exports, audioCtx.currentTime ≥ 1, no Date.now/performance.now leakage, setTimeout/clearTimeout present, ≥9 it() blocks → got 9) all pass.

**Verification gates verified:** `npm run test:run` exits 0 with 100/100 tests passing in 10 test files. `npm run test:run -- src/audio` exits 0 with 20/20 tests passing in the audio subset.

## Next Steps for Plan 02

The audioEngine can now `import { scheduleInCue, scheduleOutCue, scheduleTick }` from `./cueSynth` and `import { startScheduler, LOOKAHEAD_MS, SCHEDULE_AHEAD_SEC }` from `./lookaheadScheduler` without any further wiring. The `CueHandle.envelope` GainNode is already exposed for D-08 mute fade-out (envelope.gain.linearRampToValueAtTime → 0 over 50–100 ms when the user taps mute). The `SchedulerHandle.stop()` is idempotent and can be called from useAudioCues' cleanup return without further guarding.
