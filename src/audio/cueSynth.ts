// Pure Web Audio synthesis builders. Zero React imports.
//
// Bowl preset DSP recipes live in src/audio/timbres.ts (TIMBRE_PRESETS.bowl).
// cueSynth dispatches per-timbre via scheduleInCueForTimbre / scheduleOutCueForTimbre,
// which look up TIMBRE_PRESETS[timbre] and call the parameterized scheduleBowlCue.
//
// All audio is generated entirely via Web Audio API — no bundled or external assets.

import { TIMBRE_PRESETS, type TimbrePreset } from './timbres'
import type { TimbreId } from '../domain/settings'
import { CLEANUP_PADDING_SEC, NEAR_SILENCE, STRIKE_RAMP_OFFSET } from './audioConstants'

const TAIL_MULTIPLIER = 5 // stop oscillators after ~5*timeConstant
const TAIL_PADDING_SEC = 0.1 // tiny extra to avoid asymptote clip

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
// These constants stay module-level and are SHARED across all four timbres.
// Per-timbre threshold auto-derives from preset.decayTauIn/Out × PERCEPTUAL_SILENCE_TAU_MULT.
const PERCEPTUAL_SILENCE_TAU_MULT = 3 // 3×τ ≈ -26 dB ≈ perceptual silence
const SUSTAIN_FLOOR_RATIO = 0.15 // ≈ -16 dB below peak — quiet but clearly audible
const PHASE_END_FADE_OUT_TAU = 0.05 // setTargetAtTime τ for the boundary fade (≈ 150 ms perceptual)
const PHASE_END_FADE_OUT_LEAD_SEC = 0.2 // start fade this many seconds before phase end

export interface CueHandle {
  envelope: GainNode // exposed for mute fade-out
  scheduledAt: number // audioCtx.currentTime at strike
  cleanupAt: number // when nodes can be GC'd (start + 5*timeConstant + tail)
  /** Stop oscillators + disconnect all nodes in the cue chain. Idempotent — safe
   *  to call multiple times; every disconnect is wrapped in try/catch. */
  cancel(this: void): void
}

function scheduleBowlCue(
  audioCtx: AudioContext,
  when: number,
  destination: AudioNode,
  preset: TimbrePreset,
  kind: 'in' | 'out',
  phaseDurationSec?: number,
): CueHandle {
  // Per-call resolution of fundamental + decay from the preset based on kind.
  // All other DSP parameters (partials, filter, peak gain, oscillator type)
  // read directly from `preset` below.
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

  // Master envelope GainNode — optional soft-attack mode.
  // When preset.attackSec > 0 (Flute): linear ramp 0 → peakGain over attackSec,
  // then exp decay starting from the ramp end (when + attackSec).
  // When preset.attackSec is 0 (Bowl/Bell/Sine): instant strike-and-decay.
  // Strike is the default.
  const envelope = audioCtx.createGain()
  const decayTarget = needsSustain ? preset.peakGain * SUSTAIN_FLOOR_RATIO : NEAR_SILENCE
  if (preset.attackSec > 0) {
    // Soft-attack path: breath onset ramp, then exponential decay from ramp end.
    const attackEnd = when + preset.attackSec
    envelope.gain.setValueAtTime(NEAR_SILENCE, when)
    envelope.gain.linearRampToValueAtTime(preset.peakGain, attackEnd)
    envelope.gain.setTargetAtTime(decayTarget, attackEnd, defaultDecayTau)
  } else {
    // Strike path (default): instant jump to peakGain, then exp decay.
    envelope.gain.setValueAtTime(preset.peakGain, when)
    envelope.gain.setTargetAtTime(decayTarget, when + STRIKE_RAMP_OFFSET, defaultDecayTau)
  }

  let stopAt: number
  let cleanupAt: number
  if (needsSustain) {
    // Hard fade-out in the last lead window so the floor does not bleed into
    // the next phase's strike.
    // phaseDurationSec is always defined when needsSustain is true (outer condition above).
    const phaseEnd = when + phaseDurationSec
    const fadeStart = phaseEnd - PHASE_END_FADE_OUT_LEAD_SEC
    envelope.gain.setTargetAtTime(NEAR_SILENCE, fadeStart, PHASE_END_FADE_OUT_TAU)
    stopAt = phaseEnd + TAIL_PADDING_SEC
    cleanupAt = phaseEnd + CLEANUP_PADDING_SEC
  } else {
    stopAt = when + defaultDecayTau * TAIL_MULTIPLIER + TAIL_PADDING_SEC
    cleanupAt = when + defaultDecayTau * TAIL_MULTIPLIER + CLEANUP_PADDING_SEC
  }

  filter.connect(envelope)
  envelope.connect(destination)

  // AUDIO-04: explicit disconnect on osc.onended. { once: true } makes the listener self-removing.
  // Pre-condition: osc.stop(stopAt) with stopAt > when — ensures 'ended' fires.
  // If a future change makes stopAt < when, ended may not fire and the chain leaks.
  //
  // Build + wire each partial in a single loop so osc and partialGain stay as
  // local references for the 'ended' listener — avoids parallel-array indexing
  // and the noUncheckedIndexedAccess guard that came with it.
  //
  // Collect all oscillator nodes so the cancel() closure can stop + disconnect them.
  // The partial gain nodes pair 1-to-1 with each oscillator.
  const oscList: OscillatorNode[] = []
  const partialGainList: GainNode[] = []
  let lastOsc: OscillatorNode | null = null
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

    osc.addEventListener('ended', () => {
      try { osc.disconnect() } catch { /* silent — some browsers throw InvalidAccessError on already-disconnected nodes */ }
      try { partialGain.disconnect() } catch { /* silent */ }
    }, { once: true })

    oscList.push(osc)
    partialGainList.push(partialGain)
    lastOsc = osc
  }
  // Disconnect shared filter + envelope after the last partial ends (all partials share stopAt,
  // so any single 'ended' event is safe for shared-chain cleanup — RESEARCH Assumption A3).
  if (lastOsc !== null) {
    lastOsc.addEventListener('ended', () => {
      try { filter.disconnect() } catch { /* silent */ }
      try { envelope.disconnect() } catch { /* silent */ }
    }, { once: true })
  }

  // cancel() — stop oscillators + disconnect all chain nodes.
  // cancelScheduledValues discards pending automation so no further gain ramps
  // fire post-cancel. Every stop() + disconnect() is wrapped in try/catch — the
  // 'ended' listener and cancel() may both fire on the same cue; both must be
  // safe (idempotent).
  const cancel = (): void => {
    envelope.gain.cancelScheduledValues(audioCtx.currentTime)
    for (const osc of oscList) {
      try { osc.stop(audioCtx.currentTime) } catch { /* silent — osc may already be stopped */ }
      try { osc.disconnect() } catch { /* silent — node may already be disconnected */ }
    }
    for (const pg of partialGainList) {
      try { pg.disconnect() } catch { /* silent — node may already be disconnected */ }
    }
    try { filter.disconnect() } catch { /* silent — node may already be disconnected */ }
    try { envelope.disconnect() } catch { /* silent — node may already be disconnected */ }
  }

  return {
    envelope,
    scheduledAt: when,
    cleanupAt,
    cancel,
  }
}

// Per-timbre dispatch surface. These functions look up the preset from
// TIMBRE_PRESETS and forward to the parameterized scheduleBowlCue.
// Callers in audioEngine pass the session-captured TimbreId.

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

