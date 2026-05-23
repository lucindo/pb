import { act, renderHook } from '@testing-library/react'
import { describe, expect, it } from 'vitest'

import { useAppDialogs, type UseAppDialogsArgs } from './useAppDialogs'

function renderDialogs(args: UseAppDialogsArgs) {
  return renderHook((props: UseAppDialogsArgs) => useAppDialogs(props), {
    initialProps: args,
  })
}

describe('useAppDialogs', () => {
  it('opens and closes learn/settings dialogs when controls are enabled', () => {
    const { result } = renderDialogs({
      controlsDisabled: false,
      closeOnSessionView: false,
    })

    act(() => {
      result.current.onLearnOpen()
      result.current.onSettingsOpen()
    })

    expect(result.current.learnOpen).toBe(true)
    expect(result.current.settingsOpen).toBe(true)

    act(() => {
      result.current.onLearnClose()
      result.current.onSettingsClose()
    })

    expect(result.current.learnOpen).toBe(false)
    expect(result.current.settingsOpen).toBe(false)
  })

  it('does not open dialogs while controls are disabled', () => {
    const { result } = renderDialogs({
      controlsDisabled: true,
      closeOnSessionView: false,
    })

    act(() => {
      result.current.onLearnOpen()
      result.current.onSettingsOpen()
    })

    expect(result.current.learnOpen).toBe(false)
    expect(result.current.settingsOpen).toBe(false)
  })

  it('closes both dialogs when the session view becomes active', () => {
    const { result, rerender } = renderDialogs({
      controlsDisabled: false,
      closeOnSessionView: false,
    })

    act(() => {
      result.current.onLearnOpen()
      result.current.onSettingsOpen()
    })

    rerender({
      controlsDisabled: true,
      closeOnSessionView: true,
    })

    expect(result.current.learnOpen).toBe(false)
    expect(result.current.settingsOpen).toBe(false)
  })
})
