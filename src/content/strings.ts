// Source file authority: Phase 19 I18N-01..I18N-07.
// D-01 strings catalog separation: UI strings live here, not inline in components.
// D-10 nested-interface decision: UiStrings uses sub-objects per component/feature.
// D-12 option-name translation: theme/variant/timbre option names are translated.
// D-14 native-endonym LOCALE_DISPLAY_NAMES: picker labels use native endonyms.
// D-15 template-fn entries: interpolated strings are typed as functions.
// EN values are the literals currently shipped in source components.
// PT-BR values reviewed by a native speaker in Phase 26 per I18N-07.

import type { LocaleId } from '../domain/settings'

export interface UiStrings {
  readonly app: {
    readonly header: string
    readonly title: string
  }
  readonly controls: {
    readonly startSession: string
    readonly endSession: string
    readonly cancel: string
  }
  readonly endSessionDialog: {
    readonly title: string
    readonly confirm: string
    readonly cancel: string
  }
  readonly resetStatsDialog: {
    readonly title: string
    readonly confirm: string
    readonly cancel: string
  }
  readonly settings: {
    readonly title: string
    readonly close: string
    readonly themeLabel: string
    readonly variantLabel: string
    readonly cueLabel: string
    readonly timbreLabel: string
    readonly languageLabel: string
  }
  readonly themes: {
    readonly light: string
    readonly dark: string
    readonly system: string
    readonly moss: string
    readonly slate: string
    readonly dusk: string
  }
  readonly variants: {
    readonly orb: string
    readonly square: string
    readonly diamond: string
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
    readonly chime: string
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
  readonly mute: {
    readonly mute: string
    readonly unmute: string
    readonly resume: string
    readonly unavailable: string
    readonly audioPausedAnnouncement: string
  }
  readonly readout: {
    readonly elapsed: string
    readonly remaining: string
    readonly readoutAriaLabel: string
    readonly announcementAriaLabel: string
    readonly sessionComplete: string
    readonly currentBpmLabel: string
    readonly stageLabel: string
    readonly stageHoldInitial: string
    readonly stageRamp: string
    readonly stageHoldTarget: string
  }
  readonly anchors: {
    readonly settings: string
    readonly settingsDisabled: string
    readonly learn: string
    readonly learnDisabled: string
  }
  readonly stats: {
    readonly sessionsCount: (n: number) => string
    readonly totalMinutes: (seconds: number) => string
    readonly lastSessionPrefix: (date: string, duration: string) => string
    readonly totalSuffix: string
    readonly reset: string
  }
  readonly breathing: {
    readonly inhale: string
    readonly exhale: string
    readonly breathingShapeAriaLabel: string
    readonly leadInAriaLabel: (digit: number) => string
  }
  readonly learn: {
    readonly title: string
    readonly close: string
    readonly resourcesHeading: string
    readonly videosHeading: string
    readonly nativeAppsHeading: string
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
    readonly settingsLabel: string    // Phase 29 D-03: benefit-describing section label for the Settings install row
  }
  readonly practice: {
    readonly toggleLabel: string
    readonly resonantName: string
    readonly naviKriyaName: string
    readonly resonantHeading: string
    readonly naviKriyaHeading: string
    readonly naviKriyaHeader: string
    readonly naviKriyaControlsPlaceholder: string
    readonly naviKriyaStatsEmptyBody: string
    readonly resetStatsTitle: (practiceName: string) => string
  }
}

export const UI_STRINGS: Readonly<Record<LocaleId, UiStrings>> = {
  en: {
    app: {
      header: 'HRV practice',
      title: 'HRV Breathing',
    },
    controls: {
      startSession: 'Start session',
      endSession: 'End session',
      cancel: 'Cancel',
    },
    endSessionDialog: {
      title: 'End this session?',
      confirm: 'End',
      cancel: 'Keep going',
    },
    resetStatsDialog: {
      title: 'Reset practice stats?',
      confirm: 'Reset',
      cancel: 'Keep',
    },
    settings: {
      title: 'Settings',
      close: 'Close',
      themeLabel: 'Theme',
      variantLabel: 'Variant',
      cueLabel: 'Cue style',
      timbreLabel: 'Timbre',
      languageLabel: 'Language',
    },
    themes: {
      light: 'Light',
      dark: 'Dark',
      system: 'System',
      moss: 'Moss',
      slate: 'Slate',
      dusk: 'Dusk',
    },
    variants: {
      orb: 'Orb',
      square: 'Square',
      diamond: 'Diamond',
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
      chime: 'Chime',
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
    mute: {
      mute: 'Mute audio cues',
      unmute: 'Unmute audio cues',
      resume: 'Resume audio',
      unavailable: 'Audio unavailable in this browser',
      audioPausedAnnouncement: 'Audio paused, tap to resume',
    },
    readout: {
      elapsed: 'Elapsed',
      remaining: 'Remaining',
      readoutAriaLabel: 'Session readout',
      announcementAriaLabel: 'Session announcement',
      sessionComplete: 'Session complete',
      currentBpmLabel: 'BPM',
      stageLabel: 'Stage',
      stageHoldInitial: 'Warm-up',
      stageRamp: 'Stretch',
      stageHoldTarget: 'Settle',
    },
    anchors: {
      settings: 'Settings',
      settingsDisabled: 'Settings (unavailable during session)',
      learn: 'Learn',
      learnDisabled: 'Learn (unavailable during session)',
    },
    stats: {
      sessionsCount: (n) => (n === 1 ? '1 session' : `${String(n)} sessions`),
      totalMinutes: (seconds) => {
        const minutes = Math.round(seconds / 60)
        return `${String(minutes)} min`
      },
      lastSessionPrefix: (date, duration) => `Last: ${date} · ${duration}`,
      totalSuffix: 'total',
      reset: 'Reset',
    },
    breathing: {
      inhale: 'In',
      exhale: 'Out',
      breathingShapeAriaLabel: 'Breathing shape',
      leadInAriaLabel: (d) => `Lead-in ${String(d)}`,
    },
    learn: {
      title: 'About this practice',
      close: 'Close',
      resourcesHeading: 'Forrest Knutson Resources',
      videosHeading: 'Selected HRV Breathing Videos',
      nativeAppsHeading: 'Resonant Breathing app',
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
    practice: {
      toggleLabel: 'Switch practice',
      resonantName: 'Resonant Breathing',
      naviKriyaName: 'Navi Kriya',
      resonantHeading: 'Resonant Breathing',
      naviKriyaHeading: 'Navi Kriya',
      naviKriyaHeader: 'Navi practice',
      naviKriyaControlsPlaceholder: 'Controls coming soon',
      naviKriyaStatsEmptyBody: 'Navi Kriya sessions will appear here after completing your first session.',
      resetStatsTitle: (practiceName) => `Reset ${practiceName} stats?`,
    },
  },
  'pt-BR': {
    app: {
      header: 'PRÁTICA VFC',
      title: 'Respiração VFC',
    },
    controls: {
      startSession: 'Iniciar sessão',
      endSession: 'Encerrar sessão',
      cancel: 'Cancelar',
    },
    endSessionDialog: {
      title: 'Encerrar esta sessão?',
      confirm: 'Encerrar',
      cancel: 'Continuar',
    },
    resetStatsDialog: {
      title: 'Zerar estatísticas de prática?',
      confirm: 'Zerar',
      cancel: 'Manter',
    },
    settings: {
      title: 'Configurações',
      close: 'Fechar',
      themeLabel: 'Tema',
      variantLabel: 'Variante',
      cueLabel: 'Estilo de guia',
      timbreLabel: 'Timbre',
      languageLabel: 'Idioma',
    },
    themes: {
      light: 'Claro',
      dark: 'Escuro',
      system: 'Sistema',
      moss: 'Musgo',
      slate: 'Ardósia',
      dusk: 'Crepúsculo',
    },
    variants: {
      orb: 'Esfera',
      square: 'Quadrado',
      diamond: 'Losango',
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
      chime: 'Carrilhão',
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
    mute: {
      mute: 'Silenciar sons',
      unmute: 'Reativar sons',
      resume: 'Retomar áudio',
      unavailable: 'Áudio indisponível neste navegador',
      audioPausedAnnouncement: 'Áudio pausado, toque para retomar',
    },
    readout: {
      elapsed: 'Decorrido',
      remaining: 'Restante',
      readoutAriaLabel: 'Informações da sessão',
      announcementAriaLabel: 'Anúncio da sessão',
      sessionComplete: 'Sessão concluída',
      currentBpmLabel: 'RPM',
      stageLabel: 'Fase',
      stageHoldInitial: 'Aquecimento',
      stageRamp: 'Progressão',
      stageHoldTarget: 'Estabilizar',
    },
    anchors: {
      settings: 'Configurações',
      settingsDisabled: 'Configurações (indisponível durante a sessão)',
      learn: 'Saiba mais',
      learnDisabled: 'Saiba mais (indisponível durante a sessão)',
    },
    stats: {
      sessionsCount: (n) =>
        n === 1 ? '1 sessão' : `${String(n)} sessões`,
      totalMinutes: (seconds) => {
        const minutes = Math.round(seconds / 60)
        return `${String(minutes)} min`
      },
      lastSessionPrefix: (date, duration) => `Última sessão: ${date} · ${duration}`,
      totalSuffix: 'total',
      reset: 'Zerar',
    },
    breathing: {
      inhale: 'Puxa',
      exhale: 'Solta',
      breathingShapeAriaLabel: 'Forma de respiração',
      leadInAriaLabel: (d) => `Contagem regressiva ${String(d)}`,
    },
    learn: {
      title: 'Sobre esta prática',
      close: 'Fechar',
      resourcesHeading: 'Recursos do Forrest Knutson',
      videosHeading: 'Vídeos selecionados de respiração VFC',
      nativeAppsHeading: 'App Resonant Breathing',
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
    practice: {
      toggleLabel: 'Switch practice',
      resonantName: 'Resonant Breathing',
      naviKriyaName: 'Navi Kriya',
      resonantHeading: 'Resonant Breathing',
      naviKriyaHeading: 'Navi Kriya',
      naviKriyaHeader: 'Navi practice',
      naviKriyaControlsPlaceholder: 'Controls coming soon',
      naviKriyaStatsEmptyBody: 'Navi Kriya sessions will appear here after completing your first session.',
      resetStatsTitle: (practiceName) => `Reset ${practiceName} stats?`,
    },
  },
} as const satisfies Readonly<Record<LocaleId, UiStrings>>

export const LOCALE_DISPLAY_NAMES: Readonly<Record<LocaleId, string>> = {
  en: 'English',
  'pt-BR': 'Português (Brasil)',
} as const satisfies Readonly<Record<LocaleId, string>>
