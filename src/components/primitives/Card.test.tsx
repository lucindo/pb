import '@testing-library/jest-dom/vitest'
import { render, screen } from '@testing-library/react'
import { describe, expect, it } from 'vitest'

import { Card } from './Card'

describe('Card', () => {
  it('renders its children', () => {
    render(<Card>hello</Card>)
    expect(screen.getByText('hello')).toBeInTheDocument()
  })

  it('applies the medium padding class by default', () => {
    const { container } = render(<Card>x</Card>)
    expect(container.firstChild).toHaveClass('p-6')
  })

  it('applies the requested padding size', () => {
    const { container } = render(<Card padding="lg">x</Card>)
    expect(container.firstChild).toHaveClass('p-8')
  })

  it('applies the card elevation shadow token by default', () => {
    const { container } = render(<Card>x</Card>)
    expect(container.firstChild).toHaveClass('shadow-[var(--shadow-card)]')
  })

  it('applies the modal elevation shadow when requested', () => {
    const { container } = render(<Card elevation="modal">x</Card>)
    expect(container.firstChild).toHaveClass('shadow-[var(--shadow-modal)]')
  })

  it('forwards a custom className to the outer element', () => {
    const { container } = render(<Card className="extra-class">x</Card>)
    expect(container.firstChild).toHaveClass('extra-class')
  })
})
