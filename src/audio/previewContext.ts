// Pure Web Audio preview module. Zero React imports.
//
// D-01 (PREV-05 latency): The AudioContext is created once on the first preview
// tap and reused for every subsequent tap. Construction cost (~5-20 ms) is paid
// once; all following taps skip straight to scheduling. Sharing or closing the
// context between taps would reintroduce that latency.
//
// D-02 (iOS Safari + Chrome auto-suspend): Some browsers auto-suspend an idle
// AudioContext. Calling ctx.resume() before scheduling on every tap closes that
// gap. No await — Web Audio tolerates a same-microtask resume + schedule pair,
// and awaiting would break the synchronous-call-path contract below.
//
// D-03 (natural decay): phaseDurationSec is deliberately omitted from the
// scheduleInCueForTimbre call. Each preset's own decayTau values define the
// audition shape; BPM / session duration coupling is explicitly rejected.

import { scheduleInCueForTimbre } from './cueSynth'
import type { TimbreId } from '../domain/settings'

let ctx: AudioContext | null = null

function ensurePreviewContext(): AudioContext {
  if (ctx === null) {
    // First tap — gesture-attached creation (every entry point is onClick, D-01).
    ctx = new AudioContext()
  }
  return ctx
}

export function playInhalePreview(timbre: TimbreId): void {
  const previewCtx = ensurePreviewContext()
  if (previewCtx.state === 'suspended') {
    // D-02: fire-and-forget — no await (synchronous-call-path contract, D-12 / PREV-05).
    void previewCtx.resume()
  }
  scheduleInCueForTimbre(previewCtx, previewCtx.currentTime, previewCtx.destination, timbre)
}
