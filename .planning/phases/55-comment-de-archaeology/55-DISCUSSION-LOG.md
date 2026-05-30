# Phase 55: Comment de-archaeology - Discussion Log

> **Audit trail only.** Do not use as input to planning, research, or execution agents.
> Decisions are captured in CONTEXT.md — this log preserves the alternatives considered.

**Date:** 2026-05-30
**Phase:** 55-comment-de-archaeology
**Areas discussed:** Test-file comment scope, Load-bearing cut boundary, Historical-rationale destination, Spike-geometry provenance

---

## Test-file comment scope

| Option | Description | Selected |
|--------|-------------|----------|
| Strip tags in tests too | Same drop-the-tag/keep-the-why rule on test comments now; one codebase-wide sweep; Phase 61 still owns deleting garbage tests | ✓ |
| Defer test comments to Phase 61 | Phase 55 touches only non-test source (77 files); leave test comments to the test-curation sweep | |
| Strip only clearly-dead tests' tags | Strip source + surviving tests, skip files Phase 61 likely deletes; requires guessing Phase 61's outcome | |

**User's choice:** Strip tags in tests too.
**Notes:** Comment-stripping is not split by file type. Phase 55 does not delete/rewrite tests — that stays with TEST-01 / Phase 61 TEST-02.

---

## Load-bearing cut boundary

| Option | Description | Selected |
|--------|-------------|----------|
| Keep only future-breaking invariants | Keep+rephrase prose that explains something a future editor would break; delete change/parity narration | ✓ |
| Conservative — keep all prose | Strip only tag prefix + line-refs, keep every sentence | |
| Aggressive — cut unless load-bearing | Delete anything not strictly required; risks removing valuable why | |

**User's choice:** Keep only future-breaking invariants.
**Notes:** Audit explicitly says "much of the why is valuable" — iOS gesture-token sequencing, TOCTOU envelope, silent-WAV rationale stay (rephrased). Parity/modeling notes ("DS-WR-06 parity", "modeled on recordResonantSession") delete outright.

---

## Historical-rationale destination

| Option | Description | Selected |
|--------|-------------|----------|
| Delete — git + milestone docs hold it | Drop pure history; no new file to maintain | ✓ |
| Extract to docs/audio-architecture.md | Create one architecture doc for the narrative | |
| Case-by-case | Delete most, extract to docs where it aids future debugging | |

**User's choice:** Delete — git + milestone docs hold it.
**Notes:** A new docs essay would become next year's archaeology. Invariant portions of the big essays stay inline (rephrased); only residual history leaves.

---

## Spike-geometry provenance

| Option | Description | Selected |
|--------|-------------|----------|
| Strip ref; keep what-it-controls if non-obvious | Delete L### + spike/index.html pointer (dead files); keep present-tense what-it-controls note for non-obvious numbers | ✓ |
| Keep non-line provenance tag | Strip L### but keep "from spike-010 Monochrome Zen" breadcrumb | |
| Strip everything, no replacement | Delete whole provenance comment incl. what-it-controls note | |

**User's choice:** Strip ref; keep what-it-controls if non-obvious.
**Notes:** Spike source files were removed in Phase 36 — the refs already point at nothing. Locked geometry values stay verbatim; only provenance comments change.

---

## Claude's Discretion

- Per-comment wording of rephrased present-tense invariants.
- File order / batching across the sweep.
- Whether a borderline magic-number note is "non-obvious enough" to keep a what-it-controls line.
- Verification method (comment-only diff confirmation + green gate) — bounded by the milestone BEHAVIOR-01/QUAL-01 gate.

## Deferred Ideas

- Deleting/rewriting garbage tests → Phase 61 (TEST-02) + per-phase TEST-01.
- 19 `// TODO: native-speaker review` markers → I18N-04 carry-forward (out of scope).
- Storage / view-model / shell / frame / component de-duplication → Phases 56–60.
