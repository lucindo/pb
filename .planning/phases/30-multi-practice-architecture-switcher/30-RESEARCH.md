# Phase 30: Multi-Practice Architecture & Switcher — Research

**Researched:** 2026-05-17
**Domain:** React state architecture, localStorage schema migration, TypeScript type design
**Confidence:** HIGH (codebase verified directly; no external library uncertainty)

---

<user_constraints>
## User Constraints (from CONTEXT.md)

### Locked Decisions

**D-01:** The Navi Kriya practice screen renders a structural scaffold — a real practice-screen layout with the switcher, a practice heading, an empty practice-controls slot, and a disabled/stub Start button. Phase 31 swaps the live engine, orb, and controls into these existing slots rather than rebuilding the screen.

**D-02:** Phase 30 defines the Navi Kriya settings data model now — `NaviKriyaSettings` type + defaults (rounds 3, base front count 100, fixed 4:1 front:back ratio, OM length fast/medium/slow) + validators + a non-throwing coercer — wired into the per-practice persistence map. PRACTICE-02 is fully satisfied for both practices at the end of Phase 30.

**D-03:** Per-practice controls stay inline on the home screen. The existing `SettingsForm` becomes practice-aware — it renders the active practice's controls. The shared chrome dialog (`SettingsDialog`: theme / variant / cue / timbre / language) is unchanged and serves both practices.

**D-04:** The inline per-practice controls area gains a heading naming the active practice (e.g. "Resonant Breathing"). This is a new copy string — EN now, PT-BR in Phase 32.

**D-05:** Switcher pills use full practice names — "Resonant Breathing" and "Navi Kriya". Practice display names are copy strings (EN now, PT-BR in Phase 32); "Navi Kriya" stays untranslated.

**D-06:** While a session is in progress the switcher is dimmed in place — visible but non-interactive (opacity + not-allowed cursor), matching how the chrome pickers already show their in-session disabled state.

**D-07:** `StatsFooter` shows only the active practice's stats and swaps when the user switches practice.

**D-08:** Reset (via `ResetStatsDialog`) wipes only the active practice's stats; the other practice's history is untouched. The dialog copy names the practice being reset — a new/changed copy string (EN now, PT-BR in Phase 32).

### Claude's Discretion

- Component-level structure of the practice-aware `SettingsForm` (one generic component vs per-practice components).
- Exact pill visual treatment (the spike-002 pattern is the starting point).
- Switch-transition animation (if any) — keep it calm; no decision was forced.

### Deferred Ideas (OUT OF SCOPE)

- Navi Kriya engine, session loop, cue sounds, live on-screen count, and the NK controls UI — Phase 31.
- Per-practice + shared Learn content and PT-BR localization of all new copy — Phase 32.
- A third/fourth practice — Future requirement PRACTICE-F1.
- v1.x carry-forward tech debt — remains deferred.
</user_constraints>

---

<phase_requirements>
## Phase Requirements

| ID | Description | Research Support |
|----|-------------|------------------|
| PRACTICE-01 | User can switch between Resonant Breathing and Navi Kriya using a top segmented control above the orb | PracticeToggle component; `activePractice` state in App.tsx |
| PRACTICE-02 | User's last-used practice and each practice's own settings persist across reloads | `practices` map in Envelope + `activePractice` field; per-practice coercers |
| PRACTICE-03 | User cannot switch practices while a session is in progress — the switcher is disabled until the session ends | `disabled={inSessionView}` on PracticeToggle, mirroring existing chrome-picker pattern |
| PRACTICE-04 | A returning user's existing saved Resonant Breathing settings and stats survive the upgrade | `migrateEnvelope` v1→v2 step coerces flat `settings`/`stats` into `practices.resonant` |
| PRACTICE-05 | User can adjust shared app-wide settings from one settings screen that serves both practices | `SettingsDialog` is unchanged; all shared chrome lives there |
| PRACTICE-06 | User sees the practice-specific controls for whichever practice is currently active | Practice-aware `SettingsForm` dispatches on `activePractice`; NK shows empty slot in Phase 30 |
</phase_requirements>

---

## Summary

Phase 30 is a pure architectural refactor — no new runtime behavior except the switcher. The existing codebase has a well-established, verified pattern for storage (envelope + per-field coercers), and the migration seam (`migrateEnvelope`) was deliberately left as a no-op with a comment that reads "future versions add if (fromVersion < N) ladders here." This phase fills in that ladder for the v1→v2 schema change.

The central risk is the `STATE_VERSION` bump and migration path (PRACTICE-04). A returning user with existing data has a flat envelope: `{ version: 1, settings: {...}, mute: boolean, stats: {...}, prefs: {...} }`. After the migration their data must live at `practices.resonant.settings` and `practices.resonant.stats`. The migration coercer in `migrateEnvelope` is the single place this transformation lands, and it must be lossless.

The second area of complexity is `App.tsx` (~832 lines). It wires everything: settings load/save, stats, session engine, dialogs. Adding `activePractice` state and practice-scoped persistence doubles the number of settings/stats slots but follows the existing pattern exactly. The existing `persistedSetSettings` / `persistedSetMuted` / `confirmReset` / `recordSession` call sites each need a practice-aware equivalent — but the shape of those equivalents is already established by the existing resonant code.

`SettingsDialog` itself does NOT change (D-03/D-05). Only `SettingsForm` becomes practice-aware. `StatsFooter` and `ResetStatsDialog` become active-practice-scoped.

**Primary recommendation:** Implement in this order: (1) domain types + NK settings model, (2) storage migration + Envelope type extension, (3) new per-practice coercers, (4) App.tsx rewiring, (5) PracticeToggle component, (6) SettingsForm practice-aware split, (7) StatsFooter/ResetStatsDialog scoping, (8) copy strings. This order keeps the type-checked surface consistent and lets each wave compile before the next begins.

---

## Architectural Responsibility Map

| Capability | Primary Tier | Secondary Tier | Rationale |
|------------|-------------|----------------|-----------|
| PracticeId type + NaviKriyaSettings type | Domain layer (`src/domain/`) | — | Types live in domain, not storage |
| STATE_VERSION bump + migrateEnvelope v1→v2 | Storage layer (`src/storage/storage.ts`) | — | Migration is a storage concern |
| Per-practice coercers (coerceNaviKriyaSettings, coerceActivePractice) | Storage layer (`src/storage/`) | — | Same tier as existing coerceSettings |
| activePractice + per-practice state management | App layer (`src/app/App.tsx`) | — | Mirrors existing settings/stats state management |
| PracticeToggle component | Component layer (`src/components/`) | — | Presentational; receives activePractice + onSwitch + disabled |
| Practice-aware SettingsForm | Component layer (`src/components/`) | — | Dispatches on activePractice prop |
| Practice-scoped StatsFooter + ResetStatsDialog | Component layer (`src/components/`) | App.tsx (supplies active stats slice) | Components remain presentational |
| New copy strings (practice names, heading, reset copy) | Content layer (`src/content/strings.ts`) | — | Existing strings catalog pattern |

---

## Standard Stack

### Core (all existing — no new npm dependencies)

| Library | Version | Purpose | Why Standard |
|---------|---------|---------|--------------|
| React | 19.x (existing) | UI state + component tree | Already in use |
| TypeScript | existing | Type safety for PracticeId, NaviKriyaSettings | Project-wide |
| Vitest | 4.1.5 (existing) | Unit tests | Already in use |
| @testing-library/react | existing | Component integration tests | Already in use |

**No new npm packages are required for Phase 30.** [VERIFIED: codebase inspection]

### Alternatives Considered

| Instead of | Could Use | Tradeoff |
|------------|-----------|----------|
| Extending the existing Envelope type | Separate localStorage key per practice | New key approach would lose existing Resonant data (breaks PRACTICE-04) |
| migrateEnvelope ladder | Replacing coercers | Migration is lossless + deterministic; coercer-only approach can't handle structural shape changes |

---

## Architecture Patterns

### System Architecture Diagram

```
localStorage ('hrv:state:v1')
        |
        v
  readEnvelope()
        |
        v
  migrateEnvelope(env, fromVersion)  <-- v1→v2 migration lands here
    if fromVersion < 2:
      env.practices = { resonant: { settings: env.settings, stats: env.stats } }
      env.activePractice = 'resonant'
      env.version = 2
        |
        v
  Envelope v2:
    { version: 2,
      prefs: {...},             // shared chrome (unchanged)
      mute: boolean,            // unchanged
      practices: {
        resonant: { settings: ResonantSettings, stats: PersistedStats },
        naviKriya: { settings: NaviKriyaSettings, stats: PersistedStats }
      },
      activePractice: PracticeId
    }
        |
        +---> coercePrefs(env.prefs)           --> UserPrefs (shared chrome)
        +---> coerceMute(env.mute)             --> boolean
        +---> coercePractices(env.practices)   --> PracticeMap
        +---> coerceActivePractice(env.activePractice) --> PracticeId
        |
        v
  App.tsx state:
    activePractice: PracticeId
    resonantSettings: SessionSettings
    resonantStats: PersistedStats
    naviKriyaSettings: NaviKriyaSettings
    naviKriyaStats: PersistedStats

  [PracticeToggle]         <-- above orb; disabled={inSessionView}
  [active practice heading] <-- "Resonant Breathing" | "Navi Kriya"
  [BreathingShape / NK scaffold]
  [practice-aware SettingsForm] <-- dispatches on activePractice
  [StatsFooter]            <-- receives activeStats slice
  [ResetStatsDialog]       <-- wipes activeStats only
```

### Recommended Project Structure (additions only)

```
src/
├── domain/
│   └── naviKriyaSettings.ts     # NaviKriyaSettings type, defaults, validators
├── storage/
│   ├── storage.ts               # STATE_VERSION bump 1→2, migrateEnvelope ladder, Envelope type extension
│   ├── practices.ts             # NEW: coercePractices, coerceActivePractice, loadPractices, savePractices
│   └── index.ts                 # re-export practices.ts additions
├── components/
│   └── PracticeToggle.tsx       # NEW: segmented control pill
└── content/
    └── strings.ts               # new keys: practiceNames, practiceHeading, resetStatsForPractice
```

### Pattern 1: STATE_VERSION Migration Ladder

**What:** `migrateEnvelope` gains the first real migration step. It is called on every `readEnvelope` before coercers run.

**When to use:** Every structural shape change that must be forward-compatible with pre-existing user data.

**The v1→v2 migration:**

```typescript
// Source: src/storage/storage.ts — verified current structure [VERIFIED: codebase]
export const STATE_VERSION = 2 as const  // bumped from 1

export function migrateEnvelope(env: Envelope, fromVersion: number): Envelope {
  let out = { ...env }

  if (fromVersion < 2) {
    // Coerce a pre-existing flat v1 envelope into the v2 per-practice shape.
    // env.settings and env.stats are the existing resonant data (unknown type —
    // downstream coercers will validate them field-by-field as always).
    // env.practices is absent on v1 data; we synthesize it here.
    const resonant = {
      settings: out.settings,   // raw unknown — coerceSettings handles validation
      stats: out.stats,         // raw unknown — coerceStats handles validation
    }
    out = {
      ...out,
      practices: { resonant, naviKriya: undefined },  // naviKriya: undefined -> coercer supplies defaults
      activePractice: 'resonant',
    }
    // Note: do NOT delete out.settings / out.stats — the forward-compat spread
    // preserves unknown top-level fields. The v2 Envelope type adds 'practices'
    // and 'activePractice' as known fields; old 'settings'/'stats' survive as
    // unknown fields (they are no longer the authoritative store after migration,
    // but preserving them is harmless and matches the existing forward-compat contract).
  }

  return out
}
```

**Critical:** `writeEnvelope` already stamps `STATE_VERSION` on every write. After the first migration+write, `onDiskVersion` will be 2 on all subsequent reads. The migration ladder is safe to call on a v2 envelope (the `fromVersion < 2` guard is false). [VERIFIED: storage.ts:178]

**Critical:** The `STATE_KEY` string (`'hrv:state:v1'`) MUST NOT change. The `:v1` suffix in the key name is separate from the in-envelope `STATE_VERSION` field. The FOUC script in `index.html` reads `localStorage.getItem('hrv:state:v1')` hardcoded — changing the key would break theme pre-paint for all users. [VERIFIED: index.html:18, storage.ts:14-28]

### Pattern 2: Per-Practice Coercer

**What:** `coercePractices` wraps per-practice settings + stats coercers. Per the existing pattern (prototype-pollution-safe, non-throwing, per-field fallback).

```typescript
// Source: mirrors prefs.ts coercePrefs pattern [VERIFIED: codebase]
export interface PracticeSlice<S> {
  settings: S
  stats: PersistedStats
}

export type PracticeMap = {
  resonant: PracticeSlice<SessionSettings>
  naviKriya: PracticeSlice<NaviKriyaSettings>
}

export function coercePractices(raw: unknown): PracticeMap {
  const r = (raw !== null && typeof raw === 'object' && !Array.isArray(raw))
    ? raw as Record<string, unknown>
    : {}
  return {
    resonant: coerceResonantSlice(r.resonant),
    naviKriya: coerceNaviKriyaSlice(r.naviKriya),
  }
}

export function coerceActivePractice(raw: unknown): PracticeId {
  return raw === 'resonant' || raw === 'naviKriya' ? raw : 'resonant'
}
```

### Pattern 3: PracticeToggle Component

**What:** Compact pill segmented control above the orb. Disabled during a session (opacity + cursor). From spike-002 verified pattern.

```tsx
// Source: .claude/skills/spike-findings-hrv/sources/002-switcher-ux/index.html [VERIFIED: spike]
export function PracticeToggle({
  active,
  disabled,
  onSwitch,
  strings,
}: PracticeToggleProps) {
  return (
    <div
      className={`flex rounded-full bg-[var(--color-breathing-surface)] p-1 ${
        disabled ? 'opacity-50 cursor-not-allowed' : ''
      }`}
      role="group"
      aria-label={strings.practiceToggleLabel}
    >
      {(['resonant', 'naviKriya'] as const).map((id) => (
        <button
          key={id}
          type="button"
          disabled={disabled}
          onClick={() => onSwitch(id)}
          className={
            active === id
              ? 'rounded-full bg-white px-4 py-1.5 text-sm font-semibold shadow text-[var(--color-breathing-accent-strong)]'
              : 'rounded-full px-4 py-1.5 text-sm text-[var(--color-breathing-muted)]'
          }
          aria-pressed={active === id}
        >
          {strings.practiceNames[id]}
        </button>
      ))}
    </div>
  )
}
```

**Note:** `disabled` prop on the wrapping `<div>` is advisory; the `disabled` prop on each `<button>` is the actual interaction lock. Both are set when `inSessionView === true`.

### Pattern 4: App.tsx Practice-Scoped Rewiring

**What:** `App.tsx` gains `activePractice` state and practice-scoped versions of the settings/stats slots. The existing patterns (useMemo initial load, useCallback persisted setters, optimistic confirmReset) are replicated for the per-practice slots.

**Key additions to App.tsx:**

```typescript
// Initial loads (useMemo([]) pattern — verified at App.tsx:81-85)
const initialPractices = useMemo(() => loadPractices(), [])
const initialActivePractice = useMemo(() => loadActivePractice(), [])

// Active-practice state
const [activePractice, setActivePractice] = useState<PracticeId>(initialActivePractice)

// Per-practice settings and stats (two slots replacing the current single slot)
// resonant: session engine keeps selectedSettings internally; we persist on change
// naviKriya: stored directly as NaviKriyaSettings (no session engine in Phase 30)
const [naviKriyaSettings, setNaviKriyaSettings] = useState<NaviKriyaSettings>(
  () => initialPractices.naviKriya.settings
)
const [resonantStats, setResonantStats] = useState<PersistedStats>(
  () => initialPractices.resonant.stats
)
const [naviKriyaStats, setNaviKriyaStats] = useState<PersistedStats>(
  () => initialPractices.naviKriya.stats
)

// Switch handler — disabled during session (gated by inSessionView)
const onSwitchPractice = useCallback((next: PracticeId) => {
  if (inSessionView) return  // defense-in-depth; PracticeToggle's disabled prop is the first gate
  setActivePractice(next)
  saveActivePractice(next)
}, [inSessionView])
```

**Stats scoping (D-07/D-08):** `StatsFooter` receives `activePractice === 'resonant' ? resonantStats : naviKriyaStats`. `confirmReset` writes `resetStats` for the active practice only and resets the active stats slice to `ZERO_STATS`.

**Session record site** (existing `recordSession` call in the leave-running cleanup effect): must write into `practices.resonant.stats` subtree, not the old flat `stats` key. The existing `recordSession` in `src/storage/stats.ts` reads/writes `env.stats` directly — it must be updated to accept a practice parameter, OR a new `recordResonantSession` thin wrapper handles this by writing to the correct envelope location.

### Anti-Patterns to Avoid

- **Changing `STATE_KEY`:** breaks the FOUC theme-resolve script in `index.html` and would orphan all existing user data. The `:v1` key suffix is not a version number — it is a breaking-change escape hatch only (see storage.ts:14-28). [VERIFIED: storage.ts, index.html]
- **Deleting `env.settings` / `env.stats` in the migration:** breaks the forward-compat contract (the top-level spread in `readEnvelope` preserves unknown fields). Leave them as orphaned fields; they are harmless.
- **Running sessions across practice switches:** Rejected in spike-001. The switcher must be disabled while a session is in progress — no background session state. [VERIFIED: spike-001/README.md]
- **Bottom tab bar or launch screen:** Rejected in spike-002. Top segmented control is the chosen pattern. [VERIFIED: spike-002/README.md]
- **Putting per-practice settings into `SettingsDialog`:** The shared chrome dialog stays shared chrome only (D-03). Per-practice controls remain inline.
- **Allowing non-multiple-of-4 `frontCount`:** The back count would be fractional. The NK settings validator must enforce `frontCount % 4 === 0`.

---

## Don't Hand-Roll

| Problem | Don't Build | Use Instead | Why |
|---------|-------------|-------------|-----|
| Schema migration safety | Custom migration runner | `migrateEnvelope` seam (already built) | Seam already wired into readEnvelope, tested |
| Per-field coercion | Throwing parser | Non-throwing coercer pattern (existing `coerceSettings`, `coercePrefs`) | Single drifted field must not discard rest of envelope |
| Dialog component | New dialog pattern | `ResetStatsDialog` existing pattern (native `<dialog>`, imperative open/close) | All dialog patterns verified + polyfilled in test setup |
| Persistence | IndexedDB / second key | Extend existing Envelope via migrateEnvelope | Keeping one key is the established posture; FOUC script already reads this key |

**Key insight:** Every infrastructure piece needed by Phase 30 already exists in the codebase. This phase slots new data into established patterns — it does not introduce new infrastructure.

---

## Common Pitfalls

### Pitfall 1: STATE_KEY vs STATE_VERSION Confusion

**What goes wrong:** Developer bumps the `STATE_KEY` string (changes `'hrv:state:v1'` to `'hrv:state:v2'`), thinking that is the right version bump.

**Why it happens:** The dual-versioning scheme (key suffix + in-envelope field) is non-obvious. `storage.ts` line 14-28 documents it but the reader may miss it.

**How to avoid:** Only bump `STATE_VERSION` (the in-envelope integer constant). Leave `STATE_KEY = 'hrv:state:v1'` exactly as is. Also update the `SYNC WITH index.html FOUC SCRIPT` comment in storage.ts only if the key actually changes (which it should not).

**Warning signs:** Tests that seed `localStorage.setItem('hrv:state:v2', ...)` — those are wrong.

### Pitfall 2: writeEnvelope Ignores Passed version

**What goes wrong:** Developer passes `{ ...env, version: 2, practices: {...} }` to `writeEnvelope` expecting version 2 to be written to disk.

**Why it happens:** `writeEnvelope` stamps `STATE_VERSION` on every write regardless of the caller-passed `env.version` (line 178: `{ ...env, version: STATE_VERSION }`). So after the bump, `STATE_VERSION = 2` is correct — the constant controls what lands on disk.

**How to avoid:** Verify `STATE_VERSION = 2 as const` is set before testing persistence. The write is already correct by construction once the constant is bumped.

### Pitfall 3: Stats recordSession writes to wrong envelope key

**What goes wrong:** After the schema migration, `recordSession` in `src/storage/stats.ts` still writes `{ ...env, stats: next }` — the flat `stats` field on the envelope. A returning user's session no longer updates their `practices.resonant.stats`.

**Why it happens:** `recordSession` (stats.ts:80-117) reads from and writes to `env.stats` directly. After the migration, the authoritative stats live at `env.practices.resonant.stats`.

**How to avoid:** Either (a) update `recordSession` to accept a `practice: PracticeId` parameter and write to `env.practices[practice].stats`, or (b) create a thin `recordResonantSession` wrapper in `practices.ts` that reads the envelope, updates the resonant subtree, and writes back. Option (b) is safer because it doesn't break the existing `recordSession` signature (used extensively in tests).

**Warning signs:** Stats don't update after a session even though the session completed.

### Pitfall 4: resetStats wipes wrong subtree

**What goes wrong:** `confirmReset` in App.tsx calls `resetStats()` which currently wipes `env.stats` (stats.ts:119-123 — the flat key). After migration, this is a no-op because `env.stats` is no longer where stats live.

**How to avoid:** Implement `resetPracticeStats(practice: PracticeId)` in practices.ts that writes `ZERO_STATS` into `env.practices[practice].stats`. Wire `confirmReset` to call this with `activePractice`.

### Pitfall 5: NaviKriyaSettings frontCount Validation

**What goes wrong:** User-supplied `frontCount` that is not a multiple of 4 passes validation. `backCount = frontCount / 4` is then fractional, causing count display and session logic in Phase 31 to break.

**How to avoid:** The `isValidFrontCount` validator must enforce `v % 4 === 0` in addition to range checks. The coercer must round down to the nearest multiple of 4 as a fallback (not just fall back to default).

### Pitfall 6: Cross-tab storage event after practice switch

**What goes wrong:** The existing cross-tab stats refresh listener in App.tsx (lines 155-165) calls `loadStats()` which after the schema change reads the flat `env.stats` (undefined for v2 envelopes) and returns `ZERO_STATS` — resetting the displayed stats incorrectly.

**Why it happens:** The storage event handler is wired to the old single-practice `loadStats`.

**How to avoid:** Update the cross-tab listener to call `loadPractices()` and update both `resonantStats` and `naviKriyaStats` from the result, or call a new `loadResonantStats()` / `loadNaviKriyaStats()` that reads from the practices subtree.

### Pitfall 7: Envelope type needs `practices` and `activePractice` fields

**What goes wrong:** TypeScript's `Envelope` interface in `storage.ts` only has `{ version, settings?, mute?, stats?, prefs? }`. The migration code accesses `out.practices` and `out.activePractice` but TS flags them as unknown properties.

**How to avoid:** Add `practices?: unknown` and `activePractice?: unknown` to the `Envelope` interface (same `unknown` pattern as `settings`/`stats`/`prefs` — coercers narrow at the boundary). The forward-compat `...p` spread already carries them at runtime; the type just needs to acknowledge them statically.

---

## Code Examples

### NaviKriyaSettings type and defaults

```typescript
// Source: .claude/skills/spike-findings-hrv/references/navi-kriya-practice.md [VERIFIED: spike reference]
// File: src/domain/naviKriyaSettings.ts (new file)

export type OmLength = 'fast' | 'medium' | 'slow'

export const OM_LENGTH_OPTIONS = ['fast', 'medium', 'slow'] as const satisfies readonly OmLength[]

export interface NaviKriyaSettings {
  frontCount: number      // base front OM count; backCount = frontCount / 4; must be multiple of 4
  omLength: OmLength
  rounds: number          // default 3
  perOmCue: boolean       // audible tick on each OM
}

export const DEFAULT_NK_SETTINGS: NaviKriyaSettings = {
  frontCount: 100,
  omLength: 'medium',
  rounds: 3,
  perOmCue: true,
}

export function isValidFrontCount(v: unknown): v is number {
  return typeof v === 'number'
    && Number.isFinite(v)
    && v > 0
    && Number.isInteger(v)
    && v % 4 === 0
}

export function isValidOmLength(v: unknown): v is OmLength {
  return v === 'fast' || v === 'medium' || v === 'slow'
}

export function isValidRounds(v: unknown): v is number {
  return typeof v === 'number' && Number.isFinite(v) && v >= 1 && Number.isInteger(v)
}

export function coerceNaviKriyaSettings(raw: unknown): NaviKriyaSettings {
  const r = (raw !== null && typeof raw === 'object' && !Array.isArray(raw))
    ? raw as Record<string, unknown>
    : {}
  // frontCount: fallback to nearest lower multiple of 4 if the stored value is
  // a valid positive number but not a multiple of 4 (e.g. legacy stored value 102).
  const rawFront = r.frontCount
  let frontCount = DEFAULT_NK_SETTINGS.frontCount
  if (typeof rawFront === 'number' && Number.isFinite(rawFront) && rawFront > 0) {
    const rounded = Math.floor(rawFront / 4) * 4
    if (rounded > 0) frontCount = rounded
  }
  return {
    frontCount,
    omLength:  isValidOmLength(r.omLength)   ? r.omLength  : DEFAULT_NK_SETTINGS.omLength,
    rounds:    isValidRounds(r.rounds)         ? r.rounds    : DEFAULT_NK_SETTINGS.rounds,
    perOmCue:  typeof r.perOmCue === 'boolean' ? r.perOmCue  : DEFAULT_NK_SETTINGS.perOmCue,
  }
}
```

### Envelope type extension

```typescript
// Source: src/storage/storage.ts — current Envelope verified [VERIFIED: codebase]
// Add two new optional unknown fields:
export interface Envelope {
  version: number
  settings?: unknown
  mute?: unknown
  stats?: unknown
  prefs?: unknown
  practices?: unknown    // NEW: per-practice { resonant: {settings, stats}, naviKriya: {settings, stats} }
  activePractice?: unknown  // NEW: PracticeId string
}

export const STATE_VERSION = 2 as const  // bumped from 1
```

### migrateEnvelope v1→v2 ladder

```typescript
// Source: src/storage/storage.ts — migrateEnvelope seam verified [VERIFIED: codebase]
export function migrateEnvelope(env: Envelope, fromVersion: number): Envelope {
  let out = { ...env }

  if (fromVersion < 2) {
    // v1→v2: coerce flat settings+stats into practices.resonant.
    // env.settings / env.stats remain as orphaned top-level fields (harmless —
    // forward-compat spread preserves them; they are no longer the authoritative store).
    out = {
      ...out,
      practices: {
        resonant: {
          settings: out.settings,  // raw unknown — coerceSettings validates field-by-field
          stats: out.stats,        // raw unknown — coerceStats validates field-by-field
        },
        // naviKriya absent → coercePractices supplies defaults
      },
      activePractice: 'resonant',
    }
  }

  return out
}
```

### practices.ts storage module (new file)

```typescript
// Source: mirrors prefs.ts / settings.ts patterns [VERIFIED: codebase]
// File: src/storage/practices.ts

import { coerceSettings } from './settings'
import { coerceStats, ZERO_STATS, type PersistedStats } from './stats'
import { coerceNaviKriyaSettings } from '../domain/naviKriyaSettings'
import { readEnvelope, writeEnvelope, type StorageDeps } from './storage'
import type { SessionSettings } from '../domain/settings'
import type { NaviKriyaSettings } from '../domain/naviKriyaSettings'

export type PracticeId = 'resonant' | 'naviKriya'

export interface PracticeSlice<S> {
  settings: S
  stats: PersistedStats
}

export interface PracticeMap {
  resonant: PracticeSlice<SessionSettings>
  naviKriya: PracticeSlice<NaviKriyaSettings>
}

export function coerceActivePractice(raw: unknown): PracticeId {
  return raw === 'resonant' || raw === 'naviKriya' ? raw : 'resonant'
}

function coercePracticeSlice<S>(raw: unknown, coerceS: (v: unknown) => S, zeroStats: PersistedStats): PracticeSlice<S> {
  const r = (raw !== null && typeof raw === 'object' && !Array.isArray(raw))
    ? raw as Record<string, unknown>
    : {}
  return { settings: coerceS(r.settings), stats: coerceStats(r.stats) }
}

export function coercePractices(raw: unknown): PracticeMap {
  const r = (raw !== null && typeof raw === 'object' && !Array.isArray(raw))
    ? raw as Record<string, unknown>
    : {}
  return {
    resonant:  coercePracticeSlice(r.resonant,  coerceSettings,         ZERO_STATS),
    naviKriya: coercePracticeSlice(r.naviKriya, coerceNaviKriyaSettings, ZERO_STATS),
  }
}

export function loadPractices(deps: StorageDeps = {}): PracticeMap {
  return coercePractices(readEnvelope(deps).practices)
}

export function loadActivePractice(deps: StorageDeps = {}): PracticeId {
  return coerceActivePractice(readEnvelope(deps).activePractice)
}

export function saveActivePractice(id: PracticeId, deps: StorageDeps = {}): void {
  const env = readEnvelope(deps)
  writeEnvelope({ ...env, activePractice: id }, deps)
}

export function saveResonantSettings(settings: SessionSettings, deps: StorageDeps = {}): void {
  const env = readEnvelope(deps)
  const practices = coercePractices(env.practices)
  writeEnvelope({ ...env, practices: { ...practices, resonant: { ...practices.resonant, settings } } }, deps)
}

export function saveNaviKriyaSettings(settings: NaviKriyaSettings, deps: StorageDeps = {}): void {
  const env = readEnvelope(deps)
  const practices = coercePractices(env.practices)
  writeEnvelope({ ...env, practices: { ...practices, naviKriya: { ...practices.naviKriya, settings } } }, deps)
}

export function recordResonantSession(elapsedMs: number, isComplete: boolean, deps: StorageDeps = {}): PersistedStats {
  // Mirrors stats.ts recordSession but writes into practices.resonant.stats
  // ... (same COUNT_THRESHOLD_MS / isFinite guard logic as recordSession)
}

export function resetPracticeStats(practice: PracticeId, deps: StorageDeps = {}): void {
  const env = readEnvelope(deps)
  const practices = coercePractices(env.practices)
  writeEnvelope({
    ...env,
    practices: { ...practices, [practice]: { ...practices[practice], stats: { ...ZERO_STATS } } }
  }, deps)
}
```

---

## State of the Art

| Old Approach | Current Approach | When Changed | Impact |
|--------------|------------------|--------------|--------|
| Single flat `settings`/`stats` on envelope | Per-practice `practices` map | Phase 30 | Returning users migrated via `migrateEnvelope` v1→v2 |
| `STATE_VERSION = 1` (no-op migration) | `STATE_VERSION = 2` (v1→v2 ladder) | Phase 30 | First real use of the migration seam |
| `SettingsForm` is resonant-only | Practice-aware `SettingsForm` dispatches on `activePractice` | Phase 30 | NK controls slot is empty in Phase 30; Phase 31 fills it |
| Single practice (resonant) | Two practices (resonant + naviKriya) | Phase 30 | `activePractice` persisted; switcher UI added |

**No deprecated patterns introduced:** All additions follow the existing project patterns exactly.

---

## Assumptions Log

| # | Claim | Section | Risk if Wrong |
|---|-------|---------|---------------|
| A1 | `STATE_KEY = 'hrv:state:v1'` must not change (FOUC script depends on it) | Architecture Patterns | If wrong, theme flicker on page load for all users; data orphan |
| A2 | `NaviKriyaSettings.frontCount` default of 100 and rounds default of 3 are finalized for Phase 30 | Standard Stack | If wrong, requires NK settings model change before Phase 31 — low risk since Phase 31 can adjust |
| A3 | `mute` stays as a shared envelope field (not per-practice) | Architecture Patterns | If wrong, needs per-practice mute state — deferred to discussion |

**Notes on A3:** The `mute` field in the envelope currently controls the single Resonant session's audio. The spike references do not mention per-practice mute. The CONTEXT.md does not address it. `[ASSUMED]` that mute remains shared. The planner should confirm before implementation.

---

## Open Questions (RESOLVED)

1. **Per-practice mute or shared mute?**
   - What we know: The current `mute` field is flat on the envelope; it is shared chrome in effect.
   - What's unclear: The CONTEXT.md does not address this. Navi Kriya will have its own `perOmCue` toggle (D-02), but the master mute button on the session controls may need scoping.
   - Recommendation: Treat mute as shared chrome in Phase 30 (match the existing behavior). Phase 31 can revisit if NK's cue behavior requires separate mute.
   - RESOLVED: `mute` stays a shared envelope field for Phase 30 — it is NOT moved into the per-practice map. Decided in plan 30-04 (SettingsDialog scope keeps `mute` as shared chrome). Phase 31 may revisit if NK cue behavior requires a separate mute.

2. **`loadStats` in cross-tab storage event listener**
   - What we know: App.tsx line 157-159 calls `loadStats()` on `storage` event — reads flat `env.stats`.
   - What's unclear: After migration, `env.stats` is undefined (v2 envelope has no flat stats). The listener will incorrectly return `ZERO_STATS` for both practices on cross-tab writes.
   - Recommendation: Update the storage event handler to call `loadPractices()` and refresh both stats slices.
   - RESOLVED: The cross-tab `storage` event handler is updated in plan 30-04 to call `loadPractices()` and refresh BOTH `setResonantStats` and `setNaviKriyaStats` — never the orphaned flat `env.stats` via `loadStats()` (Pitfall 6 handling; threat T-30-10).

---

## Environment Availability

Step 2.6: SKIPPED — Phase 30 is a pure code refactor with no external tool dependencies beyond the existing project build chain (Node, npm, Vite, Vitest). All tooling is verified operational from prior phases.

---

## Validation Architecture

### Test Framework

| Property | Value |
|----------|-------|
| Framework | Vitest 4.1.5 |
| Config file | `vite.config.ts` (test section, environment: jsdom, setupFiles: ./vitest.setup.ts) |
| Quick run command | `npm run test:run -- src/storage/practices.test.ts` |
| Full suite command | `npm run test:run` |

### Phase Requirements → Test Map

| Req ID | Behavior | Test Type | Automated Command | File Exists? |
|--------|----------|-----------|-------------------|-------------|
| PRACTICE-01 | PracticeToggle renders two pills, clicking switches active practice | unit | `npm run test:run -- src/components/PracticeToggle.test.tsx` | ❌ Wave 0 |
| PRACTICE-01 | PracticeToggle passes correct aria-pressed | unit | same | ❌ Wave 0 |
| PRACTICE-02 | loadPractices returns coerced resonant settings from stored data | unit | `npm run test:run -- src/storage/practices.test.ts` | ❌ Wave 0 |
| PRACTICE-02 | saveActivePractice persists to envelope and loadActivePractice reads it back | unit | same | ❌ Wave 0 |
| PRACTICE-02 | coerceNaviKriyaSettings returns defaults for unknown input | unit | `npm run test:run -- src/domain/naviKriyaSettings.test.ts` | ❌ Wave 0 |
| PRACTICE-02 | coerceNaviKriyaSettings rounds non-multiple-of-4 frontCount down | unit | same | ❌ Wave 0 |
| PRACTICE-03 | PracticeToggle is disabled when inSessionView=true, not disabled when false | unit | `npm run test:run -- src/components/PracticeToggle.test.tsx` | ❌ Wave 0 |
| PRACTICE-04 | migrateEnvelope(v1Envelope, 1) coerces settings+stats into practices.resonant | unit | `npm run test:run -- src/storage/storage.test.ts` | ❌ (extend existing) |
| PRACTICE-04 | readEnvelope with v1 disk data returns practices.resonant populated | unit | same | ❌ (extend existing) |
| PRACTICE-04 | migrateEnvelope is idempotent on v2 data (fromVersion=2 no-op) | unit | same | ❌ (extend existing) |
| PRACTICE-05 | SettingsDialog renders all shared chrome pickers (no per-practice controls) | unit | existing tests pass | ✅ |
| PRACTICE-06 | Practice-aware SettingsForm renders resonant knobs when practice=resonant | unit | `npm run test:run -- src/components/SettingsForm.test.tsx` | ❌ (extend existing) |
| PRACTICE-06 | Practice-aware SettingsForm renders NK scaffold (empty) when practice=naviKriya | unit | same | ❌ (extend existing) |

### Sampling Rate

- **Per task commit:** `npm run test:run -- src/storage/practices.test.ts src/storage/storage.test.ts`
- **Per wave merge:** `npm run test:run`
- **Phase gate:** Full suite green before `/gsd-verify-work`

### Wave 0 Gaps

- [ ] `src/domain/naviKriyaSettings.test.ts` — covers PRACTICE-02 (NK coercer, validators, defaults)
- [ ] `src/storage/practices.test.ts` — covers PRACTICE-02 (coercePractices, loadPractices, saveActivePractice, resetPracticeStats, recordResonantSession)
- [ ] `src/components/PracticeToggle.test.tsx` — covers PRACTICE-01, PRACTICE-03
- [ ] Extend `src/storage/storage.test.ts` — covers PRACTICE-04 (migrateEnvelope v1→v2 ladder, idempotency)
- [ ] Extend `src/components/SettingsForm.test.tsx` — covers PRACTICE-06 (practice-aware dispatch)

---

## Security Domain

`security_enforcement` is not set to false in config, so this section is required.

### Applicable ASVS Categories

| ASVS Category | Applies | Standard Control |
|---------------|---------|-----------------|
| V2 Authentication | No | No auth in this app |
| V3 Session Management | No | App session is a breathing timer, not auth session |
| V4 Access Control | No | Single-user app |
| V5 Input Validation | Yes | `coerceNaviKriyaSettings` + `coerceActivePractice` — non-throwing, per-field, prototype-pollution-safe coercers (existing pattern) |
| V6 Cryptography | No | No encryption; localStorage is cleartext by design |

### Known Threat Patterns

| Pattern | STRIDE | Standard Mitigation |
|---------|--------|---------------------|
| Prototype pollution via localStorage payload | Tampering | Existing pattern: coercers never spread `raw` into a prototype-accessible object; only read named keys from `r` (verified in prefs.ts, T-14-01, T-25-01) |
| Malformed `frontCount` causing NaN/Infinity in session arithmetic | Tampering | `isValidFrontCount` rejects non-finite, non-integer, non-multiple-of-4 values; coercer falls back to default |
| Cross-tab stale stats after practice switch | Spoofing (data integrity) | Cross-tab storage event listener updated to read from `practices` subtree |

---

## Sources

### Primary (HIGH confidence)

- `src/storage/storage.ts` — current `Envelope` type, `STATE_VERSION = 1`, `migrateEnvelope` no-op, `readEnvelope`/`writeEnvelope` implementation [VERIFIED: codebase]
- `src/storage/prefs.ts` — `coercePrefs` pattern (prototype-pollution-safe, non-throwing, per-field) [VERIFIED: codebase]
- `src/storage/settings.ts` — `coerceSettings` pattern [VERIFIED: codebase]
- `src/storage/stats.ts` — `coerceStats`, `recordSession`, `resetStats`, `ZERO_STATS` [VERIFIED: codebase]
- `src/domain/settings.ts` — existing enum/validator pattern (`isValid*`, `DEFAULT_*`) [VERIFIED: codebase]
- `src/app/App.tsx` — current wiring of settings/stats/prefs, session engine, `inSessionView`, `persistedSetSettings` [VERIFIED: codebase]
- `src/components/SettingsForm.tsx` — current resonant-only form structure [VERIFIED: codebase]
- `src/components/StatsFooter.tsx` / `ResetStatsDialog.tsx` — current props/rendering [VERIFIED: codebase]
- `index.html` line 18 — FOUC script hardcodes `'hrv:state:v1'` key [VERIFIED: codebase]
- `.claude/skills/spike-findings-hrv/references/multi-practice-architecture.md` — PracticeId shape, AppState, migration approach, what to avoid [VERIFIED: spike reference]
- `.claude/skills/spike-findings-hrv/references/navi-kriya-practice.md` — `NaviKriyaSettings` interface, defaults, LEAD_MS [VERIFIED: spike reference]
- `.claude/skills/spike-findings-hrv/sources/002-switcher-ux/README.md` — top segmented control winner [VERIFIED: spike reference]

### Secondary (MEDIUM confidence)

- `.planning/phases/30-multi-practice-architecture-switcher/30-CONTEXT.md` — locked decisions D-01 through D-08 [VERIFIED: planning artifact]
- `.planning/REQUIREMENTS.md` — PRACTICE-01..06 requirement text [VERIFIED: planning artifact]

### Tertiary (LOW confidence)

- None.

---

## Metadata

**Confidence breakdown:**
- Standard Stack: HIGH — no new libraries; all existing
- Architecture: HIGH — migration seam, coercer pattern, App.tsx wiring all verified directly in source
- NaviKriyaSettings data model: HIGH — spike reference is authoritative and matches CONTEXT.md D-02
- Pitfalls: HIGH — derived from direct code reading of the exact files that must change
- Test gaps: HIGH — verified existing test file structure and coverage

**Research date:** 2026-05-17
**Valid until:** 2026-06-17 (stable codebase; no fast-moving dependencies)
