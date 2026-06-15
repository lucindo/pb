import { describe, expect, it } from 'vitest'

import { type SessionFrame } from '../domain'
import {
  getBreathingPrimaryAction,
  getBreathingPresentation,
  getSessionPrimaryActionLabel,
} from './sessionPresentation'
import { UI_STRINGS } from '../content/strings'

// SessionFrame is seconds-shaped.
const frame: SessionFrame = {
  phase: 'in',
  phaseLabel: 'In',
  elapsedSec: 0,
  remainingSec: 600,
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
      bpm: 5.5,
      ratio: '40:60',
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
      bpm: 5.5,
      ratio: '40:60',
    })

    expect(model.shape).toEqual({ cue: 'nose', frame: null, leadInDigit: 3 })
    expect(model.readout).toMatchObject({
      frame,
      isLeadInPlaceholder: true,
    })
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
    expect(getSessionPrimaryActionLabel('end', UI_STRINGS.en.practice.controls)).toBe('End')
    expect(getSessionPrimaryActionLabel('cancel', UI_STRINGS['pt-BR'].practice.controls)).toBe('Cancelar')
  })
})
