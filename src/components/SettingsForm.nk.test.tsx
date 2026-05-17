import '@testing-library/jest-dom/vitest'
import { render, screen, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { useState } from 'react'
import { describe, expect, it, vi } from 'vitest'

import { SettingsForm, type SettingsFormProps } from './SettingsForm'
import { UI_STRINGS } from '../content/strings'
import { DEFAULT_SETTINGS } from '../domain/settings'
import {
  DEFAULT_NK_SETTINGS,
  NK_FRONT_COUNT_OPTIONS,
  type NaviKriyaSettings,
} from '../domain/naviKriyaSettings'

const EN = UI_STRINGS.en.settingsForm
const PRACTICE = UI_STRINGS.en.practice
const NK = UI_STRINGS.en.nkControls

// Stateful harness — the duration estimate and stepper values are derived from
// the nkSettings prop, so changes must flow through a real state holder for the
// "updates live" assertions to mean anything.
function NKHarness({
  initial = DEFAULT_NK_SETTINGS,
  onChangeSpy,
}: {
  initial?: NaviKriyaSettings
  onChangeSpy?: (settings: NaviKriyaSettings) => void
}) {
  const [nk, setNk] = useState<NaviKriyaSettings>(initial)
  const props: SettingsFormProps = {
    activePractice: 'naviKriya',
    settings: DEFAULT_SETTINGS,
    isRunning: false,
    onChange: () => undefined,
    onExtendDuration: () => undefined,
    strings: EN,
    practiceStrings: PRACTICE,
    nkSettings: nk,
    onNKSettingsChange: (next) => {
      onChangeSpy?.(next)
      setNk(next)
    },
    nkControlsStrings: NK,
  }
  return <SettingsForm {...props} />
}

describe('SettingsForm — Navi Kriya controls (Plan 31-05, NK-02/03/04/06, D-14)', () => {
  it('renders the four NK controls with labels from strings.nkControls', () => {
    render(<NKHarness />)
    expect(screen.getByRole('group', { name: NK.roundsLabel })).toBeInTheDocument()
    expect(screen.getByRole('group', { name: NK.frontCountLabel })).toBeInTheDocument()
    expect(screen.getByRole('group', { name: NK.omLengthLabel })).toBeInTheDocument()
    expect(screen.getByRole('switch', { name: NK.perOmCueLabel })).toBeInTheDocument()
  })

  it('changing the rounds stepper calls onNKSettingsChange with the updated rounds', async () => {
    const user = userEvent.setup()
    const onChangeSpy = vi.fn()
    render(<NKHarness initial={{ ...DEFAULT_NK_SETTINGS, rounds: 3 }} onChangeSpy={onChangeSpy} />)
    await user.click(screen.getByRole('button', { name: EN.stepper.increaseLabel(NK.roundsLabel) }))
    expect(onChangeSpy).toHaveBeenCalledTimes(1)
    expect((onChangeSpy.mock.calls[0]?.[0] as NaviKriyaSettings).rounds).toBe(4)
  })

  it('every front-count option is a multiple of 4 (T-31-11)', () => {
    expect(NK_FRONT_COUNT_OPTIONS.length).toBeGreaterThan(0)
    for (const option of NK_FRONT_COUNT_OPTIONS) {
      expect(option % 4).toBe(0)
    }
  })

  it('changing the front-count stepper calls back with a multiple-of-4 frontCount', async () => {
    const user = userEvent.setup()
    const onChangeSpy = vi.fn()
    render(<NKHarness initial={{ ...DEFAULT_NK_SETTINGS, frontCount: 100 }} onChangeSpy={onChangeSpy} />)
    await user.click(screen.getByRole('button', { name: EN.stepper.increaseLabel(NK.frontCountLabel) }))
    expect(onChangeSpy).toHaveBeenCalledTimes(1)
    const next = onChangeSpy.mock.calls[0]?.[0] as NaviKriyaSettings
    expect(next.frontCount % 4).toBe(0)
  })

  it('the OM-length control offers fast/medium/slow and calls back with the chosen omLength', async () => {
    const user = userEvent.setup()
    const onChangeSpy = vi.fn()
    render(<NKHarness initial={{ ...DEFAULT_NK_SETTINGS, omLength: 'medium' }} onChangeSpy={onChangeSpy} />)
    const omGroup = screen.getByRole('group', { name: NK.omLengthLabel })
    expect(within(omGroup).getByText(NK.omLengthMedium)).toBeInTheDocument()
    await user.click(screen.getByRole('button', { name: EN.stepper.decreaseLabel(NK.omLengthLabel) }))
    expect((onChangeSpy.mock.calls[0]?.[0] as NaviKriyaSettings).omLength).toBe('fast')
  })

  it('toggling the per-OM cue calls onNKSettingsChange with the flipped perOmCue', async () => {
    const user = userEvent.setup()
    const onChangeSpy = vi.fn()
    render(<NKHarness initial={{ ...DEFAULT_NK_SETTINGS, perOmCue: true }} onChangeSpy={onChangeSpy} />)
    await user.click(screen.getByRole('switch', { name: NK.perOmCueLabel }))
    expect(onChangeSpy).toHaveBeenCalledTimes(1)
    expect((onChangeSpy.mock.calls[0]?.[0] as NaviKriyaSettings).perOmCue).toBe(false)
  })

  it('D-14: the estimated-duration line has aria-live="polite" and updates live with rounds', async () => {
    const user = userEvent.setup()
    render(<NKHarness initial={{ ...DEFAULT_NK_SETTINGS, rounds: 3 }} />)
    // 3 * (100 + 25) * 2.16s * 1000 + 3500ms = 813500ms -> round(13.56) = 14 min
    const line = screen.getByText(NK.estimatedDuration(14))
    expect(line).toHaveAttribute('aria-live', 'polite')
    await user.click(screen.getByRole('button', { name: EN.stepper.increaseLabel(NK.roundsLabel) }))
    // 4 * 125 * 2160 + 3500 = 1083500ms -> round(18.06) = 18 min
    expect(screen.getByText(NK.estimatedDuration(18))).toBeInTheDocument()
  })

  it('WR-04: the NK steppers and per-OM toggle render enabled (the form is unmounted mid-session, so there is no in-session disabled state)', () => {
    render(<NKHarness />)
    expect(screen.getByRole('button', { name: EN.stepper.increaseLabel(NK.roundsLabel) })).toBeEnabled()
    expect(screen.getByRole('button', { name: EN.stepper.increaseLabel(NK.frontCountLabel) })).toBeEnabled()
    expect(screen.getByRole('button', { name: EN.stepper.increaseLabel(NK.omLengthLabel) })).toBeEnabled()
    // D-07: the per-OM tick toggle is stale-closure-safe and must remain live.
    expect(screen.getByRole('switch', { name: NK.perOmCueLabel })).toBeEnabled()
  })
})
