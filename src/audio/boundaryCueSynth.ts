// Pure Web Audio synthesis builders for the non-breath session cues — the 3-2-1
// lead-in countdown tick and the session-end chord. Zero React imports.
//
// Both cue functions read TIMBRE_PRESETS[timbre] and route through the user's
// chosen timbre (Bowl / Bell / Sine / Flute).
//
// End chord = resolved low three-note chord with a strike-free pad envelope —
// fades in, holds, fades out (~5 s).
//
// Every node disconnects on its 'ended' event ({ once: true }) — no leaked
// nodes over a long session. Same discipline as cueSynth.ts.

import { TIMBRE_PRESETS } from './timbres'
import type { TimbreId } from '../domain/settings'
import { buildToneNodes, disconnectToneNodes, type CueHandle, type ToneNodes } from './cueSynth'

// --- Timing constants ---

// Countdown beep: the 3-2-1 lead-in tick. A crisper, higher, snappier beep that
// reads as alerting without being louder.
const COUNTDOWN_TICK_DURATION_SEC = 0.1
const COUNTDOWN_TICK_PEAK_GAIN = 0.12
const COUNTDOWN_TICK_DECAY_TAU = 0.04
// Pitch sits a perfect fifth above the timbre fundamental (preset.fundamentalHzIn
// is 440 Hz across all timbres → 660 Hz). Expressed as a ratio so it tracks any
// future per-timbre fundamental rather than hard-coding 660.
const COUNTDOWN_TICK_PITCH_RATIO = 1.5
// End chord: three tones forming a resolved low chord — the Pattern Breathing session-ending
// sound played by scheduleEndChord.
// Strike-free pad envelope: fade in over END_CHORD_ATTACK_SEC, hold, then a
// linear fade out over END_CHORD_RELEASE_SEC, ~5 s total.
const END_CHORD_DURATION_SEC = 5.0
const END_CHORD_PEAK_GAIN = 0.11
const END_CHORD_ATTACK_SEC = 0.9 // gain ramps 0 → peak over this (the fade-in)
const END_CHORD_RELEASE_SEC = 1.4 // gain ramps peak → 0 over the last of the chord (the fade-out)
// Low chord pitch ratios relative to preset fundamentalHzOut (the lower pitch):
//   root (×1.0), major third (×1.25), perfect fifth (×1.5) — C major chord shape
const END_CHORD_RATIOS = [1.0, 1.25, 1.5] as const

// ---

// --- Exported cue builders ---

/**
 * Countdown beep — the 3-2-1 lead-in tick. A perfect fifth above the timbre
 * fundamental (~660 Hz), short and snappy.
 */
export function scheduleCountdownTick(
  audioCtx: AudioContext,
  when: number,
  destination: AudioNode,
  timbre: TimbreId,
): CueHandle {
  const preset = TIMBRE_PRESETS[timbre]
  const t = buildToneNodes(
    audioCtx, preset.fundamentalHzIn * COUNTDOWN_TICK_PITCH_RATIO, COUNTDOWN_TICK_DURATION_SEC, when,
    destination, preset, COUNTDOWN_TICK_PEAK_GAIN, COUNTDOWN_TICK_DECAY_TAU,
  )
  // Disconnect the tick nodes on 'ended'.
  t.osc.addEventListener('ended', () => { disconnectToneNodes(t) }, { once: true })

  // cancel() — stop oscillator + disconnect chain. Same try/catch posture as the
  // 'ended' listener above. The 'ended' listener and cancel() may both fire;
  // both must be safe (idempotent).
  const cancel = (): void => {
    t.envelope.gain.cancelScheduledValues(audioCtx.currentTime)
    try { t.osc.stop(audioCtx.currentTime) } catch { /* silent — osc may already be stopped */ }
    disconnectToneNodes(t)
  }

  return { envelope: t.envelope, scheduledAt: when, cleanupAt: t.cleanupAt, cancel }
}

/**
 * Resolved low multi-note chord — a clear, restful session-ending sound played
 * at Pattern Breathing completion.
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

  // One entry per chord voice; each carries its full node chain for cancel().
  const voices: ToneNodes[] = []
  for (const ratio of END_CHORD_RATIOS) {
    const t = buildToneNodes(
      audioCtx, preset.fundamentalHzOut * ratio, END_CHORD_DURATION_SEC, when,
      masterEnvelope, preset, END_CHORD_PEAK_GAIN,
      { attackSec: END_CHORD_ATTACK_SEC, releaseSec: END_CHORD_RELEASE_SEC },
    )
    // Disconnect each chord tone's nodes on 'ended'.
    t.osc.addEventListener('ended', () => { disconnectToneNodes(t) }, { once: true })
    voices.push(t)
  }

  // All three voices share the same stopAt (when + END_CHORD_DURATION_SEC), so
  // the last voice's 'ended' is safe for tearing down the shared master bus.
  const lastVoice = voices.at(-1)
  if (lastVoice !== undefined) {
    lastVoice.osc.addEventListener('ended', () => {
      try { masterEnvelope.disconnect() } catch { /* silent */ }
    }, { once: true })
  }

  // cancel() — stop all voice oscillators + disconnect every node.
  // cancelScheduledValues on the master envelope discards pending automation.
  // Same try/catch posture as the 'ended' listeners above. The 'ended' listeners
  // and cancel() may both fire on the same voice; both must be safe (idempotent).
  const cancel = (): void => {
    masterEnvelope.gain.cancelScheduledValues(audioCtx.currentTime)
    for (const t of voices) {
      try { t.osc.stop(audioCtx.currentTime) } catch { /* silent — osc may already be stopped */ }
      disconnectToneNodes(t)
    }
    try { masterEnvelope.disconnect() } catch { /* silent — node may already be disconnected */ }
  }

  return { envelope: masterEnvelope, scheduledAt: when, cleanupAt: lastVoice?.cleanupAt ?? 0, cancel }
}
