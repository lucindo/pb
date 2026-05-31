import { useCallback, useEffect, useRef, useState } from 'react'

import type { NaviKriyaSettings } from '../domain/naviKriyaSettings'
import type { NaviLeadInDigit } from '../domain/sessionLifecycle'
import {
  loadPrefs,
  recordNaviKriyaSession,
  saveNaviKriyaSettings,
  type PracticeId,
} from '../storage'
import {
  useNKEngine,
  type NKOnComplete,
} from './useNKEngine'
import { clearScheduledTimeouts, scheduleLeadInTimeouts } from './leadInCountdown'
import { useNaviKriyaAudio } from './useNaviKriyaAudio'
import type { UseWakeLock } from './useWakeLock'

export type { NaviLeadInDigit } from '../domain/sessionLifecycle'

export interface NaviKriyaSessionController {
  settings: NaviKriyaSettings
  phase: 'idle' | 'front' | 'back' | 'done'
  round: number
  count: number
  running: boolean
  starting: boolean
  leadInDigit: NaviLeadInDigit | null
  sessionActive: boolean
  justCompleted: boolean
  endDialogOpen: boolean
  setSettings(this: void, next: NaviKriyaSettings): void
  start(this: void): void
  cancelStart(this: void): void
  requestEnd(this: void): void
  confirmEnd(this: void): void
  cancelEnd(this: void): void
  clearCompletion(this: void): void
}

export interface UseNaviKriyaSessionControllerArgs {
  activePractice: PracticeId
  initialSettings: NaviKriyaSettings
  muted: boolean
  wakeLock: UseWakeLock
  /** Threaded from featureFlags.bypassSilentMode (default true). Routes NK cues
   *  through the iOS speaker with the hardware silent switch on — same as breathing. */
  bypassSilentMode?: boolean
}

export function useNaviKriyaSessionController({
  activePractice,
  initialSettings,
  muted,
  wakeLock,
  bypassSilentMode,
}: UseNaviKriyaSessionControllerArgs): NaviKriyaSessionController {
  // naviAudio MUST be called BEFORE nkEngine because nkEngine consumes
  // naviAudio.clock. useNKEngine receives the audio-backed proxy clock from
  // useNaviKriyaAudio.clock directly. Stats elapsedSec is AC-time-based when the
  // AC constructed cleanly; wall-clock fallback when AC construction failed
  // (mirrors HRV/Stretch).
  const naviAudio = useNaviKriyaAudio(muted, bypassSilentMode)
  const naviAudioBegin = naviAudio.begin
  const naviAudioClose = naviAudio.close
  const naviAudioCloseAfterEndCue = naviAudio.closeAfterEndCue
  // naviAudio.clock is the stable proxy (wall-clock pre-begin; AC-backed during
  // session; reverts to wall on close). useNKEngine holds this reference for
  // clock.now() reads at start/stepOm/end — only the SOURCE changes, not the
  // identity (proxy identity invariant holds).
  const nkEngine = useNKEngine(naviAudio.clock)
  const { nkPhase, nkRound, nkCount, nkRunning } = nkEngine
  const nkStart = nkEngine.start
  const nkEnd = nkEngine.end
  const nkToggleCue = nkEngine.toggleCue

  const [settings, setSettingsState] = useState<NaviKriyaSettings>(() => initialSettings)
  const [starting, setStarting] = useState<boolean>(false)
  const [leadInDigit, setLeadInDigit] = useState<NaviLeadInDigit | null>(null)
  const [justCompleted, setJustCompleted] = useState<boolean>(false)
  const [endDialogOpen, setEndDialogOpen] = useState<boolean>(false)

  const leadInTimeoutsRef = useRef<number[]>([])
  const recordedRef = useRef<boolean>(false)
  const settingsRef = useRef<NaviKriyaSettings>(settings)

  useEffect(() => {
    settingsRef.current = settings
  }, [settings])

  const wakeLockRequest = wakeLock.request
  const wakeLockRelease = wakeLock.release
  const sessionActive = activePractice === 'naviKriya' && (starting || nkPhase !== 'idle')

  const clearLeadInTimeouts = useCallback((): void => {
    clearScheduledTimeouts(leadInTimeoutsRef.current)
    leadInTimeoutsRef.current = []
  }, [])

  const onComplete = useCallback<NKOnComplete>((result) => {
    if (recordedRef.current) return
    recordedRef.current = true

    // Storage-boundary conversion: result.elapsedSec is seconds-shaped end-to-end
    // through the NK engine; recordNaviKriyaSession's API takes ms. Multiply at
    // this single consumer-to-storage edge; the in-memory chain stays
    // seconds-shaped.
    const elapsedMsForStorage = result.elapsedSec * 1000
    recordNaviKriyaSession(elapsedMsForStorage, result.completedRounds, result.isComplete)
    void wakeLockRelease()

    if (result.isComplete) {
      setJustCompleted(true)
      naviAudioCloseAfterEndCue()
      nkEnd()
      return
    }

    naviAudioClose()
  }, [wakeLockRelease, naviAudioCloseAfterEndCue, nkEnd, naviAudioClose])

  const setSettings = useCallback((next: NaviKriyaSettings): void => {
    if (next.perOmCue !== settings.perOmCue) {
      nkToggleCue(next.perOmCue)
    }
    setSettingsState(next)
    saveNaviKriyaSettings(next)
  }, [settings.perOmCue, nkToggleCue])

  const start = useCallback((): void => {
    if (sessionActive) return

    setEndDialogOpen(false)
    setJustCompleted(false)

    const audioSession = naviAudioBegin(() => loadPrefs().timbre)
    void wakeLockRequest()
    recordedRef.current = false
    setStarting(true)
    setLeadInDigit(3)

    audioSession.countdownTick()
    leadInTimeoutsRef.current = scheduleLeadInTimeouts({
      onDigit: (digit) => {
        setLeadInDigit(digit)
        audioSession.countdownTick()
      },
      onComplete: () => {
        setLeadInDigit(null)
        setStarting(false)
        nkStart(settingsRef.current, audioSession.callbacks, onComplete)
      },
    })
  }, [sessionActive, naviAudioBegin, wakeLockRequest, nkStart, onComplete])

  const cancelStart = useCallback((): void => {
    clearLeadInTimeouts()
    setLeadInDigit(null)
    setStarting(false)
    naviAudioClose()
    void wakeLockRelease()
  }, [clearLeadInTimeouts, naviAudioClose, wakeLockRelease])

  const requestEnd = useCallback((): void => {
    setEndDialogOpen(true)
  }, [])

  const confirmEnd = useCallback((): void => {
    setEndDialogOpen(false)
    nkEnd()
  }, [nkEnd])

  const cancelEnd = useCallback((): void => {
    setEndDialogOpen(false)
  }, [])

  const clearCompletion = useCallback((): void => {
    setJustCompleted(false)
  }, [])

  useEffect(() => {
    return () => {
      clearLeadInTimeouts()
    }
  }, [clearLeadInTimeouts])

  return {
    settings,
    phase: nkPhase,
    round: nkRound,
    count: nkCount,
    running: nkRunning,
    starting,
    leadInDigit,
    sessionActive,
    justCompleted,
    endDialogOpen,
    setSettings,
    start,
    cancelStart,
    requestEnd,
    confirmEnd,
    cancelEnd,
    clearCompletion,
  }
}
