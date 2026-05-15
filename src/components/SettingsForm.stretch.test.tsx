import '@testing-library/jest-dom/vitest'
import { render, screen, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { describe, expect, it, vi } from 'vitest'

import { SettingsForm, type SettingsFormProps } from './SettingsForm'
import { UI_STRINGS } from '../content/strings'
import { DEFAULT_SETTINGS, type SessionSettings } from '../domain/settings'

const EN = UI_STRINGS.en.settingsForm

function renderForm(overrides: Partial<SettingsFormProps> = {}) {
  const onChange = vi.fn()
  const onExtendDuration = vi.fn()
  render(
    <SettingsForm
      settings={overrides.settings ?? DEFAULT_SETTINGS}
      isRunning={overrides.isRunning ?? false}
      onChange={overrides.onChange ?? onChange}
      onExtendDuration={overrides.onExtendDuration ?? onExtendDuration}
      strings={overrides.strings ?? EN}
    />,
  )
  return { onChange, onExtendDuration }
}

// Stepper fieldsets expose role="group" named by their legend — query by these
// to avoid text collisions (e.g. "Stretch" is both the mode label and the
// ramp-stage field label).
const STRETCH_GROUPS = ['Start BPM', 'Target BPM', 'Warm-up', 'Stretch', 'Settle']

describe('SettingsForm — stretch surface (Plan 22-04 / 22-05 redesign)', () => {
  it('renders the Standard/Stretch mode switch', () => {
    renderForm()
    expect(screen.getByRole('switch', { name: 'Session mode' })).toBeInTheDocument()
  })

  it('standard mode: single BPM stepper present, no stretch field steppers', () => {
    renderForm({ settings: { ...DEFAULT_SETTINGS, mode: 'standard' } })
    expect(screen.getByRole('group', { name: 'BPM' })).toBeInTheDocument()
    for (const group of STRETCH_GROUPS) {
      expect(screen.queryByRole('group', { name: group })).not.toBeInTheDocument()
    }
  })

  it('stretch mode: 5 stretch field steppers present, single BPM stepper absent', () => {
    renderForm({ settings: { ...DEFAULT_SETTINGS, mode: 'stretch' } })
    expect(screen.queryByRole('group', { name: 'BPM' })).not.toBeInTheDocument()
    for (const group of STRETCH_GROUPS) {
      expect(screen.getByRole('group', { name: group })).toBeInTheDocument()
    }
  })

  it('toggling the switch from standard fires onChange with mode "stretch"', async () => {
    const user = userEvent.setup()
    const { onChange } = renderForm({ settings: { ...DEFAULT_SETTINGS, mode: 'standard' } })
    await user.click(screen.getByRole('switch', { name: 'Session mode' }))
    expect(onChange).toHaveBeenCalledTimes(1)
    expect((onChange.mock.calls[0]?.[0] as SessionSettings).mode).toBe('stretch')
  })

  it('lowering initialBpm auto-corrects a now-invalid targetBpm below the new initialBpm', async () => {
    const user = userEvent.setup()
    const { onChange } = renderForm({
      settings: { ...DEFAULT_SETTINGS, mode: 'stretch', initialBpm: 2, targetBpm: 1.5 },
    })
    await user.click(screen.getByRole('button', { name: EN.stepper.decreaseLabel('Start BPM') }))
    expect(onChange).toHaveBeenCalledTimes(1)
    const next = onChange.mock.calls[0]?.[0] as SessionSettings
    expect(next.initialBpm).toBe(1.5)
    expect(next.targetBpm).toBe(1)
    expect(next.targetBpm).toBeLessThan(next.initialBpm)
  })

  it('read-only Duration box shows the computed total for default stretch values', () => {
    renderForm({ settings: { ...DEFAULT_SETTINGS, mode: 'stretch' } })
    // warm-up 5 + ramp 5 + cool-down 5 = 15 min
    const duration = screen.getByRole('group', { name: 'Duration' })
    expect(within(duration).getByText('15 min')).toBeInTheDocument()
  })

  it('Duration box shows the open-ended label when cool-down is open-ended', () => {
    renderForm({ settings: { ...DEFAULT_SETTINGS, mode: 'stretch', coolDownMinutes: 'open-ended' } })
    const duration = screen.getByRole('group', { name: 'Duration' })
    expect(within(duration).getByText('Open-ended')).toBeInTheDocument()
  })
})
