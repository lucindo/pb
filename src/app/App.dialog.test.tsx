import '@testing-library/jest-dom/vitest'

import { act, fireEvent, render, screen, within } from '@testing-library/react'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

import App from './App'
import { APP_TEST_NOW, settingGroup, startAndAdvancePastLeadIn } from './appTestHarness'

describe('end-session confirmation modal (App integration)', () => {
  beforeEach(() => {
    vi.useFakeTimers()
    vi.setSystemTime(APP_TEST_NOW)
  })

  afterEach(() => {
    vi.useRealTimers()
  })

  it('opens the modal when End session is clicked during a timed session', async () => {
    render(<App />)

    await startAndAdvancePastLeadIn()
    fireEvent.click(screen.getByRole('button', { name: 'End' }))

    const dialog = screen.getByRole('dialog', { name: 'End this session?' })
    expect(dialog).toBeVisible()
    const keepGoing = screen.getByRole('button', { name: 'Keep going' })
    expect(keepGoing).toHaveFocus()
    expect(within(dialog).getByRole('button', { name: 'End' })).toBeVisible()
  })

  it('keeps the session running when Keep going is clicked', async () => {
    render(<App />)

    await startAndAdvancePastLeadIn()
    fireEvent.click(screen.getByRole('button', { name: 'End' }))
    fireEvent.click(screen.getByRole('button', { name: 'Keep going' }))

    expect(screen.queryByRole('dialog', { name: 'End this session?' })).not.toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'End' })).toBeVisible()
    expect(screen.getByRole('region', { name: 'Session readout' })).toBeVisible()
  })

  it('ends the session when End is clicked', async () => {
    render(<App />)

    await startAndAdvancePastLeadIn()
    fireEvent.click(screen.getByRole('button', { name: 'End' }))
    const endDialog = screen.getByRole('dialog', { name: 'End this session?' })
    fireEvent.click(within(endDialog).getByRole('button', { name: 'End' }))

    expect(screen.queryByRole('dialog', { name: 'End this session?' })).not.toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'Start' })).toBeVisible()
    expect(screen.queryByRole('status', { name: 'Session announcement' })).not.toBeInTheDocument()
  })

  it('treats Escape as Keep going (cancel pathway, D-13)', async () => {
    render(<App />)

    await startAndAdvancePastLeadIn()
    fireEvent.click(screen.getByRole('button', { name: 'End' }))

    const dialog = screen.getByRole('dialog', { name: 'End this session?' })
    // jsdom polyfill: dispatch the cancel event manually (Task 1 Test 7 pattern).
    fireEvent(dialog, new Event('cancel', { bubbles: false, cancelable: true }))

    expect(screen.queryByRole('dialog', { name: 'End this session?' })).not.toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'End' })).toBeVisible()
  })

  it('open-ended sessions skip the modal entirely (D-14)', async () => {
    render(<App />)

    const duration = settingGroup('Duration')
    const increase = within(duration).getByRole('button', { name: /increase duration/i })
    for (let i = 0; i < 11; i += 1) {
      fireEvent.click(increase)
    }

    await startAndAdvancePastLeadIn()
    fireEvent.click(screen.getByRole('button', { name: 'End' }))

    expect(screen.queryByRole('dialog', { name: 'End this session?' })).not.toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'Start' })).toBeVisible()
    expect(screen.queryByRole('status', { name: 'Session announcement' })).not.toBeInTheDocument()
  })

  describe('SESS-05 regression with fake timers', () => {
    it('keeps the session timing clock advancing while the modal is open (D-13)', async () => {
      render(<App />)

      await startAndAdvancePastLeadIn()

      const readout = screen.getByRole('region', { name: 'Session readout' })
      expect(within(readout).getByText('10:00')).toBeVisible()

      fireEvent.click(screen.getByRole('button', { name: 'End' }))

      // Modal opened, clock still at 10:00.
      expect(screen.getByRole('dialog', { name: 'End this session?' })).toBeVisible()

      act(() => {
        vi.advanceTimersByTime(1_000)
      })

      // Modal still open …
      expect(screen.getByRole('dialog', { name: 'End this session?' })).toBeVisible()
      // … and clock has advanced (Remaining shrunk by 1s).
      expect(within(readout).queryByText('10:00')).not.toBeInTheDocument()
      expect(within(readout).getByText('9:59')).toBeVisible()

      fireEvent.click(screen.getByRole('button', { name: 'Keep going' }))
    })

    it('auto-closes the modal when the session completes underneath it (WR-01)', async () => {
      render(<App />)

      // Use a 5-min duration so the clock can run out within the test.
      fireEvent.click(
        within(settingGroup('Duration')).getByRole('button', {
          name: /decrease duration/i,
        }),
      )
      await startAndAdvancePastLeadIn()
      fireEvent.click(screen.getByRole('button', { name: 'End' }))

      // Modal is open while the session is still running.
      expect(screen.getByRole('dialog', { name: 'End this session?' })).toBeVisible()

      // Advance past the session end without the user dismissing the modal.
      // Completion waits for the surrounding cycle to finish;
      // advance an extra minute past the 5-min duration mark.
      act(() => {
        vi.advanceTimersByTime(6 * 60_000)
      })

      // Modal must auto-close, and the app should land on the completion
      // state with the "Done" dismiss button (Start returns after Done).
      expect(
        screen.queryByRole('dialog', { name: 'End this session?' }),
      ).not.toBeInTheDocument()
      expect(screen.getByRole('button', { name: 'Done' })).toBeVisible()
      expect(screen.getByText('Session complete')).toBeVisible()
    })
  })
})

// Learn/Settings are full-page routes, not modal overlays on the practice surface —
// so a session cannot start while the user is on those pages.
// The underlying closeOnSessionView invariant is covered by useAppNavigation.test.tsx.
// What we verify here is the routing-replaces-modal behavior.
describe('WR-09 surface routing replaces dialog overlay', () => {
  beforeEach(() => {
    vi.useFakeTimers()
    vi.setSystemTime(APP_TEST_NOW)
  })

  afterEach(() => {
    vi.useRealTimers()
  })

  it('clicking Learn navigates to the LearnPage and unmounts the practice surface (no dialog overlay)', () => {
    render(<App />)

    // Practice surface mounted before click — Start button is visible.
    expect(screen.getByRole('button', { name: 'Start' })).toBeVisible()

    fireEvent.click(screen.getByRole('button', { name: 'Learn' }))

    // No modal <dialog> for Learn — it's a full-page route now. The Learn page
    // title is the h1 in TopAppBar.
    expect(
      screen.queryByRole('dialog', { name: 'About this practice' }),
    ).not.toBeInTheDocument()
    expect(
      screen.getByRole('heading', { level: 1, name: 'About this practice' }),
    ).toBeInTheDocument()

    // Practice surface is unmounted — Start button is gone.
    expect(screen.queryByRole('button', { name: 'Start' })).not.toBeInTheDocument()
  })

})
