import '@testing-library/jest-dom/vitest'
import { render, screen } from '@testing-library/react'
import { describe, expect, it } from 'vitest'

import { TimbrePicker } from './TimbrePicker'

// SC3: picker renders label + current stored value as read-only text.
// localStorage polyfill in vitest.setup.ts provides a clean store per test.
// loadPrefs() returns DEFAULT_TIMBRE ('bowl') when no prior write exists.

describe('TimbrePicker — read-only stub (Phase 15 D-04)', () => {
  it('renders "Timbre: bowl" when no prefs are stored (default fallback)', () => {
    render(<TimbrePicker disabled={false} />)
    expect(screen.getByText('Timbre: bowl')).toBeInTheDocument()
  })

  it('renders the picker label in enabled visual state when disabled=false', () => {
    render(<TimbrePicker disabled={false} />)
    expect(screen.getByText('Timbre')).toBeInTheDocument()
  })

  it('renders the picker in disabled visual state when disabled=true — value text still present', () => {
    render(<TimbrePicker disabled={true} />)
    // Stub still renders text — disabled only changes styling (text color class), not content
    expect(screen.getByText('Timbre: bowl')).toBeInTheDocument()
  })
})
