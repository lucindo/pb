import '@testing-library/jest-dom/vitest'
import { fireEvent, render, screen } from '@testing-library/react'
import { describe, expect, it, vi } from 'vitest'

import { Pill } from './Pill'

describe('Pill', () => {
  it('renders its children inside a button', () => {
    render(<Pill>Start</Pill>)
    expect(screen.getByRole('button', { name: 'Start' })).toBeInTheDocument()
  })

  it('exposes aria-pressed=true when active', () => {
    render(<Pill active>Selected</Pill>)
    expect(screen.getByRole('button', { name: 'Selected' })).toHaveAttribute(
      'aria-pressed',
      'true',
    )
  })

  it('omits aria-pressed when not active', () => {
    render(<Pill>Inactive</Pill>)
    expect(screen.getByRole('button', { name: 'Inactive' })).not.toHaveAttribute(
      'aria-pressed',
    )
  })

  it('renders without error across every variant combination', () => {
    for (const variant of ['filled', 'outlined'] as const) {
      for (const active of [false, true]) {
        render(<Pill variant={variant} active={active}>{`${variant}-${String(active)}`}</Pill>)
      }
    }
    expect(screen.getByRole('button', { name: 'filled-false' })).toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'filled-true' })).toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'outlined-false' })).toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'outlined-true' })).toBeInTheDocument()
  })

  it('fires onClick when clicked', () => {
    const onClick = vi.fn()
    render(<Pill onClick={onClick}>Go</Pill>)
    fireEvent.click(screen.getByRole('button', { name: 'Go' }))
    expect(onClick).toHaveBeenCalledOnce()
  })

  it('honors disabled and suppresses onClick', () => {
    const onClick = vi.fn()
    render(<Pill onClick={onClick} disabled>Off</Pill>)
    const button = screen.getByRole('button', { name: 'Off' })
    expect(button).toBeDisabled()
    fireEvent.click(button)
    expect(onClick).not.toHaveBeenCalled()
  })
})
