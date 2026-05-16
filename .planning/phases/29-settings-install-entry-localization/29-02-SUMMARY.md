---
phase: 29-settings-install-entry-localization
plan: "02"
subsystem: install
tags: [install, settings, pwa, localization, pt-br, i18n]
dependency_graph:
  requires: [29-01]
  provides: [INSTALL-06, INSTALL-07]
  affects: [src/components/SettingsDialog.tsx, src/app/App.tsx, src/content/strings.ts]
tech_stack:
  added: []
  patterns:
    - Prop-drilling install state (isIOS, isStandalone, installable, onInstall) from App.tsx into SettingsDialog
    - Phase 26 native-speaker review-marker workflow (draft → marker → operator approval → removal)
    - IosInstallSteps inline-expand inside SettingsDialog with unique id "settings-ios-steps"
key_files:
  created: []
  modified:
    - src/components/SettingsDialog.tsx
    - src/components/SettingsDialog.test.tsx
    - src/app/App.tsx
    - src/content/strings.ts
decisions:
  - "installable = isIOS || deferredPrompt !== null — no isPhone gate — so desktop Chrome/Edge get the install row (CONTEXT D-08/D-09/D-10)"
  - "Operator approved all 9 PT-BR install strings with no changes required (Task 4 checkpoint resolved)"
  - "IosInstallSteps rendered with id=settings-ios-steps (NOT install-ios-steps) to prevent aria-controls id collision with the banner surface"
metrics:
  duration: "multi-session (Task 1-3 prior session; Task 4 operator checkpoint; Task 5 continuation)"
  completed: "2026-05-16"
---

# Phase 29 Plan 02: Settings Install Entry and Localization Summary

SettingsDialog extended with a gated install row (INSTALL-06) and all PT-BR install copy finalized via operator-approved native-speaker review (INSTALL-07).

## What Was Built

**Task 1 — SettingsDialog install row (commit f6cd12c)**

Extended `SettingsDialogProps` with four new props: `isIOS`, `isStandalone`, `installable`, and `onInstall`. Added `'install'` to the `Pick<UiStrings, ...>` type union on `strings`. Added local `iosExpanded` state. Inserted the install row between the Language picker and the Close button, gated on `installable && !isStandalone` (D-04/D-08; no `isPhone` check per D-09/D-10). The row renders an Android/desktop native-prompt button or an iOS inline-expand toggle depending on `isIOS`, using `IosInstallSteps` with `id="settings-ios-steps"` (unique per surface — banner owns `install-ios-steps`).

**Task 2 — App.tsx prop-drill + SettingsDialog tests (commit 14c58c0)**

Prop-drilled four install props into the SettingsDialog call site in `App.tsx` from existing hook values (no new hook calls). Added a six-case `describe('SettingsDialog — install row (Phase 29 INSTALL-06)', ...)` block covering: row absent when `installable=false`; row absent when standalone; row visible when installable; Android button calls `onInstall`; iOS renders toggle not install button; iOS step text inline-expands on toggle click.

**Task 3 — PT-BR install copy draft with review marker (commit f46e349)**

Replaced the `// DRAFT: Phase 29 ...` comment with `// TODO: native-speaker review` above the `pt-BR.install` block. Drafted native-quality PT-BR for all 9 install keys, intentionally leaving the marker so the drift-guard test fails as the not-yet-approved signal.

**Task 4 — Operator review (checkpoint)**

Operator (native PT-BR speaker) reviewed all 9 `pt-BR.install` strings and approved them with NO changes. Checkpoint resolved: APPROVED.

**Task 5 — Remove review marker (commit 6f7c925)**

Deleted the `// TODO: native-speaker review` line from `src/content/strings.ts`. `content.no-review-markers.test.ts` now passes. Full suite: 70 test files, 996 tests, 0 failures. INSTALL-07 complete.

## Acceptance Criteria Verification

| Criterion | Result |
|-----------|--------|
| `SettingsDialogProps` declares all 4 install props | PASS |
| `strings` Pick includes `'install'` | PASS |
| `grep -c 'settings-ios-steps' SettingsDialog.tsx` returns 2+ | PASS (2) |
| `grep -c 'install-ios-steps' SettingsDialog.tsx` returns 0 | PASS (0) |
| `grep -c 'useBeforeInstallPrompt' SettingsDialog.tsx` returns 0 | PASS (0) |
| App.tsx contains `installable={isIOS \|\| deferredPrompt !== null}` | PASS (3 occurrences in grep) |
| `grep -c 'TODO: native-speaker review' strings.ts` returns 0 | PASS (0) |
| `npm test -- --run src/content/content.no-review-markers.test.ts` passes | PASS |
| `npm test -- --run` full suite passes | PASS (996/996) |
| `npx tsc --noEmit -p tsconfig.app.json` exits 0 | PASS |

## Deviations from Plan

None — plan executed exactly as written. The operator approved all PT-BR strings at the Task 4 checkpoint with no corrections needed.

## Known Stubs

None. All install strings are wired to real values in both locales.

## Threat Surface Scan

No new network endpoints, auth paths, file access patterns, or schema changes beyond those already analyzed in the plan's threat model. T-29-03 through T-29-06 all accepted per plan.

## Self-Check: PASSED

- FOUND: src/components/SettingsDialog.tsx
- FOUND: src/components/SettingsDialog.test.tsx
- FOUND: src/app/App.tsx
- FOUND: src/content/strings.ts
- FOUND commit f6cd12c (Task 1)
- FOUND commit 14c58c0 (Task 2)
- FOUND commit f46e349 (Task 3)
- FOUND commit 6f7c925 (Task 5)
- All acceptance criteria verified above
