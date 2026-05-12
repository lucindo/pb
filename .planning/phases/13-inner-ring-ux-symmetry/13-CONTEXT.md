---
phase: 13-inner-ring-ux-symmetry
created: 2026-05-12
milestone: v1.1
requirements:
  - WARMUP-01
---

# Phase 13 Context: Inner-Ring UX Symmetry → Reduced-Motion Inner-Ring Suppression

<domain>
Scope collapse during context capture: the v1.1 research framing of WARMUP-01 ("symmetric inner-ring arrival cue at both In and Out boundaries", FEATURES.md §125 / ARCHITECTURE.md §A) was a misread of the Phase 5.1 "Issue B" carry-forward. User confirms 2026-05-12 the only real defect is: under `prefers-reduced-motion: reduce`, the `.orb-ring--inner` is still rendered (and visible during the Out phase) — it should not be. Phase 13 reduces to a single CSS rule inside the existing `@media (prefers-reduced-motion: reduce)` block in `src/styles/theme.css:154` plus a doc-rewrite sweep so future phases do not re-introduce the symmetry misframe. No TSX change. No test code change. No storage / audio / timing / hook touch (ROADMAP §13 SC3 preserved). Goal-text + Success-Criteria rewrite in ROADMAP §13 + REQUIREMENTS WARMUP-01 + FEATURES.md / ARCHITECTURE.md historical sections is part of Phase 13 — explicitly so future planners do not re-derive the wrong scope from the research files.
</domain>

<decisions>

### Scope reset

- **D-01:** WARMUP-01 actual scope (user-confirmed 2026-05-12) is **reduced-motion inner-ring suppression**, not symmetric arrival cues. The current v1.0.1 behavior (inner ring fades in on Out start via `[data-phase='out']` selector + 400ms transition, fades out on phase flip via CSS transition revert) is **correct as-is** under normal motion. Only the reduced-motion branch is defective: the ring renders statically and adds no information when the orb is locked at `MID_SCALE`. Chosen over (b) outer-ring fade-in on In phase (FEATURES.md §125 plan — not what user wants), (c) inner-ring timing tightened to coincide with `MIN_SCALE` (ARCHITECTURE.md §A interpretation — not what user wants), and (d) both rings symmetric (maximal change — not what user wants). User direction: "everything is working fine, the only problem is: ONLY ON REDUCED MOTION MODE the inner ring of out phase should not be drawn (in any state)... NO OTHER CHANGES".

- **D-02:** Pending todo `.planning/todos/pending/2026-05-11-reduced-motion-still-shows-out-phase-boundary-cue.md` (`resolves_phase: 13`) is FOLDED into Phase 13. Phase 5.1 Plan 05 candidate (Issue B inner-ring UX symmetry) referenced in `.planning/milestones/v1.0-phases/05.1-hands-off-resilience-polish/.continue-here.md:65` is SUBSUMED — same code surface, but the actual user-validated defect is reduced-motion-only, not symmetry. Todo file moves to `.planning/todos/completed/` after Phase 13 ships.

### CSS suppression mechanism

- **D-03:** ADD `.orb-ring--inner { display: none; }` inside the existing `@media (prefers-reduced-motion: reduce) { ... }` block at `src/styles/theme.css:154-158`. Chosen over (b) `opacity: 0` (element still occupies layout; reduced-motion contract is that the ring carries no info, so removing it from layout is honest), (c) conditional TSX render via `usePrefersReducedMotion()` in `BreathingShape.tsx` (touches React render path for a presentation-only suppression — wrong layer; CSS @media gating is the established pattern in this file), and (d) `visibility: hidden` (still reserves layout space; same downside as opacity:0 for this use case). The rule applies to ALL `.orb-ring--inner` instances (Body + LeadIn) — under reduced motion the orb is locked at `MID_SCALE` in both, and the ring has no informational role in either.

- **D-04:** Selector is `.orb-ring--inner` (not `[data-phase='out'] .orb-ring--inner`). Under reduced motion the ring should be absent in ALL states — Body (Out and In phases), LeadIn (3-2-1 countdown). The narrower selector would be visually equivalent today (lead-in already has no `data-phase`, In phase already sets `opacity: 0` via the default rule), but the broader selector encodes the intent ("ring is suppressed under reduced motion, full stop") and is robust to future render-site additions. Chosen over (b) the narrower scope as a stylistic preference for intent-explicit CSS.

### Comment / contract update

- **D-05:** `src/styles/theme.css:99-107` JSDoc-style block comment above `.orb-ring--inner` is REWRITTEN. The current comment says "Reduced-motion: the transition is intentionally PRESERVED... the fade-in IS the phase indicator when the orb is locked at MID_SCALE" — this is now factually wrong post-D-03. New comment must state: (a) the ring is suppressed under reduced motion via the `@media` block below; (b) the `.orb-layer--out` opacity crossfade alone carries the substitute phase indicator under reduced motion (D-07 from Phase 2 — STILL the canonical reduced-motion phase cue); (c) why the ring was originally kept under reduced motion (UAT report Phase 7, 2026-05-11) and why it is now removed (user UAT correction, 2026-05-12).

- **D-06:** `src/styles/theme.css:142-153` `@media (prefers-reduced-motion: reduce)` block comment is EXTENDED with one line documenting the new `.orb-ring--inner { display: none }` rule. The existing CR-01 caveat (`do NOT set transform: none !important here`) is preserved verbatim — that block-level guard is still load-bearing for the BreathingShape inline-style MID_SCALE override.

### Test posture

- **D-07:** No test code change required. Existing reduced-motion + inner-ring assertions:
  - `src/app/App.session.test.tsx:99-108` — asserts `shape.querySelector('[aria-hidden="true"].orb-ring--inner')` is non-null. `display: none` keeps the element in DOM, so `querySelector` still finds it. Test PASSES unchanged.
  - `src/components/BreathingShape.test.tsx:169-188` — asserts inner-ring template (className + width/height style). Same posture — element remains in DOM. PASSES unchanged.
  - `src/components/BreathingShape.test.tsx:255-262` — lead-in inner-ring template assertion. PASSES unchanged.
- NEW assertion for reduced-motion-suppression coverage is OPTIONAL (planner's call). If added, it would be a jsdom `getComputedStyle(inner).display === 'none'` check inside a `matchMedia.matches=true` test seam — jsdom honors `display` in computed style. Recommended addition: 1 case in `BreathingShape.test.tsx` under the existing `usePrefersReducedMotion` test scaffold, gap-fill posture per Phase 10 D-20 / Phase 11 D-16.

### Doc rewrite — internal consistency

- **D-08:** Rewrite the WARMUP-01 framing across milestone artifacts so future phases / planners cannot re-derive the wrong scope. Files in scope (user-confirmed: "update so you don't get confused again by this"):
  - `.planning/ROADMAP.md` §"Phase 13: Inner-Ring UX Symmetry" (lines 57-68): Goal + Success Criteria rewritten. New goal text: "Under `prefers-reduced-motion: reduce`, the inner reference ring (`.orb-ring--inner`) is no longer rendered — the `.orb-layer--out` opacity crossfade remains the sole reduced-motion phase indicator (D-07 preserved)." SC1 ("inner-ring arrival cue animates at the In-phase start boundary") is REPLACED with "Under `prefers-reduced-motion: reduce`, the inner reference ring is not drawn in any state (Out, In, lead-in)." SC2 ("Out-phase inner-ring behavior pixel-identical to v1.0.1 baseline") is QUALIFIED to "Out-phase inner-ring behavior under **normal motion** is pixel-identical to v1.0.1 baseline (only the reduced-motion branch changes)." SC3+SC4 unchanged.
  - `.planning/REQUIREMENTS.md` §"Warm-up: Inner-Ring UX Symmetry" WARMUP-01 (line 16): replace symmetric-cue framing with reduced-motion-suppression framing. New WARMUP-01: "Under `prefers-reduced-motion: reduce`, the inner reference ring (`.orb-ring--inner`) is not rendered — `.orb-layer--out` opacity crossfade alone carries the substitute phase indicator (D-07). Pure CSS change in `src/styles/theme.css` `@media (prefers-reduced-motion: reduce)` block; no TSX, storage, audio, timing touch."
  - `.planning/research/FEATURES.md` lines 41, 103-105, 114, 125, 152, 206-209: append `[2026-05-12 update]` callouts (NOT overwrite — preserves the historical scoping narrative) noting that the symmetric-arrival-cue framing was rejected at discuss-phase 2026-05-12; actual implementation is reduced-motion suppression per `.planning/phases/13-inner-ring-ux-symmetry/13-CONTEXT.md`. Same posture as Phase 12 D-02 REVIEW.md addendum.
  - `.planning/research/ARCHITECTURE.md` lines 21, 45-48, 310-315, 383, 432: same `[2026-05-12 update]` callout posture. Specifically the "Issue B carry-forward" framing at line 45 is annotated: "Issue B was reduced-motion-only in actual user UAT (2026-05-12); normal-motion inner-ring behavior is correct as-is."
  - `.planning/research/PITFALLS.md` lines 98, 322 (orb-scale TS/CSS sync): UNCHANGED — these still apply to future CUST-03 visual variants and have nothing to do with the WARMUP-01 misframe.
  - `.planning/PROJECT.md` Pending Todos line in STATE.md (`Carry-forward from v1.0.1: 2026-05-11-reduced-motion-still-shows-out-phase-boundary-cue — note: Phase 13 (WARMUP-01) adds In-phase inner ring; verify this does not worsen the out-phase boundary cue reduced-motion issue.`): rewrite to reflect actual scope — Phase 13 RESOLVES the todo directly; no separate verification step needed since the todo IS the phase.
  - `.planning/STATE.md` `v1.1 phase ordering` Decisions row description ("Phase 13 (pure CSS warm-up)"): keep as-is — "pure CSS warm-up" remains accurate.

- **D-09:** Phase 13 plan SHOULD package the doc rewrite (D-08) and the CSS change (D-03/D-05/D-06) under SEPARATE commits, ordered: (1) doc rewrite first (zero-code, lands ROADMAP/REQUIREMENTS/research updates so the audit gate reads the new SC); (2) CSS change second (the one-line `display: none` addition + theme.css comment rewrite); (3) todo file relocation third (`.planning/todos/pending/...md` → `.planning/todos/completed/...md`). Per-commit green-gate (D-09 / D-15 carry-forward) at every step. Three commits, single plan, single wave. Mirrors Phase 12 D-12 (single-plan, files don't overlap).

### Carry-forward invariants

- **D-10:** Phase 7 D-09 / Phase 11 D-17 / Phase 12 D-15 — per-commit green-gate. Every commit boundary inside Phase 13: `tsc --noEmit` exits 0, `npm run lint` exits 0, `npm run build` exits 0, full Vitest suite (409/409 v1.0.1 baseline) passes. A commit that breaks any is rolled back, not patched-forward. The doc-rewrite commit is text-only; the CSS commit adds 1 selector + comment edits; the todo-relocate commit is a file move. None of the three should perturb tsc/lint/test.

- **D-11:** No new dependency (zero-new-npm-deps milestone invariant from STATE.md "Zero net-new runtime deps" decision row). Pure CSS — already in scope.

- **D-12:** Reduced-motion contract D-07 (Phase 2) is the **canonical** substitute phase indicator under `prefers-reduced-motion: reduce` — the `.orb-layer--out` opacity crossfade. Phase 13 does NOT change D-07; it RESTORES D-07 as the sole indicator by removing the redundant inner ring. Theme.css comment rewrite (D-05) must explicitly cite D-07 to anchor the contract for future readers.

- **D-13:** Phase name "Inner-Ring UX Symmetry" is now a misnomer (the actual change is suppression, not symmetry). Phase NAME, slug, and directory NOT RENAMED at this discuss-phase step — renaming a phase mid-milestone with planning artifacts already created adds churn for low gain. ROADMAP §13 header text MAY be updated alongside D-08 doc rewrites (e.g., to "Inner-Ring Reduced-Motion Suppression") at planner's discretion — flag for user confirmation in the plan-phase step. Phase directory `.planning/phases/13-inner-ring-ux-symmetry/` stays as-is.

</decisions>

<canonical_refs>

**REQUIREMENTS / specs:**
- `.planning/REQUIREMENTS.md` §"Warm-up: Inner-Ring UX Symmetry" WARMUP-01 (line 16) — REWRITE per D-08. New text in D-08.
- `.planning/REQUIREMENTS.md` traceability table (line 99) — WARMUP-01 → Phase 13 row stays; status `Pending` → `In progress` then `Done` on phase close.
- `.planning/ROADMAP.md` §"Phase 13: Inner-Ring UX Symmetry" (lines 47, 57-68, 161) — Goal + SC1 + SC2 REWRITE per D-08.
- `.planning/PROJECT.md` (no §13-specific row to edit; v1.0 D-07 reduced-motion contract row at line 133 STILL valid — Phase 13 RESTORES it as sole indicator per D-12).
- `.planning/STATE.md` "Pending Todos" line at line 74 — REWRITE per D-08 sub-bullet.

**Research (historical, to be annotated NOT overwritten per D-08 sub-bullets):**
- `.planning/research/FEATURES.md` lines 41, 103-105, 114, 125, 152, 206-209 — append `[2026-05-12 update]` callouts pointing at `13-CONTEXT.md` D-01.
- `.planning/research/ARCHITECTURE.md` lines 21, 45-48, 310-315, 383, 432 — same callout posture; explicitly mark "Issue B" framing as reduced-motion-only per actual user UAT.
- `.planning/research/PITFALLS.md` lines 98, 322 — UNCHANGED (orb-scale TS/CSS sync still applies to CUST-03).
- `.planning/research/STACK.md`, `SUMMARY.md` — NOT EDITED (no §13 references).

**Carry-forward CONTEXT files:**
- `.planning/milestones/v1.0-phases/05.1-hands-off-resilience-polish/.continue-here.md:65,72` — Issue B → "deferred Plan 05.1-05" note SUBSUMED by Phase 13 per D-02. No edit to the historical file (frozen v1.0 archive); resolution is captured here in 13-CONTEXT.md.
- `.planning/milestones/v1.0-phases/02-visual-guide-accessible-responsive-interface/` (D-04, D-05, D-06, D-07) — reduced-motion contract canonical source. D-07 (`.orb-layer--out` opacity crossfade IS the substitute phase indicator) is the contract Phase 13 RESTORES, not changes.
- `.planning/milestones/v1.0-phases/05.1-hands-off-resilience-polish/05.1-04-PLAN.md` D-22 (mirror invariant — Body and LeadIn renders must match) — STILL applies. Phase 13 makes no TSX edit so the mirror is preserved by definition.
- `.planning/milestones/v1.0.1-phases/12-assets-content-hygiene-cleanup/12-CONTEXT.md` D-15 (per-commit green-gate) — pattern cited in D-10.
- `.planning/milestones/v1.0.1-phases/12-assets-content-hygiene-cleanup/12-CONTEXT.md` D-02 (REVIEW.md `[2026-05-12 update]` addendum posture) — pattern cited in D-08 for FEATURES.md / ARCHITECTURE.md callouts.
- `.planning/milestones/v1.0.1-phases/12-assets-content-hygiene-cleanup/12-CONTEXT.md` D-12 (single-plan, single-wave, non-overlapping file groups) — pattern cited in D-09.

**Source under edit:**
- `src/styles/theme.css:154-158` — existing `@media (prefers-reduced-motion: reduce)` block. ADD `.orb-ring--inner { display: none; }` rule per D-03.
- `src/styles/theme.css:99-107` — JSDoc comment above `.orb-ring--inner` rule. REWRITE per D-05.
- `src/styles/theme.css:142-153` — JSDoc comment above the `@media` block. EXTEND with one line per D-06.

**Source NOT edited (load-bearing references):**
- `src/components/BreathingShape.tsx:114-132` (Body inner-ring render) — UNCHANGED. ROADMAP §13 SC3 invariant (`change touches only CSS and BreathingShape.tsx`) becomes "only CSS" in practice.
- `src/components/BreathingShape.tsx:202-212` (LeadIn inner-ring render) — UNCHANGED. D-22 mirror invariant preserved trivially.
- `src/hooks/usePrefersReducedMotion.ts` — UNCHANGED. The @media gate in theme.css uses the same `prefers-reduced-motion: reduce` query that the hook listens to.

**Test files (NOT edited per D-07; optional gap-fill at planner discretion):**
- `src/app/App.session.test.tsx:99-108` — reference-ring presence test. `querySelector` finds elements regardless of `display: none`, so test PASSES unchanged.
- `src/components/BreathingShape.test.tsx:169-188` — inner-ring template test (Body). PASSES unchanged.
- `src/components/BreathingShape.test.tsx:255-262` — lead-in inner-ring template test. PASSES unchanged.
- OPTIONAL new case in `src/components/BreathingShape.test.tsx` under existing `usePrefersReducedMotion` scaffold: `getComputedStyle(inner).display === 'none'` when `matchMedia('prefers-reduced-motion: reduce').matches === true`. Planner's call per D-07.

**Todo cross-reference (folded into Phase 13 per D-02):**
- `.planning/todos/pending/2026-05-11-reduced-motion-still-shows-out-phase-boundary-cue.md` — `resolves_phase: 13`. Move to `.planning/todos/completed/` after Phase 13 ships (per D-09 step 3).

</canonical_refs>

<code_context>

### Reusable Assets
- The existing `@media (prefers-reduced-motion: reduce)` block at `src/styles/theme.css:154-158` is the established pattern for reduced-motion gating in this file. D-03 extends it by one selector; no new media query, no new architectural surface.
- The `usePrefersReducedMotion` hook is already imported by `BreathingShape.tsx` and used at `BreathingShapeBody` to drive the `MID_SCALE` inline transform. CSS @media gating is independent and runs in parallel — no JS↔CSS handshake required.
- `display: none` keeps elements in the DOM (computedStyle effective), so existing `querySelector` test assertions are unaffected (D-07).
- The `.orb-layer--out` opacity crossfade transition is the canonical reduced-motion phase indicator (Phase 2 D-07) — preserved verbatim, simply restored to sole-indicator status by removing the redundant ring.

### Established Patterns
- Phase 7 D-09 / Phase 11 D-17 / Phase 12 D-15 — per-commit green-gate (tsc/lint/build/vitest). D-10 inherits.
- Phase 12 D-12 — single-plan-single-wave packaging when files don't overlap. D-09 mirrors.
- Phase 12 D-02 — `[YYYY-MM-DD update]` addendum on frozen historical docs rather than overwriting. D-08 mirrors for FEATURES.md / ARCHITECTURE.md callouts.
- Phase 10 D-20 / Phase 11 D-16 — new test cases co-located in existing `*.test.{ts,tsx}` neighbors (gap-fill exception when no neighbor exists). Optional D-07 gap-fill follows this if added.

### Integration Points
- `src/styles/theme.css:154` `@media` block — the ONLY CSS edit. New rule joins existing `dialog.modal-fade { transition: none !important }`.
- `src/styles/theme.css:99-107` + `:142-153` — comment edits only. Zero rule changes.
- DOM order under reduced motion: inner ring `<span>` still emitted by React (Body line 125-132, LeadIn line 205-212), but absent from layout (`display: none`). Screen readers ignore `display: none` content by default — accessibility surface unchanged.

</code_context>

<specifics>

- User direction verbatim (2026-05-12): "everything is working fine, the only problem is: ONLY ON REDUCED MOTION MODE the inner ring of out phase should not be drawn (in any state)... NO OTHER CHANGES."
- User direction on doc rewrite (2026-05-12): "yes, update so you don't get confused again by this." — drives D-08 scope (rewrite ROADMAP + REQUIREMENTS + FEATURES.md/ARCHITECTURE.md callouts so future planners don't re-derive the symmetry misframe).
- The `.orb-layer--out` opacity transition is preserved verbatim in the existing @media block at `src/styles/theme.css:142-158` — it is intentionally NOT in the `transition: none !important` reduce rule (theme.css comment lines 144-146). D-12 cites this; the comment rewrite at D-05 must continue to honor it.
- Phase 13 is the FIRST phase of v1.1 (per STATE.md `progress.completed_phases: 0`). Plan should not pre-empt Phase 14 (Prefs Foundation) or assume any of the customization umbrella infrastructure exists. The CSS change is self-contained.

</specifics>

<deferred>

- **Symmetric arrival cue at both In and Out boundaries** (FEATURES.md §125 / ROADMAP §13 SC1 original framing) — REJECTED per D-01. User confirms current normal-motion behavior is correct as-is. Not deferred to v1.x, not deferred at all — the framing was a misread and the doc rewrite (D-08) removes it from the artifact set so future planners don't re-derive it.

- **Inner-ring timing tightened to coincide with `MIN_SCALE`** (ARCHITECTURE.md §A Issue B interpretation) — REJECTED per D-01. Same root cause: misread of the carry-forward defect. Normal-motion timing is fine.

- **Outer-ring fade-in on `[data-phase='in']`** (FEATURES.md §125 secondary suggestion) — REJECTED per D-01. Outer ring stays always-visible.

- **`data-progress`-driven continuous opacity reveal** (CSS-var-from-progress option) — CONSIDERED then REJECTED per D-01. Adds per-frame React render coupling for a presentation effect that was never the actual defect.

- **Phase rename from "Inner-Ring UX Symmetry" to "Inner-Ring Reduced-Motion Suppression"** — D-13 explicit DEFERRAL (planner's call, surfaced for user confirmation at plan-phase). Renaming mid-milestone adds churn (slug, directory, ROADMAP traceability) for low gain. ROADMAP §13 header text update is the lowest-touch option if chosen.

- **Add reduced-motion `display: none` assertion test** — OPTIONAL per D-07. Recommended as a 1-case gap-fill but not blocking. Defer-or-add at planner discretion.

- **Stricter scoped selector `[data-phase='out'] .orb-ring--inner`** — CONSIDERED then REJECTED per D-04 in favor of `.orb-ring--inner` (intent-explicit + robust to future render-site additions).

- **Phase 5.1 Plan 05 "Issue B" original framing** — SUBSUMED per D-02. The "deferred Plan 05.1-05" in `.continue-here.md` is closed-by-supersession via Phase 13.

### Folded Todos

- **`.planning/todos/pending/2026-05-11-reduced-motion-still-shows-out-phase-boundary-cue.md`** — FOLDED into Phase 13 per D-02. `resolves_phase: 13` declared in the todo frontmatter at the time of capture. Will move to `.planning/todos/completed/` after Phase 13 ships (per D-09 step 3).

</deferred>

---

*Phase: 13-inner-ring-ux-symmetry*
*Context gathered: 2026-05-12*
