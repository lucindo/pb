// Source file authority: CONTEXT.md D-10 + Phase 19 I18N-01..07.
// Phase 32: restructured into per-practice partition. The shared base retains
// explainer.forrest and links.* (minus heroVideo/keyVideos which moved into
// practices.resonant.videos). A new `practices` map holds per-practice
// description sections and video links.
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

export interface PracticeLearnContent {
  readonly description: {
    readonly section1: ExplainerSection
    readonly section2: ExplainerSection
  }
  readonly videos: readonly LearnLink[]
}

export interface LearnContent {
  readonly explainer: {
    readonly forrest: ExplainerSection
  }
  readonly links: {
    readonly youtubeChannel: LearnLink
    readonly website: LearnLink
    readonly book: LearnLink
    readonly patreon: LearnLink
    readonly appStoreIos: LearnLink
    readonly googlePlayAndroid: LearnLink
  }
  readonly practices: {
    readonly resonant: PracticeLearnContent
    readonly naviKriya: PracticeLearnContent
  }
}

export const LEARN_CONTENT: Readonly<Record<LocaleId, LearnContent>> = {
  en: {
    explainer: {
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
      appStoreIos: {
        label: 'Resonant Breathing on the App Store',
        url: 'https://apps.apple.com/us/app/resonant-breathing/id1568058013',
      },
      googlePlayAndroid: {
        label: 'Resonant Breathing on Google Play',
        url: 'https://play.google.com/store/apps/details?id=com.johngoodstadt.knutson.meditation',
      },
    },
    practices: {
      resonant: {
        description: {
          section1: {
            title: 'What is HRV / resonance breathing',
            body: 'HRV breathing is a calm practice of slow paced breaths, usually fewer than seven per minute. At that low rate your breath gently aligns with your heart\'s natural rhythm — a state sometimes called resonance breathing. This is a quiet practice, not a clinical procedure or a measurement of your heart.',
          },
          section2: {
            title: 'How this app times your breath',
            body: 'This app guides one continuous inhale and exhale, with no pause held between them. You choose a slow rate under seven breaths per minute, and for uneven patterns the exhale is always the longer side. The on-screen orb and the optional bowl-like tones simply mark where you are in each breath.',
          },
        },
        videos: [
          {
            label: 'The Holy Trinity of Breath Induces HRV Resonance',
            url: 'https://www.youtube.com/watch?v=89WorFpMyY0',
          },
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
      naviKriya: {
        description: {
          section1: {
            title: 'What is Navi Kriya',
            body: 'Navi Kriya is an OM-counting meditation practice taught by Forrest Knutson. Each repetition of OM is counted at a chosen pace across the front and back of the body. This is a quiet seated practice — not a clinical procedure and not a physical exercise.',
          },
          section2: {
            title: 'How this app paces it',
            body: 'This app counts each OM at your chosen pace and automatically advances from the front phase to the back phase at a fixed 4-to-1 ratio. You configure the number of rounds and the OM length; the app tracks your progress and sounds an optional cue on each OM so your attention stays on the practice.',
          },
        },
        videos: [
          {
            label: 'The Guardian In Meditation',
            url: 'https://www.youtube.com/watch?v=M3t7gY_yak8',
          },
          {
            label: 'Navi Kriya Walkthrough',
            url: 'https://www.youtube.com/watch?v=A4BGQCIp9fI',
          },
        ],
      },
    },
  },
  'pt-BR': {
    explainer: {
      forrest: {
        title: 'Quem é Forrest Knutson',
        // NOTE: "inspirado nos ensinamentos do Forrest" MUST NOT appear here — lives in lockedCopy.ts (Phase 19 D-04)
        body: "Forrest Knutson é um guru de Kriya Yoga, professor de meditação, autor e educador online, reconhecido por tornar práticas yóguicas e contemplativas milenares acessíveis ao público moderno. Por meio de seus vídeos e ensinamentos, ele explica técnicas de respiração, meditação, regulação do sistema nervoso e desenvolvimento espiritual. Seu trabalho é valorizado pela combinação de instrução prática com explicações claras e embasadas na ciência, tornando conceitos espirituais complexos mais compreensíveis.\n\nEste é um aplicativo web independente criado para que qualquer pessoa possa seguir um ritmo de respiração calmo pelo navegador. Os links abaixo apontam para o canal, o site e vídeos de introdução selecionados.",
      },
    },
    links: {
      youtubeChannel: {
        label: 'Canal do YouTube',
        url: 'https://www.youtube.com/@ForrestKnutson',
      },
      website: {
        label: 'Site/Treinamentos',
        url: 'https://www.meditativemellows.com/',
      },
      book: {
        label: 'Livro "Mastering Meditation"',
        url: 'https://www.amazon.com/Mastering-Meditation-Eight-Steps-Beginner-ebook/dp/B0CCFWP4W8?sr=8-1&linkId=1a5a2958fc89bdb6769b54d0bc9a4d17&language=en_US',
      },
      patreon: {
        label: 'Patreon',
        url: 'https://www.patreon.com/forrestknutson',
      },
      appStoreIos: {
        label: 'Resonant Breathing na App Store',
        url: 'https://apps.apple.com/us/app/resonant-breathing/id1568058013',
      },
      googlePlayAndroid: {
        label: 'Resonant Breathing no Google Play',
        url: 'https://play.google.com/store/apps/details?id=com.johngoodstadt.knutson.meditation',
      },
    },
    practices: {
      resonant: {
        description: {
          section1: {
            title: 'O que é VFC / respiração de ressonância',
            body: 'A respiração VFC é uma prática calma de respirações lentas, geralmente menos de sete por minuto. Nessa frequência baixa, sua respiração se alinha suavemente com o ritmo natural do coração — um estado por vezes chamado de respiração de ressonância. Esta é uma prática tranquila, não um procedimento clínico nem uma medição do coração.',
          },
          section2: {
            title: 'Como este app guia sua respiração',
            body: 'Este app guia uma inspiração e expiração contínuas, sem pausa entre elas. Escolha uma frequência lenta de menos de sete respirações por minuto; nos padrões assimétricos, a expiração é sempre a parte mais longa. O orbe na tela e os tons suaves de tigela marcam apenas onde você está em cada respiração.',
          },
        },
        videos: [
          {
            // Video title kept in English — YouTube source is English; no PT-BR title available.
            label: 'The Holy Trinity of Breath Induces HRV Resonance',
            url: 'https://www.youtube.com/watch?v=89WorFpMyY0',
          },
          {
            // Video title kept in English — YouTube source is English; no PT-BR title available.
            label: 'The Meditation Magic of Sitting Very Still - SVS',
            url: 'https://www.youtube.com/watch?v=6NpH44c34do',
          },
          {
            // Video title kept in English — YouTube source is English; no PT-BR title available.
            label: '4 Proofs of Meditation',
            url: 'https://www.youtube.com/watch?v=Kn_tQYaUO4M',
          },
          {
            // Video title kept in English — YouTube source is English; no PT-BR title available.
            label: 'Beginners Deep Meditation - Naturally - Clinical Mindfulness Technique',
            url: 'https://www.youtube.com/watch?v=gEc6RLixpVs',
          },
        ],
      },
      naviKriya: {
        description: {
          section1: {
            title: 'O que é Navi Kriya',
            body: 'Navi Kriya é uma prática de meditação com contagem de OMs ensinada por Forrest Knutson. Cada repetição do OM é contada em um ritmo escolhido ao longo da parte frontal e dorsal do corpo. Esta é uma prática silenciosa e sentada — não é um procedimento clínico nem um exercício físico.',
          },
          section2: {
            title: 'Como este app guia a prática',
            body: 'Este app conta cada OM no ritmo escolhido e avança automaticamente da fase frontal para a fase dorsal em uma proporção fixa de 4 para 1. Você configura o número de rodadas e a duração de cada OM; o app acompanha seu progresso e emite um sinal sonoro opcional a cada OM para manter sua atenção na prática.',
          },
        },
        videos: [
          {
            // Video title kept in English — YouTube source is English; no PT-BR title available.
            label: 'The Guardian In Meditation',
            url: 'https://www.youtube.com/watch?v=M3t7gY_yak8',
          },
          {
            // Video title kept in English — YouTube source is English; no PT-BR title available.
            label: 'Navi Kriya Walkthrough',
            url: 'https://www.youtube.com/watch?v=A4BGQCIp9fI',
          },
        ],
      },
    },
  },
} as const satisfies Readonly<Record<LocaleId, LearnContent>>
