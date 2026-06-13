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

  it('navigates from appSettings to advanced via onAdvancedOpen', () => {
    const { result } = renderNavigation({ controlsDisabled: false, closeOnSessionView: false })

    act(() => {
      result.current.onSettingsOpen()
    })
    act(() => {
      result.current.onAdvancedOpen()
    })

    expect(result.current.appScreen).toBe('advanced')
  })

  it('onBackFromAdvanced returns to appSettings with returningFromAdvanced=true', () => {
    const { result } = renderNavigation({ controlsDisabled: false, closeOnSessionView: false })

    act(() => {
      result.current.onSettingsOpen()
    })
    act(() => {
      result.current.onAdvancedOpen()
    })
    act(() => {
      result.current.onBackFromAdvanced()
    })

    expect(result.current.appScreen).toBe('appSettings')
    expect(result.current.returningFrom).toBe('advanced')
  })

  it('subsequent navigation clears returningFromAdvanced', () => {
    const { result } = renderNavigation({ controlsDisabled: false, closeOnSessionView: false })

    act(() => {
      result.current.onSettingsOpen()
    })
    act(() => {
      result.current.onAdvancedOpen()
    })
    act(() => {
      result.current.onBackFromAdvanced()
    })
    expect(result.current.returningFrom).toBe('advanced')

    act(() => {
      result.current.onBackToPractice()
    })

    expect(result.current.returningFrom).toBe(null)
  })

  it('closeOnSessionView forces advanced → practice', () => {
    const { result, rerender } = renderNavigation({
      controlsDisabled: false,
      closeOnSessionView: false,
    })

    act(() => {
      result.current.onSettingsOpen()
    })
    act(() => {
      result.current.onAdvancedOpen()
    })
    expect(result.current.appScreen).toBe('advanced')

    rerender({
      controlsDisabled: false,
      closeOnSessionView: true,
    })

    expect(result.current.appScreen).toBe('practice')
  })

  it('closeOnSessionView clears returningFromAdvanced sentinel when previously set', () => {
    const { result, rerender } = renderNavigation({
      controlsDisabled: false,
      closeOnSessionView: false,
    })

    // Drive the sentinel to true via the real flow: open appSettings →
    // advanced → back-to-appSettings sets returningFromAdvanced=true.
    // This is the only state in which the sentinel is observable as `true`.
    act(() => {
      result.current.onSettingsOpen()
    })
    act(() => {
      result.current.onAdvancedOpen()
    })
    act(() => {
      result.current.onBackFromAdvanced()
    })
    expect(result.current.returningFrom).toBe('advanced')
    expect(result.current.appScreen).toBe('appSettings')

    // Now closeOnSessionView=true must both route to practice AND
    // clear the sentinel. Without the setReturningFrom(null) line in the
    // effect, this assertion would fail.
    rerender({
      controlsDisabled: false,
      closeOnSessionView: true,
    })

    expect(result.current.appScreen).toBe('practice')
    expect(result.current.returningFrom).toBe(null)
  })

  it('navigates to stats via onStatsOpen and back to appSettings with returningFromStats=true', () => {
    const { result } = renderNavigation({
      controlsDisabled: false,
      closeOnSessionView: false,
    })

    act(() => {
      result.current.onStatsOpen()
    })
    expect(result.current.appScreen).toBe('stats')

    act(() => {
      result.current.onBackFromStats()
    })
    expect(result.current.appScreen).toBe('appSettings')
    expect(result.current.returningFrom).toBe('stats')
  })

  it('onStatsOpen is gated by controlsDisabled (no leaving mid-session)', () => {
    const { result } = renderNavigation({
      controlsDisabled: true,
      closeOnSessionView: false,
    })

    act(() => {
      result.current.onStatsOpen()
    })
    expect(result.current.appScreen).toBe('practice')
  })

  it('subsequent navigation clears returningFromStats', () => {
    const { result } = renderNavigation({
      controlsDisabled: false,
      closeOnSessionView: false,
    })

    act(() => {
      result.current.onStatsOpen()
    })
    act(() => {
      result.current.onBackFromStats()
    })
    expect(result.current.returningFrom).toBe('stats')

    act(() => {
      result.current.onSettingsOpen()
    })
    expect(result.current.returningFrom).toBe(null)
  })
})
