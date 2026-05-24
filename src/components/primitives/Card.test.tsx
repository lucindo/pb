import '@testing-library/jest-dom/vitest'
import { render, screen } from '@testing-library/react'
import { describe, expect, it } from 'vitest'

import { Card } from './Card'

describe('Card', () => {
  it('renders its children', () => {
    render(<Card>hello</Card>)
    expect(screen.getByText('hello')).toBeInTheDocument()
  })

  it('forwards a custom className to the outer element', () => {
    const { container } = render(<Card className="extra-class">x</Card>)
    expect(container.firstChild).toHaveClass('extra-class')
  })

  it('renders without error across every padding variant', () => {
    for (const padding of ['none', 'sm', 'md', 'lg'] as const) {
      render(<Card padding={padding}>x</Card>)
    }
    expect(screen.getAllByText('x')).toHaveLength(4)
  })

  it('renders without error across every elevation variant', () => {
    for (const elevation of ['none', 'card', 'modal'] as const) {
      render(<Card elevation={elevation}>y</Card>)
    }
    expect(screen.getAllByText('y')).toHaveLength(3)
  })
})
