# Phase 44: Final polish — Pattern Map

**Mapped:** 2026-05-25
**Phase:** 44 - final-polish (closeout sweep across v2.0 milestone Phases 36–41)
**Plans proposed (D-10):** 7 plan clusters
**Files analyzed:** 7 plan-cluster artifacts (one PLAN.md per cluster) + 1 INFO-FINDINGS.md disposition table inside cluster 1 + 0–N source-file edits per cluster (mostly bulk sweep work, exact file list materializes at executor time)
**Analogs found:** 7 / 7

> Phase 44 is a **closeout sweep**, not a feature build. Each plan cluster is a meta-action (run a tool, audit/sweep an existing surface, verify an invariant) rather than a feature implementation with a fixed file list. The analog patterns below name the *prior-phase artifact* and the *src/* analog that the executor copies from when the sweep surfaces a concrete edit. There is **NO new application code or test file pattern**, except the per-cluster `44-NN-SUMMARY.md` plan summary.
>
> **CRITICAL constraint (D-15):** No source-code edits ship in this PATTERNS.md output itself — the patterns just point at what the executor should copy from when each sweep surfaces edits. The mega-commit (cluster 1) and the per-cluster commits (clusters 2–7) all run their own per-commit green-gate per D-11.

---

## File Classification

| # | New / Modified File | Role | Data Flow | Cluster | Closest Analog | Match Quality |
|---|---------------------|------|-----------|---------|----------------|---------------|
| 1 | `44-01-PLAN.md` + `44-01-SUMMARY.md` + mega-commit edits across `src/` | code-review-fix mega-commit | review → fix → re-verify | 44-01 | `.planning/phases/36-housekeeping-bookkeeping-reset/36-REVIEW.md` + `36-REVIEW-FIX.md` (per-finding table → atomic-fix doc) | exact (pattern) — but Phase 44 mega-commit is bigger surface than any prior REVIEW-FIX |
| 1b | `44-INFO-FINDINGS.md` (D-04 — per-finding markdown disposition table) | doc artifact (disposition log) | regenerate review → table → fix/defer/obsolete | 44-01 | `.planning/phases/36-housekeeping-bookkeeping-reset/deferred-items.md` (per-pre-existing-issue disposition pattern) + `36-REVIEW-FIX.md` (per-finding `Fixed Issues` block) | role-match (Phase 36 had only 1 finding in scope; Phase 44 has 28 Info findings — same table shape, larger table) |
| 2 | `44-02-PLAN.md` + `44-02-SUMMARY.md` + test-name + redundancy edits across `src/**/*.test.*` | test cleanup | sweep (rename, delete redundant, document final count) | 44-02 | Phase 41 J18.1 dead-test deletion (commits `75af962` for `Card.test.tsx` etc.) + refactor-loop Item F2 (`94958e8` — drop 9 EndSessionDialog component-level tests from `App.dialog.test.tsx`) + Item H (`4457259` — drop 10 design-token-locking primitive tests) | exact (pattern) |
| 3 | `44-03-PLAN.md` + `44-03-SUMMARY.md` + comment edits across `src/**/*.{ts,tsx}` | comment audit (Tiger Style WHY-only) | sweep (delete narration-of-WHAT comments) | 44-03 | Phase 41 J18 commit `ec77c67` (`test(j18.8): drift-guard locking J13/J16/J17/J18 removed keys` — removed key-tracking narration) + refactor-loop Item I commit `80da948` (sibling-pattern stale-comment cleanup — 9 SettingsDialog/Phase-15 refs across 5 files) | exact (pattern, same sweep mechanic) |
| 4 | `44-04-PLAN.md` + `44-04-SUMMARY.md` + `src/styles/theme.contrast.test.ts:121` comment edit + primitive dedup edits | refactor pass | LSP rename + Edit + primitive extraction | 44-04 | Refactor-loop Item H (`4457259` — manual per-file Edit for `learnDialogModel` → `learnPanelModel` rename via LSP-fallback) + Item E (`bd22ca5` — `PickerCardGrid<T>` primitive extracted; 4 pickers → thin adapters) | role-match (similar dedup mechanic; subject differs — H renamed a TS symbol via LSP, E extracted a primitive) |
| 5 | `44-05-PLAN.md` + `44-05-SUMMARY.md` + readability edits across `src/` (TBD by sweep) | readability | sweep (POLISH-07 remainder beyond J18) | 44-05 | Phase 41 J18.2 commit `ba12418` (`vm.appHeader` viewmodel field deletion) + J18.3 `f562ff1` (LOCKED_COPY orphan trim) + J18 archive items J18.1–J18.8 generally (orphan-cleanup mechanics) | exact (pattern lineage continues J18's work) |
| 6 | `44-06-PLAN.md` + `44-06-SUMMARY.md` + `44-SECURITY.md` (output of `/gsd:secure-phase 44`) | security review | threat model → register → audit trail | 44-06 | `.planning/phases/40-timbre-preview-cue/40-SECURITY.md` (most recent in-tree SECURITY.md with realistic threat surface — 11 threats across module / context / file-I/O / UI-wiring boundaries) | exact (Phase 40 directly covers one of the 3 attack surfaces — preview audio path); secondary: `.planning/milestones/v1.1-phases/13-inner-ring-ux-symmetry/13-SECURITY.md` for `threats_open: 0` short-circuit shape |
| 7 | `44-07-PLAN.md` + `44-07-SUMMARY.md` + `44-VERIFICATION.md` (output of `/gsd:verify-phase 44`) | invariant verification | git-log walk + `package.json` diff + per-commit gate replay | 44-07 | `.planning/phases/41-spike-mono-zen/41-VERIFICATION.md` (most recent verification with per-requirement evidence + per-commit pin) + Phase 36 plan `36-09` (the green-gate-and-push pattern — split-gate decision documented per CONTEXT D-11) | role-match (Phase 41 verifies feature satisfaction; Phase 44-07 verifies invariants held *over* the milestone — same evidence shape, different unit) |

---

## Pattern Assignments

### Plan 44-01 — `CODE-REVIEW-SWEEP.md` (code-review-fix mega-commit) — POLISH-01 + POLISH-02

**Role:** code-review-fix mega-commit · **Data flow:** review → fix → re-verify

**Primary analog (mechanics):** `.planning/phases/36-housekeeping-bookkeeping-reset/36-REVIEW.md` + `36-REVIEW-FIX.md`

**Secondary analog (pre-existing-issue disposition):** `.planning/phases/36-housekeeping-bookkeeping-reset/deferred-items.md`

#### Pre-flight verification — baseline matches CONTEXT (D-11)

Run before planning the mega-commit so the executor knows the starting state:

```bash
# CONTEXT baseline at commit 580dc53 (2026-05-25):
#   lint: 0 errors / 0 warnings  (was 53/3 in deferred-items.md; resolved during Phase 41)
#   tsc:  clean
#   test: 107 files / 1155 tests pass
#   deps: react + react-dom only

npm run lint
npx tsc --noEmit -p tsconfig.app.json
npm test -- --run
```

Confirms D-11 / baseline section of CONTEXT. If any of the three is dirty before starting, surface as a CONTEXT clarification — the mega-commit must not muddy the baseline.

#### REVIEW.md frontmatter shape (target — analog `36-REVIEW.md:1-23`)

```yaml
---
phase: 44-final-polish
reviewed: 2026-05-25T<HH:MM:SS>Z
depth: deep                          # --all flag implies deep coverage
files_reviewed: <N>                  # whole src/ tree per D-01 `--all`
files_reviewed_list: [...]           # optional truncate for >50 files
findings:
  critical: 0                        # POLISH-01 requires 0 Warning AT CLOSE
  warning: <N>                       # expected non-zero before --fix runs; 0 at close
  info: <N>                          # expected ≥28 per CONTEXT (28 from 2026-05-16 sweep + delta)
  total: <N>
status: <issues_found | clean>
---
```

#### REVIEW-FIX.md frontmatter (target — analog `36-REVIEW-FIX.md:1-10`)

```yaml
---
phase: 44-final-polish
fixed_at: 2026-05-25T<HH:MM:SS>Z
review_path: .planning/phases/44-final-polish/44-REVIEW.md
iteration: 1                         # mega-commit is one iteration per D-01
findings_in_scope: <N>               # all Warning + the POLISH-02 Info subset operator chose to fix
fixed: <N>
skipped: <N>                         # any explicitly deferred — disposition rationale in 44-INFO-FINDINGS.md
status: <all_fixed | partial>
---
```

#### The mega-commit boundary (D-01 + D-02)

Per CONTEXT D-01 (locked): **one big** `/gsd:code-review --all --fix` commit for **POLISH-01 + POLISH-02 only**. Per D-02 (Claude's Discretion): POLISH-03/04/05/06/07 commit per cluster (own plans below).

Commit message shape (mega-commit):

```
fix(44): code-review --all --fix sweep — close all Warning findings + POLISH-02 Info disposition (POLISH-01, POLISH-02)

Per-file edits driven by /gsd:code-review --all output (full src/ scan against
Phase 36–41 surface). Closes the 28 Info-severity findings from the 2026-05-16
deep review per disposition table in .planning/phases/44-final-polish/44-INFO-FINDINGS.md.

Verified:
  npx tsc --noEmit -p tsconfig.app.json   # clean
  npm run lint                            # 0 errors, 0 warnings
  npm test -- --run                       # 107 files / 1155 tests pass (delta if any)
  npm run build                           # clean
```

#### Bounded scope (D-01 / D-02) — what the mega-commit MUST NOT touch

The mega-commit lands code-review-driven edits only. The following surfaces are OUT of scope (each owns its own cluster commit):

- Test-name tightening / redundant-test removal → cluster 44-02 (POLISH-03)
- Tiger Style comment audit → cluster 44-03 (POLISH-04)
- `.shape-layer` rename + primitive dedup → cluster 44-04 (POLISH-05)
- Readability remainder beyond J18 → cluster 44-05 (POLISH-07)
- Security review → cluster 44-06 (POLISH-06)
- Invariant verification → cluster 44-07 (POLISH-08, POLISH-09)

If the reviewer surfaces a finding that overlaps with one of the deferred clusters (e.g. "this comment is narration-of-WHAT"), defer-with-reason in `44-INFO-FINDINGS.md` and let the target cluster pick it up.

---

### Plan 44-01 sub-artifact — `44-INFO-FINDINGS.md` (28 Info-severity dispositions, D-04)

**Role:** doc artifact (per-finding disposition table) · **Data flow:** regenerate → triage → table

**Primary analog (per-finding table):** `.planning/phases/36-housekeeping-bookkeeping-reset/36-REVIEW-FIX.md` `### Fixed Issues` block (one block per finding ID, with `Files modified`, `Commit`, `Applied fix:` paragraph).

**Secondary analog (deferred-with-reason rows):** `.planning/phases/36-housekeeping-bookkeeping-reset/deferred-items.md` — the pre-existing-lint-debt rationale paragraph is the template for "defer-with-reason" rows.

#### Finding recovery (per D-03)

CONTEXT D-03 says no saved list exists; the 28 count appears in PROJECT.md + STATE.md but the underlying artifact must be recovered. Steps:

1. `grep -rn "28 Info" .planning/` — confirm count provenance (likely PROJECT.md or v1.5-MILESTONE-AUDIT.md).
2. Re-run `/gsd:code-review --all` in review-only mode (NOT `--fix`) against current `main`; collect the Info-severity output.
3. Cross-reference Info count against 28 — if it's now higher (because Phase 41 added surface) or lower (because Phase 41 obviated some findings), document the delta in `44-INFO-FINDINGS.md` preamble.

#### Table shape (per D-04 exact spec)

```markdown
# Phase 44 — 28 Info-severity findings disposition (POLISH-02)

> Disposition record per D-04. Each finding mapped to one of:
> - **fix** — landed in the mega-commit (44-01); commit hash recorded
> - **defer-with-reason** — out of scope for this milestone; rationale recorded
> - **obsolete-by-redesign** — per D-05 threshold (file no longer exists OR module structurally rewritten)

| Finding ID | Original path / line | Severity | Disposition | Decision rationale | Commit hash (if fixed) |
|------------|----------------------|----------|-------------|---------------------|------------------------|
| IN-XXX-01  | src/path/file.ts:NN  | Info     | fix         | One-liner rationale | <sha7>                  |
| IN-XXX-02  | src/path/file.ts:NN  | Info     | obsolete-by-redesign | File deleted in J18.1 (commit `75af962`) — see D-05 | n/a |
| IN-XXX-03  | src/path/file.ts:NN  | Info     | defer-with-reason   | <rationale per D-05 "prefer fix-or-defer over obsolete"> | n/a |
| ...       | ...                  | ...      | ...         | ...                 | ...                      |
```

#### Obsolete-by-redesign threshold (per D-05)

A finding is `obsolete-by-redesign` ONLY if:
- (a) the file no longer exists on `main` (deleted in J18 sweep or earlier), OR
- (b) the surrounding code was structurally rewritten during the spike-loop (different module boundary, different API shape, different concern).

When in doubt, **prefer `fix` or `defer-with-reason` over `obsolete`** to keep the audit trail honest. Per D-05 verbatim.

#### Disposition rationale style (mirrors `deferred-items.md` paragraph format)

For `defer-with-reason` rows, the rationale paragraph should follow `deferred-items.md`'s shape:

> **Why out of scope:** [one-sentence summary]. [Concrete evidence — line numbers, grep counts, commit refs]. [Disposition target — e.g. "Folded into v2.x carry-forward as IOSAUD-01" or "Tracked separately; not a v2.0 milestone gate"].

---

### Plan 44-02 — `TEST-CLEANUP.md` (POLISH-03)

**Role:** test cleanup · **Data flow:** sweep (rename, delete redundant, document final count)

**Primary analog (dead-test deletion):** Phase 41 J18.1 commits `75af962` / `ba12418` / `f562ff1` — surgically deleted tests of components that no longer exist.

**Secondary analog (redundancy removal at App.* level):** Refactor-loop Item F2 commit `94958e8` — `App.dialog.test.tsx` had a `describe('EndSessionDialog (component-level)', ...)` block of 9 tests that duplicated `EndSessionDialog.test.tsx`. Net -9 tests, behavioral coverage preserved (the 8 remaining `App.*.test.tsx` files are genuinely integration).

**Tertiary analog (design-token-locking assertion removal):** Refactor-loop Item H commit `4457259` — 7 primitive test files contained ~30 `toHaveClass('p-6')` / `toHaveClass('bg-[var(--color-breathing-accent-strong)]')` assertions. Each test rewritten to assert the *prop API* / *aria contract* / *behavioral output*, NOT the class string. Net -10 tests; behavioral coverage preserved.

#### Drift-guard tests POLISH-03 MUST NOT remove (CONTEXT canonical_refs)

These four tests are STRUCTURAL LOCKS and removing them silently unlocks the corresponding delete-state:

```
src/content/content.no-removed-keys.test.ts       # J18.8 — locks J13/J16/J17/J18 removed i18n keys
src/content/content.no-removed-themes.test.ts     # Phase 39 — locks Moss/Slate/Dusk deletion
src/content/content.no-removed-variants.test.ts   # Phase 38 — locks Square/Diamond deletion
src/audio/previewContext.no-audioengine-import.test.ts  # Phase 40 PREV-03 — locks import-graph
```

Plus (already in-tree, not explicitly called out in CONTEXT but same pattern — preserve):
```
src/content/content.no-review-markers.test.ts      # Phase 26 I18N-07 — locks "TODO: native-speaker review" absence
src/content/content.no-stats-ui.test.ts            # Phase 37 STATS-05 — locks stats UI absence
src/styles/theme.no-hardcoded-classes.test.ts      # Phase 16.1 — locks 10 banned Tailwind palette utilities
```

If any test deletion proposal touches one of these 7 files, **STOP** — the deletion-unlocking contract requires a deliberate rationale in the SUMMARY per the per-test "exit-ramp policy" (Phase 39 D-06).

#### [[no-design-locking]] guard (D-14)

CONTEXT D-14 explicitly: "tests must not re-introduce design-token-locking assertions". The sweep watches for and removes any such assertions found. Mirror refactor-loop Item H's approach:

- Replace `toHaveClass('p-6')` → drop the assertion; rely on RTL/jest-dom for behavioral checks (`expect(button).toBeEnabled()`, `expect(button).toHaveAccessibleName('...')`)
- Replace `toHaveClass('bg-[var(--color-breathing-accent-strong)]')` → drop; substitute `aria-pressed`/`aria-current`/`role` assertion which IS the behavioral contract
- Replace size-class assertions (`toHaveClass('size-10')`) → drop; substitute "renders without error across every variant" loops

Reference: Item H commit `4457259` body for the 7 files and exact swap pattern (`PageShell.test.tsx`, `Card.test.tsx`, `Eyebrow.test.tsx`, `IconButton.test.tsx`, `Pill.test.tsx`, `PickerCardGrid.test.tsx`, `TopAppBar.test.tsx`).

#### Tight Vitest naming pattern (Tiger Style "describe-the-behavior-not-the-implementation")

Per CONTEXT Claude's Discretion: "planner picks per-test based on Tiger Style 'describe-the-behavior-not-the-implementation' rule". Example transformations (from existing codebase patterns):

| Before (loose / implementation-leaking) | After (tight / behavioral) |
|----------------------------------------|----------------------------|
| `it('renders correctly')` | `it('renders all 3 theme options with role=radio')` |
| `it('handles disabled prop')` | `it('does not call onChange when disabled=true')` |
| `it('test 1')` / `it('test for X')` | `it('<verb> <subject> <outcome>')` — concrete behavior |
| `describe('Component')` | `describe('<Component>: <behavior cluster>')` |

The mega-commit must NOT rename tests in places it didn't already touch — naming is its own pass per D-02.

#### Final test count documentation

Per POLISH-03 ROADMAP success criterion: "Final test count documented". The 44-02-SUMMARY.md must record:

```
Test count delta:
  Pre-sweep:  107 files / 1155 tests   (CONTEXT baseline at commit 580dc53)
  Post-sweep: <X> files / <Y> tests    (commit <sha7>)
  Net:        ±<X-107> files / ±<Y-1155> tests   (rationale: <one-line>)
```

Mirrors the Item H / Item F2 / Item E commit-summary convention (`refactor(primitives): extract PickerCardGrid; collapse 4 pickers to thin adapters` lists `JS bundle 301.12 → 298.69 KB (-2.4 KB)` and `+1 file, +11 tests`).

#### Flake check (POLISH-03 ROADMAP "no flake in close sweep")

Run the test suite 3× consecutively and confirm zero flake:

```bash
for i in 1 2 3; do npm test -- --run 2>&1 | tail -5; done
```

If flake surfaces, surface the flaky test name and disposition (fix or quarantine — operator call).

---

### Plan 44-03 — `COMMENT-AUDIT.md` (POLISH-04)

**Role:** comment audit (Tiger Style WHY-only) · **Data flow:** sweep (delete narration-of-WHAT)

**Primary analog (sweep mechanic):** Refactor-loop Item I commit `80da948` — 9 stale `SettingsDialog` / `SettingsPanel` / "Phase 15" / "legacy modal" / "scheduled for removal" comment references across 5 files. **Comments only — zero code behavior change, tests pass unchanged.**

**Secondary analog (Phase 41 in-flight cleanup):** Commit `ec77c67` — removed key-tracking narration as part of J18.8 drift-guard work.

#### Tiger Style WHY-only contract (POLISH-04 ROADMAP wording)

**Drop:** narration-of-WHAT (`// loop through the array and increment`, `// Phase 15 — render the dialog`, `// uses useState to hold the count`)

**Keep:** WHY-comments (constraints, invariants, surprising behavior, workarounds)

#### Concrete keep-vs-drop examples from current codebase

**KEEP — invariant comment (`src/audio/previewContext.ts:3-15`):**
```typescript
// D-01 (PREV-05 latency): The AudioContext is created once on the first preview
// tap and reused for every subsequent tap. Construction cost (~5-20 ms) is paid
// once; all following taps skip straight to scheduling. Sharing or closing the
// context between taps would reintroduce that latency.
//
// D-02 (iOS Safari + Chrome auto-suspend): Some browsers auto-suspend an idle
// AudioContext. Calling ctx.resume() before scheduling on every tap closes that
// gap. No await — Web Audio tolerates a same-microtask resume + schedule pair,
// and awaiting would break the synchronous-call-path contract below.
```
Reason: encodes the latency-budget + iOS-suspension WHYs that future readers will need before "helpfully" closing the context or awaiting resume.

**KEEP — drift-guard self-description (`src/content/content.no-removed-keys.test.ts:1-21`):**
```typescript
// Spike-loop J18.8 drift-guard.
//
// Locks the done-state of J13 (InstallBanner removal) + J16 V4 (TopAppBar
// eyebrow drop) + J17 audit + the J18.2 / J18.3 orphan sweep. Any future
// phase that re-introduces one of the removed strings explicitly deletes
// this file with rationale recorded in that phase's commit.
```
Reason: documents the lock-and-unlock semantic that's load-bearing.

**DROP — narration-of-WHAT historical references (Item I commit `80da948`):**
```typescript
// BEFORE (drop):
// Phase 15 SettingsDialog Shell — D-07, D-08...
// Shared by SettingsPanel.tsx (legacy modal path; SettingsDialog wraps it; deleted in Item G)
// AppSettingsPage.tsx
// Replaces the legacy SettingsDialog modal route

// AFTER (Item I edit):
// Consumed by AppSettingsPage. Excludes the title and back affordance.
```
Reason: SettingsDialog no longer exists; phase-history references are rot.

**DROP — `// Phase X Plan YY: <restating what code below does>` patterns (common in `src/app/App.*.test.tsx`):**

Per CONTEXT baseline / Phase 41 J18 sweep: there are 98 grep-matches for `^\s*// Phase \d+` across `src/`. Many are now redundant per Item I logic — the rule was "applied narrowly, not broadly" in the refactor loop; POLISH-04 IS the broad pass.

#### Audit mechanic (per Item I — 4 verification grep guards)

After the sweep, run a closing grep audit:

```bash
# 1. Deleted-component refs should be zero (extend the Item I guards):
grep -rn 'LearnDialog\b\|SettingsDialog\b\|SettingsPanel\b' src | grep -v SettingsPanelBody
grep -rn 'BooleanToggle\|StatusPanel\b\|primitives/Card\b' src
grep -rn 'Square\|Diamond\|Moss\|Slate\|Dusk\|Chime' src   # POLISH-07 readability overlap (cluster 44-05)

# 2. Stale phase-narration markers (broad pattern):
grep -rEn '^\s*//\s*Phase \d+' src | wc -l
# Expected: ≤ N where N = the historically-justified phase-numbered comments
# (e.g. previewContext's D-01/D-02/D-03 are KEPT; the `// Phase 18 Plan 03:` test-trace comments may be dropped)

# 3. "Scheduled for removal" / "legacy" / "deprecated" sweeps:
grep -rn 'scheduled for removal\|legacy modal\|deprecated\|TODO\|FIXME\|XXX\|HACK' src
# Expected: zero (or all dispositioned in 44-INFO-FINDINGS.md)
```

#### Per-cluster commit (D-02)

```
docs(44): Tiger Style WHY-only comment sweep (POLISH-04)

<N> files touched; comments only — zero code behavior change.

Removed narration-of-WHAT patterns:
  - <category 1, e.g. "stale phase-narration in test files">: <count>
  - <category 2, e.g. "scheduled-for-removal markers">: <count>

Kept WHY-comments (invariants, constraints, workarounds) — per Tiger Style
rule encoded in MEMORY.md and Item I (commit `80da948`).

Verified:
  npx tsc --noEmit -p tsconfig.app.json   # clean
  npm run lint                            # 0/0
  npm test -- --run                       # <X> files / <Y> tests pass (== pre-sweep)
  npm run build                           # clean
```

---

### Plan 44-04 — `REFACTOR-PASS.md` (POLISH-05)

**Role:** refactor pass · **Data flow:** LSP rename + Edit + primitive extraction

**Primary analog (LSP-fallback rename mechanic):** Refactor-loop Item H commit `4457259` — `learnDialogModel.{ts,test.ts}` → `learnPanelModel.{ts,test.ts}` via `git mv` + per-file manual Edit (LSP server unavailable for `.ts` in environment; documented fallback per `[[use-lsp-for-renames]]`).

**Secondary analog (primitive extraction):** Refactor-loop Item E commit `bd22ca5` — `PickerCardGrid<T>` primitive extracted; 4 pickers each shrink from ~60 LOC to ~22-40 LOC adapters. JS bundle -2.4 KB. **Behavioral byte-equivalence verified by all 4 picker tests passing unchanged.**

#### IMPORTANT FINDING — `.orb-layer--in/--out` rename is OBSOLETE

> **Live-code verification before planning** (per [[spike-implementation-fidelity]] / spike-loop discipline):
>
> ```bash
> grep -rn '\.orb-layer\|\.shape-layer' src/ --include="*.css" --include="*.tsx" --include="*.ts"
> ```
>
> Returns **exactly one hit**: `src/styles/theme.contrast.test.ts:121` — a **comment** documenting that the `.orb-layer--in/--out` gradient crossfade no longer exists post-J4 (the orb body is now halos + centre disc per Phase 41 J4 commit `a742c0b`).
>
> The CSS classes `.orb-layer--in` / `.orb-layer--out` were **deleted in Phase 41 J4** as part of the orb rewrite. There is NO class to rename. The STATE.md "v1.x deferred" item for this rename is **STALE** — the deferral was obviated by the redesign and should be dispositioned `obsolete-by-redesign`.
>
> **Action for the planner:** the 44-04 plan should record this finding in its `Downstream Constraints` section, then either:
> - (a) drop the rename from 44-04 scope entirely, and update STATE.md's deferred list to reflect the obsoletion; OR
> - (b) re-scope the "rename" to mean updating the single archived comment at `theme.contrast.test.ts:121` to drop the now-mysterious `.orb-layer--in/--out` reference (since the reader can no longer grep for it).
>
> Per D-06 wording ("operator-confirmed in scope IF IT DOESN'T BREAK THINGS") and D-15 / [[v2-carryforward-disposition]]: option (a) honors the operator intent. The rename only existed to fix naming inconsistency between TS `.shape-*` and CSS `.orb-*`; that inconsistency no longer exists because the CSS classes are gone.

#### Primitive duplication audit (D-06 "moderate scope") — concrete dedup candidates

The CONTEXT D-06 mentions "obvious primitive duplication discovered by grep/scan (e.g., SettingsSegmentedRow vs SettingsToggleRow vs SettingsForm patterns — audit during planning)". Live grep verification:

```bash
# All three Settings*Row components share the row chrome:
#   <fieldset aria-label={ariaLabel} className="... border-t border-[var(--color-border-soft)] py-3">
#     <span className="text-[15px] font-normal text-[var(--color-breathing-text)]">{label}</span>
#     <child>
#   </fieldset>

grep -l 'border-t border-\[var(--color-border-soft)\]' src/components/
# → SettingsSegmentedRow.tsx, SettingsToggleRow.tsx, SettingsStepper.tsx (3 files)

grep -l 'fieldset' src/components/ --include="*.tsx" | grep -v test
# → SettingsSegmentedRow.tsx, SettingsToggleRow.tsx, SettingsStepper.tsx (3 files)
```

**Candidate primitive:** `SettingsRow` — wraps `<fieldset aria-label className="border-t border-[var(--color-border-soft)] py-3 ...">` with `label` + `children` props. The three existing rows become thin adapters wrapping `SettingsRow` with their own child (Stepper, SegmentedControl, Toggle). This mirrors Item E's `PickerCardGrid<T>` mechanic exactly.

#### LSP-rename safety contract (D-07)

Per CONTEXT D-07 verbatim:
- **Before commit:** per-commit green-gate must pass (`tsc + lint + test + build` all green)
- **TS identifiers:** use LSP rename; if LSP unavailable, fall back to per-file Edit + grep verification across `.tsx` / `.css` / `.test.tsx`
- **CSS class names:** per-file Edit pass with grep verification
- **No logic / state / audio / persistence changes** per [[design-logic-separation]]

If 44-04 includes a TS-symbol rename (e.g. as part of primitive extraction), follow Item H's documented LSP-fallback mechanic verbatim:

```bash
# Step 1 — grep all reference sites (type-aware narrow):
grep -rn '<old-symbol-name>' src/

# Step 2 — for EACH file in the grep output, use the Edit tool (NEVER sed/perl/regex per [[use-lsp-for-renames]]):
#   - Edit definition site
#   - Edit each importer site
#   - Edit each test site

# Step 3 — re-grep to confirm zero remaining references:
grep -rn '<old-symbol-name>' src/   # MUST return zero
```

If LSP IS available in the executor's environment for `.ts` / `.tsx`, prefer LSP rename — Item H only fell back because LSP was unavailable in that specific env.

#### Per-cluster commit (D-02)

```
refactor(44): primitive dedup + <other refactor concerns> (POLISH-05)

<one-paragraph summary — what was extracted / renamed / dedup'd>

Verified:
  npx tsc --noEmit -p tsconfig.app.json   # clean
  npm run lint                            # 0/0
  npm test -- --run                       # <X> files / <Y> tests pass — behavioral byte-equivalence
  npm run build                           # clean. JS bundle <before> → <after> KB (<delta>)
```

---

### Plan 44-05 — `READABILITY.md` (POLISH-07 remainder)

**Role:** readability · **Data flow:** sweep (broader readability beyond J18)

**Primary analog:** Phase 41 J18.2 commit `ba12418` (`vm.appHeader` viewmodel field deletion — TS-enforced top-to-bottom: interface → derivation → callsite → tests) + J18.3 commit `f562ff1` (LOCKED_COPY orphan trim).

**Secondary analog (audit mechanic):** Phase 41 J18 archive items J18.1–J18.8 generally — the orphan-cleanup pattern:
1. Grep / static-analysis to surface candidate orphans
2. **Live-code verification** to confirm "nothing imports / consumes / writes / reads this"
3. Single atomic deletion commit per orphan group
4. State file commit pinning the cleanup commit hash

#### POLISH-07 ROADMAP success criterion

> "a readability pass leaves no leftover references to Square/Diamond/Moss/Slate/Dusk/Chime in code or copy (POLISH-05..07)"

Some of this is already locked by drift-guards (`content.no-removed-variants.test.ts` for Square/Diamond; `content.no-removed-themes.test.ts` for Moss/Slate/Dusk). The POLISH-07 readability remainder is for any prose / comment / docstring references that the drift-guards don't catch.

#### Audit mechanic (live grep)

```bash
# Per POLISH-07 ROADMAP — these names should not appear in code or copy:
grep -rin 'square\|diamond\|moss\|slate\|dusk\|chime' src/ \
  | grep -v '.test.' \
  | grep -v -E 'content\.no-removed-(themes|variants)\.test\.ts'

# Expected: zero hits OR all hits are in archived comments documenting the
# removal (e.g. "// Phase 38 D-03: ... [historical removal of Square/Diamond]").
# Per D-05 obsolete-by-redesign threshold: archived removal-history comments
# are KEPT only when they encode WHY the current shape is shape it is.
```

If the sweep surfaces hits, dispose them in 44-05-SUMMARY.md with one of:
- **delete** — comment / doc no longer aids reader understanding
- **rewrite** — replace name reference with structural description
- **keep with rationale** — encodes a load-bearing WHY (rare)

#### Overlap with cluster 44-03 (comment audit)

POLISH-07 readability and POLISH-04 comment audit overlap heavily. Per CONTEXT Claude's Discretion (final bullet): "Whether POLISH-07 readability remainder lands as its own plan ... or folds into POLISH-04 ... — planner picks based on the actual delta found."

Recommend: keep 44-05 separate IF the delta after 44-03 is non-trivial (>5 hits). If 44-03's comment sweep effectively zeroes the grep above, fold 44-05 into 44-03 with a one-line note in the SUMMARY ("POLISH-07 readability remainder closed by the 44-03 comment sweep; no separate plan needed").

#### Per-cluster commit (D-02)

```
docs(44): readability sweep — POLISH-07 remainder (no leftover Square/Diamond/Moss/Slate/Dusk/Chime refs)

<N> files touched; comments / prose only.

Verified:
  grep -rin 'square|diamond|moss|slate|dusk|chime' src/ \
    | grep -v '.test.' \
    | grep -v -E 'content\.no-removed-(themes|variants)\.test\.ts'
  # → 0 hits (or all kept with rationale per 44-05-SUMMARY.md)

  npx tsc --noEmit -p tsconfig.app.json   # clean
  npm run lint                            # 0/0
  npm test -- --run                       # unchanged
  npm run build                           # clean
```

---

### Plan 44-06 — `SECURITY-REVIEW.md` (POLISH-06)

**Role:** security review · **Data flow:** threat model → register → audit trail (`/gsd:secure-phase 44` output)

**Primary analog:** `.planning/phases/40-timbre-preview-cue/40-SECURITY.md` — the most recent in-tree SECURITY.md, and it directly covers ONE of the three Phase 44 attack surfaces (preview audio path).

**Secondary analog (`threats_open: 0` short-circuit shape):** `.planning/milestones/v1.1-phases/13-inner-ring-ux-symmetry/13-SECURITY.md` — canonical "verified, threats_open: 0" frontmatter.

#### Phase 44-06 threat scope (D-15 verbatim)

CONTEXT D-15 names the three NEW attack surfaces the security review focuses on:

1. **Preview audio path** — `src/audio/previewContext.ts` (Phase 40, lands J5)
   - Already covered by `40-SECURITY.md` (11 threats, ASVS L2, status `verified`). Phase 44-06 inherits the disposition and re-verifies it still holds.
2. **Query-string dev toggles** — `?breathingShape=` and `?orbIdle=` (Phase 41 J5 / J6)
   - Wired through `src/featureFlags.ts`. No prior SECURITY.md covers this (Phase 41 didn't produce one — spike-loop format absorbed it). Threat model is NEW for 44-06.
3. **Font asset hosting** — `@fontsource-variable/inter` woff2 bundling (Phase 41 J2)
   - Self-hosted via Workbox precache (Latin + Latin-ext, 7 fonts). No prior SECURITY.md covers this.

#### Threat model construction (per D-15 wording)

> "/gsd:secure-phase 44 runs against the full milestone surface; planner constructs the threat model from the changed-file set across Phases 36–41."

Changed-file set boundary:

```bash
# All files touched by v2.0 milestone (commits since the v1.5 ship at ~2026-05-19):
git log --since=2026-05-20 --name-only --pretty=format: \
  | sort -u | grep -E '^src/'   # filter to source files
```

Per the changed-file set, the threat surfaces are categorized in `40-SECURITY.md` style:

| Boundary | Description | Data Crossing | Reference SECURITY.md |
|----------|-------------|---------------|------------------------|
| user-gesture → AudioContext creation (TimbrePicker preview) | First preview tap chains synchronously into `new AudioContext()` | gesture-only signal | `40-SECURITY.md` (T-40-04, T-40-11) — inherit |
| URL query-string → featureFlags parser → render | URL parameters parsed by `parseQueryFeatureFlag` and consumed by OrbShape / OrbContainer | URL-borne strings (case-insensitive, default-on-junk) | NEW for 44-06 |
| Network → service-worker → font cache → DOM | woff2 files served from precache via Workbox; CSP-bound | binary font payload | NEW for 44-06 |
| In-process function calls between TS modules | All other v2.0 surface | TS-narrowed types | inherit from each phase's SECURITY.md |

#### Frontmatter shape (target — `40-SECURITY.md:1-8`)

```yaml
---
phase: 44
slug: final-polish
status: verified         # or 'open' if threats_open > 0
threats_open: 0          # target — close all in this audit
asvs_level: 2            # inherit Phase 40 level; bump to 3 only if operator requires
created: 2026-05-25
---
```

#### Body section outline (mirror `40-SECURITY.md`)

- `# Phase 44 — Security`
- `## Trust Boundaries` (table — 4 boundaries above)
- `## Threat Register` (table: Threat ID | Category | Component | Disposition | Mitigation | Status — STRIDE-categorized; inherit 11 from Phase 40; add ~5-10 for query-string + font-asset surfaces)
- `## Accepted Risks Log` (AR-44-NN rows for each `accept` disposition)
- `## Security Audit Trail` (1 row — `2026-05-25 | <N total> | <N closed> | 0 | gsd-security-auditor (ASVS L2)`)
- `## Sign-Off` (checkbox list + **Approval:** verified 2026-05-25)

#### Per-cluster commit (D-02)

```
docs(44): security review for v2.0 milestone surface (POLISH-06)

/gsd:secure-phase 44 against the full Phase 36–41 changed-file set.
Threat surfaces in scope per CONTEXT D-15:
  - Preview audio path (src/audio/previewContext.ts) — inherits 40-SECURITY.md
  - Query-string dev toggles (?breathingShape=, ?orbIdle=) — new register
  - Font asset hosting (@fontsource-variable/inter via Workbox precache) — new register

Output: 44-SECURITY.md (status: verified, threats_open: 0)
```

---

### Plan 44-07 — `INVARIANTS-VERIFY.md` (POLISH-08 + POLISH-09)

**Role:** invariant verification · **Data flow:** git-log walk + `package.json` diff + per-commit gate replay

**Primary analog:** `.planning/phases/41-spike-mono-zen/41-VERIFICATION.md` — per-requirement evidence table with commit pins.

**Secondary analog (split-gate / push pattern):** Phase 36 plan `36-09` — the green-gate-and-push pattern. Per CONTEXT D-11 (verbatim): "split the green-gate into the typecheck + build + test triad ... and defer lint to Phase 44 — that deferral is closed as a no-op since Phase 41 work already resolved the 53-error backlog. POLISH-09 verification confirms this held through milestone close."

#### POLISH-08 verification (zero net-new runtime deps)

**Check:**

```bash
# Compare package.json `dependencies` block at start of v2.0 vs end of v2.0:
git show v1.5-tag:package.json | grep -A20 '"dependencies"'   # if a v1.5 tag exists; otherwise use the last v1.5 ship commit
git show HEAD:package.json    | grep -A20 '"dependencies"'

# Expected: both blocks contain exactly `react` + `react-dom`.
# Confirmed at CONTEXT baseline (commit 580dc53, 2026-05-25):
#   "dependencies": {
#     "@fontsource-variable/inter": "^5.2.8",     # asset, not code dep — per POLISH-08 note
#     "react": "^19.2.5",
#     "react-dom": "^19.2.5"
#   }
```

`@fontsource-variable/inter` is documented in `41-VERIFICATION.md` line 43 as a runtime *asset* (woff2 files in `dist/`), not a code dependency. POLISH-08 verification confirms this disposition is correctly recorded.

#### POLISH-09 verification (per-commit green-gate held)

**Check:**

```bash
# Walk every commit on main since Phase 36 start; for each, verify the per-commit
# green-gate would pass IF re-run today (the historical run is unavailable, but
# the contract is "tsc + lint + test + build" exits 0 per commit).
#
# Per CONTEXT D-11 baseline: lint clean (0/0), tsc clean, 1155 tests pass, build clean
# at commit 580dc53. Phase 36 deferred the lint half (53 errors / 3 warnings);
# Phase 41 resolved it during the spike loop. POLISH-09 confirms this.

git log --oneline 580dc53..HEAD    # commits since CONTEXT baseline (should be empty until 44-01 lands)

# For the milestone retrospectively:
git log --oneline <v1.5-ship>..HEAD | wc -l    # total commits in v2.0
```

Replay isn't tractable per-commit (would be O(N) build cycles). Instead, POLISH-09 verification asserts:
1. The CONTEXT baseline at commit `580dc53` passes the gate (re-run today — already in CONTEXT baseline section)
2. Every Phase 44 cluster commit (44-01 through 44-07) passes the gate (re-run after each cluster lands)
3. The Phase 41 spike-loop "per-item green-gate maintained" claim (41-VERIFICATION.md POLISH-09 row) is the evidence for Phases 36–41

#### VERIFICATION.md frontmatter shape (target — `41-VERIFICATION.md:1-29`)

```yaml
---
phase: 44-final-polish
verified: 2026-05-25T<HH:MM:SS>Z
status: passed                       # 0 open Warning findings + invariants hold
score: 9/9 POLISH-XX requirements satisfied
overrides_applied: 0
re_verification:
  previous_status: none
  previous_score: n/a
  gaps_closed: []
  gaps_remaining: []
  regressions: []
human_verification: []               # POLISH is automated; no UAT
---
```

#### Body section outline (mirror `41-VERIFICATION.md`)

- `# Phase 44 Verification — Final polish closeout`
- `**Verifier:** Operator + per-cluster verification (each cluster ran tsc + lint + tests + build before commit)`
- `## Requirements Coverage`
  - `### POLISH — Final polish (9/9 satisfied)` — per-requirement evidence table

| ID | Status | Evidence |
|---|---|---|
| POLISH-01 | ✅ verified | `/gsd:code-review --all --fix` mega-commit at <sha>. 44-REVIEW.md status `clean` (0 Warning). |
| POLISH-02 | ✅ verified | 28 Info findings dispositioned in `44-INFO-FINDINGS.md`. <N> fixed in mega-commit; <N> defer-with-reason; <N> obsolete-by-redesign. |
| POLISH-03 | ✅ verified | Test cleanup at <sha>. Final count: <X> files / <Y> tests. No flake in 3× consecutive runs. |
| POLISH-04 | ✅ verified | Tiger Style WHY-only comment sweep at <sha>. <N> files touched; comments only. |
| POLISH-05 | ✅ verified | Refactor pass at <sha>. <one-line summary of dedup/rename landed>. |
| POLISH-06 | ✅ verified | `44-SECURITY.md` written at <sha>. status `verified`, threats_open: 0. |
| POLISH-07 | ✅ verified | Readability remainder closed by <44-05-SUMMARY or folded into 44-03>. Zero leftover Square/Diamond/Moss/Slate/Dusk/Chime refs. |
| POLISH-08 | ✅ verified | `dependencies` in `package.json` at HEAD is `react` + `react-dom`. `@fontsource-variable/inter` is an asset, not a code dep (per Phase 41 disposition). |
| POLISH-09 | ✅ verified | Per-commit green-gate held through milestone close. CONTEXT baseline verified; each cluster commit ran gate before push. |

#### Per-cluster commit (D-02)

```
docs(44): invariant verification — POLISH-08 + POLISH-09 (POLISH-08, POLISH-09)

Output: 44-VERIFICATION.md (status: passed, 9/9 POLISH requirements satisfied)

POLISH-08 evidence: package.json dependencies unchanged since v1.0 — react + react-dom only.
POLISH-09 evidence: per-commit green-gate held; baseline at commit 580dc53 confirmed at start
of phase; every 44-NN cluster ran tsc + lint + test + build before commit.

Verified:
  npx tsc --noEmit -p tsconfig.app.json   # clean
  npm run lint                            # 0/0
  npm test -- --run                       # final count locked
  npm run build                           # clean
```

---

## Shared Patterns

### Per-commit green-gate (apply to every Phase 44 commit)

**Source:** CONTEXT D-11 (verbatim) + Phase 41 spike-loop pattern (per-item gate maintained throughout) + Phase 36 plan 36-09 split-gate documentation.

**Apply to:** every commit in clusters 44-01 through 44-07.

```bash
# The canonical command per CONTEXT D-11 baseline:
npx tsc --noEmit -p tsconfig.app.json && npm run lint && npm test -- --run && npm run build

# Each must exit 0. If lint fails, do NOT skip per Phase 41 lesson — lint is now
# part of the gate again per CONTEXT D-11 (deferral closed as no-op).
```

### Propose-step checklist (apply to every plan, D-13)

**Source:** [[propose-step-checklist]] memory rule (mandatory since Item H first applied it). CONTEXT D-13: "Mandatory propose-step checklist applies to every Phase 44 plan ... Downstream Constraints + Applicable Memory Rules sections BEFORE Goal/Scope/Risk. No exceptions for 'small' cleanup plans."

**Apply to:** every plan in 44-01 through 44-07.

Each PLAN.md must open with these two sections (BEFORE Goal/Scope/Risk):

```markdown
## Downstream Constraints

What downstream tasks might this change constrain?
- [constraint 1 — concrete, specific]
- [constraint 2 — ...]

## Applicable Memory Rules

Which rules from MEMORY.md apply to this work?
- [[memory-rule-name]] — why it applies / how it's honored
- [[memory-rule-name-2]] — ...
```

The applicable memory rules for Phase 44 (most/all clusters):
- [[propose-step-checklist]] — meta-rule, applies to every propose-step
- [[no-design-locking]] — applies to 44-02 (test cleanup) explicitly per D-14; also any test edit
- [[use-lsp-for-renames]] — applies to 44-04 explicitly per D-07
- [[design-logic-separation]] — applies to 44-04 explicitly per D-07; also any refactor
- [[ack-dont-fix-inline]] — applies during operator feedback dumps within any cluster
- [[chat-not-pickers]] — meta-rule
- [[design-review-visual-only]] — applies if any visual review surfaces during 44-05/06

### [[no-design-locking]] guard (D-14)

**Source:** [[no-design-locking]] memory rule + CONTEXT D-14: "Tests must not re-introduce design-token-locking assertions per [[no-design-locking]]. POLISH-03 test cleanup specifically watches for and removes any such assertions found."

**Apply to:** primarily 44-02 (test cleanup); secondarily any cluster that edits tests.

Mechanism: refactor-loop Item H commit `4457259` body (lines 90–106 of REFACTOR-LOOP-STATE.md) documents the 7 primitive test files and the exact swap pattern (drop class-locking assertions; substitute behavioral / aria / prop-API assertions).

### Atomic commit scope-prefixing (per CONTEXT D-07 lineage)

**Source:** Phase 36/37/38/39/40 PATTERNS precedent — `<type>(NN): <subject>` commit message scope-prefix.

**Apply to:** all Phase 44 commits.

| Cluster | Type prefix |
|---------|-------------|
| 44-01 | `fix(44): ...` |
| 44-02 | `test(44): ...` |
| 44-03 | `docs(44): ...` |
| 44-04 | `refactor(44): ...` |
| 44-05 | `docs(44): ...` (comment-/prose-only) or `refactor(44): ...` if code touched |
| 44-06 | `docs(44): ...` (SECURITY.md output) |
| 44-07 | `docs(44): ...` (VERIFICATION.md output) |

### Drift-guard preservation invariant

**Source:** Phase 39 D-06 exit-ramp policy + Phase 41 J18.8 + CONTEXT canonical_refs.

**Apply to:** any cluster that touches `src/content/content.no-*.test.ts` or `src/audio/previewContext.no-audioengine-import.test.ts` or `src/styles/theme.no-hardcoded-classes.test.ts`.

These 7 drift-guard tests are STRUCTURAL LOCKS. **Deleting one is the explicit unlock** for re-introducing the corresponding banned pattern. Phase 44 should NOT delete any of these unless an operator decision deliberately unlocks the pattern — and that decision belongs in 44-INFO-FINDINGS.md or a separate `disposition` note in the cluster's SUMMARY.

```
src/content/content.no-removed-keys.test.ts
src/content/content.no-removed-themes.test.ts
src/content/content.no-removed-variants.test.ts
src/content/content.no-review-markers.test.ts
src/content/content.no-stats-ui.test.ts
src/audio/previewContext.no-audioengine-import.test.ts
src/styles/theme.no-hardcoded-classes.test.ts
```

### Live-code verification before sweep (per spike-loop discipline)

**Source:** Phase 41 spike-loop "Session start protocol" Step 5 (verbatim) — "Memories are point-in-time snapshots; the codebase is live. Before proposing any item, grep/Read to confirm: The thing the item claims to add doesn't already exist / The thing the item claims to remove still exists / The naming/structure assumptions in the proposal match current files / No related feature has shifted since the memory was written."

**Apply to:** EVERY plan cluster, but especially 44-04 (where the `.orb-layer` rename is OBSOLETE — see 44-04 cluster above).

Concrete: before proposing any deletion / rename / refactor, run the grep that proves the target still exists in the live code, AND that the rationale (orphan / duplicate / dead-code) still holds. This pattern is what surfaced the `.orb-layer` obsolescence above.

---

## No Analog Found

| Cluster / Artifact | Role | Data Flow | Reason |
|--------------------|------|-----------|--------|
| `44-01-PLAN.md` mega-commit boundary | code-review-fix | review → fix → re-verify | Phase 36's REVIEW-FIX (`36-REVIEW-FIX.md`) handled ONE finding in one iteration. Phase 44's mega-commit per D-01 is a much larger surface (28 Info findings + any Warning findings from a fresh `--all` run). No prior phase has done a mega-commit at this scale; the executor must apply the per-finding atomicity discipline (each finding's fix is its own diff section within the single commit, with the diff section header citing the finding ID — gives the reviewer a tractable surface) while still landing as a single mega-commit per D-01. |
| Phase 41 / 43 absorbed into 41 — no separate PATTERNS.md exists | n/a | n/a | Phase 41 used spike-loop format and did not produce a PATTERNS.md. The 41-SPIKE-LOOP-ARCHIVE.md is the implementation log; the per-J-item analogs are documented in line in CONTEXT D-XX entries above. |

---

## Pattern Mapping Decisions Summary

| Decision | Rationale |
|----------|-----------|
| 44-01 follows Phase 36's REVIEW + REVIEW-FIX pattern (not a feature-PLAN pattern) | The mega-commit is review-driven, not feature-driven. The two prior REVIEW-FIX artifacts in `.planning/phases/` are 36 and 40 — 36 is the structurally closer match (single mega-commit; 40 was per-finding atomic). D-01 locks mega-commit shape. |
| 44-02 inherits 3 distinct sweep analogs (J18.1 / Item F2 / Item H) | Each addresses a different cleanup category: dead-component-test deletion (J18.1), redundant-overlap-test deletion (F2), design-token-locking-assertion removal (H). POLISH-03 spans all three. |
| 44-03 inherits Item I's sibling-pattern cleanup mechanic | I caught what H missed because H "applied the rule narrowly, not broadly". POLISH-04 IS the broad sweep — must explicitly search for sibling patterns of any prior fix. |
| 44-04 surfaces the `.orb-layer` obsolescence finding upfront | Live-code grep confirms the class no longer exists. Per [[spike-implementation-fidelity]] + live-code discipline, this MUST be the first finding in the cluster proposal. STATE.md "v1.x deferred" item for this rename is stale (per D-12 wording about REFACTOR-LOOP-STATE.md "bookkeeping leak"). |
| 44-04 candidate primitive `SettingsRow` surfaced from D-06 grep | Three components (Stepper, SegmentedRow, ToggleRow) share row chrome exactly. Item E's `PickerCardGrid<T>` is the precedent for this kind of extraction. Operator may scope this in or out at plan time. |
| 44-05 may fold into 44-03 based on actual delta | CONTEXT Claude's Discretion (final bullet) — POLISH-04 + POLISH-07 overlap. If 44-03's grep zeroes the POLISH-07 grep, fold and save a commit. |
| 44-06 inherits 40-SECURITY.md structure verbatim | Most recent SECURITY.md; directly covers one of three D-15 attack surfaces. The other two (query-string + font asset) are NEW threat-register entries appended in the 44-SECURITY.md output. |
| 44-07 uses 41-VERIFICATION.md per-requirement table shape | Most recent verification with per-requirement evidence + commit pins. POLISH-08/09 are invariant verifications (not feature satisfaction) but share the same evidence-and-pin structure. |
| Drift-guard tests preserved (per D-06 exit-ramp policy lineage) | Phase 39 D-06 → Phase 38 D-06 → Phase 37 D-11 → J18.8: deletion of a drift-guard is the explicit unlock. POLISH-03 must not weaken them per CONTEXT canonical_refs. |
| Live-code verification before any sweep | Spike-loop Step 5; surfaced the `.orb-layer` obsolescence and may surface more during plan execution. Treats every memory/STATE entry as a point-in-time snapshot to be re-verified. |

---

## Metadata

**Analog search scope:**
- `.planning/phases/36-housekeeping-bookkeeping-reset/` — REVIEW.md + REVIEW-FIX.md + deferred-items.md + 36-PATTERNS.md (full set of code-review-fix analogs)
- `.planning/phases/40-timbre-preview-cue/` — most recent SECURITY.md + REVIEW.md + 40-PATTERNS.md (live structural analog for preview audio threat surface)
- `.planning/phases/41-spike-mono-zen/` — 41-CONTEXT.md + 41-SPIKE-LOOP-ARCHIVE.md (J18.1–J18.8 sweep mechanics) + 41-VERIFICATION.md + 41-SUMMARY.md
- `.planning/phases/{37,38,39}-…/` — secondary drift-guard / clean-cut deletion / per-cluster commit precedents
- `.planning/REFACTOR-LOOP-STATE.md` — Items E (primitive extraction), F2 (redundant-test removal), H (design-token-locking + LSP-fallback rename), I (sibling-pattern comment cleanup) — directly load-bearing for clusters 44-02 / 44-03 / 44-04
- `.planning/STATE.md` Pending Todos — `.orb-layer` rename entry verified STALE
- `src/` — live-code grep verification:
  - `.orb-layer` / `.shape-layer` — only 1 archived comment hit at `src/styles/theme.contrast.test.ts:121`
  - Settings*Row trio — 3 components share `fieldset` + `border-t border-[var(--color-border-soft)]` row chrome (44-04 dedup candidate)
  - Drift-guard tests — 7 confirmed in tree (4 named in CONTEXT + 3 inherited from earlier phases)
  - Test count baseline — 107 files in tree (matches CONTEXT)
  - Phase-narration grep — 98 hits for `^\s*// Phase \d+` (44-03 candidate sweep surface)
- `package.json` — `dependencies` confirms POLISH-08 baseline (`react` + `react-dom` only; `@fontsource-variable/inter` documented as asset)

**Files scanned (Read):** 11
- `.planning/phases/44-final-polish/44-CONTEXT.md`
- `.planning/ROADMAP.md`
- `.planning/REQUIREMENTS.md`
- `.planning/STATE.md`
- `.planning/phases/41-spike-mono-zen/41-CONTEXT.md`
- `.planning/phases/40-timbre-preview-cue/40-CONTEXT.md`
- `.planning/phases/39-theme-simplification/39-CONTEXT.md`
- `.planning/REFACTOR-LOOP-STATE.md`
- `.planning/phases/36-housekeeping-bookkeeping-reset/36-PATTERNS.md`
- `.planning/phases/40-timbre-preview-cue/40-PATTERNS.md`
- `.planning/phases/40-timbre-preview-cue/40-SECURITY.md`
- `.planning/phases/41-spike-mono-zen/41-VERIFICATION.md`
- `.planning/phases/41-spike-mono-zen/41-SUMMARY.md`
- `.planning/phases/36-housekeeping-bookkeeping-reset/36-REVIEW.md`
- `.planning/phases/36-housekeeping-bookkeeping-reset/36-REVIEW-FIX.md`
- `.planning/phases/36-housekeeping-bookkeeping-reset/deferred-items.md`
- `.planning/phases/41-spike-mono-zen/41-SPIKE-LOOP-ARCHIVE.md` (first 200 lines)

**Files inspected (Bash + grep):** 14
- `src/` tree structure (ls)
- `src/audio/previewContext.ts` (full read)
- `src/components/OrbShape.tsx` (top 80 lines)
- `src/components/SettingsSegmentedRow.tsx`, `SettingsToggleRow.tsx`, `SettingsStepper.tsx`, `SettingsSectionHeader.tsx`, `SettingsFormShell.tsx` (full reads — primitive-dedup candidates)
- `src/featureFlags.ts` (top 60 lines — query-string parser for 44-06)
- `src/styles/theme.contrast.test.ts:110-130` (.orb-layer comment confirmation)
- `src/styles/theme.no-hardcoded-classes.test.ts` (top 50 lines — drift-guard mechanic)
- `src/content/content.no-removed-keys.test.ts` (top 80 lines — J18.8 drift-guard)
- `src/app/pages/AppSettingsPage.tsx` (top 60 lines)
- `package.json` (full — POLISH-08 baseline)
- `git status` + tree counts (107 test files / 1071 grep-counted `it()` blocks — actual 1155 per CONTEXT)

**Pattern extraction date:** 2026-05-25
