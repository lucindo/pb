# Phase 17: Visual Variants — Pattern Map

**Mapped:** 2026-05-14
**Files analyzed:** 11 new/modified (5 components + 2 hooks + 1 css + 1 app edit + 4 tests + 1 reuse-cluster) — 8 with strong analog match, 3 with verbatim-extract precedent.

---

## File Classification

| New / Modified File | Role | Data Flow | Closest Analog | Match Quality |
|---------------------|------|-----------|----------------|---------------|
| `src/components/OrbShape.tsx` (NEW) | component (presentational, pure render) | request-response (props in, JSX out) | `src/components/BreathingShape.tsx` (Body + LeadIn subtrees, lines 43–224) | **exact (verbatim extract)** |
| `src/components/SquareShape.tsx` (NEW) | component (presentational, pure render) | request-response | `src/components/BreathingShape.tsx` (Body + LeadIn — same skeleton, geometry deltas) | **exact (verbatim extract + 4 deltas)** |
| `src/components/RingShape.tsx` (NEW) | component (presentational, pure render) | request-response | `src/components/BreathingShape.tsx` (Body + LeadIn — same skeleton, gradient override) | **exact (verbatim extract + radial-gradient delta)** |
| `src/components/BreathingShape.tsx` (EDIT) | component (dispatcher — null-guard + variant switch) | request-response (control flow) | `src/components/BreathingShape.tsx` lines 33–41 (current dispatcher pattern) | **exact (same file, slimmed)** |
| `src/components/VariantPicker.tsx` (EDIT) | component (radiogroup picker UI) | event-driven (click → setVariant → savePrefs + CustomEvent) | `src/components/ThemePicker.tsx` | **exact (verbatim mirror)** |
| `src/hooks/useVisualVariant.ts` (NEW) | hook (App-side orchestrator — live state + cross-tab/same-tab sync) | event-driven (storage event + CustomEvent listeners) | `src/hooks/useTheme.ts` | **exact (mirror minus 2 effects)** |
| `src/hooks/useVariantChoice.ts` (NEW) | hook (picker-side setter — savePrefs + dispatch CustomEvent) | event-driven (click → write → dispatch) | `src/hooks/useThemeChoice.ts` | **exact (verbatim mirror)** |
| `src/styles/theme.css` (EDIT) | config (CSS — rename `.orb-ring-- → .shape-marker--`; add `[data-variant='square'/'ring']` overrides) | n/a (static cascade) | `src/styles/theme.css` lines 344–438 (current `.orb-layer`/`.orb-ring`/`@media reduced-motion`) | **exact (in-place rename + 4 added rules)** |
| `src/app/App.tsx` (EDIT) | component (orchestration — hook invocation + sessionVariantRef snapshot + BreathingShape prop) | event-driven (Start click → ref snapshot) | `src/app/App.tsx` line 139 (`useTheme()` invocation) + lines 68/164–177 (existing session refs) + line 292–361 (`onStartClick` handler) | **exact (same file, additive edits)** |
| `src/components/OrbShape.test.tsx` (NEW) | test (RTL component test) | request-response | `src/components/BreathingShape.test.tsx` (moved, not rewritten) | **exact (mechanical migration)** |
| `src/components/SquareShape.test.tsx` (NEW) + `RingShape.test.tsx` (NEW) | test | request-response | `src/components/BreathingShape.test.tsx` (parameterized per-variant) | **role-match (template + variant-specific assertions)** |
| `src/components/BreathingShape.test.tsx` (EDIT) | test (slimmed to dispatch-only smoke) | request-response | current file (delete Body/LeadIn cases, keep dispatch + null-guard) | **exact (same file, subset)** |
| `src/hooks/useVisualVariant.test.ts` (NEW) | test (pure hook) | event-driven | `src/hooks/useTheme.test.ts` | **exact (mirror minus mql cases)** |
| `src/hooks/useVariantChoice.test.ts` (NEW) | test (pure hook) | event-driven | `src/hooks/useThemeChoice.test.ts` | **exact (verbatim mirror)** |
| `src/components/VariantPicker.test.tsx` (REPLACE) | test (RTL) | event-driven | `src/components/ThemePicker.test.tsx` | **exact (verbatim mirror, 3→3 options)** |

---

## Pattern Assignments

### `src/components/OrbShape.tsx` (component, request-response)

**Analog:** `src/components/BreathingShape.tsx` — extract Body + LeadIn **verbatim** per CONTEXT.md D-02, except for one mechanical className rename `.orb-ring--outer/--inner` → `.shape-marker--outer/--inner` (D-15) and adding `data-variant='orb'` on the two root divs (Body + LeadIn).

**Imports pattern** (mirror `BreathingShape.tsx:1-2`):
```typescript
import type { SessionFrame } from '../domain/sessionMath'
import { usePrefersReducedMotion } from '../hooks/usePrefersReducedMotion'
```

**Prop interface** (extracted from `BreathingShape.tsx:4-11` — same shape, no `variant` prop here):
```typescript
export interface OrbShapeProps {
  frame: SessionFrame | null
  leadInDigit?: 3 | 2 | 1 | null
}
```

**MIN/MID/MAX scale constants** (move verbatim from `BreathingShape.tsx:18-20`; per RESEARCH §"OrbShape Verbatim Extraction" the single source of truth lives in OrbShape post-extraction):
```typescript
const MIN_SCALE = 0.58 // keep in sync with --orb-scale-min
const MAX_SCALE = 1.0  // keep in sync with --orb-scale-max
const MID_SCALE = (MIN_SCALE + MAX_SCALE) / 2 // 0.79 — keep in sync with --orb-scale-mid
```

**Top-level dispatch (Body vs LeadIn)** — same shape as the current `BreathingShape.tsx:33-41`, **minus the idle null-return** (CONTEXT.md D-04 — dispatcher owns that guard):
```typescript
export function OrbShape({ frame, leadInDigit }: OrbShapeProps) {
  if (leadInDigit != null) {
    return <OrbLeadIn digit={leadInDigit} />
  }
  // OrbShape's caller (BreathingShape dispatcher) guarantees frame !== null when leadInDigit is null
  return <OrbBody frame={frame!} />
}
```

**Body pattern** — move `BreathingShape.tsx:43-147` verbatim, renaming local `BreathingShapeBody` → `OrbBody`. Required edits (RESEARCH §"`.orb-ring--` → `.shape-marker--` CSS Rename Atlas"):
1. Add `data-variant="orb"` next to `data-phase` on root div (line 57 site).
2. Rename className `"orb-ring--outer absolute rounded-full border-solid"` → `"shape-marker--outer absolute rounded-full border-solid"` (line 75 site).
3. Rename className `"orb-ring--inner absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 rounded-full border-solid"` → `"shape-marker--inner …"` (line 127 site).
4. Leave `.orb`, `.orb-layer--in`, `.orb-layer--out` class names UNCHANGED (D-13 — rename deferred to v1.2).

The four-edge anchoring (Phase 5.1 D-20/D-22) MUST be preserved verbatim — these locked structural patterns from `BreathingShape.test.tsx:115-167` are guarded by tests:
```tsx
<div
  className="orb absolute rounded-full motion-reduce:transition-none"
  style={{
    left: 0, right: 0, top: 0, bottom: 0,  // NOT `inset-0` (D-20)
    transform: `translate3d(0,0,0) scale(${String(orbScale)})`,
  }}
>
```

**LeadIn pattern** — move `BreathingShape.tsx:160-224` verbatim, renaming `BreathingShapeLeadIn` → `OrbLeadIn`. Same rename + `data-variant="orb"` additions as Body.

**Reduced-motion behavior** — verbatim from `BreathingShape.tsx:44-51`:
```typescript
const reducedMotion = usePrefersReducedMotion()
const progress = Math.min(1, Math.max(0, frame.phaseProgress))
const liveScale =
  frame.phase === 'in'
    ? MIN_SCALE + progress * (MAX_SCALE - MIN_SCALE)
    : MAX_SCALE - progress * (MAX_SCALE - MIN_SCALE)
const orbScale = reducedMotion ? MID_SCALE : liveScale
```

---

### `src/components/SquareShape.tsx` (component, request-response)

**Analog:** `src/components/BreathingShape.tsx` Body + LeadIn — same skeleton as OrbShape with four geometric deltas (RESEARCH §"Square body recipe (D-05)").

**Imports + prop interface:** same as OrbShape (re-import `usePrefersReducedMotion`, `SessionFrame`). Re-import `MIN_SCALE/MAX_SCALE/MID_SCALE` from OrbShape (CONTEXT.md item 2 — single source of truth lives in OrbShape post-extraction):
```typescript
import { MIN_SCALE, MAX_SCALE, MID_SCALE } from './OrbShape'  // or co-located constants module — planner picks
```
(Planner alternative: hoist the three constants to `src/components/shapeConstants.ts` to avoid importing from a sibling component; the RESEARCH atlas leaves this open.)

**Body deltas vs OrbShape Body** (RESEARCH §"Square body recipe" lines 522–566):

```tsx
return (
  <div
    role="img"
    aria-label={`Breathing shape: ${frame.phaseLabel}`}
    data-variant="square"               // NEW vs Orb
    data-phase={frame.phase}
    data-progress={progress.toFixed(3)}
    className="relative mx-auto my-12 grid place-items-center"
    style={{ width: 'var(--orb-size)', height: 'var(--orb-size)' }}
  >
    <span
      aria-hidden="true"
      className="shape-marker--outer absolute border-solid"   // dropped `rounded-full` — CSS attribute selector handles radius
      style={{ left: '-1.5px', top: '-1.5px', right: '-1.5px', bottom: '-1.5px' }}
    />
    <div
      className="orb absolute rounded-[18%] motion-reduce:transition-none"   // `rounded-[18%]` vs Orb's `rounded-full`
      style={{
        left: 0, right: 0, top: 0, bottom: 0,
        transform: `translate3d(0,0,0) scale(${String(orbScale)})`,
      }}
    >
      <span aria-hidden="true" className="orb-layer--in absolute inset-0 rounded-[inherit]" />   {/* `rounded-[inherit]` vs Orb's `rounded-full` */}
      <span aria-hidden="true" className="orb-layer--out absolute inset-0 rounded-[inherit]" />
    </div>
    <span
      aria-hidden="true"
      className="shape-marker--inner absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 border-solid"   // dropped `rounded-full`
      style={{
        width: `${(MIN_SCALE * 100).toFixed(2)}%`,
        height: `${(MIN_SCALE * 100).toFixed(2)}%`,
      }}
    />
    <span className="relative z-10 text-5xl font-semibold tracking-tight sm:text-6xl"
      style={{ color: frame.phase === 'in' ? 'var(--color-orb-in-text)' : 'var(--color-orb-out-text)' }}>
      {frame.phaseLabel}
    </span>
  </div>
)
```

**LeadIn deltas vs OrbShape LeadIn:** mirror the four deltas above on the LeadIn render site (Phase 5.1 D-22 — both render sites must match). Lead-in digit color stays `'var(--color-orb-in-text)'` (D-08 + D-13 token reuse).

**Reduced-motion behavior:** identical to OrbShape — same `usePrefersReducedMotion()` call, same MID_SCALE lock. No new `@media` rules (D-14 — class reuse).

---

### `src/components/RingShape.tsx` (component, request-response)

**Analog:** `src/components/BreathingShape.tsx` Body + LeadIn — same skeleton as OrbShape, hollow center via Option D radial-gradient CSS override (RESEARCH §"Ring body recipe", Option D recommended at line 622–638).

**Imports + prop interface + scale constants:** identical to OrbShape/SquareShape.

**Body deltas vs OrbShape Body:**
1. `data-variant="ring"` on root div (so `[data-variant='ring'] .orb-layer--in/--out` background override applies via CSS cascade).
2. Keep `.orb` div as `rounded-full` (ring outer edge is circular).
3. Keep `.orb-layer--in/--out` as `rounded-full`. The radial-gradient with transparent inner stop is applied **entirely in CSS** under `[data-variant='ring']` (see theme.css edits below); the TSX does not need to override `background` inline.
4. Drop `rounded-full` from `.shape-marker--outer` / `.shape-marker--inner`? **No** — keep `rounded-full` because Ring's markers stay circular (planner verifies). The `[data-variant='ring'] .shape-marker--outer { border-width: 1px }` override only changes stroke width (D-15 + UI-SPEC §Visual Contract per-variant geometry table).

**LeadIn deltas:** mirror the Body deltas. `data-variant="ring"` on LeadIn root.

**Phase label centering:** label sits at z-10 above the hole (UI-SPEC §Visual Contract — "label is readable on top of 'nothing'"). No TSX change.

---

### `src/components/BreathingShape.tsx` (EDIT — becomes ~20-line dispatcher)

**Analog:** the same file's current dispatcher block (lines 33–41).

**Source pattern to preserve** (`BreathingShape.tsx:33-41` — current dispatcher):
```typescript
export function BreathingShape({ frame, leadInDigit }: BreathingShapeProps) {
  if (leadInDigit != null) {
    return <BreathingShapeLeadIn digit={leadInDigit} />
  }
  if (frame === null) {
    return null
  }
  return <BreathingShapeBody frame={frame} />
}
```

**Post-Phase-17 shape** (RESEARCH §"Pattern 3: Dispatcher Shell", lines 327–360):
```typescript
import type { SessionFrame } from '../domain/sessionMath'
import type { VisualVariantId } from '../domain/settings'
import { OrbShape } from './OrbShape'
import { SquareShape } from './SquareShape'
import { RingShape } from './RingShape'

export interface BreathingShapeProps {
  variant: VisualVariantId           // NEW — Phase 17 D-03
  frame: SessionFrame | null
  leadInDigit?: 3 | 2 | 1 | null
}

export function BreathingShape({ variant, frame, leadInDigit }: BreathingShapeProps) {
  // D-04: single idle-guard site; sibling shapes never see the idle case
  if (frame === null && leadInDigit == null) {
    return null
  }
  switch (variant) {
    case 'square': return <SquareShape frame={frame} leadInDigit={leadInDigit} />
    case 'ring':   return <RingShape   frame={frame} leadInDigit={leadInDigit} />
    case 'orb':
    default:       return <OrbShape    frame={frame} leadInDigit={leadInDigit} />
  }
}
```

**Lead-in priority preserved:** OrbShape/SquareShape/RingShape each implement the `if (leadInDigit != null) return <LeadIn …/>` priority internally (verbatim from `BreathingShape.tsx:34-36`). The current `BreathingShape.test.tsx:51-57` "lead-in wins when both frame and leadInDigit are set" assertion moves into per-variant test files.

---

### `src/components/VariantPicker.tsx` (EDIT — stub becomes radiogroup)

**Analog:** `src/components/ThemePicker.tsx` (verbatim mirror — same prop contract `{ disabled: boolean }`, same radiogroup posture, same classNames, same a11y attributes).

**Imports pattern** (mirror `ThemePicker.tsx:10-11`):
```typescript
import { VARIANT_OPTIONS, type VisualVariantId } from '../domain/settings'
import { useVariantChoice } from '../hooks/useVariantChoice'
```

**Prop interface** (verbatim from `VariantPicker.tsx:12-14` — Phase 15 D-02 contract preserved per CONTEXT.md D-21):
```typescript
export interface VariantPickerProps {
  disabled: boolean
}
```

**Radiogroup body** (mirror `ThemePicker.tsx:17-53`; substitutions: `theme` → `variant`, `THEME_OPTIONS` → `VARIANT_OPTIONS`, `theme-picker-label` → `variant-picker-label`, `Theme` heading → `Variant` heading; UI-SPEC §Visual Contract / Inline Shape Swatches adds the swatch span):
```tsx
export function VariantPicker({ disabled }: VariantPickerProps) {
  const { variant, setVariant } = useVariantChoice()
  return (
    <div>
      <p id="variant-picker-label" className="text-sm font-semibold text-[var(--color-breathing-accent-strong)]">Variant</p>
      <div
        role="radiogroup"
        aria-labelledby="variant-picker-label"
        aria-disabled={disabled}
        className="mt-2 grid grid-cols-3 gap-2"
      >
        {VARIANT_OPTIONS.map((id: VisualVariantId) => {
          const selected = variant === id
          const label = id.charAt(0).toUpperCase() + id.slice(1)
          const selectedClasses = 'border-2 border-[var(--color-breathing-accent)] bg-[var(--color-breathing-bg-soft)] text-[var(--color-breathing-accent-strong)]'
          const unselectedClasses = 'border border-[var(--color-breathing-accent)] bg-[var(--color-breathing-surface)] text-[var(--color-breathing-accent-strong)] hover:bg-[var(--color-breathing-bg-soft)] active:bg-[var(--color-breathing-bg-soft)]'
          const baseClasses = 'min-h-12 rounded-full px-3 py-2 text-sm font-semibold shadow-sm transition motion-reduce:transition-none focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-breathing-accent focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-45'
          return (
            <button
              key={id}
              type="button"
              role="radio"
              aria-checked={selected}
              disabled={disabled}
              onClick={() => { setVariant(id) }}
              className={`${baseClasses} ${selected ? selectedClasses : unselectedClasses} flex flex-col items-center gap-1`}
            >
              {/* UI-SPEC §Inline Shape Swatches: Option A for Orb/Square, Option B (SVG) for Ring */}
              {id === 'ring' ? (
                <svg width="24" height="24" viewBox="0 0 24 24" aria-hidden="true">
                  <circle cx="12" cy="12" r="9" fill="none" stroke="var(--color-orb-in-from)" strokeWidth="4" />
                </svg>
              ) : (
                <span className="block w-6 h-6 relative" aria-hidden="true">
                  <span
                    className="orb-layer--in absolute inset-0"
                    style={{ borderRadius: id === 'square' ? '18%' : '50%' }}
                  />
                </span>
              )}
              <span>{label}</span>
            </button>
          )
        })}
      </div>
    </div>
  )
}
```

**A11y posture** (verbatim from `ThemePicker.tsx:23-42`): `role="radiogroup"` + `aria-labelledby` + `aria-disabled` on wrapper; `role="radio"` + `aria-checked` + native `disabled` on each button. Swatches `aria-hidden="true"`.

**Hit area + focus contract** (verbatim from `ThemePicker.tsx:34`): `min-h-12 px-3 py-2` (≥44×44 px); `focus-visible:ring-2 focus-visible:ring-breathing-accent focus-visible:ring-offset-2`.

---

### `src/hooks/useVisualVariant.ts` (NEW — App-side orchestrator)

**Analog:** `src/hooks/useTheme.ts` — verbatim mirror **minus** Effect 1 (apply `data-theme` to `<html>`) and Effect 2 (gated matchMedia) per CONTEXT.md D-16 (variant attribute is render-local — NOT on `<html>`) and the fact that variant is not OS-driven.

**Imports pattern** (mirror `useTheme.ts:18-22`):
```typescript
import { useEffect, useState } from 'react'
import { loadPrefs } from '../storage/prefs'
import { STATE_KEY } from '../storage'
import type { VisualVariantId } from '../domain/settings'
```

**Initial state seed** (mirror `useTheme.ts:27`):
```typescript
const [variant, setVariant] = useState<VisualVariantId>(() => loadPrefs().variant)
```

**Cross-tab `'storage'` listener** (verbatim mirror of `useTheme.ts:60-70`):
```typescript
useEffect(() => {
  const onStorage = (e: StorageEvent): void => {
    if (e.key === STATE_KEY) {
      setVariant(loadPrefs().variant)
    }
  }
  window.addEventListener('storage', onStorage)
  return () => {
    window.removeEventListener('storage', onStorage)
  }
}, [])
```

**Same-tab `'hrv:prefs-changed'` CustomEvent listener** (mirror of `useTheme.ts:77-89`; filter key `'theme'` → `'variant'` per CONTEXT.md D-22):
```typescript
useEffect(() => {
  const onPrefsChanged = (e: Event): void => {
    if (!(e instanceof CustomEvent)) return
    const detail = e.detail as { key?: string } | null
    if (!detail || detail.key === 'variant' || detail.key === undefined) {
      setVariant(loadPrefs().variant)
    }
  }
  window.addEventListener('hrv:prefs-changed', onPrefsChanged)
  return () => {
    window.removeEventListener('hrv:prefs-changed', onPrefsChanged)
  }
}, [])
```

**Return shape** (mirror `useTheme.ts:91`):
```typescript
return { variant, setVariant }
```

**Effects dropped vs useTheme** (RESEARCH §"Pattern 1: Orchestrator Hook" delta table, lines 277–286):
- Drop `MQL_QUERY` const (line 24) — variant is not OS-driven.
- Drop Effect 1 (`useTheme.ts:31-34`) — D-16 forbids `<html data-variant>` write.
- Drop Effect 2 (`useTheme.ts:38-55`) — no matchMedia subscription.

**Result:** ~30–35 LOC (vs useTheme's 92).

---

### `src/hooks/useVariantChoice.ts` (NEW — picker-side setter)

**Analog:** `src/hooks/useThemeChoice.ts` — direct verbatim mirror (RESEARCH §"Pattern 2: Picker Setter Hook", lines 289–325).

**Imports pattern** (verbatim from `useThemeChoice.ts:22-25`, type substitution only):
```typescript
import { useCallback, useState } from 'react'
import { loadPrefs, savePrefs } from '../storage/prefs'
import type { VisualVariantId } from '../domain/settings'
```

**Hook body** (verbatim mirror of `useThemeChoice.ts:27-46`; substitutions: `theme` → `variant` identifiers, `ThemeId` → `VisualVariantId`, `'theme'` → `'variant'` event detail key, export name `useThemeChoice` → `useVariantChoice`):
```typescript
export function useVariantChoice(): { variant: VisualVariantId; setVariant: (next: VisualVariantId) => void } {
  const [variant, setVariantState] = useState<VisualVariantId>(() => loadPrefs().variant)

  const setVariant = useCallback((next: VisualVariantId): void => {
    // 1. Fresh read of current envelope (do NOT use stale `variant` closure from mount).
    const current = loadPrefs()
    // 2. Write merged envelope — preserves theme/timbre/locale per Phase 14 D-17 per-field isolation.
    savePrefs({ ...current, variant: next })
    // 3. Update local React state for optimistic-UI (picker reflects change immediately).
    setVariantState(next)
    // 4. Dispatch custom event so useVisualVariant (in App) re-reads loadPrefs() and re-snapshots liveVariant.
    window.dispatchEvent(
      new CustomEvent('hrv:prefs-changed', { detail: { key: 'variant', value: next } }),
    )
  }, [])

  return { variant, setVariant }
}
```

**`useCallback` empty-deps contract:** preserved verbatim — picker callers (`VariantPicker`) get stable setter identity (same as `useThemeChoice`'s contract documented at `useThemeChoice.ts:30`).

---

### `src/styles/theme.css` (EDIT — rename + per-variant overrides)

**Analog:** the same file's current `.orb-layer--in/--out`, `.orb-ring--outer/--inner`, and `@media (prefers-reduced-motion: reduce)` blocks (lines 344–438).

**Rename pattern (mechanical search-replace)** — per CONTEXT.md D-15 / RESEARCH §"`.orb-ring--` → `.shape-marker--` CSS Rename Atlas":

| Site | Current | Post-Phase-17 |
|------|---------|---------------|
| theme.css:364-367 | `.orb-ring--outer { border-color: var(--color-ring-outer); border-width: 1.5px; }` | `.shape-marker--outer { border-color: var(--color-ring-outer); border-width: 1.5px; }` |
| theme.css:381-386 | `.orb-ring--inner { border-color: var(--color-ring-inner); border-width: 1.5px; opacity: 0; transition: opacity 400ms ease-in-out; }` | `.shape-marker--inner { …same… }` |
| theme.css:388-390 | `[data-phase='out'] .orb-ring--inner { opacity: 1; }` | `[data-phase='out'] .shape-marker--inner { opacity: 1; }` |
| theme.css:435-437 (inside `@media (prefers-reduced-motion: reduce)`) | `.orb-ring--inner { display: none; }` | `.shape-marker--inner { display: none; }` |

**Token block + tokens UNCHANGED** — `--color-ring-outer` / `--color-ring-inner` CSS variable names stay (RESEARCH §"CSS variable names UNCHANGED"); only the rule selectors rename.

**`.orb-layer--in/--out` UNCHANGED** (CONTEXT.md D-13 — rename deferred to v1.2). Source at theme.css:344-353:
```css
.orb-layer--in {
  background: linear-gradient(135deg, var(--color-orb-in-from), var(--color-orb-in-to));
  opacity: 1;
  transition: opacity 400ms ease-in-out;
}
.orb-layer--out {
  background: linear-gradient(135deg, var(--color-orb-out-from), var(--color-orb-out-to));
  opacity: 0;
  transition: opacity 400ms ease-in-out;
}
```

**`[data-phase='out'] .orb-layer--{in,out}` UNCHANGED** (theme.css:356-362) — crossfade contract preserved verbatim.

**NEW per-variant overrides to ADD** (RESEARCH §"`[data-variant]` overrides to ADD in theme.css", lines 481–509):

```css
/* Square variant overrides (D-05 + D-15) — geometric only */
[data-variant='square'] .shape-marker--outer {
  border-radius: 18%;
}
[data-variant='square'] .shape-marker--inner {
  border-radius: 18%;
}

/* Ring variant overrides (D-06 + D-15) — thinner marker stroke + radial-gradient body */
[data-variant='ring'] .shape-marker--outer {
  border-width: 1px;
}
[data-variant='ring'] .shape-marker--inner {
  border-width: 1px;
}
[data-variant='ring'] .orb-layer--in {
  background: radial-gradient(
    circle at center,
    transparent 0%, transparent 35%,
    var(--color-orb-in-from) 36%, var(--color-orb-in-to) 100%
  );
}
[data-variant='ring'] .orb-layer--out {
  background: radial-gradient(
    circle at center,
    transparent 0%, transparent 35%,
    var(--color-orb-out-from) 36%, var(--color-orb-out-to) 100%
  );
}
```

**Reduced-motion `@media` block** (theme.css:430-438): keep `dialog.modal-fade` rule; rename `.orb-ring--inner` → `.shape-marker--inner` inside the block. No new per-variant `@media` rules (CONTEXT.md D-14 — class reuse satisfies VARIANT-04).

**CR-01 inline-style invariant preserved** (theme.css:419-424 comment) — the `.orb` scale is set via JS inline `transform: scale(...)`. CSS MUST NOT introduce `transform: none !important` inside the reduced-motion `@media` block (would silently nuke JS-controlled MID_SCALE).

---

### `src/app/App.tsx` (EDIT — hook invocation + sessionVariantRef + BreathingShape prop)

**Analog:** the same file — additive edits at known anchors per CONTEXT.md D-09/D-10/D-11 + RESEARCH §"App.tsx Snapshot Mechanics", lines 832–845.

**Type import to add** (next to existing `import type { SessionSettings } from '../domain/settings'` at line 37):
```typescript
import type { SessionSettings, VisualVariantId } from '../domain/settings'
```

**Hook import to add** (next to `import { useTheme } from '../hooks/useTheme'` at line 16):
```typescript
import { useVisualVariant } from '../hooks/useVisualVariant'
```

**Hook invocation site** (App.tsx:139 — sits next to `useTheme()`):
```typescript
useTheme() // Phase 16 THEME-01..04: orchestrates <html data-theme> writes …
const { variant: liveVariant } = useVisualVariant() // Phase 17 VARIANT-01..07: live state + cross-tab/same-tab sync (no global attribute write — D-16)
```

**`sessionVariantRef` declaration** — add near the existing session-related refs (App.tsx:164–177 cluster; RESEARCH recommends "near line 164-169 (next to startGenerationRef and planRef — same scoping intent)"):
```typescript
// Phase 17 D-09: captured-at-Start snapshot. While non-null (during an active session
// including lead-in), `BreathingShape` receives this frozen value and ignores `liveVariant`.
// Belt-and-suspenders against a cross-tab storage event that the picker-disable cannot block (D-10).
const sessionVariantRef = useRef<VisualVariantId | null>(null)
```

**Snapshot write inside `onStartClick`** — per RESEARCH §"App.tsx Snapshot Mechanics" line 840, inject **between** App.tsx:314 (`const generation = ++startGenerationRef.current`) and App.tsx:315 (`setAppPhase('lead-in')`):
```typescript
const generation = ++startGenerationRef.current
// Phase 17 D-10: capture-at-session-start — set BEFORE lead-in begins so the visual variant
// is frozen for the entire session (lead-in + breath loop). Reset in the leave-running cleanup
// effect below. D-11: audio reconstruction does NOT re-snapshot — orthogonal subsystems.
sessionVariantRef.current = liveVariant
setAppPhase('lead-in')
```

**Snapshot clear in cancel-during-lead-in branch** (App.tsx:294-307; RESEARCH recommends optional cleanup):
```typescript
if (appPhase === 'lead-in') {
  startGenerationRef.current += 1
  clearLeadInTimeouts()
  setLeadInDigit(null)
  setAppPhase('idle')
  audioAnchorRef.current = null
  planRef.current = null
  sessionVariantRef.current = null  // Phase 17 D-10 — tidy clear; redundant with leave-running effect but avoids 1 frame of stale ref
  void audioStop()
  …
}
```

**Snapshot clear in leave-running cleanup effect** (App.tsx:462-518; RESEARCH line 842 recommends line 476 site next to `audioAnchorRef.current = null` and `planRef.current = null`):
```typescript
audioAnchorRef.current = null
sessionVariantRef.current = null  // Phase 17 D-10 — release the captured variant so next Start re-reads liveVariant
planRef.current = null
```

**`BreathingShape` JSX mount** (App.tsx:610-613) — thread the `variant` prop:
```tsx
<BreathingShape
  variant={sessionVariantRef.current ?? liveVariant}
  frame={appPhase === 'running' ? session.liveFrame : null}
  leadInDigit={appPhase === 'lead-in' ? leadInDigit : null}
/>
```

**D-11 verification — no edits to `onAudioReanchorRequired`:** The audio reconstruction callback at App.tsx:129-136 writes `audioAnchorRef.current` and never touches `sessionVariantRef`. Phase 5.1 / Phase 9 reconstruction is a within-session recovery — variant ref stays orthogonal (RESEARCH §"Reconstruction non-interaction (D-11)").

---

### Test files

#### `src/components/OrbShape.test.tsx` (NEW)

**Analog:** `src/components/BreathingShape.test.tsx` (the existing 273-line file). **Mechanical migration** per CONTEXT.md item 10: move Body + LeadIn test cases (lines 22-87 + the entire "Phase 5.1 Plan 04 WR-03 structural contract" block 89-272) into a new `OrbShape.test.tsx`, renaming imports `BreathingShape` → `OrbShape` and the queries from class `.orb-ring--outer/--inner` → `.shape-marker--outer/--inner`.

Test seed (verbatim from `BreathingShape.test.tsx:12-20`):
```typescript
const sampleFrame: SessionFrame = {
  phase: 'in',
  phaseLabel: 'In',
  phaseProgress: 0,
  cycleIndex: 0,
  elapsedMs: 0,
  remainingMs: null,
  isComplete: false,
}
```

WR-03 structural contract assertions (verbatim from `BreathingShape.test.tsx:106-188`) — must move to OrbShape.test.tsx and update class-name selectors:
```typescript
// OLD: container.querySelector('.orb-ring--outer')
// NEW: container.querySelector('.shape-marker--outer')
```

`render(<BreathingShape frame={sampleFrame} />)` → `render(<OrbShape frame={sampleFrame} />)`. (OrbShape has no `variant` prop.)

#### `src/components/SquareShape.test.tsx` + `RingShape.test.tsx` (NEW)

**Analog:** `BreathingShape.test.tsx` — same test scaffolding, **per-variant assertions** added (UI-SPEC §A11y Contract — `data-variant` attribute presence; CONTEXT.md item 10 — body scale interpolation, lead-in digit overlay, reduced-motion fixed-scale path).

Required additional assertions (RESEARCH §"Common Pitfalls → Pitfall 1"):
```typescript
it('data-variant="square" is present on Body shape root', () => {
  const { container } = render(<SquareShape frame={sampleFrame} />)
  const root = container.querySelector('[role="img"]')
  expect(root).toHaveAttribute('data-variant', 'square')
})

it('data-variant="square" is present on LeadIn shape root (D-22 — both render sites)', () => {
  const { container } = render(<SquareShape frame={null} leadInDigit={2} />)
  const root = container.querySelector('[role="img"]')
  expect(root).toHaveAttribute('data-variant', 'square')
})
```

Parameterize across variants with `it.each` (CONTEXT.md `<specifics>` — "Vitest `it.each([...])` for per-variant parameterized tests"):
```typescript
it.each([
  { Component: SquareShape, variant: 'square' as const },
  { Component: RingShape,   variant: 'ring'   as const },
])('$variant: data-variant attribute present on Body + LeadIn roots', ({ Component, variant }) => {
  // …
})
```

**Reduced-motion mock pattern** carried forward from existing tests — mock `usePrefersReducedMotion` to return `true`, assert `transform: scale(0.79)` on the `.orb` div (mirror of `BreathingShape.test.tsx:59-66`):
```typescript
import * as prm from '../hooks/usePrefersReducedMotion'
vi.spyOn(prm, 'usePrefersReducedMotion').mockReturnValue(true)
```

#### `src/components/BreathingShape.test.tsx` (EDIT — slim to dispatch-only)

**Analog:** the same file's null-guard test (line 23-26) + lead-in-priority test (line 51-57). Remove all Body/LeadIn structural assertions (those move to OrbShape.test.tsx). Add dispatch-by-variant smoke:
```typescript
it.each(['orb', 'square', 'ring'] as const)(
  'renders the correct child component when variant=%s and frame is provided',
  (variant) => {
    const { container } = render(<BreathingShape variant={variant} frame={sampleFrame} />)
    const root = container.querySelector('[role="img"]')
    expect(root).toHaveAttribute('data-variant', variant)
  },
)
```

Keep the null-return idle guard test (line 23-26) — but now with the required `variant` prop:
```typescript
it('renders null when both frame and leadInDigit are absent (D-04 dispatcher guard)', () => {
  const { container } = render(<BreathingShape variant="orb" frame={null} />)
  expect(container.firstChild).toBeNull()
})
```

#### `src/hooks/useVisualVariant.test.ts` (NEW)

**Analog:** `src/hooks/useTheme.test.ts` (201 LOC). Verbatim mirror **minus** matchMedia cases per RESEARCH §"`useVisualVariant` Test Layout (mirror of `useTheme.test.ts` minus mql cases)", lines 771–791.

Cases to copy verbatim (with `theme` → `variant` substitution):
- `seedPrefs` helper (`useTheme.test.ts:9-17`).
- `beforeEach/afterEach` (lines 42-51) — drop `delete document.documentElement.dataset.theme` (D-16 — no global write).
- 'seeds state from loadPrefs().variant at mount' (mirror of line 54).
- 'updates state via cross-tab storage event with key === STATE_KEY' (mirror of line 118).
- 'ignores cross-tab storage event with unrelated key' (mirror of line 146).
- 'updates state via same-tab hrv:prefs-changed CustomEvent with key="variant"' (mirror of line 166).
- 'ignores same-tab hrv:prefs-changed CustomEvent with key="theme"' (inverse of the existing line 186 case — variant filter rejects theme-key events).

Cases to DROP:
- `makeMqlMock` helper (lines 23-40) — no matchMedia subscription.
- 'resolves system theme via matchMedia.matches=…' (lines 61, 69, 77).
- 'does NOT attach matchMedia listener when initial theme is named' (line 96).
- 'cleans up matchMedia listener on unmount when theme is system' (line 107).

Cases to ADD (RESEARCH line 789):
- 'does NOT write document.documentElement.dataset.variant' — positive assertion of D-16 render-local invariant.

#### `src/hooks/useVariantChoice.test.ts` (NEW)

**Analog:** `src/hooks/useThemeChoice.test.ts` — verbatim mirror (RESEARCH §"`useVariantChoice` Test Layout", lines 793–809).

Copy all 6 cases verbatim with substitutions:
- 'initial state matches loadPrefs().variant when localStorage is pre-seeded' (mirror of line 31).
- 'setVariant("square") updates local state optimistically' (mirror of line 37, swap to non-default value).
- 'setVariant("ring") writes the new variant to disk via savePrefs' (mirror of line 48).
- 'setVariant("square") preserves other prefs fields' (mirror of line 63, verify theme/timbre/locale untouched).
- 'setVariant("square") dispatches hrv:prefs-changed CustomEvent with `{ key: "variant", value: "square" }`' (mirror of line 81).
- 'setVariant identity is stable across re-renders' (mirror of line 103).

#### `src/components/VariantPicker.test.tsx` (REPLACE)

**Analog:** `src/components/ThemePicker.test.tsx` (115 LOC). The existing 27-LOC stub (`VariantPicker.test.tsx`) is replaced wholesale (RESEARCH line 828) — the 3 stub cases ('renders "Variant: orb" when no prefs', etc.) are obsolete after Phase 17.

Copy all 7 cases verbatim with `theme` → `variant` substitutions per RESEARCH lines 815–824. Add a swatch-presence smoke (RESEARCH line 826):
```typescript
it('each option button renders a swatch span/svg with data-variant or SVG marker (D-12)', () => {
  render(<VariantPicker disabled={false} />)
  const radios = screen.getAllByRole('radio')
  expect(radios).toHaveLength(3)
  // Orb + Square use CSS-only swatch; Ring uses inline SVG (UI-SPEC §Inline Shape Swatches)
})
```

Seeding helper (mirror `ThemePicker.test.tsx:11-17`):
```typescript
function seedVariant(variant: VisualVariantId): void {
  const envelope = {
    version: 1,
    prefs: { theme: 'system', timbre: 'bowl', variant, locale: 'en' },
  }
  window.localStorage.setItem(STATE_KEY, JSON.stringify(envelope))
}
```

---

## Shared Patterns

### Cross-cutting: `'hrv:prefs-changed'` CustomEvent contract

**Source:** `src/hooks/useThemeChoice.ts:41-43` (dispatch site) + `src/hooks/useTheme.ts:77-89` (listener site).
**Apply to:** `useVariantChoice.ts` (dispatch) + `useVisualVariant.ts` (listen). CONTEXT.md D-22: one event name, three filtered consumers (Phase 16/17/18/19).

Dispatch (mirror `useThemeChoice.ts:41-43`):
```typescript
window.dispatchEvent(
  new CustomEvent('hrv:prefs-changed', { detail: { key: 'variant', value: next } }),
)
```

Listen (mirror `useTheme.ts:78-83`):
```typescript
const onPrefsChanged = (e: Event): void => {
  if (!(e instanceof CustomEvent)) return
  const detail = e.detail as { key?: string } | null
  if (!detail || detail.key === 'variant' || detail.key === undefined) {
    setVariant(loadPrefs().variant)
  }
}
```

The `detail.key === undefined` forward-compat branch is preserved verbatim (the broadcast-all case).

---

### Cross-cutting: Cross-tab `'storage'` listener filtered on `STATE_KEY`

**Source:** `src/hooks/useTheme.ts:60-70`.
**Apply to:** `useVisualVariant.ts` Effect 3. Verbatim mirror except handler body re-reads `loadPrefs().variant`:
```typescript
useEffect(() => {
  const onStorage = (e: StorageEvent): void => {
    if (e.key === STATE_KEY) {
      setVariant(loadPrefs().variant)
    }
  }
  window.addEventListener('storage', onStorage)
  return () => { window.removeEventListener('storage', onStorage) }
}, [])
```

Empty deps are correct (`setVariant` from useState is stable; `loadPrefs` and `STATE_KEY` are module-level — same justification as `useTheme.ts:59` comment).

---

### Cross-cutting: `savePrefs({ ...loadPrefs(), [field]: next })` envelope-merge

**Source:** `src/hooks/useThemeChoice.ts:34-36`. Verified at `useThemeChoice.test.ts:63-79` ('preserves other prefs fields — envelope merge contract').
**Apply to:** `useVariantChoice.ts` `setVariant` body. Fresh-read pattern is load-bearing (Phase 14 D-17 per-field isolation):
```typescript
const current = loadPrefs()
savePrefs({ ...current, variant: next })
```

Do NOT close over a stale `variant` value from mount. The `loadPrefs()` call inside the callback ensures cross-tab writes that happened between mount and click are picked up before the merge.

---

### Cross-cutting: Radiogroup picker UI (44×44 hit area + focus-visible + token-bound)

**Source:** `src/components/ThemePicker.tsx:17-53` (the full body).
**Apply to:** `VariantPicker.tsx`. Verbatim mirror of:
- Section header: `<p id="X-picker-label" className="text-sm font-semibold text-[var(--color-breathing-accent-strong)]">…</p>`.
- Wrapper: `<div role="radiogroup" aria-labelledby="X-picker-label" aria-disabled={disabled} className="mt-2 grid grid-cols-3 gap-2">`.
- Per-option button class triplet:
  - `baseClasses = 'min-h-12 rounded-full px-3 py-2 text-sm font-semibold shadow-sm transition motion-reduce:transition-none focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-breathing-accent focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-45'`
  - `selectedClasses = 'border-2 border-[var(--color-breathing-accent)] bg-[var(--color-breathing-bg-soft)] text-[var(--color-breathing-accent-strong)]'`
  - `unselectedClasses = 'border border-[var(--color-breathing-accent)] bg-[var(--color-breathing-surface)] text-[var(--color-breathing-accent-strong)] hover:bg-[var(--color-breathing-bg-soft)] active:bg-[var(--color-breathing-bg-soft)]'`
- Per-button attributes: `type="button" role="radio" aria-checked={selected} disabled={disabled}`.

Phase 17 addition: `flex flex-col items-center gap-1` appended to baseClasses (stack swatch over label per UI-SPEC §Inline Shape Swatches).

---

### Cross-cutting: Four-edge anchoring on `.orb` div (Phase 5.1 D-20)

**Source:** `src/components/BreathingShape.tsx:91-103` (Body) + `:186-196` (LeadIn). Test guarded by `BreathingShape.test.tsx:115-167`.
**Apply to:** `OrbShape.tsx`, `SquareShape.tsx`, `RingShape.tsx` — both Body AND LeadIn render sites:
```tsx
<div
  className="orb absolute rounded-{full,18%} motion-reduce:transition-none"
  style={{
    left: 0, right: 0, top: 0, bottom: 0,                        // NOT inset-0 (D-20)
    transform: `translate3d(0,0,0) scale(${String(orbScale)})`,  // translate3d first (Firefox compositor)
  }}
>
```

**MUST NOT use** `inset-0`, `width: 100%`, or `height: 100%` on the `.orb` div — Safari Desktop sizing math collapses to 58% / freezes the transform interpolation. Tests at `BreathingShape.test.tsx:106-131` lock this.

**Outer marker four-edge offsets** (`BreathingShape.tsx:73-77`):
```tsx
<span
  aria-hidden="true"
  className="shape-marker--outer absolute …border-solid"
  style={{ left: '-1.5px', top: '-1.5px', right: '-1.5px', bottom: '-1.5px' }}  // NOT `inset: -1.5px` (D-21)
/>
```
The `-1.5px` sub-pixel value counters Safari border-box gap at peak inhale; both render sites must match.

---

### Cross-cutting: `usePrefersReducedMotion` + MID_SCALE lock

**Source:** `src/hooks/usePrefersReducedMotion.ts` + `BreathingShape.tsx:44-51`. CSS contract at `theme.css:415-438`.
**Apply to:** All three variant Bodies (`OrbBody`, `SquareBody`, `RingBody`). LeadIn does NOT subscribe (`BreathingShape.tsx:152-159` comment — lead-in is constant by design).

The JS-driven MID_SCALE substitution is **the** reduced-motion mechanism — CSS does NOT set `transform: none` (theme.css:420-424 CR-01 rule). After the rename, the `@media (prefers-reduced-motion: reduce) .shape-marker--inner { display: none }` cascade applies to all variants automatically (D-14 — no per-variant `@media` block).

---

### Cross-cutting: THEME-UI-01 token-binding guard (no hardcoded color classes)

**Source:** `src/styles/theme.no-hardcoded-classes.test.ts` (Phase 16.1-07 guard).
**Apply to:** All new `.tsx` files (OrbShape, SquareShape, RingShape, useVisualVariant, useVariantChoice, VariantPicker).

All color references MUST go through `var(--color-*)` tokens via Tailwind v4 arbitrary syntax:
- `text-[var(--color-breathing-accent-strong)]` (correct)
- `bg-[var(--color-breathing-bg-soft)]` (correct)
- `border-[var(--color-breathing-accent)]` (correct)
- `text-slate-700`, `bg-white`, `text-black` (BANNED — THEME-UI-01 test fails)

The `text-breathing-accent` / `ring-breathing-accent` shorthand utilities (e.g. ThemePicker.tsx:34 `focus-visible:ring-breathing-accent`) are token-bound via Tailwind v4 `@theme` block — these ARE permitted (precedent in ThemePicker).

---

## No Analog Found

None — Phase 17 has full pattern coverage in the existing codebase. Every file maps to a near-exact analog (mostly `BreathingShape.tsx`, `ThemePicker.tsx`, `useTheme.ts`, `useThemeChoice.ts`, or their test files). No need to fall back to RESEARCH.md prose for any file.

---

## Metadata

**Analog search scope:**
- `src/components/` (33 files scanned; matches: `BreathingShape.tsx`, `ThemePicker.tsx`, `VariantPicker.tsx`, `BreathingShape.test.tsx`, `ThemePicker.test.tsx`, `VariantPicker.test.tsx`)
- `src/hooks/` (12 files scanned; matches: `useTheme.ts`, `useThemeChoice.ts`, `usePrefersReducedMotion.ts`, `useTheme.test.ts`, `useThemeChoice.test.ts`)
- `src/domain/settings.ts` (locked Phase 14 — read-only reference)
- `src/storage/prefs.ts` (locked Phase 14 — read-only reference)
- `src/styles/theme.css` (rename target + new override site)
- `src/app/App.tsx` (additive edit site at lines 16, 37, 139, ~165, ~315, ~476, 610)

**Files scanned:** 11 source + 6 tests + 2 styles/css + RESEARCH.md (canonical excerpts cross-validated against actual source).

**Pattern extraction date:** 2026-05-14

**Cross-validation:** RESEARCH.md code excerpts (e.g. `useTheme.ts` mirror skeleton at RESEARCH:236-275; Square body fragment at RESEARCH:522-564) verified against actual source files. No drift detected — RESEARCH.md excerpts are accurate snapshots of current source.
