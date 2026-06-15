import { describe, expect, it } from 'vitest'

import { UI_STRINGS } from '../content/strings'
import {
  DEFAULT_SETTINGS,
  type SessionFrame,
} from '../domain'
import {
  AUDIO_RESUME_HINT_ID,
  createAudioViewModel,
  createInstallViewModel,
  createPracticeControlsViewModel,
  createPracticeSessionViewModel,
  createPracticeSettingsViewModel,
  type BreathingSessionViewState,
  type PracticeSettingsSources,
} from './appViewModel'

// SessionFrame is seconds-shaped.
const frame: SessionFrame = {
  phase: 'in',
  phaseLabel: 'In',
  elapsedSec: 0,
  remainingSec: 600,
  phaseProgress: 0,
  cycleIndex: 0,
  isComplete: false,
}

const breathingState: BreathingSessionViewState = {
  phase: 'running',
  leadInDigit: null,
  leadInPlaceholderFrame: null,
  liveFrame: frame,
  status: 'running',
  inSessionView: true,
  selectedSettings: DEFAULT_SETTINGS,
}

const noop = (): void => undefined
const noopInstall = (): Promise<void> => Promise.resolve()

function makeSettingsSources(): PracticeSettingsSources {
  return {
    settings: DEFAULT_SETTINGS,
    isRunning: false,
    isComplete: false,
    onChange: noop,
    onExtendDuration: noop,
  }
}

describe('app practice session view model', () => {
  it('maps the patternBreathing breathing state to its presentation contract', () => {
    const model = createPracticeSessionViewModel({
      breathing: breathingState,
    })

    expect(model.kind).toBe('patternBreathing')
    expect(model.presentation.shape).toEqual({
      frame,
      leadInDigit: null,
    })
  })
})

describe('app install view model', () => {
  it('is installable when the browser fires beforeinstallprompt', () => {
    const install = createInstallViewModel({
      isStandalone: false,
      isIOS: false,
      canPromptInstall: true,
      onInstall: noopInstall,
    })

    expect(install.installable).toBe(true)
    expect(install.isIOS).toBe(false)
    expect(install.isStandalone).toBe(false)
  })

  it('keeps iOS installable without a deferred install prompt', () => {
    const install = createInstallViewModel({
      isStandalone: false,
      isIOS: true,
      canPromptInstall: false,
      onInstall: noopInstall,
    })

    expect(install.installable).toBe(true)
    expect(install.isIOS).toBe(true)
  })

  it('is not installable when neither iOS nor a deferred prompt is available', () => {
    const install = createInstallViewModel({
      isStandalone: false,
      isIOS: false,
      canPromptInstall: false,
      onInstall: noopInstall,
    })

    expect(install.installable).toBe(false)
  })
})

describe('app practice settings view model', () => {
  it('returns the patternBreathing settings contract', () => {
    const patternBreathing = createPracticeSettingsViewModel(makeSettingsSources())

    expect(patternBreathing.kind).toBe('patternBreathing')
    expect(patternBreathing.settings).toBe(DEFAULT_SETTINGS)
  })
})

describe('app practice controls view model', () => {
  it('selects breathing action, click handler, and audio', () => {
    const breathingAudio = createAudioViewModel({
      muted: false,
      audioAvailable: true,
      audioStatus: 'ok',
      onMuteToggle: noop,
    })
    const onBreathingPrimaryClick = (): void => undefined

    const controls = createPracticeControlsViewModel({
      breathingAction: 'end',
      strings: UI_STRINGS.en.practice.controls,
      breathingAudio,
      onBreathingPrimaryClick,
    })

    expect(controls.primaryLabel).toBe(UI_STRINGS.en.practice.controls.endSession)
    expect(controls.onPrimaryClick).toBe(onBreathingPrimaryClick)
    expect(controls.audio).toBe(breathingAudio)
  })
})

describe('app audio view models', () => {
  it('marks breathing audio as needing resume only for the needs-resume status', () => {
    const audio = createAudioViewModel({
      muted: false,
      audioAvailable: true,
      audioStatus: 'needs-resume',
      onMuteToggle: noop,
    })

    expect(audio.needsResume).toBe(true)
    expect(audio.resumeHintId).toBe(AUDIO_RESUME_HINT_ID)
  })
})
