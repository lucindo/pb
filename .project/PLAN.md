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
- [x] Pre-feature code-cleanup pass on branch `chore/code-cleanup`. Started as
  deslop + SSOT + comment review (collapsed multi-practice scaffolding to honest
  single-engine shape; D1 in `.project/DECISIONS.md`), then grew to include: the
  `/ds-ts-review` mechanical fixes, architecture Steps 1–2 (split `useAudioCues`,
  extract `cueStore`), all four deferred function-length refactors, a final deslop,
  and the Pattern Breathing spec + D6 model. All behavior-preserving; 739 tests green.
  Merged to `main`.
- [ ] Implement pattern-breathing functionality — **presets over one configurable
  engine** (D1); model specified in **D6**, full spec in `.project/SPEC.md`. Engine
  work = architecture-plan **Step 3** (the `BreathPhase`/`PatternSettings` migration).

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

**State** — `chore/code-cleanup` is **merged to `main`**; tree clean. The branch grew
from a deslop/SSOT/comment pass into the full pre-feature cleanup: `/ds-ts-review`
mechanical fixes, architecture Steps 1–2 (split `useAudioCues` →
`useCueScheduler`/`useAudioHealth`; extract `cueStore` from `createAudioEngine`), all
four deferred function-length refactors, a final deslop, and the Pattern Breathing
spec + D6 model. Everything behavior-preserving — `tsc -b`, `eslint`, 739 vitest tests
green throughout. The app is still the resonance timer under the new name;
pattern-breathing *functionality* is NOT built.

**Next** — Start the pattern-breathing feature: architecture **Step 3** — the
`BreathPhase` + `PatternSettings` migration (~16 files: domain→audio→hooks→
components→content→storage) against `.project/SPEC.md`. Add characterization tests at
the domain plan/cue seam first (`/ds-tdd-mode`); answer SPEC Open Question #5 (default
`PatternSettings` + rounds) early.

**Open questions**
- ~~Pattern-breathing spec / hold phase~~ — RESOLVED in **D6**: 4 phases
  (inhale · hold-in · exhale · hold-out) + multiplier + rounds; one cue per phase.
  Replaces the bpm/ratio model. Open sub-details deferred by choice: cue sound/visual
  design and the user-facing label for `multiplier`.
- App name and the breathing-*technique* name both resolve to "Pattern Breathing"
  (`practice.name`). The preset feature will likely surface a per-preset label on the
  settings sheet/header; revisit then. (D2 collapsed the two identical strings to one.)
- Decisions log: `.project/DECISIONS.md` (D1–D6).

## Architecture (from `/ds-architecture-plan`, full repo, max-level=3)

Assessment: architecture is **healthy** — strictly layered (domain is pure, zero
upward edges), no import cycles, sound audio sub-layering, good test seams (VM
factories D3, swappable clock). Problems are localized god-units + one model
coupling, not structural rot. Sequenced steps:

- **Step 1 [L2] — Split `useAudioCues.ts` (was 658L). DONE (`71688f5`).** Extracted
  `useCueScheduler` (cue-dispatch facade — the preset touch point) + `useAudioHealth`
  (status machine + clock-health + visibility-resume); `useAudioCues` keeps the engine
  lifecycle + proxy clock + mute. Interface byte-identical; single consumer untouched.
  739 tests green.
- **Step 2 [L1] — Decompose `createAudioEngine` (was 491L). DONE (`9ae0ffa`).** Extracted
  `cueStore` (in-flight Set + end-chord tail + schedule/prune/cancel/dedup/teardown);
  engine methods are now thin facades. Folded in both minors: `endChordTailUntilSec`
  rename + duck-typed `.name` guard (see note below). AC construction kept inline —
  an awaited construction helper added a microtask hop that broke fake-timer lead-in
  tests. 739 tests green.
- **Step 3 [L2] — Generalize `'in'|'out'` → `BreathPhase` + `bpm`/`ratio` →
  `PatternSettings`.** The one cross-layer milestone (~16 files: domain → audio →
  hooks → components → content → storage). UNBLOCKED — model spec'd in **D6**. This
  IS the pattern-breathing feature's first structural move, not pre-work; add
  characterization tests at the domain plan/cue seam first (`/ds-tdd-mode`).
- Leave alone (no symptom): VM factories (D3), modal class strings (D4), storage
  barrel, audio sub-layering, `strings.ts`. No L3 move warranted at this scale.

## Deferred refactors (from `/ds-ts-review`, full-repo pass) — ALL DONE

All `minor`, none blocking; all behavior-preserving with 739 tests green throughout.
Mechanical return-type fixes in `7d89ee2`. The function-length / cast items below are
now complete:

- **`createAudioEngine`** — DONE (`9ae0ffa`, architecture Step 2). Extracted `cueStore`;
  construction kept inline (an awaited helper shifted start-path microtask timing).
  Both ride-along minors folded in: `endChordTailUntilSec` rename + duck-typed `.name`
  guard (NOT `instanceof DOMException` — the test rejects with a plain name-tagged Error,
  and a real DOMException is not `instanceof Error` in browsers).
- **`scheduleBowlCue`** — DONE (`aa01ac0`). 136→58 lines; extracted `buildBowlEnvelope`
  + `buildPartialStack`.
- **`scheduleEndChord`** — DONE (`3a6f3b5`). 73→53 lines; collapsed the four parallel
  voice arrays into one `ToneNodes[]` (new shared `ToneNodes` type).
- **`useAppViewModel`** — DONE (`b2c67d6`). 134→109 lines; extracted `useStatsPanel` +
  `useBreathingPrimaryClick`. Left the flat factory wiring inline (already delegates to
  the tested VM factories per D3).
- **`appTestHarness.ts`** — DONE (`91dd376`). Guards the parsed-envelope shape before
  narrowing instead of an unchecked `as Record` cast.
