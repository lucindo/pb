---
phase: 13-inner-ring-ux-symmetry
created: 2026-05-12
milestone: v1.1
purpose: human-reference audit of discuss-phase exchange. NOT consumed by downstream agents.
---

# Phase 13 Discussion Log

## Pre-discussion scout

- **Roadmap Goal (as written):** "The orb shows a symmetric inner-ring arrival cue at both the In-phase and Out-phase boundaries, completing the visual polish carry-forward from Phase 5.1."
- **REQUIREMENTS.md WARMUP-01 (as written):** "User sees a symmetric inner-ring arrival cue at both In-phase and Out-phase boundaries of the orb (mirrors existing `[data-phase='out'] .orb-ring--inner` pattern; pure CSS + minor `BreathingShape.tsx` change; no storage/audio/timing touch)."
- **Research files (FEATURES.md §125, ARCHITECTURE.md §A line 45-48):** Two distinct proposals — (A) add `[data-phase='in'] .orb-ring--outer` fade-in on In phase; (B) fix inner-ring timing so it coincides at `MIN_SCALE`. The two proposals disagree with each other AND with the ROADMAP wording.
- **Pending todo cross-reference:** `.planning/todos/pending/2026-05-11-reduced-motion-still-shows-out-phase-boundary-cue.md` — `resolves_phase: 13`, score 0.9. Folded.

## Gray areas surfaced

Four gray areas presented (multi-select):
1. Symmetry pattern — which ring + which side
2. Reduced-motion ring suppression — conflicts with theme.css D-07 contract
3. Lead-in (3-2-1) ring state — fallout of (1)
4. Outer-ring `always visible` baseline — fallout of (1)

**User selected: all four.**

## Q&A trail

### Q1 — Symmetry pattern
Options presented:
- A. Outer fade-in on In (FEATURES.md plan)
- B. Inner linger at In start (literal ROADMAP read)
- C. Inner timing fix only (ARCHITECTURE.md Issue B)
- D. Both rings symmetric

**User selected:** C — Inner timing fix only.

### Q2 — Inner-ring timing mechanism
Options presented:
- CSS-var from `data-progress` (continuous reveal)
- `data-near-boundary` threshold class
- Keep current pattern (backtrack — Phase 13 ≡ reduced-motion fix only)

**User correction (no option selected, free-text note):** "I need you to stop, I think you are doing the wrong thing, everything is working fine, the only problem is: ONLY ON REDUCED MOTION MODE the inner ring of out phase should not be drawn (in any state)... NO OTHER CHANGES."

This collapsed Phase 13 scope to the third option (Keep current pattern + Area-2 reduced-motion-only suppression). The research-derived gray areas 1, 3, and 4 were resolved as **not applicable**.

### Q3 — Suppression mechanism
Options presented:
- CSS `@media` block, `display: none`
- CSS `@media` block, `opacity: 0`
- Conditional TSX render via `usePrefersReducedMotion()`
- Narrower `[data-phase='out']` selector

**User selected:** CSS `@media` block, `display: none`.

### Q4 — Doc rewrite scope
Options presented:
- Update all in Phase 13 (ROADMAP + REQUIREMENTS + research + PROJECT)
- Update only ROADMAP + REQUIREMENTS
- Code change only

**User selected (free-text):** "yes, update so you don't get confused again by this." → Update all in Phase 13.

## Final decision set captured in 13-CONTEXT.md

- **D-01..D-02:** Scope reset — reduced-motion-only suppression; symmetric-arrival-cue framing rejected. Phase 5.1 Issue B Plan 05.1-05 candidate subsumed.
- **D-03..D-04:** `.orb-ring--inner { display: none }` inside existing `@media (prefers-reduced-motion: reduce)` block; broad selector (not `[data-phase='out']`-scoped) for intent-explicit CSS.
- **D-05..D-06:** Theme.css comment rewrites at `:99-107` and `:142-153` reflecting D-12 contract.
- **D-07:** No required test changes; optional reduced-motion `display: none` assertion gap-fill.
- **D-08:** Doc rewrite sweep — ROADMAP §13, REQUIREMENTS WARMUP-01, FEATURES.md / ARCHITECTURE.md `[2026-05-12 update]` callouts, STATE.md Pending Todos line.
- **D-09:** Single plan, single wave, three commits (doc rewrite → CSS change → todo file relocation).
- **D-10..D-12:** Per-commit green-gate, zero new deps, D-07 reduced-motion contract restored as sole indicator.
- **D-13:** Phase rename deferred to plan-phase / user choice.

## Items reviewed and deferred (no action)

- Outer-ring fade-in on In phase — FEATURES.md §125 plan rejected.
- Inner-ring timing tightened at `MIN_SCALE` — ARCHITECTURE.md Issue B framing rejected.
- `data-progress`-driven CSS-var reveal — over-engineered for the actual defect.
- Phase rename to "Inner-Ring Reduced-Motion Suppression" — deferred to plan-phase.

## Folded todos

- `.planning/todos/pending/2026-05-11-reduced-motion-still-shows-out-phase-boundary-cue.md` — moves to `.planning/todos/completed/` after Phase 13 ships.

## Claude-discretion items flagged

- Optional new reduced-motion `display: none` assertion in `src/components/BreathingShape.test.tsx` (D-07 — planner's call, recommended as 1-case gap-fill).
- Optional ROADMAP §13 header rename text (D-13 — planner surfaces for user confirmation; current "Inner-Ring UX Symmetry" is now a misnomer).

---

*Discussion conducted: 2026-05-12*
*Mode: default (4-question turns per area, then convergence)*
