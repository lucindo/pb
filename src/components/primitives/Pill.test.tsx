import '@testing-library/jest-dom/vitest'
import { fireEvent, render, screen } from '@testing-library/react'
import { describe, expect, it, vi } from 'vitest'

import { Pill } from './Pill'

describe('Pill', () => {
  it('renders its children', () => {
    render(<Pill>Start</Pill>)
    expect(screen.getByRole('button', { name: 'Start' })).toBeInTheDocument()
  })

  it('uses the filled treatment by default', () => {
    render(<Pill>Start</Pill>)
    expect(screen.getByRole('button', { name: 'Start' })).toHaveClass(
      'bg-[var(--color-breathing-accent-strong)]',
    )
  })

  it('uses the outlined treatment when variant=outlined and inactive', () => {
    render(<Pill variant="outlined">Skip</Pill>)
    expect(screen.getByRole('button', { name: 'Skip' })).toHaveClass(
      'bg-[var(--color-breathing-surface)]',
    )
  })

  it('forces filled treatment when active=true even with variant=outlined', () => {
    render(
      <Pill variant="outlined" active>
        Selected
      </Pill>,
    )
    expect(screen.getByRole('button', { name: 'Selected' })).toHaveClass(
      'bg-[var(--color-breathing-accent-strong)]',
    )
  })

  it('exposes aria-pressed when active', () => {
    render(<Pill active>Selected</Pill>)
    expect(screen.getByRole('button', { name: 'Selected' })).toHaveAttribute(
      'aria-pressed',
      'true',
    )
  })

  it('fires onClick when clicked', () => {
    const onClick = vi.fn()
    render(<Pill onClick={onClick}>Go</Pill>)
    fireEvent.click(screen.getByRole('button', { name: 'Go' }))
    expect(onClick).toHaveBeenCalledOnce()
  })
})
