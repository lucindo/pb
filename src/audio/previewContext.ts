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
// iOS Safari's autoplay policy can reject `new AudioContext()` outside a
// user-gesture chain. Cache the failure so subsequent preview taps don't
// retry-and-throw on every click; the picker silently falls back to
// visuals-only audition for the rest of the page lifetime.
let ctxFailed = false

function ensurePreviewContext(): AudioContext | null {
  if (ctxFailed) return null
  if (ctx === null) {
    // First tap — gesture-attached creation (every entry point is onClick, D-01).
    try {
      ctx = new AudioContext()
    } catch {
      ctxFailed = true
      return null
    }
  }
  return ctx
}

export function playInhalePreview(timbre: TimbreId): void {
  const previewCtx = ensurePreviewContext()
  if (previewCtx === null) return
  if (previewCtx.state === 'suspended') {
    // D-02: fire-and-forget — no await (synchronous-call-path contract, D-12 / PREV-05).
    // Catch the rejection so an unhandled promise rejection does not bubble to
    // the page if iOS Safari vetoes resume between visibility changes; the
    // preview is non-essential and silently dropping it is acceptable.
    previewCtx.resume().catch(() => { /* silent — preview is non-essential */ })
  }
  scheduleInCueForTimbre(previewCtx, previewCtx.currentTime, previewCtx.destination, timbre)
}

/**
 * Tear down the preview AudioContext if one exists. Idempotent — safe to call
 * when no preview has ever been triggered. Mainly useful for tests that need
 * to reset the module-level singleton between cases; production callers can
 * rely on browser-driven cleanup at page unload.
 */
export function closePreviewContext(): void {
  const current = ctx
  if (current !== null) {
    ctx = null
    ctxFailed = false
    current.close().catch(() => { /* silent — already closed or unrecoverable */ })
  }
}
