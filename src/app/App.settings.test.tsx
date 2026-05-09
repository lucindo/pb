import '@testing-library/jest-dom/vitest'

import { render, screen, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { afterEach, describe, expect, it, vi } from 'vitest'

import App from './App'

afterEach(() => {
  vi.restoreAllMocks()
})

function settingGroup(name: string) {
  return screen.getByRole('group', { name })
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
    const user = userEvent.setup()
    render(<App />)

    await user.click(screen.getByRole('button', { name: 'Start session' }))

    expect(screen.getByRole('button', { name: 'End session' })).toBeVisible()
    expect(screen.queryByRole('button', { name: 'Start session' })).not.toBeInTheDocument()
  })

  it('ends a running session and returns to the idle start action', async () => {
    vi.spyOn(window, 'confirm').mockReturnValueOnce(true)
    const user = userEvent.setup()
    render(<App />)

    await user.click(screen.getByRole('button', { name: 'Start session' }))
    await user.click(screen.getByRole('button', { name: 'End session' }))

    expect(screen.getByRole('button', { name: 'Start session' })).toBeVisible()
    expect(screen.queryByRole('button', { name: 'End session' })).not.toBeInTheDocument()
  })

  it('keeps selected settings visible after manually ending a session', async () => {
    vi.spyOn(window, 'confirm').mockReturnValueOnce(true)
    const user = userEvent.setup()
    render(<App />)

    await user.click(within(settingGroup('Duration')).getByRole('button', { name: /increase duration/i }))
    await user.click(screen.getByRole('button', { name: 'Start session' }))
    await user.click(screen.getByRole('button', { name: 'End session' }))

    expect(within(settingGroup('BPM')).getByText('5.5 BPM')).toBeVisible()
    expect(within(settingGroup('Ratio')).getByText('40:60')).toBeVisible()
    expect(within(settingGroup('Duration')).getByText('15 min')).toBeVisible()
  })

  it('does not allow BPM or ratio edits while a session is running', async () => {
    const user = userEvent.setup()
    render(<App />)

    await user.click(screen.getByRole('button', { name: 'Start session' }))

    expect(within(settingGroup('BPM')).getByRole('button', { name: /decrease bpm/i })).toBeDisabled()
    expect(within(settingGroup('BPM')).getByRole('button', { name: /increase bpm/i })).toBeDisabled()
    expect(within(settingGroup('Ratio')).getByRole('button', { name: /decrease ratio/i })).toBeDisabled()
    expect(within(settingGroup('Ratio')).getByRole('button', { name: /increase ratio/i })).toBeDisabled()
  })
})
