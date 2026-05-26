# Phase 47: Persistable feature-flag preferences - Context

**Gathered:** 2026-05-25
**Status:** Ready for planning

<domain>
## Phase Boundary

Promote the four currently query-string-only feature flags (`breathingShape`, `ringCue`, `orbIdle`, `switcherIcon`) to persisted user preferences, while keeping per-tab query-string overrides for development. Resolution order on first paint is **query-string > persisted > default**. Persistence rides the existing `Envelope.prefs` subtree via per-field `coerceSettings` fallback (Phase 8 D-01); no `STATE_VERSION` bump.

**Touches (planned, not implemented in this phase):**

- `src/featureFlags.ts` — extend `readFeatureFlags(search)` signature to take a persisted snapshot and resolve query > persisted > default per flag.
- `src/storage/prefs.ts` — extend `UserPrefs` flat with 4 new fields + 4 new per-field coercers; defaults imported from `featureFlags.ts` to keep a single source of truth.
- `src/hooks/useFeatureFlags.ts` — re-read persisted prefs on mount, on `storage` (cross-tab), on `hrv:prefs-changed` (same-tab), and on `popstate` (query change); merge via the new resolver.
- `src/hooks/` — four new paired choice hooks: `useBreathingShapeChoice`, `useRingCueChoice`, `useOrbIdleChoice`, `useSwitcherIconChoice`. Each mirrors `useThemeChoice` / `useLocaleChoice` / `useTimbreChoice` / `useCueChoice` (same-tab `hrv:prefs-changed` dispatch with per-flag `detail.key`).
- `src/storage/prefs.test.ts`, `src/featureFlags.test.ts`, `src/hooks/useFeatureFlags.test.ts`, + 4 new choice-hook tests.

**Strict non-goals for this phase** (deferred or out of scope):

- No Appearance UI surface — Phase 48 binds the choice hooks to pickers.
- No new envelope subtree, no `STATE_VERSION` bump, no migration ladder edit. Per-field `coerceSettings` fallback on `Envelope.prefs` only.
- No change to query-string parser behaviour for valid values (existing alias tables in `BREATHING_SHAPE_FLAG.parse` / `ORB_IDLE_FLAG.parse` / `RING_CUE_FLAG.parse` / `parseQueryBoolean` stay byte-identical).
- No operator-facing dev surface (no DevTools window helper, no `?devPrefs=1` overlay). Vitest is the proof of persistence in Phase 47; visual UAT lands in Phase 48.
- No reactive subscription to `loadPrefs` outside the four affected hooks. `useTheme`, `useLocale`, etc. continue to read their own slice unchanged.

</domain>

<decisions>
## Implementation Decisions

### Envelope shape

- **D-01:** **Flat extension of `UserPrefs`** in `src/storage/prefs.ts` — add `breathingShape: BreathingShapeVariant`, `ringCue: RingCueStyle`, `orbIdle: OrbIdleBehavior`, `switcherIcon: boolean` directly to the interface alongside `theme` / `timbre` / `cue` / `locale`. No nested sub-object, no new top-level envelope subtree. Matches the Phase 25 CUE-02 precedent (cue joined `UserPrefs` flat) and the Phase 14 D-10/D-17 per-field coerce-and-fallback contract verbatim. Eight fields total post-Phase-47.
- **D-02:** `DEFAULT_PREFS` extended with the 4 new defaults — values imported from `featureFlags.ts` (`BREATHING_SHAPE_FLAG.defaultValue`, `RING_CUE_FLAG.defaultValue`, `ORB_IDLE_FLAG.defaultValue`, `SWITCHER_ICON_FLAG.defaultValue`) to keep one source of truth. The query-string parser and the persisted-prefs coercer cannot drift on defaults.
- **D-03:** **One coercer per new field**, non-throwing, mirroring `coerceTheme` / `coerceTimbre` / `coerceCue` / `coerceLocale`. Each coercer reuses the parser from `featureFlags.ts` (`BREATHING_SHAPE_FLAG.parse` etc.) so the alias tables stay the single source of truth — a persisted `'kuthasta'` coerces to `'spiritual-eye'` for free, and an unrecognized value falls back to the per-flag default. **No `STATE_VERSION` bump** (PREFS-04 + Phase 8 D-01 contract).
- **D-04:** `coercePrefs` extended to call the 4 new coercers; prototype-pollution mitigation (D-12 / T-14-01) unchanged — `r` stays a `Record<string, unknown>` narrowed by-key, never spread.

### Resolver location

- **D-05:** **Inside `featureFlags.ts`** — change `readFeatureFlags(search)` to `readFeatureFlags(search, persisted)` where `persisted` carries the 4 persisted feature-flag values. The function stays pure (no I/O, testable without storage mocking). Resolution logic centralized: featureFlags.ts owns "how the three sources combine."
- **D-06:** Resolution order per flag is **query-string > persisted > default**, evaluated independently per field. The resolver is a 4-way per-field merge, not an all-or-nothing layer swap.
- **D-07:** **Invalid query-string values fall through to persisted** (Claude's Discretion can re-spec at plan time if undesired). Today an unrecognized `?breathingShape=junk` short-circuits to the production default via `readQueryFeatureFlag`'s `?? spec.defaultValue`. Phase 47 should chain through to the persisted value when the parser returns `null` — this matches the spirit of "query > persisted > default" (an unparseable query value is not a valid query value). Rationale: a user-set persisted preference should not be silently masked by a typo in a dev URL. Only an *absent* query param or a *valid* query param participates in the override; an *invalid* query value falls through.
- **D-08:** `readFeatureFlags` callsites — the only non-test caller is `useFeatureFlags()` in `src/hooks/useFeatureFlags.ts`. The hook supplies `persisted` from `loadPrefs()`. No other production module reads feature flags directly.

### Setter API + hook split

- **D-09:** **Four paired choice hooks** ship in Phase 47:
  - `useBreathingShapeChoice` returns `{ breathingShape, setBreathingShape }` typed `BreathingShapeVariant`.
  - `useRingCueChoice` returns `{ ringCue, setRingCue }` typed `RingCueStyle`.
  - `useOrbIdleChoice` returns `{ orbIdle, setOrbIdle }` typed `OrbIdleBehavior`.
  - `useSwitcherIconChoice` returns `{ switcherIcon, setSwitcherIcon }` typed `boolean`.

  Each hook mirrors `useThemeChoice` / `useTimbreChoice` / `useCueChoice` / `useLocaleChoice` verbatim: seed state from `loadPrefs()`, write via `savePrefs({ ...current, [key]: next })`, dispatch `hrv:prefs-changed` with `detail: { key: '<field>', value: next }` so same-tab consumers re-read.
- **D-10:** **Per-flag `detail.key` values** for the `hrv:prefs-changed` CustomEvent — `'breathingShape'`, `'ringCue'`, `'orbIdle'`, `'switcherIcon'`. Matches the D-22 / Phase 17 / Phase 25 contract (one event name, key-filtered consumers).
- **D-11:** `useFeatureFlags()` extends to listen for both `storage` (cross-tab, filter `e.key === STATE_KEY`) and `hrv:prefs-changed` (same-tab, filter `detail.key` ∈ `{ 'breathingShape', 'ringCue', 'orbIdle', 'switcherIcon', undefined }`). Pattern verbatim from `useTheme.ts` Effects 3-4. `popstate` listener for query changes stays via `useSyncExternalStore`.

### Test-setter exposure

- **D-12:** **Vitest only** for Phase 47 — no operator-facing dev surface (no `window.__hrvPrefs`, no `?devPrefs=1` overlay). Operator's per-tab dev workflow (`?breathingShape=spiritual-eye` etc.) remains the visual-test path until Phase 48 lands the Appearance UI. Persistence proof in Phase 47 is purely automated:
  - `src/storage/prefs.test.ts` — round-trip + coerce-fallback for all 4 new fields, including the legacy-value tolerance pattern (corrupt → default without throwing).
  - `src/featureFlags.test.ts` — new `readFeatureFlags(search, persisted)` 4-way resolver coverage: query-wins, persisted-wins, default-wins, invalid-query-falls-through (D-07), 3-source-precedence-per-field independence.
  - `src/hooks/useFeatureFlags.test.ts` — `loadPrefs` integration, `storage`-event re-read, `hrv:prefs-changed` re-read, `popstate` re-read.
  - One test file per new choice hook (4 total) — write-through-savePrefs assertion + `hrv:prefs-changed` dispatch assertion. Planner picks placement (`src/hooks/use<Flag>Choice.test.ts` matches existing).

### Claude's Discretion

- **Whether `coerce<Flag>` lives in `prefs.ts` or in `featureFlags.ts`.** D-03 picks `prefs.ts` to mirror `coerceTheme` placement. Planner may co-locate them with the parser in `featureFlags.ts` instead if it surfaces a cleaner DRY between parser + coercer (both narrow to the same union). Either is acceptable; the constraint is that the alias table (e.g., `kuthasta` → `spiritual-eye`) is reused, not duplicated.
- **The exact name of `readFeatureFlags(search, persisted)`'s second parameter type** — could be `Partial<FeatureFlags>`, a new `PersistedFeatureFlags` alias, or the full `FeatureFlags` shape. Constraint: type-checks under `strictTypeChecked`; the resolver returns a complete `FeatureFlags` regardless.
- **Whether the 4 choice hooks export shared helper types** (e.g., `FeatureFlagChoice<T>`) or stay independent. Both `useTimbreChoice` and `useThemeChoice` are independent today — no helper. Planner may diverge if duplication crosses a threshold.
- **`useFeatureFlags.ts` decomposition.** Today's hook is ~25 lines. Adding storage + custom-event listeners + persisted merge can fit inline (mirrors `useTheme.ts`) or split into a small helper. Planner picks.
- **Choice-hook same-tab same-hook update mechanism.** When the same hook instance writes (e.g., picker A sets `breathingShape`), the React state must reflect immediately. Existing `useThemeChoice` uses `setThemeState(next)` before dispatching the event. Phase 47 choice hooks follow that order verbatim.
- **Test-file boundary for `useFeatureFlags` 4-listener coverage.** Could stay in `src/hooks/useFeatureFlags.test.ts` (single file) or split into `useFeatureFlags.persistence.test.ts`. Planner picks based on file size.

</decisions>

<canonical_refs>
## Canonical References

**Downstream agents MUST read these before planning or implementing.**

### Phase scope (locked requirements)

- `.planning/REQUIREMENTS.md` §"Persistable Feature-Flag Preferences (PREFS)" — PREFS-01 through PREFS-04, the four locked requirements for Phase 47.
- `.planning/ROADMAP.md` §"Phase 47: Persistable feature-flag preferences" — phase goal, dependencies (Phase 46), success criteria 1–5.
- `.planning/PROJECT.md` §"Current Milestone: v2.1 Kuthasta and Settings Switches" — milestone goal; `'Persistable feature-flag preferences'` bullet.

### Storage envelope contract (the load-bearing precedent)

- `.planning/milestones/v1.0.1-phases/08-storage-forward-compat-cross-tab-ui-sync/08-CONTEXT.md` §"Implementation Decisions" D-01..D-06a — forward-compat envelope read (preserve on-disk `version`, spread unknown top-level fields), refuse-downgrade write (D-04a inline re-read), cross-tab `storage` event listener filtered by `STATE_KEY`. **Phase 47 MUST NOT bump `STATE_VERSION`.**
- `.planning/milestones/v1.1-phases/14-prefs-foundation/14-CONTEXT.md` — `UserPrefs` shape origin, D-10/D-17 per-field coerce-and-fallback (non-throwing), `loadPrefs`/`savePrefs` adapter contract. **Phase 47 extends this verbatim.**
- `.planning/milestones/v1.0-phases/04-local-memory-practice-stats/04-CONTEXT.md` §D-09/D-15/D-16/D-17 — silent-fallback localStorage envelope origin, per-field validate-and-fallback semantics.

### Same-tab + cross-tab sync contract

- `.planning/milestones/v1.1-phases/16-themes/16-CONTEXT.md` (and successors) — D-22 `hrv:prefs-changed` CustomEvent contract: one event name, per-dimension `detail.key` filter. Reused by Phase 17/18/19/25 and by every choice hook (`useThemeChoice` / `useTimbreChoice` / `useCueChoice` / `useLocaleChoice`).
- `src/hooks/useTheme.ts` Effects 3-4 (lines 60-90) — verbatim pattern for `storage` (cross-tab) + `hrv:prefs-changed` (same-tab) listeners. `useFeatureFlags` adopts this shape (D-11).

### Code surface (read first)

- `src/featureFlags.ts` — entire file. `BreathingShapeVariant` / `OrbIdleBehavior` / `RingCueStyle` unions (lines 7-9), `FeatureFlags` interface (lines 11-16), `parseQueryBoolean` (lines 41-46), `readQueryFeatureFlag` (lines 48-56), the four `*_FLAG` specs (lines 58-98), `readFeatureFlags(search)` (lines 100-107). **Signature change in D-05.**
- `src/hooks/useFeatureFlags.ts` — entire file. `useSyncExternalStore`-based query subscription. **Extends with persisted merge + 2 new listeners in D-11.**
- `src/storage/prefs.ts` — entire file. `UserPrefs` (lines 24-29), `DEFAULT_PREFS` (lines 31-36), 4 `coerce*` functions (lines 38-57), `coercePrefs` (lines 59-71), `loadPrefs` (lines 73-75), `savePrefs` (lines 77-80). **Extends with 4 new fields + 4 new coercers in D-01/D-02/D-03/D-04.** Prototype-pollution mitigation pattern (line 62) MUST stay.
- `src/storage/storage.ts` — `Envelope` interface (lines 47-69) — `prefs?: unknown` already exists; no change. `readEnvelope` / `writeEnvelope` / `migrateEnvelope` (lines 92-234) — no change (no `STATE_VERSION` bump).
- `src/storage/index.ts` — public surface; auto re-exports new coercers/types via `export *`.
- `src/hooks/useThemeChoice.ts` / `useTimbreChoice.ts` / `useCueChoice.ts` / `useLocaleChoice.ts` — choice-hook precedent. **Phase 47's 4 new choice hooks follow these verbatim (D-09 / D-10).**

### Phase 46 dependency (just-shipped)

- `.planning/phases/46-kuthasta-orb-variant/46-CONTEXT.md` — `BreathingShapeVariant` was extended from 2 members to 3 (`'spiritual-eye'`) in Phase 46. Phase 47 stores all 3 variants; the alias table (`spiritual-eye` / `kuthasta` / `star`) lives in `BREATHING_SHAPE_FLAG.parse` (`src/featureFlags.ts:64-73`) and **MUST be reused by the persisted-pref coercer** per D-03 (no duplicated alias table).

### Established conventions

- `src/featureFlags.ts` `*_FLAG.parse` pattern — `.trim().toLowerCase()` then alias list. Persisted-pref coercer reuses these parsers (D-03).
- `.planning/milestones/v1.1-phases/14-prefs-foundation/14-CONTEXT.md` D-12 — prototype-pollution mitigation: never spread `raw` into a prototype-accessible object; read only known keys from `r`. Phase 47 preserves this in `coercePrefs`.

</canonical_refs>

<code_context>
## Existing Code Insights

### Reusable assets

- **`UserPrefs` flat-extension pattern** (`src/storage/prefs.ts:24-29`) — adding a field is a 4-step recipe: add to interface, add to `DEFAULT_PREFS`, add one `coerce<Field>` function, add one call in `coercePrefs`. Phase 25 CUE-02 followed it; Phase 47 follows it x 4.
- **`*_FLAG.parse` parsers as authoritative narrowers** (`src/featureFlags.ts:64-98`) — each query-string parser already takes a `string` and returns `T | null`. Each persisted-pref coercer wraps the same parser: `(raw: unknown) => typeof raw === 'string' ? (parser(raw) ?? DEFAULT) : DEFAULT`. **Single source of truth for aliases.**
- **`useFeatureFlags()` `useSyncExternalStore` shape** (`src/hooks/useFeatureFlags.ts`) — already integrates with `popstate`; the snapshot returned by `getLocationSearchSnapshot` becomes the `search` arg to the new 2-arg `readFeatureFlags`. The persisted snapshot is read via `loadPrefs()` inline at hook-body level (cheap; `loadPrefs` is a thin `coercePrefs(readEnvelope().prefs)`).
- **Cross-tab + same-tab listener pattern** (`src/hooks/useTheme.ts:60-90`) — verbatim model for `useFeatureFlags`'s 2 new effects. Empty-deps `useEffect` + `addEventListener` + cleanup. STATE_KEY-filter for `storage`; `detail.key` filter for `hrv:prefs-changed`.
- **Choice-hook precedent** (`src/hooks/useTimbreChoice.ts:26-46`) — 20-line module: `useState(() => loadPrefs().<field>)`, setter calls `savePrefs({ ...current, <field>: next })`, dispatches `new CustomEvent('hrv:prefs-changed', { detail: { key, value } })`, returns `{ <field>, set<Field> }`. Each new choice hook in Phase 47 follows this exactly.
- **Coerce-on-read legacy-value tolerance** (`src/storage/prefs.ts:42-49` `coerceTimbre`) — the `'chime' → 'flute'` remap shows the precedent for adding an explicit legacy-value branch to a coercer without a STATE_VERSION bump. Phase 47 does not need this today (no flag has been renamed yet), but the shape is available if Phase 48 / future phases bring legacy values.

### Established patterns

- **No `STATE_VERSION` bump for additive prefs fields** — Phase 25 added `cue`, Phase 38 + 39 coerced legacy `variant` / `theme` values away, Phase 46 ships `'spiritual-eye'` as a valid persisted value via Phase 47's coercer. The envelope contract has handled additive field changes 5+ times without a bump. Phase 47 is structurally identical (PREFS-04).
- **Defaults DRY between parser and coercer** — `DEFAULT_PREFS` imports defaults from `featureFlags.ts` (D-02) so the production default for each flag is defined ONCE in `<FLAG>.defaultValue` and consumed by both the query-string short-circuit and the persisted fallback. Drift between the two is structurally impossible.
- **`hrv:prefs-changed` per-flag `detail.key`** — `'theme'`, `'timbre'`, `'cue'`, `'locale'` today; Phase 47 adds `'breathingShape'`, `'ringCue'`, `'orbIdle'`, `'switcherIcon'`. Listeners filter on the key set they care about; `useFeatureFlags` filters on the 4 new keys + `undefined` (the "re-read all prefs" forward-compat path).
- **Prototype-pollution mitigation** — `coercePrefs` reads `r.<key>` only for known keys; never spreads `raw`. Phase 47 preserves this byte-for-byte.
- **Spike-locked values are not decisions** (`[[feedback_spike_locked_values]]`) — N/A for Phase 47 (no spike). Listed here only so the planner knows it has no spike to honor — Phase 47 is pure data-layer plumbing.

### Integration points

- **`PracticeScreen.tsx:73-75`** — single consumer of `vm.featureFlags.{breathingShape, orbIdle, ringCue}`. No code change needed; the resolved values now arrive via the persisted-aware resolver, but the prop interface is unchanged.
- **`PracticeScreen.tsx:64`** — single consumer of `vm.featureFlags.switcherIcon`. Same — interface unchanged.
- **`useAppViewModel.ts:54,183`** — `useFeatureFlags()` is called once at viewmodel level and propagated through `vm.featureFlags`. The new resolver runs here; the viewmodel surface is unchanged.
- **Storage envelope `Envelope.prefs?: unknown`** — already declared since Phase 14. Phase 47 just writes more keys into the same subtree.
- **No NK / no breathing engine / no audio touch** — feature-flag prefs flow into rendering only (`PracticeScreen`, `OrbShape`, `BreathingSessionSurface`, `NaviKriyaSessionSurface`). Audio scheduling, session math, wake-lock, and storage migration logic are untouched.

</code_context>

<specifics>
## Specific Ideas

- Operator's mental model: **"these four were always meant to be user-settable; query string was the dev-only override surface."** Phase 47 closes the gap with zero user-visible behaviour change for returning users (PREFS-03 defaults match production); Phase 48 surfaces the affordance.
- Pattern-fidelity is the design value here — every new piece (coercer, choice hook, listener wiring) mirrors a 1:1 existing precedent. The planner should NOT invent new abstractions. The four choice hooks are duplicated paste-and-rename of `useTimbreChoice` / `useThemeChoice`; the four coercers are paste-and-rename of `coerceTimbre` / `coerceTheme`; the resolver extension is one extra parameter on one function. **Boring on purpose.**
- Default-DRY-between-parser-and-coercer (D-02) reflects `[[feedback_no_design_locking]]` at the data layer — code/tests must not anchor downstream-modifiable values. Defaults live exactly once in `featureFlags.ts` and are imported wherever consumed.
- Invalid-query-falls-through-to-persisted (D-07) is the only material behaviour change for an existing user — and only for users currently typing typos into the URL. The change is intentional: persisted preferences shouldn't be invisible to a typo in a dev-only override surface.

</specifics>

<deferred>
## Deferred Ideas

- **Appearance UI surface (Orb / Cue / Visual pickers)** — Phase 48. Phase 47 ships choice hooks but no components. APPEAR-01..06 + I18N-01..03 are all Phase 48 scope.
- **App Settings right-chevron + page navigation** — Phase 48. Phase 47 ships zero UI surface.
- **DevTools / `?devPrefs=1` operator helpers** — explicitly out of scope per D-12. Per-tab `?breathingShape=...` URL workflow remains the dev affordance until Phase 48.
- **Per-practice feature-flag overrides** — out of scope. Orb variant / cue style / idle behaviour / switcher icon are app-wide chrome (like theme), not per-practice. Reaffirms the v2.1 milestone stance.
- **`VITE_BREATHING_SHAPE` / `VITE_SWITCHER_TREATMENT` env-var promotion** — out of scope per REQUIREMENTS.md; the env vars are being absorbed by the persisted-pref layer in this phase + the UI in Phase 48.
- **Reactive subscription helper across all `loadPrefs`-reading hooks** — the four affected hooks today (`useTheme`, `useLocale`, etc.) each carry their own pair of effects. A `useUserPref<K>(key)` abstraction was not requested and is not in this phase; existing duplication is tolerated.
- **`STATE_VERSION` bump or new envelope subtree for feature flags** — explicitly out of scope (D-01 + PREFS-04). The envelope contract has handled this kind of additive change 5+ times without a bump and continues to.

</deferred>

---

*Phase: 47-persistable-feature-flag-preferences*
*Context gathered: 2026-05-25*
