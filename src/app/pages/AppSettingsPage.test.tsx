import '@testing-library/jest-dom/vitest'
import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { describe, expect, it, vi } from 'vitest'

import { UI_STRINGS } from '../../content/strings'
import { UiStringsProvider } from '../../hooks/useUiStringsContext'
import { AppSettingsPage } from './AppSettingsPage'
import type { PersistedStats } from '../../storage'

const SAMPLE_STAT: PersistedStats = {
  totalSessions: 0,
  totalElapsedSeconds: 0,
  lastSessionAtMs: null,
  lastSessionDurationSeconds: 0,
}

function renderPage(
  props: Partial<{
    onBack: () => void
    isIOS: boolean
    isStandalone: boolean
    installable: boolean
    onInstall: () => Promise<void>
    onResetStats: () => void
  }> = {},
) {
  const onBack = props.onBack ?? vi.fn()
  const onInstall = props.onInstall ?? vi.fn().mockResolvedValue(undefined)
  const onResetStats = props.onResetStats ?? vi.fn()
  const utils = render(
    <UiStringsProvider value={UI_STRINGS.en}>
      <AppSettingsPage
        isIOS={props.isIOS ?? false}
        isStandalone={props.isStandalone ?? false}
        installable={props.installable ?? false}
        onInstall={onInstall}
        onBack={onBack}
        stat={SAMPLE_STAT}
        practiceName="HRV"
        locale="en"
        onResetStats={onResetStats}
      />
    </UiStringsProvider>,
  )
  return { ...utils, onBack, onInstall, onResetStats }
}

describe('AppSettingsPage', () => {
  it('renders the page title in a TopAppBar h1', () => {
    renderPage()
    expect(screen.getByRole('heading', { level: 1, name: 'Settings' })).toBeInTheDocument()
  })

  it('renders the back button with the locked Close aria-label', () => {
    renderPage()
    expect(screen.getByRole('button', { name: UI_STRINGS.en.appSettings.close })).toBeInTheDocument()
  })

  it('back button invokes onBack', async () => {
    const user = userEvent.setup()
    const { onBack } = renderPage()
    await user.click(screen.getByRole('button', { name: UI_STRINGS.en.appSettings.close }))
    expect(onBack).toHaveBeenCalledTimes(1)
  })

  it('renders the inline Statistics heading (no sub-page navigation)', () => {
    renderPage()
    expect(
      screen.getByRole('heading', { level: 2, name: UI_STRINGS.en.appSettings.sections.statistics }),
    ).toBeInTheDocument()
  })

  it('renders three picker radiogroups (Theme / Timbre / Language)', () => {
    renderPage()
    const radiogroups = screen.getAllByRole('radiogroup')
    expect(radiogroups).toHaveLength(3)
  })

  it('pickers are enabled on the page (inSessionView is always false here)', () => {
    renderPage()
    const radiogroups = screen.getAllByRole('radiogroup')
    for (const rg of radiogroups) {
      expect(rg).toHaveAttribute('aria-disabled', 'false')
    }
  })

  it('install row absent when installable=false', () => {
    renderPage({ installable: false })
    expect(screen.queryByText(UI_STRINGS.en.install.settingsLabel)).not.toBeInTheDocument()
  })

  it('install row visible when installable=true and isStandalone=false', () => {
    renderPage({ installable: true, isStandalone: false })
    expect(screen.getByText(UI_STRINGS.en.install.settingsLabel)).toBeInTheDocument()
  })

  it('focuses the back button on mount', () => {
    renderPage()
    expect(screen.getByRole('button', { name: UI_STRINGS.en.appSettings.close })).toHaveFocus()
  })
})
