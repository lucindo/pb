import '@testing-library/jest-dom/vitest'

import { fireEvent, render, screen, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { afterEach, describe, expect, it, vi } from 'vitest'

import App from './App'
import {
  seedSettings,
  settingGroup,
  startAndAdvancePastLeadIn,
} from './appTestHarness'

afterEach(() => {
  vi.restoreAllMocks()
})

describe('main screen settings controls', () => {
  it('shows the first-open Box-4 defaults (pattern, scale, rounds)', () => {
    render(<App />)

    // Default Box-4 = 1·1·1·1 ×4, 10 rounds.
    expect(within(settingGroup('In')).getByText('1 s')).toBeVisible()
    expect(within(settingGroup('Scale')).getByText('×4')).toBeVisible()
    expect(within(settingGroup('Rounds')).getByText('10')).toBeVisible()
  })

  it('shows the preset picker with the named presets', () => {
    render(<App />)

    const preset = settingGroup('Preset')
    expect(within(preset).getByText('Box-4')).toBeVisible()
    expect(within(preset).getByText('Custom')).toBeVisible()
  })

  it('steps rounds past the max to the open-ended option (FR-18a)', async () => {
    const user = userEvent.setup()
    seedSettings({ rounds: 99 })
    render(<App />)

    const rounds = settingGroup('Rounds')
    expect(within(rounds).getByText('99')).toBeVisible()

    // Stepping above the max (99) flips to open-ended, shown as ∞.
    await user.click(within(rounds).getByRole('button', { name: /increase rounds/i }))
    expect(within(rounds).getByText('∞')).toBeVisible()
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
      // Distinctive timed rounds so we can confirm the selection survives the end.
      seedSettings({ rounds: 7 })
      render(<App />)

      await startAndAdvancePastLeadIn()
      fireEvent.click(screen.getByRole('button', { name: 'End' }))
      fireEvent.click(
        within(screen.getByRole('dialog', { name: 'End this session?' }))
          .getByRole('button', { name: 'End' }),
      )

      expect(within(settingGroup('Rounds')).getByText('7')).toBeVisible()
    } finally {
      vi.useRealTimers()
    }
  })

})

