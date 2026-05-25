import { describe, expect, it } from 'vitest'

import {
  parseQueryBoolean,
  readFeatureFlags,
  readQueryFeatureFlag,
  type QueryFeatureFlagSpec,
} from './featureFlags'

describe('parseQueryBoolean', () => {
  it.each(['', '1', 'on', 't', 'true', 'y', 'yes', 'enable', 'enabled'])(
    'parses "%s" as true',
    (value) => {
      expect(parseQueryBoolean(value)).toBe(true)
    },
  )

  it.each(['0', 'off', 'f', 'false', 'n', 'no', 'disable', 'disabled'])(
    'parses "%s" as false',
    (value) => {
      expect(parseQueryBoolean(value)).toBe(false)
    },
  )

  it('is case-insensitive and trims whitespace', () => {
    expect(parseQueryBoolean(' TRUE ')).toBe(true)
    expect(parseQueryBoolean(' Off ')).toBe(false)
  })

  it('returns null for unrecognized values', () => {
    expect(parseQueryBoolean('maybe')).toBeNull()
  })
})

describe('readFeatureFlags', () => {
  it('returns defaults for empty search', () => {
    expect(readFeatureFlags('')).toEqual({
      switcherIcon: false,
      breathingShape: 'orb-halo',
      orbIdle: 'ambient',
      ringCue: 'progress-arc',
    })
  })

  it('enables switcher icons for on values', () => {
    expect(readFeatureFlags('?switcherIcon=1').switcherIcon).toBe(true)
    expect(readFeatureFlags('?switcherIcon=true').switcherIcon).toBe(true)
    expect(readFeatureFlags('?switcherIcon=on').switcherIcon).toBe(true)
  })

  it('disables switcher icons for off values', () => {
    expect(readFeatureFlags('?switcherIcon=0').switcherIcon).toBe(false)
    expect(readFeatureFlags('?switcherIcon=false').switcherIcon).toBe(false)
    expect(readFeatureFlags('?switcherIcon=off').switcherIcon).toBe(false)
  })

  it('falls back to the default for invalid switcherIcon values', () => {
    expect(readFeatureFlags('?switcherIcon=maybe').switcherIcon).toBe(false)
  })

  it('defaults breathingShape to orb-halo (V1)', () => {
    expect(readFeatureFlags('').breathingShape).toBe('orb-halo')
  })

  it('parses minimal-rings (V2) and its aliases', () => {
    expect(readFeatureFlags('?breathingShape=minimal-rings').breathingShape).toBe('minimal-rings')
    expect(readFeatureFlags('?breathingShape=minimal').breathingShape).toBe('minimal-rings')
    expect(readFeatureFlags('?breathingShape=rings').breathingShape).toBe('minimal-rings')
  })

  it('parses orb-halo (V1) and its aliases', () => {
    expect(readFeatureFlags('?breathingShape=orb-halo').breathingShape).toBe('orb-halo')
    expect(readFeatureFlags('?breathingShape=orb').breathingShape).toBe('orb-halo')
    expect(readFeatureFlags('?breathingShape=halo').breathingShape).toBe('orb-halo')
  })

  it('breathingShape is case-insensitive and trims whitespace', () => {
    expect(readFeatureFlags('?breathingShape=MINIMAL-RINGS').breathingShape).toBe('minimal-rings')
    expect(readFeatureFlags('?breathingShape=%20Minimal%20').breathingShape).toBe('minimal-rings')
  })

  it('falls back to default for invalid breathingShape values', () => {
    expect(readFeatureFlags('?breathingShape=junk').breathingShape).toBe('orb-halo')
  })

  it('defaults orbIdle to ambient', () => {
    expect(readFeatureFlags('').orbIdle).toBe('ambient')
  })

  it('parses orbIdle=ambient and orbIdle=still', () => {
    expect(readFeatureFlags('?orbIdle=ambient').orbIdle).toBe('ambient')
    expect(readFeatureFlags('?orbIdle=still').orbIdle).toBe('still')
  })

  it('orbIdle is case-insensitive and trims whitespace', () => {
    expect(readFeatureFlags('?orbIdle=AMBIENT').orbIdle).toBe('ambient')
    expect(readFeatureFlags('?orbIdle=%20Still%20').orbIdle).toBe('still')
  })

  it('falls back to default for invalid orbIdle values', () => {
    expect(readFeatureFlags('?orbIdle=junk').orbIdle).toBe('ambient')
  })

  it('defaults ringCue to progress-arc', () => {
    expect(readFeatureFlags('').ringCue).toBe('progress-arc')
  })

  it('parses progress-arc and its aliases', () => {
    expect(readFeatureFlags('?ringCue=progress-arc').ringCue).toBe('progress-arc')
    expect(readFeatureFlags('?ringCue=progress').ringCue).toBe('progress-arc')
    expect(readFeatureFlags('?ringCue=arc').ringCue).toBe('progress-arc')
    expect(readFeatureFlags('?ringCue=south').ringCue).toBe('progress-arc')
  })

  it('parses outer-inner and its aliases', () => {
    expect(readFeatureFlags('?ringCue=outer-inner').ringCue).toBe('outer-inner')
    expect(readFeatureFlags('?ringCue=production').ringCue).toBe('outer-inner')
    expect(readFeatureFlags('?ringCue=rings').ringCue).toBe('outer-inner')
    expect(readFeatureFlags('?ringCue=default').ringCue).toBe('outer-inner')
  })

  it('ringCue is case-insensitive and trims whitespace', () => {
    expect(readFeatureFlags('?ringCue=PROGRESS-ARC').ringCue).toBe('progress-arc')
    expect(readFeatureFlags('?ringCue=%20Arc%20').ringCue).toBe('progress-arc')
  })

  it('falls back to default for invalid ringCue values', () => {
    expect(readFeatureFlags('?ringCue=junk').ringCue).toBe('progress-arc')
  })
})

describe('readQueryFeatureFlag', () => {
  it('supports adding non-boolean query flags with custom parsers', () => {
    const densityFlag = {
      queryParam: 'density',
      defaultValue: 'comfortable',
      parse: (rawValue: string): 'compact' | 'comfortable' | null =>
        rawValue === 'compact' || rawValue === 'comfortable' ? rawValue : null,
    } satisfies QueryFeatureFlagSpec<'compact' | 'comfortable'>

    expect(readQueryFeatureFlag('?density=compact', densityFlag)).toBe('compact')
    expect(readQueryFeatureFlag('?density=unknown', densityFlag)).toBe('comfortable')
  })
})
