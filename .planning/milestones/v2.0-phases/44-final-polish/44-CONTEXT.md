# Phase 44: Final polish - Context

**Gathered:** 2026-05-25
**Status:** Ready for planning
**Source:** `/gsd:discuss-phase 44` (partial — operator advanced to `/gsd:plan-phase` after Area-1 questions; remaining sub-decisions resolved as Claude's Discretion using prior-phase precedents)

<domain>
## Phase Boundary

Closeout sweep across the full v2.0 surface (Phases 36–41) before the milestone closes. Zero open Warning-severity findings, dispositioned Info backlog, tight test names, Tiger Style WHY-only comments, a refactoring pass for redesign-introduced duplication, a security re-review against new attack surfaces, and a broader readability pass beyond what Phase 41 J18 already swept. Restore-or-verify the per-commit green-gate (already restored — see baseline below) and confirm the zero net-new runtime deps invariant holds.

**In scope:**
- POLISH-01 — `/gsd:code-review --all --fix` sweep, zero Warning-severity findings open at close
- POLISH-02 — disposition the 28 Info-severity findings from the 2026-05-16 deep review (fix / defer-with-reason / obsolete-by-redesign); the lint-debt half is already resolved (see baseline)
- POLISH-03 — test cleanup: tight Vitest names, redundancy removal, no flake, document final test count
- POLISH-04 — Tiger Style WHY-only comment audit across `src/` (drop narration-of-WHAT; keep constraints / invariants / surprising behavior / workarounds)
- POLISH-05 — refactoring pass for redesign-introduced duplication or boundary violations; includes the `.orb-layer--in/--out` → `.shape-layer--in/--out` rename (operator-confirmed in scope if it doesn't break things)
- POLISH-06 — `/gsd:secure-phase 44` across the full milestone surface; reviews new attack surfaces (preview audio path from Phase 40, query-string dev toggles `?breathingShape=`/`?orbIdle=` from Phase 41, any env vars introduced 36–41)
- POLISH-07 (remainder) — broader readability pass beyond J18's component/i18n cleanup
- POLISH-08 — verify zero net-new runtime deps held through milestone close (`dependencies` in package.json still `react` + `react-dom`)
- POLISH-09 — verify per-commit green-gate held through milestone close on `main`

**Out of scope (deferred or separate):**
- New features
- J19 (Complete-screen distinct-surface decision) — gated on a separate operator call, not a Phase 44 item
- v1.x deferred items: iOS Safari mid-page audio recovery, S2 Android wake-lock real-device UAT, iOS Pitfall 6, iOS standalone-PWA Wake Lock < 18.4 detect-and-warn — product decisions, deferred without bundling
- Architectural refactor-loop items beyond what already landed (F6 + I are on `main`; F1–F5, G, H closed in prior commits)

**Baseline at phase start (2026-05-25, commit `580dc53`):**
- `npm run lint` → **0 errors, 0 warnings** (clean — was 53 errors / 3 warnings in deferred-items.md, resolved during Phase 41)
- `npx tsc --noEmit -p tsconfig.app.json` → clean
- `npm test` → **107 test files / 1155 tests pass**
- `npm run build` → clean (Phase 41 reported PWA precache 514.18 KiB)
- `dependencies` in `package.json` → `react` + `react-dom` (zero net-new since v1.0)

</domain>

<decisions>
## Implementation Decisions

### Sweep packaging (POLISH-01 / POLISH-02 only)

- **D-01:** **One big `/gsd:code-review --all --fix` sweep commit for POLISH-01 + POLISH-02** (operator decision, prior turn). The full-codebase code-review run produces one mega-commit; per-cluster sharding rejected.
- **D-02:** **The mega-commit scope is bounded to POLISH-01 + POLISH-02 only.** POLISH-03 (test cleanup), POLISH-04 (comment audit), POLISH-05 (refactor), POLISH-06 (security), POLISH-07 (readability) each commit per cluster — these are different surfaces and bundling them into one mega-commit would be unreviewable. (Claude's Discretion — natural reading of operator intent; the locked "one big sweep" was specifically about the code-review-fix portion.)

### 28 Info-findings disposition workflow

- **D-03:** **Re-locate the 28 findings from the 2026-05-16 deep review during planning.** No saved list exists in `.planning/` — the count appears in `PROJECT.md` and `STATE.md` but the underlying review artifact must be recovered. The planner / executor will: (a) check `.planning/phases/` and `.planning/quick/` for an `INFO-FINDINGS.md` or equivalent artifact, (b) if absent, regenerate via `/gsd:code-review --all` filtered to Info-severity, (c) cross-reference against the count of 28 as a sanity check.
- **D-04:** **Disposition record lives in `.planning/phases/44-final-polish/44-INFO-FINDINGS.md`.** Format: a markdown table — `Finding ID | Original path/line | Severity | Disposition (fix / defer-with-reason / obsolete-by-redesign) | Decision rationale | Commit hash (if fixed)`. (Claude's Discretion — mirrors the per-finding table pattern used in prior REVIEW-FIX.md artifacts.)
- **D-05:** **"Obsolete-by-redesign" threshold:** finding is marked obsolete if (a) the file no longer exists on `main` (deleted in Phase 41 J18 sweep or earlier housekeeping), OR (b) the surrounding code was structurally rewritten during the spike-loop (different module boundary, different API shape, different concern). When in doubt, prefer fix-or-defer over obsolete to keep the audit trail honest.

### Refactoring pass scope (POLISH-05)

- **D-06:** **Moderate scope.** Includes: (a) the `.orb-layer--in/--out` → `.shape-layer--in/--out` rename (operator-confirmed in scope if it doesn't break things — via LSP per [[use-lsp-for-renames]]); (b) obvious primitive duplication discovered by grep/scan (e.g., SettingsSegmentedRow vs SettingsToggleRow vs SettingsForm patterns — audit during planning); (c) any clear boundary violations introduced by the redesign that grep can surface. Excludes: deep architectural re-audit of the post-J18 primitives layer (scope creep — F6/UiStringsContext already landed the meaningful architectural improvement).
- **D-07:** **`.shape-layer` rename safety contract.** Before commit: per-commit green-gate must pass (`tsc + lint + test + build` all green). Use LSP rename for TS identifiers; for CSS class names use a per-file Edit pass with grep verification across `.tsx` / `.css` / `.test.tsx`. If LSP isn't available, fall back to per-file Edit pass (same as refactor-loop Item H did for `learnDialogModel` → `learnPanelModel`). Rename touches the visual layer only — no logic / state / audio / persistence changes per [[design-logic-separation]].

### Plan execution format

- **D-08:** **Standard `/gsd:plan-phase 44` flow** — atomic plans with PATTERNS.md + (light) RESEARCH.md + per-plan PLAN.md + per-task atomic commits. Spike-loop format rejected: Phase 44 clusters are orthogonal (a lint fix doesn't affect a test name, a comment audit doesn't affect security), no benefit from serializing through a single state file. (Claude's Discretion — Phase 41 spike-loop was for tightly-coupled visual work; Phase 44 doesn't share that constraint.)
- **D-09:** **RESEARCH.md may be skipped on trivial polish plans** (mechanical comment audit, test-name tightening, lint-clean spot fixes). PATTERNS.md still required for plans that touch >1 file or modify code shape. Per-plan planner judgment.
- **D-10:** **Plan cluster proposal (planner may adjust):**
  - `44-01-CODE-REVIEW-SWEEP.md` — POLISH-01 + POLISH-02 mega-commit + 44-INFO-FINDINGS.md table
  - `44-02-TEST-CLEANUP.md` — POLISH-03 (Vitest name tightness, redundancy removal, flake check, document final count)
  - `44-03-COMMENT-AUDIT.md` — POLISH-04 (Tiger Style WHY-only sweep)
  - `44-04-REFACTOR-PASS.md` — POLISH-05 (`.shape-layer` rename + primitive dedup pass)
  - `44-05-READABILITY.md` — POLISH-07 remainder (broader readability beyond J18)
  - `44-06-SECURITY-REVIEW.md` — POLISH-06 (`/gsd:secure-phase 44`)
  - `44-07-INVARIANTS-VERIFY.md` — POLISH-08 + POLISH-09 verification (zero net-new deps + per-commit green-gate held)

### Carry-forward from prior phases / invariants

- **D-11:** **Per-commit green-gate fully restored.** Baseline: lint clean (0/0), tsc clean, 1155 tests pass, build clean. Phase 36 deferred the lint half to Phase 44 — that deferral is closed as a no-op since Phase 41 work already resolved the 53-error backlog. POLISH-09 verification confirms this held through milestone close.
- **D-12:** **F6 (UiStringsContext) + I (sibling-pattern stale-comment cleanup) inherited as done work.** Already on `main` at commits `fe14c47` + `80da948`. Stale "awaiting approval" label in `REFACTOR-LOOP-STATE.md` is a bookkeeping leak, not a Phase 44 decision. Phase 44 closeout includes marking those Items approved in the state file.
- **D-13:** **Mandatory propose-step checklist applies to every Phase 44 plan** per [[propose-step-checklist]]: Downstream Constraints + Applicable Memory Rules sections BEFORE Goal/Scope/Risk. No exceptions for "small" cleanup plans.
- **D-14:** **Tests must not re-introduce design-token-locking assertions** per [[no-design-locking]]. POLISH-03 test cleanup specifically watches for and removes any such assertions found.
- **D-15:** **POLISH-06 security scope:** new attack surfaces from the v2.0 milestone are the threat-model focus — preview audio path (`src/audio/previewContext.ts`, Phase 40), query-string dev toggles (`?breathingShape=`, `?orbIdle=`, Phase 41 J5/J6), font asset hosting (`@fontsource-variable/inter` woff2 bundling, Phase 41 J2). `/gsd:secure-phase 44` runs against the full milestone surface; planner constructs the threat model from the changed-file set across Phases 36–41.

### Claude's Discretion

- Exact wording of test names in POLISH-03 cleanup — planner picks per-test based on Tiger Style "describe-the-behavior-not-the-implementation" rule.
- Final test count target — POLISH-03 just requires the number to be recorded; the closeout commit captures it.
- Whether to run `/gsd:code-review --all` in review-only mode first to triage, then apply `--fix` — defer to D-01 (one-shot `--fix` per operator). The reviewer agent runs once.
- Filename / directory choices for `44-INFO-FINDINGS.md` table — phase-dir placement assumed; planner may relocate.
- Order of plan execution beyond dependency analysis — planner-determined wave assignment.
- Whether POLISH-07 readability remainder lands as its own plan (D-10 proposes `44-05-READABILITY.md`) or folds into POLISH-04 comment audit + POLISH-05 refactor pass — planner picks based on the actual delta found.

</decisions>

<canonical_refs>
## Canonical References

**Downstream agents MUST read these before planning or implementing.**

### Phase 44 scope
- `.planning/ROADMAP.md` §Phase 44 — goal + 9 success criteria + dependency declaration (depends on 36, 37, 38, 39, 40, 41 — full milestone sweep)
- `.planning/REQUIREMENTS.md` §POLISH lines 135–143 — POLISH-01..09 normative statements; POLISH-07/08/09 already partial-closed in Phase 41
- `.planning/PROJECT.md` §Current Milestone v2.0 + §v1.x Carry-Forwards — the 28 Info-severity findings origin (2026-05-16 deep review), zero net-new deps invariant, milestone closeout context
- `.planning/STATE.md` §Deferred Items / §Pending Todos — Phase 40 lint carry-forward note (now stale — see D-11), J19 deferral, Phase 44 sweep todo
- `.planning/phases/36-housekeeping-bookkeeping-reset/deferred-items.md` — the original lint-debt log; explains why Phase 36 deferred lint and how Phase 44 was meant to close it

### v2.0 milestone phase artifacts (sweep targets)
- `.planning/phases/41-spike-mono-zen/41-CONTEXT.md` — Phase 41 scope absorption (42/43 collapsed in), J18 orphan sweep results, drift-guard locations
- `.planning/phases/41-spike-mono-zen/41-SUMMARY.md` — final spike-loop deliverable summary with metrics + commit traceability
- `.planning/phases/41-spike-mono-zen/41-SPIKE-LOOP-ARCHIVE.md` — per-item J1–J18 history (the canonical implementation log for the visual surface that POLISH sweeps over)
- `.planning/phases/40-timbre-preview-cue/40-CONTEXT.md` — Phase 40 preview audio path + structural import-graph drift-guard at `src/audio/previewContext.no-audioengine-import.test.ts`
- `.planning/phases/40-timbre-preview-cue/40-SECURITY.md` — Phase 40 security review (input to Phase 44 POLISH-06 cumulative threat model)
- `.planning/phases/39-theme-simplification/39-CONTEXT.md` — Phase 39 drift-guard pattern (`content.no-removed-themes.test.ts`) — analog for "lock the deletion done-state at the source-text level"
- `.planning/phases/38-variant-removal/38-CONTEXT.md` — Phase 38 drift-guard pattern (`content.no-removed-variants.test.ts`)
- `.planning/phases/37-stats-ui-removal/37-CONTEXT.md` — Phase 37 drift-guard precedent
- `.planning/phases/36-housekeeping-bookkeeping-reset/` — full Phase 36 artifacts (HOUSE-01..14)

### Architectural prep / refactor loop
- `.planning/REFACTOR-LOOP-STATE.md` — Items A–I history; F6 (UiStringsContext, commit `fe14c47`) + I (sibling-pattern comment cleanup, commit `80da948`) already on `main`; the "awaiting operator approval" label is stale (see D-12)

### Drift-guard tests (POLISH-03 must NOT remove these)
- `src/content/content.no-removed-keys.test.ts` — locks the J13/J16/J17/J18 removed i18n keys structurally (10 forbidden-pattern matchers)
- `src/content/content.no-removed-themes.test.ts` — locks the theme-simplification deletions (Phase 39)
- `src/content/content.no-removed-variants.test.ts` — locks the variant-removal deletions (Phase 38)
- `src/audio/previewContext.no-audioengine-import.test.ts` — locks Phase 40 PREV-03 at the import-graph level

### Memory-rule references (apply to every plan)
- [[propose-step-checklist]] — Downstream Constraints + Applicable Memory Rules sections mandatory before Goal/Scope/Risk
- [[no-design-locking]] — tests/code/comments must not anchor downstream-modifiable values
- [[use-lsp-for-renames]] — symbol/property renames use LSP, never sed/perl/regex
- [[design-logic-separation]] — design-only changes must not touch state machines, audio, persistence, business logic
- [[ack-dont-fix-inline]] — during operator feedback dumps, acknowledge + take notes; don't edit code until "you can fix"

</canonical_refs>

<code_context>
## Existing Code Insights

### Reusable assets (the v2.0 surface POLISH sweeps over)
- **`src/components/` primitives** (post-J18): SetupCard / SettingsSheet / FeedbackTime / FeedbackCount / SettingsSegmentedRow / SettingsToggleRow / SettingsSectionHeader / SettingsStepper / OrbShape / NKShape / EndSessionDialog / Cue/Language/Timbre/PracticePicker — refactor pass (POLISH-05) audits this set for duplication
- **`src/app/pages/`** — AppSettingsPage + LearnPage (post-F6 UiStringsContext)
- **`src/app/`** — App + ScreenRouter + PracticeScreen + view-models — UiStringsContext provider wraps ScreenRouter (commit `fe14c47`)
- **`src/audio/`** — cueSynth / audioEngine / previewContext / nkCueSynth (Phase 40 preview path added; structural drift-guard in place)
- **`src/storage/`** — practices / envelope migrations (v1→v3 chained, Phase 36 HOUSE-09)
- **`src/content/`** — i18n catalogs (en, pt-BR) + drift-guard tests

### Established patterns
- **Drift-guard-as-lock** (Phase 26 / 37 / 38 / 39 / 40 / 41 J18.8) — when deleting code or pruning content, add a structural test that fails if the removed pattern resurfaces. POLISH-03 must preserve these.
- **Spike-locked values are not decisions** — Phase 41 locked visual hex/values verbatim from spike 010; refactor pass (POLISH-05) must not re-litigate them
- **Tiger Style WHY-only comments** — applied piecemeal across Phase 41 J18 (commit `ec77c67` removed key-tracking narration); Phase 44 POLISH-04 sweeps the full codebase to the same bar
- **Per-commit green-gate** — every Phase 41 spike-loop item ran `tsc + lint + build + test` before commit (POLISH-09 invariant)
- **Atomic commits per cluster** — Phase 36/37/38/39/40 PATTERNS precedent: split is the default. The mega-commit (D-01) is a deliberate exception scoped to POLISH-01/02 only (D-02)

### Integration points
- **`/gsd:code-review --all`** — agent runs against `src/` with phase context; D-01 invokes the `--fix` variant in one shot
- **`/gsd:secure-phase 44`** — agent reads `44-PLAN-*.md` files + `src/` changed-since-Phase-36 to produce `44-SECURITY.md`
- **`/gsd:verify` (run by `/gsd:verify-phase 44`)** — closes POLISH-08 (zero net-new deps) and POLISH-09 (per-commit green-gate held) by reading `package.json` + walking git log
- **Drift-guard tests** — must remain green throughout the phase (POLISH-03 cleanup must not weaken them)

</code_context>

<specifics>
## Specific Ideas

- Operator preference for **one-shot `--fix` mega-commit** (not review-first-then-fix-second) — D-01
- Operator preference for **`.shape-layer` rename in scope if it doesn't break things** — D-06 / D-07
- Operator interrupted discuss-phase Area 1 mid-questions and invoked `/gsd:plan-phase` directly — signals "stop discussing, plan now"; remaining sub-decisions resolved as Claude's Discretion using prior-phase precedents

</specifics>

<deferred>
## Deferred Ideas

- **J19 (Complete-screen distinct-surface decision)** — operator-gated, not a Phase 44 item; remains as v2.x carry-forward if reopened
- **v1.x carry-forward items** (iOS Safari mid-page audio recovery, S2 Android wake-lock real-device UAT, iOS Pitfall 6, iOS standalone-PWA Wake Lock < 18.4 detect-and-warn) — product decisions, deferred without bundling; not Phase 44 scope
- **Aggressive architectural re-audit of post-J18 primitives** — rejected at D-06; F6 already landed the load-bearing architectural improvement (UiStringsContext)
- **Per-cluster commit sharding within POLISH-01/02** — rejected at D-01 per operator preference; the mega-commit is the unit

</deferred>

---

*Phase: 44-final-polish*
*Context gathered: 2026-05-25*
