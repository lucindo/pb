import '@testing-library/jest-dom/vitest'
import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

import { TimbrePicker } from './TimbrePicker'
import { STATE_KEY } from '../storage'
import type { TimbreId } from '../domain/settings'
import { UI_STRINGS } from '../content/strings'

const EN_STRINGS_FIXTURE = UI_STRINGS.en

// Phase 18 plan 05 test coverage — verbatim parity with ThemePicker.test.tsx (D-06 mirror).
// Helper seeds localStorage with a known timbre so useTimbreChoice reads it on mount.
function seedTimbre(timbre: TimbreId): void {
  const envelope = {
    version: 1,
    prefs: { theme: 'system', timbre, locale: 'en' },
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

describe('TimbrePicker — real radiogroup picker (Phase 18)', () => {
  it('renders the "Timbre" section label', () => {
    render(<TimbrePicker disabled={false} strings={EN_STRINGS_FIXTURE.timbres} sectionLabel={EN_STRINGS_FIXTURE.settings.timbreLabel} />)
    expect(screen.getByText('Timbre')).toBeInTheDocument()
  })

  it('renders all 4 options as radio buttons with correct capitalized labels in order', () => {
    render(<TimbrePicker disabled={false} strings={EN_STRINGS_FIXTURE.timbres} sectionLabel={EN_STRINGS_FIXTURE.settings.timbreLabel} />)
    const radios = screen.getAllByRole('radio')
    expect(radios).toHaveLength(4)
    const labels = Array.from(radios).map((b) => b.textContent)
    expect(labels).toEqual(['Bowl', 'Bell', 'Sine', 'Flute'])
  })

  it('aria-checked reflects the stored timbre — seeded timbre has aria-checked=true, others false', () => {
    seedTimbre('bell')
    render(<TimbrePicker disabled={false} strings={EN_STRINGS_FIXTURE.timbres} sectionLabel={EN_STRINGS_FIXTURE.settings.timbreLabel} />)
    const radios = screen.getAllByRole('radio')
    const bellButton = radios.find((b) => b.textContent === 'Bell')
    const otherButtons = radios.filter((b) => b.textContent !== 'Bell')
    expect(bellButton).toHaveAttribute('aria-checked', 'true')
    for (const button of otherButtons) {
      expect(button).toHaveAttribute('aria-checked', 'false')
    }
  })

  it('clicking an option writes the new timbre to disk (savePrefs via useTimbreChoice)', async () => {
    seedTimbre('bowl')
    const user = userEvent.setup()
    render(<TimbrePicker disabled={false} strings={EN_STRINGS_FIXTURE.timbres} sectionLabel={EN_STRINGS_FIXTURE.settings.timbreLabel} />)
    const sineButton = screen.getByRole('radio', { name: 'Sine' })
    await user.click(sineButton)
    const stored = window.localStorage.getItem(STATE_KEY)
    expect(stored).not.toBeNull()
    // Reason: stored is asserted non-null on the line above; non-null assertion is invariant-safe.
    // eslint-disable-next-line @typescript-eslint/no-non-null-assertion, @typescript-eslint/no-unsafe-member-access
    const parsed = JSON.parse(stored!).prefs.timbre as string
    expect(parsed).toBe('sine')
  })

  it('clicking an option dispatches hrv:prefs-changed with { key: "timbre", value: id }', async () => {
    seedTimbre('bowl')
    const user = userEvent.setup()
    render(<TimbrePicker disabled={false} strings={EN_STRINGS_FIXTURE.timbres} sectionLabel={EN_STRINGS_FIXTURE.settings.timbreLabel} />)
    const spy = vi.fn()
    window.addEventListener('hrv:prefs-changed', spy)
    const bellButton = screen.getByRole('radio', { name: 'Bell' })
    await user.click(bellButton)
    window.removeEventListener('hrv:prefs-changed', spy)
    expect(spy).toHaveBeenCalledTimes(1)
    const event = spy.mock.calls[0]?.[0] as CustomEvent<{ key: string; value: string }>
    expect(event.detail.key).toBe('timbre')
    expect(event.detail.value).toBe('bell')
  })

  it('when disabled=true, all 4 buttons have the disabled attribute and radiogroup has aria-disabled=true', () => {
    render(<TimbrePicker disabled={true} strings={EN_STRINGS_FIXTURE.timbres} sectionLabel={EN_STRINGS_FIXTURE.settings.timbreLabel} />)
    const radios = screen.getAllByRole('radio')
    for (const button of radios) {
      expect(button).toBeDisabled()
    }
    expect(screen.getByRole('radiogroup')).toHaveAttribute('aria-disabled', 'true')
  })

  it('when disabled=true, clicking a button does NOT write to disk', async () => {
    seedTimbre('bowl')
    const user = userEvent.setup()
    render(<TimbrePicker disabled={true} strings={EN_STRINGS_FIXTURE.timbres} sectionLabel={EN_STRINGS_FIXTURE.settings.timbreLabel} />)
    const fluteButton = screen.getByRole('radio', { name: 'Flute' })
    await user.click(fluteButton)
    const stored = window.localStorage.getItem(STATE_KEY)
    expect(stored).not.toBeNull()
    // Reason: stored is asserted non-null on the line above; non-null assertion is invariant-safe.
    // eslint-disable-next-line @typescript-eslint/no-non-null-assertion, @typescript-eslint/no-unsafe-member-access
    const parsed = JSON.parse(stored!).prefs.timbre as string
    expect(parsed).toBe('bowl')
  })

  it('selected option retains its aria-checked highlight even when disabled=true', () => {
    seedTimbre('flute')
    render(<TimbrePicker disabled={true} strings={EN_STRINGS_FIXTURE.timbres} sectionLabel={EN_STRINGS_FIXTURE.settings.timbreLabel} />)
    const fluteButton = screen.getByRole('radio', { name: 'Flute' })
    expect(fluteButton).toHaveAttribute('aria-checked', 'true')
    expect(fluteButton).toBeDisabled()
  })
})
