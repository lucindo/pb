import '@testing-library/jest-dom/vitest'
import { render, screen } from '@testing-library/react'
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

const STRETCH_LEGENDS = ['Start BPM', 'Target BPM', 'Warm-up', 'Ramp', 'Cool-down']

describe('SettingsForm — stretch surface (Plan 22-04)', () => {
  it('renders the Standard/Stretch mode picker', () => {
    renderForm()
    expect(screen.getByText('Session mode')).toBeInTheDocument()
  })

  it('standard mode: single BPM stepper present, no stretch field steppers', () => {
    renderForm({ settings: { ...DEFAULT_SETTINGS, mode: 'standard' } })
    expect(screen.getByText('BPM')).toBeInTheDocument()
    for (const legend of STRETCH_LEGENDS) {
      expect(screen.queryByText(legend)).not.toBeInTheDocument()
    }
  })

  it('stretch mode: 5 stretch steppers present, single BPM stepper absent', () => {
    renderForm({ settings: { ...DEFAULT_SETTINGS, mode: 'stretch' } })
    expect(screen.queryByText('BPM')).not.toBeInTheDocument()
    for (const legend of STRETCH_LEGENDS) {
      expect(screen.getByText(legend)).toBeInTheDocument()
    }
  })

  it('gate: a sub-15-min stretch total disables the →Stretch increase button and shows the hint', () => {
    // mode 'standard' so the mode picker's increase points at →Stretch (the gated direction)
    renderForm({ settings: { ...DEFAULT_SETTINGS, mode: 'standard', rampDurationMinutes: 5 } })
    expect(screen.getByText('Needs a 15+ min session')).toBeInTheDocument()
    expect(screen.getByRole('button', { name: EN.stepper.increaseLabel('Session mode') }))
      .toBeDisabled()
  })

  it('no gate hint and →Stretch enabled when the stretch total clears 15 minutes', () => {
    renderForm({ settings: { ...DEFAULT_SETTINGS, mode: 'standard' } })
    expect(screen.queryByText('Needs a 15+ min session')).not.toBeInTheDocument()
    expect(screen.getByRole('button', { name: EN.stepper.increaseLabel('Session mode') }))
      .toBeEnabled()
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

  it('computed-total readout shows "Total: 20:00" for the default stretch field values', () => {
    renderForm({ settings: { ...DEFAULT_SETTINGS, mode: 'stretch' } })
    expect(screen.getByText('Total: 20:00')).toBeInTheDocument()
  })

  it('computed-total readout shows the open-ended label when holdTarget is open-ended', () => {
    renderForm({ settings: { ...DEFAULT_SETTINGS, mode: 'stretch', holdTargetSeconds: 'open-ended' } })
    expect(screen.getByText('Total: Open-ended')).toBeInTheDocument()
  })
})
