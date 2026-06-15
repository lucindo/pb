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
- A1 Orb style → `minimal-rings` only. Drop orb-halo + spiritual-eye branches in
  `OrbShape.tsx`; delete `OrbPicker.tsx`; remove `breathingShape` strings + type.
- A2 Ring cue → `progress-arc` (arc) only. Drop `outer-inner` branch in `OrbShape.tsx`
  (keep `ProgressArcLayer`); delete `RingCuePicker.tsx`; remove ring-cue strings + type.
- A3 Breathing effect (`orbIdle`) → removed. Drop `ambient` path in `OrbIdle`/
  `useAmbientScale` (keep static `still`); remove the Advanced toggle + `breathingEffect`
  strings + `OrbIdleBehavior`.
- A4 Cue style → `labels` (Text) only. Drop arrow + nose in `CueGlyph.tsx`; delete
  `CuePicker.tsx`; remove `cue` from `domain/settings.ts` + `useVisualCue` (cue → const
  `'labels'`); fix session-controller cue; remove cue strings.

**B — Give `bypassSilentMode` a home.** Add `bypassSilentMode: boolean` (default true) to
`domain/settings.ts` with a one-time migration reading the old `prefs.ts` value. Repoint
the audio path (`useAppViewModel` → `useBreathingSessionController` → `useAudioCues` →
`audioEngine`) to read it from settings.

**C — Delete feature-flag system.** Delete `featureFlags.ts`, `useFeatureFlags.ts`,
`storage/prefs.ts`, `usePreferenceChoice`, the `hrv:prefs-changed` plumbing + tests.
`variant`/`ringCue`/`idleMode` are now constants → drop those props through
`PracticeScreen → PracticeSessionView → BreathingSessionSurface`, hardcode in `OrbShape`.
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

**State** — On branch `refactor/strip-to-pattern-breathing`, tree clean, nothing
pushed. Settings strip-down is fully planned (Phases A–F above) and the one open
decision is resolved (`bypassSilentMode` → domain settings). No code touched yet.
Prior session left the app as a single HRV timer with all gates green
(`tsc -b`, `eslint`, 993 vitest tests).

**Next** — Either start Phase A1, or wait for the user to list further removal
items so the full strip-down is sequenced in one pass. User to choose.

**Open questions**
- Are there more removal items beyond Settings before we start executing?
- Pattern-breathing spec still undefined (user will provide later).
- Optional leftover: write-only `activePractice` envelope field + migration seeding
  survive for schema stability (not read in production); retire only via a dedicated
  storage-migration pass — out of scope.
