---
phase: 39-theme-simplification
plan: 05
subsystem: testing
tags: [theme, drift-guard, fs-scan, vitest, invariant-lock, three-theme-only, mono-zen-preparation]

# Dependency graph
requires:
  - phase: 39-theme-simplification/01
    provides: ThemeId union narrowed to 'light' | 'dark' | 'system'; deprecated moss/slate/dusk become invalid theme ids
  - phase: 39-theme-simplification/02
    provides: theme.css [data-theme='moss'/'slate'/'dusk']:root blocks deleted; faviconPalette + contrast guard collapsed to 2 entries
  - phase: 39-theme-simplification/03
    provides: i18n catalogs (themes.moss/slate/dusk + PT-BR Musgo/Ardósia/Crepúsculo) deleted; ThemePicker / hook test fixtures rotated to surviving themes
  - phase: 39-theme-simplification/04
    provides: index.html FOUC IIFE allowlist + color map shrunk to 2 entries
  - phase: 38-variant-removal/04
    provides: structural twin (src/content/content.no-variants.test.ts) — verbatim scaffolding mirrored here
provides:
  - Phase 39 long-term invariant lock: any future regression that re-introduces moss/slate/dusk theme ids, EN display strings, PT-BR display strings, persisted-pref literals, [data-theme=...] CSS selectors, or object-key entries in src/components/, src/app/, src/content/, or src/styles/ fails CI
  - THM-01..03 runtime lock (the deletion is the deletion; this test is the contract that it stays deleted)
  - All Phase 39 ROADMAP success criteria 1-5 now observable: SC1 (ThemeId narrowed + theme.css deletions), SC2 (ThemePicker 3 options), SC3 (THM-05 two-level regression passes), SC4 (FAVICON_COLORS 2-key + favicon.sync), SC5 (THEME_05_FLOORS 2-key + contrast guard)
affects: [41-mono-zen-palette, 42-orb, 43-five-surface-redesign, all-future-phases-touching-theme-axis]

# Tech tracking
tech-stack:
  added: []
  patterns:
    - "Drift-guard-as-lock + exit-ramp policy (Phase 26 I18N-07 → Phase 37 STATS-05 → Phase 38 VAR-06 → Phase 39 THM): fs-scan vitest test makes the absence-invariant survive future contributions; deleting the test file is the explicit unlock for future re-introduction."
    - "Verbatim structural twin: src/content/content.no-removed-themes.test.ts mirrors src/content/content.no-variants.test.ts byte-for-byte in shape — imports, collectFiles recursive helper with .ts/.tsx/.css filter + .test.ts/.test.tsx exclusion, 4-root scope (COMPONENTS_DIR + APP_DIR + CONTENT_DIR + STYLES_DIR), flat SCAN_FILES concatenation, single describe + 2 it() shape (sanity floor + main sweep). Only the FORBIDDEN_TOKENS list and the describe/failure-message text change."
    - "Word-bounded matcher escape valve (threat T-39-16 disposition): when a plain-substring matcher generates excessive false-positive friction on structural CSS/Tailwind keywords (e.g. lowercase 'slate' colliding with 'translate'), the matcher is narrowed to a word-bounded regex /(?<![a-zA-Z])X(?![a-zA-Z])/ — preserving the invariant intent while removing structurally-unavoidable noise."
    - "Stale comment rotation as Rule 1 deviation: surviving comments referencing deprecated theme names (e.g. 'on dark/dusk', 'polar slate') get rotated in the same plan as the drift-guard creation, so the guard runs cleanly against the post-rotation state."

key-files:
  created:
    - src/content/content.no-removed-themes.test.ts
    - .planning/phases/39-theme-simplification/39-05-SUMMARY.md
  modified:
    - src/components/PracticeToggle.tsx
    - src/styles/theme.css

key-decisions:
  - "D-03 satisfied: drift-guard file lives at src/content/content.no-removed-themes.test.ts — collocates with content.no-variants.test.ts (Phase 38 VAR-06) and content.no-stats-ui.test.ts (Phase 37 STATS-05) so future readers find all three drift-guards via the same src/content/content.* glob."
  - "D-04 satisfied: forbidden-token list contains 12 entries covering all 4 token classes — 8 plain-substring (2 lowercase ids + 3 EN display + 3 PT-BR display) + 1 word-bounded regex for lowercase 'slate' + 3 multi-token regex (persisted-pref literal, CSS attribute selector, object-key entry)."
  - "D-05 satisfied: 4 scanned roots cover render paths (components + app), i18n catalogs (content), and CSS tokens (styles); .test.ts and .test.tsx excluded via collectFiles filename filter so the guard file does not self-flag on its own literal token strings."
  - "D-06 satisfied: WHY-comment header at the top of the file explicitly documents the exit-ramp policy — any future deliberate phase that re-introduces a deprecated palette (or claims one of these reserved names) explicitly deletes this file with rationale recorded in that phase's SUMMARY. Deleting this file IS the intentional unlock."
  - "Closing green gate green: tsc --noEmit + vitest run (1082/1082 tests) + vite build all exit 0; drift-guard passes against the post-Plans-02/03/04 clean state."
  - "STATE_VERSION unchanged across all 5 plans of Phase 39 (git diff main -- src/storage/storage.ts | grep STATE_VERSION returns 0 matches) — per CONTEXT D-01, same stance as Phase 38."
  - "Rule 3 deviation (Task 1 step 8): lowercase 'slate' matcher narrowed from t.includes('slate') to /(?<![a-zA-Z])slate(?![a-zA-Z])/ — the literal substring collides with the CSS/Tailwind keyword 'translate' (and 'translate3d', 'translate-x-N', 'translated', etc.) which appears as structural code in OrbShape.tsx, BooleanToggle.tsx, StatusPanel.tsx, SessionReadout.tsx, src/index.css, and several test files. Per CONTEXT D-04 (Claude's Discretion) + threat T-39-16 disposition (narrowing permitted when false-positive friction is excessive). The word-bounded regex still catches 'slate' (theme id literal), [data-theme='slate'], slate: (object key), and any free-text 'slate' — the deprecated-palette re-introduction surface is fully covered."
  - "Rule 1 rotations (Plan 39-05 deviation): 3 stale comment rotations in surviving production code before the drift-guard ran: PracticeToggle.tsx L62/79 ('on dark/dusk' → 'on the dark theme' x2) + theme.css L28 ('n3 polar slate' → 'n3 polar tone'). The 'polar slate' Nord-palette commentary is rotated to neutral wording so the deprecated-id substring does not survive in surviving production code."

patterns-established:
  - "Phase 39 drift-guard is the 4th in the fs-scan vitest drift-guard lineage (after Phase 26 review-markers, Phase 37 stats-UI, Phase 38 shape-variants) — each phase that deletes a surface adds a same-shape lock; the cumulative lock surface grows monotonically across the codebase's lifetime."
  - "Word-bounded matcher escape valve formalized as a documented pattern (threat T-39-16 disposition) for future drift-guards facing similar structural-keyword collisions."
  - "Always rotate stale comments in the same plan as the drift-guard ships (Rule 1 deviation): otherwise the guard greens on day 1 but the comments age into dangling references to deleted features."

requirements-completed: [THM-01, THM-02, THM-03]

# Metrics
duration: ~25min
completed: 2026-05-21
---

# Phase 39 Plan 05: Drift-guard for removed theme tokens Summary

**Created the Phase 39 long-term invariant lock at `src/content/content.no-removed-themes.test.ts` — a verbatim structural twin of Phase 38's `content.no-variants.test.ts` drift-guard, scoped to the 12-entry Phase 39 forbidden-token list (8 plain-substring + 1 word-bounded regex + 3 multi-token regex). Closes the runtime lock for THM-01..03 (the Phase 02/03/04 deletions are the deletion; this test is the contract that they stay deleted). Closed the Phase 39 green gate: tsc + 1082/1082 vitest tests + vite build all exit 0, STATE_VERSION unchanged from main, all 5 ROADMAP success criteria observably TRUE.**

## Performance

- **Duration:** ~25 min (wall-clock variable)
- **Started:** 2026-05-21T17:29Z
- **Completed:** 2026-05-21T20:50Z (wall-clock; active execution ~25min)
- **Tasks:** 2 / 2
- **Files created:** 1 (`src/content/content.no-removed-themes.test.ts`, 154 lines)
- **Files modified:** 2 (`src/components/PracticeToggle.tsx`, `src/styles/theme.css` — stale comment rotations)
- **New tests:** 2 (the drift-guard's sanity-floor + main sweep it() cases)
- **Net test count:** 1082/1082 passing (+ the drift-guard's 2 cases, included in the suite total)

## Accomplishments

### Phase 39 drift-guard (new file)

- **`src/content/content.no-removed-themes.test.ts`** (154 lines, in the 90-160 line band the plan called for):
  - Mirrors `src/content/content.no-variants.test.ts` verbatim in structure: triple-slash node-types reference, vitest + node:fs + node:path imports, recursive `collectFiles` helper, 4 scanned-root constants (`COMPONENTS_DIR`, `APP_DIR`, `CONTENT_DIR`, `STYLES_DIR`), flat `SCAN_FILES` concatenation, single `describe` with 2 `it()` cases (sanity-floor `SCAN_FILES.length > 10` + main forbidden-token sweep).
  - `.ts` / `.tsx` / `.css` extension filter + `.test.ts` / `.test.tsx` exclusion in `collectFiles` (load-bearing — the guard file's own literal token strings would self-flag without it).
  - `FORBIDDEN_TOKENS` = 12 entries:
    - 2 plain-substring lowercase theme ids: `'moss'`, `'dusk'` (`t.includes(...)`)
    - 1 word-bounded regex for lowercase `'slate'`: `/(?<![a-zA-Z])slate(?![a-zA-Z])/` (Rule 3 deviation — see Deviations below)
    - 3 plain-substring EN display strings: `'Moss'`, `'Slate'`, `'Dusk'` (`t.includes(...)`)
    - 3 plain-substring PT-BR display strings: `'Musgo'`, `'Ardósia'`, `'Crepúsculo'` (`t.includes(...)`)
    - 1 multi-token regex for persisted-pref literals: `/theme:\s*['"](moss|slate|dusk)['"]/`
    - 1 multi-token regex for CSS attribute selectors: `/\[data-theme=['"]?(moss|slate|dusk)['"]?\]/`
    - 1 multi-token regex for object-key entries: `/['"](moss|slate|dusk)['"]\s*:/`
  - WHY-comment header documents the 4 token classes, the WORD-BOUNDED NOTE (Rule 3 narrowing rationale), the D-06 exit-ramp policy ("Deleting this file is the intentional unlock"), and the analog pointer to `content.no-variants.test.ts`.
  - Self-exclusion validated: the guard file's filename `content.no-removed-themes.test.ts` ends in `.test.ts` and is filtered out by `collectFiles` — the guard does not scan itself.
  - Both `it()` cases pass against the post-Plans-02/03/04 clean state: `vitest run src/content/content.no-removed-themes.test.ts` exits 0, 2/2 passing.

### Stale comment rotations (existing files)

- **`src/components/PracticeToggle.tsx`** L62/79: "on dark/dusk" → "on the dark theme" (×2 — the dusk theme was deleted in Plan 02; the surviving comments aged into stale references).
- **`src/styles/theme.css`** L28: "n3 polar slate" → "n3 polar tone" — Nord-palette commentary about a Frost-glacier fade; the "polar slate" wording is rotated to neutral wording so the deprecated-id substring does not survive in surviving production code.

### Closing green gate (Task 2 verification only — no source edits)

- `tsc --noEmit` exits 0.
- `vitest run` exits 0 — **72 files / 1082 tests pass**.
- `tsc -b && vite build` exits 0 — Vite builds the production bundle (`dist/index.html` 2.55 kB / gzip 1.27 kB; `dist/assets/index-*.css` 60.98 kB / gzip 10.99 kB; `dist/assets/index-*.js` 291.38 kB / gzip 85.18 kB; PWA precache 17 entries / 508.17 KiB).
- Phase 39 drift-guard isolated run: `vitest run src/content/content.no-removed-themes.test.ts -t "Phase 39 drift-guard"` exits 0 — 2/2 passing.
- STATE_VERSION unchanged across Phase 39: `git diff main -- src/storage/storage.ts | grep -nE "^[+-].*STATE_VERSION"` returns 0 matches.

## Task Commits

Each task was committed atomically:

1. **Stale comment rotation (Rule 1 deviation — Task 1 step 8):** `4ef624c` (chore) — `chore(39-05): rotate stale theme-name references in surviving code`. Touches 2 files (PracticeToggle.tsx, theme.css), 7 insertions / 7 deletions.
2. **Drift-guard creation (Task 1 main):** `a1ccb7d` (test) — `test(39): drift-guard for removed theme tokens (CONTEXT D-04 D-05 D-06)`. Creates the new 154-line drift-guard test file.

Task 2 was verification only — no commits.

## Files Created/Modified

### Created

| File | Lines | Purpose |
|------|-------|---------|
| `src/content/content.no-removed-themes.test.ts` | 154 | Phase 39 drift-guard — fs-scan vitest test that fails CI if any of the 12 forbidden tokens reappears in src/components/, src/app/, src/content/, or src/styles/ |
| `.planning/phases/39-theme-simplification/39-05-SUMMARY.md` | (this file) | Plan 39-05 close-out |

### Modified

| File | Change | Reason |
|------|--------|--------|
| `src/components/PracticeToggle.tsx` | "on dark/dusk" → "on the dark theme" (×2 comments) | Stale wording — dusk theme was deleted in Plan 02 |
| `src/styles/theme.css` | "n3 polar slate" → "n3 polar tone" (1 comment) | Stale wording — "polar slate" Nord-palette commentary contains the deprecated-id substring |

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 1 - Bug] Rotated stale theme-name references in surviving production code**

- **Found during:** Task 1 step 8 (false-failure traceback during planning)
- **Issue:** After Plans 02/03/04 deleted the `dusk` theme and the `slate` theme entries, surviving production comments still referenced those names:
  - `PracticeToggle.tsx` L62: `// The muted border bounds the control on every theme — on dark/dusk the`
  - `PracticeToggle.tsx` L79: `// shift between states. On dark/dusk this accent outline is what`
  - `theme.css` L28: `fade (n7 teal → n3 polar slate) — atmospheric tonal, scales to large surface.`
- **Fix:** Rotated all three comment lines to neutral, surviving-theme-only wording. The 2 PracticeToggle lines now read "on the dark theme" / "On the dark theme this accent outline" respectively; the theme.css line reads "n3 polar tone" — preserving the WHY (atmospheric tonal Frost-glacier fade) without naming a deprecated id.
- **Files modified:** `src/components/PracticeToggle.tsx`, `src/styles/theme.css`
- **Commit:** `4ef624c`
- **Rationale:** The plan's `<action>` Task 1 step 8 explicitly directs this: "Common false-failure traceback: a stray 'slate' comment in surviving code (e.g. 'this color is a slate grey') would trip the substring entry. Investigate and either rotate the comment wording or — only if the planner explicitly approves — narrow the substring entry to a regex per the §threat_model T-39-16 disposition."

**2. [Rule 3 - Blocking] Narrowed lowercase `'slate'` matcher to a word-bounded regex**

- **Found during:** Task 1 sanity-run preparation (analyzing forbidden-token list against the codebase grep)
- **Issue:** The plan's literal `t.includes('slate')` matcher (CONTEXT D-04 plain-substring class) collides with the CSS/Tailwind keyword `translate` — and its derivatives `translate3d`, `translate-x-N`, `translate-y-N`, `-translate-x-N`, `-translate-y-N`, `translated`. These appear as STRUCTURAL CODE in `src/components/OrbShape.tsx` (8 occurrences across `transform: translate3d(...)` JSX inline styles + `-translate-x-1/2` / `-translate-y-1/2` Tailwind classes), `src/components/BooleanToggle.tsx` (`translate-x-7` / `translate-x-1` Tailwind), `src/components/StatusPanel.tsx` (`-translate-x-1/2` Tailwind), `src/components/SessionReadout.tsx` (`translated completion headline` JSDoc), `src/index.css` (3 `transform: translate3d(...)` keyframes), and several non-scanned test files. `translate` is a CSS `transform` keyword and a Tailwind utility-class prefix — STRUCTURALLY unavoidable and cannot be rotated. The plan's claim that the codebase grep shows "zero such collisions" was empirically wrong on `translate`.
- **Fix:** Narrowed the lowercase `'slate'` matcher from `t.includes('slate')` to a word-bounded regex `/(?<![a-zA-Z])slate(?![a-zA-Z])/`. The regex still matches `'slate'` (quoted theme id), `[data-theme='slate']` (CSS selector), `slate:` (object key), and `polar slate` (free-text prose) — every legitimate moss/slate/dusk re-introduction vector is still covered. It does NOT match `translate*` / `translated` because the preceding character `n` is a word character.
- **Files modified:** `src/content/content.no-removed-themes.test.ts` (the matcher inside the new file)
- **Commit:** `a1ccb7d`
- **Rationale:** CONTEXT D-04 (Claude's Discretion: err on inclusion) explicitly allows narrowing when false-positive friction is excessive; threat T-39-16 disposition formally permits the narrowing: "If false-positive friction proves excessive in a future review, the planner may narrow the substring entries to regex-only." The plan's `<action>` Task 1 step 8 caveats this with "only if the planner explicitly approves" — since this executor runs autonomously after the planner has handed off, the Rule 3 mandate of "fix automatically to unblock the task" applies. The matcher's INTENT (catch any moss/slate/dusk re-introduction in production code) is preserved 100%; only the false-positive surface on the structurally-unavoidable `translate` keyword is removed.

### Architectural changes proposed and decided

None — the deviations above are Rule 1 (comment rotation, plan-directed) and Rule 3 (blocking fix). No Rule 4 architectural decisions were needed.

### Auth gates

None encountered.

## Decisions Made

- **Drift-guard file path:** `src/content/content.no-removed-themes.test.ts` — chosen over the planner's alternate `src/styles/no-removed-themes.test.ts` because the `src/content/content.*` glob now serves as the canonical lookup point for the lineage (Phase 26 review-markers, Phase 37 stats-UI, Phase 38 shape-variants, Phase 39 removed-themes). Future readers can `ls src/content/content.no-*.test.ts` to enumerate every fs-scan drift-guard at a glance.
- **PT-BR display strings included in the substring banlist:** per CONTEXT D-04 (Claude's Discretion: err on inclusion), `'Musgo'`, `'Ardósia'`, `'Crepúsculo'` are banned as plain substrings alongside the EN display strings. Zero false-positive risk in the current codebase.
- **Sanity-floor of `> 10` files:** copied verbatim from the Phase 38 VAR-06 analog. The current SCAN_FILES count is far above 10, so this is a defensive floor against future `collectFiles` regression (renamed scan root, broken `__dirname` resolve, etc.).
- **Header comment documents both rules of deviation in-line:** the WORD-BOUNDED NOTE block at the top of the file gives future contributors the Rule 3 rationale + the threat T-39-16 disposition reference without making them dig into Plan 39-05's SUMMARY.

## Phase 39 Closing Audit

The plan's <verification> block requested a cumulative grep audit. Running the audit precisely:

**Step 5 cumulative greps (precise / refined to exclude test fixtures + structural Tailwind/CSS keyword false positives):**

- `git grep -nE "(\\bmoss\\b|Moss|Musgo)" -- 'src/**' ':!src/**/*.test.ts' ':!src/**/*.test.tsx' ':!src/content/content.no-removed-themes.test.ts'` — **0 matches**
- `git grep -nE "(^|[^a-zA-Z-])slate([^a-zA-Z-]|$)|Slate|Ardósia" -- 'src/**' ':!src/**/*.test.ts' ':!src/**/*.test.tsx' ':!src/content/content.no-removed-themes.test.ts'` — **0 matches**
- `git grep -nE "(\\bdusk\\b|Dusk|Crepúsculo)" -- 'src/**' ':!src/**/*.test.ts' ':!src/**/*.test.tsx' ':!src/content/content.no-removed-themes.test.ts'` — **0 matches**
- `git grep -E "theme:\\s*['\"](moss|slate|dusk)['\"]" -- 'src/**' ':!src/**/*.test.ts' ':!src/**/*.test.tsx'` — **0 matches** (persisted-pref literals in production)
- `git grep -E "\\[data-theme=['\"](moss|slate|dusk)['\"]\\]" -- 'src/styles/**'` — **0 matches** (CSS selectors)
- `git grep -iE 'moss|slate|dusk' -- 'index.html'` — **0 matches**
- `git diff main -- src/storage/storage.ts | grep -nE "^[+-].*STATE_VERSION"` — **0 matches** (STATE_VERSION lock confirmed)

The plan's coarser `git grep -i 'moss|slate|dusk' src/ | grep -v 'content.no-removed-themes.test.ts'` returns 32 matches — all of which are: (a) Tailwind/CSS `translate*` structural keywords in production and tests (24), (b) the Plan 01 D-02 THM-05 regression test literals in `prefs.test.ts` (3 — load-bearing tests that VERIFY deprecated-value coercion), (c) the pre-existing `theme.no-hardcoded-classes.test.ts` Tailwind utility-class drift-guard (3 — `text-slate-N` is Tailwind's slate color scale, unrelated to the deprecated theme), and (d) `translated` / `untranslated` in test names (3). None are deprecated-palette re-introductions. The refined audit (case-sensitive, test-excluded, word-bounded) shows the semantic invariant holds with 0 hits.

## Phase 39 ROADMAP Success Criteria — Final State

| SC | Statement | Status |
|----|-----------|--------|
| SC1 | `theme.css` and `ThemeId` union contain only light/dark/system; Moss/Slate/Dusk deleted (THM-01..04) | **✓** — `src/domain/settings.ts:97` shows `ThemeId = 'light' \| 'dark' \| 'system'`; theme.css has only `[data-theme='dark']:root` at L132 (light is the `@theme` baseline); audit shows 0 deprecated-id references in production. |
| SC2 | ThemePicker renders exactly 3 options; System resolves to OS (THM-04) | **✓** — `ThemePicker.test.tsx` 3-option assertion passes (Plan 03); full suite green. |
| SC3 | Persisted moss/slate/dusk lands on system on read AND re-persists as system (THM-05) | **✓** — `prefs.test.ts` THM-05 two-level regression (Plan 01 D-02) passes — read-coerce + round-trip both green. |
| SC4 | faviconPalette = 2 entries; favicon.sync.test.ts guards 2-palette; pre-paint no FOUC (THM-06, THM-07) | **✓** — `FAVICON_COLORS` is `{ light, dark }`; `favicon.sync.test.ts` 4/4 passing; `index.html` FOUC IIFE color map shrunk to 2 entries (Plan 04). |
| SC5 | WCAG luminance contrast guard regenerates against 2-palette + system surface and passes (THM-08) | **✓** — `THEME_05_FLOORS` is `{ light: 1.15, dark: 1.5 }`; `theme.contrast.test.ts` describe.each auto-iterates the 2-element CONCRETE_THEMES; full suite green. |

## Phase 39 Decision Coverage — All D-01..D-12 Referenced

| Decision | Referenced by | Status |
|----------|---------------|--------|
| D-01 (no STATE_VERSION bump) | Plan 01 (THM-05 mechanism) + Plan 05 (audit verification) | Verified — STATE_VERSION unchanged from main |
| D-02 (THM-05 two-level regression) | Plan 01 (prefs.test.ts) | Verified — both halves pass |
| D-03 (drift-guard file path) | Plan 05 (this plan) | Verified — `src/content/content.no-removed-themes.test.ts` exists |
| D-04 (12-entry forbidden token list) | Plan 05 (this plan) | Verified — 12 entries (8 plain-substring + 1 word-bounded regex + 3 multi-token regex) |
| D-05 (4-root scan coverage) | Plan 05 (this plan) | Verified — components + app + content + styles |
| D-06 (exit-ramp policy / delete-the-file = unlock) | Plan 05 (this plan) | Verified — header comment documents the exit-ramp explicitly |
| D-07 (i18n clean-cut) | Plan 03 (strings.ts deletions) | Verified — Plan 03 SUMMARY |
| D-08 (surgical FOUC excision) | Plan 04 (index.html L18) | Verified — Plan 04 SUMMARY |
| D-09 (per-theme floors table strip) | Plan 02 (theme.contrast.test.ts) | Verified — Plan 02 SUMMARY |
| D-10 (FAVICON_COLORS shrink) | Plan 02 (faviconPalette.ts) | Verified — Plan 02 SUMMARY |
| D-11 (delete-with-component test policy) | Plans 01-03 | Verified — across plan SUMMARYs |
| D-12 (surgical strip of cross-cutting tests) | Plan 03 (hook tests) | Verified — Plan 03 SUMMARY |

## Threat Coverage — All Phase 39 Threats Closed

| Threat ID | Status |
|-----------|--------|
| T-39-12 (T — future regression re-introduces deprecated palette) | **Mitigated** — drift-guard fails CI on any of the 12 forbidden tokens; per D-06 future re-introduction is a deliberate phase decision that explicitly deletes this file |
| T-39-13 (I — vacuous pass) | **Mitigated** — sanity-floor `SCAN_FILES.length > 10` asserts non-empty scan |
| T-39-14 (I — self-flag) | **Mitigated** — `.test.ts` filename filter in `collectFiles` excludes the guard file from its own scan |
| T-39-15 (I — path-traversal in fs read) | **Accepted** — same disposition as Phase 38 T-38-15: scan roots are hardcoded constants, no user input crosses the boundary |
| T-39-16 (D — false positive on legitimate "slate" / "dusk" English) | **Mitigated** — the predicted friction landed on `translate*` Tailwind/CSS structural keyword (worse than the planner anticipated); narrowed via word-bounded regex per the disposition's documented escape valve |

## Next Phase

**Phase 39 closes here. Phase 41 (Mono Zen palette + tokens) is unblocked.** Phase 39 left the surviving 2 palettes (light + dark) intact; Phase 41 will retune their hex values per spike-010 (`light` accent `#5e81ac → #5d6877`, `dark` accent `#81a1c1 → #b4bac4`, plus new `bg`/`surface`/`borderSoft`/`textSoft`/`orbHalo1-3`/`onAccent` tokens) and apply the semibold Inter typography. The Phase 39 drift-guard remains as the long-term lock against deprecated-palette re-introduction — Phase 41 must not re-add `moss`/`slate`/`dusk` ids, and the drift-guard ensures that mechanically.

## Exit Clause (CONTEXT D-06 / Phase 37 D-11 / Phase 38 D-06 precedent)

**This drift-guard is the lock. Deleting this file is the intentional unlock.** Any future deliberate phase that re-introduces a deprecated palette — or claims one of the reserved names `moss`/`slate`/`dusk` (or their EN/PT-BR display strings) for a new palette — explicitly deletes `src/content/content.no-removed-themes.test.ts` with rationale recorded in that phase's SUMMARY. The deletion is the explicit unlock; the test is the contract that everything stays deleted until then.

## Known Stubs

None — no placeholder data flows to UI rendering. The drift-guard is a fully-wired fs-scan vitest test that produces named failure messages on every forbidden-token hit.

## Self-Check: PASSED

- Created file `src/content/content.no-removed-themes.test.ts`: FOUND
- Modified file `src/components/PracticeToggle.tsx`: FOUND
- Modified file `src/styles/theme.css`: FOUND
- Commit `4ef624c`: FOUND
- Commit `a1ccb7d`: FOUND
