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

// Alias provenance — each non-canonical token is intentional and retained
// for documented call sites; do NOT drop without auditing first.
//   - 'orb', 'halo'        → 'orb-halo'      : UI-label tokens; share strings.ts options.orb / options.halo entries.
//   - 'minimal', 'rings'   → 'minimal-rings' : UI-label tokens; 'rings' is dual-meaning (see RING_CUE_FLAG below).
//   - 'kuthasta', 'star'   → 'spiritual-eye' : design-spec heritage (kuthasta = Sanskrit, star = layperson).
// Same input string can resolve differently per query parameter — lookup is
// per-parameter, so the dual-meaning of 'rings' across breathingShape and
// ringCue is by design, not collision.
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

// Alias provenance — every non-canonical token has a recorded origin; the
// per-parameter scope means 'rings' here (→ outer-inner) does not conflict
// with 'rings' on breathingShape (→ minimal-rings). Cross-file: the EN
// strings.ts options.rings label is the UI surface for the 'outer-inner'
// variant, which is why 'rings' is accepted here as a UI-label alias.
//   outer-inner aliases:
//     - 'rings'      : UI-label token (strings.ts options.rings = 'Rings').
//     - 'production' : Phase 21/47 spike-branch alias (was the production default before Phase 47 flipped to progress-arc).
//     - 'default'    : convenience alias for spike branches that wrote `?ringCue=default`.
//   progress-arc aliases:
//     - 'arc'        : UI-label token (strings.ts options.arc = 'Arc').
//     - 'progress'   : shorthand introduced during the progress-arc spike.
//     - 'south'      : spike-branch label ('south arc' from the early visual studies); retained because there is no cost and a removal would be observable to any bookmarked debug URL.
// If any of the above aliases is genuinely unused at the next cleanup, drop
// it together with its test row in featureFlags.test.ts — do not orphan one
// side of the pair.
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
