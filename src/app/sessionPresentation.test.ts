import { describe, expect, it } from 'vitest'

import { DEFAULT_NK_SETTINGS, type SessionFrame } from '../domain'
import {
  getBreathingPrimaryAction,
  getBreathingPresentation,
  getNaviKriyaPresentation,
  getNaviKriyaPrimaryAction,
  getSessionPrimaryActionLabel,
} from './sessionPresentation'
import { UI_STRINGS } from '../content/strings'

const frame: SessionFrame = {
  phase: 'in',
  phaseLabel: 'In',
  elapsedMs: 0,
  remainingMs: 600_000,
  phaseProgress: 0,
  cycleIndex: 0,
  isComplete: false,
}

describe('breathing presentation model', () => {
  it('uses the session cue during a running session and hides completion while in session view', () => {
    const model = getBreathingPresentation({
      phase: 'running',
      sessionCue: 'arrow',
      liveCue: 'labels',
      leadInDigit: null,
      leadInPlaceholderFrame: null,
      liveFrame: frame,
      status: 'running',
      inSessionView: true,
    })

    expect(model.shape).toEqual({ cue: 'arrow', frame, leadInDigit: null })
    expect(model.readout).toMatchObject({
      frame,
      status: 'running',
      isLeadInPlaceholder: false,
      showCompletionHeadline: false,
    })
  })

  it('uses the lead-in placeholder frame and live cue before the session starts', () => {
    const model = getBreathingPresentation({
      phase: 'lead-in',
      sessionCue: null,
      liveCue: 'nose',
      leadInDigit: 3,
      leadInPlaceholderFrame: frame,
      liveFrame: null,
      status: 'idle',
      inSessionView: true,
    })

    expect(model.shape).toEqual({ cue: 'nose', frame: null, leadInDigit: 3 })
    expect(model.readout).toMatchObject({
      frame,
      isLeadInPlaceholder: true,
    })
  })
})

describe('Navi Kriya presentation model', () => {
  it('models the countdown state as an orb plus a front-phase readout', () => {
    const model = getNaviKriyaPresentation({
      sessionActive: true,
      starting: true,
      leadInDigit: 2,
      phase: 'idle',
      round: 1,
      count: 0,
      running: false,
      settings: DEFAULT_NK_SETTINGS,
      justCompleted: false,
      liveCue: 'labels',
    })

    expect(model.shape).toEqual({ kind: 'orb', cue: 'labels', leadInDigit: 2 })
    expect(model.readout).toEqual({
      phase: 'front',
      round: 1,
      totalRounds: DEFAULT_NK_SETTINGS.rounds,
      count: 0,
      target: DEFAULT_NK_SETTINGS.frontCount,
    })
    expect(model.showCompletionHeadline).toBe(false)
  })

  it('models a back-phase count state with the derived back target', () => {
    const model = getNaviKriyaPresentation({
      sessionActive: true,
      starting: false,
      leadInDigit: null,
      phase: 'back',
      round: 2,
      count: 12,
      running: true,
      settings: DEFAULT_NK_SETTINGS,
      justCompleted: false,
      liveCue: 'labels',
    })

    expect(model.shape).toEqual({
      kind: 'count',
      key: 'nk-12',
      count: 12,
      phase: 'back',
      isPaused: false,
    })
    expect(model.readout?.target).toBe(DEFAULT_NK_SETTINGS.frontCount / 4)
  })

  it('models completion without inventing a readout', () => {
    const model = getNaviKriyaPresentation({
      sessionActive: false,
      starting: false,
      leadInDigit: null,
      phase: 'done',
      round: 1,
      count: 0,
      running: false,
      settings: DEFAULT_NK_SETTINGS,
      justCompleted: true,
      liveCue: 'nose',
    })

    expect(model.shape).toEqual({ kind: 'orb', cue: 'nose', leadInDigit: null })
    expect(model.readout).toBeNull()
    expect(model.showCompletionHeadline).toBe(true)
  })
})

describe('Navi Kriya primary action model', () => {
  it('prioritizes cancel during countdown, then end while active, then start while idle', () => {
    expect(getNaviKriyaPrimaryAction({ starting: true, sessionActive: true })).toBe('cancel')
    expect(getNaviKriyaPrimaryAction({ starting: false, sessionActive: true })).toBe('end')
    expect(getNaviKriyaPrimaryAction({ starting: false, sessionActive: false })).toBe('start')
  })
})

describe('breathing primary action model', () => {
  it('prioritizes end while running, then cancel during lead-in, then start while idle', () => {
    expect(getBreathingPrimaryAction({ status: 'running', inLeadIn: true })).toBe('end')
    expect(getBreathingPrimaryAction({ status: 'idle', inLeadIn: true })).toBe('cancel')
    expect(getBreathingPrimaryAction({ status: 'idle', inLeadIn: false })).toBe('start')
  })
})

describe('session primary action label', () => {
  it('maps action ids to localized control copy', () => {
    expect(getSessionPrimaryActionLabel('start', UI_STRINGS.en.practice.controls)).toBe('Start')
    expect(getSessionPrimaryActionLabel('end', UI_STRINGS.en.practice.controls)).toBe('End session')
    expect(getSessionPrimaryActionLabel('cancel', UI_STRINGS['pt-BR'].practice.controls)).toBe('Cancelar')
  })
})
