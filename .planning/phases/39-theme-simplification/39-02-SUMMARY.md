---
phase: 39-theme-simplification
plan: 02
subsystem: styles + favicon + contrast-guard
tags: [deletion, css, tsc-mandatory, table-literal-collapse, comment-debt]
requires:
  - 39-01 (ThemeId union narrowed to 'light' | 'dark' | 'system')
provides:
  - theme.css 2-palette state (light @theme baseline + [data-theme='dark']:root override)
  - FAVICON_COLORS 2-entry table (light + dark hex byte-preserved)
  - THEME_05_FLOORS 2-entry table (per-theme contrast floors retained for Phase 41 retune room)
  - favicon.sync.test.ts comment-debt-clean (0 deprecated-theme references)
affects:
  - src/styles/theme.css
  - src/styles/faviconPalette.ts
  - src/styles/faviconPalette.test.ts
  - src/styles/favicon.sync.test.ts
  - src/styles/theme.contrast.test.ts
tech-stack:
  added: []
  patterns:
    - "Record<Exclude<ThemeId, 'system'>, X> auto-narrows via union shrink (FAVICON_COLORS, THEME_05_FLOORS — both literals collapse from 5 to 2 keys, tsc-mandatory)"
    - "CONCRETE_THEMES filter + describe.each auto-shrinks (favicon.sync, theme.contrast, faviconPalette tests — zero runtime test-logic edits beyond comment-debt updates)"
    - "Tiger Style WHY-only — multi-paragraph rationale comment headers deleted with the CSS blocks they explained; favicon.sync L34/L82 comment-debt swept deterministically"
key-files:
  created: []
  modified:
    - src/styles/theme.css (-170 LOC; deleted L152-L320: 3 leading rationale comment headers + 3 [data-theme='moss'|'slate'|'dusk']:root blocks)
    - src/styles/faviconPalette.ts (-3 entries + sync-comment "5 hex values" → "2 hex values")
    - src/styles/faviconPalette.test.ts (-28 LOC: keys-count assertion 5→2, deleted 3 individual hex it() blocks + 3 buildFaviconDataUri per-theme-hex it() cases, updated "all 5 concrete themes" → "all concrete themes")
    - src/styles/favicon.sync.test.ts (L34 doc-comment + L82 regex-example comment cleaned; grep -cE "moss|slate|dusk" returns 0)
    - src/styles/theme.contrast.test.ts (-3 entries in THEME_05_FLOORS; L4-5 docstring "5 concrete themes" → "2 concrete themes"; "Other 4 palettes" → "Dark")
decisions:
  - "Wholesale L151-L320 deletion in a single sed range — 170 LOC, surgical-clean boundary at L150 } (dark block close) → L151 blank → L152 (now Phase 2 orb structure comment). No mid-block crossings; vite build green confirms."
  - "Kept Object.freeze() wrapper + Record<Exclude<ThemeId,'system'>, string> type annotation on FAVICON_COLORS — only the literal members shrink; the type narrows naturally via Plan 01's union collapse."
  - "Kept THEME_05_FLOORS as a per-theme Record (D-09) — table shape preserved for Phase 41 Mono Zen floor retune room; only the literal members shrink."
  - "Comment-debt sweep on favicon.sync.test.ts L34 + L82 — REQUIRED per plan (Tiger Style WHY-only); grep -cE returns 0 (deterministic acceptance, not a CI invariant since the Phase 39 drift-guard scoped to non-test files inherits Phase 38 filename-exclusion)."
requirements_addressed:
  - THM-01
  - THM-02
  - THM-03
  - THM-06
  - THM-07
  - THM-08
metrics:
  duration: 6m
  completed_date: 2026-05-21
  commits: 3
  files_changed: 5
  insertions: 9
  deletions: 212
---

# Phase 39 Plan 02: Theme CSS + Favicon + Contrast — 2-Palette Collapse Summary

Surgical deletion of the rejected 3 palettes (Moss / Slate / Dusk) from the theme CSS / favicon palette / contrast-guard surface. Closes THM-01..03 (CSS half), THM-06 (favicon palette), THM-07 (favicon.sync test), THM-08 (WCAG contrast guard regen).

## Outcome

Three atomic commits scoped `(39-02)`:

| # | Commit | Description |
|---|--------|-------------|
| 1 | `765ed6e` | feat(39-02): delete moss/slate/dusk palette blocks from theme.css (THM-01..03 CSS) |
| 2 | `99bb405` | feat(39-02): shrink FAVICON_COLORS to light + dark (THM-06) |
| 3 | `8fbc55e` | feat(39-02): align favicon.sync + theme.contrast tests to 2-palette state (THM-07 THM-08) |

Net change: **5 files modified, 9 insertions, 212 deletions** (170 LOC from theme.css + 42 LOC from the test/palette files).

## What Changed

### Task 1 — `src/styles/theme.css` (-170 LOC)

Deleted lines L152-L320 (inclusive), a single contiguous range covering 3 leading rationale comment headers + 3 `[data-theme='X']:root { ... }` blocks:

| Range | Content | Disposition |
|-------|---------|-------------|
| L152-L192 | Moss rationale comment header (Phase 16.3-04 Everforest Light medium provenance) | DELETED |
| L193-L211 | `[data-theme='moss']:root { ... }` (16 CSS custom property declarations) | DELETED |
| L213-L240 | Slate rationale comment header (Phase 16.3 Plan 05 Tokyo Night Day provenance) | DELETED |
| L241-L259 | `[data-theme='slate']:root { ... }` | DELETED |
| L261-L301 | Dusk rationale comment header (Phase 16.3 Plan 06 Rosé Pine Main provenance) | DELETED |
| L302-L320 | `[data-theme='dusk']:root { ... }` | DELETED |
| L151 | Blank line preceding Moss header (consumed by the sed range to keep the surviving boundary clean) | DELETED |

Pre/post LOC: 438 → 268 (Δ 170).

After deletion, the file structure is: `@theme { ... }` baseline (light) → blank → `[data-theme='dark']:root { ... }` (the surviving dark palette block) → blank → `/* Phase 2 orb structure ... */` (orb structure rules unchanged). The closing `}` of the dark block at L150 is followed directly by a single blank line and the next live comment — clean cosmetic boundary.

**Surviving hex values byte-preserved** per CONTEXT canonical_refs:
- Light: `--color-breathing-accent-strong: #5e81ac` (Nord n10 Frost blue)
- Dark: `--color-breathing-accent-strong: #81a1c1` (Nord n9 Frost mid-blue)

Phase 41 (Mono Zen) will retune these intentionally; Phase 39 does NOT touch them.

### Task 2 — `src/styles/faviconPalette.ts` (-3 entries) + `src/styles/faviconPalette.test.ts` (-28 LOC)

**Before:**
```typescript
export const FAVICON_COLORS: Record<Exclude<ThemeId, 'system'>, string> = Object.freeze({
  light: '#5e81ac',
  dark: '#81a1c1',
  moss: '#35a77c',
  slate: '#3760bf',
  dusk: '#f6c177',
})
```

**After:**
```typescript
export const FAVICON_COLORS: Record<Exclude<ThemeId, 'system'>, string> = Object.freeze({
  light: '#5e81ac',
  dark: '#81a1c1',
})
```

Leading sync comment also updated: `These 5 hex values mirror...` → `These 2 hex values mirror...`. Object.freeze() wrapper + Record type annotation + buildFaviconDataUri signature unchanged.

**faviconPalette.test.ts assertion deltas:**

| Before | After | Action |
|--------|-------|--------|
| `it('has exactly 5 keys (no system key)', ...)` | `it('has exactly 2 keys (light + dark, no system key)', ...)` | UPDATE label + `toHaveLength(5)` → `toHaveLength(2)` |
| `it('moss === #35a77c', ...)` | — | DELETE |
| `it('slate === #3760bf', ...)` | — | DELETE |
| `it('dusk === #f6c177', ...)` | — | DELETE |
| `it('all 5 concrete themes are present as keys', ...)` | `it('all concrete themes are present as keys', ...)` | UPDATE label (loop body unchanged — iterates CONCRETE_THEMES which auto-shrinks) |
| `it('output contains the per-theme hex (moss)', ...)` | — | DELETE |
| `it('output contains the per-theme hex (slate)', ...)` | — | DELETE |
| `it('output contains the per-theme hex (dusk)', ...)` | — | DELETE |

Surviving cases (UNCHANGED): individual hex assertions for `light` + `dark`, the `outputs differ` data-uri test, the `output contains per-theme hex` for `light` + `dark`, the FAVICON_SVG_TEMPLATE shape tests.

**11/11 faviconPalette tests pass** (was 17/17 pre-edit; 6 deletions = 11 surviving).

### Task 3 — `src/styles/favicon.sync.test.ts` (comment-debt sweep) + `src/styles/theme.contrast.test.ts` (-3 floors)

**`favicon.sync.test.ts` — REQUIRED comment-debt sweep (Tiger Style WHY-only).** Runtime test logic UNCHANGED (the `CONCRETE_THEMES.filter` + `describe.each` + `${themeId}` regex interpolation all auto-shrink data-drivenly).

L34 doc-comment:
```
Before:
 * Light's value is in the base @theme block; dark/moss/slate/dusk in their
 * [data-theme='X']:root override blocks.
After:
 * Light's value is in the base @theme block; dark in its
 * [data-theme='dark']:root override block.
```

L82 regex-example comment:
```
Before: // Expected pattern: {light:'#5e81ac',dark:'#81a1c1',moss:'#35a77c',slate:'#3760bf',dusk:'#f6c177'}
After:  // Expected pattern: {light:'#5e81ac',dark:'#81a1c1'}
```

Verification: `grep -cE "moss|slate|dusk" src/styles/favicon.sync.test.ts` returns **0** (deterministic acceptance — no `≤ 0` ambiguity).

**`theme.contrast.test.ts` — D-09 table literal collapse.**

L4-5 leading docstring:
```
Before: midpoint colors, iterated over the 5 concrete themes (light, dark, moss, slate, dusk).
After:  midpoint colors, iterated over the 2 concrete themes (light, dark).
```

THEME_05_FLOORS literal (also updated nearby comment "Other 4 palettes keep 1.5 floor" → "Dark keeps 1.5 floor" per Tiger Style WHY-only):
```typescript
Before:
const THEME_05_FLOORS: Record<Exclude<ThemeId, 'system'>, number> = {
  light: 1.15,
  dark: 1.5,
  moss: 1.1,
  slate: 1.5,
  dusk: 1.5,
}
After:
const THEME_05_FLOORS: Record<Exclude<ThemeId, 'system'>, number> = {
  light: 1.15,
  dark: 1.5,
}
```

CONCRETE_THEMES filter + describe.each auto-shrink to 2 themes. **4/4 theme.contrast tests pass** against current hex values (Phase 41 may retune floors against the Mono Zen palette).

## Verification

| Check | Expected | Actual | Status |
|-------|----------|--------|--------|
| `grep -cE "\[data-theme=['"](moss\|slate\|dusk)['"]\]" src/styles/theme.css` | 0 | 0 | PASS |
| `grep -c "data-theme=" src/styles/theme.css` | 1 | 1 (`[data-theme='dark']:root`) | PASS |
| `grep -cE "#35a77c\|#3760bf\|#f6c177" src/styles/theme.css` | 0 | 0 | PASS |
| `grep -nE "#5e81ac\|#81a1c1" src/styles/theme.css` | preserved | preserved | PASS |
| `grep -cE "moss:\|slate:\|dusk:" src/styles/faviconPalette.ts` | 0 | 0 | PASS |
| `grep -n "These 2 hex values" src/styles/faviconPalette.ts` | 1 | 1 (L10) | PASS |
| `grep -n "toHaveLength(2)" src/styles/faviconPalette.test.ts` | ≥1 | 1 (L17) | PASS |
| `grep -cE "FAVICON_COLORS\.(moss\|slate\|dusk)" src/styles/faviconPalette.test.ts` | 0 | 0 | PASS |
| `grep -cE "buildFaviconDataUri\(['"](moss\|slate\|dusk)['"]\)" src/styles/faviconPalette.test.ts` | 0 | 0 | PASS |
| `grep -cE "moss:\|slate:\|dusk:" src/styles/theme.contrast.test.ts` | 0 | 0 | PASS |
| `grep -n "light: 1.15" src/styles/theme.contrast.test.ts` | 1 | 1 (L133) | PASS |
| `grep -n "dark: 1.5" src/styles/theme.contrast.test.ts` | 1 | 1 (L134) | PASS |
| `grep -cE "5 concrete themes\|5 palette" src/styles/theme.contrast.test.ts` | 0 | 0 | PASS |
| `grep -cE "moss\|slate\|dusk" src/styles/favicon.sync.test.ts` | 0 (deterministic) | 0 | PASS |
| `pnpm test src/styles/faviconPalette.test.ts --run` | exit 0 | 11/11 pass, exit 0 | PASS |
| `pnpm test src/styles/theme.contrast.test.ts --run` | exit 0 | 4/4 pass, exit 0 | PASS |
| `pnpm test src/styles/favicon.sync.test.ts --run` | exit 0 (wave-cumulative) | **4/4 pass, exit 0** | PASS (passes in isolation too — the `${themeId}` interpolation regex finds light/dark entries regardless of any extra moss/slate/dusk entries still in index.html) |
| `pnpm build` (vite + PostCSS) | exit 0 | exit 0 (built in 420ms) | PASS |
| `pnpm tsc -b` in-scope (Plan 39-02 files) | 0 errors | 0 errors | PASS |

**Note on favicon.sync.test.ts:** the plan anticipated this test might fail in isolation until Plan 39-04 strips moss/slate/dusk from index.html. In practice, the test's regex builder uses `${themeId}` string interpolation rather than enumerated strings, so it only looks for the light/dark entries — the extra index.html entries are ignored. The test passes cleanly at this individual commit boundary, exceeding the plan's acceptance gate.

**Note on `pnpm tsc -b` (project build):** the remaining 14 tsc errors are exclusively in Plan 39-03 scope files (`ThemePicker.test.tsx`, `useFavicon.test.ts`, `useThemeChoice.test.ts`) — all from `'moss' | 'slate' | 'dusk'` string literals that fail the narrowed `ThemeId` union. Zero errors in any Plan 39-02 scope file. This is the expected wave-2 ordering: 39-02 + 39-03 + 39-04 land together, then full tsc green.

## Decisions Made

- **D-09 honored** — Per-theme `THEME_05_FLOORS` table shape preserved as `Record<Exclude<ThemeId, 'system'>, number>` (now 2 entries). Phase 41 has room to retune floors against the Mono Zen palette without touching test scaffolding.
- **D-10 honored** — `FAVICON_COLORS` shrinks via key deletion; type narrows via `Exclude<ThemeId, 'system'>` natural narrowing; `buildFaviconDataUri` signature and `useFavicon.ts` consumer unchanged.
- **Wholesale-range deletion in theme.css** — A single `sed 151,320d` produced a clean 170-line range deletion bounded by the dark block close (L150 `}`) and the orb structure comment (now at L152). No mid-block crossings; `vite build` exits 0 confirming PostCSS parse-clean.
- **L82 regex-example comment is comment debt, not a CI invariant** — Plan 05's drift-guard (`src/content/content.no-removed-themes.test.ts`) inherits Phase 38's filename-exclusion for `*.test.ts`, so the L82 hit would not have failed CI. Updated anyway per Tiger Style WHY-only "comments age out with the WHY that explained them"; `grep -cE "moss|slate|dusk"` now returns 0 deterministically.

## Deviations from Plan

**None — plan executed exactly as written.**

The plan's expressed concern that `pnpm test src/styles/favicon.sync.test.ts --run` "may fail in isolation if Plan 04 has not yet landed" did not materialize: the test passes cleanly in isolation because the regex builder uses `${themeId}` interpolation (which only seeks light/dark entries) rather than enumerated string matching against the full index.html map literal. This was anticipated by the plan as the better-of-two outcomes — exceeds acceptance, no deviation required.

## Threat Flags

**None.** Per the plan's threat model, the deletions introduce no new attack surface (T-39-03 mitigation: surviving `[data-theme='dark']:root` is the only `data-theme` selector remaining; T-39-04 mitigation: surviving 2 favicon hex values byte-preserved and locked by surviving individual-hex test cases; T-39-05 mitigation: the data-driven favicon.sync cross-file drift-guard auto-iterates the 2 surviving themes and continues to assert every CSS `[data-theme='X']:root` accent-strong matches the FAVICON_COLORS[X] entry — invariant intact).

## Pointer Forward

Plan 39-03 will:
- Strip moss/slate/dusk display strings from `src/content/strings.ts` (UiStrings type + EN + PT-BR catalogs) per D-07.
- Update `src/components/ThemePicker.test.tsx` option-list assertions (6 → 3 options) and rotate moss/dusk seedTheme calls to surviving themes (D-12).
- Strip moss/slate/dusk fixture seeds from `src/hooks/useTheme.test.ts`, `src/hooks/useThemeChoice.test.ts`, `src/hooks/useFavicon.test.ts` (rotation, not deletion).
- After 39-03 lands, the 14 remaining tsc errors in this plan's verification will all clear; `pnpm tsc -b` exits 0 phase-wide.

Plan 39-04 will surgically edit the `index.html:18` FOUC pre-paint script — drop 3 allowlist tokens + 3 hex entries from the inline color map (D-08). After 39-04 lands, `grep -n "moss|slate|dusk" index.html` returns 0 — the favicon.sync cross-file invariant tightens to the strict cumulative state.

Plan 39-05 will add the fs-scan drift-guard `src/content/content.no-removed-themes.test.ts` (D-03..D-06) — verbatim structural twin of Phase 38 VAR-06 `content.no-variants.test.ts`, with the FORBIDDEN_TOKENS list swapped for the 9-token + 3-regex Phase 39 banlist.

## Self-Check: PASSED

Verified by direct filesystem reads + commit-hash lookups:

```
$ [ -f src/styles/theme.css ] && echo FOUND || echo MISSING
FOUND
$ [ -f src/styles/faviconPalette.ts ] && echo FOUND || echo MISSING
FOUND
$ [ -f src/styles/faviconPalette.test.ts ] && echo FOUND || echo MISSING
FOUND
$ [ -f src/styles/favicon.sync.test.ts ] && echo FOUND || echo MISSING
FOUND
$ [ -f src/styles/theme.contrast.test.ts ] && echo FOUND || echo MISSING
FOUND
$ git log --oneline --all | grep -q "765ed6e" && echo FOUND || echo MISSING
FOUND
$ git log --oneline --all | grep -q "99bb405" && echo FOUND || echo MISSING
FOUND
$ git log --oneline --all | grep -q "8fbc55e" && echo FOUND || echo MISSING
FOUND
```

All 5 in-scope files present; all 3 task commits present on the worktree-agent branch.

---

*Phase 39 Plan 02 closed: 2026-05-21 · 3 atomic commits · 5 files · -212/+9 LOC*
