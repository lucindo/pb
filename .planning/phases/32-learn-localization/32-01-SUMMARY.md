---
phase: 32-learn-localization
plan: 01
subsystem: content
tags: [content-architecture, i18n, tdd, learn-dialog, practices-partition]
dependency_graph:
  requires: [phase-30-multi-practice-architecture]
  provides: [learnContent-practices-partition, strings-learn-nk-keys, tdd-content-tests]
  affects: [LearnDialog.tsx, App.tsx, learnContent.test.ts, strings.test.ts]
tech_stack:
  added: []
  patterns: [as-const-satisfies, per-practice-partition, review-marker-drift-guard]
key_files:
  created: []
  modified:
    - src/content/learnContent.ts
    - src/content/learnContent.test.ts
    - src/content/strings.ts
    - src/content/strings.test.ts
    - src/components/LearnDialog.tsx
    - src/components/LearnDialog.test.tsx
decisions:
  - "NK description body strings live in learnContent.ts (mirrors existing hrv/timing body pattern; clinical-verbs guard test coverage automatic)"
  - "practices.resonant.videos flattens heroVideo + keyVideos[] into a single LearnLink[] array (uniform type across both practices)"
  - "LearnDialog.tsx updated in Plan 01 to unblock compilation (Rule 3 auto-fix); full practice-aware rendering deferred to Plan 02"
metrics:
  duration: ~30min
  completed: 2026-05-17
  tasks_completed: 2
  tasks_total: 3
  files_changed: 6
---

# Phase 32 Plan 01: learnContent.ts Practices Partition + strings.ts NK Headings Summary

Restructured `learnContent.ts` from a flat resonant-only shape into a per-practice partition (`practices` map keyed by `PracticeId`), preserved all resonant data byte-identically, added EN Navi Kriya description copy and PT-BR drafts with review markers, added 3 new `UiStrings.learn` heading keys in both locales, and updated all affected tests.

## What Was Built

### learnContent.ts

New `PracticeLearnContent` interface added:
```typescript
export interface PracticeLearnContent {
  readonly description: {
    readonly section1: ExplainerSection
    readonly section2: ExplainerSection
  }
  readonly videos: readonly LearnLink[]
}
```

`LearnContent` interface updated:
- `explainer` retains only `forrest` (HRV/timing sections moved to `practices.resonant.description`)
- `links` drops `heroVideo` and `keyVideos` (moved to `practices.resonant.videos`)
- New `practices: { readonly resonant: PracticeLearnContent; readonly naviKriya: PracticeLearnContent }`

Data:
- EN + PT-BR `practices.resonant` holds the old HRV/timing explainers (byte-identical) and `[heroVideo, ...keyVideos]` in order
- EN `practices.naviKriya` holds operator-ready description copy (Task 3 checkpoint pending) and 2 D-06 video links
- PT-BR `practices.naviKriya` holds 4 `// TODO: native-speaker review` markers (D-11; Plan 03 removes them)

### strings.ts

3 new keys added to `UiStrings.learn` interface and both locales:
- `naviKriyaVideosHeading`: EN `'Selected Navi Kriya Videos'`; PT-BR with review marker
- `naviKriyaDescriptionSection1Title`: EN `'What is Navi Kriya'`; PT-BR with review marker
- `naviKriyaDescriptionSection2Title`: EN `'How this app paces it'`; PT-BR with review marker

3 `// TODO: native-speaker review` markers in `strings.ts` PT-BR learn block (D-11).

### Tests

`learnContent.test.ts`:
- Explainer-keys test updated: expects `['forrest']` (not `['hrv', 'timing', 'forrest']`)
- New structural tests for `practices.resonant` + `practices.naviKriya`
- New D-06 video URL/label identity tests across locales
- Clinical-verbs guard extended to cover `practices.resonant.description.section1/2.body` + `practices.naviKriya.description.section1/2.body`
- Old `links.heroVideo` / `links.keyVideos` tests removed (data moved to practices)

`strings.test.ts`:
- New Phase 32 learn.* heading keys exhaustiveness checks
- New explicit PT-BR non-empty assertions for `nkReadout.*` and `nkControls.*`

## Commits

| Hash | Type | Description |
|------|------|-------------|
| 9a0cbb1 | test | TDD RED: failing tests for practices partition + NK videos |
| edfbb4d | feat | GREEN: restructure learnContent.ts into per-practice partition |
| 9a2035e | test | TDD RED: failing tests for new learn.* keys + nkReadout/nkControls PT-BR |
| d038afd | feat | GREEN: add 3 new learn heading keys to strings.ts + fix consumers |

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 3 - Blocking] LearnDialog.tsx broken by LearnContent interface change**
- **Found during:** Task 2 (full suite run revealed 21 LearnDialog test failures + 80+ App test failures)
- **Issue:** `LearnDialog.tsx` accessed `explainer.hrv`, `explainer.timing`, `links.heroVideo`, `links.keyVideos` — all removed from `LearnContent` in Task 1. TypeScript still compiled (no direct tsc error in LearnDialog.tsx before test run) because the old interface was removed not just changed.
- **Fix:** Updated `LearnDialog.tsx` to use `practices.resonant.description.section1/section2` and `practices.resonant.videos.map()`. Resonant-default rendering preserved; full practice-aware rendering (Plan 02 scope) not added.
- **Files modified:** `src/components/LearnDialog.tsx`, `src/components/LearnDialog.test.tsx`
- **Commit:** d038afd

## Status at Checkpoint

**Task 3 (checkpoint:human-verify):** Operator must review and lock the EN Navi Kriya description copy before Plan 02 renders it.

EN copy to review (in `src/content/learnContent.ts`, `practices.naviKriya.description`):

**Section 1 — "What is Navi Kriya":**
> Navi Kriya is an OM-counting meditation practice taught by Forrest Knutson. Each repetition of OM is counted at a chosen pace across the front and back of the body, moving attention along the spine. This is a quiet seated practice — not a clinical procedure and not a physical exercise.

**Section 2 — "How this app paces it":**
> This app counts each OM at your chosen pace and automatically advances from the front phase to the back phase at a fixed 4-to-1 ratio. You configure the number of rounds and the OM length; the app tracks your progress and sounds an optional cue on each OM so your attention stays on the practice.

## Known Stubs

None. The plan's stated output is data structures + strings, not UI rendering.

Note: `// TODO: native-speaker review` markers are intentionally present (D-11 design requirement):
- 4 markers in `learnContent.ts` (PT-BR NK description sections)
- 3 markers in `strings.ts` (PT-BR NK heading keys)

These are tracked by the drift-guard test (`content.no-review-markers.test.ts`) which fails intentionally until Plan 03 operator review removes them.

## Threat Flags

No new threat surface introduced. All URLs are static authored constants with no user input. The `content.no-review-markers.test.ts` drift-guard continues to enforce the done-state for all `src/content/` files.

## Self-Check: PASSED

- [x] `src/content/learnContent.ts` exists and contains `practices.naviKriya`
- [x] `src/content/strings.ts` exists and contains `naviKriyaVideosHeading`
- [x] All 4 plan commits exist: 9a0cbb1, edfbb4d, 9a2035e, d038afd
- [x] `npx vitest run src/content/learnContent.test.ts src/content/strings.test.ts` → 84 passed
- [x] `npx vitest run` → 1149/1150 passed (1 intentional fail: drift-guard catches review markers)
- [x] `npx tsc --noEmit` → exits 0
