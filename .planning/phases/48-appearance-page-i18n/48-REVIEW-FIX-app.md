---
status: partial
chunk: app
review_source: 48-REVIEW-app.md
applied: 12
skipped: 1
deferred: 0
note: |
  Report reconstructed by orchestrator from fixer-agent return summary —
  the fixer's worktree was cleaned up before its untracked REVIEW-FIX file
  could be moved into the main repo. All commits below are present on
  `main` and verified via `git log --grep="^fix(48-app-"`.
---

# Phase 48 — `app` chunk fix report

## Applied (12)

| ID    | Commit    | Summary |
|-------|-----------|---------|
| WR-01 | `c9364ef` | `closeOnSessionView` only watched breathing — now force-evicts app screen on any active session (composed `controlsDisabled`). |
| WR-02 | `a0af4d3` | `useAppNavigation.ts:36-37` eslint-disable scope extended to cover both `setState` calls under the disable block. |
| WR-03 | `d56aa17` | `AppPracticeSessionViewModel` discriminator split — breathing arm now `resonant | stretch | naviKriya` instead of silently absorbing stretch. |
| WR-04 | `2c075ee` | `getVisibleNaviPhase` stops silently coercing `'idle'`/`'done'`; throws on `'idle'`, maps `'done' → 'back'`. |
| IN-01 | `14f69ff` | Documented dual audio prop topology on `PracticeControlsView` (controls.audio vs audio). |
| IN-02 | `0cc5bb5` | Dropped phase-doc reference (`see IN-01 in 48-REVIEW.md`) from production comment in `AppSettingsPage`. |
| IN-04 | `20e4210` | Extracted shared `SessionCompletionHeadline` component — removed JSX duplication between `NaviKriyaSessionSurface` and `SessionReadout`. |
| IN-05 | `17f39aa` | Made breathing primary-action dispatch exhaustive (proper discriminated-union switch). |
| IN-06 | `e315a22` | Split `AppNavigationViewModel` out of `AppDialogsViewModel` — separation of concerns. |
| IN-07 | `221c403` | `resumeHintId` is now optional; dropped the empty-string sentinel. |
| IN-08 | `c52e409` | Renamed `onBackToAppSettings` → `onBackFromAppearance` (clearer semantic). |
| IN-09 | `e8d0be3` | Memoized `AppSettingsPage` strings subset to avoid per-render wrapper allocation. |

## Skipped (1)

| ID    | Rationale |
|-------|-----------|
| IN-03 | `setupCardSummary` returns `null` for three semantically different cases. Reviewer labeled "Lower priority — code-clarity nit"; typed-discriminator refactor would touch public return type, single consumer, and every test in `setupCardSummary.test.ts` with no behavior change. Header comment already documents hide-conditions in prose. |

## Cross-chunk edits

Per `<scope>` rule allowing cross-chunk edits when a finding's stated cause crosses chunks:

- **IN-04** added `src/components/SessionCompletionHeadline.tsx` + edited `src/components/SessionReadout.tsx`.
- **IN-07** tightened `src/components/MuteToggle.tsx` and `src/components/SessionActionRow.tsx` resumeHintId gating.

## Memory-rule application

- `[[feedback_design_logic_separation]]` — WR-02 (a11y/lint), WR-03 (type-system), WR-04 (logic guard), each in separate commits.
- `[[feedback_no_design_locking]]` — no byte-locking tests added.
- General hygiene — no finding-ID refs in source code; commit messages explain why.

## Verification

`npx tsc --noEmit -p .` passed after every commit. Vitest deferred to orchestrator-level run.
