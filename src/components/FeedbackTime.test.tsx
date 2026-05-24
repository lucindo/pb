import '@testing-library/jest-dom/vitest'
import { render, screen, within } from '@testing-library/react'
import { describe, expect, it } from 'vitest'

import { FeedbackTime } from './FeedbackTime'

describe('FeedbackTime', () => {
  it('renders the primary value (e.g. remaining time)', () => {
    render(<FeedbackTime primary="02:51" secondary="5.5 BPM · 1:1" ariaLabel="HRV readout" />)
    expect(screen.getByText('02:51')).toBeVisible()
  })

  it('renders the secondary caption (e.g. pace + ratio)', () => {
    render(<FeedbackTime primary="02:51" secondary="5.5 BPM · 1:1" ariaLabel="HRV readout" />)
    expect(screen.getByText('5.5 BPM · 1:1')).toBeVisible()
  })

  it('exposes a live readout region named by ariaLabel', () => {
    render(<FeedbackTime primary="00:00" secondary="—" ariaLabel="Live HRV time" />)
    const status = screen.getByRole('status', { name: 'Live HRV time' })
    expect(status).toBeVisible()
    expect(status).toHaveAttribute('aria-live', 'polite')
  })

  it('places the primary value above the secondary caption (DOM order)', () => {
    render(<FeedbackTime primary="12:34" secondary="6 BPM" ariaLabel="HRV readout" />)
    const status = screen.getByRole('status', { name: 'HRV readout' })
    const primary = within(status).getByText('12:34')
    const secondary = within(status).getByText('6 BPM')
    // Primary's element must precede secondary's in document order.
    const siblings = Array.from(status.querySelectorAll('span'))
    expect(siblings.indexOf(primary)).toBeLessThan(siblings.indexOf(secondary))
  })

  it('renders empty strings without crashing', () => {
    render(<FeedbackTime primary="" secondary="" ariaLabel="Empty readout" />)
    expect(screen.getByRole('status', { name: 'Empty readout' })).toBeInTheDocument()
  })
})
