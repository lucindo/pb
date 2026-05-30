---
phase: 55
slug: comment-de-archaeology
created: 2026-05-30
status: draft
nyquist_applicable: false
---

# Phase 55 Validation Strategy — Comment de-archaeology

## Why standard Nyquist sampling does not apply

This phase changes **comments only** — no runtime signal exists to sample at 2× its
frequency. The "signal" is static: *did any executable token change?* Validation
therefore collapses to two per-plan checks plus the milestone green gate.

## Validation Architecture (per plan)

### 1. Comment-only-diff invariant (the load-bearing check)

Every changed line must live inside a comment. Concretely: stripping all comments from
each touched file BEFORE and AFTER the edit must yield a **byte-identical** result.

- **Mechanism:** for each file in the plan's `files_modified`, compare the
  comment-stripped form of the pre-edit and post-edit versions; they must match exactly.
  A practical proxy: `git diff` for the plan touches only comment lines / trailing-comment
  fragments — no executable token (identifier, literal, operator, JSX) changes.
- **Trailing-comment landmine (D-09):** lines like `defaultValue: true, // <tag> …` must
  have only the comment edited; the `true` token and the comma stay untouched.
- This satisfies **BEHAVIOR-01** structurally — comments are inert, so a comment-only diff
  is proof of no user-facing behavior change.

### 2. Green gate (QUAL-01)

On every commit:
- `npm run build` (`tsc -b && vite build`) exits 0
- `npm run lint` exits 0
- `npm run test:run` — curated suite passes
- `dependencies` stays `react` + `react-dom` (zero net-new runtime deps)

## Completeness check (COMMENT-01 / COMMENT-02)

After the full sweep, grep across `src/` must return **zero** matches for the planning-tag
taxonomy (`D-xx`, `WR-xx`/`DS-WR-xx`, `Phase NN`, `Blocker #N`, `Pitfall N`, `spike NNN`,
dated "kitchen-sink fix") and zero stale line-number refs (`L###`, `formerly at L###`,
`mirror X L###`) — except genuinely-current references the team chooses to keep, and the
out-of-scope `// TODO: native-speaker review` I18N-04 markers.

## TEST-01 boundary

Research confirmed **no test asserts on comment text** (the marker-guard test family scans
source for shipped string *values*, not comments). Comment edits do not break tests. This
phase strips planning tags inside test-file comments (D-01) but does **not** delete or
rewrite any test (D-02) — test deletion belongs to per-phase TEST-01 / Phase 61 TEST-02.

---

*Validation strategy for Phase 55. Comment-only phase — behavior safety is proven by the
comment-only-diff invariant, not by runtime sampling.*
