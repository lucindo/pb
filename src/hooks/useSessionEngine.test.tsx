import { act, renderHook } from '@testing-library/react'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

import type { SessionSettings } from '../domain/settings'
import { useSessionEngine } from './useSessionEngine'

const defaultSettings: SessionSettings = {
  bpm: 5.5,
  ratio: '40:60',
  durationMinutes: 10,
}

describe('useSessionEngine', () => {
  beforeEach(() => {
    vi.useFakeTimers()
    vi.setSystemTime(new Date('2026-05-09T00:00:00.000Z'))
  })

  afterEach(() => {
    vi.useRealTimers()
  })

  it('starts from idle and immediately exposes an In frame', () => {
    const { result, unmount } = renderHook(() => useSessionEngine(defaultSettings))

    act(() => {
      result.current.start()
    })

    expect(result.current.state.status).toBe('running')
    expect(result.current.currentFrame?.phaseLabel).toBe('In')

    unmount()
  })

  it('advances from In to Out from one monotonic elapsed-time source', () => {
    const { result, unmount } = renderHook(() => useSessionEngine(defaultSettings))

    act(() => {
      result.current.start()
    })
    act(() => {
      vi.advanceTimersByTime(5_000)
    })

    expect(result.current.currentFrame?.phaseLabel).toBe('Out')
    expect(result.current.currentFrame?.elapsedMs).toBeGreaterThanOrEqual(5_000)

    unmount()
  })

  it('ends a running session by returning idle and clearing the current frame while preserving settings', () => {
    const { result, unmount } = renderHook(() => useSessionEngine(defaultSettings))

    act(() => {
      result.current.start()
    })
    act(() => {
      result.current.end()
    })

    expect(result.current.state).toEqual({
      status: 'idle',
      selectedSettings: defaultSettings,
    })
    expect(result.current.currentFrame).toBeNull()

    unmount()
  })

  it('transitions a timed session to complete with the required message', () => {
    const { result, unmount } = renderHook(() =>
      useSessionEngine({ ...defaultSettings, durationMinutes: 5 }),
    )

    act(() => {
      result.current.start()
    })
    act(() => {
      vi.advanceTimersByTime(5 * 60_000)
    })

    expect(result.current.state.status).toBe('complete')
    if (result.current.state.status !== 'complete') {
      throw new Error('Expected complete state')
    }
    expect(result.current.state.message).toBe('Session complete')
    expect(result.current.currentFrame).toBeNull()

    unmount()
  })

  it('extends only timed running sessions to greater finite durations', () => {
    const timed = renderHook(() => useSessionEngine({ ...defaultSettings, durationMinutes: 10 }))

    act(() => {
      timed.result.current.start()
    })
    act(() => {
      timed.result.current.extendDuration(15)
    })

    expect(timed.result.current.state.status).toBe('running')
    if (timed.result.current.state.status !== 'running') {
      throw new Error('Expected timed running state')
    }
    expect(timed.result.current.state.selectedSettings.durationMinutes).toBe(15)
    expect(timed.result.current.state.plan.totalMs).toBe(15 * 60_000)

    act(() => {
      timed.result.current.extendDuration(15)
      timed.result.current.extendDuration(10)
    })
    expect(timed.result.current.state.selectedSettings.durationMinutes).toBe(15)
    timed.unmount()

    const openEnded = renderHook(() =>
      useSessionEngine({ ...defaultSettings, durationMinutes: 'open-ended' }),
    )
    act(() => {
      openEnded.result.current.start()
    })
    act(() => {
      openEnded.result.current.extendDuration(60)
    })
    expect(openEnded.result.current.state.status).toBe('running')
    if (openEnded.result.current.state.status !== 'running') {
      throw new Error('Expected open-ended running state')
    }
    expect(openEnded.result.current.state.selectedSettings.durationMinutes).toBe('open-ended')
    openEnded.unmount()
  })
})
