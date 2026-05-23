import '@testing-library/jest-dom/vitest'
import { render, screen } from '@testing-library/react'
import { describe, expect, it } from 'vitest'

import { NKShape, type NKShapeProps } from './NKShape'
import { UI_STRINGS } from '../content/strings'

const EN_STRINGS = UI_STRINGS.en.practice.breathing

function renderShape(overrides: Partial<NKShapeProps> = {}) {
  const defaults: NKShapeProps = {
    count: 1,
    phase: 'front',
    strings: EN_STRINGS,
    nkReadoutStrings: UI_STRINGS.en.practice.nkReadout,
  }
  return render(<NKShape {...defaults} {...overrides} />)
}

describe('NKShape', () => {
  it('D-02: count=47 renders "47" centered inside the shape', () => {
    renderShape({ count: 47 })
    expect(screen.getByText('47')).toBeInTheDocument()
  })

  it('Phase 31: count=0 renders "0" (post-marker lead-in window)', () => {
    renderShape({ count: 0 })
    expect(screen.getByText('0')).toBeInTheDocument()
  })

  it('WR-01: aria-label announces the Front phase during the front phase', () => {
    const { container } = renderShape({ count: 12, phase: 'front' })
    const root = container.querySelector('[role="img"]')
    expect(root?.getAttribute('aria-label')).toBe(
      `Navi Kriya session: OM 12, phase ${UI_STRINGS.en.practice.nkReadout.front}`,
    )
  })

  it('WR-01: aria-label announces the Back phase during the back phase', () => {
    const { container } = renderShape({ count: 3, phase: 'back' })
    const root = container.querySelector('[role="img"]')
    expect(root?.getAttribute('aria-label')).toBe(
      `Navi Kriya session: OM 3, phase ${UI_STRINGS.en.practice.nkReadout.back}`,
    )
  })
})
