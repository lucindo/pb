import '@testing-library/jest-dom/vitest'
import { render, screen } from '@testing-library/react'
import { describe, expect, it } from 'vitest'

import type { SessionFrame } from '../domain'
import { SessionReadout } from './SessionReadout'
import { UI_STRINGS } from '../content/strings'
import type { UiStrings } from '../content/strings'

const EN_STRINGS_FIXTURE = UI_STRINGS.en

// 600 sec remaining → "10:00"; round 3 of 10 → secondary "3/10".
const sampleFrame: SessionFrame = {
  phase: 'inhale',
  phaseIndex: 0,
  phaseProgress: 0,
  round: 3,
  totalRounds: 10,
  elapsedSec: 0,
  remainingSec: 600,
  isComplete: false,
}

interface RenderReadoutProps {
  mode?: 'lead-in' | 'session'
  frame?: SessionFrame | null
  status?: 'idle' | 'running' | 'complete'
  showCompletionHeadline?: boolean
  strings?: UiStrings['practice']['readout']
}

function renderReadout(props: RenderReadoutProps = {}) {
  const strings = props.strings ?? EN_STRINGS_FIXTURE.practice.readout
  const frame = props.frame ?? null

  if (props.mode === 'lead-in') {
    return render(<SessionReadout mode="lead-in" frame={frame} strings={strings} />)
  }

  return render(
    <SessionReadout
      mode="session"
      frame={frame}
      status={props.status ?? 'idle'}
      showCompletionHeadline={props.showCompletionHeadline ?? false}
      strings={strings}
    />,
  )
}

describe('SessionReadout', () => {
  it('lead-in mode renders the time as primary and the round counter as secondary', () => {
    renderReadout({ mode: 'lead-in', frame: sampleFrame })
    expect(screen.getByText('10:00')).toBeInTheDocument()
    expect(screen.getByText('3/10')).toBeInTheDocument()
  })

  it('renders the infinity glyph for an open-ended round total', () => {
    renderReadout({ mode: 'session', status: 'running', frame: { ...sampleFrame, totalRounds: 'open-ended' } })
    expect(screen.getByText('3/∞')).toBeInTheDocument()
  })

  it('lead-in mode does not show the completion headline (owned by session mode)', () => {
    renderReadout({ mode: 'lead-in', frame: sampleFrame })
    expect(screen.queryByText(EN_STRINGS_FIXTURE.practice.readout.sessionComplete)).not.toBeInTheDocument()
  })

  it('session mode with showCompletionHeadline renders the headline and hides the time', () => {
    renderReadout({ frame: sampleFrame, status: 'complete', showCompletionHeadline: true })
    expect(screen.getByText(EN_STRINGS_FIXTURE.practice.readout.sessionComplete)).toBeInTheDocument()
    expect(screen.queryByText('10:00')).not.toBeInTheDocument()
  })

  it('session mode with status "idle", null frame, and no completion headline returns null', () => {
    const { container } = renderReadout({ status: 'idle', frame: null })
    expect(container.firstChild).toBeNull()
  })

  it('a completed session renders only the headline, no time / round counter', () => {
    renderReadout({ frame: sampleFrame, status: 'complete', showCompletionHeadline: true })
    expect(screen.queryByText('10:00')).not.toBeInTheDocument()
    expect(screen.queryByText('3/10')).not.toBeInTheDocument()
  })
})
