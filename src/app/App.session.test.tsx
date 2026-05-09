import '@testing-library/jest-dom/vitest'

import { act, fireEvent, render, screen, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

import App from './App'

function settingGroup(name: string) {
  return screen.getByRole('group', { name })
}

function sessionReadout() {
  return screen.getByRole('region', { name: 'Session readout' })
}

describe('running session display', () => {
  afterEach(() => {
    vi.restoreAllMocks()
  })

  it('immediately shows the current In phase after starting a session (orb hosts the label per D-03)', async () => {
    const user = userEvent.setup()
    render(<App />)

    await user.click(screen.getByRole('button', { name: 'Start session' }))

    // D-03: the In/Out label lives inside the orb (orb is the single visible source).
    expect(screen.getByRole('img', { name: 'Breathing shape: In' })).toBeVisible()

    // The readout region is still rendered (clock pill + ARIA contract preserved).
    expect(sessionReadout()).toBeVisible()
  })

  it('shows remaining time for timed sessions', async () => {
    const user = userEvent.setup()
    render(<App />)

    await user.click(screen.getByRole('button', { name: 'Start session' }))

    const readout = sessionReadout()
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

    const readout = sessionReadout()
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

  it('renders the orb with two static aria-hidden reference rings', async () => {
    const user = userEvent.setup()
    render(<App />)
    await user.click(screen.getByRole('button', { name: 'Start session' }))

    const shape = screen.getByRole('img', { name: 'Breathing shape: In' })
    const outerRing = shape.querySelector('[aria-hidden="true"].orb-ring--outer')
    const innerRing = shape.querySelector('[aria-hidden="true"].orb-ring--inner')
    expect(outerRing).not.toBeNull()
    expect(innerRing).not.toBeNull()
  })

  it('renders two stacked gradient layers (In and Out) and a single in-orb phase label', async () => {
    const user = userEvent.setup()
    render(<App />)
    await user.click(screen.getByRole('button', { name: 'Start session' }))

    const shape = screen.getByRole('img', { name: 'Breathing shape: In' })
    expect(shape.querySelector('[aria-hidden="true"].orb-layer--in')).not.toBeNull()
    expect(shape.querySelector('[aria-hidden="true"].orb-layer--out')).not.toBeNull()
    expect(shape).toHaveTextContent('In')
  })

  it('renders the in-orb phase label at large display size (text-5xl semibold) per D-03', async () => {
    const user = userEvent.setup()
    render(<App />)
    await user.click(screen.getByRole('button', { name: 'Start session' }))

    const shape = screen.getByRole('img', { name: 'Breathing shape: In' })
    // The visible label is a non-aria-hidden child whose text content is the phase label.
    const label = Array.from(shape.children).find((child) => {
      return !(child as HTMLElement).hasAttribute('aria-hidden') && child.textContent === 'In'
    }) as HTMLElement | undefined
    expect(label).toBeDefined()
    expect(label!.className).toMatch(/text-5xl/)
    expect(label!.className).toMatch(/font-semibold/)
  })

  it('binds the orb scale to phaseProgress in normal motion mode', async () => {
    const user = userEvent.setup()
    render(<App />)
    await user.click(screen.getByRole('button', { name: 'Start session' }))

    const shape = screen.getByRole('img', { name: 'Breathing shape: In' })
    const scaleHost = shape.querySelector<HTMLElement>('.orb')
    expect(scaleHost).not.toBeNull()
    // Default matchMedia mock has matches: false; phaseProgress at start is 0
    // → liveScale for 'in' = MIN_SCALE = 0.58.
    expect(scaleHost!.style.transform).toContain('scale(0.58')
  })

  it('holds the orb at fixed mid-scale (0.79) when reduced-motion is preferred (D-06)', async () => {
    vi.spyOn(window, 'matchMedia').mockReturnValue({
      matches: true,
      media: '(prefers-reduced-motion: reduce)',
      onchange: null,
      addEventListener: () => {},
      removeEventListener: () => {},
      addListener: () => {},
      removeListener: () => {},
      dispatchEvent: () => false,
    } as unknown as MediaQueryList)

    const user = userEvent.setup()
    render(<App />)
    await user.click(screen.getByRole('button', { name: 'Start session' }))

    const shape = screen.getByRole('img', { name: 'Breathing shape: In' })
    expect(shape).toHaveAttribute('data-phase', 'in')
    const scaleHost = shape.querySelector<HTMLElement>('.orb')
    expect(scaleHost!.style.transform).toBe('scale(0.79)')
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

  it('extends timed sessions from the existing duration stepper increase button', () => {
    render(<App />)

    fireEvent.click(screen.getByRole('button', { name: 'Start session' }))

    const duration = settingGroup('Duration')
    expect(screen.queryByRole('group', { name: 'Extend duration' })).not.toBeInTheDocument()
    expect(within(duration).getByRole('button', { name: /decrease duration/i })).toBeDisabled()
    expect(within(duration).getByRole('button', { name: /increase duration/i })).toBeEnabled()

    fireEvent.click(within(duration).getByRole('button', { name: /increase duration/i }))

    expect(within(duration).getByText('15 min')).toBeVisible()
  })

  it('does not allow shortening or switching a timed running session to open-ended', () => {
    render(<App />)

    fireEvent.click(screen.getByRole('button', { name: 'Start session' }))

    const duration = settingGroup('Duration')
    const decrease = within(duration).getByRole('button', { name: /decrease duration/i })
    const increase = within(duration).getByRole('button', { name: /increase duration/i })

    expect(decrease).toBeDisabled()

    for (let index = 0; index < 10; index += 1) {
      fireEvent.click(increase)
    }

    expect(within(duration).getByText('60 min')).toBeVisible()
    expect(increase).toBeDisabled()
    expect(within(duration).queryByText('Open-ended')).not.toBeInTheDocument()
  })

  it('does not allow running duration edits for open-ended sessions', () => {
    render(<App />)

    const duration = settingGroup('Duration')
    const increase = within(duration).getByRole('button', { name: /increase duration/i })
    for (let index = 0; index < 11; index += 1) {
      fireEvent.click(increase)
    }
    fireEvent.click(screen.getByRole('button', { name: 'Start session' }))

    expect(screen.queryByRole('group', { name: 'Extend duration' })).not.toBeInTheDocument()
    expect(within(duration).getByRole('button', { name: /decrease duration/i })).toBeDisabled()
    expect(within(duration).getByRole('button', { name: /increase duration/i })).toBeDisabled()
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
    const readout = sessionReadout()
    expect(within(readout).getByText('Elapsed')).toBeVisible()
  })
})

describe('manual session ending', () => {
  afterEach(() => {
    vi.restoreAllMocks()
  })

  it('opens the end-session modal for timed sessions and keeps the session running on Keep going', async () => {
    const user = userEvent.setup()
    render(<App />)

    await user.click(screen.getByRole('button', { name: 'Start session' }))
    await user.click(screen.getByRole('button', { name: 'End session' }))

    expect(await screen.findByRole('dialog', { name: 'End this session?' })).toBeVisible()
    await user.click(screen.getByRole('button', { name: 'Keep going' }))

    expect(screen.queryByRole('dialog', { name: 'End this session?' })).not.toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'End session' })).toBeVisible()
    expect(screen.getByRole('status', { name: 'Session readout' })).toBeVisible()
  })

  it('confirms timed manual end via the modal End button, clears active readouts, and keeps selected settings', async () => {
    const user = userEvent.setup()
    render(<App />)

    await user.click(within(settingGroup('Duration')).getByRole('button', { name: /increase duration/i }))
    await user.click(screen.getByRole('button', { name: 'Start session' }))
    await user.click(screen.getByRole('button', { name: 'End session' }))
    await user.click(screen.getByRole('button', { name: 'End' }))

    expect(screen.getByRole('button', { name: 'Start session' })).toBeVisible()
    expect(screen.queryByRole('status', { name: 'Session readout' })).not.toBeInTheDocument()
    expect(screen.queryByRole('img', { name: /Breathing shape/i })).not.toBeInTheDocument()
    expect(within(settingGroup('Duration')).getByText('15 min')).toBeVisible()
  })

  it('ends open-ended sessions directly without showing the modal (D-14)', async () => {
    const user = userEvent.setup()
    render(<App />)

    const duration = settingGroup('Duration')
    const increase = within(duration).getByRole('button', { name: /increase duration/i })
    for (let index = 0; index < 11; index += 1) {
      await user.click(increase)
    }
    await user.click(screen.getByRole('button', { name: 'Start session' }))
    await user.click(screen.getByRole('button', { name: 'End session' }))

    expect(screen.queryByRole('dialog')).not.toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'Start session' })).toBeVisible()
    expect(screen.queryByRole('status', { name: 'Session readout' })).not.toBeInTheDocument()
  })
})
