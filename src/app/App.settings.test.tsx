import '@testing-library/jest-dom/vitest'

import { fireEvent, render, screen, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { afterEach, describe, expect, it, vi } from 'vitest'

import App from './App'
import {
  settingGroup,
  startAndAdvancePastLeadIn,
} from './appTestHarness'

afterEach(() => {
  vi.restoreAllMocks()
})

describe('main screen settings controls', () => {
  it('shows the first-open defaults for BPM, ratio, and duration', () => {
    render(<App />)

    expect(within(settingGroup('BPM')).getByText('5.5 BPM')).toBeVisible()
    expect(within(settingGroup('Ratio')).getByText('40:60')).toBeVisible()
    expect(within(settingGroup('Duration')).getByText('10 min')).toBeVisible()
  })

  it('uses compact ratio labels without expanded inhale or exhale wording', () => {
    render(<App />)

    const ratio = settingGroup('Ratio')
    expect(within(ratio).getByText('40:60')).toBeVisible()
    expect(within(ratio).queryByText(/inhale/i)).not.toBeInTheDocument()
    expect(within(ratio).queryByText(/exhale/i)).not.toBeInTheDocument()
  })

  it('steps duration through finite five-minute values and the open-ended option', async () => {
    const user = userEvent.setup()
    render(<App />)

    const duration = settingGroup('Duration')
    const decrease = within(duration).getByRole('button', { name: /decrease duration/i })
    const increase = within(duration).getByRole('button', { name: /increase duration/i })

    await user.click(decrease)
    expect(within(duration).getByText('5 min')).toBeVisible()

    for (let index = 0; index < 11; index += 1) {
      await user.click(increase)
    }
    expect(within(duration).getByText('60 min')).toBeVisible()

    await user.click(increase)
    expect(within(duration).getByText('∞')).toBeVisible()
  })

  it('starts a running session from the primary idle action', async () => {
    vi.useFakeTimers()
    try {
      render(<App />)

      await startAndAdvancePastLeadIn()

      expect(screen.getByRole('button', { name: 'End' })).toBeVisible()
      expect(screen.queryByRole('button', { name: 'Start' })).not.toBeInTheDocument()
    } finally {
      vi.useRealTimers()
    }
  })

  it('ends a running session and returns to the idle start action', async () => {
    vi.useFakeTimers()
    try {
      render(<App />)

      await startAndAdvancePastLeadIn()
      fireEvent.click(screen.getByRole('button', { name: 'End' }))
      fireEvent.click(
        within(screen.getByRole('dialog', { name: 'End this session?' }))
          .getByRole('button', { name: 'End' }),
      )

      expect(screen.getByRole('button', { name: 'Start' })).toBeVisible()
      expect(screen.queryByRole('button', { name: 'End' })).not.toBeInTheDocument()
    } finally {
      vi.useRealTimers()
    }
  })

  it('keeps selected settings visible after manually ending a session', async () => {
    vi.useFakeTimers()
    try {
      render(<App />)

      fireEvent.click(within(settingGroup('Duration')).getByRole('button', { name: /increase duration/i }))
      await startAndAdvancePastLeadIn()
      fireEvent.click(screen.getByRole('button', { name: 'End' }))
      fireEvent.click(
        within(screen.getByRole('dialog', { name: 'End this session?' }))
          .getByRole('button', { name: 'End' }),
      )

      expect(within(settingGroup('BPM')).getByText('5.5 BPM')).toBeVisible()
      expect(within(settingGroup('Ratio')).getByText('40:60')).toBeVisible()
      expect(within(settingGroup('Duration')).getByText('15 min')).toBeVisible()
    } finally {
      vi.useRealTimers()
    }
  })

})

