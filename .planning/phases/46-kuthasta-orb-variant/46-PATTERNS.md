# Phase 46: Kuthasta orb variant - Pattern Map

**Mapped:** 2026-05-25
**Files analyzed:** 3 modified files (no new files)
**Analogs found:** 3 / 3 (all in-file or sibling-block; no cross-file searching needed)
**No RESEARCH.md:** CONTEXT.md is line-numbered and references spike-012 V5 verbatim — pattern mapping draws directly from the cited line ranges.

## File Classification

| Modified File | Role | Data Flow | Closest Analog | Match Quality |
|---|---|---|---|---|
| `src/featureFlags.ts` | config (typed feature-flag union + URL-query parser) | request-response (URL parse → typed value) | Same file, `BREATHING_SHAPE_FLAG.parse` clauses for `orb-halo` and `minimal-rings` (L69–70) | exact (extend in-place) |
| `src/components/OrbShape.tsx` | component (variant-branching React orb renderer) | request-response (props → DOM) | Same file: (1) `OrbContainer` `variant === 'minimal-rings'` branches (L329–330, L387–413); (2) `CheckmarkGlyph` co-located glyph (L134–155) | exact (extend in-place) |
| `src/styles/theme.css` | config (CSS custom-property tokens) | n/a (declarative theming) | Same file: light orb-halo block (L18–20) + dark orb-halo block (L68–70) | exact (extend both blocks) |

All three modifications are **in-file extensions of an established pattern** — no cross-file analog search required. The CONTEXT.md `<code_context>` block already named the analogs and CONTEXT.md `<decisions>` block already locked the spike-012 V5 values verbatim.

## Pattern Assignments

---

### `src/featureFlags.ts` (config, request-response)

**Analog 1: Union extension** (`src/featureFlags.ts:7`)

```typescript
export type BreathingShapeVariant = 'orb-halo' | 'minimal-rings'
```

Extend to:

```typescript
export type BreathingShapeVariant = 'orb-halo' | 'minimal-rings' | 'spiritual-eye'
```

**Analog 2: Alias-list parser clause** (`src/featureFlags.ts:64-73`) — the established pattern for every alias in this file:

```typescript
const BREATHING_SHAPE_FLAG = {
  queryParam: 'breathingShape',
  defaultValue: 'orb-halo' as BreathingShapeVariant,
  parse(rawValue: string): BreathingShapeVariant | null {
    const v = rawValue.trim().toLowerCase()
    if (v === 'orb-halo' || v === 'orb' || v === 'halo') return 'orb-halo'
    if (v === 'minimal-rings' || v === 'minimal' || v === 'rings') return 'minimal-rings'
    return null
  },
} satisfies QueryFeatureFlagSpec<BreathingShapeVariant>
```

**Conventions to mirror verbatim:**
- `.trim().toLowerCase()` normalization (line 68) — applies to all aliases.
- `if (v === '<canonical>' || v === '<alias>' || v === '<alias>') return '<canonical>'` — one-line clause per variant, canonical first, fallback aliases after.
- Unrecognized → `return null`. The outer `readQueryFeatureFlag` (L48–56) handles `null` by falling back to `defaultValue` (`'orb-halo'`).

**New clause to add** (insert before `return null` at L71, per D-08):

```typescript
if (v === 'spiritual-eye' || v === 'kuthasta' || v === 'star') return 'spiritual-eye'
```

**No `readFeatureFlags` change needed** — the aggregator at L99–106 reads `BREATHING_SHAPE_FLAG` generically and inherits the new variant automatically.

**Test surface analog** (referenced by CONTEXT.md "Claude's Discretion" — planner decides): `src/featureFlags.test.ts` already exercises alias-list cases for `orb-halo` and `minimal-rings`. The new case set follows the same shape:
- `'spiritual-eye'` → `'spiritual-eye'`
- `'kuthasta'` → `'spiritual-eye'`
- `'star'` → `'spiritual-eye'`
- case-insensitive: `'KUTHASTA'`, `' Star '` → `'spiritual-eye'`
- unrecognized: `'gibberish'` → `'orb-halo'` (default)

---

### `src/components/OrbShape.tsx` (component, request-response)

This file has **two co-located analogs** the new code mirrors: the variant branch shape (for `OrbContainer`) and the glyph component shape (for `StarGlyph`).

#### Analog 1a: Variant scalar derivation (`OrbShape.tsx:329-330`)

```typescript
const ringOpacity = variant === 'minimal-rings' ? V2_RING_OPACITY : V1_RING_OPACITY
const discShadow = variant === 'minimal-rings' ? V2_DISC_SHADOW : V1_DISC_SHADOW
```

**Pattern:** module-level constants (`V1_*`, `V2_*` at L65–72) + per-variant ternary at the top of `OrbContainer` body. The constants are co-located at file top, not extracted.

**Convention for spiritual-eye:** if any scalar (ring-opacity, disc-shadow, halo-opacity) differs from V1 for `spiritual-eye`, declare it as a module-level constant near L65–72 with the `_SPIRITUAL_EYE_` prefix (e.g. `SPIRITUAL_EYE_DISC_SHADOW`). Per the spike-012 contract (CONTEXT.md L78–79 + spike README L161, L177–178): **outer ring, progress arc, halo geometry, disc proportion, ring opacity are production-identical to V1**. The only scalars that change for spiritual-eye are the **halo token references** (Analog 1b) and the **disc background** (threaded via `discBg` prop — Analog 1c). No new module-level constants are required by the spike lock; planner / executor may introduce one for the NK back-phase darker indigo derivation (D-03), but the default approach (D-06 / D-07) is to declare it as a `theme.css` token, not as a TSX constant.

#### Analog 1b: Halo-region variant branch (`OrbShape.tsx:387-413`)

```tsx
{variant === 'minimal-rings' ? (
  <div
    aria-hidden="true"
    className="absolute"
    style={{
      inset: 0,
      borderRadius: '50%',
      background: 'var(--color-breathing-accent)',
      opacity: V2_HALO_OPACITY,
    }}
  />
) : (
  V1_HALOS.map((h, i) => (
    <div
      key={i}
      aria-hidden="true"
      className="absolute"
      style={{
        width: `${String(h.pct * 100)}%`,
        height: `${String(h.pct * 100)}%`,
        borderRadius: h.radius,
        background: `var(${h.token})`,
        transform: `translate(${String(h.shift[0])}px, ${String(h.shift[1])}px)`,
      }}
    />
  ))
)}
```

**Pattern:** binary `variant === 'minimal-rings' ? <V2> : <V1>` ternary inside `OrbContainer`. For three variants, this becomes a chained conditional OR a `V1_HALOS`-shaped per-variant array.

**Convention for spiritual-eye:** the spike lock says **halo geometry is production-identical** (3-layer halo at 100% / 86% / 74% with the same asymmetric radii and shifts — spike README L83–88). The only difference is the **token names** for halo-1 and halo-2 (halo-3 explicitly reuses the existing `--color-orb-halo-3` per D-06 + spike L168–169). Recommended shape:

- Introduce a `SPIRITUAL_EYE_HALOS` constant near `V1_HALOS` (L55–59) that swaps the `token` field only:
  ```typescript
  const SPIRITUAL_EYE_HALOS = [
    { token: '--color-orb-halo-1-spiritual-eye', pct: 1.0, radius: '48% 52% 51% 49% / 50% 49% 51% 50%', shift: [-4, 2] },
    { token: '--color-orb-halo-2-spiritual-eye', pct: 0.86, radius: '52% 48% 49% 51% / 49% 52% 48% 51%', shift: [3, -2] },
    { token: '--color-orb-halo-3', pct: 0.74, radius: '50% 50% 53% 47% / 51% 49% 51% 49%', shift: [-1, 3] },
  ] as const
  ```
- At L387–413, convert the binary ternary into a three-way select:
  ```tsx
  {variant === 'minimal-rings' ? (
    /* V2 single-disc halo (unchanged) */
  ) : variant === 'spiritual-eye' ? (
    SPIRITUAL_EYE_HALOS.map((h, i) => (/* same mapper as V1, different token */))
  ) : (
    V1_HALOS.map((h, i) => (/* unchanged */))
  )}
  ```
  Planner may prefer extracting a `HALOS_FOR_VARIANT` lookup if the chain reads worse than the ternary; the two V1 / spiritual-eye mappers are byte-identical except for the constant they iterate.

**`aria-hidden="true"` + `className="absolute"`** — verbatim on every halo `<div>`. Star and any new visual layer must mirror this.

#### Analog 1c: `discBg` prop threading (`OrbShape.tsx:291`, `OrbShape.tsx:420`)

```typescript
// Prop declaration (L291)
discBg: string

// Consumption (L420)
background: discBg,
```

**Call-site analogs** (all consumers of `OrbContainer` that pass `discBg`):

| Call site | Line | Current `discBg` | Spiritual-eye override (per D-01 / D-02 / D-03) |
|---|---|---|---|
| `OrbShape` → `showCompletion` → `OrbContainer` | L105 | `"var(--color-breathing-accent)"` | **unchanged** (Completion keeps production solid — D-02) |
| `OrbBody` → `OrbContainer` (Running) | L188 | `"var(--color-breathing-accent)"` | `"var(--color-orb-disc-spiritual-eye)"` when `variant === 'spiritual-eye'` |
| `OrbIdle` → `OrbContainer` (Idle still/ambient) | L218 | `"var(--color-breathing-accent)"` | `"var(--color-orb-disc-spiritual-eye)"` when `variant === 'spiritual-eye'` |
| `OrbLeadIn` → `OrbContainer` (LeadIn digit) | L250–253 + L263 | `nkPhase === 'back' ? accent-strong : accent` | LeadIn (digit ≠ null, no `nkPhase`): **unchanged** (D-02 — LeadIn keeps production solid). NK front: `var(--color-orb-disc-spiritual-eye)`. NK back: `var(--color-orb-disc-spiritual-eye-strong)`. |

**Pattern for selecting `discBg`:** the existing pattern at L250–253 (`OrbLeadIn`) is the canonical example of computing `discBg` as a local `const` from inputs — the new code mirrors this. Two practical shapes:

1. **Per call site** (matches current style): compute `discBg` as a local `const` immediately before the `<OrbContainer>` element at each of `OrbBody`, `OrbIdle`, and `OrbLeadIn` (NK branch only).
2. **Helper extracted at module top**: a `discBgForVariant(variant, { nkPhase, leadInDigit?, completion? })` pure function. Cleaner if all three call sites grow more than a one-line ternary.

The two-call-site pattern is the existing style; extracting a helper is acceptable but optional.

**Critical:** the LeadIn digit branch (digit ≠ null, no `nkPhase`) and the `showCompletion` branch (L99–112) **must keep the production solid** — they are not spiritual-eye-themed per D-02 / the disc-fill matrix.

#### Analog 2: `CheckmarkGlyph` → `StarGlyph` (`OrbShape.tsx:134-155`)

```tsx
// Spike 010 CheckMarker (index.html L1006-1014): 32x32 / 24-viewBox /
// 2.4-stroke check polyline. Inherits on-accent text color from the centre
// disc — renders as white on the accent slate.
function CheckmarkGlyph() {
  return (
    <span
      aria-hidden="true"
      className="relative z-10"
      style={{ color: 'var(--color-breathing-on-accent)' }}
    >
      <svg
        width="32"
        height="32"
        viewBox="0 0 24 24"
        fill="none"
        stroke="currentColor"
        strokeWidth="2.4"
        strokeLinecap="round"
        strokeLinejoin="round"
      >
        <polyline points="5 13 10 18 19 7" />
      </svg>
    </span>
  )
}
```

**Pattern (verbatim conventions for `StarGlyph`):**
- **Co-located** in `OrbShape.tsx` (not extracted to `src/components/StarGlyph.tsx`) — D-04 explicitly locks this; spike README L205–208 also recommends `OrbShape.tsx:134-155` as the model.
- Block comment at the top citing the spike + line refs.
- `<span aria-hidden="true" className="relative z-10" style={{ color: 'var(--color-breathing-on-accent)' }}>` wrapper — exact shape.
- Inner `<svg>` with `fill="none"` (or `fill="currentColor"` for filled shape — checkmark uses stroke; star will use fill) and `stroke="currentColor"` — both inherit the wrapper's `color`.
- No `aria-label` (the parent `OrbContainer` may carry one); glyph is decorative.
- No animation / no motion — pure SVG.

**Spike-locked star geometry** (CONTEXT.md L50, D-05 + spike README L172–176, "Locked V5 values"):
- `viewBox="0 0 100 100"` (NOT 24 like checkmark — star is in a 0..100 grid).
- 5-point polygon, point straight up, outer radius : inner radius = **2.5** (sharp silhouette).
- Star size **20% of disc** — applied at the rendered `width`/`height` (spike uses a percentage of the centre disc; with `DISC_PCT = 0.62`, the SVG element gets `width: '20%'` / `height: '20%'` relative to the disc, OR a fixed `width="<disc-px * 0.20>"`). The disc element at L414–427 sets `width: '${DISC_PCT * 100}%'`; the SVG inside should size at `20%` of that disc to match the spike's "20% of disc" lock. Planner picks the exact CSS expression at write time.
- Fill: `#ffffff` (light) / `#fafafe` (dark) — **per-theme value**. Two options:
  - (a) Use `currentColor` inherited from `var(--color-breathing-on-accent)` (which is `#ffffff` light, `#1a1d24` dark — **NOT what the spike wants**: the spike fills `#fafafe` in dark, not `#1a1d24`). So `currentColor` from `--color-breathing-on-accent` is **wrong** for star fill in dark. The spike says the star fill is white in both themes.
  - (b) Hardcode `fill="#ffffff"` and let dark theme handle the tiny `#fafafe` tweak via a CSS variable, e.g. `--color-orb-star-fill-spiritual-eye`. Planner should consider whether to add a 9th token (light `#ffffff` / dark `#fafafe`) — small but mirrors the spike lock more accurately than `currentColor`.
- Stroke: `rgba(255,255,255,0.20)` light / `rgba(255,255,255,0.12)` dark — same per-theme question; planner decides token-vs-hardcode.
- Stroke width: `0.5` in the 0..100 viewBox (very thin).

**Suggested 5-point star polygon at outer:inner = 2.5, centered at (50, 50), point up, outer radius = 40, inner radius = 16** (planner / executor computes exact `points=""` string; the SVG `<polygon points="...">` element is the only difference from `CheckmarkGlyph`'s `<polyline>`).

**Render gating in `OrbContainer`:** per D-01 the star renders **only during Running + Idle**. Spike's `OrbContainer` already accepts `children` (L302). The render decision is currently made *at each `OrbContainer` call site* — `OrbBody` passes `<CueGlyph>` (L193), `showCompletion` passes `<CheckmarkGlyph>` (L109), `OrbLeadIn` passes the digit `<span>` (L268–271). For spiritual-eye, the same call-site dispatch applies:

| Call site | Children pass for spiritual-eye |
|---|---|
| `OrbBody` (Running) | `<CueGlyph>` **+ `<StarGlyph>`** (CueGlyph already overlays the disc; star sits behind it as a centre kernel per spike's V5 — planner verifies layering against spike harness) — actually re-read D-01: "Star is Running + Idle only … star never coexists behind primary information." The CueGlyph is a phase-cue (In/Out, ▲▼, etc.) — it IS primary info. Planner clarifies: does the star coexist with CueGlyph during Running? Re-read spike: spike index.html shows V5 Running with **just the star** centred (no CueGlyph) at the moment of capture. **Open question for planner.** Conservative reading of D-01 is that star **replaces** CueGlyph for spiritual-eye Running. |
| `OrbIdle` | `<StarGlyph>` (Idle has no other centre content today — L213–222 passes no children) |
| `OrbLeadIn` digit | digit `<span>` (unchanged — D-02 explicitly excludes LeadIn from spiritual-eye styling) |
| `OrbLeadIn` NK front/back | `<children>` (OM count from NKShape — unchanged; D-01 puts star at Running+Idle only) |
| `showCompletion` | `<CheckmarkGlyph>` (unchanged) |

The "star never coexists behind primary information" rule (D-01) suggests planner / executor must clarify CueGlyph + StarGlyph co-occurrence during HRV/Stretch Running. The Idle case is clear (star alone). LeadIn / NK / Completion keep their existing centre content.

---

### `src/styles/theme.css` (config, declarative)

#### Analog: existing orb halo tokens

**Light block (L18-20):**
```css
--color-orb-halo-1: rgba(168, 173, 183, 0.22);
--color-orb-halo-2: rgba(120, 128, 140, 0.32);
--color-orb-halo-3: rgba(93, 104, 119, 0.50);
```

**Dark block (L68-70):**
```css
--color-orb-halo-1: rgba(74, 78, 88, 0.30);
--color-orb-halo-2: rgba(108, 113, 124, 0.38);
--color-orb-halo-3: rgba(150, 156, 168, 0.52);
```

**Conventions to mirror verbatim:**
- All themable tokens prefixed `--color-*` (existing comment at L23: "ONLY `--color-*` tokens are themable").
- Light tokens declared inside `@theme { … }` (L1–50).
- Dark tokens declared inside `[data-theme='dark']:root { … }` (L55–87).
- Comma-separated rgba / hex / gradient — values transcribed verbatim from the spike lock (CONTEXT.md `<canonical_refs>` + spike README "Locked V5 values" L165–178).
- A short inline comment above the new block citing the spike source (mirrors L2–4 / L52–54).

**New tokens to add** (per D-06 + spike-012 V5 lock):

Light block — insert near L20 (after existing `--color-orb-halo-3`):
```css
/* Spike 012 V5 spiritual-eye tokens (light).
   Source: .planning/spikes/012-spiritual-eye-orb/README.md "Locked V5 values".
   Halo-3 reuses the existing --color-orb-halo-3 (unchanged per spike L168–169). */
--color-orb-halo-1-spiritual-eye: rgba(202, 166, 98, 0.48);
--color-orb-halo-2-spiritual-eye: rgba(168, 148, 116, 0.44);
--color-orb-disc-spiritual-eye: radial-gradient(circle at 50% 42%, #4a5a96 0%, #34406f 60%, #2a356a 100%);
--color-orb-disc-spiritual-eye-strong: /* D-03 darker derivation — planner / executor proposes ~10-15% darker stops; operator UATs */;
```

Dark block — insert near L70:
```css
/* Spike 012 V5 spiritual-eye tokens (dark). */
--color-orb-halo-1-spiritual-eye: rgba(206, 168, 100, 0.45);
--color-orb-halo-2-spiritual-eye: rgba(170, 156, 122, 0.46);
--color-orb-disc-spiritual-eye: radial-gradient(circle at 50% 42%, #6c7cb6 0%, #4a5a96 60%, #38477e 100%);
--color-orb-disc-spiritual-eye-strong: /* D-03 derivation, dark variant */;
```

**Naming convention** (D-07): `<existing-token>-spiritual-eye` for new variant-scoped tokens; `-strong` suffix mirrors the `--color-breathing-accent` / `--color-breathing-accent-strong` pair at L11–12 / L61–62 of the same file.

**Token-not-themable check:** all four new tokens (× 2 themes = 8 declarations) are `--color-*` prefixed and live inside the proper `@theme` / `[data-theme='dark']:root` blocks. No drift from CONTEXT.md L23 convention.

---

## Shared Patterns

### Spike-locked values are applied verbatim

**Source:** Memory rule `[[feedback_spike_locked_values]]` + `[[feedback_spike_implementation_fidelity]]` + CONTEXT.md L62–82 ("Locked V5 values — verbatim — no re-tuning").

**Apply to:** `src/styles/theme.css` (all four light + four dark tokens), `src/components/OrbShape.tsx` (star geometry constants — outer:inner = 2.5, viewBox 0..100, stroke-width 0.5, fill `#ffffff` / `#fafafe`, size 20% of disc).

**Rule:** the hex / rgba / gradient strings + the geometric ratios above are NOT re-tuned at planning or implementation time. The only off-spike value in this phase is the NK back-phase darker indigo (D-03), explicitly noted as a derivation not in the spike (CONTEXT.md L93 — planner / executor proposes uniform-darkening ~10–15%; operator UATs and may re-spec).

### Spike is design, NOT features

**Source:** Memory rule `[[feedback_spike_is_design_not_features]]` + CONTEXT.md L21 ("No geometry / motion / ring-cue / reduced-motion / lead-in / completion-checkmark / idle-still / ambient affordance changes").

**Apply to:** `src/components/OrbShape.tsx` (no new branches outside the `variant === 'spiritual-eye'` ternary slot; no new props on `OrbShapeProps` / `OrbContainerProps`; no changes to `OrbBody` / `OrbIdle` / `OrbLeadIn` reduced-motion / lead-in / completion paths).

**Rule:** Phase 46 adds **zero new orb features** — no new affordance, no new control, no relocation. It is a third value of `BreathingShapeVariant`, plus the visual token block to back it. Anything that goes beyond this (e.g. new prop on `OrbShape`, new query-string flag, new state in the orb engine) is out of scope.

### No design locking in tests / comments

**Source:** Memory rule `[[feedback_no_design_locking]]`.

**Apply to:** `src/featureFlags.test.ts` (when planner adds the spiritual-eye / kuthasta / star alias cases), `src/components/OrbShape.test.tsx` (if spiritual-eye render assertions are added per CONTEXT.md "Claude's Discretion"), and any inline comments referencing the new tokens.

**Rule:** assertions and comments must not anchor downstream-modifiable values (specific hex stops in the darker-indigo derivation, exact Tailwind classes on the star wrapper, halo opacity numerics). Test the **alias-to-canonical mapping** and the **render branch**, not the pixel-exact appearance. Comments cite the spike doc, not duplicate its hex values.

### Co-located orb glyphs

**Source:** `src/components/OrbShape.tsx:134-155` (`CheckmarkGlyph`); CONTEXT.md D-04.

**Apply to:** the new `StarGlyph`.

**Rule:** small orb-local glyphs live inside `OrbShape.tsx`, not extracted to `src/components/StarGlyph.tsx`. Block-comment header cites spike source + line refs. Wrapper is `<span aria-hidden="true" className="relative z-10" style={{ color: 'var(--color-breathing-on-accent)' }}>`. SVG inherits color via `currentColor`.

### Theme-token block placement

**Source:** `src/styles/theme.css` L1–87.

**Apply to:** the four new spiritual-eye tokens × 2 themes.

**Rule:** all themable tokens are `--color-*` prefixed. Light block lives inside `@theme { … }` (L1–50). Dark block lives inside `[data-theme='dark']:root { … }` (L55–87). Inline comment above each new sub-block cites the spike README + the "Locked V5 values" section.

### Alias-list parser shape

**Source:** `src/featureFlags.ts:64-97` (every flag follows this shape).

**Apply to:** the new spiritual-eye clause in `BREATHING_SHAPE_FLAG.parse`.

**Rule:** `.trim().toLowerCase()` once at the top of `parse`; one-line `if (v === '<canonical>' || v === '<alias>' …) return '<canonical>'` per variant; `return null` at the bottom; `defaultValue` fallback handled outside the `parse` function by `readQueryFeatureFlag` (L48–56).

## No Analog Found

None. All three modified files have exact in-file analogs CONTEXT.md L116–118 explicitly named and located at line-level. No file in this phase lacks a precedent.

## Metadata

**Analog search scope:** in-file only (no cross-codebase search needed — CONTEXT.md L116–118 + L130–152 already named the analogs at line resolution).
**Files scanned:** 3 (`src/featureFlags.ts`, `src/styles/theme.css`, `src/components/OrbShape.tsx`).
**Pattern extraction date:** 2026-05-25.
**Project skills consulted:** none (`/Users/lucindo/Code/hrv/.claude/skills/` and `/Users/lucindo/Code/hrv/.agents/skills/` do not exist; spike-findings skill was deliberately removed in Phase 36 per memory rule `[[feedback_no_spike_wrapup_skill]]`).
