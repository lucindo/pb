import '@testing-library/jest-dom/vitest'
import { render, screen } from '@testing-library/react'
import { describe, expect, it } from 'vitest'

import type { SessionFrame } from '../domain/sessionMath'
import { SessionReadout, type SessionReadoutProps } from './SessionReadout'

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
      message={props.message}
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
      message: 'Session complete',
    })
    expect(screen.getByText('Remaining')).toBeInTheDocument()
    expect(screen.getByText('10:00')).toBeInTheDocument()
    expect(screen.queryByText('Session complete')).not.toBeInTheDocument()
  })

  it('isLeadInPlaceholder=false + status "complete" + non-null frame → headline rendered, chip hidden', () => {
    renderReadout({
      isLeadInPlaceholder: false,
      frame: sampleFrame,
      status: 'complete',
      message: 'Session complete',
    })
    expect(screen.getByText('Session complete')).toBeInTheDocument()
    expect(screen.queryByText('Remaining')).not.toBeInTheDocument()
  })

  it('isLeadInPlaceholder absent + status "idle" + null frame + no message → component returns null', () => {
    const { container } = renderReadout({ status: 'idle', frame: null })
    expect(container.firstChild).toBeNull()
  })
})
