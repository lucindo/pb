// About-page copy. Ordered sections, rendered top-to-bottom by LearnPanel; the
// locked affiliation line lives in src/content/lockedCopy.ts and is composed at
// render time. Claim-safe — describes mechanics only, no clinical claims (see
// the clinical-verbs guard in learnContent.test.ts).

import type { LocaleId } from '../domain'

export interface ExplainerSection {
  readonly title: string
  readonly body: string
}

export interface LearnContent {
  readonly sections: readonly ExplainerSection[]
}

export const LEARN_CONTENT: Readonly<Record<LocaleId, LearnContent>> = {
  en: {
    sections: [
      {
        title: 'What is Pattern Breathing',
        body: 'Pattern Breathing is a simple timer for paced breathing. You pick a pattern — how long to breathe in, hold, breathe out, and hold again — and the app guides each phase with a ring and optional sound. No accounts, no tracking; everything stays on your device.',
      },
      {
        title: 'How it works',
        body: 'Each round walks through four phases: in, hold, out, hold. The ring fills as you breathe in, stays full while you hold, drains as you breathe out, and rests before the next round. Scale multiplies every phase by the same amount, so you can take a pattern to a slower pace without changing its shape. Set a number of rounds, or leave it open-ended (∞) and breathe until you stop.',
      },
      {
        title: 'The presets',
        body: 'Three presets are built in. Box-4 is an even four-count through every phase — in, hold, out, hold. 4-7-8 has a longer exhale: in for four, hold for seven, out for eight, with no final hold. 1-4-2 keeps a one-four-two shape — a short inhale, a hold four times as long, an exhale twice the inhale — and Scale stretches all three together. Change any field and the preset simply reads as Custom.',
      },
    ],
  },
  'pt-BR': {
    sections: [
      {
        title: 'O que é Pattern Breathing',
        body: 'O Pattern Breathing é um cronômetro simples para respiração ritmada. Você escolhe um padrão — quanto tempo inspirar, segurar, expirar e segurar de novo — e o app conduz cada fase com um anel e som opcional. Sem contas, sem rastreamento; tudo fica no seu dispositivo.',
      },
      {
        title: 'Como funciona',
        body: 'Cada ciclo passa por quatro fases: inspira, segura, expira, segura. O anel se enche enquanto você inspira, fica cheio durante a pausa, esvazia enquanto você expira e descansa antes do próximo ciclo. A Escala multiplica todas as fases pelo mesmo valor, então dá para levar um padrão a um ritmo mais lento sem mudar seu formato. Defina um número de ciclos ou deixe em aberto (∞) e respire até quando quiser.',
      },
      {
        title: 'As predefinições',
        body: 'São três predefinições prontas. A Box-4 mantém uma contagem igual de quatro em todas as fases — inspira, segura, expira, segura. A 4-7-8 tem a expiração mais longa: inspira em quatro, segura em sete, expira em oito, sem pausa final. A 1-4-2 guarda a proporção um-quatro-dois — uma inspiração curta, uma pausa quatro vezes maior e uma expiração com o dobro da inspiração — e a Escala estica as três juntas. Mude qualquer campo e a predefinição passa a constar como Personalizado.',
      },
    ],
  },
} as const satisfies Readonly<Record<LocaleId, LearnContent>>
