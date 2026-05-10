import '@testing-library/jest-dom/vitest'
import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { describe, expect, it, vi } from 'vitest'

import { StatsFooter, type StatsFooterProps } from './StatsFooter'
import type { PersistedStats } from '../storage'

const baseStats: PersistedStats = {
  totalSessions: 12,
  totalElapsedSeconds: 47 * 60,
  lastSessionAtMs: new Date(new Date().getFullYear(), 4, 7).getTime(), // May 7 of current year
  lastSessionDurationSeconds: 600,
}

function renderFooter(props: Partial<StatsFooterProps> = {}) {
  const onResetClick = props.onResetClick ?? vi.fn()
  const utils = render(
    <StatsFooter
      stats={props.stats ?? baseStats}
      onResetClick={onResetClick}
    />,
  )
  return { ...utils, onResetClick }
}

describe('StatsFooter (D-08)', () => {
  it('renders Line 1 as "<sessions> · <total> total"', () => {
    renderFooter()
    expect(screen.getByText(/12 sessions · 47 min total/)).toBeInTheDocument()
  })

  it('renders the singular "1 session" form (D-06)', () => {
    renderFooter({ stats: { ...baseStats, totalSessions: 1 } })
    expect(screen.getByText(/^1 session ·/)).toBeInTheDocument()
  })

  it('renders Line 2 with "Last: <date> · <duration>" when last-session fields are present', () => {
    renderFooter()
    expect(screen.getByText(/Last:.*May 7.*·.*10 min/)).toBeInTheDocument()
  })

  it('omits the "Last:" prefix when lastSessionAtMs is null (graceful degradation)', () => {
    renderFooter({
      stats: { ...baseStats, lastSessionAtMs: null, lastSessionDurationSeconds: null },
    })
    expect(screen.queryByText(/^Last:/)).not.toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'Reset' })).toBeInTheDocument()
  })
})

describe('StatsFooter Reset button (D-13)', () => {
  it('renders the Reset button as a <button type="button">', () => {
    renderFooter()
    const btn = screen.getByRole('button', { name: 'Reset' })
    expect(btn).toBeInTheDocument()
    expect(btn).toHaveAttribute('type', 'button')
  })

  it('Reset button has min-h-[44px] and min-w-[44px] hit-area floor classes (D-13)', () => {
    renderFooter()
    const btn = screen.getByRole('button', { name: 'Reset' })
    expect(btn.className).toMatch(/min-h-\[44px\]/)
    expect(btn.className).toMatch(/min-w-\[44px\]/)
  })

  it('Reset button uses theme accent color token', () => {
    renderFooter()
    const btn = screen.getByRole('button', { name: 'Reset' })
    expect(btn.className).toMatch(/var\(--color-breathing-accent\)/)
  })

  it('Reset button has focus-visible ring classes (Phase 2 baseline)', () => {
    renderFooter()
    const btn = screen.getByRole('button', { name: 'Reset' })
    expect(btn.className).toMatch(/focus-visible:ring-2/)
    expect(btn.className).toMatch(/focus-visible:ring-breathing-accent/)
  })

  it('clicking Reset invokes onResetClick exactly once', async () => {
    const user = userEvent.setup()
    const { onResetClick } = renderFooter()
    await user.click(screen.getByRole('button', { name: 'Reset' }))
    expect(onResetClick).toHaveBeenCalledTimes(1)
  })
})
