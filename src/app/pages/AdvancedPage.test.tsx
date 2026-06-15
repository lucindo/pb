import '@testing-library/jest-dom/vitest'
import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

import { UI_STRINGS } from '../../content/strings'
import { UiStringsProvider } from '../../hooks/useUiStringsContext'
import { STATE_KEY } from '../../storage'
import { DEFAULT_PREFS } from '../../storage/prefs'
import { AdvancedPage } from './AdvancedPage'

function renderPage(props: Partial<{ onBack: () => void }> = {}) {
  const onBack = props.onBack ?? vi.fn()
  const utils = render(
    <UiStringsProvider value={UI_STRINGS.en}>
      <AdvancedPage onBack={onBack} />
    </UiStringsProvider>,
  )
  return { ...utils, onBack }
}

beforeEach(() => {
  window.localStorage.clear()
})

afterEach(() => {
  window.localStorage.clear()
  vi.restoreAllMocks()
})

describe('AdvancedPage', () => {
  it('renders the locked page title Advanced', () => {
    renderPage()
    expect(
      screen.getByRole('heading', { level: 1, name: UI_STRINGS.en.advanced.title }),
    ).toBeInTheDocument()
  })

  it('renders a back-chevron with the locked aria-label', () => {
    renderPage()
    expect(
      screen.getByRole('button', { name: UI_STRINGS.en.advanced.backChevron }),
    ).toBeInTheDocument()
  })

  it('invokes onBack when back-chevron is clicked', async () => {
    const user = userEvent.setup()
    const onBack = vi.fn()
    renderPage({ onBack })
    await user.click(screen.getByRole('button', { name: UI_STRINGS.en.advanced.backChevron }))
    expect(onBack).toHaveBeenCalledTimes(1)
  })

  it('renders a single switch for Bypass silent mode', () => {
    renderPage()
    const switches = screen.getAllByRole('switch')
    expect(switches).toHaveLength(1)
    expect(
      screen.getByRole('switch', { name: UI_STRINGS.en.advanced.bypassSilentMode.label }),
    ).toBeInTheDocument()
  })

  it('focuses the back-chevron on mount', () => {
    renderPage()
    expect(
      screen.getByRole('button', { name: UI_STRINGS.en.advanced.backChevron }),
    ).toHaveFocus()
  })

  describe('Phase 49.1 D-03 — Bypass silent mode toggle (ADV-03)', () => {
    it('Bypass silent mode defaults to ON (checked) for a fresh storage state (ADV-03)', () => {
      renderPage()
      expect(
        screen.getByRole('switch', { name: UI_STRINGS.en.advanced.bypassSilentMode.label }),
      ).toBeChecked()
    })

    it('writes bypassSilentMode=false to the prefs envelope when toggled off', async () => {
      // Default is bypassSilentMode=true; toggle OFF writes false.
      const user = userEvent.setup()
      renderPage()
      await user.click(
        screen.getByRole('switch', { name: UI_STRINGS.en.advanced.bypassSilentMode.label }),
      )
      const raw = window.localStorage.getItem(STATE_KEY)
      expect(raw).not.toBeNull()
      // eslint-disable-next-line @typescript-eslint/no-non-null-assertion
      const envelope = JSON.parse(raw!) as { prefs: typeof DEFAULT_PREFS }
      expect(envelope.prefs.bypassSilentMode).toBe(false)
    })
  })
})
