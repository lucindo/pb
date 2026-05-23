import { describe, expect, it } from 'vitest'

import { UI_STRINGS } from '../content/strings'
import {
  DEFAULT_NK_SETTINGS,
  DEFAULT_SETTINGS,
  DEFAULT_STRETCH_SETTINGS,
  type IdleSessionState,
  type SessionFrame,
} from '../domain'
import type { BreathingSessionController } from '../hooks/useBreathingSessionController'
import type { NaviKriyaSessionController } from '../hooks/useNaviKriyaSessionController'
import type { SessionEngine } from '../hooks/useSessionEngine'
import {
  createAppDialogsViewModel,
  createAudioViewModelsFromBreathingController,
  createEndSessionDialogViewModelsFromControllers,
  createPracticeControlsViewModelFromControllers,
  createPracticeSessionViewModelFromControllers,
  createPracticeSettingsViewModelFromControllers,
  getPracticePrimaryActionsFromControllers,
} from './appControllerAdapters'
import type { AppNavigation } from './useAppNavigation'

const frame: SessionFrame = {
  phase: 'in',
  phaseLabel: 'In',
  elapsedMs: 0,
  remainingMs: 600_000,
  phaseProgress: 0,
  cycleIndex: 0,
  isComplete: false,
}

const idleState: IdleSessionState = {
  status: 'idle',
  selectedSettings: DEFAULT_SETTINGS,
}

const noop = (): void => undefined
const noopPromise = (): Promise<void> => Promise.resolve()

function makeSessionEngine(overrides: Partial<SessionEngine> = {}): SessionEngine {
  return {
    state: idleState,
    currentFrame: frame,
    liveFrame: frame,
    runningSnapshotRef: { current: null },
    setSelectedSettings: noop,
    start: noop,
    end: noop,
    extendDuration: noop,
    ...overrides,
  }
}

function makeBreathingController(
  overrides: Partial<BreathingSessionController> = {},
): BreathingSessionController {
  return {
    session: makeSessionEngine(),
    phase: 'idle',
    inSessionView: false,
    leadInDigit: null,
    leadInPlaceholderFrame: null,
    sessionCue: null,
    endDialogOpen: false,
    audio: {
      muted: false,
      audioAvailable: true,
      audioStatus: 'ok',
      onMuteOrResumeClick: noopPromise,
    },
    setSelectedSettings: noop,
    startOrCancel: noopPromise,
    requestEnd: noop,
    confirmEnd: noop,
    cancelEnd: noop,
    resetSession: noop,
    ...overrides,
  }
}

function makeNaviController(
  overrides: Partial<NaviKriyaSessionController> = {},
): NaviKriyaSessionController {
  return {
    settings: DEFAULT_NK_SETTINGS,
    phase: 'idle',
    round: 1,
    count: 0,
    running: false,
    starting: false,
    leadInDigit: null,
    sessionActive: false,
    justCompleted: false,
    endDialogOpen: false,
    setSettings: noop,
    start: noop,
    cancelStart: noop,
    requestEnd: noop,
    confirmEnd: noop,
    cancelEnd: noop,
    clearCompletion: noop,
    ...overrides,
  }
}

describe('app controller adapters', () => {
  it('creates breathing and Navi audio view models from the breathing audio controller', () => {
    const onMuteToggle = (): void => undefined
    const { audio, naviAudio } = createAudioViewModelsFromBreathingController({
      breathing: makeBreathingController({
        audio: {
          muted: true,
          audioAvailable: false,
          audioStatus: 'needs-resume',
          onMuteOrResumeClick: noopPromise,
        },
      }),
      onMuteToggle,
    })

    expect(audio).toMatchObject({
      muted: true,
      audioAvailable: false,
      audioStatus: 'needs-resume',
      needsResume: true,
    })
    expect(naviAudio).toMatchObject({
      muted: true,
      audioAvailable: false,
      needsResume: false,
    })
  })

  it('derives primary actions from controller state', () => {
    const actions = getPracticePrimaryActionsFromControllers({
      breathing: makeBreathingController({ phase: 'lead-in' }),
      navi: makeNaviController({ starting: true, sessionActive: true }),
    })

    expect(actions).toEqual({
      breathing: 'cancel',
      naviKriya: 'cancel',
    })
  })

  it('creates practice session view models from controller snapshots', () => {
    const model = createPracticeSessionViewModelFromControllers({
      activePractice: 'naviKriya',
      breathing: makeBreathingController(),
      navi: makeNaviController({
        starting: true,
        sessionActive: true,
        leadInDigit: 2,
      }),
      liveCue: 'nose',
    })

    expect(model.kind).toBe('naviKriya')
    expect(model.presentation.shape).toEqual({
      kind: 'orb',
      cue: 'nose',
      leadInDigit: 2,
    })
  })

  it('hides practice settings while a Navi Kriya session is active', () => {
    const model = createPracticeSettingsViewModelFromControllers({
      activePractice: 'resonant',
      breathing: makeBreathingController(),
      navi: makeNaviController({ sessionActive: true }),
      stretchSettings: DEFAULT_STRETCH_SETTINGS,
      onStretchSettingsChange: noop,
    })

    expect(model).toEqual({ kind: 'hidden' })
  })

  it('routes primary controls through the active practice action and audio model', () => {
    const audio = createAudioViewModelsFromBreathingController({
      breathing: makeBreathingController(),
      onMuteToggle: noop,
    })
    const onBreathingPrimaryClick = (): void => undefined
    const onNaviPrimaryClick = (): void => undefined
    const controls = createPracticeControlsViewModelFromControllers({
      activePractice: 'naviKriya',
      actions: { breathing: 'end', naviKriya: 'start' },
      strings: UI_STRINGS.en.controls,
      audio: audio.audio,
      naviAudio: audio.naviAudio,
      onBreathingPrimaryClick,
      onNaviPrimaryClick,
    })

    expect(controls.primaryLabel).toBe(UI_STRINGS.en.controls.startSession)
    expect(controls.onPrimaryClick).toBe(onNaviPrimaryClick)
    expect(controls.audio).toBe(audio.naviAudio)
  })

  it('creates end-session dialog view models with stable ids and controller handlers', () => {
    const breathingConfirm = (): void => undefined
    const naviCancel = (): void => undefined
    const dialogs = createEndSessionDialogViewModelsFromControllers({
      breathing: makeBreathingController({
        endDialogOpen: true,
        confirmEnd: breathingConfirm,
      }),
      navi: makeNaviController({
        cancelEnd: naviCancel,
      }),
    })

    expect(dialogs.map((dialog) => dialog.id)).toEqual(['breathing', 'naviKriya'])
    expect(dialogs[0]?.open).toBe(true)
    expect(dialogs[0]?.onConfirm).toBe(breathingConfirm)
    expect(dialogs[1]?.onCancel).toBe(naviCancel)
  })

  it('combines surface navigation state with session dialog models', () => {
    const navigation: AppNavigation = {
      appScreen: 'learn',
      onLearnOpen: noop,
      onSettingsOpen: noop,
      onBackToPractice: noop,
    }
    const endSessionDialogs = createEndSessionDialogViewModelsFromControllers({
      breathing: makeBreathingController(),
      navi: makeNaviController(),
    })

    const dialogs = createAppDialogsViewModel({
      navigation,
      endSessionDialogs,
    })

    expect(dialogs.appScreen).toBe('learn')
    expect(dialogs.endSessionDialogs).toBe(endSessionDialogs)
    expect(dialogs.onLearnOpen).toBe(noop)
    expect(dialogs.onSettingsOpen).toBe(noop)
    expect(dialogs.onBackToPractice).toBe(noop)
  })
})
