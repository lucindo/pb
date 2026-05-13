// NOTE: D-13 — focus return to SettingsAnchor trigger after dialog close is native
// browser behavior not implemented by the JSDOM polyfill. Do NOT write a test
// asserting focus returns to the trigger. SC2 focus-return is verified in-browser only.
//
// JSDOM limitations: native focus-trap and focus-return are NOT testable in JSDOM
// (Manual-Only verifications per .planning/phases/15-settingsdialog-shell/15-VALIDATION.md).
// Tests assert dialog.open boolean, onClose invocations, and child text rendering only.
import '@testing-library/jest-dom/vitest'
import { fireEvent, render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { describe, expect, it, vi } from 'vitest'

import { SettingsDialog } from './SettingsDialog'

function renderDialog(
  props: Partial<{ open: boolean; onClose: () => void; inSessionView: boolean }> = {},
) {
  const onClose = props.onClose ?? vi.fn()
  const utils = render(
    <SettingsDialog
      open={props.open ?? false}
      onClose={onClose}
      inSessionView={props.inSessionView ?? false}
    />,
  )
  return { ...utils, onClose }
}

describe('SettingsDialog — closed state', () => {
  it('does not show the modal when open=false', () => {
    const { container } = renderDialog({ open: false })
    const dialog = container.querySelector('dialog')
    expect(dialog).not.toBeNull()
    expect((dialog as HTMLDialogElement).open).toBe(false)
  })
})

describe('SettingsDialog — open state (D-18 locked copy)', () => {
  it('opens the native dialog when open=true', () => {
    renderDialog({ open: true })
    // eslint-disable-next-line @typescript-eslint/no-unnecessary-type-assertion
    const dialog = screen.getByRole('dialog', { name: 'Settings' }) as HTMLDialogElement
    expect(dialog.open).toBe(true)
    // D-13: no focus assertion — SettingsDialog has no destructive default; native focus-return only
  })

  it('renders Close button and Settings title with locked copy (D-18)', () => {
    renderDialog({ open: true })
    expect(screen.getByRole('button', { name: 'Close' })).toBeVisible()
    expect(screen.getByText('Settings')).toBeVisible()
  })

  it('clicking Close invokes onClose exactly once', async () => {
    const user = userEvent.setup()
    const { onClose } = renderDialog({ open: true })
    await user.click(screen.getByRole('button', { name: 'Close' }))
    expect(onClose).toHaveBeenCalledTimes(1)
  })

  it('Esc (dialog cancel event) invokes onClose via preventDefault path', () => {
    const { onClose, container } = renderDialog({ open: true })
    // Reason: dialog element is always present when open=true; querySelector('dialog') is guaranteed non-null.
    // eslint-disable-next-line @typescript-eslint/no-non-null-assertion
    const dialog = container.querySelector('dialog')!
    fireEvent(dialog, new Event('cancel', { cancelable: true }))
    expect(onClose).toHaveBeenCalledTimes(1)
  })

  it('clicking the backdrop invokes onClose', () => {
    const { onClose, container } = renderDialog({ open: true })
    // Reason: dialog element is always present when open=true; querySelector('dialog') is guaranteed non-null.
    // eslint-disable-next-line @typescript-eslint/no-non-null-assertion
    const dialog = container.querySelector('dialog')!
    fireEvent.click(dialog, { target: dialog })
    expect(onClose).toHaveBeenCalledTimes(1)
  })

  it('clicking inside the inner panel does NOT invoke onClose', async () => {
    const user = userEvent.setup()
    const { onClose } = renderDialog({ open: true })
    await user.click(screen.getByText('Settings'))
    expect(onClose).not.toHaveBeenCalled()
  })
})

describe('SettingsDialog — open→close transition', () => {
  it('closes the dialog when open transitions from true to false', () => {
    const { container, rerender } = renderDialog({ open: true })
    const dialog = container.querySelector('dialog') as HTMLDialogElement
    expect(dialog.open).toBe(true)
    rerender(<SettingsDialog open={false} onClose={vi.fn()} inSessionView={false} />)
    expect(dialog.open).toBe(false)
  })
})

describe('SettingsDialog — inSessionView picker disable threading', () => {
  it('renders all four picker stub texts when open=true with inSessionView=true (Landmine 7)', () => {
    renderDialog({ open: true, inSessionView: true })
    // All four pickers render with disabled styling — assert text is present
    // (picker components self-render their labels; disabled={true} only changes text color)
    expect(screen.getByText('Theme: system')).toBeInTheDocument()
    expect(screen.getByText('Variant: orb')).toBeInTheDocument()
    expect(screen.getByText('Timbre: bowl')).toBeInTheDocument()
    expect(screen.getByText('Language: en')).toBeInTheDocument()
  })
})
