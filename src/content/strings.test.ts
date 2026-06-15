import { describe, expect, it } from 'vitest'

import {
  LOCALE_OPTIONS,
  THEME_OPTIONS,
  TIMBRE_OPTIONS,
} from '../domain/settings'
import { UI_STRINGS } from './strings'

describe('UI_STRINGS exhaustiveness', () => {
  it('every LocaleId has a UI_STRINGS entry', () => {
    for (const locale of LOCALE_OPTIONS) {
      expect(UI_STRINGS[locale]).toBeDefined()
    }
  })

  it('every locale has non-empty controls.startSession and controls.endSession', () => {
    for (const locale of LOCALE_OPTIONS) {
      expect(UI_STRINGS[locale].practice.controls.startSession.length).toBeGreaterThan(0)
      expect(UI_STRINGS[locale].practice.controls.endSession.length).toBeGreaterThan(0)
    }
  })

  it('every locale has non-empty settings.title, settings.close, settings.themeLabel, settings.timbreLabel, settings.languageLabel', () => {
    for (const locale of LOCALE_OPTIONS) {
      expect(UI_STRINGS[locale].appSettings.title.length).toBeGreaterThan(0)
      expect(UI_STRINGS[locale].appSettings.close.length).toBeGreaterThan(0)
      expect(UI_STRINGS[locale].appSettings.themeLabel.length).toBeGreaterThan(0)
      expect(UI_STRINGS[locale].appSettings.timbreLabel.length).toBeGreaterThan(0)
      expect(UI_STRINGS[locale].appSettings.languageLabel.length).toBeGreaterThan(0)
    }
  })

  it('every locale has themes entries for every THEME_OPTIONS id', () => {
    for (const locale of LOCALE_OPTIONS) {
      for (const id of THEME_OPTIONS) {
        expect(UI_STRINGS[locale].appSettings.themes[id].length).toBeGreaterThan(0)
      }
    }
  })


  it('every locale has timbres entries for every TIMBRE_OPTIONS id', () => {
    for (const locale of LOCALE_OPTIONS) {
      for (const id of TIMBRE_OPTIONS) {
        expect(UI_STRINGS[locale].appSettings.timbres[id].length).toBeGreaterThan(0)
      }
    }
  })

  it('every locale has non-empty endSessionDialog entries', () => {
    for (const locale of LOCALE_OPTIONS) {
      expect(UI_STRINGS[locale].practice.endSessionDialog.title.length).toBeGreaterThan(0)
      expect(UI_STRINGS[locale].practice.endSessionDialog.confirm.length).toBeGreaterThan(0)
      expect(UI_STRINGS[locale].practice.endSessionDialog.cancel.length).toBeGreaterThan(0)
    }
  })

})

describe('UI_STRINGS template-fn entries (D-15)', () => {
  it('settingsForm.stepper.decreaseLabel returns non-empty string with interpolation', () => {
    for (const locale of LOCALE_OPTIONS) {
      const result = UI_STRINGS[locale].practice.settingsForm.stepper.decreaseLabel('BPM')
      expect(result.length).toBeGreaterThan(0)
      expect(result).toContain('BPM')
    }
  })

  it('settingsForm.stepper.increaseLabel returns non-empty string with interpolation', () => {
    for (const locale of LOCALE_OPTIONS) {
      const result = UI_STRINGS[locale].practice.settingsForm.stepper.increaseLabel('BPM')
      expect(result.length).toBeGreaterThan(0)
      expect(result).toContain('BPM')
    }
  })

})

describe('Phase 30 practice string keys', () => {
  it('practice.name exists and is non-empty in both en and pt-BR', () => {
    for (const locale of LOCALE_OPTIONS) {
      const value = UI_STRINGS[locale].practice.name
      expect(typeof value, `practice.name in ${locale}`).toBe('string')
      expect(value.length, `practice.name in ${locale} must be non-empty`).toBeGreaterThan(0)
    }
  })

  it('practice.name keeps the untranslated brand name in both locales', () => {
    expect(UI_STRINGS.en.practice.name).toBe('Pattern Breathing')
    expect(UI_STRINGS['pt-BR'].practice.name).toBe('Pattern Breathing')
  })
})

describe('consolidated settings sections', () => {
  it('exposes the System / Sound / Statistics / About section labels in every locale', () => {
    for (const locale of LOCALE_OPTIONS) {
      const sections = UI_STRINGS[locale].appSettings.sections
      for (const key of ['system', 'sound', 'statistics', 'about'] as const) {
        expect(sections[key].length).toBeGreaterThan(0)
      }
    }
  })

  it('carries the bypass-silent-mode label under appSettings in every locale', () => {
    for (const locale of LOCALE_OPTIONS) {
      expect(UI_STRINGS[locale].appSettings.bypassSilentMode.label.length).toBeGreaterThan(0)
    }
  })
})
