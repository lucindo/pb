import '@testing-library/jest-dom/vitest'
import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

import { RingCuePicker } from './RingCuePicker'
import { STATE_KEY } from '../storage'
import { DEFAULT_PREFS, type UserPrefs } from '../storage/prefs'
import type { RingCueStyle } from '../featureFlags'

const STRINGS = { arc: 'Arc', rings: 'Rings' } as const

// Helper: seed localStorage with a known ringCue so useRingCueChoice reads it on mount.
function seedRingCue(value: RingCueStyle): void {
  const envelope = {
    version: 1,
    prefs: { ...DEFAULT_PREFS, ringCue: value },
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

describe('RingCuePicker', () => {
  it('renders two radio buttons for ring cue variants', () => {
    seedRingCue('progress-arc')
    render(<RingCuePicker disabled={false} sectionLabel="Ring cue" strings={STRINGS} />)
    const radios = screen.getAllByRole('radio')
    expect(radios).toHaveLength(2)
    expect(screen.getByRole('radio', { name: 'Arc' })).toBeInTheDocument()
    expect(screen.getByRole('radio', { name: 'Rings' })).toBeInTheDocument()
  })

  it('reflects the seeded ringCue via aria-checked', () => {
    seedRingCue('outer-inner')
    render(<RingCuePicker disabled={false} sectionLabel="Ring cue" strings={STRINGS} />)
    const ringsButton = screen.getByRole('radio', { name: 'Rings' })
    const arcButton = screen.getByRole('radio', { name: 'Arc' })
    expect(ringsButton).toHaveAttribute('aria-checked', 'true')
    expect(arcButton).toHaveAttribute('aria-checked', 'false')
  })

  it('writes the chosen variant to the prefs envelope on click', async () => {
    seedRingCue('progress-arc')
    const user = userEvent.setup()
    render(<RingCuePicker disabled={false} sectionLabel="Ring cue" strings={STRINGS} />)
    const ringsButton = screen.getByRole('radio', { name: 'Rings' })
    await user.click(ringsButton)
    const stored = window.localStorage.getItem(STATE_KEY)
    expect(stored).not.toBeNull()
    // Reason: stored is asserted non-null on the line above; non-null assertion is invariant-safe.
    // eslint-disable-next-line @typescript-eslint/no-non-null-assertion, @typescript-eslint/no-unsafe-member-access
    const parsed = JSON.parse(stored!).prefs as UserPrefs
    expect(parsed.ringCue).toBe('outer-inner')
  })

  it('dispatches hrv:prefs-changed with detail.key=ringCue on click', async () => {
    seedRingCue('progress-arc')
    const user = userEvent.setup()
    render(<RingCuePicker disabled={false} sectionLabel="Ring cue" strings={STRINGS} />)
    const spy = vi.fn()
    window.addEventListener('hrv:prefs-changed', spy)
    const ringsButton = screen.getByRole('radio', { name: 'Rings' })
    await user.click(ringsButton)
    window.removeEventListener('hrv:prefs-changed', spy)
    expect(spy).toHaveBeenCalledTimes(1)
    const event = spy.mock.calls[0]?.[0] as CustomEvent<{ key: string; value: string }>
    expect(event.detail.key).toBe('ringCue')
    expect(event.detail.value).toBe('outer-inner')
  })

  it('respects disabled: buttons disabled, radiogroup aria-disabled, no write on click', async () => {
    seedRingCue('progress-arc')
    const user = userEvent.setup()
    render(<RingCuePicker disabled={true} sectionLabel="Ring cue" strings={STRINGS} />)
    const radios = screen.getAllByRole('radio')
    for (const button of radios) {
      expect(button).toBeDisabled()
    }
    expect(screen.getByRole('radiogroup')).toHaveAttribute('aria-disabled', 'true')
    const ringsButton = screen.getByRole('radio', { name: 'Rings' })
    await user.click(ringsButton)
    const stored = window.localStorage.getItem(STATE_KEY)
    expect(stored).not.toBeNull()
    // Reason: stored is asserted non-null on the line above; non-null assertion is invariant-safe.
    // eslint-disable-next-line @typescript-eslint/no-non-null-assertion, @typescript-eslint/no-unsafe-member-access
    const parsed = JSON.parse(stored!).prefs as UserPrefs
    expect(parsed.ringCue).toBe('progress-arc')
    const arcButton = screen.getByRole('radio', { name: 'Arc' })
    expect(arcButton).toHaveAttribute('aria-checked', 'true')
  })
})
