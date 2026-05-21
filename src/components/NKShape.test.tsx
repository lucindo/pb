import '@testing-library/jest-dom/vitest'
import { render, screen } from '@testing-library/react'
import { describe, expect, it, vi } from 'vitest'

import { NKShape, type NKShapeProps } from './NKShape'
import { UI_STRINGS } from '../content/strings'

// Mock usePrefersReducedMotion for reduced-motion tests
vi.mock('../hooks/usePrefersReducedMotion', () => ({
  usePrefersReducedMotion: vi.fn(() => false),
}))

const EN_STRINGS = UI_STRINGS.en.breathing

function renderShape(overrides: Partial<NKShapeProps> = {}) {
  const defaults: NKShapeProps = {
    count: 1,
    phase: 'front',
    strings: EN_STRINGS,
    nkReadoutStrings: UI_STRINGS.en.nkReadout,
  }
  return render(<NKShape {...defaults} {...overrides} />)
}

describe('NKShape', () => {
  it('NK wrapper carries data-variant="orb" (single-shape collapse — Phase 38 VAR-01/02)', () => {
    const { container } = renderShape()
    const root = container.querySelector('[data-variant="orb"]')
    expect(root).not.toBeNull()
  })

  it('D-02: count=47 renders "47" centered inside the shape', () => {
    renderShape({ count: 47 })
    expect(screen.getByText('47')).toBeInTheDocument()
  })

  it('Phase 31: count=0 renders "0" (post-marker lead-in window)', () => {
    renderShape({ count: 0 })
    expect(screen.getByText('0')).toBeInTheDocument()
  })

  it('Phase 31: phase="front" renders the shell at data-phase="in" (In gradient)', () => {
    const { container } = renderShape({ phase: 'front' })
    expect(container.querySelector('[data-phase="in"]')).not.toBeNull()
    expect(container.querySelector('[data-phase="out"]')).toBeNull()
  })

  it('Phase 31: phase="back" renders the shell at data-phase="out" (Out gradient)', () => {
    const { container } = renderShape({ phase: 'back' })
    expect(container.querySelector('[data-phase="out"]')).not.toBeNull()
  })

  it('Phase 31: no inner reference ring on the Back phase (HRV exhale-end cue suppressed)', () => {
    const { container } = renderShape({ phase: 'back' })
    expect(container.querySelector('.shape-marker--inner')).toBeNull()
  })

  it('Phase 31: no inner reference ring on the Front phase either', () => {
    const { container } = renderShape({ phase: 'front' })
    expect(container.querySelector('.shape-marker--inner')).toBeNull()
  })

  it('Phase 31: count digit uses the In text color on the Front phase', () => {
    renderShape({ count: 7, phase: 'front' })
    expect(screen.getByText('7')).toHaveStyle({ color: 'var(--color-orb-in-text)' })
  })

  it('Phase 31: count digit uses the Out text color on the Back phase', () => {
    renderShape({ count: 7, phase: 'back' })
    expect(screen.getByText('7')).toHaveStyle({ color: 'var(--color-orb-out-text)' })
  })

  it('isPaused=true applies opacity-50 to the count span', () => {
    const { container } = renderShape({ count: 5, isPaused: true })
    // The count span should have opacity-50 class
    const countSpan = container.querySelector('.opacity-50')
    expect(countSpan).not.toBeNull()
  })

  it('isPaused=false (default) does not apply opacity-50 to count span', () => {
    const { container } = renderShape({ count: 5, isPaused: false })
    const countSpan = container.querySelector('.opacity-50')
    expect(countSpan).toBeNull()
  })

  it('D-02: count number uses text-7xl class', () => {
    const { container } = renderShape({ count: 10 })
    const countSpan = container.querySelector('span.text-7xl')
    expect(countSpan).not.toBeNull()
  })

  it('WR-01: aria-label announces the Front phase during the front phase', () => {
    const { container } = renderShape({ count: 12, phase: 'front' })
    const root = container.querySelector('[role="img"]')
    expect(root?.getAttribute('aria-label')).toBe(
      `Navi Kriya session: OM 12, phase ${UI_STRINGS.en.nkReadout.front}`,
    )
  })

  it('WR-01: aria-label announces the Back phase during the back phase', () => {
    const { container } = renderShape({ count: 3, phase: 'back' })
    const root = container.querySelector('[role="img"]')
    expect(root?.getAttribute('aria-label')).toBe(
      `Navi Kriya session: OM 3, phase ${UI_STRINGS.en.nkReadout.back}`,
    )
  })
})

describe('NKShape — reduced-motion (D-04)', () => {
  it('reduced-motion=false: the animated element carries nk-om-pulse class', async () => {
    const { usePrefersReducedMotion } = await import('../hooks/usePrefersReducedMotion')
    vi.mocked(usePrefersReducedMotion).mockReturnValue(false)

    const { container } = renderShape({ count: 5 })
    const pulsing = container.querySelector('.nk-om-pulse')
    expect(pulsing).not.toBeNull()
  })

  it('D-04: reduced-motion=true: .nk-om-pulse class is absent (static fallback)', async () => {
    const { usePrefersReducedMotion } = await import('../hooks/usePrefersReducedMotion')
    vi.mocked(usePrefersReducedMotion).mockReturnValue(true)

    const { container } = renderShape({ count: 5 })
    const pulsing = container.querySelector('.nk-om-pulse')
    expect(pulsing).toBeNull()

    // Count number still renders (static fallback: shape holds but count updates)
    expect(screen.getByText('5')).toBeInTheDocument()
  })
})
