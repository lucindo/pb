import { describe, expect, it } from 'vitest'

import {
  BYPASS_SILENT_MODE_FLAG,
  ORB_IDLE_FLAG,
  parseQueryBoolean,
  readFeatureFlags,
  type FeatureFlags,
} from './featureFlags'

// Snapshot of production defaults — used as the second arg to the 2-arg
// readFeatureFlags(search, persisted) resolver. Because this snapshot equals
// the production defaults, every existing single-flag assertion stays byte-identical.
const DEFAULT_PERSISTED: FeatureFlags = {
  orbIdle: 'ambient',
  bypassSilentMode: true,
}

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
    expect(readFeatureFlags('', DEFAULT_PERSISTED)).toEqual({
      orbIdle: 'ambient',
      bypassSilentMode: true,
    })
  })

  it('defaults orbIdle to ambient', () => {
    expect(readFeatureFlags('', DEFAULT_PERSISTED).orbIdle).toBe('ambient')
  })

  it('parses orbIdle=ambient and orbIdle=still', () => {
    expect(readFeatureFlags('?orbIdle=ambient', DEFAULT_PERSISTED).orbIdle).toBe('ambient')
    expect(readFeatureFlags('?orbIdle=still', DEFAULT_PERSISTED).orbIdle).toBe('still')
  })

  it('orbIdle is case-insensitive and trims whitespace', () => {
    expect(readFeatureFlags('?orbIdle=AMBIENT', DEFAULT_PERSISTED).orbIdle).toBe('ambient')
    expect(readFeatureFlags('?orbIdle=%20Still%20', DEFAULT_PERSISTED).orbIdle).toBe('still')
  })

  it('falls back to default for invalid orbIdle values', () => {
    expect(readFeatureFlags('?orbIdle=junk', DEFAULT_PERSISTED).orbIdle).toBe('ambient')
  })

  it('defaults bypassSilentMode to true when query absent (D-05)', () => {
    expect(readFeatureFlags('', DEFAULT_PERSISTED).bypassSilentMode).toBe(true)
  })

  it('overrides bypassSilentMode when query is ?bypassSilentMode=false (D-06)', () => {
    expect(readFeatureFlags('?bypassSilentMode=false', { ...DEFAULT_PERSISTED, bypassSilentMode: true }).bypassSilentMode).toBe(false)
  })

  it('persisted false wins when bypassSilentMode query absent', () => {
    expect(readFeatureFlags('', { ...DEFAULT_PERSISTED, bypassSilentMode: false }).bypassSilentMode).toBe(false)
  })

  it('unparseable bypassSilentMode query falls through to persisted (D-07)', () => {
    expect(readFeatureFlags('?bypassSilentMode=garbage', { ...DEFAULT_PERSISTED, bypassSilentMode: false }).bypassSilentMode).toBe(false)
  })
})

describe('readFeatureFlags 4-way resolver (Phase 47 D-05/D-06/D-07)', () => {
  it('query-wins: valid query value overrides persisted', () => {
    const persisted: FeatureFlags = { ...DEFAULT_PERSISTED, orbIdle: 'still' }
    expect(readFeatureFlags('?orbIdle=ambient', persisted).orbIdle)
      .toBe('ambient')
  })

  it('persisted-wins: absent query falls through to persisted', () => {
    const persisted: FeatureFlags = { ...DEFAULT_PERSISTED, orbIdle: 'still' }
    expect(readFeatureFlags('', persisted).orbIdle).toBe('still')
  })

  it('default-wins: absent query AND default persisted yields default', () => {
    expect(readFeatureFlags('', DEFAULT_PERSISTED).orbIdle).toBe('ambient')
  })

  it('invalid-query-falls-through-to-persisted (D-07): unparseable query value is not silently masked', () => {
    const persisted: FeatureFlags = { ...DEFAULT_PERSISTED, orbIdle: 'still' }
    expect(readFeatureFlags('?orbIdle=junk', persisted).orbIdle).toBe('still')
  })

  it('per-field independence: query override on orbIdle does not affect bypassSilentMode', () => {
    const persisted: FeatureFlags = {
      ...DEFAULT_PERSISTED,
      orbIdle: 'still',
      bypassSilentMode: false,
    }
    const flags = readFeatureFlags('?orbIdle=ambient', persisted)
    expect(flags.orbIdle).toBe('ambient')
    expect(flags.bypassSilentMode).toBe(false)
  })
})

describe('exported *_FLAG specs (Phase 47 D-02/D-03 DRY)', () => {
  it('BYPASS_SILENT_MODE_FLAG is exported with the production default and queryParam', () => {
    expect(BYPASS_SILENT_MODE_FLAG.queryParam).toBe('bypassSilentMode')
    expect(BYPASS_SILENT_MODE_FLAG.defaultValue).toBe(true) // default true
  })

  it('ORB_IDLE_FLAG is exported with the production default and parser', () => {
    expect(ORB_IDLE_FLAG.queryParam).toBe('orbIdle')
    expect(ORB_IDLE_FLAG.defaultValue).toBe('ambient')
    expect(ORB_IDLE_FLAG.parse('still')).toBe('still')
  })
})
