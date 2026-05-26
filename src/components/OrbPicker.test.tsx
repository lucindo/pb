import '@testing-library/jest-dom/vitest'
import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

import { OrbPicker } from './OrbPicker'
import { STATE_KEY } from '../storage'
import { DEFAULT_PREFS, type UserPrefs } from '../storage/prefs'
import type { BreathingShapeVariant } from '../featureFlags'

const STRINGS = { halo: 'Halo', minimal: 'Minimal', kuthasta: 'Kuthasta' } as const

// Helper: seed localStorage with a known breathingShape so useBreathingShapeChoice reads it on mount.
function seedBreathingShape(value: BreathingShapeVariant): void {
  const envelope = {
    version: 1,
    prefs: { ...DEFAULT_PREFS, breathingShape: value },
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

describe('OrbPicker', () => {
  it('renders three radio buttons for orb variants', () => {
    seedBreathingShape('orb-halo')
    render(<OrbPicker disabled={false} sectionLabel="Orb" strings={STRINGS} />)
    const radios = screen.getAllByRole('radio')
    expect(radios).toHaveLength(3)
    expect(screen.getByRole('radio', { name: 'Halo' })).toBeInTheDocument()
    expect(screen.getByRole('radio', { name: 'Minimal' })).toBeInTheDocument()
    expect(screen.getByRole('radio', { name: 'Kuthasta' })).toBeInTheDocument()
  })

  it('reflects the seeded breathingShape via aria-checked', () => {
    seedBreathingShape('spiritual-eye')
    render(<OrbPicker disabled={false} sectionLabel="Orb" strings={STRINGS} />)
    const kuthastaButton = screen.getByRole('radio', { name: 'Kuthasta' })
    const haloButton = screen.getByRole('radio', { name: 'Halo' })
    const minimalButton = screen.getByRole('radio', { name: 'Minimal' })
    expect(kuthastaButton).toHaveAttribute('aria-checked', 'true')
    expect(haloButton).toHaveAttribute('aria-checked', 'false')
    expect(minimalButton).toHaveAttribute('aria-checked', 'false')
  })

  it('writes the chosen variant to the prefs envelope on click', async () => {
    seedBreathingShape('orb-halo')
    const user = userEvent.setup()
    render(<OrbPicker disabled={false} sectionLabel="Orb" strings={STRINGS} />)
    const minimalButton = screen.getByRole('radio', { name: 'Minimal' })
    await user.click(minimalButton)
    const stored = window.localStorage.getItem(STATE_KEY)
    expect(stored).not.toBeNull()
    // Reason: stored is asserted non-null on the line above; non-null assertion is invariant-safe.
    // eslint-disable-next-line @typescript-eslint/no-non-null-assertion, @typescript-eslint/no-unsafe-member-access
    const parsed = JSON.parse(stored!).prefs as UserPrefs
    expect(parsed.breathingShape).toBe('minimal-rings')
  })

  it('dispatches hrv:prefs-changed with detail.key=breathingShape on click', async () => {
    seedBreathingShape('orb-halo')
    const user = userEvent.setup()
    render(<OrbPicker disabled={false} sectionLabel="Orb" strings={STRINGS} />)
    const spy = vi.fn()
    window.addEventListener('hrv:prefs-changed', spy)
    const kuthastaButton = screen.getByRole('radio', { name: 'Kuthasta' })
    await user.click(kuthastaButton)
    window.removeEventListener('hrv:prefs-changed', spy)
    expect(spy).toHaveBeenCalledTimes(1)
    const event = spy.mock.calls[0]?.[0] as CustomEvent<{ key: string; value: string }>
    expect(event.detail.key).toBe('breathingShape')
    expect(event.detail.value).toBe('spiritual-eye')
  })

  it('respects disabled: buttons disabled, radiogroup aria-disabled, no write on click', async () => {
    seedBreathingShape('orb-halo')
    const user = userEvent.setup()
    render(<OrbPicker disabled={true} sectionLabel="Orb" strings={STRINGS} />)
    const radios = screen.getAllByRole('radio')
    for (const button of radios) {
      expect(button).toBeDisabled()
    }
    expect(screen.getByRole('radiogroup')).toHaveAttribute('aria-disabled', 'true')
    const minimalButton = screen.getByRole('radio', { name: 'Minimal' })
    await user.click(minimalButton)
    const stored = window.localStorage.getItem(STATE_KEY)
    expect(stored).not.toBeNull()
    // Reason: stored is asserted non-null on the line above; non-null assertion is invariant-safe.
    // eslint-disable-next-line @typescript-eslint/no-non-null-assertion, @typescript-eslint/no-unsafe-member-access
    const parsed = JSON.parse(stored!).prefs as UserPrefs
    expect(parsed.breathingShape).toBe('orb-halo')
    const haloButton = screen.getByRole('radio', { name: 'Halo' })
    expect(haloButton).toHaveAttribute('aria-checked', 'true')
  })
})
