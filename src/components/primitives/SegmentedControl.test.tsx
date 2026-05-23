import '@testing-library/jest-dom/vitest'
import { fireEvent, render, screen } from '@testing-library/react'
import { describe, expect, it, vi } from 'vitest'

import { SegmentedControl } from './SegmentedControl'

const OPTIONS = [
  { id: 'light', label: 'Light' },
  { id: 'dark', label: 'Dark' },
  { id: 'system', label: 'System' },
] as const

describe('SegmentedControl', () => {
  it('renders all options as radio buttons', () => {
    render(
      <SegmentedControl options={OPTIONS} value="light" onChange={vi.fn()} ariaLabel="Theme" />,
    )
    expect(screen.getByRole('radio', { name: 'Light' })).toBeInTheDocument()
    expect(screen.getByRole('radio', { name: 'Dark' })).toBeInTheDocument()
    expect(screen.getByRole('radio', { name: 'System' })).toBeInTheDocument()
  })

  it('exposes the group aria-label', () => {
    render(
      <SegmentedControl options={OPTIONS} value="light" onChange={vi.fn()} ariaLabel="Theme" />,
    )
    expect(screen.getByRole('radiogroup', { name: 'Theme' })).toBeInTheDocument()
  })

  it('marks the active option with aria-checked=true and others false', () => {
    render(
      <SegmentedControl options={OPTIONS} value="dark" onChange={vi.fn()} ariaLabel="Theme" />,
    )
    expect(screen.getByRole('radio', { name: 'Light' })).toHaveAttribute('aria-checked', 'false')
    expect(screen.getByRole('radio', { name: 'Dark' })).toHaveAttribute('aria-checked', 'true')
    expect(screen.getByRole('radio', { name: 'System' })).toHaveAttribute('aria-checked', 'false')
  })

  it('fires onChange with the clicked option id', () => {
    const onChange = vi.fn()
    render(
      <SegmentedControl options={OPTIONS} value="light" onChange={onChange} ariaLabel="Theme" />,
    )
    fireEvent.click(screen.getByRole('radio', { name: 'Dark' }))
    expect(onChange).toHaveBeenCalledWith('dark')
  })
})
