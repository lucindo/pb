import { describe, expect, it } from 'vitest'

import { LEARN_CONTENT } from './learnContent'
import { LOCALE_OPTIONS } from '../domain/settings'

for (const locale of LOCALE_OPTIONS) {
  describe(`LEARN_CONTENT[${locale}] structural contract`, () => {
    it(`[${locale}] section1 has non-empty title and body`, () => {
      expect(LEARN_CONTENT[locale].section1.title.length).toBeGreaterThan(0)
      expect(LEARN_CONTENT[locale].section1.body.length).toBeGreaterThan(0)
    })
  })
}

describe('LEARN_CONTENT section titles', () => {
  it('en section1 title is "What is Pattern Breathing"', () => {
    expect(LEARN_CONTENT.en.section1.title).toBe('What is Pattern Breathing')
  })

  it('pt-BR section1 title is "O que é Pattern Breathing"', () => {
    expect(LEARN_CONTENT['pt-BR'].section1.title).toBe('O que é Pattern Breathing')
  })
})

for (const locale of LOCALE_OPTIONS) {
  describe(`LEARN_CONTENT[${locale}] clinical-verbs guard`, () => {
    const enClinicalVerbs = /\b(improves|treats|cures|heals|diagnoses)\b/i
    const ptBrClinicalVerbs = /\b(melhora|trata|cura|diagnostica|avalia)\b/i
    const clinicalVerbs = locale === 'en' ? enClinicalVerbs : ptBrClinicalVerbs

    it(`[${locale}] section1 body has no forbidden clinical verbs`, () => {
      expect(LEARN_CONTENT[locale].section1.body).not.toMatch(clinicalVerbs)
    })
  })
}
