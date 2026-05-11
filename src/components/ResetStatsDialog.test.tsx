import '@testing-library/jest-dom/vitest'
import { fireEvent, render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { describe, expect, it, vi } from 'vitest'

import { ResetStatsDialog } from './ResetStatsDialog'

function renderDialog(
  props: Partial<{ open: boolean; onConfirm: () => void; onCancel: () => void }> = {},
) {
  const onConfirm = props.onConfirm ?? vi.fn()
  const onCancel = props.onCancel ?? vi.fn()
  const utils = render(
    <ResetStatsDialog open={props.open ?? false} onConfirm={onConfirm} onCancel={onCancel} />,
  )
  return { ...utils, onConfirm, onCancel }
}

describe('ResetStatsDialog — closed state', () => {
  it('does not show the modal when open=false (IN-03 anti-flake — query raw <dialog>)', () => {
    const { container } = renderDialog({ open: false })
    const dialog = container.querySelector('dialog')
    expect(dialog).not.toBeNull()
    expect((dialog as HTMLDialogElement).open).toBe(false)
  })
})

describe('ResetStatsDialog — open state (D-12 locked copy + default focus)', () => {
  it('opens with focus on Keep button (D-12 default-focus-on-cancel safety)', () => {
    renderDialog({ open: true })
    // Reason: cast documents that getByRole returns HTMLDialogElement; TS infers HTMLElement but dialog.open requires HTMLDialogElement.
    // eslint-disable-next-line @typescript-eslint/no-unnecessary-type-assertion
    const dialog = screen.getByRole('dialog', { name: 'Reset practice stats?' }) as HTMLDialogElement
    expect(dialog.open).toBe(true)
    expect(screen.getByRole('button', { name: 'Keep' })).toHaveFocus()
  })

  it('renders the Reset and Keep buttons with locked copy (D-12)', () => {
    renderDialog({ open: true })
    expect(screen.getByRole('button', { name: 'Reset' })).toBeVisible()
    expect(screen.getByRole('button', { name: 'Keep' })).toBeVisible()
    expect(screen.getByText('Reset practice stats?')).toBeVisible()
  })

  it('clicking Reset invokes onConfirm exactly once', async () => {
    const user = userEvent.setup()
    const { onConfirm } = renderDialog({ open: true })
    await user.click(screen.getByRole('button', { name: 'Reset' }))
    expect(onConfirm).toHaveBeenCalledTimes(1)
  })

  it('clicking Keep invokes onCancel exactly once', async () => {
    const user = userEvent.setup()
    const { onCancel } = renderDialog({ open: true })
    await user.click(screen.getByRole('button', { name: 'Keep' }))
    expect(onCancel).toHaveBeenCalledTimes(1)
  })

  it('Esc (dialog cancel event) invokes onCancel via preventDefault path', () => {
    const { onCancel, container } = renderDialog({ open: true })
    // Reason: dialog element is always present when open=true; querySelector('dialog') is guaranteed non-null.
    // eslint-disable-next-line @typescript-eslint/no-non-null-assertion
    const dialog = container.querySelector('dialog')!
    fireEvent(dialog, new Event('cancel', { cancelable: true }))
    expect(onCancel).toHaveBeenCalledTimes(1)
  })

  it('clicking the backdrop (event.target === dialog itself) invokes onCancel', () => {
    const { onCancel, container } = renderDialog({ open: true })
    // Reason: dialog element is always present when open=true; querySelector('dialog') is guaranteed non-null.
    // eslint-disable-next-line @typescript-eslint/no-non-null-assertion
    const dialog = container.querySelector('dialog')!
    fireEvent.click(dialog, { target: dialog })
    expect(onCancel).toHaveBeenCalledTimes(1)
  })

  it('clicking inside the inner panel (not the backdrop) does NOT invoke onCancel', async () => {
    const user = userEvent.setup()
    const { onCancel } = renderDialog({ open: true })
    // Click on the title h2 — child of the dialog, not the dialog itself
    await user.click(screen.getByText('Reset practice stats?'))
    expect(onCancel).not.toHaveBeenCalled()
  })
})

describe('ResetStatsDialog — open->close transition', () => {
  it('closes the dialog when open transitions from true to false', () => {
    const { container, rerender } = renderDialog({ open: true })
    const dialog = container.querySelector('dialog') as HTMLDialogElement
    expect(dialog.open).toBe(true)
    rerender(<ResetStatsDialog open={false} onConfirm={vi.fn()} onCancel={vi.fn()} />)
    expect(dialog.open).toBe(false)
  })
})
