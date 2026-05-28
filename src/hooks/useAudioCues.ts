// React hook wrapping the audioEngine service. Owns the React-side state
// machine (status + audioAvailable + muted) and the imperative API consumed
// by App.tsx in Plan 04.
//
// State machine: 'idle' → 'lead-in' (success) | 'failed' (D-10 Plan 06).
//
// muted defaults to the optional `initialMuted` parameter (Phase 4 D-14 / LOCL-01)
// or to false (Phase 3 D-07: first-visit audio is ON) when the parent does not
// supply a value. The hook itself does NOT persist the value — App.tsx wraps
// setMuted to call saveMute (Plan 04-03).
//
// Cleanup posture (Pitfall 3): the unmount effect closes the engine if one
// is alive. Mirrors the cancelled-flag idiom from useSessionEngine.ts:53-56.

import { useCallback, useEffect, useMemo, useRef, useState } from 'react'

import type { BreathingPlan } from '../domain/breathingPlan'
import {
  createAudioEngine,
  type AudioEngine,
  type AudioStatus,
} from '../audio/audioEngine'
import type { AudioStatusFlag } from '../audio/audioStatus'
// Phase 51-02 (D-03/D-05): stable-identity proxy clock backed by the AC clock during sessions.
import { createSwappableSessionClock } from '../audio/swappableSessionClock'
import { createWallSessionClock } from '../audio/sessionClock'
import type { SessionClock } from '../audio/sessionClock'
// Phase 18 Plan 04: TimbreId is captured per-session via `start(plan, timbre)` and
// stored synchronously into `timbreRef` BEFORE any await (D-08). DEFAULT_TIMBRE is
// the ref's initial value — overwritten at the user's first Start click. The hook
// NEVER reads user prefs for timbre — caller (App.tsx in Plan 06) owns the storage read.
import { DEFAULT_TIMBRE, type TimbreId } from '../domain/settings'

export type { AudioStatus }
export type { AudioStatusFlag } from '../audio/audioStatus'

export interface UseAudioCues {
  status: AudioStatus
  /** True if the AudioContext was created successfully; false if D-10 fallback path was taken. */
  audioAvailable: boolean
  /** Current mute state (default false per D-07). */
  muted: boolean
  /**
   * Phase 51-02 (D-03): stable-identity proxy `SessionClock`. Same `===` reference for the
   * lifetime of the hook instance — identity never changes across renders or source swaps.
   *
   * D-03 posture: built from `createSwappableSessionClock(createWallSessionClock())` exactly
   * once via `useMemo([], [])` inside the hook body.
   *
   * D-05 (HRV swap moment): `clock.now()` delegates to the wall clock before `start()` and
   * to `engine.clock` after `start()` sets `proxyMemoRef.current.setSource(engine.clock)`.
   *
   * D-11 (reconstruction swap): on `reconstructEngine`, `proxyMemoRef.current.setSource(newEngine.clock)`
   * is called BEFORE the `onReanchorRequired` callback fires. Subscribers (e.g., `useSessionEngine`
   * via the clock dep) do NOT need to re-subscribe — the proxy's D-04 subscription-survival
   * semantics keep all callbacks forwarded to the new source automatically.
   */
  clock: SessionClock
  /** Called from the Start session click handler (user gesture). Awaits AC creation. May fail
   *  → audioAvailable=false, status='failed'. Returns the audioTime of the first In cue
   *  (or null if AC failed).
   *
   *  `timbre`: TimbreId captured at session start (D-08); engine uses this value for every
   *  cue in the session including reconstruction (D-11) — App.tsx passes prefs.timbre
   *  snapshot. The hook freezes the value into `timbreRef` BEFORE any await; a cross-tab
   *  prefs mutation during the gesture chain or during a later iOS visibility-suspend
   *  recovery NEVER leaks into the active session.
   *
   *  `bypassSilentMode` (Phase 49.1 D-07/D-09): optional 3rd arg threaded to
   *  `createAudioEngine({ bypassSilentMode })`. Captured into `bypassSilentModeRef`
   *  synchronously BEFORE the await (mirrors the `timbreRef` posture). Replayed from
   *  that ref inside `reconstructEngine` — a mid-session toggle does NOT live-update
   *  (D-09); the flag is read at engine-construction time only. Undefined passes through
   *  to the engine, where it coerces to "construct" (D-07 backward-compat). */
  start(this: void, plan: BreathingPlan, timbre: TimbreId, bypassSilentMode?: boolean): Promise<number | null>
  /** Called when session ends. Closes AC (D-11). Resets status to 'idle'. */
  stop(this: void): Promise<void>
  /** Toggle mute. Pass true to mute, false to unmute. */
  setMuted(this: void, muted: boolean): void
  /** Notify a phase boundary at audioTime — the engine schedules the In or Out cue.
   *  App.tsx calls this as it transitions cycleIndex/phase. `phaseDurationSec` is
   *  the length of the UPCOMING phase (derived from plan.inhaleSec / plan.exhaleSec
   *  — Phase 50-02 ms→sec cascade); the engine forwards it to cueSynth so the
   *  bowl-cue decay envelope stretches with the phase length at low BPM
   *  (260510-tc9 Bug 2). */
  notifyPhaseBoundary(this: void, args: { newPhase: 'in' | 'out'; audioTime: number; phaseDurationSec: number }): void
  /** Returns engine.clock.now() (= AC currentTime per D-03 Option A), or null if
   *  AC unavailable. App.tsx uses this for the dual-anchor (Pitfall 2). Revision 2
   *  Warning #5: comment updated post Phase 50 — audioNow reads through the SessionClock
   *  seam (engine.clock.now()); the underlying source is still the AC clock per D-03
   *  Option A. */
  audioNow(this: void): number | null
  /** Play the shared session-ending chord — App.tsx calls this on a natural
   *  HRV completion (parity with the Navi Kriya end cue). No-op if the AC is
   *  unavailable or muted; the engine keeps the AC alive until it rings out. */
  playEndChord(this: void): void
  /** Plan 06 D-34: see AudioStatusFlag JSDoc. App view-model reads this to drive
   *  MuteToggle's needsResume prop. */
  audioStatus: AudioStatusFlag
  /** Plan 06 D-34: gesture-attached recovery seam. The app controller awaits this from
   *  inside the mute-button click handler when audioStatus === 'needs-resume'.
   *  Internally calls engine.resume() first; falls back to engine reconstruction
   *  (close + new createAudioEngine + setMuted replay + re-anchor signal) if
   *  resume cannot recover the AC. All chained synchronously inside the click
   *  handler so the iOS gesture context spans both calls (Pitfall 2). */
  resume(this: void): Promise<void>
}

export function useAudioCues(
  initialMuted?: boolean,
  onReanchorRequired?: (newAudioAnchor: number) => void,
  onSessionClockReanchored?: (newClockNow: number) => void,
): UseAudioCues {
  // Phase 51-02 (D-03): stable-identity proxy clock. Built ONCE per hook instance via
  // useMemo with empty deps — the `clock` reference is NEVER rebuilt by setSource().
  // Store as a ref to avoid adding proxyMemo to useCallback dep arrays (proxyMemo IS stable,
  // but adding it would surface as an exhaustive-deps warning because the rule cannot statically
  // prove a useMemo return is stable). Using a ref as a stable handle is the cleanest posture.
  const proxyMemo = useMemo(() => createSwappableSessionClock(createWallSessionClock()), [])
  const proxyClock = proxyMemo.clock
  // Stable ref handle: proxyMemoRef.current is always the same useMemo-created object;
  // calling proxyMemoRef.current.setSource(next) avoids @typescript-eslint/unbound-method
  // and does not introduce any new dep into useCallback arrays.
  const proxyMemoRef = useRef(proxyMemo)

  // Imperative resource — engineRef is NOT in render state because each AC create/close
  // is a side effect, not a UI value. Mirrors useSessionEngine.ts's animationFrameId posture.
  const engineRef = useRef<AudioEngine | null>(null)
  // WR-05: cache the firstInCueTime returned by the original engine.scheduleLeadIn
  // call so a defensive double-call to start() returns the deterministic anchor
  // (matching the JSDoc contract on start()) instead of a fresh "now + 3" projection
  // that drifts from the actual scheduled cue time.
  const firstInCueTimeRef = useRef<number | null>(null)
  // AUDIO-01: monotonic counter; bumped on every reconstruct, stop, and unmount;
  // checked post-await to detect cancellation. Layered ON TOP of the existing
  // synchronous-null pattern (Pitfall 1 — do NOT remove synchronous-null).
  const reconstructGenerationRef = useRef<number>(0)
  const [status, setStatus] = useState<AudioStatus>('idle')
  // Phase 4 D-14 / LOCL-01: persisted mute preference is restored at construction time
  // when the parent supplies it. When `initialMuted` is undefined, fall back to the
  // Phase 3 D-07 first-visit default (muted=false / audio ON).
  const [muted, setMutedState] = useState<boolean>(initialMuted ?? false)
  // HOOKS-01 / D-11: mute state mirrored into a ref so callbacks that read mute
  // (start, reconstructEngine) drop `muted` from their useCallback dep arrays
  // without losing access to the current value. Layered ON TOP of the existing
  // useState [muted, setMutedState] above — does NOT replace it (the React
  // state is still the UI-binding source for MuteToggle and the LOCL-01
  // persistence path). Mirrors the onReanchorRequiredRef pattern at lines
  // 106-109 and the AUDIO-01 reconstructGenerationRef posture at line 86.
  const mutedRef = useRef<boolean>(initialMuted ?? false)
  useEffect(() => {
    mutedRef.current = muted
  }, [muted])
  // Phase 18 D-08: mirror of mutedRef's synchronous-pre-await capture posture for
  // the session timbre. Set inside start(plan, timbre) BEFORE the first await; read
  // inside reconstructEngine BEFORE any await (mirror of `currentMuted = mutedRef.current`
  // at line 292). NO useEffect mirror needed — timbreRef is only ever set
  // synchronously inside start() and read synchronously inside reconstructEngine().
  // Unlike mutedRef, there is no React state that drives it; App.tsx passes the
  // snapshot directly to start(). D-11: reconstruction NEVER re-reads user prefs —
  // the session's first-Start choice is preserved across iOS visibility-suspend recovery.
  const timbreRef = useRef<TimbreId>(DEFAULT_TIMBRE)
  // Phase 49.1 D-07/D-09: bypassSilentMode captured at engine-construction time (start) and
  // replayed during reconstruction — mirrors the timbreRef posture exactly. Initial value is
  // undefined (D-07: undefined → engine coerces to "construct" → Phase 49 v3 behavior).
  // NO useEffect mirror: only ever set synchronously in start() and read in reconstructEngine().
  const bypassSilentModeRef = useRef<boolean | undefined>(undefined)
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

  // Phase 51-02 (D-10/D-11): mirror of onReanchorRequiredRef for the new session-clock
  // reanchor callback. Fires in reconstructEngine BEFORE onReanchorRequired (D-11 ordering).
  const onSessionClockReanchoredRef = useRef<typeof onSessionClockReanchored>(onSessionClockReanchored)
  useEffect(() => {
    onSessionClockReanchoredRef.current = onSessionClockReanchored
  }, [onSessionClockReanchored])

  // Phase 50 D-11 + revision 1 Blocker #1: clock subscriptions (suspend/resume/close) live
  // alongside engineRef. Must be torn down before engineRef is nulled (stop()) or reassigned
  // (reconstructEngine). Revision 2 Blocker #1: engine.resume() rejection with InvalidStateError
  // fires the suspend channel via clock.notifySuspended() (engine-internal), so handleSuspend
  // MUST be subscribed before any resume() call that might reject — confirmed by start()
  // ordering (subscriptions added immediately after engineRef.current = engine, before any
  // external code can call engine.resume()).
  const clockUnsubsRef = useRef<Array<() => void>>([])

  // Plan 06 D-36 / D-37 + Phase 50 D-11 + revision 1 Blocker #1: the unified
  // handleStateChange callback (which the engine fired via the removed callback option) is
  // replaced by THREE clock subscribers — one per channel (suspend / resume / close). Per
  // revision 2 Warning #4 the AudioStatusFlag enum is exactly `'ok' | 'needs-resume' |
  // 'unavailable'` (3 values, no `'failed'`). Each handler keeps its previous semantics:
  //   - handleResume: the prior `state === 'running'` branch.
  //   - handleSuspend: the prior `(state === 'suspended' || state === 'interrupted') &&
  //     visibilityResumeAttemptedRef.current` branch (Pitfall 5 gate preserved).
  //   - handleClose: the prior `state === 'closed'` branch — revision 1 Blocker #1 preserves
  //     the byte-identical setAudioStatus('unavailable') setter formerly at L164-165.
  const handleResume = useCallback((): void => {
    // AUDIO-05 D-04 / D-06: defensive single gate at top — protects future branches that
    // read engineRef.current (currently none in this handler, but preserves the prior
    // handleStateChange null-gate posture).
    const engine = engineRef.current
    if (engine === null) return
    void engine
    visibilityResumeAttemptedRef.current = false
    setAudioStatus('ok')
  }, [])

  const handleSuspend = useCallback((): void => {
    const engine = engineRef.current
    if (engine === null) return
    void engine
    // Pitfall 5 gate preserved: only flip to 'needs-resume' when a prior visibility-driven
    // resume attempt is in flight for this suspend cycle. Startup-time transient
    // suspended → running transitions (Phase 3 WR-06 path) are intentionally ignored.
    if (visibilityResumeAttemptedRef.current) {
      setAudioStatus('needs-resume')
    }
  }, [])

  const handleClose = useCallback((): void => {
    // Revision 1 Blocker #1: preserves the byte-identical setAudioStatus('unavailable')
    // setter (formerly at L164-165 in the unified handleStateChange). engine.clock.onClose
    // fires this when the AC transitions to 'closed' — whether via stop()/reconstructEngine
    // paths OR an unexpected browser-side AC kill. Phase 50 success criterion #3
    // (byte-identical behavior) satisfied.
    const engine = engineRef.current
    if (engine === null) return
    void engine
    setAudioStatus('unavailable')
  }, [])

  // Cleanup-on-unmount: close the engine if a session is still alive.
  // Pitfall 3 leak guard: rapid mount/unmount during dev/strict-mode would otherwise
  // leak AudioContexts. Browsers cap concurrent ACs (~6 in Chrome) before refusing new ones.
  useEffect(() => {
    return () => {
      // AUDIO-01: invalidate any in-flight reconstruct.
      // Reading .current inside cleanup is intentional — the ref always holds the latest
      // counter value at cleanup time; the exhaustive-deps rule's warning about stale
      // .current does not apply to a monotonic counter that is only ever mutated, never
      // captured for later reads.
      reconstructGenerationRef.current += 1
      // Phase 50 D-11 + revision 1 Blocker #1: tear down clock subscriptions on unmount —
      // mirrors stop()'s posture. Pitfall 3 leak guard extends to the subscriber Sets
      // (T-50.04-02 in the threat model — no unbounded growth across mount/unmount cycles).
      for (const off of clockUnsubsRef.current) off()
      clockUnsubsRef.current = []
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
  // arms the Pitfall 5 gate inside handleSuspend so a subsequent
  // 'suspended'/'interrupted' transition (from the engine's narrowed catch — D-38)
  // can flip audioStatus = 'needs-resume'. Plan 01 D-09 silent absorption is
  // preserved — the engine's resume() still catches the rejection internally; what
  // CHANGED in Phase 50 (revision 2 Blocker #1) is that InvalidStateError is now
  // surfaced via clock.notifySuspended() (the engine-only synthetic-suspend escape
  // hatch) → handleSuspend (D-38) instead of being fully swallowed. D-39: the
  // optimistic resume call is PRESERVED — sometimes it works without a gesture
  // (headphone in, brief lock, certain iOS versions). When it rejects, the
  // affordance becomes the user's recovery path.
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
    async (plan: BreathingPlan, timbre: TimbreId, bypassSilentMode?: boolean): Promise<number | null> => {
      // Defensive: if the hook user accidentally calls start() twice without stop(),
      // return the cached firstInCueTime from the ORIGINAL schedule (WR-05), not a
      // freshly-projected "now + 3" — those two values drift apart by the time
      // between the two start() calls.
      const existing = engineRef.current
      if (existing !== null) {
        return firstInCueTimeRef.current
      }
      // D-08 (AUDIO-06): 'starting' literal removed from AudioStatus union (Plan 01).
      // Transition goes 'idle' → 'lead-in' (success) | 'failed' directly.
      try {
        // Phase 18 D-08: synchronous pre-await capture — mirror of mutedRef posture
        // (mutedRef-mirror effect + `mutedRef.current` read in reconstructEngine at
        // line 292). The session's timbre is FROZEN here BEFORE the await so a
        // cross-tab prefs mutation during the gesture chain or during the engine
        // construction cannot leak into the active session (D-11 invariant).
        timbreRef.current = timbre
        // Phase 49.1 D-07/D-09: capture bypassSilentMode synchronously BEFORE the await
        // (mirrors timbreRef posture). The value is frozen at start() call time;
        // mid-session preference toggles do NOT live-update (D-09 invariant).
        bypassSilentModeRef.current = bypassSilentMode
        const engine = await createAudioEngine({ timbre, bypassSilentMode })
        engineRef.current = engine
        // Phase 51-02 (D-05): swap the proxy source to the AC clock immediately after
        // engineRef is assigned. Subsequent clock.now() reads delegate to the AC's currentTime.
        // This is the HRV swap moment — the lead-in setTimeout chain BEFORE this point runs on
        // the wall-clock initial source, which is intentional and acceptable per CONTEXT D-05.
        proxyMemoRef.current.setSource(engine.clock)
        // Phase 50 D-11 + revision 1 Blocker #1: subscribe to the three clock channels.
        // Subscriptions live alongside engineRef and are torn down in stop() and at the top
        // of reconstructEngine() before engineRef is nulled. Revision 2 Blocker #1: handleSuspend
        // catches both natural statechange transitions AND the synthetic clock.notifySuspended()
        // fired by engine.resume()'s InvalidStateError catch block (iOS Safari recovery — Plan 06
        // D-38). The subscriptions are attached BEFORE any external code can call engine.resume()
        // (the next external entry point), preserving byte-identical end-user behavior.
        const unsubResume = engine.clock.onResume(handleResume)
        const unsubSuspend = engine.clock.onSuspend(handleSuspend)
        const unsubClose = engine.clock.onClose(handleClose)
        clockUnsubsRef.current = [unsubResume, unsubSuspend, unsubClose]
        // HOOKS-01 / D-11: read mute from mutedRef so `start` does NOT depend on
        // the React `muted` state. The ref-mirror effect above keeps the ref in
        // sync with the React state before any subsequent callback observation;
        // this drops `muted` from `start`'s useCallback dep array and keeps the
        // callback identity stable across setMuted toggles.
        engine.setMuted(mutedRef.current)
        // D-09 + D-13 + D-14: schedule the lead-in. Anchor at engine.clock.now() — the
        // AC's currentTime instant of lead-in start (per D-03 Option A, the clock returns
        // the AC's currentTime). The session-engine co-anchors via clock.now() for the
        // dual-clock alignment (Phase 50: useSessionEngine consumes a createWallSessionClock()
        // per Plan 50-02; Phase 51 will swap to the engine's audio clock via the same
        // SessionClock seam). Revision 1 Warning #11: comment updated post Phase 50 migration
        // — session capture uses clock.now(), not the wall clock.
        const startAudioTime = engine.clock.now()
        const firstInCueTime = engine.scheduleLeadIn(startAudioTime, plan)
        // AUDIO-03: closed engine — defense-in-depth, fall through to failure.
        if (firstInCueTime === null) { setAudioAvailable(false); setStatus('failed'); return null }
        firstInCueTimeRef.current = firstInCueTime // WR-05
        setStatus('lead-in')
        setAudioAvailable(true)
        return firstInCueTime
      } catch (error) {
        // D-10: visuals-only fallback. App.tsx (Plan 04) still drives the visual countdown
        // via setTimeout/RAF chain. The error is intentionally swallowed (T-03-06: no raw
        // stack to user-facing surfaces).
        if (import.meta.env.DEV) {
          // Reason: dev-only breadcrumb for triage of iOS-Safari construction
          // failures from real-device logs; never surfaces to production users.
          // eslint-disable-next-line no-console
          console.warn('[useAudioCues] start failed; falling back to visuals-only', error)
        }
        setAudioAvailable(false)
        setStatus('failed')
        return null
      }
    },
    [handleResume, handleSuspend, handleClose],
  )

  const stop = useCallback(async (): Promise<void> => {
    // AUDIO-01: invalidate any in-flight reconstruct.
    reconstructGenerationRef.current += 1
    // Phase 50 D-11 + revision 1 Blocker #1: tear down clock subscriptions BEFORE nulling
    // engineRef. After this loop runs, clockUnsubsRef is empty — a stray statechange event
    // on the closing AC will fire the clock's internal fan-out into the (now-empty) Set,
    // a no-op. Without this teardown the engineRef-null gate at the top of each handler
    // would short-circuit, but the unsub paths would still hold references to closed-over
    // setAudioStatus callbacks, leaking the subscription Sets across mount/unmount cycles
    // (T-50.04-02 threat model — unbounded subscriber Set growth).
    for (const off of clockUnsubsRef.current) off()
    clockUnsubsRef.current = []
    // Null engineRef synchronously BEFORE awaiting close — otherwise a fast
    // start() arriving during the close window hits the defensive guard in
    // start() and returns from a closing AudioContext, leaving engineRef
    // pointing at a dead engine.
    const engine = engineRef.current
    engineRef.current = null
    // Phase 51-02 (D-06 "revert to wall on close" pattern): revert the proxy source to a
    // fresh wall clock so any post-stop clock.now() reads return wall time (not a stale
    // AC currentTime from a closed context, which most browsers freeze at their last value —
    // unspecified across implementations). Uses a fresh createWallSessionClock() instance to
    // avoid any cross-session subscription state from the initial source.
    // NOTE: the unmount cleanup does NOT add a setProxyClockSource revert here — the hook,
    // useSessionEngine, and useBreathingSessionController all unmount together, so no
    // post-unmount clock.now() read can reach the proxy. This is asymmetric with NK Plan
    // 51-03 by design (see must_haves.truths "Unmount asymmetry").
    proxyMemoRef.current.setSource(createWallSessionClock())
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
    // AUDIO-01: stamp this reconstruct's generation token.
    reconstructGenerationRef.current += 1
    const gen = reconstructGenerationRef.current
    const oldEngine = engineRef.current
    // HOOKS-01 / D-11: capture mute synchronously from the ref BEFORE any await.
    // Same posture as the original `const currentMuted = muted` capture — the
    // value is locked at this point in the gesture-attached chain so a mute
    // toggle that fires during the await does not race the replay. Reading
    // from mutedRef removes `muted` from this useCallback's dep array
    // (callback identity stays stable across setMuted toggles).
    const currentMuted = mutedRef.current
    // Phase 18 D-11: capture session's original timbre BEFORE any await. Reconstruction
    // NEVER re-reads user prefs for timbre — the session's first-Start choice is
    // preserved across iOS visibility-suspend recovery. Mirror of `currentMuted`
    // posture immediately above; if a cross-tab prefs change fires during the
    // await below, the new engine still receives this captured value, NOT the
    // fresh prefs value. (D-11 invariant — asserted by the
    // "reconstructEngine reuses timbreRef.current" test below.)
    const currentTimbre = timbreRef.current
    // Phase 49.1 D-09: replay bypassSilentMode from the ref captured in start() —
    // mirror of the currentTimbre capture above. Mid-session preference toggle
    // does NOT live-update (D-09): the engine is rebuilt with the same flag value
    // that was active at the original start() call.
    const currentBypassSilentMode = bypassSilentModeRef.current
    // Phase 50 D-11 + revision 1 Blocker #1: tear down OLD clock subscriptions BEFORE nulling
    // engineRef — mirror of stop()'s posture. Subscriptions never leak across reconstruction.
    for (const off of clockUnsubsRef.current) off()
    clockUnsubsRef.current = []
    // Pattern B (Pitfall 3): synchronously null engineRef BEFORE awaiting —
    // mirrors stop()'s posture so a fast call into setMuted() during the window
    // does not deref a closing AC.
    // Pitfall 1: DO NOT remove — the synchronous-null is preserved ON TOP of the
    // generation counter (both patterns address different races).
    engineRef.current = null
    firstInCueTimeRef.current = null

    let newEngine: AudioEngine
    try {
      // Phase 18 D-11: passes the session-captured timbre (NOT a fresh prefs read)
      // to the new engine. The session's first-Start choice flows through reconstruction.
      // Phase 49.1 D-09: passes the captured bypassSilentMode ref value.
      // Phase 50 D-11: external subscribers are wired AFTER construction via engine.clock.on*.
      newEngine = await createAudioEngine({ timbre: currentTimbre, bypassSilentMode: currentBypassSilentMode })
    } catch {
      // D-10 terminal fallback: createAudioEngine threw. Fire-and-forget close
      // the old engine (gesture already consumed by the failed construction).
      if (oldEngine !== null) void oldEngine.close()
      setAudioStatus('unavailable')
      setAudioAvailable(false)
      return
    }

    // AUDIO-01: bail if stop() / unmount / a newer reconstruct ran during the await.
    if (gen !== reconstructGenerationRef.current) {
      void newEngine.close()
      if (oldEngine !== null) void oldEngine.close()
      return
    }

    // Fire-and-forget close of the old AC — gesture token already used for new
    // AC construction; awaiting close would only delay the recovery (D-09
    // silent on close failure).
    if (oldEngine !== null) void oldEngine.close()

    engineRef.current = newEngine
    // Phase 51-02 (D-11 step 2): swap the proxy source to the new engine's clock.
    // After this call, clock.now() delegates to the new AC's currentTime. This fires
    // BEFORE the onSessionClockReanchored and onReanchorRequired callbacks (D-11 ordering).
    proxyMemoRef.current.setSource(newEngine.clock)
    // Phase 50 D-11 + revision 1 Blocker #1: re-subscribe the three handlers against the
    // new engine's clock. The old engine's subscriptions were torn down at the top of this
    // callback (before nulling engineRef). The new Set never inherits state from the old
    // (each createAudioSessionClock owns its own subscriber Sets — Plan 50-01).
    const unsubResume = newEngine.clock.onResume(handleResume)
    const unsubSuspend = newEngine.clock.onSuspend(handleSuspend)
    const unsubClose = newEngine.clock.onClose(handleClose)
    clockUnsubsRef.current = [unsubResume, unsubSuspend, unsubClose]
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
    // AH-WR-04: repopulate firstInCueTimeRef against the reconstructed engine's
    // origin. reconstructEngine() nulled it above (alongside engineRef) so a
    // setMuted()/start() racing the await would not deref a stale anchor. Left
    // null, a post-reconstruction defensive start() call would return raw null,
    // which App.tsx aliases as "AC failed" (D-10) — misreporting a healthy
    // reconstructed engine as broken. newEngine.clock.now() is the live anchor for the
    // reconstructed AC (same value handed to the re-anchor callback below). Phase 50:
    // reads through the SessionClock seam per D-11; byte-identical to the prior
    // newEngine.now() per D-03 Option A (clock.now() returns the AC's currentTime).
    const reanchorAudioTime = newEngine.clock.now()
    firstInCueTimeRef.current = reanchorAudioTime
    // Phase 51-02 (D-11 step 3): fire onSessionClockReanchored BEFORE onReanchorRequired.
    // D-11 ordering: session-clock reanchor fires first (useSessionEngine rewrites
    // startedAtSec), then the audio-anchor reanchor (useBreathingSessionController
    // resets audioAnchorRef). This ensures session elapsed is preserved before the
    // audio scheduling path re-anchors.
    onSessionClockReanchoredRef.current?.(reanchorAudioTime)
    onReanchorRequiredRef.current?.(reanchorAudioTime)
    // The new AC starts in 'running' via the WR-06 constructor path. Set
    // audioStatus = 'ok' synchronously — the clock's resume subscriber will also
    // fire but may race with the React render.
    visibilityResumeAttemptedRef.current = false
    setAudioStatus('ok')
    setAudioAvailable(true)
  }, [handleResume, handleSuspend, handleClose])

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
    // AH-WR-02: a consumer reading audioStatus === 'needs-resume' while the
    // engine has already been closed (engineRef.current === null) would
    // otherwise hit a silent no-op — the resume affordance becomes a dead
    // button with no state transition and no user feedback. Surface the
    // terminal 'unavailable' status so the UI drops the affordance and falls
    // back to the visuals-only path (Phase 3 D-10) instead of stalling.
    if (engineRef.current === null) {
      setAudioStatus('unavailable')
      setAudioAvailable(false)
      return
    }
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
    // Phase 50 D-11: read through the SessionClock seam (engine.clock.now()) per D-03
    // Option A — byte-identical to the prior engineRef.current?.now() (the AC's currentTime).
    return engineRef.current?.clock.now() ?? null
  }, [])

  const playEndChord = useCallback((): void => {
    engineRef.current?.playEndChord()
  }, [])

  return {
    status,
    audioAvailable,
    muted,
    clock: proxyClock,
    start,
    stop,
    setMuted,
    notifyPhaseBoundary,
    audioNow,
    playEndChord,
    audioStatus,
    resume,
  }
}
