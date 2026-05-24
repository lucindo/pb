// Source file authority: Phase 19 I18N-01..I18N-07.
// D-01 strings catalog separation: UI strings live here, not inline in components.
// D-10 nested-interface decision: UiStrings uses sub-objects per component/feature.
// D-12 option-name translation: theme/variant/timbre option names are translated.
// D-14 native-endonym LOCALE_DISPLAY_NAMES: picker labels use native endonyms.
// D-15 template-fn entries: interpolated strings are typed as functions.
// EN values are the literals currently shipped in source components.
// PT-BR values reviewed by a native speaker in Phase 26 per I18N-07.
//
// Refactor F5: top-level keys reorganized by SURFACE
//   - practice.* — everything on PracticeScreen (header, controls, switcher,
//     breathing visuals, readouts, settings forms, mute toggle, end-session
//     confirmation modal, top bar anchor labels)
//   - appSettings.* — everything on AppSettingsPage (page chrome, picker
//     section labels, picker option labels)
//   - learn.* — everything on LearnPage (page chrome + body section headings)
//   - install.* — cross-surface install copy (banner on practice + install
//     row on appSettings + iOS steps)

import type { LocaleId } from '../domain'

export interface UiStrings {
  readonly practice: {
    readonly header: string
    readonly title: string
    readonly topBar: {
      readonly settings: string
      readonly settingsDisabled: string
      readonly learn: string
      readonly learnDisabled: string
    }
    readonly switcher: {
      readonly toggleLabel: string
      readonly resonantName: string
      readonly naviKriyaName: string
      readonly resonantHeading: string
      readonly naviKriyaHeading: string
      readonly naviKriyaHeader: string
      readonly stretchName: string
      readonly stretchHeading: string
      readonly stretchHeader: string
    }
    readonly controls: {
      readonly startSession: string
      readonly endSession: string
      readonly cancel: string
    }
    readonly breathing: {
      readonly inhale: string
      readonly exhale: string
      readonly breathingShapeAriaLabel: string
      readonly leadInAriaLabel: (digit: number) => string
    }
    readonly readout: {
      readonly elapsed: string
      readonly remaining: string
      readonly statusLabel: string
      readonly readoutAriaLabel: string
      readonly announcementAriaLabel: string
      readonly sessionComplete: string
      readonly currentBpmLabel: string
      readonly stageLabel: string
      readonly stageHoldInitial: string
      readonly stageRamp: string
      readonly stageHoldTarget: string
    }
    readonly settingsForm: {
      readonly ariaLabel: string
      readonly bpmLabel: string
      readonly ratioLabel: string
      readonly durationLabel: string
      readonly openEndedLabel: string
      readonly bpmUnit: string
      readonly minutesUnit: string
      readonly stepper: {
        readonly fieldAriaLabel: (label: string) => string
        readonly decreaseLabel: (label: string) => string
        readonly increaseLabel: (label: string) => string
      }
      readonly sessionModeLabel: string
      readonly modeStandard: string
      readonly modeStretch: string
      readonly initialBpmLabel: string
      readonly targetBpmLabel: string
      readonly holdInitialLabel: string
      readonly holdTargetLabel: string
      readonly rampDurationLabel: string
      readonly holdOpenEndedLabel: string
    }
    readonly nkControls: {
      readonly roundsLabel: string
      readonly frontCountLabel: string
      readonly omLengthLabel: string
      readonly omLengthFast: string
      readonly omLengthMedium: string
      readonly omLengthSlow: string
      readonly perOmCueLabel: string
      readonly perOmCueOn: string
      readonly perOmCueOff: string
      readonly estimatedDuration: (minutes: number) => string
    }
    readonly nkReadout: {
      readonly statusLabel: string
      readonly readoutAriaLabel: string
      readonly phaseLabel: string
      readonly front: string
      readonly back: string
      readonly roundLabel: string
      readonly countLabel: string
      readonly roundOf: (current: number, total: number) => string
      readonly countOf: (current: number, total: number) => string
    }
    readonly mute: {
      readonly mute: string
      readonly unmute: string
      readonly resume: string
      readonly unavailable: string
      readonly audioPausedAnnouncement: string
    }
    readonly endSessionDialog: {
      readonly title: string
      readonly confirm: string
      readonly cancel: string
    }
    readonly settingsSheet: {
      readonly title: string
      readonly close: string
      readonly editCardAriaLabel: (practiceName: string) => string
    }
  }
  readonly appSettings: {
    readonly title: string
    readonly close: string
    readonly themeLabel: string
    readonly cueLabel: string
    readonly timbreLabel: string
    readonly languageLabel: string
    readonly themes: {
      readonly light: string
      readonly dark: string
      readonly system: string
    }
    readonly cue: {
      readonly labels: string
      readonly arrow: string
      readonly nose: string
    }
    readonly timbres: {
      readonly bowl: string
      readonly bell: string
      readonly sine: string
      readonly flute: string
    }
  }
  readonly learn: {
    readonly title: string
    readonly close: string
    readonly resourcesHeading: string
    readonly videosHeading: string
    readonly nativeAppsHeading: string
    readonly naviKriyaVideosHeading: string
    readonly naviKriyaDescriptionSection1Title: string
    readonly naviKriyaDescriptionSection2Title: string
  }
  readonly install: {
    readonly regionLabel: string
    readonly bannerText: string
    readonly installButton: string
    readonly iosStepsButton: string
    readonly dismiss: string
    readonly iosStep1: string
    readonly iosStep2: string
    readonly iosStep3: string
    readonly settingsLabel: string
  }
}

export const UI_STRINGS: Readonly<Record<LocaleId, UiStrings>> = {
  en: {
    practice: {
      header: 'HRV practice',
      title: 'HRV Breathing',
      topBar: {
        settings: 'Settings',
        settingsDisabled: 'Settings (unavailable during session)',
        learn: 'Learn',
        learnDisabled: 'Learn (unavailable during session)',
      },
      switcher: {
        toggleLabel: 'Switch practice',
        resonantName: 'HRV',
        naviKriyaName: 'Navi',
        resonantHeading: 'HRV Breathing',
        naviKriyaHeading: 'Navi Kriya',
        naviKriyaHeader: 'Navi practice',
        stretchName: 'Stretch',
        stretchHeading: 'HRV Stretch',
        stretchHeader: 'Stretch practice',
      },
      controls: {
        startSession: 'Start session',
        endSession: 'End session',
        cancel: 'Cancel',
      },
      breathing: {
        inhale: 'In',
        exhale: 'Out',
        breathingShapeAriaLabel: 'Breathing shape',
        leadInAriaLabel: (d) => `Lead-in ${String(d)}`,
      },
      readout: {
        elapsed: 'Elapsed',
        remaining: 'Remaining',
        statusLabel: 'Status',
        readoutAriaLabel: 'Session readout',
        announcementAriaLabel: 'Session announcement',
        sessionComplete: 'Session complete',
        currentBpmLabel: 'BPM',
        stageLabel: 'Stage',
        stageHoldInitial: 'Warm-up',
        stageRamp: 'Stretch',
        stageHoldTarget: 'Settle',
      },
      settingsForm: {
        ariaLabel: 'Session settings',
        bpmLabel: 'BPM',
        ratioLabel: 'Ratio',
        durationLabel: 'Duration',
        openEndedLabel: 'Open-ended',
        bpmUnit: 'BPM',
        minutesUnit: 'min',
        stepper: {
          fieldAriaLabel: (l) => l,
          decreaseLabel: (l) => `Decrease ${l}`,
          increaseLabel: (l) => `Increase ${l}`,
        },
        sessionModeLabel: 'Session mode',
        modeStandard: 'Standard',
        modeStretch: 'Stretch',
        initialBpmLabel: 'Start BPM',
        targetBpmLabel: 'Target BPM',
        holdInitialLabel: 'Warm-up',
        holdTargetLabel: 'Settle',
        rampDurationLabel: 'Stretch',
        holdOpenEndedLabel: 'Open-ended',
      },
      nkControls: {
        roundsLabel: 'Rounds',
        frontCountLabel: 'Front OMs',
        omLengthLabel: 'OM pace',
        omLengthFast: 'Fast',
        omLengthMedium: 'Medium',
        omLengthSlow: 'Slow',
        perOmCueLabel: 'OM tick',
        perOmCueOn: 'On',
        perOmCueOff: 'Off',
        estimatedDuration: (m) => `~${String(m)} min`,
      },
      nkReadout: {
        statusLabel: 'Status',
        readoutAriaLabel: 'Navi Kriya session readout',
        phaseLabel: 'Phase',
        front: 'Front',
        back: 'Back',
        roundLabel: 'Round',
        countLabel: 'Count',
        roundOf: (c, t) => `${String(c)} / ${String(t)}`,
        countOf: (c, t) => `${String(c)} / ${String(t)}`,
      },
      mute: {
        mute: 'Mute audio cues',
        unmute: 'Unmute audio cues',
        resume: 'Resume audio',
        unavailable: 'Audio unavailable in this browser',
        audioPausedAnnouncement: 'Audio paused, tap to resume',
      },
      endSessionDialog: {
        title: 'End this session?',
        confirm: 'End',
        cancel: 'Keep going',
      },
      settingsSheet: {
        title: 'Practice',
        close: 'Close',
        editCardAriaLabel: (name) => `Edit ${name} settings`,
      },
    },
    appSettings: {
      title: 'Settings',
      close: 'Close',
      themeLabel: 'Theme',
      cueLabel: 'Cue style',
      timbreLabel: 'Timbre',
      languageLabel: 'Language',
      themes: {
        light: 'Light',
        dark: 'Dark',
        system: 'System',
      },
      cue: {
        labels: 'Text',
        arrow: 'Arrow',
        nose: 'Nose',
      },
      timbres: {
        bowl: 'Bowl',
        bell: 'Bell',
        sine: 'Sine',
        flute: 'Flute',
      },
    },
    learn: {
      title: 'About this practice',
      close: 'Close',
      resourcesHeading: 'Forrest Knutson Resources',
      videosHeading: 'Selected HRV Breathing Videos',
      nativeAppsHeading: 'Resonant Breathing app',
      naviKriyaVideosHeading: 'Selected Navi Kriya Videos',
      naviKriyaDescriptionSection1Title: 'What is Navi Kriya',
      naviKriyaDescriptionSection2Title: 'How this app paces it',
    },
    install: {
      regionLabel: 'Install app',
      bannerText: 'Add to your home screen for offline use',
      installButton: 'Install',
      iosStepsButton: 'How to install',
      dismiss: 'Dismiss install banner',
      iosStep1: "Tap the Share button in Safari's toolbar",
      iosStep2: 'Tap "Add to Home Screen"',
      iosStep3: 'Tap "Add" to confirm',
      settingsLabel: 'Install for offline use',
    },
  },
  'pt-BR': {
    practice: {
      header: 'PRÁTICA VFC',
      title: 'Respiração VFC',
      topBar: {
        settings: 'Configurações',
        settingsDisabled: 'Configurações (indisponível durante a sessão)',
        learn: 'Saiba mais',
        learnDisabled: 'Saiba mais (indisponível durante a sessão)',
      },
      switcher: {
        toggleLabel: 'Trocar de prática',
        resonantName: 'VFC',
        naviKriyaName: 'Navi',
        resonantHeading: 'Respiração VFC',
        naviKriyaHeading: 'Navi Kriya',
        naviKriyaHeader: 'Prática Navi',
        stretchName: 'Alongar',
        stretchHeading: 'Alongar VFC',
        stretchHeader: 'Prática de Alongar',
      },
      controls: {
        startSession: 'Iniciar sessão',
        endSession: 'Encerrar sessão',
        cancel: 'Cancelar',
      },
      breathing: {
        inhale: 'Puxa',
        exhale: 'Solta',
        breathingShapeAriaLabel: 'Forma de respiração',
        leadInAriaLabel: (d) => `Contagem regressiva ${String(d)}`,
      },
      readout: {
        elapsed: 'Decorrido',
        remaining: 'Restante',
        statusLabel: 'Status',
        readoutAriaLabel: 'Informações da sessão',
        announcementAriaLabel: 'Anúncio da sessão',
        sessionComplete: 'Sessão concluída',
        currentBpmLabel: 'RPM',
        stageLabel: 'Fase',
        stageHoldInitial: 'Aquecimento',
        stageRamp: 'Progressão',
        stageHoldTarget: 'Estabilizar',
      },
      settingsForm: {
        ariaLabel: 'Configurações da sessão',
        bpmLabel: 'RPM',
        ratioLabel: 'Proporção',
        durationLabel: 'Duração',
        openEndedLabel: 'Sem limite',
        bpmUnit: 'RPM',
        minutesUnit: 'min',
        stepper: {
          fieldAriaLabel: (l) => l,
          decreaseLabel: (l) => `Diminuir ${l}`,
          increaseLabel: (l) => `Aumentar ${l}`,
        },
        sessionModeLabel: 'Modo de sessão',
        modeStandard: 'Padrão',
        modeStretch: 'Progressivo',
        initialBpmLabel: 'RPM inicial',
        targetBpmLabel: 'RPM alvo',
        holdInitialLabel: 'Aquecimento',
        holdTargetLabel: 'Estabilizar',
        rampDurationLabel: 'Progressão',
        holdOpenEndedLabel: 'Sem limite',
      },
      nkControls: {
        roundsLabel: 'Rodadas',
        frontCountLabel: 'OMs de frente',
        omLengthLabel: 'Ritmo do OM',
        omLengthFast: 'Rápido',
        omLengthMedium: 'Médio',
        omLengthSlow: 'Lento',
        perOmCueLabel: 'Toque do OM',
        perOmCueOn: 'Ligado',
        perOmCueOff: 'Desligado',
        estimatedDuration: (m) => `~${String(m)} min`,
      },
      nkReadout: {
        statusLabel: 'Status',
        readoutAriaLabel: 'Resumo da sessão de Navi Kriya',
        phaseLabel: 'Fase',
        front: 'Frente',
        back: 'Costas',
        roundLabel: 'Rodada',
        countLabel: 'Contagem',
        roundOf: (c, t) => `${String(c)} / ${String(t)}`,
        countOf: (c, t) => `${String(c)} / ${String(t)}`,
      },
      mute: {
        mute: 'Silenciar sons',
        unmute: 'Reativar sons',
        resume: 'Retomar áudio',
        unavailable: 'Áudio indisponível neste navegador',
        audioPausedAnnouncement: 'Áudio pausado, toque para retomar',
      },
      endSessionDialog: {
        title: 'Encerrar esta sessão?',
        confirm: 'Encerrar',
        cancel: 'Continuar',
      },
      settingsSheet: {
        title: 'Prática',
        close: 'Fechar',
        editCardAriaLabel: (name) => `Editar configurações de ${name}`,
      },
    },
    appSettings: {
      title: 'Configurações',
      close: 'Fechar',
      themeLabel: 'Tema',
      cueLabel: 'Estilo de guia',
      timbreLabel: 'Timbre',
      languageLabel: 'Idioma',
      themes: {
        light: 'Claro',
        dark: 'Escuro',
        system: 'Sistema',
      },
      cue: {
        labels: 'Texto',
        arrow: 'Seta',
        nose: 'Nariz',
      },
      timbres: {
        bowl: 'Tigela',
        bell: 'Sino',
        sine: 'Senoidal',
        flute: 'Flauta',
      },
    },
    learn: {
      title: 'Sobre esta prática',
      close: 'Fechar',
      resourcesHeading: 'Recursos do Forrest Knutson',
      videosHeading: 'Vídeos selecionados de respiração VFC',
      nativeAppsHeading: 'App Resonant Breathing',
      naviKriyaVideosHeading: 'Vídeos selecionados de Navi Kriya',
      naviKriyaDescriptionSection1Title: 'O que é Navi Kriya',
      naviKriyaDescriptionSection2Title: 'Como este app guia a prática',
    },
    install: {
      regionLabel: 'Instalar app',
      bannerText: 'Adicione à sua tela inicial para uso offline',
      installButton: 'Instalar',
      iosStepsButton: 'Como instalar',
      dismiss: 'Fechar banner de instalação',
      iosStep1: 'Toque no botão Compartilhar na barra do Safari',
      iosStep2: 'Toque em "Adicionar à Tela de Início"',
      iosStep3: 'Toque em "Adicionar" para confirmar',
      settingsLabel: 'Instalar para uso offline',
    },
  },
} as const satisfies Readonly<Record<LocaleId, UiStrings>>

export const LOCALE_DISPLAY_NAMES: Readonly<Record<LocaleId, string>> = {
  en: 'English',
  'pt-BR': 'Português (Brasil)',
} as const satisfies Readonly<Record<LocaleId, string>>
