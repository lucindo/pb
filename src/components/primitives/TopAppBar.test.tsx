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
