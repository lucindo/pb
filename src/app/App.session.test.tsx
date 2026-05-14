import '@testing-library/jest-dom/vitest'

import { act, fireEvent, render, screen, within } from '@testing-library/react'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

import App from './App'
import { STATE_KEY } from '../storage'
import type { VisualVariantId } from '../domain/settings'

function settingGroup(name: string) {
  return screen.getByRole('group', { name })
}

function sessionReadout() {
  return screen.getByRole('region', { name: 'Session readout' })
}

// Phase 3 (Plan 04): clicking Start session enters a 3-second lead-in before the
// session timing clock starts (SESS-05 single-clock invariant + D-13 + D-14). All
// pre-existing Phase 1/2 tests below assume "click Start → immediately running".
// To preserve their original intent under the new lead-in, we click Start via
// fireEvent (sync), flush microtasks for the awaited audio.start() promise, then
// advance fake timers past the 3 s setTimeout chain.
//
// Tests in this file no longer use @testing-library/user-event because the
// userEvent + fake-timer pairing produces hangs when combined with the async
// onStartClick handler. fireEvent + manual microtask flushing is sufficient for
// the assertions these tests make (button clicks, no keyboard navigation).
const LEAD_IN_MS = 3000

async function startAndAdvancePastLeadIn() {
  fireEvent.click(screen.getByRole('button', { name: 'Start session' }))
  // Flush the microtask queue so the await audio.start() in onStartClick resolves
  // and the setTimeout chain is registered, THEN advance timers past LEAD_IN_MS.
  await act(async () => {
    await Promise.resolve()
    await Promise.resolve()
    vi.advanceTimersByTime(LEAD_IN_MS)
  })
}

describe('running session display', () => {
  beforeEach(() => {
    vi.useFakeTimers()
    vi.setSystemTime(new Date('2026-05-09T00:00:00.000Z'))
  })

  afterEach(() => {
    vi.useRealTimers()
    vi.restoreAllMocks()
  })

  it('immediately shows the current In phase after starting a session (orb hosts the label per D-03)', async () => {
    render(<App />)

    await startAndAdvancePastLeadIn()

    // D-03: the In/Out label lives inside the orb (orb is the single visible source).
    expect(screen.getByRole('img', { name: 'Breathing shape: In' })).toBeVisible()

    // The readout region is still rendered (clock pill + ARIA contract preserved).
    expect(sessionReadout()).toBeVisible()
  })

  it('shows remaining time for timed sessions', async () => {
    render(<App />)

    await startAndAdvancePastLeadIn()

    const readout = sessionReadout()
    expect(within(readout).getByText('Remaining')).toBeVisible()
    expect(within(readout).getByText('10:00')).toBeVisible()
  })

  it('shows elapsed time for open-ended sessions', async () => {
    render(<App />)

    const duration = settingGroup('Duration')
    const increase = within(duration).getByRole('button', { name: /increase duration/i })
    for (let index = 0; index < 11; index += 1) {
      fireEvent.click(increase)
    }
    await startAndAdvancePastLeadIn()

    const readout = sessionReadout()
    expect(within(readout).getByText('Elapsed')).toBeVisible()
    expect(within(readout).getByText('0:00')).toBeVisible()
  })

  it('drives the breathing shape from the same phase and progress frame as the readout', async () => {
    render(<App />)

    await startAndAdvancePastLeadIn()

    const shape = screen.getByRole('img', { name: 'Breathing shape: In' })
    expect(shape).toHaveAttribute('data-phase', 'in')
    expect(shape).toHaveAttribute('data-progress', '0.000')
    expect(shape).toHaveTextContent('In')
  })

  it('renders the orb with two static aria-hidden reference rings', async () => {
    render(<App />)
    await startAndAdvancePastLeadIn()

    const shape = screen.getByRole('img', { name: 'Breathing shape: In' })
    const outerRing = shape.querySelector('[aria-hidden="true"].shape-marker--outer')
    const innerRing = shape.querySelector('[aria-hidden="true"].shape-marker--inner')
    expect(outerRing).not.toBeNull()
    expect(innerRing).not.toBeNull()
  })

  it('renders two stacked gradient layers (In and Out) and a single in-orb phase label', async () => {
    render(<App />)
    await startAndAdvancePastLeadIn()

    const shape = screen.getByRole('img', { name: 'Breathing shape: In' })
    expect(shape.querySelector('[aria-hidden="true"].orb-layer--in')).not.toBeNull()
    expect(shape.querySelector('[aria-hidden="true"].orb-layer--out')).not.toBeNull()
    expect(shape).toHaveTextContent('In')
  })

  it('renders the in-orb phase label at large display size (text-5xl semibold) per D-03', async () => {
    render(<App />)
    await startAndAdvancePastLeadIn()

    const shape = screen.getByRole('img', { name: 'Breathing shape: In' })
    // The visible label is a non-aria-hidden child whose text content is the phase label.
    const label = Array.from(shape.children).find((child) => {
      return !(child as HTMLElement).hasAttribute('aria-hidden') && child.textContent === 'In'
    }) as HTMLElement | undefined
    expect(label).toBeDefined()
    // Reason: label non-null asserted by expect().toBeDefined() immediately above.
    // eslint-disable-next-line @typescript-eslint/no-non-null-assertion
    expect(label!.className).toMatch(/text-5xl/)
    // eslint-disable-next-line @typescript-eslint/no-non-null-assertion
    expect(label!.className).toMatch(/font-semibold/)
  })

  it('binds the orb scale to phaseProgress in normal motion mode', async () => {
    render(<App />)
    await startAndAdvancePastLeadIn()

    const shape = screen.getByRole('img', { name: 'Breathing shape: In' })
    const scaleHost = shape.querySelector<HTMLElement>('.orb')
    expect(scaleHost).not.toBeNull()
    // Default matchMedia mock has matches: false; phaseProgress at start is 0
    // → liveScale for 'in' = MIN_SCALE = 0.58.
    // Reason: scaleHost non-null asserted by expect().not.toBeNull() immediately above.
    // eslint-disable-next-line @typescript-eslint/no-non-null-assertion
    expect(scaleHost!.style.transform).toContain('scale(0.58')
  })

  it('holds the orb at fixed mid-scale (0.79) when reduced-motion is preferred (D-06)', async () => {
    // Reason: cast documents the intended stub shape; vi.spyOn types accept the original type internally.
    // eslint-disable-next-line @typescript-eslint/no-unnecessary-type-assertion
    vi.spyOn(window, 'matchMedia').mockReturnValue({
      matches: true,
      media: '(prefers-reduced-motion: reduce)',
      onchange: null,
      addEventListener: () => {},
      removeEventListener: () => {},
      addListener: () => {},
      removeListener: () => {},
      dispatchEvent: () => false,
    } as unknown as MediaQueryList)

    render(<App />)
    await startAndAdvancePastLeadIn()

    const shape = screen.getByRole('img', { name: 'Breathing shape: In' })
    expect(shape).toHaveAttribute('data-phase', 'in')
    const scaleHost = shape.querySelector<HTMLElement>('.orb')
    expect(scaleHost).not.toBeNull()
    // Phase 5.1 Plan 04 post-UAT: transform is `translate3d(0,0,0) scale(...)`
    // (translate3d added for Firefox GPU promotion). The scale(0.79) substring
    // is the assertion that matters — D-06 fixed mid-scale invariant.
    // Reason: scaleHost non-null asserted by expect().not.toBeNull() immediately above.
    // eslint-disable-next-line @typescript-eslint/no-non-null-assertion
    expect(scaleHost!.style.transform).toMatch(/^translate3d\(0(?:px)?,\s*0(?:px)?,\s*0(?:px)?\)\s+scale\(0\.79\)$/)
  })
})

describe('running duration edits and completion', () => {
  beforeEach(() => {
    vi.useFakeTimers()
    vi.setSystemTime(new Date('2026-05-09T00:00:00.000Z'))
  })

  afterEach(() => {
    vi.useRealTimers()
  })

  it('extends timed sessions from the existing duration stepper increase button', async () => {
    render(<App />)

    await startAndAdvancePastLeadIn()

    const duration = settingGroup('Duration')
    expect(screen.queryByRole('group', { name: 'Extend duration' })).not.toBeInTheDocument()
    expect(within(duration).getByRole('button', { name: /decrease duration/i })).toBeDisabled()
    expect(within(duration).getByRole('button', { name: /increase duration/i })).toBeEnabled()

    fireEvent.click(within(duration).getByRole('button', { name: /increase duration/i }))

    expect(within(duration).getByText('15 min')).toBeVisible()
  })

  it('does not allow shortening or switching a timed running session to open-ended', async () => {
    render(<App />)

    await startAndAdvancePastLeadIn()

    const duration = settingGroup('Duration')
    const decrease = within(duration).getByRole('button', { name: /decrease duration/i })
    const increase = within(duration).getByRole('button', { name: /increase duration/i })

    expect(decrease).toBeDisabled()

    for (let index = 0; index < 10; index += 1) {
      fireEvent.click(increase)
    }

    expect(within(duration).getByText('60 min')).toBeVisible()
    expect(increase).toBeDisabled()
    expect(within(duration).queryByText('Open-ended')).not.toBeInTheDocument()
  })

  it('does not allow running duration edits for open-ended sessions', async () => {
    render(<App />)

    const duration = settingGroup('Duration')
    const increase = within(duration).getByRole('button', { name: /increase duration/i })
    for (let index = 0; index < 11; index += 1) {
      fireEvent.click(increase)
    }
    await startAndAdvancePastLeadIn()

    expect(screen.queryByRole('group', { name: 'Extend duration' })).not.toBeInTheDocument()
    expect(within(duration).getByRole('button', { name: /decrease duration/i })).toBeDisabled()
    expect(within(duration).getByRole('button', { name: /increase duration/i })).toBeDisabled()
  })

  it('automatically renders Session complete when a timed session reaches the end', async () => {
    render(<App />)

    fireEvent.click(within(settingGroup('Duration')).getByRole('button', { name: /decrease duration/i }))
    await startAndAdvancePastLeadIn()

    // Phase 3 fix: timed completion holds until the surrounding cycle ends so
    // cues never get cut mid-In/mid-Out. 5 min at the default bpm lands
    // mid-cycle; advance an extra minute to clear the next boundary.
    act(() => {
      vi.advanceTimersByTime(6 * 60_000)
    })

    expect(screen.getByText('Session complete')).toBeVisible()
    expect(screen.getByRole('button', { name: 'Start session' })).toBeVisible()
  })

  it('keeps open-ended sessions running when mocked time advances', async () => {
    render(<App />)

    const duration = settingGroup('Duration')
    const increase = within(duration).getByRole('button', { name: /increase duration/i })
    for (let index = 0; index < 11; index += 1) {
      fireEvent.click(increase)
    }
    await startAndAdvancePastLeadIn()

    act(() => {
      vi.advanceTimersByTime(61 * 60_000)
    })

    expect(screen.queryByText('Session complete')).not.toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'End session' })).toBeVisible()
    const readout = sessionReadout()
    expect(within(readout).getByText('Elapsed')).toBeVisible()
  })
})

describe('manual session ending', () => {
  beforeEach(() => {
    vi.useFakeTimers()
    vi.setSystemTime(new Date('2026-05-09T00:00:00.000Z'))
  })

  afterEach(() => {
    vi.useRealTimers()
    vi.restoreAllMocks()
  })

  it('opens the end-session modal for timed sessions and keeps the session running on Keep going', async () => {
    render(<App />)

    await startAndAdvancePastLeadIn()
    fireEvent.click(screen.getByRole('button', { name: 'End session' }))

    expect(screen.getByRole('dialog', { name: 'End this session?' })).toBeVisible()
    fireEvent.click(screen.getByRole('button', { name: 'Keep going' }))

    expect(screen.queryByRole('dialog', { name: 'End this session?' })).not.toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'End session' })).toBeVisible()
    expect(screen.getByRole('status', { name: 'Session announcement' })).toBeVisible()
  })

  it('confirms timed manual end via the modal End button, clears active readouts, and keeps selected settings', async () => {
    render(<App />)

    fireEvent.click(within(settingGroup('Duration')).getByRole('button', { name: /increase duration/i }))
    await startAndAdvancePastLeadIn()
    fireEvent.click(screen.getByRole('button', { name: 'End session' }))
    fireEvent.click(screen.getByRole('button', { name: 'End' }))

    expect(screen.getByRole('button', { name: 'Start session' })).toBeVisible()
    expect(screen.queryByRole('status', { name: 'Session announcement' })).not.toBeInTheDocument()
    expect(screen.queryByRole('img', { name: /Breathing shape/i })).not.toBeInTheDocument()
    expect(within(settingGroup('Duration')).getByText('15 min')).toBeVisible()
  })

  it('ends open-ended sessions directly without showing the modal (D-14)', async () => {
    render(<App />)

    const duration = settingGroup('Duration')
    const increase = within(duration).getByRole('button', { name: /increase duration/i })
    for (let index = 0; index < 11; index += 1) {
      fireEvent.click(increase)
    }
    await startAndAdvancePastLeadIn()
    fireEvent.click(screen.getByRole('button', { name: 'End session' }))

    expect(screen.queryByRole('dialog')).not.toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'Start session' })).toBeVisible()
    expect(screen.queryByRole('status', { name: 'Session announcement' })).not.toBeInTheDocument()
  })
})

// VARIANT-03 capture-at-session-start integration tests.
// Seeds localStorage[STATE_KEY] with a chosen variant BEFORE App renders to exercise
// the sessionVariantRef snapshot mechanism (D-09/D-10) end-to-end.

function seedVariant(variant: VisualVariantId): void {
  const envelope = {
    version: 1,
    prefs: { theme: 'system', timbre: 'bowl', variant, locale: 'en' },
  }
  window.localStorage.setItem(STATE_KEY, JSON.stringify(envelope))
}

describe('VARIANT-03 capture-at-session-start', () => {
  beforeEach(() => {
    vi.useFakeTimers()
    vi.setSystemTime(new Date('2026-05-09T00:00:00.000Z'))
    window.localStorage.clear()
  })

  afterEach(() => {
    vi.useRealTimers()
    vi.restoreAllMocks()
    window.localStorage.clear()
  })

  it('captures variant at session start — Square selected before Start, shape renders with data-variant="square" during the running session', async () => {
    seedVariant('square')
    render(<App />)

    await startAndAdvancePastLeadIn()

    const shape = screen.getByRole('img', { name: 'Breathing shape: In' })
    expect(shape).toHaveAttribute('data-variant', 'square')
  })

  it('mid-session localStorage change does NOT swap the rendered variant', async () => {
    seedVariant('orb')
    render(<App />)

    await startAndAdvancePastLeadIn()

    // Simulate a cross-tab write: change variant to 'diamond' in localStorage
    // and fire the 'storage' event — useVisualVariant will update liveVariant,
    // but sessionVariantRef.current (non-null during the session) wins per D-09/D-10.
    const diamondEnvelope = JSON.stringify({
      version: 1,
      prefs: { theme: 'system', timbre: 'bowl', variant: 'diamond', locale: 'en' },
    })
    act(() => {
      window.localStorage.setItem(STATE_KEY, diamondEnvelope)
      window.dispatchEvent(new StorageEvent('storage', { key: STATE_KEY, newValue: diamondEnvelope }))
    })

    const shape = screen.getByRole('img', { name: 'Breathing shape: In' })
    expect(shape).toHaveAttribute('data-variant', 'orb')
  })

  it('next session picks up post-Start prefs variant', async () => {
    seedVariant('orb')
    render(<App />)

    await startAndAdvancePastLeadIn()

    // Simulate cross-tab write to 'diamond' mid-session (same as test 2)
    const diamondEnvelope = JSON.stringify({
      version: 1,
      prefs: { theme: 'system', timbre: 'bowl', variant: 'diamond', locale: 'en' },
    })
    act(() => {
      window.localStorage.setItem(STATE_KEY, diamondEnvelope)
      window.dispatchEvent(new StorageEvent('storage', { key: STATE_KEY, newValue: diamondEnvelope }))
    })

    // End the open-ended-style session via End button (open-ended direct end path)
    // First, switch to open-ended to avoid the modal
    // Since default is 10 min timed, we end via the modal confirm path
    fireEvent.click(screen.getByRole('button', { name: 'End session' }))
    fireEvent.click(screen.getByRole('button', { name: 'End' }))

    // Verify back to idle
    expect(screen.getByRole('button', { name: 'Start session' })).toBeVisible()

    // Start a new session — sessionVariantRef was cleared on session end;
    // liveVariant is now 'diamond' (post-cross-tab update), so the new session captures 'diamond'.
    await startAndAdvancePastLeadIn()

    const shape = screen.getByRole('img', { name: 'Breathing shape: In' })
    expect(shape).toHaveAttribute('data-variant', 'diamond')
  })

  it('VARIANT-02 zero-regression — Orb is the rendered variant when prefs.variant is the DEFAULT_VARIANT "orb" (or absent from localStorage entirely)', async () => {
    // No seedVariant call — localStorage is cleared in beforeEach; loadPrefs() coerces to DEFAULT_VARIANT='orb'.
    render(<App />)

    await startAndAdvancePastLeadIn()

    const shape = screen.getByRole('img', { name: 'Breathing shape: In' })
    expect(shape).toHaveAttribute('data-variant', 'orb')
  })

  it('lead-in countdown is rendered by the captured variant — selecting Square before Start makes the 3-2-1 digit render inside SquareLeadIn', async () => {
    seedVariant('square')
    render(<App />)

    // Click Start to begin lead-in — DO NOT advance past it yet
    fireEvent.click(screen.getByRole('button', { name: 'Start session' }))
    // Flush microtasks for the await audio.start() in onStartClick
    await act(async () => {
      await Promise.resolve()
      await Promise.resolve()
      // Advance only 1 tick so we're in lead-in (digit=3 visible)
      vi.advanceTimersByTime(100)
    })

    const leadInShape = screen.getByRole('img', { name: 'Lead-in: 3' })
    expect(leadInShape).toHaveAttribute('data-variant', 'square')
  })
})
