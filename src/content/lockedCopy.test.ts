import { describe, expect, it } from 'vitest'

import { LOCKED_COPY } from './lockedCopy'

describe('LOCKED_COPY frozen-EN snapshot (D-02)', () => {
  it('medicalAdviceLine matches EN baseline byte-exact (em-dash U+2014)', () => {
    expect(LOCKED_COPY.en.medicalAdviceLine).toBe("Guided breathing practice — not medical advice.")
  })

  it('affiliationLine matches EN baseline byte-exact', () => {
    expect(LOCKED_COPY.en.affiliationLine).toBe("Independent project.")
  })
})

describe('LOCKED_COPY frozen-PT-BR snapshot (D-02 parity)', () => {
  it('medicalAdviceLine matches PT-BR baseline byte-exact (em-dash U+2014)', () => {
    expect(LOCKED_COPY['pt-BR'].medicalAdviceLine).toBe(
      'Prática de respiração guiada — não é conselho médico.',
    )
  })

  it('affiliationLine matches PT-BR baseline byte-exact', () => {
    expect(LOCKED_COPY['pt-BR'].affiliationLine).toBe('Projeto independente.')
  })
})
