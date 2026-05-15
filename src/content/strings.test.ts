import { describe, expect, it } from 'vitest'

import {
  LOCALE_OPTIONS,
  THEME_OPTIONS,
  VARIANT_OPTIONS,
  CUE_OPTIONS,
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

  it('every locale has non-empty settings.title, settings.close, settings.themeLabel, settings.variantLabel, settings.cueLabel, settings.timbreLabel, settings.languageLabel', () => {
    for (const locale of LOCALE_OPTIONS) {
      expect(UI_STRINGS[locale].settings.title.length).toBeGreaterThan(0)
      expect(UI_STRINGS[locale].settings.close.length).toBeGreaterThan(0)
      expect(UI_STRINGS[locale].settings.themeLabel.length).toBeGreaterThan(0)
      expect(UI_STRINGS[locale].settings.variantLabel.length).toBeGreaterThan(0)
      expect(UI_STRINGS[locale].settings.cueLabel.length).toBeGreaterThan(0)
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

  it('every locale has cue entries for every CUE_OPTIONS id (Phase 25 CUE-01)', () => {
    for (const locale of LOCALE_OPTIONS) {
      for (const id of CUE_OPTIONS) {
        expect(UI_STRINGS[locale].cue[id].length).toBeGreaterThan(0)
      }
    }
  })

  it('EN cue strings have exact required values: labels="Text", arrow="Arrow", nose="Nose" (Phase 25 CONTEXT D-12)', () => {
    expect(UI_STRINGS.en.settings.cueLabel).toBe('Cue style')
    expect(UI_STRINGS.en.cue.labels).toBe('Text')
    expect(UI_STRINGS.en.cue.arrow).toBe('Arrow')
    expect(UI_STRINGS.en.cue.nose).toBe('Nose')
  })

  it('PT-BR cue strings are non-empty (machine-translated with review markers)', () => {
    expect(UI_STRINGS['pt-BR'].settings.cueLabel.length).toBeGreaterThan(0)
    expect(UI_STRINGS['pt-BR'].cue.labels.length).toBeGreaterThan(0)
    expect(UI_STRINGS['pt-BR'].cue.arrow.length).toBeGreaterThan(0)
    expect(UI_STRINGS['pt-BR'].cue.nose.length).toBeGreaterThan(0)
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

describe('Phase 22 stretch string keys EN/PT-BR parity', () => {
  const stretchSettingsFormKeys = [
    'sessionModeLabel',
    'modeStandard',
    'modeStretch',
    'initialBpmLabel',
    'targetBpmLabel',
    'holdInitialLabel',
    'holdTargetLabel',
    'rampDurationLabel',
    'holdOpenEndedLabel',
  ] as const

  const stretchReadoutKeys = [
    'currentBpmLabel',
    'stageLabel',
    'stageHoldInitial',
    'stageRamp',
    'stageHoldTarget',
  ] as const

  it('every stretch settingsForm key exists and is a non-empty string in both EN and PT-BR', () => {
    for (const locale of LOCALE_OPTIONS) {
      for (const key of stretchSettingsFormKeys) {
        const value = UI_STRINGS[locale].settingsForm[key]
        expect(typeof value, `settingsForm.${key} in ${locale}`).toBe('string')
        expect(value.length, `settingsForm.${key} in ${locale} must be non-empty`).toBeGreaterThan(0)
      }
    }
  })

  it('every stretch readout key exists and is a non-empty string in both EN and PT-BR', () => {
    for (const locale of LOCALE_OPTIONS) {
      for (const key of stretchReadoutKeys) {
        const value = UI_STRINGS[locale].readout[key]
        expect(typeof value, `readout.${key} in ${locale}`).toBe('string')
        expect(value.length, `readout.${key} in ${locale} must be non-empty`).toBeGreaterThan(0)
      }
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
