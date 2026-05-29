import { useCallback, useEffect, useMemo, useRef, useState } from 'react'

import {
  LOOKAHEAD_MIN_CUES,
  LOOKAHEAD_WINDOW_SEC,
  SAFE_LEAD_SEC,
} from '../audio/audioEngine'
import { createBreathingPlan } from '../domain/breathingPlan'
import { walkFutureCues } from '../domain/sessionAudio'
import type { BreathingSessionPhase, LeadInDigit } from '../domain/sessionLifecycle'
import { getSessionFrame, type SessionFrame } from '../domain/sessionMath'
import type { CueStyleId, SessionSettings, StretchSettings } from '../domain/settings'
import { buildStretchSegments, getStretchFrame } from '../domain/stretchRamp'
import {
  loadMute,
  loadPrefs,
  recordResonantSession,
  recordStretchSession,
  saveMute,
  saveResonantSettings,
  type PracticeId,
} from '../storage'
import { useAudioCues, type AudioStatusFlag } from './useAudioCues'
import { clearScheduledTimeouts, scheduleLeadInTimeouts } from './leadInCountdown'
import { useSessionEngine, type SessionEngine } from './useSessionEngine'
import type { UseWakeLock } from './useWakeLock'

export type { BreathingSessionPhase, LeadInDigit } from '../domain/sessionLifecycle'

export interface BreathingAudioControls {
  muted: boolean
  audioAvailable: boolean
  audioStatus: AudioStatusFlag
  onMuteOrResumeClick(this: void): Promise<void>
}

export interface BreathingSessionController {
  session: SessionEngine
  phase: BreathingSessionPhase
  inSessionView: boolean
  leadInDigit: LeadInDigit | null
  leadInPlaceholderFrame: SessionFrame | null
  sessionCue: CueStyleId | null
  endDialogOpen: boolean
  audio: BreathingAudioControls
  setSelectedSettings(this: void, next: SessionSettings): void
  startOrCancel(this: void): Promise<void>
  requestEnd(this: void): void
  confirmEnd(this: void): void
  cancelEnd(this: void): void
  resetSession(this: void): void
}

export interface UseBreathingSessionControllerArgs {
  initialSettings: SessionSettings
  activePractice: PracticeId
  stretchSettings: StretchSettings
  liveCue: CueStyleId
  wakeLock: UseWakeLock
  /** Phase 49.1 D-08: optional bypass-silent-mode flag threaded from
   *  featureFlags.bypassSilentMode (wired in Plan 03 via useAppViewModel).
   *  Until Plan 03 supplies the value, undefined passes through to
   *  useAudioCues.start → audioEngine → D-07 undefined-coerces-to-true
   *  → Phase 49 v3 behavior preserved (acceptable wave-1 → wave-2 gap state). */
  bypassSilentMode?: boolean
}

export function useBreathingSessionController({
  initialSettings,
  activePractice,
  stretchSettings,
  liveCue,
  wakeLock,
  bypassSilentMode,
}: UseBreathingSessionControllerArgs): BreathingSessionController {
  const initialMute = useMemo<boolean>(() => loadMute(), [])
  const activeStretchSettings = activePractice === 'stretch' ? stretchSettings : null

  const [phase, setPhase] = useState<BreathingSessionPhase>('idle')
  const [leadInDigit, setLeadInDigit] = useState<LeadInDigit | null>(null)
  const [sessionCue, setSessionCue] = useState<CueStyleId | null>(null)
  const [endDialogOpen, setEndDialogOpen] = useState<boolean>(false)

  const audioAnchorRef = useRef<number | null>(null)
  const planRef = useRef<ReturnType<typeof createBreathingPlan> | null>(null)
  const startGenerationRef = useRef<number>(0)
  const leadInTimeoutsRef = useRef<number[]>([])
  const recordedSessionKeyRef = useRef<string | null>(null)
  const sessionCueRef = useRef<CueStyleId | null>(null)
  const sessionFrameRef = useRef<SessionFrame | null>(null)

  const onAudioReanchorRequired = useCallback((newAudioAnchor: number): void => {
    // Phase 50-02 (D-02 ms→sec cascade): liveFrame.elapsedSec is seconds-shaped at
    // the source — subtract it directly from the new audio anchor (no `/1000`).
    const elapsedSec = sessionFrameRef.current?.elapsedSec ?? 0
    audioAnchorRef.current = newAudioAnchor - elapsedSec
  }, [])

  // Phase 51-02 (D-10/D-11): bridge from useAudioCues.onSessionClockReanchored to
  // useSessionEngine.reanchorSessionClock. Defined via a stable callback that reads
  // through sessionReanchorRef so the callback identity is fixed for useAudioCues's
  // dep tracking, even though `session` itself is created on the line below.
  const sessionReanchorRef = useRef<((newClockNow: number) => void) | null>(null)
  const onSessionClockReanchored = useCallback((newClockNow: number): void => {
    sessionReanchorRef.current?.(newClockNow)
  }, [])

  // Phase 51-02: audio precedes session (D-05 hook ordering — audio.clock is the
  // SessionClock seam useSessionEngine reads from). Today the audio-backed proxy
  // exists from first render (initial source is a wall clock) and swaps to the
  // AC clock inside useAudioCues.start() (D-05).
  const audio = useAudioCues(initialMute, onAudioReanchorRequired, onSessionClockReanchored)
  const session = useSessionEngine(initialSettings, activeStretchSettings, audio.clock)
  const { state } = session

  useEffect(() => {
    sessionFrameRef.current = session.liveFrame
  }, [session.liveFrame])

  useEffect(() => {
    sessionReanchorRef.current = session.reanchorSessionClock
  }, [session.reanchorSessionClock])

  const audioStop = audio.stop
  const audioStart = audio.start
  const audioTopUpLookahead = audio.topUpLookahead
  const audioCancelFutureCues = audio.cancelFutureCues
  const audioNow = audio.audioNow
  const audioPlayEndChord = audio.playEndChord
  const audioStatus = audio.audioStatus
  const audioResume = audio.resume
  // WR-02 (Plan 06): audioMuted threaded into the top-up effect dep array so the
  // effect re-evaluates its muted guard when mute state changes. The muted guard
  // inside the effect body gates BOTH cancel and top-up symmetrically (D-10 locked
  // decision: "unmute waits for boundary").
  const audioMuted = audio.muted
  const audioSetMuted = audio.setMuted
  const wakeLockRequest = wakeLock.request
  const wakeLockRelease = wakeLock.release
  const sessionStart = session.start
  const sessionEnd = session.end
  const sessionSetSelectedSettings = session.setSelectedSettings

  const inSessionView = phase !== 'idle'

  const leadInPlaceholderFrame = useMemo((): SessionFrame | null => {
    if (phase !== 'lead-in') return null

    if (activePractice === 'stretch') {
      return getStretchFrame(buildStretchSegments(stretchSettings), 0)
    }

    return getSessionFrame(createBreathingPlan(state.selectedSettings), 0)
  }, [phase, activePractice, stretchSettings, state.selectedSettings])

  const clearLeadInTimeouts = useCallback((): void => {
    clearScheduledTimeouts(leadInTimeoutsRef.current)
    leadInTimeoutsRef.current = []
  }, [])

  const clearCapturedSession = useCallback((): void => {
    audioAnchorRef.current = null
    planRef.current = null
    sessionCueRef.current = null
    setSessionCue(null)
  }, [])

  const setSelectedSettings = useCallback((next: SessionSettings): void => {
    sessionSetSelectedSettings(next)
    saveResonantSettings(next)
  }, [sessionSetSelectedSettings])

  const persistedSetMuted = useCallback((next: boolean): void => {
    audioSetMuted(next)
    saveMute(next)
  }, [audioSetMuted])

  const onMuteOrResumeClick = useCallback(async (): Promise<void> => {
    if (audioStatus === 'needs-resume') {
      await audioResume()
    }
    persistedSetMuted(!audioMuted)
  }, [audioStatus, audioResume, audioMuted, persistedSetMuted])

  useEffect(() => {
    if (state.status !== 'running' && endDialogOpen) {
      // Reason: dialog visibility mirrors the session status owned by useSessionEngine.
      // eslint-disable-next-line react-hooks/set-state-in-effect
      setEndDialogOpen(false)
    }
  }, [state.status, endDialogOpen])

  const startOrCancel = useCallback(async (): Promise<void> => {
    if (phase === 'lead-in') {
      startGenerationRef.current += 1
      clearLeadInTimeouts()
      setLeadInDigit(null)
      setPhase('idle')
      clearCapturedSession()
      await Promise.allSettled([audioStop(), wakeLockRelease()])
      return
    }

    if (phase !== 'idle') return

    const generation = ++startGenerationRef.current
    sessionCueRef.current = liveCue
    setSessionCue(liveCue)
    setPhase('lead-in')
    setLeadInDigit(3)
    void wakeLockRequest()

    const plan = createBreathingPlan(state.selectedSettings)
    planRef.current = plan
    const capturedTimbre = loadPrefs().timbre
    // Phase 49.1 D-08: pass bypassSilentMode as the 3rd arg to useAudioCues.start.
    // It flows into createAudioEngine via bypassSilentModeRef (Task 2 of Plan 02).
    const firstInAudioTime = await audioStart(plan, capturedTimbre, bypassSilentMode)

    if (generation !== startGenerationRef.current) {
      await audioStop()
      return
    }

    leadInTimeoutsRef.current = scheduleLeadInTimeouts({
      onDigit: setLeadInDigit,
      onComplete: () => {
        setLeadInDigit(null)
        audioAnchorRef.current = firstInAudioTime
        setPhase('running')
        sessionStart()
      },
    })
  }, [
    phase,
    liveCue,
    state.selectedSettings,
    audioStart,
    audioStop,
    wakeLockRequest,
    wakeLockRelease,
    sessionStart,
    clearLeadInTimeouts,
    clearCapturedSession,
    bypassSilentMode,
  ])

  const runningNeedsConfirmation =
    state.status === 'running' &&
    (state.lockedSettings.durationMinutes !== 'open-ended' || state.stretchSegments !== null)

  const requestEnd = useCallback((): void => {
    if (runningNeedsConfirmation) {
      setEndDialogOpen(true)
      return
    }
    sessionEnd()
    void audioStop()
  }, [runningNeedsConfirmation, sessionEnd, audioStop])

  const confirmEnd = useCallback((): void => {
    setEndDialogOpen(false)
    sessionEnd()
    void audioStop()
  }, [sessionEnd, audioStop])

  const cancelEnd = useCallback((): void => {
    setEndDialogOpen(false)
  }, [])

  const resetSession = useCallback((): void => {
    sessionEnd()
  }, [sessionEnd])

  // Phase 50-02 (D-02 ms→sec cascade): CompleteSessionState.completedAtSec is
  // seconds-shaped; storage's recordResonantSession / recordStretchSession still
  // accept ms-shaped values (out of scope for this rename — see Plan 50-02
  // `<acceptance_criteria>`: "Storage layer untouched"). The boundary conversion
  // (× 1000) lives here, at the consumer-to-storage edge. This is the ONLY
  // ms-shaped value emitted from this hook; everywhere else in the running-
  // session chain is seconds-shaped end-to-end.
  const completedAtSec = state.status === 'complete' ? state.completedAtSec : null
  const runningSnapshotRefStable = session.runningSnapshotRef
  useEffect(() => {
    if (state.status === 'running') return

    if (state.status === 'complete') {
      audioPlayEndChord()
    }

    void audioStop()
    void wakeLockRelease()
    // Reason: phase mirrors the session status owned by useSessionEngine.
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setPhase('idle')
    clearLeadInTimeouts()
    clearCapturedSession()

    const snap = runningSnapshotRefStable.current
    if (snap !== null && recordedSessionKeyRef.current !== snap.key) {
      const isComplete = state.status === 'complete'
      const elapsedSec =
        isComplete && completedAtSec !== null
          ? completedAtSec - snap.startedAtSec
          : snap.lastElapsedSec
      // Storage layer expects ms-shaped values (recordResonantSession /
      // recordStretchSession bodies do `Math.floor(elapsedMs / 1000)` internally).
      // Convert at this boundary only — the in-memory chain stays seconds-shaped.
      const elapsedMs = elapsedSec * 1000

      if (activePractice === 'stretch') {
        recordStretchSession(elapsedMs, isComplete)
      } else {
        recordResonantSession(elapsedMs, isComplete)
      }
      recordedSessionKeyRef.current = snap.key
    }
  }, [
    state.status,
    completedAtSec,
    runningSnapshotRefStable,
    activePractice,
    audioStop,
    audioPlayEndChord,
    wakeLockRelease,
    clearLeadInTimeouts,
    clearCapturedSession,
  ])

  // Phase 52 D-04: top-up trigger — replaces the boundary-detection effect (L325-364).
  // On every session frame change (rAF tick), compute the next N cue audioTimes from
  // the anchor via walkFutureCues and dispatch via engine.topUpLookahead.
  // Preserves load-bearing patterns from the original boundary effect:
  //   1. phase !== 'running' early return (guards lead-in + post-end)
  //   2. audioAnchor === null gate (anchor is null until lead-in onComplete at L224)
  //   3. plan === null gate (mirrors prior null guard)
  // D-12: session stays 'running' through hidden windows — queued cues self-terminate
  // via cueSynth envelope (cueSynth.ts L89-95, UNCHANGED).
  //
  // stretchSegmentsForTopUp: derive a dep-array-safe value by narrowing outside the
  // effect. IdleSessionState has no stretchSegments property; accessing it directly in
  // the dep array causes a TS2339 error with tsc -b. The local const is typed as
  // StretchSegment[] | null | undefined and is stable-referentially when idle (undefined).
  const stretchSegmentsForTopUp =
    state.status === 'running' || state.status === 'complete'
      ? state.stretchSegments
      : undefined
  useEffect(() => {
    if (phase !== 'running') return

    // WR-02 (Plan 06): symmetric muted guard — gate BOTH cancel and top-up on the muted
    // flag. Pre-fix: cancelFutureCues ran unconditionally while topUpLookahead was gated,
    // causing asymmetric behavior (each boundary emptied the queue but never refilled).
    // Per locked CONTEXT.md D-10 decision ("unmute waits for boundary"), the correct UX is:
    // while muted, neither cancel nor top-up runs (symmetric no-op). On unmute, this effect
    // re-runs (audioMuted is in the dep array) and the next boundary triggers cancel+top-up.
    if (audioMuted) return

    const frame = session.currentFrame
    if (frame === null) return

    const audioAnchor = audioAnchorRef.current
    const plan = planRef.current
    if (audioAnchor === null || plan === null) return

    // D-07: session-elapsed relative to anchor for D-14 window computation
    const elapsedSec = frame.elapsedSec

    // Stretch sessions expose segments via state.stretchSegments (set by startStretchSession).
    // stretchSegmentsForTopUp is derived above from the narrowed state union (safe for TS).
    const segments = stretchSegmentsForTopUp ?? undefined

    // D-14: timed sessions trim the lookahead at plan.totalSec so no cue is queued
    // past the session end. Open-ended sessions (plan.totalSec === null) use undefined.
    const targetSec = plan.totalSec ?? undefined

    const cues = walkFutureCues({
      audioAnchor,
      elapsedSec,
      fromCycleIndex: frame.cycleIndex,
      fromPhase: frame.phase,
      plan,
      segments,
      lookaheadWindowSec: LOOKAHEAD_WINDOW_SEC,
      minCues: LOOKAHEAD_MIN_CUES,
      targetSec,
    })

    // CR-01-FIX Plan 05: cancel-then-reschedule (SCHED-05 doctrine D-10): cancel all future
    // cues in the engine's activeCues queue BEFORE dispatching the new walk so consecutive
    // overlapping topUpLookahead walks cannot accumulate duplicate OscillatorNode chains.
    audioCancelFutureCues()

    // CR-01-FIX Plan 06 (dispatch-site filter): after cancel-then-reschedule, still filter
    // the cue list against the live audio clock. cancelFutureCues skips cues that have
    // already started (scheduledAt <= audioNow) — those cues remain in the engine. The first
    // cue of the new walk typically corresponds to the just-crossed boundary whose cue was
    // already in-flight. Re-dispatching it produces a double-strike / flam: two OscillatorNode
    // chains striking the same bowl a few ms apart (CR-01 race window described in 52-REVIEW.md).
    //
    // Fix: keep only cues whose audioTime is strictly ahead of audioNow + SAFE_LEAD_SEC
    // (i.e., not yet started and not imminently starting). When audioNow is null (AC unavailable
    // / before start), pass all cues unchanged — degrade gracefully.
    //
    // SAFE_LEAD_SEC is the same symbol used by the engine's callee-side clamp — imported as a
    // named symbol, never a hard-coded literal (Tiger Style no-magic-numbers).
    const liveAudioNow = audioNow()
    const freshCues = liveAudioNow === null
      ? cues
      : cues.filter((c) => c.audioTime > liveAudioNow + SAFE_LEAD_SEC)

    audioTopUpLookahead(freshCues)
  }, [phase, session.currentFrame, audioTopUpLookahead, audioCancelFutureCues, audioNow, audioMuted, stretchSegmentsForTopUp])

  useEffect(() => {
    return () => {
      clearLeadInTimeouts()
    }
  }, [clearLeadInTimeouts])

  return {
    session,
    phase,
    inSessionView,
    leadInDigit,
    leadInPlaceholderFrame,
    sessionCue,
    endDialogOpen,
    audio: {
      muted: audio.muted,
      audioAvailable: audio.audioAvailable,
      audioStatus: audio.audioStatus,
      onMuteOrResumeClick,
    },
    setSelectedSettings,
    startOrCancel,
    requestEnd,
    confirmEnd,
    cancelEnd,
    resetSession,
  }
}
