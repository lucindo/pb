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

Key fact: two separate "prefs" systems exist —
- `src/domain/settings.ts` = real user settings (theme, timbre, locale, cue).
- `src/storage/prefs.ts` + `src/featureFlags.ts` + `useFeatureFlags` = the
  query-string / dev-switch layer (`breathingShape`, `orbIdle`, `ringCue`,
  `bypassSilentMode`). This layer is what gets deleted.
Decision: `bypassSilentMode` folds into `domain/settings.ts` (Phase B), then
`storage/prefs.ts` is deleted entirely (Phase C).

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
string-enum exemplar). All three files get deleted in C.

**B — Give `bypassSilentMode` a home.** Add `bypassSilentMode: boolean` (default true) to
`domain/settings.ts` with a one-time migration reading the old `prefs.ts` value. Repoint
the audio path (`useAppViewModel` → `useBreathingSessionController` → `useAudioCues` →
`audioEngine`) to read it from settings.

**C — Delete feature-flag system.** Delete `featureFlags.ts`, `useFeatureFlags.ts`,
`storage/prefs.ts`, `usePreferenceChoice`, the `hrv:prefs-changed` plumbing + tests.
(The `variant`/`ringCue`/`idleMode` constant props were already removed in A1/A2/A3.)
Remove `?flag=` parsing + popstate/useSyncExternalStore flag listeners.

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

**State** — On branch `refactor/strip-to-pattern-breathing`, nothing pushed.
Settings strip-down phases A1 + A2 + A3 are done and committed (`69e914a`, `c7c6066`,
`c758496`); all gates green (`tsc -b`, `eslint`, 928 vitest tests). Phase A is COMPLETE:
all visual options are fixed to a single value. Advanced page now holds the single
Behavior toggle (Bypass silent mode); `bypassSilentMode` is the sole surviving feature
flag. (PLAN.md itself is the only uncommitted file.)

**Next** — Phase B: give `bypassSilentMode` a home in `domain/settings.ts` (add the
field with a one-time migration reading the old `prefs.ts` value; repoint the audio
path). Then Phase C deletes the feature-flag system entirely.

**Open questions**
- Are there more removal items beyond Settings (user will list them after Phase A–F)?
- Pattern-breathing spec still undefined (user will provide later).
- Optional leftover: write-only `activePractice` envelope field + migration seeding
  survive for schema stability (not read in production); retire only via a dedicated
  storage-migration pass — out of scope.
