# Phase 14: Prefs Foundation - Pattern Map

**Mapped:** 2026-05-12
**Files analyzed:** 6 (4 source + 2 test)
**Analogs found:** 6 / 6

## File Classification

| New/Modified File | Role | Data Flow | Closest Analog | Match Quality |
|---|---|---|---|---|
| `src/domain/settings.ts` (EXTENDED) | domain/model | transform | `src/domain/settings.ts` itself | exact (self-extension) |
| `src/storage/prefs.ts` (NEW) | service/storage | CRUD | `src/storage/settings.ts` | exact |
| `src/storage/storage.ts` (EXTENDED) | model/interface | — | `src/storage/storage.ts:43-55` itself | exact (self-extension) |
| `src/storage/index.ts` (EXTENDED) | config/barrel | — | `src/storage/index.ts` itself | exact (self-extension) |
| `src/domain/settings.test.ts` (EXTENDED) | test | — | `src/domain/settings.test.ts` itself | exact (self-extension) |
| `src/storage/prefs.test.ts` (NEW) | test | — | `src/storage/settings.test.ts` | exact |

---

## Pattern Assignments

### `src/domain/settings.ts` (EXTENDED — domain/model)

**Analog:** `src/domain/settings.ts` (self-extension, BPM/RATIO/DURATION blocks)

**Type + OPTIONS array + predicate block** (`src/domain/settings.ts:1-63`):
```typescript
// Pattern for EACH of the four new dimensions — replicate this block four times.
// Step 1: declare the union type (or derive from OPTIONS array — either order works,
//         but declaring the type first then using `satisfies` keeps intent clear).
export type RatioLabel = '50:50' | '40:60' | '30:70' | '20:80'

// Step 2: frozen OPTIONS array with `as const satisfies readonly T[]`
export const RATIO_OPTIONS = ['50:50', '40:60', '30:70', '20:80'] as const satisfies readonly RatioLabel[]

// Step 3: predicate — `(v: unknown): v is T` using .includes() on the OPTIONS cast
export function isValidRatio(v: unknown): v is RatioLabel {
  return typeof v === 'string' && (RATIO_OPTIONS as readonly string[]).includes(v)
}
// Note for ThemeId/TimbreId/VisualVariantId/LocaleId: all are string unions, so
// the `isValidBpm` numeric pattern (typeof + Number.isFinite + includes) is NOT
// the right template — use isValidRatio's string-only pattern instead.
```

**DEFAULT_SETTINGS aggregate** (`src/domain/settings.ts:44-48`):
```typescript
// Per-dim DEFAULT_* constants ship in domain/settings.ts, NOT in storage/prefs.ts.
// The aggregate DEFAULT_PREFS lives in storage/prefs.ts and imports from here.
export const DEFAULT_SETTINGS: SessionSettings = {
  bpm: 5.5,
  ratio: '40:60',
  durationMinutes: 10,
}
// New pattern: four separate constants (DEFAULT_THEME, DEFAULT_TIMBRE, DEFAULT_VARIANT,
// DEFAULT_LOCALE) before DEFAULT_PREFS aggregate (which lives in prefs.ts).
```

**eslint-disable annotation policy** (`src/domain/settings.ts:71-76`):
```typescript
// Any eslint-disable line in domain/settings.ts MUST have a `// Reason:` comment above it.
// eslint-disable-next-line @typescript-eslint/restrict-template-expressions
throw new RangeError(`Unsupported ratio: ${settings.ratio}`)
// Note: prefs coercers are NON-THROWING — this pattern only applies if a NEW
// throwing validator is added. Coercers use ternary fallback, not throw.
```

**What is NOT cloned:** `validateSettings` (lines 65-84) — prefs use non-throwing coercers only (Phase 4 D-15 / D-17 policy). Do not add a `validatePrefs` throwing function.

---

### `src/storage/prefs.ts` (NEW — service/storage, CRUD)

**Analog:** `src/storage/settings.ts` (exact role + data flow match)

**Imports block** (`src/storage/settings.ts:1-16`):
```typescript
// src/storage/settings.ts — copy this import structure verbatim, substituting prefs symbols.
import {
  DEFAULT_SETTINGS,
  isValidBpm,
  isValidRatio,
  isValidDuration,
  type SessionSettings,
} from '../domain/settings'

import { readEnvelope, writeEnvelope, type StorageDeps } from './storage'
// New file imports:
// import { DEFAULT_THEME, DEFAULT_TIMBRE, DEFAULT_VARIANT, DEFAULT_LOCALE,
//          isValidTheme, isValidTimbre, isValidVariant, isValidLocale,
//          type ThemeId, type TimbreId, type VisualVariantId, type LocaleId,
// } from '../domain/settings'
// import { readEnvelope, writeEnvelope, type StorageDeps } from './storage'
```

**File header comment** (`src/storage/settings.ts:1-6`):
```typescript
// src/storage/prefs.ts
//
// Phase 14 D-10/D-17: per-field coerce-and-fallback for user prefs.
// Coercers are NON-THROWING (mirrors coerceSettings in src/storage/settings.ts).
// Per-field policy: a single drifted dimension does NOT discard the other three.
```

**coerceSettings — literal template for coercePrefs** (`src/storage/settings.ts:18-27`):
```typescript
export function coerceSettings(raw: unknown): SessionSettings {
  const r = (raw !== null && typeof raw === 'object' && !Array.isArray(raw))
    ? raw as Record<string, unknown>
    : {}
  return {
    bpm:             isValidBpm(r.bpm)             ? r.bpm             : DEFAULT_SETTINGS.bpm,
    ratio:           isValidRatio(r.ratio)         ? r.ratio           : DEFAULT_SETTINGS.ratio,
    durationMinutes: isValidDuration(r.durationMinutes) ? r.durationMinutes : DEFAULT_SETTINGS.durationMinutes,
  }
}
// coercePrefs follows this exactly — four fields instead of three.
// The `Record<string, unknown>` cast on line 20 may need an eslint-disable;
// if so, pair with `// Reason:` per D-04 annotation policy.
```

**Per-field coercers (one per dimension)** — D-10 explicit shape:
```typescript
// Four coercers (one per dim), following the same ternary-fallback pattern:
export function coerceTheme(raw: unknown): ThemeId {
  return isValidTheme(raw) ? raw : DEFAULT_THEME
}
// repeat for coerceTimbre, coerceVariant, coerceLocale
```

**loadSettings/saveSettings — literal template for loadPrefs/savePrefs** (`src/storage/settings.ts:33-40`):
```typescript
export function loadSettings(deps: StorageDeps = {}): SessionSettings {
  return coerceSettings(readEnvelope(deps).settings)
}

export function saveSettings(settings: SessionSettings, deps: StorageDeps = {}): void {
  const env = readEnvelope(deps)
  writeEnvelope({ ...env, settings }, deps)
}
// loadPrefs: return coercePrefs(readEnvelope(deps).prefs)
// savePrefs: read env, spread, overlay prefs key:
//   writeEnvelope({ ...env, prefs }, deps)
```

---

### `src/storage/storage.ts` (EXTENDED — Envelope interface)

**Analog:** `src/storage/storage.ts:43-55` (self-extension)

**Envelope interface** (`src/storage/storage.ts:43-55`):
```typescript
export interface Envelope {
  version: number
  settings?: unknown
  mute?: unknown
  stats?: unknown
  // ADD ONE LINE:
  // prefs?: unknown   // Phase 14 D-11: static type acknowledges runtime forward-compat.
  //                   // Type is `unknown` (not UserPrefs) to avoid storage→domain typed
  //                   // circular import; coercers narrow at the boundary. Mirrors the
  //                   // posture of settings/mute/stats above.
}
```

**STORAGE-01 comment rationale to preserve** (`src/storage/storage.ts:44-50`):
The existing RESEARCH RQ-4 Option b comment on lines 44-50 explains why `[k: string]: unknown` index signatures are NOT used. The new `prefs?: unknown` field follows the same "named optional field" pattern — no index signature, no type-level forward-compat; runtime `...p` spread carries it.

**No runtime change.** The spread at `src/storage/storage.ts:96` already preserves `prefs` (proven by `storage.test.ts:82-97` probe). The only edit is the one-line TS type addition.

**Cast cleanup (stretch goal, zero-touch otherwise):** After adding `prefs?: unknown`, the `as unknown as Record<string, unknown>` cast at `storage.test.ts:96` becomes unnecessary. The plan may clean that cast as a zero-test-logic change, but it is NOT required for Phase 14 green-gate.

---

### `src/storage/index.ts` (EXTENDED — barrel re-export)

**Analog:** `src/storage/index.ts` itself (`src/storage/index.ts:1-7`)

**Current state:**
```typescript
// src/storage/index.ts
// Public surface for Phase 4 storage. Consumers import via `from '../storage'`.

export * from './storage'
export * from './settings'
export * from './stats'
export * from './format'
```

**One-line addition — append to bottom:**
```typescript
export * from './prefs'
```

No other changes. Downstream consumers (`App.tsx`, Phase 15+) will use:
```typescript
import { loadPrefs, savePrefs, UserPrefs, DEFAULT_PREFS } from '../storage'
```

---

### `src/domain/settings.test.ts` (EXTENDED — test)

**Analog:** `src/domain/settings.test.ts` (self-extension, `isValidBpm`/`isValidRatio`/`isValidDuration` blocks)

**Three-block predicate test structure** (`src/domain/settings.test.ts:5-52`):
```typescript
// Replicate this three-block pattern for each of the four new predicates.
// Block 1 — accept valid members
describe('isValidRatio (HYGIENE-02 D-08)', () => {
  it('returns true for RATIO_OPTIONS members (e.g. "40:60")', () => {
    expect(isValidRatio('40:60')).toBe(true)
  })
  // Block 2 — reject malformed / out-of-range
  it('returns false for malformed strings ("40-60", "")', () => {
    expect(isValidRatio('40-60')).toBe(false)
    expect(isValidRatio('')).toBe(false)
  })
  // Block 3 — reject wrong type (null, number, undefined, NaN where applicable)
  it('returns false for wrong type (number 60)', () => {
    expect(isValidRatio(60)).toBe(false)
  })
})
// For string-enum predicates (all four new ones), Block 3 should cover: null, undefined,
// number (e.g. 0), and array (e.g. ['light']). NaN/Infinity checks are bpm-specific.
```

**Import line to extend** (`src/domain/settings.test.ts:3`):
```typescript
import { isValidBpm, isValidRatio, isValidDuration } from './settings'
// Extend to also import the four new predicates:
// import { isValidBpm, isValidRatio, isValidDuration,
//          isValidTheme, isValidTimbre, isValidVariant, isValidLocale,
// } from './settings'
```

---

### `src/storage/prefs.test.ts` (NEW — test)

**Analog:** `src/storage/settings.test.ts` (exact structural match)

**File-level setup/teardown** (`src/storage/settings.test.ts:1-21`):
```typescript
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

import {
  coerceSettings,
  coerceMute,
  loadSettings,
  saveSettings,
  // ... new file imports coercePrefs, coerceTheme, coerceTimbre, coerceVariant, coerceLocale,
  //     loadPrefs, savePrefs
} from './settings'  // → './prefs'
import { STATE_KEY } from './storage'
import { DEFAULT_SETTINGS, type SessionSettings } from '../domain/settings'
// → import { DEFAULT_PREFS, type UserPrefs } from './prefs'
// → import { DEFAULT_THEME, DEFAULT_TIMBRE, DEFAULT_VARIANT, DEFAULT_LOCALE } from '../domain/settings'

beforeEach(() => { window.localStorage.clear() })
afterEach(() => { window.localStorage.clear(); vi.restoreAllMocks() })
```

**coerceSettings test block — literal template for coercePrefs block** (`src/storage/settings.test.ts:23-80`):
```typescript
describe('coerceSettings (D-15)', () => {
  it('returns DEFAULT_SETTINGS when raw is null / undefined / non-object', () => {
    expect(coerceSettings(null)).toEqual(DEFAULT_SETTINGS)
    expect(coerceSettings(undefined)).toEqual(DEFAULT_SETTINGS)
    expect(coerceSettings(42)).toEqual(DEFAULT_SETTINGS)
    expect(coerceSettings('str')).toEqual(DEFAULT_SETTINGS)
    expect(coerceSettings([1, 2, 3])).toEqual(DEFAULT_SETTINGS)
  })
  it('returns DEFAULT_SETTINGS when raw is empty object', () => {
    expect(coerceSettings({})).toEqual(DEFAULT_SETTINGS)
  })
  it('preserves all valid fields verbatim', () => { ... })
  it('falls back PER FIELD when bpm is invalid (D-15) — keeps ratio + duration', () => { ... })
  // Replicate for each of the four prefs dims (4 per-field fallback cases)
})
```

**Prototype-pollution mitigation test — copy verbatim, substituting prefs keys** (`src/storage/settings.test.ts:71-79`):
```typescript
it('does not throw when raw has prototype-polluting keys (T-04-02 mitigation)', () => {
  // Prototype-pollution mitigation: we only read three known keys, never spread `raw`
  // into an object we use as a prototype. Test that a __proto__ key in the raw doesn't
  // propagate to the returned object.
  const polluted: unknown = JSON.parse('{"bpm":4,"ratio":"40:60","durationMinutes":10,"__proto__":{"polluted":true}}')
  const out = coerceSettings(polluted) as unknown as Record<string, unknown>
  expect(out.polluted).toBeUndefined()
  expect((Object.prototype as Record<string, unknown>).polluted).toBeUndefined()
})
// Prefs version: JSON string includes all four valid prefs fields + "__proto__":{"polluted":true}
// e.g. '{"theme":"system","timbre":"bowl","variant":"orb","locale":"en","__proto__":{"polluted":true}}'
```

**loadSettings/saveSettings round-trip — template for loadPrefs/savePrefs** (`src/storage/settings.test.ts:93-128`):
```typescript
describe('loadSettings / saveSettings round-trip', () => {
  it('returns DEFAULT_SETTINGS when nothing is stored (LOCL-01)', () => {
    expect(loadSettings()).toEqual(DEFAULT_SETTINGS)
  })
  it('round-trips a valid settings object', () => {
    const next: SessionSettings = { bpm: 4, ratio: '50:50', durationMinutes: 5 }
    saveSettings(next)
    expect(loadSettings()).toEqual(next)
  })
  it('preserves mute and stats fields when saving settings (envelope merge)', () => {
    window.localStorage.setItem(STATE_KEY, JSON.stringify({
      version: 1,
      mute: true,
      stats: { totalSessions: 3, totalElapsedSeconds: 120, lastSessionAtMs: 1000, lastSessionDurationSeconds: 60 },
    }))
    saveSettings({ bpm: 4, ratio: '40:60', durationMinutes: 5 })
    // eslint-disable-next-line @typescript-eslint/no-non-null-assertion
    const raw = JSON.parse(window.localStorage.getItem(STATE_KEY)!) as Record<string, unknown>
    expect(raw).toMatchObject({ mute: true, stats: { totalSessions: 3 } })
  })
  it('does not throw when underlying setItem throws (D-16)', () => {
    vi.spyOn(Storage.prototype, 'setItem').mockImplementation(() => { throw new Error('quota') })
    expect(() => { saveSettings({ bpm: 4, ratio: '40:60', durationMinutes: 5 }) }).not.toThrow()
  })
  it('falls back to defaults when stored JSON is corrupt (D-17)', () => {
    window.localStorage.setItem(STATE_KEY, '{not-json')
    expect(loadSettings()).toEqual(DEFAULT_SETTINGS)
  })
})
// Prefs round-trip block: same five cases.
// Envelope-merge case: seed envelope with settings + mute + stats, call savePrefs,
// then assert those three fields survive (prefs key is overlaid, others untouched).
```

---

## Shared Patterns

### Non-throwing coerce-and-fallback (Phase 4 D-15 / D-17)
**Source:** `src/storage/settings.ts:18-27`
**Apply to:** `src/storage/prefs.ts` — both `coercePrefs` aggregator and four per-field coercers
```typescript
// Guard: only read known keys; never spread raw into a prototype-accessible object.
const r = (raw !== null && typeof raw === 'object' && !Array.isArray(raw))
  ? raw as Record<string, unknown>
  : {}
// Per-field ternary: valid → keep, invalid → DEFAULT_*
bpm: isValidBpm(r.bpm) ? r.bpm : DEFAULT_SETTINGS.bpm,
```

### Envelope merge pattern (Phase 8 D-01)
**Source:** `src/storage/settings.ts:37-40` and `src/storage/storage.ts:96`
**Apply to:** `src/storage/prefs.ts` `savePrefs`
```typescript
// Read-then-spread-then-overlay: preserves all other envelope subtrees.
const env = readEnvelope(deps)
writeEnvelope({ ...env, settings }, deps)
// savePrefs: writeEnvelope({ ...env, prefs }, deps)
```

### `as const satisfies readonly T[]` OPTIONS array
**Source:** `src/domain/settings.ts:10-24` (BPM_OPTIONS), `:26` (RATIO_OPTIONS)
**Apply to:** All four new OPTIONS arrays in `src/domain/settings.ts`
```typescript
export const RATIO_OPTIONS = ['50:50', '40:60', '30:70', '20:80'] as const satisfies readonly RatioLabel[]
// Predicates use: (RATIO_OPTIONS as readonly string[]).includes(v)
```

### eslint-disable `// Reason:` annotation policy (Phase 7 D-04)
**Source:** `src/domain/settings.ts:71-76`, `src/storage/settings.test.ts:111-113`
**Apply to:** Any eslint-disable line added to `prefs.ts` or `prefs.test.ts`
```typescript
// Reason: STATE_KEY is always present after savePrefs; non-null asserted by storage contract.
// eslint-disable-next-line @typescript-eslint/no-non-null-assertion
const raw = JSON.parse(window.localStorage.getItem(STATE_KEY)!) as Record<string, unknown>
```

### StorageDeps default parameter
**Source:** `src/storage/settings.ts:33,37`
**Apply to:** `loadPrefs` and `savePrefs` signatures in `src/storage/prefs.ts`
```typescript
// Always default deps to {}, enabling zero-argument production call sites.
export function loadSettings(deps: StorageDeps = {}): SessionSettings { ... }
export function saveSettings(settings: SessionSettings, deps: StorageDeps = {}): void { ... }
```

---

## No Analog Found

None. All six files have exact or self-extension analogs in the codebase.

---

## Files NOT Edited (load-bearing references only)

| File | Why Referenced | Key Lines |
|---|---|---|
| `src/storage/storage.ts:59-103` | `readEnvelope` — runtime already preserves `prefs` via `...p` spread; no code change needed | 91-96 |
| `src/storage/storage.ts:105-151` | `writeEnvelope` — refuse-downgrade + STATE_VERSION stamp; prefs writes inherit this behavior for free | 129-147 |
| `src/storage/storage.test.ts:79-99` | Forward-compat `prefs: { theme: 'dark' }` probe — already covers STORAGE-01; no new storage.test.ts additions needed | 82-97 |
| `src/storage/settings.test.ts` | Reference pattern for prefs.test.ts; untouched | all |

---

## Metadata

**Analog search scope:** `src/domain/`, `src/storage/`
**Files scanned:** 7 source files + 3 test files
**Pattern extraction date:** 2026-05-12
