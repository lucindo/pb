// Cue-dispatch facade over the audioEngine — the data-plane half of useAudioCues.
// Every method delegates to the live engine and no-ops when none exists (before
// start / after stop). Split out from useAudioCues so the per-frame cue dispatch
// stays separable from the engine-lifecycle control plane.

import { useCallback, useRef } from 'react'
import type { RefObject } from 'react'

import type { AudioEngine } from '../audio/audioEngine'
import type { BreathPhase } from '../domain/settings'

export interface CueScheduler {
  /** Notify a phase boundary at audioTime — the engine schedules the In or Out cue.
   *  App.tsx calls this as it transitions cycleIndex/phase. `phaseDurationSec` is
   *  the length of the UPCOMING phase (derived from plan.inhaleSec / plan.exhaleSec
   *  — ms→sec cascade); the engine forwards it to cueSynth so the
   *  bowl-cue decay envelope stretches with the phase length at low BPM. */
  notifyPhaseBoundary(this: void, args: { newPhase: BreathPhase; audioTime: number; phaseDurationSec: number }): void
  /** Dispatch a caller-supplied list of pre-computed cues via engine.topUpLookahead.
   *  The controller calls this on every session frame (rAF tick) with the walkFutureCues output.
   *  Facade: delegates to engine.topUpLookahead({ cues }); no-op if engine is null (before start). */
  topUpLookahead(this: void, cues: Array<{ audioTime: number; phaseDurationSec: number; kind: BreathPhase }>): void
  /** Cancel all future cues in the engine's activeCues queue.
   *  The controller calls this immediately before audioTopUpLookahead() on every
   *  session.currentFrame change (cancel-then-reschedule per the SCHED-05 doctrine).
   *  Facade: delegates to engine.cancelFutureCues(); no-op if engine is null (before start). */
  cancelFutureCues(this: void): void
  /** Returns engine.clock.now() (= AC currentTime), or null if
   *  AC unavailable. App.tsx uses this for the dual-anchor.
   *  audioNow reads through the SessionClock seam (engine.clock.now()); the
   *  underlying source is still the AC clock. */
  audioNow(this: void): number | null
  /** Play the shared session-ending chord — App.tsx calls this on a natural
   *  Pattern Breathing completion. No-op if the AC is unavailable or muted; the
   *  engine keeps the AC alive until it rings out. */
  playEndChord(this: void): void
  /** clock.onResume subscriber: re-dispatches the last cues array after AC
   *  reconstruction / iOS unlock so the lookahead queue refills before the next
   *  rAF tick fires. Wired into the engine's clock subscriptions by the lifecycle. */
  handleForceTopUp(this: void): void
  /** Drop the cached cues. Called by the lifecycle on start-failure, stop, and
   *  reconstruct so a stale replay cannot leak into a fresh / rebuilt engine. */
  clearCueCache(this: void): void
}

export function useCueScheduler(engineRef: RefObject<AudioEngine | null>): CueScheduler {
  /** Cache the last cues array dispatched via topUpLookahead.
   *  handleForceTopUp re-dispatches this on clock.onResume so AC reconstruction /
   *  iOS unlock force-tops up before the next rAF tick fires. Stale by ≤ 1 rAF
   *  (~16ms); engine's SAFE_LEAD_SEC callee clamp absorbs the drift. */
  const lastTopUpCuesRef = useRef<Array<{ audioTime: number; phaseDurationSec: number; kind: BreathPhase }>>([])

  // Re-dispatches the cached cues on clock.onResume so the lookahead queue refills
  // before the next rAF tick (covers AC reconstruction / iOS unlock / engine swap).
  const handleForceTopUp = useCallback((): void => {
    const engine = engineRef.current
    if (engine === null) return
    const cues = lastTopUpCuesRef.current
    if (cues.length === 0) return // No prior dispatch (e.g., lead-in still running) — safe no-op.
    engine.topUpLookahead({ cues })
  }, [engineRef])

  const notifyPhaseBoundary = useCallback(
    (args: { newPhase: BreathPhase; audioTime: number; phaseDurationSec: number }): void => {
      engineRef.current?.scheduleNextCue(args)
    },
    [engineRef],
  )

  // Caches the cues for the clock.onResume force-top-up path (handleForceTopUp).
  const topUpLookahead = useCallback(
    (cues: Array<{ audioTime: number; phaseDurationSec: number; kind: BreathPhase }>): void => {
      const engine = engineRef.current
      if (engine === null) return
      lastTopUpCuesRef.current = cues // Cache AFTER null-gate so a pre-start call cannot poison the force-top-up cache
      engine.topUpLookahead({ cues })
    },
    [engineRef],
  )

  // The controller calls this immediately before topUpLookahead on every
  // session.currentFrame change (cancel-then-reschedule per the SCHED-05 doctrine).
  const cancelFutureCues = useCallback((): void => {
    const engine = engineRef.current
    if (engine === null) return
    engine.cancelFutureCues()
  }, [engineRef])

  const audioNow = useCallback((): number | null => {
    // Read through the SessionClock seam; the underlying source is the AC clock.
    return engineRef.current?.clock.now() ?? null
  }, [engineRef])

  const playEndChord = useCallback((): void => {
    engineRef.current?.playEndChord()
  }, [engineRef])

  const clearCueCache = useCallback((): void => {
    lastTopUpCuesRef.current = []
  }, [])

  return {
    notifyPhaseBoundary,
    topUpLookahead,
    cancelFutureCues,
    audioNow,
    playEndChord,
    handleForceTopUp,
    clearCueCache,
  }
}
