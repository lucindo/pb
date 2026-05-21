---
phase: 39-theme-simplification
plan: 04
subsystem: bootstrap
tags: [theme, fouc, index-html, iife, pre-paint, favicon, surgical-edit]

# Dependency graph
requires:
  - phase: 21-fouc
    provides: inline pre-paint IIFE @ index.html:18 (FOUC-free first paint, localStorage→data-theme + favicon resolution synchronously before render)
  - phase: 39-theme-simplification/01
    provides: ThemeId union narrowed to 'light' | 'dark' | 'system' (THM-01..05 closed); makes 'moss'|'slate'|'dusk' allowlist tokens semantically dead
provides:
  - index.html L18 FOUC IIFE aligned to the 2-palette surface (allowlist + color map)
  - THM-07 cross-file invariant closed on the index.html side (favicon.sync.test.ts now reads matching keys + hex on both file ends)
  - Pre-paint contract preserved byte-for-byte outside the 2 surgical excision points (IIFE wrapper, matchMedia branch, catch fallback, data-theme write timing, surviving '#5e81ac' / '#81a1c1' hex)
affects: [39-05-drift-guard, 41-mono-zen-palette]

# Tech tracking
tech-stack:
  added: []
  patterns:
    - "Surgical excision within minified one-line IIFE: 2 substring deletions, byte-preserve everything else (Phase 39 D-08)."
    - "Deletion-only edit on a load-bearing pre-paint contract — no structural change; matchMedia + catch fallbacks already wrote only 'light'/'dark', so they needed no edit (D-08 'no third touch-point' clause)."

key-files:
  created:
    - .planning/phases/39-theme-simplification/39-04-SUMMARY.md
  modified:
    - index.html

key-decisions:
  - "D-08 satisfied: exactly 2 touch-points within index.html L18 — allowlist shrink (3 tokens deleted) + color map shrink (3 hex entries deleted); no third touch-point because matchMedia + catch fallbacks already write only 'light'/'dark'."
  - "Single-line minified IIFE shape preserved (no inserted newlines/whitespace beyond the deletions); L18 length 1187 → 1113 chars (Δ-74)."
  - "Light + dark surviving hex values byte-unchanged ('#5e81ac', '#81a1c1') — Phase 41 (Mono Zen) will retune them; Phase 39 only deletes the 3 deprecated ones."
  - "Cross-file invariant (favicon.sync.test.ts) green at this commit because the test iterates CONCRETE_THEMES = THEME_OPTIONS.filter(t !== 'system'), which Plan 01 already shrank to ['light','dark']; both sides now read consistent 2-palette mappings."

patterns-established:
  - "Pre-paint IIFE surgical-excision pattern — deletion-only, byte-preserve every fallback branch and structural wrapper; verify with grep audit + JS syntax check + Vite build + cross-file drift-guard test."

requirements-completed: [THM-07]

# Metrics
duration: ~3min
completed: 2026-05-21
---

# Phase 39 Plan 04: index.html FOUC script alignment Summary

**Surgically excised the 3 deprecated palette tokens (`'moss'`, `'slate'`, `'dusk'`) from the inline pre-paint FOUC IIFE at `index.html:18` — allowlist shrunk from 5 to 2 entries, color map shrunk from 5 to 2 hex entries; IIFE wrapper, fallback branches, single-line shape, and surviving light + dark hex values preserved byte-for-byte.**

## Performance

- **Duration:** ~3 min
- **Started:** 2026-05-21T13:25Z (approx.)
- **Completed:** 2026-05-21T13:32Z (approx.)
- **Tasks:** 1 / 1
- **Files modified:** 1

## Accomplishments

- `index.html` L18 inline FOUC IIFE allowlist shrunk from `['light','dark','moss','slate','dusk']` to `['light','dark']` (3 tokens deleted).
- `index.html` L18 inline FOUC IIFE color map `c` shrunk from 5 entries to 2 (3 hex entries `'moss':'#35a77c'`, `'slate':'#3760bf'`, `'dusk':'#f6c177'` deleted).
- Surviving hex values `'#5e81ac'` (light) and `'#81a1c1'` (dark) byte-preserved.
- IIFE wrapper `(function(){ ... })()` byte-preserved.
- matchMedia fallback branch byte-preserved (already wrote only `'dark'`/`'light'` — no moss/slate/dusk references).
- catch fallback byte-preserved (already wrote only `'light'` — no moss/slate/dusk references).
- Pre-paint `data-theme` write timing preserved (still synchronous, before first paint).
- Single-line minified IIFE shape preserved — L18 went from 1187 to 1113 chars (Δ-74), still a single line; line count 25 unchanged.
- `vite build` exits 0 — Vite parses the modified HTML cleanly; transformed 76 modules, output `dist/index.html` (2.55 kB / gzip 1.27 kB).
- Standalone JS syntax check on the extracted IIFE (`node --check`) exits 0 — no unbalanced braces or invalid tokens.
- `vitest run src/styles/favicon.sync.test.ts` exits 0 — 4/4 tests pass; THM-07 cross-file drift-guard sees matching 2-palette mappings on both index.html and theme.css sides.

## Task Commits

Each task was committed atomically:

1. **Task 1: Surgically excise moss/slate/dusk from index.html L18 inline FOUC script (THM-07)** — `867d438` (feat)

## Files Created/Modified

### `index.html` — surgical edit (L18, 2 substring deletions)

**Before — Fragment 1 (allowlist):**
```javascript
if(t==='system'||!t||['light','dark','moss','slate','dusk'].indexOf(t)<0)
```

**After — Fragment 1:**
```javascript
if(t==='system'||!t||['light','dark'].indexOf(t)<0)
```

**Before — Fragment 2 (color map):**
```javascript
var c={'light':'#5e81ac','dark':'#81a1c1','moss':'#35a77c','slate':'#3760bf','dusk':'#f6c177'};
```

**After — Fragment 2:**
```javascript
var c={'light':'#5e81ac','dark':'#81a1c1'};
```

**Preservation verified:**

- IIFE wrapper `(function(){ ... })()` — byte-identical to before.
- matchMedia branch `t=(window.matchMedia&&window.matchMedia('(prefers-color-scheme: dark)').matches)?'dark':'light';` — byte-identical.
- catch fallback `document.documentElement.setAttribute('data-theme','light');setFav(favUri('#5e81ac'));` — byte-identical.
- `var raw=localStorage.getItem('hrv:state:v1');var t=raw&&(JSON.parse(raw).prefs||{}).theme;` — byte-identical.
- `document.documentElement.setAttribute('data-theme',t);` — byte-identical (write timing preserved).
- `var h=c[t]||c['light'];setFav(favUri(h));` — byte-identical (`c['light']` fallback for unknown `t` still resolves to the surviving light hex).
- favUri / setFav function bodies — byte-identical.
- All other `<head>` / `<meta>` / `<title>` / `<link>` elements — byte-identical.
- `<body>` content — byte-identical.

**Diff stat:** `1 file changed, 1 insertion(+), 1 deletion(-)` — Vite parses the modified file (single-line shape preserved means git records the surgical edits as 1 line removed + 1 line added).

## Decisions Made

- **D-08 satisfied:** Exactly 2 touch-points within L18 — allowlist shrink + color map shrink. No third touch-point because the matchMedia branch and catch fallback already wrote only `'light'`/`'dark'` and required no edit.
- **Single-line IIFE shape preserved:** the minified one-liner stays a single line. L18 length 1187 → 1113 chars (Δ-74). L18 still ends at the same position relative to L19 (which still contains `<title>HRV Breathing</title>`).
- **Light + dark surviving hex byte-unchanged:** `'#5e81ac'` (light) and `'#81a1c1'` (dark) intentionally preserved exactly. Phase 41 (Mono Zen) will retune them; Phase 39 only deletes the 3 deprecated ones.
- **Returning-user pre-paint behavior verified (THM-05 in pre-paint context):** a returning user with persisted `localStorage['hrv:state:v1'].prefs.theme === 'moss'` (or `'slate'`/`'dusk'`) reads `t === 'moss'`; the surgically-shrunk allowlist `['light','dark'].indexOf('moss') < 0` evaluates TRUE; the matchMedia fallback branch runs and resolves to OS-active (`'light'` or `'dark'`); `data-theme` is written to `'light'`/`'dark'`; `c[t]` then falls back to `c['light']` via the existing `||c['light']` guard if needed (but `t` has just been reassigned to a valid surviving key, so the direct lookup succeeds). No FOUC, no flicker, no broken favicon. The persisted `'moss'` value reads via `coercePrefs` as `'system'` once React mounts (Plan 01's THM-05 mechanism); after the next `savePrefs` the disk value re-persists as `'system'`.
- **THM-07 closed end-to-end at this commit:** `vitest run src/styles/favicon.sync.test.ts` exits 0 with 4/4 cases passing. The test iterates `CONCRETE_THEMES = THEME_OPTIONS.filter(t !== 'system')` which Plan 01 already shrank to `['light', 'dark']`; the test reads `--color-breathing-accent-strong` from `theme.css` for each + the inline favicon hex map from `index.html` for each, and asserts they match `FAVICON_COLORS[themeId]`. All 2 themes × 2 assertions = 4 cases green right now in this worktree.

## Deviations from Plan

None — plan executed exactly as written.

Notes on points that were checked and turned out to require no action / are operational notes:

- **`pnpm` not on `$PATH`** in the worktree (same operational situation as Plan 01). The plan's `pnpm build` and `pnpm test src/styles/favicon.sync.test.ts --run` acceptance checks were run using the main repo's `node_modules/.bin/vite` and `node_modules/.bin/vitest` binaries against the worktree's cwd. Both exit 0. This is a tool-mapping operational note, not a deviation from the plan's intent.
- **`tsc -b` is intentionally red at this commit boundary** — but all errors are in files that **other wave-2 plans (Plans 02 and 03) own**, not in any file this plan touches. Verified by running `tsc -b` against the worktree base (BEFORE my `index.html` edit) and against the worktree with my edit applied: the diff between the two error sets is exactly zero lines. The 11 errors are all in `src/hooks/useThemeChoice.test.ts` (Plan 03), `src/styles/faviconPalette.test.ts` (Plan 02), and `src/styles/theme.contrast.test.ts` (Plan 02). They were left over from Plan 01's wave-1 union shrink in `src/domain/settings.ts` and are owned by parallel-executing sibling worktree agents. The cumulative wave-2 commit boundary (after the orchestrator merges all three wave-2 branches) will have `tsc -b` green. My plan's edit on `index.html` does not introduce any new tsc error — `index.html` is not TS-typed (verified per the plan's own verification note: `pnpm tsc --noEmit exits 0` is "for completeness").

## Issues Encountered

- **Worktree has no `node_modules`** — same operational situation as Plan 01 (the worktree was provisioned without `pnpm install`). Resolved by running `vite` / `vitest` from the main repo's `node_modules/.bin/` against the worktree's `cwd`. Vite parses the modified HTML cleanly; vitest's cwd-relative config resolution picks up the worktree's vitest.config and runs all `favicon.sync.test.ts` cases green.

## User Setup Required

None.

## Verification Evidence

Output captured at the commit boundary (commit `867d438`):

```text
$ grep -cE "moss|slate|dusk" index.html
0

$ grep -c "var c={'light':'#5e81ac','dark':'#81a1c1'};" index.html
1

$ grep -cE "\['light','dark'\].indexOf\(t\)<0" index.html
1

$ grep -c "'#5e81ac'" index.html
1

$ grep -c "'#81a1c1'" index.html
1

$ grep -cE "#35a77c|#3760bf|#f6c177" index.html
0

$ awk 'NR==18 {print length($0)}' index.html
1113

$ wc -l index.html
      25 index.html

$ git diff --stat index.html
 index.html | 2 +-
 1 file changed, 1 insertion(+), 1 deletion(-)

$ node --check /tmp/iife.js
(exit 0)

$ vite build
✓ 76 modules transformed.
dist/index.html  2.55 kB │ gzip: 1.27 kB
✓ built in 480ms
(exit 0)

$ vitest run src/styles/favicon.sync.test.ts
Test Files  1 passed (1)
Tests       4 passed (4)
(exit 0)
```

## Pointer Forward

- **Plan 05 (drift-guard test)** — the final wave 3 plan. Adds `src/content/content.no-themes.test.ts` (or equivalent) as the fs-scan drift-guard analog of Phase 38's `src/content/content.no-variants.test.ts`. After the cumulative wave-2 commit lands (this plan + Plans 02 + 03), the only remaining `moss`/`slate`/`dusk` references in the tree will be in deferred test files. Plan 05 may also include the surgical strip of cross-cutting tests per CONTEXT D-12 (`src/app/App.session.test.tsx`, `src/content/strings.test.ts`).
- **Phase 41 (Mono Zen palette retune)** — will revisit `index.html` L18 to retune the surviving 2 hex values (`'#5e81ac'` → spike-010's light accent slate `#5d6877`; `'#81a1c1'` → dark dimmed mid-slate `#b4bac4`). The Phase 39 surgical-excision pattern leaves L18 well-shaped for that retune: just 2 hex substitutions inside the surviving `var c={...}` literal.

## Threat Surface Scan

No new threat surface introduced. The 2 surgical deletions are pure literal deletion — no new code path, no new input handling. Threat dispositions from the plan's `<threat_model>`:

- **T-39-09 (info, pure literal deletion):** accept — no new attack surface; the matchMedia fallback for deprecated values was already in place.
- **T-39-10 (tampering, FOUC contract breakage):** mitigate — IIFE wrapper, matchMedia branch, catch fallback, single-line shape, and `data-theme` write timing all byte-preserved; manual diff review confirms zero structural change; favicon.sync.test.ts drift-guard verifies the cross-file invariant.
- **T-39-11 (info, accidental change to surviving hex values):** mitigate — the surviving `'#5e81ac'` and `'#81a1c1'` hex values are byte-preserved; verification grep confirms each appears unchanged.

All mitigations applied.

## Self-Check: PASSED

Verified after writing SUMMARY.md:

- `index.html` — modified, present in worktree; `grep -nE "moss|slate|dusk" index.html` returns 0 matches.
- `.planning/phases/39-theme-simplification/39-04-SUMMARY.md` — about to be committed (this file).
- Commit `867d438` — found in `git log --oneline -3` (Task 1 commit).
- `vite build` exits 0.
- `vitest run src/styles/favicon.sync.test.ts` exits 0 with 4/4 cases passing.
- L18 single-line shape preserved; surviving light + dark hex byte-unchanged.

---

*Phase: 39-theme-simplification*
*Completed: 2026-05-21*
