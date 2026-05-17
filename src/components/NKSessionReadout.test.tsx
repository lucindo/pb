import '@testing-library/jest-dom/vitest'
import { render, screen } from '@testing-library/react'
import { describe, expect, it } from 'vitest'

import { NKSessionReadout, type NKSessionReadoutProps } from './NKSessionReadout'
import { UI_STRINGS } from '../content/strings'

const EN_STRINGS = UI_STRINGS.en.nkReadout

function renderReadout(overrides: Partial<NKSessionReadoutProps> = {}) {
  const defaults: NKSessionReadoutProps = {
    phase: 'front',
    round: 1,
    totalRounds: 3,
    target: 100,
    strings: EN_STRINGS,
  }
  return render(<NKSessionReadout {...defaults} {...overrides} />)
}

describe('NKSessionReadout', () => {
  it('phase "front" shows strings.front value', () => {
    renderReadout({ phase: 'front' })
    expect(screen.getByText('Front')).toBeInTheDocument()
  })

  it('phase "back" shows strings.back value', () => {
    renderReadout({ phase: 'back' })
    expect(screen.getByText('Back')).toBeInTheDocument()
  })

  it('round=2, totalRounds=3 renders strings.roundOf(2,3)', () => {
    renderReadout({ round: 2, totalRounds: 3 })
    // EN roundOf: (c, t) => `${c} / ${t}`
    expect(screen.getByText('2 / 3')).toBeInTheDocument()
  })

  it('target=100 renders "100" in the Count cell', () => {
    renderReadout({ target: 100 })
    expect(screen.getByText('100')).toBeInTheDocument()
  })

  it('container section carries aria-label = strings.readoutAriaLabel', () => {
    renderReadout()
    expect(
      screen.getByRole('region', { name: 'Navi Kriya session readout' }),
    ).toBeInTheDocument()
  })

  it('container section carries aria-live="polite"', () => {
    const { container } = renderReadout()
    const section = container.querySelector('section')
    expect(section).not.toBeNull()
    // Reason: section non-null asserted by expect().not.toBeNull() immediately above.
    // eslint-disable-next-line @typescript-eslint/no-non-null-assertion
    expect(section!).toHaveAttribute('aria-live', 'polite')
  })

  it('renders phase label (strings.phaseLabel = "Phase")', () => {
    renderReadout()
    expect(screen.getByText('Phase')).toBeInTheDocument()
  })

  it('renders round label (strings.roundLabel = "Round")', () => {
    renderReadout()
    expect(screen.getByText('Round')).toBeInTheDocument()
  })

  it('renders count label (strings.countLabel = "Count")', () => {
    renderReadout()
    expect(screen.getByText('Count')).toBeInTheDocument()
  })

  it('no hard-coded "Front" string — value comes from strings prop', () => {
    // Use a custom strings object with different values to confirm no hardcoding
    const customStrings = { ...EN_STRINGS, front: 'Frente', back: 'Trás' }
    renderReadout({ phase: 'front', strings: customStrings })
    expect(screen.getByText('Frente')).toBeInTheDocument()
    expect(screen.queryByText('Front')).not.toBeInTheDocument()
  })
})
