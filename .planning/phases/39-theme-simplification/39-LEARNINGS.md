---
phase: 39
phase_name: "theme-simplification"
project: "HRV Breathing WebApp"
generated: "2026-05-21"
counts:
  decisions: 13
  lessons: 7
  patterns: 10
  surprises: 6
missing_artifacts:
  - "39-UAT.md"
---

# Phase 39 Learnings: theme-simplification

## Decisions

### D-01: Narrow ThemeId union without STATE_VERSION bump
Tighten `ThemeId` to `'light' | 'dark' | 'system'`; keep the persisted `theme` field; let the unchanged `coerceTheme` body (`isValidTheme(raw) ? raw : DEFAULT_THEME`) auto-coerce deprecated values to `'system'` on read. No STATE_VERSION bump.

**Rationale:** Phase 8 D-01 envelope tolerance + per-field coercer already carries forward-compat. A version bump would be unnecessary migration code; the union shrink IS the migration. Same stance as Phase 38.
**Source:** 39-01-SUMMARY.md, 39-01-PLAN.md

---

### D-02: Two-level THM-05 regression test added up-front
Add `read-coerce` + `round-trip` regression tests in Plan 01 itself, locking the deprecated-value forward-compat contract before any other surface is touched.

**Rationale:** Phase 38 VAR-05 was captured retroactively (commit 4bd5e78); doing it up-front avoids a retroactive validation cycle and makes the keystone plan exercise the contract.
**Source:** 39-01-SUMMARY.md, 39-01-PLAN.md

---

### D-03: Drift-guard file path collocation
Drift-guard file lives at `src/content/content.no-removed-themes.test.ts` — same `src/content/content.no-*.test.ts` glob as Phase 26, 37, 38 lineage.

**Rationale:** Future readers can `ls src/content/content.no-*.test.ts` to enumerate every fs-scan drift-guard at a glance.
**Source:** 39-05-SUMMARY.md

---

### D-04: 12-entry forbidden-token list
Banlist contains 8 plain-substring tokens (2 lowercase ids + 3 EN display + 3 PT-BR display) + 1 word-bounded regex (lowercase `slate`) + 3 multi-token regex (persisted-pref literal, CSS attribute selector, object-key entry).

**Rationale:** Covers all 4 token classes a regression could reintroduce: type literals, display strings, persistence, and CSS selectors.
**Source:** 39-05-SUMMARY.md

---

### D-05: 4-root scan coverage
Drift-guard scans `src/components/`, `src/app/`, `src/content/`, `src/styles/` with `.ts`/`.tsx`/`.css` filter and `.test.ts`/`.test.tsx` exclusion.

**Rationale:** Covers render paths, i18n catalogs, and CSS tokens. Test files are excluded so the guard does not self-flag on its own literal token strings.
**Source:** 39-05-SUMMARY.md

---

### D-06: Exit-ramp policy — delete-the-file = unlock
Any future deliberate phase that re-introduces a deprecated palette name (or claims `moss`/`slate`/`dusk` for a new palette) explicitly deletes `content.no-removed-themes.test.ts` with rationale in that phase's SUMMARY.

**Rationale:** Makes the unlock visible and intentional — no quiet bypass; documented in WHY-comment header at the top of the drift-guard file.
**Source:** 39-05-SUMMARY.md

---

### D-07: i18n clean-cut deletion
Strip `themes.moss`/`slate`/`dusk` from UiStrings type + EN + PT-BR catalogs in one move, no `[review-needed]` markers.

**Rationale:** Mirrors Phase 38 D-08; LOCKED_COPY guard untouched (palette display strings were never locked).
**Source:** 39-03-SUMMARY.md

---

### D-08: Surgical FOUC IIFE excision
Exactly 2 touch-points in `index.html:18` — allowlist shrink + color map shrink. Deletion-only; byte-preserve IIFE wrapper, matchMedia branch, catch fallback, and single-line shape.

**Rationale:** matchMedia + catch fallbacks already wrote only `'light'`/`'dark'`, so they needed no edit (the "no third touch-point" clause). Pre-paint contract is load-bearing — minimum-touch is the safety property.
**Source:** 39-04-SUMMARY.md

---

### D-09: Per-theme floors table preserved as Record shape
`THEME_05_FLOORS: Record<Exclude<ThemeId, 'system'>, number>` keeps its table shape; only the literal members shrink from 5 to 2.

**Rationale:** Phase 41 (Mono Zen) will need room to retune floors against the new palette without touching test scaffolding.
**Source:** 39-02-SUMMARY.md

---

### D-10: FAVICON_COLORS shrink via key deletion
`FAVICON_COLORS` shrinks from 5 to 2 entries; the `Record<Exclude<ThemeId,'system'>, string>` type narrows naturally via Plan 01's union collapse; `Object.freeze()` wrapper and `buildFaviconDataUri` signature unchanged.

**Rationale:** Keeps the table shape and consumer signature stable so downstream hooks (`useFavicon`) are unchanged.
**Source:** 39-02-SUMMARY.md

---

### D-11: Delete-with-component test policy
When deleting a feature, delete its dedicated tests; when deleting a config option that participates in cross-cutting tests, rotate the fixtures rather than deleting cases (see D-12).

**Rationale:** Preserves behavioral coverage of click/disabled/aria-checked invariants while removing the deprecated surface.
**Source:** 39-02-SUMMARY.md, 39-03-SUMMARY.md

---

### D-12: Surgical strip with rotation
For cross-cutting hook/component tests, rotate deprecated theme literals to surviving themes (e.g. `moss → dark`, `dusk/slate → system`) rather than deleting it() blocks.

**Rationale:** Internally consistent rotation maps preserve every it() case and keep before/after deltas non-trivial. Mirrors Phase 38 D-10 / Phase 37 D-07.
**Source:** 39-03-SUMMARY.md, 39-03-PLAN.md

---

### Word-bounded matcher escape valve (threat T-39-16)
When a plain-substring banlist entry collides with a structural keyword (e.g. lowercase `slate` colliding with `translate`/`translate3d`/`translate-x-N`), narrow the matcher to `/(?<![a-zA-Z])X(?![a-zA-Z])/`.

**Rationale:** Preserves the invariant intent (catches `'slate'` quoted literal, `[data-theme='slate']`, `slate:` object key, free-text `slate`) while removing structurally-unavoidable false positives.
**Source:** 39-05-SUMMARY.md (Rule 3 deviation)

---

## Lessons

### Wave 2 deferred-green tsc is intentional
Plan 01 commits `tsc --noEmit` red on purpose — downstream consumers (faviconPalette, contrast.test, strings.ts, FOUC IIFE, theme.css) all reference moss/slate/dusk literals against the now-narrowed type. tsc goes green only at the cumulative wave-2 boundary.

**Context:** Matches Phase 38 Plan 01's documented deferred-green pattern. The keystone plan trades a temporary red gate for a single cohesive cascade across consumers.
**Source:** 39-01-SUMMARY.md, 39-02-SUMMARY.md

---

### Worktree provisioning omitted `node_modules` / `pnpm`
The phase-39 executor worktree was provisioned without `pnpm install`; `pnpm` is not on `$PATH`, only `npm` is. Resolved by running main-repo's `node_modules/.bin/vitest` and `node_modules/.bin/vite` against the worktree cwd.

**Context:** Plans 01 and 04 hit this; tool-mapping operational artifact, not a deviation from plan intent. Vitest's cwd-relative config resolution still picks up the worktree's vitest.config.
**Source:** 39-01-SUMMARY.md, 39-04-SUMMARY.md

---

### Lowercase `slate` substring matcher collides with `translate*`
The plan's claim that lowercase `slate` has zero codebase collisions was empirically wrong. `translate`, `translate3d`, `translate-x-N`, `-translate-x-N`, `translated` appear as structural CSS keywords / Tailwind utility classes in OrbShape, BooleanToggle, StatusPanel, SessionReadout, index.css, and several test files.

**Context:** Forced the Rule 3 deviation to a word-bounded regex matcher. The codebase grep done during planning missed `translate*` because the planner searched for `slate` as a token, not as a substring.
**Source:** 39-05-SUMMARY.md (Auto-fixed Issues #2)

---

### Surviving comments age into stale references after deletion
After Plans 02/03/04 deleted dusk/slate, surviving production comments still mentioned those names (`PracticeToggle.tsx` "on dark/dusk" ×2, `theme.css` "n3 polar slate"). The drift-guard would fail against them until they were rotated.

**Context:** Tiger Style WHY-only comments must be rotated alongside the WHY-claim that's being deleted. Should be folded into the same plan as the drift-guard, not deferred.
**Source:** 39-05-SUMMARY.md (Rule 1 rotations)

---

### Loop-invariant tests auto-shrink without code edits
Existing `for (const id of THEME_OPTIONS)` loops in `strings.test.ts` and `prefs.test.ts` automatically shrink from 6 to 3 iterations when `THEME_OPTIONS` shrinks. No test code edits needed.

**Context:** Data-driven test patterns (loop-invariants, `describe.each`, `CONCRETE_THEMES` filter) act as natural amplifiers of the type-level change.
**Source:** 39-01-SUMMARY.md, 39-02-SUMMARY.md, 39-03-SUMMARY.md

---

### Duplicate it() descriptions are misleading documentation
Plan 03's recommended `moss → dark` rotation in `useFavicon.test.ts` would have collided with an existing L72 dark test, producing two identical it() descriptions in the same describe block.

**Context:** Vitest reports both, but the duplicate description is misleading. Rotated to `light` instead for complementary dark/light mount coverage.
**Source:** 39-03-SUMMARY.md (Auto-fixed Issues #1)

---

### Vite parses surgical edits inside minified single-line IIFE cleanly
`index.html:18` is a 1187-char minified one-liner. Two substring deletions (3 allowlist tokens + 3 hex entries) shrunk it to 1113 chars while preserving the single-line shape. Vite build exits 0; `node --check` on the extracted IIFE exits 0.

**Context:** Deletion-only edits inside minified code are safer than expansions — no whitespace/newline drift. The single-line shape is the verification gate.
**Source:** 39-04-SUMMARY.md

---

## Patterns

### Union narrowing as auto-flip switch
Shrinking a discriminated union (`ThemeId`) + its `_OPTIONS` array makes `isValid*('deprecated')` return false, which routes coerce* through the existing `DEFAULT_*` fallback with zero body edits.

**When to use:** Removing enum members that have a per-field coercer + envelope tolerance already in place. Avoids a STATE_VERSION bump and migration code.
**Source:** 39-01-SUMMARY.md

---

### Forward-compat regression captured up-front
For any deletion that must coerce deprecated persisted values, write the read-coerce + round-trip test in the SAME plan as the deletion, not as a retroactive cleanup.

**When to use:** Any deletion across a persistence boundary. Mirrors Phase 38 VAR-05 (retroactive analog at commit 4bd5e78) applied proactively.
**Source:** 39-01-SUMMARY.md

---

### Record<Exclude<Union, X>, V> auto-narrows
Table-shaped literals annotated as `Record<Exclude<ThemeId, 'system'>, X>` automatically TS-fail when the underlying union shrinks, forcing literal collapse cascades across consumers (FAVICON_COLORS, THEME_05_FLOORS).

**When to use:** Any table keyed by a discriminated-union subset — gives you a compiler-enforced "if you narrow the union, here are the rows you must delete" diagnostic.
**Source:** 39-02-SUMMARY.md

---

### CONCRETE_THEMES filter + describe.each
Data-driven `describe.each(CONCRETE_THEMES)` tests auto-shrink iteration count when the underlying constant shrinks; no test logic edits needed beyond comment-debt.

**When to use:** Any cross-cutting test that exercises every member of a finite enum — keep iteration data-driven from the source-of-truth constant.
**Source:** 39-02-SUMMARY.md

---

### Drift-guard as fs-scan vitest test
Add a vitest test that walks specific source roots, filters by extension, excludes `.test.ts`/`.test.tsx`, and fails if any forbidden token appears. Locks deletions for the codebase's lifetime.

**When to use:** Closing a deletion phase. Phase 39 is the 4th in the lineage (Phase 26 review-markers, Phase 37 stats-UI, Phase 38 shape-variants).
**Source:** 39-05-SUMMARY.md

---

### Verbatim structural twin
Drift-guard files mirror the prior twin byte-for-byte in structure (imports, `collectFiles` helper, scan roots, single describe + 2 it() — sanity floor + main sweep). Only the FORBIDDEN_TOKENS list and failure-message text differ.

**When to use:** Adding a new drift-guard to an existing lineage. Saves the cognitive load of re-deciding shape; future readers can diff guard files to see exactly what's locked.
**Source:** 39-05-SUMMARY.md

---

### Word-bounded matcher escape valve
When `t.includes(X)` collides with a structural keyword (CSS property, Tailwind utility prefix), narrow to `/(?<![a-zA-Z])X(?![a-zA-Z])/` to catch the token but skip its substring occurrences in unrelated keywords.

**When to use:** Any drift-guard substring that overlaps with framework / language keywords. Document the narrowing in the file's header so the reason survives.
**Source:** 39-05-SUMMARY.md

---

### Surgical excision in minified IIFE
For load-bearing inline scripts (FOUC pre-paint), use substring-only deletion; preserve every fallback branch, structural wrapper, single-line shape, and surviving literal byte-for-byte. Verify with grep + `node --check` + Vite build + cross-file drift-guard.

**When to use:** Any edit to a minified inline IIFE whose pre-paint timing or fallback chain is load-bearing.
**Source:** 39-04-SUMMARY.md

---

### Comment-debt sweep co-located with deletion
Rotate stale comments referencing deleted features in the same plan that ships the drift-guard. Tiger Style WHY-only: a comment that names a deleted feature is a WHY-claim that no longer holds.

**When to use:** Any deletion that leaves nearby explanatory comments in surviving production code. Otherwise the drift-guard greens day-1 but the comments age into dangling references.
**Source:** 39-05-SUMMARY.md

---

### Rotation pairing with non-trivial deltas
When rotating deprecated literals in tests, pick targets that preserve invariants without producing duplicate it() titles or trivial before/after pairs. Internally consistent rotation maps (`moss → dark`, `dusk/slate → system`) reduce reviewer surprise.

**When to use:** Cross-cutting hook tests that exercise change deltas (cross-tab events, CustomEvent re-reads). Pair deletions to preserve a meaningful theme-A → theme-B transition.
**Source:** 39-03-SUMMARY.md

---

## Surprises

### `translate*` Tailwind keyword collision
The plan estimated zero false positives for the lowercase `slate` substring matcher. In reality, `translate3d`, `translate-x-N`, `-translate-x-N`, `translated` appear as structural code in OrbShape (8 hits), BooleanToggle, StatusPanel, SessionReadout, index.css (3 keyframe `translate3d`s), and several test files.

**Impact:** Forced the Rule 3 deviation in Plan 05 — narrowed `t.includes('slate')` to `/(?<![a-zA-Z])slate(?![a-zA-Z])/`. Formalized as the word-bounded matcher pattern. Future drift-guards should grep more carefully for structural-keyword overlap during planning.
**Source:** 39-05-SUMMARY.md (Auto-fixed Issues #2)

---

### `favicon.sync.test.ts` passes cleanly in isolation before Plan 04
Plan 02 anticipated the cross-file drift-guard test might fail until Plan 04 stripped moss/slate/dusk from `index.html`. In practice, the test's regex builder uses `${themeId}` interpolation that only seeks light/dark entries — extra deprecated entries in `index.html` are ignored.

**Impact:** Plan 02 exceeded its acceptance gate. The test passed at Plan 02's individual commit boundary instead of needing wave-cumulative state. Good outcome; the plan called the worse case as a safety net.
**Source:** 39-02-SUMMARY.md, 39-02-PLAN.md

---

### Plan-recommended rotation produced a duplicate it() title
Plan 03 recommended `useFavicon.test.ts` Group A rotation `moss → dark`, but an existing L72 dark test was already titled `(named theme: dark)`. Direct rotation would have created two identical it() descriptions in the same describe.

**Impact:** Rule 3 deviation — rotated to `light` instead, yielding complementary dark/light mount coverage and avoiding the duplicate. Suggests planning-stage rotation maps should grep for existing test titles before recommending a target.
**Source:** 39-03-SUMMARY.md (Auto-fixed Issues #1)

---

### `strings.test.ts` is fully zero-edit
The plan anticipated possible edits, but the existing `for (const id of THEME_OPTIONS)` iteration plus the absence of any deprecated literal references meant zero changes were needed. 33/33 tests pass against the post-Plan-01 narrowed enum.

**Impact:** Validates the "data-driven tests auto-shrink" pattern. Reduces the deletion surface for future similar phases.
**Source:** 39-03-SUMMARY.md

---

### `App.session.test.tsx` is zero-edit
Initial grep for `moss|slate|dusk` returned hits at L179-184, but they were CSS `scale(0.79)` substring matches — not real references to deprecated themes.

**Impact:** Demonstrates the need for word-bounded grep when planning surgical edits. Saved 1 file's worth of test rotation work.
**Source:** 39-03-SUMMARY.md

---

### Phase executed in ~25 minutes total wall-clock for all 5 plans
Plan 01: ~2 min; Plan 02: ~6 min; Plan 03: ~25 min (largest — most cross-cutting tests); Plan 04: ~3 min; Plan 05: ~25 min (drift-guard + comment rotations + green gate).

**Impact:** The keystone-plus-cascade pattern (one type-level edit + parallel wave-2 collapses + closing drift-guard) lands in under an hour of active execution. Demonstrates leverage of TS-driven cascades and parallel wave execution.
**Source:** 39-01-SUMMARY.md, 39-02-SUMMARY.md, 39-03-SUMMARY.md, 39-04-SUMMARY.md, 39-05-SUMMARY.md
