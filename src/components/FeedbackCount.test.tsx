import '@testing-library/jest-dom/vitest'
import { render, screen, within } from '@testing-library/react'
import { describe, expect, it } from 'vitest'

import { FeedbackCount } from './FeedbackCount'

describe('FeedbackCount', () => {
  it('renders the big primary number (e.g. live OM count)', () => {
    render(<FeedbackCount big="47" mid="/ 100" small="Round 1 of 3 · Front" ariaLabel="Navi readout" />)
    expect(screen.getByText('47')).toBeVisible()
  })

  it('renders the mid baseline-aligned suffix (e.g. "/ 100")', () => {
    render(<FeedbackCount big="47" mid="/ 100" small="Round 1 of 3 · Front" ariaLabel="Navi readout" />)
    expect(screen.getByText('/ 100')).toBeVisible()
  })

  it('renders the small uppercase context line', () => {
    render(<FeedbackCount big="47" mid="/ 100" small="Round 1 of 3 · Front" ariaLabel="Navi readout" />)
    expect(screen.getByText('Round 1 of 3 · Front')).toBeVisible()
  })

  it('exposes a live readout region named by ariaLabel', () => {
    render(<FeedbackCount big="2" mid="of 5" small="HOLD" ariaLabel="Stretch readout" />)
    const status = screen.getByRole('status', { name: 'Stretch readout' })
    expect(status).toBeVisible()
    expect(status).toHaveAttribute('aria-live', 'polite')
  })

  it('groups big + mid on the same baseline row (mid is a sibling of big inside one container)', () => {
    render(<FeedbackCount big="47" mid="/ 100" small="ctx" ariaLabel="r" />)
    const big = screen.getByText('47')
    const mid = screen.getByText('/ 100')
    expect(big.parentElement).toBe(mid.parentElement)
  })

  it('places the big/mid row above the small context (DOM order)', () => {
    render(<FeedbackCount big="3" mid="/ 9" small="CONTEXT" ariaLabel="r" />)
    const status = screen.getByRole('status', { name: 'r' })
    const big = within(status).getByText('3')
    const small = within(status).getByText('CONTEXT')
    const spans = Array.from(status.querySelectorAll('span'))
    expect(spans.indexOf(big)).toBeLessThan(spans.indexOf(small))
  })

  it('renders Stretch-shape data (round / total, stage + time context)', () => {
    render(
      <FeedbackCount big="2" mid="of 5" small="RAMP · 0:45 left" ariaLabel="Stretch readout" />,
    )
    expect(screen.getByText('2')).toBeVisible()
    expect(screen.getByText('of 5')).toBeVisible()
    expect(screen.getByText('RAMP · 0:45 left')).toBeVisible()
  })
})
