import { describe, expect, it } from 'vitest'

import {
  LOCALE_OPTIONS,
  THEME_OPTIONS,
  VARIANT_OPTIONS,
  TIMBRE_OPTIONS,
} from '../domain/settings'
import { UI_STRINGS, LOCALE_DISPLAY_NAMES } from './strings'

describe('UI_STRINGS exhaustiveness', () => {
  it('every LocaleId has a UI_STRINGS entry', () => {
    for (const locale of LOCALE_OPTIONS) {
      expect(UI_STRINGS[locale]).toBeDefined()
    }
  })

  it('every locale has non-empty controls.startSession and controls.endSession', () => {
    for (const locale of LOCALE_OPTIONS) {
      expect(UI_STRINGS[locale].controls.startSession.length).toBeGreaterThan(0)
      expect(UI_STRINGS[locale].controls.endSession.length).toBeGreaterThan(0)
    }
  })

  it('every locale has non-empty settings.title, settings.close, settings.themeLabel, settings.variantLabel, settings.timbreLabel, settings.languageLabel', () => {
    for (const locale of LOCALE_OPTIONS) {
      expect(UI_STRINGS[locale].settings.title.length).toBeGreaterThan(0)
      expect(UI_STRINGS[locale].settings.close.length).toBeGreaterThan(0)
      expect(UI_STRINGS[locale].settings.themeLabel.length).toBeGreaterThan(0)
      expect(UI_STRINGS[locale].settings.variantLabel.length).toBeGreaterThan(0)
      expect(UI_STRINGS[locale].settings.timbreLabel.length).toBeGreaterThan(0)
      expect(UI_STRINGS[locale].settings.languageLabel.length).toBeGreaterThan(0)
    }
  })

  it('every locale has themes entries for every THEME_OPTIONS id', () => {
    for (const locale of LOCALE_OPTIONS) {
      for (const id of THEME_OPTIONS) {
        expect(UI_STRINGS[locale].themes[id].length).toBeGreaterThan(0)
      }
    }
  })

  it('every locale has variants entries for every VARIANT_OPTIONS id', () => {
    for (const locale of LOCALE_OPTIONS) {
      for (const id of VARIANT_OPTIONS) {
        expect(UI_STRINGS[locale].variants[id].length).toBeGreaterThan(0)
      }
    }
  })

  it('every locale has timbres entries for every TIMBRE_OPTIONS id', () => {
    for (const locale of LOCALE_OPTIONS) {
      for (const id of TIMBRE_OPTIONS) {
        expect(UI_STRINGS[locale].timbres[id].length).toBeGreaterThan(0)
      }
    }
  })

  it('every locale has non-empty endSessionDialog entries', () => {
    for (const locale of LOCALE_OPTIONS) {
      expect(UI_STRINGS[locale].endSessionDialog.title.length).toBeGreaterThan(0)
      expect(UI_STRINGS[locale].endSessionDialog.confirm.length).toBeGreaterThan(0)
      expect(UI_STRINGS[locale].endSessionDialog.cancel.length).toBeGreaterThan(0)
    }
  })

  it('every locale has non-empty resetStatsDialog entries', () => {
    for (const locale of LOCALE_OPTIONS) {
      expect(UI_STRINGS[locale].resetStatsDialog.title.length).toBeGreaterThan(0)
      expect(UI_STRINGS[locale].resetStatsDialog.confirm.length).toBeGreaterThan(0)
      expect(UI_STRINGS[locale].resetStatsDialog.cancel.length).toBeGreaterThan(0)
    }
  })
})

describe('UI_STRINGS template-fn entries (D-15)', () => {
  it('settingsForm.stepper.decreaseLabel returns non-empty string with interpolation', () => {
    for (const locale of LOCALE_OPTIONS) {
      const result = UI_STRINGS[locale].settingsForm.stepper.decreaseLabel('BPM')
      expect(result.length).toBeGreaterThan(0)
      expect(result).toContain('BPM')
    }
  })

  it('settingsForm.stepper.increaseLabel returns non-empty string with interpolation', () => {
    for (const locale of LOCALE_OPTIONS) {
      const result = UI_STRINGS[locale].settingsForm.stepper.increaseLabel('BPM')
      expect(result.length).toBeGreaterThan(0)
      expect(result).toContain('BPM')
    }
  })

  it('stats.sessionsCount(1) and stats.sessionsCount(2) both return non-empty with distinct outputs', () => {
    for (const locale of LOCALE_OPTIONS) {
      const singular = UI_STRINGS[locale].stats.sessionsCount(1)
      const plural = UI_STRINGS[locale].stats.sessionsCount(2)
      expect(singular.length).toBeGreaterThan(0)
      expect(plural.length).toBeGreaterThan(0)
      expect(singular).not.toBe(plural)
    }
  })
})

describe('LOCALE_DISPLAY_NAMES (D-14 native endonyms)', () => {
  it('en label is "English"', () => {
    expect(LOCALE_DISPLAY_NAMES.en).toBe('English')
  })

  it('pt-BR label is "Português (Brasil)"', () => {
    expect(LOCALE_DISPLAY_NAMES['pt-BR']).toBe('Português (Brasil)')
  })
})
