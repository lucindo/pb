import { useCallback, useEffect, useMemo, useRef, useState } from 'react'

import { BreathingShape } from '../components/BreathingShape'
import { EndSessionDialog } from '../components/EndSessionDialog'
import { SettingsForm } from '../components/SettingsForm'
import { SessionReadout } from '../components/SessionReadout'
import { SessionControls } from '../components/SessionControls'
import { useSessionEngine } from '../hooks/useSessionEngine'
import { useAudioCues } from '../hooks/useAudioCues'
import { createBreathingPlan } from '../domain/breathingPlan'
import { getSessionFrame } from '../domain/sessionMath'
import {
  LEAD_IN_DURATION_MS,
  LEAD_IN_TICK_INTERVAL_MS,
} from '../audio/audioEngine'

// Phase 3 D-13: appPhase gates whether useSessionEngine.start() has been called.
// 'lead-in' is BEFORE the session timing clock starts (preserves SESS-05).
type AppPhase = 'idle' | 'lead-in' | 'running'

export default function App() {
  const session = useSessionEngine()
  const { state } = session
  const [endDialogOpen, setEndDialogOpen] = useState<boolean>(false)
  const audio = useAudioCues() // Phase 3: audio engine

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

  // Anchor for Pitfall 2 dual-clock alignment. Captured at lead-in completion (t=0).
  // - audioAnchorRef.current = audio.audioNow() at t=0 → null if AC unavailable (D-10 fallback)
  // Read by Task 1b's boundary effect to compute each cue's audio-clock time from the breathing plan.
  // (WR-03: the previously-paired sessionAnchorMsRef was orphaned — set in three places, never
  //  read — so it was deleted along with its writes.)
  const audioAnchorRef = useRef<number | null>(null)

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

  // useAudioCues returns a fresh object literal each render, but its individual
  // function fields are wrapped in useCallback([]) so their identities are stable.
  // Hoist the stable references so effects can depend on them without re-firing
  // every render (the bug: depending on `audio` made the complete useEffect run on
  // each render while status was 'complete', repeatedly resetting appPhase to
  // 'idle' AND destroying the engine that onStartClick had just rebuilt).
  const audioStop = audio.stop
  const audioStart = audio.start
  const audioNow = audio.audioNow
  const audioNotifyPhaseBoundary = audio.notifyPhaseBoundary

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
      return
    }
    if (appPhase !== 'idle') return // defensive: ignore clicks during running (handled by onEnd)

    // CR-01: stamp this start's generation token before any await — the cancel branch
    // bumps the same ref, so the post-await continuation can detect "I was cancelled"
    // by comparing local generation against the ref's current value.
    const generation = ++startGenerationRef.current

    setAppPhase('lead-in')
    setLeadInDigit(3)

    // D-09: AudioContext is constructed inside this user-gesture-derived chain.
    const plan = createBreathingPlan(state.selectedSettings)
    planRef.current = plan // stored for Task 1b boundary computation
    await audioStart(plan)
    // The returned firstInAudioTime is null if AC failed (D-10) — visuals-only path.
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
      // Capture dual anchor (Pitfall 2) for boundary-aware audio scheduling in Task 1b.
      // audioAnchorRef stays null when AC unavailable — Task 1b's effect treats null as
      // "skip cue scheduling" (D-10 visuals-only fallback).
      audioAnchorRef.current = audioNow() // null if AC unavailable
      setAppPhase('running')
      session.start()
    }, LEAD_IN_DURATION_MS)
    leadInTimeoutsRef.current = [t1, t2, t3]
  }, [appPhase, state.selectedSettings, audioStart, audioStop, audioNow, session, clearLeadInTimeouts])

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
      // eslint-disable-next-line react-hooks/set-state-in-effect
      setAppPhase('idle')
      clearLeadInTimeouts()
      audioAnchorRef.current = null
      planRef.current = null
      lastBoundaryKeyRef.current = null
    }
  }, [state.status, audioStop, clearLeadInTimeouts])

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

    audioNotifyPhaseBoundary({ newPhase: frame.phase, audioTime })
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
            status={state.status}
            message={state.status === 'complete' ? state.message : undefined}
          />
          <SettingsForm
            settings={state.selectedSettings}
            isRunning={inSessionView}
            onChange={session.setSelectedSettings}
            onExtendDuration={session.extendDuration}
          />
          <SessionControls
            status={state.status}
            onStart={onStartClick}
            onEnd={requestEnd}
            muted={audio.muted}
            audioAvailable={audio.audioAvailable}
            onMuteToggle={() => audio.setMuted(!audio.muted)}
          />
          <p className="mt-4 text-sm leading-6 text-slate-600">
            Timing stays local to this browser and continuously alternates In and Out with no
            pause segment.
          </p>
        </div>
      </section>
      <EndSessionDialog
        open={endDialogOpen}
        onConfirm={confirmEnd}
        onCancel={cancelEnd}
      />
    </main>
  )
}
