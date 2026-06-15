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
  const practiceStringKeys = ['resonantName', 'resonantHeading'] as const

  it('every practice.* string key exists and is non-empty in both en and pt-BR', () => {
    for (const locale of LOCALE_OPTIONS) {
      for (const key of practiceStringKeys) {
        const value = UI_STRINGS[locale].practice.switcher[key]
        expect(typeof value, `practice.switcher.${key} in ${locale}`).toBe('string')
        expect(value.length, `practice.switcher.${key} in ${locale} must be non-empty`).toBeGreaterThan(0)
      }
    }
  })

  it('practice headings keep the full names (D-05: untranslated Sanskrit proper noun)', () => {
    expect(UI_STRINGS.en.practice.switcher.resonantHeading).toBe('HRV Breathing')
  })
})

describe('Phase 48 appearance.* and theme rename', () => {
  it('renames appSettings.sections.appearance to appSettings.sections.theme in EN and PT-BR', () => {
    expect(UI_STRINGS.en.appSettings.sections.theme).toBe('Theme')
    expect(UI_STRINGS['pt-BR'].appSettings.sections.theme).toBe('Tema')
    // The old key must be fully gone from the EN catalog
    expect(
      (UI_STRINGS.en.appSettings.sections as Record<string, unknown>).appearance,
    ).toBeUndefined()
  })

  it('declares PT-BR advanced.* draft values as non-empty strings (I18N-02)', () => {
    const ptBR = UI_STRINGS['pt-BR'].advanced
    expect(typeof ptBR.title).toBe('string')
    expect(ptBR.title.length).toBeGreaterThan(0)
    expect(typeof ptBR.backChevron).toBe('string')
    expect(ptBR.backChevron.length).toBeGreaterThan(0)
    expect(typeof ptBR.rightChevronAriaOnSettings).toBe('string')
    expect(ptBR.rightChevronAriaOnSettings.length).toBeGreaterThan(0)
    expect(typeof ptBR.sections.behavior).toBe('string')
    expect(ptBR.sections.behavior.length).toBeGreaterThan(0)
    expect(typeof ptBR.bypassSilentMode.label).toBe('string')
    expect(ptBR.bypassSilentMode.label.length).toBeGreaterThan(0)
  })
})
