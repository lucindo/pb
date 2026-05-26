import { describe, expect, it } from 'vitest'

import { LOCKED_COPY } from './lockedCopy'
import { LEARN_CONTENT } from './learnContent'
import { LOCALE_OPTIONS } from '../domain/settings'

describe('LOCKED_COPY frozen-EN snapshot (D-02)', () => {
  it('inspiredByForrest matches EN baseline byte-exact', () => {
    expect(LOCKED_COPY.en.inspiredByForrest).toBe("inspired by Forrest's teachings")
  })

  it('medicalAdviceLine matches EN baseline byte-exact (em-dash U+2014)', () => {
    expect(LOCKED_COPY.en.medicalAdviceLine).toBe("Guided breathing practice — not medical advice.")
  })

  it('affiliationLine matches EN baseline byte-exact', () => {
    expect(LOCKED_COPY.en.affiliationLine).toBe("Independent project. Not affiliated with Forrest Knutson.")
  })
})

describe('LOCKED_COPY frozen-PT-BR snapshot (D-02 parity)', () => {
  it('inspiredByForrest matches PT-BR baseline byte-exact', () => {
    expect(LOCKED_COPY['pt-BR'].inspiredByForrest).toBe('inspirado nos ensinamentos do Forrest')
  })

  it('medicalAdviceLine matches PT-BR baseline byte-exact (em-dash U+2014)', () => {
    expect(LOCKED_COPY['pt-BR'].medicalAdviceLine).toBe(
      'Prática de respiração guiada — não é conselho médico.',
    )
  })

  it('affiliationLine matches PT-BR baseline byte-exact', () => {
    expect(LOCKED_COPY['pt-BR'].affiliationLine).toBe(
      'Projeto independente. Não afiliado ao Forrest Knutson.',
    )
  })
})

describe('LOCKED_COPY substring-absence guard (D-02 + D-04)', () => {
  it('learnContent[locale].explainer.forrest.body does NOT contain lockedCopy[locale].inspiredByForrest as substring', () => {
    for (const locale of LOCALE_OPTIONS) {
      expect(
        LEARN_CONTENT[locale].explainer.forrest.body.includes(LOCKED_COPY[locale].inspiredByForrest),
      ).toBe(false)
    }
  })
})
