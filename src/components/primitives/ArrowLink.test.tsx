import '@testing-library/jest-dom/vitest'
import { fireEvent, render, screen } from '@testing-library/react'
import { describe, expect, it, vi } from 'vitest'

import { ArrowLink } from './ArrowLink'

describe('ArrowLink', () => {
  it('renders as an anchor when href is provided', () => {
    render(<ArrowLink href="https://example.com">Watch the video</ArrowLink>)
    const link = screen.getByRole('link', { name: /Watch the video/ })
    expect(link).toBeInTheDocument()
    expect(link).toHaveAttribute('href', 'https://example.com')
  })

  it('renders as a button when href is not provided', () => {
    const onClick = vi.fn()
    render(<ArrowLink onClick={onClick}>Open</ArrowLink>)
    expect(screen.getByRole('button', { name: /Open/ })).toBeInTheDocument()
  })

  it('fires onClick on the button variant', () => {
    const onClick = vi.fn()
    render(<ArrowLink onClick={onClick}>Open</ArrowLink>)
    fireEvent.click(screen.getByRole('button', { name: /Open/ }))
    expect(onClick).toHaveBeenCalledOnce()
  })

  it('renders the trailing arrow glyph as a decorative svg', () => {
    const { container } = render(<ArrowLink onClick={vi.fn()}>Open</ArrowLink>)
    expect(container.querySelector('svg[aria-hidden="true"]')).toBeInTheDocument()
  })

  it('forwards a custom className', () => {
    render(
      <ArrowLink onClick={vi.fn()} className="extra">
        Open
      </ArrowLink>,
    )
    expect(screen.getByRole('button', { name: /Open/ })).toHaveClass('extra')
  })
})
