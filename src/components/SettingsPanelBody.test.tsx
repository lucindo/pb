import '@testing-library/jest-dom/vitest'
import { render, screen, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { afterEach, describe, expect, it, vi } from 'vitest'

import { UI_STRINGS } from '../content/strings'
import type { PersistedStats } from '../storage'
import { SettingsPanelBody } from './SettingsPanelBody'

const SAMPLE_STAT: PersistedStats = {
  totalSessions: 3,
  totalElapsedSeconds: 3720, // 1h 2m
  lastSessionAtMs: null,
  lastSessionDurationSeconds: 60,
}

function renderBody(
  props: Partial<{
    inSessionView: boolean
    isIOS: boolean
    isStandalone: boolean
    installable: boolean
    onInstall: () => Promise<void>
    onResetStats: () => void
    stat: PersistedStats
  }> = {},
) {
  const onInstall = props.onInstall ?? vi.fn().mockResolvedValue(undefined)
  const onResetStats = props.onResetStats ?? vi.fn()
  return {
    ...render(
      <SettingsPanelBody
        inSessionView={props.inSessionView ?? false}
        strings={UI_STRINGS.en}
        isIOS={props.isIOS ?? false}
        isStandalone={props.isStandalone ?? false}
        installable={props.installable ?? false}
        onInstall={onInstall}
        stat={props.stat ?? SAMPLE_STAT}
        practiceName="HRV"
        locale="en"
        onResetStats={onResetStats}
      />,
    ),
    onInstall,
    onResetStats,
  }
}

const EN = UI_STRINGS.en.appSettings

afterEach(() => {
  vi.restoreAllMocks()
})

describe('SettingsPanelBody — sectioning', () => {
  it('renders the 4 section headings (System / Sound / Statistics / About)', () => {
    renderBody()
    expect(screen.getByRole('heading', { level: 2, name: EN.sections.system })).toBeInTheDocument()
    expect(screen.getByRole('heading', { level: 2, name: EN.sections.sound })).toBeInTheDocument()
    expect(screen.getByRole('heading', { level: 2, name: EN.sections.statistics })).toBeInTheDocument()
    expect(screen.getByRole('heading', { level: 2, name: EN.sections.about })).toBeInTheDocument()
  })

  it('renders three pickers (Theme + Timbre + Language)', () => {
    renderBody()
    expect(screen.getAllByRole('radiogroup')).toHaveLength(3)
    expect(screen.getByRole('radiogroup', { name: EN.themeLabel })).toBeInTheDocument()
    expect(screen.getByRole('radiogroup', { name: EN.timbreLabel })).toBeInTheDocument()
    expect(screen.getByRole('radiogroup', { name: EN.languageLabel })).toBeInTheDocument()
  })

  it('disables all picker radiogroups when inSessionView=true', () => {
    renderBody({ inSessionView: true })
    for (const rg of screen.getAllByRole('radiogroup')) {
      expect(rg).toHaveAttribute('aria-disabled', 'true')
    }
  })
})

describe('SettingsPanelBody — Sound section', () => {
  it('renders the Bypass silent mode toggle', () => {
    renderBody()
    expect(
      screen.getByRole('switch', { name: EN.bypassSilentMode.label }),
    ).toBeInTheDocument()
  })
})

describe('SettingsPanelBody — Statistics section', () => {
  it('renders the session totals from the injected stat', () => {
    renderBody()
    const stats = UI_STRINGS.en.stats
    expect(screen.getByText(stats.fields.sessions)).toBeVisible()
    expect(screen.getByText('3')).toBeVisible() // totalSessions
    expect(screen.getByText('1h 2m')).toBeVisible() // 3720s
  })

  it('reset asks for confirmation, and confirming fires onResetStats', async () => {
    const user = userEvent.setup()
    const { onResetStats } = renderBody()
    await user.click(screen.getByRole('button', { name: UI_STRINGS.en.stats.reset }))
    const dialog = screen.getByRole('dialog')
    await user.click(
      within(dialog).getByRole('button', { name: UI_STRINGS.en.stats.resetConfirm.confirm }),
    )
    expect(onResetStats).toHaveBeenCalledTimes(1)
  })

  it('renders the privacy note', () => {
    renderBody()
    expect(screen.getByText(UI_STRINGS.en.stats.privacyNote)).toBeInTheDocument()
  })
})

describe('SettingsPanelBody — About section', () => {
  it('renders the Version row with the injected version + build SHA + date', () => {
    renderBody()
    expect(screen.getByText(EN.about.versionLabel)).toBeVisible()
    // The version row combines `__APP_VERSION__ · __APP_BUILD_SHA__ ·
    // __APP_BUILD_DATE__`. Use a predicate anchored on the version so the test
    // stays resilient to per-build SHA / date changes.
    expect(
      screen.getByText((content) => content.startsWith(`${__APP_VERSION__} · `)),
    ).toBeVisible()
  })

  it('renders the source link inside the version row (external, rel=noopener)', () => {
    renderBody()
    const link = screen.getByRole('link', { name: new RegExp(EN.about.sourceLinkText) })
    expect(link).toBeVisible()
    expect(link).toHaveAttribute('href', 'https://github.com/lucindo/hrv')
    expect(link).toHaveAttribute('target', '_blank')
    expect(link).toHaveAttribute('rel', 'noopener noreferrer')
  })
})

describe('SettingsPanelBody — Install affordance (inside About)', () => {
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
