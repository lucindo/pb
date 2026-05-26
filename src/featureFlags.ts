export interface QueryFeatureFlagSpec<T> {
  queryParam: string
  defaultValue: T
  parse(this: void, rawValue: string): T | null
}

export type BreathingShapeVariant = 'orb-halo' | 'minimal-rings' | 'spiritual-eye'
export type OrbIdleBehavior = 'still' | 'ambient'
export type RingCueStyle = 'outer-inner' | 'progress-arc'

export interface FeatureFlags {
  switcherIcon: boolean
  breathingShape: BreathingShapeVariant
  orbIdle: OrbIdleBehavior
  ringCue: RingCueStyle
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

// Phase 47 D-07: returns `null` for absent OR unparseable query values so the
// resolver's `??` chain falls through to the persisted snapshot (not to the
// production default). Private helper — only `readFeatureFlags` consumes it.
function readQueryFeatureFlagOrNull<T>(
  search: string,
  spec: QueryFeatureFlagSpec<T>,
): T | null {
  const rawValue = new URLSearchParams(search).get(spec.queryParam)
  if (rawValue === null) return null
  return spec.parse(rawValue)
}

export const SWITCHER_ICON_FLAG = {
  queryParam: 'switcherIcon',
  defaultValue: false,
  parse: parseQueryBoolean,
} satisfies QueryFeatureFlagSpec<boolean>

export const BREATHING_SHAPE_FLAG = {
  queryParam: 'breathingShape',
  defaultValue: 'orb-halo' as BreathingShapeVariant,
  parse(rawValue: string): BreathingShapeVariant | null {
    const v = rawValue.trim().toLowerCase()
    if (v === 'orb-halo' || v === 'orb' || v === 'halo') return 'orb-halo'
    if (v === 'minimal-rings' || v === 'minimal' || v === 'rings') return 'minimal-rings'
    if (v === 'spiritual-eye' || v === 'kuthasta' || v === 'star') return 'spiritual-eye'
    return null
  },
} satisfies QueryFeatureFlagSpec<BreathingShapeVariant>

export const ORB_IDLE_FLAG = {
  queryParam: 'orbIdle',
  defaultValue: 'ambient' as OrbIdleBehavior,
  parse(rawValue: string): OrbIdleBehavior | null {
    const v = rawValue.trim().toLowerCase()
    if (v === 'still') return 'still'
    if (v === 'ambient') return 'ambient'
    return null
  },
} satisfies QueryFeatureFlagSpec<OrbIdleBehavior>

export const RING_CUE_FLAG = {
  queryParam: 'ringCue',
  defaultValue: 'progress-arc' as RingCueStyle,
  parse(rawValue: string): RingCueStyle | null {
    const v = rawValue.trim().toLowerCase()
    if (v === 'outer-inner' || v === 'production' || v === 'rings' || v === 'default')
      return 'outer-inner'
    if (v === 'progress-arc' || v === 'progress' || v === 'arc' || v === 'south')
      return 'progress-arc'
    return null
  },
} satisfies QueryFeatureFlagSpec<RingCueStyle>

// Phase 47 D-05/D-06/D-07: per-field 4-way resolver. Resolution order for each
// field is query > persisted > default, evaluated independently per field.
// `readQueryFeatureFlagOrNull` returns `null` for absent OR unparseable values,
// so the `??` chain falls through to `persisted.<field>` (D-07: invalid query
// is not silently masked into the production default). The boolean case
// (switcherIcon) is safe because the helper returns `null`, not `false`.
// The function stays pure (no I/O) so the App-side hook (useFeatureFlags) owns
// the storage read and supplies `persisted` from loadPrefs().
export function readFeatureFlags(
  search: string,
  persisted: FeatureFlags,
): FeatureFlags {
  return {
    switcherIcon:   readQueryFeatureFlagOrNull(search, SWITCHER_ICON_FLAG)   ?? persisted.switcherIcon,
    breathingShape: readQueryFeatureFlagOrNull(search, BREATHING_SHAPE_FLAG) ?? persisted.breathingShape,
    orbIdle:        readQueryFeatureFlagOrNull(search, ORB_IDLE_FLAG)        ?? persisted.orbIdle,
    ringCue:        readQueryFeatureFlagOrNull(search, RING_CUE_FLAG)        ?? persisted.ringCue,
  }
}
