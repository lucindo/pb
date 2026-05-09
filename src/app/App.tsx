import { useCallback, useEffect, useRef, useState } from 'react'

import { BreathingShape } from '../components/BreathingShape'
import { EndSessionDialog } from '../components/EndSessionDialog'
import { SettingsForm } from '../components/SettingsForm'
import { SessionReadout } from '../components/SessionReadout'
import { SessionControls } from '../components/SessionControls'
import { useSessionEngine } from '../hooks/useSessionEngine'
import { useAudioCues } from '../hooks/useAudioCues'
import { createBreathingPlan } from '../domain/breathingPlan'

// Phase 3 D-13: appPhase gates whether useSessionEngine.start() has been called.
// 'lead-in' is BEFORE the session timing clock starts (preserves SESS-05).
type AppPhase = 'idle' | 'lead-in' | 'running'

export default function App() {
  const session = useSessionEngine()
  const { state } = session
  const isRunning = state.status === 'running'
  const [endDialogOpen, setEndDialogOpen] = useState<boolean>(false)
  const audio = useAudioCues() // Phase 3: audio engine

  // Phase 3 D-14: appPhase + leadInDigit drive the 3-2-1 lead-in visual.
  const [appPhase, setAppPhase] = useState<AppPhase>('idle')
  // null when not in lead-in OR when the lead-in has reached t=0 (the In phase label takes over).
  const [leadInDigit, setLeadInDigit] = useState<3 | 2 | 1 | null>(null)

  // Anchors for Pitfall 2 dual-clock alignment. Captured at lead-in completion (t=0).
  // - audioAnchorRef.current = audio.audioNow() at t=0 → null if AC unavailable (D-10 fallback)
  // - sessionAnchorMsRef.current = performance.now() at t=0 → matches what useSessionEngine
  //   captures internally when session.start() runs in the same setTimeout callback.
  // Read by Task 1b's boundary effect to compute each cue's audio-clock time from the breathing plan.
  const audioAnchorRef = useRef<number | null>(null)
  const sessionAnchorMsRef = useRef<number | null>(null)

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
      clearLeadInTimeouts()
      setLeadInDigit(null)
      setAppPhase('idle')
      audioAnchorRef.current = null
      sessionAnchorMsRef.current = null
      planRef.current = null
      void audio.stop()
      return
    }
    if (appPhase !== 'idle') return // defensive: ignore clicks during running (handled by onEnd)

    setAppPhase('lead-in')
    setLeadInDigit(3)

    // D-09: AudioContext is constructed inside this user-gesture-derived chain.
    const plan = createBreathingPlan(state.selectedSettings)
    planRef.current = plan // stored for Task 1b boundary computation
    await audio.start(plan)
    // The returned firstInAudioTime is null if AC failed (D-10) — visuals-only path.
    // The lead-in setTimeout chain still runs in either case so the visual countdown
    // is independent of audio availability.

    const t1 = window.setTimeout(() => setLeadInDigit(2), 1000)
    const t2 = window.setTimeout(() => setLeadInDigit(1), 2000)
    const t3 = window.setTimeout(() => {
      // t=0: lead-in done. Switch to running. SESS-05: session.start() is called HERE,
      // not at the original Start button-press. The session clock begins now.
      setLeadInDigit(null)
      // Capture dual anchor (Pitfall 2) for boundary-aware audio scheduling in Task 1b.
      // audioAnchorRef stays null when AC unavailable — Task 1b's effect treats null as
      // "skip cue scheduling" (D-10 visuals-only fallback).
      audioAnchorRef.current = audio.audioNow() // null if AC unavailable
      sessionAnchorMsRef.current = performance.now()
      setAppPhase('running')
      session.start()
    }, 3000)
    leadInTimeoutsRef.current = [t1, t2, t3]
  }, [appPhase, state.selectedSettings, audio, session, clearLeadInTimeouts])

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
    void audio.stop() // D-11
  }, [state, session, audio])

  // WR-02: memoize so EndSessionDialog's cancel-listener effect (depends on
  // [onCancel]) does not tear down and re-attach on every parent render.
  // App re-renders on every animation frame while a session is running, which
  // would otherwise produce hundreds of addEventListener/removeEventListener
  // pairs per second on long sessions.
  // Note: depend on session.end (which is stable — useSessionEngine wraps it in
  // useCallback([])) rather than session itself. The session object literal is
  // re-created each render, so [session] would not memoize.
  const sessionEnd = session.end
  const audioStop = audio.stop // capture for memoization stability
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
    if (state.status === 'complete') {
      void audio.stop()
      // eslint-disable-next-line react-hooks/set-state-in-effect
      setAppPhase('idle')
      clearLeadInTimeouts()
      audioAnchorRef.current = null
      sessionAnchorMsRef.current = null
      planRef.current = null
      lastBoundaryKeyRef.current = null
    }
  }, [state.status, audio, clearLeadInTimeouts])

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
        {/* F1: hide page description during running session so the orb + End
            session button reach above the fold on common mobile heights
            (375x812+). The description is informational and not needed mid-practice. */}
        {!isRunning && (
          <p className="mt-6 max-w-2xl text-lg leading-8 text-slate-700">
            Choose a calm, supported timing pattern, then start a continuous inhale
            and exhale session with no pauses.
          </p>
        )}
        <div className={`${isRunning ? 'mt-6' : 'mt-10'} w-full rounded-[2rem] border border-white/80 bg-white/70 p-5 shadow-[var(--shadow-breathing-card)] backdrop-blur sm:p-6`}>
          {/* Phase 3 D-14: lead-in numeral takes over the orb area when appPhase==='lead-in' */}
          <BreathingShape
            frame={appPhase === 'running' ? session.currentFrame : null}
            leadInDigit={appPhase === 'lead-in' ? leadInDigit : null}
          />
          <SessionReadout
            frame={session.currentFrame}
            status={state.status}
            message={state.status === 'complete' ? state.message : undefined}
          />
          <SettingsForm
            settings={state.selectedSettings}
            isRunning={isRunning}
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
