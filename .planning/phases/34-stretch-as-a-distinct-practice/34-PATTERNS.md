# Phase 34: Stretch as a Distinct Practice - Pattern Map

**Mapped:** 2026-05-18
**Files analyzed:** 9 new/modified files
**Analogs found:** 9 / 9

## File Classification

| New/Modified File | Role | Data Flow | Closest Analog | Match Quality |
|-------------------|------|-----------|----------------|---------------|
| `src/domain/settings.ts` | model | transform | itself (existing, being split) | exact |
| `src/storage/practices.ts` | service | CRUD | itself (existing, being extended) | exact |
| `src/storage/storage.ts` | service | transform | itself (existing v1→v2 ladder) | exact |
| `src/storage/settings.ts` | service | transform | itself (existing `coerceSettings`) | exact |
| `src/components/PracticeToggle.tsx` | component | request-response | itself (2-pill → 3-pill extension) | exact |
| `src/components/SettingsForm.tsx` | component | request-response | itself (gains `stretch` branch) | exact |
| `src/components/ModeToggle.tsx` | component | request-response | itself (retire/rename to `BooleanToggle.tsx`) | exact |
| `src/app/App.tsx` | provider | event-driven | itself (gains stretch state + 3-way selectors) | exact |
| `src/content/strings.ts` | config | transform | itself (`practice` sub-object, existing `naviKriyaName` pattern) | exact |
| `vite.config.ts` | config | transform | itself (gains `define` block) | exact |

---

## Pattern Assignments

### `src/domain/settings.ts` (model, transform)

**Analog:** `src/domain/settings.ts` (current file, being split)

**Current `SessionSettings` interface** (lines 21–31) — this is the fat interface that D-01/D-02 trims:
```typescript
export interface SessionSettings {
  bpm: number
  ratio: RatioLabel
  durationMinutes: DurationOption
  mode: SessionMode            // REMOVE — entire field + SessionMode + MODE_OPTIONS + isValidMode retire
  initialBpm: number           // MOVE → StretchSettings
  targetBpm: number            // MOVE → StretchSettings
  warmUpMinutes: WarmUpMinutes // MOVE → StretchSettings
  coolDownMinutes: CoolDownMinutes // MOVE → StretchSettings
  rampDurationMinutes: number  // MOVE → StretchSettings
}
```

**After D-02: `SessionSettings` becomes standard-only** — copy this final shape:
```typescript
export interface SessionSettings {
  bpm: number
  ratio: RatioLabel
  durationMinutes: DurationOption
  // mode, initialBpm, targetBpm, warmUpMinutes, coolDownMinutes, rampDurationMinutes REMOVED
}
```

**New `StretchSettings` type** — model on `NaviKriyaSettings` isolation in `src/domain/naviKriyaSettings.ts`:
```typescript
export interface StretchSettings {
  ratio: RatioLabel             // consumed by buildStretchSegments (D-02: must be included)
  initialBpm: number
  targetBpm: number
  warmUpMinutes: WarmUpMinutes
  rampDurationMinutes: number
  coolDownMinutes: CoolDownMinutes
  // durationMinutes is computed — NOT stored (D-02 explicit constraint)
}

export const DEFAULT_STRETCH_SETTINGS: StretchSettings = {
  ratio: '40:60',
  initialBpm: 5.5,
  targetBpm: 4.5,
  warmUpMinutes: 5,
  coolDownMinutes: 5,
  rampDurationMinutes: 5,
}
```

Note: `DEFAULT_STRETCH_SETTINGS` already exists at lines 90–96 but lacks `ratio` and is untyped (`as const` object). It must be updated to be typed as `StretchSettings` and gain the `ratio` field.

**Validators to REMOVE** (lines 166–168): `isValidMode`, `SessionMode` type, `MODE_OPTIONS` constant — these retire entirely with D-01.

**Validators that STAY** (lines 170–187): `isValidWarmUp`, `isValidCoolDown`, `isValidRampDuration` — consumed by `coerceStretchSettings`.

**`validateSettings` split** (lines 189–236) — the stretch-mode branch (lines 212–233) moves to a new `validateStretchSettings(settings: StretchSettings)` function; the standard `validateSettings` becomes 3-field only:
```typescript
export function validateSettings(settings: SessionSettings): SessionSettings {
  if (!isValidBpm(settings.bpm)) throw new RangeError(...)
  if (!isValidRatio(settings.ratio)) throw new RangeError(...)
  if (!isValidDuration(settings.durationMinutes)) throw new RangeError(...)
  // mode check REMOVED
  return { ...settings }
}
```

---

### `src/storage/practices.ts` (service, CRUD)

**Analog:** `src/storage/practices.ts` — entire current file; extend rather than replace.

**Imports pattern** (lines 1–22) — add `StretchSettings` + `DEFAULT_STRETCH_SETTINGS` + stretch validators:
```typescript
import { coerceSettings } from './settings'
import { coerceStats, ZERO_STATS, COUNT_THRESHOLD_MS, type PersistedStats } from './stats'
import { readEnvelope, writeEnvelope, type StorageDeps } from './storage'
import type { SessionSettings } from '../domain/settings'
import {
  DEFAULT_STRETCH_SETTINGS,
  isValidRatio,
  isValidBpm,
  isValidWarmUp,
  isValidCoolDown,
  isValidRampDuration,
  type StretchSettings,   // NEW
} from '../domain/settings'
import {
  DEFAULT_NK_SETTINGS,
  isValidOmLength,
  isValidRounds,
  type NaviKriyaSettings,
} from '../domain/naviKriyaSettings'
```

**`PracticeId` — update** (line 23):
```typescript
// BEFORE:
export type PracticeId = 'resonant' | 'naviKriya'
// AFTER:
export type PracticeId = 'resonant' | 'stretch' | 'naviKriya'
```

**`PracticeMap` — add stretch slot** (lines 30–33):
```typescript
export interface PracticeMap {
  resonant:  PracticeSlice<SessionSettings>
  stretch:   PracticeSlice<StretchSettings>   // NEW
  naviKriya: PracticeSlice<NaviKriyaSettings>
}
```

**`coerceActivePractice` — update** (lines 44–48):
```typescript
export function coerceActivePractice(raw: unknown): PracticeId {
  return raw === 'resonant' || raw === 'stretch' || raw === 'naviKriya' ? raw : 'resonant'
  //                           ^^^^^^^^^^^^^^^^^^^ add 'stretch'
}
```

**`coerceNaviKriyaSettings` — exact model for new `coerceStretchSettings`** (lines 50–69):
```typescript
// EXACT MODEL: coerceNaviKriyaSettings (lines 50-69)
export function coerceStretchSettings(raw: unknown): StretchSettings {
  const r = asRecord(raw)
  return {
    ratio:               isValidRatio(r.ratio)                       ? r.ratio               : DEFAULT_STRETCH_SETTINGS.ratio,
    initialBpm:          isValidBpm(r.initialBpm)                    ? r.initialBpm          : DEFAULT_STRETCH_SETTINGS.initialBpm,
    targetBpm:           isValidBpm(r.targetBpm)                     ? r.targetBpm           : DEFAULT_STRETCH_SETTINGS.targetBpm,
    warmUpMinutes:       isValidWarmUp(r.warmUpMinutes)              ? r.warmUpMinutes       : DEFAULT_STRETCH_SETTINGS.warmUpMinutes,
    rampDurationMinutes: isValidRampDuration(r.rampDurationMinutes)  ? r.rampDurationMinutes : DEFAULT_STRETCH_SETTINGS.rampDurationMinutes,
    coolDownMinutes:     isValidCoolDown(r.coolDownMinutes)          ? r.coolDownMinutes     : DEFAULT_STRETCH_SETTINGS.coolDownMinutes,
  }
}
```

**`coercePractices` — add stretch slot** (lines 85–91):
```typescript
export function coercePractices(raw: unknown): PracticeMap {
  const r = asRecord(raw)
  return {
    resonant:  coercePracticeSlice(r.resonant,  coerceSettings),
    stretch:   coercePracticeSlice(r.stretch,   coerceStretchSettings),  // NEW
    naviKriya: coercePracticeSlice(r.naviKriya, coerceNaviKriyaSettings),
  }
}
```

**`saveResonantSettings` — exact model for new `saveStretchSettings`** (lines 106–113):
```typescript
// EXACT MODEL: saveResonantSettings (lines 106-113)
export function saveStretchSettings(settings: StretchSettings, deps: StorageDeps = {}): void {
  const env = readEnvelope(deps)
  const practices = coercePractices(env.practices)
  writeEnvelope(
    { ...env, practices: { ...practices, stretch: { ...practices.stretch, settings } } },
    deps,
  )
}
```

**`recordResonantSession` — exact model for new `recordStretchSession`** (lines 128–158):
```typescript
// EXACT MODEL: recordResonantSession (lines 128-158)
// The only change: read from / write to practices.stretch.stats instead of practices.resonant.stats
export function recordStretchSession(
  elapsedMs: number,
  isComplete: boolean,
  deps: StorageDeps = {},
): PersistedStats {
  const env = readEnvelope(deps)
  const practices = coercePractices(env.practices)
  const stats = practices.stretch.stats        // ← stretch, not resonant
  if (!Number.isFinite(elapsedMs) || elapsedMs < 0) return stats
  if (!isComplete && elapsedMs < COUNT_THRESHOLD_MS) return stats
  const elapsedSeconds = Math.max(0, Math.floor(elapsedMs / 1000))
  const now = deps.now ?? Date.now
  const next: PersistedStats = {
    totalSessions: stats.totalSessions + 1,
    totalElapsedSeconds: stats.totalElapsedSeconds + elapsedSeconds,
    lastSessionAtMs: now(),
    lastSessionDurationSeconds: elapsedSeconds,
  }
  writeEnvelope(
    { ...env, practices: { ...practices, stretch: { ...practices.stretch, stats: next } } },
    deps,
  )
  return next
}
```

Note: `recordNaviKriyaSession` (lines 169–205) has a `roundsCompleted` extra arg — do NOT copy that for stretch. `recordResonantSession` (lines 128–158) is the correct model, no extra args.

**`resetPracticeStats`** (lines 210–223) — already works with the string literal `practice` key as a `PracticeId`. After `PracticeId` gains `'stretch'`, `resetPracticeStats('stretch', ...)` will work without change. No edit needed beyond the type union update.

---

### `src/storage/storage.ts` (service, transform)

**Analog:** `src/storage/storage.ts` — the v1→v2 step in `migrateEnvelope` (lines 90–107).

**`STATE_VERSION` bump** (line 38):
```typescript
// BEFORE:
export const STATE_VERSION = 2 as const
// AFTER:
export const STATE_VERSION = 3 as const
```

**v1→v2 step — exact model for new v2→v3 step** (lines 92–104):
```typescript
// EXISTING v1→v2 step (lines 92-104) — model for the v2→v3 step below
if (fromVersion < 2) {
  out = {
    ...out,
    practices: {
      resonant: { settings: out.settings, stats: out.stats },
    },
    activePractice: 'resonant',
  }
}
```

**New v2→v3 step** — append after the v1→v2 block, before the `return out`:
```typescript
if (fromVersion < 3) {
  // v2→v3: create the stretch slice.
  // Seed settings from the resonant blob (still unknown — coerceStretchSettings validates downstream).
  // Leave the resonant blob untouched — orphan fields are fine (v1→v2 precedent).
  // CRITICAL: Do NOT import ZERO_STATS from stats.ts — stats.ts imports from storage.ts,
  //           creating a circular dep. Use the inline literal instead (RESEARCH Pitfall 1).
  const existingPractices = (out.practices ?? {}) as Record<string, unknown>
  const resonantSlice = (existingPractices['resonant'] ?? {}) as Record<string, unknown>
  const resonantSettings = resonantSlice['settings']  // unknown — coerceStretchSettings validates downstream
  out = {
    ...out,
    practices: {
      ...existingPractices,
      stretch: {
        settings: resonantSettings,  // carries ramp fields; downstream coercer validates
        stats: {                     // inline literal — no circular dep
          totalSessions: 0,
          totalElapsedSeconds: 0,
          lastSessionAtMs: null,
          lastSessionDurationSeconds: null,
        },
      },
    },
  }
  // resonant slice is untouched — stretch ramp fields remain there as harmless orphans
}
```

---

### `src/storage/settings.ts` (service, transform)

**Analog:** `src/storage/settings.ts` — `coerceSettings` (lines 23–38).

**`coerceSettings` — trim to standard-only** after D-02 splits the types:
```typescript
// BEFORE (lines 23-38): returns all 9 fields including mode + ramp fields
// AFTER: returns only the 3 standard fields
export function coerceSettings(raw: unknown): SessionSettings {
  const r = (raw !== null && typeof raw === 'object' && !Array.isArray(raw))
    ? raw as Record<string, unknown>
    : {}
  return {
    bpm:            isValidBpm(r.bpm)          ? r.bpm            : DEFAULT_SETTINGS.bpm,
    ratio:          isValidRatio(r.ratio)       ? r.ratio          : DEFAULT_SETTINGS.ratio,
    durationMinutes: isValidDuration(r.durationMinutes) ? r.durationMinutes : DEFAULT_SETTINGS.durationMinutes,
    // mode, initialBpm, targetBpm, warmUpMinutes, coolDownMinutes, rampDurationMinutes REMOVED
  }
}
```

Also remove the now-unused imports: `isValidMode`, `DEFAULT_STRETCH_SETTINGS`, `isValidWarmUp`, `isValidCoolDown`, `isValidRampDuration` — these move to `practices.ts`'s `coerceStretchSettings`.

---

### `src/components/PracticeToggle.tsx` (component, request-response)

**Analog:** `src/components/PracticeToggle.tsx` — entire current file (lines 1–69).

**Import reconciliation** — replace local alias with canonical import:
```typescript
// REMOVE (line 6):
export type PracticeId = 'resonant' | 'naviKriya'

// ADD at top:
import type { PracticeId } from '../storage/practices'
```

**`PRACTICE_IDS` update** (line 18):
```typescript
// BEFORE:
const PRACTICE_IDS: PracticeId[] = ['resonant', 'naviKriya']
// AFTER:
const PRACTICE_IDS: PracticeId[] = ['resonant', 'stretch', 'naviKriya']  // D-11
```

**`PracticeToggleProps.strings` — expand `practiceNames`** (lines 12–15):
```typescript
strings: {
  toggleLabel: string
  practiceNames: Record<PracticeId, string>  // now includes 'stretch' key automatically
}
```

**Build-time treatment branch** — add at top of file, before the component:
```typescript
// D-06: build-time only — compile-time constant injected by vite.config.ts `define`
// D-07: invalid or missing value falls back to 'A' (smallest-surprise default)
declare const __SWITCHER_TREATMENT__: string
const TREATMENT: 'A' | 'B' = __SWITCHER_TREATMENT__ === 'B' ? 'B' : 'A'
```

**Pill render — add treatment B branch** inside the `.map()` (lines 55–65):
```typescript
// BEFORE (line 63): {strings.practiceNames[id]}
// AFTER:
{TREATMENT === 'B' && <PracticeGlyph id={id} />}
{strings.practiceNames[id]}
```

**`PracticeGlyph` component** — new component in the same file or a sibling file, using theme CSS variables (model on `CueGlyph` pattern):
```tsx
// D-08: inline SVGs styled with theme tokens; currentColor / CSS variable strokes
function PracticeGlyph({ id }: { id: PracticeId }) {
  if (id === 'resonant') {
    // Orb = circle (breathing)
    return <svg width="16" height="16" viewBox="0 0 16 16" aria-hidden="true">
      <circle cx="8" cy="8" r="6" fill="none" stroke="currentColor" strokeWidth="1.5" />
    </svg>
  }
  if (id === 'stretch') {
    // Ramp = descending diagonal line (BPM walk-down)
    return <svg width="16" height="16" viewBox="0 0 16 16" aria-hidden="true">
      <polyline points="2,4 14,12" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
    </svg>
  }
  // naviKriya: counting dots (OM counting)
  return <svg width="16" height="16" viewBox="0 0 16 16" aria-hidden="true">
    <circle cx="4" cy="8" r="1.5" fill="currentColor" />
    <circle cx="8" cy="8" r="1.5" fill="currentColor" />
    <circle cx="12" cy="8" r="1.5" fill="currentColor" />
  </svg>
}
```

**Container + pill classes** (lines 29–52) — unchanged structurally; existing `flex rounded-full border` container and `flex-1 rounded-full min-h-[44px]` pill classes carry over to 3 pills unchanged.

---

### `src/components/SettingsForm.tsx` (component, request-response)

**Analog:** `src/components/SettingsForm.tsx` — current file, gaining a `stretch` branch.

**Imports — add `StretchSettings`** (lines 1–28):
```typescript
import {
  // existing imports...
  type StretchSettings,   // NEW
} from '../domain/settings'
```

**`SettingsFormProps` — add stretch props** (lines 30–49), mirroring `nkSettings`/`onNKSettingsChange` pattern (lines 45–48):
```typescript
export interface SettingsFormProps {
  activePractice: PracticeId
  settings: SessionSettings       // now standard-only (3 fields)
  isRunning: boolean
  onChange(this: void, settings: SessionSettings): void
  onExtendDuration(this: void, durationMinutes: number): void
  strings: UiStrings['settingsForm']
  practiceStrings: UiStrings['practice']
  nkSettings?: NaviKriyaSettings
  onNKSettingsChange?: (this: void, settings: NaviKriyaSettings) => void
  nkControlsStrings?: UiStrings['nkControls']
  // NEW — mirrors nkSettings/onNKSettingsChange pattern:
  stretchSettings?: StretchSettings
  onStretchSettingsChange?: (this: void, settings: StretchSettings) => void
}
```

**Remove `isStretch` derivation** (line 73) — `const isStretch = settings.mode === 'stretch'` — this line retires; `activePractice === 'stretch'` is used instead.

**Resonant branch after D-01** (lines 139–243) — remove `ModeToggle` (lines 143–149) and collapse the `isStretch` conditional to standard-only:
```tsx
{activePractice === 'resonant' ? (
  <>
    {/* ModeToggle REMOVED — standard sessions only */}
    {!isRunning && (
      <>
        <SettingsStepper label={strings.bpmLabel} value={settings.bpm} ... />
        <SettingsStepper<RatioLabel> label={strings.ratioLabel} value={settings.ratio} ... />
      </>
    )}
    <SettingsStepper<DurationOption> label={strings.durationLabel} ... />  {/* extendable */}
  </>
) : activePractice === 'stretch' ? (
  // NEW stretch branch — model on the existing isStretch block (lines 152-199)
  <>
    {/* stretch knobs: same steppers as the old resonant/isStretch block */}
    <SettingsStepper label={strings.initialBpmLabel} value={stretchSettings.initialBpm} ... onChange={updateInitialBpm} />
    <SettingsStepper label={strings.targetBpmLabel} value={stretchSettings.targetBpm} ... />
    <SettingsStepper<RatioLabel> label={strings.ratioLabel} value={stretchSettings.ratio} ... />
    <SettingsStepper<WarmUpMinutes> label={strings.holdInitialLabel} value={stretchSettings.warmUpMinutes} ... />
    <SettingsStepper label={strings.rampDurationLabel} value={stretchSettings.rampDurationMinutes} ... />
    <SettingsStepper<CoolDownMinutes> label={strings.holdTargetLabel} value={stretchSettings.coolDownMinutes} ... />
    {/* Read-only computed duration */}
    <SettingsStepper<string> label={strings.durationLabel} value={stretchDurationText} options={[stretchDurationText]} readOnly onChange={() => undefined} ... />
  </>
) : (
  // NK branch — unchanged (lines 251-296)
  <>...</>
)}
```

**`updateInitialBpm` helper** (lines 99–106) — move into the stretch branch with typed `StretchSettings` update:
```typescript
const updateStretchSettings = (next: Partial<StretchSettings>) => {
  onStretchSettingsChange?.({ ...stretchSettings, ...next })
}

const updateInitialBpm = (initialBpm: number) => {
  if ((stretchSettings?.targetBpm ?? 0) >= initialBpm) {
    const validTargets = (BPM_OPTIONS as readonly number[]).filter((v) => v < initialBpm)
    updateStretchSettings({ initialBpm, targetBpm: validTargets[validTargets.length - 1] })
    return
  }
  updateStretchSettings({ initialBpm })
}
```

**`stretchTotalMs` / `stretchDurationText`** (lines 77–80) — update to use `stretchSettings` (typed) instead of `settings`:
```typescript
const stretchTotalMs = computeStretchTotalMs(stretchSettings ?? DEFAULT_STRETCH_SETTINGS)
```

**`ModeToggle` NK usage** (lines 280–285) — must survive retirement of the resonant usage. Rename `ModeToggle.tsx` to `BooleanToggle.tsx`; update the import here. The component implementation is unchanged.

---

### `src/components/ModeToggle.tsx` → `src/components/BooleanToggle.tsx` (component, request-response)

**Analog:** `src/components/ModeToggle.tsx` — entire current file (lines 1–54).

**Rename only** — component name changes from `ModeToggle` to `BooleanToggle`, `ModeToggleProps` to `BooleanToggleProps`. The implementation body (lines 9–54) is unchanged:
```typescript
// BEFORE:
export interface ModeToggleProps { ... }
export function ModeToggle({ ... }) { ... }

// AFTER:
export interface BooleanToggleProps { ... }  // same fields, renamed type
export function BooleanToggle({ ... }) { ... }  // same implementation
```

The resonant `SettingsForm.tsx` use of `ModeToggle` is removed entirely (D-01). The NK `perOmCue` use (line 280) is updated to import `BooleanToggle` from `./BooleanToggle`:
```typescript
// In SettingsForm.tsx (line 27 import):
// BEFORE: import { ModeToggle } from './ModeToggle'
// AFTER:  import { BooleanToggle } from './BooleanToggle'
```

---

### `src/app/App.tsx` (provider, event-driven)

**Analog:** `src/app/App.tsx` — existing state declarations and 2-way selectors; extend to 3-way.

**New state additions** — model on `resonantStats` / `naviKriyaStats` declarations (lines 132–133):
```typescript
// Model: const [resonantStats, setResonantStats] = useState<PersistedStats>(() => initialPractices.resonant.stats)
const [stretchSettings, setStretchSettings] = useState<StretchSettings>(
  () => initialPractices.stretch.settings,
)
const [stretchStats, setStretchStats] = useState<PersistedStats>(
  () => initialPractices.stretch.stats,
)
```

**`activeStats` 3-way selector** — model on line 289 (2-way):
```typescript
// BEFORE (line 289):
const activeStats = activePractice === 'resonant' ? resonantStats : naviKriyaStats
// AFTER:
const activeStats =
  activePractice === 'resonant' ? resonantStats :
  activePractice === 'stretch'  ? stretchStats  : naviKriyaStats
```

**`activePracticeName` 3-way selector** — model on lines 293–296:
```typescript
// BEFORE (2-way):
const activePracticeName =
  activePractice === 'resonant' ? uiStrings.practice.resonantHeading : uiStrings.practice.naviKriyaHeading
// AFTER:
const activePracticeName =
  activePractice === 'resonant' ? uiStrings.practice.resonantHeading :
  activePractice === 'stretch'  ? uiStrings.practice.stretchHeading  :
  uiStrings.practice.naviKriyaHeading
```

**`appHeader` / `appTitle` 3-way** — model on lines 300–303:
```typescript
const appHeader =
  activePractice === 'resonant' ? uiStrings.app.header :
  activePractice === 'stretch'  ? uiStrings.practice.stretchHeader :
  uiStrings.practice.naviKriyaHeader
const appTitle =
  activePractice === 'resonant' ? uiStrings.app.title :
  activePractice === 'stretch'  ? uiStrings.practice.stretchHeading :
  uiStrings.practice.naviKriyaHeading
```

**Cross-tab `onStorage` handler** — model on lines 240–251; add stretch slice:
```typescript
const onStorage = (e: StorageEvent): void => {
  if (e.key === STATE_KEY) {
    const practices = loadPractices()
    setResonantStats(practices.resonant.stats)
    setStretchStats(practices.stretch.stats)    // NEW
    setNaviKriyaStats(practices.naviKriya.stats)
  }
}
```

**`leadInPlaceholderFrame` — migrate `mode === 'stretch'` check** (lines 314–324):
```typescript
// BEFORE (line 320):
if (settings.mode === 'stretch') {
  return getStretchFrame(buildStretchSegments(settings, settings.ratio), 0)
}
// AFTER:
if (activePractice === 'stretch') {
  return getStretchFrame(buildStretchSegments(stretchSettings), 0)  // StretchSettings includes ratio
}
```

**Imports** — add `recordStretchSession`, `saveStretchSettings`, `StretchSettings` to the storage import; add `StretchSettings` to the domain settings import.

---

### `src/content/strings.ts` (config, transform)

**Analog:** `src/content/strings.ts` — `UiStrings.practice` sub-object (lines 155–165) and `naviKriyaName`/`naviKriyaHeading`/`naviKriyaHeader` triple (lines 160–162).

**`UiStrings.practice` interface extension** (lines 155–165) — model on the naviKriya triple:
```typescript
readonly practice: {
  readonly toggleLabel: string
  readonly resonantName: string
  readonly naviKriyaName: string
  readonly resonantHeading: string
  readonly naviKriyaHeading: string
  readonly naviKriyaHeader: string
  readonly naviKriyaControlsPlaceholder: string
  readonly naviKriyaStatsEmptyBody: string
  readonly resetStatsTitle: (practiceName: string) => string
  // NEW — same triple pattern as naviKriya:
  readonly stretchName: string      // short switcher label
  readonly stretchHeading: string   // practice heading (D-10: same value as stretchName)
  readonly stretchHeader: string    // app header line
}
```

**EN values** — model on `resonantName: 'HRV'` / `resonantHeading: 'Resonant Breathing'` / `naviKriyaHeader: 'Navi practice'` (lines 338–343):
```typescript
// EN (lines 334-346 block, after the existing naviKriya entries):
stretchName: 'Stretch',              // D-10: same as stretchHeading
stretchHeading: 'Stretch',           // D-10: same as stretchName
stretchHeader: 'Stretch practice',   // app header line
```

**PT-BR values** — model on `resonantName: 'VFC'` / `naviKriyaHeader: 'Prática Navi'` (lines 519–524). Spike 007 confirmed "Alongar" fits 320px:
```typescript
// PT-BR (lines 514-525 block, after the existing naviKriya entries):
stretchName: 'Alongar',                // D-10: same as stretchHeading; spike 007 confirmed fit
stretchHeading: 'Alongar',             // D-10: same as stretchName
stretchHeader: 'Prática de Alongar',   // app header line
```

**`practiceNames` in `PracticeToggle`** — the `Record<PracticeId, string>` passed from App.tsx gains the `stretch` key. Add to App.tsx's `strings` prop construction:
```typescript
practiceNames: {
  resonant:   uiStrings.practice.resonantName,
  stretch:    uiStrings.practice.stretchName,   // NEW
  naviKriya:  uiStrings.practice.naviKriyaName,
}
```

---

### `vite.config.ts` (config, transform)

**Analog:** `vite.config.ts` — current file (lines 1–60); gains a `define` block.

**`define` block** — add inside `defineConfig({})`, after the `plugins` array and before `test`:
```typescript
define: {
  // D-06: build-time only — NOT a user-facing setting
  // D-07: invalid or missing value falls back to 'A'
  __SWITCHER_TREATMENT__: JSON.stringify(
    process.env.VITE_SWITCHER_TREATMENT === 'B' ? 'B' : 'A'
  ),
},
```

---

### `src/domain/sessionController.ts` (service, CRUD)

**Analog:** `src/domain/sessionController.ts` — entire current file (lines 1–153).

**`startSession` — remove stretch branch** (lines 43–67). After D-01 the function becomes standard-only. Stretch sessions will be started by a new `startStretchSession` function (Approach A — lowest blast radius per RESEARCH.md Pattern 3):
```typescript
// BEFORE (lines 43-67): startSession branches on mode === 'stretch'
// AFTER: startSession is standard-only — no isStretch, no stretchSegments
export function startSession(selectedSettings: SessionSettings, nowMs: number): RunningSessionState {
  const lockedSettings = cloneSettings(selectedSettings)
  const plan = createBreathingPlan(lockedSettings)
  const lastFrame = getSessionFrame(plan, 0)
  return {
    status: 'running',
    selectedSettings: cloneSettings(selectedSettings),
    lockedSettings,
    plan,
    stretchSegments: null,   // always null for standard sessions
    startedAtMs: nowMs,
    lastFrame,
  }
}
```

**New `startStretchSession`** — thin wrapper around `StretchSettings` + `buildStretchSegments`:
```typescript
export function startStretchSession(
  stretchSettings: StretchSettings,
  nowMs: number,
): RunningSessionState {
  // Lead-in plan runs at initialBpm so cue duration matches the warm-up rate
  const plan = createBreathingPlan({ ...stretchSettings, bpm: stretchSettings.initialBpm, durationMinutes: 'open-ended' })
  const stretchSegments = buildStretchSegments(stretchSettings)  // signature simplified after D-02
  const lastFrame = getStretchFrame(stretchSegments, 0)
  return {
    status: 'running',
    selectedSettings: { bpm: stretchSettings.initialBpm, ratio: stretchSettings.ratio, durationMinutes: 'open-ended' },
    lockedSettings:   { bpm: stretchSettings.initialBpm, ratio: stretchSettings.ratio, durationMinutes: 'open-ended' },
    plan,
    stretchSegments,
    startedAtMs: nowMs,
    lastFrame,
  }
}
```

**`extendTimedSession`** (lines 76–126) — remove `state.lockedSettings.mode === 'stretch'` from the guard (line 86):
```typescript
// BEFORE (line 86):
if (state.lockedSettings.mode === 'stretch' || state.stretchSegments !== null) {
// AFTER:
if (state.stretchSegments !== null) {
```

**`buildStretchSegments` import** — after D-02 the signature becomes `(settings: StretchSettings)` (ratio lives inside `settings`). Update the import and all call sites.

---

### `src/domain/stretchRamp.ts` (service, CRUD)

**Analog:** `src/domain/stretchRamp.ts` — `buildStretchSegments` signature (line 73) and `computeStretchTotalMs`.

**`buildStretchSegments` signature change** (line 73):
```typescript
// BEFORE:
export function buildStretchSegments(settings: SessionSettings, ratio: RatioLabel): StretchSegment[]
// AFTER:
export function buildStretchSegments(settings: StretchSettings): StretchSegment[]
```

Inside the function body (line 74), change `const { ... } = settings` to destructure from `StretchSettings` (remove `bpm`, `durationMinutes`, `mode`), and change `const ratioParts = RATIO_PARTS[ratio]` to `const ratioParts = RATIO_PARTS[settings.ratio]`.

**`computeStretchTotalMs` signature change** — same pattern:
```typescript
// BEFORE:
export function computeStretchTotalMs(settings: SessionSettings): number | null
// AFTER:
export function computeStretchTotalMs(settings: StretchSettings): number | null
```

**Import change** — replace `SessionSettings` import with `StretchSettings`:
```typescript
// BEFORE (line 10):
import type { RatioLabel, SessionSettings } from './settings'
// AFTER:
import type { StretchSettings } from './settings'
// RatioLabel no longer needed as a parameter type (it's inside StretchSettings)
```

---

## Shared Patterns

### Prototype-Pollution-Safe Coercion
**Source:** `src/storage/practices.ts` lines 38–42 (`asRecord` helper)
**Apply to:** `coerceStretchSettings` in `practices.ts`
```typescript
function asRecord(raw: unknown): Record<string, unknown> {
  return raw !== null && typeof raw === 'object' && !Array.isArray(raw)
    ? raw as Record<string, unknown>
    : {}
}
```

### Per-Field Non-Throwing Coercer Pattern
**Source:** `src/storage/practices.ts` lines 50–69 (`coerceNaviKriyaSettings`)
**Apply to:** `coerceStretchSettings` — same `const r = asRecord(raw); return { field: isValidX(r.field) ? r.field : DEFAULT.field }` structure. One drifted field never discards the rest.

### Practice Slice Read/Write Isolation
**Source:** `src/storage/practices.ts` lines 106–113 (`saveResonantSettings`) and 128–158 (`recordResonantSession`)
**Apply to:** `saveStretchSettings`, `recordStretchSession` — spread `...practices` then override only the target slice key (`stretch:`). Other slices are passed through untouched.

### Migration Ladder — Idempotent/Lossless/Orphan-Tolerant
**Source:** `src/storage/storage.ts` lines 90–107 (`migrateEnvelope` v1→v2 step)
**Apply to:** v2→v3 step — same `if (fromVersion < N) { out = { ...out, practices: { ...existingPractices, newSlice: {...} } } }` pattern. Never modify existing keys, never delete orphan fields, purely constructive.

### Build-Time Compile-Time Flag
**Source:** `vite.config.ts` `define` block pattern (new)
**Apply to:** `PracticeToggle.tsx` `__SWITCHER_TREATMENT__` — `declare const __SWITCHER_TREATMENT__: string` tells TypeScript the identifier exists; Vite's `define` replaces it at build time with a string literal.

### Theme-Token Inline SVG Styling
**Source:** `src/components/ModeToggle.tsx` lines 42–49 (existing SVG-derived button with `var(--color-breathing-*)` tokens)
**Apply to:** `PracticeGlyph` inline SVGs — use `currentColor` or `var(--color-breathing-accent)` stroke so glyphs respond to theme token changes. Do not hardcode colors.

### Cross-Tab Stats Refresh
**Source:** `src/app/App.tsx` lines 239–251 (`onStorage` handler)
**Apply to:** App.tsx updated handler — add `setStretchStats(practices.stretch.stats)` in the same `if (e.key === STATE_KEY)` block alongside the existing resonant + NK setters.

### 3-Way Practice Selector Pattern
**Source:** `src/app/App.tsx` lines 289–303 (2-way selectors for `activeStats`, `activePracticeName`, `appHeader`, `appTitle`)
**Apply to:** All four selectors — extend from `condition ? A : B` to `condition1 ? A : condition2 ? B : C`.

---

## No Analog Found

No files in this phase lack a close codebase match. All patterns are either direct extensions of existing files or direct mirrors of existing functions in those same files.

---

## Metadata

**Analog search scope:** `src/storage/`, `src/domain/`, `src/components/`, `src/app/`, `src/content/`, `vite.config.ts`
**Files read:** 10 source files
**Pattern extraction date:** 2026-05-18
