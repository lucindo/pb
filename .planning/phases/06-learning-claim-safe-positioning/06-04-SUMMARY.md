---
phase: 06-learning-claim-safe-positioning
plan: 4
subsystem: components + app-composition
status: complete
completed_at: 2026-05-10T23:08:00Z
tags:
  - corner-anchor
  - aria-disabled
  - learn-dialog
  - app-wiring
  - safe-area-inset
dependency_graph:
  requires:
    - 06-03-PLAN.md (LearnDialog.tsx — component being mounted)
    - 06-02-PLAN.md (learnContent.ts — consumed by LearnDialog)
  provides:
    - src/components/LearnAnchor.tsx (LearnAnchor component + LearnAnchorProps type)
    - src/components/LearnAnchor.test.tsx (D-18 disabled-during-session unit tests, 7 assertions)
    - src/app/App.tsx (wire-up: 2 imports + 1 state hook + 2 callbacks + 2 JSX render sites)
  affects:
    - All LEARN-01..LEARN-04 requirements now reachable end-to-end
tech_stack:
  added: []
  patterns:
    - "aria-disabled + no-op onClick JSX-layer gate (D-03 disable-not-hide — first instance in project)"
    - "env(safe-area-inset-top/right) fixed positioning (D-04, UI-SPEC §Layout Contract — first instance in project)"
    - "useState dialog triad pattern (learnDialogOpen / onLearnClick / onLearnClose — mirrors resetDialogOpen pattern)"
    - "Purely presentational component with zero hooks (LearnAnchor)"
key_files:
  created:
    - src/components/LearnAnchor.tsx
    - src/components/LearnAnchor.test.tsx
  modified:
    - src/app/App.tsx
decisions:
  - "LearnAnchor extracted as standalone component (not inlined in App.tsx) to make D-18 disabled-during-session behavior unit-testable in isolation"
  - "aria-disabled={disabled || undefined} renders attribute only when disabled=true for clean DOM in enabled state (WAI-ARIA spec)"
  - "onClick={disabled ? undefined : onClick} strips the handler at JSX layer (T-06-11 first gate); App's onLearnClick early-return is the second gate (defense in depth)"
  - "LearnAnchor renders >Learn< inline on one JSX line to satisfy grep-based acceptance criteria (same fix applied as in Plan 06-03 for h2/Close)"
  - "onLearnClick uses [inSessionView] dep array — reads the existing predicate unchanged from App.tsx line 97"
metrics:
  duration_minutes: 15
  tasks_completed: 3
  tasks_total: 3
  files_created: 2
  files_modified: 1
requirements_completed:
  - LEARN-01
  - LEARN-03
  - LEARN-04
---

# Phase 6 Plan 4: LearnAnchor + App.tsx Wire-up Summary

## One-liner

LearnAnchor extracted as a standalone testable component with aria-disabled/no-op-click gate, 7 D-18 unit tests, and a purely-additive App.tsx wire-up (2 imports, 1 state hook, 2 callbacks, 2 JSX render sites) completing the Phase 6 LEARN-01..LEARN-04 surface.

## What Was Built

### Task 1: `src/components/LearnAnchor.tsx`

A pure presentational React component (zero hooks, zero session-state coupling) that renders a single `<button>` as the persistent page-level corner anchor for the Learn surface. Key characteristics:

- **Props:** `{ disabled: boolean; onClick(): void }` — fully controlled by parent (App.tsx passes `disabled={inSessionView}`, the existing predicate).
- **aria-disabled gate:** `aria-disabled={disabled || undefined}` renders the attribute only when disabled, keeping the DOM clean in the enabled state. Uses WAI-ARIA `aria-disabled` (not the HTML `disabled` attribute) to keep the button focusable for screen-reader discovery while removing click semantics.
- **JSX-layer no-op:** `onClick={disabled ? undefined : onClick}` strips the handler at the JSX level when disabled. The DOM event never fires during session view (T-06-11 first gate).
- **aria-label branching:** `'Learn'` when enabled; `'Learn (unavailable during session)'` when disabled (UI-SPEC §Copywriting Contract).
- **44×44 hit-area floor:** `min-h-[44px] min-w-[44px] items-center justify-center px-3` via padding (D-04, StatsFooter analog).
- **Safe-area-inset positioning:** `fixed top-[max(1rem,env(safe-area-inset-top))] right-[max(1rem,env(safe-area-inset-right))]` — first use of `env(safe-area-inset-*)` in the project (T-06-13 mitigation for iOS notch/dynamic island).
- **Focus-visible ring:** Phase 2 D-21 carry-forward chain verbatim.
- **Color branching:** enabled uses `text-[var(--color-breathing-accent)] hover:text-[var(--color-breathing-accent-strong)]`; disabled uses `cursor-not-allowed text-[var(--color-breathing-muted)]`.

### Task 2: `src/components/LearnAnchor.test.tsx`

7 vitest assertions organized in three locked describe blocks covering the full D-18 contract:

- **`LearnAnchor — enabled state (idle / D-03 enabled branch)`** (3 tests): correct aria-name `Learn`, no `aria-disabled="true"`, click invokes `onClick` exactly once.
- **`LearnAnchor — disabled state (lead-in / running / D-03 disabled branch)`** (3 tests): correct aria-name `Learn (unavailable during session)`, `aria-disabled="true"` present, click does NOT invoke `onClick` (asserts JSX-layer no-op).
- **`LearnAnchor — no remount across enabled/disabled transition (D-18 invariant)`** (1 test): render with `disabled=false`, capture DOM node, rerender with `disabled=true`, assert `expect(after).toBe(before)` — same object identity, no remount. React diffs in place because the component shape is identical.

### Task 3: `src/app/App.tsx` (modified)

Four additive, targeted edits — purely additive diff, zero changes to existing state machine, audio engine, session engine, wake lock, or existing dialog wiring:

1. **Imports:** Added `import { LearnAnchor } from '../components/LearnAnchor'` and `import { LearnDialog } from '../components/LearnDialog'` after the `ResetStatsDialog` import.
2. **State:** Added `const [learnDialogOpen, setLearnDialogOpen] = useState<boolean>(false)` alongside `endDialogOpen` and `resetDialogOpen`.
3. **Callbacks:** Added `onLearnClick` (with `if (inSessionView) return` early-return as second D-03 gate, deps `[inSessionView]`) and `onLearnClose` (deps `[]`) alongside the `cancelReset` triad.
4. **JSX render sites:**
   - `<LearnAnchor disabled={inSessionView} onClick={onLearnClick} />` as first child of `<main>`, before the existing `<section>` — anchor lives at page level, outside the centered breathing-card flex column.
   - `<LearnDialog open={learnDialogOpen} onClose={onLearnClose} />` as last child of `<main>`, after the existing `<ResetStatsDialog>`.

## Verification Results

- `npx vitest run` — **363 tests passed across 27 test files** (7 new LearnAnchor tests + 356 pre-existing)
- `npx tsc --noEmit -p tsconfig.app.json | grep App.tsx` — **0 errors** (3 pre-existing errors in `useAudioCues.test.tsx` unrelated to this plan, same as Plans 02 and 03)
- `npx vite build` — **✓ built in 100ms** (production bundle compiles with new imports)

## Commits

| Task | Commit | Files | Type |
|------|--------|-------|------|
| Task 1: LearnAnchor.tsx | `7ee1f8f` | `src/components/LearnAnchor.tsx` | feat |
| Task 2: LearnAnchor.test.tsx | `00590c3` | `src/components/LearnAnchor.test.tsx` | test |
| Task 3: App.tsx wire-up | `5b67089` | `src/app/App.tsx` | feat |

## Deviations from Plan

### Auto-fix: Inline Text for grep Acceptance Criteria

**Rule:** Rule 1 (Bug fix — grep-based acceptance criteria)

**Found during:** Task 1 acceptance criteria check.

**Issue:** The button text `Learn` was on its own indented line (not inline with the opening/closing tags), causing `grep -c '>Learn<' src/components/LearnAnchor.tsx` to return 0.

**Fix:** Collapsed the button closing tag to `>Learn</button>` on a single line, identical to the fix applied in Plan 06-03 for `h2` and `Close` button text.

**Files modified:** `src/components/LearnAnchor.tsx` (inline fix before first commit).

**Commit:** Included in Task 1 commit `7ee1f8f` (fix applied before commit, not a separate commit).

### Auto-fix: Remove `appPhase` from Comment to Satisfy No-Session-State Grep

**Rule:** Rule 1 (Bug fix — grep-based acceptance criteria)

**Found during:** Task 1 acceptance criteria check.

**Issue:** The initial comment on line 2 read `"across idle, lead-in, and running appPhase states"` — the word `appPhase` matched the acceptance criterion `grep -cE '\b(appPhase|inSessionView|useSessionEngine)\b'` (expected 0, returned 1).

**Fix:** Changed comment to `"across idle, lead-in, and running session states"` — semantically equivalent, grep-clean.

**Files modified:** `src/components/LearnAnchor.tsx` (inline fix before first commit).

## Known Stubs

None. The anchor connects directly to the existing `inSessionView` predicate. The dialog is the fully-realized `LearnDialog` from Plan 06-03. All callbacks wire real state mutations. No placeholder logic.

## Threat Surface Scan

No new network endpoints, auth paths, file access patterns, or schema changes introduced. The `LearnAnchor` component is a static UI element. The `App.tsx` additions are state management wiring for an existing component. The threat mitigations from the plan's threat register are satisfied:

| Threat | Mitigation Status |
|--------|-------------------|
| T-06-11: Modal-open during session | MITIGATED — JSX-layer no-op (onClick=undefined when disabled) is first gate; App's onLearnClick early-return is second gate |
| T-06-12: Anchor unmount mid-session | MITIGATED (turned to invariant) — LearnAnchor is always rendered in JSX (never conditionally unmounted); D-18 no-remount test asserts DOM node identity |
| T-06-13: iOS safe-area overlap | MITIGATED — `top-[max(1rem,env(safe-area-inset-top))] right-[max(1rem,env(safe-area-inset-right))]` positioning applied |

## Self-Check: PASSED

| Check | Result |
|-------|--------|
| `src/components/LearnAnchor.tsx` exists | FOUND |
| `src/components/LearnAnchor.test.tsx` exists | FOUND |
| `06-04-SUMMARY.md` exists | FOUND (this file) |
| Commit `7ee1f8f` (Task 1) | FOUND |
| Commit `00590c3` (Task 2) | FOUND |
| Commit `5b67089` (Task 3) | FOUND |
| `vitest run LearnAnchor.test.tsx` | 7 tests passed |
| `vitest run` (full suite) | 363 tests passed, 0 regressions |
| `tsc --noEmit` App.tsx errors | 0 |
| `vite build` | ✓ built in 100ms |
