export interface QueryFeatureFlagSpec<T> {
  queryParam: string
  defaultValue: T
  parse(this: void, rawValue: string): T | null
}

export type BreathingShapeVariant = 'orb-halo' | 'minimal-rings'

export interface FeatureFlags {
  switcherIcon: boolean
  breathingShape: BreathingShapeVariant
}

const TRUE_QUERY_BOOLEAN_VALUES = new Set([
  '',
  '1',
  'on',
  't',
  'true',
  'y',
  'yes',
  'enable',
  'enabled',
])

const FALSE_QUERY_BOOLEAN_VALUES = new Set([
  '0',
  'off',
  'f',
  'false',
  'n',
  'no',
  'disable',
  'disabled',
])

export function parseQueryBoolean(rawValue: string): boolean | null {
  const normalized = rawValue.trim().toLowerCase()
  if (TRUE_QUERY_BOOLEAN_VALUES.has(normalized)) return true
  if (FALSE_QUERY_BOOLEAN_VALUES.has(normalized)) return false
  return null
}

export function readQueryFeatureFlag<T>(
  search: string,
  spec: QueryFeatureFlagSpec<T>,
): T {
  const rawValue = new URLSearchParams(search).get(spec.queryParam)
  if (rawValue === null) return spec.defaultValue

  return spec.parse(rawValue) ?? spec.defaultValue
}

const SWITCHER_ICON_FLAG = {
  queryParam: 'switcherIcon',
  defaultValue: true,
  parse: parseQueryBoolean,
} satisfies QueryFeatureFlagSpec<boolean>

const BREATHING_SHAPE_FLAG = {
  queryParam: 'breathingShape',
  defaultValue: 'orb-halo' as BreathingShapeVariant,
  parse(rawValue: string): BreathingShapeVariant | null {
    const v = rawValue.trim().toLowerCase()
    if (v === 'orb-halo' || v === 'orb' || v === 'halo') return 'orb-halo'
    if (v === 'minimal-rings' || v === 'minimal' || v === 'rings') return 'minimal-rings'
    return null
  },
} satisfies QueryFeatureFlagSpec<BreathingShapeVariant>

export function readFeatureFlags(search: string): FeatureFlags {
  return {
    switcherIcon: readQueryFeatureFlag(search, SWITCHER_ICON_FLAG),
    breathingShape: readQueryFeatureFlag(search, BREATHING_SHAPE_FLAG),
  }
}
