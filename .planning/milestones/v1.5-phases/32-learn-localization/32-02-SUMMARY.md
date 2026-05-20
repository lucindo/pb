---
phase: 32-learn-localization
plan: 02
subsystem: components
tags: [practice-aware, learn-dialog, tdd, conditional-rendering, prop-wiring]
dependency_graph:
  requires: [32-01-learnContent-practices-partition]
  provides: [practice-aware-LearnDialog, App-activePractice-wiring]
  affects: [LearnDialog.tsx, LearnDialog.test.tsx, App.tsx]
tech_stack:
  added: []
  patterns: [practice-aware-prop-drill, conditional-section-rendering, D-01-section-order]
key_files:
  created: []
  modified:
    - src/components/LearnDialog.tsx
    - src/components/LearnDialog.test.tsx
    - src/app/App.tsx
decisions:
  - "D-01 section order enforced: practice description → practice videos → Forrest explainer → Forrest Resources → native apps (resonant only) → affiliation → Close"
  - "activePractice === 'resonant' conditional wraps entire native-apps div — no empty div or placeholder for NK (D-02 fully omitted)"
  - "Video heading uses ternary: strings.videosHeading (resonant) vs strings.naviKriyaVideosHeading (NK) — pre-computed as videosHeading variable"
  - "Forrest explainer section moved out of shared grid into its own top-level div to enforce D-01 THIRD position after practice videos"
metrics:
  duration: ~19min
  completed: 2026-05-17
  tasks_completed: 2
  tasks_total: 2
  files_changed: 3
---

# Phase 32 Plan 02: Practice-Aware LearnDialog + App.tsx Wiring Summary

`LearnDialog.tsx` is now practice-aware: it accepts `activePractice: PracticeId`, selects `practices[activePractice]` at render time, renders practice-specific description and videos, conditionally renders the native-apps block for resonant only (D-02), and lays out all sections in D-01 fixed order. `App.tsx` passes the already-in-scope `activePractice` state to the dialog. Test coverage extended with 8 new NK-specific assertions.

## What Was Built

### LearnDialog.tsx

New `activePractice: PracticeId` prop added to `LearnDialogProps` interface. `PracticeId` imported from `../storage/practices`.

Destructure updated from `const { explainer, links } = learnContent` to:
```typescript
const { explainer, links, practices } = learnContent
const practiceContent = practices[activePractice]
const videosHeading = activePractice === 'resonant' ? strings.videosHeading : strings.naviKriyaVideosHeading
```

D-01 layout order enforced (all 7 sections):
1. Practice description — `practiceContent.description.section1/section2` (practice-specific)
2. Practice videos — `practiceContent.videos.map(...)` with `videosHeading` (practice-specific)
3. Forrest explainer — `explainer.forrest` + `lockedCopy.inspiredByForrest` (shared, LEARN-03)
4. Forrest Resources — 4 links: youtubeChannel, website, book, patreon (shared, LEARN-03)
5. Native apps — `{activePractice === 'resonant' && (<div>...</div>)}` (D-02 conditional)
6. Affiliation micro-line — `lockedCopy.affiliationLine` (unchanged)
7. Close button — `closeButtonRef` focus target (unchanged)

All `<a>` elements carry `target="_blank" rel="noopener noreferrer"` (T-32-03, D-07).

### LearnDialog.test.tsx

`renderDialog()` helper updated:
- Added `activePractice?: PracticeId` to Partial props type (defaults to `'resonant'` — all 21 pre-existing tests pass without modification)
- Imports `PracticeId` from `../storage/practices`
- Passes `activePractice` to `<LearnDialog>`

New describe block `LearnDialog — Navi Kriya practice-aware rendering` with 8 tests:
- NK section1 title renders when `activePractice='naviKriya'`
- NK section2 title renders when `activePractice='naviKriya'`
- NK video links ("The Guardian In Meditation", "Navi Kriya Walkthrough") render when `activePractice='naviKriya'`
- D-02: native-apps heading absent when `activePractice='naviKriya'` (`not.toBeInTheDocument()`)
- D-02: native-apps heading present when `activePractice='resonant'`
- Shared `explainer.forrest.title` renders for both practices (LEARN-03, 2 tests)
- Security attribute sweep: every `<a>` in dialog carries `target="_blank"` and `rel="noopener noreferrer"` when `activePractice='naviKriya'` (T-32-03)

Total: 29 tests pass (21 pre-existing + 8 new).

### App.tsx

Single-line prop addition at line 1263:
```tsx
<LearnDialog ... activePractice={activePractice} />
```
`activePractice` is already in scope from Phase 30 `useState<PracticeId>` (line 125) — no new state, hooks, or imports needed.

## Commits

| Hash | Type | Description |
|------|------|-------------|
| 0e4ec17 | test | TDD RED: failing tests for practice-aware LearnDialog rendering |
| dd31bda | feat | GREEN: make LearnDialog practice-aware — activePractice prop drives content selection |
| 42aebbf | feat | Wire App.tsx to pass activePractice to LearnDialog (D-07 auto-track) |

## Deviations from Plan

### Auto-fixed Issues

None — plan executed exactly as written.

**Note:** Plan acceptance criterion `grep -c "activePractice={activePractice}" src/app/App.tsx` returns 2 (not 1). The second occurrence (line 1138) was already present from Phase 30's `PracticeToggle` wiring, which also uses `activePractice={activePractice}`. The criterion was written before Phase 30 added that line. The LearnDialog wiring at line 1263 is correct; full suite passes.

## Known Stubs

None. All practice-specific content (NK description copy, NK video links) is wired through from the Plan 01 `learnContent.ts` partition. No hardcoded empty values or placeholder text in the rendering path.

Note: `// TODO: native-speaker review` markers remain in `learnContent.ts` (4) and `strings.ts` (3) — these are intentional D-11 markers tracked by the drift-guard test, to be removed by Plan 03 operator review.

## Threat Flags

No new threat surface. All threat mitigations from the plan's STRIDE register are implemented:
- T-32-03: every `<a>` in `LearnDialog.tsx` (including NK video links) carries `target="_blank" rel="noopener noreferrer"` — enforced by the parameterized security-attribute sweep for `activePractice='naviKriya'`.
- T-32-04: `activePractice` is `PracticeId` union sourced from typed App.tsx state — not user free-text; TypeScript constrains it at compile time.

## Self-Check: PASSED

- [x] `src/components/LearnDialog.tsx` exists and contains `activePractice: PracticeId` in `LearnDialogProps`
- [x] `src/components/LearnDialog.test.tsx` contains describe block "Navi Kriya practice-aware rendering"
- [x] `src/app/App.tsx` contains `activePractice={activePractice}` at the LearnDialog render
- [x] All 3 plan commits exist: 0e4ec17, dd31bda, 42aebbf
- [x] `npx vitest run src/components/LearnDialog.test.tsx` → 29 passed
- [x] `npx vitest run` → 1157/1158 passed (1 intentional fail: drift-guard catches review markers — D-11 by design)
- [x] `npx tsc -p tsconfig.app.json --noEmit` → exits 0
- [x] `npm run build` → succeeds (85 modules transformed)
