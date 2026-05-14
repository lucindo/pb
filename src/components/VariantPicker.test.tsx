import '@testing-library/jest-dom/vitest'
import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

import { VariantPicker } from './VariantPicker'
import { STATE_KEY } from '../storage'
import type { VisualVariantId } from '../domain/settings'

// Helper: seed localStorage with a known variant so useVariantChoice reads it on mount.
function seedVariant(variant: VisualVariantId): void {
  const envelope = {
    version: 1,
    prefs: { theme: 'system', timbre: 'bowl', variant, locale: 'en' },
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

describe('VariantPicker — full radiogroup picker (Phase 17 Plan 05)', () => {
  // Test 1: aria-checked reflects the stored variant
  it('renders 3 radio buttons with aria-checked matching the seeded variant', () => {
    seedVariant('square')
    render(<VariantPicker disabled={false} />)
    const radios = screen.getAllByRole('radio')
    expect(radios).toHaveLength(3)
    const squareButton = radios.find((b) => b.textContent?.includes('Square'))
    const otherButtons = radios.filter((b) => !b.textContent?.includes('Square'))
    expect(squareButton).toHaveAttribute('aria-checked', 'true')
    for (const button of otherButtons) {
      expect(button).toHaveAttribute('aria-checked', 'false')
    }
  })

  // Test 2: renders section header with id="variant-picker-label"
  it('renders a section header <p id="variant-picker-label">Variant</p> above the radiogroup', () => {
    render(<VariantPicker disabled={false} />)
    const label = document.getElementById('variant-picker-label')
    expect(label).not.toBeNull()
    expect(label?.textContent).toBe('Variant')
  })

  // Test 3: aria-disabled + disabled attribute
  it('radiogroup has aria-disabled={disabled} and each button has native disabled={disabled}', () => {
    render(<VariantPicker disabled={true} />)
    expect(screen.getByRole('radiogroup')).toHaveAttribute('aria-disabled', 'true')
    const radios = screen.getAllByRole('radio')
    for (const button of radios) {
      expect(button).toBeDisabled()
    }
  })

  // Test 4: clicking an unselected button writes to disk via savePrefs round-trip
  it('clicking an unselected button calls setVariant — verified via savePrefs round-trip', async () => {
    seedVariant('orb')
    const user = userEvent.setup()
    render(<VariantPicker disabled={false} />)
    const squareButton = screen.getByRole('radio', { name: /square/i })
    await user.click(squareButton)
    const stored = window.localStorage.getItem(STATE_KEY)
    expect(stored).not.toBeNull()
    // Reason: stored is asserted non-null on the line above; non-null assertion is invariant-safe.
    // eslint-disable-next-line @typescript-eslint/no-non-null-assertion, @typescript-eslint/no-unsafe-member-access
    const parsed = JSON.parse(stored!).prefs.variant as string
    expect(parsed).toBe('square')
  })

  // Test 5: dispatches hrv:prefs-changed CustomEvent
  it('clicking dispatches hrv:prefs-changed with { key: "variant", value: id }', async () => {
    seedVariant('orb')
    const user = userEvent.setup()
    render(<VariantPicker disabled={false} />)
    const spy = vi.fn()
    window.addEventListener('hrv:prefs-changed', spy)
    const squareButton = screen.getByRole('radio', { name: /square/i })
    await user.click(squareButton)
    window.removeEventListener('hrv:prefs-changed', spy)
    expect(spy).toHaveBeenCalledTimes(1)
    const event = spy.mock.calls[0]?.[0] as CustomEvent<{ key: string; value: string }>
    expect(event.detail.key).toBe('variant')
    expect(event.detail.value).toBe('square')
  })

  // Test 6: when disabled=true, clicking does NOT trigger setVariant
  it('when disabled=true, clicking does NOT write to disk and no CustomEvent fires', async () => {
    seedVariant('orb')
    const user = userEvent.setup()
    render(<VariantPicker disabled={true} />)
    const spy = vi.fn()
    window.addEventListener('hrv:prefs-changed', spy)
    const squareButton = screen.getByRole('radio', { name: /square/i })
    await user.click(squareButton)
    window.removeEventListener('hrv:prefs-changed', spy)
    const stored = window.localStorage.getItem(STATE_KEY)
    expect(stored).not.toBeNull()
    // Reason: stored is asserted non-null on the line above; non-null assertion is invariant-safe.
    // eslint-disable-next-line @typescript-eslint/no-non-null-assertion, @typescript-eslint/no-unsafe-member-access
    const parsed = JSON.parse(stored!).prefs.variant as string
    // Envelope was seeded as orb; a disabled click should not change it
    expect(parsed).toBe('orb')
    expect(spy).not.toHaveBeenCalled()
  })

  // Test 7: when disabled=true, selected option retains aria-checked="true"
  it('when disabled=true, the selected option button retains aria-checked="true" and is disabled', () => {
    seedVariant('ring')
    render(<VariantPicker disabled={true} />)
    const ringButton = screen.getByRole('radio', { name: /ring/i })
    expect(ringButton).toHaveAttribute('aria-checked', 'true')
    expect(ringButton).toBeDisabled()
  })

  // Test 8: 44×44 hit area via min-h-12 + px-3
  it('every button has min-h-12 class AND px-3 class (44×44 hit area — VARIANT-06)', () => {
    render(<VariantPicker disabled={false} />)
    const radios = screen.getAllByRole('radio')
    for (const button of radios) {
      expect(button.className).toContain('min-h-12')
      expect(button.className).toContain('px-3')
    }
  })

  // Test 9: focus-visible ring classes
  it('every button has focus-visible:ring-2 focus-visible:ring-breathing-accent focus-visible:ring-offset-2 classes', () => {
    render(<VariantPicker disabled={false} />)
    const radios = screen.getAllByRole('radio')
    for (const button of radios) {
      expect(button.className).toContain('focus-visible:ring-2')
      expect(button.className).toContain('focus-visible:ring-breathing-accent')
      expect(button.className).toContain('focus-visible:ring-offset-2')
    }
  })

  // Test 10: swatch primitive per variant (Pitfall 8 mitigation for Ring)
  it('Orb button contains .orb-layer--in span with borderRadius 50%; Square button .orb-layer--in with 18%; Ring button has <svg> with <circle>', () => {
    render(<VariantPicker disabled={false} />)
    const radios = screen.getAllByRole('radio')

    const orbButton = radios.find((b) => b.textContent?.includes('Orb'))
    const squareButton = radios.find((b) => b.textContent?.includes('Square'))
    const ringButton = radios.find((b) => b.textContent?.includes('Ring'))

    // Orb swatch: .orb-layer--in span with borderRadius 50%
    const orbSwatch = orbButton?.querySelector('.orb-layer--in') as HTMLElement | null
    expect(orbSwatch).not.toBeNull()
    expect(orbSwatch?.style.borderRadius).toBe('50%')

    // Square swatch: .orb-layer--in span with borderRadius 18%
    const squareSwatch = squareButton?.querySelector('.orb-layer--in') as HTMLElement | null
    expect(squareSwatch).not.toBeNull()
    expect(squareSwatch?.style.borderRadius).toBe('18%')

    // Ring swatch: <svg> with <circle> child (Pitfall 8 mitigation)
    const ringsvg = ringButton?.querySelector('svg')
    expect(ringsvg).not.toBeNull()
    const ringCircle = ringsvg?.querySelector('circle')
    expect(ringCircle).not.toBeNull()
  })
})
