---
phase: 48-appearance-page-i18n (audio chunk)
fixed_at: 2026-05-26T00:00:00Z
review_path: .planning/phases/48-appearance-page-i18n/48-REVIEW-audio.md
iteration: 1
findings_in_scope: 13
applied: 12
skipped: 0
deferred: 1
status: partial
---

# Audio Chunk: Code Review Fix Report

**Fixed at:** 2026-05-26
**Source review:** `48-REVIEW-audio.md`
**Scope:** `src/audio/` (audioEngine.ts, audioStatus.ts, cueSynth.ts, nkCueSynth.ts, previewContext.ts, timbres.ts) + audio-related tests
**Iteration:** 1

## Summary

- Findings in scope: 13 (2 BL, 7 WR, 4 IN)
- Applied: 12
- Deferred: 1 (WR-07 — touches files outside chunk scope)
- Skipped: 0

Tests not run per scope contract — orchestrator runs vitest once after all 9 chunks finish.

## Applied

### BL-01: scheduleEndChord exposes only the last voice's envelope

**Commit:** `317e2af`
**Files:** `src/audio/nkCueSynth.ts`
**Applied fix:** Route every chord voice through a shared `masterEnvelope: GainNode` and return that on the `CueHandle`. A mid-chord `setMuted(true)` now ramps the single master bus instead of only the last voice's envelope. Last-voice `'ended'` disconnects the master bus to keep AUDIO-04 cleanup contract intact.

### BL-02: scheduleTick missing AUDIO-04 'ended' disconnect listener

**Commit:** `2f6067c`
**Files:** `src/audio/cueSynth.ts`
**Applied fix:** Added `osc.addEventListener('ended', () => { osc/filter/envelope.disconnect() }, { once: true })` mirroring `scheduleBowlCue` / `scheduleNKTick` / `scheduleCountdownTick`. Dormant in production (lead-in routes through `scheduleCountdownTick`) but `scheduleTick` is still exported + tested; any future caller no longer regresses to a 3-node-per-tick leak.

### WR-01: previewContext swallows AudioContext construction + resume failures

**Commit:** `717d8c8`
**Files:** `src/audio/previewContext.ts`
**Applied fix:** Wrapped `new AudioContext()` in try/catch with a cached `ctxFailed` flag so subsequent taps silently no-op after the first failure (iOS Safari autoplay-policy reject). Attached `.catch` to the fire-and-forget `previewCtx.resume()` so visibility-race rejections no longer surface as unhandled promise rejections.

### WR-02: onStateChange listener ordering invariant

**Commit:** `bdd158f`
**Files:** `src/audio/audioEngine.ts`
**Applied fix:** Added a comment block documenting that `addEventListener('statechange', ...)` runs AFTER the initial `await audioCtx.resume()`, so the suspended → running transition fires before the listener exists and is intentionally dropped. The hook initializes `audioStatus` to `'ok'` and never expects a `'running'` notification, so the current behaviour is correct; the comment locks the invariant.

### WR-03: phantom-envelope window between 'ended' fire and cleanupAt

**Commit:** `a217e4a`
**Files:** `src/audio/audioEngine.ts`
**Applied fix:** Took the documentation route (the lighter of the two options the reviewer offered). Added a comment block on `pruneExpiredCues` noting the 100 ms slack is intentional and explaining why phantom-envelope ramps are harmless dead work. Rejected the heavier "thread a `done` flag through every schedule* primitive" path because the phantom-fade is documented as harmless and `close()` already wraps disconnects in try/catch for exactly this reason.

### WR-04: buildNKToneNodes pad envelope same-time automation events

**Commit:** `f836bfd`
**Files:** `src/audio/nkCueSynth.ts`
**Applied fix:** Clamped `attackEnd = Math.min(when + attackSec, releaseStart, stopAt)` and only emitted the hold `setValueAtTime(peakGain, releaseStart)` when `releaseStart > attackEnd` — eliminates the same-instant `setValueAtTime`/`linearRampToValueAtTime` collision that was implementation-defined across Chrome/Safari. Dormant for current `END_CHORD_*` constants (attack 0.9 + release 1.4 < duration 5.0); fix protects future tunings or reuses of `buildNKToneNodes` with short pad tones.

### WR-05: playEndChord double-dispatch overwrites endChordTailUntil

**Commit:** `1bb341b`
**Files:** `src/audio/audioEngine.ts`
**Applied fix:** `endChordTailUntil = Math.max(endChordTailUntil, cue.cleanupAt)`. Defensive; no observable change on the happy path.

### WR-06: close() setTimeout vs audio-clock trade-off

**Commit:** `20710d9`
**Files:** `src/audio/audioEngine.ts`
**Applied fix:** Documentation. Added a comment explaining that `setTimeout(wallclock)` and `audioCtx.currentTime` are spec-independent but in practice throttle together when backgrounded (Chrome throttles setTimeout AND auto-suspends the AC; Safari pauses both). The drift-longer-in-hidden-tab failure mode is acceptable; the disqualifying mode (timeout fires while AC is paused) does not occur in any current browser. Notes the reasoning so a future maintainer doesn't "fix" this by busy-polling `currentTime`.

### IN-01: AUDIO-04 invariant comment + unreachable undefined guard

**Commit:** `17aca85`
**Files:** `src/audio/cueSynth.ts`
**Applied fix:** Collapsed the two-loop structure into a single pass — `scheduleBowlCue` now builds + wires + attaches the `'ended'` listener inside one `for (const partial of preset.partials)` block, keeping `osc` and `partialGain` as locals captured by the listener closure. Removed the unreachable `noUncheckedIndexedAccess` guard. Tracks `lastOsc` separately for the shared filter+envelope teardown. Same audio graph, mirrors the nkCueSynth single-pass pattern.

### IN-02: empty preset.partials would leak filter+envelope silently

**Commit:** `5d014e1`
**Files:** `src/audio/timbres.test.ts`
**Applied fix:** Added a `timbres.test.ts` assertion that every preset has `partials.length > 0`. Chose the test-level lock (lighter, defensive depth) rather than a runtime `assert` in the hot path. Per memory rule "no design locking", this is a structural invariant — not byte-locking a downstream-tunable value.

### IN-03: previewContext.ts has no tear-down

**Commit:** `f27738d`
**Files:** `src/audio/previewContext.ts`
**Applied fix:** Added `closePreviewContext(): void` that nulls the singleton, resets `ctxFailed`, and best-effort closes the AC. Idempotent. Useful for tests and provides symmetry with `engine.close()`.

### IN-04: Repeated `audioCtx.state as AudioContextState | 'interrupted'` cast

**Commit:** `656e42c`
**Files:** `src/audio/audioEngine.ts`
**Applied fix:** Defined `type ExtendedAudioContextState = AudioContextState | 'interrupted'` and a local `readState()` helper inside `createAudioEngine`. The eslint-disable + cast comment lives once at the helper definition. Three call sites (`onStateChange`, the iOS `InvalidStateError` branch in `resume()`, the `state` getter) collapse to `readState()` reads. Mechanical refactor, no behaviour change.

## Deferred

### WR-07: AudioStatus type alias confusion between audioEngine.ts and audioStatus.ts

**File:** `src/audio/audioEngine.ts:27` vs. `src/audio/audioStatus.ts:2`
**Reason for deferral:** The fix requires renaming the exported `AudioStatus` type (suggested: `LeadInPhase` or `SessionAudioPhase`) and updating all consumers. The reviewer's claim that `AudioStatus` is only used in tests is incorrect — `src/hooks/useAudioCues.ts` imports it (lines 21, 30, 34, 94) and re-exports it, and `src/hooks/useBreathingSessionController.ts` re-exports it via `useAudioCues`. Renaming would touch:

- `src/hooks/useAudioCues.ts` (production code)
- `src/hooks/useAudioCues.test.tsx`
- `src/hooks/useBreathingSessionController.ts` (indirect re-export)

Those files are outside the audio chunk scope (`src/audio/`). Deferring to a future cross-chunk pass — either a `hooks` chunk maintainer picks it up, or it gets queued as a standalone rename task. The status quo (two distinct types named `AudioStatus` and `AudioStatusFlag`) is confusing but not a correctness defect.

If the orchestrator wants this fixed now, the safe rename is mechanical (LSP rename — see memory rule `[[feedback_use_lsp_for_renames]]`) and should be batched as a single commit across all four files. Per memory rule, don't use sed/perl.

---

## Memory rules respected

- **[[feedback_no_design_locking]]** — IN-02 test asserts `partials.length > 0` (structural, not a byte-lock on a tunable value). No tests added that lock specific gains, frequencies, or durations.
- **[[feedback_design_logic_separation]]** — N/A for audio chunk (pure logic, no design surface).
- **[[feedback_spike_locked_values]]** — N/A; no spike-locked values in audio chunk. Confirmed `END_CHORD_*` constants (Spike 005) and `COUNTDOWN_TICK_*` (Spike 004) were left untouched.
- **[[feedback_use_lsp_for_renames]]** — WR-07 deferred precisely because it needs LSP rename across files; not applied via search-and-replace.
- **General commit hygiene** — Comments added explain WHY (Safari quirks, implementation-defined automation ordering, audio-clock vs wallclock semantics), not WHAT. No source comments reference finding IDs.

## Tally for orchestrator

```
applied:  12
deferred:  1  (WR-07 — cross-chunk rename, queue separately)
skipped:   0
```

All applied fixes type-check clean under `npx tsc --noEmit`.

---

_Fixed: 2026-05-26_
_Fixer: Claude (gsd-code-fixer, audio chunk)_
_Iteration: 1_
