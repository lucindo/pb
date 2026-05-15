import '@testing-library/jest-dom/vitest'
import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { describe, expect, it, vi } from 'vitest'

import { SettingsAnchor } from './SettingsAnchor'
import { UI_STRINGS } from '../content/strings'

const EN_STRINGS_FIXTURE = UI_STRINGS.en

// Phase 15 D-08, D-18: the anchor's disabled-during-session behavior is unit-testable
// in isolation via the disabled prop (derived from App's inSessionView predicate).
// Tests assert: (a) enabled click invokes onClick, (b) disabled click does NOT invoke
// onClick (JSX-layer no-op — no handler attached), (c) the same DOM node persists
// across the enabled→disabled transition (no remount — D-07 invariant carry-forward).
// D-08 disable-not-hide: tests assert toHaveAttribute('aria-disabled', 'true') and NOT the
// HTML-disabled matcher — SettingsAnchor uses aria-disabled to keep the element in tab order.

describe('SettingsAnchor — enabled state', () => {
  it('renders a button with accessible name Settings', () => {
    render(<SettingsAnchor disabled={false} onClick={vi.fn()} strings={EN_STRINGS_FIXTURE.anchors} />)
    expect(screen.getByRole('button', { name: 'Settings' })).toBeInTheDocument()
  })

  it('does NOT carry aria-disabled="true" when enabled', () => {
    render(<SettingsAnchor disabled={false} onClick={vi.fn()} strings={EN_STRINGS_FIXTURE.anchors} />)
    const button = screen.getByRole('button', { name: 'Settings' })
    expect(button).not.toHaveAttribute('aria-disabled', 'true')
  })

  it('clicking the button invokes onClick exactly once', async () => {
    const user = userEvent.setup()
    const onClick = vi.fn()
    render(<SettingsAnchor disabled={false} onClick={onClick} strings={EN_STRINGS_FIXTURE.anchors} />)
    await user.click(screen.getByRole('button', { name: 'Settings' }))
    expect(onClick).toHaveBeenCalledTimes(1)
  })
})

describe('SettingsAnchor — disabled state (inSessionView=true)', () => {
  it('renders a button with accessible name "Settings (unavailable during session)"', () => {
    render(<SettingsAnchor disabled={true} onClick={vi.fn()} strings={EN_STRINGS_FIXTURE.anchors} />)
    expect(
      screen.getByRole('button', { name: 'Settings (unavailable during session)' }),
    ).toBeInTheDocument()
  })

  it('carries aria-disabled="true" when disabled', () => {
    render(<SettingsAnchor disabled={true} onClick={vi.fn()} strings={EN_STRINGS_FIXTURE.anchors} />)
    const button = screen.getByRole('button', { name: 'Settings (unavailable during session)' })
    expect(button).toHaveAttribute('aria-disabled', 'true')
  })

  it('clicking the disabled button does NOT invoke onClick (JSX-layer no-op)', async () => {
    const user = userEvent.setup()
    const onClick = vi.fn()
    render(<SettingsAnchor disabled={true} onClick={onClick} strings={EN_STRINGS_FIXTURE.anchors} />)
    await user.click(screen.getByRole('button', { name: 'Settings (unavailable during session)' }))
    expect(onClick).not.toHaveBeenCalled()
  })
})

describe('SettingsAnchor — no remount across enabled/disabled transition', () => {
  it('the same DOM node persists across enabled→disabled rerender', () => {
    // D-07: the anchor's enabled/disabled transition is purely visual — React diffs
    // in place because the component shape is identical. The DOM node identity is preserved.
    const onClick = vi.fn()
    const { rerender } = render(<SettingsAnchor disabled={false} onClick={onClick} strings={EN_STRINGS_FIXTURE.anchors} />)
    const before = screen.getByRole('button', { name: 'Settings' })

    rerender(<SettingsAnchor disabled={true} onClick={onClick} strings={EN_STRINGS_FIXTURE.anchors} />)
    const after = screen.getByRole('button', { name: 'Settings (unavailable during session)' })

    // Object identity: the same DOM element, not a remounted clone.
    expect(after).toBe(before)
  })
})
