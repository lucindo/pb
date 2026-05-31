import { describe, expect, it } from 'vitest'

import {
  LOCALE_OPTIONS,
  THEME_OPTIONS,
  CUE_OPTIONS,
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

  it('every locale has non-empty settings.title, settings.close, settings.themeLabel, settings.cueLabel, settings.timbreLabel, settings.languageLabel', () => {
    for (const locale of LOCALE_OPTIONS) {
      expect(UI_STRINGS[locale].appSettings.title.length).toBeGreaterThan(0)
      expect(UI_STRINGS[locale].appSettings.close.length).toBeGreaterThan(0)
      expect(UI_STRINGS[locale].appSettings.themeLabel.length).toBeGreaterThan(0)
      expect(UI_STRINGS[locale].appSettings.cueLabel.length).toBeGreaterThan(0)
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

  it('every locale has cue entries for every CUE_OPTIONS id (Phase 25 CUE-01)', () => {
    for (const locale of LOCALE_OPTIONS) {
      for (const id of CUE_OPTIONS) {
        expect(UI_STRINGS[locale].appSettings.cue[id].length).toBeGreaterThan(0)
      }
    }
  })

  it('PT-BR cue strings are non-empty (machine-translated with review markers)', () => {
    expect(UI_STRINGS['pt-BR'].appSettings.cueLabel.length).toBeGreaterThan(0)
    expect(UI_STRINGS['pt-BR'].appSettings.cue.labels.length).toBeGreaterThan(0)
    expect(UI_STRINGS['pt-BR'].appSettings.cue.arrow.length).toBeGreaterThan(0)
    expect(UI_STRINGS['pt-BR'].appSettings.cue.nose.length).toBeGreaterThan(0)
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
        const value = UI_STRINGS[locale].practice.settingsForm[key]
        expect(typeof value, `settingsForm.${key} in ${locale}`).toBe('string')
        expect(value.length, `settingsForm.${key} in ${locale} must be non-empty`).toBeGreaterThan(0)
      }
    }
  })

  it('every stretch readout key exists and is a non-empty string in both EN and PT-BR', () => {
    for (const locale of LOCALE_OPTIONS) {
      for (const key of stretchReadoutKeys) {
        const value = UI_STRINGS[locale].practice.readout[key]
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
  ] as const

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
    expect(UI_STRINGS.en.practice.switcher.naviKriyaHeading).toBe('Navi Kriya')
    expect(UI_STRINGS['pt-BR'].practice.switcher.naviKriyaHeading).toBe('Navi Kriya')
    expect(UI_STRINGS.en.practice.switcher.resonantHeading).toBe('HRV Breathing')
  })
})

describe('Phase 34 stretch practice string keys (STRETCH-06)', () => {
  it('every locale has both stretch fields present and non-empty (completeness)', () => {
    const stretchFields = ['stretchName', 'stretchHeading'] as const
    for (const locale of LOCALE_OPTIONS) {
      for (const field of stretchFields) {
        const value = UI_STRINGS[locale].practice.switcher[field]
        expect(typeof value, `practice.switcher.${field} in ${locale}`).toBe('string')
        expect(value.length, `practice.switcher.${field} in ${locale} must be non-empty`).toBeGreaterThan(0)
      }
    }
  })
})

describe('Phase 32 new learn.* heading keys', () => {
  const newLearnKeys = ['naviKriyaVideosHeading'] as const

  it('every new learn.* key is non-empty in both EN and PT-BR', () => {
    for (const locale of LOCALE_OPTIONS) {
      for (const key of newLearnKeys) {
        const value = UI_STRINGS[locale].learn[key]
        expect(typeof value, `learn.${key} in ${locale}`).toBe('string')
        expect(value.length, `learn.${key} in ${locale} must be non-empty`).toBeGreaterThan(0)
      }
    }
  })

  it('"Navi Kriya" stays untranslated in pt-BR (Sanskrit proper noun — Phase 30 D-05)', () => {
    expect(UI_STRINGS['pt-BR'].learn.naviKriyaVideosHeading).toContain('Navi Kriya')
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
    expect(typeof ptBR.sections.orbStyle).toBe('string')
    expect(ptBR.sections.orbStyle.length).toBeGreaterThan(0)
    expect(typeof ptBR.sections.behavior).toBe('string')
    expect(ptBR.sections.behavior.length).toBeGreaterThan(0)
    expect(typeof ptBR.orb.label).toBe('string')
    expect(ptBR.orb.label.length).toBeGreaterThan(0)
    expect(typeof ptBR.orb.options.halo).toBe('string')
    expect(ptBR.orb.options.halo.length).toBeGreaterThan(0)
    expect(typeof ptBR.orb.options.minimal).toBe('string')
    expect(ptBR.orb.options.minimal.length).toBeGreaterThan(0)
    expect(typeof ptBR.orb.options.kuthasta).toBe('string')
    expect(ptBR.orb.options.kuthasta.length).toBeGreaterThan(0)
    expect(typeof ptBR.ringCue.label).toBe('string')
    expect(ptBR.ringCue.label.length).toBeGreaterThan(0)
    expect(typeof ptBR.ringCue.options.arc).toBe('string')
    expect(ptBR.ringCue.options.arc.length).toBeGreaterThan(0)
    expect(typeof ptBR.ringCue.options.rings).toBe('string')
    expect(ptBR.ringCue.options.rings.length).toBeGreaterThan(0)
    expect(typeof ptBR.breathingEffect.label).toBe('string')
    expect(ptBR.breathingEffect.label.length).toBeGreaterThan(0)
    expect(typeof ptBR.switcherIcons.label).toBe('string')
    expect(ptBR.switcherIcons.label.length).toBeGreaterThan(0)
    expect(typeof ptBR.bypassSilentMode.label).toBe('string')
    expect(ptBR.bypassSilentMode.label.length).toBeGreaterThan(0)
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
      const value = UI_STRINGS['pt-BR'].practice.nkReadout[key]
      expect(typeof value, `nkReadout.${key} in pt-BR`).toBe('string')
      expect(value.length, `nkReadout.${key} in pt-BR must be non-empty`).toBeGreaterThan(0)
    }
  })

  it('nkReadout.roundOf and countOf template fns return non-empty strings in pt-BR', () => {
    expect(UI_STRINGS['pt-BR'].practice.nkReadout.roundOf(1, 5).length).toBeGreaterThan(0)
    expect(UI_STRINGS['pt-BR'].practice.nkReadout.countOf(3, 10).length).toBeGreaterThan(0)
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
      const value = UI_STRINGS['pt-BR'].practice.nkControls[key]
      expect(typeof value, `nkControls.${key} in pt-BR`).toBe('string')
      expect(value.length, `nkControls.${key} in pt-BR must be non-empty`).toBeGreaterThan(0)
    }
  })

  it('nkControls.estimatedDuration template fn returns non-empty string in pt-BR', () => {
    expect(UI_STRINGS['pt-BR'].practice.nkControls.estimatedDuration(10).length).toBeGreaterThan(0)
  })
})
