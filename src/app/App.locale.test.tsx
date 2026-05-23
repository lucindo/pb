import '@testing-library/jest-dom/vitest'

import { act, render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { afterEach, beforeEach, describe, expect, it } from 'vitest'

import App from './App'
import { STATE_KEY } from '../storage'
import { UI_STRINGS } from '../content/strings'
import type { UserPrefs } from '../storage'

// ---------------------------------------------------------------------------
// Helper: seed localStorage with a full prefs envelope before App renders.
// The Envelope shape is { version: 1, prefs: UserPrefs }.
// ---------------------------------------------------------------------------
function seedPrefs(prefs: UserPrefs): void {
  window.localStorage.setItem(STATE_KEY, JSON.stringify({ version: 1, prefs }))
}

const DEFAULT_FULL_PREFS: UserPrefs = {
  theme: 'system',
  timbre: 'bowl',
  cue: 'labels',
  locale: 'en',
}

// Global setup / teardown — localStorage is cleared by vitest.setup.ts beforeEach
// but we also reset documentElement.lang explicitly to ensure test isolation.
beforeEach(() => {
  window.localStorage.clear()
  document.documentElement.lang = ''
})

afterEach(() => {
  window.localStorage.clear()
  document.documentElement.lang = ''
})

// ---------------------------------------------------------------------------
// App locale switching (Phase 19)
// ---------------------------------------------------------------------------
describe('App locale switching (Phase 19)', () => {
  // -------------------------------------------------------------------------
  // Test 1: writes documentElement.lang on mount with seeded EN locale
  // -------------------------------------------------------------------------
  it('writes documentElement.lang on mount with seeded EN locale', () => {
    seedPrefs({ ...DEFAULT_FULL_PREFS, locale: 'en' })
    render(<App />)
    expect(document.documentElement.lang).toBe('en')
  })

  // -------------------------------------------------------------------------
  // Test 2: writes documentElement.lang on mount with seeded PT-BR locale
  // -------------------------------------------------------------------------
  it('writes documentElement.lang on mount with seeded PT-BR locale', () => {
    seedPrefs({ ...DEFAULT_FULL_PREFS, locale: 'pt-BR' })
    render(<App />)
    expect(document.documentElement.lang).toBe('pt-BR')
  })

  // -------------------------------------------------------------------------
  // Test 3: switches UI strings + documentElement.lang when LanguagePicker
  // PT-BR is clicked via SettingsDialog
  // -------------------------------------------------------------------------
  it('switches UI strings + documentElement.lang when LanguagePicker PT-BR is clicked', async () => {
    seedPrefs({ ...DEFAULT_FULL_PREFS, locale: 'en' })
    const user = userEvent.setup()
    render(<App />)

    // Confirm EN on mount
    expect(document.documentElement.lang).toBe('en')

    // Navigate to the Settings page via the gear anchor (aria-label = EN 'Settings').
    // Post Item-D refactor: this routes to AppSettingsPage (full-page surface) instead
    // of opening a modal SettingsDialog.
    await user.click(screen.getByRole('button', { name: UI_STRINGS.en.anchors.settings }))

    // Find PT-BR radio button (native endonym — always 'Português (Brasil)' regardless of UI locale)
    const ptBrButton = screen.getByRole('radio', { name: 'Português (Brasil)' })
    await user.click(ptBrButton)

    // documentElement.lang must be updated
    expect(document.documentElement.lang).toBe('pt-BR')

    // Navigate back to practice via the back button (aria-label now reflects the
    // newly-active PT-BR locale's settings.close string). The Start-session button
    // is only mounted on the practice surface, so we have to return there to
    // assert the locale propagated across surfaces.
    await user.click(screen.getByRole('button', { name: UI_STRINGS['pt-BR'].settings.close }))

    // At least one PT-BR idle-state string must be rendered: the Start-session button
    expect(
      screen.getByRole('button', { name: UI_STRINGS['pt-BR'].controls.startSession }),
    ).toBeInTheDocument()
  })

  // -------------------------------------------------------------------------
  // Test 4: cross-tab storage event updates locale even without picker interaction
  // -------------------------------------------------------------------------
  it('cross-tab storage event updates documentElement.lang to pt-BR', () => {
    seedPrefs({ ...DEFAULT_FULL_PREFS, locale: 'en' })
    render(<App />)

    // Confirm EN on mount
    expect(document.documentElement.lang).toBe('en')

    // Simulate cross-tab write: another tab changes prefs.locale to 'pt-BR' in localStorage
    // and the browser fires the 'storage' event on this tab's window.
    const ptBrEnvelope = JSON.stringify({ version: 1, prefs: { ...DEFAULT_FULL_PREFS, locale: 'pt-BR' } })
    act(() => {
      window.localStorage.setItem(STATE_KEY, ptBrEnvelope)
      window.dispatchEvent(
        new StorageEvent('storage', { key: STATE_KEY, newValue: ptBrEnvelope, oldValue: null }),
      )
    })

    expect(document.documentElement.lang).toBe('pt-BR')
  })

  // -------------------------------------------------------------------------
  // Test 5: locale picker buttons are disabled while inSessionView
  // -------------------------------------------------------------------------
  it('locale picker buttons are disabled when SettingsDialog is opened in-session', async () => {
    // Phase 15 D-08: SettingsDialog auto-closes on inSessionView (App.tsx WR-09 useEffect).
    // Strategy: open SettingsDialog in idle state, confirm pickers are enabled, then close,
    // start a session (lead-in), and confirm the SettingsAnchor becomes disabled — which is
    // the enforceable surface for the in-session lock (the dialog would auto-close even if
    // somehow opened while inSessionView).
    seedPrefs({ ...DEFAULT_FULL_PREFS, locale: 'en' })
    const user = userEvent.setup()
    render(<App />)

    // Pre-session idle: confirm SettingsAnchor shows the active label
    expect(
      screen.getByRole('button', { name: UI_STRINGS.en.anchors.settings }),
    ).toBeInTheDocument()

    // Open SettingsDialog and verify LanguagePicker buttons are ENABLED
    await user.click(screen.getByRole('button', { name: UI_STRINGS.en.anchors.settings }))
    const enButton = screen.getByRole('radio', { name: 'English' })
    const ptBrButton = screen.getByRole('radio', { name: 'Português (Brasil)' })
    expect(enButton).not.toBeDisabled()
    expect(ptBrButton).not.toBeDisabled()

    // Close the dialog
    await user.click(screen.getByRole('button', { name: UI_STRINGS.en.settings.close }))

    // Start a session (click Start — onStartClick is async; flush one microtask tick)
    await user.click(screen.getByRole('button', { name: UI_STRINGS.en.controls.startSession }))
    await act(async () => {
      await Promise.resolve()
    })

    // After session start (appPhase = 'lead-in') the SettingsAnchor switches to the disabled
    // label variant (Phase 15 D-08: disabled={inSessionView}).
    // The disabled gear anchor MUST be present and the active-label variant MUST be absent.
    expect(
      screen.getByRole('button', { name: UI_STRINGS.en.anchors.settingsDisabled }),
    ).toBeInTheDocument()
    expect(
      screen.queryByRole('button', { name: UI_STRINGS.en.anchors.settings }),
    ).not.toBeInTheDocument()
  })
})
