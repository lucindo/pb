import '@testing-library/jest-dom/vitest'
import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { describe, expect, it, vi } from 'vitest'

import { SessionControls, type SessionControlsProps } from './SessionControls'
import { UI_STRINGS } from '../content/strings'

const EN_STRINGS_FIXTURE = UI_STRINGS.en

function renderControlsWithMute(props: Partial<SessionControlsProps> = {}) {
  const onStart = props.onStart ?? vi.fn()
  const onEnd = props.onEnd ?? vi.fn()
  const onMuteToggle = props.onMuteToggle ?? vi.fn()
  const utils = render(
    <SessionControls
      status={props.status ?? 'idle'}
      onStart={onStart}
      onEnd={onEnd}
      strings={props.strings ?? EN_STRINGS_FIXTURE.controls}
      muted={props.muted ?? false}
      audioAvailable={props.audioAvailable ?? true}
      onMuteToggle={onMuteToggle}
    />,
  )
  return { ...utils, onStart, onEnd, onMuteToggle }
}

function renderControlsLegacy(
  props: { status?: SessionControlsProps['status']; onStart?: () => void; onEnd?: () => void } = {},
) {
  // Mirrors the Phase 1/2 App.tsx invocation — only the original three props.
  const onStart = props.onStart ?? vi.fn()
  const onEnd = props.onEnd ?? vi.fn()
  const utils = render(
    <SessionControls
      status={props.status ?? 'idle'}
      onStart={onStart}
      onEnd={onEnd}
      strings={EN_STRINGS_FIXTURE.controls}
    />,
  )
  return { ...utils, onStart, onEnd }
}

describe('SessionControls', () => {
  it('renders the primary Start/End button with verbatim Phase 1 copy on both branches', () => {
    // New-props branch
    const { unmount: unmountIdle } = renderControlsWithMute({ status: 'idle' })
    expect(screen.getByRole('button', { name: 'Start session' })).toBeVisible()
    unmountIdle()

    const { unmount: unmountRunning } = renderControlsWithMute({ status: 'running' })
    expect(screen.getByRole('button', { name: 'End session' })).toBeVisible()
    unmountRunning()

    // Legacy branch (Phase 1/2 invocation pattern)
    const { unmount: unmountLegacyIdle } = renderControlsLegacy({ status: 'idle' })
    expect(screen.getByRole('button', { name: 'Start session' })).toBeVisible()
    unmountLegacyIdle()

    renderControlsLegacy({ status: 'running' })
    expect(screen.getByRole('button', { name: 'End session' })).toBeVisible()
  })

  it('when all three audio props are provided, hosts MuteToggle next to the primary button (D-05) in BOTH idle and running states', () => {
    const { container: idleContainer, unmount: unmountIdle } = renderControlsWithMute({
      status: 'idle',
    })
    expect(screen.getByRole('button', { name: 'Start session' })).toBeVisible()
    expect(screen.getByRole('button', { name: 'Mute audio cues' })).toBeVisible()
    expect(idleContainer.querySelector('.mt-6.flex')).not.toBeNull()
    unmountIdle()

    const { container: runningContainer } = renderControlsWithMute({ status: 'running' })
    expect(screen.getByRole('button', { name: 'End session' })).toBeVisible()
    expect(screen.getByRole('button', { name: 'Mute audio cues' })).toBeVisible()
    expect(runningContainer.querySelector('.mt-6.flex')).not.toBeNull()
  })

  it('forwards muted prop to MuteToggle (aria-pressed reflects)', () => {
    renderControlsWithMute({ muted: true })
    const button = screen.getByRole('button', { name: 'Unmute audio cues' })
    expect(button.getAttribute('aria-pressed')).toBe('true')
  })

  it('forwards audioAvailable=false to MuteToggle (disabled state reflects)', () => {
    renderControlsWithMute({ audioAvailable: false })
    expect(
      screen.getByRole('button', { name: 'Audio unavailable in this browser' }),
    ).toBeDisabled()
  })

  it('clicking MuteToggle invokes onMuteToggle (NOT onStart/onEnd)', async () => {
    const user = userEvent.setup()
    const { onStart, onEnd, onMuteToggle } = renderControlsWithMute({ status: 'idle' })
    await user.click(screen.getByRole('button', { name: 'Mute audio cues' }))
    expect(onMuteToggle).toHaveBeenCalledTimes(1)
    expect(onStart).not.toHaveBeenCalled()
    expect(onEnd).not.toHaveBeenCalled()
  })

  it('clicking primary button invokes onStart when idle, onEnd when running (Phase 1 behavior preserved)', async () => {
    const user = userEvent.setup()
    const idle = renderControlsWithMute({ status: 'idle' })
    await user.click(screen.getByRole('button', { name: 'Start session' }))
    expect(idle.onStart).toHaveBeenCalledTimes(1)
    expect(idle.onEnd).not.toHaveBeenCalled()
    idle.unmount()

    const running = renderControlsWithMute({ status: 'running' })
    await user.click(screen.getByRole('button', { name: 'End session' }))
    expect(running.onEnd).toHaveBeenCalledTimes(1)
    expect(running.onStart).not.toHaveBeenCalled()
  })

  it('BACKWARDS-COMPAT: when audio props are omitted, MuteToggle is NOT rendered and primary button uses legacy mt-6/w-full classes', () => {
    renderControlsLegacy({ status: 'idle' })
    expect(
      screen.queryByRole('button', {
        name: /Mute audio cues|Unmute audio cues|Audio unavailable/,
      }),
    ).toBeNull()
    const primary = screen.getByRole('button', { name: 'Start session' })
    expect(primary.className).toMatch(/mt-6/)
    expect(primary.className).toMatch(/w-full/)
    expect(primary.className).not.toMatch(/flex-1/)
  })

  it('PARTIAL-PROPS GUARD: when only some audio props are provided (e.g. muted only), MuteToggle is still NOT rendered (gate is "all three defined")', () => {
    render(
      <SessionControls
        status="idle"
        onStart={vi.fn()}
        onEnd={vi.fn()}
        strings={EN_STRINGS_FIXTURE.controls}
        muted={true}
      />,
    )
    expect(
      screen.queryByRole('button', {
        name: /Mute audio cues|Unmute audio cues|Audio unavailable/,
      }),
    ).toBeNull()
    const primary = screen.getByRole('button', { name: 'Start session' })
    expect(primary.className).toMatch(/mt-6/)
    expect(primary.className).toMatch(/w-full/)
  })

  it('Phase 3 layout: primary button uses flex-1 and does NOT carry mt-6 or w-full (those moved to wrapper)', () => {
    renderControlsWithMute({ status: 'idle' })
    const primary = screen.getByRole('button', { name: 'Start session' })
    expect(primary.className).toMatch(/flex-1/)
    expect(primary).not.toHaveClass('mt-6')
    expect(primary).not.toHaveClass('w-full')
  })
})
