import '@testing-library/jest-dom/vitest'
import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { describe, expect, it, vi } from 'vitest'

import { UI_STRINGS } from '../../content/strings'
import { UiStringsProvider } from '../../hooks/useUiStringsContext'
import { AppSettingsPage } from './AppSettingsPage'

function renderPage(
  props: Partial<{
    onBack: () => void
    isIOS: boolean
    isStandalone: boolean
    installable: boolean
    onInstall: () => Promise<void>
    onAppearanceOpen: () => void
    returningFromAppearance: boolean
  }> = {},
) {
  const onBack = props.onBack ?? vi.fn()
  const onInstall = props.onInstall ?? vi.fn().mockResolvedValue(undefined)
  const onAppearanceOpen = props.onAppearanceOpen ?? vi.fn()
  const returningFromAppearance = props.returningFromAppearance ?? false
  const utils = render(
    <UiStringsProvider value={UI_STRINGS.en}>
      <AppSettingsPage
        isIOS={props.isIOS ?? false}
        isStandalone={props.isStandalone ?? false}
        installable={props.installable ?? false}
        onInstall={onInstall}
        onBack={onBack}
        onAppearanceOpen={onAppearanceOpen}
        returningFromAppearance={returningFromAppearance}
      />
    </UiStringsProvider>,
  )
  return { ...utils, onBack, onInstall, onAppearanceOpen }
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

  it('renders all four picker radiogroups (Theme / Cue / Timbre / Language)', () => {
    renderPage()
    const radiogroups = screen.getAllByRole('radiogroup')
    expect(radiogroups).toHaveLength(4)
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

  it('focuses the back button on mount when returningFromAppearance=false', () => {
    renderPage({ returningFromAppearance: false })
    expect(screen.getByRole('button', { name: UI_STRINGS.en.appSettings.close })).toHaveFocus()
  })

  it('focuses the right-chevron on mount when returningFromAppearance=true', () => {
    renderPage({ returningFromAppearance: true })
    expect(
      screen.getByRole('button', { name: UI_STRINGS.en.appearance.rightChevronAriaOnSettings }),
    ).toHaveFocus()
  })

  it('renders the right-chevron and invokes onAppearanceOpen when clicked', async () => {
    const user = userEvent.setup()
    const { onAppearanceOpen } = renderPage()
    const chevron = screen.getByRole('button', {
      name: UI_STRINGS.en.appearance.rightChevronAriaOnSettings,
    })
    expect(chevron).toBeInTheDocument()
    await user.click(chevron)
    expect(onAppearanceOpen).toHaveBeenCalledTimes(1)
  })
})
