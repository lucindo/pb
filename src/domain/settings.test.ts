import { describe, expect, it } from 'vitest'

import {
  isValidBpm,
  isValidRatio,
  isValidDuration,
  isValidTheme,
  isValidTimbre,
  isValidVariant,
  isValidCue,
  isValidLocale,
  isValidMode,
  isValidWarmUp,
  isValidCoolDown,
  isValidRampDuration,
  validateSettings,
  DEFAULT_SETTINGS,
  DEFAULT_STRETCH_SETTINGS,
  CUE_OPTIONS,
  DEFAULT_CUE,
} from './settings'
import type { SessionSettings } from './settings'

describe('isValidBpm (HYGIENE-02 D-08)', () => {
  it('returns true for valid BPM_OPTIONS members (e.g. 5.5)', () => {
    expect(isValidBpm(5.5)).toBe(true)
  })

  it('returns false for out-of-range numbers (0, 7.5)', () => {
    expect(isValidBpm(0)).toBe(false)
    expect(isValidBpm(7.5)).toBe(false)
  })

  it('returns false for wrong type (string "5", null) and NaN / Infinity', () => {
    expect(isValidBpm('5')).toBe(false)
    expect(isValidBpm(null)).toBe(false)
    expect(isValidBpm(NaN)).toBe(false)
    expect(isValidBpm(Infinity)).toBe(false)
  })
})

describe('isValidRatio (HYGIENE-02 D-08)', () => {
  it('returns true for RATIO_OPTIONS members (e.g. "40:60")', () => {
    expect(isValidRatio('40:60')).toBe(true)
  })

  it('returns false for malformed strings ("40-60", "")', () => {
    expect(isValidRatio('40-60')).toBe(false)
    expect(isValidRatio('')).toBe(false)
  })

  it('returns false for wrong type (number 60)', () => {
    expect(isValidRatio(60)).toBe(false)
  })
})

describe('isValidDuration (HYGIENE-02 D-08)', () => {
  it('returns true for DURATION_OPTIONS numeric members (e.g. 10)', () => {
    expect(isValidDuration(10)).toBe(true)
  })

  it('returns true for "open-ended" sentinel', () => {
    expect(isValidDuration('open-ended')).toBe(true)
  })

  it('returns false for out-of-range numbers (7), arbitrary strings ("forever"), null', () => {
    expect(isValidDuration(7)).toBe(false)
    expect(isValidDuration('forever')).toBe(false)
    expect(isValidDuration(null)).toBe(false)
  })
})

describe('isValidTheme (INFRA-02 D-01)', () => {
  it('returns true for THEME_OPTIONS members (e.g. "system")', () => {
    expect(isValidTheme('system')).toBe(true)
  })

  it('returns false for malformed strings ("Light", "neon", "")', () => {
    expect(isValidTheme('Light')).toBe(false)
    expect(isValidTheme('neon')).toBe(false)
    expect(isValidTheme('')).toBe(false)
  })

  it('returns false for wrong type (null, undefined, 0, array)', () => {
    expect(isValidTheme(null)).toBe(false)
    expect(isValidTheme(undefined)).toBe(false)
    expect(isValidTheme(0)).toBe(false)
    expect(isValidTheme(['light'])).toBe(false)
  })
})

describe('isValidTimbre (INFRA-02 D-01)', () => {
  it('returns true for TIMBRE_OPTIONS members (e.g. "bowl")', () => {
    expect(isValidTimbre('bowl')).toBe(true)
  })

  it('returns false for malformed strings ("Bowl", "trumpet", "")', () => {
    expect(isValidTimbre('Bowl')).toBe(false)
    expect(isValidTimbre('trumpet')).toBe(false)
    expect(isValidTimbre('')).toBe(false)
  })

  it('returns false for wrong type (null, undefined, 0, array)', () => {
    expect(isValidTimbre(null)).toBe(false)
    expect(isValidTimbre(undefined)).toBe(false)
    expect(isValidTimbre(0)).toBe(false)
    expect(isValidTimbre(['bowl'])).toBe(false)
  })
})

describe('isValidVariant (INFRA-02 D-01)', () => {
  it('returns true for VARIANT_OPTIONS members (e.g. "orb")', () => {
    expect(isValidVariant('orb')).toBe(true)
  })

  it('returns false for malformed strings ("Orb", "circle", "", "ring")', () => {
    expect(isValidVariant('Orb')).toBe(false)
    expect(isValidVariant('circle')).toBe(false)
    expect(isValidVariant('')).toBe(false)
    // Forward-compat: 'ring' was replaced by 'diamond' in Phase 17 deviation;
    // old localStorage values must be rejected and coerced to DEFAULT_VARIANT.
    expect(isValidVariant('ring')).toBe(false)
  })

  it('returns false for wrong type (null, undefined, 0, array)', () => {
    expect(isValidVariant(null)).toBe(false)
    expect(isValidVariant(undefined)).toBe(false)
    expect(isValidVariant(0)).toBe(false)
    expect(isValidVariant(['orb'])).toBe(false)
  })
})

describe('isValidCue (Phase 25 CUE-01)', () => {
  it('returns true for all CUE_OPTIONS members: labels, arrow, nose', () => {
    expect(isValidCue('labels')).toBe(true)
    expect(isValidCue('arrow')).toBe(true)
    expect(isValidCue('nose')).toBe(true)
  })

  it('returns false for variant-like strings that are not cue options ("orb", "square", "diamond")', () => {
    expect(isValidCue('orb')).toBe(false)
    expect(isValidCue('square')).toBe(false)
    expect(isValidCue('diamond')).toBe(false)
  })

  it('returns false for empty string', () => {
    expect(isValidCue('')).toBe(false)
  })

  it('returns false for wrong type (null, undefined, 42, array)', () => {
    expect(isValidCue(null)).toBe(false)
    expect(isValidCue(undefined)).toBe(false)
    expect(isValidCue(42)).toBe(false)
    expect(isValidCue(['labels'])).toBe(false)
  })
})

describe('CUE_OPTIONS and DEFAULT_CUE (Phase 25 CUE-01)', () => {
  it('CUE_OPTIONS deep-equals ["labels", "arrow", "nose"]', () => {
    expect([...CUE_OPTIONS]).toEqual(['labels', 'arrow', 'nose'])
  })

  it('DEFAULT_CUE is "labels" (FIXED per CONTEXT D-01)', () => {
    expect(DEFAULT_CUE).toBe('labels')
  })
})

describe('isValidLocale (INFRA-02 D-01)', () => {
  it('returns true for LOCALE_OPTIONS members (e.g. "en")', () => {
    expect(isValidLocale('en')).toBe(true)
  })

  it('returns false for malformed strings ("pt_BR" underscore, "EN", "")', () => {
    expect(isValidLocale('pt_BR')).toBe(false)
    expect(isValidLocale('EN')).toBe(false)
    expect(isValidLocale('')).toBe(false)
  })

  it('returns false for wrong type (null, undefined, 0, array)', () => {
    expect(isValidLocale(null)).toBe(false)
    expect(isValidLocale(undefined)).toBe(false)
    expect(isValidLocale(0)).toBe(false)
    expect(isValidLocale(['en'])).toBe(false)
  })
})

// STRETCH-02/03 (D-07) predicate tests

describe('isValidMode (STRETCH-02)', () => {
  it('returns true for "standard" and "stretch"', () => {
    expect(isValidMode('standard')).toBe(true)
    expect(isValidMode('stretch')).toBe(true)
  })

  it('returns false for unknown strings ("foo", "STANDARD", "")', () => {
    expect(isValidMode('foo')).toBe(false)
    expect(isValidMode('STANDARD')).toBe(false)
    expect(isValidMode('')).toBe(false)
  })

  it('returns false for non-strings (42, null, undefined, array)', () => {
    expect(isValidMode(42)).toBe(false)
    expect(isValidMode(null)).toBe(false)
    expect(isValidMode(undefined)).toBe(false)
    expect(isValidMode(['standard'])).toBe(false)
  })
})

describe('isValidWarmUp (STRETCH-03, D-07)', () => {
  it('returns true for WARMUP_MINUTES_OPTIONS members (5, 10, 15)', () => {
    expect(isValidWarmUp(5)).toBe(true)
    expect(isValidWarmUp(10)).toBe(true)
    expect(isValidWarmUp(15)).toBe(true)
  })

  it('returns false for non-option numbers (0, 7, 20, -1)', () => {
    expect(isValidWarmUp(0)).toBe(false)
    expect(isValidWarmUp(7)).toBe(false)
    expect(isValidWarmUp(20)).toBe(false)
    expect(isValidWarmUp(-1)).toBe(false)
  })

  it('returns false for "open-ended" (not valid for warm-up)', () => {
    expect(isValidWarmUp('open-ended')).toBe(false)
  })

  it('returns false for wrong type (null, undefined, NaN)', () => {
    expect(isValidWarmUp(null)).toBe(false)
    expect(isValidWarmUp(undefined)).toBe(false)
    expect(isValidWarmUp(NaN)).toBe(false)
  })
})

describe('isValidCoolDown (STRETCH-03, D-07, D-11)', () => {
  it('returns true for COOLDOWN_OPTIONS numeric members (5, 10, 15, 20)', () => {
    expect(isValidCoolDown(5)).toBe(true)
    expect(isValidCoolDown(10)).toBe(true)
    expect(isValidCoolDown(15)).toBe(true)
    expect(isValidCoolDown(20)).toBe(true)
  })

  it('returns true for "open-ended" sentinel (D-11)', () => {
    expect(isValidCoolDown('open-ended')).toBe(true)
  })

  it('returns false for non-option numbers (0, 7, 25) and arbitrary strings ("foo")', () => {
    expect(isValidCoolDown(0)).toBe(false)
    expect(isValidCoolDown(7)).toBe(false)
    expect(isValidCoolDown(25)).toBe(false)
    expect(isValidCoolDown('foo')).toBe(false)
  })

  it('returns false for null and undefined', () => {
    expect(isValidCoolDown(null)).toBe(false)
    expect(isValidCoolDown(undefined)).toBe(false)
  })
})

describe('isValidRampDuration (STRETCH-03, D-07)', () => {
  it('returns true for RAMP_DURATION_OPTIONS members (5, 10, 15, 20)', () => {
    expect(isValidRampDuration(5)).toBe(true)
    expect(isValidRampDuration(10)).toBe(true)
    expect(isValidRampDuration(15)).toBe(true)
    expect(isValidRampDuration(20)).toBe(true)
  })

  it('returns false for non-option numbers (7, 0, 25)', () => {
    expect(isValidRampDuration(7)).toBe(false)
    expect(isValidRampDuration(0)).toBe(false)
    expect(isValidRampDuration(25)).toBe(false)
  })

  it('returns false for "open-ended" and other strings', () => {
    expect(isValidRampDuration('open-ended')).toBe(false)
    expect(isValidRampDuration('20')).toBe(false)
  })

  it('returns false for NaN and Infinity', () => {
    expect(isValidRampDuration(NaN)).toBe(false)
    expect(isValidRampDuration(Infinity)).toBe(false)
  })
})

// D-07 default stretch settings yield 20-min computed total
describe('DEFAULT_STRETCH_SETTINGS and DEFAULT_SETTINGS (STRETCH pitfall-5)', () => {
  it('DEFAULT_SETTINGS has mode "standard"', () => {
    expect(DEFAULT_SETTINGS.mode).toBe('standard')
  })

  it('DEFAULT_STRETCH_SETTINGS fields yield a 15-minute computed total', () => {
    const { warmUpMinutes, rampDurationMinutes, coolDownMinutes } = DEFAULT_STRETCH_SETTINGS
    const coolDown = coolDownMinutes === 'open-ended' ? 0 : coolDownMinutes
    const total = (warmUpMinutes + rampDurationMinutes + coolDown) * 60000
    expect(total).toBe(15 * 60 * 1000)
  })
})

// validateSettings stretch-mode extensions
describe('validateSettings stretch-mode (D-01, STRETCH-02/03)', () => {
  const validStretchSettings: SessionSettings = {
    bpm: 5.5,
    ratio: '40:60',
    durationMinutes: 10,
    mode: 'stretch',
    initialBpm: 6,
    targetBpm: 4,
    warmUpMinutes: 5,
    coolDownMinutes: 5,
    rampDurationMinutes: 20,
  }

  it('accepts a valid stretch-mode settings object', () => {
    expect(() => validateSettings(validStretchSettings)).not.toThrow()
  })

  it('throws RangeError for invalid mode', () => {
    const bad = { ...validStretchSettings, mode: 'foo' as never }
    expect(() => validateSettings(bad)).toThrow(RangeError)
  })

  it('throws RangeError when stretch: initialBpm is invalid (not in BPM_OPTIONS)', () => {
    const bad = { ...validStretchSettings, initialBpm: 999 }
    expect(() => validateSettings(bad)).toThrow(RangeError)
  })

  it('throws RangeError when stretch: targetBpm >= initialBpm (D-01 down-only)', () => {
    const bad = { ...validStretchSettings, targetBpm: 6 }  // equal → invalid
    expect(() => validateSettings(bad)).toThrow(RangeError)
    const bad2 = { ...validStretchSettings, targetBpm: 7 }  // greater → invalid
    expect(() => validateSettings(bad2)).toThrow(RangeError)
  })

  it('throws RangeError when stretch: warmUpMinutes is invalid', () => {
    const bad = { ...validStretchSettings, warmUpMinutes: 7 as never }
    expect(() => validateSettings(bad)).toThrow(RangeError)
  })

  it('throws RangeError when stretch: coolDownMinutes is invalid', () => {
    const bad = { ...validStretchSettings, coolDownMinutes: 'forever' as never }
    expect(() => validateSettings(bad)).toThrow(RangeError)
  })

  it('throws RangeError when stretch: rampDurationMinutes is invalid', () => {
    const bad = { ...validStretchSettings, rampDurationMinutes: 7 }
    expect(() => validateSettings(bad)).toThrow(RangeError)
  })

  it('does NOT throw for standard-mode settings even if stretch fields would be invalid', () => {
    const standardSettings: SessionSettings = {
      bpm: 5.5,
      ratio: '40:60',
      durationMinutes: 10,
      mode: 'standard',
      initialBpm: 6,
      targetBpm: 4,
      warmUpMinutes: 5,
      coolDownMinutes: 5,
      rampDurationMinutes: 20,
    }
    expect(() => validateSettings(standardSettings)).not.toThrow()
  })
})
