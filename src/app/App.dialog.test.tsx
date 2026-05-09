import '@testing-library/jest-dom/vitest'

import { act, fireEvent, render, screen, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { afterEach, describe, expect, it, vi } from 'vitest'

import { EndSessionDialog } from '../components/EndSessionDialog'
import App from './App'

function renderDialog(
  props: Partial<{ open: boolean; onConfirm: () => void; onCancel: () => void }> = {},
) {
  const onConfirm = props.onConfirm ?? vi.fn()
  const onCancel = props.onCancel ?? vi.fn()
  const utils = render(
    <EndSessionDialog open={props.open ?? false} onConfirm={onConfirm} onCancel={onCancel} />,
  )
  return { ...utils, onConfirm, onCancel }
}

describe('EndSessionDialog (component-level)', () => {
  it('does not show the modal when open=false', () => {
    // IN-03: previous version wrapped the assertion in `if (dialog) { ... }`,
    // which made the test "always-green" — a closed <dialog> has no a11y role,
    // so queryByRole returned null and the test passed without asserting
    // anything. Query the DOM directly for the <dialog> element and assert the
    // closed-dialog contract (.open === false) unconditionally.
    const { container } = renderDialog({ open: false })
    const dialog = container.querySelector('dialog')
    expect(dialog).not.toBeNull()
    expect((dialog as HTMLDialogElement).open).toBe(false)
  })

  it('opens with focus on Keep going when open=true', () => {
    renderDialog({ open: true })

    const dialog = screen.getByRole('dialog', { name: 'End this session?' }) as HTMLDialogElement
    expect(dialog.open).toBe(true)
    expect(screen.getByRole('button', { name: 'Keep going' })).toHaveFocus()
  })

  it('exposes role="dialog" with accessible name "End this session?" via aria-labelledby', () => {
    renderDialog({ open: true })

    const dialog = screen.getByRole('dialog', { name: 'End this session?' })
    expect(dialog).toBeInTheDocument()
    // Native <dialog> has the role implicitly — the explicit role attribute MUST NOT be set
    // (RESEARCH Anti-Pattern: don't add role="dialog" manually).
    expect(dialog).not.toHaveAttribute('role')
    expect(dialog).toHaveAttribute('aria-labelledby')
  })

  it('renders the End and Keep going buttons with locked copy', () => {
    renderDialog({ open: true })

    expect(screen.getByRole('button', { name: 'End' })).toBeVisible()
    expect(screen.getByRole('button', { name: 'Keep going' })).toBeVisible()
    expect(screen.getByText('End this session?')).toBeVisible()
  })

  it('calls onConfirm when End is clicked', async () => {
    const user = userEvent.setup()
    const { onConfirm, onCancel } = renderDialog({ open: true })

    await user.click(screen.getByRole('button', { name: 'End' }))

    expect(onConfirm).toHaveBeenCalledTimes(1)
    expect(onCancel).not.toHaveBeenCalled()
  })

  it('calls onCancel when Keep going is clicked', async () => {
    const user = userEvent.setup()
    const { onConfirm, onCancel } = renderDialog({ open: true })

    await user.click(screen.getByRole('button', { name: 'Keep going' }))

    expect(onCancel).toHaveBeenCalledTimes(1)
    expect(onConfirm).not.toHaveBeenCalled()
  })

  it('treats the cancel event (Esc) as Keep going (D-10)', () => {
    const { onCancel, onConfirm } = renderDialog({ open: true })

    const dialog = screen.getByRole('dialog', { name: 'End this session?' })
    fireEvent(dialog, new Event('cancel', { bubbles: false, cancelable: true }))

    expect(onCancel).toHaveBeenCalledTimes(1)
    expect(onConfirm).not.toHaveBeenCalled()
  })

  it('calls onCancel when the backdrop (the dialog element itself) is clicked', () => {
    const { onCancel, onConfirm } = renderDialog({ open: true })

    const dialog = screen.getByRole('dialog', { name: 'End this session?' })
    // Backdrop click = click whose target IS the dialog element (not its children).
    fireEvent.click(dialog, { target: dialog })

    expect(onCancel).toHaveBeenCalledTimes(1)
    expect(onConfirm).not.toHaveBeenCalled()
  })

  it('does NOT call onCancel when a click is on a child element inside the dialog', async () => {
    const user = userEvent.setup()
    const { onCancel } = renderDialog({ open: true })

    // Click on the title (a child) — must not be treated as a backdrop click.
    await user.click(screen.getByText('End this session?'))

    expect(onCancel).not.toHaveBeenCalled()
  })

  it('uses focus-visible:ring-breathing-accent on both buttons (D-21)', () => {
    renderDialog({ open: true })

    const end = screen.getByRole('button', { name: 'End' })
    const keepGoing = screen.getByRole('button', { name: 'Keep going' })

    for (const button of [end, keepGoing]) {
      expect(button.className).toMatch(/focus-visible:outline-none/)
      expect(button.className).toMatch(/focus-visible:ring-2/)
      expect(button.className).toMatch(/focus-visible:ring-breathing-accent/)
      expect(button.className).toMatch(/focus-visible:ring-offset-2/)
    }
  })

  it('meets the 48px hit-area floor on both buttons', () => {
    renderDialog({ open: true })

    const end = screen.getByRole('button', { name: 'End' })
    const keepGoing = screen.getByRole('button', { name: 'Keep going' })

    expect(end.className).toMatch(/min-h-12/)
    expect(keepGoing.className).toMatch(/min-h-12/)
  })
})

describe('end-session confirmation modal (App integration)', () => {
  it('opens the modal when End session is clicked during a timed session', async () => {
    const user = userEvent.setup()
    render(<App />)

    await user.click(screen.getByRole('button', { name: 'Start session' }))
    await user.click(screen.getByRole('button', { name: 'End session' }))

    const dialog = await screen.findByRole('dialog', { name: 'End this session?' })
    expect(dialog).toBeVisible()
    const keepGoing = screen.getByRole('button', { name: 'Keep going' })
    expect(keepGoing).toHaveFocus()
    expect(screen.getByRole('button', { name: 'End session' })).toBeVisible()
  })

  it('keeps the session running when Keep going is clicked', async () => {
    const user = userEvent.setup()
    render(<App />)

    await user.click(screen.getByRole('button', { name: 'Start session' }))
    await user.click(screen.getByRole('button', { name: 'End session' }))
    await user.click(screen.getByRole('button', { name: 'Keep going' }))

    expect(screen.queryByRole('dialog', { name: 'End this session?' })).not.toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'End session' })).toBeVisible()
    expect(screen.getByRole('region', { name: 'Session readout' })).toBeVisible()
  })

  it('ends the session when End is clicked', async () => {
    const user = userEvent.setup()
    render(<App />)

    await user.click(screen.getByRole('button', { name: 'Start session' }))
    await user.click(screen.getByRole('button', { name: 'End session' }))
    await user.click(screen.getByRole('button', { name: 'End' }))

    expect(screen.queryByRole('dialog', { name: 'End this session?' })).not.toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'Start session' })).toBeVisible()
    expect(screen.queryByRole('status', { name: 'Session announcement' })).not.toBeInTheDocument()
  })

  it('treats Escape as Keep going (cancel pathway, D-13)', async () => {
    const user = userEvent.setup()
    render(<App />)

    await user.click(screen.getByRole('button', { name: 'Start session' }))
    await user.click(screen.getByRole('button', { name: 'End session' }))

    const dialog = await screen.findByRole('dialog', { name: 'End this session?' })
    // jsdom polyfill: dispatch the cancel event manually (Task 1 Test 7 pattern).
    fireEvent(dialog, new Event('cancel', { bubbles: false, cancelable: true }))

    expect(screen.queryByRole('dialog', { name: 'End this session?' })).not.toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'End session' })).toBeVisible()
  })

  it('open-ended sessions skip the modal entirely (D-14)', async () => {
    const user = userEvent.setup()
    render(<App />)

    const duration = screen.getByRole('group', { name: 'Duration' })
    const increase = within(duration).getByRole('button', { name: /increase duration/i })
    for (let i = 0; i < 11; i += 1) {
      await user.click(increase)
    }

    await user.click(screen.getByRole('button', { name: 'Start session' }))
    await user.click(screen.getByRole('button', { name: 'End session' }))

    expect(screen.queryByRole('dialog', { name: 'End this session?' })).not.toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'Start session' })).toBeVisible()
    expect(screen.queryByRole('status', { name: 'Session announcement' })).not.toBeInTheDocument()
  })

  describe('SESS-05 regression with fake timers', () => {
    afterEach(() => {
      vi.useRealTimers()
    })

    it('keeps the session timing clock advancing while the modal is open (D-13)', () => {
      vi.useFakeTimers()
      vi.setSystemTime(new Date('2026-05-09T00:00:00.000Z'))

      render(<App />)

      fireEvent.click(screen.getByRole('button', { name: 'Start session' }))

      const readout = screen.getByRole('region', { name: 'Session readout' })
      expect(within(readout).getByText('10:00')).toBeVisible()

      fireEvent.click(screen.getByRole('button', { name: 'End session' }))

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

    it('auto-closes the modal when the session completes underneath it (WR-01)', () => {
      vi.useFakeTimers()
      vi.setSystemTime(new Date('2026-05-09T00:00:00.000Z'))

      render(<App />)

      // Use a 5-min duration so the clock can run out within the test.
      fireEvent.click(
        within(screen.getByRole('group', { name: 'Duration' })).getByRole('button', {
          name: /decrease duration/i,
        }),
      )
      fireEvent.click(screen.getByRole('button', { name: 'Start session' }))
      fireEvent.click(screen.getByRole('button', { name: 'End session' }))

      // Modal is open while the session is still running.
      expect(screen.getByRole('dialog', { name: 'End this session?' })).toBeVisible()

      // Advance past the session end without the user dismissing the modal.
      act(() => {
        vi.advanceTimersByTime(5 * 60_000)
      })

      // Modal must auto-close, and the app should be back at the idle/complete state.
      expect(
        screen.queryByRole('dialog', { name: 'End this session?' }),
      ).not.toBeInTheDocument()
      expect(screen.getByRole('button', { name: 'Start session' })).toBeVisible()
      expect(screen.getByText('Session complete')).toBeVisible()
    })
  })
})
