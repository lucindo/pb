// Source file authority: CONTEXT.md D-10.
// Section keys (`hrv`, `timing`, `forrest`) are i18n-stable identifiers for future
// locale swap (v2 I18N-01). English-only content in v1; no runtime i18n framework.
// Disclaimer copy is intentionally inlined in `LearnDialog.tsx` per CONTEXT.md
// §Established Patterns — short copy stays inline; explainer lives in this asset.
// Do NOT add disclaimer strings to this module.

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

export const LEARN_CONTENT: LearnContent = {
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
      body: "Forrest Knutson is a teacher who has shared HRV breathing practice for many years on YouTube. This is an independent web app inspired by Forrest's teachings, made so anyone can follow a calm paced breath from a browser. The links below point to his channel, his site, and hand-picked starting videos.",
    },
  },
  links: {
    youtubeChannel: {
      label: 'YouTube channel',
      url: 'https://www.youtube.com/@ForrestKnutson',
    },
    website: {
      label: 'Website',
      url: 'https://www.meditativemellows.com/',
    },
    book: {
      label: 'Book',
      url: 'https://amzn.to/3RTAVqi',
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
} as const satisfies LearnContent
