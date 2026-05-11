---
quick_id: 260510-tc9
type: summary
mode: quick
status: complete
phase_one_liner: "Equalized inner reference ring weight with outer ring + scaled bowl-cue decay envelope to phase duration (clamped) so both visual and audio cues restore In/Out perceptual parity at low BPM."
dependency_graph:
  requires: []
  provides:
    - "src/audio/cueSynth.ts now accepts an optional phaseDurationSec arg on scheduleInCue/scheduleOutCue (4th positional). Back-compat: omitting the arg yields byte-identical synthesis."
    - "src/audio/audioEngine.ts AudioEngine.scheduleNextCue requires { newPhase, audioTime, phaseDurationSec }. scheduleLeadIn now consumes plan.inhaleMs to scale the first In cue."
    - "src/hooks/useAudioCues.ts notifyPhaseBoundary requires phaseDurationSec on its args."
  affects:
    - "src/app/App.tsx boundary scheduler effect derives phaseDurationSec from planRef.current.{inhaleMs, exhaleMs} per frame.phase."
tech_stack:
  added: []
  patterns:
    - "Single-knob clamp envelope scaling (Direction A): effectiveTau = clamp(defaultTau, phaseDurationSec / 3, MAX_TAU=6) preserves the one-strike-per-phase metaphor while restoring audible cue length at low BPM."
key_files:
  created:
    - .planning/quick/260510-tc9-bug-fixes-1-add-out-phase-visual-complet/260510-tc9-SUMMARY.md
  modified:
    - src/styles/theme.css
    - src/audio/cueSynth.ts
    - src/audio/audioEngine.ts
    - src/hooks/useAudioCues.ts
    - src/app/App.tsx
    - src/audio/cueSynth.test.ts
    - src/audio/audioEngine.test.ts
requirements_completed:
  - BUG-TC9-01
  - BUG-TC9-02
decisions:
  - "Bug 1: inner ring equalized to outer at border-width 1.5px AND color alpha 0.6 (no bias-thicker variant applied — manual UAT will decide if inner needs to bump to 1.75px, the plan-authorized escape hatch)."
  - "Bug 2: Direction A (stretch the decay envelope) chosen over B/C/D — minimal surface area, preserves the one-strike-per-phase metaphor, single-knob fix. PERCEPTUAL_DECAY_DIVISOR = 3 and MAX_TAU = 6 as planned."
  - "Both clamps applied: lower clamp (max(defaultTau, ...)) prevents short phases from getting a thinner cue than baseline; upper clamp (min(MAX_TAU, ...)) keeps very long phases from droning past the next boundary."
  - "scheduleNextCue's phaseDurationSec is REQUIRED (not optional) on the AudioEngine API — App.tsx always has a plan when scheduling boundaries, and a required field surfaces missed call-sites at compile time."
  - "Lead-in ticks left untouched — they have their own short fixed envelope (TICK_DECAY_TIME_CONSTANT = 0.04 s) and the per-tick perceptual length (~80 ms) is already shorter than the 1 s tick interval."
metrics:
  duration_minutes: 6
  completed_at: "2026-05-11T00:17:00Z"
---

# Quick Task 260510-tc9: Bug fixes — Out-phase visual cue + bowl-cue decay duration

## One-liner

Equalized the inner reference ring with the outer ring (CSS, 2-line change) AND scaled the bowl-cue decay envelope with phase duration (synth + engine + hook + App), restoring symmetric In/Out perceptual cues at low BPM.

## Background

User reported two UX defects in the post-Phase-5.1 build:

1. **Bug 1 (visual)** — The Out-phase orb shrink has no visual reference comparable to the In-phase grow. The inner reference ring already existed in `BreathingShape.tsx` but `theme.css` rendered it at thinner border (1 px vs 1.5 px) and lower alpha (0.45 vs 0.6), so on a smaller circumference it read as a background detail rather than a symmetric arrival cue.
2. **Bug 2 (audio)** — The bowl cue was perceptually silent after ~3 s even though oscillators ran ~7–9 s, because `setTargetAtTime` is exponential decay (3×τ ≈ -26 dB). At BPM ≤ 3.5, each phase is ≥ 5 s and the user hears silence before the next phase boundary.

## What was done

### Task 1: Equalize inner reference ring (Bug 1) — commit `b267cac`

`src/styles/theme.css`:
- `--color-ring-inner` alpha bumped `0.45 → 0.6` to match `--color-ring-outer`.
- `.orb-ring--inner` `border-width: 1px → 1.5px` to match `.orb-ring--outer`.
- Added inline comment block citing 260510-tc9 Bug 1.

Hues preserved (teal outer, blue inner — semantic In/Out distinction is unchanged); only contrast magnitude changed. Two-line CSS change preserves the Phase 5.1 CSS-trim posture.

**Final values:** inner `border-width: 1.5px`, alpha `0.6`. Plan authorized biasing inner to `1.75px` if visual UAT shows the smaller circumference still reads weaker — deferred to manual UAT decision.

### Task 2: Stretch bowl-cue decay to phase duration (Bug 2) — commits `cd5f6cd` (RED) + `999eb8a` (GREEN)

Followed the TDD cycle:

**RED (commit `cd5f6cd`):** Added 3 new cueSynth tests + 1 new audioEngine forwarding test + threaded `phaseDurationSec` through existing scheduleNextCue assertions. Confirmed 3 failures from missing implementation (the back-compat clamp test passed by accident because doing nothing matches the default-τ assertion — that's exactly the byte-identical back-compat the spec requires, so it's a valid passing assertion).

**GREEN (commit `999eb8a`):** Implemented across 4 files:

- **`src/audio/cueSynth.ts`** — Added module constants `PERCEPTUAL_DECAY_DIVISOR = 3` and `MAX_TAU = 6` with rationale comment block citing 260510-tc9 Bug 2 and Direction A. Extended `scheduleBowlCue` signature: `(ac, when, dest, fundamentalHz, defaultDecayTau, phaseDurationSec?)`. Inside, `effectiveTau = phaseDurationSec === undefined ? defaultDecayTau : Math.min(MAX_TAU, Math.max(defaultDecayTau, phaseDurationSec / PERCEPTUAL_DECAY_DIVISOR))`. `effectiveTau` drives both `setTargetAtTime` and the `stopAt` / `cleanupAt` math so a stretched decay doesn't get truncated by a baseline-length tail. `scheduleInCue` and `scheduleOutCue` gained the optional 4th `phaseDurationSec` parameter and forward it through.

- **`src/audio/audioEngine.ts`** — Extended `AudioEngine.scheduleNextCue` signature to `{ newPhase: 'in' | 'out'; audioTime: number; phaseDurationSec: number }` (required, not optional — App.tsx always has a plan when scheduling boundaries). Forwards `phaseDurationSec` to `scheduleInCue`/`scheduleOutCue` as the 4th arg. `scheduleLeadIn` now passes `plan.inhaleMs / 1000` for the first In cue and consumes the `plan` parameter properly (removed the `void _plan` line).

- **`src/hooks/useAudioCues.ts`** — Updated `notifyPhaseBoundary` arg type to include `phaseDurationSec` and forwards it to `engine.scheduleNextCue`. JSDoc updated.

- **`src/app/App.tsx`** — Boundary scheduler effect computes `const phaseDurationSec = (frame.phase === 'in' ? plan.inhaleMs : plan.exhaleMs) / 1000` and passes it alongside `newPhase` + `audioTime` in `audioNotifyPhaseBoundary`. Inline comment block updated.

### Constants chosen

| Constant | Value | Rationale |
|----------|-------|-----------|
| `PERCEPTUAL_DECAY_DIVISOR` | 3 | 3×τ ≈ -26 dB ≈ perceptual silence threshold; ensures the cue is audible right up to the phase boundary. |
| `MAX_TAU` | 6 | Cap perceptual tail at ~18 s (3×6). Longest valid phase at 5 BPM 40:60 ≈ 7.2 s; at 1 BPM 60:40 phase = 24 s. At 1 BPM the next strike arrives well before the prior tail finishes, but the cap keeps the synth from sustaining as a drone. |

## Verification

- **Automated:**
  - `npx vitest run` — 24 files, 316 tests passing (was 312 at baseline; +4 new tests).
  - `npx tsc --noEmit` — exits 0, no type errors.
- **Manual UAT:** The user's responsibility per the plan. Expected UAT matrix is below.

### Tests added

1. `cueSynth.test.ts › scheduleInCue with phaseDurationSec=10 stretches τ to ≈ 3.33 (10/3)` — long-phase stretch case.
2. `cueSynth.test.ts › scheduleInCue with phaseDurationSec=2 clamps to default τ (1.4) — short phases must not get a thinner cue than baseline` — lower-clamp case.
3. `cueSynth.test.ts › scheduleOutCue with phaseDurationSec=30 clamps to MAX_TAU = 6` — upper-clamp case.
4. `audioEngine.test.ts › scheduleNextCue forwards phaseDurationSec as the 4th arg to scheduleInCue/scheduleOutCue` — forwarding contract.

### Existing tests not weakened

All 28 pre-existing audio tests still pass with the new required `phaseDurationSec` field threaded through — no assertions weakened, only added new positional arg expectations.

## Manual UAT plan (user's responsibility)

### Bug 1 (visual) — Chrome desktop + Safari desktop + iOS Safari

| Step | BPM | Expected |
|------|-----|----------|
| 1 | 5.5 | Outer teal ring marks In-phase peak; subjectively "I can see the flip coming." |
| 2 | 5.5 | Inner blue ring NOW marks Out-phase trough at perceptually equal weight — same arrival-cue feel. |
| 3 | 3.5 | Both rings still read on long phases (slower scale change means the ring proximity dominates the perception). |
| 4 | any | OS reduced-motion ON + reload: orb frozen at MID_SCALE; both rings still visible. |

Plan's escape hatch: if UAT shows the smaller-circumference inner ring still reads weaker than the outer at equal alpha+width, bump `.orb-ring--inner { border-width: 1.5px → 1.75px }` (document the choice inline). Otherwise leave matched.

### Bug 2 (audio) — Chrome desktop + Firefox desktop + Safari desktop + iOS Safari + Android Chrome

| Step | BPM | Expected |
|------|-----|----------|
| 1 | 5.5 (baseline) | Bowl cue sounds substantively like before — short attack, gong-like decay over ~4 s. No drone, no rhythmic repetition. (At 5.5 BPM 40:60 the In phase is ~4.36 s; 4.36/3 ≈ 1.45 ≈ default 1.4 → clamp keeps default τ.) |
| 2 | 4.0 (user's reported boundary) | Cue still sounds natural and decays through the phase (4×0.4=6.0 s phase → τ ≈ 2.0 instead of 1.4; cue audibly stretches but still gong-like). |
| 3 | 3.5 (user's bug threshold) | Cue is now audible at the END of In phase (just before flip) and END of Out phase (just before flip). No silent stretches > 1 s before a boundary. |
| 4 | 1.0 (extreme) | Cue does NOT drone past the phase. MAX_TAU = 6 cap means perceptual tail ~18 s; next boundary at ~60 s. Sounds like an extended-tail gong, not a sustained sine. |
| 5 | 3.5 | Toggle Mute mid-In phase → bowl audibly fades out (D-08 preserved). |
| 6 | any | iOS Safari only: lock device mid-session, unlock, observe "Tap to resume" affordance (Phase 5.1 D-29), tap, confirm session resumes with no cue stuck on or replaying. |
| 7 | any | Firefox desktop only: no orb flicker regression (translate3d GPU promotion still applied in BreathingShape.tsx — unchanged). |
| 8 | any | prefers-reduced-motion ON: visual unchanged AND audio path unchanged (cues still play with stretched decay). |

## Carry-forward status

No new carry-forwards. Existing Phase 5.1 carry-forwards are unaffected:
- iOS audio resume affordance (D-29..D-44) does not consume `phaseDurationSec` — preserved.
- Firefox orb flicker fix (`translate3d` in `BreathingShape.tsx`) — preserved.
- D-08 mute fade-out — operates on the envelope GainNode independent of τ, preserved.
- prefers-reduced-motion orb lock at MID_SCALE — preserved (purely visual setting).

## Deviations from Plan

None. Plan executed exactly as written:
- Task 1: matched border-width (1.5px) + matched alpha (0.6); no bias-thicker variant applied (left as plan's escape hatch for UAT decision).
- Task 2: Direction A as chosen; `PERCEPTUAL_DECAY_DIVISOR = 3`, `MAX_TAU = 6` as specified; back-compat preserved (undefined `phaseDurationSec` → byte-identical synthesis).
- TDD cycle followed for Task 2 — RED commit precedes GREEN commit. No REFACTOR commit needed (implementation already minimal).

## Commits

| # | Hash | Type | Description |
|---|------|------|-------------|
| 1 | `b267cac` | fix | Equalize inner reference ring with outer (Bug 1) — `src/styles/theme.css` |
| 2 | `cd5f6cd` | test | Add failing tests for phase-duration-scaled bowl decay (Bug 2 RED) — `src/audio/{cueSynth,audioEngine}.test.ts` |
| 3 | `999eb8a` | fix | Scale bowl-cue decay with phase duration (Bug 2 GREEN) — `src/audio/{cueSynth,audioEngine}.ts`, `src/hooks/useAudioCues.ts`, `src/app/App.tsx` |

## Self-Check: PASSED

- FOUND: src/styles/theme.css (modified)
- FOUND: src/audio/cueSynth.ts (modified)
- FOUND: src/audio/audioEngine.ts (modified)
- FOUND: src/hooks/useAudioCues.ts (modified)
- FOUND: src/app/App.tsx (modified)
- FOUND: src/audio/cueSynth.test.ts (modified)
- FOUND: src/audio/audioEngine.test.ts (modified)
- FOUND: commit `b267cac` in git log
- FOUND: commit `cd5f6cd` in git log
- FOUND: commit `999eb8a` in git log
- `npx vitest run`: 316/316 passing (baseline 312 + 4 new)
- `npx tsc --noEmit`: clean (exit 0)
