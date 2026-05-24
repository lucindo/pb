import '@testing-library/jest-dom/vitest'
import { render, screen } from '@testing-library/react'
import { describe, expect, it } from 'vitest'

import { TopAppBar } from './TopAppBar'

describe('TopAppBar', () => {
  it('renders the title as an h1', () => {
    render(<TopAppBar title="Practice" />)
    const heading = screen.getByRole('heading', { level: 1 })
    expect(heading).toHaveTextContent('Practice')
  })

  it('renders the eyebrow when provided', () => {
    render(<TopAppBar title="Practice" eyebrow="BREATH" />)
    expect(screen.getByText('BREATH')).toBeInTheDocument()
  })

  it('omits the eyebrow paragraph when not provided', () => {
    const { container } = render(<TopAppBar title="Practice" />)
    expect(container.querySelectorAll('p').length).toBe(0)
  })

  it('renders the leading slot content', () => {
    render(
      <TopAppBar
        title="Practice"
        leading={<button type="button">left</button>}
      />,
    )
    expect(screen.getByRole('button', { name: 'left' })).toBeInTheDocument()
  })

  it('renders the trailing slot content', () => {
    render(
      <TopAppBar
        title="Practice"
        trailing={<button type="button">right</button>}
      />,
    )
    expect(screen.getByRole('button', { name: 'right' })).toBeInTheDocument()
  })
})
