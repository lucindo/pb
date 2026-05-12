import '@testing-library/jest-dom/vitest'
import { render, screen } from '@testing-library/react'
import { describe, expect, it } from 'vitest'

import { ThemePicker } from './ThemePicker'

// SC3: picker renders label + current stored value as read-only text.
// localStorage polyfill in vitest.setup.ts provides a clean store per test.
// loadPrefs() returns DEFAULT_THEME ('system') when no prior write exists.

describe('ThemePicker — read-only stub (Phase 15 D-04)', () => {
  it('renders "Theme: system" when no prefs are stored (default fallback)', () => {
    render(<ThemePicker disabled={false} />)
    expect(screen.getByText('Theme: system')).toBeInTheDocument()
  })

  it('renders the picker label in enabled visual state when disabled=false', () => {
    render(<ThemePicker disabled={false} />)
    expect(screen.getByText('Theme')).toBeInTheDocument()
  })

  it('renders the picker in disabled visual state when disabled=true — value text still present', () => {
    render(<ThemePicker disabled={true} />)
    // Stub still renders text — disabled only changes styling (text color class), not content
    expect(screen.getByText('Theme: system')).toBeInTheDocument()
  })
})
