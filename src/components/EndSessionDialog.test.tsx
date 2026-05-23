import '@testing-library/jest-dom/vitest'
import { fireEvent, render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { describe, expect, it, vi } from 'vitest'

import { EndSessionDialog } from './EndSessionDialog'
import { UI_STRINGS } from '../content/strings'

const EN_STRINGS_FIXTURE = UI_STRINGS.en

function renderDialog(
  props: Partial<{ open: boolean; onConfirm: () => void; onCancel: () => void }> = {},
) {
  const onConfirm = props.onConfirm ?? vi.fn()
  const onCancel = props.onCancel ?? vi.fn()
  const utils = render(
    <EndSessionDialog
      open={props.open ?? false}
      onConfirm={onConfirm}
      onCancel={onCancel}
      strings={EN_STRINGS_FIXTURE.practice.endSessionDialog}
    />,
  )
  return { ...utils, onConfirm, onCancel }
}

describe('EndSessionDialog — closed state', () => {
  it('does not show the modal when open=false', () => {
    const { container } = renderDialog({ open: false })
    const dialog = container.querySelector('dialog')
    expect(dialog).not.toBeNull()
    expect((dialog as HTMLDialogElement).open).toBe(false)
  })
})

describe('EndSessionDialog — open state (D-12 locked copy + default focus)', () => {
  it('opens with focus on Keep going button (D-12 default-focus-on-cancel safety)', () => {
    renderDialog({ open: true })
    // eslint-disable-next-line @typescript-eslint/no-unnecessary-type-assertion
    const dialog = screen.getByRole('dialog', { name: 'End this session?' }) as HTMLDialogElement
    expect(dialog.open).toBe(true)
    expect(screen.getByRole('button', { name: 'Keep going' })).toHaveFocus()
  })

  it('renders the End and Keep going buttons with locked copy (D-12)', () => {
    renderDialog({ open: true })
    expect(screen.getByRole('button', { name: 'End' })).toBeVisible()
    expect(screen.getByRole('button', { name: 'Keep going' })).toBeVisible()
    expect(screen.getByText('End this session?')).toBeVisible()
  })

  it('clicking End invokes onConfirm exactly once', async () => {
    const user = userEvent.setup()
    const { onConfirm } = renderDialog({ open: true })
    await user.click(screen.getByRole('button', { name: 'End' }))
    expect(onConfirm).toHaveBeenCalledTimes(1)
  })

  it('clicking Keep going invokes onCancel exactly once', async () => {
    const user = userEvent.setup()
    const { onCancel } = renderDialog({ open: true })
    await user.click(screen.getByRole('button', { name: 'Keep going' }))
    expect(onCancel).toHaveBeenCalledTimes(1)
  })

  it('Esc (dialog cancel event) invokes onCancel via preventDefault path', () => {
    const { onCancel, container } = renderDialog({ open: true })
    // eslint-disable-next-line @typescript-eslint/no-non-null-assertion
    const dialog = container.querySelector('dialog')!
    fireEvent(dialog, new Event('cancel', { cancelable: true }))
    expect(onCancel).toHaveBeenCalledTimes(1)
  })

  it('clicking the backdrop (event.target === dialog itself) invokes onCancel', () => {
    const { onCancel, container } = renderDialog({ open: true })
    // eslint-disable-next-line @typescript-eslint/no-non-null-assertion
    const dialog = container.querySelector('dialog')!
    fireEvent.click(dialog, { target: dialog })
    expect(onCancel).toHaveBeenCalledTimes(1)
  })

  it('clicking inside the inner panel (not the backdrop) does NOT invoke onCancel', async () => {
    const user = userEvent.setup()
    const { onCancel } = renderDialog({ open: true })
    await user.click(screen.getByText('End this session?'))
    expect(onCancel).not.toHaveBeenCalled()
  })
})

describe('EndSessionDialog — optional body slot (D-12 NK completion summary)', () => {
  it('renders the body node when a body prop is provided', () => {
    render(
      <EndSessionDialog
        open
        onConfirm={vi.fn()}
        onCancel={vi.fn()}
        strings={EN_STRINGS_FIXTURE.practice.endSessionDialog}
        body={<p>3 rounds complete</p>}
      />,
    )
    expect(screen.getByText('3 rounds complete')).toBeVisible()
  })

  it('renders no extra body content when body is absent (unchanged early-end behavior)', () => {
    renderDialog({ open: true })
    // Only the title and the two action buttons — no summary node.
    expect(screen.getByRole('button', { name: 'End' })).toBeVisible()
    expect(screen.getByRole('button', { name: 'Keep going' })).toBeVisible()
    expect(screen.queryByText('3 rounds complete')).not.toBeInTheDocument()
  })
})

describe('EndSessionDialog — open->close transition', () => {
  it('closes the dialog when open transitions from true to false', () => {
    const { container, rerender } = renderDialog({ open: true })
    const dialog = container.querySelector('dialog') as HTMLDialogElement
    expect(dialog.open).toBe(true)
    rerender(
      <EndSessionDialog
        open={false}
        onConfirm={vi.fn()}
        onCancel={vi.fn()}
        strings={EN_STRINGS_FIXTURE.practice.endSessionDialog}
      />,
    )
    expect(dialog.open).toBe(false)
  })
})
