# Phase 30: Multi-Practice Architecture & Switcher — Pattern Map

**Mapped:** 2026-05-17
**Files analyzed:** 9 new/modified files
**Analogs found:** 9 / 9

---

## File Classification

| New/Modified File | Role | Data Flow | Closest Analog | Match Quality |
|-------------------|------|-----------|----------------|---------------|
| `src/domain/naviKriyaSettings.ts` | model | transform | `src/domain/settings.ts` | exact |
| `src/domain/naviKriyaSettings.test.ts` | test | — | `src/domain/settings.test.ts` | exact |
| `src/storage/storage.ts` (modify) | utility | CRUD | itself (extend) | exact |
| `src/storage/practices.ts` | service | CRUD | `src/storage/prefs.ts` | exact |
| `src/storage/practices.test.ts` | test | — | `src/storage/prefs.test.ts` | exact |
| `src/storage/index.ts` (modify) | config | — | itself (extend) | exact |
| `src/components/PracticeToggle.tsx` | component | request-response | `src/components/ModeToggle.tsx` | role-match |
| `src/components/SettingsForm.tsx` (modify) | component | request-response | itself (extend) | exact |
| `src/components/StatsFooter.tsx` (modify) | component | request-response | itself (extend) | exact |
| `src/components/ResetStatsDialog.tsx` (modify) | component | request-response | itself (extend) | exact |
| `src/app/App.tsx` (modify) | controller | event-driven | itself (extend) | exact |
| `src/content/strings.ts` (modify) | config | — | itself (extend) | exact |

---

## Pattern Assignments

### `src/domain/naviKriyaSettings.ts` (model, transform)

**Analog:** `src/domain/settings.ts`

**Imports pattern** (settings.ts lines 1–7 — module has no imports; the new file will similarly be self-contained):
```typescript
// No imports — domain model is self-contained.
// Export: types, const arrays, defaults, isValid* predicates, coercer.
```

**Type + const array pattern** (settings.ts lines 1–31):
```typescript
export type SessionMode = 'standard' | 'stretch'
export const MODE_OPTIONS = ['standard', 'stretch'] as const satisfies readonly SessionMode[]
export interface SessionSettings { ... }
export const DEFAULT_SETTINGS: SessionSettings = { ... }
```
Apply same shape for `OmLength`, `OM_LENGTH_OPTIONS`, `NaviKriyaSettings`, `DEFAULT_NK_SETTINGS`.

**Validator pattern** (settings.ts lines 102–184):
```typescript
export function isValidTheme(v: unknown): v is ThemeId {
  return typeof v === 'string' && (THEME_OPTIONS as readonly string[]).includes(v)
}

export function isValidBpm(v: unknown): v is number {
  return typeof v === 'number' && Number.isFinite(v) && (BPM_OPTIONS as readonly number[]).includes(v)
}
```
Copy this structure for `isValidFrontCount`, `isValidOmLength`, `isValidRounds`. **Critical extension for `isValidFrontCount`:** add `v % 4 === 0` to the number check (Pitfall 5 — non-multiple-of-4 frontCount makes backCount fractional).

**Coercer pattern** — the domain file does NOT have a coercer; that lives in the storage layer. For this file: export only types, const arrays, defaults, and `isValid*` predicates. The `coerceNaviKriyaSettings` function goes in `src/storage/practices.ts` (see below), following `coerceSettings` in `src/storage/settings.ts`.

---

### `src/domain/naviKriyaSettings.test.ts` (test)

**Analog:** `src/domain/settings.test.ts`

**Test file structure** (settings.test.ts lines 1–22):
```typescript
import { describe, expect, it } from 'vitest'

import {
  isValidBpm,
  isValidRatio,
  // ...
  DEFAULT_SETTINGS,
} from './settings'
import type { SessionSettings } from './settings'

describe('isValidBpm (HYGIENE-02 D-08)', () => {
  it('returns true for valid BPM_OPTIONS members (e.g. 5.5)', () => {
    expect(isValidBpm(5.5)).toBe(true)
  })
  it('returns false for wrong type (string "5", null) and NaN / Infinity', () => {
    expect(isValidBpm('5')).toBe(false)
    expect(isValidBpm(null)).toBe(false)
    expect(isValidBpm(NaN)).toBe(false)
    expect(isValidBpm(Infinity)).toBe(false)
  })
})
```
Each `isValid*` gets its own `describe` block. Test: valid values return true; invalid type returns false; boundary/edge values (NaN, Infinity, negative) return false.

**Critical test for `isValidFrontCount`:** Must cover `v % 4 !== 0` → false (e.g. 102 is invalid), and that `coerceNaviKriyaSettings` rounds 102 down to 100 (nearest lower multiple of 4), not falls back to 100 default. This tests Pitfall 5 avoidance.

---

### `src/storage/storage.ts` (modify — Envelope type + STATE_VERSION + migrateEnvelope)

**Analog:** itself

**Envelope extension** — add two new optional `unknown` fields following the existing pattern (storage.ts lines 45–61):
```typescript
export interface Envelope {
  version: number
  settings?: unknown
  mute?: unknown
  stats?: unknown
  prefs?: unknown
  practices?: unknown    // NEW: per-practice map { resonant: {...}, naviKriya: {...} }
  activePractice?: unknown  // NEW: PracticeId string
}

export const STATE_VERSION = 2 as const  // bumped from 1
```

**migrateEnvelope ladder pattern** (storage.ts lines 80–85 — current no-op):
```typescript
export function migrateEnvelope(env: Envelope, fromVersion: number): Envelope {
  void fromVersion
  return { ...env }
}
```
Replace the `void fromVersion` no-op with the v1→v2 ladder:
```typescript
export function migrateEnvelope(env: Envelope, fromVersion: number): Envelope {
  let out = { ...env }

  if (fromVersion < 2) {
    out = {
      ...out,
      practices: {
        resonant: { settings: out.settings, stats: out.stats },
        // naviKriya absent → coercePractices supplies defaults
      },
      activePractice: 'resonant',
    }
  }

  return out
}
```
**Critical:** Do NOT delete `out.settings` / `out.stats` — the forward-compat spread preserves unknown top-level fields (storage.ts lines 119–129 — the `...p` posture). Orphaned fields are harmless.

**STATE_KEY must NOT change.** Leave `STATE_KEY = 'hrv:state:v1'` exactly as is (storage.ts line 37, index.html FOUC script hardcodes this string).

---

### `src/storage/practices.ts` (new file, service, CRUD)

**Analog:** `src/storage/prefs.ts` (exact role match — same load/save/coerce trio pattern)

**Imports pattern** (prefs.ts lines 1–26):
```typescript
import {
  DEFAULT_THEME, isValidTheme, type ThemeId, // ...
} from '../domain/settings'
import { readEnvelope, writeEnvelope, type StorageDeps } from './storage'
```
Apply same import structure; pull from `../domain/naviKriyaSettings` for NK types and from `./settings`, `./stats` for existing coercers.

**Coercer guard pattern** (prefs.ts lines 63–76):
```typescript
export function coercePrefs(raw: unknown): UserPrefs {
  // Prototype-pollution mitigation (T-14-01 / T-25-01 / D-12): we only read
  // known keys from `r`; `raw` is never spread into a prototype-accessible object.
  const r = (raw !== null && typeof raw === 'object' && !Array.isArray(raw))
    ? raw as Record<string, unknown>
    : {}
  return {
    theme:   coerceTheme(r.theme),
    timbre:  coerceTimbre(r.timbre),
    // ...
  }
}
```
Copy this guard verbatim for `coercePractices`, `coercePracticeSlice`, `coerceActivePractice`. Never spread `raw` — only read named keys from `r`.

**load/save pair pattern** (prefs.ts lines 78–85):
```typescript
export function loadPrefs(deps: StorageDeps = {}): UserPrefs {
  return coercePrefs(readEnvelope(deps).prefs)
}

export function savePrefs(prefs: UserPrefs, deps: StorageDeps = {}): void {
  const env = readEnvelope(deps)
  writeEnvelope({ ...env, prefs }, deps)
}
```
Replicate for `loadPractices`, `loadActivePractice`, `saveActivePractice`, `saveResonantSettings`, `saveNaviKriyaSettings`.

**recordSession analog pattern** (stats.ts lines 80–117):
```typescript
export function recordSession(elapsedMs: number, isComplete: boolean, deps: StorageDeps = {}): PersistedStats {
  const env = readEnvelope(deps)
  const stats = coerceStats(env.stats)
  if (!Number.isFinite(elapsedMs) || elapsedMs < 0) { return stats }
  if (!isComplete && elapsedMs < COUNT_THRESHOLD_MS) { return stats }
  const elapsedSeconds = Math.max(0, Math.floor(elapsedMs / 1000))
  const now = deps.now ?? Date.now
  const next: PersistedStats = {
    totalSessions: stats.totalSessions + 1,
    totalElapsedSeconds: stats.totalElapsedSeconds + elapsedSeconds,
    lastSessionAtMs: now(),
    lastSessionDurationSeconds: elapsedSeconds,
  }
  writeEnvelope({ ...env, stats: next }, deps)
  return next
}
```
`recordResonantSession` in `practices.ts` mirrors this exactly but reads/writes `env.practices.resonant.stats` instead of `env.stats` (Pitfall 3 avoidance).

**resetStats analog pattern** (stats.ts lines 119–123):
```typescript
export function resetStats(deps: StorageDeps = {}): void {
  const env = readEnvelope(deps)
  writeEnvelope({ ...env, stats: { ...ZERO_STATS } }, deps)
}
```
`resetPracticeStats(practice: PracticeId, deps)` mirrors this but writes into `env.practices[practice].stats`.

---

### `src/storage/practices.test.ts` (new test file)

**Analog:** `src/storage/prefs.test.ts`

**Test file structure** (prefs.test.ts lines 1–36):
```typescript
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { coercePrefs, loadPrefs, savePrefs, DEFAULT_PREFS } from './prefs'
import { STATE_KEY } from './storage'

beforeEach(() => { window.localStorage.clear() })
afterEach(() => { window.localStorage.clear(); vi.restoreAllMocks() })

describe('coercePrefs (D-10 / D-17)', () => {
  it('returns DEFAULT_PREFS when raw is null / undefined / non-object', () => { ... })
  it('falls back PER FIELD when theme is invalid — keeps other fields', () => { ... })
})
```
Use the same `beforeEach`/`afterEach` localStorage clear pattern. Cover: `coercePractices` with null/undefined/non-object input returns defaults; per-field fallback; `loadPractices`/`saveActivePractice` round-trip; `resetPracticeStats` writes ZERO_STATS to the correct practice slot only.

**Storage event test pattern** — seed a v1-shaped localStorage entry (with flat `settings`/`stats`) and assert `loadPractices()` returns `practices.resonant` populated with the migrated data (tests PRACTICE-04 via the full `readEnvelope` → `migrateEnvelope` path).

---

### `src/storage/index.ts` (modify — add practices.ts re-export)

**Analog:** itself (current lines 1–9):
```typescript
export * from './storage'
export * from './settings'
export * from './stats'
export * from './format'
export * from './prefs'
export * from './installDismissed'
```
Add `export * from './practices'` following the same pattern.

---

### `src/components/PracticeToggle.tsx` (new component, request-response)

**Analog:** `src/components/ModeToggle.tsx` (same role: segmented toggle, pure presentational, receives active value + onChange + disabled)

**Props interface pattern** (ModeToggle.tsx lines 1–7):
```typescript
export interface ModeToggleProps {
  isStretch: boolean
  modeLabel: string
  standardLabel: string
  stretchLabel: string
  onChange(this: void, isStretch: boolean): void
}
```
Adapt for `PracticeToggleProps`: `active: PracticeId`, `disabled: boolean`, `onSwitch(this: void, id: PracticeId): void`, `strings: { toggleLabel: string; practiceNames: Record<PracticeId, string> }`. App.tsx builds this derived `strings` prop from the flat catalog keys (`practice.toggleLabel`, `practice.resonantName`, `practice.naviKriyaName`).

**Disabled styling pattern** (ModeToggle.tsx lines 42–49):
```typescript
<button
  type="button"
  role="switch"
  aria-checked={isStretch}
  onClick={() => { onChange(!isStretch) }}
  className="... focus-visible:ring-2 focus-visible:ring-breathing-accent focus-visible:ring-offset-2"
>
```
The `disabled` prop goes on each `<button>`. The wrapping `<div>` also gets `opacity-50 cursor-not-allowed` when disabled — advisory visual treatment (D-06). Use `role="group"` on the wrapper `<div>` with `aria-label={strings.toggleLabel}`. Each pill uses `aria-pressed={active === id}` (not `aria-checked` — these are toggle buttons, not a switch).

**CSS variable pattern** (ModeToggle.tsx lines 19–24, 28–30):
```typescript
const sideLabel = (active: boolean) =>
  `text-sm font-semibold uppercase tracking-[0.18em] ${
    active
      ? 'text-[var(--color-breathing-accent-strong)]'
      : 'text-[var(--color-breathing-muted)]'
  }`
// ...
className="rounded-3xl border border-[var(--color-breathing-muted)] bg-[var(--color-breathing-surface)]/80 ..."
```
All colors use `var(--color-breathing-*)` CSS variables — never raw hex/named colors. Active pill: `bg-white shadow text-[var(--color-breathing-accent-strong)]`. Inactive: `text-[var(--color-breathing-muted)]`.

---

### `src/components/SettingsForm.tsx` (modify — practice-aware dispatch)

**Analog:** itself

**Props extension pattern** (SettingsForm.tsx lines 20–27):
```typescript
export interface SettingsFormProps {
  settings: SessionSettings
  isRunning: boolean
  onChange(this: void, settings: SessionSettings): void
  onExtendDuration(this: void, durationMinutes: number): void
  strings: UiStrings['settingsForm']
}
```
Add `activePractice: PracticeId` prop. The component's render body switches on `activePractice`:
- `resonant` → current content unchanged
- `naviKriya` → empty controls slot (Phase 30 scaffold; Phase 31 fills it)

Add a **practice heading** above the controls (D-04): a `<p>` or `<h2>` rendering the flat catalog key for the active practice — `uiStrings.practice.resonantHeading` or `uiStrings.practice.naviKriyaHeading` (selected by `activePractice`).

**Conditional rendering pattern** (SettingsForm.tsx lines 83–92):
```typescript
{!isRunning && (
  <ModeToggle ... />
)}
```
Follow this exact conditional structure for the NK scaffold — `{activePractice === 'naviKriya' && <NKScaffold />}`.

---

### `src/components/StatsFooter.tsx` (modify — active-practice-scoped)

**Analog:** itself

**Props pattern** (StatsFooter.tsx lines 23–28):
```typescript
export interface StatsFooterProps {
  stats: PersistedStats
  onResetClick(this: void): void
  strings: UiStrings['stats']
  locale?: LocaleId
}
```
No props change needed — `App.tsx` supplies the active practice's stats slice via the `stats` prop (D-07). The component itself remains purely presentational.

**What changes in App.tsx** (not in this component): the `stats` prop passed to `<StatsFooter>` changes from `stats` to `activePractice === 'resonant' ? resonantStats : naviKriyaStats`.

---

### `src/components/ResetStatsDialog.tsx` (modify — practice-named copy)

**Analog:** itself

**Existing dialog pattern** (ResetStatsDialog.tsx lines 1–94 — imperative `useRef`/`useEffect` open/close):
```typescript
const dialogRef = useRef<HTMLDialogElement>(null)
const cancelButtonRef = useRef<HTMLButtonElement>(null)

useEffect(() => {
  const dialog = dialogRef.current
  if (!dialog) return
  if (open && !dialog.open) {
    try { dialog.showModal() } catch { /* already modal */ }
    cancelButtonRef.current?.focus()
  } else if (!open && dialog.open) { dialog.close() }
}, [open])
```
This pattern is unchanged. The only modification: `strings.title` becomes practice-aware (D-08). The `UiStrings['resetStatsDialog'].title` string is sourced from `strings.ts` — the string value in the catalog changes to name the active practice; no component-level JSX change is needed if `App.tsx` passes the right strings.

---

### `src/app/App.tsx` (modify — activePractice state + practice-scoped persistence)

**Analog:** itself

**Initial load pattern** (App.tsx lines 80–82):
```typescript
const initialSettings = useMemo<SessionSettings>(() => loadSettings(), [])
const initialMute = useMemo<boolean>(() => loadMute(), [])
```
Add analogous `useMemo([])` calls for:
```typescript
const initialPractices = useMemo(() => loadPractices(), [])
const initialActivePractice = useMemo(() => loadActivePractice(), [])
```

**useState initialization pattern** (App.tsx lines 85–90):
```typescript
const [installDismissed, setInstallDismissed] = useState<boolean>(() => loadInstallDismissed())
const [stats, setStats] = useState<PersistedStats>(() => loadStats())
```
Add:
```typescript
const [activePractice, setActivePractice] = useState<PracticeId>(initialActivePractice)
const [resonantStats, setResonantStats] = useState<PersistedStats>(() => initialPractices.resonant.stats)
const [naviKriyaStats, setNaviKriyaStats] = useState<PersistedStats>(() => initialPractices.naviKriya.stats)
const [naviKriyaSettings, setNaviKriyaSettings] = useState<NaviKriyaSettings>(() => initialPractices.naviKriya.settings)
```

**persistedSet* pattern** (App.tsx lines 293–301):
```typescript
const persistedSetSettings = useCallback((next: SessionSettings) => {
  sessionSetSelectedSettings(next)
  saveSettings(next)
}, [sessionSetSelectedSettings])
```
Add analogous `onSwitchPractice`:
```typescript
const onSwitchPractice = useCallback((next: PracticeId) => {
  if (inSessionView) return  // defense-in-depth; PracticeToggle's disabled prop is first gate
  setActivePractice(next)
  saveActivePractice(next)
}, [inSessionView])
```

**confirmReset pattern** (App.tsx lines 506–516):
```typescript
const confirmReset = useCallback(() => {
  resetStats()         // D-11: stats only
  setStats(ZERO_STATS) // optimistic
  setResetDialogOpen(false)
}, [])
```
Update to `resetPracticeStats(activePractice)` and set the active practice's stats state to `ZERO_STATS` only (D-08 — other practice's stats untouched):
```typescript
const confirmReset = useCallback(() => {
  resetPracticeStats(activePractice)
  if (activePractice === 'resonant') setResonantStats({ ...ZERO_STATS })
  else setNaviKriyaStats({ ...ZERO_STATS })
  setResetDialogOpen(false)
}, [activePractice])
```

**Cross-tab storage event pattern** (App.tsx lines 155–165):
```typescript
useEffect(() => {
  const onStorage = (e: StorageEvent): void => {
    if (e.key === STATE_KEY) {
      setStats(loadStats())
    }
  }
  window.addEventListener('storage', onStorage)
  return () => { window.removeEventListener('storage', onStorage) }
}, [])
```
Update to call `loadPractices()` and refresh both stats slices (Pitfall 6 — after migration `env.stats` is undefined; `loadStats()` would return `ZERO_STATS`).

**recordSession site** (App.tsx lines 621–623):
```typescript
const updated = recordSession(elapsedMs, isComplete)
setStats(updated)
```
Replace with `recordResonantSession(elapsedMs, isComplete)` and `setResonantStats(updated)`.

**StatsFooter prop pattern** (App.tsx line 788):
```typescript
{!inSessionView && stats.totalSessions > 0 && (
  <StatsFooter stats={stats} onResetClick={onResetClick} strings={uiStrings.stats} locale={locale} />
)}
```
Change `stats` to `activePractice === 'resonant' ? resonantStats : naviKriyaStats` and add the `PracticeToggle` above the `BreathingShape` section.

---

### `src/content/strings.ts` (modify — new copy strings)

**Analog:** itself

**UiStrings interface extension pattern** (strings.ts lines 12–143):
```typescript
export interface UiStrings {
  readonly app: { readonly header: string; readonly title: string }
  readonly resetStatsDialog: { readonly title: string; readonly confirm: string; readonly cancel: string }
  // ...
}
```
Add a single new flat `practice` sub-object (the unified shape chosen for Phase 30 — implemented by plan 30-02 Task 1 and consumed by plan 30-04; do NOT use separate `practiceToggle`/`practiceControls` objects):
```typescript
readonly practice: {
  readonly toggleLabel: string                       // aria-label for the toggle group
  readonly resonantName: string                      // pill label, resonant (D-05)
  readonly naviKriyaName: string                     // pill label, naviKriya (D-05)
  readonly resonantHeading: string                   // inline controls heading, resonant (D-04)
  readonly naviKriyaHeading: string                  // inline controls heading, naviKriya (D-04)
  readonly naviKriyaControlsPlaceholder: string      // empty-NK-scaffold placeholder copy
  readonly resetStatsTitle: (practiceName: string) => string  // practice-named reset title (D-08)
}
```
The `practice` keys are flat (`resonantName`, `naviKriyaName`, `resonantHeading`, `naviKriyaHeading`) rather than nested `Record<PracticeId, string>` maps. Practice-named reset copy (D-08) is delivered by the `practice.resetStatsTitle(practiceName)` function — `resetStatsDialog.title` stays unchanged so existing tests keep passing.

**EN values pattern** (strings.ts lines 147–425 — every key gets an EN literal):
```typescript
practice: {
  toggleLabel: 'Switch practice',
  resonantName: 'Resonant Breathing',
  naviKriyaName: 'Navi Kriya',
  resonantHeading: 'Resonant Breathing',
  naviKriyaHeading: 'Navi Kriya',
  naviKriyaControlsPlaceholder: 'Navi Kriya controls coming soon',
  resetStatsTitle: (practiceName: string) => `Reset ${practiceName} stats?`,
},
```
PT-BR localization is Phase 32 — populate the `pt-BR` entry with the SAME EN string values as placeholders so the type stays satisfied. "Navi Kriya" is a Sanskrit proper noun and is not translated in any locale (D-05).

---

## Shared Patterns

### Prototype-Pollution-Safe Coercer Guard
**Source:** `src/storage/prefs.ts` lines 63–76
**Apply to:** `coercePractices`, `coerceActivePractice`, `coercePracticeSlice`, `coerceNaviKriyaSettings` (in `practices.ts`)
```typescript
const r = (raw !== null && typeof raw === 'object' && !Array.isArray(raw))
  ? raw as Record<string, unknown>
  : {}
// Only read named keys from `r` — never spread `raw`
```

### Non-Throwing Per-Field Fallback
**Source:** `src/storage/prefs.ts` lines 67–76 and `src/storage/settings.ts` lines 23–38
**Apply to:** All new coercers in `practices.ts` and `naviKriyaSettings.ts`
- Single drifted field never discards the rest of the envelope
- Always return a valid typed value; never throw
- Use `isValid*` predicates from the domain layer for the guard

### In-Session Disabling
**Source:** `src/app/App.tsx` line 725 (`disabled={inSessionView}`) and `src/components/ModeToggle.tsx`
**Apply to:** `PracticeToggle` — receives `disabled={inSessionView}`, passes `disabled` to each `<button>` and applies `opacity-50 cursor-not-allowed` to the wrapper `<div>`
```typescript
// App.tsx pattern:
<ThemePicker disabled={inSessionView} ... />
// PracticeToggle equivalent:
<PracticeToggle disabled={inSessionView} active={activePractice} onSwitch={onSwitchPractice} ... />
```

### CSS Variable Color Tokens
**Source:** `src/components/ModeToggle.tsx` lines 19–30 and `src/components/StatsFooter.tsx` lines 48–73
**Apply to:** `PracticeToggle.tsx` — all colors via `var(--color-breathing-*)`, never raw hex
```typescript
// Active: 'bg-white shadow text-[var(--color-breathing-accent-strong)]'
// Inactive: 'text-[var(--color-breathing-muted)]'
// Container: 'bg-[var(--color-breathing-surface)] rounded-full p-1'
```

### useMemo([]) for Single-Read Initialization
**Source:** `src/app/App.tsx` lines 80–82
**Apply to:** `initialPractices` and `initialActivePractice` in App.tsx
```typescript
const initialSettings = useMemo<SessionSettings>(() => loadSettings(), [])
// Pattern: useMemo with empty deps = synchronous read once at mount, before children mount
```

### useCallback for Persisted Setters
**Source:** `src/app/App.tsx` lines 293–301
**Apply to:** `onSwitchPractice`, and any future `persistedSetNaviKriyaSettings`
```typescript
const persistedSetSettings = useCallback((next: SessionSettings) => {
  sessionSetSelectedSettings(next)
  saveSettings(next)
}, [sessionSetSelectedSettings])
```

### Optimistic Reset Pattern
**Source:** `src/app/App.tsx` lines 506–516 (WR-08 posture)
**Apply to:** `confirmReset` update in App.tsx
```typescript
resetStats()           // disk write (may silently fail D-16)
setStats(ZERO_STATS)   // optimistic RAM update regardless of disk outcome
```

### Native `<dialog>` Imperative Open/Close
**Source:** `src/components/ResetStatsDialog.tsx` lines 12–49
**Apply to:** No new dialogs in Phase 30; but any future dialog must copy this exact pattern (no CSS-only display toggling, no third-party modal library)

---

## `src/storage/storage.test.ts` — Extension Points

This existing test file needs new test cases for PRACTICE-04. The existing structure to extend:

**Existing pattern** (storage.test.ts lines 1–12):
```typescript
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { readEnvelope, writeEnvelope, STATE_KEY, STATE_VERSION } from './storage'

beforeEach(() => { window.localStorage.clear() })
afterEach(() => { window.localStorage.clear(); vi.restoreAllMocks() })
```

Add a new `describe('migrateEnvelope')` block:
- Seed `STATE_KEY` with a v1-shaped envelope (flat `settings`/`stats`, `version: 1`)
- Call `readEnvelope()` and assert the result has `practices.resonant.settings` populated
- Assert `migrateEnvelope` is idempotent: calling with `fromVersion === 2` returns the envelope unchanged
- Assert `STATE_KEY` string is still `'hrv:state:v1'` after a write (guards against accidental key bump)

---

## `src/components/SettingsForm.test.tsx` — Extension Points

Existing test: `src/components/SettingsForm.stretch.test.tsx` (role="switch" + mode dispatch testing).

New tests to add (cover PRACTICE-06):
- `activePractice === 'resonant'`: renders the BPM/ratio/duration steppers (existing resonant controls)
- `activePractice === 'naviKriya'`: renders the empty NK scaffold (no BPM stepper, shows NK placeholder)
- Practice heading renders the correct practice name string

Follow the existing `renderForm(overrides)` helper pattern from `SettingsForm.stretch.test.tsx` lines 12–25.

---

## No Analog Found

All files have close analogs in the codebase. No files require falling back to RESEARCH.md patterns only.

---

## Metadata

**Analog search scope:** `src/domain/`, `src/storage/`, `src/components/`, `src/app/`, `src/content/`
**Files scanned:** 14 source files read directly
**Key anti-patterns documented in RESEARCH.md (Pitfalls 1–7) are cross-referenced per file above**
**Pattern extraction date:** 2026-05-17
