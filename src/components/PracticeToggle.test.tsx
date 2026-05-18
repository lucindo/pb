// PracticeToggle.test.tsx
//
// Treatment-B branch is exercised by stubbing the global __SWITCHER_TREATMENT__
// before import. The component reads the compile-time constant at module scope so
// the stub must be set BEFORE the module is first evaluated.  We use
// vi.stubGlobal('__SWITCHER_TREATMENT__', 'B') inside a describe block with a
// beforeAll that re-imports the module after stubbing.

import { describe, expect, it, vi, beforeAll, afterAll } from 'vitest'
import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'

import { PracticeToggle, PracticeGlyph } from './PracticeToggle'
import type { PracticeId } from '../storage/practices'

// ── Stub strings for 3-practice scenario ─────────────────────────────────────
const stubStrings = {
  toggleLabel: 'Switch practice',
  practiceNames: {
    resonant: 'HRV',
    stretch: 'Stretch',
    naviKriya: 'Navi Kriya',
  } as Record<PracticeId, string>,
}

// ── Core 3-pill tests (treatment A — no glyphs) ───────────────────────────────
describe('PracticeToggle (3 pills, treatment A)', () => {
  it('renders exactly three pill buttons in order: resonant, stretch, naviKriya', () => {
    const onSwitch = vi.fn()
    render(
      <PracticeToggle
        active="resonant"
        disabled={false}
        onSwitch={onSwitch}
        strings={stubStrings}
      />,
    )
    const buttons = screen.getAllByRole('button')
    expect(buttons).toHaveLength(3)
    expect(buttons[0]!.textContent).toBe('HRV')
    expect(buttons[1]!.textContent).toBe('Stretch')
    expect(buttons[2]!.textContent).toBe('Navi Kriya')
  })

  it('container has role="group" and aria-label from strings.toggleLabel', () => {
    const onSwitch = vi.fn()
    render(
      <PracticeToggle
        active="resonant"
        disabled={false}
        onSwitch={onSwitch}
        strings={stubStrings}
      />,
    )
    const group = screen.getByRole('group', { name: 'Switch practice' })
    expect(group).toBeDefined()
  })

  it('active pill has aria-pressed="true" and others have aria-pressed="false"', () => {
    const onSwitch = vi.fn()
    render(
      <PracticeToggle
        active="stretch"
        disabled={false}
        onSwitch={onSwitch}
        strings={stubStrings}
      />,
    )
    const resonantBtn = screen.getByRole('button', { name: 'HRV' })
    const stretchBtn = screen.getByRole('button', { name: 'Stretch' })
    const naviBtn = screen.getByRole('button', { name: 'Navi Kriya' })
    expect(resonantBtn.getAttribute('aria-pressed')).toBe('false')
    expect(stretchBtn.getAttribute('aria-pressed')).toBe('true')
    expect(naviBtn.getAttribute('aria-pressed')).toBe('false')
  })

  it('clicking an inactive pill calls onSwitch with the correct practice id', async () => {
    const user = userEvent.setup()
    const onSwitch = vi.fn()
    render(
      <PracticeToggle
        active="resonant"
        disabled={false}
        onSwitch={onSwitch}
        strings={stubStrings}
      />,
    )
    await user.click(screen.getByRole('button', { name: 'Stretch' }))
    expect(onSwitch).toHaveBeenCalledTimes(1)
    expect(onSwitch).toHaveBeenCalledWith('stretch')
  })

  it('in treatment A (default), no SVG is rendered inside the pills', () => {
    const onSwitch = vi.fn()
    render(
      <PracticeToggle
        active="resonant"
        disabled={false}
        onSwitch={onSwitch}
        strings={stubStrings}
      />,
    )
    // Treatment A renders text-only pills; no SVG elements should be present
    const svgs = document.querySelectorAll('button svg')
    expect(svgs.length).toBe(0)
  })

  it('when disabled=true all three buttons carry the disabled attribute', () => {
    const onSwitch = vi.fn()
    render(
      <PracticeToggle
        active="resonant"
        disabled={true}
        onSwitch={onSwitch}
        strings={stubStrings}
      />,
    )
    const buttons = screen.getAllByRole('button')
    expect(buttons).toHaveLength(3)
    for (const btn of buttons) {
      expect(btn).toBeDisabled()
    }
  })

  it('when disabled=true clicking a button does NOT call onSwitch', async () => {
    const user = userEvent.setup()
    const onSwitch = vi.fn()
    render(
      <PracticeToggle
        active="resonant"
        disabled={true}
        onSwitch={onSwitch}
        strings={stubStrings}
      />,
    )
    await user.click(screen.getByRole('button', { name: 'Stretch' }))
    expect(onSwitch).not.toHaveBeenCalled()
  })

  it('works when stretch is the active pill', () => {
    const onSwitch = vi.fn()
    render(
      <PracticeToggle
        active="stretch"
        disabled={false}
        onSwitch={onSwitch}
        strings={stubStrings}
      />,
    )
    const stretchBtn = screen.getByRole('button', { name: 'Stretch' })
    expect(stretchBtn.getAttribute('aria-pressed')).toBe('true')
    expect(screen.getByRole('button', { name: 'HRV' }).getAttribute('aria-pressed')).toBe('false')
    expect(screen.getByRole('button', { name: 'Navi Kriya' }).getAttribute('aria-pressed')).toBe('false')
  })
})

// ── PracticeGlyph unit tests (treatment B glyphs) ────────────────────────────
// The PracticeGlyph is exported for direct unit testing without requiring a
// full treatment-B build. We render each glyph directly and assert on the SVG.
describe('PracticeGlyph (treatment B inline SVGs)', () => {
  it('resonant glyph renders an aria-hidden SVG with a circle', () => {
    render(<PracticeGlyph id="resonant" />)
    const svg = document.querySelector('svg')
    expect(svg).not.toBeNull()
    expect(svg!.getAttribute('aria-hidden')).toBe('true')
    const circle = svg!.querySelector('circle')
    expect(circle).not.toBeNull()
  })

  it('stretch glyph renders an aria-hidden SVG with a polyline', () => {
    render(<PracticeGlyph id="stretch" />)
    const svg = document.querySelector('svg')
    expect(svg).not.toBeNull()
    expect(svg!.getAttribute('aria-hidden')).toBe('true')
    const polyline = svg!.querySelector('polyline')
    expect(polyline).not.toBeNull()
  })

  it('naviKriya glyph renders an aria-hidden SVG with three circles', () => {
    render(<PracticeGlyph id="naviKriya" />)
    const svg = document.querySelector('svg')
    expect(svg).not.toBeNull()
    expect(svg!.getAttribute('aria-hidden')).toBe('true')
    const circles = svg!.querySelectorAll('circle')
    expect(circles.length).toBe(3)
  })

  it('all glyphs use currentColor (no hardcoded hex colors)', () => {
    const practices: PracticeId[] = ['resonant', 'stretch', 'naviKriya']
    for (const id of practices) {
      const { unmount } = render(<PracticeGlyph id={id} />)
      const svg = document.querySelector('svg')!
      const innerHTML = svg.innerHTML + svg.outerHTML
      // No hardcoded hex colors allowed
      expect(innerHTML).not.toMatch(/#[0-9a-fA-F]{3,6}/)
      unmount()
    }
  })
})

// ── Treatment B integration: toggler renders glyphs when treatment=B ─────────
// We use vi.stubGlobal to set __SWITCHER_TREATMENT__ to 'B' and then dynamically
// re-import PracticeToggle to get the B-treatment version.
describe('PracticeToggle treatment B (glyphs visible)', () => {
  let PracticeToggleB: typeof PracticeToggle

  beforeAll(async () => {
    vi.stubGlobal('__SWITCHER_TREATMENT__', 'B')
    // Dynamic import with cache-busted query to force re-evaluation under the stub
    // `as string` widens the specifier so tsc treats this as Promise<any>
    // (it cannot resolve Vite's `?treatment=B` query); esbuild strips the cast,
    // leaving the literal intact for Vite's dynamic-import analysis.
    const mod = await import('./PracticeToggle?treatment=B' as string)
    PracticeToggleB = mod.PracticeToggle
  })

  afterAll(() => {
    vi.unstubAllGlobals()
  })

  it('renders inline SVG glyphs (aria-hidden) alongside each pill label in treatment B', () => {
    const onSwitch = vi.fn()
    render(
      <PracticeToggleB
        active="resonant"
        disabled={false}
        onSwitch={onSwitch}
        strings={stubStrings}
      />,
    )
    // Each pill should contain an SVG with aria-hidden
    const hiddenSvgs = document.querySelectorAll('button svg[aria-hidden="true"]')
    expect(hiddenSvgs.length).toBe(3)
  })
})
