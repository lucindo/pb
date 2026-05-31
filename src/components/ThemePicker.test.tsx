import '@testing-library/jest-dom/vitest'
import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

import { ThemePicker } from './ThemePicker'
import { STATE_KEY } from '../storage'
import type { ThemeId } from '../domain'
import { UI_STRINGS } from '../content/strings'

const EN_STRINGS_FIXTURE = UI_STRINGS.en

// Helper: seed localStorage with a known theme so usePreferenceChoice reads it on mount.
function seedTheme(theme: ThemeId): void {
  const envelope = {
    version: 1,
    prefs: { theme, timbre: 'bowl', locale: 'en' },
  }
  window.localStorage.setItem(STATE_KEY, JSON.stringify(envelope))
}

beforeEach(() => {
  window.localStorage.clear()
})

afterEach(() => {
  window.localStorage.clear()
  vi.restoreAllMocks()
})

describe('ThemePicker — real radiogroup picker (Phase 16)', () => {
  it('renders the "Theme" section label', () => {
    render(<ThemePicker disabled={false} strings={EN_STRINGS_FIXTURE.appSettings.themes} sectionLabel={EN_STRINGS_FIXTURE.appSettings.themeLabel} />)
    expect(screen.getByText('Theme')).toBeInTheDocument()
  })

  it('renders all 3 options as radio buttons with correct labels in order', () => {
    render(<ThemePicker disabled={false} strings={EN_STRINGS_FIXTURE.appSettings.themes} sectionLabel={EN_STRINGS_FIXTURE.appSettings.themeLabel} />)
    const radios = screen.getAllByRole('radio')
    expect(radios).toHaveLength(3)
    const labels = Array.from(radios).map((b) => b.textContent)
    expect(labels).toEqual(['Light', 'Dark', 'System'])
  })

  it('aria-checked reflects the stored theme — seeded theme has aria-checked=true, others false', () => {
    seedTheme('dark')
    render(<ThemePicker disabled={false} strings={EN_STRINGS_FIXTURE.appSettings.themes} sectionLabel={EN_STRINGS_FIXTURE.appSettings.themeLabel} />)
    const radios = screen.getAllByRole('radio')
    // Find the Dark button (index 1 in order: light, dark, system)
    const darkButton = radios.find((b) => b.textContent === 'Dark')
    const otherButtons = radios.filter((b) => b.textContent !== 'Dark')
    expect(darkButton).toHaveAttribute('aria-checked', 'true')
    for (const button of otherButtons) {
      expect(button).toHaveAttribute('aria-checked', 'false')
    }
  })

  it('clicking an option writes the new theme to disk (savePrefs via usePreferenceChoice)', async () => {
    seedTheme('light')
    const user = userEvent.setup()
    render(<ThemePicker disabled={false} strings={EN_STRINGS_FIXTURE.appSettings.themes} sectionLabel={EN_STRINGS_FIXTURE.appSettings.themeLabel} />)
    const systemButton = screen.getByRole('radio', { name: 'System' })
    await user.click(systemButton)
    const stored = window.localStorage.getItem(STATE_KEY)
    expect(stored).not.toBeNull()
    // Reason: stored is asserted non-null on the line above; non-null assertion is invariant-safe.
    // eslint-disable-next-line @typescript-eslint/no-non-null-assertion, @typescript-eslint/no-unsafe-member-access
    const parsed = JSON.parse(stored!).prefs.theme as string
    expect(parsed).toBe('system')
  })

  it('clicking an option dispatches hrv:prefs-changed with { key: "theme", value: id }', async () => {
    seedTheme('light')
    const user = userEvent.setup()
    render(<ThemePicker disabled={false} strings={EN_STRINGS_FIXTURE.appSettings.themes} sectionLabel={EN_STRINGS_FIXTURE.appSettings.themeLabel} />)
    const spy = vi.fn()
    window.addEventListener('hrv:prefs-changed', spy)
    const darkButton = screen.getByRole('radio', { name: 'Dark' })
    await user.click(darkButton)
    window.removeEventListener('hrv:prefs-changed', spy)
    expect(spy).toHaveBeenCalledTimes(1)
    const event = spy.mock.calls[0]?.[0] as CustomEvent<{ key: string; value: string }>
    expect(event.detail.key).toBe('theme')
    expect(event.detail.value).toBe('dark')
  })

  it('when disabled=true, all 3 buttons have the disabled attribute and radiogroup has aria-disabled=true', () => {
    render(<ThemePicker disabled={true} strings={EN_STRINGS_FIXTURE.appSettings.themes} sectionLabel={EN_STRINGS_FIXTURE.appSettings.themeLabel} />)
    const radios = screen.getAllByRole('radio')
    for (const button of radios) {
      expect(button).toBeDisabled()
    }
    expect(screen.getByRole('radiogroup')).toHaveAttribute('aria-disabled', 'true')
  })

  it('when disabled=true, clicking a button does NOT write to disk', async () => {
    seedTheme('light')
    const user = userEvent.setup()
    render(<ThemePicker disabled={true} strings={EN_STRINGS_FIXTURE.appSettings.themes} sectionLabel={EN_STRINGS_FIXTURE.appSettings.themeLabel} />)
    const darkButton = screen.getByRole('radio', { name: 'Dark' })
    await user.click(darkButton)
    const stored = window.localStorage.getItem(STATE_KEY)
    // Envelope was seeded as light; a no-op click should not change it
    expect(stored).not.toBeNull()
    // Reason: stored is asserted non-null on the line above; non-null assertion is invariant-safe.
    // eslint-disable-next-line @typescript-eslint/no-non-null-assertion, @typescript-eslint/no-unsafe-member-access
    const parsed = JSON.parse(stored!).prefs.theme as string
    expect(parsed).toBe('light')
  })

  it('selected option retains its aria-checked highlight even when disabled=true', () => {
    seedTheme('system')
    render(<ThemePicker disabled={true} strings={EN_STRINGS_FIXTURE.appSettings.themes} sectionLabel={EN_STRINGS_FIXTURE.appSettings.themeLabel} />)
    const systemButton = screen.getByRole('radio', { name: 'System' })
    expect(systemButton).toHaveAttribute('aria-checked', 'true')
    expect(systemButton).toBeDisabled()
  })
})
