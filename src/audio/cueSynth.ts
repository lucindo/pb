// Pure Web Audio synthesis builders. Zero React imports.
// Mirrors the pure-builder + lookup-table pattern of src/domain/breathingPlan.ts.
//
// In cue:  A4 = 440 Hz, decayTimeConstant 1.4 s, ~7 s tail (strike-and-decay)
// Out cue: A3 = 220 Hz, decayTimeConstant 1.8 s, ~9 s tail
// Tick:    1200 Hz square wave, ~80 ms (perceptually distinct from bowl cues per D-15)
// Source: 03-RESEARCH.md Pattern 2 lines 271-340.
//
// All audio is generated entirely via Web Audio API — no bundled or external assets (D-04).

const IN_FUNDAMENTAL_HZ = 440 // A4
const OUT_FUNDAMENTAL_HZ = 220 // A3
const PEAK_GAIN = 0.18 // master peak, well below 1.0 for headroom

const PARTIALS: ReadonlyArray<{ ratio: number; gain: number }> = [
  { ratio: 1.0, gain: 1.0 },
  { ratio: 2.76, gain: 0.4 },
  { ratio: 5.4, gain: 0.15 },
]

const IN_DECAY_TIME_CONSTANT = 1.4
const OUT_DECAY_TIME_CONSTANT = 1.8
const FILTER_FREQ_HZ = 3000
const FILTER_Q = 0.5
const STRIKE_RAMP_OFFSET = 0.005 // when + 0.005 — instant attack with a tiny ramp lead
const TAIL_MULTIPLIER = 5 // stop oscillators after ~5*timeConstant
const TAIL_PADDING_SEC = 0.1 // tiny extra to avoid asymptote clip
const CLEANUP_PADDING_SEC = 0.2 // extra wallclock margin before nodes are GC-able

// Tick (lead-in): perceptually distinct from bowl cues per D-15.
// Square wave through a low-pass filter, very short envelope.
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
  fundamentalHz: number,
  decayTimeConstant: number,
): CueHandle {
  // Low-pass filter — softens the partial stack and removes hiss.
  const filter = audioCtx.createBiquadFilter()
  filter.type = 'lowpass'
  filter.frequency.value = FILTER_FREQ_HZ
  filter.Q.value = FILTER_Q

  // Master envelope GainNode — strike-and-decay (D-01).
  const envelope = audioCtx.createGain()
  envelope.gain.setValueAtTime(PEAK_GAIN, when)
  envelope.gain.setTargetAtTime(0.0001, when + STRIKE_RAMP_OFFSET, decayTimeConstant)

  const stopAt = when + decayTimeConstant * TAIL_MULTIPLIER + TAIL_PADDING_SEC

  for (const partial of PARTIALS) {
    const osc = audioCtx.createOscillator()
    osc.type = 'sine'
    osc.frequency.value = fundamentalHz * partial.ratio

    const partialGain = audioCtx.createGain()
    partialGain.gain.value = partial.gain

    osc.connect(partialGain)
    partialGain.connect(filter)

    osc.start(when)
    osc.stop(stopAt)
  }

  filter.connect(envelope)
  envelope.connect(destination)

  return {
    envelope,
    scheduledAt: when,
    cleanupAt: when + decayTimeConstant * TAIL_MULTIPLIER + CLEANUP_PADDING_SEC,
  }
}

export function scheduleInCue(
  audioCtx: AudioContext,
  when: number,
  destination: AudioNode,
): CueHandle {
  return scheduleBowlCue(
    audioCtx,
    when,
    destination,
    IN_FUNDAMENTAL_HZ,
    IN_DECAY_TIME_CONSTANT,
  )
}

export function scheduleOutCue(
  audioCtx: AudioContext,
  when: number,
  destination: AudioNode,
): CueHandle {
  return scheduleBowlCue(
    audioCtx,
    when,
    destination,
    OUT_FUNDAMENTAL_HZ,
    OUT_DECAY_TIME_CONSTANT,
  )
}

export function scheduleTick(
  audioCtx: AudioContext,
  when: number,
  destination: AudioNode,
): CueHandle {
  // Single square-wave oscillator — perceptually distinct from sine-stack bowl cues (D-15).
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
