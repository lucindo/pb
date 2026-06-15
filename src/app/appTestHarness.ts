import { act, fireEvent, screen } from '@testing-library/react'
import { vi } from 'vitest'

import { LEAD_IN_DURATION_MS } from '../audio/audioEngine'
import { STATE_KEY } from '../storage'

export const APP_TEST_NOW = new Date('2026-05-09T00:00:00.000Z')
export const APP_LEAD_IN_MS = LEAD_IN_DURATION_MS

// After J10 the per-practice settings forms live inside the SettingsSheet,
// which only mounts its children when open. Auto-open the sheet (by clicking
// the SetupCard) when a requested group is not yet visible.
export function settingGroup(name: string): HTMLElement {
  let group = screen.queryByRole('group', { name })
  if (group !== null) return group
  const card = screen.queryByRole('button', { name: /^Edit .* settings$/ })
  if (card !== null) fireEvent.click(card)
  group = screen.queryByRole('group', { name })
  if (group === null) throw new Error(`settingGroup: group "${name}" not found`)
  return group
}

export function sessionReadout(): HTMLElement {
  return screen.getByRole('region', { name: 'Session readout' })
}

export function clickStartSession(): void {
  fireEvent.click(screen.getByRole('button', { name: 'Start' }))
}

export async function flushMicrotasks(): Promise<void> {
  await act(async () => {
    await Promise.resolve()
    await Promise.resolve()
  })
}

export async function startLeadIn(): Promise<void> {
  clickStartSession()
  await flushMicrotasks()
}

export async function startAndAdvancePastLeadIn(): Promise<void> {
  clickStartSession()
  await act(async () => {
    await Promise.resolve()
    await Promise.resolve()
    vi.advanceTimersByTime(APP_LEAD_IN_MS)
  })
}

export async function advanceTime(ms: number): Promise<void> {
  await act(async () => {
    vi.advanceTimersByTime(ms)
    await Promise.resolve()
  })
}

export function readStoredEnvelope(): Record<string, unknown> | null {
  const raw = window.localStorage.getItem(STATE_KEY)
  return raw ? (JSON.parse(raw) as Record<string, unknown>) : null
}
