export interface QueryFeatureFlagSpec<T> {
  queryParam: string
  defaultValue: T
  parse(this: void, rawValue: string): T | null
}

export interface FeatureFlags {
  bypassSilentMode: boolean  // default true preserves the no-silent-mode bypass users rely on
}

const TRUE_QUERY_BOOLEAN_VALUES = new Set([
  // Bare flag (e.g. `?bypassSilentMode` or `?bypassSilentMode=`) — common CLI
  // convention for boolean toggles. URLSearchParams.get returns '' for both
  // forms, so they are indistinguishable here by design.
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

// Returns `null` for absent OR unparseable query values so the resolver's `??` chain
// falls through to the persisted snapshot (not to the production default). Private
// helper — only `readFeatureFlags` consumes it.
function readQueryFeatureFlagOrNull<T>(
  search: string,
  spec: QueryFeatureFlagSpec<T>,
): T | null {
  const rawValue = new URLSearchParams(search).get(spec.queryParam)
  if (rawValue === null) return null
  return spec.parse(rawValue)
}

export const BYPASS_SILENT_MODE_FLAG = {
  queryParam: 'bypassSilentMode',
  defaultValue: true, // default true preserves the no-silent-mode bypass users rely on
  parse: parseQueryBoolean,
} satisfies QueryFeatureFlagSpec<boolean>

// Per-field resolver. Resolution order for each field: query > persisted > default,
// evaluated independently. `readQueryFeatureFlagOrNull` returns `null` for absent OR
// unparseable values so the `??` chain falls through to `persisted.<field>` (an invalid
// query value is not silently masked into the production default). The boolean case
// (bypassSilentMode) is safe because the helper returns `null`, not `false`.
// The function stays pure (no I/O) so the App-side hook (useFeatureFlags) owns
// the storage read and supplies `persisted` from loadPrefs().
export function readFeatureFlags(
  search: string,
  persisted: FeatureFlags,
): FeatureFlags {
  return {
    bypassSilentMode: readQueryFeatureFlagOrNull(search, BYPASS_SILENT_MODE_FLAG) ?? persisted.bypassSilentMode,
  }
}
