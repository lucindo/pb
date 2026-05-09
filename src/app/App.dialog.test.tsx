import '@testing-library/jest-dom/vitest'

import { fireEvent, render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { describe, expect, it, vi } from 'vitest'

import { EndSessionDialog } from '../components/EndSessionDialog'

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
    renderDialog({ open: false })
    const dialog = screen.queryByRole('dialog', { name: 'End this session?' })
    // The native <dialog> exists in the DOM either way; .open should be false.
    if (dialog) {
      expect((dialog as HTMLDialogElement).open).toBe(false)
    }
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
