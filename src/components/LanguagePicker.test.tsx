import '@testing-library/jest-dom/vitest'
import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

import { LanguagePicker } from './LanguagePicker'
import { STATE_KEY } from '../storage'
import type { LocaleId } from '../domain/settings'

// Helper: seed localStorage with a known locale so useLocaleChoice reads it on mount.
function seedLocale(locale: LocaleId): void {
  const envelope = {
    version: 1,
    prefs: { theme: 'system', timbre: 'bowl', variant: 'orb', locale },
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

describe('LanguagePicker — real radiogroup picker (Phase 19)', () => {
  it('renders the "Language" section label', () => {
    render(<LanguagePicker disabled={false} />)
    expect(screen.getByText('Language')).toBeInTheDocument()
  })

  it('renders exactly 2 radio buttons with native endonym labels English and Português (Brasil)', () => {
    render(<LanguagePicker disabled={false} />)
    const radios = screen.getAllByRole('radio')
    expect(radios).toHaveLength(2)
    const labels = Array.from(radios).map((b) => b.textContent)
    expect(labels).toEqual(['English', 'Português (Brasil)'])
  })

  it('aria-checked reflects the stored locale — seeded pt-BR makes PT-BR button checked and EN button unchecked', () => {
    seedLocale('pt-BR')
    render(<LanguagePicker disabled={false} />)
    const ptBRButton = screen.getByRole('radio', { name: 'Português (Brasil)' })
    const enButton = screen.getByRole('radio', { name: 'English' })
    expect(ptBRButton).toHaveAttribute('aria-checked', 'true')
    expect(enButton).toHaveAttribute('aria-checked', 'false')
  })

  it('clicking an enabled option writes the new locale to disk via savePrefs', async () => {
    seedLocale('en')
    const user = userEvent.setup()
    render(<LanguagePicker disabled={false} />)
    const ptBRButton = screen.getByRole('radio', { name: 'Português (Brasil)' })
    await user.click(ptBRButton)
    const stored = window.localStorage.getItem(STATE_KEY)
    expect(stored).not.toBeNull()
    // Reason: stored is asserted non-null on the line above; non-null assertion is invariant-safe.
    // eslint-disable-next-line @typescript-eslint/no-non-null-assertion, @typescript-eslint/no-unsafe-member-access
    const parsed = JSON.parse(stored!).prefs.locale as string
    expect(parsed).toBe('pt-BR')
  })

  it('clicking an enabled option dispatches hrv:prefs-changed with detail.key === "locale"', async () => {
    seedLocale('en')
    const user = userEvent.setup()
    render(<LanguagePicker disabled={false} />)
    const spy = vi.fn()
    window.addEventListener('hrv:prefs-changed', spy)
    const ptBRButton = screen.getByRole('radio', { name: 'Português (Brasil)' })
    await user.click(ptBRButton)
    window.removeEventListener('hrv:prefs-changed', spy)
    expect(spy).toHaveBeenCalledTimes(1)
    const event = spy.mock.calls[0]?.[0] as CustomEvent<{ key: string; value: string }>
    expect(event.detail.key).toBe('locale')
    expect(event.detail.value).toBe('pt-BR')
  })

  it('when disabled=true, both buttons have disabled attribute and radiogroup has aria-disabled="true"', () => {
    render(<LanguagePicker disabled={true} />)
    const radios = screen.getAllByRole('radio')
    for (const button of radios) {
      expect(button).toBeDisabled()
    }
    expect(screen.getByRole('radiogroup')).toHaveAttribute('aria-disabled', 'true')
  })

  it('when disabled=true, clicking does NOT write to disk', async () => {
    seedLocale('en')
    const user = userEvent.setup()
    render(<LanguagePicker disabled={true} />)
    const ptBRButton = screen.getByRole('radio', { name: 'Português (Brasil)' })
    await user.click(ptBRButton)
    const stored = window.localStorage.getItem(STATE_KEY)
    // Envelope was seeded as en; a click while disabled should not change it
    expect(stored).not.toBeNull()
    // Reason: stored is asserted non-null on the line above; non-null assertion is invariant-safe.
    // eslint-disable-next-line @typescript-eslint/no-non-null-assertion, @typescript-eslint/no-unsafe-member-access
    const parsed = JSON.parse(stored!).prefs.locale as string
    expect(parsed).toBe('en')
  })

  it('selected option retains its aria-checked=true highlight even when disabled=true', () => {
    seedLocale('pt-BR')
    render(<LanguagePicker disabled={true} />)
    const ptBRButton = screen.getByRole('radio', { name: 'Português (Brasil)' })
    expect(ptBRButton).toHaveAttribute('aria-checked', 'true')
    expect(ptBRButton).toBeDisabled()
  })

  it('D-14 cross-UI endonym invariant: native endonym labels are the same regardless of seeded locale', () => {
    // Seed pt-BR locale (simulating a pt-BR UI context)
    seedLocale('pt-BR')
    render(<LanguagePicker disabled={false} />)
    // Both endonym labels must be present in their native form — they do NOT flow through UI_STRINGS
    expect(screen.getByRole('radio', { name: 'English' })).toBeInTheDocument()
    expect(screen.getByRole('radio', { name: 'Português (Brasil)' })).toBeInTheDocument()
  })
})
