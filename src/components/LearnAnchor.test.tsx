import '@testing-library/jest-dom/vitest'
import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { describe, expect, it, vi } from 'vitest'

import { LearnAnchor } from './LearnAnchor'
import { UI_STRINGS } from '../content/strings'

const EN_STRINGS_FIXTURE = UI_STRINGS.en

// The anchor's disabled-during-session behavior is unit-testable in isolation via the
// disabled prop (derived from App's inSessionView predicate).
// Tests assert: (a) enabled click invokes onClick, (b) disabled click does NOT invoke
// onClick, (c) the same DOM node persists across the enabled→disabled transition (no remount).

describe('LearnAnchor — enabled state (idle / D-03 enabled branch)', () => {
  it('renders a button with accessible name Learn', () => {
    render(<LearnAnchor disabled={false} onClick={vi.fn()} strings={EN_STRINGS_FIXTURE.practice.topBar} />)
    expect(screen.getByRole('button', { name: 'Learn' })).toBeInTheDocument()
  })

  it('does NOT carry aria-disabled="true" when enabled', () => {
    render(<LearnAnchor disabled={false} onClick={vi.fn()} strings={EN_STRINGS_FIXTURE.practice.topBar} />)
    const button = screen.getByRole('button', { name: 'Learn' })
    expect(button).not.toHaveAttribute('aria-disabled', 'true')
  })

  it('clicking the button invokes onClick exactly once', async () => {
    const user = userEvent.setup()
    const onClick = vi.fn()
    render(<LearnAnchor disabled={false} onClick={onClick} strings={EN_STRINGS_FIXTURE.practice.topBar} />)
    const button = screen.getByRole('button', { name: 'Learn' })
    await user.click(button)
    expect(onClick).toHaveBeenCalledTimes(1)
  })
})

describe('LearnAnchor — disabled state (lead-in / running / D-03 disabled branch)', () => {
  it('renders a button with accessible name "Learn (unavailable during session)"', () => {
    render(<LearnAnchor disabled={true} onClick={vi.fn()} strings={EN_STRINGS_FIXTURE.practice.topBar} />)
    expect(
      screen.getByRole('button', { name: 'Learn (unavailable during session)' }),
    ).toBeInTheDocument()
  })

  it('carries aria-disabled="true" when disabled', () => {
    render(<LearnAnchor disabled={true} onClick={vi.fn()} strings={EN_STRINGS_FIXTURE.practice.topBar} />)
    const button = screen.getByRole('button', { name: 'Learn (unavailable during session)' })
    expect(button).toHaveAttribute('aria-disabled', 'true')
  })

  it('clicking the disabled button does NOT invoke onClick (JSX-layer no-op — T-06-11)', async () => {
    const user = userEvent.setup()
    const onClick = vi.fn()
    render(<LearnAnchor disabled={true} onClick={onClick} strings={EN_STRINGS_FIXTURE.practice.topBar} />)
    const button = screen.getByRole('button', { name: 'Learn (unavailable during session)' })
    await user.click(button)
    expect(onClick).not.toHaveBeenCalled()
  })
})

describe('LearnAnchor — no remount across enabled/disabled transition (D-18 invariant)', () => {
  it('the same DOM node persists across the enabled→disabled rerender (no unmount)', () => {
    // The anchor's enabled/disabled transition is purely visual — React diffs
    // in place because the component shape is identical. The DOM node identity is preserved.
    const onClick = vi.fn()
    const { rerender } = render(<LearnAnchor disabled={false} onClick={onClick} strings={EN_STRINGS_FIXTURE.practice.topBar} />)
    const before = screen.getByRole('button', { name: 'Learn' })

    rerender(<LearnAnchor disabled={true} onClick={onClick} strings={EN_STRINGS_FIXTURE.practice.topBar} />)
    const after = screen.getByRole('button', { name: 'Learn (unavailable during session)' })

    // Object identity: the same DOM element, not a remounted clone.
    expect(after).toBe(before)
  })
})
