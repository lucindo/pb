# Plan — Pattern Breathing (pb)

This repo is a spinoff copy of the HRV breathing app (no shared deployment, no
back-compat), being repurposed into a **Pattern Breathing** app. Strategy: strip the
app down to a lean single-practice base, then build pattern-breathing on the surviving
core breathing engine.

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
  - [x] About page stripped to one placeholder block; README zeroed to title (`e8d9dfd`, `dc5f21c`)
  - [x] Flatten storage envelope — drop `practices`/`activePractice`/migration ladder (`b345381`)
  - [x] Rename all HRV/Resonant/VFC → Pattern Breathing; Forrest already gone (`32a7475`)
  - [x] Deploy base path `/hrv/` → `/pb/` (`5025fa3`)
  - [x] Collapse orb → fixed ring + arc; drop scale animation + rename
    `OrbShape`→`BreathingRing` (`4ddac9b`, `200e25f`); drop dead `nk-om-pulse`
    (`51abb3a`). Ring never grows/shrinks; In/Out fixed size; text on page bg.
  - [x] Trim COMPLETE — no further removal items
- [x] Pre-feature code-cleanup pass on branch `chore/code-cleanup` (9 commits;
  deslop + SSOT review + comment review, all under /ds-step-mode). Collapsed the
  remaining multi-practice scaffolding to honest single-engine shape. Decisions
  in `.project/DECISIONS.md` (D1: presets-over-one-engine). Not yet merged.
- [ ] (Pending user input) Implement pattern-breathing functionality —
  **presets over one configurable engine** (D1); presets are data, not practice types

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

**State** — On branch `chore/code-cleanup`, 9 commits ahead of `main`, tree clean,
nothing pushed/merged. The strip-to-pattern-breathing trim is done and merged (prior
branch). This branch is a pre-feature cleanup pass (deslop → SSOT review → comment
review, all gated under /ds-step-mode): collapsed the leftover multi-practice
scaffolding to an honest single-engine shape. Notable: dead `switcher` namespace →
single `practice.name`; dropped the `kind: 'patternBreathing'` discriminant; flattened
the single end-session dialog VM (renamed `EndSessionDialogsView`→`EndSessionDialogView`);
inlined `SessionPrimaryAction`; hoisted `PREFS_CHANGED_EVENT`/`STATE_KEY` to single
sources; stripped ~83 ceremonial/restating comments and tightened buried WHY ones.
**Kept by decision:** the ViewModel factories (tested seam, D3) and modal class strings
(D4). All gates green throughout (`tsc -b`, `eslint`, 739 vitest tests). The app is still
the resonance timer under the new name — pattern-breathing *functionality* is not built.

**Next** — Decide: merge `chore/code-cleanup` → `main`, then start the pattern-breathing
feature spec (`/ds-spec`) — **presets over one configurable engine** per D1. Tree clean,
safe to clear.

**Open questions**
- Pattern-breathing spec still undefined beyond D1's shape (presets-as-data over one
  engine; e.g. Box = 4/4/4/4). The current engine is inhale/exhale only (no holds) — real
  patterns likely need a hold phase, a future engine change.
- App name and the breathing-*technique* name both resolve to "Pattern Breathing"
  (`practice.name`). The preset feature will likely surface a per-preset label on the
  settings sheet/header; revisit then. (D2 collapsed the two identical strings to one.)
- Decisions log: `.project/DECISIONS.md` (D1–D5).
