import '@testing-library/jest-dom/vitest'

import { act, fireEvent, render, screen, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

import App from './App'
import { STATE_KEY } from '../storage'

afterEach(() => {
  vi.restoreAllMocks()
})

function settingGroup(name: string) {
  return screen.getByRole('group', { name })
}

// Phase 3 (Plan 04): clicking Start session enters a 3-second lead-in before the
// session timing clock starts. Helper to click Start + flush microtasks for the
// awaited audio.start() promise + advance fake timers past the 3 s setTimeout
// chain so the In phase appears.
const LEAD_IN_MS = 3000

async function startAndAdvancePastLeadIn() {
  fireEvent.click(screen.getByRole('button', { name: 'Start session' }))
  await act(async () => {
    await Promise.resolve()
    await Promise.resolve()
    vi.advanceTimersByTime(LEAD_IN_MS)
  })
}

describe('main screen settings controls', () => {
  it('renders BPM, ratio, and duration controls in the locked order before the start action', () => {
    render(<App />)

    const bpm = settingGroup('BPM')
    const ratio = settingGroup('Ratio')
    const duration = settingGroup('Duration')
    const start = screen.getByRole('button', { name: 'Start session' })

    expect(bpm.compareDocumentPosition(ratio)).toBe(Node.DOCUMENT_POSITION_FOLLOWING)
    expect(ratio.compareDocumentPosition(duration)).toBe(Node.DOCUMENT_POSITION_FOLLOWING)
    expect(duration.compareDocumentPosition(start)).toBe(Node.DOCUMENT_POSITION_FOLLOWING)
  })

  it('uses increment and decrement stepper buttons rather than dropdowns or preset-button groups', () => {
    render(<App />)

    expect(screen.queryByRole('combobox')).not.toBeInTheDocument()
    expect(screen.queryByRole('radio')).not.toBeInTheDocument()
    expect(screen.queryByRole('radiogroup')).not.toBeInTheDocument()

    expect(within(settingGroup('BPM')).getByRole('button', { name: /decrease bpm/i })).toBeVisible()
    expect(within(settingGroup('BPM')).getByRole('button', { name: /increase bpm/i })).toBeVisible()
    expect(within(settingGroup('Ratio')).getByRole('button', { name: /decrease ratio/i })).toBeVisible()
    expect(within(settingGroup('Ratio')).getByRole('button', { name: /increase ratio/i })).toBeVisible()
    expect(
      within(settingGroup('Duration')).getByRole('button', { name: /decrease duration/i }),
    ).toBeVisible()
    expect(
      within(settingGroup('Duration')).getByRole('button', { name: /increase duration/i }),
    ).toBeVisible()
  })

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

      expect(screen.getByRole('button', { name: 'End session' })).toBeVisible()
      expect(screen.queryByRole('button', { name: 'Start session' })).not.toBeInTheDocument()
    } finally {
      vi.useRealTimers()
    }
  })

  it('ends a running session and returns to the idle start action', async () => {
    vi.useFakeTimers()
    try {
      render(<App />)

      await startAndAdvancePastLeadIn()
      fireEvent.click(screen.getByRole('button', { name: 'End session' }))
      fireEvent.click(screen.getByRole('button', { name: 'End' }))

      expect(screen.getByRole('button', { name: 'Start session' })).toBeVisible()
      expect(screen.queryByRole('button', { name: 'End session' })).not.toBeInTheDocument()
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
      fireEvent.click(screen.getByRole('button', { name: 'End session' }))
      fireEvent.click(screen.getByRole('button', { name: 'End' }))

      expect(within(settingGroup('BPM')).getByText('5.5 BPM')).toBeVisible()
      expect(within(settingGroup('Ratio')).getByText('40:60')).toBeVisible()
      expect(within(settingGroup('Duration')).getByText('15 min')).toBeVisible()
    } finally {
      vi.useRealTimers()
    }
  })

  it('removes BPM and Ratio steppers from the DOM while a session is running (D-16)', async () => {
    vi.useFakeTimers()
    try {
      render(<App />)

      expect(screen.getByRole('group', { name: 'BPM' })).toBeInTheDocument()
      expect(screen.getByRole('group', { name: 'Ratio' })).toBeInTheDocument()

      await startAndAdvancePastLeadIn()

      expect(screen.queryByRole('group', { name: 'BPM' })).not.toBeInTheDocument()
      expect(screen.queryByRole('group', { name: 'Ratio' })).not.toBeInTheDocument()
      expect(screen.getByRole('group', { name: 'Duration' })).toBeInTheDocument()
    } finally {
      vi.useRealTimers()
    }
  })

  it('restores BPM and Ratio steppers after the session ends (D-16)', async () => {
    vi.useFakeTimers()
    try {
      render(<App />)

      await startAndAdvancePastLeadIn()
      expect(screen.queryByRole('group', { name: 'BPM' })).not.toBeInTheDocument()

      fireEvent.click(screen.getByRole('button', { name: 'End session' }))
      fireEvent.click(screen.getByRole('button', { name: 'End' }))

      expect(screen.getByRole('group', { name: 'BPM' })).toBeInTheDocument()
      expect(screen.getByRole('group', { name: 'Ratio' })).toBeInTheDocument()
      expect(screen.getByRole('group', { name: 'Duration' })).toBeInTheDocument()
    } finally {
      vi.useRealTimers()
    }
  })

  it('does not render the Current phase eyebrow inside the readout while running (D-03)', async () => {
    vi.useFakeTimers()
    try {
      render(<App />)

      await startAndAdvancePastLeadIn()

      // D-03: the orb is the single source of the visible phase label.
      expect(screen.queryByText('Current phase')).not.toBeInTheDocument()
      expect(screen.getByRole('region', { name: 'Session readout' })).toBeVisible()
    } finally {
      vi.useRealTimers()
    }
  })
})

describe('focus and hit-area accessibility (Phase 2 D-09/D-17/D-21)', () => {
  it('stepper +/- buttons expose focus-visible ring on theme accent', () => {
    render(<App />)
    const decreaseBpm = within(settingGroup('BPM')).getByRole('button', { name: /decrease bpm/i })
    const increaseBpm = within(settingGroup('BPM')).getByRole('button', { name: /increase bpm/i })

    for (const button of [decreaseBpm, increaseBpm]) {
      expect(button.className).toMatch(/focus-visible:outline-none/)
      expect(button.className).toMatch(/focus-visible:ring-2/)
      expect(button.className).toMatch(/focus-visible:ring-breathing-accent/)
      expect(button.className).toMatch(/focus-visible:ring-offset-2/)
    }
  })

  it('Start session button exposes focus-visible ring on theme accent', () => {
    render(<App />)
    const start = screen.getByRole('button', { name: 'Start session' })

    expect(start.className).toMatch(/focus-visible:outline-none/)
    expect(start.className).toMatch(/focus-visible:ring-2/)
    expect(start.className).toMatch(/focus-visible:ring-breathing-accent/)
    expect(start.className).toMatch(/focus-visible:ring-offset-2/)
  })

  it('disables decorative transitions on interactive controls under reduced motion (D-09)', () => {
    render(<App />)
    const decreaseBpm = within(settingGroup('BPM')).getByRole('button', { name: /decrease bpm/i })
    const increaseBpm = within(settingGroup('BPM')).getByRole('button', { name: /increase bpm/i })
    const start = screen.getByRole('button', { name: 'Start session' })

    for (const button of [decreaseBpm, increaseBpm, start]) {
      expect(button.className).toMatch(/motion-reduce:transition-none/)
    }
  })

  it('primary tappable controls meet the 44x44 hit-area floor (D-17)', () => {
    render(<App />)
    const decreaseBpm = within(settingGroup('BPM')).getByRole('button', { name: /decrease bpm/i })
    const start = screen.getByRole('button', { name: 'Start session' })

    expect(decreaseBpm.className).toMatch(/(?:size-12|min-h-(?:11|12))/)
    expect(decreaseBpm.className).toMatch(/(?:size-12|min-w-(?:11|12))/)
    expect(start.className).toMatch(/min-h-(?:11|12)/)
  })

  it('removes the legacy Phase 1 focus:ring-4 focus:ring-teal-200 utilities (regression guard)', () => {
    render(<App />)
    const allButtons = screen.getAllByRole('button')

    for (const button of allButtons) {
      expect(button.className).not.toMatch(/(?:^|\s)focus:ring-4(?:\s|$)/)
      expect(button.className).not.toMatch(/(?:^|\s)focus:ring-teal-200(?:\s|$)/)
    }
  })
})

// ---------------------------------------------------------------------------
// Phase 34 — Stretch settings persist across a remount
// ---------------------------------------------------------------------------

function readRawEnvelope(): Record<string, unknown> | null {
  const raw = window.localStorage.getItem(STATE_KEY)
  // Reason: test helper reads raw localStorage; shape validated by downstream test assertions.
  return raw ? (JSON.parse(raw) as Record<string, unknown>) : null
}

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
    const startBpmGroup = screen.getByRole('group', { name: 'Start BPM' })
    expect(startBpmGroup).toBeInTheDocument()

    // Increase warm-up duration — default is 5, increasing goes to 10 min
    const warmUpGroup = screen.getByRole('group', { name: 'Warm-up' })
    fireEvent.click(within(warmUpGroup).getByRole('button', { name: /increase warm-up/i }))
    await act(async () => { await Promise.resolve() })

    // Persisted to the stretch slice
    const env1 = readRawEnvelope()
    expect(stretchSettingsOf(env1)?.['warmUpMinutes']).toBe(10)

    // Remount — the setting should survive
    unmount()
    render(<App />)
    // Still on stretch practice; warm-up still 10 min
    const warmUpGroup2 = screen.getByRole('group', { name: 'Warm-up' })
    expect(within(warmUpGroup2).getByText('10 min')).toBeInTheDocument()
  })
})
