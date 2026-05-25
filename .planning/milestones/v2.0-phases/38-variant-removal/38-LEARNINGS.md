---
phase: 38
phase_name: "variant-removal"
project: "HRV Breathing WebApp"
generated: "2026-05-21"
counts:
  decisions: 7
  lessons: 5
  patterns: 5
  surprises: 5
missing_artifacts: []
---

# Phase 38 Learnings: variant-removal

## Decisions

### D-01 — Field deletion over value coercion for persisted `prefs.variant`
Rather than coerce a persisted `variant: 'square'|'diamond'` value to `'orb'`, the field is deleted entirely from `UserPrefs` / `DEFAULT_PREFS` / `coercePrefs`. A returning user's unknown `variant` key passes through Phase 8 D-01 envelope spread-then-override — preserved on disk, ignored on read — and the only render path is OrbShape (Plan 01). No `STATE_VERSION` bump.

**Rationale:** REQUIREMENTS VAR-05 says "coerced via `coerceSettings`" but the field deletion path satisfies the same intent (forward-compat read, no migration) with strictly less surface than a value-coercer. Matches Phase 37 D-02/D-03 precedent (delete dead data-layer surface when consumers go).
**Source:** 38-CONTEXT.md (D-01), 38-02-SUMMARY.md, 38-VERIFICATION.md (Truth 3)

### D-03 — Collapse BreathingShape wrapper directly to `<OrbShape />` call sites
`BreathingShape.tsx` is deleted; the 3 App.tsx call sites become direct `<OrbShape />` renders rather than keeping a single-branch wrapper around for Phase 42's benefit.

**Rationale:** Phase 42 will introduce a different wrapper (env-driven V1/V2 dispatch via `VITE_BREATHING_SHAPE`), so this wrapper has no preservation value. Tiger Style — no premature abstraction held for a future phase.
**Source:** 38-CONTEXT.md (D-03), 38-01-SUMMARY.md

### D-04..D-07 — 14-token fs-scan drift-guard across 4 roots with `.css` filter
A new `src/content/content.no-variants.test.ts` mirrors the STATS-05 (Phase 37) analog with three structural adaptations: (a) scans 4 roots — `components/`, `app/`, `content/`, **and `styles/`** — to catch CSS attribute-selector re-entry; (b) extends the file filter to include `.css` since the new root is exclusively CSS; (c) 14 forbidden tokens — 10 symbol-name plain-substring + 2 persisted-value regex + 2 CSS attribute regex.

**Rationale:** Variant axis re-entry can come back via 3 distinct vectors (TS symbol, persisted string value, CSS attribute selector). Each vector gets its own match class. Display strings (`'Square'`/`'Diamond'`/`'Quadrado'`/`'Losango'`) intentionally NOT forbidden — they appear legitimately in geometry comments. Symbol-name tokens are the precise sentinels.
**Source:** 38-CONTEXT.md (D-04..D-07), 38-04-SUMMARY.md

### D-08 — Clean-cut i18n deletion (type + EN + PT-BR in one boundary)
`UiStrings.variants` block and `UiStrings.settings.variantLabel` deleted from the type AND both catalog catalogs in the same commit, in that order (type → tsc → catalog entries).

**Rationale:** Per Phase 37 D-01 precedent. Re-introduction (if Phase 42's dev toggle ever escapes to a user pref) will design fresh copy + key shape anyway; keeping orphan strings risks rot and unused-export lint noise.
**Source:** 38-CONTEXT.md (D-08), 38-02-SUMMARY.md

### D-09 — Delete-with-component policy (git rm component + test in same commit)
Each component and its `*.test.tsx` twin are deleted in the same commit (12 files via a single coordinated `git rm` in Plan 01).

**Rationale:** Phase 37 precedent. Never leave a component deleted while its test survives (or vice versa) — the intermediate state is broken (`tsc` fails on the dangling import) AND philosophically inconsistent (test asserts on absent code).
**Source:** 38-CONTEXT.md (D-09), 38-PATTERNS.md, 38-01-SUMMARY.md

### Tasks 1 + 2 of Plan 01 ship in ONE combined commit (tsc-boundary requirement)
The 12 component/hook file deletions (Task 1) and the App.tsx call-site collapse + NKShape dispatcher collapse (Task 2) land as a single combined commit `8e81224`, not two separate ones.

**Rationale:** Removing `BreathingShape.tsx` from disk while leaving `import { BreathingShape } from '../components/BreathingShape'` in App.tsx is a TS2307 ("cannot find module"). The deletions and the edits that remove their imports must cross the commit boundary together. Per-commit green-gate invariant (Phase 7 D-09) precludes the intermediate state.
**Source:** 38-01-SUMMARY.md (Decisions Made #1)

### Plan 02 absorbs App.tsx scope originally allocated to Plan 03 (checker BLOCKER fix)
The plan author originally scoped the App.tsx L65 `VisualVariantId` import strip + L292-293 ref/state retypes to Plan 03. The plan checker flagged this as a BLOCKER: Plan 02 deletes `VisualVariantId` from `src/domain/settings.ts`, but Plan 02's verify gate runs `pnpm tsc --noEmit` — which would fail on the dangling App.tsx references. Plan 02 was revised to do the import strip + retypes in its own commit boundary; Plan 03 still owns the full deletion of the L224 shim + L292-293 declarations + capture/clear thread.

**Rationale:** A verify gate that runs the whole-project type-check is unforgiving of cross-plan dangling references. The "narrow this plan to one concern" instinct loses to the per-commit green-gate invariant.
**Source:** 38-02-PLAN.md (Task 1 step 4.5; this is explicitly flagged as a "BLOCKER fix" inline)

---

## Lessons

### Forward-compat envelope tolerance does the requirement work for free, but the requirements wording can mislead
REQUIREMENTS.md VAR-05 says persisted `variant: 'square'` is "coerced via `coerceSettings`" — implying a value-level coercer. The actual implementation was `coerceVariant` (different function in a different file), and the chosen disposition deletes the field entirely. Phase 8 D-01 spread-then-override does the forward-compat work without any explicit coercion. The wording fix (`coerceSettings` → `coerceVariant`) was deferred — but the planner had to surface and defend the divergence in CONTEXT before downstream agents would have read the literal text as authoritative.

**Context:** VAR-05 closed implicitly (field disappears; render path is always Orb) rather than explicitly (coercer maps invalid → default). The CONTEXT D-01 "wording note (informational)" paragraph is what made downstream plans (gsd-planner, executors, verifier) accept the disposition.
**Source:** 38-CONTEXT.md (D-01 wording note), 38-02-SUMMARY.md (Phase 8 D-01 Envelope Tolerance section), 38-VERIFICATION.md (Truth 3 evidence)

### Type-first deletion order is the safe sequence for typed-catalog removal
The clean order for stripping an i18n key + its type: (1) delete the type block, (2) run `tsc`, (3) fix every fixture the compiler flags, (4) delete the EN/PT-BR catalog entries. Reverse order works too but leaves a window where the catalog entries are typed-orphans. Plan 02 followed this order across `UiStrings.variants` / EN / PT-BR with two atomic commits.

**Context:** Phase 37 LEARNINGS established this; Phase 38 reused it without re-deriving. The pattern survived the plan-author → plan-checker → executor handoff without alteration.
**Source:** 38-02-PLAN.md (interfaces final paragraph), 38-02-SUMMARY.md (Commits table)

### Comment-only references to deleted symbols look harmless but break a plain-substring drift-guard
Plans 01–03 deleted all variant-axis **code** from the scanned roots, then Plan 04's drift-guard test failed on first run because 6 comment lines in `CueGlyph.tsx` / `CuePicker.tsx` / `NKShape.tsx` / `shapeConstants.ts` still mentioned `VariantPicker` / `SquareShape` / `DiamondShape` as historical WHY context. The plain-substring `t.includes(...)` matcher can't distinguish code from comments. Rule 1 auto-fix landed in the same Plan 04 commit.

**Context:** A pattern-matching drift-guard treats source as a string. Historical "we used to do X" comments fail the same scan as live `import { X }` references. The lesson: when shipping a drift-guard, sweep comments in scanned roots, not just code.
**Source:** 38-04-SUMMARY.md (Auto-fixed Issue #1; the 6 specific lines are enumerated)

### Verifier's `grep -rn "variant: *['"]orb['"]" src/` found 15 fixture residues invisible at runtime
After all 4 plans claimed completion ("tsc green, 1093 tests pass"), the verifier returned `gaps_found 5/6`. The literal-regex grep across `src/` found 15 occurrences of `variant: 'orb'` lurking in test fixture envelopes across 9 test files. Each was a Phase 8 D-01 unknown-key preserved on disk — harmless at runtime — but a violation of VAR-06's "zero leftover references." Closing the gap took a 16th commit (`5b92f5c`) and re-verification.

**Context:** Phase 7 D-09 per-commit green-gate (`tsc && lint && build && test`) didn't catch this — the fixtures are valid TS once the field is gone (TypeScript's excess-property check is only triggered on directly-typed assignments, not on object literals passed to functions). Only a literal grep across `src/` found them.
**Source:** 38-VERIFICATION.md (re_verification frontmatter, Gaps Summary), commit 5b92f5c

### `tsc --noEmit` doesn't enforce `noUnusedLocals` — `tsc -b` does, and the project build runs `tsc -b`
Tests pass with `pnpm tsc --noEmit && pnpm test`. The build runs `tsc -b && vite build`. When Plan 03's executor stripped fields from `useLocale.test.ts`, a `DEFAULT_FULL_PREFS: UserPrefs` declaration that the executor thought was complete still failed `tsc -b` because of TS6133 (unused declaration). Plan 03's Rule 3 auto-fix folded the missing strip into the same commit. Phase 37 LEARNINGS already flagged this exact lesson; Phase 38 stepped on it again because the Plan 03 executor's verify command was `npx tsc --noEmit`, not the project build.

**Context:** This is a recurring miss across deletion phases. Phase 37 patched executor prompts in waves 2/3 but the Phase 38 executor's verify still relied on `--noEmit`. Worth promoting executor self-check to `npm run build` for any phase that touches typed fixture data.
**Source:** 38-03-SUMMARY.md (Auto-fixed Issue #1 — Rule 3, useLocale.test.ts), 37-LEARNINGS.md (`tsc --noEmit` self-check is insufficient)

---

## Patterns

### Commit-boundary engineering with typed-null shims for cross-plan type deletions
When a deeply-imported type is deleted but its consumers' deletion is in a later plan's scope, the intermediate plans either (a) absorb the consumer deletion into their own commit boundary, or (b) replace consumer references with a typed-null shim. Phase 38 used both: Plan 01 used `const liveVariant: VisualVariantId | null = null` as a shim until Plan 03 deleted the whole thread; Plan 02 retyped to `<null>` after deleting the source type. Each shim carries an inline WHY-comment naming the plan that owns its eventual deletion.

**When to use:** Multi-plan deletion phase where a single type cascades through several files and you want each plan's commit to be green at its own boundary. The shim documents its own lifetime; the downstream plan grep'ing for the shim text knows where to land.
**Source:** 38-01-SUMMARY.md (liveVariant shim), 38-02-SUMMARY.md (BLOCKER fix: L292-293 retype), 38-03-SUMMARY.md (Task 1 — final deletion)

### Drift-guard test as invariant lock with explicit unlock clause
A vitest fs-scan test that fails CI if forbidden tokens reappear in scanned roots IS the lock. Re-introducing the feature is a deliberate future-phase decision that explicitly deletes the drift-guard with rationale logged in that phase's SUMMARY. Phase 26 (I18N-07) → Phase 37 (STATS-05) → Phase 38 (VAR-06) lineage; each phase mirrors the prior with documented deltas.

**When to use:** Any deletion phase where the absence-invariant must survive future contributors. Pair with an unlock clause in the phase CONTEXT (`D-06` in this phase) so the next author knows the deletion mechanic.
**Source:** 38-CONTEXT.md (D-06), 38-04-SUMMARY.md (Lock / Unlock Exit Clause)

### Multi-root fs-scan extension: add root + add file extension in lockstep
Phase 38 extended the STATS-05 analog from 3 roots to 4 (adding `src/styles/`) AND from `.ts`/`.tsx`-only file matching to also accept `.css`. The two extensions are coupled — the new root is exclusively CSS, so a root-only addition would silently scan nothing. The accept clause becomes `(.ts || .tsx || .css)` with reject clause unchanged (`.test.ts` / `.test.tsx`); CSS has no test-file naming convention.

**When to use:** When extending a fs-scan drift-guard to cover a new file class (CSS, JSON, YAML), expand the file-extension filter at the same time as the root list. A length-floor `it()` then guards against a zero-file vacuous-pass.
**Source:** 38-04-SUMMARY.md (Test Results — `collectFiles` accept clause extension), 38-04-PLAN.md (interfaces section)

### Sanity-floor + filename-self-exclusion for fs-scan tests
Every fs-scan drift-guard ships two `it()` cases: one asserts `SCAN_FILES.length > REALISTIC_FLOOR` (catches vacuous-pass from broken `__dirname`, renamed root, or wrong cwd); the other does the actual forbidden-token sweep. The drift-guard's own filename (`*.test.ts`) triggers `collectFiles`' reject clause, preventing the test from flagging itself for containing the literal forbidden-token strings inside its assertion code.

**When to use:** Every fs-scan-based invariant lock. Without the length floor, the test asserts nothing when its iteration runs zero times; without the self-exclusion, the test contains the literal banned strings inside `t.includes('SquareShape')` calls and would fail itself.
**Source:** 38-04-SUMMARY.md (Test Results: "self-exclusion" line; "T-38-16 / T-38-17 mitigated")

### Tiger Style atomic commits scoped `(38)` with clear logical boundaries
4 plans → ~10 commits, each scoped `(38)` and each one logical concern: deletion → data-layer + storage tests → i18n strings → App.tsx state strip → CSS strip → fixture cleanup → drift-guard + comment sweep → VAR-06 closure fixture sweep. A future `git bisect` can name the layer that introduced any regression.

**When to use:** Multi-plan deletion phases where the commit log is the audit trail. Prefer one focused commit per file-class change (data layer, i18n, CSS, state) over one giant "phase 38 cleanup" commit.
**Source:** 38-CONTEXT.md (Tiger Style notes throughout), 38-01-SUMMARY.md / 38-02-SUMMARY.md / 38-03-SUMMARY.md / 38-04-SUMMARY.md Commits tables

---

## Surprises

### A "verify gate" plan structure forced Plan 02 to swallow Plan 03's scope
The plan author scoped the App.tsx `VisualVariantId` import strip (L65) + ref/state retypes (L292-293) to Plan 03. The checker rejected this as a BLOCKER: Plan 02's per-plan `tsc --noEmit` would fail the moment Plan 02 deleted `VisualVariantId` from `src/domain/settings.ts`. Plan 02 had to absorb the App.tsx edits despite them being "Plan 03's scope" semantically.

**Impact:** Surfaces a structural tension in plan-scope partitioning: when the verify gate is whole-project type-checking, plans cannot have dangling references across boundaries. Implication: future deletion phases should partition by *commit boundary*, not by *file owner*, when a foundational type is involved.
**Source:** 38-02-PLAN.md (Task 1 step 4.5 — explicitly flagged as "BLOCKER fix"), 38-02-SUMMARY.md

### VAR-06 returned `gaps_found` despite 4 plans' SUMMARYs all reporting green
At first verification, all 4 plans had self-reported tsc-green + tests-pass. The verifier still scored 5/6 because `grep -rn "variant: *['"]orb['"]" src/` found 15 stale fixture entries across 9 test files. Each was a harmless Phase 8 D-01 preserved key — not a runtime bug — but VAR-06's literal "zero leftover references" requirement was the binding interpretation.

**Impact:** A 16th commit (`5b92f5c`) and a re-verification cycle. Reinforced the lesson that per-commit green-gate + executor self-check don't substitute for a phase-end repo-wide grep against the literal requirement wording. The "zero" in REQUIREMENTS is load-bearing.
**Source:** 38-VERIFICATION.md (re_verification frontmatter; gaps_closed)

### Plan 04's drift-guard caught 6 comment-only references the executors all missed
The drift-guard test was the load-bearing artifact, AND it found 6 stale comment lines in production code (`CueGlyph.tsx`, `CuePicker.tsx`, `NKShape.tsx`, `shapeConstants.ts`) that referenced `VariantPicker` / `SquareShape` / `DiamondShape` as historical WHY context. Every prior executor had read those files; none had cleaned the comments because they didn't affect compilation. Only the plain-substring drift-guard fs-scan flagged them.

**Impact:** Rule 1 auto-fix in Plan 04's commit (`4699fde`) sweeps the 6 lines. Lesson promoted: when shipping a plain-substring drift-guard, run it locally first and treat its initial failure as a comment-debt audit before the test goes green.
**Source:** 38-04-SUMMARY.md (Auto-fixed Issue #1 — 6 enumerated lines)

### Display strings `'Square'`/`'Diamond'`/`'Quadrado'`/`'Losango'` deliberately NOT forbidden
The plan author chose to ban **only** symbol-name tokens (`SquareShape`, `DiamondShape`, `VariantPicker`, etc.) and **not** the display strings (`'Square'`, `'Diamond'`, `'Quadrado'`, `'Losango'`). Display words appear legitimately in non-variant contexts — geometry comments ("inscribed-rotated-square approximation"), shape math descriptions, etc. Banning them would create false positives that erode trust in the drift-guard.

**Impact:** Surface-coverage decision (CONTEXT D-08): symbol-name precision over string-prose breadth. Future variant re-introduction would have to come back via a typed/named symbol — using only display-string references would technically slip the lock, but doing so would also produce a feature with no code, which is impossible.
**Source:** 38-04-SUMMARY.md (Exact 14-Token Forbidden List — Rationale for exclusions)

### REQUIREMENTS.md wording (`coerceSettings`) was technically wrong but functionally unimportant
REQUIREMENTS VAR-05 says variant is "coerced via `coerceSettings`." `coerceSettings` actually lives in `src/storage/settings.ts` and handles BPM / ratio / duration. The real variant coercer was `coerceVariant` in `src/storage/prefs.ts`. The wording fix was explicitly deferred (CONTEXT §deferred) because the field-deletion path satisfies the VAR-05 intent independent of which coercer the requirement names.

**Impact:** None to delivered behavior; a documentation cleanup deferred to a future docs sweep. But the surprise is what didn't happen: nobody caught the wording during context-gathering, plan-checking, or execution; CONTEXT D-01 surfaced it as an informational note for downstream readers. Demonstrates that REQUIREMENTS text drifting from code is a category of debt that GSD's process tolerates but does not actively eliminate.
**Source:** 38-CONTEXT.md (D-01 wording note), 38-02-SUMMARY.md (Forward Pointers — Deferred)
