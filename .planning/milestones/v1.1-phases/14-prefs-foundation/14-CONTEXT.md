---
phase: 14-prefs-foundation
created: 2026-05-12
milestone: v1.1
requirements:
  - INFRA-01
  - INFRA-02
  - INFRA-03
---

# Phase 14: Prefs Foundation - Context

**Gathered:** 2026-05-12
**Status:** Ready for planning

<domain>
## Phase Boundary

Phase 14 lands the storage + domain scaffolding for the four v1.1 customization dimensions (theme, audio timbre, visual variant, locale) so downstream feature phases 15-19 build against a stable, typed foundation. Deliverables:

1. `Envelope` interface (`src/storage/storage.ts`) extended with `prefs?: unknown` — additive, leverages existing D-01 (Phase 8) spread-then-override read so unknown sub-keys survive cross-tab round-trips.
2. Four new enum types (`ThemeId`, `TimbreId`, `VisualVariantId`, `LocaleId`) + OPTIONS arrays + `isValid*` predicates + per-dimension `DEFAULT_*` constants in `src/domain/settings.ts` (next to existing `BPM_OPTIONS`/`RATIO_OPTIONS`/`DURATION_OPTIONS` + `isValidBpm`/`isValidRatio`/`isValidDuration` + `DEFAULT_SETTINGS`).
3. NEW file `src/storage/prefs.ts`: `UserPrefs` interface, `DEFAULT_PREFS` aggregate, per-field non-throwing coercers `coerceTheme`/`coerceTimbre`/`coerceVariant`/`coerceLocale`, aggregator `coercePrefs(raw): UserPrefs`, `loadPrefs(deps)`/`savePrefs(prefs, deps)`. Re-exported from `src/storage/index.ts`.
4. Vitest coverage that mirrors existing `src/storage/settings.test.ts` posture — predicates, coercer fallbacks, round-trip, envelope merge, prototype-pollution mitigation. `tsc && lint && build && test` exit 0 at every commit boundary.

No UI surface, no React state, no app wiring. SettingsDialog (INFRA-04) is Phase 15 work.

</domain>

<decisions>
## Implementation Decisions

### Enum allowlist scope — lock full v1.1 union NOW

- **D-01:** All four predicates ship with their full v1.1 union locked at Phase 14, so downstream phases (16/17/18/19) only add UI/CSS/audio wiring and do not re-edit predicates or OPTIONS arrays. Chosen over (b) minimal scaffold + widen per phase (3 extra round-trips through `domain/settings.ts`) and (c) mode-vs-palette split for themes (over-engineering at v1.1 scope).
  - `ThemeId = 'light' | 'dark' | 'system' | 'moss' | 'slate' | 'dusk'` — 3 system modes (THEME-01/02) + 3 named palettes (THEME-03). Palette names are **final**, not slot IDs; predicate + CSS `[data-theme='moss']` block (Phase 16) rename together if user later wants different names.
  - `TimbreId = 'bowl' | 'bell' | 'sine' | 'chime'` — TIMBRE-01 four-preset locked. Bowl = current behavior (TIMBRE-02 zero-regression).
  - `VisualVariantId = 'orb' | 'square' | 'ring'` — VARIANT-01 "e.g. Square / Ring" locked as final names. Orb = current behavior (VARIANT-02 zero-regression).
  - `LocaleId = 'en' | 'pt-BR'` — I18N-01 EN + PT-BR.

- **D-02:** Source-of-truth pattern = OPTIONS array + derived type, mirroring existing `BPM_OPTIONS` (`domain/settings.ts:10-24`). Each enum exports a frozen array, type derived via `typeof X_OPTIONS[number]`:
  ```ts
  export const THEME_OPTIONS = ['light','dark','system','moss','slate','dusk'] as const satisfies readonly ThemeId[]
  // type ThemeId derived OR declared directly — Plan picks the cleaner ordering
  ```
  Picker UIs (Phase 15+) iterate the array directly; predicates use `.includes()`. Chosen over (b) union literal only (picker UIs maintain a duplicate list, drift risk) and (c) TS `const enum` (project has zero const-enum usage; `isolatedModules` emit nuance).

### Defaults

- **D-03:** `DEFAULT_THEME = 'system'`. OS `prefers-color-scheme` tracking per THEME-02 — first-load users get the right palette without opening SettingsDialog. Aligns with modern app norms. Chosen over (b) `'light'` (explicit baseline + matches v1.0.1 visual byte-for-byte, but the visual baseline is preserved transparently when `'system'` resolves to `light` on a light-mode OS, so zero-regression is preserved for the dominant first-load case) and (c) `'dark'` (breaks zero-regression).
  - Note for Phase 16: `'system'` is the **stored** preference; the **resolved** CSS state under `<html data-theme>` is `'light'` or `'dark'` after media-query evaluation. Phase 16 implementation owns that resolution; Phase 14 only stores the choice.

- **D-04:** `DEFAULT_TIMBRE = 'bowl'` (TIMBRE-02 — current behavior, zero-regression).

- **D-05:** `DEFAULT_VARIANT = 'orb'` (VARIANT-02 — current behavior, zero-regression).

- **D-06:** `DEFAULT_LOCALE = 'en'` (I18N-01 default).

- **D-07:** Aggregate `DEFAULT_PREFS: UserPrefs = { theme, timbre, variant, locale }` composed in `src/storage/prefs.ts` from the four per-dim `DEFAULT_*` imports. Same pattern as existing `DEFAULT_SETTINGS` aggregate.

### Locale identifier format — BCP-47 hyphen

- **D-08:** `LocaleId = 'en' | 'pt-BR'` (BCP-47 hyphen, not POSIX underscore). Matches `<html lang='pt-BR'>`, `Intl.*` APIs, `navigator.language`. Web platform standard. REQ I18N-01 already uses presentational `PT-BR`; the wire/runtime ID is `'pt-BR'`. Chosen over (b) `'pt_BR'` (underscore — would need translation when interacting with browser APIs) and (c) defer to Phase 19 (breaks the "predicates final, downstream zero-touch" invariant from D-01).
  - **Flag for Phase 19 planner:** REQ I18N-05 example writes the locale map literal as `{ en: LEARN_CONTENT_EN, pt_BR: LEARN_CONTENT_PT_BR }` (underscore). This is an inconsistency in REQ. Phase 19 plan MUST reconcile — either rename the map key to `'pt-BR'` to match `LocaleId`, or document the runtime-id-vs-map-key translation explicitly. Phase 14 locks the **identifier** as `'pt-BR'`; the map-key choice in `learnContent.ts` is Phase 19 scope. Captured in `<deferred>` below.

### File / API shape

- **D-09:** Phase 14 splits the surface across exactly TWO files (no new files beyond research recommendation):
  - `src/domain/settings.ts` (EXTENDED) — types (`ThemeId`/`TimbreId`/`VisualVariantId`/`LocaleId`), OPTIONS arrays, predicates (`isValidTheme`/`isValidTimbre`/`isValidVariant`/`isValidLocale`), per-dim defaults (`DEFAULT_THEME`/`DEFAULT_TIMBRE`/`DEFAULT_VARIANT`/`DEFAULT_LOCALE`). Co-located with existing `BPM_OPTIONS`/`RATIO_OPTIONS`/`DURATION_OPTIONS` + `isValidBpm`/`isValidRatio`/`isValidDuration` + `DEFAULT_SETTINGS`. ROADMAP §14 SC2 + REQ INFRA-02 locked predicates here.
  - `src/storage/prefs.ts` (NEW) — `UserPrefs` interface, `DEFAULT_PREFS` aggregate, per-field coercers (`coerceTheme`/`coerceTimbre`/`coerceVariant`/`coerceLocale`), aggregator (`coercePrefs(raw): UserPrefs`), envelope round-trip pair (`loadPrefs(deps)`/`savePrefs(prefs, deps)`). REQ INFRA-03 locks coercer location at `src/storage/`. Mirrors existing `src/storage/settings.ts` (`coerceSettings`/`loadSettings`/`saveSettings`).
  - `src/storage/index.ts` — add `export * from './prefs'`.
  Chosen over (b) extend `src/storage/settings.ts` (mixes session-settings/customization-prefs concerns) and (c) per-dimension files (4 new files for low gain; aggregator still needed).

- **D-10:** API surface = **aggregator + per-field + load/save pair**. Mirrors existing `coerceSettings`/`loadSettings`/`saveSettings` shape:
  ```ts
  export function coerceTheme(raw: unknown): ThemeId { return isValidTheme(raw) ? raw : DEFAULT_THEME }
  // ... three more per-field coercers ...
  export function coercePrefs(raw: unknown): UserPrefs {
    const r = (raw !== null && typeof raw === 'object' && !Array.isArray(raw)) ? raw as Record<string, unknown> : {}
    return {
      theme:   coerceTheme(r.theme),
      timbre:  coerceTimbre(r.timbre),
      variant: coerceVariant(r.variant),
      locale:  coerceLocale(r.locale),
    }
  }
  export function loadPrefs(deps: StorageDeps = {}): UserPrefs { return coercePrefs(readEnvelope(deps).prefs) }
  export function savePrefs(prefs: UserPrefs, deps: StorageDeps = {}): void {
    const env = readEnvelope(deps)
    writeEnvelope({ ...env, prefs }, deps)
  }
  ```
  Per-field D-15 (Phase 4) posture: a single drifted dimension (e.g. `theme: 'unknown-name'`) falls back to its `DEFAULT_*` without discarding the rest of the prefs object. Chosen over (b) per-field only (App.tsx forced to compose 4 calls — leaky) and (c) defer load/save to Phase 15 (Phase 15 would own envelope round-trip code that belongs in storage layer).

- **D-11:** `Envelope.prefs` static type = `unknown`, not `UserPrefs`. Same posture as existing `settings?: unknown` / `mute?: unknown` / `stats?: unknown` (`src/storage/storage.ts:51-55`). Coercer narrows at the boundary. Avoids creating a `storage` → `domain` (via `prefs.ts`) typed circular import for the Envelope interface; coercers can still import enum types. Aligns with STORAGE-01 forward-compat posture: unknown sub-keys round-trip transparently.

### Test posture

- **D-12:** Tests mirror existing `src/storage/settings.test.ts` posture — every existing case has a prefs-shaped analog:
  - **Domain (`src/domain/settings.test.ts` EXTENDED):** for each of the four new predicates, mirror the three existing predicate-test blocks (accept valid members, reject out-of-range/wrong-shape, reject wrong type / null / undefined / NaN where applicable).
  - **Storage (`src/storage/prefs.test.ts` NEW):**
    - `coercePrefs` — null / undefined / non-object → `DEFAULT_PREFS`; empty object → `DEFAULT_PREFS`; valid object → preserved verbatim; per-field fallback when a single dim is invalid (4 cases, one per dim); rejects wrong type per field; **prototype-pollution mitigation** mirror (`JSON.parse('{"theme":"system","__proto__":{"polluted":true}}')` → `out.polluted` undefined + `Object.prototype.polluted` undefined).
    - `coerceTheme`/`coerceTimbre`/`coerceVariant`/`coerceLocale` — accept every valid OPTIONS member (smoke loop OK); reject invalid → DEFAULT_*.
    - `loadPrefs`/`savePrefs` round-trip — returns `DEFAULT_PREFS` when nothing stored; round-trips a valid UserPrefs object; **envelope merge** preserves `settings`/`mute`/`stats` when saving prefs (mirrors `settings.test.ts:104-115`); does not throw when `setItem` throws (D-16); falls back to defaults when stored JSON is corrupt (D-17).
  - **NO new tests in `src/storage/storage.test.ts`** — STORAGE-01 forward-compat for `prefs` is already proven by the Phase 8 probe at `storage.test.ts:79-99` (`prefs: { theme: 'dark' }` survives readEnvelope round-trip). Phase 14 makes `prefs` typed-ish; the round-trip invariant is untouched.

### Commit packaging

- **D-13:** Single plan, single wave, **three commits** (per-commit green-gate per Phase 12 D-12 single-plan-single-wave + Phase 13 D-09 ordering):
  1. **Commit 1 — domain layer (types + OPTIONS + predicates + per-dim DEFAULT_*).** `src/domain/settings.ts` + `src/domain/settings.test.ts`. No storage changes yet. Green-gate.
  2. **Commit 2 — storage layer (prefs.ts + Envelope `prefs?: unknown` + index.ts re-export).** `src/storage/storage.ts` (one-line Envelope addition) + `src/storage/prefs.ts` NEW + `src/storage/index.ts` (one-line re-export) + `src/storage/prefs.test.ts` NEW. Green-gate.
  3. **Commit 3 — REQUIREMENTS traceability update** (INFRA-01/02/03 → `Done`). Docs-only.
  Ordering rationale: domain layer is dependency-free; storage layer imports from domain; docs commit is text-only and unblocks the verification gate. Each commit independently passes `tsc --noEmit && npm run lint && npm run build && npm test`.

### Carry-forward invariants

- **D-14:** Per-commit green-gate (Phase 7 D-09 / Phase 11 D-17 / Phase 12 D-15 / Phase 13 D-10). `tsc --noEmit`, `npm run lint`, `npm run build`, full Vitest suite (409/409 v1.0.1 baseline + Phase 13 additions if any) pass at every commit boundary. Roll-back, not patch-forward, on red.

- **D-15:** Zero new npm dependencies (PROJECT.md "Zero net-new runtime deps" v1.1 invariant). Pure TS + Vitest — all in scope.

- **D-16:** D-01 (Phase 8 spread-then-override) **load-bearing** for Phase 14. The Envelope addition `prefs?: unknown` is purely a TS surface change — the runtime spread at `storage.ts:96` already preserves the `prefs` sub-tree per the existing test probe. Phase 14 makes the static type acknowledge what the runtime already does.

- **D-17:** D-15 (Phase 4 per-field coerce-and-fallback) **load-bearing** for `coercePrefs`. A single drifted prefs sub-key does NOT discard the other three. Same posture as `coerceSettings`.

</decisions>

<canonical_refs>
## Canonical References

**Downstream agents MUST read these before planning or implementing.**

### Requirements / specs

- `.planning/REQUIREMENTS.md` §"Infrastructure: Prefs Foundation" INFRA-01/02/03 (lines 18-20) — the three pending requirements Phase 14 satisfies. Traceability table line ~99 status `Pending` → `In progress` → `Done` on phase close.
- `.planning/ROADMAP.md` §"Phase 14: Prefs Foundation" (lines 79-87) — Goal + 4 Success Criteria. SC1 (envelope round-trip + D-01 preserved), SC2 (predicates in `src/domain/settings.ts`), SC3 (coercers fall back to `DEFAULT_*`, non-throwing), SC4 (Vitest coverage + green-gate).
- `.planning/PROJECT.md` — v1.1 milestone framing; "Zero net-new runtime deps" invariant (D-15).

### Research

- `.planning/research/ARCHITECTURE.md` §"Prefs Data Model" (lines 157-205) — full `UserPrefs` shape sketch. Note: Phase 14 expands `ThemeId` past the research's `'default' | 'dark'` placeholder per D-01; the surrounding architecture (storage location, coercer pattern, Envelope additive change) carries forward verbatim.
- `.planning/research/ARCHITECTURE.md` §"Envelope Schema Strategy" (lines 184-204) — backward/forward compat analysis + STATE_VERSION non-bump rationale + "Anti-Pattern 5: Prefs in a Separate localStorage Key".
- `.planning/research/ARCHITECTURE.md` §"Phase B — Envelope schema + prefs foundation" (lines 323-331) — build order placing prefs.ts ahead of feature work.
- `.planning/research/FEATURES.md` line 164 (P0 infra positioning) — Phase 14 is P0 must-land-before-feature-work.

### Carry-forward CONTEXT files (decisions Phase 14 inherits)

- `.planning/milestones/v1.0-phases/04-local-memory-practice-stats/` D-14 / D-15 / D-16 / D-17 — silent-fallback envelope + per-field coerce-and-fallback contract. D-17 carries forward verbatim.
- `.planning/milestones/v1.0.1-phases/08-storage-forward-compat-cross-tab-ui-sync/08-CONTEXT.md` D-01 / D-04a — spread-then-override read + refuse-downgrade write. D-16 carries forward.
- `.planning/milestones/v1.0.1-phases/11-domain-ui-contracts-accessibility/11-CONTEXT.md` — domain-layer location of validation/predicate logic.
- `.planning/milestones/v1.0.1-phases/12-assets-content-hygiene-cleanup/12-CONTEXT.md` D-08 / D-12 / D-15 — `isValid<X>` predicate relocation to `src/domain/settings.ts` + single-plan-single-wave packaging + per-commit green-gate. D-09 / D-13 carry forward.
- `.planning/phases/13-inner-ring-ux-symmetry/13-CONTEXT.md` — Phase 13 closeout; first v1.1 phase, established no-test-coverage-bleed pattern for v1.1.

### Source under edit

- `src/domain/settings.ts` (EXTENDED) — add 4 enum types + 4 OPTIONS arrays + 4 `isValid*` predicates + 4 per-dim `DEFAULT_*` constants. Mirror existing structure (BPM/RATIO/DURATION blocks).
- `src/storage/storage.ts:43-55` (EXTENDED) — add `prefs?: unknown` to the `Envelope` interface. One-line addition; the spread-then-override at line 96 already carries the sub-tree (proven by `storage.test.ts:79-99`).
- `src/storage/prefs.ts` (NEW) — see D-09 / D-10 for full API surface.
- `src/storage/index.ts` (EXTENDED) — add `export * from './prefs'` line.

### Test files

- `src/domain/settings.test.ts` (EXTENDED) — mirror existing `isValidBpm`/`isValidRatio`/`isValidDuration` test blocks for the four new predicates.
- `src/storage/prefs.test.ts` (NEW) — mirror `src/storage/settings.test.ts` structure (coerce blocks + load/save round-trip block + prototype-pollution mitigation block).
- `src/storage/storage.test.ts:79-115` (UNCHANGED) — the existing Phase 8 prefs probe already covers STORAGE-01 forward-compat for the new field. No edit needed.
- `src/storage/settings.test.ts` (UNCHANGED) — `coerceSettings` posture is the reference pattern; tests untouched.

### Source NOT edited (load-bearing references)

- `src/storage/storage.ts:59-103` `readEnvelope` — D-01 spread-then-override runtime; preserves `prefs` sub-tree without code change.
- `src/storage/storage.ts:105-151` `writeEnvelope` — D-04a refuse-downgrade + STATE_VERSION stamp; preserves cross-tab newer-version semantics for prefs writes.
- `src/storage/settings.ts` `coerceSettings`/`loadSettings`/`saveSettings` — reference pattern for D-10 API shape.

</canonical_refs>

<code_context>
## Existing Code Insights

### Reusable Assets

- **`src/domain/settings.ts` structure** — the BPM/RATIO/DURATION triplet (type + OPTIONS const-array + predicate + DEFAULT_*) is the exact template the four new enum surfaces clone. `validateSettings` is *not* cloned — prefs use non-throwing coercion only, not throwing validation (the Phase 4 D-14 vs domain/validateSettings divergence).
- **`src/storage/settings.ts:18-27` `coerceSettings`** — the per-field defensive read pattern, including the `Record<string, unknown>` cast guard and the per-dim ternary fallback, is the literal template for `coercePrefs`. The prototype-pollution test at `settings.test.ts:71-79` is the literal template for the matching prefs test.
- **`src/storage/storage.ts:59-103` `readEnvelope`** — spread-then-override already preserves `prefs` (Phase 8 D-01 + Phase 8 storage.test.ts:79 probe). No runtime change needed for Phase 14; only the TS surface widens.
- **`src/storage/storage.test.ts:77-115`** — the forward-compat read + refuse-downgrade write coverage already includes a `prefs: { theme: 'dark' }` probe. Adding `prefs?: unknown` to the Envelope interface lets this probe type-cleanly without the `as unknown as Record<string, unknown>` cast at line 96 — Plan should clean that cast as a stretch goal (zero-touch otherwise).

### Established Patterns

- **Phase 4 D-15 + Phase 8 D-01** — per-field coerce-and-fallback inside a top-level spread-then-override envelope. Carries verbatim to prefs.
- **Phase 12 D-08** — `isValid<X>` predicates live in `src/domain/settings.ts` (not `src/storage/`). REQ INFRA-02 explicit; ROADMAP §14 SC2 explicit.
- **Phase 12 D-12 + Phase 13 D-09** — single-plan-single-wave commit packaging with files grouped by layer-of-the-week. D-13 mirrors with three commits (domain / storage / docs).
- **Phase 7 D-09 / Phase 11 D-17 / Phase 12 D-15 / Phase 13 D-10** — per-commit green-gate (`tsc && lint && build && test` exit 0). D-14 inherits.
- **D-04 `// Reason:` annotation policy** (Phase 7) — if any line in `prefs.ts` needs an `eslint-disable` (e.g., for a `Record<string, unknown>` cast in `coercePrefs`), pair it with a `// Reason:` comment. Mirrors `domain/settings.ts:71-76`.

### Integration Points

- **`src/storage/index.ts`** — public surface (re-export). Add one line: `export * from './prefs'`. Existing consumers import from `'../storage'`, so Phase 15+ wiring uses `import { loadPrefs, savePrefs, UserPrefs } from '../storage'`.
- **`src/app/App.tsx`** — NO Phase 14 edit. App wiring (loadPrefs at mount, state plumbing, prefs change handler, document.dataset.theme attr) is Phase 15 (SettingsDialog Shell) work. Phase 14 ships a pure library surface.
- **Envelope spread invariant** — `savePrefs` reads the current envelope, spreads it, overlays `prefs`. Same envelope-merge pattern as `saveSettings`/`saveMute`/`recordSession`. Cross-tab `storage` listener (Phase 8 STORAGE-03) does NOT need a new filter — it already keys on `STATE_KEY`.

</code_context>

<specifics>
## Specific Ideas

- **User direction** (2026-05-12 discuss-phase): full v1.1 enum union locked at Phase 14 — predicates are final, downstream phases do not re-edit them. Palette names final (`'moss'`/`'slate'`/`'dusk'`), not slot IDs.
- **DEFAULT_THEME='system'** — explicit user choice in discuss-phase. Trade-off: not byte-identical to v1.0.1 visual on dark-mode OSes, but the zero-regression intent in TIMBRE-02/VARIANT-02 framing applies to user-facing **interaction parity** (no behavior change for users who never open SettingsDialog). `'system'` honors that because the visual is whatever the OS already prefers — most likely indistinguishable from current behavior for the dominant OS-light-mode case, and an honest match to user OS preference for OS-dark-mode users.
- **`LocaleId = 'pt-BR'`** (BCP-47 hyphen) — user-confirmed against REQ I18N-05's inconsistent `pt_BR` underscore usage. Phase 19 must reconcile (deferred).
- **API shape mirrors `coerceSettings`** — aggregator + per-field + load/save trio. Plan should `eslint-disable @typescript-eslint/restrict-template-expressions` per Phase 7 D-04 if any error-formatting needs it (unlikely — coercers are non-throwing).

</specifics>

<deferred>
## Deferred Ideas

- **Phase 15 (INFRA-04) — SettingsDialog Shell wiring.** App.tsx prefs state + `document.documentElement.dataset.theme` attr + SettingsDialog open/close + disabled-while-inSessionView contract. Phase 14 ships zero UI; Phase 15 builds on Phase 14's `loadPrefs`/`savePrefs` API.
- **Phase 19 (I18N-05) — locale map key reconciliation.** REQ I18N-05 example writes `{ en, pt_BR }` (underscore). Phase 14 locks the **identifier** `'pt-BR'` (hyphen). Phase 19 plan MUST either rename map keys to `'pt-BR'` (preferred — single canonical wire form) or document the runtime-id → map-key translation. Flag captured in D-08.
- **Phase 16 (THEME-01/02) — `'system'` → `'light'|'dark'` resolution.** Phase 14 stores `'system'` as the user preference; Phase 16 owns the `matchMedia('(prefers-color-scheme: dark)')` resolution that maps `'system'` to the actual `<html data-theme>` attribute value. Phase 14 predicates accept `'system'` as a valid stored value, full stop.
- **Storage version bump (STATE_VERSION 1 → 2).** Not needed. Phase 14 is a purely additive Envelope change (`prefs?: unknown`), reachable from v1 data via `coercePrefs(undefined) === DEFAULT_PREFS`. WR-05 dual-versioning notes in `storage.ts:13-34` cover the future case; v1.1 stays on STATE_VERSION=1.
- **Const enums for the 4 new types.** Considered then rejected per D-02 — project has zero const-enum usage; OPTIONS-array + derived-type pattern is established.
- **Extended cross-tab test coverage** (`prefs: { theme: 'dark', futurePref: 'x' }` survives read + refuse-downgrade preserves `futurePref`). Considered then rejected per D-12 — STORAGE-01 forward-compat is already proven by the existing `storage.test.ts:79-99` probe with `prefs: { theme: 'dark' }`. Adding nested-sub-key probes is redundant defense at Phase 14 scope.
- **Phase 17 / Phase 18 — variant/timbre name finalization.** Locked at Phase 14 per D-01. If Phase 17 / 18 visual or audio design surfaces a better name, it is a rename across `domain/settings.ts` OPTIONS + CSS `[data-theme='X']` / cueSynth dispatch label — coordinated, but a single Find-Replace.

</deferred>

---

*Phase: 14-prefs-foundation*
*Context gathered: 2026-05-12*
