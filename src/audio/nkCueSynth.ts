// Pure Web Audio synthesis builders for Navi Kriya cues. Zero React imports.
//
// NK-05 + D-05: All four cue functions read TIMBRE_PRESETS[timbre] and route
// through the user's chosen timbre (Bowl / Bell / Sine / Flute).
//
// D-06 (revised Phase 31 UAT): the Front/Back markers REUSE the HRV breath
//       cues — Front plays the inhale ('in') cue, Back the exhale ('out') cue,
//       through the user's chosen timbre. It is the sound the user already
//       knows from HRV, so the two practices stay congruent. (Earlier
//       iterations — a two-tone gesture, then a pitch glide — both read as
//       gimmicky next to the rest of the app.)
// D-07: Per-OM tick = soft, short, barely-there tone (quiet + short duration).
// D-08: End chord = resolved low three-note chord. Spike 005 ("Warm pad fade")
//       gave it a strike-free pad envelope — fades in, holds, fades out (~5 s).
//
// T-31-04: Every node disconnects on its 'ended' event ({ once: true }) — no leaked
//   nodes over a long session (375+ ticks). Same discipline as cueSynth.ts AUDIO-04.

import { TIMBRE_PRESETS, type TimbrePreset } from './timbres'
import type { TimbreId } from '../domain/settings'
import { scheduleInCueForTimbre, scheduleOutCueForTimbre, type CueHandle } from './cueSynth'

// --- Timing constants ---

const STRIKE_RAMP_OFFSET = 0.005 // when + 0.005 — instant attack with tiny ramp lead
const CLEANUP_PADDING_SEC = 0.2 // extra wallclock margin before nodes are GC-able
const NEAR_SILENCE = 0.0001 // setTargetAtTime cannot ramp to true zero

// --- NK-specific cue constants ---

// D-06 (revised Phase 31): the Front/Back markers reuse the HRV breath cues
// (scheduleInCueForTimbre / scheduleOutCueForTimbre) — no NK-specific marker
// constants needed.
// D-07 per-OM tick: soft and short
const NK_TICK_DURATION_SEC = 0.12
const NK_TICK_PEAK_GAIN = 0.13 // J16: bumped from 0.08 — still peripheral, slightly more audible per operator UAT
const NK_TICK_DECAY_TAU = 0.05
// Countdown beep: the 3-2-1 lead-in tick, shared by the HRV and Navi
// countdowns. Spike 004 ("Crisp ping" — operator audition) retuned this from
// the original soft 440 Hz / 0.12 s / 0.08 / 0.05 tick to a crisper, higher,
// snappier beep that reads as more alerting without simply being louder. Kept
// on its own constants + function so the countdown beep and the per-OM tick
// stay independent — they are not semantically related.
const COUNTDOWN_TICK_DURATION_SEC = 0.1
const COUNTDOWN_TICK_PEAK_GAIN = 0.12
const COUNTDOWN_TICK_DECAY_TAU = 0.04
// Pitch sits a perfect fifth above the timbre fundamental (preset.fundamentalHzIn
// is 440 Hz across all timbres → 660 Hz). Expressed as a ratio so it tracks any
// future per-timbre fundamental rather than hard-coding 660.
const COUNTDOWN_TICK_PITCH_RATIO = 1.5
// D-08 end chord: three tones forming a resolved low chord. This is the shared
// practice-ending sound — both the Navi Kriya completion and the HRV session
// completion play scheduleEndChord, so a change lands in both practices at once.
//
// Spike 005 ("Warm pad fade" — operator audition) retuned it from the original
// 1.8 s percussive strike to a strike-free pad: fade in over END_CHORD_ATTACK_SEC,
// hold, then a linear fade out over END_CHORD_RELEASE_SEC, ~5 s total. There is
// no exponential decay any more — END_CHORD_DECAY_TAU is retired.
const END_CHORD_DURATION_SEC = 5.0
const END_CHORD_PEAK_GAIN = 0.11
const END_CHORD_ATTACK_SEC = 0.9 // gain ramps 0 → peak over this (the fade-in)
const END_CHORD_RELEASE_SEC = 1.4 // gain ramps peak → 0 over the last of the chord (the fade-out)
// Low chord pitch ratios relative to preset fundamentalHzOut (the lower pitch):
//   root (×1.0), major third (×1.25), perfect fifth (×1.5) — C major chord shape
const END_CHORD_RATIOS = [1.0, 1.25, 1.5] as const

// Total ring-out span of the end chord, from strike to GC-able: the chord
// duration plus the node-cleanup padding (it equals `cleanupAt - scheduledAt`
// of the handle scheduleEndChord returns). Exported so a caller that owns its
// own AudioContext — the Navi Kriya path in App.tsx — can defer teardown until
// the chord finishes, instead of hard-coding a duration that silently drifts
// when the chord is retuned. The HRV path reads cue.cleanupAt off the engine
// and needs no constant.
export const END_CHORD_RINGOUT_SEC = END_CHORD_DURATION_SEC + CLEANUP_PADDING_SEC

// ---

/**
 * Pad envelope spec — passed to buildNKToneNodes in place of a decay τ to get
 * a strike-free fade-in / hold / fade-out shape instead of a percussive strike.
 * Used by the Spike 005 "Warm pad fade" end chord.
 */
interface PadEnvelope {
  attackSec: number // gain ramps 0 → peak over this, starting at `when`
  releaseSec: number // gain ramps peak → 0 over the last releaseSec of the tone
}

/**
 * Private helper: build a single oscillator → partialGain → filter → envelope chain.
 * Schedules the tone at `when` for `durationSec`, connects to `destination`, and
 * returns the constructed nodes for the caller to attach cleanup listeners.
 * Caller is responsible for registering 'ended' listeners (T-31-04).
 *
 * `envelopeSpec` selects the gain shape:
 *   - a `number` → strike: instant attack to peak, exponential decay (τ = the number).
 *   - a `PadEnvelope` → pad: linear fade in, hold, linear fade out. No strike.
 * Strike is the original behaviour — the tick/countdown callers pass a number and
 * are byte-identical to before this overload existed.
 */
function buildNKToneNodes(
  audioCtx: AudioContext,
  freqHz: number,
  durationSec: number,
  when: number,
  destination: AudioNode,
  preset: TimbrePreset,
  peakGain: number,
  envelopeSpec: number | PadEnvelope,
): { osc: OscillatorNode; partialGain: GainNode; filter: BiquadFilterNode; envelope: GainNode; stopAt: number; cleanupAt: number } {
  const filter = audioCtx.createBiquadFilter()
  filter.type = 'lowpass'
  filter.frequency.value = preset.filterFreqHz
  filter.Q.value = preset.filterQ

  const envelope = audioCtx.createGain()
  if (typeof envelopeSpec === 'number') {
    // Strike: instant attack, exponential decay (verbatim pre-Spike-005 behaviour).
    envelope.gain.setValueAtTime(peakGain, when)
    envelope.gain.setTargetAtTime(NEAR_SILENCE, when + STRIKE_RAMP_OFFSET, envelopeSpec)
  } else {
    // Pad: linear fade in → hold → linear fade out (Spike 005 "Warm pad fade").
    const attackEnd = when + envelopeSpec.attackSec
    // Clamp the fade-out start so it never precedes the fade-in end on a short tone.
    const releaseStart = Math.max(attackEnd, when + durationSec - envelopeSpec.releaseSec)
    envelope.gain.setValueAtTime(NEAR_SILENCE, when)
    envelope.gain.linearRampToValueAtTime(peakGain, attackEnd)
    envelope.gain.setValueAtTime(peakGain, releaseStart)
    envelope.gain.linearRampToValueAtTime(NEAR_SILENCE, when + durationSec)
  }

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
 * D-06: Front marker — the HRV inhale ('in') cue, played through the user's
 * chosen timbre. Reusing the breath cue keeps Navi Kriya congruent with HRV:
 * the same sound the user already reads as the start of an inhale. No
 * phaseDurationSec — the marker is a one-shot struck cue that decays
 * naturally, not a sustained phase cue.
 */
export function scheduleNKFrontMarker(
  audioCtx: AudioContext,
  when: number,
  destination: AudioNode,
  timbre: TimbreId,
): CueHandle {
  return scheduleInCueForTimbre(audioCtx, when, destination, timbre)
}

/**
 * D-06: Back marker — the HRV exhale ('out') cue, played through the user's
 * chosen timbre. The exhale counterpart to scheduleNKFrontMarker; see that
 * function's note on HRV congruence and the one-shot (no phaseDurationSec)
 * decay.
 */
export function scheduleNKBackMarker(
  audioCtx: AudioContext,
  when: number,
  destination: AudioNode,
  timbre: TimbreId,
): CueHandle {
  return scheduleOutCueForTimbre(audioCtx, when, destination, timbre)
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
 * countdowns. Spike 004 retuned it to "Crisp ping": a perfect fifth above the
 * timbre fundamental (~660 Hz), shorter and snappier than the per-OM tick.
 * A SEPARATE function on its own constants — the countdown beep and the per-OM
 * tick are semantically distinct, so either can change without affecting the
 * other.
 */
export function scheduleCountdownTick(
  audioCtx: AudioContext,
  when: number,
  destination: AudioNode,
  timbre: TimbreId,
): CueHandle {
  const preset = TIMBRE_PRESETS[timbre]
  const t = buildNKToneNodes(
    audioCtx, preset.fundamentalHzIn * COUNTDOWN_TICK_PITCH_RATIO, COUNTDOWN_TICK_DURATION_SEC, when,
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
 * D-08: Resolved low multi-note chord — a clear, restful session/practice-ending
 * sound. SHARED: both the Navi Kriya completion and the HRV session completion
 * play this, so the ending sound stays identical across practices and a change
 * applies to both.
 * Three tones (root, major-third, fifth) based on preset fundamentalHzOut,
 * scheduled simultaneously at `when`. Spike 005 ("Warm pad fade") gives it a
 * strike-free pad envelope — fades in, holds, fades out over ~5 s. Returns the
 * handle of the longest-lived tone.
 */
export function scheduleEndChord(
  audioCtx: AudioContext,
  when: number,
  destination: AudioNode,
  timbre: TimbreId,
): CueHandle {
  const preset = TIMBRE_PRESETS[timbre]
  // Route every chord voice through a single master GainNode so the returned
  // CueHandle.envelope controls all three voices. Without this, a mid-chord
  // mute (audioEngine.setMuted(true) → applyMuteFadeOut on cue.envelope) would
  // only fade the last voice's envelope and the other two would ring out at
  // peak through their independent fade-out ramps.
  const masterEnvelope = audioCtx.createGain()
  masterEnvelope.gain.value = 1.0
  masterEnvelope.connect(destination)

  let lastCleanupAt = 0
  let lastOsc: OscillatorNode | null = null

  for (const ratio of END_CHORD_RATIOS) {
    const t = buildNKToneNodes(
      audioCtx, preset.fundamentalHzOut * ratio, END_CHORD_DURATION_SEC, when,
      masterEnvelope, preset, END_CHORD_PEAK_GAIN,
      { attackSec: END_CHORD_ATTACK_SEC, releaseSec: END_CHORD_RELEASE_SEC },
    )
    // T-31-04: disconnect each chord tone's nodes on 'ended'
    t.osc.addEventListener('ended', () => {
      try { t.osc.disconnect() } catch { /* silent */ }
      try { t.partialGain.disconnect() } catch { /* silent */ }
      try { t.filter.disconnect() } catch { /* silent */ }
      try { t.envelope.disconnect() } catch { /* silent */ }
    }, { once: true })
    lastCleanupAt = t.cleanupAt
    lastOsc = t.osc
  }

  // All three voices share the same stopAt (when + END_CHORD_DURATION_SEC), so
  // any voice's 'ended' is safe for tearing down the shared master bus.
  if (lastOsc !== null) {
    lastOsc.addEventListener('ended', () => {
      try { masterEnvelope.disconnect() } catch { /* silent */ }
    }, { once: true })
  }

  return { envelope: masterEnvelope, scheduledAt: when, cleanupAt: lastCleanupAt }
}
