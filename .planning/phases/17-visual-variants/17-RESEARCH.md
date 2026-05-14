# Phase 17: Visual Variants - Research

**Researched:** 2026-05-14
**Domain:** React render-only component extraction + CSS data-attribute variant cascade + render-local session capture mechanism
**Confidence:** HIGH (codebase verified; Phase 16 patterns are the direct mirror; CONTEXT.md D-01..D-24 already lock 90% of the design surface)

## Summary

Phase 17 is **mechanical extraction + two parallel render variants + one new attribute-driven CSS cascade**, sitting on top of an already-locked context (D-01..D-24). The shape of the work:

1. **OrbShape is a byte-identical move** of `BreathingShapeBody` + `BreathingShapeLeadIn` (lines 43-147 + 160-224 of the current `BreathingShape.tsx`) into a new file, with exactly one mechanical CSS class rename (`.orb-ring--outer/--inner` → `.shape-marker--outer/--inner`, D-15). The resulting `BreathingShape.tsx` collapses to a ~20-line dispatcher: idle null-return guard + variant switch.
2. **SquareShape + RingShape are CSS-only deltas** off OrbShape: same two-layer gradient construction (`.orb-layer--in/--out` reused per D-13), same scale kinematics (`MIN_SCALE → MAX_SCALE`, `MID_SCALE` reduced-motion), same overlay typography. Square swaps `rounded-full` for `rounded-[18%]` (planner picks final); Ring swaps the inner crossfade for a centered "hole" via inset transparency or radial mask; both apply marker overrides via the `[data-variant='X']` attribute selector on the shape root.
3. **`useVisualVariant` is `useTheme` minus two effects** (no apply-effect because `data-variant` is render-local per D-16; no matchMedia because variant is not OS-driven). Cross-tab `'storage'` listener + same-tab `'hrv:prefs-changed'` listener filtered on `detail.key === 'variant'` survive verbatim.
4. **`useVariantChoice` is `useThemeChoice` verbatim** with three string substitutions (`theme`→`variant`, `ThemeId`→`VisualVariantId`, `'theme'`→`'variant'` in event detail). ~47 LOC → ~47 LOC.
5. **Capture-at-start is a single new `useRef<VisualVariantId | null>(null)` in `App.tsx`**, written at the existing `startSession` handler (App.tsx:315 — `setAppPhase('lead-in')` site), cleared at the leave-running cleanup effect (App.tsx:462-518). The `variant` prop on `<BreathingShape>` becomes `sessionVariantRef.current ?? liveVariant`.
6. **VariantPicker is a `ThemePicker` mirror** with inline shape swatches in place of color swatches.

**Primary recommendation:** Sequence as a `Wave 0 preflight` (carry-forward green-gate baseline + atlas captured) → `Wave 1 CSS rename` (mechanical search/replace `.orb-ring--` → `.shape-marker--` across theme.css + 2 .tsx render sites + 2 test files, single commit) → `Wave 2 Orb extraction` (verbatim move; BreathingShape becomes dispatcher; tests split) → `Wave 3 Square + Ring shapes + hooks` (new files in parallel) → `Wave 4 VariantPicker + App wire-up` (snapshot ref + prop threading) → `Wave 5 phase close` (REQUIREMENTS/STATE/ROADMAP/SUMMARY). The Wave 1 rename must land before extraction because OrbShape inherits the new class names from the moment it is born — splitting the rename from the move avoids a two-commit window where one render site uses old names and the other uses new.

<phase_requirements>
## Phase Requirements

| ID | Description | Research Support |
|----|-------------|------------------|
| VARIANT-01 | User can choose Orb (default) + 2 alternates from SettingsDialog | §VariantPicker UI Construction §VariantPicker.tsx body — radiogroup over `VARIANT_OPTIONS` mirroring ThemePicker; D-12 inline swatches; D-21 `{ disabled }` prop contract |
| VARIANT-02 | Default = Orb; v1.0.1 behavior byte-identical for users who never open picker | §OrbShape Verbatim Extraction — proves zero-regression via git diff (orb code unchanged except class rename); `DEFAULT_VARIANT='orb'` already locked Phase 14 D-05 |
| VARIANT-03 | Picker disabled in-session; variant captured at start; no mid-session swap | §Capture-at-Start Mechanics + §rAF Frame-Identity Collision Analysis — `sessionVariantRef` snapshot in `startSession` handler; threaded as `ref.current ?? liveVariant` |
| VARIANT-04 | Every variant honors `prefers-reduced-motion: reduce` (fixed mid-scale + crossfade) | §Reduced-Motion Contract — all variants reuse `.orb-layer--in/--out` classes + shared `MID_SCALE` constant + shared `@media` block; `.shape-marker--inner { display: none }` rename preserves Phase 13 D-03 contract |
| VARIANT-05 | Every variant renders the 3-2-1 lead-in countdown digit | §Lead-In Digit Prop Path — each variant exports the LeadIn body with identical typography (`text-7xl/8xl` + `var(--color-orb-in-text)`) per D-08 |
| VARIANT-06 | 44×44 hit area + focus-visible ring on picker | §VariantPicker UI — direct mirror of ThemePicker's `min-h-12 focus-visible:ring-2` posture; D-24 carry-forward |
| VARIANT-07 | Persists via `Envelope.prefs.variant`; `tsc/lint/build/test` exit 0 | §Persistence — `loadPrefs/savePrefs` locked Phase 14 D-09, NOT edited here; per-commit green-gate (D-17) gates VARIANT-07 |
</phase_requirements>

## Project Constraints (from CLAUDE.md)

**Repo-level `CLAUDE.md` is absent** (verified via `ls`). User-level `~/.claude/CLAUDE.md` references RTK only — no project-overriding directives apply.

**Project skill directives:** `.claude/skills/` directory does not exist. No project-skill markdown to load.

**De facto project constraints** (extracted from `.planning/PROJECT.md` Key Decisions, applied verbatim to Phase 17):

- **Per-commit green-gate**: `tsc && lint && build && test` MUST exit 0 at every commit boundary (D-17 carry-forward; Phase 7 D-09 invariant).
- **Zero new npm dependencies** (D-18; Phase 14 D-15 + Phase 15 D-15 + Phase 16 carry-forward). Pure React 18 + Tailwind v4 + CSS custom properties + Vitest.
- **Strict TS + `strictTypeChecked` ESLint + `react-hooks/exhaustive-deps: error`** (Phase 7 baseline). New `// eslint-disable-*` lines require `// Reason:` annotation.
- **THEME-UI-01 token-binding guard** (`theme.no-hardcoded-classes.test.ts`) — no `text-{slate,teal}-*` / `bg-{slate,teal}-*` / `text-white` / `bg-white` / `text-black` / `bg-black` in production `.tsx`. New OrbShape/SquareShape/RingShape/VariantPicker `.tsx` files must use `var(--color-*)` tokens exclusively (D-23).
- **Locked-copy posture for picker labels** — Phase 19 owns translation; Phase 17 ships English labels `Orb / Square / Ring` verbatim (mirror of ThemePicker's `Light / Dark / System / Moss / Slate / Dusk` D-22).

## Architectural Responsibility Map

| Capability | Primary Tier | Secondary Tier | Rationale |
|------------|-------------|----------------|-----------|
| Variant render (DOM tree per shape) | Browser/Client (React + CSS) | — | Pure presentational concern; no SSR, no API |
| Variant geometry overrides (border-radius / border-width / mask) | Browser/Client (CSS attribute selector) | — | `data-variant` is render-local per D-16; CSS resolves via DOM ancestry |
| Variant state (live, cross-tab synced) | Browser/Client (React useState in `useVisualVariant`) | — | Same tier as `useTheme`; no global attribute write |
| Variant persistence (write to localStorage) | Browser/Client (`useVariantChoice → savePrefs`) | Storage layer (`prefs.ts` already locked) | Picker self-owns write path per Phase 15 D-02 + D-21 |
| Variant snapshot at session start | Browser/Client (`useRef` in App.tsx) | — | App orchestrator owns capture site; co-located with audio/wake-lock acquisition (D-10) |
| Variant prop threading to render | Browser/Client (App → BreathingShape dispatcher → child variant) | — | Pure prop-drilling, no context |
| Reduced-motion fallback | Browser/Client (CSS `@media` + JS `usePrefersReducedMotion`) | — | Shared across all variants via class reuse (D-14) |
| Lead-in digit overlay | Browser/Client (each variant exports its own `*LeadIn` body) | — | Identical typography across variants per D-08 |

**Tier-correctness sanity check**: This is a 100% browser-tier phase. No API, no SSR, no service worker, no edge concerns. Nothing belongs anywhere else.

## Standard Stack

### Core
| Library | Version | Purpose | Why Standard |
|---------|---------|---------|--------------|
| react | ^18.x | Render variants + state hooks | Existing baseline; no new dep [VERIFIED: package.json import lines] |
| typescript | ~5.x strict + strictTypeChecked | Type safety for `VisualVariantId` discriminant | Phase 7 baseline [VERIFIED: project-wide constraint] |
| tailwindcss | v4 | Utility classes for layout + token references | Existing v4 with @theme block in theme.css [VERIFIED: theme.css line 1] |
| vitest | latest | Unit + RTL test harness | Existing — 409+ tests at v1.0.1 ship [VERIFIED: PROJECT.md] |
| @testing-library/react | latest | Component + hook testing | Existing — used in all 14 component tests [VERIFIED: imports in *.test.tsx] |

### Supporting
None — Phase 17 introduces zero new dependencies (D-18 invariant).

### Alternatives Considered
| Instead of | Could Use | Tradeoff |
|------------|-----------|----------|
| Sibling `*Shape.tsx` files + dispatcher (D-01) | Single `BreathingShape` with `switch(variant)` internal | File balloons ~3x size; per-variant tests harder to isolate; rejected at D-01 |
| Sibling files | `Record<VisualVariantId, FC>` registry/map | YAGNI for 3 entries; rejected at D-01 |
| Render-local `data-variant` (D-16) | Global `<html data-variant>` like Phase 16 `data-theme` | Variant scope is render-only; global is over-reach; rejected at D-16 |
| Reuse `.orb-layer--in/--out` (D-13) | Rename to `.shape-layer--in/--out` | ~50+ touch sites; deferred to v1.2 ergonomics pass |

**Installation:**
```bash
# (none — Phase 17 is zero-dep)
```

**Version verification:** Skipped — zero new packages. All consumed libs are pinned at v1.0.1/v1.1 levels [VERIFIED: package.json untouched in Phase 17 scope].

## Architecture Patterns

### System Architecture Diagram

```
                  ┌──────────────────────────────────────────┐
                  │            localStorage                  │
                  │   STATE_KEY ('hrv:state:v1')             │
                  │   .prefs.variant: 'orb'|'square'|'ring'  │
                  └────────────────────┬─────────────────────┘
                                       │  loadPrefs() / savePrefs()
              ┌────────────────────────┼──────────────────────┐
              │                        │                      │
              ▼                        ▼                      ▼
    ┌──────────────────┐    ┌─────────────────────┐  ┌────────────────────┐
    │  useVisualVariant│    │  useVariantChoice   │  │ FOUC inline script │
    │  (in App.tsx)    │    │  (in VariantPicker) │  │ (NOT touched —     │
    │                  │    │                     │  │  variant has no    │
    │  - seed state    │    │  - read prefs       │  │  pre-paint cascade)│
    │  - storage event │    │  - savePrefs        │  └────────────────────┘
    │  - hrv:prefs-    │◀───│  - dispatch         │
    │    changed       │    │    'hrv:prefs-      │
    │    (key:variant) │    │    changed'         │
    └─────────┬────────┘    │    (key:variant)    │
              │             └─────────────────────┘
              │ { variant: liveVariant, setVariant }
              ▼
    ┌─────────────────────────────────────────────┐
    │              App.tsx                        │
    │                                             │
    │  sessionVariantRef = useRef<… | null>(null) │
    │                                             │
    │  onStartClick:                              │
    │    sessionVariantRef.current = liveVariant ─┼─► snapshot at lead-in
    │    setAppPhase('lead-in') ──────────────────┼─► (BEFORE audio/wake-lock acquire)
    │                                             │
    │  leave-running cleanup:                     │
    │    sessionVariantRef.current = null ────────┼─► reset on session end/reset
    │                                             │
    │  <BreathingShape                            │
    │    variant={ref.current ?? liveVariant} ────┼─► single source of truth
    │    frame={…}                                │
    │    leadInDigit={…} />                       │
    └────────────────────┬────────────────────────┘
                         │
                         ▼
    ┌──────────────────────────────────────────────────┐
    │  BreathingShape.tsx  (~20-line dispatcher)       │
    │                                                  │
    │  if (frame === null && leadInDigit == null)      │
    │      return null                       ─────────────► D-04 idle guard
    │                                                  │
    │  switch (variant) {                              │
    │    case 'orb':    return <OrbShape    .../>      │
    │    case 'square': return <SquareShape .../>      │
    │    case 'ring':   return <RingShape   .../>      │
    │  }                                               │
    └────────────────────┬─────────────────────────────┘
                         │
         ┌───────────────┼────────────────────┐
         ▼               ▼                    ▼
   ┌──────────┐  ┌─────────────┐    ┌──────────────┐
   │OrbShape  │  │ SquareShape │    │  RingShape   │
   │.tsx      │  │ .tsx        │    │  .tsx        │
   │          │  │             │    │              │
   │data-     │  │ data-       │    │  data-       │
   │variant=  │  │ variant=    │    │  variant=    │
   │ "orb"    │  │ "square"    │    │  "ring"      │
   │          │  │             │    │              │
   │<OrbBody> │  │<SquareBody> │    │ <RingBody>   │
   │<OrbLeadIn│  │<SquareLeadIn│    │ <RingLeadIn> │
   │          │  │             │    │              │
   │.orb-     │  │.orb-        │    │ .orb-        │
   │layer--in │  │layer--in    │    │ layer--in    │
   │.orb-     │  │.orb-        │    │ .orb-        │
   │layer--out│  │layer--out   │    │ layer--out   │
   │          │  │             │    │              │
   │.shape-   │  │.shape-      │    │ .shape-      │
   │marker--* │  │marker--*    │    │ marker--*    │
   └─────┬────┘  └──────┬──────┘    └──────┬───────┘
         │              │                   │
         └──────────────┼───────────────────┘
                        │
                        ▼
         ┌────────────────────────────────┐
         │       theme.css                │
         │                                │
         │  .orb-layer--in/--out          │
         │     (token-bound gradients —   │
         │      shared across variants    │
         │      per D-13)                 │
         │                                │
         │  .shape-marker--outer/--inner  │
         │     (renamed from .orb-ring--; │
         │      one class hierarchy)      │
         │                                │
         │  [data-variant='square']       │
         │    .shape-marker--outer        │
         │    { border-radius: 18% }      │
         │                                │
         │  [data-variant='ring']         │
         │    .shape-marker--outer        │
         │    { border-width: 1px }       │
         │                                │
         │  @media reduced-motion         │
         │    .shape-marker--inner        │
         │    { display: none }           │
         │  (Phase 13 D-03 carry-forward) │
         └────────────────────────────────┘
```

### Recommended Project Structure
```
src/
├── components/
│   ├── BreathingShape.tsx       # EDIT → ~20-line dispatcher (D-01/D-04)
│   ├── BreathingShape.test.tsx  # EDIT → dispatch smoke + idle null only
│   ├── OrbShape.tsx             # NEW → verbatim extraction (D-02)
│   ├── OrbShape.test.tsx        # NEW → orb-specific cases moved from BreathingShape.test
│   ├── SquareShape.tsx          # NEW → square render (D-05)
│   ├── SquareShape.test.tsx     # NEW
│   ├── RingShape.tsx            # NEW → ring render (D-06)
│   ├── RingShape.test.tsx       # NEW
│   ├── VariantPicker.tsx        # EDIT → real radiogroup body (D-12/D-24)
│   └── VariantPicker.test.tsx   # EDIT → replace 3 stub tests with picker tests
├── hooks/
│   ├── useVisualVariant.ts      # NEW → useTheme minus matchMedia + apply effect
│   ├── useVisualVariant.test.ts # NEW → mirror useTheme.test.ts minus mql cases
│   ├── useVariantChoice.ts      # NEW → useThemeChoice mirror
│   └── useVariantChoice.test.ts # NEW → mirror useThemeChoice.test.ts
├── app/
│   ├── App.tsx                  # EDIT → useVisualVariant + sessionVariantRef + prop threading
│   └── App.session.test.tsx     # EDIT → update 2 lines (.orb-ring-- → .shape-marker--)
├── styles/
│   └── theme.css                # EDIT → 4 rename sites + 2-3 [data-variant] override blocks
└── domain/settings.ts           # NOT EDITED (Phase 14 D-09 lock)
   storage/prefs.ts              # NOT EDITED (Phase 14 D-09 lock)
   components/SettingsDialog.tsx # NOT EDITED (Phase 15 D-01 lock)
```

### Pattern 1: Orchestrator Hook (useVisualVariant)
**What:** App-side hook seeded from prefs, listens for cross-tab + same-tab changes.
**When to use:** Always — exactly one mount in App.tsx (mirror of useTheme).
**Example (skeleton — copy verbatim from useTheme.ts minus 2 effects):**
```typescript
// Source: src/hooks/useTheme.ts (verbatim mirror minus Effect 1 [apply] + Effect 2 [mql])
import { useEffect, useState } from 'react'
import { loadPrefs } from '../storage/prefs'
import { STATE_KEY } from '../storage'
import type { VisualVariantId } from '../domain/settings'

export function useVisualVariant(): {
  variant: VisualVariantId
  setVariant: (next: VisualVariantId) => void
} {
  const [variant, setVariant] = useState<VisualVariantId>(() => loadPrefs().variant)

  // Effect 3: Cross-tab 'storage' listener — mirror of useTheme.ts:60-70
  useEffect(() => {
    const onStorage = (e: StorageEvent): void => {
      if (e.key === STATE_KEY) {
        setVariant(loadPrefs().variant)
      }
    }
    window.addEventListener('storage', onStorage)
    return () => { window.removeEventListener('storage', onStorage) }
  }, [])

  // Effect 4: Same-tab 'hrv:prefs-changed' — filter on 'variant' key (D-22)
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

**Delta from `useTheme.ts` (line-by-line):**

| useTheme.ts lines | Survives in useVisualVariant? | Reason |
|-------------------|------------------------------|--------|
| 24 `MQL_QUERY` const | NO | Variant is not OS-driven |
| 31-34 Effect 1 (apply data-theme) | NO | D-16: `data-variant` is render-local; no `<html>` write |
| 38-55 Effect 2 (gated matchMedia) | NO | Same reason as above |
| 60-70 Effect 3 (cross-tab storage) | YES, verbatim except `theme`→`variant` | Filter key STATE_KEY unchanged |
| 77-89 Effect 4 (same-tab CustomEvent) | YES, except filter `'theme'`→`'variant'` | D-22 — same event name, different key |

Resulting file size: ~30-35 LOC (vs useTheme's 92).

### Pattern 2: Picker Setter Hook (useVariantChoice)
**What:** Picker-side hook that reads prefs, exposes setter that writes + dispatches.
**When to use:** Called from VariantPicker; mirror of useThemeChoice.
**Example:**
```typescript
// Source: src/hooks/useThemeChoice.ts (verbatim mirror with string substitutions)
import { useCallback, useState } from 'react'
import { loadPrefs, savePrefs } from '../storage/prefs'
import type { VisualVariantId } from '../domain/settings'

export function useVariantChoice(): {
  variant: VisualVariantId
  setVariant: (next: VisualVariantId) => void
} {
  const [variant, setVariantState] = useState<VisualVariantId>(() => loadPrefs().variant)

  const setVariant = useCallback((next: VisualVariantId): void => {
    const current = loadPrefs()
    savePrefs({ ...current, variant: next })
    setVariantState(next)
    window.dispatchEvent(
      new CustomEvent('hrv:prefs-changed', { detail: { key: 'variant', value: next } }),
    )
  }, [])

  return { variant, setVariant }
}
```

**Substitutions vs useThemeChoice.ts (`diff` summary):**
- `theme` identifier → `variant` (5 sites)
- `ThemeId` type → `VisualVariantId` (3 sites)
- `'theme'` event detail key → `'variant'` (1 site)
- `useThemeChoice` → `useVariantChoice` (1 site, the export)
- No structural change. ~47 LOC → ~47 LOC.

**Co-location vs standalone file (D-21/D-22 hint):** Standalone file. Mirror useThemeChoice posture exactly — it's not a Phase 17 surface area to debate. Slim companion module is easier to test in isolation (mirrors `useThemeChoice.test.ts` posture).

### Pattern 3: Dispatcher Shell (~20-line BreathingShape.tsx)
**What:** Single null-guard + variant switch, delegating all render to the 3 sibling files.
**When to use:** The new shape of BreathingShape.tsx post-extraction (D-01 + D-04).
**Example:**
```typescript
// Source: synthesized from CONTEXT.md D-01 + D-04
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
  // D-01: switch on variant; each sibling owns Body + LeadIn
  switch (variant) {
    case 'square': return <SquareShape frame={frame} leadInDigit={leadInDigit} />
    case 'ring':   return <RingShape   frame={frame} leadInDigit={leadInDigit} />
    case 'orb':
    default:       return <OrbShape    frame={frame} leadInDigit={leadInDigit} />
  }
}
```

**Note on the switch:** The TS `VisualVariantId` discriminant is exhaustive (3 cases). `default → OrbShape` is defensive against a future 4th option leaking through `coerceVariant` (Phase 14 already returns DEFAULT_VARIANT='orb' for invalid stored values, so the default arm should never fire in practice). Planner may prefer to drop the `default` and rely on TS exhaustiveness — either is acceptable.

### Anti-Patterns to Avoid
- **Hand-coded variant registry / `Record<VisualVariantId, FC>` map** — rejected at D-01 (YAGNI for 3 entries; adds new abstraction surface).
- **Calling `useVisualVariant()` inside BreathingShape** — rejected at D-03 (couples render to orchestrator; capture-at-start awkward; bypasses snapshot ref).
- **Each variant owning its own idle null-return** — rejected at D-04 (3x duplication; YAGNI).
- **Per-variant `@media (prefers-reduced-motion)` blocks** — rejected at D-14 (class reuse covers it; drift risk).
- **New `--color-square-*` / `--color-ring-*` token sets** — rejected at D-13 (~255 hex × 5 palettes = effectively reopens Phase 16.3). Variant identity = shape only.
- **Live idle preview inside BreathingShape** — rejected at D-12 (Picker swatches own the preview surface).
- **Re-snapshotting `sessionVariantRef` on audio reconstruction** — rejected at D-11 (reconstruction is within-session recovery, not new session).
- **Renaming `.orb-layer--in/--out` to `.shape-layer--in/--out` in Phase 17** — deferred to v1.2 ergonomics pass per D-13 trade-off acknowledgment.

## Don't Hand-Roll

| Problem | Don't Build | Use Instead | Why |
|---------|-------------|-------------|-----|
| Cross-tab variant sync | Custom polling / focus listeners | Native `'storage'` event filtered on `STATE_KEY` | Already proven pattern in `useTheme.ts:60-70` + `App.tsx:117-127` |
| Same-tab variant sync after picker write | Pub-sub bus module | Native `CustomEvent('hrv:prefs-changed')` per D-22 | Forward-decl already in `useTheme.ts:76` for Phase 17/18/19 reuse |
| Variant validation | Inline `if` checks | `isValidVariant` + `coerceVariant` (already shipped Phase 14) | Phase 14 D-09 lock — predicates live in `domain/settings.ts` |
| Ring's hollow center | SVG library, custom mask logic, JS layout | CSS-only — either `border-radius:50%` on the layer + `background-color: var(--color-breathing-bg)` overlay disc, OR `mask-image: radial-gradient(transparent X%, black X%)` | See §Ring Hollow-Center Survey below — pick lowest-risk CSS technique |
| Square's rounded corners | Animation framework, SVG path | Plain `border-radius: 18%` (or planner-chosen) on `.orb` div under `[data-variant='square']` | Tailwind `rounded-[18%]` arbitrary value or CSS-only |
| Picker shape swatches | Image asset, sprite sheet | Inline mini renders using `.orb-layer--in` + same `.shape-marker` CSS (Option A); OR inline SVG `<svg>` with `stroke/fill` referencing `var(--color-orb-in-from)` (Option B) | See §VariantPicker Swatch Survey below |
| Session-start snapshot | `useMemo([sessionId])` inside BreathingShape | `useRef<VisualVariantId \| null>(null)` in App.tsx; set in `startSession` handler | D-09 — couples capture mechanism to App orchestrator, not render component |

**Key insight:** Phase 17 is mostly **copy-and-rename** with a tiny new CSS attribute surface. Every novel mechanism (cross-tab sync, prefs persistence, capture ref) has a direct Phase 14/15/16 precedent — research's primary job is to verify the precedent is reachable and document the exact rename atlas.

## Runtime State Inventory

> Phase 17 is a code/CSS change with no data migration. The variant pref field already exists in `Envelope.prefs.variant` (Phase 14 D-09 — already shipped). The default value `'orb'` is already the active behavior for users who never opened SettingsDialog. Nothing to migrate.

| Category | Items Found | Action Required |
|----------|-------------|------------------|
| Stored data | `Envelope.prefs.variant: VisualVariantId` already shipped Phase 14. Existing users have either `undefined` (coerced to `'orb'`) or `'orb'` (set via Phase 15 read-only stub) — both render Orb. | None — backward compatible by construction |
| Live service config | None — no external service | None |
| OS-registered state | None — pure browser app | None |
| Secrets/env vars | None | None |
| Build artifacts | None — Vite bundles fresh on each build | None — `npm run build` rebuilds; no caches with stale class names |

**Verified by:** `Envelope.prefs.variant` field exists at `src/storage/prefs.ts:27` (line 27 `variant: VisualVariantId`); coercer at line 46. `DEFAULT_VARIANT='orb'` at `src/domain/settings.ts:81`. No data path requires migration.

## OrbShape Verbatim Extraction (D-01 / D-02)

### Current `BreathingShape.tsx` structure (224 LOC verified)

| Lines | Block | Phase 17 destination |
|-------|-------|---------------------|
| 1-2 | Imports (`SessionFrame`, `usePrefersReducedMotion`) | OrbShape.tsx (same imports) + new `BreathingShape.tsx` dispatcher (only needs `SessionFrame` + `VisualVariantId` + sibling imports) |
| 4-11 | `BreathingShapeProps` interface | EDITED in dispatcher: add `variant: VisualVariantId` field per D-03. Sibling Orb/Square/Ring use `{ frame, leadInDigit }` only |
| 13-20 | `MIN_SCALE / MAX_SCALE / MID_SCALE` constants | OrbShape.tsx (single source of truth lives here per CONTEXT.md deliverables item 2). Square + Ring import from OrbShape or duplicate locally (planner picks — recommend import from `OrbShape` so the IN-01 keep-in-sync comment has one anchor) |
| 22-32 | Dispatcher comment block (`IN-04 + Phase 3 D-14`) | Dropped from new dispatcher (no longer split-for-hook-lifecycle since each Shape owns its own subscription); add a brief new comment explaining variant-switch + idle guard |
| 33-41 | `BreathingShape` (current dispatcher) | Replaced by new dispatcher (Pattern 3 above). Old function body is the 8-line skeleton that becomes the new file's whole contents |
| 43-147 | `BreathingShapeBody` (105 lines — orb body render) | OrbShape.tsx **`OrbBody`** verbatim. Rename `BreathingShapeBody → OrbBody`. Apply Wave 1 CSS rename (`.orb-ring--outer/--inner → .shape-marker--outer/--inner`, 2 sites: line 75 + line 127). Add `data-variant='orb'` to the root div at line 54-64 |
| 149-159 | LeadIn comment block | Move verbatim to OrbShape.tsx above `OrbLeadIn` |
| 160-224 | `BreathingShapeLeadIn` (65 lines — orb lead-in render) | OrbShape.tsx **`OrbLeadIn`** verbatim. Rename `BreathingShapeLeadIn → OrbLeadIn`. Apply Wave 1 CSS rename (2 sites: line 176 + line 207). Add `data-variant='orb'` to the root div at line 162-170 |

**Before/after structural sketch:**

| File | Before (LOC) | After (LOC) |
|------|--------------|-------------|
| `BreathingShape.tsx` | 224 | ~20-25 (dispatcher only) |
| `OrbShape.tsx` | — | ~190-200 (Body + LeadIn moved, plus 1 new `data-variant='orb'` attribute on each root) |
| `SquareShape.tsx` | — | ~140-170 (Body + LeadIn — square has no inner crossfade, slightly less code) |
| `RingShape.tsx` | — | ~150-180 (Body + LeadIn — ring needs hollow-center technique, slightly more CSS) |

**Verbatim extraction discipline:**
- DO NOT refactor common helpers in Wave 2 (D-02 rejected option (b) — "extract + refactor common helpers"). The orb code MUST diff as a pure move + 4 className renames + 2 data-variant additions. VARIANT-02 zero-regression is provable by `git diff -M` showing a renamed file with minimal hunks.
- DO NOT extract a `<MarkerOuter />` / `<MarkerInner />` / `<OrbLayers />` shared subcomponent in this phase. Cross-variant duplication is acceptable for the 3-variant footprint; revisit in v1.2 ergonomics pass.

**Idle null-return reorganization (D-04):**
- Current dispatcher (lines 33-41): checks `leadInDigit != null → render LeadIn`; `frame === null → return null`; else render Body.
- New dispatcher: checks `frame === null && leadInDigit == null → return null` FIRST; THEN switches on variant. Each variant's component does its own `leadInDigit != null` check internally (which the OrbShape extraction inherits verbatim from old lines 34-35 minus the null-frame branch which now happens upstream).
- **Caveat:** OrbBody can still receive `frame: SessionFrame | null` if planner keeps the prop type identical for symmetry — but practically, after the dispatcher's idle guard, at least one of (frame !== null, leadInDigit != null) is true at each sibling site. Planner choice: tighten the sibling's `frame` prop to `SessionFrame | null` with `leadInDigit?: 3|2|1|null` (matches current — see line 4-11), accept the redundancy, and let each sibling re-check (the existing branch at lines 34-39 already handles `leadInDigit != null` short-circuit; the `frame === null` branch at line 37-39 becomes dead code under the new dispatcher but it's harmless and identical to current).

**Recommended sibling prop shape (mirror existing):**
```typescript
export interface OrbShapeProps {
  frame: SessionFrame | null
  leadInDigit?: 3 | 2 | 1 | null
}
```
Each `*Shape.tsx` accepts identical props; the dispatcher above passes them through verbatim.

## `.orb-ring--` → `.shape-marker--` CSS Rename Atlas (D-15)

> **Scope:** A pure mechanical search/replace. Wave 1 task. Single commit. All sites below must change in lockstep — splitting them produces a half-renamed state that fails one or both render-site tests.

### Site inventory (verified via `grep -rn`):

**`src/styles/theme.css`** — 4 site groups:

| Line | Current | Becomes |
|------|---------|---------|
| 364 | `.orb-ring--outer {` | `.shape-marker--outer {` |
| 381 | `.orb-ring--inner {` | `.shape-marker--inner {` |
| 388 | `[data-phase='out'] .orb-ring--inner {` | `[data-phase='out'] .shape-marker--inner {` |
| 427 | `   - Phase 13 (D-03): .orb-ring--inner is suppressed (display: none)` (COMMENT) | Update comment text: `.shape-marker--inner` |
| 435 | `  .orb-ring--inner {` (inside `@media reduced-motion`) | `  .shape-marker--inner {` |

**Plus additional comment touches:** Line 369-380 comment block (`Phase 13 (D-03, D-05): inner reference ring …`) references `.orb-ring--inner` and `.orb-layer--out` — update the `.orb-ring--inner` mentions. Line 416-420 comment also mentions the inner-ring class — update.

**`src/components/BreathingShape.tsx`** — 4 className sites (will be moved to OrbShape.tsx in Wave 2):

| Line | Current | Becomes (in OrbShape.tsx after Wave 2 move) |
|------|---------|---------|
| 66 | (comment) `theme.css \`.orb-ring--outer { border-width: 1.5px }\`` | `.shape-marker--outer` |
| 75 | `className="orb-ring--outer absolute rounded-full border-solid"` | `className="shape-marker--outer absolute rounded-full border-solid"` |
| 114 | (comment) `inner reference ring at MIN_SCALE boundary` | (text-only, no class name mentioned in this comment) |
| 127 | `className="orb-ring--inner absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 rounded-full border-solid"` | `className="shape-marker--inner absolute …"` |
| 176 | `className="orb-ring--outer absolute rounded-full border-solid"` (LeadIn) | `className="shape-marker--outer …"` |
| 207 | `className="orb-ring--inner absolute …"` (LeadIn) | `className="shape-marker--inner …"` |

**Test files that grep for `.orb-ring--*` (MUST be updated synchronously in Wave 1):**

| File | Lines | Current selector | Becomes |
|------|-------|-----------------|---------|
| `src/components/BreathingShape.test.tsx` | 146, 162, 171, 234, 248, 257 | `.orb-ring--outer` / `.orb-ring--inner` (`querySelector` selectors + describe blocks) | `.shape-marker--outer` / `.shape-marker--inner` |
| `src/components/BreathingShape.test.tsx` | (describe titles + assertion messages) | `\`.orb-ring--outer\`` / `\`.orb-ring--inner\`` (~6 places) | `\`.shape-marker--outer\`` / `\`.shape-marker--inner\`` |
| `src/app/App.session.test.tsx` | 104, 105 | `'[aria-hidden="true"].orb-ring--outer'` / `'[aria-hidden="true"].orb-ring--inner'` | `'[aria-hidden="true"].shape-marker--outer'` / `'[aria-hidden="true"].shape-marker--inner'` |

**Other potential sites — verified clean:** Grep across `src/**` shows zero references to `.orb-ring--` outside the files above. No `.orb-ring` (without hyphens) references exist either. **Atlas is complete.**

### `[data-variant]` overrides to ADD in theme.css (D-15)

After the rename, add new per-variant override blocks. Suggested location: immediately after the `.shape-marker--outer/--inner` declarations (around current lines 364-390) so all marker geometry lives in one source-order region. Planner picks final values; suggested starting points:

```css
/* D-15: Square variant marker geometry — fixed rounded-square boundaries.
   Marker shape mirrors the body's border-radius so outer/inner markers align
   with the rounded-square boundary at MAX_SCALE / MIN_SCALE. */
[data-variant='square'] .shape-marker--outer {
  border-radius: 18%;  /* planner picks final after smoke at 18% / 22% / 25% */
}
[data-variant='square'] .shape-marker--inner {
  border-radius: 18%;
}

/* D-15: Ring variant marker geometry — thinner stroke since the Ring body is
   already an annulus; full 1.5px stroke would compete visually with the body. */
[data-variant='ring'] .shape-marker--outer {
  border-width: 1px;  /* planner picks final after smoke */
}
[data-variant='ring'] .shape-marker--inner {
  border-width: 1px;
}
```

Orb keeps the default rules (no `[data-variant='orb']` override needed since the default is the orb visual).

**Reduced-motion `.shape-marker--inner { display: none }` rule survives the rename automatically** — the rename atlas updates the class name and the rule continues to apply across all variants under reduced-motion (D-14).

## Square + Ring Kinematics Survey (D-05 / D-06)

### Square body recipe (D-05: scale-only kinematics)

**Same skeleton as OrbBody** with two deltas:

1. **The `.orb` wrapper keeps its name** (per D-13 trade-off acknowledgment — rename deferred to v1.2). Square's body still uses `<div className="orb absolute rounded-[18%] …">` instead of `rounded-full`. The class `.orb` only contributes `will-change: transform` (line 333-342 of theme.css) — non-shape-specific. Naming awkwardness is documented and accepted.

2. **The `.orb-layer--in/--out` spans drop `rounded-full`** and use `rounded-[inherit]` (Tailwind v4 arbitrary value) OR explicit `rounded-[18%]`. Recommend `rounded-[inherit]` since the parent `.orb` has the border-radius and the layers should match the parent's curvature regardless of variant. Planner picks.

3. **The root `<div role="img"> data-variant='square'`** triggers the marker overrides via CSS attribute selector.

**Concrete Square body fragment (mirror of BreathingShape.tsx lines 53-145):**
```tsx
return (
  <div
    role="img"
    aria-label={`Breathing shape: ${frame.phaseLabel}`}
    data-variant="square"               // NEW for variant geometry override
    data-phase={frame.phase}
    data-progress={progress.toFixed(3)}
    className="relative mx-auto my-12 grid place-items-center"
    style={{ width: 'var(--orb-size)', height: 'var(--orb-size)' }}
  >
    <span
      aria-hidden="true"
      className="shape-marker--outer absolute border-solid"
      style={{ left: '-1.5px', top: '-1.5px', right: '-1.5px', bottom: '-1.5px' }}
      // No `rounded-full` — CSS attribute selector applies border-radius per variant
    />
    <div
      className="orb absolute rounded-[18%] motion-reduce:transition-none"
      style={{
        left: 0, right: 0, top: 0, bottom: 0,
        transform: `translate3d(0,0,0) scale(${String(orbScale)})`,
      }}
    >
      <span aria-hidden="true" className="orb-layer--in absolute inset-0 rounded-[inherit]" />
      <span aria-hidden="true" className="orb-layer--out absolute inset-0 rounded-[inherit]" />
    </div>
    <span
      aria-hidden="true"
      className="shape-marker--inner absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 border-solid"
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

**Differences from OrbBody:** `rounded-full` → `rounded-[18%]` on the `.orb` div; `rounded-full` → `rounded-[inherit]` on the two layer spans; `rounded-full` dropped from the two marker spans (CSS handles border-radius per variant); `data-variant='square'` added to root.

**Starting border-radius recommendation:** `18%`. Per D-05 + the SPECIFICS block in CONTEXT.md: dev-server smoke at 18% / 22% / 25%; planner picks final after operator review. Higher % = more circle-like (less variant distinctness); lower % = more rigid square (more variant distinctness but may feel harsh at peak inhale).

### Ring body recipe (D-06: scale-only kinematics, hollow center)

The hollow center is the only non-trivial CSS decision. Survey:

#### §Ring Hollow-Center Survey

**Option A — Border-only "thick stroke":**
```css
/* Ring body — annulus via thick border on a transparent square */
[data-variant='ring'] .orb {
  background: transparent !important;  /* override inherited if needed */
  border: 15% solid var(--color-orb-in-from);  /* doesn't actually work — % border-width not in spec */
}
```
**Verdict: BLOCKED.** CSS `border-width` does not accept percentage values per CSS Backgrounds and Borders Level 3 spec. Must convert to `px` — but `--orb-size: clamp(180px, 35vw, 360px)` makes this responsive-fragile. **Reject.**

**Option B — Two concentric divs with background-color:**
```tsx
// Outer disc (the ring stroke outer edge) → has color
<div className="orb absolute rounded-full" style={{ left:0, right:0, top:0, bottom:0, transform:... }}>
  <span aria-hidden="true" className="orb-layer--in absolute inset-0 rounded-full" />
  <span aria-hidden="true" className="orb-layer--out absolute inset-0 rounded-full" />
  {/* Inner disc (the hole) — transparent or page-background-tinted */}
  <span
    aria-hidden="true"
    className="absolute rounded-full"
    style={{
      left: '15%', top: '15%', right: '15%', bottom: '15%',  // 15% thickness
      background: 'var(--color-breathing-bg)',  // OR background: transparent + parent has no fill
    }}
  />
</div>
```
**Pro:** Pure CSS, no compositor cost beyond a 3rd absolute-positioned span; works under reduced-motion (the inner hole stays at fixed proportion).
**Con:** The "hole" is opaque BG color — if the orb is rendered on a non-uniform background (e.g. radial gradient main bg of App.tsx line 591), the hole shows the wrong color. Currently the breathing card chrome at App.tsx:608 uses `bg-[var(--color-breathing-surface)]/70` with `backdrop-blur` — the card is translucent over the page's radial gradient. An opaque inner disc with `bg: var(--color-breathing-bg)` would NOT match the local backdrop color exactly.
**Mitigation:** Use `background: transparent` and rely on the inner disc to be a "clipping" disc via z-index — but since the gradient layers are below, transparency would just show them. So you'd need `background-color: var(--color-breathing-surface)` instead, accepting the slight color mismatch vs `--color-breathing-bg` mode (negligible — both are the breathing-surface family and the visual deviation is invisible at scale).
**Confidence:** MEDIUM — works at smoke but visual fidelity depends on the local backdrop color.

**Option C — `mask-image: radial-gradient(transparent X%, black X%)`:**
```css
[data-variant='ring'] .orb-layer--in,
[data-variant='ring'] .orb-layer--out {
  -webkit-mask-image: radial-gradient(circle at center, transparent 0%, transparent 35%, black 36%);
  mask-image: radial-gradient(circle at center, transparent 0%, transparent 35%, black 36%);
}
```
**Pro:** True transparency — the hole shows whatever is behind the orb (chrome backdrop, page gradient, anything). No color-mismatch concern.
**Con:** `mask-image` requires `-webkit-mask-image` for older Safari; modern Safari (16.4+, March 2023) supports unprefixed `mask-image` but the prefixed form is needed for older iOS. Modest compositor cost (mask compositing on a per-frame scale-transformed element).
**Browser support:** Safari iOS 14+ supports `-webkit-mask-image` with radial-gradient (since 2020); modern Chrome/Firefox support `mask-image` unprefixed. The HRV app's target floor is iOS Safari 14+ (per v1.0 UAT matrix), so both prefixes ship as a pair.
**Risk note:** The Phase 5.1 Plan 04 Safari Desktop transform-freeze pitfall (BreathingShape.tsx lines 86-90) was related to property re-writes; mask-image is a static property after Wave-2-merge so it should not interact with the four-edge anchoring fix.
**Confidence:** MEDIUM — feature-complete in target browsers, but adds a per-frame compositor step (mask on scaled element). Real-device UAT recommended.

**Option D — `background: radial-gradient(...)` with transparent inner stop:**
```css
[data-variant='ring'] .orb-layer--in {
  background: radial-gradient(
    circle at center,
    transparent 0%, transparent 35%,
    var(--color-orb-in-from) 36%, var(--color-orb-in-to) 100%
  );
}
[data-variant='ring'] .orb-layer--out { /* same shape with orb-out tokens */ }
```
**Pro:** Single CSS property change; no extra div; works for both phases via existing `.orb-layer--in/--out` cascade.
**Con:** Overrides the existing `linear-gradient(135deg, …)` direction; ring will read as a radially-symmetric annulus (acceptable — visually correct for a ring).
**Verdict: SIMPLEST.** Override the gradient definitions per variant; the rest of the orb structure remains identical. Pure transparency for the inner hole; no compositor mask cost.
**Confidence:** HIGH — radial-gradient is a stable CSS feature across all target browsers since 2015.

**Recommendation: Option D** (radial-gradient with transparent inner stop). Lowest risk; smallest code surface; explicit and grep-friendly; works under reduced-motion automatically (the opacity crossfade on the layers still functions identically because we override only the `background` property, not the `opacity` transitions). Planner gets to pick the inner-radius percentage (suggested start: `35%` = inner-hole reaches 70% of body diameter — visually distinct but body still has meaningful stroke width to render the gradient).

**Suggested Ring CSS additions (post-rename, post-Option-D pick):**
```css
/* D-06 Ring body: override .orb-layer gradients to leave a radial transparent hole */
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

**Ring body annulus thickness:** `35%` inner-stop = 65% body radius from center to inner-hole; visually pleasant. Planner picks final value (CONTEXT.md SPECIFICS suggests "15% of `--orb-size`" but that conflicts with radial-gradient's `%` (which is body-relative not parent-relative). Recommend: keep the radial-gradient inner stop at 30-40% range for visual identity; planner picks via dev-server smoke.

**Note on Ring's phase label centering:** The label sits at z-index 10 above the orb (current line 134-144) — it overlays geometric center, which is also the hole's center. The label is readable on top of "nothing" (the chrome backdrop). Acceptable per D-08.

### Marker overrides under `[data-variant='square']` and `[data-variant='ring']`

Already covered above in the rename atlas. Planner sets final border-radius for square markers, final border-width for ring markers.

## VariantPicker Inline Shape Swatches Survey (D-12)

Three primitive options surveyed:

### §VariantPicker Swatch Survey

**Option A — CSS-only mini renders:**
```tsx
// Inside the button, a small div using the same .orb-layer + .shape-marker classes
<button …>
  <span className="block w-8 h-8 relative mx-auto" data-variant={id}>
    <span className="shape-marker--outer absolute inset-0 border-solid"
          style={{ borderRadius: id === 'square' ? '18%' : '50%' }} />
    <span className="orb-layer--in absolute inset-0"
          style={{ borderRadius: id === 'square' ? '18%' : '50%' }} />
  </span>
  <span className="text-sm">{label}</span>
</button>
```
**Pro:** Token-bound automatically (`.orb-layer--in` reads `--color-orb-in-from/-to`). Swatches re-skin on theme swap with zero work. Honors THEME-UI-01 (no hardcoded colors). Visually most faithful to the actual variant.
**Con:** Bigger DOM (3 spans × 3 buttons = 9 extra spans). Per-button inline `data-variant` attribute is awkward in JSX but workable. Ring swatch needs the Option-D radial-gradient applied — easiest if the swatch reuses the same `[data-variant='ring']` cascade.

**Option B — Inline SVG:**
```tsx
<svg width="32" height="32" viewBox="0 0 32 32">
  {id === 'orb' && <circle cx="16" cy="16" r="14" fill="var(--color-orb-in-from)" />}
  {id === 'square' && <rect x="2" y="2" width="28" height="28" rx="5.04" fill="var(--color-orb-in-from)" />}
  {id === 'ring' && <circle cx="16" cy="16" r="14" fill="none" stroke="var(--color-orb-in-from)" strokeWidth="6" />}
</svg>
```
**Pro:** Minimal DOM (1 SVG element per button). Tokens work via `fill="var(...)"` (CSS variables resolve in SVG presentation attributes — verified across Chromium, Firefox, Safari).
**Con:** Two visual sources (CSS for the main shape, SVG for the swatch) — drift risk if shape proportions evolve. Fixed `rx="5.04"` (≈ 18% of 28) hardcodes the square radius — must stay in sync with `[data-variant='square'] .shape-marker--outer { border-radius }`.

**Option C — Unicode glyph (●, ■, ◯):**
```tsx
<span style={{ color: 'var(--color-orb-in-from)' }}>
  {id === 'orb' ? '●' : id === 'square' ? '■' : '◯'}
</span>
```
**Pro:** Zero CSS, smallest DOM.
**Con:** Font-dependent rendering (varies by OS). No control over relative proportions across variants. Visually unprofessional vs the rest of the picker chrome.

**Recommendation: Option A** (CSS-only mini renders). Strongest token-binding fidelity. Re-skin-for-free on every future theme. Direct visual preview of the actual variant. The DOM bloat is bounded (3 buttons × 3 spans = 9 spans — trivially cheap). Planner may prefer Option B if they want a single SVG per button for cleaner JSX — both pass THEME-UI-01 since both reference tokens, not hardcoded classes. **Option C is REJECTED** — it does not give the user a faithful visual cue and Unicode-glyph rendering varies wildly across OSes.

**Concrete VariantPicker.tsx body (Option A pick — mirror of ThemePicker.tsx lines 16-53):**
```tsx
import { VARIANT_OPTIONS, type VisualVariantId } from '../domain/settings'
import { useVariantChoice } from '../hooks/useVariantChoice'

export interface VariantPickerProps {
  disabled: boolean
}

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
          // (selectedClasses/unselectedClasses/baseClasses — exact mirror of ThemePicker.tsx)
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
              {/* D-12 inline swatch — Option A CSS-only mini render */}
              <span className="block w-6 h-6 relative" data-variant={id} aria-hidden="true">
                <span
                  className="orb-layer--in absolute inset-0"
                  style={{ borderRadius: id === 'square' ? '18%' : '50%' }}
                />
              </span>
              <span>{label}</span>
            </button>
          )
        })}
      </div>
    </div>
  )
}
```

**Note on the swatch's data-variant attribute:** Cascading `[data-variant='ring']` selectors that apply radial-gradient to `.orb-layer--in` will render the ring swatch correctly because the same CSS rule applies (the inner-hole at center reveals chrome behind). Planner verifies via dev-server smoke. If the radial-gradient inner-radius (`35%`) is too small for a 24px swatch and the visual becomes a "solid-fill with tiny dot" instead of a ring, planner may need to either (a) increase the inner-stop % to ~45% for visual clarity at small sizes, or (b) use a discrete SVG icon for the ring swatch (hybrid Option A+B).

**Hit area:** `min-h-12` (48px) + `py-2` provides the 44×44 hit area floor per D-24 / VARIANT-06. Matches ThemePicker verbatim.

## `useVisualVariant` Test Layout (mirror of `useTheme.test.ts` minus mql cases)

Direct mapping from useTheme.test.ts (201 LOC):

| useTheme.test.ts case (line) | Survives in useVisualVariant.test.ts? | Reason |
|------------------------------|--------------------------------------|--------|
| `seedPrefs` helper (lines 9-17) | YES (verbatim, parameterize on variant) | |
| `makeMqlMock` helper (lines 23-40) | NO | No matchMedia subscription |
| `beforeEach/afterEach` (42-51) | YES (drop `delete document.documentElement.dataset.theme`) | No global write |
| 'seeds state from loadPrefs().theme' (54) | YES → 'seeds state from loadPrefs().variant' | |
| 'resolves system theme via matchMedia' (61, 69, 77) | NO | No system mode for variant |
| 'does NOT attach matchMedia listener' (96) | NO | No matchMedia ever attached |
| 'cleans up matchMedia listener on unmount' (107) | NO | No listener exists |
| 'updates state via cross-tab storage event' (118) | YES → variant version | |
| 'ignores cross-tab storage event with unrelated key' (146) | YES → variant version | |
| 'updates state via same-tab hrv:prefs-changed with key="theme"' (166) | YES → with key="variant" | |
| 'ignores same-tab hrv:prefs-changed with key="variant"' (186) | YES → renamed: 'ignores same-tab hrv:prefs-changed with key="theme"' | (mirror — variant-filter rejects theme-key events) |

Plus add: **'does NOT write document.documentElement.dataset.variant'** (positive assertion of D-16 render-local invariant — defensive guard that an over-eager future edit can't introduce a global write).

Resulting test file size: ~120-140 LOC (vs useTheme's 201).

## `useVariantChoice` Test Layout (mirror of `useThemeChoice.test.ts`)

Direct mapping from useThemeChoice.test.ts (112 LOC):

| useThemeChoice.test.ts case (line) | Survives? | Substitution |
|-----------------------------------|-----------|--------------|
| `seedPrefs` helper (10-12) | YES | unchanged |
| `DEFAULT_FULL_PREFS` (14-19) | YES | unchanged |
| `beforeEach/afterEach` (21-28) | YES | unchanged |
| 'initial state matches loadPrefs().theme' (31) | YES | → variant version |
| 'setTheme("dusk") updates local state optimistically' (37) | YES | → `setVariant('square')` |
| 'setTheme("dusk") writes the new theme to disk' (48) | YES | → variant version |
| 'setTheme("slate") preserves other prefs fields' (63) | YES | → variant version (preserves theme/timbre/locale) |
| 'setTheme("dark") dispatches hrv:prefs-changed' (81) | YES | → `{ key: 'variant', value: 'square' }` |
| 'setTheme identity is stable across re-renders' (103) | YES | → `setVariant` identity stable |

Resulting test file size: ~110 LOC (≈ identical to useThemeChoice).

## VariantPicker Test Layout (mirror of `ThemePicker.test.tsx`)

Direct mapping from ThemePicker.test.tsx (115 LOC):

| ThemePicker case (line) | Substitution |
|------------------------|--------------|
| 'renders the "Theme" section label' (29) | 'renders the "Variant" section label' |
| 'renders all 6 options as radio buttons with correct labels in order' (34) | 'renders all 3 options as radio buttons with correct labels in order' (Orb / Square / Ring) |
| 'aria-checked reflects the stored theme' (42) | seedVariant('square') → square has aria-checked=true |
| 'clicking an option writes the new theme to disk' (55) | clicking Ring writes variant: 'ring' to disk |
| 'clicking an option dispatches hrv:prefs-changed with { key: "theme" }' (69) | dispatch with `{ key: 'variant', value: id }` |
| 'when disabled=true, all 6 buttons have the disabled attribute' (84) | adapt to 3 buttons |
| 'when disabled=true, clicking does NOT write to disk' (93) | adapt |
| 'selected option retains its aria-checked highlight when disabled=true' (108) | adapt |

Plus add a swatch-presence smoke: 'each option renders a swatch span with data-variant={id}' to lock the D-12 inline-swatch primitive.

Existing `VariantPicker.test.tsx` (27 LOC stub) is **replaced wholesale** in Wave 4 — the 3 stub cases ('renders "Variant: orb" when no prefs', 'renders the picker label in enabled visual state', 'renders the picker in disabled visual state') are obsolete after the read-only stub is removed.

Resulting test file size: ~110-130 LOC.

## App.tsx Snapshot Mechanics (D-09 / D-10 / D-11)

### Verified locations in `src/app/App.tsx`:

| Concern | Line(s) | Action |
|---------|---------|--------|
| `useTheme()` invocation | 139 | ADD `useVisualVariant()` adjacent: `const { variant: liveVariant } = useVisualVariant()` |
| `useRef` declarations | 68, 85, 164, 169, 172, 177, 191 (cluster of session-related refs) | ADD `const sessionVariantRef = useRef<VisualVariantId \| null>(null)` near line 164-169 (next to startGenerationRef and planRef — same scoping intent) |
| `startSession` handler (the actual handler is `onStartClick`) | 292-361 (entire function) | ADD `sessionVariantRef.current = liveVariant` between line 314 (`const generation = ++startGenerationRef.current`) and line 315 (`setAppPhase('lead-in')`). **Before** `void wakeLockRequest()` (line 319), **before** `await audioStart(plan)` (line 324). This satisfies D-10 "before lead-in begins" |
| Cancel-during-lead-in branch | 294-307 | OPTIONAL but recommended: clear `sessionVariantRef.current = null` at line 306-307 next to `audioAnchorRef.current = null` and `planRef.current = null`, for tidiness. (Will be reset by the leave-running cleanup effect at line 462 regardless — but explicit clear here avoids 1 frame of stale-ref on the next Start click) |
| Leave-running cleanup effect | 462-518 | ADD `sessionVariantRef.current = null` at line 476 (between `audioAnchorRef.current = null` and `planRef.current = null` — same neighborhood) |
| `BreathingShape` JSX mount | 610-613 | EDIT to pass `variant`: `<BreathingShape variant={sessionVariantRef.current ?? liveVariant} frame={…} leadInDigit={…} />` |

**Reconstruction non-interaction (D-11):** Phase 5.1 / Phase 9 audio reconstruction lives in `useAudioCues` (`onAudioReanchorRequired` callback at App.tsx:129-136). It writes `audioAnchorRef.current` and never touches `sessionVariantRef`. No code path re-snapshots the variant ref. **Verified — no edits needed for D-11.**

**rAF frame-identity collision risk: WHY captureAtStart is needed.**

Without `sessionVariantRef`, `BreathingShape` would receive `variant={liveVariant}` directly. Then:
- A cross-tab `localStorage.setItem(STATE_KEY, ...)` write from another tab mid-session fires `useVisualVariant`'s storage listener (line ~ Effect 3) → calls `setVariant('square')` → React re-renders → `BreathingShape` receives new `variant` prop → dispatcher returns a different child component (`<SquareShape>` instead of `<OrbShape>`) → React unmounts OrbShape and mounts SquareShape → all hooks inside SquareShape (specifically `usePrefersReducedMotion` and any internal `useState`) re-initialize → the rendered `data-progress` attribute resets → the rAF tick at the next frame computes a `phaseProgress` against `frame.phaseProgress` from useSessionEngine, but **the DOM node identity changed**, meaning any CSS transition (the `.orb-layer--in/--out` opacity crossfade with `transition: opacity 400ms ease-in-out` at theme.css:344-353) restarts from its `@starting-style` default. The user sees a flash + a snap to scale(MID_SCALE)-or-MIN_SCALE + a crossfade restart. **Visually disruptive mid-session.**

With `sessionVariantRef`: the `variant` prop is **frozen** for the entire session. Cross-tab writes update `liveVariant` (the live state inside `useVisualVariant`) but `sessionVariantRef.current ?? liveVariant` ignores `liveVariant` while the ref is set. No re-mount. No flash. The next Start click reads the new `liveVariant` value naturally.

**Picker disable (Phase 15 D-08) is the user-facing first line of defense:** same-tab the user simply cannot fire `setVariant` mid-session. The snapshot ref is the belt-and-suspenders against the **cross-tab** path that the picker disable cannot block.

**Open question: pin "no swap mid-session" as a regression test?** Yes — recommended new test case in `App.session.test.tsx` (existing file): 'mid-session storage event with new variant does NOT swap the rendered shape'. Renders App with Orb selected, starts session, fires `StorageEvent` with new variant `'square'`, asserts the rendered shape is still Orb (`role="img"` queryable by 'Breathing shape: In' still resolves with orb-specific markers — e.g. `.shape-marker--outer` with `rounded-full` class still present on body since the dispatcher hasn't re-rendered). This pins the D-09/D-10 mechanism against future refactors.

## Reduced-Motion Contract (D-14)

**Current Phase 13 contract** (theme.css lines 415-438):
- Reduced-motion `@media` block contains exactly 2 rules: `dialog.modal-fade { transition: none }` + `.orb-ring--inner { display: none }`.
- The `.orb` scale is locked at MID_SCALE via **JS** (`reducedMotion ? MID_SCALE : liveScale` at BreathingShape.tsx:51) — not via CSS `transform: none`. The reason is documented inline at theme.css:419-424 (CR-01: inline styles do NOT win over !important stylesheet rules; CSS must NOT set `transform: none`).
- The `.orb-layer--in/--out` opacity crossfade (theme.css:344-353) survives reduced-motion intact — it IS the substitute phase indicator (D-07).

**Phase 17 inheritance for Square + Ring:**
- All three variants use `usePrefersReducedMotion()` inside their Body to compute `orbScale = reducedMotion ? MID_SCALE : liveScale` — identical pattern.
- All three variants render the same `.orb-layer--in/--out` spans → opacity crossfade preserved verbatim.
- After the `.orb-ring-- → .shape-marker--` rename (Wave 1), the `@media reduced-motion .shape-marker--inner { display: none }` rule applies across all variants. Square's inner shape-marker disappears; Ring's inner shape-marker disappears. The outer marker stays visible per variant (boundary cue preserved per D-07/D-14).
- VARIANT-04 is satisfied by class reuse — no new `@media` rules per variant.

**Reachability of `[data-variant='square']` + `[data-variant='ring']` overrides INSIDE the reduced-motion `@media` block:** CSS attribute selectors are fully cascade-aware. A rule like:

```css
@media (prefers-reduced-motion: reduce) {
  [data-variant='ring'] .orb-layer--in,
  [data-variant='ring'] .orb-layer--out {
    /* override radial-gradient for reduced-motion? — typically NOT needed */
  }
}
```

works correctly across all browsers. **However**, no Phase-17-specific reduced-motion rule should be needed — the variant-distinctness is purely geometric (`border-radius` for square, radial-gradient hole for ring); under reduced-motion both still apply normally and the body sits at MID_SCALE. The opacity crossfade carries the phase cue identically across all variants.

**Verified:** No edits to the reduced-motion `@media` block beyond the mechanical `.orb-ring--inner → .shape-marker--inner` rename in Wave 1.

## Persistence (VARIANT-07)

**No edits to `src/storage/prefs.ts`** — `loadPrefs/savePrefs/coercePrefs` are Phase 14 D-09 locked. The `Envelope.prefs.variant` field is already round-tripped through `coerceVariant → DEFAULT_VARIANT='orb'` for invalid values.

**Existing test coverage** (verified in `src/storage/prefs.test.ts:103-104`): `coerceVariant` accepts all `VARIANT_OPTIONS` members; rejects invalid values; falls back to 'orb'. **No new persistence-layer tests needed.**

**VariantPicker → savePrefs path** is exercised by `useVariantChoice.test.ts` ('setVariant("square") writes the new variant to disk') and `VariantPicker.test.tsx` ('clicking an option writes the new variant to disk') — both adapted from theme equivalents.

**FOUC inline script (Phase 16 S-02/S-03):** The variant has no pre-paint cascade — `data-variant` is render-local, NOT on `<html>`. **No edit to `index.html`.**

**Per-commit green-gate (D-17 / VARIANT-07 second clause):** `tsc && lint && build && test` exits 0 at every commit. Standard project floor.

## Common Pitfalls

### Pitfall 1: Forgetting `data-variant` on a render site (Square or Ring)
**What goes wrong:** `[data-variant='square'] .shape-marker--outer { border-radius: 18% }` is a no-op; markers render circular; visual identity collapses to "orb with rounded square body" (broken).
**Why it happens:** Square + Ring components each have TWO render sites (Body + LeadIn) — easy to set `data-variant='square'` on the Body root and forget the LeadIn root. The orb's existing render sites at BreathingShape.tsx:54 and :162 are the structural model.
**How to avoid:** Add explicit per-variant test assertion: 'data-variant attribute is present on shape root in Body AND in LeadIn render'. Use `it.each([{Component: SquareShape, variant: 'square'}, {Component: RingShape, variant: 'ring'}])`.
**Warning signs:** Marker shape doesn't update on variant pick.

### Pitfall 2: Lead-in digit color leak between variants under D-08
**What goes wrong:** CONTEXT.md D-08 says "Identical phase label + lead-in digit typography and centering across all 3 variants." Current OrbLeadIn (line 218) hardcodes `style={{ color: 'var(--color-orb-in-text)' }}`. If Square/Ring use a different `--color-orb-in-text` value (THEY DON'T per D-13 token reuse) the lead-in digit would render with a wrong tint vs the body.
**Why it happens:** D-13 already mitigates this (all variants reuse the same `--color-orb-*` tokens). Pitfall is theoretical — flagged to be defensive against an accidental v1.2 token-rename PR.
**How to avoid:** No action needed in Phase 17. Documented for future v1.2 token-rename phase.
**Warning signs:** Lead-in digit color differs between Orb vs Square/Ring at the same theme.

### Pitfall 3: Test that asserts `.orb-ring--inner` CSS classname survives Wave 1
**What goes wrong:** `App.session.test.tsx` lines 104-105 + `BreathingShape.test.tsx` lines 146/162/171/234/248/257 reference `.orb-ring--outer/--inner`. If these aren't updated to `.shape-marker--outer/--inner` synchronously in Wave 1, the tests fail.
**Why it happens:** The rename atlas (above) enumerates ALL sites — but a developer touching only theme.css will miss the test files.
**How to avoid:** Wave 1 commit must touch the 6 files together (theme.css + BreathingShape.tsx + 2 test files for orb sites + App.session.test.tsx). Test the commit boundary green-gate locally before merging.
**Warning signs:** Test failure on `expect(shape.querySelector('[aria-hidden="true"].orb-ring--outer')).not.toBeNull()` (line 104 of App.session.test.tsx) → orb-ring class no longer in DOM after rename.

### Pitfall 4: rAF-loop variant swap (the VARIANT-03 motivating threat)
**What goes wrong:** User opens picker, selects Square mid-session. Picker is disabled per Phase 15 D-08 — same-tab swap impossible. BUT, cross-tab `localStorage.setItem(STATE_KEY, …)` from another browser tab still fires the storage event → `useVisualVariant.setVariant('square')` → `liveVariant` flips → `BreathingShape variant={liveVariant}` re-evaluates if not captured → dispatcher re-renders with new variant → React un-mounts OrbShape and mounts SquareShape mid-frame → frame.phaseProgress is reset at the new component's `phaseProgress = Math.min(1, Math.max(0, frame.phaseProgress))` — wait, that's fine since `frame.phaseProgress` is a number. BUT: the CSS `.orb-layer--in/--out` opacity transitions (theme.css:344-353) have `transition: opacity 400ms ease-in-out` on the new DOM nodes — they start from `opacity: 1 / 0` initial state and crossfade fresh, producing a visible flash.
**Why it happens:** Cross-tab `'storage'` listener is fully active during a session (per useVisualVariant design). Picker disable is a UI-layer guard only.
**How to avoid:** `sessionVariantRef` snapshot (D-09/D-10). The `variant` prop is frozen at lead-in for the rest of the session.
**Warning signs:** Visual flash mid-session if a cross-tab write happens to fire. Reproduction: open two tabs, start session in tab A, fire `localStorage.setItem('hrv:state:v1', JSON.stringify({...current, prefs:{...current.prefs, variant:'square'}}))` from tab B's DevTools — without snapshot, tab A flashes a square; with snapshot, tab A continues unchanged.

### Pitfall 5: Stale-closure on the snapshot ref read
**What goes wrong:** `BreathingShape variant={sessionVariantRef.current ?? liveVariant}` reads `sessionVariantRef.current` at render time. If the snapshot is set but React re-renders happen for unrelated reasons (e.g. session frame ticks at rAF), the `?? liveVariant` fallback always evaluates against the LATEST `liveVariant` from `useVisualVariant`. This is correct behavior — ref read is fresh each render.
**Why it happens:** Not actually a pitfall — refs do NOT have stale-closure issues when read directly during render. Documented to defuse the misconception.
**How to avoid:** Always read `sessionVariantRef.current` inline at the JSX site; do NOT pre-compute it in a `useMemo` or `useState` (would couple to dependency arrays).
**Warning signs:** None — this is the correct pattern.

### Pitfall 6: Missing `border` on shape-marker outer/inner after rename
**What goes wrong:** The current CSS rule (theme.css:364-367) sets `border-color: var(--color-ring-outer); border-width: 1.5px;`. After rename to `.shape-marker--outer`, the rule must keep the `border-color` declaration. CSS attribute selectors `[data-variant='ring'] .shape-marker--outer { border-width: 1px }` only override `border-width` — `border-color` is inherited from the base rule.
**Why it happens:** Mechanical rename mistake — accidentally dropping a declaration during search/replace.
**How to avoid:** Wave 1 rename is a pure class-name substitution. Do NOT touch declarations. Test: `theme.contrast.test.ts` is structural (reads `--color-*` tokens) and won't catch a missing `border-color`, but visual UAT post-Wave-2 will.
**Warning signs:** Markers become invisible on a non-default theme; user UAT flags "no boundary cue" for square or ring.

### Pitfall 7: `border-radius: 50%` baked into Square's body via copy-paste
**What goes wrong:** OrbBody's `<span className="orb-layer--in absolute inset-0 rounded-full" />` uses `rounded-full` (= `border-radius: 9999px`). Squarely copy-pasting into SquareBody preserves the `rounded-full` → square renders as a circle inside the square wrapper.
**Why it happens:** Cargo-cult copy from OrbShape's verbatim extraction (D-02). Square is built FROM OrbShape, with `rounded-full → rounded-[18%]` or `rounded-[inherit]` substitutions.
**How to avoid:** Wave 3 task explicitly enumerates the `rounded-full` substitution sites (2 layer spans + 1 `.orb` div + 0 outer/inner markers since CSS now controls those). Plan_checker should verify SquareShape contains zero `rounded-full` strings.
**Warning signs:** Square renders as a circle inside a square wrapper; markers respect the square geometry but body doesn't.

### Pitfall 8: Ring picker swatch invisible at small size
**What goes wrong:** The Option D radial-gradient with `transparent 0%, transparent 35%` at body scale (~360px) shows a clear annulus. At swatch scale (24px), 35% inner-radius = 8.4px transparent hole, 0.6px stroke ring → invisible without anti-aliasing tricks.
**Why it happens:** Same CSS technique applied at vastly different scales.
**How to avoid:** Two options:
- (a) Add a swatch-specific override: `[data-variant='ring'] .swatch .orb-layer--in { background: radial-gradient(transparent 45%, var(--color-orb-in-from) 46%, ...) }` (wider hole → thinner ring at small scale)
- (b) Use Option B (inline SVG) for the Ring swatch only (hybrid approach)
Planner picks during VariantPicker development.
**Warning signs:** Ring swatch looks like a solid-filled orb at picker scale.

## Code Examples

Already covered in §Architecture Patterns above (Patterns 1, 2, 3) and inline survey sections (§Square body recipe, §Ring hollow-center, §VariantPicker swatch). The full file shapes for OrbShape/SquareShape/RingShape are mechanical from BreathingShape.tsx lines 43-147 + 160-224 — no novel "code example" needed beyond what's there.

## State of the Art

| Old Approach | Current Approach | When Changed | Impact |
|--------------|------------------|--------------|--------|
| Single `BreathingShape.tsx` rendering orb | Sibling shape files + dispatcher | This phase (D-01) | Per-variant extension path; cleaner test isolation |
| `.orb-ring--outer/--inner` class names | `.shape-marker--outer/--inner` | This phase (D-15) | Variant-agnostic class hierarchy |
| Theme-only `useTheme/useThemeChoice` paired hooks | Variant-only `useVisualVariant/useVariantChoice` paired hooks | This phase | Same pattern, fourth dimension is now Phase 18 timbre and Phase 19 locale (forward-decl) |
| Picker-disable as sole session-snapshot guard | Picker-disable + `sessionVariantRef` ref capture | This phase (D-09/D-10) | Closes cross-tab swap window |
| `.orb-layer--in/--out` named after orb but used only by orb | Same class names, used by all 3 variants | This phase (D-13) | Naming inconsistency accepted; rename deferred to v1.2 |

**Deprecated/outdated:** Phase 15 stub body of VariantPicker (read-only `Variant: orb` label) — replaced wholesale in Wave 4.

## Assumptions Log

| # | Claim | Section | Risk if Wrong |
|---|-------|---------|---------------|
| A1 | Option D (radial-gradient with transparent inner stop) renders correctly under reduced-motion across iOS 14+ Safari, modern Chrome, modern Firefox | §Ring Hollow-Center Survey | LOW — radial-gradient is stable since 2015; if a target browser flickers, fall back to Option B (concentric divs) |
| A2 | Tailwind v4 `rounded-[inherit]` arbitrary-value syntax resolves correctly | §Square body recipe | LOW — Tailwind v4 arbitrary values are spec-compliant; if not, use explicit `rounded-[18%]` on layer spans |
| A3 | jsdom resolves `[data-variant='X'] .shape-marker--outer { border-radius }` cascade correctly for the regression-guard test | §VariantPicker Test Layout / §Per-variant CSS attribute tests | MEDIUM — jsdom historically had cascade gaps; mitigation is to assert the `data-variant` attribute presence at the DOM level and skip the computed-style assertion (cf. theme.contrast.test.ts already uses a `<style>`-injection workaround) |
| A4 | Square's starting border-radius of `18%` is visually acceptable for v1.1 (no operator override at smoke) | §Square body recipe + CONTEXT.md SPECIFICS | LOW — planner picks final after dev-server smoke at 18/22/25%; operator approves at UAT |
| A5 | Ring's starting inner-radius of `35%` (radial-gradient inner-stop) produces visually distinct annulus at body scale | §Ring Hollow-Center Survey | LOW — planner picks final after dev-server smoke |
| A6 | The `sessionVariantRef.current = null` reset is correctly placed at App.tsx:476 (leave-running cleanup effect line) inside the existing line 462-518 effect | §App.tsx Snapshot Mechanics | LOW — the cleanup effect already fires on every status-leave-running transition (verified at line 463 `if (state.status !== 'running')`); inserting a single ref reset alongside `audioAnchorRef.current = null` (line 475) and `planRef.current = null` (line 476) is structurally identical to existing patterns |
| A7 | OrbBody's `usePrefersReducedMotion()` subscription pattern at line 44 carries over verbatim to SquareBody and RingBody (each variant has its own subscription) | §Square body recipe + §Ring body recipe | LOW — D-02 verbatim extraction preserves the per-variant-body subscription; React hooks rules allow this. Performance cost: 3 mql listeners attached during a session instead of 1 — negligible. Alternative: hoist `useReducedMotion` to dispatcher and pass as prop — REJECTED as it changes the existing subscription identity guarantee |

**If this table is non-empty:** A3 (jsdom cascade) is the only MEDIUM-risk assumption. Planner should plan around it: if Wave 1 commit's tests fail jsdom cascade lookups, fall back to selector-presence assertions (`querySelector('.shape-marker--outer')` + `expect(...).not.toBeNull()`) rather than computed-style assertions. The existing pattern in `BreathingShape.test.tsx` lines 144-188 uses selector-presence + inline-style regex matching for the same reason — proven to work.

## Open Questions

1. **Should `sessionVariantRef` reset also happen in the cancel-during-lead-in branch?**
   - What we know: The cancel branch at App.tsx:294-307 already clears `audioAnchorRef.current = null` (line 302) and `planRef.current = null` (line 303). The leave-running cleanup effect at line 462-518 also fires when state.status leaves running — but during lead-in the session has never started (SESS-05) so the cleanup effect doesn't fire on cancel.
   - What's unclear: If sessionVariantRef isn't reset in the cancel branch, the next Start click (with a different variant selected in the picker) would still see the old `sessionVariantRef.current` value at the very first render — until the new Start handler overwrites it.
   - Recommendation: Add `sessionVariantRef.current = null` to the cancel branch at App.tsx:306 (between the existing `audioAnchorRef.current = null` and `planRef.current = null`). Defensive — costs 1 line, prevents a 1-frame stale-ref window.

2. **Default-arm `OrbShape` in the dispatcher switch — keep or rely on TS exhaustiveness?**
   - What we know: `VisualVariantId` is exhaustive in TS (3 cases). A `switch(variant)` with all 3 cases is enough; TS will type-error if a future 4th option is added without a case.
   - What's unclear: Do we want defensive default-arm `case 'orb': default: return <OrbShape …/>` for runtime resilience if `coerceVariant` ever returns an out-of-band value (shouldn't happen per Phase 14 D-09 lock)?
   - Recommendation: Keep the `default: return <OrbShape …/>` defensive arm. Documents the design intent ("orb is the fallback default per VARIANT-02"). Negligible cost.

3. **Should SquareShape + RingShape import `MIN_SCALE/MAX_SCALE/MID_SCALE` from OrbShape, or duplicate the constants?**
   - What we know: CONTEXT.md deliverable 2/3 says "re-uses MIN_SCALE/MAX_SCALE/MID_SCALE constants verbatim — single source of truth still lives in OrbShape/constants module." Two reasonable interpretations:
     - (a) Export the constants from `OrbShape.tsx` and import in SquareShape + RingShape.
     - (b) Hoist the constants to a separate `src/components/shapeConstants.ts` module.
   - What's unclear: Which is preferred?
   - Recommendation: Option (a) — export from `OrbShape.tsx`. Smaller diff; single new file source-of-truth; matches CONTEXT.md wording. The IN-01 keep-in-sync comment (BreathingShape.tsx:13-17) gets carried into OrbShape.tsx verbatim.

4. **VariantPicker swatch fidelity vs DOM size — Option A (CSS-only mini renders) vs Option B (inline SVG)?**
   - What we know: Both pass THEME-UI-01 (both reference `var(--color-*)` tokens); both render at 24px swatch size. Option A is more faithful to actual variant rendering; Option B has a smaller per-button DOM footprint.
   - What's unclear: Which the operator prefers visually + ergonomically.
   - Recommendation: Option A by default per §VariantPicker Swatch Survey, but planner may switch to Option B (or hybrid Option A for orb+square + Option B for ring at small size — see Pitfall 8) without changing the phase scope.

5. **Should the dispatcher's idle-guard `if (frame === null && leadInDigit == null)` also account for `variant`'s value? Could `variant` ever be null at idle?**
   - What we know: `useVisualVariant` seeds from `loadPrefs().variant` which is coerced to a valid `VisualVariantId` (Phase 14 D-09 guarantee). The prop type is `VisualVariantId` (not `| null`). The snapshot ref's `?? liveVariant` fallback always yields a valid value.
   - What's unclear: Nothing.
   - Recommendation: No special handling needed. `variant` is always defined and valid at dispatcher entry.

## Environment Availability

| Dependency | Required By | Available | Version | Fallback |
|------------|------------|-----------|---------|----------|
| Node + npm | All Wave commits (run tsc/lint/build/test) | ✓ | (existing project floor) | — |
| Vitest | Test execution | ✓ | (pinned in package.json) | — |
| @testing-library/react | RTL tests | ✓ | (pinned) | — |
| Tailwind v4 | `rounded-[N%]` arbitrary values + token classes | ✓ | (existing project floor; verified via theme.css `@theme` block) | If `rounded-[inherit]` fails, fall back to explicit `rounded-[18%]` |
| jsdom | RTL test harness | ✓ | (existing) | If `[data-variant]` cascade fails (A3), fall back to selector-presence assertions |

**No missing dependencies.** No external tools, no CLIs, no services. Phase 17 is pure code/CSS.

## Validation Architecture

> Nyquist Dimension 8 validation map — `workflow.nyquist_validation = true` in .planning/config.json [VERIFIED].

### Test Framework
| Property | Value |
|----------|-------|
| Framework | Vitest (latest in package.json) + @testing-library/react + jsdom |
| Config file | `vitest.config.ts` (existing, untouched) |
| Quick run command | `npm test -- --run --reporter=dot` |
| Full suite command | `npm test -- --run` |
| Per-file run | `npm test -- --run path/to/file.test.tsx` |

### Phase Requirements → Test Map
| Req ID | Behavior | Test Type | Automated Command | File Exists? |
|--------|----------|-----------|-------------------|-------------|
| VARIANT-01 (picker UI) | Picker renders 3 options; clicking each updates state | unit (RTL) | `npm test -- --run src/components/VariantPicker.test.tsx` | YES (replace stub body); 3 stub tests removed, ~8 new tests added |
| VARIANT-01 (dispatch) | BreathingShape dispatcher renders correct child per variant prop | unit (RTL) | `npm test -- --run src/components/BreathingShape.test.tsx` | YES (slim to dispatcher tests; orb-specific tests move to OrbShape.test.tsx) |
| VARIANT-02 (orb byte-identity) | OrbShape matches v1.0.1 behavior after extraction | unit (RTL) + git diff -M | `npm test -- --run src/components/OrbShape.test.tsx` | NO — Wave 2 creates from BreathingShape.test.tsx moved cases |
| VARIANT-03 (in-session disable + snapshot) | Picker disabled while inSessionView; cross-tab storage event mid-session does NOT swap render | integration (App-level test) | `npm test -- --run src/app/App.session.test.tsx` | EDIT — add 'mid-session storage event does NOT swap shape' case (~30 LOC) |
| VARIANT-04 (reduced-motion) | Each variant body locks at MID_SCALE under prefers-reduced-motion | unit (RTL) parameterized `it.each([orb,square,ring])` | `npm test -- --run src/components/{OrbShape,SquareShape,RingShape}.test.tsx` | NO for SquareShape/RingShape; mirror existing OrbShape line-59 case |
| VARIANT-05 (lead-in digit) | `<*Shape leadInDigit={3}>` renders digit "3" in the orb area | unit (RTL) parameterized | `npm test -- --run src/components/{OrbShape,SquareShape,RingShape}.test.tsx` | NO; mirror current BreathingShape.test.tsx lines 33-49 |
| VARIANT-06 (a11y floor) | Picker buttons have min-h-12 + focus-visible class + aria-checked | unit (RTL) | `npm test -- --run src/components/VariantPicker.test.tsx` | NO; mirror ThemePicker.test.tsx pattern |
| VARIANT-07 (persistence + green gate) | savePrefs called on selection; tsc/lint/build/test exits 0 | unit (write path) + phase-level smoke | `npm test -- --run src/hooks/useVariantChoice.test.ts && npm run lint && npx tsc --noEmit && npm run build` | NO (useVariantChoice.test.ts); existing prefs.test.ts already covers coercer |

### Sampling Rate
- **Per task commit:** `npm test -- --run --reporter=dot` + `npx tsc --noEmit` (quick gate — under 30 seconds locally)
- **Per wave merge:** Full suite `npm test -- --run && npm run lint && npm run build` (per-commit green-gate per D-17 / VARIANT-07)
- **Phase gate:** Full suite green + manual smoke (operator dev-server pass) before `/gsd-verify-work`

### Wave 0 Gaps
- [ ] `src/components/OrbShape.test.tsx` — covers VARIANT-02 (orb body + lead-in moved cases)
- [ ] `src/components/SquareShape.test.tsx` — covers VARIANT-01 (square render) + VARIANT-04 (reduced-motion) + VARIANT-05 (lead-in digit)
- [ ] `src/components/RingShape.test.tsx` — covers VARIANT-01 (ring render) + VARIANT-04 + VARIANT-05
- [ ] `src/hooks/useVisualVariant.test.ts` — covers cross-tab + same-tab listeners; positive D-16 assertion
- [ ] `src/hooks/useVariantChoice.test.ts` — covers write path + dispatch event
- [ ] EDIT `src/components/BreathingShape.test.tsx` — slim to dispatcher + idle null only (remove orb-specific cases)
- [ ] EDIT `src/components/VariantPicker.test.tsx` — replace 3 stub cases with real picker cases (~8 cases)
- [ ] EDIT `src/app/App.session.test.tsx` — add VARIANT-03 mid-session-snapshot assertion (~30 LOC)
- [ ] EDIT `src/app/App.session.test.tsx` lines 104-105 — update `.orb-ring--*` → `.shape-marker--*`

*Framework + config exist; no new dependency. All gaps are NEW test files or selector renames within existing files.*

## Sources

### Primary (HIGH confidence)
- `src/components/BreathingShape.tsx` — extraction source — verified line-by-line for D-02 mechanical move
- `src/components/BreathingShape.test.tsx` — orb-specific test cases (lines 22-87 + 89-272) — verified for Wave 2 split
- `src/components/VariantPicker.tsx` — Phase 15 stub — verified 26 LOC, single read-only label
- `src/components/ThemePicker.tsx` — mirror for VariantPicker — verified 53 LOC radiogroup pattern
- `src/components/SettingsDialog.tsx` — verified picker prop contract `{ disabled }` (Phase 15 D-02 locked)
- `src/hooks/useTheme.ts` — pattern reference for useVisualVariant — verified 92 LOC, 4 effects
- `src/hooks/useThemeChoice.ts` — pattern reference for useVariantChoice — verified 47 LOC
- `src/hooks/useTheme.test.ts` — test pattern reference — verified 201 LOC
- `src/hooks/useThemeChoice.test.ts` — test pattern reference — verified 112 LOC
- `src/components/ThemePicker.test.tsx` — picker test pattern reference — verified 115 LOC
- `src/hooks/usePrefersReducedMotion.ts` — subscription pattern — verified 39 LOC
- `src/storage/prefs.ts` — Phase 14 D-09 lock surface — verified `loadPrefs/savePrefs/coercePrefs` shape
- `src/domain/settings.ts` — Phase 14 D-09 lock surface — verified `VARIANT_OPTIONS/VisualVariantId/isValidVariant/DEFAULT_VARIANT`
- `src/styles/theme.css` — verified all `.orb-ring--*` sites at lines 364/381/388/427/435 + comment touches at lines 369-380 and 416-420
- `src/styles/theme.no-hardcoded-classes.test.ts` — verified 10 banned patterns for THEME-UI-01 guard (lines 18-29)
- `src/app/App.tsx` — verified BreathingShape mount at line 610-613; useTheme at line 139; startSession at lines 292-361; leave-running cleanup at line 462-518
- `src/app/App.session.test.tsx` — verified `.orb-ring--` selector touches at lines 104-105
- `.planning/phases/17-visual-variants/17-CONTEXT.md` — D-01..D-24 lock surface — verified exhaustively
- `.planning/REQUIREMENTS.md` — VARIANT-01..07 verbatim acceptance criteria
- `.planning/PROJECT.md` — Key Decisions (Per-commit green-gate, Zero net-new deps, Next-session-only swap, English-first locked copy)
- `.planning/ROADMAP.md` — Phase 17 success criteria + dependency on Phase 15
- `.planning/STATE.md` — Phase 17 planning prerequisites — verified
- `.planning/phases/14-prefs-foundation/14-CONTEXT.md` — D-01/D-05/D-09 locks
- `.planning/phases/15-settingsdialog-shell/15-CONTEXT.md` — D-01..D-04/D-08/D-15/D-16 locks
- `.planning/phases/16-themes/16-CONTEXT.md` — useTheme pattern + `'hrv:prefs-changed'` event forward-decl
- `.planning/config.json` — verified `nyquist_validation: true`, `commit_docs: true`

### Secondary (MEDIUM confidence)
- CSS `mask-image` browser support — derived from MDN baseline (Safari 16.4+ unprefixed, `-webkit-mask-image` for older Safari 14+). Verified at MDN compatibility tables (not cross-checked this session — assumed from training); applies only to Option C in §Ring Hollow-Center Survey (which is the rejected alternative — Option D is the recommended approach and doesn't depend on mask-image)
- jsdom `[data-variant]` cascade resolution — empirical from theme.contrast.test.ts existing pattern; LOW-MEDIUM risk noted in A3

### Tertiary (LOW confidence)
- None — Phase 17 is entirely within the project's existing surface area; no novel external dependencies; no web searches required

## Metadata

**Confidence breakdown:**
- Standard stack: HIGH — zero new deps; existing patterns reused
- Architecture: HIGH — D-01..D-24 already lock the design; research's job was atlas + delta enumeration
- Extraction risk surface: HIGH — line-by-line mapping verified against current source
- CSS rename atlas: HIGH — `grep -rn` enumerated 100% of `.orb-ring--*` references
- useVisualVariant / useVariantChoice deltas: HIGH — direct line-by-line diff against useTheme/useThemeChoice
- Square + Ring kinematics: MEDIUM — recommendations made (rounded-[18%], radial-gradient inner-stop at 35%) but planner picks final values after operator smoke
- VariantPicker swatch: MEDIUM — Option A recommended but planner may prefer Option B/hybrid
- App.tsx snapshot site: HIGH — line 314 insertion + line 476 reset verified
- Reduced-motion contract: HIGH — class-reuse covers all variants automatically
- Persistence: HIGH — Phase 14 D-09 lock means zero edits
- Pitfalls: HIGH for Pitfalls 1, 3, 4, 6, 7 (mechanical issues); MEDIUM for Pitfall 8 (swatch scale)
- Validation Architecture: HIGH — direct mapping from existing test patterns

**Research date:** 2026-05-14
**Valid until:** 2026-06-13 (30 days — stable project surface; no fast-moving dependencies in scope)

---

*Phase 17 (Visual Variants) — Research complete; ready for `/gsd-plan-phase 17`.*
