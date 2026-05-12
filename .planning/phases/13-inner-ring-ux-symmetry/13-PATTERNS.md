---
phase: 13-inner-ring-ux-symmetry
created: 2026-05-12
milestone: v1.1
mapper: gsd-pattern-mapper
---

# Phase 13: Inner-Ring UX Symmetry — Pattern Map

**Mapped:** 2026-05-12
**Files analyzed:** 9 (all edit-only — no new files)
**Analogs found:** 9 / 9 (each target is anchored to an in-file or prior-phase analog)

> **Edit-only phase.** Per 13-CONTEXT.md, no new files are created. "Closest analog" for each target is either the same file (in-file rule/comment style being extended) or a prior-phase precedent (Phase 12 D-02 callout posture, Phase 12 D-12 plan packaging). All excerpts below are quoted from the actual current state of the target files so the planner can copy the exact phrasing and indentation.

## File Classification

| Target File | Edit Type | Role | Closest Analog | Match Quality |
|-------------|-----------|------|----------------|---------------|
| `src/styles/theme.css:154-158` | CSS rule add (inside existing `@media`) | stylesheet — reduced-motion gate | Same block: `dialog.modal-fade { transition: none !important }` rule at lines 155-157 | exact (same block, same indent, same purpose) |
| `src/styles/theme.css:99-107` | JSDoc comment rewrite | stylesheet — JSDoc above rule | Same file: existing JSDoc block-comment style at lines 99-107 + `:142-153` | exact (same comment idiom in same file) |
| `src/styles/theme.css:142-153` | JSDoc comment extend (1 line) | stylesheet — JSDoc above `@media` | Same block: existing F3 / CR-01 bullets at lines 144-153 | exact (extend the bullet list) |
| `.planning/ROADMAP.md` §Phase 13 (lines 47, 57-68, 161) | Doc rewrite (Goal + SC1 + SC2) | planning artifact — roadmap entry | Same file: §Phase 14/15/16 entries at lines 69-104 (Goal + Success Criteria layout) | exact (preserve the §Phase N structural template) |
| `.planning/REQUIREMENTS.md` line 16 (WARMUP-01) | Doc rewrite (bullet text only) | planning artifact — requirements list | Same file: surrounding `INFRA-*` / `THEME-*` bullets at lines 20-31 | exact (preserve the `**ID**: text` bullet format) |
| `.planning/research/FEATURES.md` lines 41, 103-105, 114, 125, 152, 206-209 | Append `[2026-05-12 update]` callouts | planning artifact — historical research (frozen-with-annotation) | `REVIEW.md:391` `[2026-05-12 update]` addendum (Phase 12 D-02 precedent) | exact (same callout idiom established 2026-05-12) |
| `.planning/research/ARCHITECTURE.md` lines 21, 45-48, 310-315, 383, 432 | Append `[2026-05-12 update]` callouts | planning artifact — historical research (frozen-with-annotation) | `REVIEW.md:391` `[2026-05-12 update]` addendum (Phase 12 D-02 precedent) | exact (same callout idiom) |
| `.planning/STATE.md` line 74 | Pending-Todos sub-bullet rewrite | planning artifact — state ledger | Same file: surrounding Pending-Todos bullets at lines 72-75 | exact (preserve `- <text>` bullet shape) |
| `.planning/todos/pending/2026-05-11-...md` → `.planning/todos/completed/` | File move (mv-only, no content change) | planning artifact — todo lifecycle | `.planning/todos/completed/2026-05-11-missing-favicon-404-in-console.md` (Phase 12 ASSETS-01 precedent — same dated-todo, same closure move) | exact (Phase 12 ASSETS-01 closed its todo by this exact move) |

---

## Pattern Assignments

### `src/styles/theme.css:154-158` — ADD `.orb-ring--inner { display: none; }` (D-03)

**Analog:** Same block. The `dialog.modal-fade { transition: none !important }` rule already inside `@media (prefers-reduced-motion: reduce)` is the precedent for adding a second selector. New rule joins as a sibling at the same indent.

**Current state of the block** (`src/styles/theme.css:154-158`):
```css
@media (prefers-reduced-motion: reduce) {
  dialog.modal-fade {
    transition: none !important;
  }
}
```

**Pattern to copy — sibling rule at the same indent depth (2 spaces):**
```css
@media (prefers-reduced-motion: reduce) {
  dialog.modal-fade {
    transition: none !important;
  }

  .orb-ring--inner {
    display: none;
  }
}
```

**Constraints from in-file pattern:**
- 2-space indentation inside `@media` (matches existing `dialog.modal-fade` block).
- Single property per declaration (no shorthand collapse).
- No `!important` — `display: none` is not in conflict with any other rule (the default `.orb-ring--inner` rule at line 108 only sets `opacity` / `border-*` / `transition`); the cascade already wins for the `@media` branch.
- D-04 selector form: `.orb-ring--inner` (not scoped to `[data-phase='out']`) — matches the broader-intent posture of `dialog.modal-fade` (no `[open]` qualifier — applies to all states).

---

### `src/styles/theme.css:99-107` — REWRITE JSDoc above `.orb-ring--inner` (D-05)

**Analog:** Same file's JSDoc block-comment idiom (used at lines 99-107 today and at lines 142-153 for the `@media` block). The pattern is:
1. Leading-line ticket/phase tag (`260510-tc9 Bug 1`, `F3`, `D-05, D-07, D-09`).
2. Bulleted prose with hanging indent under `-`.
3. Cross-references to other rules (`see .orb-layer--in / .orb-layer--out`) by selector name.

**Current state** (`src/styles/theme.css:99-107`):
```css
/* 260510-tc9 Bug 1 (iter 3): inner reference ring is the Out-phase arrival cue.
   - Hidden by default (opacity 0) so it does not distract during In phase or the
     3-2-1 lead-in countdown (where there is no data-phase attribute on root).
   - Fades in/out at the same 400ms ease-in-out as the orb-layer phase crossfade
     (see .orb-layer--in / .orb-layer--out), so the ring appears in lockstep with
     the orb shifting from teal to blue and recedes back during the next In flip.
   - Reduced-motion: the transition is intentionally PRESERVED, mirroring the
     orb-layer--out reduced-motion contract (D-07) — the fade-in IS the phase
     indicator when the orb is locked at MID_SCALE. */
```

**Pattern to copy** — keep the `/*` … `*/` block form, the bullet-with-hanging-indent style, and the `(D-XX)` decision tag style. New content must:
- Preserve the lead-line ticket/phase tag (rewrite as `Phase 13 (D-03, D-05): ...`).
- Keep the "Hidden by default / Fades in/out" history bullets describing **normal-motion** behavior verbatim (D-01: normal motion is correct as-is).
- Replace the third bullet ("Reduced-motion: the transition is intentionally PRESERVED ...") with a new bullet stating: (a) under `prefers-reduced-motion: reduce` the ring is suppressed via `display: none` in the `@media` block below; (b) `.orb-layer--out` opacity crossfade alone carries the substitute phase indicator (cite D-07); (c) historical note: the ring was originally kept under reduced motion per Phase 7 UAT 2026-05-11; user UAT correction 2026-05-12 reversed this.

**Constraints from in-file pattern:**
- Block comment, not `//` line comments.
- Bullets prefixed with `- ` (dash + space), continuation lines indented 5 columns.
- Decision tags in parentheses `(D-07)` not brackets.
- Keep cross-references to selectors by their actual selector name (e.g., `.orb-layer--out`, not "the outer layer").

---

### `src/styles/theme.css:142-153` — EXTEND `@media` block JSDoc with one line (D-06)

**Analog:** Same comment block. Existing bullets at lines 144-153 use the same `- ` bullet form as the `.orb-ring--inner` comment above.

**Current state** (`src/styles/theme.css:142-153`):
```css
/* Reduced-motion (D-05, D-07, D-09):
   - The .orb scale transition was removed (see .orb rule above), so this block
     no longer needs to suppress it. Kept for the dialog modal fade only.
   - Intentionally PRESERVE the .orb-layer--out opacity transition — it is the
     substitute phase indicator under reduced-motion (D-07).
   - CR-01: Do NOT set `transform: none !important` here. BreathingShape sets the
     reduced-motion fixed scale via inline `transform: scale(var(--orb-scale-mid))`
     when usePrefersReducedMotion() is true. Inline styles do NOT win over an
     `!important` stylesheet rule, so a `transform: none !important` here would
     silently nuke the JS-controlled MID_SCALE and render the orb at scale(1).
   - F3: dialog modal fade also disabled here (per UI-SPEC: "in reduced-motion,
     dialog appears immediately"). */
```

**Pattern to copy** — append one new bullet using the same `- <Phase-tag>: <prose>` shape as the existing `- F3:` and `- CR-01:` bullets. Suggested wording (planner may tighten):
```css
   - Phase 13 (D-03): .orb-ring--inner is suppressed (display: none) — the inner
     reference ring carries no information when the orb is locked at MID_SCALE;
     the .orb-layer--out opacity crossfade remains the sole substitute phase cue.
```

**Constraints from in-file pattern:**
- Insert the new bullet AFTER the `F3:` bullet (chronological order — F3 < Phase 13).
- The leading `Reduced-motion (D-05, D-07, D-09):` header tag may be extended to `(D-05, D-07, D-09, D-03)` — but D-06 explicitly says "extend with one line", so the header tag rewrite is at planner discretion.
- Preserve the `CR-01: Do NOT set transform: none !important here` bullet **verbatim** — D-06 calls this out as load-bearing for the BreathingShape inline-style MID_SCALE override.

---

### `.planning/ROADMAP.md` §Phase 13 (lines 47, 57-68, 161) — REWRITE Goal + SC1 + SC2 (D-08)

**Analog:** Same file. Surrounding §Phase 14/15/16 entries (lines 69-104) preserve the canonical layout: `**Goal**:` line, `**Depends on**:`, `**Requirements**:`, `**Success Criteria** (what must be TRUE):` numbered list, `**Plans**: TBD`, optional `**UI hint**: yes`.

**Current state of §Phase 13** (`.planning/ROADMAP.md:57-67`):
```markdown
### Phase 13: Inner-Ring UX Symmetry
**Goal**: The orb shows a symmetric inner-ring arrival cue at both the In-phase and Out-phase boundaries, completing the visual polish carry-forward from Phase 5.1.
**Depends on**: Phase 12 (v1.0.1 baseline — all phases complete)
**Requirements**: WARMUP-01
**Success Criteria** (what must be TRUE):
  1. An inner-ring arrival cue animates at the In-phase start boundary (mirroring the existing `[data-phase='out'] .orb-ring--inner` pattern).
  2. The existing Out-phase inner-ring behavior is pixel-identical to the v1.0.1 baseline (zero regression).
  3. The change touches only CSS and `BreathingShape.tsx`; no storage, audio, timing, or hook files are modified.
  4. `tsc && lint && build && test` exit 0 after the change (per-commit green-gate maintained).
**Plans**: TBD
**UI hint**: yes
```

**Current state of the v1.1 index entry** (`.planning/ROADMAP.md:47`):
```markdown
- [ ] **Phase 13: Inner-Ring UX Symmetry** - Pure CSS + minimal TSX warm-up; symmetric arrival cue at both In and Out phase boundaries
```

**Current state of the traceability row** (`.planning/ROADMAP.md:161`):
```markdown
| 13. Inner-Ring UX Symmetry | v1.1 | 0/? | Not started | - |
```

**Pattern to copy** — keep the structural template (Goal/Depends/Requirements/SC/Plans/UI hint lines); rewrite only the prose per D-08:
- **Goal**: "Under `prefers-reduced-motion: reduce`, the inner reference ring (`.orb-ring--inner`) is no longer rendered — the `.orb-layer--out` opacity crossfade remains the sole reduced-motion phase indicator (D-07 preserved)."
- **SC1**: "Under `prefers-reduced-motion: reduce`, the inner reference ring is not drawn in any state (Out, In, lead-in)."
- **SC2**: "Out-phase inner-ring behavior under **normal motion** is pixel-identical to v1.0.1 baseline (only the reduced-motion branch changes)."
- **SC3 + SC4**: UNCHANGED verbatim per D-08.
- **Line 47 v1.1 index entry**: rewrite tagline to match new goal (suggest: "Reduced-motion inner-ring suppression — `.orb-layer--out` crossfade restored as sole substitute phase cue").
- **Line 161 traceability row**: phase NAME stays as-is per D-13 (no rename mid-milestone); only the status column flips Not started → In progress → Complete on close.

**Constraints from in-file pattern:**
- Two-space indent on numbered SC list items (`  1.`, `  2.`).
- Markdown bullets in lines 45-53 use `- [ ] **Phase N: Name** - <tagline>`.
- The §Phase N H3 header text MAY be updated per D-13 planner discretion ("Inner-Ring Reduced-Motion Suppression"), but slug/directory stays.

---

### `.planning/REQUIREMENTS.md` line 16 (WARMUP-01) — REWRITE bullet text (D-08)

**Analog:** Same file. Surrounding `INFRA-*` / `THEME-*` bullets at lines 20-31 use the format `- [ ] **ID**: <text>`.

**Current state** (`.planning/REQUIREMENTS.md:16`):
```markdown
- [ ] **WARMUP-01**: User sees a symmetric inner-ring arrival cue at both In-phase and Out-phase boundaries of the orb (mirrors existing `[data-phase='out'] .orb-ring--inner` pattern; pure CSS + minor `BreathingShape.tsx` change; no storage/audio/timing touch).
```

**Pattern to copy** — keep the `- [ ] **WARMUP-01**: ` prefix, rewrite the trailing description per D-08:
```markdown
- [ ] **WARMUP-01**: Under `prefers-reduced-motion: reduce`, the inner reference ring (`.orb-ring--inner`) is not rendered — `.orb-layer--out` opacity crossfade alone carries the substitute phase indicator (D-07). Pure CSS change in `src/styles/theme.css` `@media (prefers-reduced-motion: reduce)` block; no TSX, storage, audio, timing touch.
```

**Constraints from in-file pattern:**
- Single-line bullet (no line breaks inside the description).
- Backticks around code identifiers (`prefers-reduced-motion: reduce`, `.orb-ring--inner`, `.orb-layer--out`, file paths).
- Decision tag `(D-07)` in parentheses.
- Traceability table row at line 99 (`WARMUP-01 → Phase 13`) is unchanged — only status column flips on phase close per D-08 / canonical_refs.

---

### `.planning/research/FEATURES.md` lines 41, 103-105, 114, 125, 152, 206-209 — APPEND `[2026-05-12 update]` callouts (D-08)

**Analog:** `REVIEW.md:391` — the Phase 12 D-02 precedent for `[YYYY-MM-DD update]` addenda on frozen historical docs.

**Reference exemplar** (`REVIEW.md:391`):
```markdown
[2026-05-12 update] Overtaken by Phase 9 AUDIO-02 — `audio.audioNow()` is the documented seam for the caller-side past-time clamp at App.tsx:549. HYGIENE-01 closed-no-op in 12-CONTEXT.md.
```

**Pattern shape to copy** for every FEATURES.md / ARCHITECTURE.md callout:
```
[2026-05-12 update] <one-sentence correction>. <pointer to the canonical replacement source>.
```

**Per-line application (concrete targets):**

| Line | Current claim (paraphrased) | Callout to append |
|------|------------------------------|-------------------|
| FEATURES.md:41 | "Inner-ring symmetry (warm-up) ... adds `orb-ring--in-arrival` that fades in only at `[data-phase='in']`" | `[2026-05-12 update] Symmetric-cue framing rejected at discuss-phase; actual scope is reduced-motion `.orb-ring--inner { display: none }`. See `.planning/phases/13-inner-ring-ux-symmetry/13-CONTEXT.md` D-01.` |
| FEATURES.md:103-105 | Dependency diagram showing "Inner-ring UX symmetry ... add [data-phase='in'] .orb-ring--outer fade-in rule" | Append callout under the block stating the rule add was rejected; reduced-motion suppression is the implementation. Cite 13-CONTEXT.md D-03. |
| FEATURES.md:114 | "Inner-ring symmetry has zero dependency risk: it is a pure CSS + JSX addition" | `[2026-05-12 update] Implementation is pure CSS only (no JSX addition); a single rule inside the existing `@media (prefers-reduced-motion: reduce)` block. See 13-CONTEXT.md D-03.` |
| FEATURES.md:125 | "[x] Inner-ring UX symmetry — Add `[data-phase='in']` CSS rule mirroring ... outer ring fade-in on In ..." | Append callout: feature shipped as reduced-motion `.orb-ring--inner` suppression; the symmetric-arrival framing is annotated, not implemented. Cite 13-CONTEXT.md D-01. |
| FEATURES.md:152 | Prioritization-matrix row "Inner-ring UX symmetry | LOW-MEDIUM | LOW | P0 (warm-up, land first)" | Append callout: priority/value/cost unchanged; scope reduced to one CSS line per 13-CONTEXT.md D-03. |
| FEATURES.md:206-209 | "Inner-Ring UX Symmetry (warm-up) ... Touches: theme.css + BreathingShape.tsx ... Risk: Negligible." | Append callout under the §: "Touches" reduced to theme.css only (no BreathingShape.tsx edit); risk unchanged. Cite 13-CONTEXT.md D-03 / canonical_refs "Source NOT edited". |

**Constraints from in-file pattern (per Phase 12 D-02 precedent):**
- Callout is a single new line / paragraph appended at the END of the affected paragraph or row — do NOT rewrite existing prose.
- Leading marker is **literal** `[2026-05-12 update]` (matching REVIEW.md:391 exactly — square brackets, space, lowercase "update").
- Always include a forward pointer to the canonical correction source (here: `.planning/phases/13-inner-ring-ux-symmetry/13-CONTEXT.md` D-NN).
- Preserve all historical text verbatim — readers of v1.1-research must still be able to see the original framing AND its correction.

---

### `.planning/research/ARCHITECTURE.md` lines 21, 45-48, 310-315, 383, 432 — APPEND `[2026-05-12 update]` callouts (D-08)

**Analog:** Same as FEATURES.md — `REVIEW.md:391` Phase 12 D-02 callout idiom.

**Per-line application:**

| Line | Current claim (paraphrased) | Callout to append |
|------|------------------------------|-------------------|
| ARCHITECTURE.md:21 | "BreathingShape (variant dispatch) ← CUST-03 + inner-ring fix" | `[2026-05-12 update] The "inner-ring fix" is reduced-motion suppression in theme.css only; no BreathingShape.tsx edit. See 13-CONTEXT.md D-01.` |
| ARCHITECTURE.md:45-48 | "Issue B carry-forward from Phase 5.1: ... inner ring appears throughout the Out phase rather than appearing precisely at MIN_SCALE. The fix is contained entirely in BreathingShape.tsx." | `[2026-05-12 update] Issue B was reduced-motion-only in actual user UAT (2026-05-12); normal-motion inner-ring behavior is correct as-is. Fix is one CSS rule in theme.css `@media (prefers-reduced-motion: reduce)`, not BreathingShape.tsx. See 13-CONTEXT.md D-01 / D-03.` |
| ARCHITECTURE.md:310-315 | "Phase A — Inner-ring UX symmetry (warm-up) ... Investigate exact inner-ring arrival timing ... Fix inner-ring coincidence with orb edge at MIN_SCALE" | Append callout: scope reduced — no timing investigation, one CSS rule (`display: none`) under reduced motion. Cite 13-CONTEXT.md D-03. |
| ARCHITECTURE.md:383 | "BreathingShape | Dispatch to body/lead-in | Dispatch by variant prop; inner-ring fix" | Append callout: inner-ring fix lives in theme.css, not BreathingShape.tsx. Cite 13-CONTEXT.md D-01. |
| ARCHITECTURE.md:432 | "src/components/BreathingShape.tsx | Inner-ring fix; variant dispatch | LOW" | Append callout: BreathingShape.tsx receives no Phase 13 edit; theme.css carries the change. Cite 13-CONTEXT.md D-01. |

**Constraints (identical to FEATURES.md application):** see preceding section. NOTE: `.planning/research/PITFALLS.md` lines 98, 322 are UNCHANGED per D-08 — they apply to CUST-03 (Phase 17), not WARMUP-01.

---

### `.planning/STATE.md` line 74 — REWRITE Pending-Todos sub-bullet (D-08)

**Analog:** Same file. Surrounding bullets at lines 72-75 are flat `- <text>` bullets under `### Pending Todos`.

**Current state** (`.planning/STATE.md:74-75`):
```markdown
- Phase 13 planning: `/gsd-plan-phase 13`
- Carry-forward from v1.0.1: `2026-05-11-reduced-motion-still-shows-out-phase-boundary-cue` — note: Phase 13 (WARMUP-01) adds In-phase inner ring; verify this does not worsen the out-phase boundary cue reduced-motion issue.
```

**Pattern to copy** — keep `- <text>` shape, rewrite the carry-forward sub-bullet per D-08:
```markdown
- Carry-forward from v1.0.1: `2026-05-11-reduced-motion-still-shows-out-phase-boundary-cue` — RESOLVED directly by Phase 13 (WARMUP-01 reframed as reduced-motion `.orb-ring--inner { display: none }`; no separate verification step). Todo moves to `.planning/todos/completed/` on phase close per 13-CONTEXT.md D-09.
```

**Constraints from in-file pattern:**
- Backticks around todo filename and code identifiers.
- Single-line bullet (no embedded line break).
- The first bullet at line 74 ("Phase 13 planning: `/gsd-plan-phase 13`") is removed entirely when the phase actually enters planning — handled by the orchestrator, not Phase 13 plan work.

---

### `.planning/todos/pending/2026-05-11-reduced-motion-still-shows-out-phase-boundary-cue.md` — MOVE to `completed/` (D-09)

**Analog:** `.planning/todos/completed/2026-05-11-missing-favicon-404-in-console.md` — Phase 12 ASSETS-01 used this exact same dated-todo lifecycle (folded into a phase, then `mv pending/ → completed/` on close).

**Pattern to copy** — git-tracked file move with no content edit:
```bash
git mv .planning/todos/pending/2026-05-11-reduced-motion-still-shows-out-phase-boundary-cue.md \
       .planning/todos/completed/2026-05-11-reduced-motion-still-shows-out-phase-boundary-cue.md
```

**Constraints from prior-phase pattern:**
- `git mv` (NOT `mv` + `git add`) to preserve rename detection in `git log --follow`.
- File CONTENT is unchanged — the `resolves_phase: 13` frontmatter declared at capture time is the only required machine-readable marker; readers learn the resolution path from 13-CONTEXT.md / 13-PLAN.md.
- This move is the THIRD commit in the plan per D-09 packaging (after doc rewrites and CSS change).

---

## Shared Patterns

### 1. `[2026-05-12 update]` callout idiom (Phase 12 D-02 precedent)

**Source:** `REVIEW.md:391`
**Apply to:** All FEATURES.md and ARCHITECTURE.md targets in D-08.

**Exemplar:**
```markdown
[2026-05-12 update] Overtaken by Phase 9 AUDIO-02 — `audio.audioNow()` is the documented seam for the caller-side past-time clamp at App.tsx:549. HYGIENE-01 closed-no-op in 12-CONTEXT.md.
```

**Shape:** `[YYYY-MM-DD update] <one-sentence correction>. <forward pointer to canonical source>.`
- Always cite the canonical replacement source by filepath and decision tag.
- Append at end of paragraph; never overwrite the historical text.
- Single sentence (or two short ones) — these are addenda, not rewrites.

### 2. Per-commit green-gate (Phase 7 D-09 / Phase 11 D-17 / Phase 12 D-15 precedent)

**Source:** `.planning/milestones/v1.0.1-phases/12-assets-content-hygiene-cleanup/12-CONTEXT.md:65`
**Apply to:** All three Phase 13 commits (doc rewrite → CSS change → todo move).

**Exemplar text** (Phase 12 D-15):
> "Phase 7 D-09 / Phase 11 D-17 — every commit boundary inside Phase 12: `tsc --noEmit` exits 0, `npm run lint` exits 0, `npm run build` exits 0, full Vitest suite passes (400/400 post-Phase-11 baseline + ~6-9 new HYGIENE-02 cases → target ~406-409). A commit that breaks any is rolled back, not patched-forward."

**Phase 13 specialization (D-10):** baseline is **409/409 v1.0.1 Vitest**. No new tests required per D-07 (1 optional gap-fill case is planner's call). Commands at every commit boundary:
```bash
npm run tsc -- --noEmit && npm run lint && npm run build && npm run test
```
A commit that breaks any is rolled back, not patched-forward.

### 3. Single-plan, single-wave packaging (Phase 12 D-12 precedent)

**Source:** `.planning/milestones/v1.0.1-phases/12-assets-content-hygiene-cleanup/12-CONTEXT.md:57`
**Apply to:** Phase 13 plan structure per D-09.

**Exemplar text** (Phase 12 D-12):
> "Single plan, single wave, five task groups. Files do not overlap: ... Mirrors Phase 11 D-13 single-plan rationale for similarly trivial inter-locked fixes — review surface is small, no inter-task isolation gain from splitting."

**Phase 13 specialization (D-09):** ONE plan, ONE wave, THREE commits in order:
1. **Doc rewrite** (zero-code) — ROADMAP.md §13 + REQUIREMENTS.md WARMUP-01 + FEATURES.md/ARCHITECTURE.md callouts + STATE.md sub-bullet. Lands first so the audit gate reads the corrected SC.
2. **CSS change** — `src/styles/theme.css` rule add (D-03) + comment rewrite (D-05) + comment extend (D-06). Single file edit.
3. **Todo file move** — `git mv pending/...md completed/...md`.

Files do not overlap across commits. Same rationale as Phase 12: review surface is small; splitting buys no isolation.

### 4. CSS block-comment idiom in `theme.css`

**Source:** `src/styles/theme.css:99-107` and `:142-153`
**Apply to:** Both D-05 (rewrite) and D-06 (extend) comment edits.

**Shape constraints (extracted from the two existing blocks):**
- `/*` on its own pseudo-line (or with the first prose word), `*/` on the last line trailing the final prose.
- Lead line tags the source: `260510-tc9 Bug 1 (iter 3): ...`, `F3: ...`, `Reduced-motion (D-05, D-07, D-09): ...`. Phase 13 should use `Phase 13 (D-03, D-05): ...` or extend `(D-05, D-07, D-09)` → `(D-05, D-07, D-09, D-03)` at D-06.
- Bullets prefixed `- `, continuation indented 5 columns.
- Cross-references by literal selector name (`.orb-layer--out`), backtick-quoted only when the comment quotes a CSS-property-value pair (e.g., `` `transform: none !important` ``).

---

## No Analog Found

None. Every Phase 13 target has either an in-file analog (same comment block, same `@media` block) or a prior-phase precedent (Phase 12 D-02 callout, Phase 12 D-12 plan packaging, Phase 12 ASSETS-01 todo lifecycle). This is consistent with the phase's "no novel surface" character.

---

## Metadata

**Analog search scope:**
- `src/styles/theme.css` (full file, 159 lines)
- `.planning/ROADMAP.md` (§Phase 13 + surrounding §Phase 14-16 entries for template confirmation)
- `.planning/REQUIREMENTS.md` (WARMUP-01 bullet + surrounding INFRA-/THEME- bullets for shape confirmation)
- `.planning/STATE.md` (Pending Todos section)
- `.planning/research/FEATURES.md` and `.planning/research/ARCHITECTURE.md` (target lines per 13-CONTEXT.md)
- `REVIEW.md:385-392` (Phase 12 D-02 callout exemplar)
- `.planning/milestones/v1.0.1-phases/12-assets-content-hygiene-cleanup/12-CONTEXT.md` (D-02, D-12, D-15 cross-references)
- `.planning/todos/pending/` and `.planning/todos/completed/` (lifecycle precedent from Phase 12 ASSETS-01)

**Files scanned:** 9 targets + 4 precedent files = 13 read passes (no re-reads).

**Pattern extraction date:** 2026-05-12

**Planner consumption note:** Every edit in Phase 13 is constrained by an existing in-file or prior-phase shape. The planner should reference this PATTERNS.md by section header (e.g., "see PATTERNS.md §`src/styles/theme.css:154-158`") in each plan action — the excerpts here are the literal text to copy or extend.
