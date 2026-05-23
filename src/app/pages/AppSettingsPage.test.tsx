import '@testing-library/jest-dom/vitest'
import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { describe, expect, it, vi } from 'vitest'

import { UI_STRINGS } from '../../content/strings'
import { AppSettingsPage } from './AppSettingsPage'

function renderPage(
  props: Partial<{
    onBack: () => void
    isIOS: boolean
    isStandalone: boolean
    installable: boolean
    onInstall: () => Promise<void>
  }> = {},
) {
  const onBack = props.onBack ?? vi.fn()
  const onInstall = props.onInstall ?? vi.fn().mockResolvedValue(undefined)
  const utils = render(
    <AppSettingsPage
      strings={UI_STRINGS.en}
      isIOS={props.isIOS ?? false}
      isStandalone={props.isStandalone ?? false}
      installable={props.installable ?? false}
      onInstall={onInstall}
      onBack={onBack}
    />,
  )
  return { ...utils, onBack, onInstall }
}

describe('AppSettingsPage', () => {
  it('renders the page title in a TopAppBar h1', () => {
    renderPage()
    expect(screen.getByRole('heading', { level: 1, name: 'Settings' })).toBeInTheDocument()
  })

  it('renders the back button with the locked Close aria-label', () => {
    renderPage()
    expect(screen.getByRole('button', { name: UI_STRINGS.en.settings.close })).toBeInTheDocument()
  })

  it('back button invokes onBack', async () => {
    const user = userEvent.setup()
    const { onBack } = renderPage()
    await user.click(screen.getByRole('button', { name: UI_STRINGS.en.settings.close }))
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

  it('focuses the back button on mount', () => {
    renderPage()
    expect(screen.getByRole('button', { name: UI_STRINGS.en.settings.close })).toHaveFocus()
  })
})
