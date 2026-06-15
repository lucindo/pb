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
  - [x] Settings strip-down COMPLETE (phases A1–A4, B+C, D+E+F — see below)
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
- [x] A4 Cue style → text labels only (commit `6228df9`). Deleted `useVisualCue`,
  `useCueChoice`, `CuePicker`, `CueGlyph` (+ tests); `OrbBody` renders the phase-label
  span directly. Dropped `CueStyleId`/`CUE_OPTIONS`/`isValidCue`/`DEFAULT_CUE` from domain
  and `cue` from `UserPrefs`/coercers; removed the `sessionCue`/`liveCue` capture thread
  through the controller/presentation/view model; `OrbShape` lost its `cue` prop. Removed
  the cue strings. (`usePreferenceChoice`'s string-enum test exemplar moved cue→timbre.)

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

- [x] **D+E+F — Consolidate Settings into one page** (commit `9832df6`). Done together
  (one coherent end state, no broken intermediate). `SettingsPanelBody` rebuilt: **System**
  (Theme · Language) · **Sound** (Timbre · Bypass silent mode) · inline **Statistics** ·
  **About** · privacy note. The bypass toggle moved off Advanced into Sound. Extracted
  `SettingsStatsSection` (stat rows + reset-confirm) from the deleted `StatsPage`; stats
  refresh when Settings opens (wrapped `onSettingsOpen`). Deleted `AdvancedPage` +
  `StatsPage` (+ tests). `AppScreen` is now `practice|learn|appSettings`; dropped
  `ReturningFrom`, `onAdvancedOpen`/`onStatsOpen`/`onBackFrom*`, the right-chevron.
  Strings: added `appSettings.sections.system/sound` + `appSettings.bypassSilentMode`;
  dropped the `advanced` subtree, `stats.title/back`, `statsRow`, theme/language/audio labels.

Verify each phase: `tsc -b`, `npm run lint`, `npm run test:run` (remove tests for deleted features).

## Now

**State** — On branch `refactor/strip-to-pattern-breathing`, nothing pushed. **The entire
Settings strip-down is COMPLETE** (A1 `69e914a`, A2 `c7c6066`, A3 `c758496`, A4 `6228df9`,
B+C `f2f8d7e`, D+E+F `9832df6`); all gates green (`tsc -b`, `eslint`, 810 vitest tests,
`vite build`). The app is now a single-practice HRV timer with one Settings page
(System · Sound · Statistics · About · privacy). No feature-flag system, no cue-style
chooser, no Advanced/Stats sub-pages. (PLAN.md is the only uncommitted file.)

**Next** — Awaiting the user's direction:
- Further removal items beyond Settings (user said they'd list more after A–F), OR
- The pattern-breathing spec / functionality (still undefined — user will provide).
Nothing is in flight; safe to clear the session.

**Open questions**
- Are there more removal items beyond Settings (user will list them after Phase A–F)?
- Pattern-breathing spec still undefined (user will provide later).
- Optional leftover: write-only `activePractice` envelope field + migration seeding
  survive for schema stability (not read in production); retire only via a dedicated
  storage-migration pass — out of scope.
