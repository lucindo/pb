import { describe, expect, it } from 'vitest'

import { LEARN_CONTENT } from './learnContent'
import { LOCALE_OPTIONS } from '../domain/settings'

for (const locale of LOCALE_OPTIONS) {
  describe(`LEARN_CONTENT[${locale}] structural contract`, () => {
    it(`[${locale}] explainer has exactly three keys in fixed order: hrv, timing, forrest (D-08)`, () => {
      expect(Object.keys(LEARN_CONTENT[locale].explainer)).toEqual(['hrv', 'timing', 'forrest'])
    })

    it(`[${locale}] hrv section has non-empty title and body`, () => {
      expect(LEARN_CONTENT[locale].explainer.hrv.title.length).toBeGreaterThan(0)
      expect(LEARN_CONTENT[locale].explainer.hrv.body.length).toBeGreaterThan(0)
    })

    it(`[${locale}] timing section has non-empty title and body`, () => {
      expect(LEARN_CONTENT[locale].explainer.timing.title.length).toBeGreaterThan(0)
      expect(LEARN_CONTENT[locale].explainer.timing.body.length).toBeGreaterThan(0)
    })

    it(`[${locale}] forrest section has non-empty title and body`, () => {
      expect(LEARN_CONTENT[locale].explainer.forrest.title.length).toBeGreaterThan(0)
      expect(LEARN_CONTENT[locale].explainer.forrest.body.length).toBeGreaterThan(0)
    })
  })
}

for (const locale of LOCALE_OPTIONS) {
  describe(`LEARN_CONTENT[${locale}] clinical-verbs guard`, () => {
    const enClinicalVerbs = /\b(improves|treats|cures|heals|diagnoses)\b/i
    const ptBrClinicalVerbs = /\b(melhora|trata|cura|diagnostica|avalia)\b/i
    const clinicalVerbs = locale === 'en' ? enClinicalVerbs : ptBrClinicalVerbs

    it(`[${locale}] hrv body has no forbidden clinical verbs (D-08 / LEARN-04)`, () => {
      expect(LEARN_CONTENT[locale].explainer.hrv.body).not.toMatch(clinicalVerbs)
    })

    it(`[${locale}] timing body has no forbidden clinical verbs (D-08 / LEARN-04)`, () => {
      expect(LEARN_CONTENT[locale].explainer.timing.body).not.toMatch(clinicalVerbs)
    })

    it(`[${locale}] forrest body has no forbidden clinical verbs (D-08 / LEARN-04)`, () => {
      expect(LEARN_CONTENT[locale].explainer.forrest.body).not.toMatch(clinicalVerbs)
    })
  })
}

describe('LEARN_CONTENT link contract', () => {
  it('book URL is the canonical amazon.com /dp/B0CCFWP4W8 URL (CONTENT-01 D-05)', () => {
    expect(LEARN_CONTENT.en.links.book.url).toBe('https://www.amazon.com/Mastering-Meditation-Eight-Steps-Beginner-ebook/dp/B0CCFWP4W8?sr=8-1&linkId=1a5a2958fc89bdb6769b54d0bc9a4d17&language=en_US')
  })

  it('book label is the Mastering Meditation pointer (2026-05-11 user rename)', () => {
    expect(LEARN_CONTENT.en.links.book.label).toBe('"Mastering Meditation" book')
  })

  it('youtubeChannel label is "YouTube channel" (LEARN-01)', () => {
    expect(LEARN_CONTENT.en.links.youtubeChannel.label).toBe('YouTube channel')
  })

  it('website label is "Website/Trainings" (2026-05-11 user rename)', () => {
    expect(LEARN_CONTENT.en.links.website.label).toBe('Website/Trainings')
  })

  it('patreon label is "Patreon" (D-12 execute-time amendment)', () => {
    expect(LEARN_CONTENT.en.links.patreon.label).toBe('Patreon')
  })

  it('patreon URL is https://www.patreon.com/forrestknutson (D-12 execute-time amendment)', () => {
    expect(LEARN_CONTENT.en.links.patreon.url).toBe('https://www.patreon.com/forrestknutson')
  })

  it('youtubeChannel URL starts with https:// (T-06-04)', () => {
    expect(LEARN_CONTENT.en.links.youtubeChannel.url.startsWith('https://')).toBe(true)
  })

  it('website URL starts with https:// (T-06-04)', () => {
    expect(LEARN_CONTENT.en.links.website.url.startsWith('https://')).toBe(true)
  })

  it('book URL starts with https:// (T-06-04)', () => {
    expect(LEARN_CONTENT.en.links.book.url.startsWith('https://')).toBe(true)
  })

  it('patreon URL starts with https:// (T-06-04)', () => {
    expect(LEARN_CONTENT.en.links.patreon.url.startsWith('https://')).toBe(true)
  })

  it('heroVideo URL starts with https:// (T-06-04)', () => {
    expect(LEARN_CONTENT.en.links.heroVideo.url.startsWith('https://')).toBe(true)
  })

  it('keyVideos length is between 0 and 5 inclusive (D-12 item 5 — LEARN-02)', () => {
    expect(LEARN_CONTENT.en.links.keyVideos.length).toBeGreaterThanOrEqual(0)
    expect(LEARN_CONTENT.en.links.keyVideos.length).toBeLessThanOrEqual(5)
  })

  it('every keyVideo URL starts with https://', () => {
    for (const video of LEARN_CONTENT.en.links.keyVideos) {
      expect(video.url.startsWith('https://')).toBe(true)
    }
  })

  it('no URL in links matches dangerous schemes javascript:, data:, vbscript: (T-06-04)', () => {
    const allUrls = [
      LEARN_CONTENT.en.links.book.url,
      LEARN_CONTENT.en.links.website.url,
      LEARN_CONTENT.en.links.youtubeChannel.url,
      LEARN_CONTENT.en.links.patreon.url,
      LEARN_CONTENT.en.links.heroVideo.url,
      ...LEARN_CONTENT.en.links.keyVideos.map((v) => v.url),
    ]
    for (const url of allUrls) {
      expect(url).not.toMatch(/^(javascript|data|vbscript):/i)
    }
  })
})

describe('LEARN_CONTENT PT-BR URL identity (D-12)', () => {
  it('youtubeChannel URL identical across locales', () => {
    expect(LEARN_CONTENT['pt-BR'].links.youtubeChannel.url).toBe(LEARN_CONTENT.en.links.youtubeChannel.url)
  })

  it('website URL identical across locales', () => {
    expect(LEARN_CONTENT['pt-BR'].links.website.url).toBe(LEARN_CONTENT.en.links.website.url)
  })

  it('book URL identical across locales', () => {
    expect(LEARN_CONTENT['pt-BR'].links.book.url).toBe(LEARN_CONTENT.en.links.book.url)
  })

  it('patreon URL identical across locales', () => {
    expect(LEARN_CONTENT['pt-BR'].links.patreon.url).toBe(LEARN_CONTENT.en.links.patreon.url)
  })

  it('heroVideo URL identical across locales', () => {
    expect(LEARN_CONTENT['pt-BR'].links.heroVideo.url).toBe(LEARN_CONTENT.en.links.heroVideo.url)
  })

  it('keyVideos URLs identical across locales', () => {
    for (let i = 0; i < LEARN_CONTENT.en.links.keyVideos.length; i++) {
      expect(LEARN_CONTENT['pt-BR'].links.keyVideos[i]?.url).toBe(LEARN_CONTENT.en.links.keyVideos[i]?.url)
    }
  })

  it('keyVideos length identical across locales', () => {
    expect(LEARN_CONTENT['pt-BR'].links.keyVideos.length).toBe(LEARN_CONTENT.en.links.keyVideos.length)
  })

  it('PT-BR forrest body does NOT contain its EN-baseline-equivalent locked phrase', () => {
    expect(LEARN_CONTENT['pt-BR'].explainer.forrest.body.includes('inspirado nos ensinamentos do Forrest')).toBe(false)
  })
})
