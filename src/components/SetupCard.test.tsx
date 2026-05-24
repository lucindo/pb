import '@testing-library/jest-dom/vitest'
import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { describe, expect, it, vi } from 'vitest'

import { SetupCard, type SetupCardItem } from './SetupCard'

const HRV_ITEMS: readonly SetupCardItem[] = [
  { label: 'PACE', value: '5.5 bpm' },
  { label: 'RATIO', value: '1 : 1' },
  { label: 'DURATION', value: '5 min' },
]

const STRETCH_ITEMS: readonly SetupCardItem[] = [
  { label: 'PACE', value: '5.5 bpm' },
  { label: 'RATIO', value: '1 : 1' },
  { label: 'STRETCHES', value: '5' },
  { label: 'BREATHS', value: '4 each' },
  { label: 'ROUNDS', value: '3' },
  { label: 'DURATION', value: '10 min' },
]

describe('SetupCard', () => {
  it('renders as a button with the supplied aria-label', () => {
    render(
      <SetupCard items={HRV_ITEMS} onTap={() => {}} ariaLabel="Edit HRV settings" />,
    )
    expect(screen.getByRole('button', { name: 'Edit HRV settings' })).toBeVisible()
  })

  it('renders all label/value pairs for the 3-item (HRV/Navi) shape', () => {
    render(
      <SetupCard items={HRV_ITEMS} onTap={() => {}} ariaLabel="Edit HRV settings" />,
    )
    for (const it of HRV_ITEMS) {
      expect(screen.getByText(it.label)).toBeInTheDocument()
      expect(screen.getByText(it.value)).toBeInTheDocument()
    }
  })

  it('renders all 6 label/value pairs for the Stretch shape', () => {
    render(
      <SetupCard items={STRETCH_ITEMS} onTap={() => {}} ariaLabel="Edit Stretch settings" />,
    )
    for (const it of STRETCH_ITEMS) {
      expect(screen.getByText(it.label)).toBeInTheDocument()
      expect(screen.getByText(it.value)).toBeInTheDocument()
    }
  })

  it('fires onTap when clicked', async () => {
    const user = userEvent.setup()
    const onTap = vi.fn()
    render(<SetupCard items={HRV_ITEMS} onTap={onTap} ariaLabel="Edit HRV settings" />)
    await user.click(screen.getByRole('button', { name: 'Edit HRV settings' }))
    expect(onTap).toHaveBeenCalledTimes(1)
  })

  it('disables the button (and suppresses onTap) when disabled prop is true', async () => {
    const user = userEvent.setup()
    const onTap = vi.fn()
    render(
      <SetupCard items={HRV_ITEMS} onTap={onTap} ariaLabel="Edit HRV settings" disabled />,
    )
    const button = screen.getByRole('button', { name: 'Edit HRV settings' })
    expect(button).toBeDisabled()
    await user.click(button)
    expect(onTap).not.toHaveBeenCalled()
  })

  it('includes a decorative chevron SVG (aria-hidden)', () => {
    const { container } = render(
      <SetupCard items={HRV_ITEMS} onTap={() => {}} ariaLabel="Edit HRV settings" />,
    )
    const chevron = container.querySelector('svg[aria-hidden="true"]')
    expect(chevron).not.toBeNull()
  })
})
