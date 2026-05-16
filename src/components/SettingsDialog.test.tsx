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
import { UI_STRINGS } from '../content/strings'

const EN_STRINGS_FIXTURE = UI_STRINGS.en

function renderDialog(
  props: Partial<{ open: boolean; onClose: () => void; inSessionView: boolean }> = {},
) {
  const onClose = props.onClose ?? vi.fn()
  const utils = render(
    <SettingsDialog
      open={props.open ?? false}
      onClose={onClose}
      inSessionView={props.inSessionView ?? false}
      strings={EN_STRINGS_FIXTURE}
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
    rerender(<SettingsDialog open={false} onClose={vi.fn()} inSessionView={false} strings={EN_STRINGS_FIXTURE} />)
    expect(dialog.open).toBe(false)
  })
})

describe('SettingsDialog — inSessionView picker disable threading (Phase 25: 5 pickers)', () => {
  it('renders all five pickers when open=true with inSessionView=true (Landmine 7)', () => {
    renderDialog({ open: true, inSessionView: true })
    // Phase 16: ThemePicker is now a real radiogroup; assert section label.
    expect(screen.getByText('Theme')).toBeInTheDocument()
    // Phase 17: VariantPicker is now a real radiogroup.
    expect(screen.getByText('Variant')).toBeInTheDocument()
    // Phase 25 (Plan 04): CuePicker is wired — assert "Cue style" section label.
    expect(screen.getByText('Cue style')).toBeInTheDocument()
    // Phase 18: TimbrePicker section label.
    expect(screen.getByText('Timbre')).toBeInTheDocument()
    // Phase 19: LanguagePicker section label.
    expect(screen.getByText('Language')).toBeInTheDocument()
    // D-11 (updated): Theme → Variant → Cue → Timbre → Language — all 5 radiogroups disabled.
    const radiogroups = screen.getAllByRole('radiogroup')
    expect(radiogroups).toHaveLength(5)
    for (const rg of radiogroups) {
      expect(rg).toHaveAttribute('aria-disabled', 'true')
    }
  })

  it('CuePicker is disabled when inSessionView=true (T-25-08 mitigation)', () => {
    renderDialog({ open: true, inSessionView: true })
    // The CuePicker radiogroup is aria-disabled; all its buttons are disabled
    const radiogroups = screen.getAllByRole('radiogroup')
    // CuePicker is the 3rd radiogroup (Theme=0, Variant=1, Cue=2, Timbre=3, Language=4)
    const cueRadiogroup = radiogroups[2]
    expect(cueRadiogroup).toHaveAttribute('aria-disabled', 'true')
    // All radio buttons within should be disabled
    const cueRadios = Array.from(cueRadiogroup?.querySelectorAll('[role="radio"]') ?? [])
    expect(cueRadios).toHaveLength(3)
    for (const radio of cueRadios) {
      expect(radio).toBeDisabled()
    }
  })

  it('CuePicker is enabled (not disabled) when inSessionView=false', () => {
    renderDialog({ open: true, inSessionView: false })
    const radiogroups = screen.getAllByRole('radiogroup')
    // CuePicker is the 3rd radiogroup (index 2)
    const cueRadiogroup = radiogroups[2]
    // NOTE (WR-04): CuePicker sets aria-disabled={disabled} with a raw boolean.
    // React special-cases aria-* attributes and serializes `false` to the string
    // "false" (the attribute is NOT dropped). This literal-"false" serialization
    // is load-bearing for the assertion below — if CuePicker is ever refactored
    // to aria-disabled={disabled || undefined} (a common a11y lint suggestion),
    // the attribute would be omitted and this assertion would need to flip to
    // `not.toHaveAttribute('aria-disabled', 'true')`.
    expect(cueRadiogroup).toHaveAttribute('aria-disabled', 'false')
  })
})
