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
    onStatsOpen: () => void
  }> = {},
) {
  const onInstall = props.onInstall ?? vi.fn().mockResolvedValue(undefined)
  const onStatsOpen = props.onStatsOpen ?? vi.fn()
  return {
    ...render(
      <SettingsPanelBody
        inSessionView={props.inSessionView ?? false}
        strings={UI_STRINGS.en}
        isIOS={props.isIOS ?? false}
        isStandalone={props.isStandalone ?? false}
        installable={props.installable ?? false}
        onInstall={onInstall}
        onStatsOpen={onStatsOpen}
      />,
    ),
    onInstall,
    onStatsOpen,
  }
}

const EN = UI_STRINGS.en.appSettings

describe('SettingsPanelBody — J14 sectioning', () => {
  it('renders the 4 section headings (Theme / Language / Audio / About)', () => {
    renderBody()
    expect(screen.getByRole('heading', { level: 2, name: EN.sections.theme })).toBeInTheDocument()
    expect(screen.getByRole('heading', { level: 2, name: EN.sections.language })).toBeInTheDocument()
    expect(screen.getByRole('heading', { level: 2, name: EN.sections.audio })).toBeInTheDocument()
    expect(screen.getByRole('heading', { level: 2, name: EN.sections.about })).toBeInTheDocument()
  })

  it('renders all four pickers (4 radiogroups: Theme + Cue + Timbre + Language)', () => {
    renderBody()
    expect(screen.getAllByRole('radiogroup')).toHaveLength(4)
    expect(screen.getByRole('radiogroup', { name: EN.themeLabel })).toBeInTheDocument()
    expect(screen.getByRole('radiogroup', { name: EN.cueLabel })).toBeInTheDocument()
    expect(screen.getByRole('radiogroup', { name: EN.timbreLabel })).toBeInTheDocument()
    expect(screen.getByRole('radiogroup', { name: EN.languageLabel })).toBeInTheDocument()
  })

  it('keeps Cue/Timbre sublabels visible (Audio multi-picker disambiguation)', () => {
    const { container } = renderBody()
    // Cue + Timbre sublabels render as visible <p> (no sr-only class).
    const cueLabel = container.querySelector('#cue-picker-label')
    const timbreLabel = container.querySelector('#timbre-picker-label')
    expect(cueLabel).not.toBeNull()
    expect(timbreLabel).not.toBeNull()
    expect(cueLabel).not.toHaveClass('sr-only')
    expect(timbreLabel).not.toHaveClass('sr-only')
  })

  it('hides Theme/Language sublabels visually (Appearance/Language are single-picker sections)', () => {
    const { container } = renderBody()
    const themeLabel = container.querySelector('#theme-picker-label')
    expect(themeLabel).toHaveClass('sr-only')
    // LanguagePicker no longer carries an id (IN-01) — locate its sublabel
    // via the radiogroup's accessible name + DOM proximity.
    const languageGroup = screen.getByRole('radiogroup', { name: EN.languageLabel })
    const languageLabel = languageGroup.parentElement?.querySelector('p')
    expect(languageLabel).not.toBeNull()
    expect(languageLabel).toHaveClass('sr-only')
  })

  it('disables all picker radiogroups when inSessionView=true', () => {
    renderBody({ inSessionView: true })
    for (const rg of screen.getAllByRole('radiogroup')) {
      expect(rg).toHaveAttribute('aria-disabled', 'true')
    }
  })
})

describe('SettingsPanelBody — Statistics row', () => {
  it('renders a Statistics row that fires onStatsOpen when clicked', async () => {
    const user = userEvent.setup()
    const { onStatsOpen } = renderBody()
    await user.click(screen.getByRole('button', { name: EN.statsRow }))
    expect(onStatsOpen).toHaveBeenCalledTimes(1)
  })

  it('disables the Statistics row when inSessionView=true', () => {
    renderBody({ inSessionView: true })
    expect(screen.getByRole('button', { name: EN.statsRow })).toBeDisabled()
  })
})

describe('SettingsPanelBody — About section', () => {
  it('renders the Version row with the injected version + build SHA + date', () => {
    renderBody()
    expect(screen.getByText(EN.about.versionLabel)).toBeVisible()
    // The version row combines `__APP_VERSION__ · __APP_BUILD_SHA__ ·
    // __APP_BUILD_DATE__`. Use a regex anchored on the version so test stays
    // resilient to per-build SHA / date changes.
    expect(
      screen.getByText((content) => content.startsWith(`${__APP_VERSION__} · `)),
    ).toBeVisible()
  })

  it('renders the Source row with a GitHub link (external, rel=noopener)', () => {
    renderBody()
    expect(screen.getByText(EN.about.sourceLabel)).toBeVisible()
    const link = screen.getByRole('link', { name: /GitHub/ })
    expect(link).toBeVisible()
    expect(link).toHaveAttribute('href', 'https://github.com/lucindo/hrv')
    expect(link).toHaveAttribute('target', '_blank')
    expect(link).toHaveAttribute('rel', 'noopener noreferrer')
  })
})

describe('SettingsPanelBody — Install affordance (now inside About)', () => {
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
