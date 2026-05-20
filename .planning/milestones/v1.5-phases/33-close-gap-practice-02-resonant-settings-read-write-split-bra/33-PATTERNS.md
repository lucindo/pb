# Phase 33: Close gap PRACTICE-02 — resonant settings read/write split-brain - Pattern Map

**Mapped:** 2026-05-18
**Files analyzed:** 5
**Analogs found:** 5 / 5

## File Classification

| New/Modified File | Role | Data Flow | Closest Analog | Match Quality |
|---|---|---|---|---|
| `src/app/App.tsx` (line 110 only) | component | request-response | `src/app/App.tsx` lines 144-146 (NK seed) | exact |
| `src/storage/settings.ts` (remove `loadSettings`/`saveSettings`) | utility | CRUD | `src/storage/practices.ts` (`loadPractices`, `saveResonantSettings`) | role-match |
| `src/storage/index.ts` (drop removed exports) | config | — | current `src/storage/index.ts` | exact |
| `src/storage/settings.test.ts` (remove dead describe block) | test | — | `src/storage/stats.test.ts` (envelope-seeding pattern) | role-match |
| `src/storage/stats.test.ts` (rework co-existence imports) | test | — | `src/storage/stats.test.ts` itself | exact |
| `src/app/App.persistence.test.tsx` (add D-05 regression tests) | test | request-response | `src/app/App.persistence.test.tsx` lines 89-141 (LOCL-01 pattern) | exact |

---

## Pattern Assignments

### `src/app/App.tsx` — line 110 read-path fix

**Analog:** `src/app/App.tsx` lines 144-146 (Phase 31 NK settings seed — the established symmetry pattern)

**The broken line (line 110):**
```typescript
const initialSettings = useMemo<SessionSettings>(() => loadSettings(), [])
```

**NK seed to mirror (lines 144-146):**
```typescript
const [nkSettings, setNkSettings] = useState<NaviKriyaSettings>(
  () => initialPractices.naviKriya.settings,
)
```

**The fix pattern — derive resonant settings from `initialPractices` (already computed at line 115):**
```typescript
// line 115 — already present, provides the source:
const initialPractices = useMemo(() => loadPractices(), [])

// line 110 — change FROM:
const initialSettings = useMemo<SessionSettings>(() => loadSettings(), [])
// TO (mirrors NK symmetry — resonant reads same source as NK):
const initialSettings = useMemo<SessionSettings>(() => loadPractices().resonant.settings, [])
// OR equivalently (reusing the already-computed memo):
// initialPractices is available at the same memo scope — either form is correct.
// The simplest form avoids a second loadPractices() call by referencing initialPractices.resonant.settings,
// but useMemo([]) executes synchronously so both are equivalent. Prefer the direct reference:
const initialSettings = useMemo<SessionSettings>(() => initialPractices.resonant.settings, [initialPractices])
```

**Import change — `loadSettings` can be dropped from the import block (lines 51-68) once it is removed from settings.ts:**
```typescript
// BEFORE (line 52):
  loadSettings,
  loadMute,
// AFTER (drop loadSettings, keep loadMute):
  loadMute,
```

**useMemo([]) once-synchronous-read constraint (lines 108-116):**
```typescript
// Preserve this pattern — the fix changes only the SOURCE of initialSettings,
// not the timing or memo structure.
const initialSettings   = useMemo<SessionSettings>(() => ..., [])   // single sync read at mount
const initialMute       = useMemo<boolean>(() => loadMute(), [])
const initialPractices  = useMemo(() => loadPractices(), [])
const initialActivePractice = useMemo(() => loadActivePractice(), [])
```

**Write path stays unchanged (lines 411-417):**
```typescript
const persistedSetSettings = useCallback((next: SessionSettings) => {
  sessionSetSelectedSettings(next)
  // CR-01: resonant settings persist into practices.resonant.settings
  saveResonantSettings(next)
}, [sessionSetSelectedSettings])
```

---

### `src/storage/settings.ts` — remove `loadSettings` and `saveSettings`

**Analog:** `src/storage/practices.ts` (the correct API that replaces these functions)

**Functions to DELETE (lines 44-51 of settings.ts):**
```typescript
export function loadSettings(deps: StorageDeps = {}): SessionSettings {
  return coerceSettings(readEnvelope(deps).settings)
}

export function saveSettings(settings: SessionSettings, deps: StorageDeps = {}): void {
  const env = readEnvelope(deps)
  writeEnvelope({ ...env, settings }, deps)
}
```

**Functions to KEEP (lines 40-42, 53-60):**
```typescript
export function coerceMute(raw: unknown): boolean {
  return typeof raw === 'boolean' ? raw : false
}
// ...
export function loadMute(deps: StorageDeps = {}): boolean {
  return coerceMute(readEnvelope(deps).mute)
}

export function saveMute(muted: boolean, deps: StorageDeps = {}): void {
  const env = readEnvelope(deps)
  writeEnvelope({ ...env, mute: muted }, deps)
}
```

**`coerceSettings` (lines 23-38) — KEEP.** It is consumed by `coercePracticeSlice` in `practices.ts` (line 88).

---

### `src/storage/index.ts` — drop removed exports

**Current barrel (all 10 lines):**
```typescript
export * from './storage'
export * from './settings'   // after removal: coerceSettings, coerceMute, loadMute, saveMute only
export * from './stats'
export * from './format'
export * from './prefs'
export * from './installDismissed'
export * from './practices'
```

The `export * from './settings'` line itself stays — it now re-exports only the remaining symbols (`coerceSettings`, `coerceMute`, `loadMute`, `saveMute`). No line addition or deletion needed IF the deleted functions are removed from `settings.ts` itself; the barrel re-export is already a wildcard.

**Action:** No line change to `index.ts` is needed IF `loadSettings`/`saveSettings` are fully deleted from `settings.ts`. Verify with `grep -r loadSettings src/` after the deletion to confirm zero callers remain.

---

### `src/storage/settings.test.ts` — remove dead describe block

**Analog:** `src/storage/stats.test.ts` (structure to model the surviving tests after removal)

**The entire `loadSettings / saveSettings round-trip` describe block (lines 148-188) must be deleted:**
```typescript
describe('loadSettings / saveSettings round-trip', () => {
  // all tests here import saveSettings/loadSettings — delete entirely
})
```

**`loadMute / saveMute round-trip` describe block (lines 190-210) — KEEP**, but remove the `saveSettings` call inside the "preserves settings + stats fields" test (line 203):
```typescript
// Line 203 — currently uses saveSettings to seed:
saveSettings({ ...DEFAULT_SETTINGS, bpm: 4, ratio: '40:60', durationMinutes: 5 })
// Replace with a direct localStorage seed or saveResonantSettings:
import { saveResonantSettings } from './practices'
saveResonantSettings({ ...DEFAULT_SETTINGS, bpm: 4, ratio: '40:60', durationMinutes: 5 })
// Then assert via resonant subtree, not flat env.settings
```

**Import block (lines 1-12) — prune deleted imports:**
```typescript
// BEFORE:
import {
  coerceSettings,
  coerceMute,
  loadSettings,   // delete
  saveSettings,   // delete
  loadMute,
  saveMute,
} from './settings'

// AFTER:
import {
  coerceSettings,
  coerceMute,
  loadMute,
  saveMute,
} from './settings'
```

**`beforeEach`/`afterEach` cleanup pattern to preserve (lines 26-33):**
```typescript
beforeEach(() => {
  window.localStorage.clear()
})

afterEach(() => {
  window.localStorage.clear()
  vi.restoreAllMocks()
})
```

---

### `src/storage/stats.test.ts` — rework co-existence imports

**The import of `saveSettings`/`loadSettings` from `'./settings'` (lines 4-5) must change:**
```typescript
// BEFORE (lines 4-5):
import { saveSettings, saveMute, loadSettings, loadMute } from './settings'

// AFTER (rework: replace saveSettings/loadSettings callers with saveResonantSettings/loadPractices):
import { saveMute, loadMute } from './settings'
import { saveResonantSettings, loadPractices } from './practices'
```

**Affected describe block — `resetStats` test (lines 96-118) uses `saveSettings`/`loadSettings`:**
```typescript
// BEFORE (lines 99, 107):
const savedSettings = { ...DEFAULT_SETTINGS, bpm: 4, ratio: '50:50' as const, durationMinutes: 5 as const }
saveSettings(savedSettings)
// ...
expect(loadSettings()).toEqual(savedSettings)

// AFTER — seed and assert via the per-practice envelope:
const savedSettings = { ...DEFAULT_SETTINGS, bpm: 4, ratio: '50:50' as const, durationMinutes: 5 as const }
saveResonantSettings(savedSettings)
// ...
expect(loadPractices().resonant.settings).toEqual(savedSettings)
```

---

### `src/app/App.persistence.test.tsx` — add D-05 regression tests

**Analog:** `src/app/App.persistence.test.tsx` lines 89-141 (LOCL-01 restoration pattern — exact analog for the new D-05 tests)

**Existing helper pattern to reuse (lines 26-56):**
```typescript
function seedEnvelope(opts: SeedOpts = {}) {
  window.localStorage.setItem(STATE_KEY, JSON.stringify({
    version: 1,
    settings: opts.settings,
    mute: opts.mute,
    stats: opts.stats,
  }))
}

function resonantSettingsOf(env: Record<string, unknown> | null): Record<string, unknown> | undefined {
  const practices = env?.['practices'] as Record<string, unknown> | undefined
  const resonant = practices?.['resonant'] as Record<string, unknown> | undefined
  return resonant?.['settings'] as Record<string, unknown> | undefined
}
```

**New helper needed for D-05 v2-envelope seeding (fresh-v2 user has no flat `env.settings`):**
```typescript
// Seed a v2 envelope directly — flat env.settings is absent (fresh-v2 user).
// Uses STATE_VERSION=2 so migrateEnvelope skips the v1→v2 ladder.
function seedV2Envelope(resonantSettings: Partial<SessionSettings>) {
  window.localStorage.setItem(STATE_KEY, JSON.stringify({
    version: 2,
    practices: {
      resonant: { settings: resonantSettings, stats: null },
      naviKriya: { settings: null, stats: null },
    },
    activePractice: 'resonant',
  }))
}
```

**D-05 scenario 1 — Fresh v2 user (no flat `env.settings`):**
```typescript
describe('PRACTICE-02 — resonant settings survive remount', () => {
  it('fresh-v2 user: resonant settings from practices.resonant.settings survive reload', () => {
    // Seed v2 envelope: practices.resonant.settings holds a non-default BPM.
    // Flat env.settings is absent (fresh post-Phase-30 user, never had it).
    seedV2Envelope({ bpm: 4, ratio: '50:50', durationMinutes: 5 })
    render(<App />)
    // App.tsx:110 must read from practices.resonant.settings, not the absent flat field.
    expect(screen.getByText('4 BPM')).toBeInTheDocument()
    expect(screen.getByText('50:50')).toBeInTheDocument()
    expect(screen.getByText('5 min')).toBeInTheDocument()
  })
```

**D-05 scenario 2 — v1-migrated user (stale flat field, newer practices subtree):**
```typescript
  it('v1-migrated user: practices.resonant.settings wins over stale flat env.settings on remount', () => {
    // Simulate a user who: (1) migrated from v1 (flat env.settings = old BPM 6),
    // then (2) changed settings (saveResonantSettings wrote BPM 4 to practices.resonant).
    // The flat env.settings is now a stale orphan; the read-path must prefer practices.
    window.localStorage.setItem(STATE_KEY, JSON.stringify({
      version: 2,
      settings: { bpm: 6, ratio: '40:60', durationMinutes: 10 },  // stale orphan
      practices: {
        resonant: {
          settings: { bpm: 4, ratio: '50:50', durationMinutes: 5 },  // newer value
          stats: null,
        },
        naviKriya: { settings: null, stats: null },
      },
      activePractice: 'resonant',
    }))
    render(<App />)
    // Must show 4 BPM (practices subtree), NOT 6 BPM (stale flat field).
    expect(screen.getByText('4 BPM')).toBeInTheDocument()
    expect(screen.queryByText('6 BPM')).not.toBeInTheDocument()
  })
})
```

**Render/act setup pattern (lines 76-84) — copy exactly:**
```typescript
beforeEach(() => {
  vi.useFakeTimers()
  vi.setSystemTime(new Date('2026-05-09T00:00:00.000Z'))
})

afterEach(() => {
  vi.useRealTimers()
  vi.restoreAllMocks()
})
```

**No `startAndAdvancePastLeadIn` needed** for D-05 tests — they are mount-only assertions (no session started). `render(<App />)` followed by synchronous screen queries suffices, matching the LOCL-01 restoration tests at lines 89-113.

---

## Shared Patterns

### Envelope seeding in tests
**Source:** `src/app/App.persistence.test.tsx` lines 26-33 (`seedEnvelope`) and lines 43-56 (subtree extractors)
**Apply to:** All new tests in `App.persistence.test.tsx`
```typescript
// Version-1 seed (triggers migration ladder):
window.localStorage.setItem(STATE_KEY, JSON.stringify({ version: 1, settings: ..., stats: ... }))

// Version-2 seed (skips migration, exercises post-fix read path directly):
window.localStorage.setItem(STATE_KEY, JSON.stringify({
  version: 2,
  practices: { resonant: { settings: ..., stats: null }, naviKriya: { settings: null, stats: null } },
  activePractice: 'resonant',
}))
```

### `saveResonantSettings` as replacement for `saveSettings` in tests
**Source:** `src/storage/practices.ts` lines 106-113
**Apply to:** Any test that previously seeded resonant settings via `saveSettings`
```typescript
export function saveResonantSettings(settings: SessionSettings, deps: StorageDeps = {}): void {
  const env = readEnvelope(deps)
  const practices = coercePractices(env.practices)
  writeEnvelope(
    { ...env, practices: { ...practices, resonant: { ...practices.resonant, settings } } },
    deps,
  )
}
```

### localStorage clear between tests
**Source:** `src/storage/settings.test.ts` lines 26-33, `src/storage/stats.test.ts` lines 8-14
**Apply to:** All storage test files
```typescript
beforeEach(() => { window.localStorage.clear() })
afterEach(() => { window.localStorage.clear(); vi.restoreAllMocks() })
```

---

## No Analog Found

None — every file in scope has a close analog in the codebase.

---

## Metadata

**Analog search scope:** `src/app/`, `src/storage/`
**Files scanned:** 7 (App.tsx, practices.ts, settings.ts, storage.ts, index.ts, settings.test.ts, stats.test.ts, App.persistence.test.tsx)
**Pattern extraction date:** 2026-05-18
