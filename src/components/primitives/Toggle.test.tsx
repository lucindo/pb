import '@testing-library/jest-dom/vitest'
import { fireEvent, render, screen } from '@testing-library/react'
import { describe, expect, it, vi } from 'vitest'

import { Toggle } from './Toggle'

describe('Toggle', () => {
  it('renders as a switch with the provided aria-label', () => {
    render(<Toggle checked={false} onChange={vi.fn()} label="Subtle haptics" />)
    expect(screen.getByRole('switch', { name: 'Subtle haptics' })).toBeInTheDocument()
  })

  it('exposes aria-checked=true when checked', () => {
    render(<Toggle checked onChange={vi.fn()} label="Haptics" />)
    expect(screen.getByRole('switch', { name: 'Haptics' })).toHaveAttribute(
      'aria-checked',
      'true',
    )
  })

  it('exposes aria-checked=false when unchecked', () => {
    render(<Toggle checked={false} onChange={vi.fn()} label="Haptics" />)
    expect(screen.getByRole('switch', { name: 'Haptics' })).toHaveAttribute(
      'aria-checked',
      'false',
    )
  })

  it('fires onChange with the next value when clicked', () => {
    const onChange = vi.fn()
    render(<Toggle checked={false} onChange={onChange} label="Haptics" />)
    fireEvent.click(screen.getByRole('switch', { name: 'Haptics' }))
    expect(onChange).toHaveBeenCalledWith(true)
  })

  it('does not fire onChange when disabled', () => {
    const onChange = vi.fn()
    render(<Toggle checked={false} onChange={onChange} label="Haptics" disabled />)
    fireEvent.click(screen.getByRole('switch', { name: 'Haptics' }))
    expect(onChange).not.toHaveBeenCalled()
  })
})
