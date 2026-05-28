import { afterEach, describe, expect, it, vi } from 'vitest'
import { renderHook } from '@testing-library/react'

import { useAmbientScale } from './useAmbientScale'
import { createWallSessionClock } from '../audio/sessionClock'
import { MID_SCALE } from '../components/shapeConstants'

afterEach(() => {
  vi.restoreAllMocks()
})

describe('useAmbientScale', () => {
  it('returns MID_SCALE when inactive', () => {
    const wallClock = createWallSessionClock()
    const { result } = renderHook(() => useAmbientScale(false, wallClock))
    expect(result.current).toBe(MID_SCALE)
  })

  it('returns MID_SCALE when active but prefers-reduced-motion is set', () => {
    // Reason: cast documents the intended stub shape; vi.spyOn types accept the original type internally.
    // eslint-disable-next-line @typescript-eslint/no-unnecessary-type-assertion
    vi.spyOn(window, 'matchMedia').mockReturnValue({
      matches: true,
      media: '(prefers-reduced-motion: reduce)',
      onchange: null,
      addEventListener: () => {},
      removeEventListener: () => {},
      addListener: () => {},
      removeListener: () => {},
      dispatchEvent: () => false,
    } as unknown as MediaQueryList)

    const wallClock = createWallSessionClock()
    const { result } = renderHook(() => useAmbientScale(true, wallClock))
    expect(result.current).toBe(MID_SCALE)
  })

  it('initial scale before rAF tick is MID_SCALE (active + normal motion)', () => {
    // We don't test rAF ticking here — that would require fake timers + careful
    // rAF stubbing, and the math is straightforward enough to read directly in
    // useAmbientScale.ts. We only assert the initial state, which is MID_SCALE
    // before the first rAF callback fires.
    const wallClock = createWallSessionClock()
    const { result } = renderHook(() => useAmbientScale(true, wallClock))
    expect(result.current).toBe(MID_SCALE)
  })
})
