import { renderHook } from '@testing-library/react'
import { afterEach, describe, expect, it, vi } from 'vitest'

import * as nkCueSynth from '../audio/nkCueSynth'
import { useNaviKriyaAudio } from './useNaviKriyaAudio'

describe('useNaviKriyaAudio', () => {
  afterEach(() => {
    vi.unstubAllGlobals()
    vi.restoreAllMocks()
  })

  it('constructs AudioContext before reading the persisted timbre', () => {
    const OriginalAudioContext = window.AudioContext
    const calls: string[] = []
    const audioContextSpy = vi.fn(function (
      this: AudioContext,
      ...args: ConstructorParameters<typeof AudioContext>
    ) {
      calls.push('audio')
      return new OriginalAudioContext(...args)
    })
    vi.stubGlobal('AudioContext', audioContextSpy)

    const { result } = renderHook(() => useNaviKriyaAudio(false))

    result.current.begin(() => {
      calls.push('timbre')
      return 'sine'
    })

    expect(calls).toEqual(['audio', 'timbre'])
  })

  it('suppresses countdown ticks while muted', () => {
    const countdownSpy = vi.spyOn(nkCueSynth, 'scheduleCountdownTick')
    const { result } = renderHook(() => useNaviKriyaAudio(true))

    const audioSession = result.current.begin(() => 'sine')
    audioSession.countdownTick()

    expect(countdownSpy).not.toHaveBeenCalled()
  })

  it('closes a live AudioContext on unmount', () => {
    const OriginalAudioContext = window.AudioContext
    const audioContexts: AudioContext[] = []
    vi.stubGlobal(
      'AudioContext',
      vi.fn(function (this: AudioContext, ...args: ConstructorParameters<typeof AudioContext>) {
        const audioContext = new OriginalAudioContext(...args)
        audioContexts.push(audioContext)
        return audioContext
      }),
    )

    const { result, unmount } = renderHook(() => useNaviKriyaAudio(false))
    result.current.begin(() => 'sine')
    unmount()

    const audioContext = audioContexts[0]
    expect(audioContext).toBeDefined()
    if (audioContext === undefined) {
      throw new Error('AudioContext was not constructed')
    }
    const closeSpy = (audioContext as unknown as { close: ReturnType<typeof vi.fn> }).close
    expect(closeSpy).toHaveBeenCalled()
  })
})
