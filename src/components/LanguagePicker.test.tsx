import '@testing-library/jest-dom/vitest'
import { render, screen } from '@testing-library/react'
import { describe, expect, it } from 'vitest'

import { LanguagePicker } from './LanguagePicker'

// SC3: picker renders label + current stored value as read-only text.
// localStorage polyfill in vitest.setup.ts provides a clean store per test.
// loadPrefs() returns DEFAULT_LOCALE ('en') when no prior write exists.
// NOTE: section label is 'Language' (D-18); underlying field is prefs.locale.
// Phase 19 (I18N-01..07) will display full locale names (e.g. 'English' / 'Português (Brasil)').

describe('LanguagePicker — read-only stub (Phase 15 D-04)', () => {
  it('renders "Language: en" when no prefs are stored (default fallback)', () => {
    render(<LanguagePicker disabled={false} />)
    expect(screen.getByText('Language: en')).toBeInTheDocument()
  })

  it('renders the picker label in enabled visual state when disabled=false', () => {
    render(<LanguagePicker disabled={false} />)
    expect(screen.getByText('Language')).toBeInTheDocument()
  })

  it('renders the picker in disabled visual state when disabled=true — value text still present', () => {
    render(<LanguagePicker disabled={true} />)
    // Stub still renders text — disabled only changes styling (text color class), not content
    expect(screen.getByText('Language: en')).toBeInTheDocument()
  })
})
