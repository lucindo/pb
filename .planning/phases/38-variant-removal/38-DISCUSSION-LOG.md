# Phase 38: Variant removal - Discussion Log

> **Audit trail only.** Do not use as input to planning, research, or execution agents.
> Decisions are captured in CONTEXT.md — this log preserves the alternatives considered.

**Date:** 2026-05-20
**Phase:** 38-variant-removal
**Areas discussed:** Pref-field disposition, Variant hooks fate, BreathingShape.tsx wrapper, VAR-06 drift-guard test

---

## Pref-field disposition

| Option | Description | Selected |
|--------|-------------|----------|
| Delete the field entirely | Remove `variant: VisualVariantId` from UserPrefs / DEFAULT_PREFS / coercePrefs / loadPrefs. Persisted 'square'/'diamond'/'orb' values become unknown keys on read, gracefully ignored by Phase 8 D-01 envelope tolerance. Phase 42's VITE_BREATHING_SHAPE is an env var, not a pref — the field has no future consumer. Matches Phase 37 D-02/D-03 (delete dead data-layer surface when consumers go). | ✓ |
| Keep field as single-value `'orb'` | VisualVariantId shrinks to `'orb'` (single-member union). Field stays on UserPrefs with constant default. coerceVariant always returns 'orb'. Persisted 'square'/'diamond' coerce to 'orb' on read (VAR-05). Vestigial but explicit. | |

**User's choice:** Delete the field entirely (recommended option).
**Notes:** Aligns with Tiger Style "no premature abstraction" and Phase 37's data-layer cleanup precedent. Phase 8 D-01 envelope tolerance makes the deletion graceful for returning users (unknown key preserved on disk, ignored on read). REQUIREMENTS VAR-05 "coerceSettings" wording is technically a sidecar typo — actual coercer is `coerceVariant` in `src/storage/prefs.ts`, not `coerceSettings` in `src/storage/settings.ts`. D-01 satisfies VAR-05 intent.

---

## Variant hooks fate

| Option | Description | Selected |
|--------|-------------|----------|
| Delete both hooks + tests | rm src/hooks/useVisualVariant.{ts,test.ts} and src/hooks/useVariantChoice.{ts,test.ts}. Once VariantPicker (writer) and App.tsx liveVariant subscription (reader) are gone, both hooks are dead code. Phase 37 D-02/D-03 precedent. Phase 42 doesn't reintroduce a per-user shape pref — VITE_BREATHING_SHAPE is build-time. | ✓ |
| Keep as constant-`'orb'` stubs | Hooks survive as no-op `{ variant: 'orb', setVariant: () => {} }` stubs. Costs: 4 files of dead-effect code; would need to delete in Phase 42 anyway. | |

**User's choice:** Delete both hooks + tests (recommended option).
**Notes:** Follows from D-01 — once the field is gone, the cross-tab/same-tab sync primitives have nothing to sync.

---

## BreathingShape.tsx wrapper

| Option | Description | Selected |
|--------|-------------|----------|
| Collapse to `<OrbShape />` | Delete src/components/BreathingShape.{tsx,test.tsx}. Replace 3 App.tsx call sites with `<OrbShape cue={...} frame={...} leadInDigit={...} strings={...} />`. Phase 42 will introduce a different wrapper (VITE_BREATHING_SHAPE env dispatch) so this wrapper has no future use. Tiger Style — no premature abstraction. NKShape stays untouched. | ✓ |
| Keep as single-branch passthrough | BreathingShape.tsx becomes a thin wrapper that always renders `<OrbShape />`. Saves a touch to App.tsx call sites now, but Phase 42 replaces this file anyway. | |

**User's choice:** Collapse to `<OrbShape />` (recommended option).
**Notes:** OrbShape already accepts the exact prop shape (`cue`, `frame`, `leadInDigit`, `strings`) so the replacement is mechanical. Phase 42 will introduce a different wrapper for env-driven V1/V2 dispatch — preserving this one for "shape stability" is hollow.

---

## VAR-06 drift-guard test

| Option | Description | Selected |
|--------|-------------|----------|
| Add VAR-06 fs-scan drift-guard | New `src/content/content.no-variants.test.ts` (or planner's chosen analog filename). Scans src/components/, src/app/, src/content/, src/styles/ for forbidden tokens: 'SquareShape', 'DiamondShape', 'VariantPicker', /variant:\s*['"]square['"]/, /variant:\s*['"]diamond['"]/, /\[data-variant='?(square\|diamond)'?\]/. Catches strings/CSS that bypass the type system. Exit ramp: a future deliberate phase that re-adds shape variants explicitly deletes this test. | ✓ |
| Compile-time union shrink only | Rely on `VisualVariantId = 'orb'` (or its removal) plus TypeScript exhaustiveness. Skips the fs-scan layer. Cheaper, but CSS strings and pt-BR catalog drift wouldn't trip type errors — VAR-06 'zero leftover references' would survive on review hygiene alone. | |

**User's choice:** Add VAR-06 fs-scan drift-guard (recommended option).
**Notes:** Matches the long-term value pattern Phase 37 STATS-05 established. The Phase 37 drift-guard is what makes the anti-gamification stance survive future contributions; same shape here for the single-shape stance.

---

## Claude's Discretion

- File-level commit grouping (single atomic vs split component-deletes / data-layer / i18n / App.tsx / drift-guard) — planner chooses based on git-history clarity. Tiger Style "small atomic commits" + Phase 36/37 PATTERNS favor split.
- Exact filename + scoped roots for the drift-guard test — planner follows the closest analog (`content.no-stats-ui.test.ts`).
- Order of plan files within the phase — planner may reorder if dependency analysis flips the order.
- Whether to inline-ban `'Square'` / `'Diamond'` / `'Quadrado'` / `'Losango'` display strings or rely on the UiStrings type-removal alone for catalog drift — planner picks the cleaner banlist shape during PATTERNS pass.

## Deferred Ideas

- **`VITE_BREATHING_SHAPE` dev toggle (V1 orb-halo / V2 minimal-rings)** — Phase 42.
- **`VITE_ORB_IDLE_BEHAVIOR` dev toggle (still / ambient)** — Phase 42.
- **`OrbShape.tsx` redesign (three-layer translucent-halo + solid centre disc, in-disc breath label)** — Phase 42.
- **REQUIREMENTS.md `coerceSettings` → `coerceVariant` wording fix** — informational tidy; the planner may surface it as a sidecar requirements-correction commit, or defer to a future docs sweep.
- **`shapeConstants.ts` filename rename** — could become `orbConstants.ts` once Square/Diamond are gone. Defer unless the planner wants to bundle it.
