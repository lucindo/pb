import '@testing-library/jest-dom/vitest'
import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { describe, expect, it, vi } from 'vitest'

import { ConfirmDialog } from './ConfirmDialog'

function renderDialog(props: Partial<{ open: boolean; onConfirm: () => void; onCancel: () => void }> = {}) {
  const onConfirm = props.onConfirm ?? vi.fn()
  const onCancel = props.onCancel ?? vi.fn()
  const utils = render(
    <ConfirmDialog
      open={props.open ?? true}
      onConfirm={onConfirm}
      onCancel={onCancel}
      title="Reset HRV stats?"
      confirmLabel="Reset"
      cancelLabel="Keep"
      body="This can't be undone."
    />,
  )
  return { ...utils, onConfirm, onCancel }
}

describe('ConfirmDialog (generic confirm chrome)', () => {
  it('renders the custom title, body, and action labels', () => {
    renderDialog()
    const dialog = screen.getByRole('dialog', { name: 'Reset HRV stats?' })
    expect(dialog).toBeVisible()
    expect(screen.getByText("This can't be undone.")).toBeVisible()
    expect(screen.getByRole('button', { name: 'Reset' })).toBeVisible()
    expect(screen.getByRole('button', { name: 'Keep' })).toBeVisible()
  })

  it('defaults focus to the cancel (safe) action', () => {
    renderDialog()
    expect(screen.getByRole('button', { name: 'Keep' })).toHaveFocus()
  })

  it('confirm fires onConfirm; cancel fires onCancel', async () => {
    const user = userEvent.setup()
    const { onConfirm, onCancel } = renderDialog()
    await user.click(screen.getByRole('button', { name: 'Reset' }))
    expect(onConfirm).toHaveBeenCalledTimes(1)
    await user.click(screen.getByRole('button', { name: 'Keep' }))
    expect(onCancel).toHaveBeenCalledTimes(1)
  })
})
