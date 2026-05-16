// CueGlyph.test.tsx — covers all 3 cue modes × 2 phases (CUE-03, D-03..D-09)
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

  it('renders the exact phase-label span classes (zero-regression — must match OrbShape lines 122-133)', () => {
    const { container } = render(<CueGlyph cue="labels" phase="in" phaseLabel="In" />)
    const span = container.querySelector('span')
    expect(span).not.toBeNull()
    // Reason: span non-null asserted by expect().not.toBeNull() immediately above.
    // eslint-disable-next-line @typescript-eslint/no-non-null-assertion
    expect(span!.className).toContain('relative')
    // eslint-disable-next-line @typescript-eslint/no-non-null-assertion
    expect(span!.className).toContain('z-10')
    // eslint-disable-next-line @typescript-eslint/no-non-null-assertion
    expect(span!.className).toContain('text-5xl')
    // eslint-disable-next-line @typescript-eslint/no-non-null-assertion
    expect(span!.className).toContain('font-semibold')
    // eslint-disable-next-line @typescript-eslint/no-non-null-assertion
    expect(span!.className).toContain('tracking-tight')
  })

  it('applies var(--color-orb-in-text) for phase "in" (token color)', () => {
    const { container } = render(<CueGlyph cue="labels" phase="in" phaseLabel="In" />)
    const span = container.querySelector('span')
    expect(span).not.toBeNull()
    // eslint-disable-next-line @typescript-eslint/no-non-null-assertion
    const style = span!.getAttribute('style') ?? ''
    expect(style).toContain('var(--color-orb-in-text)')
  })

  it('applies var(--color-orb-out-text) for phase "out" (token color)', () => {
    const { container } = render(<CueGlyph cue="labels" phase="out" phaseLabel="Out" />)
    const span = container.querySelector('span')
    expect(span).not.toBeNull()
    // eslint-disable-next-line @typescript-eslint/no-non-null-assertion
    const style = span!.getAttribute('style') ?? ''
    expect(style).toContain('var(--color-orb-out-text)')
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

  it('renders a visually-hidden sr-only span with phaseLabel for phase "in" (CUE-03)', () => {
    render(<CueGlyph cue="arrow" phase="in" phaseLabel="In" />)
    const srSpan = screen.getByText('In')
    expect(srSpan).toBeInTheDocument()
    expect(srSpan.className).toContain('sr-only')
  })

  it('renders a visually-hidden sr-only span with phaseLabel for phase "out" (CUE-03)', () => {
    render(<CueGlyph cue="arrow" phase="out" phaseLabel="Out" />)
    const srSpan = screen.getByText('Out')
    expect(srSpan).toBeInTheDocument()
    expect(srSpan.className).toContain('sr-only')
  })

  it('arrow "in" uses var(--color-orb-in-text) via currentColor (no hardcoded hex)', () => {
    const { container } = render(<CueGlyph cue="arrow" phase="in" phaseLabel="In" />)
    const wrapper = container.querySelector('span')
    expect(wrapper).not.toBeNull()
    // eslint-disable-next-line @typescript-eslint/no-non-null-assertion
    const style = wrapper!.getAttribute('style') ?? ''
    expect(style).toContain('var(--color-orb-in-text)')
  })

  it('arrow "out" uses var(--color-orb-out-text) via currentColor (no hardcoded hex)', () => {
    const { container } = render(<CueGlyph cue="arrow" phase="out" phaseLabel="Out" />)
    const wrapper = container.querySelector('span')
    expect(wrapper).not.toBeNull()
    // eslint-disable-next-line @typescript-eslint/no-non-null-assertion
    const style = wrapper!.getAttribute('style') ?? ''
    expect(style).toContain('var(--color-orb-out-text)')
  })

  it('SVG contains a path element (chevron fill path)', () => {
    const { container } = render(<CueGlyph cue="arrow" phase="in" phaseLabel="In" />)
    expect(container.querySelector('svg path')).not.toBeNull()
  })

  it('SVG has no animation classes or elements (static glyph, D-08)', () => {
    const { container } = render(<CueGlyph cue="arrow" phase="in" phaseLabel="In" />)
    expect(container.querySelector('animate')).toBeNull()
    expect(container.querySelector('[class*="animate-"]')).toBeNull()
  })

  it('wrapper span has relative z-10 positioning (stays in orb-center slot)', () => {
    const { container } = render(<CueGlyph cue="arrow" phase="in" phaseLabel="In" />)
    const wrapper = container.querySelector('span:first-child')
    expect(wrapper).not.toBeNull()
    // eslint-disable-next-line @typescript-eslint/no-non-null-assertion
    expect(wrapper!.className).toContain('relative')
    // eslint-disable-next-line @typescript-eslint/no-non-null-assertion
    expect(wrapper!.className).toContain('z-10')
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

  it('renders a visually-hidden sr-only span with phaseLabel for phase "in" (CUE-03)', () => {
    render(<CueGlyph cue="nose" phase="in" phaseLabel="In" />)
    const srSpan = screen.getByText('In')
    expect(srSpan).toBeInTheDocument()
    expect(srSpan.className).toContain('sr-only')
  })

  it('renders a visually-hidden sr-only span with phaseLabel for phase "out" (CUE-03)', () => {
    render(<CueGlyph cue="nose" phase="out" phaseLabel="Out" />)
    const srSpan = screen.getByText('Out')
    expect(srSpan).toBeInTheDocument()
    expect(srSpan.className).toContain('sr-only')
  })

  it('nose "in" uses var(--color-orb-in-text) (token color)', () => {
    const { container } = render(<CueGlyph cue="nose" phase="in" phaseLabel="In" />)
    const wrapper = container.querySelector('span')
    expect(wrapper).not.toBeNull()
    // eslint-disable-next-line @typescript-eslint/no-non-null-assertion
    const style = wrapper!.getAttribute('style') ?? ''
    expect(style).toContain('var(--color-orb-in-text)')
  })

  it('nose "out" uses var(--color-orb-out-text) (token color)', () => {
    const { container } = render(<CueGlyph cue="nose" phase="out" phaseLabel="Out" />)
    const wrapper = container.querySelector('span')
    expect(wrapper).not.toBeNull()
    // eslint-disable-next-line @typescript-eslint/no-non-null-assertion
    const style = wrapper!.getAttribute('style') ?? ''
    expect(style).toContain('var(--color-orb-out-text)')
  })

  it('SVG contains path elements (nose outline paths)', () => {
    const { container } = render(<CueGlyph cue="nose" phase="in" phaseLabel="In" />)
    expect(container.querySelectorAll('svg path').length).toBeGreaterThan(0)
  })

  it('SVG has no animation elements (static glyph, D-08)', () => {
    const { container } = render(<CueGlyph cue="nose" phase="in" phaseLabel="In" />)
    expect(container.querySelector('animate')).toBeNull()
    expect(container.querySelector('[class*="animate-"]')).toBeNull()
  })

  it('nose is stroked (svg has fill="none" and stroke="currentColor" — uses stroke, not fill)', () => {
    const { container } = render(<CueGlyph cue="nose" phase="in" phaseLabel="In" />)
    const svg = container.querySelector('svg')
    expect(svg).not.toBeNull()
    // The nose SVG root carries fill="none" and stroke="currentColor"
    // eslint-disable-next-line @typescript-eslint/no-non-null-assertion
    expect(svg!.getAttribute('fill')).toBe('none')
    // eslint-disable-next-line @typescript-eslint/no-non-null-assertion
    expect(svg!.getAttribute('stroke')).toBe('currentColor')
  })
})

// ── preview mode (picker swatch) ─────────────────────────────────────────────

describe('CueGlyph — preview mode', () => {
  it('labels preview renders a single "T", not the phase word', () => {
    render(<CueGlyph cue="labels" phase="in" phaseLabel="Text" preview />)
    expect(screen.getByText('T')).toBeInTheDocument()
    expect(screen.queryByText('Text')).not.toBeInTheDocument()
  })

  it('labels preview uses the variant-picker swatch token var(--color-orb-in-from)', () => {
    const { container } = render(<CueGlyph cue="labels" phase="in" phaseLabel="Text" preview />)
    const span = container.querySelector('span')
    expect(span).not.toBeNull()
    // eslint-disable-next-line @typescript-eslint/no-non-null-assertion
    expect(span!.getAttribute('style') ?? '').toContain('var(--color-orb-in-from)')
  })

  it('arrow preview uses var(--color-orb-in-from) instead of the in/out text tokens', () => {
    const { container } = render(<CueGlyph cue="arrow" phase="in" phaseLabel="In" preview />)
    const wrapper = container.querySelector('span')
    expect(wrapper).not.toBeNull()
    // eslint-disable-next-line @typescript-eslint/no-non-null-assertion
    const style = wrapper!.getAttribute('style') ?? ''
    expect(style).toContain('var(--color-orb-in-from)')
    expect(style).not.toContain('var(--color-orb-in-text)')
  })

  it('nose preview uses var(--color-orb-in-from)', () => {
    const { container } = render(<CueGlyph cue="nose" phase="in" phaseLabel="In" preview />)
    const wrapper = container.querySelector('span')
    expect(wrapper).not.toBeNull()
    // eslint-disable-next-line @typescript-eslint/no-non-null-assertion
    expect(wrapper!.getAttribute('style') ?? '').toContain('var(--color-orb-in-from)')
  })

  it('non-preview labels mode still renders the full phase word (in-orb unchanged)', () => {
    render(<CueGlyph cue="labels" phase="in" phaseLabel="In" />)
    expect(screen.getByText('In')).toBeInTheDocument()
  })
})
