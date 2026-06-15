import { describe, expect, it } from 'vitest'

import { LEARN_CONTENT } from './learnContent'
import { LOCALE_OPTIONS } from '../domain/settings'

for (const locale of LOCALE_OPTIONS) {
  describe(`LEARN_CONTENT[${locale}] structural contract`, () => {
    it(`[${locale}] explainer has exactly one key: forrest (Phase 32 restructure)`, () => {
      expect(Object.keys(LEARN_CONTENT[locale].explainer)).toEqual(['forrest'])
    })

    it(`[${locale}] forrest section has non-empty title and body`, () => {
      expect(LEARN_CONTENT[locale].explainer.forrest.title.length).toBeGreaterThan(0)
      expect(LEARN_CONTENT[locale].explainer.forrest.body.length).toBeGreaterThan(0)
    })

    it(`[${locale}] practices.resonant exists with non-empty description sections`, () => {
      expect(LEARN_CONTENT[locale].practices.resonant.description.section1.title.length).toBeGreaterThan(0)
      expect(LEARN_CONTENT[locale].practices.resonant.description.section1.body.length).toBeGreaterThan(0)
      expect(LEARN_CONTENT[locale].practices.resonant.description.section2.title.length).toBeGreaterThan(0)
      expect(LEARN_CONTENT[locale].practices.resonant.description.section2.body.length).toBeGreaterThan(0)
    })
  })
}

// Resonant practice content should be byte-identical to the data that used to be in the old explainer sections
describe('LEARN_CONTENT resonant data preservation (Phase 32 restructure)', () => {
  it('practices.resonant.description.section1 has the old HRV explainer title', () => {
    expect(LEARN_CONTENT.en.practices.resonant.description.section1.title).toBe('What is HRV / resonance breathing')
  })

  it('practices.resonant.description.section2 has the old timing explainer title', () => {
    expect(LEARN_CONTENT.en.practices.resonant.description.section2.title).toBe('How this app times your breath')
  })

  it('practices.resonant.videos has 4 entries (heroVideo + 3 keyVideos from old shape)', () => {
    expect(LEARN_CONTENT.en.practices.resonant.videos.length).toBe(4)
  })

  it('practices.resonant.videos[0] is the old heroVideo (The Holy Trinity of Breath...)', () => {
    expect(LEARN_CONTENT.en.practices.resonant.videos[0]?.url).toBe('https://www.youtube.com/watch?v=89WorFpMyY0')
    expect(LEARN_CONTENT.en.practices.resonant.videos[0]?.label).toBe('The Holy Trinity of Breath Induces HRV Resonance')
  })

  it('practices.resonant.videos URL identity across locales (D-12)', () => {
    for (let i = 0; i < LEARN_CONTENT.en.practices.resonant.videos.length; i++) {
      expect(LEARN_CONTENT['pt-BR'].practices.resonant.videos[i]?.url).toBe(
        LEARN_CONTENT.en.practices.resonant.videos[i]?.url,
      )
    }
  })

  it('practices.resonant.videos label identity across locales — video titles stay English (D-12)', () => {
    for (let i = 0; i < LEARN_CONTENT.en.practices.resonant.videos.length; i++) {
      expect(LEARN_CONTENT['pt-BR'].practices.resonant.videos[i]?.label).toBe(
        LEARN_CONTENT.en.practices.resonant.videos[i]?.label,
      )
    }
  })

  it('practices.resonant.videos length identical across locales', () => {
    expect(LEARN_CONTENT['pt-BR'].practices.resonant.videos.length).toBe(
      LEARN_CONTENT.en.practices.resonant.videos.length,
    )
  })
})

for (const locale of LOCALE_OPTIONS) {
  describe(`LEARN_CONTENT[${locale}] clinical-verbs guard`, () => {
    const enClinicalVerbs = /\b(improves|treats|cures|heals|diagnoses)\b/i
    const ptBrClinicalVerbs = /\b(melhora|trata|cura|diagnostica|avalia)\b/i
    const clinicalVerbs = locale === 'en' ? enClinicalVerbs : ptBrClinicalVerbs

    it(`[${locale}] resonant section1 body has no forbidden clinical verbs`, () => {
      expect(LEARN_CONTENT[locale].practices.resonant.description.section1.body).not.toMatch(clinicalVerbs)
    })

    it(`[${locale}] resonant section2 body has no forbidden clinical verbs`, () => {
      expect(LEARN_CONTENT[locale].practices.resonant.description.section2.body).not.toMatch(clinicalVerbs)
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

  it('appStoreIos URL starts with https:// (T-24-02)', () => {
    expect(LEARN_CONTENT.en.links.appStoreIos.url.startsWith('https://')).toBe(true)
  })

  it('googlePlayAndroid URL starts with https:// (T-24-02)', () => {
    expect(LEARN_CONTENT.en.links.googlePlayAndroid.url.startsWith('https://')).toBe(true)
  })

  it('appStoreIos URL equals the exact iOS store URL (D-07)', () => {
    expect(LEARN_CONTENT.en.links.appStoreIos.url).toBe('https://apps.apple.com/us/app/resonant-breathing/id1568058013')
  })

  it('googlePlayAndroid URL equals the exact Android store URL (D-07)', () => {
    expect(LEARN_CONTENT.en.links.googlePlayAndroid.url).toBe('https://play.google.com/store/apps/details?id=com.johngoodstadt.knutson.meditation')
  })

  it('no URL in links matches dangerous schemes javascript:, data:, vbscript: (T-06-04, T-24-02)', () => {
    const allUrls = [
      LEARN_CONTENT.en.links.book.url,
      LEARN_CONTENT.en.links.website.url,
      LEARN_CONTENT.en.links.youtubeChannel.url,
      LEARN_CONTENT.en.links.patreon.url,
      LEARN_CONTENT.en.links.appStoreIos.url,
      LEARN_CONTENT.en.links.googlePlayAndroid.url,
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

  it('appStoreIos URL identical across locales (D-07 locale-invariant)', () => {
    expect(LEARN_CONTENT['pt-BR'].links.appStoreIos.url).toBe(LEARN_CONTENT.en.links.appStoreIos.url)
  })

  it('googlePlayAndroid URL identical across locales (D-07 locale-invariant)', () => {
    expect(LEARN_CONTENT['pt-BR'].links.googlePlayAndroid.url).toBe(LEARN_CONTENT.en.links.googlePlayAndroid.url)
  })
})
