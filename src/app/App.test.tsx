import '@testing-library/jest-dom/vitest'

import { render, screen } from '@testing-library/react'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

import App from './App'
import { APP_TEST_NOW, startAndAdvancePastLeadIn } from './appTestHarness'

// Integration: the in-session orb renders the localized phase-label text
// (the sole in-orb cue after the cue-style chooser was removed).

describe('breathing orb phase label', () => {
  beforeEach(() => {
    vi.useFakeTimers()
    vi.setSystemTime(APP_TEST_NOW)
    window.localStorage.clear()
  })

  afterEach(() => {
    vi.useRealTimers()
    vi.restoreAllMocks()
    window.localStorage.clear()
  })

  it('renders the localized phase-label text in the shape during a running session', async () => {
    render(<App />)

    await startAndAdvancePastLeadIn()

    const shape = screen.getByRole('img', { name: 'Breathing shape: In' })
    // Labels-only: the phase word is visible text, with no in-orb glyph SVG.
    expect(shape).toHaveTextContent('In')
    expect(shape.querySelector('svg[aria-hidden="true"]')).toBeNull()
  })
})
