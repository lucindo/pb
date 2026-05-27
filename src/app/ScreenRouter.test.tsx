import '@testing-library/jest-dom/vitest'
import { render, screen } from '@testing-library/react'
import { describe, expect, it, vi } from 'vitest'

import type { AppViewModel } from './appViewModel'
import type { AppScreen } from './useAppNavigation'

vi.mock('./PracticeScreen', () => ({
  PracticeScreen: () => <div data-testid="practice-screen" />,
}))
vi.mock('./pages/LearnPage', () => ({
  LearnPage: () => <div data-testid="learn-page" />,
}))
vi.mock('./pages/AppSettingsPage', () => ({
  AppSettingsPage: () => <div data-testid="app-settings-page" />,
}))
vi.mock('./pages/AdvancedPage', () => ({
  AdvancedPage: () => <div data-testid="advanced-page" />,
}))

import { ScreenRouter } from './ScreenRouter'

function makeVmForScreen(appScreen: AppScreen): AppViewModel {
  // ScreenRouter only reads vm.navigation.appScreen (plus the slices the page
  // components consume — but those are mocked here). Cast through unknown to
  // avoid constructing a real AppViewModel for a switch-only test.
  return {
    navigation: {
      appScreen,
      returningFromAdvanced: false,
      onLearnOpen: () => {},
      onSettingsOpen: () => {},
      onAdvancedOpen: () => {},
      onBackToPractice: () => {},
      onBackFromAdvanced: () => {},
    },
    dialogs: {
      endSessionDialogs: [],
    },
    install: { isIOS: false, isStandalone: false, installable: false, onInstall: async () => {} },
    learnContent: {} as AppViewModel['learnContent'],
    lockedCopy: {} as AppViewModel['lockedCopy'],
    uiStrings: {} as AppViewModel['uiStrings'],
    activePractice: 'resonant',
  } as unknown as AppViewModel
}

describe('ScreenRouter', () => {
  it('renders PracticeScreen when appScreen=practice', () => {
    render(<ScreenRouter vm={makeVmForScreen('practice')} />)
    expect(screen.getByTestId('practice-screen')).toBeInTheDocument()
    expect(screen.queryByTestId('learn-page')).not.toBeInTheDocument()
    expect(screen.queryByTestId('app-settings-page')).not.toBeInTheDocument()
  })

  it('renders LearnPage when appScreen=learn', () => {
    render(<ScreenRouter vm={makeVmForScreen('learn')} />)
    expect(screen.getByTestId('learn-page')).toBeInTheDocument()
    expect(screen.queryByTestId('practice-screen')).not.toBeInTheDocument()
    expect(screen.queryByTestId('app-settings-page')).not.toBeInTheDocument()
  })

  it('renders AppSettingsPage when appScreen=appSettings', () => {
    render(<ScreenRouter vm={makeVmForScreen('appSettings')} />)
    expect(screen.getByTestId('app-settings-page')).toBeInTheDocument()
    expect(screen.queryByTestId('practice-screen')).not.toBeInTheDocument()
    expect(screen.queryByTestId('learn-page')).not.toBeInTheDocument()
  })

  it('renders AdvancedPage when appScreen=advanced', () => {
    render(<ScreenRouter vm={makeVmForScreen('advanced')} />)
    expect(screen.getByTestId('advanced-page')).toBeInTheDocument()
    expect(screen.queryByTestId('practice-screen')).not.toBeInTheDocument()
    expect(screen.queryByTestId('learn-page')).not.toBeInTheDocument()
    expect(screen.queryByTestId('app-settings-page')).not.toBeInTheDocument()
  })
})
