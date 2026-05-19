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

describe('Phase 30 practice string keys', () => {
  const practiceStringKeys = [
    'toggleLabel',
    'resonantName',
    'naviKriyaName',
    'resonantHeading',
    'naviKriyaHeading',
    'naviKriyaControlsPlaceholder',
    'naviKriyaStatsEmptyBody',
  ] as const

  it('every practice.* string key exists and is non-empty in both en and pt-BR', () => {
    for (const locale of LOCALE_OPTIONS) {
      for (const key of practiceStringKeys) {
        const value = UI_STRINGS[locale].practice[key]
        expect(typeof value, `practice.${key} in ${locale}`).toBe('string')
        expect(value.length, `practice.${key} in ${locale} must be non-empty`).toBeGreaterThan(0)
      }
    }
  })

  it('practice.resetStatsTitle is a function returning non-empty string containing the practice name in both locales', () => {
    for (const locale of LOCALE_OPTIONS) {
      const result = UI_STRINGS[locale].practice.resetStatsTitle('Resonant Breathing')
      expect(typeof result).toBe('string')
      expect(result.length).toBeGreaterThan(0)
      expect(result).toContain('Resonant Breathing')
    }
  })

  it('EN practice.resetStatsTitle("Resonant Breathing") returns "Reset Resonant Breathing stats?"', () => {
    expect(UI_STRINGS.en.practice.resetStatsTitle('Resonant Breathing')).toBe('Reset Resonant Breathing stats?')
  })

  it('practice switcher labels are the short mobile-friendly names', () => {
    expect(UI_STRINGS.en.practice.resonantName).toBe('HRV')
    expect(UI_STRINGS.en.practice.naviKriyaName).toBe('Navi')
    // pt-BR uses the localized abbreviation VFC to match the rest of the
    // pt-BR UI (header "PRÁTICA VFC", title "Respiração VFC").
    expect(UI_STRINGS['pt-BR'].practice.resonantName).toBe('VFC')
    expect(UI_STRINGS['pt-BR'].practice.naviKriyaName).toBe('Navi')
  })

  it('practice headings keep the full names (D-05: untranslated Sanskrit proper noun)', () => {
    expect(UI_STRINGS.en.practice.naviKriyaHeading).toBe('Navi Kriya')
    expect(UI_STRINGS['pt-BR'].practice.naviKriyaHeading).toBe('Navi Kriya')
    expect(UI_STRINGS.en.practice.resonantHeading).toBe('Resonant Breathing')
  })
})

describe('Phase 34 stretch practice string keys (STRETCH-06)', () => {
  it('UI_STRINGS.en.practice.stretchName equals "Stretch" (D-10: switcher pill label)', () => {
    expect(UI_STRINGS.en.practice.stretchName).toBe('Stretch')
  })

  it('UI_STRINGS.en.practice.stretchHeading equals "HRV Stretch"', () => {
    expect(UI_STRINGS.en.practice.stretchHeading).toBe('HRV Stretch')
  })

  it('UI_STRINGS[\'pt-BR\'].practice.stretchName equals "Alongar"', () => {
    expect(UI_STRINGS['pt-BR'].practice.stretchName).toBe('Alongar')
  })

  it('UI_STRINGS[\'pt-BR\'].practice.stretchHeading equals "Alongar VFC"', () => {
    expect(UI_STRINGS['pt-BR'].practice.stretchHeading).toBe('Alongar VFC')
  })

  it('stretchHeader is a non-empty string in both locales', () => {
    for (const locale of LOCALE_OPTIONS) {
      expect(typeof UI_STRINGS[locale].practice.stretchHeader).toBe('string')
      expect(UI_STRINGS[locale].practice.stretchHeader.length).toBeGreaterThan(0)
    }
  })

  it('every locale has all three stretch fields present and non-empty (completeness)', () => {
    const stretchFields = ['stretchName', 'stretchHeading', 'stretchHeader'] as const
    for (const locale of LOCALE_OPTIONS) {
      for (const field of stretchFields) {
        const value = UI_STRINGS[locale].practice[field]
        expect(typeof value, `practice.${field} in ${locale}`).toBe('string')
        expect(value.length, `practice.${field} in ${locale} must be non-empty`).toBeGreaterThan(0)
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

describe('Phase 32 new learn.* heading keys', () => {
  const newLearnKeys = [
    'naviKriyaVideosHeading',
    'naviKriyaDescriptionSection1Title',
    'naviKriyaDescriptionSection2Title',
  ] as const

  it('every new learn.* key is non-empty in both EN and PT-BR', () => {
    for (const locale of LOCALE_OPTIONS) {
      for (const key of newLearnKeys) {
        const value = UI_STRINGS[locale].learn[key]
        expect(typeof value, `learn.${key} in ${locale}`).toBe('string')
        expect(value.length, `learn.${key} in ${locale} must be non-empty`).toBeGreaterThan(0)
      }
    }
  })

  it('EN naviKriyaVideosHeading equals "Selected Navi Kriya Videos"', () => {
    expect(UI_STRINGS.en.learn.naviKriyaVideosHeading).toBe('Selected Navi Kriya Videos')
  })

  it('EN naviKriyaDescriptionSection1Title equals "What is Navi Kriya"', () => {
    expect(UI_STRINGS.en.learn.naviKriyaDescriptionSection1Title).toBe('What is Navi Kriya')
  })

  it('EN naviKriyaDescriptionSection2Title equals "How this app paces it"', () => {
    expect(UI_STRINGS.en.learn.naviKriyaDescriptionSection2Title).toBe('How this app paces it')
  })

  it('"Navi Kriya" stays untranslated in pt-BR (Sanskrit proper noun — Phase 30 D-05)', () => {
    expect(UI_STRINGS['pt-BR'].learn.naviKriyaDescriptionSection1Title).toContain('Navi Kriya')
  })
})

describe('Phase 32 nkReadout + nkControls explicit PT-BR non-empty checks', () => {
  const nkReadoutKeys = [
    'statusLabel',
    'readoutAriaLabel',
    'phaseLabel',
    'front',
    'back',
    'roundLabel',
    'countLabel',
  ] as const

  it('every nkReadout string key is non-empty in pt-BR', () => {
    for (const key of nkReadoutKeys) {
      const value = UI_STRINGS['pt-BR'].nkReadout[key]
      expect(typeof value, `nkReadout.${key} in pt-BR`).toBe('string')
      expect(value.length, `nkReadout.${key} in pt-BR must be non-empty`).toBeGreaterThan(0)
    }
  })

  it('nkReadout.roundOf and countOf template fns return non-empty strings in pt-BR', () => {
    expect(UI_STRINGS['pt-BR'].nkReadout.roundOf(1, 5).length).toBeGreaterThan(0)
    expect(UI_STRINGS['pt-BR'].nkReadout.countOf(3, 10).length).toBeGreaterThan(0)
  })

  const nkControlsKeys = [
    'roundsLabel',
    'frontCountLabel',
    'omLengthLabel',
    'omLengthFast',
    'omLengthMedium',
    'omLengthSlow',
    'perOmCueLabel',
    'perOmCueOn',
    'perOmCueOff',
  ] as const

  it('every nkControls string key is non-empty in pt-BR', () => {
    for (const key of nkControlsKeys) {
      const value = UI_STRINGS['pt-BR'].nkControls[key]
      expect(typeof value, `nkControls.${key} in pt-BR`).toBe('string')
      expect(value.length, `nkControls.${key} in pt-BR must be non-empty`).toBeGreaterThan(0)
    }
  })

  it('nkControls.estimatedDuration template fn returns non-empty string in pt-BR', () => {
    expect(UI_STRINGS['pt-BR'].nkControls.estimatedDuration(10).length).toBeGreaterThan(0)
  })
})
