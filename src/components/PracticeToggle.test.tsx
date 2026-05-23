import { describe, expect, it, vi } from 'vitest'
import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'

import { PracticeGlyph, PracticeToggle } from './PracticeToggle'
import type { PracticeId } from '../storage/practices'

const stubStrings = {
  toggleLabel: 'Switch practice',
  practiceNames: {
    resonant: 'HRV',
    stretch: 'Stretch',
    naviKriya: 'Navi Kriya',
  } as Record<PracticeId, string>,
}

function renderToggle(overrides: {
  active?: PracticeId
  disabled?: boolean
  showIcons?: boolean
  onSwitch?: (id: PracticeId) => void
} = {}): ReturnType<typeof vi.fn> {
  const onSwitch = vi.fn()
  render(
    <PracticeToggle
      active={overrides.active ?? 'resonant'}
      disabled={overrides.disabled ?? false}
      showIcons={overrides.showIcons ?? true}
      onSwitch={overrides.onSwitch ?? onSwitch}
      strings={stubStrings}
    />,
  )
  return onSwitch
}

function getRenderedSvg(): SVGSVGElement {
  const svg = document.querySelector('svg')
  if (!(svg instanceof SVGSVGElement)) {
    throw new Error('Expected an SVG to be rendered')
  }
  return svg
}

function requireElement<T extends Element>(element: T | null, message: string): T {
  if (element === null) {
    throw new Error(message)
  }
  return element
}

describe('PracticeToggle', () => {
  it('renders exactly three pill buttons in order: resonant, stretch, naviKriya', () => {
    renderToggle({ showIcons: false })
    const buttons = screen.getAllByRole('button')
    expect(buttons).toHaveLength(3)
    expect(buttons.map((button) => button.textContent)).toEqual(['HRV', 'Stretch', 'Navi Kriya'])
  })

  it('container has role="group" and aria-label from strings.toggleLabel', () => {
    renderToggle()
    expect(screen.getByRole('group', { name: 'Switch practice' })).toBeDefined()
  })

  it('active pill has aria-pressed="true" and others have aria-pressed="false"', () => {
    renderToggle({ active: 'stretch' })
    expect(screen.getByRole('button', { name: 'HRV' }).getAttribute('aria-pressed')).toBe('false')
    expect(screen.getByRole('button', { name: 'Stretch' }).getAttribute('aria-pressed')).toBe('true')
    expect(screen.getByRole('button', { name: 'Navi Kriya' }).getAttribute('aria-pressed')).toBe('false')
  })

  it('clicking an inactive pill calls onSwitch with the correct practice id', async () => {
    const user = userEvent.setup()
    const onSwitch = renderToggle()
    await user.click(screen.getByRole('button', { name: 'Stretch' }))
    expect(onSwitch).toHaveBeenCalledTimes(1)
    expect(onSwitch).toHaveBeenCalledWith('stretch')
  })

  it('hides SVG glyphs when showIcons=false', () => {
    renderToggle({ showIcons: false })
    expect(document.querySelectorAll('button svg')).toHaveLength(0)
  })

  it('renders SVG glyphs when showIcons=true', () => {
    renderToggle({ showIcons: true })
    expect(document.querySelectorAll('button svg[aria-hidden="true"]')).toHaveLength(3)
  })

  it('when disabled=true all three buttons carry the disabled attribute', () => {
    renderToggle({ disabled: true })
    const buttons = screen.getAllByRole('button')
    expect(buttons).toHaveLength(3)
    for (const button of buttons) {
      expect(button).toBeDisabled()
    }
  })

  it('when disabled=true clicking a button does not call onSwitch', async () => {
    const user = userEvent.setup()
    const onSwitch = renderToggle({ disabled: true })
    await user.click(screen.getByRole('button', { name: 'Stretch' }))
    expect(onSwitch).not.toHaveBeenCalled()
  })

  it('works when stretch is the active pill', () => {
    renderToggle({ active: 'stretch' })
    expect(screen.getByRole('button', { name: 'Stretch' }).getAttribute('aria-pressed')).toBe('true')
    expect(screen.getByRole('button', { name: 'HRV' }).getAttribute('aria-pressed')).toBe('false')
    expect(screen.getByRole('button', { name: 'Navi Kriya' }).getAttribute('aria-pressed')).toBe('false')
  })
})

describe('PracticeGlyph', () => {
  it('resonant glyph renders an aria-hidden SVG with a circle', () => {
    render(<PracticeGlyph id="resonant" />)
    const svg = getRenderedSvg()
    expect(svg.getAttribute('aria-hidden')).toBe('true')
    expect(svg.querySelector('circle')).not.toBeNull()
  })

  it('stretch glyph renders an aria-hidden SVG with an S-curve path', () => {
    render(<PracticeGlyph id="stretch" />)
    const svg = getRenderedSvg()
    expect(svg.getAttribute('aria-hidden')).toBe('true')
    expect(svg.querySelector('polyline')).toBeNull()
    const path = requireElement(svg.querySelector('path'), 'Expected stretch glyph path')
    expect(path.getAttribute('d')).toBe('M2 13 Q5.5 2 9 9 T16 5.5')
    expect(path.getAttribute('stroke')).toBe('currentColor')
    expect(svg.getAttribute('viewBox')).toBe('0 0 18 18')
  })

  it('naviKriya glyph renders an aria-hidden SVG with three circles', () => {
    render(<PracticeGlyph id="naviKriya" />)
    const svg = getRenderedSvg()
    expect(svg.getAttribute('aria-hidden')).toBe('true')
    expect(svg.querySelectorAll('circle')).toHaveLength(3)
  })

  it('all glyphs use currentColor without hardcoded hex colors', () => {
    const practices: readonly PracticeId[] = ['resonant', 'stretch', 'naviKriya']
    for (const id of practices) {
      const { unmount } = render(<PracticeGlyph id={id} />)
      const svg = getRenderedSvg()
      expect(svg.outerHTML).not.toMatch(/#[0-9a-fA-F]{3,6}/)
      unmount()
    }
  })
})
