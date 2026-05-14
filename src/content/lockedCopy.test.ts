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

describe('LOCKED_COPY PT-BR non-empty', () => {
  it('every PT-BR locked entry is non-empty', () => {
    expect(LOCKED_COPY['pt-BR'].inspiredByForrest.length).toBeGreaterThan(0)
    expect(LOCKED_COPY['pt-BR'].medicalAdviceLine.length).toBeGreaterThan(0)
    expect(LOCKED_COPY['pt-BR'].affiliationLine.length).toBeGreaterThan(0)
  })

  it('PT-BR medicalAdviceLine contains em-dash U+2014', () => {
    expect(LOCKED_COPY['pt-BR'].medicalAdviceLine.includes('—')).toBe(true)
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
