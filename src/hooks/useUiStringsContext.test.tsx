import '@testing-library/jest-dom/vitest'
import { render, renderHook, screen } from '@testing-library/react'
import { describe, expect, it, vi } from 'vitest'

import { UI_STRINGS } from '../content/strings'
import { UiStringsProvider, useUiStrings } from './useUiStringsContext'

describe('useUiStrings', () => {
  it('returns the value supplied by the nearest UiStringsProvider', () => {
    const { result } = renderHook(() => useUiStrings(), {
      wrapper: ({ children }) => (
        <UiStringsProvider value={UI_STRINGS.en}>{children}</UiStringsProvider>
      ),
    })
    expect(result.current).toBe(UI_STRINGS.en)
  })

  it('locale switches propagate through the provider', () => {
    function Probe() {
      const strings = useUiStrings()
      return <span data-testid="title">{strings.practice.title}</span>
    }

    const { rerender } = render(
      <UiStringsProvider value={UI_STRINGS.en}>
        <Probe />
      </UiStringsProvider>,
    )
    expect(screen.getByTestId('title')).toHaveTextContent(UI_STRINGS.en.practice.title)

    rerender(
      <UiStringsProvider value={UI_STRINGS['pt-BR']}>
        <Probe />
      </UiStringsProvider>,
    )
    expect(screen.getByTestId('title')).toHaveTextContent(UI_STRINGS['pt-BR'].practice.title)
  })

  it('throws when used outside a UiStringsProvider', () => {
    // Silence the React error boundary console output for this expected throw.
    const consoleError = vi.spyOn(console, 'error').mockImplementation(() => {})
    expect(() => renderHook(() => useUiStrings())).toThrow(
      /useUiStrings must be used within a <UiStringsProvider>/,
    )
    consoleError.mockRestore()
  })
})
