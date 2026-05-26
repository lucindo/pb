# Phase 47: Persistable feature-flag preferences - Pattern Map

**Mapped:** 2026-05-26
**Files analyzed:** 12 (3 modified, 4 created, 5 test files modified/created)
**Analogs found:** 12 / 12

Every new piece in Phase 47 is a verbatim duplication of an established v1.1/v2.0 precedent. The planner should NOT invent abstractions — paste-and-rename is the design.

## File Classification

| File | New/Modified | Role | Data Flow | Closest Analog | Match Quality |
|------|--------------|------|-----------|----------------|---------------|
| `src/featureFlags.ts` | Modified | Resolver | Read | self (line 100-107) | self-extend |
| `src/storage/prefs.ts` | Modified | Storage adapter / Coercer | Both | self (lines 38-57, 59-71) | self-extend |
| `src/hooks/useFeatureFlags.ts` | Modified | App-side orchestrator hook | Read | `src/hooks/useTheme.ts` (lines 60-90 Effects 3-4) | exact |
| `src/hooks/useBreathingShapeChoice.ts` | Created | Picker-side companion hook (choice hook) | Write | `src/hooks/useTimbreChoice.ts` (lines 24-49) | exact |
| `src/hooks/useRingCueChoice.ts` | Created | Picker-side companion hook (choice hook) | Write | `src/hooks/useTimbreChoice.ts` (lines 24-49) | exact |
| `src/hooks/useOrbIdleChoice.ts` | Created | Picker-side companion hook (choice hook) | Write | `src/hooks/useTimbreChoice.ts` (lines 24-49) | exact |
| `src/hooks/useSwitcherIconChoice.ts` | Created | Picker-side companion hook (choice hook, boolean) | Write | `src/hooks/useTimbreChoice.ts` (lines 24-49) | exact (with boolean type swap) |
| `src/storage/prefs.test.ts` | Modified | Test (coercer + round-trip) | Read+Write | self (lines 109-180) | self-extend |
| `src/featureFlags.test.ts` | Modified | Test (resolver) | Read | self (lines 35-142) | self-extend |
| `src/hooks/useFeatureFlags.test.ts` | Modified | Test (orchestrator + listeners) | Read | `src/hooks/useTheme.test.ts` (lines 118-200) | role+flow-match |
| `src/hooks/useBreathingShapeChoice.test.ts` | Created | Test (choice hook) | Write | `src/hooks/useTimbreChoice.test.ts` (lines 30-110) | exact |
| `src/hooks/useRingCueChoice.test.ts` | Created | Test (choice hook) | Write | `src/hooks/useTimbreChoice.test.ts` (lines 30-110) | exact |
| `src/hooks/useOrbIdleChoice.test.ts` | Created | Test (choice hook) | Write | `src/hooks/useTimbreChoice.test.ts` (lines 30-110) | exact |
| `src/hooks/useSwitcherIconChoice.test.ts` | Created | Test (choice hook, boolean) | Write | `src/hooks/useTimbreChoice.test.ts` (lines 30-110) | exact (with boolean type swap) |

---

## Pattern Assignments

### `src/storage/prefs.ts` (Storage adapter / Coercer — extend in place)

**Analog:** self — Phase 25 `coerceCue` shape verbatim.

**Imports pattern — current header** (`src/storage/prefs.ts:7-22`):

```typescript
import {
  DEFAULT_THEME,
  DEFAULT_TIMBRE,
  DEFAULT_CUE,
  DEFAULT_LOCALE,
  isValidTheme,
  isValidTimbre,
  isValidCue,
  isValidLocale,
  type ThemeId,
  type TimbreId,
  type CueStyleId,
  type LocaleId,
} from '../domain/settings'

import { readEnvelope, writeEnvelope, type StorageDeps } from './storage'
```

**Phase 47 extension — add a SECOND import block** for the four feature-flag identifiers + their parsers (D-02 DRY: defaults imported from `featureFlags.ts`). Sketch:

```typescript
import {
  BREATHING_SHAPE_FLAG,
  RING_CUE_FLAG,
  ORB_IDLE_FLAG,
  SWITCHER_ICON_FLAG,
  type BreathingShapeVariant,
  type RingCueStyle,
  type OrbIdleBehavior,
} from '../featureFlags'
```

> Note: the four `*_FLAG` consts in `src/featureFlags.ts` are currently `const` (module-private). Plan must export them (or export only `.defaultValue` / `.parse` projections — Claude's Discretion per CONTEXT D-03 alternative).

**`UserPrefs` interface — flat extension pattern** (`src/storage/prefs.ts:24-29`):

Current:
```typescript
export interface UserPrefs {
  theme: ThemeId
  timbre: TimbreId
  cue: CueStyleId
  locale: LocaleId
}
```

Phase 47 — append 4 fields (D-01):
```typescript
export interface UserPrefs {
  theme: ThemeId
  timbre: TimbreId
  cue: CueStyleId
  locale: LocaleId
  breathingShape: BreathingShapeVariant
  ringCue: RingCueStyle
  orbIdle: OrbIdleBehavior
  switcherIcon: boolean
}
```

**`DEFAULT_PREFS` — defaults DRY** (`src/storage/prefs.ts:31-36`):

Current:
```typescript
export const DEFAULT_PREFS: UserPrefs = {
  theme: DEFAULT_THEME,
  timbre: DEFAULT_TIMBRE,
  cue: DEFAULT_CUE,
  locale: DEFAULT_LOCALE,
}
```

Phase 47 — append 4 defaults sourced from `featureFlags.ts` (D-02):
```typescript
export const DEFAULT_PREFS: UserPrefs = {
  theme: DEFAULT_THEME,
  timbre: DEFAULT_TIMBRE,
  cue: DEFAULT_CUE,
  locale: DEFAULT_LOCALE,
  breathingShape: BREATHING_SHAPE_FLAG.defaultValue,
  ringCue: RING_CUE_FLAG.defaultValue,
  orbIdle: ORB_IDLE_FLAG.defaultValue,
  switcherIcon: SWITCHER_ICON_FLAG.defaultValue,
}
```

**Coercer pattern — paste-and-rename from `coerceCue`** (`src/storage/prefs.ts:51-53`):

Current `coerceCue`:
```typescript
export function coerceCue(raw: unknown): CueStyleId {
  return isValidCue(raw) ? raw : DEFAULT_CUE
}
```

Phase 47 — 4 new coercers reuse `*_FLAG.parse` (D-03 alias-table reuse). The non-boolean coercer template:

```typescript
export function coerceBreathingShape(raw: unknown): BreathingShapeVariant {
  if (typeof raw !== 'string') return BREATHING_SHAPE_FLAG.defaultValue
  return BREATHING_SHAPE_FLAG.parse(raw) ?? BREATHING_SHAPE_FLAG.defaultValue
}
```

The boolean coercer — `switcherIcon` is `boolean`, not a string union; `parseQueryBoolean` only accepts strings; persisted JSON re-hydrates `true` / `false` as actual booleans. **Special-case the persisted-boolean case before falling back to the string parser** (legacy `'true'`/`'false'` strings tolerated, in keeping with the `coerceTimbre` legacy-value tolerance precedent):

```typescript
export function coerceSwitcherIcon(raw: unknown): boolean {
  if (typeof raw === 'boolean') return raw
  if (typeof raw === 'string') {
    const parsed = parseQueryBoolean(raw)
    if (parsed !== null) return parsed
  }
  return SWITCHER_ICON_FLAG.defaultValue
}
```

> Planner: pull `parseQueryBoolean` into the new prefs.ts import; or co-locate the coercer in `featureFlags.ts` (Claude's Discretion per CONTEXT) — both acceptable.

**Legacy-value tolerance precedent** (`src/storage/prefs.ts:42-49` `coerceTimbre`):

```typescript
export function coerceTimbre(raw: unknown): TimbreId {
  // AUDIO-02 legacy-value migration: 'chime' was the fourth timbre slot before Phase 35
  // renamed it to 'flute'. Explicit remap preserves the user's fourth-slot preference.
  // No STATE_VERSION bump needed — coercers are non-throwing per-field; 'chime' is a
  // stale value, not a structural envelope change.
  if (raw === 'chime') return 'flute'
  return isValidTimbre(raw) ? raw : DEFAULT_TIMBRE
}
```

This shape is the precedent for any future Phase 48+ rename. **Phase 47 has no rename to do today**, but the alias tables (`kuthasta` → `spiritual-eye` in `BREATHING_SHAPE_FLAG.parse:71`) automatically extend coverage to persisted values via the parser reuse in D-03.

**`coercePrefs` extension — prototype-pollution mitigation byte-identical** (`src/storage/prefs.ts:59-71`):

Current:
```typescript
export function coercePrefs(raw: unknown): UserPrefs {
  // Prototype-pollution mitigation (T-14-01 / T-25-01 / D-12): we only read four known keys
  // from `r`; `raw` is never spread into a prototype-accessible object.
  const r = (raw !== null && typeof raw === 'object' && !Array.isArray(raw))
    ? raw as Record<string, unknown>
    : {}
  return {
    theme:   coerceTheme(r.theme),
    timbre:  coerceTimbre(r.timbre),
    cue:     coerceCue(r.cue),
    locale:  coerceLocale(r.locale),
  }
}
```

Phase 47 — append 4 keyed reads, comment now says "eight known keys" (D-04). `r` stays read-only, `raw` never spread:

```typescript
  return {
    theme:          coerceTheme(r.theme),
    timbre:         coerceTimbre(r.timbre),
    cue:            coerceCue(r.cue),
    locale:         coerceLocale(r.locale),
    breathingShape: coerceBreathingShape(r.breathingShape),
    ringCue:        coerceRingCue(r.ringCue),
    orbIdle:        coerceOrbIdle(r.orbIdle),
    switcherIcon:   coerceSwitcherIcon(r.switcherIcon),
  }
```

`loadPrefs` / `savePrefs` unchanged (lines 73-80).

---

### `src/featureFlags.ts` (Resolver — extend `readFeatureFlags` signature)

**Analog:** self — `readFeatureFlags` and `readQueryFeatureFlag` shape verbatim.

**Current resolver** (`src/featureFlags.ts:48-56`):

```typescript
export function readQueryFeatureFlag<T>(
  search: string,
  spec: QueryFeatureFlagSpec<T>,
): T {
  const rawValue = new URLSearchParams(search).get(spec.queryParam)
  if (rawValue === null) return spec.defaultValue

  return spec.parse(rawValue) ?? spec.defaultValue
}
```

**Phase 47 — invalid-query-falls-through-to-persisted (D-07)**: change the `?? spec.defaultValue` fallback to `?? null`, then chain to persisted at the call site. New helper added next to `readQueryFeatureFlag`:

```typescript
function readQueryFeatureFlagOrNull<T>(
  search: string,
  spec: QueryFeatureFlagSpec<T>,
): T | null {
  const rawValue = new URLSearchParams(search).get(spec.queryParam)
  if (rawValue === null) return null      // param absent → fall through
  return spec.parse(rawValue)              // param invalid → null (falls through); valid → T
}
```

> Existing `readQueryFeatureFlag` MUST stay byte-identical (CONTEXT: no change to query-string parser behaviour for valid values). The new helper is additive. `readQueryFeatureFlag` is still exported and still used by `featureFlags.test.ts`.

**Current `readFeatureFlags`** (`src/featureFlags.ts:100-107`):

```typescript
export function readFeatureFlags(search: string): FeatureFlags {
  return {
    switcherIcon: readQueryFeatureFlag(search, SWITCHER_ICON_FLAG),
    breathingShape: readQueryFeatureFlag(search, BREATHING_SHAPE_FLAG),
    orbIdle: readQueryFeatureFlag(search, ORB_IDLE_FLAG),
    ringCue: readQueryFeatureFlag(search, RING_CUE_FLAG),
  }
}
```

Phase 47 — 2-arg signature, per-field 4-way resolve (D-05, D-06, D-07):

```typescript
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
```

> Note: `switcherIcon` is `boolean`; `?? persisted.switcherIcon` is safe because the helper returns `null` (not `false`) when the query param is absent or unparseable. The `?? null` boundary at the helper is what makes the `??` chain at the resolver work for the boolean case too.

**Callsite update (single non-test caller)** — `src/hooks/useFeatureFlags.ts:27` (only production caller per D-08). Test file `src/featureFlags.test.ts` is the other caller; it shifts to the 2-arg signature in every assertion (see test pattern below).

---

### `src/hooks/useFeatureFlags.ts` (App-side orchestrator hook)

**Analog:** `src/hooks/useTheme.ts` (lines 60-90 Effects 3-4) — verbatim cross-tab + same-tab listener pattern.

**Current hook** (`src/hooks/useFeatureFlags.ts:1-28`, full file):

```typescript
import { useSyncExternalStore } from 'react'

import { readFeatureFlags, type FeatureFlags } from '../featureFlags'

function subscribeToLocationSearch(onStoreChange: () => void): () => void {
  window.addEventListener('popstate', onStoreChange)
  return () => {
    window.removeEventListener('popstate', onStoreChange)
  }
}

function getLocationSearchSnapshot(): string {
  return window.location.search
}

function getServerLocationSearchSnapshot(): string {
  return ''
}

export function useFeatureFlags(): FeatureFlags {
  const search = useSyncExternalStore(
    subscribeToLocationSearch,
    getLocationSearchSnapshot,
    getServerLocationSearchSnapshot,
  )

  return readFeatureFlags(search)
}
```

**Cross-tab `storage` listener — copy verbatim from `useTheme.ts:60-70` (Effect 3)**:

```typescript
useEffect(() => {
  const onStorage = (e: StorageEvent): void => {
    if (e.key === STATE_KEY) {
      setPersisted(loadPrefs())  // re-read persisted snapshot from disk
    }
  }
  window.addEventListener('storage', onStorage)
  return () => {
    window.removeEventListener('storage', onStorage)
  }
}, [])
```

**Same-tab `hrv:prefs-changed` listener — copy from `useTheme.ts:77-89` (Effect 4)** with the Phase 47 4-key filter set (D-11):

```typescript
useEffect(() => {
  const onPrefsChanged = (e: Event): void => {
    if (!(e instanceof CustomEvent)) return
    const detail = e.detail as { key?: string } | null
    if (
      !detail ||
      detail.key === undefined ||
      detail.key === 'breathingShape' ||
      detail.key === 'ringCue' ||
      detail.key === 'orbIdle' ||
      detail.key === 'switcherIcon'
    ) {
      setPersisted(loadPrefs())
    }
  }
  window.addEventListener('hrv:prefs-changed', onPrefsChanged)
  return () => {
    window.removeEventListener('hrv:prefs-changed', onPrefsChanged)
  }
}, [])
```

> `useTheme` filters with `detail.key === 'theme'`. Phase 47 filters with 4 keys + `undefined` (the "re-read all prefs" forward-compat path). The `popstate` subscription via `useSyncExternalStore` stays unchanged.

**Hook shape — sketch of the merged hook** (mirrors `useTheme.ts` shape: `useState` seeded from `loadPrefs()`, 2 listener effects, no `useCallback` needed — read-only hook):

```typescript
export function useFeatureFlags(): FeatureFlags {
  const search = useSyncExternalStore(
    subscribeToLocationSearch,
    getLocationSearchSnapshot,
    getServerLocationSearchSnapshot,
  )

  // Persisted snapshot from disk. Seeded at mount; refreshed on 'storage' (cross-tab)
  // and 'hrv:prefs-changed' (same-tab) events. popstate is handled by useSyncExternalStore.
  const [persisted, setPersisted] = useState<UserPrefs>(() => loadPrefs())

  // Effect 1: cross-tab 'storage' listener (verbatim from useTheme.ts:60-70).
  useEffect(() => { /* … */ }, [])

  // Effect 2: same-tab 'hrv:prefs-changed' listener — 4-key filter (D-11).
  useEffect(() => { /* … */ }, [])

  // Pure resolver: query > persisted > default, per-field independent (D-06).
  return readFeatureFlags(search, /* slim persisted projection */ {
    switcherIcon:   persisted.switcherIcon,
    breathingShape: persisted.breathingShape,
    orbIdle:        persisted.orbIdle,
    ringCue:        persisted.ringCue,
  })
}
```

> Claude's Discretion (CONTEXT): the `persisted` projection above strips the prefs to just the 4 flags. Planner may instead pass the full `UserPrefs` and type the resolver's second arg as `Pick<UserPrefs, 'switcherIcon' | 'breathingShape' | 'orbIdle' | 'ringCue'>` — equivalent at runtime.

---

### `src/hooks/useBreathingShapeChoice.ts` (Choice hook — new)

**Analog:** `src/hooks/useTimbreChoice.ts` (lines 24-49) — verbatim paste-and-rename, 20-line module.

**Choice hook template — full file from `useTimbreChoice.ts:24-49`**:

```typescript
import { useCallback, useState } from 'react'

import { loadPrefs, savePrefs } from '../storage/prefs'
import type { TimbreId } from '../domain/settings'

export function useTimbreChoice(): { timbre: TimbreId; setTimbre: (next: TimbreId) => void } {
  const [timbre, setTimbreState] = useState<TimbreId>(() => loadPrefs().timbre)

  const setTimbre = useCallback((next: TimbreId): void => {
    // 1. Fresh read of current envelope (do NOT use stale `timbre` closure from mount).
    const current = loadPrefs()
    // 2. Write merged envelope — preserves theme/variant/locale per Phase 14 D-17 per-field isolation.
    savePrefs({ ...current, timbre: next })
    // 3. Update local React state for optimistic-UI (picker reflects change immediately).
    setTimbreState(next)
    // 4. Dispatch custom event so sibling pickers/hooks filter on detail.key === 'timbre'.
    //    Fresh CustomEvent per dispatch — event objects are stateful (currentTarget, timeStamp, etc.).
    window.dispatchEvent(
      new CustomEvent('hrv:prefs-changed', { detail: { key: 'timbre', value: next } }),
    )
  }, [])

  return { timbre, setTimbre }
}
```

**Phase 47 `useBreathingShapeChoice`** (D-09 + D-10) — paste-and-rename:

```typescript
import { useCallback, useState } from 'react'

import { loadPrefs, savePrefs } from '../storage/prefs'
import type { BreathingShapeVariant } from '../featureFlags'

export function useBreathingShapeChoice(): {
  breathingShape: BreathingShapeVariant
  setBreathingShape: (next: BreathingShapeVariant) => void
} {
  const [breathingShape, setBreathingShapeState] =
    useState<BreathingShapeVariant>(() => loadPrefs().breathingShape)

  const setBreathingShape = useCallback((next: BreathingShapeVariant): void => {
    const current = loadPrefs()
    savePrefs({ ...current, breathingShape: next })
    setBreathingShapeState(next)
    window.dispatchEvent(
      new CustomEvent('hrv:prefs-changed', { detail: { key: 'breathingShape', value: next } }),
    )
  }, [])

  return { breathingShape, setBreathingShape }
}
```

### `src/hooks/useRingCueChoice.ts`, `useOrbIdleChoice.ts`

Same shape with `RingCueStyle` / `OrbIdleBehavior` types and `'ringCue'` / `'orbIdle'` `detail.key` strings. No other delta.

### `src/hooks/useSwitcherIconChoice.ts` (Choice hook, boolean — new)

Same shape with `boolean` type and `'switcherIcon'` `detail.key`:

```typescript
import { useCallback, useState } from 'react'

import { loadPrefs, savePrefs } from '../storage/prefs'

export function useSwitcherIconChoice(): {
  switcherIcon: boolean
  setSwitcherIcon: (next: boolean) => void
} {
  const [switcherIcon, setSwitcherIconState] =
    useState<boolean>(() => loadPrefs().switcherIcon)

  const setSwitcherIcon = useCallback((next: boolean): void => {
    const current = loadPrefs()
    savePrefs({ ...current, switcherIcon: next })
    setSwitcherIconState(next)
    window.dispatchEvent(
      new CustomEvent('hrv:prefs-changed', { detail: { key: 'switcherIcon', value: next } }),
    )
  }, [])

  return { switcherIcon, setSwitcherIcon }
}
```

> `useCueChoice` (lines 34-55) reads its current value from `useVisualCue` (single-source-of-truth pattern AC-WR-03). Phase 47 does NOT have that surface — `useFeatureFlags` is the App-side single source, but it's read at viewmodel level, not in the picker. The picker reads its own `useState`-seeded value (like `useTimbreChoice` / `useThemeChoice`), and the dispatched event re-reads `useFeatureFlags` via the new listener. **Stick with the `useTimbreChoice` shape**, not the `useCueChoice` shape.

---

### `src/storage/prefs.test.ts` (Test — extend in place)

**Analog:** self — Phase 25 `coerceCue` + `coerceLocale` tests (lines 109-180).

**Per-field coercer test template** (`src/storage/prefs.test.ts:172-179` `coerceLocale`):

```typescript
it('coerceLocale accepts all LOCALE_OPTIONS members and rejects invalid values', () => {
  for (const opt of LOCALE_OPTIONS) {
    expect(coerceLocale(opt)).toBe(opt)
  }
  expect(coerceLocale('pt_BR')).toBe(DEFAULT_LOCALE)
  expect(coerceLocale(null)).toBe(DEFAULT_LOCALE)
  expect(coerceLocale(0)).toBe(DEFAULT_LOCALE)
})
```

Phase 47 — 4 new test blocks per coercer. Iterate the parser's alias coverage, garbage-tolerance, null/number tolerance. For `coerceBreathingShape` reuse the alias coverage from `BREATHING_SHAPE_FLAG.parse:67-72` (`orb-halo` / `orb` / `halo` / `minimal-rings` / `minimal` / `rings` / `spiritual-eye` / `kuthasta` / `star`).

**Round-trip + envelope-merge test template** (`src/storage/prefs.test.ts:187-191`):

```typescript
it('round-trips a valid UserPrefs object (including cue field)', () => {
  const next: UserPrefs = { theme: 'dark', timbre: 'bell', cue: 'nose', locale: 'pt-BR' }
  savePrefs(next)
  expect(loadPrefs()).toEqual(next)
})
```

Phase 47 — extend the `UserPrefs` literal to 8 fields. Every existing `UserPrefs` literal in this file (lines 49, 188, 204, 215) needs the 4 new fields appended or the test must use `{ ...DEFAULT_PREFS, … }` spread.

> Planner: the per-field-fallback tests (lines 53-71) currently use 4-field literals. They will need the 4 new fields added (or `{ ...DEFAULT_PREFS, … }` spread). The variant-orphan-tolerance test at lines 79-96 stays unchanged (the dropped-key assertion now reads 8 fields not 4).

**Legacy-value tolerance pattern — applies to D-12 D-07 path** (`src/storage/prefs.test.ts:79-96` `tolerates legacy variant key`):

```typescript
const legacySquareEnvelope: unknown = {
  theme: 'system', timbre: 'bowl', cue: 'labels', locale: 'en', variant: 'square',
}
const coercedSquare = coercePrefs(legacySquareEnvelope)
expect(coercedSquare).toEqual({ theme: 'system', timbre: 'bowl', cue: 'labels', locale: 'en' })
expect(Object.prototype.hasOwnProperty.call(coercedSquare, 'variant')).toBe(false)
```

Phase 47 — analogous tests for the 4 new fields:
- `coerceBreathingShape('kuthasta')` → `'spiritual-eye'` (alias-table reuse proof — proves D-03 single-source-of-truth without duplicating the alias table)
- `coerceSwitcherIcon('true')` → `true` and `coerceSwitcherIcon('off')` → `false` (boolean coercer's `parseQueryBoolean` path)
- `coerceSwitcherIcon(true)` → `true` (boolean coercer's raw-boolean path)

---

### `src/featureFlags.test.ts` (Test — extend in place)

**Analog:** self — every `readFeatureFlags(search)` callsite shifts to `readFeatureFlags(search, persisted)`.

**Current default test** (`src/featureFlags.test.ts:36-43`):

```typescript
it('returns defaults for empty search', () => {
  expect(readFeatureFlags('')).toEqual({
    switcherIcon: false,
    breathingShape: 'orb-halo',
    orbIdle: 'ambient',
    ringCue: 'progress-arc',
  })
})
```

Phase 47 — pass a `persisted` snapshot to every callsite. Helper:

```typescript
const DEFAULT_PERSISTED: FeatureFlags = {
  switcherIcon: false,
  breathingShape: 'orb-halo',
  orbIdle: 'ambient',
  ringCue: 'progress-arc',
}

it('returns defaults for empty search + default persisted', () => {
  expect(readFeatureFlags('', DEFAULT_PERSISTED)).toEqual(DEFAULT_PERSISTED)
})
```

**4-way resolver coverage (D-12 D-06/D-07)** — new test block:

```typescript
describe('readFeatureFlags 4-way resolver (Phase 47 D-05/D-06/D-07)', () => {
  it('query-wins: valid query value overrides persisted', () => {
    const persisted: FeatureFlags = { ...DEFAULT_PERSISTED, breathingShape: 'spiritual-eye' }
    expect(readFeatureFlags('?breathingShape=minimal-rings', persisted).breathingShape)
      .toBe('minimal-rings')
  })

  it('persisted-wins: absent query falls through to persisted', () => {
    const persisted: FeatureFlags = { ...DEFAULT_PERSISTED, breathingShape: 'spiritual-eye' }
    expect(readFeatureFlags('', persisted).breathingShape).toBe('spiritual-eye')
  })

  it('default-wins: absent query AND default persisted yields default', () => {
    expect(readFeatureFlags('', DEFAULT_PERSISTED).breathingShape).toBe('orb-halo')
  })

  it('invalid-query-falls-through-to-persisted (D-07): unparseable query value is not silently masked', () => {
    const persisted: FeatureFlags = { ...DEFAULT_PERSISTED, breathingShape: 'spiritual-eye' }
    expect(readFeatureFlags('?breathingShape=junk', persisted).breathingShape).toBe('spiritual-eye')
  })

  it('per-field independence: query override on breathingShape does not affect ringCue', () => {
    const persisted: FeatureFlags = {
      ...DEFAULT_PERSISTED,
      breathingShape: 'spiritual-eye',
      ringCue: 'outer-inner',
    }
    const flags = readFeatureFlags('?breathingShape=minimal-rings', persisted)
    expect(flags.breathingShape).toBe('minimal-rings')   // query won
    expect(flags.ringCue).toBe('outer-inner')             // persisted won
  })
})
```

> The existing single-flag tests (lines 45-141) all need the second arg added — passing `DEFAULT_PERSISTED` keeps the existing behavior assertions intact (defaults match production).

---

### `src/hooks/useFeatureFlags.test.ts` (Test — extend in place)

**Analog:** `src/hooks/useTheme.test.ts` (lines 118-200) — cross-tab + same-tab listener test patterns.

**`storage`-event listener test** (`useTheme.test.ts:118-144`):

```typescript
it('updates state via cross-tab storage event with key === STATE_KEY', async () => {
  seedPrefs('dark')
  const { result } = renderHook(() => useTheme())
  expect(result.current.theme).toBe('dark')

  const newEnvelope = JSON.stringify({
    version: 1,
    prefs: { theme: 'light', timbre: 'bowl', locale: 'en' },
  })
  window.localStorage.setItem(STATE_KEY, newEnvelope)

  // eslint-disable-next-line @typescript-eslint/require-await
  await act(async () => {
    window.dispatchEvent(
      new StorageEvent('storage', { key: STATE_KEY, newValue: newEnvelope, oldValue: null }),
    )
  })

  expect(result.current.theme).toBe('light')
})
```

Phase 47 — same shape per flag (`breathingShape` / `ringCue` / `orbIdle` / `switcherIcon`). Plus the unrelated-key ignore test (`useTheme.test.ts:146-164`).

**`hrv:prefs-changed` listener test** (`useTheme.test.ts:166-184`):

```typescript
it('updates state via same-tab hrv:prefs-changed CustomEvent with key="theme"', async () => {
  seedPrefs('dark')
  const { result } = renderHook(() => useTheme())
  expect(result.current.theme).toBe('dark')

  seedPrefs('light')

  // eslint-disable-next-line @typescript-eslint/require-await
  await act(async () => {
    window.dispatchEvent(
      new CustomEvent('hrv:prefs-changed', { detail: { key: 'theme', value: 'light' } }),
    )
  })

  expect(result.current.theme).toBe('light')
})
```

Phase 47 — same per-flag tests, plus the unrelated-key ignore test using `key: 'theme'` (proves `useFeatureFlags` does NOT spuriously re-read on theme/cue/timbre/locale changes).

**`popstate` re-read test** — already covered at `useFeatureFlags.test.ts:21-32`; verify the test still passes with the persisted snapshot stable across the popstate cycle.

**`loadPrefs` integration test** — new:

```typescript
it('seeds initial flags from loadPrefs() at mount when no query string is present', () => {
  // Seed persisted prefs: user opted into spiritual-eye + still
  window.localStorage.setItem(STATE_KEY, JSON.stringify({
    version: 1,
    prefs: {
      theme: 'system', timbre: 'bowl', cue: 'arrow', locale: 'en',
      breathingShape: 'spiritual-eye', ringCue: 'outer-inner',
      orbIdle: 'still', switcherIcon: true,
    },
  }))
  const { result } = renderHook(() => useFeatureFlags())
  expect(result.current.breathingShape).toBe('spiritual-eye')
  expect(result.current.orbIdle).toBe('still')
  expect(result.current.switcherIcon).toBe(true)
})

it('query string wins over persisted on mount (PREFS-02)', () => {
  // Persisted = spiritual-eye, query = ?breathingShape=minimal-rings
  // Resolver returns minimal-rings.
  window.localStorage.setItem(STATE_KEY, JSON.stringify({
    version: 1, prefs: { /* … */ breathingShape: 'spiritual-eye' /* … */ },
  }))
  setSearch('?breathingShape=minimal-rings')
  const { result } = renderHook(() => useFeatureFlags())
  expect(result.current.breathingShape).toBe('minimal-rings')
})
```

---

### `src/hooks/useBreathingShapeChoice.test.ts`, `useRingCueChoice.test.ts`, `useOrbIdleChoice.test.ts`, `useSwitcherIconChoice.test.ts` (Tests — new)

**Analog:** `src/hooks/useTimbreChoice.test.ts` (lines 30-110) — exact paste-and-rename; 6 it-blocks per file.

**Full template (paste-and-rename for breathingShape; minor swaps for the other three)**:

```typescript
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { renderHook, act } from '@testing-library/react'

import { useBreathingShapeChoice } from './useBreathingShapeChoice'
import { STATE_KEY } from '../storage'
import { DEFAULT_PREFS, type UserPrefs } from '../storage/prefs'

function seedPrefs(prefs: UserPrefs): void {
  window.localStorage.setItem(STATE_KEY, JSON.stringify({ version: 1, prefs }))
}

beforeEach(() => { window.localStorage.clear() })
afterEach(() => {
  window.localStorage.clear()
  vi.restoreAllMocks()
})

describe('useBreathingShapeChoice', () => {
  it('initial state matches loadPrefs().breathingShape when localStorage is pre-seeded', () => {
    seedPrefs({ ...DEFAULT_PREFS, breathingShape: 'spiritual-eye' })
    const { result } = renderHook(() => useBreathingShapeChoice())
    expect(result.current.breathingShape).toBe('spiritual-eye')
  })

  it('setBreathingShape updates local state optimistically', () => {
    seedPrefs({ ...DEFAULT_PREFS, breathingShape: 'orb-halo' })
    const { result } = renderHook(() => useBreathingShapeChoice())
    act(() => { result.current.setBreathingShape('spiritual-eye') })
    expect(result.current.breathingShape).toBe('spiritual-eye')
  })

  it('setBreathingShape writes the new value to disk via savePrefs', () => {
    seedPrefs({ ...DEFAULT_PREFS, breathingShape: 'orb-halo' })
    const { result } = renderHook(() => useBreathingShapeChoice())
    act(() => { result.current.setBreathingShape('minimal-rings') })
    // eslint-disable-next-line @typescript-eslint/no-non-null-assertion
    const raw = JSON.parse(window.localStorage.getItem(STATE_KEY)!) as { version: number; prefs: UserPrefs }
    expect(raw.prefs.breathingShape).toBe('minimal-rings')
  })

  it('setBreathingShape preserves other prefs fields — envelope merge contract', () => {
    seedPrefs({ ...DEFAULT_PREFS, theme: 'dark', timbre: 'bell', cue: 'arrow', locale: 'pt-BR', breathingShape: 'orb-halo' })
    const { result } = renderHook(() => useBreathingShapeChoice())
    act(() => { result.current.setBreathingShape('spiritual-eye') })
    // eslint-disable-next-line @typescript-eslint/no-non-null-assertion
    const raw = JSON.parse(window.localStorage.getItem(STATE_KEY)!) as { version: number; prefs: UserPrefs }
    expect(raw.prefs.breathingShape).toBe('spiritual-eye')
    expect(raw.prefs.theme).toBe('dark')
    expect(raw.prefs.timbre).toBe('bell')
    expect(raw.prefs.locale).toBe('pt-BR')
    // Verify the other Phase 47 fields also preserved
    expect(raw.prefs.ringCue).toBe(DEFAULT_PREFS.ringCue)
    expect(raw.prefs.orbIdle).toBe(DEFAULT_PREFS.orbIdle)
    expect(raw.prefs.switcherIcon).toBe(DEFAULT_PREFS.switcherIcon)
  })

  it('setBreathingShape dispatches hrv:prefs-changed CustomEvent with correct detail shape', () => {
    seedPrefs({ ...DEFAULT_PREFS, breathingShape: 'orb-halo' })
    const spy = vi.fn()
    window.addEventListener('hrv:prefs-changed', spy)
    const { result } = renderHook(() => useBreathingShapeChoice())
    act(() => { result.current.setBreathingShape('spiritual-eye') })
    window.removeEventListener('hrv:prefs-changed', spy)
    expect(spy).toHaveBeenCalledTimes(1)
    // eslint-disable-next-line @typescript-eslint/no-non-null-assertion
    const event = spy.mock.calls[0]![0] as CustomEvent<{ key: string; value: string }>
    expect(event).toBeInstanceOf(CustomEvent)
    expect(event.detail.key).toBe('breathingShape')
    expect(event.detail.value).toBe('spiritual-eye')
  })

  it('setBreathingShape identity is stable across re-renders (useCallback empty deps contract)', () => {
    seedPrefs({ ...DEFAULT_PREFS, breathingShape: 'orb-halo' })
    const { result, rerender } = renderHook(() => useBreathingShapeChoice())
    const initialSetter = result.current.setBreathingShape
    rerender()
    expect(result.current.setBreathingShape).toBe(initialSetter)
  })
})
```

Substitutions for the three sibling test files:

| File | Hook | Field | Sample valid values |
|------|------|-------|---------------------|
| `useRingCueChoice.test.ts` | `useRingCueChoice` | `ringCue` | `'progress-arc'` / `'outer-inner'` |
| `useOrbIdleChoice.test.ts` | `useOrbIdleChoice` | `orbIdle` | `'ambient'` / `'still'` |
| `useSwitcherIconChoice.test.ts` | `useSwitcherIconChoice` | `switcherIcon` | `true` / `false` |

---

## Shared Patterns

### Same-tab CustomEvent contract — `hrv:prefs-changed` with per-key `detail.key`

**Source:** D-22 (Phase 16) — verbatim across `useThemeChoice`, `useTimbreChoice`, `useCueChoice`, `useLocaleChoice`.

**Apply to:** All 4 new choice hooks (D-10). Same event name; new `detail.key` values: `'breathingShape'` / `'ringCue'` / `'orbIdle'` / `'switcherIcon'`.

**Excerpt** (`src/hooks/useTimbreChoice.ts:43-45`):

```typescript
window.dispatchEvent(
  new CustomEvent('hrv:prefs-changed', { detail: { key: 'timbre', value: next } }),
)
```

### Cross-tab listener filter — `e.key === STATE_KEY`

**Source:** Phase 8 D-04a + Phase 16 Effect 3 — `STATE_KEY` import from `'../storage'`.

**Apply to:** `useFeatureFlags.ts` Effect 1 (new).

**Excerpt** (`src/hooks/useTheme.ts:60-70`):

```typescript
const onStorage = (e: StorageEvent): void => {
  if (e.key === STATE_KEY) {
    setTheme(loadPrefs().theme)
  }
}
window.addEventListener('storage', onStorage)
return () => { window.removeEventListener('storage', onStorage) }
```

### Same-tab listener key filter — `detail.key === '<flag>' || detail.key === undefined`

**Source:** Phase 16 Effect 4 — forward-compat `undefined` is treated as "re-read all prefs".

**Apply to:** `useFeatureFlags.ts` Effect 2 (new); 4-key union for the 4 flags.

**Excerpt** (`src/hooks/useTheme.ts:77-89`):

```typescript
const onPrefsChanged = (e: Event): void => {
  if (!(e instanceof CustomEvent)) return
  const detail = e.detail as { key?: string } | null
  if (!detail || detail.key === 'theme' || detail.key === undefined) {
    setTheme(loadPrefs().theme)
  }
}
```

### Envelope merge contract — `savePrefs({ ...current, [field]: next })`

**Source:** Phase 14 D-17 per-field isolation.

**Apply to:** All 4 new choice hooks' setters.

**Excerpt** (`src/hooks/useTimbreChoice.ts:34-38`):

```typescript
const setTimbre = useCallback((next: TimbreId): void => {
  const current = loadPrefs()
  savePrefs({ ...current, timbre: next })
  setTimbreState(next)
  // …
}, [])
```

### Prototype-pollution mitigation — read keys from `r`, never spread `raw`

**Source:** T-14-01 / T-25-01 / D-12 — preserved byte-identical in Phase 47.

**Apply to:** `src/storage/prefs.ts:62-64` — no change to the `r` narrowing; 4 new keyed reads added inside `coercePrefs`.

**Excerpt** (`src/storage/prefs.ts:62-64`):

```typescript
const r = (raw !== null && typeof raw === 'object' && !Array.isArray(raw))
  ? raw as Record<string, unknown>
  : {}
```

### Defaults DRY — `DEFAULT_PREFS` imports defaults from `featureFlags.ts`

**Source:** D-02 — `[[feedback_no_design_locking]]` applied at the data layer.

**Apply to:** `src/storage/prefs.ts:31-36` — 4 new defaults sourced from `*_FLAG.defaultValue`.

**Excerpt** (sketch):

```typescript
import { BREATHING_SHAPE_FLAG, RING_CUE_FLAG, ORB_IDLE_FLAG, SWITCHER_ICON_FLAG } from '../featureFlags'

export const DEFAULT_PREFS: UserPrefs = {
  /* …existing 4 fields… */
  breathingShape: BREATHING_SHAPE_FLAG.defaultValue,
  ringCue:        RING_CUE_FLAG.defaultValue,
  orbIdle:        ORB_IDLE_FLAG.defaultValue,
  switcherIcon:   SWITCHER_ICON_FLAG.defaultValue,
}
```

> Requires exporting the 4 `*_FLAG` consts from `featureFlags.ts` (currently module-private at lines 58-98). Planner: either export the consts or export 8 named projections (`BREATHING_SHAPE_DEFAULT` etc.) — `[[feedback_no_design_locking]]` is satisfied either way.

### Public re-export via `src/storage/index.ts` — automatic

**Source:** `src/storage/index.ts:7` — `export * from './prefs'`.

**Apply to:** No change needed. New `coerce<Flag>` functions, new fields in `UserPrefs`, new defaults all auto-re-export.

---

## No Analog Found

None. Every Phase 47 piece has a verbatim precedent in the existing codebase. The "boring on purpose" design constraint per CONTEXT specifics holds.

---

## Metadata

**Analog search scope:**
- `src/hooks/` (choice-hook precedents + orchestrator-hook precedents + their test files)
- `src/storage/` (prefs adapter + test file + storage envelope)
- `src/featureFlags.ts` + `src/featureFlags.test.ts` (resolver + tests)

**Files read:** 13 (CONTEXT.md, STATE.md, prefs.ts, featureFlags.ts, useFeatureFlags.ts, useTheme.ts, useTimbreChoice.ts, useThemeChoice.ts, useCueChoice.ts, useLocaleChoice.ts, useTimbreChoice.test.ts, useCueChoice.test.ts, useTheme.test.ts, prefs.test.ts, featureFlags.test.ts, useFeatureFlags.test.ts, storage.ts §47-69, storage/index.ts)

**Pattern extraction date:** 2026-05-26
