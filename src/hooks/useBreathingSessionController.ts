import { useCallback, useEffect, useMemo, useRef, useState } from 'react'

import {
  SAFE_LEAD_SEC,
} from '../audio/audioEngine'
import { createBreathingPlan } from '../domain/breathingPlan'
import { computeBoundaryAudioOffsets } from '../domain/sessionAudio'
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
}

export function useBreathingSessionController({
  initialSettings,
  activePractice,
  stretchSettings,
  liveCue,
  wakeLock,
}: UseBreathingSessionControllerArgs): BreathingSessionController {
  const initialMute = useMemo<boolean>(() => loadMute(), [])
  const activeStretchSettings = activePractice === 'stretch' ? stretchSettings : null
  const session = useSessionEngine(initialSettings, activeStretchSettings)
  const { state } = session

  const [phase, setPhase] = useState<BreathingSessionPhase>('idle')
  const [leadInDigit, setLeadInDigit] = useState<LeadInDigit | null>(null)
  const [sessionCue, setSessionCue] = useState<CueStyleId | null>(null)
  const [endDialogOpen, setEndDialogOpen] = useState<boolean>(false)

  const audioAnchorRef = useRef<number | null>(null)
  const planRef = useRef<ReturnType<typeof createBreathingPlan> | null>(null)
  const startGenerationRef = useRef<number>(0)
  const leadInTimeoutsRef = useRef<number[]>([])
  const lastBoundaryKeyRef = useRef<string | null>(null)
  const recordedSessionKeyRef = useRef<string | null>(null)
  const sessionCueRef = useRef<CueStyleId | null>(null)
  const sessionFrameRef = useRef(session.liveFrame)

  useEffect(() => {
    sessionFrameRef.current = session.liveFrame
  }, [session.liveFrame])

  const onAudioReanchorRequired = useCallback((newAudioAnchor: number): void => {
    const elapsedMs = sessionFrameRef.current?.elapsedMs ?? 0
    audioAnchorRef.current = newAudioAnchor - elapsedMs / 1000
  }, [])

  const audio = useAudioCues(initialMute, onAudioReanchorRequired)

  const audioStop = audio.stop
  const audioStart = audio.start
  const audioNotifyPhaseBoundary = audio.notifyPhaseBoundary
  const audioPlayEndChord = audio.playEndChord
  const audioStatus = audio.audioStatus
  const audioResume = audio.resume
  const audioMuted = audio.muted
  const audioAudioNow = audio.audioNow
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
    lastBoundaryKeyRef.current = null
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
    const firstInAudioTime = await audioStart(plan, capturedTimbre)

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

  const completedAtMs = state.status === 'complete' ? state.completedAtMs : null
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
      const elapsedMs =
        isComplete && completedAtMs !== null
          ? completedAtMs - snap.startedAtMs
          : snap.lastElapsedMs

      if (activePractice === 'stretch') {
        recordStretchSession(elapsedMs, isComplete)
      } else {
        recordResonantSession(elapsedMs, isComplete)
      }
      recordedSessionKeyRef.current = snap.key
    }
  }, [
    state.status,
    completedAtMs,
    runningSnapshotRefStable,
    activePractice,
    audioStop,
    audioPlayEndChord,
    wakeLockRelease,
    clearLeadInTimeouts,
    clearCapturedSession,
  ])

  useEffect(() => {
    if (phase !== 'running') {
      lastBoundaryKeyRef.current = null
      return
    }

    const frame = session.currentFrame
    if (frame === null) return

    const key = `${String(frame.cycleIndex)}:${frame.phase}`
    if (lastBoundaryKeyRef.current === key) return
    lastBoundaryKeyRef.current = key

    if (frame.cycleIndex === 0 && frame.phase === 'in') return

    const audioAnchor = audioAnchorRef.current
    const plan = planRef.current
    if (audioAnchor === null && plan !== null) {
      lastBoundaryKeyRef.current = null
      return
    }
    if (audioAnchor === null || plan === null) return

    const { boundaryStartMs, phaseDurationSec } = computeBoundaryAudioOffsets(frame, plan)
    const liveAudioNow = audioAudioNow()
    if (liveAudioNow === null) return

    const audioTime = audioAnchor + boundaryStartMs / 1000
    audioNotifyPhaseBoundary({
      newPhase: frame.phase,
      audioTime: Math.max(audioTime, liveAudioNow + SAFE_LEAD_SEC),
      phaseDurationSec,
    })
  }, [phase, session.currentFrame, audioNotifyPhaseBoundary, audioAudioNow])

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
