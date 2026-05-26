---
status: complete
quick_id: 260526-dse
description: Fix Navi session-complete state — missing checkmark, wrong CTA, practice-config row visible
date: 2026-05-26
commits:
  - d0758e9
  - ef556cb
files_modified: 12
tests_added: 14
test_count: 1293
build: clean
lint: clean
typecheck: clean
---

# Quick Task 260526-dse: Fix Navi session-complete state

**Reconstructed by orchestrator** — original SUMMARY.md was uncommitted in the worktree and lost on `worktree remove --force` because the rescue path (`find … *SUMMARY.md` before remove, #2070 safety net) was skipped during merge cleanup. Rebuilt from the executor's structured return and the actual commit diffs on `main`.

## Bug

Operator reported visual divergence between HRV and Navi session-complete states:

- **HRV (correct):** orb shows ✓ checkmark inside disc; "Done" button below; no practice-config row.
- **Navi (buggy):** empty orb interior; Rounds/Oms/Pace config row visible; "Start" button instead of "Done".
- **Stretch (partial bug):** routed through `BreathingSessionSurface` so checkmark + "Done" worked, but the SetupCard config row stayed visible after completion — the same view-model bug that hits Navi.

## Root cause

Three independent view-layer plumbing gaps. Zero changes to session controllers, domain logic, or audio (honors `[[feedback_design_logic_separation]]`).

1. **`NaviKriyaSessionSurface.tsx`** — never forwarded `showCompletion` to OrbShape; HRV's `BreathingSessionSurface.tsx` did.
2. **`sessionPresentation.ts` → `getNaviKriyaPrimaryAction`** — no `'done'` branch and no `justCompleted` param. After completion, `sessionActive=false` → returned `'start'`.
3. **`setupCardSummary.ts` + viewmodel union** — the `naviKriya` and `stretch` arms of `AppPracticeSettingsViewModel` had no `isComplete` field, so the SetupCard config row had no signal to hide on completion. Only the `resonant` arm carried it.

## Commits

| Commit | Tasks | What landed |
|--------|-------|-------------|
| `d0758e9` | 1 (RED→GREEN) | `feat(260526-dse-01): wire showCompletion + done CTA + isComplete for Navi` |
| `ef556cb` | 2 + 3 (RED→GREEN + audit) | `feat(260526-dse-01): hide SetupCard on Navi+Stretch completion + end-to-end regression test` |

## Files modified

**Source (6 files):**
- `src/app/NaviKriyaSessionSurface.tsx` — forward `showCompletion={presentation.showCompletionHeadline}` to OrbShape
- `src/app/sessionPresentation.ts` — widen `NaviKriyaPrimaryAction` union with `'done'`; add `justCompleted` param to `getNaviKriyaPrimaryAction`; insert `'done'` branch after `sessionActive` check; thread `justCompleted` into `getNaviKriyaPresentation`
- `src/app/appControllerAdapters.ts` — pass `justCompleted: navi.justCompleted` to `getNaviKriyaPrimaryAction`; set `isComplete: navi.justCompleted` on naviKriya source; set `isComplete: breathing.session.state.status === 'complete' && !breathing.inSessionView` on stretch source
- `src/app/appViewModel.ts` — add `isComplete: boolean` to naviKriya + stretch arms of `AppPracticeSettingsViewModel` + `PracticeSettingsSources`; forward in `createPracticeSettingsViewModel`
- `src/app/useAppViewModel.ts` — add `'done'` branch in `onNaviPrimaryClick` that calls `naviClearCompletion`; update dep array
- `src/app/setupCardSummary.ts` — gate `naviKriya` and `stretch` arms on `isComplete` (resonant arm already had this gate)

**Tests (6 files — 14 new tests):**
- `src/app/NaviKriyaSessionSurface.test.tsx` (new) — completion shows checkmark; idle does not (negative control)
- `src/app/setupCardSummary.test.ts` (new) — resonant/stretch/naviKriya completion-hides-card cases + negative controls
- `src/app/App.session.test.tsx` (modified) — new Navi trifecta integration test: orb checkmark visible + Done CTA visible + no SetupCard rendered + Done click returns to idle. Updated the existing NK test to assert Done not Start.
- `src/app/sessionPresentation.test.ts` (modified) — `justCompleted` cases covering done / start / end ordering
- `src/app/appViewModel.test.ts` (modified) — add `isComplete: false` to stretch/naviKriya fixtures (Rule 3 coupling)
- `src/app/PracticeSettingsView.test.tsx` (modified) — same fixture extension

## Post-fix gate (full suite)

| Gate | Result |
|------|--------|
| `npm run test -- --run` | **1293/1293** tests pass across **117** test files (+14 new) |
| `npm run build` | clean (tsc + vite) |
| `npm run lint` | clean (0 errors, 0 warnings) |

## Memory rules honored

- `[[feedback_design_logic_separation]]` — view-layer + viewmodel-shape changes only; no domain / session controller / audio touches.
- `[[feedback_no_design_locking]]` — new tests assert behavioral facts only (polyline selector for checkmark; role/text for buttons; `null` return for hidden SetupCard). No className or hex assertions.
- `[[feedback_use_lsp_for_renames]]` — no symbol renames performed.
- TDD discipline maintained — Tasks 1 and 2 followed RED→GREEN order (failing test commit before implementation).

## Scope verdict (Stretch coverage)

The planner correctly identified that **Stretch had the SetupCard sub-bug too**: its session-complete state showed the config row even though checkmark + Done CTA already worked (Stretch shares `BreathingSessionSurface`). One viewmodel-union widening + one `setupCardSummary` gate fixed both practices in parallel. HRV's path was untouched (its resonant arm already had the right gates).
