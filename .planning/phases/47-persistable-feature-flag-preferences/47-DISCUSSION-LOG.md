# Phase 47: Persistable feature-flag preferences - Discussion Log

> **Audit trail only.** Do not use as input to planning, research, or execution agents.
> Decisions captured in `47-CONTEXT.md` — this log preserves how we got there.

**Date:** 2026-05-25
**Phase:** 47-persistable-feature-flag-preferences
**Mode:** discuss (default; no `--auto`, no `--all`, no `--power`)
**Areas analyzed:** Envelope shape · Resolver location · Setter API + hook split · Test-setter exposure

## Carried forward from prior phases (not re-asked)

- Resolution order `query-string > persisted > default` — locked by PREFS-03.
- Defaults match production today (`orb-halo` / `progress-arc` / `ambient` / `switcherIcon=false`) — locked by PREFS-03.
- Per-field non-throwing coercers; corrupt/unknown → default — locked by PREFS-04 + Phase 8 D-01.
- Query-string value never persists — locked by PREFS-02 + roadmap success criterion 2.
- No `STATE_VERSION` bump — locked by PREFS-04 + Phase 8 D-01 (envelope handled this kind of additive change 5+ times before — Phases 14, 25, 38, 39, 46).
- `hrv:prefs-changed` CustomEvent contract: one event name, per-dimension `detail.key` filter — locked by Phase 16/17/18/19/25 D-22.
- `BreathingShapeVariant` includes `'spiritual-eye'` since Phase 46 — phase 47 just persists it.

## Area 1: Envelope shape

**Question:** Where should the 4 persisted feature-flag values live in the storage envelope?

**Options presented:**
1. Flat in `UserPrefs` (recommended) — add 4 fields alongside `theme`/`timbre`/`cue`/`locale`. Matches Phase 25 CUE-02 precedent. One coerce-per-field. No new module.
2. Nested under `UserPrefs.featureFlags` — single grouped coercer, conceptual separation, first-project nesting precedent.
3. New top-level envelope subtree `Envelope.featureFlags` — independent load/save path, maximum separation, more code surface.

**Selected:** Option 1 — Flat in `UserPrefs`.

**Rationale:** Pattern-fidelity. Five prior precedents (Phase 14/25/38/39/46) all extend `UserPrefs` flat or coerce within it. No reason to invent new shape.

## Area 2: Resolver location

**Question:** Where does the query > persisted > default resolver live?

**Options presented:**
1. Inside `featureFlags.ts` (recommended) — change signature to `readFeatureFlags(search, persisted)`. Pure function; testable without storage mocking. Hook stays thin.
2. Compose in `useFeatureFlags()` hook — featureFlags.ts stays narrowly pure-query; hook owns merge.
3. New `src/featurePrefs.ts` resolver module — maximum separation, most files.

**Selected:** Option 1 — Inside `featureFlags.ts`, two-arg signature.

**Rationale:** Resolution logic stays pure (testable as a function); single source of truth for "how query and persisted combine"; hook stays thin and merges only at the I/O boundary. No new file.

## Area 3: Setter API + hook split

**Question:** What writer surface ships in Phase 47?

**Options presented:**
1. Storage primitives only (recommended) — `loadPrefs`/`savePrefs` only + same-tab event helper. Choice hook(s) ship in Phase 48 alongside pickers.
2. Choice hooks ship in 47 — four paired `use<Flag>Choice` hooks, mirroring `useThemeChoice`/`useLocaleChoice`.
3. One combined choice hook in 47 — single `useFeatureFlagsChoice` returning all 4 setters.

**Selected:** Option 2 — Four paired choice hooks ship in 47.

**Rationale:** Settles the API and gets tested against `savePrefs` / event-dispatch contract ahead of Phase 48 UI work. Phase 48 components plug straight in. Slightly more Phase 47 surface, but the four hooks are paste-and-rename copies of existing `useTimbreChoice` / `useThemeChoice` / `useCueChoice` / `useLocaleChoice` — boring on purpose.

## Area 4: Operator-facing dev surface

**Question:** Does Phase 47 ship any operator-facing dev surface to test persistence in the real app, or only vitest coverage?

**Options presented:**
1. Vitest only (recommended) — round-trip + coerce-fallback + resolver + choice-hook tests. Per-tab query-string workflow stays available for dev. Visual UAT happens in Phase 48.
2. DEV-only `window.__hrvPrefs` helper — `import.meta.env.DEV`-gated DevTools console setter.
3. Throwaway `?devPrefs=1`-gated UI overlay — visible toggles, removed in Phase 48.

**Selected:** Option 1 — Vitest only.

**Rationale:** Per-tab query string already covers operator's dev override need; persisted-pref visual UAT belongs to Phase 48 alongside the real UI. Smallest blast radius; no throwaway code to remove later.

## Claude's Discretion items (planner decides)

Captured in CONTEXT.md `<decisions>` "Claude's Discretion":

- Whether `coerce<Flag>` lives in `prefs.ts` or co-located with parsers in `featureFlags.ts` — both are acceptable; constraint is the alias table is reused, not duplicated.
- The exact type of `readFeatureFlags`'s `persisted` parameter (`Partial<FeatureFlags>` vs new alias vs full `FeatureFlags`).
- Whether choice hooks share a `FeatureFlagChoice<T>` helper type or stay independent.
- Whether the extended `useFeatureFlags` listeners stay inline (mirroring `useTheme`) or split into a helper.
- Choice-hook same-tab same-instance update — local `setStateState(next)` before `savePrefs` + event dispatch (verbatim from `useThemeChoice`).
- Test-file boundary for `useFeatureFlags` 4-listener coverage (single file vs split).

## Deferred ideas surfaced during discussion

(All captured in CONTEXT.md `<deferred>`.)

- Appearance UI surface — Phase 48.
- App Settings right-chevron + page navigation — Phase 48.
- DevTools / `?devPrefs=1` operator helpers — D-12 rejection.
- Per-practice feature-flag overrides — out of scope (REQUIREMENTS.md).
- `VITE_*` env-var promotion — out of scope (REQUIREMENTS.md).
- `useUserPref<K>(key)` abstraction across all `loadPrefs`-reading hooks — not requested; existing duplication tolerated.
- `STATE_VERSION` bump or new envelope subtree — out of scope (D-01 + PREFS-04).

## No corrections / no external research

- Standard discuss mode (not assumptions mode) — no `--auto` overrides.
- No external research needed; all patterns referenced are in-codebase precedent.
- No scope-creep redirects required; user stayed within phase boundary.
