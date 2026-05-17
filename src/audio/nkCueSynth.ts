// Pure Web Audio synthesis builders for Navi Kriya cues. Zero React imports.
//
// NK-05 + D-05: All four cue functions read TIMBRE_PRESETS[timbre] and route
// through the user's chosen timbre (Bowl / Bell / Sine / Chime).
//
// D-06: Front marker = rising two-tone gesture (fundamentalHzOut → fundamentalHzIn).
//       Back marker = falling two-tone gesture (fundamentalHzIn → fundamentalHzOut).
// D-07: Per-OM tick = soft, short, barely-there tone (quiet + short duration).
// D-08: End chord = resolved low three-note chord that rings out.
//
// T-31-04: Every node disconnects on its 'ended' event ({ once: true }) — no leaked
//   nodes over a long session (375+ ticks). Same discipline as cueSynth.ts AUDIO-04.

import { TIMBRE_PRESETS, type TimbrePreset } from './timbres'
import type { TimbreId } from '../domain/settings'
import type { CueHandle } from './cueSynth'

// --- Timing constants ---

const STRIKE_RAMP_OFFSET = 0.005 // when + 0.005 — instant attack with tiny ramp lead
const CLEANUP_PADDING_SEC = 0.2 // extra wallclock margin before nodes are GC-able
const NEAR_SILENCE = 0.0001 // setTargetAtTime cannot ramp to true zero

// --- NK-specific cue constants ---

// D-06 two-tone markers: tone 1 at when, tone 2 at when + TWO_TONE_GAP_SEC
const TWO_TONE_GAP_SEC = 0.30
// Duration of each tone in the two-tone gesture
const MARKER_TONE_DURATION_SEC = 0.42
// D-07 per-OM tick: soft and short
const NK_TICK_DURATION_SEC = 0.12
const NK_TICK_PEAK_GAIN = 0.08 // quiet — peripheral hearing only
const NK_TICK_DECAY_TAU = 0.05
// Countdown beep: the 3-2-1 lead-in tick, shared by the HRV and Navi
// countdowns. Identical in sound to the per-OM tick today, but kept on its
// own constants + function so the countdown beep and the OM tick can be
// explored independently — they are not semantically related.
const COUNTDOWN_TICK_DURATION_SEC = 0.12
const COUNTDOWN_TICK_PEAK_GAIN = 0.08
const COUNTDOWN_TICK_DECAY_TAU = 0.05
// D-08 end chord: three tones forming a resolved low chord, rings out. This is
// the shared practice-ending sound — both the Navi Kriya completion and the
// HRV session completion play scheduleEndChord, so a future change lands in
// both practices at once.
const END_CHORD_DURATION_SEC = 1.8
const END_CHORD_PEAK_GAIN = 0.12
const END_CHORD_DECAY_TAU = 0.8
// Low chord pitch ratios relative to preset fundamentalHzOut (the lower pitch):
//   root (×1.0), major third (×1.25), perfect fifth (×1.5) — C major chord shape
const END_CHORD_RATIOS = [1.0, 1.25, 1.5] as const

// ---

/**
 * Private helper: build a single oscillator → partialGain → filter → envelope chain.
 * Schedules the tone at `when` for `durationSec`, connects to `destination`, and
 * returns the constructed nodes for the caller to attach cleanup listeners.
 * Caller is responsible for registering 'ended' listeners (T-31-04).
 */
function buildNKToneNodes(
  audioCtx: AudioContext,
  freqHz: number,
  durationSec: number,
  when: number,
  destination: AudioNode,
  preset: TimbrePreset,
  peakGain: number,
  decayTau: number,
): { osc: OscillatorNode; partialGain: GainNode; filter: BiquadFilterNode; envelope: GainNode; stopAt: number; cleanupAt: number } {
  const filter = audioCtx.createBiquadFilter()
  filter.type = 'lowpass'
  filter.frequency.value = preset.filterFreqHz
  filter.Q.value = preset.filterQ

  const envelope = audioCtx.createGain()
  envelope.gain.setValueAtTime(peakGain, when)
  envelope.gain.setTargetAtTime(NEAR_SILENCE, when + STRIKE_RAMP_OFFSET, decayTau)

  const stopAt = when + durationSec
  const cleanupAt = when + durationSec + CLEANUP_PADDING_SEC

  const osc = audioCtx.createOscillator()
  osc.type = preset.oscillatorType
  osc.frequency.value = freqHz

  // partialGain: unity — NK tones are single-partial; peakGain drives loudness
  const partialGain = audioCtx.createGain()
  partialGain.gain.value = 1.0

  osc.connect(partialGain)
  partialGain.connect(filter)
  filter.connect(envelope)
  envelope.connect(destination)

  osc.start(when)
  osc.stop(stopAt)

  return { osc, partialGain, filter, envelope, stopAt, cleanupAt }
}

// --- Exported NK cue builders ---

/**
 * D-06: Rising two-tone gesture — tone 1 on lower pitch (fundamentalHzOut) at `when`,
 * tone 2 on higher pitch (fundamentalHzIn) at `when + TWO_TONE_GAP_SEC`.
 * Returns CueHandle with scheduledAt = when (gesture start) and cleanupAt from tone 2.
 */
export function scheduleNKFrontMarker(
  audioCtx: AudioContext,
  when: number,
  destination: AudioNode,
  timbre: TimbreId,
): CueHandle {
  const preset = TIMBRE_PRESETS[timbre]
  // Tone 1: lower pitch (rising from fundamentalHzOut)
  const t1 = buildNKToneNodes(
    audioCtx, preset.fundamentalHzOut, MARKER_TONE_DURATION_SEC, when,
    destination, preset, preset.peakGain, preset.decayTauOut,
  )
  // T-31-04: disconnect tone 1 nodes on 'ended'
  t1.osc.addEventListener('ended', () => {
    try { t1.osc.disconnect() } catch { /* silent */ }
    try { t1.partialGain.disconnect() } catch { /* silent */ }
    try { t1.filter.disconnect() } catch { /* silent */ }
    try { t1.envelope.disconnect() } catch { /* silent */ }
  }, { once: true })

  // Tone 2: higher pitch (landing on fundamentalHzIn) — longest-lived
  const t2 = buildNKToneNodes(
    audioCtx, preset.fundamentalHzIn, MARKER_TONE_DURATION_SEC, when + TWO_TONE_GAP_SEC,
    destination, preset, preset.peakGain, preset.decayTauIn,
  )
  // T-31-04: disconnect tone 2 nodes on 'ended'
  t2.osc.addEventListener('ended', () => {
    try { t2.osc.disconnect() } catch { /* silent */ }
    try { t2.partialGain.disconnect() } catch { /* silent */ }
    try { t2.filter.disconnect() } catch { /* silent */ }
    try { t2.envelope.disconnect() } catch { /* silent */ }
  }, { once: true })

  // scheduledAt anchors to gesture start (when), cleanupAt from longer-lived tone 2
  return { envelope: t2.envelope, scheduledAt: when, cleanupAt: t2.cleanupAt }
}

/**
 * D-06: Falling two-tone gesture — tone 1 on higher pitch (fundamentalHzIn) at `when`,
 * tone 2 on lower pitch (fundamentalHzOut) at `when + TWO_TONE_GAP_SEC`.
 * Returns CueHandle with scheduledAt = when (gesture start) and cleanupAt from tone 2.
 */
export function scheduleNKBackMarker(
  audioCtx: AudioContext,
  when: number,
  destination: AudioNode,
  timbre: TimbreId,
): CueHandle {
  const preset = TIMBRE_PRESETS[timbre]
  // Tone 1: higher pitch (falling from fundamentalHzIn)
  const t1 = buildNKToneNodes(
    audioCtx, preset.fundamentalHzIn, MARKER_TONE_DURATION_SEC, when,
    destination, preset, preset.peakGain, preset.decayTauIn,
  )
  // T-31-04: disconnect tone 1 nodes on 'ended'
  t1.osc.addEventListener('ended', () => {
    try { t1.osc.disconnect() } catch { /* silent */ }
    try { t1.partialGain.disconnect() } catch { /* silent */ }
    try { t1.filter.disconnect() } catch { /* silent */ }
    try { t1.envelope.disconnect() } catch { /* silent */ }
  }, { once: true })

  // Tone 2: lower pitch (landing on fundamentalHzOut) — longest-lived
  const t2 = buildNKToneNodes(
    audioCtx, preset.fundamentalHzOut, MARKER_TONE_DURATION_SEC, when + TWO_TONE_GAP_SEC,
    destination, preset, preset.peakGain, preset.decayTauOut,
  )
  // T-31-04: disconnect tone 2 nodes on 'ended'
  t2.osc.addEventListener('ended', () => {
    try { t2.osc.disconnect() } catch { /* silent */ }
    try { t2.partialGain.disconnect() } catch { /* silent */ }
    try { t2.filter.disconnect() } catch { /* silent */ }
    try { t2.envelope.disconnect() } catch { /* silent */ }
  }, { once: true })

  // scheduledAt anchors to gesture start (when), cleanupAt from longer-lived tone 2
  return { envelope: t2.envelope, scheduledAt: when, cleanupAt: t2.cleanupAt }
}

/**
 * D-07: Soft, barely-there short tone — anchors the OM rhythm in peripheral hearing.
 * Short duration (~0.12 s) and low peak gain so it sits quietly under the chant.
 */
export function scheduleNKTick(
  audioCtx: AudioContext,
  when: number,
  destination: AudioNode,
  timbre: TimbreId,
): CueHandle {
  const preset = TIMBRE_PRESETS[timbre]
  const t = buildNKToneNodes(
    audioCtx, preset.fundamentalHzIn, NK_TICK_DURATION_SEC, when,
    destination, preset, NK_TICK_PEAK_GAIN, NK_TICK_DECAY_TAU,
  )
  // T-31-04: disconnect tick nodes on 'ended'
  t.osc.addEventListener('ended', () => {
    try { t.osc.disconnect() } catch { /* silent */ }
    try { t.partialGain.disconnect() } catch { /* silent */ }
    try { t.filter.disconnect() } catch { /* silent */ }
    try { t.envelope.disconnect() } catch { /* silent */ }
  }, { once: true })

  return { envelope: t.envelope, scheduledAt: when, cleanupAt: t.cleanupAt }
}

/**
 * Countdown beep — the 3-2-1 lead-in tick shared by the HRV and Navi
 * countdowns. Currently byte-identical in sound to scheduleNKTick (the per-OM
 * tick), but a SEPARATE function on its own constants: the countdown beep and
 * the per-OM tick are semantically distinct, so either can be changed without
 * affecting the other.
 */
export function scheduleCountdownTick(
  audioCtx: AudioContext,
  when: number,
  destination: AudioNode,
  timbre: TimbreId,
): CueHandle {
  const preset = TIMBRE_PRESETS[timbre]
  const t = buildNKToneNodes(
    audioCtx, preset.fundamentalHzIn, COUNTDOWN_TICK_DURATION_SEC, when,
    destination, preset, COUNTDOWN_TICK_PEAK_GAIN, COUNTDOWN_TICK_DECAY_TAU,
  )
  // Disconnect the tick nodes on 'ended' (mirrors scheduleNKTick / T-31-04).
  t.osc.addEventListener('ended', () => {
    try { t.osc.disconnect() } catch { /* silent */ }
    try { t.partialGain.disconnect() } catch { /* silent */ }
    try { t.filter.disconnect() } catch { /* silent */ }
    try { t.envelope.disconnect() } catch { /* silent */ }
  }, { once: true })

  return { envelope: t.envelope, scheduledAt: when, cleanupAt: t.cleanupAt }
}

/**
 * D-08: Resolved low multi-note chord that rings out — a clear, restful
 * session/practice-ending sound. SHARED: both the Navi Kriya completion and
 * the HRV session completion play this, so the ending sound stays identical
 * across practices and a future change applies to both.
 * Three tones (root, major-third, fifth) based on preset fundamentalHzOut,
 * scheduled simultaneously at `when` with a long decay. Returns the handle of
 * the longest-lived tone.
 */
export function scheduleEndChord(
  audioCtx: AudioContext,
  when: number,
  destination: AudioNode,
  timbre: TimbreId,
): CueHandle {
  const preset = TIMBRE_PRESETS[timbre]
  let lastEnvelope: GainNode | null = null
  let lastCleanupAt = 0

  for (const ratio of END_CHORD_RATIOS) {
    const t = buildNKToneNodes(
      audioCtx, preset.fundamentalHzOut * ratio, END_CHORD_DURATION_SEC, when,
      destination, preset, END_CHORD_PEAK_GAIN, END_CHORD_DECAY_TAU,
    )
    // T-31-04: disconnect each chord tone's nodes on 'ended'
    t.osc.addEventListener('ended', () => {
      try { t.osc.disconnect() } catch { /* silent */ }
      try { t.partialGain.disconnect() } catch { /* silent */ }
      try { t.filter.disconnect() } catch { /* silent */ }
      try { t.envelope.disconnect() } catch { /* silent */ }
    }, { once: true })
    lastEnvelope = t.envelope
    lastCleanupAt = t.cleanupAt
  }

  // END_CHORD_RATIOS is a non-empty const tuple; loop always executes 3 iterations.
  // Reason: END_CHORD_RATIOS always has 3 elements — lastEnvelope is guaranteed non-null.
  // eslint-disable-next-line @typescript-eslint/no-non-null-assertion
  return { envelope: lastEnvelope!, scheduledAt: when, cleanupAt: lastCleanupAt }
}
