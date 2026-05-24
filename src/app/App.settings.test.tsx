import '@testing-library/jest-dom/vitest'

import { act, fireEvent, render, screen, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

import App from './App'
import {
  readStoredEnvelope as readRawEnvelope,
  settingGroup,
  startAndAdvancePastLeadIn,
} from './appTestHarness'
import { STATE_KEY } from '../storage'

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
    expect(within(duration).getByText('Open-ended')).toBeVisible()
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

function stretchSettingsOf(env: Record<string, unknown> | null): Record<string, unknown> | undefined {
  const practices = env?.['practices'] as Record<string, unknown> | undefined
  const stretch = practices?.['stretch'] as Record<string, unknown> | undefined
  return stretch?.['settings'] as Record<string, unknown> | undefined
}

describe('Phase 34 — stretch settings persist across a remount', () => {
  beforeEach(() => {
    window.localStorage.clear()
  })

  afterEach(() => {
    vi.restoreAllMocks()
  })

  it('stretch settings change is persisted and survives remount', async () => {
    // Seed a v3 envelope with stretch active and default settings
    window.localStorage.setItem(STATE_KEY, JSON.stringify({
      version: 3,
      activePractice: 'stretch',
      practices: {
        resonant: { settings: { bpm: 5.5, ratio: '40:60', durationMinutes: 10 }, stats: null },
        stretch: {
          settings: {
            ratio: '40:60',
            initialBpm: 5.5,
            targetBpm: 4.5,
            warmUpMinutes: 5,
            rampDurationMinutes: 5,
            coolDownMinutes: 5,
          },
          stats: null,
        },
        naviKriya: { settings: null, stats: null },
      },
    }))

    const { unmount } = render(<App />)

    // Verify start BPM group is visible (stretch branch active)
    const startBpmGroup = settingGroup('Start BPM')
    expect(startBpmGroup).toBeInTheDocument()

    // Increase warm-up duration — default is 5, increasing goes to 10 min
    const warmUpGroup = settingGroup('Warm-up')
    fireEvent.click(within(warmUpGroup).getByRole('button', { name: /increase warm-up/i }))
    await act(async () => { await Promise.resolve() })

    // Persisted to the stretch slice
    const env1 = readRawEnvelope()
    expect(stretchSettingsOf(env1)?.['warmUpMinutes']).toBe(10)

    // Remount — the setting should survive
    unmount()
    render(<App />)
    // Still on stretch practice; warm-up still 10 min
    const warmUpGroup2 = settingGroup('Warm-up')
    expect(within(warmUpGroup2).getByText('10 min')).toBeInTheDocument()
  })
})
