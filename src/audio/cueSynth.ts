// Pure Web Audio synthesis builders. Zero React imports.
// Mirrors the pure-builder + lookup-table pattern of src/domain/breathingPlan.ts.
//
// Phase 18 D-02: Bowl preset DSP recipes now live in src/audio/timbres.ts
// (TIMBRE_PRESETS.bowl). cueSynth dispatches per-timbre via
// scheduleInCueForTimbre / scheduleOutCueForTimbre, which look up
// TIMBRE_PRESETS[timbre] and call the parameterized scheduleBowlCue. The
// existing scheduleInCue / scheduleOutCue exports are preserved as Bowl-only
// thin wrappers (D-01 option (a) — TIMBRE-02 signature-stability proof).
//
// Tick:   1200 Hz square wave, ~80 ms (perceptually distinct from bowl cues per D-15 / D-07
//         fixed across all timbres — scheduleTick body is byte-identical to v1.0.1).
// Source: 03-RESEARCH.md Pattern 2 lines 271-340.
//
// All audio is generated entirely via Web Audio API — no bundled or external assets (D-04 / D-14).

import { TIMBRE_PRESETS, type TimbrePreset } from './timbres'
import type { TimbreId } from '../domain/settings'

const STRIKE_RAMP_OFFSET = 0.005 // when + 0.005 — instant attack with a tiny ramp lead
const TAIL_MULTIPLIER = 5 // stop oscillators after ~5*timeConstant
const TAIL_PADDING_SEC = 0.1 // tiny extra to avoid asymptote clip
const CLEANUP_PADDING_SEC = 0.2 // extra wallclock margin before nodes are GC-able

// 260510-tc9 Bug 2 — sustain-to-floor envelope for long phases.
//
// Problem: setTargetAtTime is exponential decay toward 0 (audible ~3×τ). With
// τ = 1.4/1.8 s the bowl cue is perceptually silent after ~4–5 s. At BPM ≤ 3.5
// each phase is ≥ 5 s, so a sound-only follower hears silence before the next
// phase boundary — the cue stops being a hands-off arrival marker.
//
// First-iteration fix stretched τ to match phase length; UAT showed it changed
// the perceived character of the strike (early-body felt "stronger / getting
// louder") AND still went silent at BPM=1 because exponential decay to 0 has
// no audible floor at long phase durations.
//
// Final fix: keep the ORIGINAL τ (preserves the strike onset character) but
// decay toward a non-zero floor when the phase is long enough that natural
// decay would die before the flip. A short, hard fade-out runs in the last
// PHASE_END_FADE_OUT_LEAD_SEC of the phase so the floor doesn't bleed into
// the next strike.
//
// When phase ≤ PERCEPTUAL_SILENCE_TAU_MULT × defaultDecayTau (perceptual
// silence already lands within the phase — high-BPM regime), behavior is
// byte-identical to the pre-Bug-2 implementation: target 0.0001, oscillators
// run for τ × TAIL_MULTIPLIER.
//
// Phase 18 D-12: these constants stay module-level and are SHARED across all
// four timbres. Per-timbre threshold auto-derives from
// preset.decayTauIn/Out × PERCEPTUAL_SILENCE_TAU_MULT.
const PERCEPTUAL_SILENCE_TAU_MULT = 3 // 3×τ ≈ -26 dB ≈ perceptual silence
const SUSTAIN_FLOOR_RATIO = 0.15 // ≈ -16 dB below peak — quiet but clearly audible
const PHASE_END_FADE_OUT_TAU = 0.05 // setTargetAtTime τ for the boundary fade (≈ 150 ms perceptual)
const PHASE_END_FADE_OUT_LEAD_SEC = 0.2 // start fade this many seconds before phase end
const NEAR_SILENCE = 0.0001 // setTargetAtTime can't ramp to true zero

// Tick (lead-in): perceptually distinct from bowl cues per D-15.
// Square wave through a low-pass filter, very short envelope.
// Phase 18 D-07: the tick is FIXED across all timbres — the countdown role
// (perceptually distinct from any phase cue) is preserved verbatim from v1.0.1.
const TICK_FUNDAMENTAL_HZ = 1200
const TICK_FILTER_FREQ_HZ = 2400
const TICK_FILTER_Q = 1.5
const TICK_DECAY_TIME_CONSTANT = 0.04
const TICK_TOTAL_DURATION_SEC = 0.08
const TICK_PEAK_GAIN = 0.12 // slightly softer than bowl cues
const TICK_CLEANUP_PADDING_SEC = 0.05

export interface CueHandle {
  envelope: GainNode // exposed for D-08 mute fade-out
  scheduledAt: number // audioCtx.currentTime at strike
  cleanupAt: number // when nodes can be GC'd (start + 5*timeConstant + tail)
}

function scheduleBowlCue(
  audioCtx: AudioContext,
  when: number,
  destination: AudioNode,
  preset: TimbrePreset,
  kind: 'in' | 'out',
  phaseDurationSec?: number,
): CueHandle {
  // Phase 18 D-01: per-call resolution of fundamental + decay from the preset
  // based on kind. All other DSP parameters (partials, filter, peak gain,
  // oscillator type) read directly from `preset` below.
  const fundamentalHz = kind === 'in' ? preset.fundamentalHzIn : preset.fundamentalHzOut
  const defaultDecayTau = kind === 'in' ? preset.decayTauIn : preset.decayTauOut

  // 260510-tc9 Bug 2: when the phase outlasts natural perceptual silence, decay
  // toward a non-zero sustain floor (audible until the flip) and fade that
  // floor out in the last PHASE_END_FADE_OUT_LEAD_SEC of the phase. Onset
  // character (preset.peakGain, defaultDecayTau) is preserved either way.
  const naturalSilenceAt = defaultDecayTau * PERCEPTUAL_SILENCE_TAU_MULT
  const needsSustain =
    phaseDurationSec !== undefined && phaseDurationSec > naturalSilenceAt

  // Low-pass filter — softens the partial stack and removes hiss.
  const filter = audioCtx.createBiquadFilter()
  filter.type = 'lowpass'
  filter.frequency.value = preset.filterFreqHz
  filter.Q.value = preset.filterQ

  // Master envelope GainNode — strike-and-decay (D-01).
  const envelope = audioCtx.createGain()
  envelope.gain.setValueAtTime(preset.peakGain, when)
  const decayTarget = needsSustain ? preset.peakGain * SUSTAIN_FLOOR_RATIO : NEAR_SILENCE
  envelope.gain.setTargetAtTime(decayTarget, when + STRIKE_RAMP_OFFSET, defaultDecayTau)

  let stopAt: number
  let cleanupAt: number
  if (needsSustain) {
    // Hard fade-out in the last lead window so the floor does not bleed into
    // the next phase's strike.
    // phaseDurationSec is always defined when needsSustain is true per the outer condition at line 88.
    const phaseEnd = when + phaseDurationSec
    const fadeStart = phaseEnd - PHASE_END_FADE_OUT_LEAD_SEC
    envelope.gain.setTargetAtTime(NEAR_SILENCE, fadeStart, PHASE_END_FADE_OUT_TAU)
    stopAt = phaseEnd + TAIL_PADDING_SEC
    cleanupAt = phaseEnd + CLEANUP_PADDING_SEC
  } else {
    stopAt = when + defaultDecayTau * TAIL_MULTIPLIER + TAIL_PADDING_SEC
    cleanupAt = when + defaultDecayTau * TAIL_MULTIPLIER + CLEANUP_PADDING_SEC
  }

  const oscillators: OscillatorNode[] = []
  const partialGains: GainNode[] = []

  for (const partial of preset.partials) {
    const osc = audioCtx.createOscillator()
    osc.type = preset.oscillatorType
    osc.frequency.value = fundamentalHz * partial.ratio

    const partialGain = audioCtx.createGain()
    partialGain.gain.value = partial.gain

    osc.connect(partialGain)
    partialGain.connect(filter)

    osc.start(when)
    osc.stop(stopAt)

    oscillators.push(osc)
    partialGains.push(partialGain)
  }

  filter.connect(envelope)
  envelope.connect(destination)

  // AUDIO-04: explicit disconnect on osc.onended. { once: true } makes the listener self-removing.
  // Pre-condition: osc.stop(stopAt) with stopAt > when — ensures 'ended' fires.
  // If a future change makes stopAt < when, ended may not fire and the chain leaks.
  for (let i = 0; i < oscillators.length; i++) {
    const osc = oscillators[i]
    const partialGain = partialGains[i]
    // Reason: AUDIO-04 per-partial index invariant — oscillators and partialGains are parallel arrays
    // of equal length, both populated in the same loop above (same iteration count, same push order).
    if (osc === undefined || partialGain === undefined) continue
    osc.addEventListener('ended', () => {
      try { osc.disconnect() } catch { /* silent — some browsers throw InvalidAccessError on already-disconnected nodes */ }
      try { partialGain.disconnect() } catch { /* silent */ }
    }, { once: true })
  }
  // Disconnect shared filter + envelope after the last partial ends (all partials share stopAt,
  // so any single 'ended' event is safe for shared-chain cleanup — RESEARCH Assumption A3).
  const lastOsc = oscillators[oscillators.length - 1]
  if (lastOsc !== undefined) {
    lastOsc.addEventListener('ended', () => {
      try { filter.disconnect() } catch { /* silent */ }
      try { envelope.disconnect() } catch { /* silent */ }
    }, { once: true })
  }

  return {
    envelope,
    scheduledAt: when,
    cleanupAt,
  }
}

// Phase 18 D-01: new per-timbre dispatch surface. These functions look up the
// preset from TIMBRE_PRESETS and forward to the parameterized scheduleBowlCue.
// Callers in audioEngine (Plan 03) pass the session-captured TimbreId.

export function scheduleInCueForTimbre(
  audioCtx: AudioContext,
  when: number,
  destination: AudioNode,
  timbre: TimbreId,
  phaseDurationSec?: number,
): CueHandle {
  const preset = TIMBRE_PRESETS[timbre]
  return scheduleBowlCue(audioCtx, when, destination, preset, 'in', phaseDurationSec)
}

export function scheduleOutCueForTimbre(
  audioCtx: AudioContext,
  when: number,
  destination: AudioNode,
  timbre: TimbreId,
  phaseDurationSec?: number,
): CueHandle {
  const preset = TIMBRE_PRESETS[timbre]
  return scheduleBowlCue(audioCtx, when, destination, preset, 'out', phaseDurationSec)
}

// Phase 18 D-01 option (a): Bowl-only thin wrappers preserved for TIMBRE-02
// signature stability. Existing v1.0.1 callers that haven't yet migrated to
// the per-timbre dispatch continue to work — the body delegates to the new
// dispatch with the locked 'bowl' TimbreId, so the audio path is byte-identical.

export function scheduleInCue(
  audioCtx: AudioContext,
  when: number,
  destination: AudioNode,
  phaseDurationSec?: number,
): CueHandle {
  return scheduleInCueForTimbre(audioCtx, when, destination, 'bowl', phaseDurationSec)
}

export function scheduleOutCue(
  audioCtx: AudioContext,
  when: number,
  destination: AudioNode,
  phaseDurationSec?: number,
): CueHandle {
  return scheduleOutCueForTimbre(audioCtx, when, destination, 'bowl', phaseDurationSec)
}

export function scheduleTick(
  audioCtx: AudioContext,
  when: number,
  destination: AudioNode,
): CueHandle {
  // Single square-wave oscillator — perceptually distinct from sine-stack bowl cues (D-15).
  // Phase 18 D-07: body is byte-identical to v1.0.1 — tick stays fixed across all timbres.
  const osc = audioCtx.createOscillator()
  osc.type = 'square'
  osc.frequency.value = TICK_FUNDAMENTAL_HZ

  const filter = audioCtx.createBiquadFilter()
  filter.type = 'lowpass'
  filter.frequency.value = TICK_FILTER_FREQ_HZ
  filter.Q.value = TICK_FILTER_Q

  const envelope = audioCtx.createGain()
  envelope.gain.setValueAtTime(TICK_PEAK_GAIN, when)
  envelope.gain.setTargetAtTime(0.0001, when + 0.001, TICK_DECAY_TIME_CONSTANT)

  osc.connect(filter)
  filter.connect(envelope)
  envelope.connect(destination)

  osc.start(when)
  osc.stop(when + TICK_TOTAL_DURATION_SEC)

  return {
    envelope,
    scheduledAt: when,
    cleanupAt: when + TICK_TOTAL_DURATION_SEC + TICK_CLEANUP_PADDING_SEC,
  }
}
