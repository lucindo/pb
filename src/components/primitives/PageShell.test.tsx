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

  it('section is nested inside a main element', () => {
    render(
      <PageShell>
        <p>centered</p>
      </PageShell>,
    )
    const section = screen.getByText('centered').closest('section')
    expect(section?.parentElement?.tagName.toLowerCase()).toBe('main')
  })

  it('renders overlays as siblings of the section inside main', () => {
    render(
      <PageShell overlays={<div>overlay</div>}>
        <p>centered</p>
      </PageShell>,
    )
    const overlay = screen.getByText('overlay')
    const section = screen.getByText('centered').closest('section')
    expect(overlay.parentElement?.tagName.toLowerCase()).toBe('main')
    expect(section?.parentElement?.tagName.toLowerCase()).toBe('main')
  })

  it('omits the overlays sibling when no overlays prop is provided', () => {
    const { container } = render(<PageShell>x</PageShell>)
    const main = container.querySelector('main')
    expect(main?.children.length).toBe(1)
  })
})
