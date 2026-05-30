---
phase: 55-comment-de-archaeology
plan: 05
subsystem: components
tags: [comment-cleanup, de-archaeology, comment-only]
dependency_graph:
  requires: []
  provides: [components-comments-clean]
  affects: [src/components]
tech_stack:
  added: []
  patterns: [comment-only-diff, present-tense-invariants, spike-geometry-value-retention]
key_files:
  created: []
  modified:
    - src/components/OrbShape.tsx
    - src/components/MuteToggle.tsx
    - src/components/CueGlyph.tsx
    - src/components/NKShape.tsx
    - src/components/PracticeToggle.tsx
    - src/components/EndSessionDialog.tsx
    - src/components/FeedbackCount.tsx
    - src/components/FeedbackTime.tsx
    - src/components/IosInstallSteps.tsx
    - src/components/LearnAnchor.tsx
    - src/components/LearnPanel.tsx
    - src/components/NKSessionReadout.tsx
    - src/components/SessionActionRow.tsx
    - src/components/SessionReadout.tsx
    - src/components/SettingsAnchor.tsx
    - src/components/SettingsPanelBody.tsx
    - src/components/SettingsRow.tsx
    - src/components/SettingsSectionHeader.tsx
    - src/components/SettingsSegmentedRow.tsx
    - src/components/SettingsSheet.tsx
    - src/components/SettingsStepper.tsx
    - src/components/SettingsToggleRow.tsx
    - src/components/SetupCard.tsx
    - src/components/ThemePicker.tsx
    - src/components/TimbrePicker.tsx
    - src/components/shapeConstants.ts
    - src/components/primitives/PageShell.tsx
    - src/components/primitives/PickerCardGrid.tsx
    - src/components/primitives/SectionCard.tsx
    - src/components/primitives/SegmentedControl.tsx
    - src/components/primitives/Toggle.tsx
    - src/components/primitives/TopAppBar.tsx
decisions:
  - "Stripped all spike/index.html provenance pointers from all 32 component files; geometry values retained verbatim (D-08)"
  - "Rephrase load-bearing why as present-tense invariants; deleted pure history/parity comments"
  - "The word 'spike' itself was removed along with archaeology tokens per verification gate; present-tense replacements use 'locked values' instead"
metrics:
  duration: 916s
  completed_date: "2026-05-30"
  tasks_completed: 2
  files_changed: 32
---

# Phase 55 Plan 05: src/components Comment De-archaeology Summary

Comment-only sweep across 32 non-test component source files: stripped planning taxonomy tokens, L### line-refs, and spike/index.html provenance pointers; kept spike-locked geometry values verbatim with present-tense what-it-controls notes when non-obvious.

## What Was Done

Executed the COMMENT-01 + COMMENT-02 + Pitfall-5 sweep over `src/components/**` (32 non-test files, ~87 archaeology lines). Applied the D-03/D-07/D-08 decision tree:

- **STRIPPED:** All `D-xx`, `WR-xx`, `Phase NN`, `Plan NN`, `spike NNN`, `index.html L###` provenance pointers, and `L###` line-refs from all component files.
- **KEPT/REPHRASED:** Load-bearing invariants (disc sizing, present-tense geometry notes, hit-area rationale, aria/a11y constraints) rephrased as present-tense.
- **DELETED:** Pure history/parity lines (e.g. "per spike's flat treatment" provenance descriptions stripped, value retained).
- **GEOMETRY VALUES:** All locked geometry values (32x32 / 24-viewBox, r=49.7, stroke 2.5, 600ms ease, toggle sizes, etc.) retained verbatim in code — only their provenance comment changed.

### Files Changed (32 non-test source files)

All component source files with archaeology cleaned. Key cases:

- **OrbShape.tsx** (21 sites): Ring transition duration note, V1 halo geometry comment, CheckmarkerGlyph sizing note, ProgressArcLayer locked values — all provenance stripped, values kept.
- **MuteToggle.tsx**: Spike MuteButton reference stripped; chrome spec retained as present-tense.
- **NKShape.tsx**: Phase/WR refs stripped; present-tense invariants kept for pulse behavior, disc color inheritance, aria-label requirement.
- **CueGlyph.tsx**: D-xx/J4 refs stripped; candidateF/D2 design-source refs stripped; SVG sizing notes kept as present-tense.
- **shapeConstants.ts**: Phase 38 VAR-01/VAR-02 ref stripped; D-06 reduced-motion note simplified.
- **primitives/*.tsx**: All "Spike 010 (index.html L####)" provenance replaced with "Locked values:" preamble listing the values directly.

## Verification

All three acceptance grep gates pass over `src/components/**` (non-test):

1. **COMMENT-01 taxonomy gate** — empty (no `D-xx`, `WR-xx`, `Phase NN`, `Plan NN`, `Blocker`, `Pitfall`, `spike NNN`, `kitchen-sink`)
2. **COMMENT-02 line-ref gate** — empty (no `L###` in comments, no `formerly at`, no `mirror L###`)
3. **Pitfall 5 provenance gate** — empty (no `spike` or `index.html` surviving in any component source file)

Green gate: `tsc -b` → 0, `eslint . src/components/` → 0, `vitest run` → 1447/1447 passed, `git diff package.json` → empty.

Every diff hunk in the commit touches only comment regions — verified by reviewing each file's diff; no executable token, value, or type changed.

## Commits

| Task | Commit | Description |
|------|--------|-------------|
| Task 1 | ac7b951 | feat(55-05): de-archaeologize src/components comments (D-07/D-08) |
| Task 2 | (green gate verified, no separate commit needed — comment-only diff has no gate output artifacts) | |

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 1 - Adjustment] Removed "spike" word entirely, not just provenance pointer**

- **Found during:** Task 1 verification
- **Issue:** After stripping "spike 010 SectionHeader (index.html lines 1700-1714)" style provenance, I replaced with "spike-locked values:" as a present-tense term. However, the plan's acceptance criteria `git grep -niE '(spike|index\.html)'` requires the word "spike" to be absent entirely from `src/components/`, not just the `spike NNN index.html` pointer pattern.
- **Fix:** Replaced all remaining "spike-locked" adjective uses with "locked values:", "locked layout:", "locked geometry:", etc. — conveying the same invariant (these values must not change arbitrarily) without the archaeology term.
- **Files modified:** OrbShape.tsx, SettingsSectionHeader.tsx, SettingsStepper.tsx, SectionCard.tsx, PickerCardGrid.tsx, SegmentedControl.tsx, Toggle.tsx, TopAppBar.tsx, LearnPanel.tsx, FeedbackCount.tsx, FeedbackTime.tsx, SettingsPanelBody.tsx, SetupCard.tsx, PracticeToggle.tsx
- **Commit:** ac7b951

None - plan otherwise executed exactly as written.

## Known Stubs

None — this is a comment-only pass; no data flows, component behavior, or UI rendering changed.

## Threat Flags

None — comment-only text edits introduce no new network endpoints, auth paths, file access, or schema changes.

## Self-Check: PASSED

- [x] 32 modified files exist and were staged/committed
- [x] Commit ac7b951 exists in git log
- [x] COMMENT-01 taxonomy grep empty
- [x] COMMENT-02 line-ref grep empty
- [x] Pitfall 5 spike/index.html grep empty
- [x] tsc -b exit 0
- [x] eslint exit 0
- [x] vitest run 1447/1447
- [x] package.json unchanged
