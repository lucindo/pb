import '@testing-library/jest-dom/vitest'
import { render, screen } from '@testing-library/react'
import { describe, expect, it } from 'vitest'

import { BreathingShape } from './BreathingShape'
import type { SessionFrame } from '../domain/sessionMath'

// Sample frame for the existing-Phase-2-behavior tests. `remainingMs` is part of
// the SessionFrame contract (src/domain/sessionMath.ts) — null for open-ended,
// a number for timed; either is fine here since BreathingShapeBody only reads
// phase/phaseLabel/phaseProgress.
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

  it('renders the BreathingShapeBody when frame is provided and leadInDigit is null', () => {
    render(<BreathingShape frame={sampleFrame} />)
    expect(screen.getByRole('img', { name: 'Breathing shape: In' })).toBeVisible()
  })

  it('renders the lead-in digit in the orb area when leadInDigit is set (3)', () => {
    render(<BreathingShape frame={null} leadInDigit={3} />)
    expect(screen.getByRole('img', { name: 'Lead-in: 3' })).toBeVisible()
    expect(screen.getByText('3')).toBeVisible()
  })

  it('renders the lead-in digit 2', () => {
    render(<BreathingShape frame={null} leadInDigit={2} />)
    expect(screen.getByRole('img', { name: 'Lead-in: 2' })).toBeVisible()
    expect(screen.getByText('2')).toBeVisible()
  })

  it('renders the lead-in digit 1', () => {
    render(<BreathingShape frame={null} leadInDigit={1} />)
    expect(screen.getByRole('img', { name: 'Lead-in: 1' })).toBeVisible()
    expect(screen.getByText('1')).toBeVisible()
  })

  it('lead-in wins when both frame and leadInDigit are set (D-14 priority)', () => {
    render(<BreathingShape frame={sampleFrame} leadInDigit={2} />)
    expect(
      screen.queryByRole('img', { name: 'Breathing shape: In' }),
    ).not.toBeInTheDocument()
    expect(screen.getByRole('img', { name: 'Lead-in: 2' })).toBeVisible()
  })

  it('lead-in keeps the orb at MID_SCALE (no scaling animation, scale(0.79))', () => {
    const { container } = render(<BreathingShape frame={null} leadInDigit={1} />)
    const orb = container.querySelector('.orb')
    expect(orb).not.toBeNull()
    expect(orb!.getAttribute('style')).toContain('scale(0.79)')
  })

  it('lead-in does not have data-phase or data-progress attributes (it is a neutral pre-state)', () => {
    const { container } = render(<BreathingShape frame={null} leadInDigit={3} />)
    const root = container.querySelector('[role="img"]')
    expect(root).not.toBeNull()
    expect(root!.getAttribute('data-phase')).toBeNull()
    expect(root!.getAttribute('data-progress')).toBeNull()
  })

  it('lead-in renders digit with text-7xl class (one step larger than the In/Out label)', () => {
    const { container } = render(<BreathingShape frame={null} leadInDigit={2} />)
    const digit = container.querySelector('span.text-7xl')
    expect(digit).not.toBeNull()
    expect(digit!.textContent).toBe('2')
  })
})
