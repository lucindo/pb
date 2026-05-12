---
phase: 11-domain-ui-contracts-accessibility
plan: 01
subsystem: domain/ui-contracts/accessibility
tags:
  - domain-validation
  - ui-contract
  - dialog-lifecycle
  - accessibility
  - react
requirements_closed:
  - DOMAIN-01
  - UI-01
  - UI-02
  - A11Y-01
commits:
  - 2f6b54f # Task 1 — DOMAIN-01
  - e6a6ddb # Task 2 — UI-01
  - 2296b08 # Task 3 — UI-02
  - ac5e446 # Task 4 — A11Y-01
test_count_baseline: 391
test_count_final: 400
green_gates_per_commit: passed # tsc --noEmit + lint + build + vitest all exit 0 at every task boundary
duration_minutes: 9
completed: 2026-05-12
ready_for: /gsd-verify-phase 11
---

# Phase 11 Plan 01: Domain, UI Contracts & Accessibility — Summary

**One-liner:** Four boundary contracts tightened — extendTimedSession throws on non-allowlist finite numerics, SessionReadout owns an explicit `isLeadInPlaceholder` prop, an App-level subscribe-and-reflect effect force-closes Learn/Reset dialogs on inSessionView transition, and MuteToggle plumbs `aria-describedby` to the App's sr-only resume-hint region when needsResume is true.

## Requirements Closed

| REQ-ID | Source | Commit | Status |
|--------|--------|--------|--------|
| DOMAIN-01 | REVIEW.md §WR-01 — extendTimedSession discovered invalid durations deep inside createBreathingPlan | `2f6b54f` | Complete |
| UI-01 | REVIEW.md §WR-08 — SessionReadout lead-in placeholder contract was implicit via App-side `status='idle'` override hack | `e6a6ddb` | Complete |
| UI-02 | REVIEW.md §WR-09 — LearnDialog / ResetStatsDialog could float over the session view under a race | `2296b08` | Complete |
| A11Y-01 | REVIEW.md §IN-06 — MuteToggle needsResume mode lacked aria-describedby plumbing | `ac5e446` | Complete |

## Commits (in order)

| # | Sha | Type | Message |
|---|-----|------|---------|
| 1 | `2f6b54f` | fix | fix(11-01): allowlist-throw extendTimedSession (DOMAIN-01) |
| 2 | `e6a6ddb` | fix | fix(11-01): explicit lead-in placeholder contract on SessionReadout (UI-01) |
| 3 | `2296b08` | fix | fix(11-01): auto-close Learn/Reset dialogs on in-session transition (UI-02) |
| 4 | `ac5e446` | fix | fix(11-01): conditional aria-describedby on MuteToggle resume mode (A11Y-01) |

## Per-Commit Green Gate (D-17)

Every commit boundary in this plan exits 0 across all four gates:

| Gate | Task 1 | Task 2 | Task 3 | Task 4 |
|------|--------|--------|--------|--------|
| `npx tsc --noEmit` | 0 | 0 | 0 | 0 |
| `npm run lint` | 0 | 0 | 0 | 0 |
| `npm run build` | 0 | 0 | 0 | 0 |
| `npm test` | 392/392 | 396/396 | 398/398 | 400/400 |

Vitest count: **391 baseline → 400 final** (delta +9: DOMAIN-01 +1, UI-01 +4, UI-02 +2, A11Y-01 +2).

## Files Changed

**Source (5):**
- `src/domain/sessionController.ts` — widened ./settings import; new allowlist throw between open-ended throw and Number.isFinite check
- `src/components/SessionReadout.tsx` — new optional `isLeadInPlaceholder?: boolean` prop + early-branch render
- `src/components/MuteToggle.tsx` — new required `resumeHintId: string` prop + conditional `aria-describedby={needsResume ? resumeHintId : undefined}`
- `src/components/SessionControls.tsx` — new optional `resumeHintId?: string` prop forwarded to `<MuteToggle resumeHintId={resumeHintId ?? ''} />`
- `src/app/App.tsx` — dropped `status='idle'` override hack at SessionReadout callsite; added `isLeadInPlaceholder={appPhase === 'lead-in'}`; new useEffect on `[inSessionView]` closing Learn/Reset dialogs; `resumeHintId="mute-toggle-resume-hint"` on SessionControls; `id="mute-toggle-resume-hint"` on the sr-only resume-hint div

**Tests (4) — co-located per D-16:**
- `src/domain/sessionController.test.ts` — +1 case (`extendTimedSession(running, 7)` throws RangeError; D-03)
- `src/components/SessionReadout.test.tsx` — **NEW** file, +4 cases (D-06 / D-16 exception: structural gap-fill)
- `src/app/App.dialog.test.tsx` — +2 cases (`WR-09 in-session dialog auto-close` describe block; D-09)
- `src/components/MuteToggle.test.tsx` — +2 cases (aria-describedby set/unset assertions; D-12) + renderToggle helper updated to default `resumeHintId` + 3 raw `<MuteToggle />` JSX usages updated with the new required prop

## Decisions Made

- **DOMAIN-01 fix shape:** boundary allowlist throw with parameter type kept as `number` (D-01 — smallest diff at caller boundary; chosen over narrowing the param to `DurationOption` or a belt-and-suspenders combo)
- **DOMAIN-01 check ordering:** new throw fires AFTER open-ended throw and BEFORE Number.isFinite/<= comparison (D-02 — invalid finite numerics surface the allowlist message rather than the misleading "greater finite" message)
- **UI-01 contract shape:** boolean prop `isLeadInPlaceholder?: boolean` (D-04 — keeps SessionStatus untouched; chosen over a component-local `'lead-in'` union or extending the domain SessionStatus)
- **UI-02 effect shape:** single subscribe-and-reflect useEffect on `[inSessionView]` (D-07 — mirrors EndSessionDialog auto-close template at App.tsx:247-253 verbatim; chosen over two separate effects or open-guard-only)
- **UI-02 onResetClick guard:** NOT added (D-08 — Reset button lives in StatsFooter which is hidden mid-session; reactive close in the new effect is the second line of defense)
- **A11Y-01 plumbing:** App owns the id string ("mute-toggle-resume-hint") and forwards through SessionControls.resumeHintId to MuteToggle.resumeHintId (D-10/D-11 — chosen over hard-coding the id in both files)
- **A11Y-01 conditional:** `aria-describedby` set only when needsResume=true (D-10 — chosen over always-set; avoids screen readers announcing empty-content "description:" when the live region text is the empty-string fallback)

## Deviations from Plan

### 1. [Rule 3 – Blocking Lint] D-15 strict reading required removing one redundant eslint-disable directive

**Found during:** Task 3 (UI-02 new App-level useEffect)

**Issue:** Plan D-15 + Task 3 acceptance criteria say each setState call in the new effect must be preceded by its own `// Reason:` line AND `// eslint-disable-next-line react-hooks/set-state-in-effect` directive. When implemented verbatim (two `setLearnDialogOpen(false)` + `setResetDialogOpen(false)` calls, each with its own disable), `npm run lint` reports:

```
src/app/App.tsx
  270:7  warning  Unused eslint-disable directive (no problems were reported from 'react-hooks/set-state-in-effect')
```

The `react-hooks/set-state-in-effect` rule fires once per effect block, not once per setState call. The second disable directive has nothing to suppress and is flagged as unused. This is consistent with the existing EndSessionDialog auto-close effect at App.tsx:247-253 (the WR-01 template), which has only ONE disable for ONE setState call — the plan's "each setState gets its own disable" instruction is a strict reading of D-15 that the linter does not permit.

**Fix:** Single `// eslint-disable-next-line react-hooks/set-state-in-effect` directive (preceded by the full `// Reason: ...` annotation per D-15) before `setLearnDialogOpen(false)`. This directive covers BOTH setState calls in the same effect block because the rule only fires once. The `// Reason:` annotation captures the full subscribe-and-reflect rationale per D-15. The `setResetDialogOpen(false)` call follows immediately, no disable required.

**Files modified:** `src/app/App.tsx` (lines 264-273)

**Acceptance criterion impact:** The Task 3 criterion "shows two new annotated-disable lines inside the new effect (one per setState)" reads strictly two; we have one disable plus a single `// Reason:` block. The intent of D-15 (annotate the disable with rationale) is fully satisfied; the literal "two disables" cannot be satisfied without a lint warning. All other Task 3 criteria pass (effect body, deps array, setState calls, onLearnClick guard preserved, WR-01 regression, full green-gate, test count delta).

**Commit:** `2296b08`

### 2. [Selector clarification — not a true deviation] WR-09 dialog accessible names

**Found during:** Task 3 test authoring.

**Issue:** PATTERNS.md flagged the `{ name: /learn/i }` and `{ name: /reset/i }` selectors as indicative — to be verified against actual JSX. Initial implementation followed the indicative pattern and failed because:
- LearnDialog's `aria-labelledby` points to its h2 "About this practice", not "Learn"
- ResetStatsDialog's `aria-labelledby` points to its h2 "Reset practice stats?"

**Fix:** Updated selectors to use the exact h2 text — `{ name: 'About this practice' }` for LearnDialog and `{ name: 'Reset practice stats?' }` for ResetStatsDialog. This is the resolution the PATTERNS.md note explicitly requested ("adjust to match actual button aria-labels").

**Files modified:** `src/app/App.dialog.test.tsx`

**Commit:** `2296b08`

### 3. [Test wiring — not a true deviation] WR-09 ResetStatsDialog requires seeded stats

**Found during:** Task 3 test authoring.

**Issue:** The Reset button only renders when `stats.totalSessions > 0` (gated by StatsFooter — App.tsx:617). A fresh render produces an empty stats envelope, so the Reset button is hidden.

**Fix:** The WR-09 ResetStatsDialog test seeds localStorage with `{ stats: { totalSessions: 3, ... } }` (mirroring the seedEnvelope pattern in App.persistence.test.tsx) before rendering, so the Reset button is visible. This is a standard test-setup requirement, fully captured in the test body comments.

**Files modified:** `src/app/App.dialog.test.tsx`

**Commit:** `2296b08`

## Milestone Invariant (D-18) — No User-Facing Behavior Change

- **DOMAIN-01:** A value that previously threw `RangeError` from deep inside `createBreathingPlan` now throws the same `RangeError` class one frame up the stack (`extendTimedSession`). Callers' existing catch sites are unchanged. The only delta is which `RangeError` message a previously-failing call surfaces.
- **UI-01:** The placeholder branch produces the same visual output as the prior `status='idle'` override hack. Walk-through of lead-in → running → complete renders identically.
- **UI-02:** The auto-close effect fires only on a race that today's `onLearnClick` open-guard already prevents from the happy path. Normal flow (open Learn dialog → close → Start session) is unchanged. The Reset trigger is unreachable mid-session via the hidden StatsFooter, so the reactive close is defensive only.
- **A11Y-01:** `aria-describedby` is a screen-reader-only delta. Sighted users see no change. Screen-reader probe: focusing the MuteToggle button in needs-resume mode now associates the "Audio paused, tap to resume" hint with the button via aria-describedby (vs. the live region alone).

## Self-Check

- [x] DOMAIN-01 allowlist throw at sessionController.ts:68 (verified via grep)
- [x] UI-01 `isLeadInPlaceholder` prop in interface + destructure + early branch (SessionReadout.tsx:14, 17, 21)
- [x] UI-01 App wires `isLeadInPlaceholder={appPhase === 'lead-in'}` (App.tsx:597)
- [x] UI-01 status override hack removed (0 matches for the prior hack)
- [x] UI-02 new effect at App.tsx:264-273 with `if (inSessionView)`, `setLearnDialogOpen(false)`, `setResetDialogOpen(false)`, deps `[inSessionView]`
- [x] UI-02 `onLearnClick` open-guard preserved at App.tsx:415 (`if (inSessionView) return`)
- [x] A11Y-01 MuteToggle.tsx:44 `aria-describedby={needsResume ? resumeHintId : undefined}`
- [x] A11Y-01 MuteToggle.tsx:37 `aria-pressed={needsResume ? undefined : muted}` preserved
- [x] A11Y-01 App.tsx:613 `resumeHintId="mute-toggle-resume-hint"`
- [x] A11Y-01 App.tsx:621 `id="mute-toggle-resume-hint"`
- [x] All 4 commits exist in git log (verified via `git log --oneline -6`)
- [x] All four green gates exit 0 at every commit boundary
- [x] Final test count 400/400 (391 baseline + 9 new = 400; within 397-400 target)

## Self-Check: PASSED

## Ready for next step

This plan is ready for `/gsd-verify-phase 11`.
