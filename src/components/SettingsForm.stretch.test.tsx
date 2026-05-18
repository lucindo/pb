import '@testing-library/jest-dom/vitest'
import { render, screen, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { describe, expect, it, vi } from 'vitest'

import { SettingsForm, type SettingsFormProps } from './SettingsForm'
import { UI_STRINGS } from '../content/strings'
import { DEFAULT_SETTINGS, DEFAULT_STRETCH_SETTINGS, type StretchSettings } from '../domain/settings'
import { computeStretchTotalMs } from '../domain/stretchRamp'

const EN = UI_STRINGS.en.settingsForm
const PRACTICE = UI_STRINGS.en.practice

function renderForm(overrides: Partial<SettingsFormProps> = {}) {
  const onChange = vi.fn()
  const onExtendDuration = vi.fn()
  const onStretchSettingsChange = vi.fn()
  render(
    <SettingsForm
      activePractice={overrides.activePractice ?? 'resonant'}
      settings={overrides.settings ?? DEFAULT_SETTINGS}
      isRunning={overrides.isRunning ?? false}
      onChange={overrides.onChange ?? onChange}
      onExtendDuration={overrides.onExtendDuration ?? onExtendDuration}
      strings={overrides.strings ?? EN}
      practiceStrings={overrides.practiceStrings ?? PRACTICE}
      stretchSettings={overrides.stretchSettings ?? DEFAULT_STRETCH_SETTINGS}
      onStretchSettingsChange={overrides.onStretchSettingsChange ?? onStretchSettingsChange}
    />,
  )
  return { onChange, onExtendDuration, onStretchSettingsChange }
}

// Stepper fieldsets expose role="group" named by their legend — query by these
// to avoid text collisions (e.g. "Stretch" is both the practice label and the
// ramp-stage field label).
const STRETCH_GROUPS = ['Start BPM', 'Target BPM', 'Warm-up', 'Stretch', 'Settle']

describe('SettingsForm — stretch surface (Phase 34 activePractice dispatch)', () => {
  it('activePractice="stretch": renders the stretch steppers (5 ramp groups)', () => {
    renderForm({ activePractice: 'stretch' })
    for (const group of STRETCH_GROUPS) {
      expect(screen.getByRole('group', { name: group })).toBeInTheDocument()
    }
  })

  it('activePractice="stretch": single BPM stepper is absent', () => {
    renderForm({ activePractice: 'stretch' })
    expect(screen.queryByRole('group', { name: 'BPM' })).not.toBeInTheDocument()
  })

  it('activePractice="stretch": no Standard/Stretch mode switch rendered', () => {
    renderForm({ activePractice: 'stretch' })
    expect(screen.queryByRole('switch', { name: 'Session mode' })).not.toBeInTheDocument()
  })

  it('activePractice="resonant": standard knobs, no stretch steppers', () => {
    renderForm({ activePractice: 'resonant' })
    expect(screen.getByRole('group', { name: 'BPM' })).toBeInTheDocument()
    for (const group of STRETCH_GROUPS) {
      expect(screen.queryByRole('group', { name: group })).not.toBeInTheDocument()
    }
  })

  it('lowering initialBpm auto-corrects a now-invalid targetBpm below the new initialBpm', async () => {
    const user = userEvent.setup()
    const { onStretchSettingsChange } = renderForm({
      activePractice: 'stretch',
      stretchSettings: { ...DEFAULT_STRETCH_SETTINGS, initialBpm: 2, targetBpm: 1.5 },
    })
    await user.click(screen.getByRole('button', { name: EN.stepper.decreaseLabel('Start BPM') }))
    expect(onStretchSettingsChange).toHaveBeenCalledTimes(1)
    const next = onStretchSettingsChange.mock.calls[0]?.[0] as StretchSettings
    expect(next.initialBpm).toBe(1.5)
    expect(next.targetBpm).toBe(1)
    expect(next.targetBpm).toBeLessThan(next.initialBpm)
  })

  it('read-only Duration box shows the computed total for default stretch values', () => {
    renderForm({ activePractice: 'stretch' })
    // CR-01: duration is derived from the snapped segment table, not raw minute sum.
    // DEFAULT_STRETCH_SETTINGS (5.5→4.5 BPM) produces cycle-aligned drift — the
    // displayed value may differ from '15 min' depending on the snapped total.
    const expectedTotalMs = computeStretchTotalMs(DEFAULT_STRETCH_SETTINGS)!
    const expectedText = `${String(expectedTotalMs / 60_000)} min`
    const duration = screen.getByRole('group', { name: 'Duration' })
    expect(within(duration).getByText(expectedText)).toBeInTheDocument()
  })

  it('Duration box shows the open-ended label when cool-down is open-ended', () => {
    renderForm({
      activePractice: 'stretch',
      stretchSettings: { ...DEFAULT_STRETCH_SETTINGS, coolDownMinutes: 'open-ended' },
    })
    const duration = screen.getByRole('group', { name: 'Duration' })
    expect(within(duration).getByText('Open-ended')).toBeInTheDocument()
  })

  // UAT GAP 1: Duration readout shows a rounded whole-minute value (not an unrounded float)
  it('GAP 1: Duration readout shows a rounded whole-minute string, not a fractional float', () => {
    renderForm({ activePractice: 'stretch' })
    const totalMs = computeStretchTotalMs(DEFAULT_STRETCH_SETTINGS)!
    const roundedMinutes = Math.round(totalMs / 60_000)
    const duration = screen.getByRole('group', { name: 'Duration' })
    // The text must use the rounded integer, not the raw quotient (which may be a float)
    expect(within(duration).getByText(`${String(roundedMinutes)} min`)).toBeInTheDocument()
    // The unrounded float must NOT appear if it differs from the rounded value
    const rawFloat = totalMs / 60_000
    if (rawFloat !== roundedMinutes) {
      expect(within(duration).queryByText(`${String(rawFloat)} min`)).not.toBeInTheDocument()
    }
  })

  // UAT GAP 1: open-ended branch is preserved (the open-ended label is unaffected by the rounding fix)
  it('GAP 1: open-ended cool-down still shows open-ended label (rounding fix does not affect open-ended branch)', () => {
    renderForm({
      activePractice: 'stretch',
      stretchSettings: { ...DEFAULT_STRETCH_SETTINGS, coolDownMinutes: 'open-ended' },
    })
    const duration = screen.getByRole('group', { name: 'Duration' })
    expect(within(duration).getByText('Open-ended')).toBeInTheDocument()
    expect(within(duration).queryByText(/\d+\.\d+ min/)).not.toBeInTheDocument()
  })

  // UAT GAP 2: stretch steppers are hidden when isRunning is true (mirrors resonant behavior)
  it('GAP 2: with isRunning=true, none of the stretch steppers render', () => {
    renderForm({ activePractice: 'stretch', isRunning: true })
    // All ramp groups must be absent during a running session
    for (const group of STRETCH_GROUPS) {
      expect(screen.queryByRole('group', { name: group })).not.toBeInTheDocument()
    }
    // The Ratio and Duration groups must also be absent
    expect(screen.queryByRole('group', { name: 'Ratio' })).not.toBeInTheDocument()
    expect(screen.queryByRole('group', { name: 'Duration' })).not.toBeInTheDocument()
  })

  // UAT GAP 2: stretch steppers are visible when isRunning is false (no regression)
  it('GAP 2: with isRunning=false, all stretch steppers render (no regression)', () => {
    renderForm({ activePractice: 'stretch', isRunning: false })
    for (const group of STRETCH_GROUPS) {
      expect(screen.getByRole('group', { name: group })).toBeInTheDocument()
    }
    expect(screen.getByRole('group', { name: 'Ratio' })).toBeInTheDocument()
    expect(screen.getByRole('group', { name: 'Duration' })).toBeInTheDocument()
  })

  it('changing ratio calls onStretchSettingsChange with updated ratio', async () => {
    const user = userEvent.setup()
    const { onStretchSettingsChange } = renderForm({
      activePractice: 'stretch',
      stretchSettings: { ...DEFAULT_STRETCH_SETTINGS, ratio: '40:60' },
    })
    const ratioGroup = screen.getByRole('group', { name: 'Ratio' })
    await user.click(within(ratioGroup).getByRole('button', { name: EN.stepper.decreaseLabel('Ratio') }))
    expect(onStretchSettingsChange).toHaveBeenCalledTimes(1)
    expect((onStretchSettingsChange.mock.calls[0]?.[0] as StretchSettings).ratio).toBe('50:50')
  })
})

describe('SettingsForm — practice-aware dispatch (Phase 30 PRACTICE-06 / D-01/D-03/D-04)', () => {
  it('activePractice="resonant": renders the resonant knobs', () => {
    renderForm({ activePractice: 'resonant' })
    expect(screen.getByRole('group', { name: 'BPM' })).toBeInTheDocument()
  })

  it('activePractice="naviKriya": renders the NK scaffold with NO resonant knobs', () => {
    renderForm({ activePractice: 'naviKriya' })
    // No resonant knobs in the Navi Kriya branch (D-01 structural scaffold only).
    expect(screen.queryByRole('group', { name: 'BPM' })).not.toBeInTheDocument()
    for (const group of STRETCH_GROUPS) {
      expect(screen.queryByRole('group', { name: group })).not.toBeInTheDocument()
    }
    expect(screen.queryByRole('switch', { name: 'Session mode' })).not.toBeInTheDocument()
  })

  it('activePractice="naviKriya": renders the real NK controls and no inline practice heading', () => {
    renderForm({ activePractice: 'naviKriya' })
    // Phase 31 (Plan 31-05): the Phase 30 placeholder stub is replaced by the
    // real NK controls — full coverage lives in SettingsForm.nk.test.tsx.
    expect(
      screen.getByRole('group', { name: UI_STRINGS.en.nkControls.roundsLabel }),
    ).toBeInTheDocument()
    // The practice is named in the app header/title, not by an inline heading.
    expect(screen.queryByRole('heading')).not.toBeInTheDocument()
  })
  // Phase 31 (mute-parity refactor): the Navi Start button moved out of
  // SettingsForm into App.tsx (next to the MuteToggle), so the former
  // "Start button is live" assertion now lives in the App integration tests.
})
