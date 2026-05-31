// CueGlyph.test.tsx — covers all 3 cue modes × 2 phases
import '@testing-library/jest-dom/vitest'
import { render, screen } from '@testing-library/react'
import { describe, expect, it } from 'vitest'

import { CueGlyph } from './CueGlyph'

// ── labels mode ──────────────────────────────────────────────────────────────

describe('CueGlyph — labels mode', () => {
  it('renders the phaseLabel text for phase "in"', () => {
    render(<CueGlyph cue="labels" phase="in" phaseLabel="In" />)
    expect(screen.getByText('In')).toBeVisible()
  })

  it('renders the phaseLabel text for phase "out"', () => {
    render(<CueGlyph cue="labels" phase="out" phaseLabel="Out" />)
    expect(screen.getByText('Out')).toBeVisible()
  })

  it('does NOT render an SVG in labels mode', () => {
    const { container } = render(<CueGlyph cue="labels" phase="in" phaseLabel="In" />)
    expect(container.querySelector('svg')).toBeNull()
  })
})

// ── arrow mode ───────────────────────────────────────────────────────────────

describe('CueGlyph — arrow mode (candidate F)', () => {
  it('renders an SVG for phase "in"', () => {
    const { container } = render(<CueGlyph cue="arrow" phase="in" phaseLabel="In" />)
    expect(container.querySelector('svg')).not.toBeNull()
  })

  it('renders an SVG for phase "out"', () => {
    const { container } = render(<CueGlyph cue="arrow" phase="out" phaseLabel="Out" />)
    expect(container.querySelector('svg')).not.toBeNull()
  })

  it('SVG is aria-hidden="true" for phase "in"', () => {
    const { container } = render(<CueGlyph cue="arrow" phase="in" phaseLabel="In" />)
    const svg = container.querySelector('svg')
    expect(svg).not.toBeNull()
    // eslint-disable-next-line @typescript-eslint/no-non-null-assertion
    expect(svg!.getAttribute('aria-hidden')).toBe('true')
  })

  it('SVG is aria-hidden="true" for phase "out"', () => {
    const { container } = render(<CueGlyph cue="arrow" phase="out" phaseLabel="Out" />)
    const svg = container.querySelector('svg')
    expect(svg).not.toBeNull()
    // eslint-disable-next-line @typescript-eslint/no-non-null-assertion
    expect(svg!.getAttribute('aria-hidden')).toBe('true')
  })

  it('keeps the phaseLabel in the DOM for screen reader parity in phase "in"', () => {
    render(<CueGlyph cue="arrow" phase="in" phaseLabel="In" />)
    expect(screen.getByText('In')).toBeInTheDocument()
  })

  it('keeps the phaseLabel in the DOM for screen reader parity in phase "out"', () => {
    render(<CueGlyph cue="arrow" phase="out" phaseLabel="Out" />)
    expect(screen.getByText('Out')).toBeInTheDocument()
  })

})

// ── nose mode ────────────────────────────────────────────────────────────────

describe('CueGlyph — nose mode (candidate D2)', () => {
  it('renders an SVG for phase "in"', () => {
    const { container } = render(<CueGlyph cue="nose" phase="in" phaseLabel="In" />)
    expect(container.querySelector('svg')).not.toBeNull()
  })

  it('renders an SVG for phase "out"', () => {
    const { container } = render(<CueGlyph cue="nose" phase="out" phaseLabel="Out" />)
    expect(container.querySelector('svg')).not.toBeNull()
  })

  it('SVG is aria-hidden="true" for phase "in"', () => {
    const { container } = render(<CueGlyph cue="nose" phase="in" phaseLabel="In" />)
    const svg = container.querySelector('svg')
    expect(svg).not.toBeNull()
    // eslint-disable-next-line @typescript-eslint/no-non-null-assertion
    expect(svg!.getAttribute('aria-hidden')).toBe('true')
  })

  it('SVG is aria-hidden="true" for phase "out"', () => {
    const { container } = render(<CueGlyph cue="nose" phase="out" phaseLabel="Out" />)
    const svg = container.querySelector('svg')
    expect(svg).not.toBeNull()
    // eslint-disable-next-line @typescript-eslint/no-non-null-assertion
    expect(svg!.getAttribute('aria-hidden')).toBe('true')
  })

  it('keeps the phaseLabel in the DOM for screen reader parity in phase "in"', () => {
    render(<CueGlyph cue="nose" phase="in" phaseLabel="In" />)
    expect(screen.getByText('In')).toBeInTheDocument()
  })

  it('keeps the phaseLabel in the DOM for screen reader parity in phase "out"', () => {
    render(<CueGlyph cue="nose" phase="out" phaseLabel="Out" />)
    expect(screen.getByText('Out')).toBeInTheDocument()
  })

})

// ── preview mode (picker swatch) ─────────────────────────────────────────────

describe('CueGlyph — preview mode', () => {
  it('labels preview defaults to phaseLabel.charAt(0) when previewLabel not supplied', () => {
    render(<CueGlyph cue="labels" phase="in" phaseLabel="Text" preview />)
    expect(screen.getByText('T')).toBeInTheDocument()
    expect(screen.queryByText('Text')).not.toBeInTheDocument()
  })

  it('IN-05: labels preview honours an explicit previewLabel override', () => {
    render(<CueGlyph cue="labels" phase="in" phaseLabel="In" previewLabel="A" preview />)
    expect(screen.getByText('A')).toBeInTheDocument()
  })

  it('non-preview labels mode still renders the full phase word (in-orb unchanged)', () => {
    render(<CueGlyph cue="labels" phase="in" phaseLabel="In" />)
    expect(screen.getByText('In')).toBeInTheDocument()
  })
})
