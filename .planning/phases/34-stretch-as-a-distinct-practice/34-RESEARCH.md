# Phase 34: Stretch as a Distinct Practice - Research

**Researched:** 2026-05-18
**Domain:** React/TypeScript — practice model extension, storage migration, segmented-control A/B, i18n
**Confidence:** HIGH

---

<user_constraints>
## User Constraints (from CONTEXT.md)

### Locked Decisions

- **D-01:** Stretch moves out of HRV entirely. The resonant practice becomes standard-only — `SessionMode`, `MODE_OPTIONS`, the `mode` field, and `ModeToggle` retire from the resonant practice.
- **D-02:** Settings types split. Resonant `SessionSettings` trims to `bpm`, `ratio`, `durationMinutes`. New `StretchSettings` carries `ratio`, `initialBpm`, `targetBpm`, `warmUpMinutes`, `rampDurationMinutes`, `coolDownMinutes`. `durationMinutes` is computed (read-only) for stretch and stays OUT of `StretchSettings`.
- **D-03:** `STATE_VERSION` bumps 2→3; `migrateEnvelope` gains an idempotent v2→v3 ladder step.
- **D-04:** Stretch config migrates — the ramp fields are lifted from `practices.resonant.settings` into `practices.stretch.settings`. The orphaned resonant fields are left in place (do not prune).
- **D-05:** Stretch stats start fresh — `practices.stretch.stats` is seeded with `ZERO_STATS`. `practices.resonant.stats` is left untouched.
- **D-06:** Both switcher treatments are built. Selection is `VITE_SWITCHER_TREATMENT` build-time env var. NOT a user-facing setting.
- **D-07:** Missing/invalid `VITE_SWITCHER_TREATMENT` falls back to treatment A (text-only pills).
- **D-08:** Treatment B glyphs: HRV = orb/circle, Stretch = ramp/descending line, Navi = counting dots. Small inline SVGs styled with theme tokens, in the spirit of `CueGlyph`.
- **D-09:** Stretch practice screen mirrors HRV screen — shared orb, inline per-practice controls, practice heading, stats footer. No new Stretch-specific screen element.
- **D-10:** Practice copy: switcher label and practice heading both "Stretch" (EN) / "Alongar" (PT-BR).
- **D-11:** Switcher order: HRV · Stretch · Navi (`PRACTICE_IDS = ['resonant', 'stretch', 'naviKriya']`).

### Claude's Discretion

- Exact `StretchSettings` field set and coercer shape (within D-02 constraints) — mirror `coerceNaviKriyaSettings`.
- Whether the in-session switcher lock is dimmed-in-place — reuse the established posture.
- How treatment A vs B is wired into `PracticeToggle` (one component branching on treatment vs two) — implementation detail.
- Test reworking for the removed `mode`/`ModeToggle` surface.

### Deferred Ideas (OUT OF SCOPE)

- Picking a single final switcher treatment.
- A fourth+ practice.
- v1.x carry-forward tech debt.
- Broad HRV+Navi config-values audit.
</user_constraints>

<phase_requirements>
## Phase Requirements

| ID | Description | Research Support |
|----|-------------|------------------|
| STRETCH-01 | User can switch between HRV, Stretch, and Navi using the top segmented control above the orb | PracticeToggle extended to 3 pills; PRACTICE_IDS gains 'stretch'; coerceActivePractice updated |
| STRETCH-02 | 3-practice switcher stays legible at 320px in EN/PT-BR; ships both label treatments via developer-only toggle | VITE_SWITCHER_TREATMENT build-time env var; treatment A/B branch in PracticeToggle; spike 007 confirmed 320px fit |
| STRETCH-03 | Stretch has its own per-practice settings, persisted across reloads | StretchSettings type + coerceStretchSettings + saveStretchSettings + PracticeMap gains stretch slice |
| STRETCH-04 | Stretch records its own per-practice stats, separate from HRV and Navi | recordStretchSession + practices.stretch.stats; PracticeMap gains stretch stats |
| STRETCH-05 | Returning user's HRV/Navi data survives upgrade; prior Stretch config preserved | v2→v3 migrateEnvelope step: lift resonant stretch fields → practices.stretch.settings; seed ZERO_STATS |
| STRETCH-06 | All new Stretch UI copy in EN + PT-BR | UiStrings.practice gains stretch fields; strings.ts updated for both locales |
</phase_requirements>

---

## Summary

Phase 34 promotes an intra-practice `mode` into a first-class `PracticeId`. The architectural scaffolding is already proven — Phase 30 introduced the `practices` map + `PracticeMap` + `coercePracticeSlice` + `resetPracticeStats` templates that a third practice slots directly into. The migration ladder in `migrateEnvelope` has an explicit "lossless, idempotent, orphan-tolerant" contract and an existing v1→v2 step to clone. The 3-practice switcher visual fit was confirmed in spike 007 at 320px for both EN and PT-BR labels.

The primary work is a settings-type bifurcation (D-02) that ripples through `sessionController.ts`, `stretchRamp.ts`, `storage/settings.ts`, `SettingsForm.tsx`, and `App.tsx`. Every site that branches on `settings.mode === 'stretch'` must migrate to branching on the active practice identity (`activePractice === 'stretch'`) using the correctly-typed `StretchSettings` object. The `mode` field and its infrastructure (`SessionMode`, `MODE_OPTIONS`, `isValidMode`, `ModeToggle`) retire from the resonant codebase entirely.

The switcher A/B toggle is a contained build-time branch wired through `vite.config.ts` `define`; the fallback-to-A rule (D-07) is a simple `if/else` on the compile-time constant. Treatment B requires inline SVG glyphs for three practices styled with theme CSS variables, mirroring the existing `CueGlyph` component pattern.

**Primary recommendation:** Execute in four dependency-ordered clusters: (1) domain layer — types + coercers + migration; (2) session engine — sessionController + stretchRamp consuming StretchSettings; (3) UI — PracticeToggle A/B + SettingsForm stretch branch + App.tsx wiring; (4) copy + strings.ts.

---

## Architectural Responsibility Map

| Capability | Primary Tier | Secondary Tier | Rationale |
|------------|-------------|----------------|-----------|
| Practice type system (`PracticeId`, `StretchSettings`) | Domain (`src/domain/`) | Storage boundary | Types define the contract; storage coercers validate against it |
| Storage migration v2→v3 | Storage (`src/storage/storage.ts`) | — | `migrateEnvelope` is the single migrate-on-read seam |
| Stretch practice slice (settings/stats) | Storage (`src/storage/practices.ts`) | — | Mirrors the resonant/naviKriya slice pattern |
| Session engine (stretch ramp wiring) | Domain (`src/domain/sessionController.ts`, `stretchRamp.ts`) | — | Pure functions — no React, no I/O |
| Practice switcher UI (A/B treatments) | Component (`src/components/PracticeToggle.tsx`) | Build config (`vite.config.ts`) | VITE_SWITCHER_TREATMENT is a compile-time define; PracticeToggle branches on it |
| Per-practice settings controls | Component (`src/components/SettingsForm.tsx`) | — | Already practice-aware; gains `stretch` branch |
| App state wiring (stats, active practice, session plumbing) | App (`src/app/App.tsx`) | — | Single owner of cross-cutting practice + session state |
| Copy / i18n | Content (`src/content/strings.ts`) | — | `UiStrings.practice` gains stretch fields; both locales |

---

## Standard Stack

No new dependencies are required. This phase adds a third practice instance to the existing machinery.

### Core (existing, relevant to this phase)

| Library | Version | Purpose | Notes |
|---------|---------|---------|-------|
| React | 19.x | Component tree + hooks | No change |
| TypeScript | 5.x | Type safety | Discriminated union for StretchSettings |
| Vitest | (existing) | Test runner | `vitest.config.ts` → `defineConfig` from `vitest/config` |
| @testing-library/react | (existing) | App-level integration tests | Used for App.persistence.test.tsx patterns |

**Installation:** No new packages.

---

## Architecture Patterns

### System Architecture Diagram

```
localStorage (STATE_KEY = 'hrv:state:v1')
  └── Envelope { version: 3, practices: { resonant, stretch, naviKriya }, activePractice }
        │
        ▼ readEnvelope()  ──►  migrateEnvelope(env, fromVersion)
                                   │
                                   ├── fromVersion < 2: v1→v2 (existing: fold flat → resonant)
                                   └── fromVersion < 3: v2→v3 (NEW: lift stretch fields → practices.stretch)
                                              │
                                              ▼
                              coercePractices(raw.practices)
                                   ├── resonant:  coerceSettings(raw.resonant.settings)     → SessionSettings (standard-only)
                                   ├── stretch:   coerceStretchSettings(raw.stretch.settings) → StretchSettings (ramp fields)
                                   └── naviKriya: coerceNaviKriyaSettings(raw.naviKriya.settings) → NaviKriyaSettings
                                              │
                                              ▼
                              App.tsx (initialPractices, activePractice)
                                   │
                                   ├── activePractice === 'resonant'  → useSessionEngine(resonantSettings)
                                   ├── activePractice === 'stretch'   → useSessionEngine(stretchAsBreathingPlan)
                                   │                                      + buildStretchSegments(stretchSettings, ratio)
                                   └── activePractice === 'naviKriya' → useNKEngine()
                                              │
                                              ▼
                              PracticeToggle (3 pills: HRV · Stretch · Navi)
                                   ├── VITE_SWITCHER_TREATMENT=A → text-only pills
                                   └── VITE_SWITCHER_TREATMENT=B → icon SVG + label
```

### Recommended Project Structure (changes only)

```
src/
├── domain/
│   ├── settings.ts          # SessionSettings trims to 3 fields; StretchSettings added; SessionMode/MODE_OPTIONS/isValidMode/ModeToggle removed
│   ├── sessionController.ts # mode==='stretch' branches → activePractice==='stretch' + StretchSettings
│   └── stretchRamp.ts       # buildStretchSegments sig: (settings: StretchSettings, ratio: RatioLabel)
├── storage/
│   ├── storage.ts           # STATE_VERSION 2→3; migrateEnvelope gains v2→v3 step
│   └── practices.ts         # PracticeId gains 'stretch'; PracticeMap gains stretch slot; coerceStretchSettings; saveStretchSettings; recordStretchSession
├── components/
│   ├── PracticeToggle.tsx   # 3-pill PRACTICE_IDS; A/B treatment branch on VITE_SWITCHER_TREATMENT
│   ├── ModeToggle.tsx       # DELETED (retired by D-01)
│   └── SettingsForm.tsx     # resonant branch standard-only; 'stretch' branch added
├── app/
│   └── App.tsx              # stretch stats state; 3-way activeStats/activePracticeName; mode===stretch → activePractice===stretch checks
└── content/
    └── strings.ts           # UiStrings.practice gains stretchName, stretchHeading, stretchHeader
```

### Pattern 1: v2→v3 Migration Step in `migrateEnvelope`

**What:** Idempotent, lossless, orphan-tolerant ladder step. Lifts stretch ramp fields from the `practices.resonant.settings` unknown blob into a new `practices.stretch` slice.

**When to use:** Applied in `readEnvelope` before per-field coercers run, every time a v2 or earlier envelope is read from disk.

**Key implementation detail:** The step reads fields from the RAW (uncoerced) `practices.resonant.settings` blob — `initialBpm`, `targetBpm`, `warmUpMinutes`, `coolDownMinutes`, `rampDurationMinutes` — and uses them as the seed for `practices.stretch.settings`. The resonant settings blob is left untouched (orphan fields remain). The stretch stats slice is seeded as `ZERO_STATS`. The whole step is guarded by `fromVersion < 3`.

```typescript
// Source: src/storage/storage.ts — migrateEnvelope, extending the existing v1→v2 pattern
export function migrateEnvelope(env: Envelope, fromVersion: number): Envelope {
  let out: Envelope = { ...env }

  if (fromVersion < 2) {
    // Existing v1→v2 step (unchanged)
    out = {
      ...out,
      practices: {
        resonant: { settings: out.settings, stats: out.stats },
      },
      activePractice: 'resonant',
    }
  }

  if (fromVersion < 3) {
    // v2→v3: create the stretch slice.
    // Seed settings from the resonant blob (still unknown — coercers validate downstream).
    // Leave the resonant blob untouched (orphan fields are fine — v1→v2 precedent).
    // Seed stats with ZERO_STATS shape (literal, not imported — storage.ts has no domain dep).
    const practicesRaw = out.practices as Record<string, unknown> | undefined ?? {}
    const resonantRaw = (practicesRaw as Record<string, unknown>)['resonant'] as Record<string, unknown> | undefined ?? {}
    const resonantSettingsRaw = (resonantRaw as Record<string, unknown>)['settings']
    out = {
      ...out,
      practices: {
        ...(out.practices as Record<string, unknown>),
        stretch: {
          settings: resonantSettingsRaw,   // carries ramp fields; coerceStretchSettings validates downstream
          stats: {                          // ZERO_STATS literal (no import needed)
            totalSessions: 0,
            totalElapsedSeconds: 0,
            lastSessionAtMs: null,
            lastSessionDurationSeconds: null,
          },
        },
      },
    }
  }

  return out
}
```

**Idempotency:** A v3 envelope (`fromVersion >= 3`) skips both steps. A v2 envelope that already ran the migration on the last write is re-read with `fromVersion = 2` (disk still shows 2 until writeEnvelope stamps 3), so the step re-runs on each read until the first write — this is correct and safe because the step is purely constructive (no data destroyed).

**Important:** `STATE_VERSION` must be updated to `3 as const`. `writeEnvelope` stamps `STATE_VERSION` on every successful write, so after the first write the on-disk version becomes 3 and the step is skipped on subsequent reads.

### Pattern 2: `StretchSettings` Type and `coerceStretchSettings`

**What:** A new domain type carrying only the ramp knobs (`ratio`, `initialBpm`, `targetBpm`, `warmUpMinutes`, `rampDurationMinutes`, `coolDownMinutes`). No `durationMinutes` — it is computed from the segment table.

**Current state:** `settings.ts` today has `SessionSettings` carrying all fields including `mode`. After D-01/D-02, the resonant `SessionSettings` type trims to three fields. `StretchSettings` is the new type.

**`StretchSettings` field set (D-02 constraint):** MUST include `ratio` because `buildStretchSegments(settings, ratio)` passes it separately today — after the refactor `settings` IS `StretchSettings` and `ratio` lives there, so the signature simplifies to `buildStretchSegments(settings: StretchSettings)`.

```typescript
// Source: src/domain/settings.ts — new type, mirroring NaviKriyaSettings isolation pattern

// After D-02: SessionSettings is standard-only
export interface SessionSettings {
  bpm: number
  ratio: RatioLabel
  durationMinutes: DurationOption
  // mode, initialBpm, targetBpm, warmUpMinutes, coolDownMinutes, rampDurationMinutes REMOVED
}

// New type for the stretch practice
export interface StretchSettings {
  ratio: RatioLabel             // consumed by buildStretchSegments
  initialBpm: number
  targetBpm: number
  warmUpMinutes: WarmUpMinutes
  rampDurationMinutes: number
  coolDownMinutes: CoolDownMinutes
  // durationMinutes is computed — NOT stored (D-02)
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

**`coerceStretchSettings` in `src/storage/practices.ts`** mirrors `coerceNaviKriyaSettings`:

```typescript
// Source: pattern from coerceNaviKriyaSettings — src/storage/practices.ts
export function coerceStretchSettings(raw: unknown): StretchSettings {
  const r = asRecord(raw)
  return {
    ratio:               isValidRatio(r.ratio)                   ? r.ratio               : DEFAULT_STRETCH_SETTINGS.ratio,
    initialBpm:          isValidBpm(r.initialBpm)                ? r.initialBpm          : DEFAULT_STRETCH_SETTINGS.initialBpm,
    targetBpm:           isValidBpm(r.targetBpm)                 ? r.targetBpm           : DEFAULT_STRETCH_SETTINGS.targetBpm,
    warmUpMinutes:       isValidWarmUp(r.warmUpMinutes)          ? r.warmUpMinutes       : DEFAULT_STRETCH_SETTINGS.warmUpMinutes,
    rampDurationMinutes: isValidRampDuration(r.rampDurationMinutes) ? r.rampDurationMinutes : DEFAULT_STRETCH_SETTINGS.rampDurationMinutes,
    coolDownMinutes:     isValidCoolDown(r.coolDownMinutes)      ? r.coolDownMinutes     : DEFAULT_STRETCH_SETTINGS.coolDownMinutes,
  }
}
```

**`PracticeMap` after D-03:**

```typescript
export type PracticeId = 'resonant' | 'stretch' | 'naviKriya'

export interface PracticeMap {
  resonant:   PracticeSlice<SessionSettings>
  stretch:    PracticeSlice<StretchSettings>
  naviKriya:  PracticeSlice<NaviKriyaSettings>
}
```

**`coercePractices` after update:**

```typescript
export function coercePractices(raw: unknown): PracticeMap {
  const r = asRecord(raw)
  return {
    resonant:  coercePracticeSlice(r.resonant,  coerceSettings),
    stretch:   coercePracticeSlice(r.stretch,   coerceStretchSettings),
    naviKriya: coercePracticeSlice(r.naviKriya, coerceNaviKriyaSettings),
  }
}
```

**`coerceActivePractice` after update:**

```typescript
export function coerceActivePractice(raw: unknown): PracticeId {
  return raw === 'resonant' || raw === 'stretch' || raw === 'naviKriya' ? raw : 'resonant'
}
```

### Pattern 3: `sessionController.ts` and `stretchRamp.ts` Refactor

**Current state:** Both files import `SessionSettings` and branch on `lockedSettings.mode === 'stretch'`. After D-01/D-02, there is no `mode` field. The session engine must accept a practice-typed union or be called differently per active practice.

**Approach A (simplest, lowest blast radius):** Keep `sessionController.ts` operating on `SessionSettings` for the resonant path unchanged. Add a parallel `startStretchSession(stretchSettings: StretchSettings, nowMs: number)` function that builds the segment table directly from `StretchSettings`. `App.tsx` calls the correct start function based on `activePractice`.

**Approach B (unified):** Extend `SessionState` to carry `StretchSettings | null` and accept a discriminated union. More elegant but larger surface.

**Recommendation (Claude's discretion):** Approach A mirrors how Navi Kriya has its own engine (`useNKEngine`) rather than folding into `useSessionEngine`. The resonant session controller becomes strictly standard; the stretch session controller is a thin wrapper around `buildStretchSegments` + `getStretchFrame`.

**`buildStretchSegments` signature change** — today `(settings: SessionSettings, ratio: RatioLabel)`. After D-02, `settings` is `StretchSettings` which includes `ratio`, so the signature simplifies:

```typescript
// Source: src/domain/stretchRamp.ts — after refactor
export function buildStretchSegments(settings: StretchSettings): StretchSegment[]
// ratio is now settings.ratio internally — callers no longer pass it separately
```

**`computeStretchTotalMs`** today is `(settings: SessionSettings)` — changes to `(settings: StretchSettings)`.

**All existing `mode === 'stretch'` branches to migrate:**

| File | Location | Current | After |
|------|----------|---------|-------|
| `sessionController.ts:45` | `startSession` | `const isStretch = lockedSettings.mode === 'stretch'` | Call site moves to `App.tsx`; `startSession` becomes standard-only or a new `startStretchSession` is added |
| `sessionController.ts:86` | `extendTimedSession` | `if (state.lockedSettings.mode === 'stretch' \|\| ...)` | Mode check removed; stretch sessions never reach this function |
| `stretchRamp.ts:73` | `buildStretchSegments` | `settings: SessionSettings` param | `settings: StretchSettings` |
| `stretchRamp.ts:223` | `computeStretchTotalMs` | `settings: SessionSettings` param | `settings: StretchSettings` |
| `App.tsx:320` | lead-in placeholder frame | `if (settings.mode === 'stretch')` | `if (activePractice === 'stretch')` using `stretchSettings` state |
| `SettingsForm.tsx:73` | `isStretch` derivation | `const isStretch = settings.mode === 'stretch'` | `activePractice === 'stretch'` (form receives correct typed settings) |
| `SettingsForm.tsx:139` | branch condition | `activePractice === 'resonant'` (2-way) | `activePractice === 'resonant'`, `activePractice === 'stretch'`, fallthrough for naviKriya |

### Pattern 4: `PracticeToggle` — 3-pill Extension + A/B Treatment

**Current state:** `PracticeToggle.tsx` is a 2-pill component with a local `PracticeId = 'resonant' | 'naviKriya'` alias and hardcoded `PRACTICE_IDS`. The props type uses the local alias.

**After Phase 34:**

1. Import `PracticeId` from `src/storage/practices.ts` (reconcile the local alias the Phase 30 comment already flagged).
2. `PRACTICE_IDS: PracticeId[] = ['resonant', 'stretch', 'naviKriya']` (D-11).
3. `strings.practiceNames` becomes `Record<PracticeId, string>` — gains `stretch` key.
4. The treatment branch selects how each pill renders.

**Treatment A (existing behavior, extended to 3 pills):**

```tsx
// Text-only pill — identical to today's rendering, no structural change needed
<button>{strings.practiceNames[id]}</button>
```

**Treatment B (icon + label):**

```tsx
// Source: spike 007 pattern; glyphs styled as inline SVGs with theme tokens
<button>
  <PracticeGlyph id={id} />
  <span>{strings.practiceNames[id]}</span>
</button>
```

**Build-time branch wiring:**

```typescript
// vite.config.ts — add to defineConfig
define: {
  __SWITCHER_TREATMENT__: JSON.stringify(process.env.VITE_SWITCHER_TREATMENT ?? 'A'),
}
```

```typescript
// PracticeToggle.tsx — top of file
declare const __SWITCHER_TREATMENT__: string
const TREATMENT: 'A' | 'B' =
  __SWITCHER_TREATMENT__ === 'B' ? 'B' : 'A'  // D-07: invalid → fallback to A
```

**Important:** Vite's `define` replaces the identifier at build time (string replacement, not an env variable object access). The `declare const` tells TypeScript the constant exists at runtime without an import. This is the standard Vite pattern for compile-time flags.

**Glyphs (treatment B, D-08):**

The spike 007 harness used placeholder glyphs. The build-time design pass must produce final inline SVGs:

- HRV (orb): a circle, mirroring the breathing orb. Styled `stroke="var(--color-breathing-accent)"`.
- Stretch (ramp): a descending staircase line or diagonal, representing the BPM walk-down.
- Navi (counting dots): three dots, representing OM counting.

All SVGs use `currentColor` or CSS variable strokes so they respond to theme token changes without hardcoded colors.

### Pattern 5: `SettingsForm.tsx` — Stretch Branch

**Current state:** `SettingsForm` already has a 2-way branch: `activePractice === 'resonant'` (shows resonant knobs) vs the fallthrough (NK scaffold). After Phase 34 the resonant branch must become standard-only and a `'stretch'` branch must be added.

**Key props change:** The form needs typed `StretchSettings` for the stretch branch. Options:

- Pass `stretchSettings` + `onStretchSettingsChange` as optional props alongside `settings` + `onChange` (mirrors `nkSettings`/`onNKSettingsChange` pattern). This keeps the prop surface symmetric and avoids a discriminated union on the component itself.

**Resonant branch after D-01:** `ModeToggle` is removed. The standard branch renders only `bpm`, `ratio`, `durationMinutes` steppers — no stretch fields.

**Stretch branch:** Renders `initialBpm`, `targetBpm`, `ratio`, `warmUpMinutes`, `rampDurationMinutes`, `coolDownMinutes` steppers (identical to today's stretch knobs in the resonant branch), plus the computed read-only `durationMinutes` display. The `updateInitialBpm` helper that auto-corrects `targetBpm` stays — it just moves into the stretch branch.

### Pattern 6: `App.tsx` — Stretch State Wiring

**State additions:**

```typescript
const [stretchSettings, setStretchSettings] = useState<StretchSettings>(
  () => initialPractices.stretch.settings,
)
const [stretchStats, setStretchStats] = useState<PersistedStats>(
  () => initialPractices.stretch.stats,
)
```

**Active stats and name (3-way):**

```typescript
const activeStats =
  activePractice === 'resonant'  ? resonantStats  :
  activePractice === 'stretch'   ? stretchStats   : naviKriyaStats

const activePracticeName =
  activePractice === 'resonant'  ? uiStrings.practice.resonantHeading  :
  activePractice === 'stretch'   ? uiStrings.practice.stretchHeading   :
  uiStrings.practice.naviKriyaHeading
```

**Lead-in placeholder frame (App.tsx:320):**

```typescript
// Before: if (settings.mode === 'stretch')
// After:
if (activePractice === 'stretch') {
  return getStretchFrame(buildStretchSegments(stretchSettings), 0)
}
```

**Storage listener (cross-tab):** The `onStorage` handler must also update `stretchStats`:

```typescript
const practices = loadPractices()
setResonantStats(practices.resonant.stats)
setStretchStats(practices.stretch.stats)
setNaviKriyaStats(practices.naviKriya.stats)
```

**Header/title:** Stretch practice uses the `stretchHeader`/`stretchHeading` strings; resonant keeps `uiStrings.app.header`/`uiStrings.app.title`.

### Pattern 7: `strings.ts` — Stretch Copy Fields

**`UiStrings.practice` gains:**

```typescript
readonly practice: {
  // existing
  toggleLabel: string
  resonantName: string
  naviKriyaName: string
  resonantHeading: string
  naviKriyaHeading: string
  naviKriyaHeader: string
  // ...
  // NEW for stretch
  stretchName: string      // short switcher label: "Stretch" / "Alongar"
  stretchHeading: string   // practice heading: "Stretch" / "Alongar" (D-10: same value)
  stretchHeader: string    // app header: "Stretch practice" / "Prática de Alongar" (or equivalent)
}
```

**Spike 007 confirmed copy:** "Stretch" (EN) and "Alongar" (PT-BR) fit at 320px.

**`LOCKED_COPY` guard:** The locked copy (`inspiredByForrest`, `medicalAdviceLine`, `affiliationLine`) is unchanged by this phase. The `strings.test.ts` exhaustiveness suite will automatically catch missing fields on the new `stretchName`/`stretchHeading`/`stretchHeader` if test cases are added for them.

### Pattern 8: `ModeToggle.tsx` Retirement

`ModeToggle.tsx` is retired (D-01). Its only consumers are:

1. `SettingsForm.tsx` (the Standard/Stretch switch in the resonant branch) — removed.
2. `SettingsForm.tsx` NK branch uses `ModeToggle` as a generic toggle for `perOmCue` — this usage must be preserved via a renamed or kept component.

**Resolution:** The NK `perOmCue` toggle uses `ModeToggle` as a generic boolean toggle, not as a mode selector. Options:
- Keep `ModeToggle.tsx` but rename it `BooleanToggle.tsx` or `InlineToggle.tsx` to remove the "mode" semantics.
- Or rename the file/component but retain the implementation — the NK usage continues unchanged.

This is Claude's discretion — the planner should pick one approach and document it.

### Anti-Patterns to Avoid

- **Pruning orphan fields in migration:** The v1→v2 step explicitly left `settings`/`stats` as orphans. The v2→v3 step must also leave the stretch ramp fields in `practices.resonant.settings` untouched. Adding pruning logic breaks the "lossless" invariant.
- **Adding `durationMinutes` to `StretchSettings`:** D-02 explicitly forbids this — it is computed from the segment table, not stored.
- **Importing `ZERO_STATS` into `storage.ts`:** `storage.ts` has no domain/stats import today. The v2→v3 step that seeds stretch stats should use an inline object literal (`{ totalSessions: 0, ... }`) or import from `./stats` only if that file already imports from `./storage` (check for circular dep: `stats.ts` does import from `storage.ts`, so `storage.ts` importing `stats.ts` would be circular). Use the inline literal.
- **Checking `settings.mode` at runtime after the refactor:** Every `mode === 'stretch'` guard that survives the refactor is a latent bug — use `activePractice === 'stretch'` consistently.
- **Exposing `VITE_SWITCHER_TREATMENT` in the Settings dialog:** D-06 is explicit. The env var is build-time only; it must not appear as a user setting.

---

## Don't Hand-Roll

| Problem | Don't Build | Use Instead | Why |
|---------|-------------|-------------|-----|
| Per-field non-throwing storage coercion | Custom validate-and-discard | `asRecord` + `isValidXxx` predicates (existing pattern) | One drifted field must never discard the rest |
| Practice slice creation | Custom PracticeSlice factory | `coercePracticeSlice(raw, coerceStretchSettings)` (existing generic) | Identical stats + settings structure for every practice |
| Idempotent migration | Re-run check | `fromVersion < 3` guard (existing ladder pattern) | Ensures a re-read of a partially-migrated envelope doesn't double-migrate |
| Build-time feature flag | Runtime localStorage toggle | Vite `define` + `declare const` | D-06: NOT a user-facing setting; compile-time eliminates the dead code branch |

---

## Runtime State Inventory

> Not a rename/refactor/migration of a running service — the migration is a storage-envelope in-app migration. No external runtime systems hold stale state.

| Category | Items Found | Action Required |
|----------|-------------|------------------|
| Stored data | localStorage `hrv:state:v1` envelope with `practices.resonant.settings` carrying stretch fields | Code edit — `migrateEnvelope` v2→v3 step lifts fields on next read |
| Live service config | None — no external services | None |
| OS-registered state | None | None |
| Secrets/env vars | `VITE_SWITCHER_TREATMENT` (new, not a secret) — set in `.env.local` or CI | Document in `.env.example` |
| Build artifacts | None — PWA service worker regenerates on each build; no stale artifacts | None |

---

## Common Pitfalls

### Pitfall 1: Circular Import When Importing ZERO_STATS into storage.ts

**What goes wrong:** `storage.ts` needs a zero-stats seed for the v2→v3 migration. `ZERO_STATS` lives in `stats.ts`, which imports from `storage.ts`. Importing `stats.ts` from `storage.ts` creates a circular dependency that Vite may silently resolve to `undefined`.

**Why it happens:** `stats.ts → storage.ts → stats.ts` cycle.

**How to avoid:** Inline the zero-stats literal directly in the migration step:

```typescript
stats: { totalSessions: 0, totalElapsedSeconds: 0, lastSessionAtMs: null, lastSessionDurationSeconds: null }
```

**Warning signs:** `ZERO_STATS` is `undefined` at the migration call site; Vite emits a circular-dependency warning.

### Pitfall 2: `buildStretchSegments` Signature Mismatch After Refactor

**What goes wrong:** `buildStretchSegments` currently accepts `(settings: SessionSettings, ratio: RatioLabel)`. After D-02, if the signature is updated to `(settings: StretchSettings)` but call sites in `App.tsx` still pass two arguments, TypeScript catches it — but only if the import is updated. Test files that seed `SessionSettings` for stretch scenarios must be updated to use `StretchSettings`.

**How to avoid:** Search for all `buildStretchSegments(` call sites before removing the second parameter. Sites: `sessionController.ts:52`, `App.tsx:321`, `stretchRamp.test.ts` (if any).

### Pitfall 3: `coerceSettings` Still Returns mode/stretch Fields

**What goes wrong:** After the settings type split, `coerceSettings` (in `storage/settings.ts`) currently returns `SessionSettings` including `mode`, `initialBpm`, etc. If `SessionSettings` is trimmed to 3 fields but `coerceSettings` is not updated, TypeScript will flag the mismatch.

**How to avoid:** Update `coerceSettings` to return the trimmed `SessionSettings` (3 fields only). The stretch fields move into `coerceStretchSettings`.

### Pitfall 4: `validateSettings` Still Contains Stretch-mode Branch

**What goes wrong:** `validateSettings` in `src/domain/settings.ts` currently branches on `settings.mode === 'stretch'` to validate ramp fields. After D-01, this function should validate standard settings only. A matching `validateStretchSettings` function may be needed.

**How to avoid:** Split `validateSettings` the same way as the type. Standard validation = `bpm`, `ratio`, `durationMinutes`. Stretch validation = ramp fields. The session controller calls the correct one per practice.

### Pitfall 5: `ModeToggle` NK Usage Breaks After Retirement

**What goes wrong:** `ModeToggle` is used in `SettingsForm.tsx` for the NK `perOmCue` boolean toggle (line 280). If `ModeToggle` is deleted without updating this call site, NK settings break.

**How to avoid:** Rename `ModeToggle.tsx` rather than delete it, or extract the generic boolean toggle behavior before deleting. The NK import must be updated to the new name.

### Pitfall 6: `PracticeToggle` Local PracticeId Alias

**What goes wrong:** `PracticeToggle.tsx` defines a local `export type PracticeId = 'resonant' | 'naviKriya'` alias (flagged in Phase 30 comment: "plan 30-04 reconciles imports"). If not reconciled before adding `'stretch'`, two `PracticeId` types exist with different shapes, causing consumer type errors.

**How to avoid:** In the same PR that adds `'stretch'` to `practices.ts`, reconcile `PracticeToggle.tsx` to import `PracticeId` from `../storage/practices` and delete the local alias.

### Pitfall 7: v2→v3 Migration Not Idempotent on Re-read

**What goes wrong:** A v2 envelope on disk with `fromVersion = 2` runs the v2→v3 step on every `readEnvelope` call until the first `writeEnvelope`. If the step is not purely constructive (e.g., it modifies resonant fields), re-running it changes state.

**How to avoid:** The step only adds keys (`out.practices.stretch`); it never modifies existing keys. The spread `{ ...out.practices }` preserves all existing slices. Pure construction = inherently idempotent on re-run.

### Pitfall 8: `coerceActivePractice` Missing 'stretch' → Returning Users Lose Their Practice Selection

**What goes wrong:** A returning user who had `activePractice: 'stretch'` on disk will be coerced to `'resonant'` if `coerceActivePractice` is not updated. Their active practice resets on every load.

**How to avoid:** Add `|| raw === 'stretch'` to the guard in `coerceActivePractice` before shipping.

---

## Code Examples

### Migration Step — v2→v3 (idempotent, lossless, orphan-tolerant)

```typescript
// Source: src/storage/storage.ts — migrateEnvelope extension
if (fromVersion < 3) {
  const existingPractices = (out.practices ?? {}) as Record<string, unknown>
  const resonantSlice = (existingPractices['resonant'] ?? {}) as Record<string, unknown>
  const resonantSettings = resonantSlice['settings']  // unknown — coerceStretchSettings validates downstream

  out = {
    ...out,
    practices: {
      ...existingPractices,
      stretch: {
        settings: resonantSettings,  // seed with resonant's raw settings blob (carries ramp fields)
        stats: {
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

### `coerceActivePractice` — Updated

```typescript
// Source: src/storage/practices.ts
export function coerceActivePractice(raw: unknown): PracticeId {
  return raw === 'resonant' || raw === 'stretch' || raw === 'naviKriya' ? raw : 'resonant'
}
```

### `saveStretchSettings` — New (mirrors `saveResonantSettings`)

```typescript
// Source: pattern from saveResonantSettings — src/storage/practices.ts
export function saveStretchSettings(settings: StretchSettings, deps: StorageDeps = {}): void {
  const env = readEnvelope(deps)
  const practices = coercePractices(env.practices)
  writeEnvelope(
    { ...env, practices: { ...practices, stretch: { ...practices.stretch, settings } } },
    deps,
  )
}
```

### `recordStretchSession` — New (mirrors `recordResonantSession`)

```typescript
// Source: pattern from recordResonantSession — src/storage/practices.ts
export function recordStretchSession(
  elapsedMs: number,
  isComplete: boolean,
  deps: StorageDeps = {},
): PersistedStats {
  const env = readEnvelope(deps)
  const practices = coercePractices(env.practices)
  const stats = practices.stretch.stats
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

### Vite Define for Treatment Flag

```typescript
// Source: vite.config.ts — inside defineConfig({})
define: {
  // D-06: build-time only — NOT a user-facing setting
  // D-07: invalid or missing value falls back to 'A'
  __SWITCHER_TREATMENT__: JSON.stringify(
    process.env.VITE_SWITCHER_TREATMENT === 'B' ? 'B' : 'A'
  ),
},
```

### PracticeToggle A/B Branch

```typescript
// Source: src/components/PracticeToggle.tsx
declare const __SWITCHER_TREATMENT__: string
const TREATMENT: 'A' | 'B' = __SWITCHER_TREATMENT__ === 'B' ? 'B' : 'A'

// Inside the map:
{PRACTICE_IDS.map((id) => {
  const isActive = active === id
  return (
    <button key={id} type="button" disabled={disabled} aria-pressed={isActive}
            onClick={() => { onSwitch(id) }} className={pillClass(isActive)}>
      {TREATMENT === 'B' && <PracticeGlyph id={id} />}
      {strings.practiceNames[id]}
    </button>
  )
})}
```

---

## State of the Art

| Old Approach | Current Approach | When Changed | Impact |
|--------------|------------------|--------------|--------|
| `mode: 'standard' \| 'stretch'` inside resonant settings | `activePractice === 'stretch'` as a top-level practice identity | Phase 34 (this phase) | All mode branches replaced by practice checks; `SessionMode`/`MODE_OPTIONS`/`ModeToggle` retire |
| 2-practice `PracticeMap` (`resonant`, `naviKriya`) | 3-practice `PracticeMap` (`resonant`, `stretch`, `naviKriya`) | Phase 34 | Storage migration v2→v3; `coercePractices` gains third slot |
| `STATE_VERSION = 2` | `STATE_VERSION = 3` | Phase 34 | Triggers v2→v3 migration step on first read by new code |
| `PracticeToggle` local `PracticeId` alias | Import from `src/storage/practices` | Phase 34 (reconciliation flagged since Phase 30) | Resolves type divergence |

**Deprecated/outdated after this phase:**

- `SessionMode` type and `MODE_OPTIONS` constant: removed (no more intra-resonant mode concept).
- `isValidMode` predicate: removed.
- `mode` field on `SessionSettings`: removed.
- `ModeToggle` component (or renamed): retired from resonant use; NK use preserved under new name.
- `DEFAULT_SETTINGS.mode`: removed.

---

## Assumptions Log

| # | Claim | Section | Risk if Wrong |
|---|-------|---------|---------------|
| A1 | `ModeToggle` is ONLY used in two places: the resonant Standard/Stretch switch and the NK `perOmCue` toggle | Pattern 3 consumer table | A third consumer would also need updating; grep required during implementation |
| A2 | The Vite `define` approach for `__SWITCHER_TREATMENT__` compiles to a dead-code-eliminated branch at build time | Pattern 4 — build-time branch | If Vite's tree-shaking doesn't eliminate the dead branch, both treatment code paths ship; acceptable but non-ideal |
| A3 | `stretchRamp.ts` imports `SessionSettings` from `domain/settings.ts` and destructures the ramp fields directly — no intermediate type narrowing that would survive a type split without changes | Pattern 3 | If the import is via an alias or re-export, additional files may need updating |

---

## Open Questions

1. **`ModeToggle` rename vs keep**
   - What we know: NK `perOmCue` uses `ModeToggle` as a generic boolean toggle; the component content is reusable.
   - What's unclear: Whether to rename (`BooleanToggle`, `InlineToggle`) or keep the file under a different semantic name.
   - Recommendation: Rename to `BooleanToggle.tsx` — clearer intent, no semantic baggage from the retired "session mode" concept.

2. **`startStretchSession` vs unified `SessionState` union**
   - What we know: `sessionController.ts` today branches on `mode === 'stretch'` inside `startSession`. After the split, the controller must know which path to take without a `mode` field.
   - What's unclear: Whether to fork into `startSession` (standard only) + `startStretchSession` (stretch), or extend `SessionState` to carry a discriminant.
   - Recommendation: Fork into separate functions (Approach A) — lowest blast radius, mirrors NK/resonant separation.

3. **`StretchSettings.ratio` vs `SessionSettings.ratio` shared validator**
   - What we know: Both standard and stretch use `RatioLabel` and `isValidRatio`.
   - What's unclear: Nothing — both types share the same `ratio` field and the same validator. No conflict.

---

## Environment Availability

Step 2.6: SKIPPED — this phase makes no changes requiring external tools, services, or CLIs beyond the existing Node.js/npm toolchain already present.

---

## Validation Architecture

### Test Framework

| Property | Value |
|----------|-------|
| Framework | Vitest (via `vitest/config` in `vite.config.ts`) |
| Config file | `vite.config.ts` (`test: { environment: 'jsdom', globals: true, setupFiles: './vitest.setup.ts' }`) |
| Quick run command | `npx vitest run src/storage/storage.test.ts src/storage/practices.test.ts` |
| Full suite command | `npx vitest run` |

### Phase Requirements → Test Map

| Req ID | Behavior | Test Type | Automated Command | File Exists? |
|--------|----------|-----------|-------------------|-------------|
| STRETCH-01 | PracticeToggle renders 3 pills in correct order HRV·Stretch·Navi | unit | `npx vitest run src/components/PracticeToggle.test.tsx` | ❌ Wave 0 |
| STRETCH-02 | Treatment A is default when VITE_SWITCHER_TREATMENT unset/invalid; treatment B renders glyphs | unit | `npx vitest run src/components/PracticeToggle.test.tsx` | ❌ Wave 0 |
| STRETCH-02 | 320px legibility — confirmed by spike 007; no automated pixel test | manual | Spike 007 harness: `open .planning/spikes/007-three-practice-switcher/index.html` | n/a |
| STRETCH-03 | `saveStretchSettings` persists to `practices.stretch.settings`; `loadPractices().stretch.settings` round-trips | unit | `npx vitest run src/storage/practices.test.ts` | ✅ (extend) |
| STRETCH-03 | `coerceStretchSettings` falls back per-field for drifted values | unit | `npx vitest run src/storage/practices.test.ts` | ✅ (extend) |
| STRETCH-04 | `recordStretchSession` writes to `practices.stretch.stats` and leaves resonant+NK stats untouched | unit | `npx vitest run src/storage/practices.test.ts` | ✅ (extend) |
| STRETCH-04 | `resetPracticeStats('stretch')` zeros only the stretch slice | unit | `npx vitest run src/storage/practices.test.ts` | ✅ (extend) |
| STRETCH-05 | v2→v3 migration: stretch settings seeded from resonant raw blob; resonant stats untouched; stretch stats ZERO | unit | `npx vitest run src/storage/storage.test.ts` | ✅ (extend) |
| STRETCH-05 | `coerceActivePractice('stretch')` returns `'stretch'` | unit | `npx vitest run src/storage/practices.test.ts` | ✅ (extend) |
| STRETCH-05 | App mounts with v2 envelope → stretch practice appears and loads migrated config | integration | `npx vitest run src/app/App.persistence.test.tsx` | ✅ (extend) |
| STRETCH-06 | `UI_STRINGS` both locales have non-empty `practice.stretchName`, `practice.stretchHeading`, `practice.stretchHeader` | unit | `npx vitest run src/content/strings.test.ts` | ✅ (extend) |
| STRETCH-06 | `LOCKED_COPY` byte-equality guard stays green (no Stretch-related locked copy) | unit | `npx vitest run src/content/lockedCopy.test.ts` | ✅ (no change needed) |

### Sampling Rate

- **Per task commit:** `npx vitest run src/storage/` (storage layer stable)
- **Per wave merge:** `npx vitest run`
- **Phase gate:** Full suite green before `/gsd-verify-work`

### Wave 0 Gaps

- [ ] `src/components/PracticeToggle.test.tsx` — covers STRETCH-01 (3 pills, correct order) and STRETCH-02 (treatment A default, treatment B glyph presence)
- [ ] `src/domain/stretchSettings.test.ts` (or extend `src/storage/settings.test.ts`) — covers `coerceStretchSettings` exhaustiveness

---

## Security Domain

### Applicable ASVS Categories

| ASVS Category | Applies | Standard Control |
|---------------|---------|-----------------|
| V2 Authentication | no | — |
| V3 Session Management | no | — |
| V4 Access Control | no | — |
| V5 Input Validation | yes | `coerceStretchSettings` per-field non-throwing coercion; `asRecord` prototype-pollution-safe guard |
| V6 Cryptography | no | — |

### Known Threat Patterns

| Pattern | STRIDE | Standard Mitigation |
|---------|--------|---------------------|
| Prototype pollution via `raw` spread | Tampering | `asRecord` guard rejects non-plain-objects before named-key reads (T-30-05 pattern, carried forward) |
| `VITE_SWITCHER_TREATMENT` injection in CI | Tampering | Build-time define from `process.env`; no user-controlled input path |

---

## Sources

### Primary (HIGH confidence — directly read from codebase)

- `src/storage/storage.ts` — `STATE_VERSION`, `STATE_KEY`, `migrateEnvelope`, `readEnvelope`, `writeEnvelope`, `EMPTY_ENVELOPE`
- `src/storage/practices.ts` — `PracticeId`, `PracticeMap`, `PracticeSlice`, `coercePractices`, `coerceNaviKriyaSettings`, `coercePracticeSlice`, `asRecord`, `recordResonantSession`, `saveResonantSettings`, `resetPracticeStats`
- `src/storage/settings.ts` — `coerceSettings`, `coerceMute`
- `src/storage/stats.ts` — `ZERO_STATS`, `COUNT_THRESHOLD_MS`, `PersistedStats`
- `src/domain/settings.ts` — `SessionSettings`, `SessionMode`, `MODE_OPTIONS`, `StretchSettings` (partial — `DEFAULT_STRETCH_SETTINGS` exists as a plain object, full type split is this phase's work), all option arrays and validators
- `src/domain/sessionController.ts` — `startSession`, `extendTimedSession`, `completeIfNeeded`, all `mode === 'stretch'` branch locations
- `src/domain/stretchRamp.ts` — `buildStretchSegments`, `getStretchFrame`, `computeStretchTotalMs`, `StretchSegment`, `StretchSessionFrame`
- `src/components/PracticeToggle.tsx` — current 2-pill implementation, local PracticeId alias, pill styling, disabled posture
- `src/components/ModeToggle.tsx` — full implementation; both consumer call sites identified in `SettingsForm.tsx`
- `src/components/SettingsForm.tsx` — practice-aware branch, stretch knobs block, NK controls block, `isStretch` derivation
- `src/app/App.tsx` — state wiring for all practices, `mode === 'stretch'` at line 320, storage listener
- `src/content/strings.ts` — `UiStrings` interface, `UI_STRINGS` catalog, `practice` sub-object
- `src/content/lockedCopy.ts` — `LOCKED_COPY`, byte-equality guard contract
- `vite.config.ts` — Vitest config, Vite plugins; no existing `define` block (must be added)
- `.planning/phases/34-stretch-as-a-distinct-practice/34-CONTEXT.md` — all 11 locked decisions
- `.planning/spikes/007-three-practice-switcher/README.md` — spike verdict, 320px fit confirmation, treatment A/B decision
- `.claude/skills/spike-findings-hrv/references/multi-practice-architecture.md` — `AppState` shape, switcher pattern, migration pattern

### Secondary (MEDIUM confidence — planning/context documents)

- `.planning/REQUIREMENTS.md` — STRETCH-01..06 definitions
- `.planning/spikes/MANIFEST.md` — spike 007 operator decision verbatim

---

## Metadata

**Confidence breakdown:**

- Storage migration pattern: HIGH — directly read from working v1→v2 code; v2→v3 is the same pattern
- Settings type split: HIGH — read all current types and consumers; refactor scope fully traced
- Switcher A/B wiring: HIGH — Vite `define` is a documented pattern; spike 007 README is authoritative on fit
- Copy fields: HIGH — `UiStrings` interface read directly; spike 007 confirmed EN/PT-BR labels
- `ModeToggle` fate: HIGH — two call sites confirmed in `SettingsForm.tsx`; NK usage identified

**Research date:** 2026-05-18
**Valid until:** 2026-06-18 (stable codebase; no external dependencies)
