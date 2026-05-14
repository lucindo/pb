// Source file authority: CONTEXT.md D-10 + Phase 19 I18N-01..07.
// Section keys (`hrv`, `timing`, `forrest`) are i18n-stable identifiers; Phase 19
// converted the top-level shape to Readonly<Record<LocaleId, LearnContent>>.
// The locked Forrest phrase no longer appears inside forrest.body — it lives in
// src/content/lockedCopy.ts (LOCKED_COPY.*.inspiredByForrest) and is composed at
// render time by LearnDialog.tsx (Phase 19 D-04).

import type { LocaleId } from '../domain/settings'

export interface ExplainerSection {
  readonly title: string
  readonly body: string
}

export interface LearnLink {
  readonly label: string
  readonly url: string
}

export interface LearnContent {
  readonly explainer: {
    readonly hrv: ExplainerSection
    readonly timing: ExplainerSection
    readonly forrest: ExplainerSection
  }
  readonly links: {
    readonly youtubeChannel: LearnLink
    readonly website: LearnLink
    readonly book: LearnLink
    readonly patreon: LearnLink
    readonly heroVideo: LearnLink
    readonly keyVideos: readonly LearnLink[]
  }
}

export const LEARN_CONTENT: Readonly<Record<LocaleId, LearnContent>> = {
  en: {
    explainer: {
      hrv: {
        title: 'What is HRV / resonance breathing',
        body: 'HRV breathing is a calm practice of slow paced breaths, usually fewer than seven per minute. At that low rate your breath gently aligns with your heart\'s natural rhythm — a state sometimes called resonance breathing. This is a quiet practice, not a clinical procedure or a measurement of your heart.',
      },
      timing: {
        title: 'How this app times your breath',
        body: 'This app guides one continuous inhale and exhale, with no pause held between them. You choose a slow rate under seven breaths per minute, and for uneven patterns the exhale is always the longer side. The on-screen orb and the optional bowl-like tones simply mark where you are in each breath.',
      },
      forrest: {
        title: 'Who is Forrest Knutson',
        // STRIPPED: locked Forrest phrase removed — lives in lockedCopy.ts as inspiredByForrest (Phase 19 D-04)
        body: "Forrest Knutson is a Kriya Yoga guru, meditation teacher, author, and online educator best known for simplifying ancient yogic and contemplative practices for modern audiences. Through his videos and teachings, he explains techniques related to breathwork, meditation, nervous system regulation, and spiritual development. His work is appreciated for combining practical instruction with clear, science-informed explanations that make complex spiritual concepts more accessible.\n\nThis is an independent web app made so anyone can follow a calm paced breath from a browser. The links below point to his channel, his site, and hand-picked starting videos.",
      },
    },
    links: {
      youtubeChannel: {
        label: 'YouTube channel',
        url: 'https://www.youtube.com/@ForrestKnutson',
      },
      website: {
        label: 'Website/Trainings',
        url: 'https://www.meditativemellows.com/',
      },
      book: {
        label: '"Mastering Meditation" book',
        url: 'https://www.amazon.com/Mastering-Meditation-Eight-Steps-Beginner-ebook/dp/B0CCFWP4W8?sr=8-1&linkId=1a5a2958fc89bdb6769b54d0bc9a4d17&language=en_US',
      },
      patreon: {
        label: 'Patreon',
        url: 'https://www.patreon.com/forrestknutson',
      },
      heroVideo: {
        label: 'The Holy Trinity of Breath Induces HRV Resonance',
        url: 'https://www.youtube.com/watch?v=89WorFpMyY0',
      },
      keyVideos: [
        {
          label: 'The Meditation Magic of Sitting Very Still - SVS',
          url: 'https://www.youtube.com/watch?v=6NpH44c34do',
        },
        {
          label: '4 Proofs of Meditation',
          url: 'https://www.youtube.com/watch?v=Kn_tQYaUO4M',
        },
        {
          label: 'Beginners Deep Meditation - Naturally - Clinical Mindfulness Technique',
          url: 'https://www.youtube.com/watch?v=gEc6RLixpVs',
        },
      ],
    },
  },
  'pt-BR': {
    explainer: {
      hrv: {
        // TODO: native-speaker review
        title: 'O que é HRV / respiração de ressonância',
        // TODO: native-speaker review
        body: 'A respiração HRV é uma prática calma de respirações lentas, geralmente menos de sete por minuto. Nessa frequência baixa, sua respiração se alinha suavemente com o ritmo natural do seu coração — um estado por vezes chamado de respiração de ressonância. Esta é uma prática tranquila, não um procedimento clínico nem uma medição do seu coração.',
      },
      timing: {
        // TODO: native-speaker review
        title: 'Como este app cronometra sua respiração',
        // TODO: native-speaker review
        body: 'Este app guia uma inalação e exalação contínuas, sem pausa entre elas. Você escolhe uma frequência lenta abaixo de sete respirações por minuto e, para padrões assimétricos, a exalação é sempre o lado mais longo. O orbe na tela e os tons opcionais semelhantes a tigelas simplesmente marcam onde você está em cada respiração.',
      },
      forrest: {
        // TODO: native-speaker review
        title: 'Quem é Forrest Knutson',
        // TODO: native-speaker review
        // NOTE: "inspirado nos ensinamentos do Forrest" MUST NOT appear here — lives in lockedCopy.ts (Phase 19 D-04)
        body: "Forrest Knutson é um guru de Kriya Yoga, professor de meditação, autor e educador online conhecido por simplificar práticas yóguicas e contemplativas ancestrais para o público moderno. Por meio de seus vídeos e ensinamentos, ele explica técnicas relacionadas a exercícios respiratórios, meditação, regulação do sistema nervoso e desenvolvimento espiritual. Seu trabalho é apreciado por combinar instrução prática com explicações claras e fundamentadas na ciência, tornando conceitos espirituais complexos mais acessíveis.\n\nEste é um aplicativo web independente feito para que qualquer pessoa possa acompanhar uma respiração calma e pausada pelo navegador. Os links abaixo apontam para o canal dele, seu site e vídeos iniciais selecionados.",
      },
    },
    links: {
      youtubeChannel: {
        // TODO: native-speaker review
        label: 'Canal do YouTube',
        url: 'https://www.youtube.com/@ForrestKnutson',
      },
      website: {
        // TODO: native-speaker review
        label: 'Site/Treinamentos',
        url: 'https://www.meditativemellows.com/',
      },
      book: {
        // TODO: native-speaker review
        label: 'Livro "Mastering Meditation"',
        url: 'https://www.amazon.com/Mastering-Meditation-Eight-Steps-Beginner-ebook/dp/B0CCFWP4W8?sr=8-1&linkId=1a5a2958fc89bdb6769b54d0bc9a4d17&language=en_US',
      },
      patreon: {
        // TODO: native-speaker review
        label: 'Patreon',
        url: 'https://www.patreon.com/forrestknutson',
      },
      heroVideo: {
        // TODO: native-speaker review
        label: 'A Santíssima Trindade da Respiração Induz a Ressonância HRV',
        url: 'https://www.youtube.com/watch?v=89WorFpMyY0',
      },
      keyVideos: [
        {
          // TODO: native-speaker review
          label: 'A Magia da Meditação Sentado Muito Quieto - SVS',
          url: 'https://www.youtube.com/watch?v=6NpH44c34do',
        },
        {
          // TODO: native-speaker review
          label: '4 Provas da Meditação',
          url: 'https://www.youtube.com/watch?v=Kn_tQYaUO4M',
        },
        {
          // TODO: native-speaker review
          label: 'Meditação Profunda para Iniciantes - Naturalmente - Técnica Clínica de Mindfulness',
          url: 'https://www.youtube.com/watch?v=gEc6RLixpVs',
        },
      ],
    },
  },
} as const satisfies Readonly<Record<LocaleId, LearnContent>>
