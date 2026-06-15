// UI strings catalog — all UI strings live here, not inline in components.
// UiStrings uses sub-objects per component/feature.
// Theme/variant/timbre option names are translated; picker labels use native endonyms.
// Interpolated strings are typed as functions.
// EN values are the literals currently shipped in source components.
// PT-BR values reviewed by a native speaker.
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
    readonly title: string
    readonly topBar: {
      readonly settings: string
      readonly settingsDisabled: string
      readonly learn: string
      readonly learnDisabled: string
    }
    readonly switcher: {
      readonly resonantName: string
      readonly resonantHeading: string
    }
    readonly controls: {
      readonly startSession: string
      readonly endSession: string
      readonly cancel: string
      readonly done: string
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
      readonly takeAMoment: string
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
    readonly timbreLabel: string
    readonly languageLabel: string
    readonly bypassSilentMode: {
      readonly label: string
    }
    readonly sections: {
      readonly system: string
      readonly sound: string
      readonly statistics: string
      readonly about: string
    }
    readonly about: {
      readonly versionLabel: string
      readonly sourceLinkText: string
    }
    readonly themes: {
      readonly light: string
      readonly dark: string
      readonly system: string
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
  }
  readonly stats: {
    readonly fields: {
      readonly sessions: string
      readonly totalTime: string
      readonly lastSession: string
    }
    // Coarse total-time format past 72h: e.g. ≈15 days (365h).
    readonly totalTimeDays: (days: number, hours: number) => string
    readonly empty: string
    readonly reset: string
    readonly resetConfirm: {
      readonly title: (practice: string) => string
      readonly body: string
      readonly confirm: string
      readonly cancel: string
    }
    readonly privacyNote: string
  }
  readonly install: {
    readonly installButton: string
    readonly iosStepsButton: string
    readonly iosStep1: string
    readonly iosStep2: string
    readonly iosStep3: string
    readonly settingsLabel: string
  }
}

export const UI_STRINGS: Readonly<Record<LocaleId, UiStrings>> = {
  en: {
    practice: {
      title: 'Pattern Breathing',
      topBar: {
        settings: 'Settings',
        settingsDisabled: 'Settings (unavailable during session)',
        learn: 'Learn',
        learnDisabled: 'Learn (unavailable during session)',
      },
      switcher: {
        resonantName: 'HRV',
        resonantHeading: 'HRV Breathing',
      },
      controls: {
        startSession: 'Start',
        endSession: 'End',
        cancel: 'Cancel',
        done: 'Done',
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
        takeAMoment: 'Take a moment',
      },
      settingsForm: {
        ariaLabel: 'Session settings',
        bpmLabel: 'BPM',
        ratioLabel: 'Ratio',
        durationLabel: 'Duration',
        openEndedLabel: '∞',
        bpmUnit: 'BPM',
        minutesUnit: 'min',
        stepper: {
          fieldAriaLabel: (l) => l,
          decreaseLabel: (l) => `Decrease ${l}`,
          increaseLabel: (l) => `Increase ${l}`,
        },
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
      timbreLabel: 'Timbre',
      languageLabel: 'Language',
      bypassSilentMode: { label: 'Bypass silent mode' },
      sections: {
        system: 'System',
        sound: 'Sound',
        statistics: 'Statistics',
        about: 'About',
      },
      about: {
        versionLabel: 'Version',
        sourceLinkText: 'Source',
      },
      themes: {
        light: 'Light',
        dark: 'Dark',
        system: 'System',
      },
      timbres: {
        bowl: 'Bowl',
        bell: 'Bell',
        sine: 'Sine',
        flute: 'Flute',
      },
    },
    learn: {
      title: 'About Pattern Breathing',
      close: 'Close',
    },
    stats: {
      fields: {
        sessions: 'Sessions',
        totalTime: 'Total time',
        lastSession: 'Last session',
      },
      totalTimeDays: (days, hours) => `≈${String(days)} days (${String(hours)}h)`,
      empty: '—',
      reset: 'Reset',
      resetConfirm: {
        title: (practice) => `Reset ${practice} stats?`,
        body: "This clears this practice's saved history. It can't be undone.",
        confirm: 'Reset',
        cancel: 'Keep',
      },
      privacyNote:
        'This app has no account and tracks nothing. These stats live only in this browser, on this device — clearing site data, switching browsers, or private browsing resets them.',
    },
    install: {
      installButton: 'Install',
      iosStepsButton: 'How to install',
      iosStep1: "Tap the Share button in Safari's toolbar",
      iosStep2: 'Tap "Add to Home Screen"',
      iosStep3: 'Tap "Add" to confirm',
      settingsLabel: 'Install for offline use',
    },
  },
  'pt-BR': {
    practice: {
      title: 'Pattern Breathing',
      topBar: {
        settings: 'Configurações',
        settingsDisabled: 'Configurações (indisponível durante a sessão)',
        learn: 'Saiba mais',
        learnDisabled: 'Saiba mais (indisponível durante a sessão)',
      },
      switcher: {
        resonantName: 'VFC',
        resonantHeading: 'Respiração VFC',
      },
      controls: {
        startSession: 'Iniciar',
        endSession: 'Encerrar',
        cancel: 'Cancelar',
        done: 'Concluído',
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
        takeAMoment: 'Respire fundo',
      },
      settingsForm: {
        ariaLabel: 'Configurações da sessão',
        bpmLabel: 'RPM',
        ratioLabel: 'Proporção',
        durationLabel: 'Duração',
        openEndedLabel: '∞',
        bpmUnit: 'RPM',
        minutesUnit: 'min',
        stepper: {
          fieldAriaLabel: (l) => l,
          decreaseLabel: (l) => `Diminuir ${l}`,
          increaseLabel: (l) => `Aumentar ${l}`,
        },
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
      timbreLabel: 'Timbre',
      languageLabel: 'Idioma',
      bypassSilentMode: { label: 'Ignorar modo silencioso' },
      sections: {
        // TODO: native-speaker review
        system: 'Sistema',
        sound: 'Som',
        statistics: 'Estatísticas',
        about: 'Sobre',
      },
      about: {
        versionLabel: 'Versão',
        sourceLinkText: 'Código-fonte',
      },
      themes: {
        light: 'Claro',
        dark: 'Escuro',
        system: 'Sistema',
      },
      timbres: {
        bowl: 'Tigela',
        bell: 'Sino',
        sine: 'Senoidal',
        flute: 'Flauta',
      },
    },
    learn: {
      title: 'Sobre Pattern Breathing',
      close: 'Fechar',
    },
    stats: {
      fields: {
        sessions: 'Sessões',
        totalTime: 'Tempo total',
        lastSession: 'Última sessão',
      },
      totalTimeDays: (days, hours) => `≈${String(days)} dias (${String(hours)}h)`,
      empty: '—',
      reset: 'Zerar',
      resetConfirm: {
        title: (practice) => `Zerar estatísticas de ${practice}?`,
        body: 'Isso apaga o histórico salvo desta prática. Não dá para desfazer.',
        confirm: 'Zerar',
        cancel: 'Manter',
      },
      privacyNote:
        'Este app não tem conta e não rastreia nada. Estas estatísticas vivem apenas neste navegador, neste dispositivo — limpar os dados do site, trocar de navegador ou usar uma janela anônima zera tudo.',
    },
    install: {
      installButton: 'Instalar',
      iosStepsButton: 'Como instalar',
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
