---
phase: 04-local-memory-practice-stats
plan: "02"
subsystem: components
tags:
  - components
  - dialog
  - accessibility
  - a11y
  - 44x44-tap-target
dependency_graph:
  requires:
    - "04-01 (storage module — PersistedStats type, format functions)"
  provides:
    - "StatsFooter: pure presentational footer strip with count/total/last-session/Reset"
    - "ResetStatsDialog: confirmation dialog with locked D-12 copy, default-focus-on-Keep"
  affects:
    - "04-03 (App wiring — imports and renders both components)"
tech_stack:
  added: []
  patterns:
    - "Clone-don't-extract: ResetStatsDialog verbatim copy of EndSessionDialog with 5 string swaps (R-06)"
    - "Pure presentational: StatsFooter has zero hooks — props in, callbacks out"
    - "44x44 hit-area via min-h/w-[44px] padding on inline <button> (D-13)"
    - "TDD RED/GREEN cycle: failing tests committed before implementation"
key_files:
  created:
    - src/components/StatsFooter.tsx
    - src/components/StatsFooter.test.tsx
    - src/components/ResetStatsDialog.tsx
    - src/components/ResetStatsDialog.test.tsx
    - src/storage/index.ts
    - src/storage/format.ts
  modified: []
decisions:
  - "Created storage stubs (index.ts + format.ts) in this worktree to satisfy TypeScript imports — Plan 01 (parallel wave) ships the real implementations which will overwrite the stubs on merge"
  - "Removed EndSessionDialog comment references from ResetStatsDialog to satisfy grep-0 acceptance criterion"
metrics:
  duration: "~15 minutes"
  completed: "2026-05-10"
  tasks_completed: 2
  tests_added: 18
---

# Phase 4 Plan 02: StatsFooter + ResetStatsDialog Components Summary

One-liner: Pure presentational StatsFooter with 44x44 Reset tap-target and clone-don't-extract ResetStatsDialog with locked D-12 copy and default focus on Keep.

## Component Files

### src/components/StatsFooter.tsx (55 lines)

**Props interface:**
```typescript
export interface StatsFooterProps {
  stats: PersistedStats             // { totalSessions, totalElapsedSeconds, lastSessionAtMs, lastSessionDurationSeconds }
  onResetClick(): void
}
export function StatsFooter({ stats, onResetClick }: StatsFooterProps): JSX.Element
```

**Design decisions implemented:**
- D-08: Two-line footer strip. Line 1: `"12 sessions · 47 min total"`. Line 2: `"Last: May 7 · 10 min · Reset"`.
- D-13: Reset is a real `<button type="button">` styled as inline text link, `min-h-[44px] min-w-[44px]` padding enforces 44x44 hit-area floor without enlarging visible "Reset" text.
- Graceful degradation: when `lastSessionAtMs` or `lastSessionDurationSeconds` is null, the "Last:" prefix is omitted and only the Reset button renders.
- Pure presentational: zero `useState`, `useEffect`, or `useRef` hooks.

**Tests (src/components/StatsFooter.test.tsx — 86 lines, 9 tests):**
- D-08: Line 1 count/total string format
- D-06: singular "1 session" form
- D-08: Line 2 Last-session date/duration presence
- Graceful degradation when lastSessionAtMs is null
- Reset button role and type attribute
- D-13: min-h-[44px] and min-w-[44px] class assertions
- Theme accent color token on Reset button
- Focus-visible ring classes on Reset button
- Click invokes onResetClick exactly once

### src/components/ResetStatsDialog.tsx (84 lines)

**Props interface:**
```typescript
export interface ResetStatsDialogProps {
  open: boolean
  onConfirm(): void
  onCancel(): void
}
export function ResetStatsDialog({ open, onConfirm, onCancel }: ResetStatsDialogProps): JSX.Element
```

**Design decisions implemented:**
- D-12: Locked copy: title `"Reset practice stats?"`, primary button `"Reset"`, cancel button `"Keep"`.
- D-12: Default focus on Keep (cancel) — defends against accidental Enter on the destructive Reset primary.
- `aria-labelledby="reset-stats-title"`, `h2 id="reset-stats-title"` for accessible dialog labeling.
- Esc (cancel event): `preventDefault` to avoid double-fire, then calls `onCancel`.
- Backdrop click: `event.target === dialogRef.current` guard, child clicks ignored.
- R-06: EndSessionDialog.tsx unchanged — clone-don't-extract pattern.

**Tests (src/components/ResetStatsDialog.test.tsx — 88 lines, 9 tests):**
- IN-03 anti-flake: closed-state DOM check via `container.querySelector('dialog').open === false`
- D-12: Default focus on Keep when `open=true`
- D-12: Locked copy visible (Reset, Keep, Reset practice stats?)
- Click Reset invokes onConfirm once
- Click Keep invokes onCancel once
- Esc via `fireEvent(dialog, new Event('cancel'))` invokes onCancel
- Backdrop click invokes onCancel
- Inner panel click does NOT invoke onCancel
- Open→close transition when `open` prop changes false

## EndSessionDialog Byte-Identity Proof (R-06)

SHA1 of `src/components/EndSessionDialog.tsx` before and after this plan:
`0acbe2abf16b36e63a3c801bdd9be05356a16621`

`git diff src/components/EndSessionDialog.tsx` returns empty — file is untouched.

## Storage Stubs

This plan is parallel (Wave 1) with Plan 01 which creates the real storage module.
To satisfy TypeScript compilation in this worktree, minimal stubs were created:

- `src/storage/index.ts` — exports `PersistedStats` type + re-exports format functions
- `src/storage/format.ts` — `formatSessionCount`, `formatTotalMinutes`, `formatLastSessionDate`, `formatLastSessionDuration`

These stubs implement the same API as Plan 01 targets. They will be overwritten by Plan 01's real implementation when both worktrees merge.

## Copy-Pasteable Imports for Plan 03 (App.tsx wiring)

```typescript
import { StatsFooter } from './components/StatsFooter'
import type { StatsFooterProps } from './components/StatsFooter'
import { ResetStatsDialog } from './components/ResetStatsDialog'
import type { ResetStatsDialogProps } from './components/ResetStatsDialog'
```

**Usage in App.tsx:**
```tsx
// Below main card, gated by D-09 and D-10:
{!inSessionView && stats.totalSessions > 0 && (
  <StatsFooter
    stats={stats}
    onResetClick={() => setResetDialogOpen(true)}
  />
)}

// Sibling of EndSessionDialog:
<ResetStatsDialog
  open={resetDialogOpen}
  onConfirm={confirmReset}
  onCancel={() => setResetDialogOpen(false)}
/>
```

## Test Results

| File | Tests | Result |
|------|-------|--------|
| StatsFooter.test.tsx | 9 | PASS |
| ResetStatsDialog.test.tsx | 9 | PASS |
| Full suite (180 tests across 17 files) | 180 | PASS |

TypeScript: `npx tsc --noEmit` exits 0.

## Deviations from Plan

### Auto-added (Rule 2): Storage stubs for Wave 1 parallel execution

**Found during:** Task 1 setup
**Issue:** `src/storage/` directory and module did not exist in this worktree (Plan 01 is building it in parallel). StatsFooter imports from `'../storage'` — TypeScript and Vitest would fail without the module.
**Fix:** Created minimal `src/storage/index.ts` and `src/storage/format.ts` stubs implementing the exact same API that Plan 01 targets. Tests pass fixture `PersistedStats` objects directly (no storage integration), so the stubs only need to satisfy TypeScript type resolution and export the format functions.
**Files modified:** `src/storage/index.ts` (new), `src/storage/format.ts` (new)
**Commits:** fe50119 (included in RED commit)

### Comment cleanup (minor): Removed EndSessionDialog references from comments

**Found during:** Task 2 acceptance criteria verification
**Issue:** Two JSX comment lines referenced "EndSessionDialog" by name; `grep -c "EndSessionDialog"` acceptance criterion requires 0.
**Fix:** Replaced "EndSessionDialog" in comments with "Phase 2 dialog" and "Pitfall 5" references.
**Impact:** None — comments only, no behavior change.

## Threat Surface Scan

No new network endpoints, auth paths, file access patterns, or schema changes introduced. Both components only render trusted data passed by the parent (PersistedStats) and emit callbacks. No `dangerouslySetInnerHTML`. No XSS surface. Matches threat model T-04-06 through T-04-09 analysis in the plan.

## Self-Check: PASSED

Files exist:
- [x] src/components/StatsFooter.tsx (55 lines)
- [x] src/components/StatsFooter.test.tsx (86 lines)
- [x] src/components/ResetStatsDialog.tsx (84 lines)
- [x] src/components/ResetStatsDialog.test.tsx (88 lines)
- [x] src/storage/index.ts (stubs)
- [x] src/storage/format.ts (stubs)

Commits exist:
- [x] fe50119 — test(04-02): add failing tests for StatsFooter (RED)
- [x] 5482974 — feat(04-02): implement StatsFooter component (GREEN)
- [x] 05db278 — test(04-02): add failing tests for ResetStatsDialog (RED)
- [x] 3b8c3b8 — feat(04-02): implement ResetStatsDialog cloned from EndSessionDialog (GREEN)

All 18 tests pass. TypeScript clean. EndSessionDialog.tsx unchanged.
