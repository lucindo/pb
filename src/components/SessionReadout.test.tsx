import '@testing-library/jest-dom/vitest'
import { render, screen } from '@testing-library/react'
import { describe, expect, it } from 'vitest'

import type { SessionFrame } from '../domain/sessionMath'
import { SessionReadout, type SessionReadoutProps } from './SessionReadout'
import { UI_STRINGS } from '../content/strings'

const EN_STRINGS_FIXTURE = UI_STRINGS.en

// Sample frame with a non-null remainingMs for timed session scenarios.
// 600_000 ms remaining → formatDuration renders "10:00".
const sampleFrame: SessionFrame = {
  phase: 'in',
  phaseLabel: 'In',
  elapsedMs: 0,
  remainingMs: 600_000,
  phaseProgress: 0,
  cycleIndex: 0,
  isComplete: false,
}

function renderReadout(props: Partial<SessionReadoutProps> = {}) {
  return render(
    <SessionReadout
      frame={props.frame ?? null}
      status={props.status ?? 'idle'}
      showCompletionHeadline={props.showCompletionHeadline}
      strings={props.strings ?? EN_STRINGS_FIXTURE.readout}
      isLeadInPlaceholder={props.isLeadInPlaceholder}
    />,
  )
}

describe('SessionReadout', () => {
  it('isLeadInPlaceholder=true + non-null frame → renders timer chip (label + formatted duration)', () => {
    renderReadout({ isLeadInPlaceholder: true, frame: sampleFrame, status: 'idle' })
    expect(screen.getByText('Remaining')).toBeInTheDocument()
    expect(screen.getByText('10:00')).toBeInTheDocument()
  })

  it('isLeadInPlaceholder=true + status "complete" + non-null frame → timer chip still rendered (placeholder wins)', () => {
    renderReadout({
      isLeadInPlaceholder: true,
      frame: sampleFrame,
      status: 'complete',
      showCompletionHeadline: true,
    })
    expect(screen.getByText('Remaining')).toBeInTheDocument()
    expect(screen.getByText('10:00')).toBeInTheDocument()
    expect(screen.queryByText(EN_STRINGS_FIXTURE.readout.sessionComplete)).not.toBeInTheDocument()
  })

  it('isLeadInPlaceholder=false + status "complete" + non-null frame → translated headline rendered, chip hidden', () => {
    renderReadout({
      isLeadInPlaceholder: false,
      frame: sampleFrame,
      status: 'complete',
      showCompletionHeadline: true,
    })
    expect(screen.getByText(EN_STRINGS_FIXTURE.readout.sessionComplete)).toBeInTheDocument()
    expect(screen.queryByText('Remaining')).not.toBeInTheDocument()
  })

  it('isLeadInPlaceholder absent + status "idle" + null frame + no completion headline → component returns null', () => {
    const { container } = renderReadout({ status: 'idle', frame: null })
    expect(container.firstChild).toBeNull()
  })
})
