---
phase: 44-final-polish
reviewed: 2026-05-25T04:33:29Z
depth: deep
files_reviewed: 126
files_reviewed_list:
  - src/app/ (13 files — App.tsx, BreathingSessionSurface, EndSessionDialogsView, NaviKriyaSessionSurface, PracticeControlsView, PracticeScreen, PracticeSessionView, PracticeSettingsView, ScreenRouter, appControllerAdapters, appTestHarness, appViewModel, practiceCopy, sessionPresentation, setupCardSummary, useAppNavigation, useAppViewModel, pages/AppSettingsPage, pages/LearnPage)
  - src/audio/ (5 files — audioEngine, audioStatus, cueSynth, nkCueSynth, previewContext, timbres)
  - src/components/ (32 files — all component + primitive + icon files)
  - src/content/ (3 files — learnContent, lockedCopy, strings)
  - src/domain/ (9 files — breathingPlan, index, naviKriyaSession, naviKriyaSettings, sessionAudio, sessionController, sessionLifecycle, sessionMath, settings, stretchRamp)
  - src/hooks/ (23 files — all hook files)
  - src/storage/ (8 files — index, installDismissed, practices, prefs, settings, stats, storage)
  - src/styles/ (1 file — faviconPalette)
  - src/ root (3 files — featureFlags, main, vite-env.d.ts)
findings:
  critical: 0
  warning: 0
  info: 28
  total: 28
status: issues_found
---

# Phase 44: Code Review Report

**Reviewed:** 2026-05-25T04:33:29Z
**Depth:** deep (`--all` — full `src/` tree, 126 source files + 107 test files)
**Files Reviewed:** 126 source files
**Status:** issues_found

## Summary

Full `src/` sweep against the Phase 36-41 v2.0 milestone surface. The codebase is in excellent shape post-Phase-41 spike-loop: `npm run lint` exits 0 with 0 errors / 0 warnings; `npx tsc --noEmit` exits 0 clean; 1155/1155 tests pass.

No Critical or Warning findings. The 28 Info-severity findings below are the current-sweep inventory, reconciled against the historical 28 from the 2026-05-16 deep review (see `44-INFO-FINDINGS.md` preamble for the delta analysis). The vast majority of the historical 28 are `obsolete-by-redesign` — the Phase 41 spike-loop (J1-J18) structurally rewrote the entire visual and settings surface, deleting or replacing the files where historical findings lived.

### Baseline confirmed

- `npm run lint`: 0 errors, 0 warnings (clean — 53-error / 3-warning debt from `deferred-items.md` fully resolved during Phase 41)
- `npx tsc --noEmit -p tsconfig.app.json`: clean
- `npm test -- --run`: 107 files / 1155 tests pass
- `dependencies`: `react` + `react-dom` + `@fontsource-variable/inter` (asset only, not a code dep)

## No Critical Findings

## No Warning Findings

The codebase passes ESLint with 0 errors and 0 warnings. All previously deferred lint debt (53 errors / 3 warnings, logged in `.planning/phases/36-housekeeping-bookkeeping-reset/deferred-items.md`) was resolved during Phase 41.

## Info Findings

The 28 Info findings below represent quality improvements. They are mapped to dispositions in `44-INFO-FINDINGS.md`.

### IN-REASON-01: Missing `// Reason:` annotation on `eslint-disable` in `useAppNavigation.ts`

**File:** `src/app/useAppNavigation.ts:30`
**Issue:** `// eslint-disable-next-line react-hooks/set-state-in-effect` appears without a preceding `// Reason:` annotation, violating the Phase 7 D-04 annotation policy ("Disables must justify themselves; new disables cannot land silently"). The WHY (force navigation back to practice when a session starts) is self-evident from the effect body, but the policy requires an explicit `// Reason:` prefix.

### IN-REASON-02: Missing `// Reason:` annotation on `eslint-disable` in `useWakeLock.ts`

**File:** `src/hooks/useWakeLock.ts:120`
**Issue:** `// eslint-disable-next-line react-hooks/exhaustive-deps` has a preceding `// AH-WR-01: ...` context comment but lacks the `// Reason:` prefix required by Phase 7 D-04. The AH-WR-01 comment encodes the WHY correctly but does not use the standard annotation form.

### IN-REASON-03: Missing `// Reason:` annotation on second `eslint-disable` in `settings.ts`

**File:** `src/domain/settings.ts:228`
**Issue:** `validateStretchSettings` has a `// eslint-disable-next-line @typescript-eslint/restrict-template-expressions` at line 228 with no preceding `// Reason:` annotation. The identical disable in `validateSettings` (line 213) has the annotation; the stretch counterpart is missing it.

### IN-OBS-04 through IN-OBS-28: Historical findings obsolete-by-redesign (Phase 41 spike-loop)

The following categories of findings from the 2026-05-16 deep review (count: 25 of the historical 28) are `obsolete-by-redesign` per CONTEXT D-05 criteria:

**IN-OBS-04 to IN-OBS-11 (8 findings): Old shape-layer / variant CSS classes**
The historical review surfaced findings about `.orb-layer--in/--out` naming inconsistency, the Square/Diamond variant CSS, and related class name issues. The Phase 41 J4 orb rewrite (`a742c0b`) deleted all `.orb-layer` classes and rebuilt the orb as a three-halo + centre-disc structure. The Phase 38 VAR-01..06 work removed all Square/Diamond variant code. The CSS classes in question no longer exist.

**IN-OBS-12 to IN-OBS-15 (4 findings): Old palette token issues**
Historical findings about Moss/Slate/Dusk palette token leakage, token naming inconsistency, and theme-switching edge cases. Phase 39 THM-01..08 deleted these palettes entirely, and Phase 41 J1-J3 rebuilt the token system as Mono Zen (`borderSoft`, `textSoft`, `orbHalo1/2/3`, `onAccent`). The token set in question no longer exists.

**IN-OBS-16 to IN-OBS-19 (4 findings): Old SettingsDialog / modal route**
Historical findings about the `SettingsDialog` + `SettingsPanel` composite (Phase 15 legacy modal route). Phase 41 Items F-I + J10 replaced these with `SettingsSheet` (responsive bottom-sheet/center-modal). `SettingsDialog` is no longer in the codebase.

**IN-OBS-20 to IN-OBS-22 (3 findings): Old InstallBanner component**
Historical findings about the `InstallBanner` component (Phase 28). Phase 41 J13 operator decision dropped the V3 inline install banner entirely — install stays only in App Settings. `InstallBanner` is no longer in the codebase.

**IN-OBS-23 to IN-OBS-25 (3 findings): Old StatsFooter / ResetStatsDialog**
Historical findings about the stats UI (Phase 4 StatsFooter + ResetStatsDialog). Phase 37 STATS-01..05 removed the stats display surface entirely. These components no longer exist.

**IN-OBS-26 to IN-OBS-28 (3 findings): Old LearnDialog / LearnAnchor modal pattern**
Historical findings about the `LearnDialog` standalone modal. Phase 41 J11 replaced this with `LearnPage` (bottom-sheet/center-modal via `ScreenRouter`). `LearnDialog` is no longer in the codebase.

---

_Reviewed: 2026-05-25T04:33:29Z_
_Reviewer: Claude (gsd-code-reviewer)_
_Depth: deep (--all)_
