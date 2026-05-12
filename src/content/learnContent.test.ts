import { describe, expect, it } from 'vitest'

import { LEARN_CONTENT } from './learnContent'

describe('LEARN_CONTENT structural contract', () => {
  it('explainer has exactly three keys in fixed order: hrv, timing, forrest (D-08)', () => {
    expect(Object.keys(LEARN_CONTENT.explainer)).toEqual(['hrv', 'timing', 'forrest'])
  })

  it('hrv section has non-empty title and body', () => {
    expect(LEARN_CONTENT.explainer.hrv.title.length).toBeGreaterThan(0)
    expect(LEARN_CONTENT.explainer.hrv.body.length).toBeGreaterThan(0)
  })

  it('timing section has non-empty title and body', () => {
    expect(LEARN_CONTENT.explainer.timing.title.length).toBeGreaterThan(0)
    expect(LEARN_CONTENT.explainer.timing.body.length).toBeGreaterThan(0)
  })

  it('forrest section has non-empty title and body', () => {
    expect(LEARN_CONTENT.explainer.forrest.title.length).toBeGreaterThan(0)
    expect(LEARN_CONTENT.explainer.forrest.body.length).toBeGreaterThan(0)
  })
})

describe('LEARN_CONTENT locked copy contract', () => {
  it('forrest body contains verbatim phrase "inspired by Forrest\'s teachings" (D-11)', () => {
    expect(LEARN_CONTENT.explainer.forrest.body.includes("inspired by Forrest's teachings")).toBe(
      true,
    )
  })

  it('hrv body does not contain forbidden clinical verbs (D-08 / LEARN-04)', () => {
    expect(LEARN_CONTENT.explainer.hrv.body).not.toMatch(
      /\b(improves|treats|cures|heals|diagnoses)\b/i,
    )
  })

  it('timing body does not contain forbidden clinical verbs (D-08 / LEARN-04)', () => {
    expect(LEARN_CONTENT.explainer.timing.body).not.toMatch(
      /\b(improves|treats|cures|heals|diagnoses)\b/i,
    )
  })

  it('forrest body does not contain forbidden clinical verbs (D-08 / LEARN-04)', () => {
    expect(LEARN_CONTENT.explainer.forrest.body).not.toMatch(
      /\b(improves|treats|cures|heals|diagnoses)\b/i,
    )
  })
})

describe('LEARN_CONTENT link contract', () => {
  it('book URL is the canonical amazon.com /dp/B0CCFWP4W8 URL (CONTENT-01 D-05)', () => {
    expect(LEARN_CONTENT.links.book.url).toBe('https://www.amazon.com/Mastering-Meditation-Eight-Steps-Beginner-ebook/dp/B0CCFWP4W8?sr=8-1&linkId=1a5a2958fc89bdb6769b54d0bc9a4d17&language=en_US')
  })

  it('book label is the Mastering Meditation pointer (2026-05-11 user rename)', () => {
    expect(LEARN_CONTENT.links.book.label).toBe('"Mastering Meditation" book')
  })

  it('youtubeChannel label is "YouTube channel" (LEARN-01)', () => {
    expect(LEARN_CONTENT.links.youtubeChannel.label).toBe('YouTube channel')
  })

  it('website label is "Website/Trainings" (2026-05-11 user rename)', () => {
    expect(LEARN_CONTENT.links.website.label).toBe('Website/Trainings')
  })

  it('patreon label is "Patreon" (D-12 execute-time amendment)', () => {
    expect(LEARN_CONTENT.links.patreon.label).toBe('Patreon')
  })

  it('patreon URL is https://www.patreon.com/forrestknutson (D-12 execute-time amendment)', () => {
    expect(LEARN_CONTENT.links.patreon.url).toBe('https://www.patreon.com/forrestknutson')
  })

  it('youtubeChannel URL starts with https:// (T-06-04)', () => {
    expect(LEARN_CONTENT.links.youtubeChannel.url.startsWith('https://')).toBe(true)
  })

  it('website URL starts with https:// (T-06-04)', () => {
    expect(LEARN_CONTENT.links.website.url.startsWith('https://')).toBe(true)
  })

  it('book URL starts with https:// (T-06-04)', () => {
    expect(LEARN_CONTENT.links.book.url.startsWith('https://')).toBe(true)
  })

  it('patreon URL starts with https:// (T-06-04)', () => {
    expect(LEARN_CONTENT.links.patreon.url.startsWith('https://')).toBe(true)
  })

  it('heroVideo URL starts with https:// (T-06-04)', () => {
    expect(LEARN_CONTENT.links.heroVideo.url.startsWith('https://')).toBe(true)
  })

  it('keyVideos length is between 0 and 5 inclusive (D-12 item 5 — LEARN-02)', () => {
    expect(LEARN_CONTENT.links.keyVideos.length).toBeGreaterThanOrEqual(0)
    expect(LEARN_CONTENT.links.keyVideos.length).toBeLessThanOrEqual(5)
  })

  it('every keyVideo URL starts with https://', () => {
    for (const video of LEARN_CONTENT.links.keyVideos) {
      expect(video.url.startsWith('https://')).toBe(true)
    }
  })

  it('no URL in links matches dangerous schemes javascript:, data:, vbscript: (T-06-04)', () => {
    const allUrls = [
      LEARN_CONTENT.links.book.url,
      LEARN_CONTENT.links.website.url,
      LEARN_CONTENT.links.youtubeChannel.url,
      LEARN_CONTENT.links.patreon.url,
      LEARN_CONTENT.links.heroVideo.url,
      ...LEARN_CONTENT.links.keyVideos.map((v) => v.url),
    ]
    for (const url of allUrls) {
      expect(url).not.toMatch(/^(javascript|data|vbscript):/i)
    }
  })
})
