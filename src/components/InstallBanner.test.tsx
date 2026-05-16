// Phase 28 Plan 03: InstallBanner component tests.
// Covers 6 behaviors: Android install path, iOS path, iOS inline expand,
// dismiss control, role/aria-label region, and banner text.
import '@testing-library/jest-dom/vitest'
import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { describe, expect, it, vi } from 'vitest'

import { InstallBanner, type InstallBannerProps } from './InstallBanner'
import { UI_STRINGS } from '../content/strings'

function renderBanner(props: Partial<InstallBannerProps> = {}) {
  const onInstall = props.onInstall ?? vi.fn().mockResolvedValue(undefined)
  const onDismiss = props.onDismiss ?? vi.fn()
  const utils = render(
    <InstallBanner
      isIOS={props.isIOS ?? false}
      onInstall={onInstall}
      onDismiss={onDismiss}
      strings={props.strings ?? UI_STRINGS.en.install}
    />,
  )
  return { ...utils, onInstall, onDismiss }
}

describe('InstallBanner', () => {
  // Test 1: Android path — Install button renders and calls onInstall on click
  it('with isIOS=false renders an Install button and clicking it calls onInstall once', async () => {
    const user = userEvent.setup()
    const { onInstall } = renderBanner({ isIOS: false })
    const installBtn = screen.getByRole('button', { name: UI_STRINGS.en.install.installButton })
    expect(installBtn).toBeInTheDocument()
    await user.click(installBtn)
    expect(onInstall).toHaveBeenCalledTimes(1)
  })

  // Test 2: iOS path — iosStepsButton renders, no Install button
  it('with isIOS=true renders a "How to install" button and no "Install" button', () => {
    renderBanner({ isIOS: true })
    expect(screen.getByRole('button', { name: UI_STRINGS.en.install.iosStepsButton })).toBeInTheDocument()
    expect(screen.queryByRole('button', { name: UI_STRINGS.en.install.installButton })).not.toBeInTheDocument()
  })

  // Test 3: iOS steps expand inline on tap
  it('with isIOS=true iOS steps are hidden initially and appear after clicking "How to install"', async () => {
    const user = userEvent.setup()
    renderBanner({ isIOS: true })
    // Steps absent initially
    expect(screen.queryByText(UI_STRINGS.en.install.iosStep1)).not.toBeInTheDocument()
    expect(screen.queryByText(UI_STRINGS.en.install.iosStep2)).not.toBeInTheDocument()
    expect(screen.queryByText(UI_STRINGS.en.install.iosStep3)).not.toBeInTheDocument()
    // Expand
    await user.click(screen.getByRole('button', { name: UI_STRINGS.en.install.iosStepsButton }))
    // Steps now visible
    expect(screen.getByText(UI_STRINGS.en.install.iosStep1)).toBeInTheDocument()
    expect(screen.getByText(UI_STRINGS.en.install.iosStep2)).toBeInTheDocument()
    expect(screen.getByText(UI_STRINGS.en.install.iosStep3)).toBeInTheDocument()
  })

  // Test 4: Dismiss button present and calls onDismiss — both modes
  it('dismiss button is present in Android mode and calling it calls onDismiss once', async () => {
    const user = userEvent.setup()
    const { onDismiss } = renderBanner({ isIOS: false })
    const dismissBtn = screen.getByRole('button', { name: UI_STRINGS.en.install.dismiss })
    expect(dismissBtn).toBeInTheDocument()
    await user.click(dismissBtn)
    expect(onDismiss).toHaveBeenCalledTimes(1)
  })

  it('dismiss button is present in iOS mode and calling it calls onDismiss once', async () => {
    const user = userEvent.setup()
    const { onDismiss } = renderBanner({ isIOS: true })
    const dismissBtn = screen.getByRole('button', { name: UI_STRINGS.en.install.dismiss })
    expect(dismissBtn).toBeInTheDocument()
    await user.click(dismissBtn)
    expect(onDismiss).toHaveBeenCalledTimes(1)
  })

  // Test 5: banner container has role="region" and a localized aria-label
  it('banner container has role="region" and a localized aria-label', () => {
    renderBanner()
    const region = screen.getByRole('region', { name: UI_STRINGS.en.install.regionLabel })
    expect(region).toBeInTheDocument()
  })

  // Test 6: always-visible one-line bannerText is rendered
  it('renders the one-line bannerText', () => {
    renderBanner()
    expect(screen.getByText(UI_STRINGS.en.install.bannerText)).toBeInTheDocument()
  })
})
