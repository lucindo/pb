import { describe, expect, it, vi } from 'vitest'
import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'

import { PracticeToggle } from './PracticeToggle'

const stubStrings = {
  toggleLabel: 'Switch practice',
  practiceNames: {
    resonant: 'Resonant Breathing',
    naviKriya: 'Navi Kriya',
  } as Record<'resonant' | 'naviKriya', string>,
}

describe('PracticeToggle', () => {
  it('renders exactly two pill buttons with the provided practice labels', () => {
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
    expect(buttons).toHaveLength(2)
    expect(screen.getByText('Resonant Breathing')).toBeDefined()
    expect(screen.getByText('Navi Kriya')).toBeDefined()
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

  it('active pill has aria-pressed="true" and inactive pill has aria-pressed="false"', () => {
    const onSwitch = vi.fn()
    render(
      <PracticeToggle
        active="resonant"
        disabled={false}
        onSwitch={onSwitch}
        strings={stubStrings}
      />,
    )
    const resonantBtn = screen.getByRole('button', { name: 'Resonant Breathing' })
    const naviKriyaBtn = screen.getByRole('button', { name: 'Navi Kriya' })
    expect(resonantBtn.getAttribute('aria-pressed')).toBe('true')
    expect(naviKriyaBtn.getAttribute('aria-pressed')).toBe('false')
  })

  it('clicking the inactive pill calls onSwitch with the correct practice id', async () => {
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
    const naviKriyaBtn = screen.getByRole('button', { name: 'Navi Kriya' })
    await user.click(naviKriyaBtn)
    expect(onSwitch).toHaveBeenCalledTimes(1)
    expect(onSwitch).toHaveBeenCalledWith('naviKriya')
  })

  it('clicking the active pill still calls onSwitch (no guard needed in presentational component)', async () => {
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
    const resonantBtn = screen.getByRole('button', { name: 'Resonant Breathing' })
    await user.click(resonantBtn)
    expect(onSwitch).toHaveBeenCalledTimes(1)
    expect(onSwitch).toHaveBeenCalledWith('resonant')
  })

  it('when disabled=true both buttons carry the disabled attribute', () => {
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
    expect(buttons).toHaveLength(2)
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
    const naviKriyaBtn = screen.getByRole('button', { name: 'Navi Kriya' })
    await user.click(naviKriyaBtn)
    expect(onSwitch).not.toHaveBeenCalled()
  })

  it('works when naviKriya is the active pill', () => {
    const onSwitch = vi.fn()
    render(
      <PracticeToggle
        active="naviKriya"
        disabled={false}
        onSwitch={onSwitch}
        strings={stubStrings}
      />,
    )
    const resonantBtn = screen.getByRole('button', { name: 'Resonant Breathing' })
    const naviKriyaBtn = screen.getByRole('button', { name: 'Navi Kriya' })
    expect(resonantBtn.getAttribute('aria-pressed')).toBe('false')
    expect(naviKriyaBtn.getAttribute('aria-pressed')).toBe('true')
  })
})
