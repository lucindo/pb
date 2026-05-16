---
phase: 25-labels-vs-icons-cue-toggle
plan: "05"
subsystem: app-integration
tags: [cue-toggle, app-wiring, capture-at-start, operator-checkpoint]
dependency_graph:
  requires: ["25-02", "25-03", "25-04"]
  provides: ["App-side cue consumption", "sessionCueRef capture-at-Start", "cue threaded to BreathingShape"]
  affects: ["src/app/App.tsx"]
tech_stack:
  added: []
  patterns: ["useVisualCue consumption", "capture-at-Start ref (sessionCueRef mirrors sessionVariantRef)", "CueGlyph preview mode"]
key_files:
  created: []
  modified:
    - src/app/App.tsx
    - src/app/App.test.tsx
    - src/components/CueGlyph.tsx
    - src/components/CueGlyph.test.tsx
    - src/components/CuePicker.tsx
decisions:
  - "Cue captured at session Start via sessionCueRef — variant precedent (capture-at-Start, CONTEXT Claude's Discretion). cue={sessionCue ?? liveCue} freezes the running session; mid-session changes apply to the next session."
  - "CueGlyph gained an optional preview prop (operator checkpoint feedback) — preview swatches use var(--color-orb-in-from) like VariantPicker swatches and render 'T' for labels mode; in-orb rendering unchanged (preview defaults false)."
metrics:
  duration: "~25 minutes (incl. operator visual-review checkpoint iteration)"
  completed: "2026-05-15"
  tasks_completed: 3
  files_created: 0
  files_modified: 5
---

# Phase 25 Plan 05: App Wiring + Operator Visual Review Summary

**One-liner:** App.tsx consumes `useVisualCue`, captures the cue at session Start (`sessionCueRef`), and passes the captured-or-live cue to `BreathingShape`; operator approved the Arrow/Nose glyphs after one config-screen tweak iteration.

## Tasks Completed

| Task | Name | Commit(s) | Files |
|------|------|-----------|-------|
| 1 | Wire useVisualCue + capture-at-Start into App.tsx | 9bd36e1 (GREEN) | src/app/App.tsx, src/app/App.test.tsx |
| 2 | Full green gate + build verification | (verification only — no source edits) | — |
| 3 | Operator visual review of Arrow + Nose glyphs across 3 variants | 2f4f561 (checkpoint tweak) | src/components/CueGlyph.tsx, src/components/CueGlyph.test.tsx, src/components/CuePicker.tsx |

## Verification Results

- `npx tsc -b`: PASS
- `npx eslint .`: PASS (0 errors, 1 pre-existing react-refresh warning in App.tsx — Phase 22 `computeBoundaryAudioOffsets` export, unrelated)
- `npm run build`: PASS
- `npm test`: 958/958 PASS

## What Was Built

### App.tsx wiring (Task 1)
- `useVisualCue` consumed — live cue read from prefs on every render.
- `sessionCueRef` / `sessionCue` capture the live cue at the moment the user clicks Start, mirroring the `sessionVariantRef` / `sessionVariant` precedent.
- `BreathingShape` receives `cue={sessionCue ?? liveCue}` alongside `variant={sessionVariant ?? liveVariant}`.
- Mid-session cross-tab cue changes update `liveCue` but cannot affect the running session — the frozen `sessionCue` wins until the next Start.

### Operator checkpoint iteration (Task 3)
The operator approved the in-orb Arrow (candidate F) and Nose (candidate D2) glyphs across all 3 variants. Two config-screen (CuePicker) defects were reported and fixed in commit `2f4f561`:
- **Text option preview** rendered the full word at `text-5xl` and overflowed the swatch → `CueGlyph` preview mode now renders a single "T".
- **Preview glyphs** used the in-orb phase text token (`--color-orb-in-text`), invisible on the two dark themes → preview mode now uses `--color-orb-in-from`, the same swatch token `VariantPicker` uses, so cue previews track the theme.

`CueGlyph` gained an optional `preview` prop (default `false`) — in-orb rendering is byte-unchanged; only `CuePicker` opts into preview mode.

## TDD Gate Compliance

**Task 1:** App.tsx wiring committed as a single GREEN commit (9bd36e1) — App-level integration wiring against pre-existing hook tests; no isolated RED gate (consistent with App.tsx integration precedent).

**Task 3 tweak:** preview-mode behavior covered by 5 new `CueGlyph.test.tsx` tests (T glyph, preview color token, in-orb unchanged) committed alongside the fix (2f4f561).

## Deviations from Plan

The operator visual-review checkpoint surfaced two CuePicker preview defects (Task 3 feedback), fixed in `2f4f561`. The plan anticipated this iteration loop ("Claude will adjust and re-present until approved"). In-orb glyphs were approved without changes.

## Known Stubs

None. The cue toggle is fully wired end-to-end: SettingsDialog picker → `useCueChoice` → prefs envelope → `useVisualCue` → App.tsx → `BreathingShape` → `CueGlyph`.

## Self-Check

- [x] src/app/App.tsx modified (useVisualCue + sessionCueRef + cue prop to BreathingShape)
- [x] src/app/App.test.tsx modified
- [x] Operator visually approved Arrow + Nose glyphs across Orb, Square, Diamond
- [x] Commits 9bd36e1, 2f4f561 exist in git log
- [x] 958/958 tests pass
- [x] tsc + build green, eslint 0 errors

## Self-Check: PASSED
