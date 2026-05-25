import '@testing-library/jest-dom/vitest'
import { render, screen } from '@testing-library/react'
import { describe, expect, it } from 'vitest'

import { NKSessionReadout, type NKSessionReadoutProps } from './NKSessionReadout'
import { UI_STRINGS } from '../content/strings'

const EN_STRINGS = UI_STRINGS.en.practice.nkReadout

function renderReadout(overrides: Partial<NKSessionReadoutProps> = {}) {
  const defaults: NKSessionReadoutProps = {
    phase: 'front',
    round: 1,
    totalRounds: 3,
    count: 0,
    target: 100,
    strings: EN_STRINGS,
  }
  return render(<NKSessionReadout {...defaults} {...overrides} />)
}

describe('NKSessionReadout', () => {
  // J16: NKSessionReadout now renders FeedbackCount (big count + " / target"
  // baseline-aligned, above an uppercase "ROUND X · PHASE" secondary). The
  // Phase / Round / Count cell labels are gone; section chrome (border, bg,
  // status legend) is dropped.

  it('renders the live OM count as the primary number', () => {
    renderReadout({ count: 47, target: 100 })
    expect(screen.getByText('47')).toBeInTheDocument()
  })

  it('renders "/ target" as the baseline-aligned mid suffix', () => {
    renderReadout({ count: 7, target: 100 })
    expect(screen.getByText('/ 100')).toBeInTheDocument()
  })

  it('count=0 (lead-in window) renders 0 / target with the target unchanged', () => {
    renderReadout({ count: 0, target: 20 })
    expect(screen.getByText('0')).toBeInTheDocument()
    expect(screen.getByText('/ 20')).toBeInTheDocument()
  })

  it('phase "front" renders the secondary "{roundOf} · Front"', () => {
    renderReadout({ phase: 'front', round: 1, totalRounds: 3 })
    expect(screen.getByText('1 / 3 · Front')).toBeInTheDocument()
  })

  it('phase "back" renders the secondary "{roundOf} · Back"', () => {
    renderReadout({ phase: 'back', round: 2, totalRounds: 3 })
    expect(screen.getByText('2 / 3 · Back')).toBeInTheDocument()
  })

  it('container section carries aria-label = strings.readoutAriaLabel', () => {
    renderReadout()
    expect(
      screen.getByRole('region', { name: 'Navi Kriya session readout' }),
    ).toBeInTheDocument()
  })

  it('no hard-coded "Front" string — value comes from strings prop', () => {
    const customStrings = { ...EN_STRINGS, front: 'Frente', back: 'Trás' }
    renderReadout({ phase: 'front', strings: customStrings })
    expect(screen.getByText(/Frente/)).toBeInTheDocument()
    expect(screen.queryByText(/· Front$/)).not.toBeInTheDocument()
  })
})
