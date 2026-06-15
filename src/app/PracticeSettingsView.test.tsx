import '@testing-library/jest-dom/vitest'
import { render, screen, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { useState, type ReactElement } from 'react'
import { describe, expect, it } from 'vitest'

import { UI_STRINGS } from '../content/strings'
import {
  DEFAULT_SETTINGS,
  type SessionSettings,
} from '../domain'
import { UiStringsProvider } from '../hooks/useUiStringsContext'
import type { AppPracticeSettingsViewModel } from './appViewModel'
import { PracticeSettingsView } from './PracticeSettingsView'

const EN = UI_STRINGS.en

const noopChange = (): void => {}
const noopExtend = (): void => {}

function makePatternBreathingVM(overrides: {
  settings?: SessionSettings
  isRunning?: boolean
  isComplete?: boolean
} = {}): AppPracticeSettingsViewModel {
  return {
    settings: overrides.settings ?? DEFAULT_SETTINGS,
    isRunning: overrides.isRunning ?? false,
    isComplete: overrides.isComplete ?? false,
    onChange: noopChange,
    onExtendDuration: noopExtend,
  }
}

// Mounts PracticeSettingsView with stateful sheet open/close so we can drive
// the full SetupCard → SettingsSheet → form flow from the test perspective.
function renderView(vm: AppPracticeSettingsViewModel): { rerender: () => void } {
  function Host(): ReactElement {
    const [open, setOpen] = useState(false)
    return (
      <UiStringsProvider value={EN}>
        <PracticeSettingsView
          settings={vm}
          isSheetOpen={open}
          onOpenSheet={() => { setOpen(true) }}
          onCloseSheet={() => { setOpen(false) }}
        />
      </UiStringsProvider>
    )
  }
  const utils = render(<Host />)
  return { rerender: () => { utils.rerender(<Host />) } }
}

describe('PracticeSettingsView — patternBreathing (Pattern Breathing)', () => {
  it('renders the SetupCard with PACE / RATIO / DURATION cells from current settings', () => {
    renderView(makePatternBreathingVM())
    const card = screen.getByRole('button', { name: /^Edit Pattern Breathing settings$/ })
    expect(within(card).getByText(EN.practice.settingsForm.bpmLabel)).toBeVisible()
    expect(within(card).getByText(EN.practice.settingsForm.ratioLabel)).toBeVisible()
    expect(within(card).getByText(EN.practice.settingsForm.durationLabel)).toBeVisible()
    expect(within(card).getByText('5.5 BPM')).toBeVisible()
    expect(within(card).getByText('10 min')).toBeVisible()
  })

  it('formats an open-ended duration with the openEndedLabel string', () => {
    renderView(makePatternBreathingVM({
      settings: { ...DEFAULT_SETTINGS, durationMinutes: 'open-ended' },
    }))
    const card = screen.getByRole('button', { name: /^Edit Pattern Breathing settings$/ })
    expect(within(card).getByText(EN.practice.settingsForm.openEndedLabel)).toBeVisible()
  })

  it('does not render the form on Idle until the SetupCard is tapped', async () => {
    const user = userEvent.setup()
    renderView(makePatternBreathingVM())
    expect(screen.queryByRole('group', { name: EN.practice.settingsForm.bpmLabel })).toBeNull()
    await user.click(screen.getByRole('button', { name: /^Edit Pattern Breathing settings$/ }))
    expect(screen.getByRole('group', { name: EN.practice.settingsForm.bpmLabel })).toBeVisible()
  })

  it('renders nothing on Running', () => {
    // J16: Pattern Breathing running surfaces no settings UI — SetupCard, sheet, and any
    // inline stepper are all hidden. extendDuration logic stays in the
    // viewmodel + controller but is unwired here.
    renderView(makePatternBreathingVM({ isRunning: true }))
    expect(screen.queryByRole('button', { name: /^Edit Pattern Breathing settings$/ })).toBeNull()
    expect(screen.queryByRole('group', { name: EN.practice.settingsForm.durationLabel })).toBeNull()
  })
})

describe('PracticeSettingsView — sheet header reuses the practice name', () => {
  it('uses "Practice" as the title and the practice heading as the subtitle', async () => {
    const user = userEvent.setup()
    renderView(makePatternBreathingVM())
    await user.click(screen.getByRole('button', { name: /^Edit Pattern Breathing settings$/ }))
    const dialog = screen.getByRole('dialog', { name: EN.practice.settingsSheet.title })
    expect(within(dialog).getByRole('heading', { level: 2, name: EN.practice.settingsSheet.title })).toBeVisible()
    expect(within(dialog).getByText(EN.practice.name)).toBeVisible()
  })

  it('the close button uses the localized close label and closes the sheet', async () => {
    const user = userEvent.setup()
    renderView(makePatternBreathingVM())
    await user.click(screen.getByRole('button', { name: /^Edit Pattern Breathing settings$/ }))
    expect(screen.getByRole('group', { name: EN.practice.settingsForm.bpmLabel })).toBeVisible()
    await user.click(screen.getByRole('button', { name: EN.practice.settingsSheet.close }))
    expect(screen.queryByRole('group', { name: EN.practice.settingsForm.bpmLabel })).toBeNull()
  })
})
