import '@testing-library/jest-dom/vitest'

import { act, fireEvent, render, screen } from '@testing-library/react'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

import App from './App'
import { APP_TEST_NOW, startAndAdvancePastLeadIn } from './appTestHarness'
import { STATE_KEY } from '../storage'
import type { CueStyleId } from '../domain/settings'

// CUE-01 / T-25-09 capture-at-session-start integration tests (Phase 25 Plan 05).
// Seeds localStorage[STATE_KEY] with a chosen cue BEFORE App renders to exercise
// the sessionCueRef snapshot mechanism end-to-end — mirrors VARIANT-03 in App.session.test.tsx.

function seedCue(cue: CueStyleId): void {
  const envelope = {
    version: 1,
    prefs: { theme: 'system', timbre: 'bowl', cue, locale: 'en' },
  }
  window.localStorage.setItem(STATE_KEY, JSON.stringify(envelope))
}

describe('CUE-01 capture-at-session-start (T-25-09)', () => {
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

  it('default cue=arrow renders the SVG glyph — zero regression', async () => {
    // No seedCue — localStorage cleared; loadPrefs().cue coerces to DEFAULT_CUE='arrow'.
    render(<App />)

    await startAndAdvancePastLeadIn()

    const shape = screen.getByRole('img', { name: 'Breathing shape: In' })
    // Arrow mode: CueGlyph renders an aria-hidden SVG (chevron) + sr-only phaseLabel.
    const svg = shape.querySelector('svg[aria-hidden="true"]')
    expect(svg).not.toBeNull()
  })

  it('arrow cue seeded before Start renders an aria-hidden SVG (not raw text) in the shape', async () => {
    seedCue('arrow')
    render(<App />)

    await startAndAdvancePastLeadIn()

    const shape = screen.getByRole('img', { name: 'Breathing shape: In' })
    // Arrow mode: CueGlyph renders an aria-hidden SVG (chevron) + sr-only phaseLabel.
    const svg = shape.querySelector('svg[aria-hidden="true"]')
    expect(svg).not.toBeNull()
  })

  it('mid-session localStorage cue change does NOT swap the rendered cue (T-25-09)', async () => {
    seedCue('arrow')
    render(<App />)

    await startAndAdvancePastLeadIn()

    // Confirm arrow mode is active: aria-hidden SVG present.
    let shape = screen.getByRole('img', { name: 'Breathing shape: In' })
    expect(shape.querySelector('svg[aria-hidden="true"]')).not.toBeNull()

    // Simulate a cross-tab write: change cue to 'labels' in localStorage and fire
    // the 'storage' event — useVisualCue will update liveCue, but sessionCueRef.current
    // (non-null during session) wins per the capture-at-Start pattern.
    const labelsEnvelope = JSON.stringify({
      version: 1,
      prefs: { theme: 'system', timbre: 'bowl', cue: 'labels', locale: 'en' },
    })
    act(() => {
      window.localStorage.setItem(STATE_KEY, labelsEnvelope)
      window.dispatchEvent(new StorageEvent('storage', { key: STATE_KEY, newValue: labelsEnvelope }))
    })

    // The shape must still render the SVG glyph (arrow), not the visible 'labels' text.
    shape = screen.getByRole('img', { name: 'Breathing shape: In' })
    expect(shape.querySelector('svg[aria-hidden="true"]')).not.toBeNull()
  })

  it('next session picks up the post-session-end cue from prefs', async () => {
    seedCue('arrow')
    render(<App />)

    await startAndAdvancePastLeadIn()

    // Change cue to 'labels' mid-session via cross-tab write
    const labelsEnvelope = JSON.stringify({
      version: 1,
      prefs: { theme: 'system', timbre: 'bowl', cue: 'labels', locale: 'en' },
    })
    act(() => {
      window.localStorage.setItem(STATE_KEY, labelsEnvelope)
      window.dispatchEvent(new StorageEvent('storage', { key: STATE_KEY, newValue: labelsEnvelope }))
    })

    // End the session via End button → dialog confirm
    fireEvent.click(screen.getByRole('button', { name: 'End session' }))
    fireEvent.click(screen.getByRole('button', { name: 'End' }))

    expect(screen.getByRole('button', { name: 'Start session' })).toBeVisible()

    // Start a new session — sessionCueRef was cleared on session end;
    // liveCue is now 'labels' (post-cross-tab update), so the new session captures 'labels'.
    await startAndAdvancePastLeadIn()

    const shape = screen.getByRole('img', { name: 'Breathing shape: In' })
    // In labels mode — no aria-hidden SVG.
    expect(shape.querySelector('svg[aria-hidden="true"]')).toBeNull()
    expect(shape).toHaveTextContent('In')
  })
})
