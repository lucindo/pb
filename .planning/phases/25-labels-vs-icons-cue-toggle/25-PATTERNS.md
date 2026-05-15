# Phase 25: Labels-vs-Icons Cue Toggle - Pattern Map

**Mapped:** 2026-05-15
**Files analyzed:** 11 (3 new, 8 modified)
**Analogs found:** 11 / 11

This phase adds a 5th prefs dimension (`cue`) controlling how the in-orb In/Out
phase indicator renders: Text (default `'labels'`), Arrow, Nose. It is a verbatim
mirror of the Phase 17 `variant` dimension — every new/modified file has an exact
in-repo analog. No RESEARCH.md; the variant dimension IS the reference
implementation. Planner should treat each "Analog" below as a clone-and-rename
target.

## File Classification

| New/Modified File | Role | Data Flow | Closest Analog | Match Quality |
|-------------------|------|-----------|----------------|---------------|
| NEW `src/components/CuePicker.tsx` | component (picker) | event-driven (radiogroup → prefs write) | `src/components/VariantPicker.tsx` | exact |
| NEW `src/hooks/useCueChoice.ts` | hook (picker-side) | event-driven (write + dispatch) | `src/hooks/useVariantChoice.ts` | exact |
| NEW `src/hooks/useVisualCue.ts` (App-side orchestrator) | hook (App-side) | event-driven (subscribe + re-read) | `src/hooks/useVisualVariant.ts` | exact |
| MODIFY `src/domain/settings.ts` | domain (enum + predicate) | transform (validate/coerce) | variant block, lines 118-126 | exact |
| MODIFY `src/storage/prefs.ts` | storage (envelope coerce) | transform (per-field coerce) | `variant` field + `coerceVariant` | exact |
| MODIFY `src/content/strings.ts` | config (i18n catalog) | static data | `variants` group + `variantLabel` | exact |
| MODIFY `src/components/SettingsDialog.tsx` | component (dialog shell) | request-response | `VariantPicker` placement, line 85 | exact |
| MODIFY `src/components/BreathingShape.tsx` | component (dispatcher) | request-response (prop threading) | `variant` prop threading | exact |
| MODIFY `src/components/OrbShape.tsx` | component (shape) | render-local | phase-label `<span>`, lines 122-133 | exact |
| MODIFY `src/components/SquareShape.tsx` | component (shape) | render-local | phase-label `<span>`, lines 129-140 | exact |
| MODIFY `src/components/DiamondShape.tsx` | component (shape) | render-local | phase-label `<span>`, lines 121-129 | exact |
| ALSO: App-side wiring | (modify `src/app/App.tsx`) | event-driven | `useVisualVariant` consumption | exact |

The cue glyph SVGs themselves (chevron candidate F, nose candidate D2) have **no
in-repo analog** — see "No Analog Found" below.

## Pattern Assignments

### NEW `src/components/CuePicker.tsx` (component, event-driven)

**Analog:** `src/components/VariantPicker.tsx` (entire file — clone verbatim, rename)

**Prop contract** (lines 16-22) — Phase 15 D-02: `{ disabled, strings, sectionLabel }`, NO value prop:
```typescript
export interface VariantPickerProps {
  disabled: boolean
  strings: UiStrings['variants']      // → UiStrings['cue'] for CuePicker
  sectionLabel: string
}

export function VariantPicker({ disabled, strings, sectionLabel }: VariantPickerProps) {
  const { variant, setVariant } = useVariantChoice()   // → useCueChoice()
```

**Imports pattern** (lines 12-14) — domain enum + companion hook + strings type:
```typescript
import { VARIANT_OPTIONS, type VisualVariantId } from '../domain/settings'
import { useVariantChoice } from '../hooks/useVariantChoice'
import type { UiStrings } from '../content/strings'
```
For CuePicker: `import { CUE_OPTIONS, type CueStyleId } from '../domain/settings'`,
`import { useCueChoice } from '../hooks/useCueChoice'`.

**Radiogroup core pattern** (lines 25-72) — token-only colors, `aria-labelledby`,
`aria-disabled`, `grid grid-cols-3 gap-2`, per-option `role="radio"` + `aria-checked`:
```typescript
<div role="radiogroup" aria-labelledby="variant-picker-label" aria-disabled={disabled}
     className="mt-2 grid grid-cols-3 gap-2">
  {VARIANT_OPTIONS.map((id: VisualVariantId) => {
    const selected = variant === id
    const label = strings[id]
    ...
    return (
      <button key={id} type="button" role="radio" aria-checked={selected}
              disabled={disabled} onClick={() => { setVariant(id) }}
              className={`${baseClasses} ${selected ? selectedClasses : unselectedClasses}`}>
        {/* swatch */}
        <span>{label}</span>
      </button>
    )
  })}
</div>
```

**44px hit area + focus ring** (line 39 `baseClasses`) — `min-h-12`, `focus-visible:ring-2 ring-breathing-accent`, `disabled:opacity-45`. Copy `baseClasses`/`selectedClasses`/`unselectedClasses` strings verbatim — they are token-bound (D-23: zero hardcoded colors).

**Per-option visual** (lines 51-66): VariantPicker stacks a shape swatch above the
label. CuePicker should stack a **preview glyph** (the actual Text / Arrow / Nose
SVG, small) above each option label — same `flex flex-col items-center gap-1`
posture from `baseClasses`. The glyph SVGs are Claude's discretion (see "No Analog
Found").

**ID namespacing:** rename `id="variant-picker-label"` → `id="cue-picker-label"`
and `aria-labelledby` to match (avoids a DOM id collision with VariantPicker).

---

### NEW `src/hooks/useCueChoice.ts` (hook, picker-side, event-driven)

**Analog:** `src/hooks/useVariantChoice.ts` (entire file — clone verbatim, rename)

**Full pattern** (lines 27-47) — `useState` seeded from `loadPrefs()`, stable
`useCallback` setter, fresh-read-merge-write, optimistic local state, custom-event dispatch:
```typescript
export function useVariantChoice(): { variant: VisualVariantId; setVariant: (next: VisualVariantId) => void } {
  const [variant, setVariantState] = useState<VisualVariantId>(() => loadPrefs().variant)

  const setVariant = useCallback((next: VisualVariantId): void => {
    const current = loadPrefs()                      // 1. fresh read of envelope
    savePrefs({ ...current, variant: next })         // 2. merged write — per-field isolation
    setVariantState(next)                            // 3. optimistic-UI local state
    window.dispatchEvent(                            // 4. signal App-side hook to re-read
      new CustomEvent('hrv:prefs-changed', { detail: { key: 'variant', value: next } }),
    )
  }, [])

  return { variant, setVariant }
}
```
For `useCueChoice`: return `{ cue, setCue }`, seed from `loadPrefs().cue`,
`savePrefs({ ...current, cue: next })`, dispatch `detail: { key: 'cue', value: next }`.

---

### NEW `src/hooks/useVisualCue.ts` (App-side orchestrator hook, event-driven)

**Analog:** `src/hooks/useVisualVariant.ts` (entire file — clone verbatim, rename)

**Full pattern** (lines 16-49) — `useState` seeded from `loadPrefs()`, two effects:
cross-tab `storage` listener + same-tab `hrv:prefs-changed` listener:
```typescript
export function useVisualVariant(): { variant: VisualVariantId; setVariant: (next: VisualVariantId) => void } {
  const [variant, setVariant] = useState<VisualVariantId>(() => loadPrefs().variant)

  // Cross-tab 'storage' listener — re-read on STATE_KEY change
  useEffect(() => {
    const onStorage = (e: StorageEvent): void => {
      if (e.key === STATE_KEY) { setVariant(loadPrefs().variant) }
    }
    window.addEventListener('storage', onStorage)
    return () => { window.removeEventListener('storage', onStorage) }
  }, [])

  // Same-tab 'hrv:prefs-changed' CustomEvent listener — key-filtered
  useEffect(() => {
    const onPrefsChanged = (e: Event): void => {
      if (!(e instanceof CustomEvent)) return
      const detail = e.detail as { key?: string } | null
      if (!detail || detail.key === 'variant' || detail.key === undefined) {
        setVariant(loadPrefs().variant)
      }
    }
    window.addEventListener('hrv:prefs-changed', onPrefsChanged)
    return () => { window.removeEventListener('hrv:prefs-changed', onPrefsChanged) }
  }, [])

  return { variant, setVariant }
}
```
For `useVisualCue`: return `{ cue, setCue }`, seed from `loadPrefs().cue`, the
key-filter branch becomes `detail.key === 'cue' || detail.key === undefined`
(CONTEXT D-14). `STATE_KEY` import from `'../storage'` stays unchanged.

---

### MODIFY `src/domain/settings.ts` (domain, transform)

**Analog:** the variant block, lines 118-126 — add the cue equivalent block
**directly after it** (keep dimension order: theme, timbre, variant, cue, locale):
```typescript
export type VisualVariantId = 'orb' | 'square' | 'diamond'

export const VARIANT_OPTIONS = ['orb', 'square', 'diamond'] as const satisfies readonly VisualVariantId[]

export function isValidVariant(v: unknown): v is VisualVariantId {
  return typeof v === 'string' && (VARIANT_OPTIONS as readonly string[]).includes(v)
}

export const DEFAULT_VARIANT: VisualVariantId = 'orb'
```

Cue version to add:
```typescript
export type CueStyleId = 'labels' | 'arrow' | 'nose'

export const CUE_OPTIONS = ['labels', 'arrow', 'nose'] as const satisfies readonly CueStyleId[]

export function isValidCue(v: unknown): v is CueStyleId {
  return typeof v === 'string' && (CUE_OPTIONS as readonly string[]).includes(v)
}

export const DEFAULT_CUE: CueStyleId = 'labels'   // FIXED per CONTEXT D-01 / success criterion 5
```
`'labels'` for the default is FIXED (D-01). `'arrow'`/`'nose'` are Claude's
discretion but suggested. Mirror the `themes`/`timbres` enum style verbatim.

---

### MODIFY `src/storage/prefs.ts` (storage, transform — per-field coerce)

**Analog:** the `variant` field + `coerceVariant` (same file). Three edit sites:

**Imports** (lines 7-20) — add `DEFAULT_CUE`, `isValidCue`, `type CueStyleId`:
```typescript
import {
  DEFAULT_THEME, DEFAULT_TIMBRE, DEFAULT_VARIANT, DEFAULT_LOCALE,
  isValidTheme, isValidTimbre, isValidVariant, isValidLocale,
  type ThemeId, type TimbreId, type VisualVariantId, type LocaleId,
} from '../domain/settings'
```

**`UserPrefs` interface + `DEFAULT_PREFS`** (lines 24-36) — add a 5th field:
```typescript
export interface UserPrefs {
  theme: ThemeId
  timbre: TimbreId
  variant: VisualVariantId
  cue: CueStyleId            // ← new
  locale: LocaleId
}

export const DEFAULT_PREFS: UserPrefs = {
  theme: DEFAULT_THEME, timbre: DEFAULT_TIMBRE, variant: DEFAULT_VARIANT,
  cue: DEFAULT_CUE,          // ← new
  locale: DEFAULT_LOCALE,
}
```

**`coerceVariant` + `coercePrefs`** (lines 46-66) — add `coerceCue`, add to the
returned object. NOTE: the comment at line 55-56 says "we only read four known
keys" — update it to "five known keys" so the prototype-pollution rationale stays accurate:
```typescript
export function coerceCue(raw: unknown): CueStyleId {
  return isValidCue(raw) ? raw : DEFAULT_CUE
}

export function coercePrefs(raw: unknown): UserPrefs {
  const r = (raw !== null && typeof raw === 'object' && !Array.isArray(raw))
    ? raw as Record<string, unknown> : {}
  return {
    theme:   coerceTheme(r.theme),
    timbre:  coerceTimbre(r.timbre),
    variant: coerceVariant(r.variant),
    cue:     coerceCue(r.cue),        // ← new — per-field, drifted cue does not discard others
    locale:  coerceLocale(r.locale),
  }
}
```
CONTEXT D-13: **NO `STATE_VERSION` bump.** A missing `cue` key coerces to
`DEFAULT_CUE` — that IS the migration (Phase 14 D-10/D-17 pattern).

---

### MODIFY `src/content/strings.ts` (config, static data)

**Analog:** the `variants` group + `settings.variantLabel`. Four edit sites
(interface + EN + PT-BR for each).

**`UiStrings` interface** — add `cueLabel` to `settings` (after line 37) and a new
`cue` group (after the `variants` group, lines 49-53):
```typescript
readonly settings: {
  readonly title: string
  readonly close: string
  readonly themeLabel: string
  readonly variantLabel: string
  readonly cueLabel: string        // ← new
  readonly timbreLabel: string
  readonly languageLabel: string
}
...
readonly cue: {                    // ← new group, mirrors `variants`
  readonly labels: string
  readonly arrow: string
  readonly nose: string
}
```

**EN literals** (lines 151-171) — add to `settings` and a new `cue` group:
```typescript
settings: {
  ...
  variantLabel: 'Variant',
  cueLabel: 'Cue style',           // ← new — CONTEXT D-12
  timbreLabel: 'Timbre',
  ...
},
cue: {                             // ← new
  labels: 'Text',
  arrow: 'Arrow',
  nose: 'Nose',
},
```

**PT-BR literals** (lines 270-290) — every new PT-BR string carries the
`// TODO: native-speaker review` marker (the existing pattern at lines 273-289;
Phase 26 sweep depends on it):
```typescript
settings: {
  ...
  cueLabel: '...', // TODO: native-speaker review
  ...
},
cue: {
  labels: '...', // TODO: native-speaker review
  arrow: '...',  // TODO: native-speaker review
  nose: '...',   // TODO: native-speaker review
},
```
Key ordering note: place `cueLabel` after `variantLabel` and the `cue` group after
the `variants` group in BOTH locales — matches SettingsDialog visual order (D-11).

---

### MODIFY `src/components/SettingsDialog.tsx` (component, request-response)

**Analog:** the `VariantPicker` line, line 85. Three edit sites:

**Import** (after line 6):
```typescript
import { CuePicker } from './CuePicker'
```

**Strings prop type** (line 32) — add `'cue'` to the `Pick`:
```typescript
strings: Pick<UiStrings, 'settings' | 'themes' | 'variants' | 'cue' | 'timbres'>
```

**Render placement** (lines 84-87) — insert `CuePicker` directly after
`VariantPicker` (CONTEXT D-11: Theme → Variant → **Cue** → Timbre → Language):
```typescript
<ThemePicker disabled={inSessionView} strings={strings.themes} sectionLabel={strings.settings.themeLabel} />
<VariantPicker disabled={inSessionView} strings={strings.variants} sectionLabel={strings.settings.variantLabel} />
<CuePicker disabled={inSessionView} strings={strings.cue} sectionLabel={strings.settings.cueLabel} />
<TimbrePicker disabled={inSessionView} strings={strings.timbres} sectionLabel={strings.settings.timbreLabel} />
<LanguagePicker disabled={inSessionView} sectionLabel={strings.settings.languageLabel} />
```
Update the D-10 comment on line 83 to read "Theme → Variant → Cue → Timbre →
Language order".

---

### MODIFY `src/components/BreathingShape.tsx` (component, request-response — prop threading)

**Analog:** the existing `variant` prop threading (same file). Mirror it for `cue`:

**Props interface** (lines 18-27) — add optional `cue` prop with the same
zero-regression rationale as `variant`:
```typescript
export interface BreathingShapeProps {
  variant?: VisualVariantId
  cue?: CueStyleId               // ← new — OPTIONAL, default 'labels' for zero-regression
  frame: SessionFrame | null
  strings: UiStrings['breathing']
  leadInDigit?: 3 | 2 | 1 | null
}
```
Add `import type { CueStyleId } from '../domain/settings'` (already imports
`VisualVariantId` from there — line 12, extend it).

**Dispatcher** (lines 29-42) — destructure `cue = 'labels'` and thread to all 3 shapes:
```typescript
export function BreathingShape({ variant = 'orb', cue = 'labels', frame, strings, leadInDigit }: BreathingShapeProps) {
  if (frame === null && leadInDigit == null) return null
  switch (variant) {
    case 'square':  return <SquareShape  frame={frame} cue={cue} leadInDigit={leadInDigit} strings={strings} />
    case 'diamond': return <DiamondShape frame={frame} cue={cue} leadInDigit={leadInDigit} strings={strings} />
    case 'orb':
    default:        return <OrbShape     frame={frame} cue={cue} leadInDigit={leadInDigit} strings={strings} />
  }
}
```

---

### MODIFY `src/components/OrbShape.tsx` (component, render-local)

**Analog:** the phase-label `<span>`, lines 122-133 (the only edit site in this file).

**Props threading** — add optional `cue?: CueStyleId` to `OrbShapeProps` (lines
6-10) and thread it from `OrbShape` → `OrbBody` (line 23 / line 26 signature).
Default `'labels'`. `OrbLeadIn` does NOT receive `cue` — CONTEXT D-07: the
countdown digit is unchanged in all 3 modes.

**Current label slot** (lines 122-133) — the swap site:
```typescript
{/* D-03: phase label centered inside the orb at large display size */}
<span
  className="relative z-10 text-5xl font-semibold tracking-tight text-[var(--color-breathing-accent-strong)] sm:text-6xl"
  style={{
    color: frame.phase === 'in'
      ? 'var(--color-orb-in-text)'
      : 'var(--color-orb-out-text)',
  }}
>
  {phaseLabel}
</span>
```

**Target pattern:** branch on `cue`. For `'labels'` keep the span exactly as
above (zero regression). For `'arrow'` / `'nose'`, render an `aria-hidden="true"`
SVG **plus** a visually-hidden span carrying `phaseLabel` (CONTEXT D-09 — screen
readers still announce the word). The SVG must:
- be sized to the `text-5xl`/`sm:text-6xl` footprint (D-08),
- use `var(--color-orb-in-text)` / `var(--color-orb-out-text)` for fill (the same
  token already applied via `style.color` above — pass to SVG `fill` or
  `currentColor`),
- be **static** — no animation (D-08),
- keep `relative z-10` wrapper positioning so it sits in the same orb-center slot.

`phaseLabel` (line 39: `frame.phase === 'in' ? strings.inhale : strings.exhale`)
stays the source of the word in all 3 modes — the `role="img"` aria-label on the
root (line 44) is unchanged. There is no in-repo "visually-hidden" utility;
see "Shared Patterns" below.

---

### MODIFY `src/components/SquareShape.tsx` (component, render-local)

**Analog:** OrbShape (same phase exact pattern) — label slot is lines 129-140,
identical structure to OrbShape's 122-133. `SquareBody` signature at line 26;
`phaseLabel` derived at line 37. Apply the **identical** cue branch as OrbShape.
Thread `cue` through `SquareShapeProps` → `SquareShape` → `SquareBody`. The
`SquareLeadIn` equivalent is NOT touched (D-07). Run the per-variant legibility
check (CONTEXT D-08 / Claude's Discretion) — the SVG may need square-specific
sizing.

---

### MODIFY `src/components/DiamondShape.tsx` (component, render-local)

**Analog:** OrbShape — label slot is lines 121-129, identical structure.
`phaseLabel` derived at line 50. Apply the **identical** cue branch. Thread `cue`
through props. Diamond's clip-path geometry makes the center slot tighter — the
per-variant legibility check (D-08) matters most here; the nose drawing (D2) may
need the smallest-footprint tuning on Diamond.

---

### ALSO: App-side wiring — MODIFY `src/app/App.tsx` (event-driven)

**Analog:** the `useVisualVariant` consumption + `sessionVariantRef` capture-at-Start.

- **Import + consume** (mirror line 18 / line 170): add
  `import { useVisualCue } from '../hooks/useVisualCue'` and
  `const { cue: liveCue } = useVisualCue()`.
- **Capture-at-Start** (mirror lines 211-212, 365-366, 348-349, 537-538): CONTEXT
  Claude's Discretion + "variant precedent = capture at Start" — add a
  `sessionCueRef` / `sessionCue` pair, capture `liveCue` at `onStartClick`,
  clear on session end. Mirror `sessionVariantRef` exactly.
- **Pass to BreathingShape** (line 669-670): add `cue={sessionCue ?? liveCue}`
  alongside `variant={sessionVariant ?? liveVariant}`.
- **SettingsDialog** receives `strings={uiStrings}` (line 743) — no change needed;
  the new `cue` group is already inside `uiStrings`.

## Shared Patterns

### Per-field non-throwing coerce (no STATE_VERSION bump)
**Source:** `src/storage/prefs.ts` lines 38-66 + `src/domain/settings.ts` `isValid*` predicates.
**Apply to:** `coerceCue` + `isValidCue`.
A drifted/missing `cue` value coerces to `DEFAULT_CUE` without discarding the
other four dimensions. The absence of a `cue` key in pre-Phase-25 envelopes is
handled transparently by `coerceCue(r.cue)` returning `DEFAULT_CUE` — this is the
migration; **no `STATE_VERSION` bump** (CONTEXT D-13, Phase 14 D-10/D-17).

### `hrv:prefs-changed` CustomEvent — one name, key-filtered consumers
**Source:** `src/hooks/useVariantChoice.ts` lines 41-43 (dispatch) +
`src/hooks/useVisualVariant.ts` lines 34-46 (filtered listen).
**Apply to:** `useCueChoice` (dispatch `detail.key === 'cue'`) + `useVisualCue`
(filter `detail.key === 'cue' || detail.key === undefined`).
One event name shared by every dimension; the `undefined` branch is the
forward-compat broadcast-all path — keep it.

### Picker prop contract — `{ disabled, strings, sectionLabel }`, no value prop
**Source:** `src/components/VariantPicker.tsx` lines 16-23 (Phase 15 D-02).
**Apply to:** `CuePicker`.
The picker owns its own state via the companion `useCueChoice` hook; the parent
passes only `disabled` (← `inSessionView`), the `strings` sub-object, and the
section label. No `value`/`onChange` from the parent.

### Token-only colors + 44px a11y floor
**Source:** `src/components/VariantPicker.tsx` line 39 (`baseClasses`) — `min-h-12`,
`focus-visible:ring-2 ring-breathing-accent ring-offset-2`, `disabled:opacity-45`,
all colors via `var(--color-*)` / token-bound Tailwind (D-23).
**Apply to:** `CuePicker` buttons AND the in-orb cue SVGs — the SVG fill uses the
existing `--color-orb-in-text` / `--color-orb-out-text` tokens (CONTEXT D-08),
never a hardcoded hex.

### a11y: aria-hidden glyph + visually-hidden text (CUE-03)
**Source:** the `aria-hidden="true"` decorative-SVG convention used throughout the
shape files (e.g. `OrbShape.tsx` lines 56, 64, 95) — but note there is **no
existing visually-hidden text utility in the repo** (the shapes today render the
word visibly via the label `<span>`, so the technique was never needed).
**Apply to:** OrbShape / SquareShape / DiamondShape Arrow + Nose branches.
Planner must introduce the visually-hidden pattern (`sr-only` Tailwind utility, or
an inline clip style) for the `phaseLabel` word so screen readers still announce
In/Out while the SVG is `aria-hidden`. The root `role="img"` aria-label
(`${breathingShapeAriaLabel}: ${phaseLabel}`) and `aria-live` announcements are
unchanged (CONTEXT D-09).

### Test fixtures — envelope seeding + UI_STRINGS
**Source:** `src/components/VariantPicker.test.tsx` lines 1-30 — `seedVariant()`
writes a known envelope to `localStorage` under `STATE_KEY`, `UI_STRINGS.en` is
the strings fixture, `beforeEach`/`afterEach` clear storage.
**Apply to:** `CuePicker.test.tsx` (clone) — the seeded envelope's `prefs` object
must include the new `cue` field. Also update `prefs` tests, `settings.test.ts`,
`OrbShape`/`SquareShape`/`DiamondShape` tests, `SettingsDialog.test.tsx`, and
locale/strings tests (CONTEXT integration points). Companion-hook test precedents:
`useVariantChoice.test.ts`, `useVisualVariant.test.ts`.

## No Analog Found

| Item | Role | Data Flow | Reason |
|------|------|-----------|--------|
| Arrow SVG (mockup candidate F — soft solid chevron) | static SVG asset | render-local | No icon/SVG-glyph assets exist in the repo; all current shape SVGs are geometric primitives (orb gradient layers, diamond polygon). Path data is Claude's Discretion (D-03, Specific Ideas) — derive from `25-cue-icon-mockup.html`. |
| Nose drawing SVG (mockup candidate D2 — nose outline + up/down arrows) | static SVG asset | render-local | Same — no drawing-style SVG precedent. Path data is Claude's Discretion (D-05). Derive from `25-cue-icon-mockup.html` + the operator's flaticon reference screenshots. |
| Visually-hidden text utility | a11y primitive | render-local | The repo never needed sr-only text (shapes render the word visibly today). Planner introduces it for CUE-03 — Tailwind `sr-only` is the standard choice. |

For these three, the planner should reference
`.planning/phases/25-labels-vs-icons-cue-toggle/25-cue-icon-mockup.html` (the
rendered F + D2 candidates) and build in the operator visual-review checkpoint
described in CONTEXT `<specifics>` — render F + D2 across all 3 variants for
approval before lock.

## Metadata

**Analog search scope:** `src/components/`, `src/hooks/`, `src/storage/`,
`src/domain/`, `src/content/`, `src/app/`
**Files scanned:** VariantPicker.tsx, useVariantChoice.ts, useVisualVariant.ts,
prefs.ts, settings.ts, OrbShape.tsx, SquareShape.tsx, DiamondShape.tsx,
BreathingShape.tsx, SettingsDialog.tsx, strings.ts, App.tsx, VariantPicker.test.tsx
**Pattern extraction date:** 2026-05-15
