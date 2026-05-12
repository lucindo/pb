import '@testing-library/jest-dom/vitest'
import { render, screen } from '@testing-library/react'
import { describe, expect, it } from 'vitest'

import { VariantPicker } from './VariantPicker'

// SC3: picker renders label + current stored value as read-only text.
// localStorage polyfill in vitest.setup.ts provides a clean store per test.
// loadPrefs() returns DEFAULT_VARIANT ('orb') when no prior write exists.

describe('VariantPicker — read-only stub (Phase 15 D-04)', () => {
  it('renders "Variant: orb" when no prefs are stored (default fallback)', () => {
    render(<VariantPicker disabled={false} />)
    expect(screen.getByText('Variant: orb')).toBeInTheDocument()
  })

  it('renders the picker label in enabled visual state when disabled=false', () => {
    render(<VariantPicker disabled={false} />)
    expect(screen.getByText('Variant')).toBeInTheDocument()
  })

  it('renders the picker in disabled visual state when disabled=true — value text still present', () => {
    render(<VariantPicker disabled={true} />)
    // Stub still renders text — disabled only changes styling (text color class), not content
    expect(screen.getByText('Variant: orb')).toBeInTheDocument()
  })
})
