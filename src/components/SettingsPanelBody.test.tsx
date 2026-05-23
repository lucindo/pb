import '@testing-library/jest-dom/vitest'
import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { describe, expect, it, vi } from 'vitest'

import { UI_STRINGS } from '../content/strings'
import { SettingsPanelBody } from './SettingsPanelBody'

function renderBody(
  props: Partial<{
    inSessionView: boolean
    isIOS: boolean
    isStandalone: boolean
    installable: boolean
    onInstall: () => Promise<void>
  }> = {},
) {
  const onInstall = props.onInstall ?? vi.fn().mockResolvedValue(undefined)
  return {
    ...render(
      <SettingsPanelBody
        inSessionView={props.inSessionView ?? false}
        strings={UI_STRINGS.en}
        isIOS={props.isIOS ?? false}
        isStandalone={props.isStandalone ?? false}
        installable={props.installable ?? false}
        onInstall={onInstall}
      />,
    ),
    onInstall,
  }
}

describe('SettingsPanelBody', () => {
  it('renders all four pickers (Theme / Cue / Timbre / Language)', () => {
    renderBody()
    expect(screen.getByText('Theme')).toBeInTheDocument()
    expect(screen.getByText('Cue style')).toBeInTheDocument()
    expect(screen.getByText('Timbre')).toBeInTheDocument()
    expect(screen.getByText('Language')).toBeInTheDocument()
    expect(screen.getAllByRole('radiogroup')).toHaveLength(4)
  })

  it('disables all picker radiogroups when inSessionView=true', () => {
    renderBody({ inSessionView: true })
    for (const rg of screen.getAllByRole('radiogroup')) {
      expect(rg).toHaveAttribute('aria-disabled', 'true')
    }
  })

  it('install row absent when installable=false', () => {
    renderBody({ installable: false })
    expect(screen.queryByText(UI_STRINGS.en.install.settingsLabel)).not.toBeInTheDocument()
  })

  it('install row absent when isStandalone=true even if installable=true', () => {
    renderBody({ installable: true, isStandalone: true })
    expect(screen.queryByText(UI_STRINGS.en.install.settingsLabel)).not.toBeInTheDocument()
  })

  it('install row visible when installable=true and isStandalone=false', () => {
    renderBody({ installable: true, isStandalone: false })
    expect(screen.getByText(UI_STRINGS.en.install.settingsLabel)).toBeInTheDocument()
  })

  it('Android path: install button fires onInstall when clicked', async () => {
    const user = userEvent.setup()
    const { onInstall } = renderBody({ installable: true, isIOS: false })
    await user.click(screen.getByRole('button', { name: UI_STRINGS.en.install.installButton }))
    expect(onInstall).toHaveBeenCalledTimes(1)
  })

  it('iOS path: steps-toggle button replaces install button', () => {
    renderBody({ installable: true, isIOS: true })
    expect(screen.getByRole('button', { name: UI_STRINGS.en.install.iosStepsButton })).toBeInTheDocument()
    expect(screen.queryByRole('button', { name: UI_STRINGS.en.install.installButton })).not.toBeInTheDocument()
  })
})
