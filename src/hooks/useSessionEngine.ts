import { useCallback, useEffect, useMemo, useState } from 'react'

import type { SessionFrame } from '../domain/sessionMath'
import type { SessionSettings } from '../domain/settings'
import { DEFAULT_SETTINGS } from '../domain/settings'
import {
  completeIfNeeded,
  endSession,
  extendTimedSession,
  startSession,
  type SessionState,
} from '../domain/sessionController'

export interface SessionEngine {
  state: SessionState
  currentFrame: SessionFrame | null
  setSelectedSettings(this: void, settings: SessionSettings): void
  start(this: void): void
  end(this: void): void
  extendDuration(this: void, durationMinutes: number): void
}

export function useSessionEngine(initialSettings: SessionSettings = DEFAULT_SETTINGS): SessionEngine {
  const [state, setState] = useState<SessionState>(() => ({
    status: 'idle',
    selectedSettings: { ...initialSettings },
  }))

  useEffect(() => {
    if (state.status !== 'running') {
      return undefined
    }

    let animationFrameId = 0
    let cancelled = false

    const tick = () => {
      setState((currentState) => {
        if (currentState.status !== 'running') {
          return currentState
        }

        return completeIfNeeded(currentState, performance.now())
      })

      if (!cancelled) {
        animationFrameId = requestAnimationFrame(tick)
      }
    }

    animationFrameId = requestAnimationFrame(tick)

    return () => {
      cancelled = true
      cancelAnimationFrame(animationFrameId)
    }
  }, [state.status])

  const currentFrame = useMemo(
    () => (state.status === 'running' ? state.lastFrame : null),
    [state],
  )

  const setSelectedSettings = useCallback((settings: SessionSettings) => {
    setState((currentState) => {
      if (currentState.status === 'running') {
        return currentState
      }

      return {
        status: 'idle',
        selectedSettings: { ...settings },
      }
    })
  }, [])

  const start = useCallback(() => {
    setState((currentState) => {
      if (currentState.status === 'running') {
        return currentState
      }

      return startSession(currentState.selectedSettings, performance.now())
    })
  }, [])

  const end = useCallback(() => {
    setState((currentState) => {
      if (currentState.status === 'idle') {
        return currentState
      }

      return endSession(currentState)
    })
  }, [])

  const extendDuration = useCallback((durationMinutes: number) => {
    setState((currentState) => {
      if (currentState.status !== 'running') {
        return currentState
      }

      try {
        return extendTimedSession(currentState, durationMinutes)
      } catch (error) {
        if (error instanceof RangeError) {
          return currentState
        }

        throw error
      }
    })
  }, [])

  return {
    state,
    currentFrame,
    setSelectedSettings,
    start,
    end,
    extendDuration,
  }
}
