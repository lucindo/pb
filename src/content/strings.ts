// Source file authority: Phase 19 I18N-01..I18N-07.
// D-01 strings catalog separation: UI strings live here, not inline in components.
// D-10 nested-interface decision: UiStrings uses sub-objects per component/feature.
// D-12 option-name translation: theme/variant/timbre option names are translated.
// D-14 native-endonym LOCALE_DISPLAY_NAMES: picker labels use native endonyms.
// D-15 template-fn entries: interpolated strings are typed as functions.
// EN values are the literals currently shipped in source components.
// PT-BR values are machine-translated; every translatable entry carries
// "// TODO: native-speaker review" per I18N-07.

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
  },
  'pt-BR': {
    app: {
      header: 'PRÁTICA VFC', // TODO: native-speaker review
      title: 'Respiração VFC', // TODO: native-speaker review
    },
    controls: {
      startSession: 'Iniciar sessão', // TODO: native-speaker review
      endSession: 'Encerrar sessão', // TODO: native-speaker review
      cancel: 'Cancelar', // TODO: native-speaker review
    },
    endSessionDialog: {
      title: 'Encerrar esta sessão?', // TODO: native-speaker review
      confirm: 'Encerrar', // TODO: native-speaker review
      cancel: 'Continuar', // TODO: native-speaker review
    },
    resetStatsDialog: {
      title: 'Reiniciar estatísticas?', // TODO: native-speaker review
      confirm: 'Reiniciar', // TODO: native-speaker review
      cancel: 'Manter', // TODO: native-speaker review
    },
    settings: {
      title: 'Configurações', // TODO: native-speaker review
      close: 'Fechar', // TODO: native-speaker review
      themeLabel: 'Tema', // TODO: native-speaker review
      variantLabel: 'Variante', // TODO: native-speaker review
      timbreLabel: 'Timbre', // TODO: native-speaker review
      languageLabel: 'Idioma', // TODO: native-speaker review
    },
    themes: {
      light: 'Claro', // TODO: native-speaker review
      dark: 'Escuro', // TODO: native-speaker review
      system: 'Sistema', // TODO: native-speaker review
      moss: 'Musgo', // TODO: native-speaker review
      slate: 'Ardósia', // TODO: native-speaker review
      dusk: 'Crepúsculo', // TODO: native-speaker review
    },
    variants: {
      orb: 'Esfera', // TODO: native-speaker review
      square: 'Quadrado', // TODO: native-speaker review
      diamond: 'Losango', // TODO: native-speaker review
    },
    timbres: {
      bowl: 'Taça', // TODO: native-speaker review
      bell: 'Sino', // TODO: native-speaker review
      sine: 'Senoidal', // TODO: native-speaker review
      chime: 'Carrilhão', // TODO: native-speaker review
    },
    settingsForm: {
      ariaLabel: 'Configurações da sessão', // TODO: native-speaker review
      bpmLabel: 'BPM', // TODO: native-speaker review
      ratioLabel: 'Proporção', // TODO: native-speaker review
      durationLabel: 'Duração', // TODO: native-speaker review
      openEndedLabel: 'Aberta', // TODO: native-speaker review
      bpmUnit: 'BPM', // TODO: native-speaker review
      minutesUnit: 'min', // TODO: native-speaker review
      stepper: {
        fieldAriaLabel: (l) => l,
        decreaseLabel: (l) => `Diminuir ${l}`, // TODO: native-speaker review
        increaseLabel: (l) => `Aumentar ${l}`, // TODO: native-speaker review
      },
      sessionModeLabel: 'Modo de sessão', // TODO: native-speaker review
      modeStandard: 'Padrão', // TODO: native-speaker review
      modeStretch: 'Alongamento', // TODO: native-speaker review
      initialBpmLabel: 'BPM inicial', // TODO: native-speaker review
      targetBpmLabel: 'BPM alvo', // TODO: native-speaker review
      holdInitialLabel: 'Aquecimento', // TODO: native-speaker review
      holdTargetLabel: 'Acalmar', // TODO: native-speaker review
      rampDurationLabel: 'Alongamento', // TODO: native-speaker review
      holdOpenEndedLabel: 'Aberto', // TODO: native-speaker review
    },
    mute: {
      mute: 'Silenciar áudio', // TODO: native-speaker review
      unmute: 'Reativar áudio', // TODO: native-speaker review
      resume: 'Retomar áudio', // TODO: native-speaker review
      unavailable: 'Áudio indisponível neste navegador', // TODO: native-speaker review
      audioPausedAnnouncement: 'Áudio pausado, toque para retomar', // TODO: native-speaker review
    },
    readout: {
      elapsed: 'Decorrido', // TODO: native-speaker review
      remaining: 'Restante', // TODO: native-speaker review
      readoutAriaLabel: 'Leitura da sessão', // TODO: native-speaker review
      announcementAriaLabel: 'Anúncio da sessão', // TODO: native-speaker review
      sessionComplete: 'Sessão concluída', // TODO: native-speaker review
      currentBpmLabel: 'BPM', // TODO: native-speaker review
      stageLabel: 'Estágio', // TODO: native-speaker review
      stageHoldInitial: 'Aquecimento', // TODO: native-speaker review
      stageRamp: 'Alongamento', // TODO: native-speaker review
      stageHoldTarget: 'Acalmar', // TODO: native-speaker review
    },
    anchors: {
      settings: 'Configurações', // TODO: native-speaker review
      settingsDisabled: 'Configurações (indisponíveis durante a sessão)', // TODO: native-speaker review
      learn: 'Aprenda', // TODO: native-speaker review
      learnDisabled: 'Aprenda (indisponível durante a sessão)', // TODO: native-speaker review
    },
    stats: {
      sessionsCount: (n) =>
        n === 1 ? '1 sessão' : `${String(n)} sessões`, // TODO: native-speaker review
      totalMinutes: (seconds) => {
        const minutes = Math.round(seconds / 60)
        return `${String(minutes)} min` // TODO: native-speaker review
      },
      lastSessionPrefix: (date, duration) => `Último: ${date} · ${duration}`, // TODO: native-speaker review
      totalSuffix: 'total', // TODO: native-speaker review
      reset: 'Zerar', // TODO: native-speaker review
    },
    breathing: {
      inhale: 'Puxa', // TODO: native-speaker review
      exhale: 'Solta', // TODO: native-speaker review
      breathingShapeAriaLabel: 'Forma da respiração', // TODO: native-speaker review
      leadInAriaLabel: (d) => `Contagem regressiva ${String(d)}`, // TODO: native-speaker review
    },
    learn: {
      title: 'Sobre esta prática', // TODO: native-speaker review
      close: 'Fechar', // TODO: native-speaker review
      resourcesHeading: 'Links do Forrest Knutson', // TODO: native-speaker review
      videosHeading: 'Vídeos selecionados de respiração VFC', // TODO: native-speaker review
      nativeAppsHeading: 'App Resonant Breathing', // TODO: native-speaker review
    },
  },
} as const satisfies Readonly<Record<LocaleId, UiStrings>>

export const LOCALE_DISPLAY_NAMES: Readonly<Record<LocaleId, string>> = {
  en: 'English',
  'pt-BR': 'Português (Brasil)',
} as const satisfies Readonly<Record<LocaleId, string>>
