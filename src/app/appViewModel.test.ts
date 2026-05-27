import { describe, expect, it } from 'vitest'

import { UI_STRINGS } from '../content/strings'
import {
  DEFAULT_NK_SETTINGS,
  DEFAULT_SETTINGS,
  DEFAULT_STRETCH_SETTINGS,
  type SessionFrame,
} from '../domain'
import {
  AUDIO_RESUME_HINT_ID,
  createAudioViewModel,
  createInstallViewModel,
  createNaviAudioToggleViewModel,
  createPracticeControlsViewModel,
  createPracticeSessionViewModel,
  createPracticeSettingsViewModel,
  type BreathingSessionViewState,
  type NaviKriyaSessionViewState,
  type PracticeSettingsSources,
} from './appViewModel'

const frame: SessionFrame = {
  phase: 'in',
  phaseLabel: 'In',
  elapsedMs: 0,
  remainingMs: 600_000,
  phaseProgress: 0,
  cycleIndex: 0,
  isComplete: false,
}

const breathingState: BreathingSessionViewState = {
  phase: 'running',
  sessionCue: 'arrow',
  leadInDigit: null,
  leadInPlaceholderFrame: null,
  liveFrame: frame,
  status: 'running',
  inSessionView: true,
  selectedSettings: DEFAULT_SETTINGS,
}

const naviState: NaviKriyaSessionViewState = {
  sessionActive: true,
  starting: true,
  leadInDigit: 2,
  phase: 'idle',
  round: 1,
  count: 0,
  running: false,
  settings: DEFAULT_NK_SETTINGS,
  justCompleted: false,
}

const noop = (): void => undefined
const noopInstall = (): Promise<void> => Promise.resolve()

function makeSettingsSources(
  activePractice: PracticeSettingsSources['activePractice'],
  naviSessionActive = false,
): PracticeSettingsSources {
  return {
    activePractice,
    naviSessionActive,
    resonant: {
      settings: DEFAULT_SETTINGS,
      isRunning: false,
      isComplete: false,
      onChange: noop,
      onExtendDuration: noop,
    },
    stretch: {
      settings: DEFAULT_STRETCH_SETTINGS,
      isRunning: false,
      isComplete: false,
      onChange: noop,
    },
    naviKriya: {
      settings: DEFAULT_NK_SETTINGS,
      isComplete: false,
      onChange: noop,
    },
  }
}

describe('app practice session view model', () => {
  it('maps stretch to its presentation contract with the stretch discriminator', () => {
    const model = createPracticeSessionViewModel({
      activePractice: 'stretch',
      breathing: breathingState,
      navi: naviState,
      liveCue: 'labels',
    })

    expect(model.kind).toBe('stretch')
    expect(model.presentation.shape).toEqual({
      cue: 'arrow',
      frame,
      leadInDigit: null,
    })
  })

  it('maps Navi Kriya to its own presentation without requiring breathing session state', () => {
    const model = createPracticeSessionViewModel({
      activePractice: 'naviKriya',
      breathing: {
        ...breathingState,
        sessionCue: 'arrow',
      },
      navi: naviState,
      liveCue: 'nose',
    })

    expect(model.kind).toBe('naviKriya')
    expect(model.presentation.shape).toEqual({
      kind: 'orb',
      cue: 'nose',
      leadInDigit: 2,
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
  it('hides all settings while a Navi Kriya session is active', () => {
    expect(createPracticeSettingsViewModel(makeSettingsSources('resonant', true))).toEqual({
      kind: 'hidden',
    })
  })

  it('returns the active practice settings contract', () => {
    const resonant = createPracticeSettingsViewModel(makeSettingsSources('resonant'))
    const stretch = createPracticeSettingsViewModel(makeSettingsSources('stretch'))
    const naviKriya = createPracticeSettingsViewModel(makeSettingsSources('naviKriya'))

    expect(resonant.kind).toBe('resonant')
    if (resonant.kind !== 'resonant') throw new Error('Expected resonant settings model')
    expect(resonant.settings).toBe(DEFAULT_SETTINGS)

    expect(stretch.kind).toBe('stretch')
    if (stretch.kind !== 'stretch') throw new Error('Expected stretch settings model')
    expect(stretch.settings).toBe(DEFAULT_STRETCH_SETTINGS)

    expect(naviKriya.kind).toBe('naviKriya')
    if (naviKriya.kind !== 'naviKriya') throw new Error('Expected Navi Kriya settings model')
    expect(naviKriya.settings).toBe(DEFAULT_NK_SETTINGS)
  })
})

describe('app practice controls view model', () => {
  it('selects breathing action, click handler, and audio outside Navi Kriya', () => {
    const breathingAudio = createAudioViewModel({
      muted: false,
      audioAvailable: true,
      audioStatus: 'ok',
      onMuteToggle: noop,
    })
    const naviAudio = createNaviAudioToggleViewModel({
      muted: true,
      audioAvailable: true,
      onMuteToggle: noop,
    })
    const onBreathingPrimaryClick = (): void => undefined
    const onNaviPrimaryClick = (): void => undefined

    const controls = createPracticeControlsViewModel({
      activePractice: 'resonant',
      breathingAction: 'end',
      naviAction: 'cancel',
      strings: UI_STRINGS.en.practice.controls,
      breathingAudio,
      naviAudio,
      onBreathingPrimaryClick,
      onNaviPrimaryClick,
    })

    expect(controls.primaryLabel).toBe(UI_STRINGS.en.practice.controls.endSession)
    expect(controls.onPrimaryClick).toBe(onBreathingPrimaryClick)
    expect(controls.audio).toBe(breathingAudio)
  })

  it('selects Navi Kriya action, click handler, and audio in Navi Kriya', () => {
    const breathingAudio = createAudioViewModel({
      muted: false,
      audioAvailable: true,
      audioStatus: 'ok',
      onMuteToggle: noop,
    })
    const naviAudio = createNaviAudioToggleViewModel({
      muted: true,
      audioAvailable: true,
      onMuteToggle: noop,
    })
    const onBreathingPrimaryClick = (): void => undefined
    const onNaviPrimaryClick = (): void => undefined

    const controls = createPracticeControlsViewModel({
      activePractice: 'naviKriya',
      breathingAction: 'end',
      naviAction: 'cancel',
      strings: UI_STRINGS.en.practice.controls,
      breathingAudio,
      naviAudio,
      onBreathingPrimaryClick,
      onNaviPrimaryClick,
    })

    expect(controls.primaryLabel).toBe(UI_STRINGS.en.practice.controls.cancel)
    expect(controls.onPrimaryClick).toBe(onNaviPrimaryClick)
    expect(controls.audio).toBe(naviAudio)
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

  it('keeps Navi Kriya audio as a mute toggle without the resume announcement contract', () => {
    const audio = createNaviAudioToggleViewModel({
      muted: true,
      audioAvailable: false,
      onMuteToggle: noop,
    })

    expect(audio).toMatchObject({
      muted: true,
      audioAvailable: false,
      needsResume: false,
    })
    // Navi has no resume flow — resumeHintId is left undefined so consumers
    // (MuteToggle) gate aria-describedby on both needsResume AND resumeHintId.
    expect(audio.resumeHintId).toBeUndefined()
  })
})
