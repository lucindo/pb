# Phase 7: Strict Type & Lint Baseline - Discussion Log

> **Audit trail only.** Do not use as input to planning, research, or execution agents.
> Decisions are captured in CONTEXT.md — this log preserves the alternatives considered.

**Date:** 2026-05-11
**Phase:** 07-strict-type-lint-baseline
**Areas discussed:** ESLint preset depth, Test files under strict mode, react-hooks disable audit policy, noUncheckedIndexedAccess blast radius

---

## ESLint preset depth

| Option | Description | Selected |
|--------|-------------|----------|
| strictTypeChecked (full) | Full type-aware preset: `no-floating-promises`, `no-unsafe-assignment`, `no-unsafe-member-access`, `no-unsafe-call`, type-aware `no-unused-vars`. Requires `parserOptions.project`. Catches most. Highest noise + biggest fix scope. | ✓ |
| stylisticTypeChecked | Lighter type-aware preset. Drops `no-unsafe-*` but keeps `no-floating-promises`. Smaller blast radius. Covers IN-08 minimally. | |
| strictTypeChecked minus `no-unsafe-*` | Compromise: keep floating-promise catch, drop noisiest rules. Custom config. | |
| stylisticTypeChecked + selected strict rules | Hand-pick high-value strict rules. Tightest fit to REVIEW.md intent. Most config tuning. | |

**User's choice:** strictTypeChecked (full)
**Notes:** Accept higher up-front fix cost for highest catch rate. Wire `parserOptions.project` (or `projectService: true` if tooling version supports it) to `./tsconfig.app.json` so type-aware rules run.

---

## Test files under strict mode

| Option | Description | Selected |
|--------|-------------|----------|
| Fix inline (single tsconfig) | Keep `src/**/*.test.ts(x)` inside `tsconfig.app.json`. Strict applies to tests + prod. Fix every typing gap. Strictest invariant. | ✓ |
| Split tsconfig.test.json (looser strict) | Carve tests out; relax `noUncheckedIndexedAccess` + `no-unsafe-*` for tests. Production strict, tests practical. | |
| Split tsconfig.test.json (matching strict) | Split for tooling clarity, not relaxation. Same fix cost, cleaner config. | |
| Scope-check first | Count test-only vs prod errors, then decide. Adds ~10 min. | |

**User's choice:** Fix inline (single tsconfig)
**Notes:** Production and tests speak the same type contract. Splitting invites drift. FakeAudioContext polyfill + mocks/spies must satisfy strict.

---

## react-hooks disable audit policy

| Option | Description | Selected |
|--------|-------------|----------|
| Audit each + require inline justification comment | Every surviving `eslint-disable-next-line react-hooks/*` must carry a `// Reason: …` annotation. Unjustified disables removed. Captures Phase 5+ reasoning into source. | ✓ |
| Remove all + re-prove necessity | Remove every disable, re-add only when needed. Cleaner final state but risks losing Phase 5+ intent. | |
| Audit + inline justification + add escape-hatch rule | Custom ESLint rule self-enforces the annotation policy going forward. | |
| Lift all to file-top eslint-disable with table | Replace inline disables with a single file-top block. One source of truth per file. More invasive. | |

**User's choice:** Audit each + require inline justification comment
**Notes:** Self-enforcement (custom ESLint rule) deferred to v1.1 if drift appears. v1.0.1 enforces via code review.

---

## noUncheckedIndexedAccess blast radius

| Option | Description | Selected |
|--------|-------------|----------|
| Accept all + fix inline (per REQ) | Enable per REQUIREMENTS.md. Fix every site by narrowing or asserting. Highest correctness, biggest scope. May surface real bugs. | ✓ |
| Scope-check first, then decide | Enable temporarily, count errors, decide single plan / split plan / defer based on count. | |
| Accept + add a `safeAt(arr, i)` helper | Tiny helper centralizes invariants for hot indexing paths. Reduces inline noise. | |
| Accept + prefer `.at()` / explicit narrowing | No new helpers. Idiomatic modern TS. | |

**User's choice:** Accept all + fix inline (per REQ)
**Notes:** REQUIREMENTS.md locks the flag. Fix every site inline. Narrowing approach (no helper, no `safeAt`): explicit `if`/`?:` narrowing, `.at()` where optional already, or local non-null assertion WITH a `// Reason:` annotation when invariant is provable but not by the compiler. If a surfaced site reveals a real bug, the smallest behavior-preserving narrowing ships in Phase 7; the bug fix itself is logged for the owning phase.

---

## Claude's Discretion

- Exact ESLint config layout (per-file overrides for `vite.config.ts`, vitest setup, etc.) and precise `tsconfig.node.json` adjustments for `parserOptions.project` resolution.
- Whether `parserOptions.projectService: true` (TS 5.4+ / typescript-eslint 8+ API) is preferable to the legacy array form — Claude picks the modern variant if compatible with the installed tooling versions.
- Whether Phase 7 ships as a single plan or splits into 2–3 plans based on the actual error blast radius surfaced when strict is first enabled (thresholds in CONTEXT.md D-11).

## Deferred Ideas

- Custom ESLint rule enforcing `// Reason:` annotations on every `eslint-disable` — v1.1 candidate if drift appears.
- Splitting `tsconfig.test.json` — re-evaluate in v1.1+ if test-file type ergonomics become painful.
- Type-only refactors not required by strict mode (branded types for `BPM`/`Ratio`/`DurationMinutes`, discriminated unions replacing `T | null`) — out of v1.0.1 scope per REQUIREMENTS.md "Out of Scope".
