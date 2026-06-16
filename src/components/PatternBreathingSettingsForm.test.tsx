import '@testing-library/jest-dom/vitest'
import { useState } from 'react'
import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { describe, expect, it, vi } from 'vitest'

import { PatternBreathingSettingsForm } from './PatternBreathingSettingsForm'
import { DEFAULT_PATTERN_SETTINGS, type PatternSettings } from '../domain'
import { UI_STRINGS } from '../content/strings'

const FORM_STRINGS = UI_STRINGS.en.practice.settingsForm
const TOGGLE_NAME = FORM_STRINGS.roundsLimitLabel // 'Limit rounds'

function renderForm(rounds: PatternSettings['rounds'], onChange = vi.fn()) {
  const settings = { ...DEFAULT_PATTERN_SETTINGS, rounds }
  render(<PatternBreathingSettingsForm settings={settings} onChange={onChange} strings={FORM_STRINGS} />)
  return { onChange, toggle: () => screen.getByRole('switch', { name: TOGGLE_NAME }) }
}

// Stateful host so toggling actually re-renders the form — needed to exercise the
// "remember last finite rounds" behaviour across an off→on round-trip.
function StatefulForm({ initialRounds }: { initialRounds: PatternSettings['rounds'] }) {
  const [settings, setSettings] = useState<PatternSettings>({ ...DEFAULT_PATTERN_SETTINGS, rounds: initialRounds })
  return <PatternBreathingSettingsForm settings={settings} onChange={setSettings} strings={FORM_STRINGS} />
}

describe('PatternBreathingSettingsForm — rounds limit toggle', () => {
  it('is on when rounds are finite, off when open-ended', () => {
    const { toggle } = renderForm(8)
    expect(toggle()).toBeChecked()
  })

  it('reflects open-ended as off', () => {
    const { toggle } = renderForm('open-ended')
    expect(toggle()).not.toBeChecked()
  })

  it('toggling off sets rounds to open-ended', async () => {
    const user = userEvent.setup()
    const { onChange, toggle } = renderForm(8)
    await user.click(toggle())
    expect(onChange).toHaveBeenCalledWith(expect.objectContaining({ rounds: 'open-ended' }))
  })

  it('toggling on from a fresh open-ended state restores the domain default', async () => {
    const user = userEvent.setup()
    const { onChange, toggle } = renderForm('open-ended')
    await user.click(toggle())
    expect(onChange).toHaveBeenCalledWith(expect.objectContaining({ rounds: DEFAULT_PATTERN_SETTINGS.rounds }))
  })

  it('toggling off then back on restores the user’s finite rounds', async () => {
    const user = userEvent.setup()
    render(<StatefulForm initialRounds={5} />)
    const toggle = () => screen.getByRole('switch', { name: TOGGLE_NAME })

    await user.click(toggle()) // off → open-ended
    expect(toggle()).not.toBeChecked()
    await user.click(toggle()) // on → restores 5, not the default
    expect(toggle()).toBeChecked()
    expect(screen.getByText('5')).toBeVisible()
  })
})
