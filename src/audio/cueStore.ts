// WebAudio cue bookkeeping for the audio engine: owns the in-flight cue Set and
// the end-chord tail deadline, dispatches typed Cues to the cueSynth primitives,
// and handles pruning / cancellation / teardown. Split out from audioEngine so the
// engine file holds only lifecycle + the public API facade.

import { scheduleInCueForTimbre, scheduleOutCueForTimbre, type CueHandle } from './cueSynth'
import { scheduleCountdownTick, scheduleEndChord } from './boundaryCueSynth'
import type { Cue } from './sessionClock'
import type { TimbreId } from '../domain/settings'

export interface CueStore {
  /** Dispatch a typed Cue at audio-clock time `whenSec`, tracking the returned
   *  handle so mute / teardown can reach it. The 'end-chord' arm advances the tail
   *  deadline. NO closed/muted guard — the engine facade gates; cues always route
   *  through masterGain (silent at gain=0). */
  schedule(this: void, whenSec: number, cue: Cue): void
  /** Drop cues whose tails have already finished (cleanupAt < now). */
  prune(): void
  /** Cancel + drop every cue scheduled after now; in-flight cues ring out. */
  cancelFuture(): void
  /** True when an in-flight cue's scheduledAt is within `toleranceSec` of
   *  `audioTimeSec` — the topUpLookahead in-flight dedup. */
  hasInFlightNear(audioTimeSec: number, toleranceSec: number): boolean
  /** Audio-clock time at which the end-chord tail finishes (0 = none scheduled).
   *  close() defers AC teardown until this instant so the chord is never cut off. */
  readonly endChordTailUntilSec: number
  /** Disconnect every in-flight cue's envelope and clear the Set (close path). */
  teardown(): void
}

export function createCueStore(audioCtx: AudioContext, masterGain: GainNode, timbre: TimbreId): CueStore {
  // Track ALL in-flight cues (lead-in ticks + In/Out bowls). Mute mid-lead-in must
  // silence the remaining ticks too — only tracking one handle would leave the other
  // ticks audible after the user clicks Mute.
  const activeCues = new Set<CueHandle>()
  // Audio-clock time at which the end-chord tail finishes. 0 = no end chord scheduled.
  let endChordTailUntilSec = 0

  // Dispatch a typed Cue to the per-cue primitives in cueSynth / boundaryCueSynth.
  // Timbre is resolved from the captured session timbre, NOT a cue field. The Cue
  // discriminated union is closed — TypeScript exhaustiveness enforces a switch arm
  // per kind at compile time.
  function schedule(whenSec: number, cue: Cue): void {
    switch (cue.kind) {
      case 'lead-in-tick':
        activeCues.add(scheduleCountdownTick(audioCtx, whenSec, masterGain, timbre))
        return
      case 'in':
        activeCues.add(scheduleInCueForTimbre(audioCtx, whenSec, masterGain, timbre, cue.phaseDurationSec))
        return
      case 'out':
        activeCues.add(scheduleOutCueForTimbre(audioCtx, whenSec, masterGain, timbre, cue.phaseDurationSec))
        return
      case 'end-chord': {
        const c = scheduleEndChord(audioCtx, whenSec, masterGain, timbre)
        activeCues.add(c)
        // Take the max in case of double-dispatch — the second call's tail must not
        // retreat below an earlier-scheduled chord still ringing.
        endChordTailUntilSec = Math.max(endChordTailUntilSec, c.cleanupAt)
        return
      }
    }
  }

  // Prune strictly on cleanupAt < now (no per-handle 'done' flag): the 100 ms slack
  // between an envelope's 'ended' disconnect and its cleanupAt means a cue can linger
  // in the Set briefly while already silent — harmless. Iterate a snapshot, not the
  // live Set, so deletion during iteration is safe.
  function prune(): void {
    const now = audioCtx.currentTime
    for (const cue of [...activeCues]) {
      if (cue.cleanupAt < now) activeCues.delete(cue)
    }
  }

  // Snapshot-iterate-then-mutate (same pattern as prune). cancel() stops oscillators
  // + disconnects all nodes; in-flight cues (scheduledAt <= now) ring out naturally.
  function cancelFuture(): void {
    const now = audioCtx.currentTime
    for (const cue of [...activeCues]) {
      if (cue.scheduledAt > now) {
        cue.cancel()
        activeCues.delete(cue)
      }
    }
  }

  // Engine-layer dedup for the rAF top-up: a boundary's IN-FLIGHT cue survives
  // cancelFutureCues (scheduledAt <= now), so re-scheduling it would land a second
  // strike ~toleranceSec later (audible double-tick). Scope to in-flight ONLY — future
  // queued cues are the caller's cancel-then-reschedule responsibility. Distinct
  // breathing cues are always >> toleranceSec apart, so this never drops a real cue.
  function hasInFlightNear(audioTimeSec: number, toleranceSec: number): boolean {
    const now = audioCtx.currentTime
    for (const active of activeCues) {
      if (active.scheduledAt <= now && Math.abs(active.scheduledAt - audioTimeSec) < toleranceSec) {
        return true
      }
    }
    return false
  }

  // The Web Audio spec does NOT guarantee 'ended' fires for an oscillator whose stopAt
  // is still in the future when audioCtx.close() runs — so explicitly disconnect every
  // in-flight cue's envelope (the only node the CueHandle exposes; tearing this edge
  // severs the chain from the graph output) and clear the Set so handles become GC-able.
  function teardown(): void {
    for (const cue of [...activeCues]) {
      try { cue.envelope.disconnect() } catch { /* silent — node may already be disconnected */ }
    }
    activeCues.clear()
  }

  return {
    schedule,
    prune,
    cancelFuture,
    hasInFlightNear,
    get endChordTailUntilSec() {
      return endChordTailUntilSec
    },
    teardown,
  }
}
