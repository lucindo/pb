import { describe, expect, it } from 'vitest'

import {
  BYPASS_SILENT_MODE_FLAG,
  ORB_IDLE_FLAG,
  RING_CUE_FLAG,
  parseQueryBoolean,
  readFeatureFlags,
  type FeatureFlags,
} from './featureFlags'

// Snapshot of production defaults — used as the second arg to the 2-arg
// readFeatureFlags(search, persisted) resolver. Because this snapshot equals
// the production defaults, every existing single-flag assertion stays byte-identical.
const DEFAULT_PERSISTED: FeatureFlags = {
  orbIdle: 'ambient',
  ringCue: 'progress-arc',
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
      ringCue: 'progress-arc',
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

  it('defaults ringCue to progress-arc', () => {
    expect(readFeatureFlags('', DEFAULT_PERSISTED).ringCue).toBe('progress-arc')
  })

  it('parses progress-arc and its aliases', () => {
    expect(readFeatureFlags('?ringCue=progress-arc', DEFAULT_PERSISTED).ringCue).toBe('progress-arc')
    expect(readFeatureFlags('?ringCue=progress', DEFAULT_PERSISTED).ringCue).toBe('progress-arc')
    expect(readFeatureFlags('?ringCue=arc', DEFAULT_PERSISTED).ringCue).toBe('progress-arc')
    expect(readFeatureFlags('?ringCue=south', DEFAULT_PERSISTED).ringCue).toBe('progress-arc')
  })

  it('parses outer-inner and its aliases', () => {
    expect(readFeatureFlags('?ringCue=outer-inner', DEFAULT_PERSISTED).ringCue).toBe('outer-inner')
    expect(readFeatureFlags('?ringCue=production', DEFAULT_PERSISTED).ringCue).toBe('outer-inner')
    expect(readFeatureFlags('?ringCue=rings', DEFAULT_PERSISTED).ringCue).toBe('outer-inner')
    expect(readFeatureFlags('?ringCue=default', DEFAULT_PERSISTED).ringCue).toBe('outer-inner')
  })

  it('ringCue is case-insensitive and trims whitespace', () => {
    expect(readFeatureFlags('?ringCue=PROGRESS-ARC', DEFAULT_PERSISTED).ringCue).toBe('progress-arc')
    expect(readFeatureFlags('?ringCue=%20Arc%20', DEFAULT_PERSISTED).ringCue).toBe('progress-arc')
  })

  it('falls back to default for invalid ringCue values', () => {
    expect(readFeatureFlags('?ringCue=junk', DEFAULT_PERSISTED).ringCue).toBe('progress-arc')
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
    const persisted: FeatureFlags = { ...DEFAULT_PERSISTED, ringCue: 'outer-inner' }
    expect(readFeatureFlags('?ringCue=progress-arc', persisted).ringCue)
      .toBe('progress-arc')
  })

  it('persisted-wins: absent query falls through to persisted', () => {
    const persisted: FeatureFlags = { ...DEFAULT_PERSISTED, ringCue: 'outer-inner' }
    expect(readFeatureFlags('', persisted).ringCue).toBe('outer-inner')
  })

  it('default-wins: absent query AND default persisted yields default', () => {
    expect(readFeatureFlags('', DEFAULT_PERSISTED).ringCue).toBe('progress-arc')
  })

  it('invalid-query-falls-through-to-persisted (D-07): unparseable query value is not silently masked', () => {
    const persisted: FeatureFlags = { ...DEFAULT_PERSISTED, ringCue: 'outer-inner' }
    expect(readFeatureFlags('?ringCue=junk', persisted).ringCue).toBe('outer-inner')
  })

  it('per-field independence: query override on ringCue does not affect orbIdle', () => {
    const persisted: FeatureFlags = {
      ...DEFAULT_PERSISTED,
      ringCue: 'outer-inner',
      orbIdle: 'still',
    }
    const flags = readFeatureFlags('?ringCue=progress-arc', persisted)
    expect(flags.ringCue).toBe('progress-arc')
    expect(flags.orbIdle).toBe('still')
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

  it('RING_CUE_FLAG is exported with the production default and parser', () => {
    expect(RING_CUE_FLAG.queryParam).toBe('ringCue')
    expect(RING_CUE_FLAG.defaultValue).toBe('progress-arc')
    expect(RING_CUE_FLAG.parse('south')).toBe('progress-arc')
  })
})
