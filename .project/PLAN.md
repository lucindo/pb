# Plan — Pattern Breathing (pb)

This repo is an import of the HRV breathing app, being repurposed into a
**Pattern Breathing** app. Strategy: strip the HRV app down to a lean single-practice
base, then build pattern-breathing on the surviving core breathing engine.

## Roadmap

- [x] Decide seed: keep HRV/resonant timer as the base for pattern breathing
- [x] Remove Navi Kriya practice (engine, audio, settings, stats, copy)
- [x] Remove Stretch practice (ramp engine, settings, stats, copy)
- [x] Collapse the 3-way practice abstraction to a single HRV practice (switcher UI gone)
- [x] Remove dead Stretch/Navi Kriya bilingual copy + parity tests
- [x] Refresh `.project/PROJECT.md` to current single-practice shape; drop stale Stretch `SPEC.md`
- [x] Collapse vestigial single-practice scaffolding (5 steps under /ds-step-mode)
- [~] Strip-down toward lean state — receiving "things to remove" from user
  - [ ] Settings strip-down (planned; 6 phases A–F below) — awaiting go / more items
  - [ ] (Pending user input) Further removal items beyond Settings
- [ ] (Pending user input) Implement pattern-breathing functionality

## Settings strip-down plan (Phases A–F)

Goal: one Settings page — **System · Sound · Statistics · About · privacy note**.
No Advanced page, no Stats page, no feature flags.

Key fact (CORRECTED — the original note was wrong about where settings live):
- `src/domain/settings.ts` = **types only** (enum predicates + defaults: `DEFAULT_THEME`,
  `DEFAULT_CUE`, … and now `DEFAULT_BYPASS_SILENT_MODE`). No persistence.
- `src/storage/prefs.ts` (`UserPrefs`) is the **real persisted user-pref store** for
  theme/timbre/cue/locale/bypassSilentMode, read via `loadPrefs()` in App-side hooks
  (`useTheme`, `useVisualCue`, `useLocale`, `useBypassSilentMode`). `prefs.ts` +
  `usePreferenceChoice` are load-bearing and STAY.
- The deletable layer was the **feature-flag query-string machinery** — `featureFlags.ts`,
  `useFeatureFlags.ts`, `readFeatureFlags`, `?flag=` parsing. `bypassSilentMode` was its
  last consumer. Done in B+C (commit `f2f8d7e`).

**A — Fix visual options to one value each** (one commit per item; each gates green)
- [x] A1 Orb style → `minimal-rings` only (commit `69e914a`). Dropped orb-halo +
  spiritual-eye branches in `OrbShape.tsx`, `OrbPicker`, `breathingShape` flag/pref/
  strings/type, + orphaned halo/spiritual-eye CSS tokens.
- [x] A2 Ring cue → `progress-arc` only (commit `c7c6066`). Dropped `outer-inner`
  branch (kept `ProgressArcLayer`), `RingCuePicker`, `ringCue` flag/pref/strings/type,
  + the now-empty Orb Style section on Advanced.
- [x] A3 Breathing effect (`orbIdle`) → removed (commit `c758496`). Deleted
  `useAmbientScale` (hook + test); `OrbIdle` locks `orbScale` at `MID_SCALE`. Dropped
  `OrbIdleBehavior`, `ORB_IDLE_FLAG`, `orbIdle` from FeatureFlags/UserPrefs/DEFAULT_PREFS/
  coercePrefs; the Advanced toggle + `breathingEffect` strings. Also dropped the orphaned
  `idleMode` prop threading down to `OrbShape` (the C-listed `idleMode` removal, pulled
  forward since the flag that fed it is gone). `bypassSilentMode` is now the sole flag.
- [ ] A4 Cue style → `labels` (Text) only. Drop arrow + nose in `CueGlyph.tsx`; delete
  `CuePicker.tsx`; remove `cue` from `domain/settings.ts` + `useVisualCue` (cue → const
  `'labels'`); fix session-controller cue; remove cue strings.

Note (test churn): generic flag-system tests (`featureFlags.test.ts`,
`useFeatureFlags.test.ts`, `usePreferenceChoice.test.ts`) are repointed to whichever
flag still survives — A1→A2 moved them breathingShape→ringCue→orbIdle. A3 repointed
them to `bypassSilentMode` (the last survivor; `usePreferenceChoice` uses `cue` for its
string-enum exemplar). `featureFlags.test.ts` + `useFeatureFlags.test.ts` were deleted in
B+C; `usePreferenceChoice.test.ts` stays (the hook is load-bearing for theme/cue).

- [x] **B+C — Decouple `bypassSilentMode`, delete the feature-flag layer** (commit
  `f2f8d7e`). CORRECTED from the original B/C: `bypassSilentMode` was already a persisted
  `UserPref`, so nothing moved into `domain/settings.ts` except its default
  (`DEFAULT_BYPASS_SILENT_MODE`) and no migration was needed. Added `useBypassSilentMode`
  (mirrors `useVisualCue`); `useAppViewModel` reads from it and `vm.featureFlags` is gone.
  Deleted `featureFlags.ts` + `useFeatureFlags.ts` (readFeatureFlags, `?bypassSilentMode=`
  override, popstate/useSyncExternalStore listeners). `prefs.ts` + `usePreferenceChoice`
  KEPT (theme/timbre/cue/locale depend on them). The boolean-string coercer is inlined in
  `prefs.ts`. Per user: the `?bypassSilentMode=` URL override was dropped.

**D — Settings restructure.** Rebuild `SettingsPanelBody.tsx`: **System** (Theme · Language),
**Sound** (Timbre · Bypass silent mode toggle). Remove old "Audio" block + Statistics chevron
row. Add `system` / `sound` section strings.

**E — Inline Statistics, drop Stats page.** Add the single stat block inline before About;
move privacy note below About. Delete `StatsPage.tsx`; remove `'stats'` from `AppScreen` +
`ReturningFrom`, the `ScreenRouter` case, `onStatsOpen`/`onBackFromStats`. Keep stats data
load + reset in `useAppViewModel` (drop open/refresh-on-navigate). Keep `strings.stats.privacyNote`.

**F — Drop Advanced page.** Advanced now empty. Delete `AdvancedPage.tsx`; remove `'advanced'`
from unions, the `ScreenRouter` case, `onAdvancedOpen`, the chevron in `AppSettingsPage.tsx`;
drop Advanced-only strings.

Verify each phase: `tsc -b`, `npm run lint`, `npm run test:run` (remove tests for deleted features).

## Now

**State** — On branch `refactor/strip-to-pattern-breathing`, nothing pushed. Phases A
(A1 `69e914a`, A2 `c7c6066`, A3 `c758496`) and B+C (`f2f8d7e`) are done; all gates green
(`tsc -b`, `eslint`, 895 vitest tests). The feature-flag system is GONE: no `featureFlags.ts`/
`useFeatureFlags.ts`, no `vm.featureFlags`, no `?flag=` query overrides. `bypassSilentMode`
is now a plain user pref read via `useBypassSilentMode`. The Advanced page still holds its
single Bypass-silent-mode toggle (written via `usePreferenceChoice`). (PLAN.md is the only
uncommitted file.)

**Next** — Phase D: rebuild `SettingsPanelBody.tsx` into **System** (Theme · Language) +
**Sound** (Timbre · Bypass silent mode toggle); remove the old "Audio" block + Statistics
chevron row; add `system`/`sound` section strings. (Then E: inline Stats / drop Stats page.
F: drop the now-near-empty Advanced page — note the bypass toggle currently lives on Advanced,
so D must first give it a home under Sound.)

**Open questions**
- Are there more removal items beyond Settings (user will list them after Phase A–F)?
- Pattern-breathing spec still undefined (user will provide later).
- Optional leftover: write-only `activePractice` envelope field + migration seeding
  survive for schema stability (not read in production); retire only via a dedicated
  storage-migration pass — out of scope.
