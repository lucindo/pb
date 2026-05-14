import '@testing-library/jest-dom/vitest'
import { render, screen } from '@testing-library/react'
import { describe, expect, it } from 'vitest'

import { BreathingShape } from './BreathingShape'
import type { SessionFrame } from '../domain/sessionMath'

// Sample frame for dispatcher-level smoke tests. BreathingShape.test.tsx
// only covers the dispatcher's idle null-return guard and the lead-in-priority
// routing. Structural assertions for OrbBody + OrbLeadIn live in OrbShape.test.tsx.
const sampleFrame: SessionFrame = {
  phase: 'in',
  phaseLabel: 'In',
  phaseProgress: 0,
  cycleIndex: 0,
  elapsedMs: 0,
  remainingMs: null,
  isComplete: false,
}

describe('BreathingShape', () => {
  it('renders null when both frame and leadInDigit are absent', () => {
    const { container } = render(<BreathingShape frame={null} />)
    expect(container.firstChild).toBeNull()
  })

  it('renders the breathing body when frame is provided', () => {
    render(<BreathingShape frame={sampleFrame} />)
    expect(screen.getByRole('img', { name: 'Breathing shape: In' })).toBeVisible()
  })

  it('renders the lead-in digit', () => {
    render(<BreathingShape frame={null} leadInDigit={3} />)
    expect(screen.getByRole('img', { name: 'Lead-in: 3' })).toBeVisible()
  })

  it('lead-in wins when both frame and leadInDigit are set (D-14 priority)', () => {
    render(<BreathingShape frame={sampleFrame} leadInDigit={2} />)
    expect(
      screen.queryByRole('img', { name: 'Breathing shape: In' }),
    ).not.toBeInTheDocument()
    expect(screen.getByRole('img', { name: 'Lead-in: 2' })).toBeVisible()
  })
})
