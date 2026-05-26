import { act, renderHook } from '@testing-library/react'
import { describe, expect, it } from 'vitest'

import { useAppNavigation, type UseAppNavigationArgs } from './useAppNavigation'

function renderNavigation(args: UseAppNavigationArgs) {
  return renderHook((props: UseAppNavigationArgs) => useAppNavigation(props), {
    initialProps: args,
  })
}

describe('useAppNavigation', () => {
  it('defaults to the practice screen', () => {
    const { result } = renderNavigation({
      controlsDisabled: false,
      closeOnSessionView: false,
    })
    expect(result.current.appScreen).toBe('practice')
  })

  it('navigates to learn and back to practice', () => {
    const { result } = renderNavigation({
      controlsDisabled: false,
      closeOnSessionView: false,
    })

    act(() => {
      result.current.onLearnOpen()
    })
    expect(result.current.appScreen).toBe('learn')

    act(() => {
      result.current.onBackToPractice()
    })
    expect(result.current.appScreen).toBe('practice')
  })

  it('navigates to appSettings and back to practice', () => {
    const { result } = renderNavigation({
      controlsDisabled: false,
      closeOnSessionView: false,
    })

    act(() => {
      result.current.onSettingsOpen()
    })
    expect(result.current.appScreen).toBe('appSettings')

    act(() => {
      result.current.onBackToPractice()
    })
    expect(result.current.appScreen).toBe('practice')
  })

  it('refuses to navigate away from practice while controls are disabled', () => {
    const { result } = renderNavigation({
      controlsDisabled: true,
      closeOnSessionView: false,
    })

    act(() => {
      result.current.onLearnOpen()
      result.current.onSettingsOpen()
    })

    expect(result.current.appScreen).toBe('practice')
  })

  it('forcibly returns to practice when the session view becomes active', () => {
    const { result, rerender } = renderNavigation({
      controlsDisabled: false,
      closeOnSessionView: false,
    })

    act(() => {
      result.current.onLearnOpen()
    })
    expect(result.current.appScreen).toBe('learn')

    rerender({
      controlsDisabled: true,
      closeOnSessionView: true,
    })

    expect(result.current.appScreen).toBe('practice')
  })

  it('navigates from appSettings to appearance via onAppearanceOpen', () => {
    const { result } = renderNavigation({ controlsDisabled: false, closeOnSessionView: false })

    act(() => {
      result.current.onSettingsOpen()
    })
    act(() => {
      result.current.onAppearanceOpen()
    })

    expect(result.current.appScreen).toBe('appearance')
  })

  it('onBackToAppSettings returns to appSettings with returningFromAppearance=true', () => {
    const { result } = renderNavigation({ controlsDisabled: false, closeOnSessionView: false })

    act(() => {
      result.current.onSettingsOpen()
    })
    act(() => {
      result.current.onAppearanceOpen()
    })
    act(() => {
      result.current.onBackToAppSettings()
    })

    expect(result.current.appScreen).toBe('appSettings')
    expect(result.current.returningFromAppearance).toBe(true)
  })

  it('subsequent navigation clears returningFromAppearance', () => {
    const { result } = renderNavigation({ controlsDisabled: false, closeOnSessionView: false })

    act(() => {
      result.current.onSettingsOpen()
    })
    act(() => {
      result.current.onAppearanceOpen()
    })
    act(() => {
      result.current.onBackToAppSettings()
    })
    expect(result.current.returningFromAppearance).toBe(true)

    act(() => {
      result.current.onBackToPractice()
    })

    expect(result.current.returningFromAppearance).toBe(false)
  })

  it('closeOnSessionView forces appearance → practice', () => {
    const { result, rerender } = renderNavigation({
      controlsDisabled: false,
      closeOnSessionView: false,
    })

    act(() => {
      result.current.onSettingsOpen()
    })
    act(() => {
      result.current.onAppearanceOpen()
    })
    expect(result.current.appScreen).toBe('appearance')

    rerender({
      controlsDisabled: false,
      closeOnSessionView: true,
    })

    expect(result.current.appScreen).toBe('practice')
  })

  it('closeOnSessionView clears returningFromAppearance sentinel when previously set', () => {
    const { result, rerender } = renderNavigation({
      controlsDisabled: false,
      closeOnSessionView: false,
    })

    // Drive the sentinel to true via the real flow: open appSettings →
    // appearance → back-to-appSettings sets returningFromAppearance=true.
    // This is the only state in which the sentinel is observable as `true`.
    act(() => {
      result.current.onSettingsOpen()
    })
    act(() => {
      result.current.onAppearanceOpen()
    })
    act(() => {
      result.current.onBackToAppSettings()
    })
    expect(result.current.returningFromAppearance).toBe(true)
    expect(result.current.appScreen).toBe('appSettings')

    // Now closeOnSessionView=true must both route to practice AND
    // clear the sentinel. Without the setReturningFromAppearance(false)
    // line in the effect, this assertion would fail.
    rerender({
      controlsDisabled: false,
      closeOnSessionView: true,
    })

    expect(result.current.appScreen).toBe('practice')
    expect(result.current.returningFromAppearance).toBe(false)
  })
})
