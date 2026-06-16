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
- [ ] Implement pattern-breathing functionality — **presets over one configurable
  engine** (D1); model now specified in **D6** (4 phases + multiplier + rounds,
  presets-as-data). Engine work = architecture-plan Step 3 below.

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
- ~~Pattern-breathing spec / hold phase~~ — RESOLVED in **D6**: 4 phases
  (inhale · hold-in · exhale · hold-out) + multiplier + rounds; one cue per phase.
  Replaces the bpm/ratio model. Open sub-details deferred by choice: cue sound/visual
  design and the user-facing label for `multiplier`.
- App name and the breathing-*technique* name both resolve to "Pattern Breathing"
  (`practice.name`). The preset feature will likely surface a per-preset label on the
  settings sheet/header; revisit then. (D2 collapsed the two identical strings to one.)
- Decisions log: `.project/DECISIONS.md` (D1–D5).

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

## Deferred refactors (from `/ds-ts-review`, full-repo pass)

All `minor`, none blocking. The repo is clean otherwise (no `any`/`enum`/`namespace`,
no floating promises, validated storage boundaries, 739 tests green). Mechanical fixes
already applied in `7d89ee2` (explicit `ReactElement`/`void` return types). Deferred —
each changes structure or rests on judgment, so left for a focused pass:

- **`createAudioEngine` (`src/audio/audioEngine.ts:141`, ~350 lines)** — the highest-impact
  refactor; the one genuinely large unit. Extract the engine method group and the
  construction/resume-failure setup into helpers. While in here, fold in the two
  ride-along minors that live inside this function:
  - `audioEngine.ts:474` — `(err as DOMException)?.name` casts a caught `unknown` without a
    guard. Replace with a duck-typed `.name` check (NOT `instanceof DOMException` — the
    test rejects with a plain name-tagged Error, and a real DOMException is not
    `instanceof Error` in browsers, so instanceof breaks one side or the other).
  - `audioEngine.ts:215` — `endChordTailUntil` lacks the file's `*Sec` unit suffix; rename
    to `endChordTailUntilSec` (touches its in-closure refs).
- **`scheduleBowlCue` (`src/audio/cueSynth.ts:55`, ~136 lines)** — extract the
  envelope-shaping block and the partial-build loop into named helpers.
- **`scheduleEndChord` (`src/audio/boundaryCueSynth.ts:179`, ~73 lines)** — collapse the
  four parallel voice-node arrays + cancel() closure into one `voices: ToneNodes[]` array.
- **`useAppViewModel` (`src/app/useAppViewModel.ts:33`, ~134 lines)** — mostly flat
  declarative VM wiring; extract the audio-VM assembly, the `onBreathingPrimaryClick`
  handler, and the session/settings VM wiring into smaller helpers.
- **`appTestHarness.ts:61`** — `JSON.parse(raw) as Record<string, unknown>` with no runtime
  validation (test harness, not production — lowest priority).
