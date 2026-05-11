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

/** Plan 06 D-34: high-level audio-path health for the UI's resume affordance.
 *  - 'ok': audio is running OR not started yet — no affordance shown.
 *  - 'needs-resume': iOS Safari left the AC in 'interrupted'/'suspended' after a
 *    visibility-resume attempt rejected with InvalidStateError. User-tappable
 *    affordance is required (D-29). Reset to 'ok' once a gesture-attached
 *    resume or engine reconstruction succeeds (D-30).
 *  - 'unavailable': terminal — engine closed without recovery. Visuals-only path
 *    (Phase 3 D-10 fallback). */
export type AudioStatusFlag = 'ok' | 'needs-resume' | 'unavailable'

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
   *  App.tsx calls this as it transitions cycleIndex/phase. `phaseDurationSec` is
   *  the length of the UPCOMING phase (derived from plan.inhaleMs / plan.exhaleMs);
   *  the engine forwards it to cueSynth so the bowl-cue decay envelope stretches
   *  with the phase length at low BPM (260510-tc9 Bug 2). */
  notifyPhaseBoundary(args: { newPhase: 'in' | 'out'; audioTime: number; phaseDurationSec: number }): void
  /** Returns audioCtx.currentTime, or null if AC unavailable. App.tsx uses this for
   *  the dual-anchor (Pitfall 2). */
  audioNow(): number | null
  /** Plan 06 D-34: see AudioStatusFlag JSDoc. App.tsx reads this to drive
   *  MuteToggle's needsResume prop. */
  audioStatus: AudioStatusFlag
  /** Plan 06 D-34: gesture-attached recovery seam. App.tsx awaits this from
   *  inside the mute-button click handler when audioStatus === 'needs-resume'.
   *  Internally calls engine.resume() first; falls back to engine reconstruction
   *  (close + new createAudioEngine + setMuted replay + re-anchor signal) if
   *  resume cannot recover the AC. All chained synchronously inside the click
   *  handler so the iOS gesture context spans both calls (Pitfall 2). */
  resume(): Promise<void>
}

export function useAudioCues(
  initialMuted?: boolean,
  onReanchorRequired?: (newAudioAnchor: number) => void,
): UseAudioCues {
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

  // Plan 06 D-34: high-level audio-path health surface.
  const [audioStatus, setAudioStatus] = useState<AudioStatusFlag>('ok')

  // Plan 06 Pitfall 5: gate audioStatus = 'needs-resume' on a prior resume attempt
  // for THIS suspend cycle. Without this, AC startup's transient 'suspended' → 'running'
  // transition (Phase 3 WR-06 path) would briefly flash the affordance for one render.
  // Reset to false on every transition back to 'running' (or on stop()).
  const visibilityResumeAttemptedRef = useRef<boolean>(false)

  // Plan 06 D-35: re-anchor callback stored in a ref to avoid closure-capture issues
  // when App.tsx passes a new callback identity per render. The reconstruction path
  // reads this ref synchronously and invokes the latest callback.
  const onReanchorRequiredRef = useRef<typeof onReanchorRequired>(onReanchorRequired)
  useEffect(() => {
    onReanchorRequiredRef.current = onReanchorRequired
  }, [onReanchorRequired])

  // Plan 06 D-36 / D-37: statechange listener — single source of truth for audioStatus
  // transitions. Wired by passing this as { onStateChange } to createAudioEngine().
  // The cast accepts WebKit's 'interrupted' superset (D-37).
  const handleStateChange = useCallback(
    (state: AudioContextState | 'interrupted'): void => {
      if (state === 'running') {
        visibilityResumeAttemptedRef.current = false
        setAudioStatus('ok')
      } else if (state === 'closed') {
        setAudioStatus('unavailable')
      } else if (
        (state === 'suspended' || state === 'interrupted') &&
        visibilityResumeAttemptedRef.current
      ) {
        // Pitfall 5: gated on a prior resume attempt to suppress startup-time flicker.
        setAudioStatus('needs-resume')
      }
      // Other transitions (e.g., 'suspended' BEFORE any visibility resume) are
      // ignored — the next visibility-handler call will arm the gate.
    },
    [],
  )

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

  // Phase 5.1 D-01..D-05, D-08, D-09 (Plan 01) + Plan 06 D-39 / Pitfall 5:
  // visibility-resume listener.
  // Mirrors useWakeLock.ts:77-100 — same shape, same gate posture. The hook owns
  // its own DOM listener (D-02 keeps audioEngine free of document.* / window.*
  // access). The single gate is engineRef.current !== null (D-03 / D-04). Plan 06
  // adds: visibilityResumeAttemptedRef.current = true BEFORE the void-call. This
  // arms the Pitfall 5 gate inside handleStateChange so a subsequent
  // 'suspended'/'interrupted' transition (from the engine's narrowed catch — D-38)
  // can flip audioStatus = 'needs-resume'. Plan 01 D-09 silent absorption is
  // preserved — the engine's resume() still catches the rejection internally; what
  // CHANGED is that InvalidStateError is now surfaced via the onStateChange callback
  // (D-38) instead of being fully swallowed. D-39: the optimistic resume call is
  // PRESERVED — sometimes it works without a gesture (headphone in, brief lock,
  // certain iOS versions). When it rejects, the affordance becomes the user's
  // recovery path.
  useEffect(() => {
    const onVisibility = (): void => {
      if (document.visibilityState !== 'visible') return
      if (engineRef.current === null) return
      // Plan 06 Pitfall 5: arm the gate BEFORE the resume call so a subsequent
      // 'suspended'/'interrupted' statechange can transition audioStatus.
      visibilityResumeAttemptedRef.current = true
      void engineRef.current.resume()
    }
    document.addEventListener('visibilitychange', onVisibility)
    return () => {
      document.removeEventListener('visibilitychange', onVisibility)
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
        const engine = await createAudioEngine({ onStateChange: handleStateChange })
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
    [muted, handleStateChange],
  )

  const stop = useCallback(async (): Promise<void> => {
    // Null engineRef synchronously BEFORE awaiting close — otherwise a fast
    // start() arriving during the close window hits the defensive guard in
    // start() and returns from a closing AudioContext, leaving engineRef
    // pointing at a dead engine.
    const engine = engineRef.current
    engineRef.current = null
    firstInCueTimeRef.current = null // WR-05: clear cached anchor for the next start()
    // Plan 06: reset the audioStatus state machine + Pitfall 5 gate so the next
    // session starts clean (otherwise a residual 'needs-resume' from a prior
    // suspend cycle would carry into the new session's first render).
    visibilityResumeAttemptedRef.current = false
    setAudioStatus('ok')
    setStatus('idle')
    if (engine !== null) {
      await engine.close() // D-11
    }
  }, [])

  // Plan 06 D-33 / D-35 / D-35b: reconstruction path — close old engine + create
  // new one + replay muted state + signal re-anchor to App.tsx.
  //
  // iOS gesture preservation (Plan 06 Task 8 UAT cycle 2 — kitchen-sink fix
  // 2026-05-10): the FIRST sync operation after the user-gesture click MUST be
  // `new AudioContext()` — iOS Safari consumes the gesture activation token at
  // the first `await`. Awaiting oldEngine.close() before the new AC ran the
  // construction outside gesture context, so the new AC came up in degraded
  // (interrupted) state (real-iPhone diagnostic captured this exact sequence:
  // new AC → 'running' → immediately 'interrupted' after gesture loss).
  // createAudioEngine() begins with `new AudioContext()` (sync) and only THEN
  // awaits resume() — that resume() runs inside the new AC's gesture context.
  // Old engine is closed AFTER the new AC is constructed (fire-and-forget;
  // close needs no gesture).
  const reconstructEngine = useCallback(async (): Promise<void> => {
    const oldEngine = engineRef.current
    const currentMuted = muted
    // Pattern B (Pitfall 3): synchronously null engineRef BEFORE awaiting —
    // mirrors stop()'s posture so a fast call into setMuted() during the window
    // does not deref a closing AC.
    engineRef.current = null
    firstInCueTimeRef.current = null

    let newEngine: AudioEngine | null = null
    try {
      newEngine = await createAudioEngine({ onStateChange: handleStateChange })
    } catch {
      // D-10 terminal fallback: createAudioEngine threw. Fire-and-forget close
      // the old engine (gesture already consumed by the failed construction).
      if (oldEngine !== null) void oldEngine.close()
      setAudioStatus('unavailable')
      setAudioAvailable(false)
      return
    }

    // Fire-and-forget close of the old AC — gesture token already used for new
    // AC construction; awaiting close would only delay the recovery (D-09
    // silent on close failure).
    if (oldEngine !== null) void oldEngine.close()

    engineRef.current = newEngine
    // D-35b: replay mute state synchronously so the new engine starts with the
    // user's chosen muted-ness — the React `muted` state was not reset by the
    // close + new-create cycle.
    newEngine.setMuted(currentMuted)
    // D-35: re-anchor signal — the new AC's currentTime starts at 0, so the
    // dual-anchor (App.tsx audioAnchorRef) MUST be reset against the new origin
    // or subsequent scheduleNextCue calls will compute against a stale anchor
    // and silently fail to fire (Phase 3 dual-anchor invariant). App.tsx
    // additionally subtracts session-elapsed time so boundary math lands near
    // the new AC.currentTime instead of in its distant future (kitchen-sink
    // re-anchor offset fix).
    onReanchorRequiredRef.current?.(newEngine.now())
    // The new AC starts in 'running' via the WR-06 constructor path. Set
    // audioStatus = 'ok' synchronously — the statechange listener will also
    // fire but may race with the React render.
    visibilityResumeAttemptedRef.current = false
    setAudioStatus('ok')
    setAudioAvailable(true)
  }, [muted, handleStateChange])

  // Plan 06 D-34: public resume() — invoked from the App.tsx mute-button click
  // handler when audioStatus === 'needs-resume'. The click IS a user gesture
  // that we use to acquire a fresh AudioContext via reconstruction.
  //
  // iOS Safari ground truth (Plan 06 Task 8 UAT cycle 2 — kitchen-sink fix
  // 2026-05-10): plain engine.resume() returns audioCtx.state === 'running' on
  // this device class even when the underlying iOS audio session is dead —
  // AC.currentTime never advances, scheduled cues never fire, beep test
  // silent. State is a lie; only a freshly-constructed AudioContext inside
  // gesture context restores audio output. D-31/D-33's spec language is
  // preserved (gesture-attached recovery + dual-path on mute click); the
  // mechanism changes from "try resume, fall back to reconstruct" to "always
  // reconstruct". The cost is negligible (~tens of ms of AC construction +
  // node setup) and the recovery is reliable.
  const resume = useCallback(async (): Promise<void> => {
    if (engineRef.current === null) return
    await reconstructEngine()
  }, [reconstructEngine])

  const setMuted = useCallback((next: boolean): void => {
    setMutedState(next)
    // D-08 fade-out tail when muting mid-cue is owned by the engine.
    engineRef.current?.setMuted(next)
  }, [])

  const notifyPhaseBoundary = useCallback(
    (args: { newPhase: 'in' | 'out'; audioTime: number; phaseDurationSec: number }): void => {
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
    audioStatus,
    resume,
  }
}
