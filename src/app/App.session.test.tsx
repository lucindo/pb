import '@testing-library/jest-dom/vitest'

import { render, screen, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { describe, expect, it } from 'vitest'

import App from './App'

function settingGroup(name: string) {
  return screen.getByRole('group', { name })
}

describe('running session display', () => {
  it('immediately shows the current In phase after starting a session', async () => {
    const user = userEvent.setup()
    render(<App />)

    await user.click(screen.getByRole('button', { name: 'Start session' }))

    const readout = screen.getByRole('status', { name: 'Session readout' })
    expect(within(readout).getByText('In')).toBeVisible()
    expect(within(readout).getByText('Current phase')).toBeVisible()
  })

  it('shows remaining time for timed sessions', async () => {
    const user = userEvent.setup()
    render(<App />)

    await user.click(screen.getByRole('button', { name: 'Start session' }))

    const readout = screen.getByRole('status', { name: 'Session readout' })
    expect(within(readout).getByText('Remaining')).toBeVisible()
    expect(within(readout).getByText('10:00')).toBeVisible()
  })

  it('shows elapsed time for open-ended sessions', async () => {
    const user = userEvent.setup()
    render(<App />)

    const duration = settingGroup('Duration')
    const increase = within(duration).getByRole('button', { name: /increase duration/i })
    for (let index = 0; index < 11; index += 1) {
      await user.click(increase)
    }
    await user.click(screen.getByRole('button', { name: 'Start session' }))

    const readout = screen.getByRole('status', { name: 'Session readout' })
    expect(within(readout).getByText('Elapsed')).toBeVisible()
    expect(within(readout).getByText('0:00')).toBeVisible()
  })

  it('drives the breathing shape from the same phase and progress frame as the readout', async () => {
    const user = userEvent.setup()
    render(<App />)

    await user.click(screen.getByRole('button', { name: 'Start session' }))

    const shape = screen.getByRole('img', { name: 'Breathing shape: In' })
    expect(shape).toHaveAttribute('data-phase', 'in')
    expect(shape).toHaveAttribute('data-progress', '0.000')
    expect(shape).toHaveTextContent('In')
  })
})
