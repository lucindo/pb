import '@testing-library/jest-dom/vitest'

import { act, fireEvent, render, screen, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

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

describe('running duration edits and completion', () => {
  beforeEach(() => {
    vi.useFakeTimers()
    vi.setSystemTime(new Date('2026-05-09T00:00:00.000Z'))
  })

  afterEach(() => {
    vi.useRealTimers()
  })

  it('offers only greater finite durations during a running timed session', () => {
    render(<App />)

    fireEvent.click(screen.getByRole('button', { name: 'Start session' }))

    const control = screen.getByRole('group', { name: 'Extend duration' })
    expect(within(control).getByRole('button', { name: 'Extend to 15 min' })).toBeVisible()
    expect(within(control).getByRole('button', { name: 'Extend to 60 min' })).toBeVisible()
    expect(within(control).queryByRole('button', { name: 'Extend to 10 min' })).not.toBeInTheDocument()
    expect(within(control).queryByRole('button', { name: /open-ended/i })).not.toBeInTheDocument()
  })

  it('does not allow shortening or switching a timed running session to open-ended', () => {
    render(<App />)

    fireEvent.click(screen.getByRole('button', { name: 'Start session' }))
    fireEvent.click(screen.getByRole('button', { name: 'Extend to 15 min' }))

    const duration = settingGroup('Duration')
    expect(within(duration).getByText('15 min')).toBeVisible()

    const control = screen.getByRole('group', { name: 'Extend duration' })
    expect(within(control).queryByRole('button', { name: 'Extend to 10 min' })).not.toBeInTheDocument()
    expect(within(control).queryByRole('button', { name: 'Extend to 15 min' })).not.toBeInTheDocument()
    expect(within(control).queryByRole('button', { name: /open-ended/i })).not.toBeInTheDocument()
  })

  it('does not render running duration edits for open-ended sessions', () => {
    render(<App />)

    const duration = settingGroup('Duration')
    const increase = within(duration).getByRole('button', { name: /increase duration/i })
    for (let index = 0; index < 11; index += 1) {
      fireEvent.click(increase)
    }
    fireEvent.click(screen.getByRole('button', { name: 'Start session' }))

    expect(screen.queryByRole('group', { name: 'Extend duration' })).not.toBeInTheDocument()
  })

  it('automatically renders Session complete when a timed session reaches the end', () => {
    render(<App />)

    fireEvent.click(within(settingGroup('Duration')).getByRole('button', { name: /decrease duration/i }))
    fireEvent.click(screen.getByRole('button', { name: 'Start session' }))

    act(() => {
      vi.advanceTimersByTime(5 * 60_000)
    })

    expect(screen.getByText('Session complete')).toBeVisible()
    expect(screen.getByRole('button', { name: 'Start session' })).toBeVisible()
  })

  it('keeps open-ended sessions running when mocked time advances', () => {
    render(<App />)

    const duration = settingGroup('Duration')
    const increase = within(duration).getByRole('button', { name: /increase duration/i })
    for (let index = 0; index < 11; index += 1) {
      fireEvent.click(increase)
    }
    fireEvent.click(screen.getByRole('button', { name: 'Start session' }))

    act(() => {
      vi.advanceTimersByTime(61 * 60_000)
    })

    expect(screen.queryByText('Session complete')).not.toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'End session' })).toBeVisible()
    const readout = screen.getByRole('status', { name: 'Session readout' })
    expect(within(readout).getByText('Elapsed')).toBeVisible()
  })
})
