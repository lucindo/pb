import '@testing-library/jest-dom/vitest'
import { fireEvent, render, screen } from '@testing-library/react'
import { describe, expect, it, vi } from 'vitest'

import { IconButton } from './IconButton'

describe('IconButton', () => {
  it('renders the icon and exposes the aria-label', () => {
    render(<IconButton icon={<span data-testid="glyph">●</span>} label="Open" />)
    expect(screen.getByRole('button', { name: 'Open' })).toBeInTheDocument()
    expect(screen.getByTestId('glyph')).toBeInTheDocument()
  })

  it('fires onClick when clicked', () => {
    const onClick = vi.fn()
    render(<IconButton icon="●" label="Open" onClick={onClick} />)
    fireEvent.click(screen.getByRole('button', { name: 'Open' }))
    expect(onClick).toHaveBeenCalledOnce()
  })

  it('renders without error across every size variant', () => {
    for (const size of ['sm', 'md'] as const) {
      render(<IconButton icon="●" label={`size-${size}`} size={size} />)
    }
    expect(screen.getByRole('button', { name: 'size-sm' })).toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'size-md' })).toBeInTheDocument()
  })

  it('honors disabled and suppresses onClick', () => {
    const onClick = vi.fn()
    render(<IconButton icon="●" label="Open" onClick={onClick} disabled />)
    const button = screen.getByRole('button', { name: 'Open' })
    expect(button).toBeDisabled()
    fireEvent.click(button)
    expect(onClick).not.toHaveBeenCalled()
  })
})
