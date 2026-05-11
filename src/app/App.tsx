import { useCallback, useEffect, useMemo, useRef, useState } from 'react'

import { BreathingShape } from '../components/BreathingShape'
import { EndSessionDialog } from '../components/EndSessionDialog'
import { SettingsForm } from '../components/SettingsForm'
import { SessionReadout } from '../components/SessionReadout'
import { SessionControls } from '../components/SessionControls'
import { StatsFooter } from '../components/StatsFooter'
import { ResetStatsDialog } from '../components/ResetStatsDialog'
import { useSessionEngine } from '../hooks/useSessionEngine'
import { useAudioCues } from '../hooks/useAudioCues'
import { useWakeLock } from '../hooks/useWakeLock'
import { createBreathingPlan } from '../domain/breathingPlan'
import { getSessionFrame } from '../domain/sessionMath'
import {
  LEAD_IN_DURATION_MS,
  LEAD_IN_TICK_INTERVAL_MS,
} from '../audio/audioEngine'
import {
  loadSettings,
  saveSettings,
  loadMute,
  saveMute,
  loadStats,
  recordSession,
  resetStats,
  ZERO_STATS,
  type PersistedStats,
} from '../storage'
import type { SessionSettings } from '../domain/settings'

// Phase 3 D-13: appPhase gates whether useSessionEngine.start() has been called.
// 'lead-in' is BEFORE the session timing clock starts (preserves SESS-05).
type AppPhase = 'idle' | 'lead-in' | 'running'

export default function App() {
  // Phase 4 LOCL-01: restore persisted settings + mute at mount.
  // useMemo([]) ensures one synchronous read per app load, before children mount.
  const initialSettings = useMemo<SessionSettings>(() => loadSettings(), [])
  const initialMute = useMemo<boolean>(() => loadMute(), [])

  // Phase 4 LOCL-02: stats are loaded once at mount, then mutated through three
  // sites (recordSession at end-transition, resetStats from the dialog, and the
  // initial loadStats here). React state holds the current snapshot for rendering.
  const [stats, setStats] = useState<PersistedStats>(() => loadStats())
  const [resetDialogOpen, setResetDialogOpen] = useState<boolean>(false)

  const session = useSessionEngine(initialSettings)
  const { state } = session
  const [endDialogOpen, setEndDialogOpen] = useState<boolean>(false)
  // Anchor for Pitfall 2 dual-clock alignment. Captured at lead-in completion (t=0).
  // - audioAnchorRef.current = the firstInAudioTime returned by audioStart (deterministic
  //   on the audio clock — WR-01) → null if AC unavailable (D-10 fallback)
  // Read by Task 1b's boundary effect to compute each cue's audio-clock time from the breathing plan.
  // (WR-03: the previously-paired sessionAnchorMsRef was orphaned — set in three places, never
  //  read — so it was deleted along with its writes.)
  // Plan 06: declared BEFORE useAudioCues so the onAudioReanchorRequired callback (which
  // writes audioAnchorRef.current on engine reconstruction — D-35) can close over the ref.
  const audioAnchorRef = useRef<number | null>(null)
  // Plan 06 D-35: pass the re-anchor receiver — fires on engine reconstruction (NOT plain
  // resume). The callback writes the new AC's currentTime to audioAnchorRef.current so the
  // dual-anchor (Phase 3 D-13/D-14) is re-established against the new origin. The new
  // useCallback identity is captured via the hook's onReanchorRequiredRef so closure churn
  // does not bypass the latest callback.
  //
  // Plan 06 Task 8 UAT cycle 2 — kitchen-sink fix (2026-05-10): the boundary effect
  // computes `audioTime = audioAnchor + boundaryStartMs/1000` where boundaryStartMs is
  // the absolute offset from SESSION start (cycle * cycleMs + maybe inhaleMs). When
  // reconstruction fires mid-session, the new AC.currentTime ≈ 0 while session-elapsed
  // has accumulated lockDuration + pre-lock seconds. If we set audioAnchor = newAC.now()
  // (≈ 0), the formula evaluates to a large audioTime far in the new AC's future and
  // cues schedule past the visual boundary window (real-device diagnostic showed
  // deltas growing 9s → 26s → 57s). Subtract the session-elapsed visual offset so the
  // formula yields audioTime ≈ newAC.currentTime at the upcoming boundary — i.e., the
  // next cue plays at the right perceptual moment relative to the next visual phase.
  const sessionFrameRef = useRef(session.currentFrame)
  useEffect(() => {
    sessionFrameRef.current = session.currentFrame
  }, [session.currentFrame])
  const onAudioReanchorRequired = useCallback((newAudioAnchor: number) => {
    const elapsedMs = sessionFrameRef.current?.elapsedMs ?? 0
    // D-35: write the new AC currentTime (offset by session-elapsed) to the
    // dual-anchor ref. Subsequent boundary cues schedule against this new
    // origin. D-35a: do NOT replay lead-in here — the session continues to
    // the next phase boundary via the existing boundary effect.
    audioAnchorRef.current = newAudioAnchor - elapsedMs / 1000
  }, [])
  const audio = useAudioCues(initialMute, onAudioReanchorRequired) // Phase 3 + Plan 06 D-35
  const wakeLock = useWakeLock() // Phase 5: imperative resource — D-11/D-12 (no React state surface)

  // Phase 3 D-14: appPhase + leadInDigit drive the 3-2-1 lead-in visual.
  const [appPhase, setAppPhase] = useState<AppPhase>('idle')
  // True for both lead-in and running: the "session view" layout (settings
  // collapsed to Duration only, page description hidden, tighter top margin).
  // Without this the countdown 3-2-1 fires on the configuration screen, then
  // the layout snaps to the running view at t=0 — a jarring jump.
  const inSessionView = appPhase !== 'idle'
  // Pre-session readout chip shown during lead-in so the layout doesn't shift
  // when the In phase begins. Synthesises an elapsed=0 frame from the locked
  // settings (Remaining = configured duration; Elapsed 0:00 for open-ended).
  const leadInPlaceholderFrame = useMemo(() => {
    if (appPhase !== 'lead-in') return null
    return getSessionFrame(createBreathingPlan(state.selectedSettings), 0)
  }, [appPhase, state.selectedSettings])
  // null when not in lead-in OR when the lead-in has reached t=0 (the In phase label takes over).
  const [leadInDigit, setLeadInDigit] = useState<3 | 2 | 1 | null>(null)

  // CR-01: cancel-during-lead-in race guard. onStartClick is async (awaits AC creation).
  // Between setAppPhase('lead-in') and the await resolving, the user can re-click — the
  // cancel branch flips appPhase back to 'idle' and calls audioStop(). When the original
  // chain resumes, it would otherwise schedule timeouts that flip appPhase back to
  // 'running' on a session the user already cancelled. Bumping startGenerationRef in
  // both branches and re-checking after the await lets the post-await continuation abort.
  const startGenerationRef = useRef(0)

  // The breathing plan captured at session start. Stored in a ref so Task 1b's boundary effect
  // can read cycleMs/inhaleMs/exhaleMs to compute boundary start times (per Pitfall 2 fix from
  // checker B1: boundary start times come from the PLAN, not from frame.elapsedMs at render time).
  const planRef = useRef<ReturnType<typeof createBreathingPlan> | null>(null)

  // Refs to track in-flight lead-in timeouts so end-during-lead-in can cancel them cleanly.
  const leadInTimeoutsRef = useRef<number[]>([])

  // Track the LAST cycleIndex+phase we scheduled audio for, to avoid double-scheduling.
  // SessionFrame can re-render multiple times within the same phase tick (rAF + state updates).
  // Read by Task 1b boundary effect.
  const lastBoundaryKeyRef = useRef<string | null>(null)

  // Phase 4 LOCL-02: capture the running session's startedAtMs + lastElapsedMs
  // each render WHILE running, so the cleanup effect (which fires AFTER the
  // transition out of running) can compute elapsed without losing the previous
  // startedAtMs to the discriminated union narrowing. Updated by the snapshot
  // effect below; READ by the cleanup effect.
  const runningSnapshotRef = useRef<{
    key: string
    startedAtMs: number
    lastElapsedMs: number
  } | null>(null)

  // Pitfall 1 idempotency guard: keyed on state.startedAtMs (unique per session
  // generation since performance.now() does not repeat). Prevents the cleanup
  // effect from double-writing if React re-runs it on dependency drift.
  const recordedSessionKeyRef = useRef<string | null>(null)

  // useAudioCues returns a fresh object literal each render, but its individual
  // function fields are wrapped in useCallback([]) so their identities are stable.
  // Hoist the stable references so effects can depend on them without re-firing
  // every render (the bug: depending on `audio` made the complete useEffect run on
  // each render while status was 'complete', repeatedly resetting appPhase to
  // 'idle' AND destroying the engine that onStartClick had just rebuilt).
  const audioStop = audio.stop
  const audioStart = audio.start
  const audioNotifyPhaseBoundary = audio.notifyPhaseBoundary
  // useWakeLock returns a fresh object literal each render but `request`/`release`
  // are useCallback([])-stable. Hoist the same way as audio (App.tsx:114-122) so the
  // state.status !== 'running' cleanup effect can depend on `wakeLockRelease` without
  // re-firing every render.
  const wakeLockRequest = wakeLock.request
  const wakeLockRelease = wakeLock.release

  // Phase 4 LOCL-01: wrap setSelectedSettings + setMuted to persist on every change.
  // The wrapped functions are passed to children in place of the raw setters.
  const sessionSetSelectedSettings = session.setSelectedSettings
  const audioSetMuted = audio.setMuted

  const persistedSetSettings = useCallback((next: SessionSettings) => {
    sessionSetSelectedSettings(next)
    saveSettings(next)
  }, [sessionSetSelectedSettings])

  const persistedSetMuted = useCallback((next: boolean) => {
    audioSetMuted(next)
    saveMute(next)
  }, [audioSetMuted])

  // Plan 06 D-31 / D-33: gesture-attached recovery click handler.
  // When audioStatus === 'needs-resume', the click IS a user gesture — chain
  // audio.resume() synchronously inside this handler so the iOS gesture context
  // spans the engine.resume() (and any escalation to reconstruction inside
  // useAudioCues.resume()) call (Pitfall 2 — no setTimeout/Promise.then break
  // between the click event and audio.resume()).
  // D-31: also fires for unmute clicks during needs-resume — a user who
  // instinctively un-mutes after lock/unlock gets recovery for free.
  // When audioStatus !== 'needs-resume', this collapses to the pre-Plan-06
  // persistedSetMuted(!audio.muted) behavior verbatim.
  const onMuteOrResumeClick = useCallback(async () => {
    if (audio.audioStatus === 'needs-resume') {
      await audio.resume()
    }
    persistedSetMuted(!audio.muted)
  }, [audio.audioStatus, audio.resume, audio.muted, persistedSetMuted])

  // WR-01: Auto-close the confirmation modal when the session leaves the running
  // state on its own (e.g. timer reaches the end while the modal is open). Without
  // this, the modal would float over a "Session complete" readout for an arbitrary
  // window until the user dismissed it.
  // The setState below is intentional: status is owned by useSessionEngine (an
  // external system from this component's POV) so reacting to its change with a
  // local-state update is the documented React pattern for "subscribe + reflect".
  useEffect(() => {
    if (state.status !== 'running' && endDialogOpen) {
      // eslint-disable-next-line react-hooks/set-state-in-effect
      setEndDialogOpen(false)
    }
  }, [state.status, endDialogOpen])

  const clearLeadInTimeouts = useCallback(() => {
    for (const id of leadInTimeoutsRef.current) {
      window.clearTimeout(id)
    }
    leadInTimeoutsRef.current = []
  }, [])

  // Per checker W4: the primary button label is LOCKED to 'Start session' during lead-in
  // (Phase 1 D-11 copy lock). The cancel-during-lead-in path is routed THROUGH this onStart
  // handler because session.status is still 'idle' during lead-in (SESS-05 — useSessionEngine
  // has not yet been started). SessionControls dispatches onClick by status; idle → onStart.
  // So onStartClick handles BOTH the start-from-idle case AND the cancel-during-lead-in case.
  const onStartClick = useCallback(async () => {
    // Cancel-during-lead-in branch (Open Question 2 option (a) + checker W4):
    if (appPhase === 'lead-in') {
      // CR-01: invalidate any in-flight start whose await audioStart(plan) is still
      // pending. The post-await continuation re-checks startGenerationRef and aborts
      // when the token has been bumped.
      startGenerationRef.current += 1
      clearLeadInTimeouts()
      setLeadInDigit(null)
      setAppPhase('idle')
      audioAnchorRef.current = null
      planRef.current = null
      void audioStop()
      void wakeLockRelease() // Phase 5 D-07/D-08: idempotent if no lock held
      return
    }
    if (appPhase !== 'idle') return // defensive: ignore clicks during running (handled by onEnd)

    // CR-01: stamp this start's generation token before any await — the cancel branch
    // bumps the same ref, so the post-await continuation can detect "I was cancelled"
    // by comparing local generation against the ref's current value.
    const generation = ++startGenerationRef.current

    setAppPhase('lead-in')
    setLeadInDigit(3)
    // Phase 5 D-01/D-02: parallel with audioStart, fire-and-forget. Failures
    // (rejection, no API) update internal hook state but do not block lead-in.
    void wakeLockRequest()

    // D-09: AudioContext is constructed inside this user-gesture-derived chain.
    const plan = createBreathingPlan(state.selectedSettings)
    planRef.current = plan // stored for Task 1b boundary computation
    const firstInAudioTime = await audioStart(plan)
    // firstInAudioTime is null if AC failed (D-10) — visuals-only path.
    // The lead-in setTimeout chain still runs in either case so the visual countdown
    // is independent of audio availability.

    // CR-01: if the user clicked Start again while we were awaiting AC creation, the
    // cancel branch already ran (cleared timeouts, reset appPhase, called audioStop).
    // Tear down the freshly-built engine and abort BEFORE scheduling timeouts — otherwise
    // the timeouts would later flip appPhase back to 'running' and start the session the
    // user just cancelled.
    if (generation !== startGenerationRef.current) {
      void audioStop()
      return
    }

    // WR-04: drive these from the shared LEAD_IN_TICK_INTERVAL_MS / LEAD_IN_DURATION_MS
    // exports so a future tweak to the lead-in length stays in lockstep across the
    // visual countdown, the audio ticks, and the audio anchor.
    const t1 = window.setTimeout(() => setLeadInDigit(2), 1 * LEAD_IN_TICK_INTERVAL_MS)
    const t2 = window.setTimeout(() => setLeadInDigit(1), 2 * LEAD_IN_TICK_INTERVAL_MS)
    const t3 = window.setTimeout(() => {
      // t=0: lead-in done. Switch to running. SESS-05: session.start() is called HERE,
      // not at the original Start button-press. The session clock begins now.
      setLeadInDigit(null)
      // WR-01: capture the audio anchor from the deterministic firstInAudioTime returned
      // by audioStart, NOT from a re-query of audioNow() inside this setTimeout callback.
      // setTimeout(LEAD_IN_DURATION_MS) overshoots its deadline by 4-16 ms (more under
      // load); reading audioCtx.currentTime in the overshoot window gave an anchor that
      // was late by that delta, and every subsequent boundary inherited the drift on top
      // of the rAF jitter. firstInAudioTime is sample-accurate on the audio clock
      // (= engine.now() + LEAD_IN_DURATION_SEC at schedule time). null when AC unavailable
      // → Task 1b's effect treats null as "skip cue scheduling" (D-10 visuals-only fallback).
      audioAnchorRef.current = firstInAudioTime
      setAppPhase('running')
      session.start()
    }, LEAD_IN_DURATION_MS)
    leadInTimeoutsRef.current = [t1, t2, t3]
  }, [appPhase, state.selectedSettings, audioStart, audioStop, wakeLockRequest, wakeLockRelease, session, clearLeadInTimeouts])

  // D-14: open-ended sessions still end directly; only timed sessions raise the modal.
  // D-13: when the modal opens, the session timing clock keeps running (no session.pause; no setTimeout).
  // Phase 3 D-11: also stop audio on open-ended/post-complete end paths.
  // This handler is only invoked by SessionControls when status === 'running' (the session has
  // started and the button label has flipped to 'End session'). Cancel-during-lead-in is handled
  // by onStartClick (above) because session.status is still 'idle' during the lead-in window.
  const requestEnd = useCallback(() => {
    if (state.status === 'running' && state.lockedSettings.durationMinutes !== 'open-ended') {
      setEndDialogOpen(true)
      return
    }
    session.end()
    void audioStop() // D-11
  }, [state, session, audioStop])

  // WR-02: memoize so EndSessionDialog's cancel-listener effect (depends on
  // [onCancel]) does not tear down and re-attach on every parent render.
  // App re-renders on every animation frame while a session is running, which
  // would otherwise produce hundreds of addEventListener/removeEventListener
  // pairs per second on long sessions.
  // Note: depend on session.end (which is stable — useSessionEngine wraps it in
  // useCallback([])) rather than session itself. The session object literal is
  // re-created each render, so [session] would not memoize.
  const sessionEnd = session.end
  const confirmEnd = useCallback(() => {
    setEndDialogOpen(false)
    sessionEnd()
    void audioStop() // D-11: AC closed on modal-confirm end
  }, [sessionEnd, audioStop])

  const cancelEnd = useCallback(() => {
    setEndDialogOpen(false)
    // session continues — clock keeps running (D-13). No additional work.
  }, [])

  const onResetClick = useCallback(() => {
    setResetDialogOpen(true)
  }, [])

  const confirmReset = useCallback(() => {
    // WR-08: optimistic UI — set RAM state from a known zero-state, not from
    // a re-read of disk. If resetStats() fails silently (D-16 quota / Safari
    // ITP / private mode), the disk still holds the OLD stats; loadStats()
    // would return them; the footer would keep showing them despite the
    // user clicking Reset. RAM-side state must reflect the user's intent
    // regardless of disk-write success — same posture as Phase 3 D-10.
    resetStats()           // D-11: stats only (settings + mute survive)
    setStats(ZERO_STATS)   // optimistic — disk may or may not have synced
    setResetDialogOpen(false)
  }, [])

  const cancelReset = useCallback(() => {
    setResetDialogOpen(false)
  }, [])

  // Phase 4 LOCL-02: keep runningSnapshotRef fresh on every render while running.
  // Reads state.startedAtMs and state.lastFrame.elapsedMs (both available only on
  // RunningSessionState — discriminated-union narrowing on `state.status === 'running'`
  // is required for TypeScript). The snapshot is consumed by the cleanup effect on
  // transition out of running.
  useEffect(() => {
    if (state.status === 'running') {
      runningSnapshotRef.current = {
        key: String(state.startedAtMs),
        startedAtMs: state.startedAtMs,
        lastElapsedMs: state.lastFrame.elapsedMs,
      }
    }
  }, [state])

  // D-11 + D-16: when the session reaches 'complete', the last cue tail naturally rings out
  // (cues already scheduled in the audio thread; AC.close() resolves after they finish).
  // Reset appPhase to 'idle' so the orb stops rendering the last frame, and clear the dual anchors.
  // The setState below is intentional: state.status is owned by useSessionEngine and its
  // 'complete' transition is the external trigger we synchronise with — exactly the
  // "subscribe to external state" effect pattern React recommends.
  useEffect(() => {
    if (state.status !== 'running') {
      // Covers BOTH 'complete' (timed end-of-session) and 'idle' (manual End,
      // modal-confirm End, open-ended End). All four lifecycle exits must
      // reset appPhase + clear engine/anchor refs — otherwise appPhase stays
      // 'running' after End and the next Start click silently no-ops on the
      // `appPhase !== 'idle'` guard in onStartClick.
      void audioStop()
      void wakeLockRelease() // Phase 5 D-07: single-write release site (D-08 idempotent)
      // eslint-disable-next-line react-hooks/set-state-in-effect
      setAppPhase('idle')
      clearLeadInTimeouts()
      audioAnchorRef.current = null
      planRef.current = null
      lastBoundaryKeyRef.current = null

      // Phase 4 LOCL-02: single write site for stats (Pitfall 1).
      // - For 'complete': elapsed = state.completedAtMs - snap.startedAtMs (sample-accurate)
      // - For 'idle' (manual End): elapsed = snap.lastElapsedMs (last rAF reading; <16ms stale)
      // The snap-null guard handles cancel-during-lead-in (D-03 / Pitfall 2): when the user
      // never entered 'running', runningSnapshotRef was never populated and we skip the write.
      // The recordedSessionKeyRef guard makes the write idempotent per session — protects
      // against React re-running the effect under StrictMode or dep-drift.
      const snap = runningSnapshotRef.current
      if (snap !== null && recordedSessionKeyRef.current !== snap.key) {
        const isComplete = state.status === 'complete'
        const elapsedMs = isComplete
          ? state.completedAtMs - snap.startedAtMs
          : snap.lastElapsedMs
        const updated = recordSession(elapsedMs, isComplete)
        // eslint-disable-next-line react-hooks/set-state-in-effect
        setStats(updated)
        recordedSessionKeyRef.current = snap.key
      }
      runningSnapshotRef.current = null
    }
  }, [state, audioStop, wakeLockRelease, clearLeadInTimeouts])

  // Phase 3 D-12 + Pitfall 2 dual-anchor invariant: 1-cue lookahead.
  // On every cycleIndex/phase transition in SessionFrame, schedule the corresponding In/Out cue
  // at its EXACT audio-clock time, computed from the dual anchor captured at lead-in completion
  // PLUS the boundary's deterministic offset derived from the breathing plan.
  //
  // Per checker B1 fix: the boundary start time MUST come from the plan (cycleIndex * cycleMs +
  // phase offset), NOT from frame.elapsedMs at render time. Reading the rAF-driven elapsedMs is
  // the self-invalidating "main-thread clock" anti-pattern that Pitfall 2 explicitly warns
  // against: rAF jitter (±16 ms) becomes audio jitter (audible). The audio thread's job is to
  // schedule cues at deterministic instants on the audio clock; the main-thread effect's job is
  // to compute those instants from the source-of-truth plan.
  //
  // Per checker B2 fix: when audioAnchorRef.current is null (AC unavailable), this effect is a
  // no-op — the visual session continues without audio. This is the D-10 fallback path.
  useEffect(() => {
    if (appPhase !== 'running') {
      lastBoundaryKeyRef.current = null
      return
    }
    const frame = session.currentFrame
    if (frame === null) return
    const key = `${frame.cycleIndex}:${frame.phase}`
    if (lastBoundaryKeyRef.current === key) return
    lastBoundaryKeyRef.current = key

    // Skip the very first In phase: its cue was already scheduled inside audio.start() at the
    // lead-in anchor (firstInAudioTime). cycleIndex=0 + phase='in' is the t=0 moment we covered.
    if (frame.cycleIndex === 0 && frame.phase === 'in') return

    const audioAnchor = audioAnchorRef.current
    const plan = planRef.current
    // D-10 fallback: AC unavailable → no-op (visual session continues uninterrupted).
    if (audioAnchor === null || plan === null) return

    // Compute boundary start time from the plan (NOT from frame.elapsedMs).
    // boundaryStartMs is the elapsed offset from session t=0 to the start of THIS phase.
    // - For In phase (start of cycle N): cycleIndex * cycleMs
    // - For Out phase (after In within cycle N): cycleIndex * cycleMs + inhaleMs
    const boundaryStartMs =
      frame.cycleIndex * plan.cycleMs +
      (frame.phase === 'in' ? 0 : plan.inhaleMs)

    // Convert to audio-clock time using the dual anchor captured at lead-in completion.
    const audioTime = audioAnchor + boundaryStartMs / 1000

    // 260510-tc9 Bug 2: pass the UPCOMING phase's duration so the bowl-cue decay
    // envelope stretches with the phase length at low BPM (avoids silent tail
    // before the next boundary at BPM ≤ 3.5). The engine + cueSynth clamp the
    // value so default short-phase cues are unchanged and very long phases
    // do not drone.
    const phaseDurationSec =
      (frame.phase === 'in' ? plan.inhaleMs : plan.exhaleMs) / 1000

    audioNotifyPhaseBoundary({ newPhase: frame.phase, audioTime, phaseDurationSec })
  }, [appPhase, session.currentFrame, audioNotifyPhaseBoundary])

  // Cleanup pending lead-in timeouts on unmount (Pitfall 3 leak guard).
  useEffect(() => {
    return () => {
      clearLeadInTimeouts()
    }
  }, [clearLeadInTimeouts])

  return (
    <main className="min-h-screen bg-[radial-gradient(circle_at_top,_var(--color-breathing-bg-soft),_var(--color-breathing-bg)_48%,_var(--color-breathing-bg-edge))] px-4 py-6 text-slate-900 sm:px-6 sm:py-8">
      <section className="mx-auto flex min-h-[calc(100vh-3rem)] max-w-3xl flex-col items-center justify-center text-center sm:min-h-[calc(100vh-4rem)]">
        <p className="mb-4 text-sm font-semibold uppercase tracking-[0.35em] text-teal-700">
          HRV practice
        </p>
        <h1 className="text-4xl font-semibold tracking-tight text-slate-950 sm:text-5xl">
          HRV breathing timer
        </h1>
        {/* Hide page description for the entire session view (lead-in + running)
            so the screen stops shifting between countdown and the first In phase
            and the orb + End-session button stay above the fold on mobile. */}
        {!inSessionView && (
          <p className="mt-6 max-w-2xl text-lg leading-8 text-slate-700">
            Choose a calm, supported timing pattern, then start a continuous inhale
            and exhale session with no pauses.
          </p>
        )}
        <div className={`${inSessionView ? 'mt-6' : 'mt-10'} w-full rounded-[2rem] border border-white/80 bg-white/70 p-5 shadow-[var(--shadow-breathing-card)] backdrop-blur sm:p-6`}>
          {/* Phase 3 D-14: lead-in numeral takes over the orb area when appPhase==='lead-in' */}
          <BreathingShape
            frame={appPhase === 'running' ? session.currentFrame : null}
            leadInDigit={appPhase === 'lead-in' ? leadInDigit : null}
          />
          <SessionReadout
            frame={leadInPlaceholderFrame ?? session.currentFrame}
            // During lead-in, the underlying state.status may still be 'complete'
            // from the prior session (session.start() doesn't fire until t3).
            // Override to 'idle' so SessionReadout renders the placeholder
            // Remaining chip instead of pinning the stale "Session complete"
            // headline + hiding the timer.
            status={appPhase === 'lead-in' ? 'idle' : state.status}
            message={state.status === 'complete' && !inSessionView ? state.message : undefined}
          />
          <SettingsForm
            settings={state.selectedSettings}
            isRunning={inSessionView}
            onChange={persistedSetSettings}
            onExtendDuration={session.extendDuration}
          />
          <SessionControls
            status={state.status}
            onStart={onStartClick}
            onEnd={requestEnd}
            muted={audio.muted}
            audioAvailable={audio.audioAvailable}
            needsResume={audio.audioStatus === 'needs-resume'}
            onMuteToggle={onMuteOrResumeClick}
          />
          {/* Plan 06 D-32b: aria-live region for the needs-resume state transition.
              Lives at the App level (discretion #6) so the announcement fires once on
              transition, not on every MuteToggle re-render. Empty string when not in
              needs-resume mode — React's reconciler suppresses no-op updates. */}
          <div
            role="status"
            aria-live="polite"
            className="sr-only"
          >
            {audio.audioStatus === 'needs-resume' ? 'Audio paused, tap to resume' : ''}
          </div>
          <p className="mt-4 text-sm leading-6 text-slate-600">
            Timing stays local to this browser and continuously alternates In and Out with no
            pause segment.
          </p>
        </div>
        {!inSessionView && stats.totalSessions > 0 && (
          <StatsFooter stats={stats} onResetClick={onResetClick} />
        )}
      </section>
      <EndSessionDialog
        open={endDialogOpen}
        onConfirm={confirmEnd}
        onCancel={cancelEnd}
      />
      <ResetStatsDialog
        open={resetDialogOpen}
        onConfirm={confirmReset}
        onCancel={cancelReset}
      />
    </main>
  )
}
