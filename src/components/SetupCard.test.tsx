import '@testing-library/jest-dom/vitest'
import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { describe, expect, it, vi } from 'vitest'

import { SetupCard, type SetupCardItem } from './SetupCard'

const PATTERN_BREATHING_ITEMS: readonly SetupCardItem[] = [
  { id: 'pace', label: 'PACE', value: '5.5 bpm' },
  { id: 'ratio', label: 'RATIO', value: '1 : 1' },
  { id: 'duration', label: 'DURATION', value: '5 min' },
]

const STRETCH_ITEMS: readonly SetupCardItem[] = [
  { id: 'pace', label: 'PACE', value: '5.5 bpm' },
  { id: 'ratio', label: 'RATIO', value: '1 : 1' },
  { id: 'stretches', label: 'STRETCHES', value: '5' },
  { id: 'breaths', label: 'BREATHS', value: '4 each' },
  { id: 'rounds', label: 'ROUNDS', value: '3' },
  { id: 'duration', label: 'DURATION', value: '10 min' },
]

describe('SetupCard', () => {
  it('renders as a button with the supplied aria-label', () => {
    render(
      <SetupCard items={PATTERN_BREATHING_ITEMS} onTap={() => {}} ariaLabel="Edit Pattern Breathing settings" />,
    )
    expect(screen.getByRole('button', { name: 'Edit Pattern Breathing settings' })).toBeVisible()
  })

  it('renders all label/value pairs for the 3-item (Pattern Breathing/Navi) shape', () => {
    render(
      <SetupCard items={PATTERN_BREATHING_ITEMS} onTap={() => {}} ariaLabel="Edit Pattern Breathing settings" />,
    )
    for (const it of PATTERN_BREATHING_ITEMS) {
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
    render(<SetupCard items={PATTERN_BREATHING_ITEMS} onTap={onTap} ariaLabel="Edit Pattern Breathing settings" />)
    await user.click(screen.getByRole('button', { name: 'Edit Pattern Breathing settings' }))
    expect(onTap).toHaveBeenCalledTimes(1)
  })

  it('disables the button (and suppresses onTap) when disabled prop is true', async () => {
    const user = userEvent.setup()
    const onTap = vi.fn()
    render(
      <SetupCard items={PATTERN_BREATHING_ITEMS} onTap={onTap} ariaLabel="Edit Pattern Breathing settings" disabled />,
    )
    const button = screen.getByRole('button', { name: 'Edit Pattern Breathing settings' })
    expect(button).toBeDisabled()
    await user.click(button)
    expect(onTap).not.toHaveBeenCalled()
  })

  it('includes a decorative chevron SVG (aria-hidden)', () => {
    const { container } = render(
      <SetupCard items={PATTERN_BREATHING_ITEMS} onTap={() => {}} ariaLabel="Edit Pattern Breathing settings" />,
    )
    const chevron = container.querySelector('svg[aria-hidden="true"]')
    expect(chevron).not.toBeNull()
  })
})
