---
phase: 13-inner-ring-ux-symmetry
plan: 01
subsystem: css-accessibility
tags: [reduced-motion, inner-ring, suppression, doc-rewrite, warmup]
dependency_graph:
  requires: [Phase 12 — v1.0.1 baseline]
  provides: [WARMUP-01 complete, .orb-layer--out restored as sole reduced-motion phase cue]
  affects: [src/styles/theme.css @media block, ROADMAP §13, REQUIREMENTS WARMUP-01]
tech_stack:
  added: []
  patterns: [Phase 12 D-02 append-only callout idiom, Phase 12 D-15 per-commit green-gate, Phase 12 ASSETS-01 todo lifecycle move]
key_files:
  created: [.planning/phases/13-inner-ring-ux-symmetry/13-01-SUMMARY.md]
  modified:
    - src/styles/theme.css
    - .planning/ROADMAP.md
    - .planning/REQUIREMENTS.md
    - .planning/research/FEATURES.md
    - .planning/research/ARCHITECTURE.md
decisions:
  - "D-03: display:none (not opacity:0/visibility:hidden) in @media block — removes ring from layout entirely, encoding the intent clearly"
  - "D-04: selector is .orb-ring--inner (broad, not [data-phase='out'] scoped) — suppresses in all states under reduced motion per user direction"
  - "D-08: append-only [2026-05-12 update] callouts on frozen research docs rather than rewriting — preserves historical narrative for future readers"
  - "D-13: phase name/dir/header unchanged mid-milestone — renaming adds churn for low gain"
metrics:
  duration: "8 minutes"
  completed_date: "2026-05-12"
  tasks: 5
  files_changed: 6
---

# Phase 13 Plan 01: Reduced-Motion Inner-Ring Suppression (WARMUP-01) Summary

CSS suppression of `.orb-ring--inner` under `prefers-reduced-motion: reduce` plus doc-rewrite sweep correcting the symmetric-arrival-cue misframe across all v1.1 research artifacts.

## Commits

| # | Hash | Subject |
|---|------|---------|
| 1 | 7664bd3 | docs(13): reframe WARMUP-01 as reduced-motion inner-ring suppression (D-01, D-08) |
| 2 | 40b9c44 | feat(13): suppress .orb-ring--inner under reduced motion (WARMUP-01, D-03, D-05, D-06) |
| 3 | 1878601 | docs(13): close folded reduced-motion todo (D-02, D-09) |

## What Was Built

### CSS Change (Commit 2)

`src/styles/theme.css` — three edits in one file:

1. **New rule** inside `@media (prefers-reduced-motion: reduce)` (D-03, D-04):
   ```css
   .orb-ring--inner {
     display: none;
   }
   ```
   Selector is `.orb-ring--inner` (not scoped to `[data-phase='out']`) — suppresses the ring in Out phase, In phase, and the 3-2-1 lead-in in all reduced-motion states.

2. **JSDoc rewrite** above `.orb-ring--inner` rule (D-05): tag changed to `Phase 13 (D-03, D-05)`, normal-motion history bullets preserved, third bullet updated to document reduced-motion suppression with historical note (Phase 7 UAT → 2026-05-12 user correction).

3. **JSDoc extension** on `@media` block (D-06): added `Phase 13 (D-03)` bullet documenting the new rule; header tag extended to `(D-05, D-07, D-09, D-03)`; `CR-01: Do NOT set transform: none !important here` bullet preserved verbatim (load-bearing for BreathingShape inline-style MID_SCALE override).

### Doc Rewrite Sweep (Commit 1)

Five milestone-artifact files rewritten per 13-CONTEXT.md D-08:

- **ROADMAP.md §Phase 13**: Goal + SC1 + SC2 rewritten to reduced-motion suppression framing; line-47 v1.1 index tagline updated.
- **REQUIREMENTS.md WARMUP-01**: Description rewritten from symmetric-cue framing to reduced-motion suppression framing.
- **FEATURES.md**: 6 append-only `[2026-05-12 update]` callouts at target lines 41, 103-105, 114, 125, 152, 206-209 — each cites 13-CONTEXT.md D-01/D-03; historical text preserved verbatim.
- **ARCHITECTURE.md**: 5 append-only `[2026-05-12 update]` callouts at target lines 21, 45-48, 310-315, 383, 432 — each cites 13-CONTEXT.md D-01/D-03; historical text preserved verbatim.

**STATE.md** carry-forward sub-bullet was edited in the worktree (RESOLVED-by-Phase-13 framing per D-08) but excluded from Commit 1 per worktree-mode isolation rules. Orchestrator must apply the equivalent STATE.md rewrite post-merge. The edit changes line 75 from the "verify this does not worsen" text to: "RESOLVED directly by Phase 13 (WARMUP-01 reframed as reduced-motion `.orb-ring--inner { display: none }`; no separate verification step). Todo moves to `.planning/todos/completed/` on phase close per 13-CONTEXT.md D-09."

### Todo File Move (Commit 3)

`.planning/todos/pending/2026-05-11-reduced-motion-still-shows-out-phase-boundary-cue.md` moved to `.planning/todos/completed/` via `git mv` (rename detection preserved). File content unchanged — `resolves_phase: 13` frontmatter is the machine-readable closure marker.

## Green-Gate Results

Per-commit green-gate (D-10) passed at all three commit boundaries:

| Gate | Commit 1 | Commit 2 | Commit 3 |
|------|----------|----------|----------|
| `npx tsc --noEmit` | 0 | 0 | 0 |
| `npm run lint` | 0 | 0 | 0 |
| `npm run build` | 0 | 0 | 0 |
| `npm test` (409/409) | 0 | 0 | 0 |

409/409 Vitest baseline preserved across all three commits. No test code changed (D-07: `display: none` keeps elements in DOM so existing `querySelector` assertions pass unchanged).

## Invariants Confirmed

- `src/components/BreathingShape.tsx` — zero edits across all three Phase 13 commits (ROADMAP §13 SC3).
- `src/components/BreathingShape.test.tsx` and `src/app/App.session.test.tsx` — zero edits (D-07).
- `package.json` and `package-lock.json` — zero edits (D-11: zero net-new npm dependencies).
- `.planning/research/PITFALLS.md` — zero edits (D-08: PITFALLS lines 98/322 apply to CUST-03 Phase 17, not WARMUP-01).
- `display: none` rule is inside `@media (prefers-reduced-motion: reduce)` block at `src/styles/theme.css`.
- `CR-01: Do NOT set transform: none !important here` comment bullet preserved verbatim (D-06).
- No `transform: none !important` inside the `@media` block.

## ROADMAP / REQUIREMENTS Status After This Plan

- ROADMAP §13 traceability row (line 161): `| 13. Inner-Ring UX Symmetry | v1.1 | 0/? | Not started | - |` — may be flipped to "In progress" / "1/1" / "Complete" by the orchestrator on phase close.
- REQUIREMENTS.md WARMUP-01 status (line 99): `| WARMUP-01 | Phase 13 | Pending |` — may be flipped to "Complete" by the orchestrator on phase close.

## Decisions Made

All decisions are in `13-CONTEXT.md` D-01 through D-13. No decision was overridden during execution. Key decisions for this plan:

- **D-03 (display:none)**: Removes ring from layout, not just from visibility. Encodes "ring carries no information under reduced motion" honestly.
- **D-04 (broad selector)**: `.orb-ring--inner` suppresses in all states (Out, In, lead-in) — robust to future render-site additions.
- **D-08 (append-only callouts)**: Frozen research docs annotated with `[2026-05-12 update]` rather than rewritten — historical scoping narrative preserved for future readers per Phase 12 D-02 idiom.
- **D-13 (no phase rename)**: Phase name, slug, directory stay as `13-inner-ring-ux-symmetry` mid-milestone.

## Deviations from Plan

None — plan executed exactly as written.

The only notable execution adjustment: STATE.md edit (Task 1c) was made in the worktree but excluded from Commit 1 per worktree-mode isolation rules (orchestrator owns STATE.md writes post-merge). This is the intended behavior documented in the parallel_execution instructions.

## Known Stubs

None. The CSS change is complete and self-contained. No placeholder text or stub data wired to any UI component.

## Threat Flags

None. Phase 13 introduces no new trust boundary. Per the threat model in 13-01-PLAN.md, all 12 STRIDE threat categories are accepted N/A (empty threat surface — one CSS rule, doc edits, file rename).

## Self-Check: PASSED

All claims verified:

- 13-01-SUMMARY.md: FOUND
- Commit 1 (7664bd3): FOUND
- Commit 2 (40b9c44): FOUND
- Commit 3 (1878601): FOUND
- src/styles/theme.css: FOUND
- `.planning/todos/completed/2026-05-11-reduced-motion-still-shows-out-phase-boundary-cue.md`: FOUND
- `.planning/todos/pending/...`: CONFIRMED gone
- `display: none` inside `@media (prefers-reduced-motion: reduce)` block: CONFIRMED
- CR-01 `Do NOT set transform: none !important here` caveat: CONFIRMED preserved
