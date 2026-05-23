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
}

export function useNaviKriyaSessionController({
  activePractice,
  initialSettings,
  muted,
  wakeLock,
}: UseNaviKriyaSessionControllerArgs): NaviKriyaSessionController {
  const nkEngine = useNKEngine()
  const { nkPhase, nkRound, nkCount, nkRunning } = nkEngine
  const nkStart = nkEngine.start
  const nkEnd = nkEngine.end
  const nkToggleCue = nkEngine.toggleCue
  const naviAudio = useNaviKriyaAudio(muted)
  const naviAudioBegin = naviAudio.begin
  const naviAudioClose = naviAudio.close
  const naviAudioCloseAfterEndCue = naviAudio.closeAfterEndCue

  const [settings, setSettingsState] = useState<NaviKriyaSettings>(() => initialSettings)
  const [starting, setStarting] = useState<boolean>(false)
  const [leadInDigit, setLeadInDigit] = useState<NaviLeadInDigit | null>(null)
  const [justCompleted, setJustCompleted] = useState<boolean>(false)
  const [endDialogOpen, setEndDialogOpen] = useState<boolean>(false)

  const leadInTimeoutsRef = useRef<number[]>([])
  const recordedRef = useRef<boolean>(false)

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

    recordNaviKriyaSession(result.elapsedMs, result.completedRounds, result.isComplete)
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
        nkStart(settings, audioSession.callbacks, onComplete)
      },
    })
  }, [sessionActive, naviAudioBegin, wakeLockRequest, settings, nkStart, onComplete])

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
