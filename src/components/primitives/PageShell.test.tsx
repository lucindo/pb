import '@testing-library/jest-dom/vitest'
import { render, screen } from '@testing-library/react'
import { describe, expect, it } from 'vitest'

import { PageShell } from './PageShell'

describe('PageShell', () => {
  it('renders its children inside a section', () => {
    render(
      <PageShell>
        <p>centered</p>
      </PageShell>,
    )
    const paragraph = screen.getByText('centered')
    expect(paragraph.closest('section')).not.toBeNull()
  })

  it('renders overlays as siblings of the section inside main', () => {
    render(
      <PageShell overlays={<div>overlay</div>}>
        <p>centered</p>
      </PageShell>,
    )
    const overlay = screen.getByText('overlay')
    const section = screen.getByText('centered').closest('section')
    expect(section).not.toBeNull()
    expect(overlay.tagName.toLowerCase()).toBe('div')
    expect(overlay.parentElement?.tagName.toLowerCase()).toBe('main')
    expect(section?.parentElement?.tagName.toLowerCase()).toBe('main')
  })

  it('applies the radial-gradient page background on the main element', () => {
    const { container } = render(<PageShell>x</PageShell>)
    const main = container.querySelector('main')
    expect(main).not.toBeNull()
    expect(main).toHaveClass('min-h-screen')
    expect(main?.className).toContain('bg-[radial-gradient')
  })

  it('caps the centered section at max-w-3xl', () => {
    const { container } = render(<PageShell>x</PageShell>)
    const section = container.querySelector('section')
    expect(section).toHaveClass('max-w-3xl')
    expect(section).toHaveClass('mx-auto')
    expect(section).toHaveClass('flex-col')
    expect(section).toHaveClass('items-center')
  })

  it('omits the overlays sibling when no overlays prop is provided', () => {
    const { container } = render(<PageShell>x</PageShell>)
    const main = container.querySelector('main')
    expect(main?.children.length).toBe(1)
  })
})
