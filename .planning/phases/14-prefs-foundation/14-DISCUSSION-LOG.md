# Phase 14: Prefs Foundation - Discussion Log

> **Audit trail only.** Do not use as input to planning, research, or execution agents.
> Decisions are captured in CONTEXT.md — this log preserves the alternatives considered.

**Date:** 2026-05-12
**Phase:** 14-prefs-foundation
**Areas discussed:** Enum allowlist scope, Defaults + locale ID format, API surface + file shape, Test coverage scope

---

## Enum allowlist scope

### Q1 — Theme allowlist scope

| Option | Description | Selected |
|--------|-------------|----------|
| Full v1.1 (light/dark/system + 3 palettes) | Lock `'light'\|'dark'\|'system'\|'moss'\|'slate'\|'dusk'` NOW. Phase 16 only adds CSS blocks, predicates untouched. | ✓ |
| Minimal (light/dark/system only) | Lock just 3 system modes. Phase 16 widens OPTIONS + predicate when palette names finalized. | |
| Mode + 'palette' bucket | Predicate allows mode union + a typed palette enum kept separate. Bigger upfront design. | |

**User's choice:** Full v1.1 (light/dark/system + 3 palettes)
**Notes:** Commits the project to `'moss'/'slate'/'dusk'` palette names final (not slot IDs).

### Q2 — Timbre / variant / locale allowlist

| Option | Description | Selected |
|--------|-------------|----------|
| Full v1.1 for all 3 (recommended) | TimbreId=`bowl\|bell\|sine\|chime`, VariantId=`orb\|square\|ring`, LocaleId=`en\|pt-BR`. Predicates final. | ✓ |
| Defaults only | Each downstream phase widens its own allowlist. Predicates re-edited 3 more times. | |
| Mixed — lock timbre/locale, defer variant names | Variant 'e.g.' less committed; lock first two, defer variant union to Phase 17. | |

**User's choice:** Full v1.1 for all 3 (recommended)

### Q3 — Source-of-truth for enum values

| Option | Description | Selected |
|--------|-------------|----------|
| OPTIONS array + derived type (recommended) | `THEME_OPTIONS = [...] as const satisfies readonly ThemeId[]` — mirrors BPM_OPTIONS. Single source of truth; picker UIs iterate array. | ✓ |
| Union literal type only | No iterable array; picker UIs maintain their own list (drift risk). | |
| Const enum | Project has zero const-enum usage; `isolatedModules` emit nuance. | |

**User's choice:** OPTIONS array + derived type

### Q4 — Palette name commitment

| Option | Description | Selected |
|--------|-------------|----------|
| Final: 'moss' / 'slate' / 'dusk' | Commit names now. Predicates + Phase 16 CSS rename together if changed later. | ✓ |
| Slot-only: 'palette-a' / 'palette-b' / 'palette-c' | Generic slot IDs; renaming a palette is label-only via I18N. | |
| Lock 'moss' only, slots for b/c | Hybrid: most-committed name locked, others stay generic until Phase 16. | |

**User's choice:** Final: 'moss' / 'slate' / 'dusk'

---

## Defaults + locale ID format

### Q1 — DEFAULT_THEME

| Option | Description | Selected |
|--------|-------------|----------|
| 'system' (recommended) | OS `prefers-color-scheme` track. Matches THEME-02 zero-config. | ✓ |
| 'light' | Explicit light mode; byte-identical to v1.0.1 visual baseline. | |
| 'dark' | Calm-first dark default; breaks v1.0.1 zero-regression. | |

**User's choice:** 'system'

### Q2 — Locale ID format

| Option | Description | Selected |
|--------|-------------|----------|
| 'pt-BR' (BCP-47 hyphen, recommended) | Web standard — matches `<html lang>`, `Intl.*`, `navigator.language`. | ✓ |
| 'pt_BR' (POSIX underscore) | Used in REQ I18N-05 example; mismatches BCP-47 + `<html lang>` downstream. | |
| Defer — lock at Phase 19 | Breaks 'predicates final, downstream zero-touch' commitment from area 1. | |

**User's choice:** 'pt-BR' (BCP-47 hyphen)
**Notes:** REQ I18N-05 uses `pt_BR` snake-case for `learnContent.ts` map key — Phase 19 must reconcile. Flagged in CONTEXT.md `<deferred>`.

---

## API surface + file shape

### Q1 — File layout

| Option | Description | Selected |
|--------|-------------|----------|
| NEW `src/storage/prefs.ts` (recommended) | Per research. Houses UserPrefs, DEFAULT_PREFS, coercers, load/save. Re-exported from `src/storage/index.ts`. | ✓ |
| Extend `src/storage/settings.ts` | Mixes session settings + customization prefs (distinct concerns). | |
| Per-dimension files (4 new) | Maximum modularity; 4 new files for low gain; aggregator still needed. | |

**User's choice:** NEW `src/storage/prefs.ts`

### Q2 — Aggregator + load/save surface

| Option | Description | Selected |
|--------|-------------|----------|
| Aggregator + per-field + load/save pair (recommended) | `coercePrefs` aggregator calls 4 per-field coercers. `loadPrefs`/`savePrefs` envelope round-trip. Mirrors `coerceSettings`. | ✓ |
| Per-field coercers only (literal ROADMAP SC3) | Callers compose via spread; App.tsx forced to call 4 coercers (leaky). | |
| Per-field only, NO load/save (defer to Phase 15) | Phase 15 owns envelope round-trip code that belongs in storage layer. | |

**User's choice:** Aggregator + per-field + load/save pair

### Q3 — Envelope.prefs static typing

| Option | Description | Selected |
|--------|-------------|----------|
| `prefs?: unknown` (recommended) | Same posture as `settings?: unknown`. Coercer narrows at boundary. No circular dep. | ✓ |
| `prefs?: UserPrefs` | Typed; forces Envelope to import UserPrefs; less forgiving to future sub-keys. | |

**User's choice:** `prefs?: unknown`

---

## Test coverage scope

| Option | Description | Selected |
|--------|-------------|----------|
| Standard — mirror existing settings.test.ts (recommended) | Predicates (accept/reject), coercer fallback, round-trip, envelope merge, proto-pollution mitigation. No new envelope-level tests. | ✓ |
| Minimum SC4 | Predicates + coercer fallback only. No round-trip, no envelope merge, no proto-pollution. | |
| Extended | + cross-tab v2 envelope with future-prefs sub-keys round-trip. Redundant — D-01 already proven Phase 8. | |

**User's choice:** Standard — mirror existing settings.test.ts

---

## Claude's Discretion

- **Per-dim `DEFAULT_*` location** — Co-located with the per-dim enum + OPTIONS + predicate in `src/domain/settings.ts` (next to existing `DEFAULT_SETTINGS`). Aggregate `DEFAULT_PREFS` composed in `src/storage/prefs.ts`. Mirrors existing `coerceSettings` → consumes `DEFAULT_SETTINGS` cross-layer pattern. Inferred from "API/file shape" lock; surfaced for awareness, not a separate question.
- **Commit packaging** — Three commits (domain / storage / docs traceability), single plan, single wave. Per Phase 12 D-12 + Phase 13 D-09 precedent. Surfaced in CONTEXT.md D-13.
- **Cleanup of `as unknown as Record<string, unknown>` cast** at `src/storage/storage.test.ts:96` — opportunistic stretch goal once `Envelope.prefs?: unknown` lands. Planner discretion.

## Deferred Ideas

- **Phase 15 (INFRA-04)** — SettingsDialog Shell + App.tsx prefs state wiring + `document.documentElement.dataset.theme` attribute setter.
- **Phase 19 (I18N-05)** — locale map key reconciliation (REQ uses `pt_BR` snake-case as map key; Phase 14 locks identifier as `'pt-BR'` hyphen). Phase 19 plan MUST resolve.
- **Phase 16 (THEME-01/02)** — `'system'` → `'light'|'dark'` resolution via `matchMedia('(prefers-color-scheme: dark)')`. Phase 14 stores the choice; Phase 16 resolves it.
- **STATE_VERSION bump** — Not needed for additive `prefs?: unknown`. WR-05 dual-versioning covers future non-additive case.
- **Const enums** — Considered then rejected (zero project usage; `isolatedModules` emit nuance).
- **Extended cross-tab nested-sub-key test coverage** — Considered then rejected (Phase 8 probe at `storage.test.ts:79` already covers).
