import '@testing-library/jest-dom/vitest'
import { render, screen } from '@testing-library/react'
import { describe, expect, it } from 'vitest'

import { Eyebrow } from './Eyebrow'

describe('Eyebrow', () => {
  it('renders its children as text', () => {
    render(<Eyebrow>ABOUT</Eyebrow>)
    expect(screen.getByText('ABOUT')).toBeInTheDocument()
  })

  it('applies uppercase + tracked typography classes', () => {
    const { container } = render(<Eyebrow>x</Eyebrow>)
    expect(container.firstChild).toHaveClass('uppercase')
    expect(container.firstChild).toHaveClass('tracking-[0.16em]')
  })

  it('forwards a custom className', () => {
    const { container } = render(<Eyebrow className="extra">x</Eyebrow>)
    expect(container.firstChild).toHaveClass('extra')
  })
})
