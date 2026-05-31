import '@testing-library/jest-dom/vitest'
import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { describe, expect, it, vi } from 'vitest'

import { MuteToggle, type MuteToggleProps } from './MuteToggle'
import { UI_STRINGS } from '../content/strings'

const EN_STRINGS_FIXTURE = UI_STRINGS.en

function renderToggle(props: Partial<MuteToggleProps> = {}) {
  const onToggle = props.onToggle ?? vi.fn()
  const utils = render(
    <MuteToggle
      muted={props.muted ?? false}
      audioAvailable={props.audioAvailable ?? true}
      needsResume={props.needsResume}
      resumeHintId={props.resumeHintId ?? 'mute-toggle-resume-hint'}
      strings={props.strings ?? EN_STRINGS_FIXTURE.practice.mute}
      onToggle={onToggle}
    />,
  )
  return { ...utils, onToggle }
}

describe('MuteToggle', () => {
  it('when muted=false and audioAvailable=true, aria-pressed is "false" and accessible name is "Mute audio cues"', () => {
    renderToggle({ muted: false, audioAvailable: true })
    const button = screen.getByRole('button', { name: 'Mute audio cues' })
    expect(button.getAttribute('aria-pressed')).toBe('false')
  })

  it('when muted=true and audioAvailable=true, aria-pressed is "true" and accessible name is "Unmute audio cues"', () => {
    renderToggle({ muted: true, audioAvailable: true })
    const button = screen.getByRole('button', { name: 'Unmute audio cues' })
    expect(button.getAttribute('aria-pressed')).toBe('true')
  })

  it('when audioAvailable=false, button is disabled and accessible name is "Audio unavailable in this browser"', () => {
    renderToggle({ audioAvailable: false })
    const button = screen.getByRole('button', { name: 'Audio unavailable in this browser' })
    expect(button).toBeDisabled()
  })

  it('when audioAvailable=false, the title attribute is "Audio unavailable in this browser" (D-10 tooltip)', () => {
    renderToggle({ audioAvailable: false })
    const button = screen.getByRole('button', { name: 'Audio unavailable in this browser' })
    expect(button.getAttribute('title')).toBe('Audio unavailable in this browser')
  })

  it('clicking while audioAvailable=true invokes onToggle exactly once', async () => {
    const user = userEvent.setup()
    const { onToggle } = renderToggle({ muted: false, audioAvailable: true })
    await user.click(screen.getByRole('button', { name: 'Mute audio cues' }))
    expect(onToggle).toHaveBeenCalledTimes(1)
  })

  it('clicking while audioAvailable=false does NOT invoke onToggle (button is disabled)', async () => {
    const user = userEvent.setup()
    const { onToggle } = renderToggle({ audioAvailable: false })
    await user.click(screen.getByRole('button', { name: 'Audio unavailable in this browser' }))
    expect(onToggle).not.toHaveBeenCalled()
  })

  // Resume-audio accessible-name tests:
  it('when needsResume=true and audioAvailable=true, accessible name is "Resume audio" and aria-pressed is absent', () => {
    renderToggle({ needsResume: true, muted: false, audioAvailable: true })
    const button = screen.getByRole('button', { name: 'Resume audio' })
    expect(button.hasAttribute('aria-pressed')).toBe(false)
  })

  it('needsResume=true takes priority over muted in the accessible name (Plan 06 D-32 priority)', () => {
    renderToggle({ needsResume: true, muted: true, audioAvailable: true })
    const button = screen.getByRole('button', { name: 'Resume audio' })
    expect(button.getAttribute('aria-label')).toBe('Resume audio')
  })

  it('audioAvailable=false takes priority over needsResume (Phase 3 D-10 outranks D-32)', () => {
    renderToggle({ needsResume: true, audioAvailable: false })
    const button = screen.getByRole('button', { name: 'Audio unavailable in this browser' })
    expect(button.getAttribute('aria-label')).toBe('Audio unavailable in this browser')
    expect(button).toBeDisabled()
  })

  // aria-describedby conditional on needsResume.
  it('needsResume=true → button has aria-describedby set to resumeHintId', () => {
    renderToggle({ needsResume: true, resumeHintId: 'x', audioAvailable: true })
    const button = screen.getByRole('button', { name: 'Resume audio' })
    expect(button).toHaveAttribute('aria-describedby', 'x')
  })

  it('needsResume=false → button has NO aria-describedby attribute', () => {
    renderToggle({ needsResume: false, resumeHintId: 'x', muted: false, audioAvailable: true })
    const button = screen.getByRole('button', { name: 'Mute audio cues' })
    expect(button).not.toHaveAttribute('aria-describedby')
  })
})
