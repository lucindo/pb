# Phase 36: Housekeeping bookkeeping reset - Discussion Log

> **Audit trail only.** Do not use as input to planning, research, or execution agents.
> Decisions are captured in CONTEXT.md — this log preserves the alternatives considered.

**Date:** 2026-05-20
**Phase:** 36-housekeeping-bookkeeping-reset
**Areas discussed:** Restore + archive sequencing, Commit granularity, HOUSE-01/02 generation source, HOUSE-14 push gate

---

## Restore + archive sequencing

### Q1: How should the restore → backfill → archive flow be sequenced for the 6 v1.5 phase dirs (30-35)?

| Option | Description | Selected |
|--------|-------------|----------|
| Single batch | `git restore .planning/phases/` upfront → backfill all artifacts in place → single `git mv .planning/phases/3{0..5}-* .planning/milestones/v1.5-phases/` at end. Working tree restored + dirty in the middle, clean at end. | ✓ |
| Per-phase loop | For each v1.5 phase: restore → backfill → archive. Repeat for next. Working tree close to clean between phases. | |
| Backfill in place from HEAD | No restore — use `git show HEAD:path` to write backfilled artifacts directly into `.planning/milestones/v1.5-phases/`, then `git rm` from `.planning/phases/`. Skips restore but loses rename history. | |

**User's choice:** Single batch (Recommended)
**Notes:** Simpler to reason about, fewer state transitions.

### Q2: Archive shape — what content carries through to `.planning/milestones/v1.5-phases/`?

| Option | Description | Selected |
|--------|-------------|----------|
| Full content, mirror v1.1-phases | Carry every artifact (PLAN/SUMMARY per plan + VALIDATION, SECURITY, VERIFICATION, RESEARCH, REVIEW, UI-SPEC, PATTERNS, HUMAN-UAT, DISCUSSION-LOG, CONTEXT). Matches v1.x convention. | ✓ |
| Trimmed (drop intermediate artifacts) | Carry PLAN + SUMMARY + VALIDATION + SECURITY + VERIFICATION only. Drop RESEARCH/PATTERNS/UI-SPEC/REVIEW/DISCUSSION-LOG/CONTEXT. | |
| PLAN + SUMMARY only | Most aggressive trim — only execution-of-record files. | |

**User's choice:** Full content, mirror v1.1-phases (Recommended)
**Notes:** Preserves full audit trail.

### Q3: Backfilled artifact date convention (VALIDATION.md for 12/33/35, SECURITY.md for 12)?

| Option | Description | Selected |
|--------|-------------|----------|
| Backfill date with retro note | Frontmatter `created: 2026-05-20` + body opening line: "Backfilled retroactively for Phase X (shipped YYYY-MM-DD)". | ✓ |
| Original ship date | Date as-of phase's original ship date. | |
| No date field at all | Drop the date — `git log` is canonical. | |

**User's choice:** Backfill date with retro note (Recommended)
**Notes:** Honest about when the artifact was written; explicit about what it covers.

### Q4: Re-flip note convention for HOUSE-05 / HOUSE-07 (VERIFICATION.md status human_needed → passed)?

| Option | Description | Selected |
|--------|-------------|----------|
| Frontmatter only, no body change | Touch only the status field. Git commit is the audit trail. | ✓ |
| Frontmatter + body footer | Flip status AND append a body footer documenting the re-flip. | |
| Frontmatter + reflip-history block | Add a structured `reflip-history` array in the frontmatter. | |

**User's choice:** Frontmatter only, no body change (Recommended)
**Notes:** Minimal diff.

---

## Commit granularity

### Q1: How should the 14 HOUSE-XX items be packaged into git commits?

| Option | Description | Selected |
|--------|-------------|----------|
| Logical groups, ~7-8 commits | Grouped by activity: restore / backfill VALIDATION+SECURITY / re-flip VERIFICATION / SUMMARY frontmatter / 28 drift / migration test / archive / cleanup. | ✓ |
| 14 atomic commits (1 per HOUSE) | One commit per HOUSE-XX. Maximum traceability. | |
| One big bookkeeping commit | Squash everything into a single commit. | |

**User's choice:** Logical groups, ~7-8 commits (Recommended)
**Notes:** Each commit references its HOUSE-N items in the subject for traceability.

### Q2: Where should the v1→v3 chained migration test (HOUSE-09) live structurally?

| Option | Description | Selected |
|--------|-------------|----------|
| New describe block in storage.test.ts | `describe('migrateEnvelope v1→v3 chained (HOUSE-09)', …)` alongside existing PRACTICE-04 and STRETCH-03 describes. Unit test on `migrateEnvelope`. | ✓ |
| Test against readEnvelope (full path) | Pre-seed localStorage, call readEnvelope(), assert v3 return. Closer to real-user path but couples to localStorage mocking. | |
| Both — unit + integration | Add both. Maximum coverage, possibly more than HOUSE-09 asks for. | |

**User's choice:** New describe block in storage.test.ts (Recommended)
**Notes:** Reuses imports, fixture style, fromVersion: 1 input.

### Q3: Commit message convention?

| Option | Description | Selected |
|--------|-------------|----------|
| `docs(36): …` for all | Every Phase 36 commit uses `docs(36): <subject>`. Exceptions: `test(36): …` for the test, `chore(36): gitignore .claude/` for the .gitignore line. | ✓ |
| Mixed by content type | `docs(36)` for doc backfills, `chore(36)` for restore + archive + cleanup, `test(36)` for migration test. | |
| All `chore(36): …` | Treat everything as chore-class. | |

**User's choice:** `docs(36): …` for all (Recommended)
**Notes:** Matches existing repo style.

---

## HOUSE-01/02 generation source

### Q1: How should Phase 12 VALIDATION.md and SECURITY.md be generated?

| Option | Description | Selected |
|--------|-------------|----------|
| Run gsd orchestrators | Run `/gsd-validate-phase 12` and `/gsd-secure-phase 12`. Produces canonical artifacts identical in shape to Phases 13+. | ✓ |
| Hand-write from PLAN | Read 12-01-PLAN.md directly, hand-write the artifacts. Faster but non-canonical shape. | |
| Hybrid — orchestrator + manual fixup | Run orchestrators, then hand-edit. Slowest path. | |

**User's choice:** Run gsd orchestrators (Recommended)
**Notes:** Matches the existing artifact contract.

### Q2: Same approach for Phase 33 and Phase 35 VALIDATION.md (HOUSE-03, HOUSE-04)?

| Option | Description | Selected |
|--------|-------------|----------|
| Same approach — run gsd-validate-phase | Run `/gsd-validate-phase 33` and `/gsd-validate-phase 35`. Consistent with Phase 12 path. | ✓ |
| Run with --auto | Same gsd command but with `--auto`. Faster, but may not skip the right prompts. | |
| Hand-write for 33/35 (since smaller scope) | Hand-write the Nyquist tables directly. Inconsistent with Phase 12 path. | |

**User's choice:** Same approach — run gsd-validate-phase (Recommended)
**Notes:** Success criterion #1 explicitly cites these two as the verification.

### Q3: Gap-fill policy if validator surfaces uncovered Nyquist points?

| Option | Description | Selected |
|--------|-------------|----------|
| Fix at execution time | Planner spawns gsd-nyquist-auditor with gap-filling enabled to write test + re-run validation in-phase. Phase 36 closes only when all three VALIDATION.md files read `passed`. | ✓ |
| Document the gap, defer the fix | Write gaps into VALIDATION.md as `status: partial` and defer. Conflicts with success criterion #1. | |
| Stop and ask operator | Halt and surface to operator for case-by-case decision. | |

**User's choice:** Fix at execution time (Recommended)
**Notes:** Honors success criterion #1.

### Q4: Phase 12 SECURITY.md — inherit inline threats or regenerate?

| Option | Description | Selected |
|--------|-------------|----------|
| Auditor regenerates from code | `gsd-security-auditor` re-derives threat model from implemented code. Inline 12-01-PLAN.md notes are advisory. | ✓ |
| Inherit inline threats verbatim | SECURITY.md echoes 12-01-PLAN.md threats 1:1, then auditor adds mitigations column. | |
| Hybrid — PLAN notes seeded + auditor extension | Seed with inline threats, then auditor adds. Most thorough but non-obvious diff. | |

**User's choice:** Auditor regenerates from code (Recommended)
**Notes:** Cleaner artifact, may surface threats the original PLAN missed.

---

## HOUSE-14 push gate

### Q1: What gates must pass before `git push origin main`?

| Option | Description | Selected |
|--------|-------------|----------|
| Full green-gate: tsc && lint && build && test | Run full `npm run check` (or equivalent). Preserves v1.0.1 POLISH-09 per-commit green-gate invariant. ~1-2 min. | ✓ |
| Test-only gate (skip lint/build) | Only run the test suite. Faster but breaks invariant. | |
| No gate — doc-only commits | Push immediately. Trust the test commit ran the suite. | |

**User's choice:** Full green-gate: tsc && lint && build && test (Recommended)
**Notes:** Preserves the per-commit green-gate invariant verbatim at the push boundary.

### Q2: Per-commit or once-before-push?

| Option | Description | Selected |
|--------|-------------|----------|
| Once before push | Run gate once after the last bookkeeping commit, immediately before push. | ✓ |
| After each source-touching commit | Run after commit 6 (HOUSE-09 test) AND after the final cleanup commit. | |
| Per-commit (all 7-8) | Strict per-commit invariant. ~7-8x cost. | |

**User's choice:** Once before push (Recommended)
**Notes:** Only commit 6 touches src/ — single run sufficient.

### Q3: Recovery posture if green-gate fails before push?

| Option | Description | Selected |
|--------|-------------|----------|
| Fix in a new commit, re-run gate, push | Add a fix-up commit, re-run gate, push. Preserves all prior commits. | ✓ |
| Amend the offending commit | Use `git commit --amend`. Cleaner history but user avoids amends. | |
| Reset, rebuild, push | Most invasive — risks lost work. | |

**User's choice:** Fix in a new commit, re-run gate, push (Recommended)
**Notes:** Matches the user's amend-avoidance preference.

### Q4: Push command + post-push verification?

| Option | Description | Selected |
|--------|-------------|----------|
| Plain push, no post-push checks | `git push origin main` after green-gate. Phase 36 closes when push succeeds. | ✓ |
| Push + verify origin HEAD matches local | `git ls-remote origin main` to confirm match. | |
| Push + display post-push status | `git log origin/main..HEAD` + `git status` for clean tree. | |

**User's choice:** Plain push, no post-push checks (Recommended)
**Notes:** Repo has no CI gates beyond the local green-gate.

---

## Claude's Discretion

- Exact wording of every commit subject line (planner can tighten to match recent repo style).
- Whether the cleanup commit (HOUSE-11/12/13) ships as one combined commit or splits.
- Whether to fold the `36-CONTEXT.md` / `36-DISCUSSION-LOG.md` / `36-PLAN.md` artifacts into a single `docs(36): open phase` commit at phase start or let `/gsd-plan-phase` and the executor handle them normally.
- The exact `requirements-completed` array values for each backfilled SUMMARY (HOUSE-06) — derived from each VERIFICATION.md audit table.

## Deferred Ideas

- **v1.3-phases / v1.4-phases archives missing.** Not in HOUSE-10 scope. Candidate for v2.0 milestone close or Phase 44.
- **Stale frontmatter convention divergence** (dashed vs underscored field names across phase SUMMARYs). Candidate for POLISH-07.
- **Phase 28 archive** — if HOUSE-08 forces a temporary restore, consider whether to archive 28/29 to `.planning/milestones/v1.4-phases/` as a side benefit. Planner discretion.
- **Post-push verification ritual** — could be added if a future bookkeeping reset needs stronger guarantees once CI exists.
