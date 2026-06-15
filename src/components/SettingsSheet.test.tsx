import '@testing-library/jest-dom/vitest'
import { fireEvent, render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { describe, expect, it, vi } from 'vitest'

import { SettingsSheet } from './SettingsSheet'

function renderSheet(
  overrides: Partial<{
    open: boolean
    onClose: () => void
    title: string
    subtitle?: string
    closeLabel: string
    children: React.ReactNode
  }> = {},
) {
  const onClose = overrides.onClose ?? vi.fn()
  const utils = render(
    <SettingsSheet
      open={overrides.open ?? true}
      onClose={onClose}
      title={overrides.title ?? 'Practice'}
      subtitle={overrides.subtitle}
      closeLabel={overrides.closeLabel ?? 'Close'}
    >
      {overrides.children ?? <p>body content</p>}
    </SettingsSheet>,
  )
  return { ...utils, onClose }
}

describe('SettingsSheet', () => {
  it('opens the native <dialog> when open=true', () => {
    const { container } = renderSheet({ open: true })
    const dialog = container.querySelector('dialog')
    expect(dialog).not.toBeNull()
    // eslint-disable-next-line @typescript-eslint/no-non-null-assertion
    expect(dialog!.open).toBe(true)
  })

  it('does not open the dialog when open=false', () => {
    const { container } = renderSheet({ open: false })
    const dialog = container.querySelector('dialog')
    expect(dialog).not.toBeNull()
    // eslint-disable-next-line @typescript-eslint/no-non-null-assertion
    expect(dialog!.open).toBe(false)
  })

  it('renders the title and links it via aria-labelledby', () => {
    const { container } = renderSheet({ title: 'Practice settings' })
    const heading = screen.getByText('Practice settings')
    const dialog = container.querySelector('dialog')
    expect(heading.tagName.toLowerCase()).toBe('h2')
    // eslint-disable-next-line @typescript-eslint/no-non-null-assertion
    expect(dialog!.getAttribute('aria-labelledby')).toBe(heading.id)
  })

  it('renders the subtitle when provided', () => {
    renderSheet({ subtitle: 'Pattern Breathing' })
    expect(screen.getByText('Pattern Breathing')).toBeVisible()
  })

  it('omits the subtitle when not provided', () => {
    renderSheet()
    expect(screen.queryByText('Pattern Breathing')).toBeNull()
  })

  it('renders children inside the dialog body', () => {
    renderSheet({ children: <div>custom body</div> })
    expect(screen.getByText('custom body')).toBeVisible()
  })

  it('close button shows the supplied closeLabel and fires onClose when clicked', async () => {
    const user = userEvent.setup()
    const { onClose } = renderSheet({ closeLabel: 'Done' })
    const closeButton = screen.getByRole('button', { name: 'Done' })
    await user.click(closeButton)
    expect(onClose).toHaveBeenCalledTimes(1)
  })

  it('clicking the dialog backdrop (target === dialog) fires onClose', () => {
    const { onClose, container } = renderSheet()
    // eslint-disable-next-line @typescript-eslint/no-non-null-assertion
    const dialog = container.querySelector('dialog')!
    fireEvent.click(dialog, { target: dialog })
    expect(onClose).toHaveBeenCalledTimes(1)
  })

  it('Esc (dialog cancel event) fires onClose via useModalDialog', () => {
    const { onClose, container } = renderSheet()
    // eslint-disable-next-line @typescript-eslint/no-non-null-assertion
    const dialog = container.querySelector('dialog')!
    fireEvent(dialog, new Event('cancel', { cancelable: true }))
    expect(onClose).toHaveBeenCalledTimes(1)
  })
})
