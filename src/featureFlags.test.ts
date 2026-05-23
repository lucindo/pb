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
  it('keeps switcher icons enabled by default', () => {
    expect(readFeatureFlags('')).toEqual({ switcherIcon: true })
  })

  it('enables switcher icons for on values', () => {
    expect(readFeatureFlags('?switcherIcon=1')).toEqual({ switcherIcon: true })
    expect(readFeatureFlags('?switcherIcon=true')).toEqual({ switcherIcon: true })
    expect(readFeatureFlags('?switcherIcon=on')).toEqual({ switcherIcon: true })
  })

  it('disables switcher icons for off values', () => {
    expect(readFeatureFlags('?switcherIcon=0')).toEqual({ switcherIcon: false })
    expect(readFeatureFlags('?switcherIcon=false')).toEqual({ switcherIcon: false })
    expect(readFeatureFlags('?switcherIcon=off')).toEqual({ switcherIcon: false })
  })

  it('falls back to the default for invalid switcherIcon values', () => {
    expect(readFeatureFlags('?switcherIcon=maybe')).toEqual({ switcherIcon: true })
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
