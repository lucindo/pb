// React hook wrapping the audioEngine service. Owns the React-side state
// machine (status + audioAvailable + muted) and the imperative API consumed
// by App.tsx in Plan 04.
//
// State machine: 'idle' → 'starting' → 'lead-in' (success) | 'failed' (D-10).
//   - 'idle' is the initial and post-stop() resting state.
//   - 'starting' is the transient between start() being called and the AC
//     promise resolving (visible to the UI as a brief "preparing" state).
//   - 'lead-in' is the post-success state (the lead-in cues are scheduled
//     and the first In bowl will strike at +3 s).
//   - 'failed' is the D-10 visuals-only fallback path; audioAvailable=false.
//
// muted defaults to the optional `initialMuted` parameter (Phase 4 D-14 / LOCL-01)
// or to false (Phase 3 D-07: first-visit audio is ON) when the parent does not
// supply a value. The hook itself does NOT persist the value — App.tsx wraps
// setMuted to call saveMute (Plan 04-03).
//
// Cleanup posture (Pitfall 3): the unmount effect closes the engine if one
// is alive. Mirrors the cancelled-flag idiom from useSessionEngine.ts:53-56.

import { useCallback, useEffect, useRef, useState } from 'react'

import type { BreathingPlan } from '../domain/breathingPlan'
import {
  createAudioEngine,
  type AudioEngine,
  type AudioStatus,
} from '../audio/audioEngine'

export type { AudioStatus }

export interface UseAudioCues {
  status: AudioStatus
  /** True if the AudioContext was created successfully; false if D-10 fallback path was taken. */
  audioAvailable: boolean
  /** Current mute state (default false per D-07). */
  muted: boolean
  /** Called from the Start session click handler (user gesture). Awaits AC creation. May fail
   *  → audioAvailable=false, status='failed'. Returns the audioTime of the first In cue
   *  (or null if AC failed). */
  start(plan: BreathingPlan): Promise<number | null>
  /** Called when session ends. Closes AC (D-11). Resets status to 'idle'. */
  stop(): Promise<void>
  /** Toggle mute. Pass true to mute, false to unmute. */
  setMuted(muted: boolean): void
  /** Notify a phase boundary at audioTime — the engine schedules the In or Out cue.
   *  App.tsx calls this as it transitions cycleIndex/phase. */
  notifyPhaseBoundary(args: { newPhase: 'in' | 'out'; audioTime: number }): void
  /** Returns audioCtx.currentTime, or null if AC unavailable. App.tsx uses this for
   *  the dual-anchor (Pitfall 2). */
  audioNow(): number | null
}

export function useAudioCues(initialMuted?: boolean): UseAudioCues {
  // Imperative resource — engineRef is NOT in render state because each AC create/close
  // is a side effect, not a UI value. Mirrors useSessionEngine.ts's animationFrameId posture.
  const engineRef = useRef<AudioEngine | null>(null)
  // WR-05: cache the firstInCueTime returned by the original engine.scheduleLeadIn
  // call so a defensive double-call to start() returns the deterministic anchor
  // (matching the JSDoc contract on start()) instead of a fresh "now + 3" projection
  // that drifts from the actual scheduled cue time.
  const firstInCueTimeRef = useRef<number | null>(null)
  const [status, setStatus] = useState<AudioStatus>('idle')
  // Phase 4 D-14 / LOCL-01: persisted mute preference is restored at construction time
  // when the parent supplies it. When `initialMuted` is undefined, fall back to the
  // Phase 3 D-07 first-visit default (muted=false / audio ON).
  const [muted, setMutedState] = useState<boolean>(initialMuted ?? false)
  const [audioAvailable, setAudioAvailable] = useState<boolean>(true)

  // Cleanup-on-unmount: close the engine if a session is still alive.
  // Pitfall 3 leak guard: rapid mount/unmount during dev/strict-mode would otherwise
  // leak AudioContexts. Browsers cap concurrent ACs (~6 in Chrome) before refusing new ones.
  useEffect(() => {
    return () => {
      const engine = engineRef.current
      if (engine !== null) {
        void engine.close()
        engineRef.current = null
      }
      firstInCueTimeRef.current = null
    }
  }, [])

  const start = useCallback(
    async (plan: BreathingPlan): Promise<number | null> => {
      // Defensive: if the hook user accidentally calls start() twice without stop(),
      // return the cached firstInCueTime from the ORIGINAL schedule (WR-05), not a
      // freshly-projected "now + 3" — those two values drift apart by the time
      // between the two start() calls.
      const existing = engineRef.current
      if (existing !== null) {
        return firstInCueTimeRef.current
      }
      setStatus('starting')
      try {
        const engine = await createAudioEngine()
        engineRef.current = engine
        // Carry the React mute state through to the freshly-built engine in case the user
        // toggled mute before clicking Start (the engine defaults to muted=false too,
        // but this keeps the two state holders in sync at handoff time).
        engine.setMuted(muted)
        // D-09 + D-13 + D-14: schedule the lead-in. Anchor at engine.now() — the
        // audioCtx.currentTime instant of lead-in start, which App.tsx co-anchors with
        // session.start(performance.now()) for the dual-clock alignment.
        const startAudioTime = engine.now()
        const firstInCueTime = engine.scheduleLeadIn(startAudioTime, plan)
        firstInCueTimeRef.current = firstInCueTime // WR-05
        setStatus('lead-in')
        setAudioAvailable(true)
        return firstInCueTime
      } catch {
        // D-10: visuals-only fallback. App.tsx (Plan 04) still drives the visual countdown
        // via setTimeout/RAF chain. The error is intentionally swallowed (T-03-06: no raw
        // stack to user-facing surfaces).
        setAudioAvailable(false)
        setStatus('failed')
        return null
      }
    },
    [muted],
  )

  const stop = useCallback(async (): Promise<void> => {
    // Null engineRef synchronously BEFORE awaiting close — otherwise a fast
    // start() arriving during the close window hits the defensive guard in
    // start() and returns from a closing AudioContext, leaving engineRef
    // pointing at a dead engine.
    const engine = engineRef.current
    engineRef.current = null
    firstInCueTimeRef.current = null // WR-05: clear cached anchor for the next start()
    setStatus('idle')
    if (engine !== null) {
      await engine.close() // D-11
    }
  }, [])

  const setMuted = useCallback((next: boolean): void => {
    setMutedState(next)
    // D-08 fade-out tail when muting mid-cue is owned by the engine.
    engineRef.current?.setMuted(next)
  }, [])

  const notifyPhaseBoundary = useCallback(
    (args: { newPhase: 'in' | 'out'; audioTime: number }): void => {
      engineRef.current?.scheduleNextCue(args)
    },
    [],
  )

  const audioNow = useCallback((): number | null => {
    return engineRef.current?.now() ?? null
  }, [])

  return {
    status,
    audioAvailable,
    muted,
    start,
    stop,
    setMuted,
    notifyPhaseBoundary,
    audioNow,
  }
}
