import { describe, expect, it } from 'vitest'

import { LEARN_CONTENT } from './learnContent'
import { LOCALE_OPTIONS } from '../domain/settings'

for (const locale of LOCALE_OPTIONS) {
  describe(`LEARN_CONTENT[${locale}] structural contract`, () => {
    it(`[${locale}] every section has non-empty title and body`, () => {
      const { sections } = LEARN_CONTENT[locale]
      expect(sections.length).toBeGreaterThan(0)
      for (const section of sections) {
        expect(section.title.length).toBeGreaterThan(0)
        expect(section.body.length).toBeGreaterThan(0)
      }
    })
  })
}

describe('LEARN_CONTENT intro titles', () => {
  it('en first section is "What is Pattern Breathing"', () => {
    expect(LEARN_CONTENT.en.sections[0]?.title).toBe('What is Pattern Breathing')
  })

  it('pt-BR first section is "O que é Pattern Breathing"', () => {
    expect(LEARN_CONTENT['pt-BR'].sections[0]?.title).toBe('O que é Pattern Breathing')
  })
})

for (const locale of LOCALE_OPTIONS) {
  describe(`LEARN_CONTENT[${locale}] clinical-verbs guard`, () => {
    const enClinicalVerbs = /\b(improves|treats|cures|heals|diagnoses)\b/i
    const ptBrClinicalVerbs = /\b(melhora|trata|cura|diagnostica|avalia)\b/i
    const clinicalVerbs = locale === 'en' ? enClinicalVerbs : ptBrClinicalVerbs

    it(`[${locale}] no section body uses forbidden clinical verbs`, () => {
      const allCopy = LEARN_CONTENT[locale].sections
        .map((s) => `${s.title} ${s.body}`)
        .join(' ')
      expect(allCopy).not.toMatch(clinicalVerbs)
    })
  })
}
