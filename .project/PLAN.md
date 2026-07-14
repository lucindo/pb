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
- [x] Implement pattern-breathing functionality — **presets over one configurable
  engine** (D1); model **D6/D7**, full spec in `.project/SPEC.md`. Engine + both
  follow-ons + the FR-18a rounds toggle all landed; branch `feat/pattern-breathing`
  is feature-complete and unmerged (pending code review).
  - [x] Resolve all SPEC open questions (**D7**): default Box-4 ×4 / 10 rounds;
    labels In/Out/Hold (Puxa/Solta/Prende); Scale label; X/N readout; ∞ for
    open-ended; rounds toggle/stepper; sustained hold cue; hold progress-bar visual.
  - [x] **Architecture Step 3 — four-phase model migration. DONE (`a30fd53`).**
    `PatternSettings` + `BreathPhase` across domain→audio→hooks→app→components→
    storage→content (47 files). Extend-duration dropped. `tsc -b` + eslint + 714
    vitest green. Holds reuse the in/out strike as a PLACEHOLDER cue.
  - [x] **Follow-on A — smooth sustained hold tone** (audio). DONE (`eb6b712`).
    Holds now play a single-sine pad (fade in → hold → fade out), pitch-matched to
    the adjacent strike (hold-in 440 / hold-out 220). Reuses the end-chord tone
    builder: promoted `buildToneNodes`/`PadEnvelope`/`ToneNodes`/`disconnectToneNodes`
    from `boundaryCueSynth` into the core `cueSynth` (one-way dep boundary→cueSynth);
    `boundaryCueSynth` imports them. NOT a per-timbre partial-stack strike — sustaining
    the inharmonic partials sounded rough. Tuning knobs in `cueSynth.ts`:
    `HOLD_ATTACK_SEC` 0.8 / `HOLD_RELEASE_SEC` 1.1 / `HOLD_SUSTAIN_GAIN` 0.12
    (UAT'd by ear — sits below the 0.18 strike peak since a sustained tone reads louder).
  - [x] **Follow-on B — hold-phase ring visuals** (UI). DONE (`0ff0159`).
    `HoldProgressBar` under the "Hold" label (faint track + accent-strong fill grown
    L→R by `phaseProgress`; reduced-motion keeps the static track, drops the advancing
    fill). Plus: **hold-in keeps the completed (full) inhale arc closed**; hold-out
    shows nothing (ring drained after exhale). `ProgressArcLayer`: `hold-in` → `t=1`,
    `hold-out` → null.
  - [x] **Rounds limit toggle (FR-18a)** (settings). DONE (`a08d8ab`). "Limit rounds"
    `SettingsToggleRow` above the rounds stepper. On ⇒ finite, off ⇒ open-ended;
    `checked = rounds !== 'open-ended'` so it tracks the stepper (past-99→∞ flips it
    off). Off→on restores the last finite value via a `useRef` updated in
    `onRoundsChange` (NOT during render — `react-hooks/refs` forbids it); falls back
    to the domain default (10). Strings `roundsLimitLabel` EN/PT.
  - [x] **Pre-merge review + polish.** `/ds-deslop` (`4127f61` — deduped `stopAt`,
    trimmed a hold-cue comment; rejected the domain "guards" as mandatory under
    `noUncheckedIndexedAccess`). `/ds-code-review` SSOT: one real find, fixed in
    `2130ed6` — `OPEN_ENDED_GLYPH '∞'` single-sourced in `strings.ts`, referenced by
    the rounds stepper + `SessionReadout`. Then the last user-facing items: About-page
    copy (`2fc49a9`), README (`74ffd46`), smaller in/out/hold label (`e66da58`), and a
    new ring+arc app icon + favicon replacing the inherited HRV art (`48792eb`).
- [x] **Merge to `main` + ship v1.0.** Merged `feat/pattern-breathing` (`8065da6`, no-ff).
  Purged the 12 inherited HRV tags (`v1.0`–`v2.4`, local + origin) and released fresh:
  `package.json` 1.0.0, `versions.json` official `v1.0`, tag `v1.0` (`615d5d4`). First
  deploy failed on inherited config — fixed by dropping the vestigial `build-archives`
  job (hardcoded `tag: ['v1.5']`) (`b15a2ad`) and re-pointing `v1.0`. Two one-time GitHub
  repo-config steps (NOT in source, persist on GitHub): enabled Pages with the Actions
  source; added a `v*` tag deployment-branch policy to the `github-pages` environment.
  **Live at https://lucindo.github.io/pb/ (200) and /pb/v1.0/ (200).**
- [x] **Bump CI actions to Node 24 majors** (PR #1, merged `fc7e426`). `deploy.yml`:
  checkout→v6, setup-node→v6, upload-artifact→v7, download-artifact→v8, configure-pages→v6,
  upload-pages-artifact→v5, deploy-pages→v5. Clears the Node-20 deprecation; takes effect
  on the next tag / `workflow_dispatch`. Build `node-version: 20` input left unchanged.
- [x] **v1.0.1 patch — 1-4-2 preset default scale 1→2** (`529c415`). One-line change in
  `presets.ts` (`multiplier: 2`; effective 2-8-4). `package.json` 1.0.1; `versions.json`
  unchanged (official already `v1.0`, first two segments still match). Re-pointed the `v1.0`
  tag (`9a4c195`→`529c415`, force-pushed) — same release line, so the tag moves rather than
  cutting `v1.1`. Tag push triggers deploy + first-exercises the Node-24 action bumps.
- [x] **v1.1 — drop in-hold tone an octave to 220 Hz** (`343cdb7`). One audio feel-knob in
  `cueSynth.ts`. `package.json` 1.1.0; cut as a *new* minor line — fresh `v1.1` tag, appended to
  `versions.json` and promoted to `official` (root `/pb/` now serves v1.1).
- [x] **Native desktop binaries — shipped `desktop-v1.0.0`.** Ported HRV's approach: one CI
  workflow (`.github/workflows/desktop.yml`) wrapping the live `/pb/` PWA in a Pake (Tauri)
  shell — no app/dep changes. Builds macOS-universal `.dmg`, Windows `.msi`, Linux x64
  `.deb`/`.rpm`/`.AppImage`. Decoupled from `deploy.yml`: triggers on `workflow_dispatch`
  (artifacts) or a `desktop-v*` tag (GitHub Release); wrapper version = the tag, app
  auto-updates via the live URL. PRs #2 (workflow + README "Desktop apps") + #3 (icon fix).
  **Gotcha (HRV had documented it, missed on first pass):** pb's `public/pwa-512x512.png` was
  RGB; Tauri's Linux build hard-requires RGBA (mac/win bundlers don't). Converted in place,
  RGB pixels byte-identical (`201d746`). Released live with all 5 installers at
  `releases/latest`.
- [x] **v1.1.1 patch — lock viewport zoom** (`c7bdfa2`). Added `maximum-scale=1,
  user-scalable=no` to the `index.html` viewport meta (prevents pinch/double-tap zoom
  disrupting the ring/arc framing). `package.json` 1.1.1; same minor line, so the `v1.1`
  tag was force-moved (`343cdb7`→`c7bdfa2`) rather than cutting v1.2 — `versions.json`/
  official untouched (short form still `v1.1`, passes the deploy version gate). Deploy
  green; **confirmed working incl. iOS** by the user. No desktop release — installed
  clients auto-catch the web change via the live URL. See **D8**.

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

**State** — **Web v1.1.1** (official, served at `/pb/`; the `v1.1` tag now points at
`c7bdfa2`) + **native desktop `desktop-v1.0.0`** both live. Latest patch locked viewport
zoom (`maximum-scale=1, user-scalable=no`) — deploy green, confirmed working on desktop
**and iOS** by the user (D8). No desktop rebuild needed (installed clients load the live
URL). `main` clean at `c7bdfa2`, in sync with origin. A natural between-features stopping point.

**Next** — No required action. New work starts from a fresh spec. Release mechanics: web —
new minor = bump `package.json`, add `vX.Y` to `versions.json` (+ official), commit, tag
`vX.Y`, push; patch = bump patch, move the tag, force-push (short form of `package.json`
version MUST still match the tag — the deploy version gate). Desktop — push a `desktop-v*`
tag to cut a new installer release (only when the Pake shell itself changes; web content
auto-updates without one).

**Cross-session notes**
- Deploy gotchas are now solved but worth knowing: the deploy only triggers on `vX.Y` tag
  pushes (no PR/branch CI). Pages + the `github-pages` env `v*` tag policy are configured on
  GitHub (one-time, not in source). The next tag also first-exercises the Node-24 action bumps.
- Hold tone UAT'd by ear; volume signed off (`HOLD_SUSTAIN_GAIN` 0.12). The three `HOLD_*`
  knobs in `cueSynth.ts` are the only feel-tuning left.
- Icon/favicon masters live in `assets/icons/`; regenerate PNGs with `rsvg-convert` if the
  palette changes. Favicon SVG is synced across `faviconPalette.ts`, `index.html`,
  `public/favicon.svg` (color hexes guarded by `favicon.sync.test.ts`).

**Open questions**
- ~~Pattern-breathing spec / hold phase~~ — RESOLVED in **D6/D7**.
- ~~Multiplier UI label~~ — RESOLVED (D7): **"Scale"** (internal name `multiplier`).
- App name and the breathing-*technique* name both resolve to "Pattern Breathing"
  (`practice.name`). The preset feature will likely surface a per-preset label on the
  settings sheet/header; revisit then. (D2 collapsed the two identical strings to one.)
- Decisions log: `.project/DECISIONS.md` (D1–D7).

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
