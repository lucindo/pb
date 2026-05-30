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
  it('renders a button (role="button")', () => {
    renderToggle()
    expect(screen.getByRole('button')).toBeInTheDocument()
  })

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

  it('renders a speaker SVG when muted=false (3 path elements) and a speaker-with-slash SVG when muted=true (2 line elements)', () => {
    const { container: containerOn, unmount: unmountOn } = render(
      <MuteToggle muted={false} audioAvailable={true} resumeHintId="mute-toggle-resume-hint" strings={EN_STRINGS_FIXTURE.practice.mute} onToggle={vi.fn()} />,
    )
    const svgOn = containerOn.querySelector('svg')
    expect(svgOn).not.toBeNull()
    expect(containerOn.querySelectorAll('svg path').length).toBe(3)
    unmountOn()

    const { container: containerOff } = render(
      <MuteToggle muted={true} audioAvailable={true} resumeHintId="mute-toggle-resume-hint" strings={EN_STRINGS_FIXTURE.practice.mute} onToggle={vi.fn()} />,
    )
    const svgOff = containerOff.querySelector('svg')
    expect(svgOff).not.toBeNull()
    expect(containerOff.querySelectorAll('svg line').length).toBe(2)
  })

  // Resume-audio accessible-name tests:
  it('when needsResume=true and audioAvailable=true, accessible name is "Resume audio" and aria-pressed is absent', () => {
    renderToggle({ needsResume: true, muted: false, audioAvailable: true })
    const button = screen.getByRole('button', { name: 'Resume audio' })
    expect(button.hasAttribute('aria-pressed')).toBe(false)
  })

  it('renders a refresh-arrow ResumeIcon (1 path + 1 polyline) when needsResume=true', () => {
    const { container } = render(
      <MuteToggle needsResume={true} muted={false} audioAvailable={true} resumeHintId="mute-toggle-resume-hint" strings={EN_STRINGS_FIXTURE.practice.mute} onToggle={vi.fn()} />,
    )
    const svg = container.querySelector('svg')
    expect(svg).not.toBeNull()
    // Reason: svg non-null asserted by expect().not.toBeNull() immediately above.
    // eslint-disable-next-line @typescript-eslint/no-non-null-assertion
    expect(svg!.querySelectorAll('path').length).toBe(1)
    // eslint-disable-next-line @typescript-eslint/no-non-null-assertion
    expect(svg!.querySelectorAll('polyline').length).toBe(1)
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
